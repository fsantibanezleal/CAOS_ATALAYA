# Framework card · classical model ladder (scikit-learn)

## What & why

The model ladder needs classical foils so the SOTA embedding signal is measured against honest baselines, not
asserted. **scikit-learn** supplies two, both wired into `train.py`: **PCA** projects the 384-dim embedding space
to 2-D catalog coordinates (the map layout); **KMeans** clusters datasets in embedding space (the map's color
groups). These are the deterministic, well-understood classical rungs beneath the SOTA MiniLM rung and the novel
calibrated-affinity rung.

Chosen because these are the canonical, seeded, reproducible implementations of exactly the classical methods the
ladder prescribes; no reason to hand-roll PCA/KMeans when the reference is one import away.

## Install (exact, verified)

Pinned in `data-pipeline/requirements-precompute.txt`:

```
scikit-learn==1.6.0
```

## Usage

```python
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans
coords = PCA(n_components=2, random_state=seed).fit_transform(embeddings)   # (n, 2)
labels = KMeans(n_clusters=8, random_state=seed, n_init=10).fit_predict(embeddings)
```

## Applying it here

- `train.py` `_pca_2d` fits `PCA(n_components=2, random_state=seed)` on the embedding matrix and returns the 2-D
  coordinates + `explained_variance_ratio_` (baked into the model card and each graph node's `coord`).
- `train.py` `_kmeans` fits `KMeans(n_clusters=k, random_state=seed, n_init=10)` and returns per-dataset cluster
  ids (baked as each node's `cluster`). Coordinates + cluster ids flow into `infer.py` node attributes and
  `export.py` `graph.json`.
- `export.py` credits `scikit-learn.PCA` + `scikit-learn.KMeans` on the `map` render kind.
- No TF-IDF vectorizer is fitted: `train.py` builds no lexical foil. Semantic matching relies on the MiniLM
  embeddings; scikit-learn's role here is exactly PCA and KMeans over those embeddings.

## Caveats / license

BSD-3 (redistributable). PCA and KMeans are seeded here (`random_state=seed`, `n_init=10`) for reproducibility;
both degrade gracefully when there are fewer rows than components/clusters (guarded in `train.py`). References:
Pearson, *On lines and planes of closest fit* (1901, DOI 10.1080/14786440109462720); Lloyd, *Least squares
quantization in PCM* (IEEE Trans. Inf. Theory 1982, DOI 10.1109/TIT.1982.1056489).
