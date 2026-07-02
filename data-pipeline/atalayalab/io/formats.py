"""Standard-format readers/writers. Domain-standard IN (messy gov CSV/XLSX/XLS/JSON/GeoJSON), compact-standard
OUT (parquet for the heavy normalized tables; compact JSON for the committed web artifacts).

Gov CSVs are messy: unknown encodings (latin-1/utf-8/cp1252), `;` or `,` separators, thousands separators, BOMs.
`read_table` is the single robust entry point the preprocess stage relies on; it returns a polars DataFrame or
raises `UnreadableResource` so the ingestion contract can reject the file cleanly.
"""
from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any


class UnreadableResource(Exception):
    """Raised when a raw file cannot be parsed into a table by any strategy (contract rejects it)."""


# ---- compact JSON (committed web artifacts) --------------------------------------------------------------------

def write_json(path: str | Path, obj: Any) -> int:
    """Write compact JSON; return the byte size (used by the gate + manifest)."""
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    data = json.dumps(obj, separators=(",", ":"), ensure_ascii=False)
    encoded = data.encode("utf-8")
    p.write_bytes(encoded)
    return len(encoded)


def read_json(path: str | Path) -> Any:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def read_csv_rows(path: str | Path) -> list[dict[str, str]]:
    """Small helper for the examples/ contract demo (tiny files). Heavy tables use read_table."""
    enc = _sniff_encoding(Path(path))
    with open(path, newline="", encoding=enc, errors="replace") as f:
        sep = _sniff_sep(f.readline())
        f.seek(0)
        return list(csv.DictReader(f, delimiter=sep))


# ---- robust tabular reader (heavy path) ------------------------------------------------------------------------

def _sniff_encoding(path: Path, n: int = 65536) -> str:
    raw = path.read_bytes()[:n]
    if raw.startswith(b"\xef\xbb\xbf"):
        return "utf-8-sig"
    try:
        from charset_normalizer import from_bytes
        best = from_bytes(raw).best()
        if best and best.encoding:
            return best.encoding
    except Exception:
        pass
    for enc in ("utf-8", "latin-1", "cp1252"):
        try:
            raw.decode(enc)
            return enc
        except UnicodeDecodeError:
            continue
    return "latin-1"


def _sniff_sep(sample: str) -> str:
    counts = {sep: sample.count(sep) for sep in (";", ",", "\t", "|")}
    best = max(counts, key=counts.get)
    return best if counts[best] > 0 else ","


def read_table(path: str | Path, *, max_rows: int | None = None):
    """Read a raw tabular resource into a polars DataFrame. Tries the right reader by extension, with encoding +
    separator sniffing for CSV/TXT. Raises UnreadableResource on total failure. Import of polars is lazy so the
    pure-Python core stays Pyodide-safe."""
    import polars as pl

    p = Path(path)
    ext = p.suffix.lower().lstrip(".")
    try:
        if ext in ("csv", "txt", "tsv"):
            enc = _sniff_encoding(p)
            with open(p, encoding=enc, errors="replace") as f:
                sep = "\t" if ext == "tsv" else _sniff_sep(f.readline())
            df = pl.read_csv(p, separator=sep, encoding="utf8-lossy",
                             infer_schema_length=2000, ignore_errors=True, truncate_ragged_lines=True,
                             null_values=["", "NA", "N/A", "na", "null", "-", "s/i", "S/I"],
                             n_rows=max_rows)
        elif ext in ("xlsx", "xls", "xlsm"):
            df = pl.read_excel(p)
            if max_rows:
                df = df.head(max_rows)
        elif ext in ("json", "geojson"):
            df = _read_json_table(p, max_rows)
        elif ext == "parquet":
            df = pl.read_parquet(p, n_rows=max_rows)
        else:
            raise UnreadableResource(f"unsupported extension: .{ext}")
    except UnreadableResource:
        raise
    except Exception as e:
        raise UnreadableResource(f"{type(e).__name__}: {e}") from e
    if df.width == 0 or df.height == 0:
        raise UnreadableResource("empty table")
    return df


def _read_json_table(path: Path, max_rows: int | None):
    import polars as pl
    obj = json.loads(path.read_text(encoding=_sniff_encoding(path), errors="replace"))
    if isinstance(obj, dict) and obj.get("type") == "FeatureCollection":
        rows = [dict(f.get("properties", {})) for f in obj.get("features", [])]
    elif isinstance(obj, list):
        rows = [r for r in obj if isinstance(r, dict)]
    elif isinstance(obj, dict):
        rows = [obj]
        for v in obj.values():
            if isinstance(v, list) and v and isinstance(v[0], dict):
                rows = v
                break
    else:
        raise UnreadableResource("json is not tabular")
    if not rows:
        raise UnreadableResource("json has no records")
    if max_rows:
        rows = rows[:max_rows]
    return pl.DataFrame(rows, strict=False)


def write_parquet(df, path: str | Path) -> int:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    df.write_parquet(p, compression="zstd")
    return p.stat().st_size
