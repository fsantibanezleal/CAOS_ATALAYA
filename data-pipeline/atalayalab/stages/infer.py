"""Stage 4 — infer (RELATE): mine the cross-dataset knowledge graph from the profiles + normalized tables.

Five orthogonal edge kinds, each with explicit evidence recorded on the edge:
  SAME_SOURCE           same publisher/org (cheap prior; weak weight).
  SEMANTICALLY_SIMILAR  cosine of MiniLM embeddings, top-k per dataset above a threshold.
  JOINABLE_ON           a shared entity key whose value sets have high MinHash containment (a foreign-key link).
  SPATIALLY_OVERLAPS    both datasets are comuna/region-keyed or carry lat/lon in the same area.
  CORRELATES            two indicators aggregated to a shared key correlate (Spearman), the correlation survives a
                        seeded permutation null + Benjamini-Hochberg FDR across the whole candidate family, and it
                        is not explained away by partialling out a common driver.

Every accepted edge also gets the NOVEL calibrated multi-evidence affinity written as a dataset-level summary edge
so the graph carries both the specific evidence and the fused, null-calibrated strength.
"""
from __future__ import annotations

from collections import defaultdict

import numpy as np

from .. import config
from ..catalog.entities import COMUNA_CUT, LAT, LON, REGION
from ..core.graphdb import GraphDB
from ..io.schema import DatasetProfile, Edge
from ..model import affinity, embed, stats

# tunables (documented in docs/architecture) — conservative to keep the graph honest
SEM_TOPK = 8
SEM_MIN_COS = 0.45
JOIN_MIN_CONTAINMENT = 0.5
CORR_MIN_OVERLAP = 8            # min shared key values to even test a correlation
CORR_MIN_ABS_RHO = 0.35
CORR_FDR_Q = 0.05
CORR_MAX_INDICATORS = 6        # per dataset, cap indicator columns to bound the test family
CORR_MAX_CANDIDATES = 40_000   # global cap on correlation tests (logged if hit; keeps the run bounded + honest)
JOIN_KEYS = (COMUNA_CUT, REGION)   # the keys strong enough to anchor joins/correlations


def _semantic_edges(profiles: list[DatasetProfile]) -> list[Edge]:
    embs = np.array([p.embedding for p in profiles if p.embedding], dtype=np.float64)
    ids = [p.dataset_id for p in profiles if p.embedding]
    if len(embs) < 2:
        return []
    sim = embed.cosine_matrix(embs)
    edges: list[Edge] = []
    for i in range(len(ids)):
        order = np.argsort(-sim[i])
        taken = 0
        for j in order:
            if j == i or sim[i, j] < SEM_MIN_COS:
                continue
            if i < j:                       # undirected: emit once
                edges.append(Edge(ids[i], ids[j], "SEMANTICALLY_SIMILAR", float(round(sim[i, j], 4)),
                                  {"cosine": float(round(sim[i, j], 4))}))
            taken += 1
            if taken >= SEM_TOPK:
                break
    return edges


def _same_source_edges(profiles: list[DatasetProfile], by_id) -> list[Edge]:
    groups: dict[str, list[str]] = defaultdict(list)
    for p in profiles:
        d = by_id.get(p.dataset_id)
        if d and d.org:
            groups[d.org.strip().lower()].append(p.dataset_id)
    edges: list[Edge] = []
    for org, members in groups.items():
        if len(members) < 2 or len(members) > 60:   # skip singletons + mega-publishers (uninformative)
            continue
        for a in range(len(members)):
            for b in range(a + 1, len(members)):
                edges.append(Edge(members[a], members[b], "SAME_SOURCE", 0.25, {"org": org}))
    return edges


def _key_columns(p: DatasetProfile, role: str):
    return [c for c in p.columns if c.entity_role == role and c.minhash]


def _joinable_edges(profiles: list[DatasetProfile]) -> list[Edge]:
    edges: list[Edge] = []
    for role in JOIN_KEYS:
        holders = [(p, _key_columns(p, role)) for p in profiles]
        holders = [(p, cs) for p, cs in holders if cs]
        for a in range(len(holders)):
            for b in range(a + 1, len(holders)):
                pa, ca = holders[a]
                pb, cb = holders[b]
                best = 0.0
                ev = {}
                for x in ca:
                    for y in cb:
                        n_small, n_big = (x.n_unique, y.n_unique) if x.n_unique <= y.n_unique else (y.n_unique, x.n_unique)
                        sig_s, sig_b = (x.minhash, y.minhash) if x.n_unique <= y.n_unique else (y.minhash, x.minhash)
                        cont = embed.minhash_containment(sig_s, sig_b, n_small, n_big)
                        if cont > best:
                            best = cont
                            ev = {"key": role, "containment": round(cont, 4),
                                  "cols": [x.name, y.name], "n": [x.n_unique, y.n_unique]}
                if best >= JOIN_MIN_CONTAINMENT:
                    edges.append(Edge(pa.dataset_id, pb.dataset_id, "JOINABLE_ON", float(round(best, 4)), ev))
    return edges


def _spatial_edges(profiles: list[DatasetProfile], by_id) -> list[Edge]:
    geo = [p for p in profiles if (COMUNA_CUT in p.entity_keys or REGION in p.entity_keys
           or any(c.entity_role in (LAT, LON) for c in p.columns))]
    edges: list[Edge] = []
    for a in range(len(geo)):
        for b in range(a + 1, len(geo)):
            ka = set(geo[a].entity_keys) & {COMUNA_CUT, REGION}
            kb = set(geo[b].entity_keys) & {COMUNA_CUT, REGION}
            shared = ka & kb
            if shared:
                w = 0.6 if COMUNA_CUT in shared else 0.4
                edges.append(Edge(geo[a].dataset_id, geo[b].dataset_id, "SPATIALLY_OVERLAPS", w,
                                  {"shared_geo_key": sorted(shared)}))
    return edges


def _indicator_series(nr_paths_by_ds, ds_id: str, key_role: str):
    """Aggregate up to CORR_MAX_INDICATORS numeric columns of a dataset to (key -> mean). Returns
    [(col_name, {key_value: mean})]. Uses the largest normalized parquet of the dataset."""
    import polars as pl
    paths = nr_paths_by_ds.get(ds_id, [])
    if not paths:
        return []
    path = max(paths, key=lambda p: p[1])[0]     # (path, n_rows)
    try:
        df = pl.read_parquet(path)
    except Exception:
        return []
    key_col = _find_key_col(df, key_role)
    if key_col is None:
        return []
    numeric = _numeric_cols(df, exclude=key_col)[:CORR_MAX_INDICATORS]
    out = []
    for col in numeric:
        try:
            g = (df.select([pl.col(key_col).cast(pl.Utf8).alias("k"), pl.col(col).cast(pl.Float64, strict=False)])
                 .drop_nulls().group_by("k").agg(pl.col(col).mean().alias("v")))
            series = {r[0]: r[1] for r in g.iter_rows()}
            if len(series) >= CORR_MIN_OVERLAP:
                out.append((col, series))
        except Exception:
            continue
    return out


def _find_key_col(df, role: str):
    from ..catalog.entities import detect_entity_role
    for c in df.columns:
        vals = [str(v) for v in df.get_column(c).drop_nulls().head(50).to_list()]
        if detect_entity_role(c, vals) == role:
            return c
    return None


def _numeric_cols(df, exclude: str) -> list[str]:
    import polars as pl
    num = (pl.Int8, pl.Int16, pl.Int32, pl.Int64, pl.UInt8, pl.UInt16, pl.UInt32, pl.UInt64, pl.Float32, pl.Float64)
    out = []
    for c in df.columns:
        if c == exclude:
            continue
        s = df.get_column(c)
        if s.dtype in num:
            out.append(c)
        else:
            try:
                if s.cast(pl.Float64, strict=False).drop_nulls().len() >= max(3, int(0.6 * df.height)):
                    out.append(c)
            except Exception:
                pass
    return out


def _correlation_edges(profiles, normalized, nulls, *, seed: int, log=print) -> list[Edge]:
    """Mine cross-dataset correlations on a shared key with a calibrated null + FDR. Returns surviving edges."""
    nr_paths_by_ds: dict[str, list] = defaultdict(list)
    for nr in normalized:
        nr_paths_by_ds[nr.dataset_id].append((nr.parquet_path, nr.report.n_rows))

    candidates = []          # (dsA, colA, dsB, colB, key, rho, xa, xb aligned)
    for key_role in JOIN_KEYS:
        holders = [p for p in profiles if key_role in p.entity_keys]
        series_by_ds = {p.dataset_id: _indicator_series(nr_paths_by_ds, p.dataset_id, key_role) for p in holders}
        ids = [p.dataset_id for p in holders]
        for a in range(len(ids)):
            for b in range(a + 1, len(ids)):
                for ca, sa in series_by_ds[ids[a]]:
                    for cb, sb in series_by_ds[ids[b]]:
                        shared = set(sa) & set(sb)
                        if len(shared) < CORR_MIN_OVERLAP:
                            continue
                        ks = sorted(shared)
                        xa = [sa[k] for k in ks]
                        xb = [sb[k] for k in ks]
                        rho = stats.spearman(xa, xb)
                        if abs(rho) >= CORR_MIN_ABS_RHO:
                            candidates.append((ids[a], ca, ids[b], cb, key_role, rho, xa, xb))
    if not candidates:
        return []
    if len(candidates) > CORR_MAX_CANDIDATES:
        candidates.sort(key=lambda c: -abs(c[5]))     # keep the strongest; FDR still applied to this subset
        log(f"[relate] correlation candidates capped: {len(candidates)} -> {CORR_MAX_CANDIDATES} "
            f"(strongest kept; weaker |rho| dropped before FDR)")
        candidates = candidates[:CORR_MAX_CANDIDATES]
    # calibrated significance + FDR across the whole family
    pvals = [stats.permutation_pvalue(xa, xb, rho, n_perm=1000, seed=seed) for *_, rho, xa, xb in candidates]
    keep = stats.bh_fdr(pvals, q=CORR_FDR_Q)
    edges: list[Edge] = []
    for (dsA, cA, dsB, cB, key, rho, xa, xb), p, ok in zip(candidates, pvals, keep):
        if not ok:
            continue
        edges.append(Edge(dsA, dsB, "CORRELATES", float(round(abs(rho), 4)),
                          {"rho": round(rho, 4), "p_adj": round(p, 5), "n": len(xa), "key": key,
                           "cols": [cA, cB]}))
    log(f"[relate] correlations: {len(candidates)} candidates -> {len(edges)} survive perm-null + FDR(q={CORR_FDR_Q})")
    return edges


def _affinity_edges(profiles, sem, join, corr, nulls) -> list[Edge]:
    """Fuse the per-pair evidences into the NOVEL calibrated affinity, one summary edge per related pair."""
    def key(e):
        return tuple(sorted((e.src, e.dst)))
    sem_by = {key(e): e.evidence.get("cosine", 0.0) for e in sem}
    join_by = {key(e): e.evidence.get("containment", 0.0) for e in join}
    corr_by = {key(e): abs(e.evidence.get("rho", 0.0)) for e in corr}
    null_sem = affinity.NullCDF(nulls.get("sem", [])) if nulls else None
    null_join = affinity.NullCDF(nulls.get("join", [])) if nulls else None
    null_stat = affinity.NullCDF(nulls.get("stat", [])) if nulls else None
    edges: list[Edge] = []
    for pair in set(sem_by) | set(join_by) | set(corr_by):
        a = affinity.affinity(
            sem_cos=sem_by.get(pair, 0.0), join_containment=join_by.get(pair, 0.0),
            stat_strength=corr_by.get(pair, 0.0),
            null_sem=null_sem, null_join=null_join, null_stat=null_stat)
        if a["score"] > 0.05:
            edges.append(Edge(pair[0], pair[1], "AFFINITY", float(round(a["score"], 4)), a))
    return edges


def run(profiles: list[DatasetProfile], normalized: list, datasets: list, model_bundle: dict, *,
        seed: int = config.DEFAULT_SEED, graph_path=None, log=print) -> GraphDB:
    """Mine all edge kinds and persist the knowledge graph (SQLite-WAL). Returns the open GraphDB."""
    by_id = {d.id: d for d in datasets}
    db = GraphDB(graph_path or config.GRAPH_DB)
    db.clear()

    # nodes: one per profiled dataset, carrying its display attrs + profile summary as observations
    coords = model_bundle.get("coords", {})
    clusters = model_bundle.get("clusters", {})
    for p in profiles:
        d = by_id.get(p.dataset_id)
        db.add_node(p.dataset_id, "dataset", (d.title if d else p.dataset_id)[:120], {
            "theme": d.theme if d else "", "org": d.org if d else "", "origin": d.origin if d else "",
            "sub_category": d.sub_category if d else "", "license": d.license if d else "",
            "n_cols": p.n_cols, "n_rows": p.n_rows, "entity_keys": p.entity_keys,
            "year_min": p.year_min, "year_max": p.year_max,
            "coord": coords.get(p.dataset_id), "cluster": clusters.get(p.dataset_id),
            "lat": d.lat if d else None, "lon": d.lon if d else None,
        })
        db.add_observation(p.dataset_id, "columns", [c.name for c in p.columns][:60])

    sem = _semantic_edges(profiles)
    same = _same_source_edges(profiles, by_id)
    join = _joinable_edges(profiles)
    spatial = _spatial_edges(profiles, by_id)
    corr = _correlation_edges(profiles, normalized, model_bundle.get("nulls", {}), seed=seed, log=log)
    aff = _affinity_edges(profiles, sem, join, corr, model_bundle.get("nulls", {}))

    for e in sem + same + join + spatial + corr + aff:
        db.add_edge(e.src, e.dst, e.kind, e.weight, e.evidence)
    db.commit()
    log(f"[relate] graph: {db.counts()}")
    return db
