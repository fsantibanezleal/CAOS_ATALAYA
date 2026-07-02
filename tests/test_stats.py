"""Pure-stats tests (numpy-only, Pyodide-safe): the relation-mining statistics must be correct + deterministic,
because every CORRELATES edge and the negative control depend on them."""
import pytest

from atalayalab.model import stats


def test_spearman_monotone_is_one():
    x = [1, 2, 3, 4, 5, 6, 7]
    y = [10, 20, 25, 40, 50, 61, 70]      # strictly increasing, nonlinear
    assert stats.spearman(x, y) == pytest.approx(1.0)


def test_spearman_antitone_is_minus_one():
    x = list(range(10))
    y = list(range(10))[::-1]
    assert stats.spearman(x, y) == pytest.approx(-1.0)


def test_spearman_handles_ties():
    x = [1, 1, 2, 3, 3]
    y = [2, 2, 3, 5, 5]
    r = stats.spearman(x, y)
    assert 0.9 <= r <= 1.0


def test_permutation_pvalue_deterministic_and_smoothed():
    x = [1, 2, 3, 4, 5, 6, 7, 8]
    y = [2, 1, 4, 3, 6, 5, 8, 7]
    rho = stats.spearman(x, y)
    p1 = stats.permutation_pvalue(x, y, rho, n_perm=500, seed=42)
    p2 = stats.permutation_pvalue(x, y, rho, n_perm=500, seed=42)
    assert p1 == p2               # deterministic given the seed
    assert 0.0 < p1 <= 1.0        # add-one smoothing => never exactly 0


def test_permutation_pvalue_random_is_large():
    x = list(range(20))
    y = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5, 8, 9, 7, 9, 3, 2, 3, 8, 4]
    rho = stats.spearman(x, y)
    p = stats.permutation_pvalue(x, y, rho, n_perm=800, seed=1)
    assert p > 0.05               # a weak/absent correlation is not significant


def test_bh_fdr_monotone_and_controls():
    pvals = [0.001, 0.008, 0.02, 0.2, 0.5, 0.9]
    keep = stats.bh_fdr(pvals, q=0.05)
    assert keep[0] and keep[1]                 # the smallest survive
    assert not keep[-1] and not keep[-2]        # the largest do not
    # all-null should keep ~none
    assert sum(stats.bh_fdr([0.6, 0.7, 0.8, 0.9], q=0.05)) == 0


def test_partial_spearman_removes_common_driver():
    # x and y are both driven by z; partialling z out should collapse the correlation
    z = list(range(1, 21))
    x = [v + 0.01 for v in z]
    y = [2 * v for v in z]
    assert stats.spearman(x, y) > 0.99
    assert abs(stats.partial_spearman(x, y, z)) < 0.5
