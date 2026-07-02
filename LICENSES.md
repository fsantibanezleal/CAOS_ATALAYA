# Licenses

Atalaya's own code is **MIT** (see [LICENSE](LICENSE)).

## Data

Atalaya stores only **derived metadata + compact artifacts**, not the source datasets. The underlying data belongs
to the **Data Observatory** and the original Chilean public sources (INE, datos.gob.cl, MINSAL, Mineduc, Meteochile,
Servel, DIPRES, and others), catalogued under the FAIR principles. Most datasets are licensed under the **Creative
Commons Attribution (CC-BY 4.0)** family; a minority are CC-BY-NC (non-commercial) or other open licenses. The
per-dataset license is captured in the inventory (`rights_identifier`) and shown in the app. Check the individual
dataset's license before any commercial reuse.

## Third-party engines (offline lane, not shipped to the browser)

Pinned in `requirements-precompute.txt`; used to build the committed artifacts. Representative licenses:

| Library | Purpose | License |
|---|---|---|
| polars, pyarrow | tabular IO / parquet | MIT / Apache-2.0 |
| duckdb | SQL over parquet | MIT |
| sentence-transformers, transformers | embeddings | Apache-2.0 |
| torch | embedding backend | BSD-3-Clause |
| datasketch | MinHash / LSH | MIT |
| phik | mixed-type correlation | Apache-2.0 |
| scipy, scikit-learn, statsmodels | stats / PCA / KMeans | BSD-3-Clause |
| lightgbm | gradient boosting | MIT |
| onnx, onnxruntime, optimum | ONNX export / inference | Apache-2.0 / MIT |
| rustworkx | graph analytics | Apache-2.0 |
| shapely, pyproj | geometry / CRS | BSD / MIT |
| httpx, tenacity | catalog harvest | BSD / Apache-2.0 |

## Third-party (browser, shipped)

| Library | Purpose | License |
|---|---|---|
| react, react-dom, react-router-dom | SPA | MIT |
| @huggingface/transformers | in-browser ONNX semantic search | Apache-2.0 |
| katex | equation rendering | MIT |
| i18next, react-i18next | bilingual UI | MIT |
| zustand, lucide-react | state / icons | MIT / ISC |

The bundled multilingual MiniLM model (`paraphrase-multilingual-MiniLM-L12-v2`) is Apache-2.0.

See [ATTRIBUTION.md](ATTRIBUTION.md) for citations.
