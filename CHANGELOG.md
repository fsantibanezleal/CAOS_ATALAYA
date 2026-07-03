# Changelog

All notable changes to this product. Format: `X.XX.XXX` (display) · see `atalayalab.__version__`. Keep `0.x`
while the corpus + web app are still being brought to the product-quality bar. Tag every release.

## [0.09.001] · 2026-07-02

### Changed
- Final content/docs/UX polish (deep 4-dimension review): the Context write-ups, the Architecture modal and the
  docs/ wiki now describe the CURRENT app (5 render modes with 3D default, Matrix + Arc, the 2D/3D catalog map,
  topics/Colour-by-topic, the TF-IDF lexical foil, the 8 lenses opening on Semantic), and the live lane is stated
  as transformers.js/onnxruntime-web (not the stale "Pyodide"). Correlations now open on their signed Arc; the 3-D
  map fits the camera to the cloud on load; the Labels toggle stays put (disabled) outside Glow/3D; the map's
  untagged topic bucket is labelled. Removed every em-dash / arrow separator from the UI prose. README states the
  site is LIVE; a top-level MIT LICENSE was added; internal/private references were removed for the public repo.

## [0.09.000] · 2026-07-02

### Added
- Richer topical dimension from the catalog: the DataCite `categories` are multi-valued (about 70% of datasets
  carry 2 to 5), so every dataset now exposes its full list of OECD **sub-categories** as `topics[]` (27 clean
  values: Ciencias de la salud, Derecho, Economia y negocios, Sociologia, Ciencias de la Tierra, ...), not just
  the first. A new **"Colour by topic"** variant paints the Catalog map by sub-category (finer than the 5 top
  themes) and the hover lists a dataset's topics. (A shared-topic relation graph was evaluated and dropped: it is
  a dense hairball dominated by the two most common sub-categories, so colour + hover is the honest surfacing.)

## [0.08.000] · 2026-07-02

### Added
- 3-D embedding view for the Catalog map: every dataset placed at its 3-D PCA coordinate in an orbitable
  three.js scene (2D / 3D toggle; the 2-D SVG map is unchanged). The 3-D coordinate is computed from the same
  MiniLM embeddings (data/harvest_report sibling: coord3 baked into the catalog artifact).

### Changed
- The Explorer opens on the **Semantic network** lens by default (its 3-D network is the nicest first view);
  the other lenses are one tab away.

## [0.07.003] · 2026-07-02

### Changed
- The relation-network lenses (Semantic, Joinability, Correlations, Affinity) now open in the 3D orbit view by
  default (Clean 2D / Glow / Matrix / Arc remain one click away). The Catalog map stays a 2D embedding scatter
  (it is cartography, not a node-link network, so the graph render-modes do not apply).

## [0.07.002] · 2026-07-02

### Changed
- Corrects 0.07.001: the graph surface follows the light/dark theme again (0.07.001 wrongly forced a dark
  ground). Depth now comes from the coloured nodes themselves, not the background: every node/point is a
  spherical radial gradient (light highlight, base, darker rim) with a soft colour aura, so the datasets read
  as volume on either theme (catalog map, Clean 2D network, arc). The additive screen-blend (which only worked
  on dark) is gone. Correlation arcs stay signed green (+ρ) / red (−ρ).

## [0.07.001] · 2026-07-02

### Changed
- Graph + map visuals made genuinely vibrant (they were flat pastel dots on a light ground). The Catalog map,
  the Clean 2D relation network and the Arc diagram now render on a deep dark surface with additive-blend
  (mix-blend-mode: screen) node halos and community-coloured edges, so clusters glow like a nebula while staying
  precise SVG. Correlation arcs glow green (+ρ) / red (−ρ). The Matrix keeps its light ground (dark viridis cells
  read best there). Brings all Explorer modes to one premium aesthetic; no data or interaction change.

### Added
- Classical lexical foil completes the model ladder, honestly: `evaluate.lexical_baseline` fits a real TF-IDF
  similarity over the same semantic text the SOTA encoder embeds and scores it with the identical top-5
  neighbour-theme coherence, so the embedding is measured against a classical baseline (leakage-safe,
  apples-to-apples). Result (in `metrics.json`, surfaced on the Benchmark "Classical vs SOTA" tab): SOTA MiniLM
  94.4% vs TF-IDF lexical 93.0% vs chance 47.8% (both far above chance; the embedding wins by a modest, reported
  +1.4 pts). This makes the "classical + SOTA + novel" ladder claim true in code, not just documented.

## [0.06.001] · 2026-07-02

### Changed
- Harvest size claim made auditable + accurate: committed `data/harvest_report.json` (measured from the local
  Tier-A mirror: 24.8 GB, 303 datasets, 1382 files) and corrected the Implementation page + README from the
  rounded "~21 GB" to the measured "~25 GB", citing the receipt.

## [0.06.000] · 2026-07-02

### Added
- Two genuinely different graph representations beyond the force-directed node-link (Clean/Glow/3D were all the same
  layout): a cluster-reordered **adjacency matrix** (occlusion-free; communities read as bright diagonal blocks; the
  standard fix for a dense hairball) and an **arc diagram** (nodes on a cluster-ordered baseline, relations as arcs;
  high arcs are cross-community bridges; signed green +ρ / red −ρ for correlations).
- **Colour by** toggle on every network lens: colour nodes by theme or by the mined KMeans cluster (so the graph's
  own community structure is finally visible as colour, not only in the catalog map).

### Fixed
- Reactive controls that were inert are now real: Affinity weight presets (bal/sem/join/stat) sync from the variant
  bar; Correlation-network comuna-keyed / region-keyed chips filter by join key; Joinability "Region-joinable" is no
  longer a mislabeled duplicate of "Comuna-joinable" (12 comuna edges vs 105 region edges, filtered by `ev.key`);
  Geographic "Theme mix" stacks the coverage bars by theme; Temporal "By span length" reorders the Gantt; the
  "Highlight dataset" search now works in Clean 2D; an empty-state banner replaces a blank canvas at zero edges.
- Compute-bomb guard: the WebGL/3D force graphs pause the render loop when the browser tab is hidden
  (`visibilitychange`), so a graph left on a background tab never burns CPU unattended.

### Changed
- Honesty pass on the stack/ladder description (UI + docs): the offline engines are stated as what the code actually
  imports (polars, sentence-transformers, datasketch, rustworkx, scikit-learn; correlation is hand-rolled numpy),
  not DuckDB / phik / LightGBM (present in the venv but never fitted); the live encoder is named as the community
  ONNX build of MiniLM loaded via transformers.js; the model ladder is PCA/KMeans (classical) + MiniLM (SOTA) +
  calibrated affinity (novel), with the previously-claimed TF-IDF / LightGBM rungs removed. The "<1 MB artifacts"
  line clarified (per-lens artifact <1 MB; the ~3 MB embedding table is lazy-loaded only for live search).

## [0.04.001] · 2026-07-02

### Fixed
- Pan interaction crash in the map/graph views (`Cannot read properties of null`): the drag delta is now snapshotted
  before the state update, so a pointer-up mid-flush no longer dereferences a null drag ref. Caught by the new
  error boundary (shown as a message, never a black screen); now fixed at the source.
- Wheel-zoom no longer triggers the passive-listener warning: a non-passive native wheel listener is bound via a
  ref, so zoom can prevent the page scroll cleanly.

## [0.05.001] · 2026-07-02

### Changed
- Footer redesigned to the compact, informative CAOS_RES_Lidar3D style (ADR-0016 §2, adjusted): product · CAOS
  research project · version · **"Developed by Felipe Santibáñez-Leal"** (ES "Desarrollado por…") · data provenance
  (Data Observatory, CC-BY) · a single GitHub link · MIT · an honest one-liner. Removed the personal/portfolio links
  from the footer (they already live in the header; repeating them was a focus error).

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
