# Framework card · MinHash joinability (datasketch)

## What & why

Two tables are *joinable* when one's key column values are contained in the other's, which is a foreign-key
relationship even when the tables differ wildly in size. Comparing full value sets pairwise across 1000+ datasets
is quadratic in data volume; **datasketch** gives fixed-size **MinHash** signatures whose element-wise agreement
estimates Jaccard, from which containment is recovered analytically. This is the Auctus/Lazo data-discovery
pattern (containment-based joinability), and it is why symmetric Jaccard alone is insufficient: a small key set
contained in a huge one has tiny Jaccard but containment ≈ 1.

Chosen over exact set intersection (does not scale, needs full values retained) and over plain Jaccard (misses
subset relationships). The library's `MinHashLSHEnsemble` is the containment-LSH index for the same idea at scale;
here the pattern is applied directly on precomputed signatures.

## Install (exact, verified)

Pinned in `data-pipeline/requirements-precompute.txt`:

```
datasketch==1.6.5
```

## Usage

```python
from datasketch import MinHash
mh = MinHash(num_perm=64)
for v in values:
    mh.update(str(v).strip().lower().encode("utf-8"))
sig = [int(x) for x in mh.hashvalues]   # fixed-length signature, stored on the column profile
```

## Applying it here

- `feature_extraction.py` `_minhash` builds a 64-permutation MinHash signature over each candidate join column's
  value set (entity-key columns plus the lowest-cardinality string columns, capped by `_EXTRA_MINHASH_COLS`,
  skipping ultra-high-cardinality columns). The signature is stored on `ColumnProfile.minhash`.
- `model/embed.py` `minhash_jaccard` estimates Jaccard from two equal-length signatures, and
  `minhash_containment(sig_small, sig_big, n_small, n_big)` recovers `|A ∩ B| / |A|` from Jaccard and set sizes.
- `infer.py` `_joinable_edges` iterates key-column pairs (comuna CUT / region), takes the best containment across
  columns, and emits a `JOINABLE_ON` edge when it exceeds `JOIN_MIN_CONTAINMENT` (0.5). The containment also feeds
  the calibrated affinity's `f_join` term. `export.py` credits `datasketch.MinHashLSHEnsemble` on the `graph`
  render kind.

## Caveats / license

MIT (redistributable). MinHash is an *estimator*: signature length trades accuracy for size (64 perms here). The
value set is capped (`_MINHASH_SAMPLE`) so the hash loop stays bounded. References: Broder, *On the resemblance
and containment of documents* (SEQUENCES 1997, DOI 10.1109/SEQUEN.1997.666900) and Zhu et al., *LSH Ensemble:
Internet-Scale Domain Search* (VLDB 2016, DOI 10.14778/2994509.2994534).
