// Main-thread client for the Pyodide worker: a lazily-created singleton, promise-based run/verify APIs, and
// a progress subscription so the UI can show the one-time runtime download. The worker is created only when
// the live lane is first used, so the ~download cost is never paid by users who don't run live.
import type { PyMatch, PyPhase, PyResponse } from "./pyodideProtocol";

export interface LiveResult {
  trace: unknown;
  runMs: number;
}
export interface VerifyResult extends LiveResult {
  match: PyMatch;
  firstDiffPath?: string;
  firstDiffDelta?: number;
}
export interface RuntimeInfo {
  numpy: string;
  python: string;
}

let worker: Worker | null = null;
let readyPromise: Promise<RuntimeInfo> | null = null;
let readyResolve: ((i: RuntimeInfo) => void) | null = null;
let readyReject: ((e: Error) => void) | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (v: never) => void; reject: (e: Error) => void }>();
const progressListeners = new Set<(phase: PyPhase) => void>();

function ensureWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("./pyodide.worker.ts", import.meta.url));
  worker.onmessage = (ev: MessageEvent) => {
    const m = ev.data as PyResponse;
    if (m.type === "progress") {
      progressListeners.forEach((l) => l(m.phase));
    } else if (m.type === "ready") {
      progressListeners.forEach((l) => l("ready"));
      readyResolve?.({ numpy: m.numpy, python: m.python });
    } else if (m.type === "result" || m.type === "verified") {
      const p = pending.get(m.id);
      pending.delete(m.id);
      p?.resolve(m as never);
    } else if (m.type === "error") {
      if (typeof m.id === "number") {
        pending.get(m.id)?.reject(new Error(m.message));
        pending.delete(m.id);
      } else {
        // boot failure: tear the worker down so a retry boots a fresh one (a dead worker never replies).
        readyReject?.(new Error(m.message));
        disposeWorker();
      }
    }
  };
  worker.onerror = (e) => {
    const err = new Error(e.message || "worker error");
    readyReject?.(err);
    pending.forEach((p) => p.reject(err));
    pending.clear();
    disposeWorker();
  };
  return worker;
}

/** Terminate + drop the worker and reset the ready latch so the next call boots cleanly. */
function disposeWorker(): void {
  worker?.terminate();
  worker = null;
  readyPromise = null;
}

/** Subscribe to runtime lifecycle phases; returns an unsubscribe fn. */
export function onPyodideProgress(cb: (phase: PyPhase) => void): () => void {
  progressListeners.add(cb);
  return () => progressListeners.delete(cb);
}

/** Idempotent: boots Pyodide + numpy + simpy + writes the simlab sources once. Resolves runtime versions. */
export function warmUp(): Promise<RuntimeInfo> {
  if (readyPromise) return readyPromise;
  const w = ensureWorker();
  readyPromise = new Promise<RuntimeInfo>((resolve, reject) => {
    readyResolve = resolve;
    readyReject = reject;
  });
  const sourcesUrl = `${import.meta.env.BASE_URL}pyodide/simlab-sources.json`;
  w.postMessage({ type: "init", sourcesUrl });
  return readyPromise;
}

function request<T>(message: object, id: number): Promise<T> {
  const w = ensureWorker();
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as (v: never) => void, reject });
    w.postMessage(message);
  });
}

/** Run a scenario in the browser; resolves with the trace (same schema as committed traces) + timing. */
export async function runLive(scenario: string, params: Record<string, number>, seed: number): Promise<LiveResult> {
  await warmUp();
  const id = nextId++;
  return request<LiveResult>({ type: "run", id, scenario, params, seed }, id);
}

/** Re-run a scenario and compare its serialized trace to the committed JSON text (byte then numeric tol). */
export async function verifyLive(
  scenario: string,
  params: Record<string, number>,
  seed: number,
  committed: string,
): Promise<VerifyResult> {
  await warmUp();
  const id = nextId++;
  return request<VerifyResult>({ type: "verify", id, scenario, params, seed, committed }, id);
}
