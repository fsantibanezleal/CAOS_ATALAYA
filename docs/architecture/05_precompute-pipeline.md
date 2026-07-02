# The staged precompute pipeline

`data-pipeline/atalayalab/pipeline.py` orchestrates the frozen stage sequence. The stage names and signatures are
fixed; the bodies carry the science. One domain stage, `harvest`, is prepended to the archetype sequence.

```
harvest -> preprocess -> feature_extraction -> train -> infer(relate) -> evaluate -> export
```

## harvest, `stages/harvest.py`

Enumerate every catalog document through the OpenSearch client (cached to disk, resumable), build a typed
inventory, and classify each resource into a download tier. Then a **size-gated** mirror downloads only the
tier-A (Chilean-gov direct file) resources: HEAD-sizing first, honoring a hard disk cap
(`ATALAYA_DISK_CAP_GB`, default 400 GB) and a per-resource monster cap (`ATALAYA_MONSTER_GB`, default 50 GB),
with resume (range-GET), exponential backoff, and sha256 checksums. Enumeration always runs; the download runs
only with `--harvest`. DOI archives and geoservices are referenced, never mirrored (see
[08_data-contracts.md](08_data-contracts.md) and the [catalog framework card](../frameworks/01_opensearch-catalog/opensearch-catalog.md)).

## preprocess, `stages/preprocess.py`

Read each raw tier-A tabular resource, apply CONTRACT 1 (`io/contract.py`), and normalize the accepted tables to
zstd parquet in the out-of-git derived tree. Encoding is sniffed and the separator inferred because Chilean gov
CSVs are inconsistent. Heavy tables are row-capped for profiling (`sample_rows`, default 50000) so the corpus
scan stays bounded; the full file stays on disk.

## feature_extraction, `stages/feature_extraction.py`

Turn each normalized table into a per-column fingerprint (dtype, null fraction, cardinality, numeric stats, a few
sample values, an entity-key role via `catalog/entities.py`, and a MinHash signature for containment), then roll
those up into a per-dataset profile with its entity keys, temporal coverage, a semantic text (title, description,
column names), and a multilingual MiniLM embedding of that text. Embeddings are computed in one batched CPU pass
for speed and determinism.

## train, `stages/train.py`

Fit the model ladder and export the browser encoder:

- **Classical:** PCA to 2-D catalog coordinates and KMeans clustering of the embedding space (both scikit-learn).
- **SOTA:** the multilingual MiniLM embeddings (computed upstream) and their ONNX-exported encoder for the live
  browser lane.
- **Novel:** the affinity **null models**, fit here from random background pairs, so the affinity score means
  "stronger than chance" and not a raw magnitude. The semantic null is calibrated exactly (cosine over random
  pairs); the join and stat nulls use light empirical priors.

Heavy artifacts (the ONNX encoder, the sklearn bundle) go to `MODEL_ROOT` (out-of-git). A compact model card plus
the 2-D coords and cluster ids are returned for the export stage to bake into the web.

## infer (relate), `stages/infer.py`

Mine the cross-dataset knowledge graph. Five orthogonal edge kinds, each carrying explicit evidence, plus the
fused affinity summary edge. Detailed in [06_model-evaluation.md](06_model-evaluation.md) and the
[correlation / joinability / affinity cases](../cases/README.md).

## evaluate, `stages/evaluate.py`

The TEST stage: negative control (shuffled-key correlations, an empirical FDR), semantic neighbor coherence,
joinability sanity, and graph coverage. See [06_model-evaluation.md](06_model-evaluation.md).

## export, `stages/export.py`

CONTRACT 2. Write the compact per-case artifacts and manifests, plus the global payloads: `catalog.json` (all
1017 datasets, lightweight), `graph.json` (decimated graph), `embeddings.json` (for live search),
`metrics.json` (the evaluation metrics), `categories.json` (the case/variant registry), and `manifests/index.json`.
The manifest names the real engines that produced each render kind (traceability, no toy-substitute claims).

## Running it

```
python -m atalayalab.pipeline              # full run over an already-mirrored corpus
python -m atalayalab.pipeline --harvest    # also run the size-gated download first
python -m atalayalab.pipeline --limit 200  # cap resources (smoke / dev)
python -m atalayalab.pipeline --no-onnx    # skip the ONNX export (faster dev loop)
```

Outputs land in `data/derived/` (committed, compact). The run is deterministic in `(params, seed)`. Full guide:
[../guides/01_precompute-pipeline.md](../guides/01_precompute-pipeline.md).
