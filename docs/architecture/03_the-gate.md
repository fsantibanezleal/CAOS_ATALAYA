# The measured live-vs-precompute gate

`data-pipeline/atalayalab/core/gate.py :: classify_lane()` is a **measurement**, never a hand-wave. It records,
per case, whether a computation is small and safe enough to run in the browser or must be replayed from a baked
artifact. The verdict plus the numbers behind it go into the manifest, and CI fails if `manifest.lane` disagrees
with the gate, so a heavy computation can never be mislabeled "live".

A case is classified **live** only if all four conditions hold:

- it is **pure-Python**, AND
- its wheels are a subset of the safe wheel set `LIVE_WHEELS = {numpy}`, AND
- its runtime is within the interaction budget `RUN_MS_GATE = 1500 ms`, AND
- its artifact is small, `TRACE_BYTES_GATE = 256 KiB`.

Otherwise the case is **precompute**: the offline pipeline bakes the artifact and the SPA replays it. Either way a
committed artifact always exists, so the site paints instantly on first load (ADR-0054).

## What the gate does and does not store

The gate uses the measured runtime for the **decision** but deliberately does **not** store the wall-clock number.
The committed manifest must be a pure function of `(params, seed)`; a wall-clock field would dirty git on every
re-run. So the manifest records the verdict plus the deterministic budgets (`run_ms_budget`,
`trace_bytes_budget`) and the reasons, not the raw milliseconds.

## How Atalaya actually uses it

Every Atalaya case is a **baked replay artifact**. In `export.py`, each case is gated with
`classify_lane(pure_python=True, wheels=set(), run_ms=0.0, trace_bytes=nbytes)`: the only thing measured against
the budget is the artifact byte size, giving an honest per-case verdict recorded on the manifest.

The genuinely **live** computation in Atalaya is a separate lane, gated separately in the web, not by this
Python function: the ONNX semantic encoder (transformers.js / onnxruntime-web) plus the client-side affinity
reweight. Those run against the baked `embeddings.json` and the affinity payload, and never call back to a server.
See [04_live-lane-pyodide.md](04_live-lane-pyodide.md).

## Honesty note

The gate is about the **precompute** artifacts: it certifies each committed artifact stays under the size budget so
replay is instant. It is not a claim that any case re-runs the relation-mining science in the browser (it does
not). The only in-browser recompute is the ONNX search and the affinity reweight, which are honest, labeled, and
degrade gracefully to a baked result if the WASM model fails to load.
