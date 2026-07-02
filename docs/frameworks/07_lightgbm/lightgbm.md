# Framework card · gradient-boosted trees (LightGBM)

> **Status: NOT wired into the shipped pipeline.** `train.py` does not import or fit LightGBM. The shipped ranking
> model is the novel calibrated multi-evidence affinity; the shipped model-ladder rungs are PCA + KMeans
> (classical, scikit-learn) and MiniLM embeddings + the ONNX encoder (SOTA). LightGBM is pinned in the precompute
> venv only as an optional tabular yardstick you could run by hand to sanity-check the affinity ranking. It is not
> a rung of the shipped ladder and produces no baked artifact. The rest of this card describes how it *would* be
> used if you chose to run that comparison.

## What & why

If you want a *learned* tabular counterpart to compare the affinity against (dataset/link labelling from the
profile features: cardinalities, null fractions, entity-key presence, containment, embedding distance), the
standard SOTA tabular method is gradient-boosted decision trees, and **LightGBM** is the fast, leaf-wise,
histogram-based reference. The comparison it enables: does a learned model over the same features agree with the
hand-designed, interpretable affinity, and where do they diverge? This is an optional benchmark, not part of a
pipeline run.

Chosen (as the yardstick option) over a random forest (slower, less accurate on this kind of tabular feature set)
and over a raw scikit-learn `GradientBoostingClassifier` (much slower to train). The affinity is the shipped novel
proposal; LightGBM is only the available tabular yardstick, not a shipped rung.

## Install (exact, verified)

Pinned in `data-pipeline/requirements-precompute.txt` as an optional yardstick (no stage imports it):

```
lightgbm==4.5.0   # available for a manual affinity-vs-learned benchmark; not fitted by train.py
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

- LightGBM is NOT invoked by `train.py`; it fits no model and appears in no `export.py` render-kind credit. If you
  want a learned foil over the same per-pair profile features the calibrated affinity fuses by hand, LightGBM is
  the tool to reach for, but that is a manual benchmark you run yourself, not a pipeline stage.
- The shipped relation edges are produced by the deterministic, interpretable engines (embeddings, MinHash
  containment, permutation-tested correlation, calibrated affinity). The shipped ladder rungs are PCA + KMeans
  (classical) and MiniLM + ONNX (SOTA); LightGBM is the optional yardstick alongside them, not a rung and not the
  source of any baked edge.

## Caveats / license

MIT (redistributable). Gradient boosting is powerful but *opaque*, which is precisely why the shipped ranking is
the interpretable affinity (every edge carries its evidence) rather than the tree ensemble; LightGBM stays as an
optional comparison foil only, never fitted by a pipeline run. Prebuilt wheels cover Windows/Linux/macOS.
