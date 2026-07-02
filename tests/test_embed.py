"""Vector + set-similarity primitives (numpy-only; MinHash tests need datasketch → importorskip)."""
import pytest

from atalayalab.model import embed


def test_cosine_identity_and_orthogonal():
    assert embed.cosine([1, 0, 0], [1, 0, 0]) == 1.0
    assert embed.cosine([1, 0, 0], [0, 1, 0]) == 0.0
    assert embed.cosine([0, 0, 0], [1, 1, 1]) == 0.0


def test_cosine_matrix_diagonal_is_one():
    m = embed.cosine_matrix([[1, 0], [0, 1], [1, 1]])
    for i in range(3):
        assert abs(m[i, i] - 1.0) < 1e-9


def test_minhash_containment_of_subset_is_high():
    # a small set fully contained in a big one -> containment near 1 (even though Jaccard is small)
    pytest.importorskip("datasketch")
    big = list(range(1000))
    small = list(range(50))
    from datasketch import MinHash

    def sig(vals):
        mh = MinHash(num_perm=128)
        for v in vals:
            mh.update(str(v).encode())
        return [int(x) for x in mh.hashvalues]

    cont = embed.minhash_containment(sig(small), sig(big), len(small), len(big))
    assert cont > 0.7          # subset containment is high


def test_minhash_containment_disjoint_is_low():
    pytest.importorskip("datasketch")
    from datasketch import MinHash

    def sig(vals):
        mh = MinHash(num_perm=128)
        for v in vals:
            mh.update(str(v).encode())
        return [int(x) for x in mh.hashvalues]

    a = sig(range(0, 100))
    b = sig(range(1000, 1100))
    assert embed.minhash_containment(a, b, 100, 100) < 0.2
