"""Stage 2 — feature_extraction (profiling): turn each normalized table into a per-column fingerprint and roll
those up into a per-dataset profile. The fingerprints are the substrate every relation edge is mined from.

Per column: dtype, null fraction, cardinality, numeric stats, a few sample values, an entity-key role (comuna
CUT / region / year / lat / lon / rut ...), and a MinHash signature of its value set (for containment/joinability).
Per dataset: the rolled-up columns, the entity keys present, the temporal coverage, a semantic text (title +
description + column names), and a multilingual MiniLM embedding of that text (fully local; later ONNX-exported).

Embeddings are computed in one batched pass over all datasets for speed + determinism.
"""
from __future__ import annotations

from .. import config
from ..catalog.entities import YEAR, detect_entity_role
from ..io.schema import ColumnProfile, DatasetProfile, DatasetRef

_MINHASH_PERM = 64          # signature length (accuracy vs size tradeoff for containment)
_SAMPLE_VALUES = 5
_MINHASH_SAMPLE = 20_000     # cap the value set fed to MinHash per column (bounds the hash loop)
_MINHASH_MAX_CARD = 50_000   # skip MinHash on ultra-high-cardinality columns (not useful join keys)
_EXTRA_MINHASH_COLS = 8      # besides entity-key columns, MinHash at most this many low-card string columns/table
_LOWCARD_STR = 5_000         # a string column is a joinability candidate only below this cardinality


def _minhash(values, num_perm: int = _MINHASH_PERM) -> list[int]:
    from datasketch import MinHash
    mh = MinHash(num_perm=num_perm)
    for v in values:
        if v is not None:
            mh.update(str(v).strip().lower().encode("utf-8"))
    return [int(x) for x in mh.hashvalues]


def _profile_table(nr, log=print) -> tuple[list[ColumnProfile], int]:
    import polars as pl
    df = pl.read_parquet(nr.parquet_path)
    n = df.height
    # First pass: cheap stats + roles for every column (no MinHash yet). n_unique via polars is hash-based (fast).
    raw: list[dict] = []
    for name in df.columns:
        s = df.get_column(name)
        nn = int(s.drop_nulls().len())
        uniq = int(s.n_unique())
        samples = [str(v) for v in s.drop_nulls().unique().head(_SAMPLE_VALUES).to_list()]
        role = detect_entity_role(name, [str(v) for v in s.drop_nulls().head(50).to_list()])
        dtype, nmin, nmax, nmean, nstd = _numeric_stats(s, role)
        raw.append({"name": str(name), "s": s, "nn": nn, "uniq": uniq, "samples": samples,
                    "role": role, "dtype": dtype, "nmin": nmin, "nmax": nmax, "nmean": nmean, "nstd": nstd,
                    "null_frac": 1.0 - (nn / n if n else 0.0)})
    # Decide which columns get a MinHash: all entity-key columns, plus the lowest-cardinality string columns up
    # to a cap. This bounds the (slow) python hash loop regardless of table width.
    keyed = [r for r in raw if r["role"]]
    strc = sorted([r for r in raw if not r["role"] and r["dtype"] == "str" and 0 < r["uniq"] <= _LOWCARD_STR],
                  key=lambda r: r["uniq"])[:_EXTRA_MINHASH_COLS]
    minhash_for = {id(r) for r in keyed + strc}
    cols: list[ColumnProfile] = []
    for r in raw:
        mh: list[int] = []
        if id(r) in minhash_for and r["uniq"] <= _MINHASH_MAX_CARD:
            mh = _minhash(r["s"].drop_nulls().head(_MINHASH_SAMPLE).to_list())
        cols.append(ColumnProfile(
            dataset_id=nr.dataset_id, resource_name=nr.resource_name, name=r["name"], dtype=r["dtype"],
            n=r["nn"], null_frac=round(r["null_frac"], 4), n_unique=r["uniq"],
            unique_frac=round(r["uniq"] / r["nn"], 4) if r["nn"] else 0.0, sample_values=r["samples"],
            entity_role=r["role"], num_min=r["nmin"], num_max=r["nmax"], num_mean=r["nmean"], num_std=r["nstd"],
            minhash=mh))
    return cols, n


def _numeric_stats(s, role: str):
    import polars as pl
    numeric = (pl.Int8, pl.Int16, pl.Int32, pl.Int64, pl.UInt8, pl.UInt16, pl.UInt32, pl.UInt64,
               pl.Float32, pl.Float64)
    if s.dtype in numeric:
        d = s.drop_nulls()
        if d.len() == 0:
            return ("float", None, None, None, None)
        return ("float", _f(d.min()), _f(d.max()), _f(d.mean()), _f(d.std()))
    try:
        coerced = s.cast(pl.Float64, strict=False).drop_nulls()
        if coerced.len() >= max(3, int(0.6 * max(1, s.drop_nulls().len()))):
            return ("float", _f(coerced.min()), _f(coerced.max()), _f(coerced.mean()), _f(coerced.std()))
    except Exception:
        pass
    return ("date" if role == "date" else "str", None, None, None, None)


def _f(x):
    try:
        return round(float(x), 6)
    except (TypeError, ValueError):
        return None


def _embed_texts(texts: list[str], log=print):
    """Batch-embed the dataset semantic texts with the local multilingual MiniLM. Deterministic (eval mode)."""
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer(config.EMBED_MODEL, device="cpu")
    vecs = model.encode(texts, batch_size=32, normalize_embeddings=True, show_progress_bar=False)
    return [[round(float(x), 5) for x in row] for row in vecs]


def run(datasets: list[DatasetRef], normalized: list, *, log=print) -> list[DatasetProfile]:
    """Build a DatasetProfile per dataset that has at least one normalized resource. Embeddings computed in one
    batch at the end."""
    by_id = {d.id: d for d in datasets}
    by_dataset: dict[str, list] = {}
    for nr in normalized:
        by_dataset.setdefault(nr.dataset_id, []).append(nr)

    profiles: list[DatasetProfile] = []
    texts: list[str] = []
    for i, (ds_id, nrs) in enumerate(sorted(by_dataset.items())):
        all_cols: list[ColumnProfile] = []
        n_rows_total = 0
        for nr in nrs:
            cols, n = _profile_table(nr, log=log)
            all_cols.extend(cols)
            n_rows_total = max(n_rows_total, n)
        d = by_id.get(ds_id)
        entity_keys = sorted({c.entity_role for c in all_cols if c.entity_role})
        years = _year_span(all_cols)
        semantic = _semantic_text(d, all_cols)
        profiles.append(DatasetProfile(
            dataset_id=ds_id, n_rows=n_rows_total, n_cols=len(all_cols), columns=all_cols,
            entity_keys=entity_keys, year_min=years[0], year_max=years[1], semantic_text=semantic))
        texts.append(semantic)
        if (i + 1) % 10 == 0 or (i + 1) == len(by_dataset):
            log(f"[profile] profiled {i+1}/{len(by_dataset)} datasets")

    log(f"[profile] embedding {len(texts)} dataset texts ...")
    vecs = _embed_texts(texts, log=log) if texts else []
    profiles = [_with_embedding(p, v) for p, v in zip(profiles, vecs)]
    log(f"[profile] done: {len(profiles)} dataset profiles")
    return profiles


def _year_span(cols: list[ColumnProfile]) -> tuple[int | None, int | None]:
    yrs: list[int] = []
    for c in cols:
        if c.entity_role == YEAR:
            for v in c.sample_values:
                try:
                    y = int(float(v))
                    if 1800 <= y <= 2100:
                        yrs.append(y)
                except (TypeError, ValueError):
                    pass
    return (min(yrs), max(yrs)) if yrs else (None, None)


def _semantic_text(d: DatasetRef | None, cols: list[ColumnProfile]) -> str:
    parts: list[str] = []
    if d:
        parts += [d.title, d.theme, d.sub_category, d.description[:600]]
    parts.append(" ".join(c.name for c in cols[:40]))
    return " | ".join(p for p in parts if p).strip()


def _with_embedding(p: DatasetProfile, vec: list[float]) -> DatasetProfile:
    return DatasetProfile(
        dataset_id=p.dataset_id, n_rows=p.n_rows, n_cols=p.n_cols, columns=p.columns,
        entity_keys=p.entity_keys, year_min=p.year_min, year_max=p.year_max,
        semantic_text=p.semantic_text, embedding=vec)
