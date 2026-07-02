"""Tests for the NOVEL calibrated multi-evidence affinity (numpy-only). The score must be bounded, monotone in
each evidence, calibrated against a null, and down-weight a lone semantic match with no structural support."""
from atalayalab.model import affinity


def test_affinity_bounded_and_reported():
    r = affinity.affinity(sem_cos=0.8, join_containment=0.7, stat_strength=0.6)
    assert 0.0 <= r["score"] <= 1.0
    for k in ("f_sem", "f_join", "f_stat", "w_sem", "w_join", "w_stat"):
        assert k in r                      # every term is reported (auditable, never opaque)


def test_affinity_monotone_in_join():
    lo = affinity.affinity(sem_cos=0.5, join_containment=0.1, stat_strength=0.2)["score"]
    hi = affinity.affinity(sem_cos=0.5, join_containment=0.9, stat_strength=0.2)["score"]
    assert hi > lo


def test_lone_semantic_is_discounted():
    # semantic-only (no join, no stat) should score below a case with matching structural support
    lone = affinity.affinity(sem_cos=0.9, join_containment=0.0, stat_strength=0.0)["score"]
    supported = affinity.affinity(sem_cos=0.9, join_containment=0.6, stat_strength=0.5)["score"]
    assert supported > lone


def test_null_calibration_shifts_score():
    # with a null where 0.8 is a very high percentile, the calibrated semantic term should be near 1
    null = affinity.fit_null([0.0, 0.1, 0.2, 0.3, 0.4, 0.5])
    cal = affinity.affinity(sem_cos=0.8, join_containment=0.0, stat_strength=0.0, null_sem=null)
    assert cal["f_sem"] >= 0.99


def test_fit_null_is_sorted():
    n = affinity.fit_null([0.3, 0.1, 0.2])
    assert n.sorted_samples == [0.1, 0.2, 0.3]
    assert n.percentile(0.25) == 2 / 3
