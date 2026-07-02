// Worker <-> main-thread message protocol for the Pyodide live lane. The boundary is JSON-only (plain
// objects via structured clone) — no PyProxy ever crosses threads.

export type PyPhase =
  | "loading-runtime" // fetching + instantiating pyodide
  | "loading-packages" // numpy + micropip + simpy
  | "loading-simlab" // writing simlab sources into the FS + import
  | "running" // executing scenario.run
  | "ready";

export type PyMatch = "byte" | "numeric" | "differ";

export type PyRequest =
  | { type: "init"; sourcesUrl: string }
  | { type: "run"; id: number; scenario: string; params: Record<string, number>; seed: number }
  | {
      type: "verify";
      id: number;
      scenario: string;
      params: Record<string, number>;
      seed: number;
      committed: string; // the committed trace JSON text, fetched on the main thread
    };

export type PyResponse =
  | { type: "ready"; numpy: string; python: string }
  | { type: "progress"; phase: PyPhase }
  | { type: "result"; id: number; trace: unknown; runMs: number }
  | {
      type: "verified";
      id: number;
      trace: unknown;
      runMs: number;
      match: PyMatch;
      firstDiffPath?: string;
      firstDiffDelta?: number;
    }
  | { type: "error"; id?: number; phase?: PyPhase; message: string; kind: "runtime" | "python" | "network" };
