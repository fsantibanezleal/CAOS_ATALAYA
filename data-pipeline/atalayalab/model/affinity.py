"""The NOVEL proposal (beyond off-the-shelf dataset search) — a Calibrated Multi-Evidence Dataset Affinity score.

Existing tools rank dataset relatedness on ONE signal: Auctus/Lazo on value containment (joinability), semantic
catalog search on embedding cosine, correlation miners on statistical association. Each is individually
misleading: two datasets can be embedding-similar but share no join key; joinable on `year` yet describe
unrelated phenomena; correlate spuriously through a common driver (population, region).

Atalaya's affinity fuses three orthogonal evidences into one calibrated [0,1] score and, critically, calibrates
each evidence against a NULL model so the score means "stronger than chance", not "big raw number":

    S(A,B) = w_sem * f_sem(A,B) + w_join * f_join(A,B) + w_stat * f_stat(A,B)

where each f_* is the raw signal passed through its empirical null CDF (a percentile against a background sample
of random pairs), and the weights are evidence-reliability weights that DOWN-WEIGHT an evidence when it is
internally inconsistent (e.g. semantic-similar but zero joinable keys => the semantic evidence is discounted).
The fusion is monotone, interpretable (each term is reported), and auditable (every edge carries its evidence).

This module is pure/Pyodide-safe (numpy only) so the browser recomputes affinity live when the user reweights the
evidences. Calibration tables (the null CDFs) are fit offline and passed in as small arrays.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np

# default evidence weights (user-adjustable live). Sum need not be 1; the score renormalizes.
W_SEM_DEFAULT = 0.34
W_JOIN_DEFAULT = 0.40
W_STAT_DEFAULT = 0.26


@dataclass(frozen=True)
class NullCDF:
    """Empirical null: sorted background samples of a raw signal. `percentile(x)` = P(signal <= x | random pair)."""
    sorted_samples: list[float]

    def percentile(self, x: float) -> float:
        s = self.sorted_samples
        if not s:
            return x                       # uncalibrated fallback: pass the raw signal through
        lo, hi = 0, len(s)
        while lo < hi:                     # bisect_right
            mid = (lo + hi) // 2
            if x < s[mid]:
                hi = mid
            else:
                lo = mid + 1
        return lo / len(s)


def _reliability(sem: float, join: float, stat: float) -> tuple[float, float, float]:
    """Down-weight an evidence that contradicts the others. A high semantic match with no joinability is a weak
    reason to link (topical coincidence); a strong join key with no semantic/statistical echo is still a real
    structural link. Reliabilities are gentle multipliers in [0.5, 1]."""
    # semantic is only fully trusted if there is SOME structural or statistical support
    r_sem = 0.6 + 0.4 * max(join, stat)
    # joinability is intrinsically reliable (a shared key is a fact), lightly boosted by agreement
    r_join = 0.85 + 0.15 * max(sem, stat)
    # statistical association is only trusted with a joinable alignment (else the alignment is dubious)
    r_stat = 0.5 + 0.5 * join
    return r_sem, r_join, r_stat


def affinity(
    *,
    sem_cos: float,
    join_containment: float,
    stat_strength: float,
    null_sem: NullCDF | None = None,
    null_join: NullCDF | None = None,
    null_stat: NullCDF | None = None,
    w_sem: float = W_SEM_DEFAULT,
    w_join: float = W_JOIN_DEFAULT,
    w_stat: float = W_STAT_DEFAULT,
) -> dict:
    """Compute the calibrated multi-evidence affinity for a dataset pair. Returns the score + every term, so the
    UI/graph can show WHY two datasets are linked (never an opaque number)."""
    f_sem = null_sem.percentile(sem_cos) if null_sem else max(0.0, sem_cos)
    f_join = null_join.percentile(join_containment) if null_join else join_containment
    f_stat = null_stat.percentile(stat_strength) if null_stat else stat_strength

    r_sem, r_join, r_stat = _reliability(f_sem, f_join, f_stat)
    ws, wj, wt = w_sem * r_sem, w_join * r_join, w_stat * r_stat
    z = ws + wj + wt
    score = (ws * f_sem + wj * f_join + wt * f_stat) / z if z > 0 else 0.0
    return {
        "score": float(np.clip(score, 0.0, 1.0)),
        "f_sem": float(f_sem), "f_join": float(f_join), "f_stat": float(f_stat),
        "w_sem": float(ws), "w_join": float(wj), "w_stat": float(wt),
    }


def fit_null(samples: list[float]) -> NullCDF:
    """Build a null CDF from a background sample of a raw signal (offline calibration)."""
    return NullCDF(sorted_samples=sorted(float(s) for s in samples))
