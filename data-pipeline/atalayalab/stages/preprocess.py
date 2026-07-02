"""Stage 1 — preprocess: read each raw tier-A resource, apply CONTRACT 1, and normalize the accepted tables to
parquet in the out-of-git derived tree. The bring-your-own-data entry point.

Deterministic: the same raw file always yields the same normalized parquet + the same report. Heavy tables are
row-capped for profiling (`sample_rows`) so the corpus scan stays bounded; the full file stays on disk.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from .. import config
from ..io.contract import TableReport, validate_table
from ..io.formats import write_parquet


@dataclass
class NormalizedResource:
    dataset_id: str
    slug: str
    resource_name: str
    raw_path: str
    parquet_path: str
    report: TableReport


# extensions preprocess attempts to tabularize (others: zip/rar/pdf are archives/docs, handled elsewhere/skipped)
TABULAR_EXTS = {".csv", ".txt", ".tsv", ".xlsx", ".xls", ".xlsm", ".json", ".geojson", ".parquet"}


def _iter_raw_files(raw_dir: Path):
    for slug_dir in sorted(p for p in raw_dir.iterdir() if p.is_dir()):
        for f in sorted(slug_dir.iterdir()):
            if f.is_file() and f.suffix.lower() in TABULAR_EXTS:
                yield slug_dir.name, f


def run(*, raw_dir: Path | None = None, norm_dir: Path | None = None, sample_rows: int | None = 50_000,
        slug_to_id: dict[str, str] | None = None, limit: int | None = None, log=print) -> list[NormalizedResource]:
    """Normalize every accepted tier-A tabular resource under raw_dir to parquet. Returns the accepted set with
    its contract report. `slug_to_id` maps a dataset slug back to its catalog id (for downstream graph nodes)."""
    raw_dir = raw_dir or config.RAW_DIR
    norm_dir = norm_dir or config.NORM_DIR
    slug_to_id = slug_to_id or {}
    out: list[NormalizedResource] = []
    n_seen = n_ok = n_rej = 0
    for slug, f in _iter_raw_files(raw_dir):
        if limit is not None and n_seen >= limit:
            break
        n_seen += 1
        rep = validate_table(f, max_rows=sample_rows)
        if not rep.accepted:
            n_rej += 1
            continue
        pq = norm_dir / slug / (f.stem + ".parquet")
        write_parquet(rep.df, pq)
        out.append(NormalizedResource(
            dataset_id=slug_to_id.get(slug, slug), slug=slug, resource_name=f.name,
            raw_path=str(f), parquet_path=str(pq), report=rep))
        n_ok += 1
        if n_seen % 50 == 0:
            log(f"[preprocess] seen={n_seen} ok={n_ok} rejected={n_rej}")
    log(f"[preprocess] done: {n_ok} normalized, {n_rej} rejected, of {n_seen} tabular files")
    return out
