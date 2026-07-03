# Deploy

Atalaya deploys **static-first**, with no backend at request time. Everything the web serves is the committed
`data/derived/` artifacts plus the browser bundle; the two live computations (ONNX semantic search, affinity
reweight) run entirely client-side.

## Default, GitHub Pages (static)

`.github/workflows/deploy-pages.yml`: build the SPA (`frontend/copy-data.mjs` overlays `data/derived` into
`frontend/public/data`, including `embeddings.json` for the live search), then deploy `frontend/dist`. There is no
server process; the site is a static bundle plus JSON artifacts plus the WASM ONNX runtime loaded on demand.

## Alternative, vps-static

The same static bundle can be served from the VPS behind nginx (a plain static site, no app server). This is a
hosting choice only; the artifact contract and the live lanes are identical. The FastAPI `app/` backend is dormant
by default and is not needed for Atalaya (activate only on a server-side-processing trigger, e.g. processing of
uploaded data).

The **live instance at [atalaya.fasl-work.com](https://atalaya.fasl-work.com) runs this vps-static option**;
GitHub Pages is the equally-supported default for anyone deploying their own copy. The two are interchangeable:
same bundle, same artifacts, same client-side live lanes.

## What must be true at deploy time

- The pipeline has run and `data/derived/` is up to date and committed (deterministic in `(params, seed)`).
- `embeddings.json` is present so the live semantic-search lane has vectors to rank against.
- The ONNX encoder is available to transformers.js in the browser (fetched from the model host / CDN); if it
  cannot load, semantic search falls back to keyword search, so a failed model load never breaks the deploy.

## CI guards

`ci.yml` keeps the base honest on every push: ruff plus pytest, a pipeline smoke run, and `scripts/check_artifacts.py`
(CONTRACT 2: `index -> manifests -> artifacts` exist, byte sizes match, `lane == gate`). Additional guards fail the
build on a tracked `.env`, a committed venv, a native or heavy binary, raw data, or a leaked machine path, so
secrets and heavy scratch never enter git (they live under the `E:` scratch tree per `config.py`).

## Honesty note

The heavy graph DB, the raw mirror, the normalized parquet, and the ONNX encoder are out-of-git; the deploy ships
only the decimated artifacts. A visitor sees the strongest N edges and findings, not the full graph; the full graph
is reachable only by running the pipeline locally and querying the [MCP server](../../mcp/README.md).
