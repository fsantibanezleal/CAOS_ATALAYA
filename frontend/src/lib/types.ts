// Mirrors the simlab trace + manifest v2 schemas (simlab/core/*.py, simlab/pipeline.py).

export interface SimEvent {
  t: number;
  kind: string; // "arrival" | "start" | "depart"
  id?: number;
}

export interface Analytic {
  rho: number;
  p_wait: number | null;
  Wq: number | null;
  Lq: number | null;
  stable: boolean;
}

export interface Trace {
  schema: string;
  scenario: string;
  title: string;
  method: string;
  seed: number;
  params: Record<string, number>;
  kpis: Record<string, number>;
  analytic: Analytic;
  timeline: { t_end: number; events: SimEvent[] };
}

export interface GateInfo {
  pure_python: boolean;
  run_ms: number;
  trace_bytes: number;
  reasons: string[];
}

export interface VariantEntry {
  id: string;
  label_en: string;
  label_es: string;
  note_en: string;
  note_es: string;
  params: Record<string, number>;
  lane: "live" | "precomputed";
  gate: GateInfo;
  kpis: Record<string, number>;
  analytic: Analytic;
  trace: string; // repo-relative path, forward slashes
}

// ── Grid ABM (Schelling, SIR) frame trace (simlab.gridtrace/v1) ──
export interface GridFrame {
  t: number;
  cells: number[]; // row-major state codes
}
export interface LegendItem {
  code: number;
  label_en: string;
  label_es: string;
  color: string; // a CSS var() expression
}
export interface GridTrace {
  schema: string;
  scenario: string;
  title: string;
  method: string;
  seed: number;
  params: Record<string, number>;
  grid: { w: number; h: number };
  legend: LegendItem[];
  kpis: Record<string, number>;
  analytic: Record<string, unknown>;
  series: Record<string, number[]>; // includes "x"
  frames: GridFrame[];
}

// ── Chart/series trace (Monte-Carlo CI, Beer Game bullwhip) (simlab.charttrace/v1) ──
export interface ChartLine {
  key: string;
  color: string;
  label_en: string;
  label_es: string;
  dashed?: boolean;
}
export interface ChartTrace {
  schema: string;
  scenario: string;
  title: string;
  method: string;
  seed: number;
  params: Record<string, number>;
  x_label_en: string;
  x_label_es: string;
  y_label_en: string;
  y_label_es: string;
  series: Record<string, number[]>; // includes "x"
  lines: ChartLine[];
  band: { lo: string; hi: string; color: string; label_en: string; label_es: string } | null;
  bars: { edges: number[]; counts: number[]; color: string; label_en: string; label_es: string } | null;
  ref_lines: { y: number; color: string; label_en: string; label_es: string }[];
  kpis: Record<string, number>;
  analytic: Record<string, unknown>;
}

// ── Multi-stage flow DES (S04 ED) (simlab.flowtrace/v1) ──
export interface FlowStation { id: string; label_en: string; label_es: string; c: number }
export interface FlowEvent { t: number; kind: string; id: number; prio: number }
export interface FlowTrace {
  schema: string;
  scenario: string;
  title: string;
  method: string;
  seed: number;
  params: Record<string, number>;
  stations: FlowStation[];
  legend: LegendItem[];
  kpis: Record<string, number>;
  analytic: Record<string, unknown>;
  timeline: { t_end: number; events: FlowEvent[] };
}

// ── Gantt schedule (S06 job-shop) (simlab.gantt/v1) ──
export interface GanttOp { job: number; machine: number; start: number; dur: number }
export interface GanttTrace {
  schema: string;
  scenario: string;
  title: string;
  method: string;
  seed: number;
  params: Record<string, number>;
  machines: { id: number; label: string }[];
  jobs: number;
  ops: GanttOp[];
  makespan: number;
  kpis: Record<string, number>;
  analytic: Record<string, unknown>;
}

// ── Route/network trace (S07 haul, S08 VRP, S09 ambulance) (simlab.routetrace/v1) ──
export interface RouteNode { id: number; x: number; y: number; kind: string; label?: string; elev?: number }
export interface RouteLeg { a: number; b: number; t0: number; t1: number }
export interface RouteAgent { id: number; kind: string; color: string; legs: RouteLeg[]; home?: number }
export interface RouteMarker { x: number; y: number; t0: number; t1: number; kind: string }
export interface RoutePlan { agent: number; path: number[]; color: string }
export interface RouteGauge { x: number; y: number; capacity: number; label_en: string; label_es: string; color: string; frames: [number, number][] }
export interface RouteTrace {
  schema: string;
  scenario: string;
  title: string;
  method: string;
  seed: number;
  params: Record<string, number>;
  bounds: { minx: number; miny: number; maxx: number; maxy: number };
  nodes: RouteNode[];
  edges: number[][];
  routes: RoutePlan[];
  agents: RouteAgent[];
  markers: RouteMarker[];
  barriers?: { x: number; y: number }[];
  gauges?: RouteGauge[];
  legend: { code: string; label_en: string; label_es: string; color: string }[];
  t_end: number;
  kpis: Record<string, number>;
  analytic: Record<string, unknown>;
}

export interface ParamSpec {
  key: string;
  label: string;
  default: number;
  min: number;
  max: number;
  step: number;
  kind: "float" | "int";
}

export interface ScenarioManifest {
  schema: string;
  id: string;
  title: string;
  method: string;
  tier: number;
  engine: string;
  seed: number;
  viz: { renderer: string; dimensionality: string };
  wheel_closure: string[];
  param_specs: ParamSpec[];
  lane: "live" | "precomputed";
  variants: VariantEntry[];
}
