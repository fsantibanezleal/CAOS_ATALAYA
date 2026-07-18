# QC_census, Data-quality census

**Category:** quality · **render_kind:** `quality` · **builder:** `build_quality`

## The question

How clean and how usable are the catalog's tables? What is the null burden, how wide are the tables, which
Contract-1 flags fire, and what type mix and key coverage do datasets have?

## The method

`build_quality` rolls up the Contract-1 report (`io/contract.py`) and the profiles: per dataset it reports column
count, row count, average null fraction, the number of entity keys present, and the maximum column cardinality; it
also tallies the contract flags across normalized tables (e.g. `dropped_N_null_cols`, `high_null_frac`,
`wide_N_cols`, `single_row`, `duplicate_headers`) and the dtype mix (str, float, date). Rows are decimated by null
fraction so the worst offenders always ship.

## The variants

A metric knob: null fraction, wide tables, contract flags, type mix, key coverage, cardinality. Each re-sorts and
recolors the same census payload.

## Honesty note

The flags are the exact ones the ingestion contract recorded, never silently smoothed: a flagged table was
**accepted** (readable but suspicious), while rejected files never reach this census at all. Statistics are
computed over the profiled sample (`sample_rows`), so null fractions and cardinalities are estimates from the
sampled rows, not full-file exact counts.
