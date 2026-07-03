# SEM_network, Semantic similarity network

**Category:** semantic · **render_kind:** `graph` · **builder:** `build_semantic`

## The question

Which datasets are about the same thing, by meaning rather than by shared keywords?

## The method

`feature_extraction.py` embeds each dataset's semantic text (title, description, column names) with the
multilingual MiniLM (`paraphrase-multilingual-MiniLM-L12-v2`). `infer.py :: _semantic_edges` computes all-pairs
cosine similarity (`model/embed.py :: cosine_matrix`) and keeps, per dataset, its top-8 neighbors above
`SEM_MIN_COS = 0.45`, emitting each undirected edge once with its cosine on the evidence. `build_semantic` reads
back the `SEMANTICALLY_SIMILAR` edges as a graph payload (nodes plus decimated edges).

## The variants

A cosine threshold slider: 0.45, 0.55, 0.65, 0.75, 0.85, 0.92. Higher thresholds keep only the strongest topical
links; the web filters the single baked payload client-side.

## Render modes (all `graph`-kind cases)

The relation network renders the **same mined graph** five genuinely different ways, so the reader can pick the
representation that best reveals the structure at hand. This layer is shared by every `graph`-kind case
(SEM_network, JOIN_comuna, JOIN_region, CORR_network); see `frontend/src/components/viz/GraphPanel.tsx`.

- **Clean 2D** · precise, accessible SVG node-link over the baked force layout.
- **Glow (WebGL)** · a WebGL 2-D nebula for the denser lenses.
- **3D (three.js)** · an orbitable three.js graph. **This is the default view** (drag the background to orbit,
  wheel to zoom).
- **Matrix** · a cluster-reordered adjacency matrix, occlusion-free, reads the dense hairballs a node-link cannot.
- **Arc** · a 1-D arc diagram that makes cross-community bridges obvious. For CORR_network it is **signed**:
  green for a positive ρ, red for a negative ρ.

Three controls sit alongside the modes: a **Colour-by** toggle (theme or mined cluster), a **Labels** toggle
(3D / Glow), and a **Highlight-dataset** search that lights up matching nodes across every mode.

## Honesty note

Semantic similarity is topical coincidence, not joinability: two datasets can read as similar yet share no join
key, and the evaluation's semantic-coherence metric (neighbor theme-match) is published so the reader can judge
embedding quality. This case is exactly the signal the affinity proposal (AFF_top) down-weights when it is not
backed by structural or statistical evidence.
