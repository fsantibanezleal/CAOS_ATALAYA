// TypeScript mirror of the Python Contract-2 schemas (core/manifest.py, core/trace.py, stages/export.py).
// A drift here vs the pipeline output fails the build. Keep in lockstep with the manifest/artifact schemas.

export type RenderKind =
  | "map" | "graph" | "findings" | "coverage" | "timeline" | "quality" | "affinity" | "overview";

export interface GateInfo {
  lane: "live" | "precompute";
  pure_python: boolean;
  wheels: string[];
  trace_bytes: number;
  run_ms_budget: number;
  trace_bytes_budget: number;
  reasons: string[];
}

export interface CaseManifest {
  schema: string;
  case_id: string;
  category: string;
  title_en: string;
  title_es: string;
  render_kind: RenderKind;
  real_or_synthetic: string;
  engine: { package: string; version: string; engines: string[] };
  seed: number;
  artifact: { path: string; format: string; trace_schema: string; bytes: number };
  lane: "live" | "precompute";
  gate: GateInfo;
  flags: string[];
  stats: Record<string, number | string>;
}

export interface CaseArtifact<P = unknown> {
  schema: string;
  case_id: string;
  kind: RenderKind;
  payload: P;
}

export interface Variant {
  id: string;
  label_en: string;
  label_es: string;
  params: Record<string, unknown>;
}

export interface CaseDef {
  id: string;
  category: string;
  render_kind: RenderKind;
  title_en: string;
  title_es: string;
  variants: Variant[];
}

export interface Categories {
  schema: string;
  categories: Record<string, string[]>;
  cases: CaseDef[];
}

// --- catalog ---
export interface CatalogDataset {
  id: string;
  slug: string;
  title: string;
  theme: string;
  sub: string;
  origin: string;
  org: string;
  license: string;
  n_resources: number;
  formats: string[];
  tiers: string[];
  profiled: boolean;
  lat: number | null;
  lon: number | null;
  desc: string;
}
export interface Catalog { schema: string; n: number; datasets: CatalogDataset[] }

// --- global graph ---
export interface GraphNode {
  id: string;
  label: string;
  theme?: string;
  origin?: string;
  cluster?: number;
  coord?: [number, number];
  n_cols?: number;
  entity_keys?: string[];
}
export interface GraphEdge { s: string; t: string; k: string; w: number }
export interface GraphData {
  schema: string;
  counts: { nodes: number; edges: number; by_edge_kind: Record<string, number>; by_node_kind: Record<string, number> };
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// --- per-render-kind payloads ---
export interface MapNode {
  id: string; title: string; theme: string; origin: string; org: string; license: string;
  keys: string[]; n_cols: number; n_rows: number; year_min: number | null; year_max: number | null;
  coord: [number, number]; coord3?: [number, number, number]; fpos?: [number, number] | null; cluster: number; profiled?: boolean;
  null_frac: number; lat: number | null; lon: number | null;
  topics?: string[];   // all OECD sub-categories the catalog assigns (up to 5), not just the first
}
export interface MapPayload { nodes: MapNode[]; pca_var: number[]; themes: string[]; clusters: number[] }

export interface GraphEdgeRow { s: string; t: string; w: number; ev: Record<string, unknown> }
export interface GraphPayload { nodes: MapNode[]; edges: GraphEdgeRow[] }

export interface CorrRow {
  a: string; b: string; a_id: string; b_id: string; rho: number; p_adj: number; n: number;
  key: string; cols: string[]; weight: number;
}
export interface FindingsPayload { rows: CorrRow[] }

export interface AffRow {
  a: string; b: string; a_id: string; b_id: string; score: number;
  f_sem: number; f_join: number; f_stat: number; weight: number;
}
export interface AffinityPayload { rows: AffRow[]; nulls: Record<string, number> }

export interface CoverageRow {
  id: string; title: string; theme: string; level: string; lat: number | null; lon: number | null; keys: string[];
}
export interface CoveragePayload { rows: CoverageRow[]; counts: Record<string, number> }

export interface TimelineRow { id: string; title: string; theme: string; y0: number; y1: number; keys: string[]; span: number }
export interface TimelinePayload { rows: TimelineRow[]; histogram: Record<string, number> }

export interface QualityRow {
  id: string; title: string; theme: string; n_cols: number; n_rows: number; null_frac: number;
  keys: number; max_card: number;
}
export interface QualityPayload { rows: QualityRow[]; flags: Record<string, number>; dtypes: Record<string, number> }

export interface OverviewPayload {
  theme: Record<string, number>; origin: Record<string, number>; license: Record<string, number>;
  format: Record<string, number>; tier: Record<string, number>;
  size_report: Record<string, { resources: number; known_bytes: number; unsized: number }>;
  totals: { datasets: number; resources: number; profiled: number };
}

// --- validation metrics (Experiments / Benchmark) ---
export interface Metrics {
  graph: GraphData["counts"];
  isolated_node_frac: number;
  negative_control: { candidates: number; survivors: number; empirical_fdr: number };
  semantic_coherence: { neighbor_theme_match: number; n_scored: number };
  lexical_baseline?: {
    k: number; n_scored: number; vocab_terms?: number;
    lexical_neighbor_theme_match: number; embedding_neighbor_theme_match: number;
    theme_base_rate: number; sota_gain_over_lexical: number;
  };
  joinability_sanity: { joinable_edges: number; share_declared_key_frac: number };
  theme_distribution: Record<string, number>;
}
