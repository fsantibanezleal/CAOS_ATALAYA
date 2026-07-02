# Changelog

All notable changes to this product. Format: `X.XX.XXX` (display) · see `atalayalab.__version__`. Keep `0.x`
while the corpus + web app are still being brought to the product-quality bar. Tag every release.

## [0.04.001] · 2026-07-02

### Fixed
- Pan interaction crash in the map/graph views (`Cannot read properties of null`): the drag delta is now snapshotted
  before the state update, so a pointer-up mid-flush no longer dereferences a null drag ref. Caught by the new
  error boundary (shown as a message, never a black screen); now fixed at the source.
- Wheel-zoom no longer triggers the passive-listener warning: a non-passive native wheel listener is bound via a
  ref, so zoom can prevent the page scroll cleanly.

## [0.05.000] · 2026-07-02

### Added
- **Multiple graph render modes** (semantic / joinability / correlation / affinity networks): **Clean 2D** (the
  precise, accessible SVG, baked force layout), **Glow (WebGL)** (a canvas force graph with additive blending and
  live physics, the nebula look), and **3D** (a three.js orbitable graph with tasteful Unreal bloom). A mode
  selector plus a labels toggle and a node-highlight search. Heavy modes are lazy-loaded (code-split).

### Fixed
- Content/detail pages now use the full page width (headings, tables, figures span the full 1200px; only flowing
  paragraphs are capped for readability) instead of a narrow centred column (#21).
- Glow mode no longer crashes on the first frame (guard the canvas draw until the force layout assigns finite node
  positions).

### Changed
- Scrubbed local scratch paths, the maintainer email and the deploy host from the tracked project source (they live
  in the private management vault; `deploy.*` now requires ATALAYA_HOST / ATALAYA_SSH_KEY / ATALAYA_CERTBOT_EMAIL).
  Added CI guards that reject leaked local paths / personal email.

## [0.04.000] · 2026-07-02

### Added
- **Whole-catalog coverage**: every one of the 1017 datasets is now embedded from its metadata (title +
  description + theme), so the catalog map and the semantic network span the full catalog (~1017 nodes,
  ~14k mined edges) instead of only the mirrorable subset. Joinability + correlation stay on the profiled subset
  (they need the data), which is the honest split.
- **Baked force-directed layout** (rustworkx spring layout) for the graph views, so themes pull into visible
  communities; the map keeps the PCA embedding layout.
- **Per-panel + shell error boundaries**: a crash in any one view now renders a message + Retry instead of
  blacking out the whole app.

### Changed
- **Explorer information architecture redesigned**: the primary selector is now the 8 analytical LENSES
  (Catalog map · Semantic network · Joinability · Correlations · Geographic · Temporal · Data quality · Affinity),
  each exposing its genuine views + Context as sub-tabs. The live semantic search is scoped to the Semantic lens
  (where it belongs); the repeated "Live" and the weak "Compare" meta-tabs are gone.
- **Vibrant qualitative palette** for categories (viridis retained only for sequential encodings, per the viz
  rubric); graph nodes sized by degree, edges weighted by strength, hovered node glows.
- **Content-page width**: a centered reading column with full-width tables/figures (was a narrow left-jammed column).

## [0.03.000] · 2026-07-02

### Added
- **Web app** (React 19 + Vite, bilingual EN/ES, light/dark, KaTeX): the 6-page product shell mirroring the
  CAOS_SIMLAB exemplar. The Explorer lands on the workbench · one tab per analytical case (11 cases across 8
  categories), each with a variant bar and four sub-tabs (View / Live / Compare / Context, the Context a deep
  bilingual write-up).
- **Interactive viz per render-kind** (Tier-A: zoom/pan, cursor read-outs, theme-aware, viridis colours, no
  autoplay): catalog embedding map, relation-network graph, correlation findings table + ρ/p scatter, calibrated
  affinity ranking with live evidence reweighting, geographic coverage + point map, temporal Gantt + histogram,
  data-quality census, catalog composition.
- **Live lane**: in-browser free-text semantic search via transformers.js / onnxruntime-web (with graceful
  fallback) + live affinity reweighting in pure JS (parity with the offline fusion).
- **Deep pages**: Introduction, Methodology (6 method-family sub-tabs with term-by-term KaTeX + DOI refs),
  Implementation, Experiments and Benchmark · the last two read the real committed `metrics.json` (negative-control
  FDR, semantic coherence, graph composition).
- **ADR-0058 architecture modal**: 5 tabs with hand-authored, theme-aware, product-specific SVGs (zero hardcoded
  hex) fetched + inlined.
- **docs/ wiki**: framework cards per real engine, architecture, cases taxonomy + coverage, guides, data contract.
- Pipeline: ZIP-member extraction in preprocess (many gov datasets ship CSVs inside archives) + a baked
  `embeddings.json` for the live semantic-search lane.
- Deploy: static-first (`atalaya.fasl-work.com`) nginx template; deploy-pages workflow builds from committed
  artifacts (no CI pipeline run).

### Changed
- Replaced the Pyodide live-lane machinery with a transformers.js ONNX lane (more appropriate for this domain).
- Version synced across `pyproject.toml`, `data-pipeline/atalayalab/__init__.py`, `frontend/src/lib/version.ts`.

## [0.02.000] · 2026-07-01

### Added
- **Catalog harvester** (`atalayalab.catalog` + `stages/harvest.py`): a resilient client for the Data Observatory
  OpenSearch backend, full enumeration of the 1017-dataset catalog, a typed inventory, resource classification
  into download tiers (gov-direct / no-url / geoservice / DOI-archive / broken), and a size-gated, resumable,
  checksummed bulk download into the out-of-git scratch (hard disk cap + per-resource monster cap).
- **Ingestion contract** (`io/contract.py`) for arbitrary messy gov tables (encoding + separator sniffing,
  explicit reject/drop/flag outlier policy) and robust readers (`io/formats.py`: CSV/XLSX/XLS/JSON/GeoJSON →
  parquet).
- **Profiling** (`stages/feature_extraction.py`): per-column fingerprints (dtype, nulls, cardinality, numeric
  stats, MinHash), Chilean entity-key detection (`catalog/entities.py`: comuna CUT, region, year, lat/lon, RUT),
  and local multilingual MiniLM dataset embeddings.
- **Model ladder** (`stages/train.py`): classical (PCA 2-D map + KMeans + TF-IDF foil), SOTA (MiniLM embeddings +
  ONNX encoder export for the browser), and the **novel calibrated multi-evidence affinity** (`model/affinity.py`)
  with offline-fit null models.
- **Relation mining** (`stages/infer.py`): the cross-dataset knowledge graph · SAME_SOURCE, SEMANTICALLY_SIMILAR
  (cosine), JOINABLE_ON (MinHash containment), SPATIALLY_OVERLAPS, and CORRELATES (Spearman + seeded permutation
  null + Benjamini-Hochberg FDR + partial-out), plus fused AFFINITY edges · persisted to a portable SQLite-WAL
  graph store (`core/graphdb.py`).
- **Validation** (`stages/evaluate.py`): a shuffled-alignment negative control (empirical FDR), semantic-neighbor
  coherence, and joinability sanity.
- **Export** (`stages/export.py`) of the two data contracts: 11 analytical cases across 8 categories (cartography,
  semantic, joinability, correlation, geographic, temporal, quality, affinity), each a compact web artifact +
  manifest, plus a global catalog + decimated knowledge graph.
- Live lane (`live.py`): Pyodide-safe affinity reweighting + semantic ranking.
- Real domain test suite (stats, affinity, embeddings, entities, gate, graph store, full synthetic pipeline smoke).

### Changed
- Replaced the template EXAMPLE (SIR) engine, cases, contracts and tests with the Data Observatory domain.
- CI runs the numpy-only core tests + the CONTRACT-2 drift guard; heavy pipeline tests `importorskip` the SOTA lane.

## [0.01.000] · 2026-06-20

### Added
- Initial instantiation from the CAOS product-repo template (ADR-0057): repo shape, the two data contracts, the
  named staged pipeline, seeded RNG, compact artifact, manifest, and the measured live-vs-precompute gate.
