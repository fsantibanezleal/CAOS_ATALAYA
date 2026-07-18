"""Stage 1 — preprocess: read each raw tier-A resource, apply Contract 1, and normalize the accepted tables to
parquet in the out-of-git derived tree. The bring-your-own-data entry point.

Deterministic: the same raw file always yields the same normalized parquet + the same report. Heavy tables are
row-capped for profiling (`sample_rows`) so the corpus scan stays bounded; the full file stays on disk.
"""
from __future__ import annotations

import zipfile
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


# extensions preprocess attempts to tabularize (others: rar/pdf are archives/docs handled elsewhere/skipped)
TABULAR_EXTS = {".csv", ".txt", ".tsv", ".xlsx", ".xls", ".xlsm", ".json", ".geojson", ".parquet"}
_MAX_ZIP_BYTES = 500 * 1024 * 1024   # skip pathological zips
_MAX_FILES_PER_ZIP = 30              # cap tabular members extracted per archive
_MAX_MEMBER_BYTES = 200 * 1024 * 1024


def _extract_zip_tabulars(zip_path: Path, out_dir: Path) -> list[Path]:
    """Extract the tabular members of a .zip into out_dir (idempotent: skips if already extracted). Bounded by
    size + count caps. Many Chilean gov datasets ship CSVs inside a ZIP, so this materially widens coverage."""
    if zip_path.stat().st_size > _MAX_ZIP_BYTES:
        return []
    out_dir.mkdir(parents=True, exist_ok=True)
    got: list[Path] = []
    try:
        with zipfile.ZipFile(zip_path) as zf:
            members = [m for m in zf.infolist()
                       if not m.is_dir() and Path(m.filename).suffix.lower() in TABULAR_EXTS
                       and m.file_size <= _MAX_MEMBER_BYTES]
            for m in members[:_MAX_FILES_PER_ZIP]:
                safe = f"{zip_path.stem}__" + Path(m.filename).name.replace("/", "_")
                dest = out_dir / safe
                if not dest.exists():
                    with zf.open(m) as src, open(dest, "wb") as dst:
                        while True:
                            chunk = src.read(1 << 20)
                            if not chunk:
                                break
                            dst.write(chunk)
                got.append(dest)
    except (zipfile.BadZipFile, OSError):
        return got
    return got


def _iter_raw_files(raw_dir: Path):
    for slug_dir in sorted(p for p in raw_dir.iterdir() if p.is_dir()):
        for f in sorted(slug_dir.iterdir()):
            if not f.is_file():
                continue
            ext = f.suffix.lower()
            if ext in TABULAR_EXTS:
                yield slug_dir.name, f
            elif ext == ".zip":
                for member in _extract_zip_tabulars(f, slug_dir / "_unzipped"):
                    yield slug_dir.name, member


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
