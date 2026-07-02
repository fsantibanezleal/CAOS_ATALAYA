# Frameworks

One card per research-chosen engine/library · **the deep research, made binding**. Every engine the pipeline uses
gets a card here AND an exact pin in the matching `requirements-*.txt`. No hand-rolled toy substitute for a SOTA
engine the research prescribed.

- [00 · card TEMPLATE](frameworks/00_TEMPLATE.md) · copy per engine to `frameworks/<NN>_<tool>/<tool>.md`

## Engine cards

Every engine below is pinned in `data-pipeline/requirements-precompute.txt` and actually called by a
`data-pipeline/atalayalab/stages/` stage.

| # | Card | Engine (pin) | What it does here |
|---|------|--------------|-------------------|
| 01 | [opensearch-catalog](frameworks/01_opensearch-catalog/opensearch-catalog.md) | httpx 0.28.1 + h2 + tenacity | Harvest the Data Observatory catalog from its AWS OpenSearch endpoint (`harvest`). |
| 02 | [polars-duckdb](frameworks/02_polars-duckdb/polars-duckdb.md) | polars 1.17.1 + duckdb 1.1.3 + pyarrow 18.1.0 | Robust tabular I/O + parquet; the `preprocess`/`feature_extraction`/`infer` table engine. |
| 03 | [sentence-transformers](frameworks/03_sentence-transformers/sentence-transformers.md) | sentence-transformers 3.3.1 + torch 2.5.1 | Multilingual MiniLM dataset embeddings (`feature_extraction._embed_texts`). |
| 04 | [datasketch](frameworks/04_datasketch/datasketch.md) | datasketch 1.6.5 | MinHash signatures + containment for `JOINABLE_ON` (`feature_extraction._minhash`, `infer`). |
| 05 | [phik-scipy](frameworks/05_phik-scipy/phik-scipy.md) | phik 0.12.4 + scipy 1.14.1 + statsmodels 0.14.4 | Correlation mining: Spearman + permutation null + BH-FDR (`model/stats.py`, `infer`). |
| 06 | [scikit-learn](frameworks/06_scikit-learn/scikit-learn.md) | scikit-learn 1.6.0 | Classical ladder: PCA 2-D map + KMeans clusters + TF-IDF foil (`train`). |
| 07 | [lightgbm](frameworks/07_lightgbm/lightgbm.md) | lightgbm 4.5.0 | SOTA tabular foil (gradient-boosted trees) in the model ladder (`train`). |
| 08 | [onnx-optimum](frameworks/08_onnx-optimum/onnx-optimum.md) | onnx 1.17.0 + onnxruntime 1.20.1 + optimum 1.23.3 | Export the MiniLM encoder to ONNX for the browser live lane (`train.export_onnx_encoder`). |
| 09 | [rustworkx](frameworks/09_rustworkx/rustworkx.md) | rustworkx 0.15.1 + zstandard 0.23.0 | Graph analytics + the SQLite-WAL store snapshot (`core/graphdb.py`, `infer`). |
| 10 | [shapely-pyproj](frameworks/10_shapely-pyproj/shapely-pyproj.md) | shapely 2.0.6 + pyproj 3.7.0 | Spatial overlap + CRS for `SPATIALLY_OVERLAPS` + geographic coverage (`infer`). |

The live lane's browser encoder is the ONNX export of card 03/08 run through transformers.js on onnxruntime-web
(WASM); the client-side affinity reweight uses only numpy-safe arithmetic (`model/affinity.py`). See
[architecture/04_live-lane-pyodide.md](architecture/04_live-lane-pyodide.md).
