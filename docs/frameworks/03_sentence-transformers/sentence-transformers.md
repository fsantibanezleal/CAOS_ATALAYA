# Framework card · multilingual sentence embeddings (Sentence-Transformers + PyTorch)

## What & why

Two datasets can be *about* the same thing (education by comuna vs school enrolment by comuna) without sharing a
join key or a lexical overlap. Semantic matching needs a sentence encoder, and the catalog is Spanish (with some
English DataCite records), so the encoder must be multilingual. **Sentence-Transformers** with
`paraphrase-multilingual-MiniLM-L12-v2` (384-dim, 50+ languages) is the SOTA-tier, small, fully-local choice:
no API, deterministic in eval mode, and small enough to export to ONNX for a browser live lane. **PyTorch** is the
CPU backend (embedding precompute only, no training).

Chosen over a TF-IDF / bag-of-words approach because cross-lingual paraphrase similarity is exactly what
off-the-shelf lexical search misses (education by comuna vs school enrolment by comuna share meaning but little
surface text). That claim is now measured, not asserted: a TF-IDF lexical foil is fitted in
`evaluate.lexical_baseline` over the same `profile.semantic_text` and scored on the same top-5 neighbour-theme
coherence, and the MiniLM embedding wins (94.4% vs 93.0% for TF-IDF, against 47.8% chance), a modest, honest +1.4
points. Semantic matching in production is carried by these embeddings; the lexical foil exists to keep the SOTA
rung honest.

## Install (exact, verified)

Pinned in `data-pipeline/requirements-precompute.txt`:

```
sentence-transformers==3.3.1
torch==2.5.1
```

## Usage

```python
from sentence_transformers import SentenceTransformer
model = SentenceTransformer("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2", device="cpu")
vecs = model.encode(texts, batch_size=32, normalize_embeddings=True, show_progress_bar=False)  # (n, 384)
```

## Applying it here

- `feature_extraction.py` `_embed_texts` loads the model on CPU and encodes every dataset's semantic text
  (title + theme + sub-category + first 600 chars of description + first 40 column names, built by
  `_semantic_text`) in one batched, `normalize_embeddings=True` pass. The result is rounded and stored on each
  `DatasetProfile.embedding` (384-dim). Model id + dim come from `config.EMBED_MODEL` / `config.EMBED_DIM`.
- `train.py` `_pca_2d` / `_kmeans` run over the embedding matrix (the SOTA signal), and `_background_nulls`
  samples random-pair cosines to calibrate the affinity semantic null.
- `infer.py` `_semantic_edges` builds the `SEMANTICALLY_SIMILAR` edges from the cosine matrix
  (`model/embed.cosine_matrix`), top-k per dataset above `SEM_MIN_COS`. The same embeddings are exported (rounded)
  by `export.py` `_embeddings_json` for the browser live semantic-search lane.

## Caveats / license

Apache-2.0 (library) and Apache-2.0 model weights (redistributable). Deterministic on CPU in eval mode; GPU would
change low bits. The first run downloads the HF weights (cache locally, never global). References for the
architecture: Reimers & Gurevych, *Sentence-BERT* (EMNLP 2019, DOI 10.18653/v1/D19-1410) and *Making Monolingual
Sentence Embeddings Multilingual via Knowledge Distillation* (EMNLP 2020, DOI 10.18653/v1/2020.emnlp-main.365).
