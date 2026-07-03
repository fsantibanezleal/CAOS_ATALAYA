# Atalaya

**A watchtower over Chile's open data.** Atalaya harvests the [Data Observatory](https://catalogo.dataobservatory.net)
open catalog, profiles every downloadable table, and mines five kinds of cross-dataset relation into an explorable
knowledge graph, so you can see not just *what* datasets exist but *how they connect*: which can be joined, which
describe the same thing, and which actually correlate when aligned by comuna or region.

> An observatory of the observatory: a catalog of a thousand datasets has no map; Atalaya builds one.

Live: `atalaya.fasl-work.com` (planned) · Source: github.com/fsantibanezleal/CAOS_ATALAYA

---

## Why it exists (the problem)

Chile's Data Observatory publishes 1000+ open datasets following FAIR principles. But a large flat catalog hides
the relational knowledge that makes the data useful: joinability, semantic overlap, and real statistical
relationships stay implicit, and finding them by hand across a thousand datasets is infeasible. Atalaya makes that
relational structure explicit, honest and explorable.

## What you can do with it

- **Map** the whole catalog by meaning (a PCA projection of multilingual embeddings), recoloured by theme, origin,
  cluster, join key, recency or data quality.
- **Find joinable datasets** (shared entity keys with high value containment) and the exact columns to join on.
- **Discover correlations** across datasets that survive a permutation null + false-discovery-rate control.
- **Search by meaning** live in your browser (an ONNX encoder runs client-side, no server).
- **Rank relatedness** with a novel calibrated multi-evidence affinity you can reweight live.
- Inspect **geographic** and **temporal** coverage and a **data-quality** census; query the graph from any agent
  via the included **MCP server**.

## Impact / status

- **1017** datasets catalogued; the gov direct-file subset (**~25 GB**, 303 datasets / 1382 files, measured in `data/harvest_report.json`) downloaded + processed offline.
- **8** analytical categories, **11** cases, each a genuine interactive domain view.
- Honesty gate: on real data the correlation miner finds relationships that survive FDR; on the **same shuffled**
  alignments it finds **~0** (an empirical false-discovery rate near 0).
- `0.x` while the corpus + app are brought fully to the product-quality bar.

---

## Problem, formalized

Two datasets are *joinable* on an entity key when the smaller key set is contained in the larger; containment is
estimated from MinHash signatures. Two indicators *correlate* when their Spearman ρ, aligned on a shared key,
survives a seeded permutation null and Benjamini-Hochberg FDR. The **novel affinity** fuses semantic, joinability
and correlation evidence, each calibrated against a null model:

```
S(A,B) = Σ_e w_e · r_e · f_e / Σ_e w_e · r_e ,   f_e = null-CDF percentile of evidence e
```

Full derivations, assumptions and references are in the app's **Methodology** page and in [docs/](docs/).

## Architecture

```
Data Observatory (OpenSearch)  →  harvest (tier-gated mirror, out-of-git)
  →  preprocess (ingestion contract → parquet)  →  profile (fingerprints, entity keys, MinHash, embeddings)
  →  train (PCA/KMeans + MiniLM/ONNX + affinity nulls)  →  relate (5 edge kinds → SQLite-WAL graph)
  →  evaluate (negative control)  →  export (compact web artifacts + manifests)  →  static SPA (replay + live)
```

Three lanes: **offline** (heavy SOTA engines, local `.venv`), **live** (ONNX search + affinity reweight in the
browser), **replay** (the committed artifacts). Diagram + depth: the in-app ⓘ *Architecture* modal and
[docs/architecture/](docs/architecture/).

## The offline pipeline

Named, seeded, deterministic stages (`data-pipeline/atalayalab/`): `harvest → preprocess → feature_extraction →
train → infer → evaluate → export`. Run it with `python -m atalayalab.pipeline`. The real SOTA engines are pinned
in `requirements-precompute.txt` and documented in [docs/frameworks/](docs/frameworks/): polars, DuckDB,
sentence-transformers, datasketch (MinHash), phik, SciPy, LightGBM, rustworkx, ONNX.

## Features

- Full-catalog enumeration via the discovered OpenSearch backend + resilient, size-gated, resumable download.
- Bring-your-own-data ingestion contract with an explicit outlier policy.
- Chilean entity-key detection (comuna CUT, region, year, lat/lon, RUT).
- Cross-dataset knowledge graph with per-edge evidence, persisted portably (SQLite-WAL + zstd snapshot).
- Calibrated multi-evidence affinity (the novel proposal) with live reweighting.
- Bilingual (EN/ES) React SPA, light/dark, KaTeX, interactive viz with cursor read-outs, ⓘ architecture modal.
- In-repo read-only MCP server over the graph.

## Metrics / honesty

Every external number is sourced (DOIs in the app + `frontend/src/data/citations.ts`); synthetic content is
labelled; the negative-control FDR and semantic-coherence numbers on the **Benchmark** page are read directly from
the committed `data/derived/metrics.json`. Atalaya does not claim causation, does not mirror the heavy DOI
scientific archives (it references them), and states its limitations per view.

---

## Quick start

```bash
# 1. environments (two venvs) + .env, no global installs
./scripts/setup.ps1            # or scripts/setup.sh

# 2. run the offline pipeline (harvest already-mirrored data + mine the graph)
./scripts/precompute.ps1       # python -m atalayalab.pipeline ; add --harvest to re-crawl

# 3. tests + CONTRACT-2 check
.venv-pipeline/Scripts/python -m pytest ; python scripts/check_artifacts.py

# 4. the web app
cd frontend && npm install && npm run dev
```

Secrets (the read-only catalog credential) are kept OUT of this repo and are read from the environment / your secret store; they are materialized
into `.env` by `setup.*`; the repo commits only `.env.example`. Heavy data and models stay out-of-git on a scratch
volume configured via `ATALAYA_DATA_ROOT` / `ATALAYA_MODEL_ROOT`; only compact derived artifacts are committed.

## Repository structure

```
data-pipeline/atalayalab/   engine: catalog/ · io/ · core/ · model/ · stages/ · cases/ · pipeline.py · live.py
data/derived/               committed compact web artifacts + manifests (CONTRACT 2)
frontend/                   React 19 + Vite SPA (6 pages, viz, i18n, theming, ⓘ modal)
mcp/                        read-only MCP server over the knowledge graph
docs/                       the wiki (architecture · frameworks · cases · guides · data-contract)
scripts/                    setup · precompute · dev (.ps1 + .sh) · check_artifacts.py
tests/                      determinism, contracts, stats, gate, graph, pipeline smoke
```

## Ports / deploy

Static-first: GitHub Pages (or `vps-static`) at `atalaya.fasl-work.com`. No backend, no database, no runtime data
server. See [docs/architecture/07_deploy.md](docs/architecture/07_deploy.md).

## MCP server

```bash
python mcp/atalaya_mcp.py         # stdio JSON-RPC; tools: find_related, join_path, correlations_for, search_columns
python mcp/atalaya_mcp.py --selftest
```

See [mcp/README.md](mcp/README.md).

## References

- Reimers & Gurevych (2020), *Multilingual sentence embeddings by knowledge distillation* · DOI 10.18653/v1/2020.emnlp-main.365
- Zhu et al. (2016), *LSH Ensemble: internet-scale domain search* · DOI 10.14778/2994509.2994534
- Benjamini & Hochberg (1995), *Controlling the false discovery rate* · DOI 10.1111/j.2517-6161.1995.tb02031.x
- Baak et al. (2020), *phi_k correlation* · DOI 10.1016/j.csda.2020.107043
- Wilkinson et al. (2016), *FAIR Guiding Principles* · DOI 10.1038/sdata.2016.18

## License

MIT · see [LICENSE](LICENSE). Dataset content belongs to the Data Observatory and the original Chilean sources
under their respective licenses (mostly CC-BY family); Atalaya stores only derived metadata + compact artifacts.
Built by Felipe Santibáñez-Leal · a CAOS research project.
