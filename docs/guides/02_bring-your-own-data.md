# Guide, bring your own data

Atalaya is **not hard-wired to the Data Observatory**. The pipeline runs over whatever normalized tables exist, so
you can point it at your own tabular data. The door is **CONTRACT 1** (`data-pipeline/atalayalab/io/contract.py`),
the ingestion gate.

## The ingestion contract is the door

`validate_table()` accepts, rejects, or accepts-and-flags any tabular file, explicitly (never silent coercion):

- **Rejected (with a reason):** unreadable encoding/format, 0 rows or 0 columns, more than 512 columns (not a tidy
  table).
- **Flagged (accepted):** an all-null column (dropped and flagged), overall null fraction above 0.6, duplicated
  headers (de-duplicated), more than 120 columns, a single row.
- **Accepted:** anything that reads into a rectangular table meeting the minimum bounds.

Readers (`io/formats.py`) sniff encoding (BOM, `charset-normalizer`, latin-1/cp1252 fallback) and infer the
separator (`;`, `,`, tab, `|`) because real gov CSVs are inconsistent, and handle CSV/TXT/TSV, XLSX/XLS/XLSM, and
JSON/GeoJSON. Accepted tables are normalized to zstd parquet. Flags travel with the dataset into the profile and
the manifest.

## Steps

1. Drop your files under the raw tree, one folder per dataset (the mirror layout `raw/<slug>/<file>`), which lives
   out of git under the `E:` scratch tree (`config.py`, `ATALAYA_DATA_ROOT`).
2. Run the pipeline **without** `--harvest` so it skips the catalog download and processes the raw tree you
   staged: `python -m atalayalab.pipeline` (or `./scripts/precompute.ps1`).
3. `preprocess` applies CONTRACT 1 to each file; `feature_extraction` profiles the accepted tables and detects
   entity keys (comuna CUT, region, year, lat/lon, rut via `catalog/entities.py`); `infer` mines the same five
   edge kinds plus affinity; `export` bakes the compact artifacts the SPA replays.

The more your columns match Chilean entity keys (a 5-digit comuna CUT, a region, a 4-digit year, a lat/lon in
Chile's band), the more joinability, correlation, and geographic relations the miner can find; datasets with no
recognized key still get profiled, embedded, and semantically linked.

## Extending the contract

If your data legitimately does not fit (a new key type, a new format), extend CONTRACT 1 and its tests
**deliberately**, never loosen it just to make bad data pass. The entity-key detectors in `entities.py` are the
natural extension point for a new join key; add both the header hint and the value-shape check (both must agree, by
design, to avoid false keys).

## Honesty note

Entity-key detection is conservative on purpose (header AND value shape must agree), so a real key in an
unrecognized format will be missed rather than guessed. Rejected files are reported with a reason and simply do
not enter the corpus; nothing is silently imputed.
