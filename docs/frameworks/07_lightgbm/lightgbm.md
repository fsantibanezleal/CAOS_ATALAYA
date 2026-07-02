# Framework card · gradient-boosted trees (LightGBM)

## What & why

The model ladder pairs each classical foil with a SOTA counterpart. For *tabular* prediction (dataset/link
labelling from the profile features: cardinalities, null fractions, entity-key presence, containment, embedding
distance) the SOTA tabular method is gradient-boosted decision trees, and **LightGBM** is the fast, leaf-wise,
histogram-based reference. It is documented in the ladder as the SOTA tabular foil against which the calibrated
multi-evidence affinity's ranking can be checked: does a learned model over the same features agree with the
hand-designed, interpretable affinity, and where do they diverge?

Chosen over a random forest (slower, less accurate on this kind of tabular feature set) and over a raw
scikit-learn `GradientBoostingClassifier` (much slower to train). Kept as an *available* rung: the affinity is the
shipped novel proposal; LightGBM is the tabular yardstick.

## Install (exact, verified)

Pinned in `data-pipeline/requirements-precompute.txt`:

```
lightgbm==4.5.0
```

## Usage

```python
import lightgbm as lgb
ds = lgb.Dataset(X, label=y)                       # X = per-pair profile features, y = related?/edge-kind label
booster = lgb.train({"objective": "binary", "learning_rate": 0.05, "num_leaves": 31,
                     "seed": seed}, ds, num_boost_round=200)
scores = booster.predict(X_eval)                    # ranking to compare against the affinity score
```

## Applying it here

- LightGBM is the SOTA tabular rung of the model ladder documented in `train.py`, a learned foil over the same
  per-pair profile features the calibrated affinity fuses by hand. It is available in the precompute environment
  for benchmarking the affinity ranking, kept alongside the classical (PCA/KMeans/TF-IDF) and SOTA-embedding rungs.
- The shipped relation edges are produced by the deterministic, interpretable engines (embeddings, MinHash
  containment, permutation-tested correlation, calibrated affinity); LightGBM is the yardstick, not the source of
  a baked edge, so no `export.py` render kind lists it as a producing engine.

## Caveats / license

MIT (redistributable). Gradient boosting is powerful but *opaque*, which is precisely why the shipped ranking is
the interpretable affinity (every edge carries its evidence) rather than the tree ensemble; LightGBM is used as a
comparison foil, seeded for reproducibility. Prebuilt wheels cover Windows/Linux/macOS.
