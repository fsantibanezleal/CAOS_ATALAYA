# Framework card · tabular I/O engine (Polars + DuckDB + PyArrow)

## What & why

The pipeline ingests messy Chilean-gov spreadsheets (unknown encodings, `;`/`,` separators, thousands
separators, BOMs) at corpus scale and profiles every column. A pandas-per-file loop is too slow and too RAM-hungry
for a 1000+ dataset scan. **Polars** is the columnar dataframe engine: multithreaded, Arrow-backed, out-of-core,
with a forgiving CSV reader (`ignore_errors`, `truncate_ragged_lines`, `null_values`) that survives ragged gov
exports. **PyArrow** is the on-disk exchange format: normalized tables are written to **parquet** (zstd) as the
derived standard. **DuckDB** is pinned in the precompute venv for SQL-over-parquet cross-dataset queries without
loading tables to RAM, but the shipped pipeline does not import it: the hot path is polars end to end, and the
correlation aggregation uses polars `group_by`. Treat duckdb as an available yardstick for ad-hoc analysis, not a
stage engine.

Chosen over pandas because the reader must not die on the first malformed row and the scan must stay bounded in
memory; over raw csv because typed columns + fast `n_unique`/aggregation feed the profiler directly.

## Install (exact, verified)

Pinned in `data-pipeline/requirements-precompute.txt`:

```
polars==1.17.1
pyarrow==18.1.0
duckdb==1.1.3     # available for ad-hoc SQL-over-parquet; not imported by any stage
```

## Usage

```python
import polars as pl
df = pl.read_csv("raw.csv", separator=";", encoding="utf8-lossy",
                 ignore_errors=True, truncate_ragged_lines=True,
                 null_values=["", "NA", "s/i"], n_rows=50_000)
g = (df.select([pl.col("comuna").cast(pl.Utf8).alias("k"), pl.col("value").cast(pl.Float64, strict=False)])
       .drop_nulls().group_by("k").agg(pl.col("value").mean().alias("v")))
df.write_parquet("norm.parquet", compression="zstd")
```

## Applying it here

- `io/formats.py` `read_table` is the single robust reader for the `preprocess` stage: it sniffs
  encoding/separator, dispatches by extension (CSV/TXT/TSV, XLSX/XLS, JSON/GeoJSON, parquet) into a polars
  `DataFrame`, and raises `UnreadableResource` on total failure. `write_parquet` emits the normalized table
  (zstd). This satisfies **CONTRACT 1** (`io/contract.py`), whose null/width checks run on the polars frame.
- `feature_extraction.py` `_profile_table` reads the normalized parquet and computes per-column stats via polars
  (`n_unique`, `drop_nulls`, `cast(pl.Float64, strict=False)` for numeric coercion).
- `infer.py` `_indicator_series` / `_numeric_cols` aggregate each dataset's numeric columns to a shared entity key
  (`group_by(key).agg(mean)`) to build the indicator series that the correlation edge mines.
- `export.py` records `polars` as the producing engine for the `overview`, `coverage`, `timeline`, `quality`
  render kinds. Import of polars is lazy so the pure-Python core stays Pyodide-safe.

## Caveats / license

Polars/DuckDB/PyArrow are all MIT/Apache-2.0 (redistributable). `read_excel` needs `openpyxl`/`xlrd`/
`python-calamine` (also pinned). The `strict=False` float cast silently nulls uncoercible cells by design (the
contract, not the reader, decides acceptance). Row-capping (`n_rows`/`max_rows`) keeps the scan bounded; the full
file stays on disk. DuckDB stays pinned for ad-hoc SQL exploration only; no stage imports it, so the shipped hot
path is polars end to end.
