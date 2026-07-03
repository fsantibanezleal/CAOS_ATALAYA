# Framework card · correlation mining (SciPy + statsmodels + phik)

## What & why

The `CORRELATES` edge claims two indicators (aggregated to a shared key such as comuna) move together. That claim
must survive three tests, or the graph fills with spurious links: a robust rank correlation, a calibrated
significance test (gov indicators are rarely bivariate-normal), and multiple-testing control across thousands of
candidate pairs.

The shipped correlation path is **hand-implemented in numpy in `model/stats.py`** (Spearman, a seeded permutation
null, Benjamini-Hochberg FDR, first-order partial correlation) so the *identical* code runs offline in `relate`
and in the browser live lane (numpy-only, live-lane-safe). No stage imports scipy, statsmodels, or phik: they are
pinned in the precompute venv as reference implementations to check the numpy code against, and as an optional
mixed-type coefficient (phik) for future work, but they do not run the pipeline. Where you see the numbers, they
came from `model/stats.py`, not from scipy.

## Install (exact, verified)

Pinned in `data-pipeline/requirements-precompute.txt` as reference implementations only (no stage imports them):

```
phik==0.12.4        # optional mixed-type coefficient; not wired into any stage
scipy==1.14.1       # reference for the numpy stats; not imported by the pipeline
statsmodels==0.14.4 # reference for BH-FDR; not imported by the pipeline
```

## Usage

```python
from atalayalab.model import stats            # the shipped path: numpy only, live-lane-safe
rho  = stats.spearman(xa, xb)                 # rank correlation
p    = stats.permutation_pvalue(xa, xb, rho, n_perm=1000, seed=42)  # seeded null
keep = stats.bh_fdr(pvals, q=0.05)            # BH-FDR mask across the family
# phik (optional, not used by any stage): DataFrame.phik_matrix() for mixed-type association
```

## Applying it here

- `infer.py` `_correlation_edges` builds candidate pairs on a shared key (comuna CUT / region), computes
  `stats.spearman`, drops pairs below `CORR_MIN_ABS_RHO` (0.35), then applies `stats.permutation_pvalue`
  (seeded, 1000 perms) and `stats.bh_fdr` (q = 0.05) across the whole candidate family before emitting a
  `CORRELATES` edge. `stats.partial_spearman` guards against a correlation explained away by a common driver.
- The surviving `abs(rho)` feeds the affinity `f_stat` term (`_affinity_edges`).
- `export.py` carries a `"scipy"` label on the `findings` render kind, but the numbers are produced by
  `atalayalab.model.stats` (numpy); the label names the statistical family, not an imported engine.
- phik would be the mixed-type fallback (categorical × numeric) where rank correlation is undefined, but it is not
  wired in today; the shipped edge only mines numeric-vs-numeric Spearman.

## Caveats / license

SciPy/statsmodels BSD-3, phik MIT (all redistributable). The permutation null uses add-one smoothing (never
reports p = 0); more permutations tighten the estimate at linear cost. References: Spearman, *The proof and
measurement of association between two things* (1904, DOI 10.2307/1412159); Benjamini & Hochberg, *Controlling the
False Discovery Rate* (JRSS-B 1995, DOI 10.1111/j.2517-6161.1995.tb02031.x); Baak et al., *A new correlation
coefficient between categorical, ordinal and interval variables* (CSDA 2020, DOI 10.1016/j.csda.2020.107043).
