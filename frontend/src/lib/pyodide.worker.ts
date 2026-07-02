/// <reference lib="webworker" />
// Pyodide worker — runs the REAL `simlab` Python package in-browser (WebAssembly) so a "live" scenario
// computes the same trace the offline pipeline would. Classic worker: importScripts the Pyodide UMD from
// the official CDN (avoids Vite bundling a remote ESM; the Firefox module-worker indexURL bug #5923 does
// not apply to classic workers, and we pass indexURL explicitly regardless). The simlab source is fetched
// as one JSON (built by web/copy-data.mjs), written to the in-browser FS, then imported.
import { PYODIDE_INDEX_URL, PYODIDE_JS_URL } from "./pyodide-config";
import type { PyMatch, PyRequest } from "./pyodideProtocol";

declare function importScripts(...urls: string[]): void;
declare function loadPyodide(opts: { indexURL: string }): Promise<PyodideAPI>;

interface PyodideAPI {
  loadPackage(names: string | string[]): Promise<void>;
  pyimport(name: string): { install(pkg: string | string[]): Promise<void> };
  runPython(code: string): unknown;
  globals: { set(name: string, value: unknown): void };
}

const ctx = self as unknown as { postMessage(m: unknown): void; onmessage: ((e: MessageEvent) => void) | null };
const post = (m: unknown) => ctx.postMessage(m);

let pyodide: PyodideAPI | null = null;
let ready = false;

const WRITE_SOURCES = `
import json, os, sys, importlib
_src = json.loads(SIMLAB_SOURCES)
for _path, _content in _src.items():
    _d = os.path.dirname(_path)
    if _d:
        os.makedirs(_d, exist_ok=True)
    with open(_path, "w") as _f:
        _f.write(_content)
if os.getcwd() not in sys.path:
    sys.path.insert(0, os.getcwd())
importlib.invalidate_caches()
import simlab.registry
import simlab.live
`;

const RUN_TRACE = `
import json
from simlab.live import run_trace_json
run_trace_json(scenario_id, json.loads(params_json), int(seed_val))
`;

async function init(sourcesUrl: string): Promise<void> {
  if (ready) {
    emitReady();
    return;
  }
  post({ type: "progress", phase: "loading-runtime" });
  importScripts(PYODIDE_JS_URL);
  pyodide = await loadPyodide({ indexURL: PYODIDE_INDEX_URL });
  post({ type: "progress", phase: "loading-packages" });
  // Live wheel closure (must match simlab.core.scenario.LIVE_WHEELS). MEASURED, not assumed: Mesa 3 runs in
  // Pyodide once `sqlite3` is loaded (it imports it via mesa.experimental). pandas/scipy/networkx are Mesa's
  // (and ciw's) deps. So ABM runs LIVE on real Mesa here — not a stand-in. numpy+simpy for DES, ciw for the
  // M/M/c validation, joblib for the Monte-Carlo replications. Only native engines (OR-Tools) stay precompute
  // (those scenarios are pure_python=False and never reach this worker). Cold start is ~3-5 s, paid in the
  // background while the first paint replays a committed trace.
  await pyodide.loadPackage(["numpy", "pandas", "scipy", "networkx", "sqlite3", "micropip"]);
  const micropip = pyodide.pyimport("micropip");
  // Pinned to requirements-precompute.txt so the in-browser run byte-matches the committed traces — a future
  // mesa/ciw release that changed RNG draw order or AgentSet iteration would otherwise silently degrade the
  // verify-button "byte match" with no code change here. All four are pure-Python wheels.
  await micropip.install(["simpy==4.1.2", "ciw==3.2.7", "mesa==3.5.1", "joblib==1.5.3"]);
  post({ type: "progress", phase: "loading-simlab" });
  const res = await fetch(sourcesUrl);
  if (!res.ok || !(res.headers.get("content-type") ?? "").includes("json")) {
    throw mkError("network", `simlab-sources.json not served (HTTP ${res.status})`);
  }
  const bundle = (await res.json()) as { files: Record<string, string> };
  pyodide.globals.set("SIMLAB_SOURCES", JSON.stringify(bundle.files));
  pyodide.runPython(WRITE_SOURCES);
  ready = true;
  emitReady();
}

function emitReady(): void {
  const numpy = String(pyodide!.runPython("import numpy; numpy.__version__"));
  const python = String(pyodide!.runPython("import platform; platform.python_version()"));
  post({ type: "ready", numpy, python });
}

function runTraceJson(scenario: string, params: Record<string, number>, seed: number): string {
  pyodide!.globals.set("scenario_id", scenario);
  pyodide!.globals.set("seed_val", seed);
  pyodide!.globals.set("params_json", JSON.stringify(params));
  return pyodide!.runPython(RUN_TRACE) as string;
}

function run(id: number, scenario: string, params: Record<string, number>, seed: number): void {
  if (!pyodide) return post({ type: "error", id, kind: "runtime", message: "runtime not ready" });
  try {
    const t0 = performance.now();
    const json = runTraceJson(scenario, params, seed);
    post({ type: "result", id, trace: JSON.parse(json), runMs: Math.round(performance.now() - t0) });
  } catch (e) {
    post({ type: "error", id, kind: "python", message: e instanceof Error ? e.message : String(e) });
  }
}

function verify(id: number, scenario: string, params: Record<string, number>, seed: number, committed: string): void {
  if (!pyodide) return post({ type: "error", id, kind: "runtime", message: "runtime not ready" });
  try {
    const t0 = performance.now();
    const liveJson = runTraceJson(scenario, params, seed);
    const runMs = Math.round(performance.now() - t0);
    const trace = JSON.parse(liveJson);
    let match: PyMatch = "byte";
    let firstDiffPath: string | undefined;
    let firstDiffDelta: number | undefined;
    if (liveJson !== committed) {
      const diff = firstNumericDiff(trace, JSON.parse(committed), "");
      if (!diff) match = "numeric";
      else {
        match = "differ";
        firstDiffPath = diff.path;
        firstDiffDelta = diff.delta;
      }
    }
    post({ type: "verified", id, trace, runMs, match, firstDiffPath, firstDiffDelta });
  } catch (e) {
    post({ type: "error", id, kind: "python", message: e instanceof Error ? e.message : String(e) });
  }
}

/** First difference between live & committed, treating floats as equal within 1e-9 relative tolerance. */
function firstNumericDiff(a: unknown, b: unknown, path: string): { path: string; delta: number } | null {
  if (typeof a === "number" && typeof b === "number") {
    if (a === b) return null;
    const rel = Math.abs(a - b) / Math.max(1, Math.abs(a), Math.abs(b));
    return rel <= 1e-9 ? null : { path: path || "(root)", delta: a - b };
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return { path: `${path}.length`, delta: a.length - b.length };
    for (let i = 0; i < a.length; i++) {
      const d = firstNumericDiff(a[i], b[i], `${path}[${i}]`);
      if (d) return d;
    }
    return null;
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const ak = Object.keys(a as object);
    const bk = Object.keys(b as object);
    if (ak.length !== bk.length) return { path: `${path} keys`, delta: ak.length - bk.length };
    for (const k of ak) {
      const d = firstNumericDiff((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], path ? `${path}.${k}` : k);
      if (d) return d;
    }
    return null;
  }
  return a === b ? null : { path: path || "(root)", delta: NaN };
}

function mkError(kind: "runtime" | "python" | "network", message: string): Error {
  const e = new Error(message);
  (e as Error & { kind: string }).kind = kind;
  return e;
}

ctx.onmessage = (ev: MessageEvent) => {
  const msg = ev.data as PyRequest;
  if (msg.type === "init") {
    init(msg.sourcesUrl).catch((e) =>
      post({ type: "error", phase: "loading-runtime", kind: (e as { kind?: "runtime" | "network" }).kind ?? "runtime", message: e instanceof Error ? e.message : String(e) }),
    );
  } else if (msg.type === "run") {
    run(msg.id, msg.scenario, msg.params, msg.seed);
  } else if (msg.type === "verify") {
    verify(msg.id, msg.scenario, msg.params, msg.seed, msg.committed);
  }
};
