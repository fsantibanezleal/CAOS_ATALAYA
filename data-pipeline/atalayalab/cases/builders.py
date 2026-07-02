"""Case builders — each turns the shared corpus results into ONE case's compact web artifact payload. Pure read
operations over the mined graph + profiles; no recompute of the science (that already ran in the stages). The web
replays these payloads; variants are applied client-side from the single payload (no per-variant recompute), so
there is no compute bomb and the App reacts instantly to the variant bar.
"""
from __future__ import annotations

from collections import Counter
from dataclasses import dataclass

from ..core.graphdb import GraphDB
from ..core.trace import decimate_rows


@dataclass
class CorpusContext:
    datasets: list           # DatasetRef (all 1017)
    profiles: list           # DatasetProfile (the profiled subset)
    normalized: list         # NormalizedResource
    db: GraphDB
    model_bundle: dict
    size_report: dict

    def by_id(self):
        return {d.id: d for d in self.datasets}


def _node_view(ctx: CorpusContext) -> dict:
    """A compact per-node record the map/graph views share."""
    by_id = ctx.by_id()
    coords = ctx.model_bundle.get("coords", {})
    clusters = ctx.model_bundle.get("clusters", {})
    fpos = {n["id"]: n["attrs"].get("fpos") for n in ctx.db.nodes(kind="dataset")}
    out = {}
    for p in ctx.profiles:
        d = by_id.get(p.dataset_id)
        out[p.dataset_id] = {
            "id": p.dataset_id, "title": (d.title if d else p.dataset_id)[:100],
            "theme": d.theme if d else "", "origin": d.origin if d else "",
            "org": (d.org if d else "")[:60], "license": d.license if d else "",
            "keys": p.entity_keys, "n_cols": p.n_cols, "n_rows": p.n_rows, "profiled": p.n_cols > 0,
            "year_min": p.year_min, "year_max": p.year_max,
            "coord": coords.get(p.dataset_id, [0, 0]), "fpos": fpos.get(p.dataset_id),
            "cluster": clusters.get(p.dataset_id, 0),
            "null_frac": round(sum(c.null_frac for c in p.columns) / max(1, len(p.columns)), 3),
            "lat": d.lat if d else None, "lon": d.lon if d else None,
        }
    return out


# ---------------------------------------------------------------- CARTOGRAPHY --------------------------------------

def build_cartography(ctx: CorpusContext) -> tuple[str, dict, dict]:
    nodes = list(_node_view(ctx).values())
    payload = {"nodes": nodes, "pca_var": ctx.model_bundle.get("pca_var", [0, 0]),
               "themes": sorted({n["theme"] for n in nodes if n["theme"]}),
               "clusters": sorted({n["cluster"] for n in nodes})}
    return "map", payload, {"n_datasets": len(nodes)}


def build_overview(ctx: CorpusContext) -> tuple[str, dict, dict]:
    ds = ctx.datasets
    facets = {
        "theme": Counter(d.theme for d in ds if d.theme),
        "origin": Counter(d.origin for d in ds if d.origin),
        "license": Counter(d.license for d in ds if d.license),
        "format": Counter(r.fmt for d in ds for r in d.resources),
        "tier": Counter(r.tier for d in ds for r in d.resources),
    }
    payload = {f: dict(c.most_common(20)) for f, c in facets.items()}
    payload["size_report"] = ctx.size_report.get("by_tier", {})
    payload["totals"] = {"datasets": len(ds), "resources": sum(len(d.resources) for d in ds),
                         "profiled": len(ctx.profiles)}
    return "overview", payload, {"n_datasets": len(ds)}


# ---------------------------------------------------------------- SEMANTIC / GRAPH ---------------------------------

def _graph_payload(ctx: CorpusContext, edge_kind: str, edge_limit: int = 2500) -> dict:
    nv = _node_view(ctx)
    edges = ctx.db.edges(kind=edge_kind)
    erows = decimate_rows(
        [{"s": e["src"], "t": e["dst"], "w": round(e["weight"], 4), "ev": e["evidence"]} for e in edges],
        key=lambda r: r["w"], limit=edge_limit)
    used = {r["s"] for r in erows} | {r["t"] for r in erows}
    nodes = [nv[i] for i in used if i in nv]
    return {"nodes": nodes, "edges": erows}


def build_semantic(ctx: CorpusContext) -> tuple[str, dict, dict]:
    p = _graph_payload(ctx, "SEMANTICALLY_SIMILAR")
    return "graph", p, {"n_nodes": len(p["nodes"]), "n_edges": len(p["edges"])}


def build_joinability(ctx: CorpusContext) -> tuple[str, dict, dict]:
    p = _graph_payload(ctx, "JOINABLE_ON")
    return "graph", p, {"n_nodes": len(p["nodes"]), "n_edges": len(p["edges"])}


def build_corr_network(ctx: CorpusContext) -> tuple[str, dict, dict]:
    p = _graph_payload(ctx, "CORRELATES")
    return "graph", p, {"n_nodes": len(p["nodes"]), "n_edges": len(p["edges"])}


# ---------------------------------------------------------------- CORRELATION FINDINGS -----------------------------

def build_correlations(ctx: CorpusContext) -> tuple[str, dict, dict]:
    by_id = ctx.by_id()
    rows = []
    for e in ctx.db.edges(kind="CORRELATES"):
        ev = e["evidence"]
        da, dbb = by_id.get(e["src"]), by_id.get(e["dst"])
        rows.append({
            "a": (da.title if da else e["src"])[:80], "b": (dbb.title if dbb else e["dst"])[:80],
            "a_id": e["src"], "b_id": e["dst"],
            "rho": ev.get("rho"), "p_adj": ev.get("p_adj"), "n": ev.get("n"),
            "key": ev.get("key"), "cols": ev.get("cols", []),
            "weight": abs(ev.get("rho", 0.0)),
        })
    rows = decimate_rows(rows, key=lambda r: r["weight"], limit=600)
    return "findings", {"rows": rows}, {"n_findings": len(rows)}


# ---------------------------------------------------------------- GEOGRAPHIC ---------------------------------------

def build_geographic(ctx: CorpusContext) -> tuple[str, dict, dict]:
    nv = _node_view(ctx)
    rows = []
    for n in nv.values():
        level = "points" if (n["lat"] is not None) else (
            "comuna_cut" if "comuna_cut" in n["keys"] else ("region" if "region" in n["keys"] else "none"))
        rows.append({"id": n["id"], "title": n["title"], "theme": n["theme"], "level": level,
                     "lat": n["lat"], "lon": n["lon"], "keys": n["keys"]})
    counts = Counter(r["level"] for r in rows)
    return "coverage", {"rows": rows, "counts": dict(counts)}, {"n_geo": sum(1 for r in rows if r["level"] != "none")}


# ---------------------------------------------------------------- TEMPORAL -----------------------------------------

def build_temporal(ctx: CorpusContext) -> tuple[str, dict, dict]:
    by_id = ctx.by_id()
    rows = []
    for p in ctx.profiles:
        if p.year_min is None:
            continue
        d = by_id.get(p.dataset_id)
        rows.append({"id": p.dataset_id, "title": (d.title if d else p.dataset_id)[:80],
                     "theme": d.theme if d else "", "y0": p.year_min, "y1": p.year_max or p.year_min,
                     "keys": p.entity_keys, "span": (p.year_max or p.year_min) - p.year_min})
    rows.sort(key=lambda r: (r["y0"], -r["span"]))
    hist = Counter()
    for r in rows:
        for y in range(r["y0"], r["y1"] + 1):
            hist[y] += 1
    return "timeline", {"rows": rows, "histogram": dict(sorted(hist.items()))}, {"n_dated": len(rows)}


# ---------------------------------------------------------------- QUALITY ------------------------------------------

def build_quality(ctx: CorpusContext) -> tuple[str, dict, dict]:
    by_id = ctx.by_id()
    rows = []
    flag_counter = Counter()
    dtype_counter = Counter()
    for nr in ctx.normalized:
        for f in nr.report.flags:
            flag_counter[f.split("_")[0] if f[0].islower() else f] += 1
    for p in ctx.profiles:
        d = by_id.get(p.dataset_id)
        for c in p.columns:
            dtype_counter[c.dtype] += 1
        rows.append({
            "id": p.dataset_id, "title": (d.title if d else p.dataset_id)[:80], "theme": d.theme if d else "",
            "n_cols": p.n_cols, "n_rows": p.n_rows,
            "null_frac": round(sum(c.null_frac for c in p.columns) / max(1, len(p.columns)), 3),
            "keys": len(p.entity_keys), "max_card": max((c.n_unique for c in p.columns), default=0),
        })
    rows = decimate_rows(rows, key=lambda r: r["null_frac"], limit=600)
    return "quality", {"rows": rows, "flags": dict(flag_counter), "dtypes": dict(dtype_counter)}, \
        {"n_tables": len(ctx.normalized)}


# ---------------------------------------------------------------- AFFINITY (novel) ---------------------------------

def build_affinity(ctx: CorpusContext) -> tuple[str, dict, dict]:
    by_id = ctx.by_id()
    rows = []
    for e in ctx.db.edges(kind="AFFINITY"):
        ev = e["evidence"]
        da, dbb = by_id.get(e["src"]), by_id.get(e["dst"])
        rows.append({
            "a": (da.title if da else e["src"])[:70], "b": (dbb.title if dbb else e["dst"])[:70],
            "a_id": e["src"], "b_id": e["dst"], "score": ev.get("score", e["weight"]),
            "f_sem": ev.get("f_sem"), "f_join": ev.get("f_join"), "f_stat": ev.get("f_stat"),
            "weight": ev.get("score", e["weight"]),
        })
    rows = decimate_rows(rows, key=lambda r: r["weight"], limit=600)
    return "affinity", {"rows": rows, "nulls": {k: len(v) for k, v in ctx.model_bundle.get("nulls", {}).items()}}, \
        {"n_pairs": len(rows)}


BUILDERS = {
    "build_cartography": build_cartography, "build_overview": build_overview, "build_semantic": build_semantic,
    "build_joinability": build_joinability, "build_corr_network": build_corr_network,
    "build_correlations": build_correlations, "build_geographic": build_geographic,
    "build_temporal": build_temporal, "build_quality": build_quality, "build_affinity": build_affinity,
}
