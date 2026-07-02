# TIME_coverage, Temporal coverage

**Category:** temporal · **render_kind:** `timeline` · **builder:** `build_temporal`

## The question

What years does the catalog cover? Where are the temporal gaps, and which datasets span the longest stretches?

## The method

`feature_extraction.py` reads each dataset's year span from columns detected as `year` (4-digit years in
1800 to 2100, `entities.py`). `build_temporal` emits a row per dated dataset (start year, end year, theme, span
length) and a year histogram: for each dataset it increments every year in its `[y0, y1]` range, so the histogram
shows how many datasets are live in each year. Rows are sorted by start year then by descending span.

## The variants

A scope knob (all datasets, comuna-keyed, region-keyed), recency windows (since 2015, since 2010), and a sort by
span length, so the reader can focus on recent, geo-joinable, or long-running series.

## Honesty note

The year span is inferred from column values, not from a dataset's declared temporal extent, so it reflects what
the sampled rows actually contain. Datasets with no detected year column are excluded from the timeline (reported
as `n_dated` versus the profiled total), not assumed to be undated forever.
