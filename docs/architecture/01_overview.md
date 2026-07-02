# Architecture, overview

Atalaya is an **observatory of the observatory**: it harvests Chile's Data Observatory open catalog (about 1017
datasets), profiles every downloadable table, mines five kinds of cross-dataset relation into a knowledge graph,
and ships an explorer over that graph as a static site. It never hosts the source data; it stores only derived
metadata plus compact web artifacts.

The product is an instance of the CAOS product-repo archetype ([ADR-0057]): offline-pipeline-heavy,
backend-optional, deploying as a static deterministic-replay viewer. The base layout, the two contracts, the
staged pipeline names, and the gate are frozen; the per-product surface is the science (the stage bodies and
`model/`), the visualizations, and the cases plus content.

## The pipeline

One offline orchestrator, `data-pipeline/atalayalab/pipeline.py`, runs the frozen stage sequence with one domain
stage (`harvest`) prepended:

```
harvest -> preprocess -> feature_extraction -> train -> infer(relate) -> evaluate -> export
```

| Stage | Module | What it does |
|---|---|---|
| harvest | `stages/harvest.py` | enumerate the OpenSearch catalog, classify every resource into a download tier, size-gated mirror of the tier-A subset |
| preprocess | `stages/preprocess.py` | read each raw table, apply CONTRACT 1, normalize the accepted ones to parquet |
| feature_extraction | `stages/feature_extraction.py` | per-column fingerprint (dtype, nulls, entity-key role, MinHash) plus a per-dataset MiniLM embedding |
| train | `stages/train.py` | fit the model ladder (PCA, KMeans, the affinity null models) and export the ONNX encoder |
| infer (relate) | `stages/infer.py` | mine the five edge kinds plus the fused affinity into the knowledge graph |
| evaluate | `stages/evaluate.py` | negative control, semantic coherence, the TF-IDF lexical baseline (`lexical_baseline`), joinability sanity (leakage-safe, adversarial) |
| export | `stages/export.py` | write the compact per-case artifacts, manifests, catalog, graph, metrics (CONTRACT 2) |

Run it with `python -m atalayalab.pipeline` (full run over an already-mirrored corpus) or
`python -m atalayalab.pipeline --harvest` (also run the size-gated download first). See
[../guides/01_precompute-pipeline.md](../guides/01_precompute-pipeline.md).

## The three lanes

| Lane | Where | What runs | Notes |
|---|---|---|---|
| **Offline (precompute)** | `data-pipeline/atalayalab`, `.venv-pipeline` | the whole pipeline; SOTA engines pinned in `requirements-precompute.txt` | bakes the committed artifacts; heavy; never deployed |
| **Live (client-side)** | `frontend/` | ONNX semantic search plus JS affinity reweight | genuine in-browser compute, no server (see [04](04_live-lane-pyodide.md)) |
| **Replay** | `frontend/` | loads the committed manifests plus artifacts | always present; the site paints instantly on first load |

A measured [gate](03_the-gate.md) records, per case, whether a computation is small and safe enough to run live or
must be replayed from a baked artifact. The verdict is written into the manifest and CI fails on a mismatch.

## The flow, end to end

```
OpenSearch catalog -> harvest (tier gate) -> data/raw (out-of-git)
  -> CONTRACT 1 (io/contract.py) -> normalized parquet (out-of-git)
  -> feature_extraction -> train -> infer -> evaluate
  -> CONTRACT 2 (core/manifest.py + core/trace.py) -> data/derived (committed, compact)
  -> frontend/ replays it; two live computations run in the browser
```

The heavy artifacts (the raw mirror, the normalized parquet, the SQLite knowledge graph, the ONNX encoder) live
out of git under the `E:` scratch tree (`config.py`). Only the decimated web artifacts are committed.

## What Atalaya is, and is not

- **Is:** a relation explorer over real open data, honest about uncertainty (every correlation passes a
  permutation null plus Benjamini-Hochberg FDR, and a negative control confirms shuffled data yields near-zero
  findings). A reproducible offline pipeline whose committed artifacts the web replays, plus two genuinely live
  client-side computations.
- **Is not:** a data warehouse or a replacement for the official catalog; it does not host the source files, it
  does not claim causation from a correlation, and it does not mirror the heavy DOI scientific archives (it
  references them by link).

[ADR-0057]: ../../../conventions/architecture/0-archetype/ADR-0057-product-repo-archetype.md
