# Data contracts

Atalaya enforces the two contracts every product of this archetype must have: an **ingestion** contract (raw →
pipeline) and an **artifact** contract (pipeline → web). Both are code, both are tested, and drift fails CI.

## Contract 1 — ingestion (raw → pipeline)

`data-pipeline/atalayalab/io/contract.py :: validate_table()` is the *bring-your-own-data* gate. Point it at any
tabular file and it either accepts it as a profilable table, rejects it with a reason, or accepts-and-flags it.

### Download-tier policy (what is mirrored at all)

Before ingestion, every catalog resource is classified (`catalog/inventory.py`) so we never blindly "download
every URL". The classes (verified against the live catalog, 2026-07-01):

| Tier | Meaning | Action |
|---|---|---|
| `A_gov_direct` | Chilean-gov direct file (INE, datos.gob.cl, MINSAL, Mineduc, Meteochile, Servel, DIPRES…) | **mirror in full** (size-gated) |
| `B_no_url` | sized but no `file_uri` (e.g. Superintendencia de Pensiones) | reference only (optional portal fetch) |
| `C_geoservice` | OGC/WFS/metadata endpoint (geoportal, IDE) | API pull of metadata, not a file mirror |
| `D_doi_archive` | DOI landing page for a foreign archive (PANGAEA, GEOFON, RESIF, EOL/UCAR…) | **reference only**, never mirrored |
| `X_broken` | `blob:` / dead link | skipped, logged |

The mirror is bounded by a hard **disk cap** (`ATALAYA_DISK_CAP_GB`, default 400 GB) and a per-resource
**monster cap** (`ATALAYA_MONSTER_GB`, default 50 GB): a single resource above the monster cap is subset, not
mirrored, because the heaviest DOI seismic archives run to hundreds of GB each. Downloads are resumable
(range-GET), retried with exponential backoff, and checksummed (sha256), with a per-resource receipt log.

### Table acceptance + outlier policy (explicit, never silent)

| Condition | Outcome |
|---|---|
| encoding/format cannot be read | **REJECT** (`unreadable: …`) |
| 0 rows or 0 columns | **REJECT** (`empty table`) |
| more than 512 columns | **REJECT** (not a tidy table; likely a matrix dump) |
| an all-null column | **DROP** the column, **FLAG** `dropped_N_null_cols` |
| overall null fraction > 0.6 | **FLAG** `high_null_frac_…` (accepted) |
| duplicated headers | de-duplicate (suffix), **FLAG** `duplicate_headers` |
| more than 120 columns | **FLAG** `wide_…_cols` |
| a single row | **FLAG** `single_row` |

Encoding is sniffed (`charset-normalizer`, BOM detection, latin-1/cp1252 fallback) and the separator is inferred
(`;`, `,`, tab, `|`) because Chilean gov CSVs are inconsistent. Accepted tables are normalized to **parquet**
(zstd) in the out-of-git derived tree. Flags travel with the dataset into the profile and the manifest.

## Contract 2 — artifact (pipeline → web)

`core/manifest.py` + `core/trace.py` define the compact, versioned artifact the web replays. The web loads **only**
manifests + artifacts; it never recomputes the science. `frontend/src/lib/contract.types.ts` mirrors the manifest
schema so any drift fails the web build, and `scripts/check_artifacts.py` fails CI if a manifest's byte size or
lane verdict drifts from the artifact on disk.

- Per case: `data/derived/<case>/artifact.json` (schema `atalaya.artifact/v1`, `{schema, case_id, kind, payload}`)
  and `data/derived/manifests/<case>.json` (schema `atalaya.manifest/v2`: category, engines used, artifact
  pointer + bytes, gate verdict, flags, stats).
- Global: `catalog.json` (all 1017 datasets, lightweight), `graph.json` (decimated knowledge graph),
  `metrics.json` (the validation metrics), `categories.json` (the case/variant registry), and
  `manifests/index.json` (the flat inventory).

Artifacts are decimated (strongest N rows/edges) so the committed copy stays small; the full graph lives in the
out-of-git SQLite store and is queryable via the [MCP server](../mcp/README.md).
