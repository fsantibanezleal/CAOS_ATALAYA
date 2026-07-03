# Cases, the category taxonomy + coverage matrix

An Atalaya case is a genuine analytical **view** over the real harvested catalog and the mined knowledge graph,
never a meta-tab. The registry (`data-pipeline/atalayalab/registry.py`) defines **8 categories** and **11 cases**.
Each case carries a `render_kind` (the render family the web switches on), bilingual titles, a builder in
`cases/builders.py`, and a **variant family**, a real parametric knob (color-by, key, threshold, weights) so the
App variant bar is data-driven, not padded. The App shows one case; Experiments and Benchmark summarize across
categories.

## The 8 categories

| Category | What it answers | Cases |
|---|---|---|
| **cartography** | What is in the catalog, and how is it laid out? | CART_map, CAT_overview |
| **semantic** | Which datasets are topically similar (by meaning, not keywords)? | SEM_network |
| **joinability** | Which datasets can actually be joined on a shared entity key? | JOIN_comuna, JOIN_region |
| **correlation** | Which indicators co-vary across a shared key, beyond chance? | CORR_findings, CORR_network |
| **geographic** | How is the catalog geo-referenced (comuna / region / points)? | GEO_coverage |
| **temporal** | What years does the catalog cover, and where are the gaps? | TIME_coverage |
| **quality** | How clean and how usable are the tables? | QC_census |
| **affinity** | The novel proposal: fused, null-calibrated multi-evidence relatedness. | AFF_top |

## Coverage matrix (the 11 cases)

| Case | Category | render_kind | One-line | Variant family |
|---|---|---|---|---|
| [CART_map](CART_map.md) | cartography | `map` | 2-D + 3-D PCA map of profiled datasets, colored by an attribute | 2D/3D view · color-by: theme / origin / cluster / keys / topic / recency / null-rate |
| [CAT_overview](CAT_overview.md) | cartography | `overview` | Composition of the full catalog by facet | facet: theme / origin / license / format / tier / size |
| [SEM_network](SEM_network.md) | semantic | `graph` | Embedding cosine similarity network | cosine threshold: 0.45 to 0.92 |
| [JOIN_comuna](JOIN_comuna.md) | joinability | `graph` | Datasets joinable on the comuna CUT key | containment threshold: 0.5 to 0.95 |
| [JOIN_region](JOIN_region.md) | joinability | `graph` | Datasets joinable on the region key | containment threshold: 0.5 to 0.95 |
| [CORR_findings](CORR_findings.md) | correlation | `findings` | Table of surviving cross-dataset correlations | \|rho\| threshold / sign (pos, neg) |
| [CORR_network](CORR_network.md) | correlation | `graph` | Correlation network view | \|rho\| threshold / key (comuna, region) |
| [GEO_coverage](GEO_coverage.md) | geographic | `coverage` | How each dataset is geo-referenced | level: comuna / region / points / any; metric: count / themes |
| [TIME_coverage](TIME_coverage.md) | temporal | `timeline` | Temporal coverage and gaps of the catalog | scope: all / comuna / region; since 2015 / 2010; by span |
| [QC_census](QC_census.md) | quality | `quality` | Data-quality census across the normalized tables | metric: nulls / wide / flags / dtypes / keys / cardinality |
| [AFF_top](AFF_top.md) | affinity | `affinity` | Top multi-evidence affinity pairs (the novel proposal) | weights: balanced / semantic / join / correlation-led |

Every `graph`-kind case (SEM_network, JOIN_comuna, JOIN_region, CORR_network) shares a **five-mode render layer**
over the same mined graph: Clean 2D (SVG), Glow (WebGL), 3D (three.js, the default), Matrix (cluster-reordered
adjacency), Arc (1-D; signed green +ρ / red −ρ for correlations), plus Colour-by (theme / cluster), Labels, and a
Highlight-dataset search. See [SEM_network · Render modes](SEM_network.md#render-modes-all-graph-kind-cases). The
`map`-kind CART_map additionally offers a 2D/3D toggle (an orbitable 3-D PCA view) and a Colour-by-topic variant.

## Where the cases come from

Every case is a **read** over the shared corpus results (the mined graph, the profiles, the model bundle); the
science already ran in the pipeline stages. Builders never recompute; variants are applied client-side from a
single payload, so the App reacts instantly with no compute bomb (`cases/builders.py`). The real engines behind
each render kind are recorded on each manifest (`ENGINES_BY_KIND` in `stages/export.py`).

## Honesty note

Every case is `real_or_synthetic: "real"`: it is built from the actual harvested catalog and mined graph, not
synthetic demo data. The committed artifact is decimated (strongest N rows or edges); the full graph is in the
out-of-git DB. Correlation and affinity cases carry per-edge evidence and are backed by the null control in
[../architecture/06_model-evaluation.md](../architecture/06_model-evaluation.md); none of them claim causation.
