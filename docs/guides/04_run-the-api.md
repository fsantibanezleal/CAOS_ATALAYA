# Guide, the live lane (browser ONNX search + affinity reweight)

Atalaya has **no backend at request time**: the FastAPI `app/` scaffold is dormant and not used. Everything the web
serves is the committed `data/derived/` artifacts, plus two genuinely client-side computations that run in the
visitor's browser. This is the live lane; it is additive, and always degrades to a baked result.

## 1. ONNX semantic search

`frontend/src/components/app/SemanticSearch.tsx`. The visitor types a free-text query (Spanish or English); the
multilingual MiniLM encoder runs in the browser via **transformers.js** on **onnxruntime-web** (WASM) and produces
a 384-dim query vector, which is cosine-ranked against the baked dataset embeddings in `data/derived/embeddings.json`.

- Browser model: `Xenova/paraphrase-multilingual-MiniLM-L12-v2`, quantized (`dtype: "q8"`).
- Same model as offline: `train.py :: export_onnx_encoder()` exports the encoder (HF to ONNX via `optimum`), so the
  offline embeddings and the live query vector agree.
- **Fallback:** if the model cannot load or encode, the panel falls back to keyword matching over dataset titles
  and shows a note, so the feature never dead-ends.

## 2. Affinity reweight

The novel affinity (`model/affinity.py`) is pure-Python, numpy-only, and monotone/interpretable, so the browser
recomputes the fused score live when the visitor moves the evidence-weight sliders. The `AFF_top` artifact carries
every pair's per-evidence terms (`f_sem`, `f_join`, `f_stat`), so reweighting reads no server and is instant; the
variant presets (balanced / semantic-led / join-led / correlation-led) are just weight choices applied
client-side.

## Run it locally

There is nothing server-side to start. Build and serve the SPA:

```bash
cd frontend
npm install
npm run dev        # or: npm run build && npm run preview
```

`frontend/copy-data.mjs` overlays `data/derived` (including `embeddings.json`) into `frontend/public/data`, so the
live lanes have their vectors and payloads. The first semantic search downloads the WASM model on demand.

## Why not a server

The relation-mining science runs offline and reaches the web only as the committed artifacts (CONTRACT 2). The two
live computations are small, safe, and interactive by design; they do not need, and do not use, a backend. The
`app/` FastAPI scaffold would only be activated on an ADR-0002 trigger (server-side processing of uploaded data,
auth-gated private data), which Atalaya does not require.

## Honesty note

"Live" means the query encoder and the affinity fusion run in the browser, not that the pipeline re-runs
client-side. If WASM is blocked, semantic search still works (keyword fallback) and the affinity view shows the
baked default weights, so a visitor always sees a complete, correct product. See
[../architecture/04_live-lane-pyodide.md](../architecture/04_live-lane-pyodide.md).
