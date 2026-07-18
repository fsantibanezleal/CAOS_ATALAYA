# The live lane (ONNX semantic search + affinity reweight)

Atalaya's live lane is **not** Pyodide. It is two genuinely client-side computations that run in the browser with
no server and no precompute-at-request-time:

1. **ONNX semantic search** over the whole catalog.
2. **JS affinity reweight** of the novel multi-evidence score.

Both are honest live compute (real work happening in the visitor's browser), and both degrade gracefully to a
baked result if their runtime cannot load.

## 1. ONNX semantic search

`frontend/src/components/app/SemanticSearch.tsx`. The user types a free-text query in Spanish or English; the
multilingual MiniLM encoder runs in the browser via **transformers.js** on **onnxruntime-web** (WASM), producing a
384-dim query vector. That vector is cosine-ranked against the baked dataset embeddings in
`data/derived/embeddings.json` (schema `atalaya.embeddings/v1`, model `paraphrase-multilingual-MiniLM-L12-v2`).

- Model id in the browser: `Xenova/paraphrase-multilingual-MiniLM-L12-v2`, quantized (`dtype: "q8"`) to keep the
  WASM download small.
- The same encoder is exported offline by `train.py :: export_onnx_encoder()` (HF to ONNX via `optimum`), so the
  offline embeddings and the live query vector come from the same model.
- Ranking is plain cosine similarity:

```math
\operatorname{sim}(q, d) = \frac{q \cdot d}{\lVert q \rVert\, \lVert d \rVert}
```

- **Graceful fallback:** if the model fails to load or encode, the panel falls back to keyword matching over the
  dataset titles and shows a "fallback" note, so the feature never dead-ends.

This is why the embeddings ship: `export.py :: _embeddings_json()` writes a compact, rounded vector per profiled
dataset precisely so the browser can rank a live query against them.

## 2. Affinity reweight (client-side)

The novel proposal (`model/affinity.py`) is pure-Python, numpy-only, and monotone/interpretable by design, so the
browser can recompute the fused affinity live when the user moves the evidence-weight sliders. The affinity
payload (`AFF_top` artifact) carries each pair's per-evidence terms `f_sem`, `f_join`, `f_stat`; the App applies
the chosen weights `w_sem, w_join, w_stat` directly:

```math
S(A,B) = \frac{w_{\text{sem}}\,f_{\text{sem}} + w_{\text{join}}\,f_{\text{join}} + w_{\text{stat}}\,f_{\text{stat}}}
              {w_{\text{sem}} + w_{\text{join}} + w_{\text{stat}}}
```

Because every term is baked into the payload, reweighting is instant and reads no server. The variant bar
(`bal / sem / join / stat`) is exactly a preset of these weights, applied client-side from the single payload, so
the App reacts instantly with no per-variant recompute and no compute bomb (`cases/builders.py`).

## Replay is always the floor

Everything the web needs is committed as a static artifact (Contract 2). The live lane is additive: if WASM
loading is blocked or slow, semantic search falls back to keyword search and the affinity view shows the baked
default weights. A visitor always sees a complete, correct product; the live compute makes it interactive, it is
never a prerequisite.

## Honesty note

"Live" here means the query encoder and the affinity fusion run in the browser, not that the relation-mining
pipeline (embeddings for all datasets, correlations, joinability, the null models) runs client-side; that is
offline-only and reaches the web solely as the committed artifacts.
