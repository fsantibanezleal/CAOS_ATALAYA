# CORR_network, Correlation network

**Category:** correlation · **render_kind:** `graph` · **builder:** `build_corr_network`

## The question

How do the surviving cross-dataset correlations connect the catalog as a network? Which datasets are hubs of
statistical association?

## The method

Same edges as [CORR_findings](CORR_findings.md), the `CORRELATES` kind mined by `infer.py :: _correlation_edges`
(Spearman plus permutation null plus FDR), but rendered as a graph rather than a table. `build_corr_network` reads
the `CORRELATES` edges through the shared `_graph_payload` helper (nodes plus decimated edges, capped at 1200),
so datasets that co-vary with many others show up as connected components and hubs.

## The variants

`|rho|` thresholds (0.35, 0.50, 0.65, 0.80) plus a key filter (comuna-keyed, region-keyed). The threshold prunes
weaker edges client-side; the key filter isolates correlations mined on one geographic key.

## Honesty note

Edges are the same FDR-controlled correlations as the findings table, so the same caveats apply: association, not
causation, and possibly a common driver. A visually dense hub can be an artifact of a widely-shared key (many
datasets keyed on the 16 regions), which is exactly why the key filter and the region-vs-comuna distinction are
offered as variants.
