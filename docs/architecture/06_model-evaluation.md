# Model evaluation (the TEST stage)

`data-pipeline/atalayalab/stages/evaluate.py`. The honest question is not "did we find links" but "are the links
stronger than a null world". The relation graph and the ladder are validated with leakage-safe, adversarial
checks; the metrics are written to `data/derived/metrics.json` and surfaced on the web's Experiments and Benchmark
pages.

## Correlation mining, and why it needs a control

The `CORRELATES` edge (`infer.py`) aggregates numeric indicators of two datasets to a shared entity key (comuna
CUT or region) and tests them for Spearman rank correlation. A raw `|rho|` is not enough: with thousands of
dataset pairs, some will correlate by chance. So each candidate is put through a **seeded permutation null** and
the whole family is filtered with **Benjamini-Hochberg FDR**:

- Spearman rho on the aligned key values (`model/stats.py :: spearman`), robust to monotone nonlinearity and
  outliers (the default for gov indicators).
- A two-sided permutation p-value by shuffling one series (`permutation_pvalue`, 1000 permutations, seeded, with
  add-one smoothing so it never reports `p = 0`). This is a calibrated null, not a t-approximation that assumes
  bivariate normality (gov indicators rarely are).
- Benjamini-Hochberg across the candidate family at `q = 0.05` (`bh_fdr`): the largest rank `k` with

```math
p_{(k)} \le \frac{k}{m}\, q
```

  is accepted, controlling the expected false-discovery rate.

Only edges that clear both survive into the graph. First-order partial correlation
(`partial_spearman`) is available to test whether an apparent link survives partialling out a common driver
(population, region).

## The negative control (the key metric)

`_negative_control()` re-runs the exact same correlation test family, but first **shuffles the key alignment** of
each indicator series, breaking any real relationship. It then reports how many shuffled correlations still
survive the same permutation null plus FDR. This is an **empirical false-discovery rate**:

```math
\widehat{\text{FDR}} = \frac{\#\{\text{survivors on shuffled data}\}}{\#\{\text{candidates}\}}
```

A trustworthy pipeline yields near zero. If the control leaks, the correlation edges are not to be believed, and
that number is reported plainly rather than hidden.

## Semantic coherence

`_semantic_coherence()` measures the fraction of each dataset's top-k semantic neighbors that share its theme, a
proxy for embedding quality (higher is better; chance is the theme base-rate). This scores whether the MiniLM
embeddings capture real topical structure rather than noise.

## Joinability sanity

`_joinability_sanity()` checks that both endpoints of every `JOINABLE_ON` edge actually declare a shared entity
key. It should be 1.0 by construction; a drop signals a bug in the joinability miner, so it is a guard, not a
brag.

## Graph coverage

Node and edge counts by kind and the isolated-node fraction, so the Benchmark page can show how connected the
mined graph is and where the evidence concentrates.

## Honesty note

None of these metrics claim causation. A surviving `CORRELATES` edge means two indicators co-vary across the
shared key beyond a permutation null and after FDR; it does not mean one drives the other. The affinity score
(`AFF_top`) means "more evidence than chance across three orthogonal signals", it does not rank datasets by
importance or quality. The negative control is published exactly so a reader can judge how much to trust the
correlation layer.
