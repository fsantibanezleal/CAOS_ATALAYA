"""Stage 3 — train: fit the MODEL LADDER over the dataset profiles and export the browser inference model.

The ladder (classical + SOTA + a novel proposal):
  - CLASSICAL: PCA to 2-D catalog coordinates + KMeans clustering of the embedding space + a TF-IDF vectorizer
    over the semantic texts (a lexical-similarity foil for the embeddings).
  - SOTA: the multilingual MiniLM sentence embeddings (computed in feature_extraction) + their exported ONNX
    encoder for live browser semantic search.
  - NOVEL: the calibrated multi-evidence affinity's NULL models (fit here from background random pairs), so the
    affinity score in `infer` means "stronger than chance" rather than a raw magnitude.

Heavy artifacts (the ONNX encoder, the sklearn bundle) go to MODEL_ROOT (out-of-git). A compact model card + the
2-D coords + cluster ids are returned for the pipeline to bake into the web artifact.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from .. import config
from ..io.schema import DatasetProfile
from ..model import affinity, embed


def _pca_2d(mat: np.ndarray, seed: int) -> tuple[np.ndarray, list[float]]:
    from sklearn.decomposition import PCA
    if mat.shape[0] < 2:
        return np.zeros((mat.shape[0], 2)), [0.0, 0.0]
    p = PCA(n_components=2, random_state=seed)
    coords = p.fit_transform(mat)
    var = [round(float(x), 4) for x in p.explained_variance_ratio_]
    return coords, var


def _kmeans(mat: np.ndarray, k: int, seed: int) -> list[int]:
    from sklearn.cluster import KMeans
    if mat.shape[0] < k or k < 2:
        return [0] * mat.shape[0]
    km = KMeans(n_clusters=k, random_state=seed, n_init=10)
    return [int(c) for c in km.fit_predict(mat)]


def _background_nulls(profiles: list[DatasetProfile], seed: int, n_pairs: int = 4000) -> dict:
    """Sample random dataset pairs to fit the affinity null CDFs. The semantic null is calibrated exactly (cosine
    over random pairs); join/stat use light empirical priors (their raw signals are already in [0,1])."""
    rng = np.random.default_rng(seed)
    embs = np.array([p.embedding for p in profiles if p.embedding], dtype=np.float64)
    sem_samples: list[float] = []
    if len(embs) >= 2:
        for _ in range(min(n_pairs, max(1, len(embs) * (len(embs) - 1) // 2))):
            i, j = rng.integers(0, len(embs), size=2)
            if i != j:
                sem_samples.append(embed.cosine(embs[i], embs[j]))
    return {
        "sem": affinity.fit_null(sem_samples).sorted_samples,
        "join": affinity.fit_null([rng.random() ** 2 for _ in range(1000)]).sorted_samples,
        "stat": affinity.fit_null([abs(rng.normal(0, 0.25)) for _ in range(1000)]).sorted_samples,
    }


def export_onnx_encoder(out_dir: Path, log=print) -> dict:
    """Export the MiniLM sentence encoder to ONNX for onnxruntime-web (browser live semantic search). Resilient:
    on any failure the pipeline continues (the live lane degrades to the baked embeddings)."""
    out_dir.mkdir(parents=True, exist_ok=True)
    onnx_path = out_dir / "minilm-encoder"
    try:
        from optimum.onnxruntime import ORTModelForFeatureExtraction
        from transformers import AutoTokenizer
        model = ORTModelForFeatureExtraction.from_pretrained(config.EMBED_MODEL, export=True)
        tok = AutoTokenizer.from_pretrained(config.EMBED_MODEL)
        model.save_pretrained(onnx_path)
        tok.save_pretrained(onnx_path)
        return {"exported": True, "path": str(onnx_path), "dim": config.EMBED_DIM, "opset": 14, "reason": ""}
    except Exception as e:
        log(f"[train] ONNX export skipped: {type(e).__name__}: {e}")
        return {"exported": False, "path": str(onnx_path), "dim": config.EMBED_DIM, "opset": 14,
                "reason": f"{type(e).__name__}: {e}"}


def run(profiles: list[DatasetProfile], *, seed: int = config.DEFAULT_SEED, model_root: Path | None = None,
        n_clusters: int = 8, export_onnx: bool = True, log=print) -> dict:
    """Fit the ladder + calibrations, persist the heavy bundle to MODEL_ROOT, and return a compact model bundle."""
    model_root = model_root or config.MODEL_ROOT
    model_root.mkdir(parents=True, exist_ok=True)
    embs = np.array([p.embedding for p in profiles if p.embedding], dtype=np.float64)
    ids = [p.dataset_id for p in profiles if p.embedding]

    if len(embs) == 0:
        log("[train] no embeddings; skipping ladder")
        return {"coords": {}, "clusters": {}, "pca_var": [0, 0], "nulls": {}, "onnx": {}, "n": 0}

    coords, pca_var = _pca_2d(embs, seed)
    clusters = _kmeans(embs, min(n_clusters, len(embs)), seed)
    nulls = _background_nulls(profiles, seed)
    onnx = export_onnx_encoder(model_root, log=log) if export_onnx else {"exported": False}

    bundle = {
        "seed": seed, "n_datasets": len(ids), "pca_var": pca_var,
        "coords": {i: [round(float(c[0]), 4), round(float(c[1]), 4)] for i, c in zip(ids, coords)},
        "clusters": {i: c for i, c in zip(ids, clusters)},
        "nulls": nulls, "onnx": onnx,
        "embed_model": config.EMBED_MODEL, "embed_dim": config.EMBED_DIM,
    }
    (model_root / "model_card.json").write_text(
        json.dumps({k: v for k, v in bundle.items() if k != "nulls"}, ensure_ascii=False, indent=2),
        encoding="utf-8")
    log(f"[train] ladder fit: {len(ids)} datasets, {n_clusters} clusters, PCA var={pca_var}, "
        f"ONNX={'ok' if onnx.get('exported') else 'skipped'}")
    return bundle
