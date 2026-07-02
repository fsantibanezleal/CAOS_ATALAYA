# data-pipeline/ — the offline engine (`atalayalab`)

Rename `atalayalab` → `<slug>lab` per product. The **single source of physics/algorithm truth**; `frontend/` and
`app/` consume it, never re-implement it. Its own venv: **`.venv-pipeline`** (heavy SOTA engines, local-only).

## Layout (the package lives directly under `data-pipeline/`)
- `atalayalab/pipeline.py` — orchestrator + CLI (`python -m atalayalab.pipeline [all|<case>] [--seed N]`)
- `atalayalab/registry.py` — cases grouped by CATEGORY · `atalayalab/live.py` — Pyodide live entrypoint
- `atalayalab/io/` — `contract.py` (**CONTRACT 1**) · `formats.py` (standard readers/writers) · `schema.py` (types)
- `atalayalab/core/` — `rng.py` (seeded determinism) · `trace.py` · `manifest.py` (**CONTRACT 2**) · `gate.py`
- `atalayalab/model/` — the shared pure-Python core (Pyodide-safe); EXAMPLE = SIR
- `atalayalab/stages/` — `preprocess → feature_extraction → train → infer → evaluate → export`
- `atalayalab/cases/` — documented cases

Setup + run: `scripts/setup.{sh,ps1}` then `scripts/precompute.{sh,ps1}`. See
[../docs/architecture/05_precompute-pipeline.md](../docs/architecture/05_precompute-pipeline.md).
