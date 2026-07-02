"""Statistics for relation mining — Pyodide-safe (numpy is the only import, and it is in the live wheel set), so
the exact same code runs in the offline `relate` stage AND in the browser live lane. Deterministic given a seed.

Implements what the correlation-mining edge needs and nothing heavier: Spearman rank correlation, a permutation
null for its significance (so we never trust an unvetted rho), Benjamini-Hochberg FDR across a family of tests,
and first-order partial correlation (to partial out a shared driver such as population).
"""
from __future__ import annotations

import math

from ..core.rng import make_rng


def _rank(xs: list[float]) -> list[float]:
    order = sorted(range(len(xs)), key=lambda i: xs[i])
    ranks = [0.0] * len(xs)
    i = 0
    while i < len(order):
        j = i
        while j + 1 < len(order) and xs[order[j + 1]] == xs[order[i]]:
            j += 1
        avg = (i + j) / 2.0 + 1.0            # average rank for ties (1-based)
        for k in range(i, j + 1):
            ranks[order[k]] = avg
        i = j + 1
    return ranks


def pearson(x: list[float], y: list[float]) -> float:
    n = len(x)
    if n < 3:
        return 0.0
    mx = sum(x) / n
    my = sum(y) / n
    num = sum((a - mx) * (b - my) for a, b in zip(x, y))
    dx = math.sqrt(sum((a - mx) ** 2 for a in x))
    dy = math.sqrt(sum((b - my) ** 2 for b in y))
    return num / (dx * dy) if dx > 0 and dy > 0 else 0.0


def spearman(x: list[float], y: list[float]) -> float:
    """Rank correlation; robust to monotone nonlinearity and outliers (the default for gov indicators)."""
    if len(x) < 3:
        return 0.0
    return pearson(_rank(x), _rank(y))


def permutation_pvalue(x: list[float], y: list[float], rho: float, *, n_perm: int = 2000, seed: int = 42) -> float:
    """Two-sided p-value for `rho` by permuting y. Deterministic (seeded). A calibrated null, not a t-approximation
    that assumes bivariate normality (gov indicators rarely are)."""
    n = len(x)
    if n < 4:
        return 1.0
    rng = make_rng(seed)
    rx = _rank(x)
    idx = list(range(n))
    ge = 0
    target = abs(rho)
    for _ in range(n_perm):
        rng.shuffle(idx)
        ry = _rank([y[i] for i in idx])
        if abs(pearson(rx, ry)) >= target:
            ge += 1
    return (ge + 1) / (n_perm + 1)          # add-one smoothing (never reports p=0)


def bh_fdr(pvals: list[float], q: float = 0.05) -> list[bool]:
    """Benjamini-Hochberg: which hypotheses are accepted controlling FDR at q. Returns a boolean mask aligned to
    `pvals`. Essential because we test thousands of dataset pairs and must not chase false positives."""
    m = len(pvals)
    if m == 0:
        return []
    order = sorted(range(m), key=lambda i: pvals[i])
    keep = [False] * m
    kmax = -1
    for rank, i in enumerate(order, start=1):
        if pvals[i] <= q * rank / m:
            kmax = rank
    for rank, i in enumerate(order, start=1):
        if rank <= kmax:
            keep[i] = True
    return keep


def partial_spearman(x: list[float], y: list[float], z: list[float]) -> float:
    """First-order partial rank-correlation of x,y controlling for z. Used to test whether an apparent
    correlation survives partialling out a common driver (e.g. population, region). Guards spurious links."""
    rxy, rxz, ryz = spearman(x, y), spearman(x, z), spearman(y, z)
    denom = math.sqrt((1 - rxz ** 2) * (1 - ryz ** 2))
    return (rxy - rxz * ryz) / denom if denom > 1e-9 else 0.0
