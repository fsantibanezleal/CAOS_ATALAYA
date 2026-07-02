import type { ChartTrace, FlowTrace, GanttTrace, GridTrace, RouteTrace, ScenarioManifest, Trace } from "./types";

const BASE = import.meta.env.BASE_URL; // "/" on the custom domain

// In-memory traces produced by the Pyodide live lane. The loaders below consult this first, so a freshly
// computed in-browser trace is replayed by the EXACT same players that replay committed traces — we just
// hand them a synthetic path (e.g. "live://s01_queue/3") instead of a file under public/.
const liveTraces = new Map<string, unknown>();

/** Register an in-memory trace under a synthetic key; prunes older keys for the same scenario prefix. */
export function registerLiveTrace(key: string, trace: unknown): void {
  const prefix = key.slice(0, key.lastIndexOf("/") + 1);
  for (const k of liveTraces.keys()) if (k.startsWith(prefix) && k !== key) liveTraces.delete(k);
  liveTraces.set(key, trace);
}

async function fetchJson<T>(path: string, what: string): Promise<T> {
  if (liveTraces.has(path)) return liveTraces.get(path) as T;
  // A synthetic live:// key that's no longer in the registry was pruned — never hit the network with it.
  if (path.startsWith("live://")) throw new Error("live trace expired — run it again");
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${what} ${path}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

export async function loadManifest(id: string): Promise<ScenarioManifest> {
  const res = await fetch(`${BASE}manifests/${id}.json`);
  if (!res.ok) throw new Error(`manifest ${id}: HTTP ${res.status}`);
  return (await res.json()) as ScenarioManifest;
}

/** Load a queue (event) trace by its repo-relative path (as recorded in a variant entry). */
export const loadTrace = (path: string) => fetchJson<Trace>(path, "trace");

/** Load a grid (frame) trace for an ABM scenario. */
export const loadGridTrace = (path: string) => fetchJson<GridTrace>(path, "grid trace");

/** Load a chart/series trace (Monte-Carlo, Beer Game). */
export const loadChartTrace = (path: string) => fetchJson<ChartTrace>(path, "chart trace");

/** Load a multi-stage flow trace (S04 ED). */
export const loadFlowTrace = (path: string) => fetchJson<FlowTrace>(path, "flow trace");

/** Load a Gantt schedule trace (S06 job-shop). */
export const loadGanttTrace = (path: string) => fetchJson<GanttTrace>(path, "gantt trace");

/** Load a route/network trace (S07 haul, S08 VRP, S09 ambulance). */
export const loadRouteTrace = (path: string) => fetchJson<RouteTrace>(path, "route trace");
