# CAT_overview, Catalog composition

**Category:** cartography · **render_kind:** `overview` · **builder:** `build_overview`

## The question

What is the whole catalog made of? How do the 1017 datasets break down by theme, publisher origin, license,
file format, download tier, and size on disk?

## The method

`build_overview` counts facets over **all** datasets (not only the profiled subset): theme, origin, license,
format, and download tier, keeping the top 20 of each. It attaches the per-tier size report from the harvest stage
and the totals (datasets, resources, profiled). This is a pure `polars`/`Counter` roll-up over the typed inventory
(`DatasetRef`), so it reflects exactly what the harvester classified.

## The variants

The facet knob: by theme, origin, license, format, download tier, or size on disk. Each renders the same
composition payload sliced on a different facet.

## Honesty note

The size report distinguishes what is mirrorable from what is only referenced: tier A (Chilean-gov direct files)
is mirrored, while tiers C and D (geoservices and DOI archives) are referenced only. The counts are of catalog
records and resources, so a dataset with several resources contributes to several format and tier buckets. This is
the honest denominator behind every other case (which see only the profiled subset).
