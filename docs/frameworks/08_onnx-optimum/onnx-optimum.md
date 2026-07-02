# Framework card · ONNX encoder export (ONNX + ONNX Runtime + Optimum)

## What & why

The app's live semantic-search lane runs *in the browser*: the user types free text, it is encoded on the client,
and cosine against the baked dataset embeddings gives live ranking. That requires the MiniLM encoder as a portable
graph the browser can run (via `onnxruntime-web` / `transformers.js`), not a PyTorch checkpoint. **Optimum**'s
`exporters` convert the Hugging Face encoder to **ONNX**; **ONNX Runtime** loads the exported graph locally for a
parity check before it ships. This is the offline→live bridge: precompute exports the graph, the browser runs it.

Chosen over hand-writing the export (Optimum handles the HF→ONNX graph faithfully) and over shipping PyTorch to the
client (impossible in-browser). ONNX is the interchange standard both `onnxruntime-web` and `transformers.js`
consume.

## Install (exact, verified)

Pinned in `data-pipeline/requirements-precompute.txt`:

```
onnx==1.17.0
onnxruntime==1.20.1
optimum[exporters]==1.23.3
```

## Usage

```python
from optimum.onnxruntime import ORTModelForFeatureExtraction
from transformers import AutoTokenizer
model = ORTModelForFeatureExtraction.from_pretrained(EMBED_MODEL, export=True)  # HF -> ONNX
tok = AutoTokenizer.from_pretrained(EMBED_MODEL)
model.save_pretrained("minilm-encoder"); tok.save_pretrained("minilm-encoder")
```

## Applying it here

- `train.py` `export_onnx_encoder` exports the MiniLM encoder (`config.EMBED_MODEL`) via
  `optimum.onnxruntime.ORTModelForFeatureExtraction(export=True)` plus its `AutoTokenizer` into
  `MODEL_ROOT/minilm-encoder` (opset 14, dim `config.EMBED_DIM` = 384). It is *resilient*: on any failure the
  pipeline logs and continues, and the live lane degrades to the baked embeddings (`_embeddings_json` in
  `export.py`).
- `onnxruntime` is the local parity check: load the exported `.onnx` and confirm its vectors match the
  sentence-transformers output before shipping.
- The `onnx` result (exported/path/dim/opset/reason) is recorded in the `train` bundle + `model_card.json`. The
  encoder feeds the browser live semantic-search lane; the baked artifacts remain the fallback.

## Caveats / license

ONNX/ONNX Runtime MIT, Optimum Apache-2.0 (redistributable). Export can fail on architecture/version mismatch,
hence the try/except and graceful degradation. The heavy `.onnx` lives out-of-git (MODEL_ROOT); only the compact
model card is committed. Always run the onnxruntime parity check before shipping the graph to the web.
