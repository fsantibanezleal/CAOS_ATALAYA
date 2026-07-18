# The two data contracts

Atalaya enforces the two contracts every product of this archetype must have: an **ingestion** contract (raw to
pipeline) and an **artifact** contract (pipeline to web). Both are code, both are tested, and drift fails CI. The
canonical, detailed reference is [../data-contract.md](../data-contract.md); this page is the architecture-level
summary.

## Contract 1, ingestion (raw to pipeline)

`data-pipeline/atalayalab/io/contract.py :: validate_table()` is the bring-your-own-data gate. It accepts a raw
file as a profilable table, rejects it with a reason, or accepts-and-flags it, never silently coercing bad data.

Before ingestion, `catalog/inventory.py` classifies each catalog resource into a download tier so the harvester
never blindly downloads every URL:

| Tier | Meaning | Action |
|---|---|---|
| `A_gov_direct` | Chilean-gov direct file (INE, datos.gob.cl, MINSAL, Mineduc, Meteochile, Servel, DIPRES) | mirror in full (size-gated) |
| `B_no_url` | sized but no `file_uri` | reference only |
| `C_geoservice` | OGC/WFS/metadata endpoint | metadata API pull, not a file mirror |
| `D_doi_archive` | DOI landing page for a foreign archive (PANGAEA, GEOFON, RESIF, EOL/UCAR) | reference only, never mirrored |
| `X_broken` | `blob:` / dead link | skipped, logged |

The mirror is bounded by a hard disk cap and a per-resource monster cap; downloads are resumable, retried, and
checksummed. Table acceptance is explicit: unreadable or empty tables are rejected; over 512 columns is rejected;
an all-null column is dropped and flagged; a high overall null fraction, very wide tables, and single-row tables
are flagged (accepted). Flags travel with the dataset into the profile and the manifest.

## Contract 2, artifact (pipeline to web)

`core/manifest.py` plus `core/trace.py` define the compact, versioned artifact the web replays. The web loads
**only** manifests plus artifacts; it never recomputes the science.

- Per case: `data/derived/<case>/artifact.json` (schema `atalaya.artifact/v1`) and
  `data/derived/manifests/<case>.json` (schema `atalaya.manifest/v2`: category, engines used, artifact pointer plus
  bytes, gate verdict, flags, stats).
- Global: `catalog.json` (all 1017 datasets), `graph.json` (decimated graph), `embeddings.json` (for live search),
  `metrics.json` (validation metrics), `categories.json` (case/variant registry), and `manifests/index.json`.

**Enforcement:** `frontend/src/lib/contract.types.ts` mirrors the manifest schema so any drift fails the web build,
and `scripts/check_artifacts.py` fails CI if a manifest's byte size or lane verdict drifts from the artifact on
disk.

## Why this matters

Without Contract 1 the tool could not be pointed at new data (it would be a demo, not a tool). Without Contract 2
the web could silently drift from what the pipeline produced. The contracts are the seam that makes Atalaya a
tool, not a slideshow. Artifacts are decimated (strongest N rows/edges) so the committed copy stays small; the
full graph lives in the out-of-git SQLite store and is queryable via the [MCP server](../../mcp/README.md).
