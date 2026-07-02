# CORR_findings, Cross-dataset correlations

**Category:** correlation · **render_kind:** `findings` · **builder:** `build_correlations`

## The question

Which pairs of indicators from different datasets co-vary across a shared geographic key, beyond what chance would
produce?

## The method

`infer.py :: _correlation_edges` aggregates up to 6 numeric indicators per dataset to a shared key (comuna CUT or
region), requires at least `CORR_MIN_OVERLAP = 8` shared key values, and computes Spearman rho
(`model/stats.py`). Candidates with `|rho| >= 0.35` are put through a seeded permutation null (1000 permutations)
and the whole family through Benjamini-Hochberg FDR at `q = 0.05`. Only survivors become `CORRELATES` edges.
`build_correlations` renders them as a findings table with rho, adjusted p, n, key, and the two column names.

## The variants

`|rho|` thresholds (0.35, 0.50, 0.65, 0.80) plus a sign filter (positive-only, negative-only). All are
client-side filters over the single decimated findings payload.

## Honesty note

A surviving row means two indicators co-vary across the shared key beyond a permutation null and after FDR; it
does **not** mean one causes the other, and a common driver (population, region) can still explain it. The
pipeline reports a **negative control** (shuffled-key correlations, an empirical FDR near zero) so the reader can
judge how much to trust this whole layer; see
[../architecture/06_model-evaluation.md](../architecture/06_model-evaluation.md).
