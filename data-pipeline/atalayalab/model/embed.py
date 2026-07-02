"""Vector + set-similarity primitives shared by offline and live lanes (Pyodide-safe: numpy only).

- cosine similarity over the MiniLM sentence embeddings (semantic column/dataset matching).
- Jaccard + containment estimated from MinHash signatures (joinability by value overlap, the Auctus/Lazo idea:
  a small table joins into a big one when its key column is CONTAINED in the big one, which containment captures
  and symmetric Jaccard misses).
"""
from __future__ import annotations

import numpy as np


def cosine(a, b) -> float:
    a = np.asarray(a, dtype=np.float64)
    b = np.asarray(b, dtype=np.float64)
    na = np.linalg.norm(a)
    nb = np.linalg.norm(b)
    if na == 0 or nb == 0:
        return 0.0
    return float(np.dot(a, b) / (na * nb))


def cosine_matrix(mat) -> np.ndarray:
    """All-pairs cosine for a (n, d) matrix of row vectors. Normalizes then Gram."""
    m = np.asarray(mat, dtype=np.float64)
    norms = np.linalg.norm(m, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    unit = m / norms
    return unit @ unit.T


def minhash_jaccard(sig_a: list[int], sig_b: list[int]) -> float:
    """Estimate the Jaccard of the two underlying value sets from equal-length MinHash signatures."""
    if not sig_a or not sig_b or len(sig_a) != len(sig_b):
        return 0.0
    eq = sum(1 for x, y in zip(sig_a, sig_b) if x == y)
    return eq / len(sig_a)


def minhash_containment(sig_small: list[int], sig_big: list[int], n_small: int, n_big: int) -> float:
    """Estimate |A ∩ B| / |A| (containment of the small set in the big one) from MinHash signatures + set sizes.

    From Jaccard J and set sizes: |A∩B| = J/(1+J) * (|A|+|B|); containment = |A∩B| / |A|. This is the joinability
    score: it is high when the small column's values are a subset of the big column's, which is exactly a foreign
    key relationship, even when the tables differ wildly in size (so Jaccard would look tiny)."""
    j = minhash_jaccard(sig_small, sig_big)
    if j <= 0 or n_small <= 0:
        return 0.0
    inter = j / (1.0 + j) * (n_small + n_big)
    return max(0.0, min(1.0, inter / n_small))
