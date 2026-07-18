# Guide, run the precompute pipeline

The offline pipeline harvests the catalog, profiles the tables, mines the graph, validates it, and bakes the
committed web artifacts. It is deterministic in `(params, seed)`.

## The two venvs

Atalaya keeps two isolated virtualenvs (never a global install):

- **`.venv-pipeline`** (offline SOTA lane): installs `requirements-precompute.txt` plus `requirements-dev.txt`
  plus the editable package. This is where the whole pipeline runs (polars, sentence-transformers, scikit-learn,
  datasketch, rustworkx, and the rest).
- **`.venv`** (runtime / live-thin lane): installs `requirements.txt` (just `numpy`), the live-lane-safe (numpy-only) core. This
  is the minimal environment that mirrors what the browser lane is allowed to import.

`scripts/setup.{sh,ps1}` creates both, installs each lane, and materializes `.env` (from a local secrets file if
`ATALAYA_ENV_SRC` points at one, else from `.env.example`). Secrets are provided via the environment; nothing is
committed.

## Run it

```bash
./scripts/setup.ps1            # or setup.sh: builds .venv-pipeline + .venv, installs, editable pkg, .env
./scripts/precompute.ps1       # runs: python -m atalayalab.pipeline  (all cases)
./scripts/smoke.ps1            # Contract 2 check: index <-> manifests <-> artifacts consistent
```

`precompute.{sh,ps1}` is a pass-through to the CLI, so any flag works:

```bash
python -m atalayalab.pipeline              # full run over an already-mirrored corpus
python -m atalayalab.pipeline --harvest    # also run the size-gated download first
python -m atalayalab.pipeline --limit 200  # cap resources processed (smoke / dev)
python -m atalayalab.pipeline --no-onnx    # skip the ONNX encoder export (faster dev loop)
python -m atalayalab.pipeline --seed 7     # a different seed (still deterministic)
```

## The `--harvest` flag

Enumeration of the catalog always runs (it is cached and cheap). The **download** of the tier-A mirror runs only
with `--harvest`, because it is heavy and network-bound (the size-gated mirror, honoring the disk cap and the
per-resource monster cap; see [../data-contract.md](../data-contract.md)). A normal iteration runs without it and
reuses the already-mirrored raw tree. If no normalized resources exist, the pipeline stops and tells you to run
`--harvest` first.

To re-harvest, `.env` must carry the read-only OpenSearch credential you extract from the public catalog site's
own network requests (see the [opensearch-catalog card](../frameworks/01_opensearch-catalog/opensearch-catalog.md));
a fresh clone without it can still run over an existing mirror but cannot enumerate or download.

## Outputs

The compact artifacts land in `data/derived/` (committed): `<case>/artifact.json`, `manifests/<case>.json`,
`manifests/index.json`, `catalog.json`, `graph.json`, `embeddings.json`, `metrics.json`, `categories.json`. The
heavy scratch (raw mirror, normalized parquet, the SQLite graph, the ONNX encoder) stays out of git under the `E:`
tree (`config.py`). Stage details: [../architecture/05_precompute-pipeline.md](../architecture/05_precompute-pipeline.md).
