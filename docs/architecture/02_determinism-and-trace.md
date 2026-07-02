# Determinism and the compact artifact

**A run is a pure function of `(params, seed)`.** The pipeline never touches a global or implicit RNG; every
random draw threads a generator made by `core/rng.py :: make_rng(seed)` (the seed defaults to `42`,
`config.DEFAULT_SEED`). Same inputs, byte-identical output. This is what makes the committed artifact a
trustworthy source of truth that the SPA merely renders (ADR-0052 / ADR-0054).

Determinism is not incidental here: the permutation null in `model/stats.py`, the background pairs that fit the
affinity null CDFs in `train.py`, and the shuffled-key negative control in `evaluate.py` are all seeded, so the
reported false-discovery rate and every surviving correlation are reproducible from a clean clone.

## The compact artifact

Unlike a physics simulator's trajectory, an Atalaya case artifact is a small typed record describing a slice of
the knowledge graph or a computed finding table. `core/trace.py` fixes the envelope and a size guard:

```
{ "schema": "atalaya.artifact/v1", "case_id": ..., "kind": ..., "payload": {...} }
```

`kind` is the render family the web switches on (`map | graph | findings | coverage | timeline | quality |
affinity | overview`). The payload is decimated so the committed copy stays small: `decimate_rows()` keeps the
strongest `N` rows or edges by absolute weight (`MAX_ROWS = 600` for finding tables; graph payloads cap at 1200
edges; the global `graph.json` caps at 4000). The full graph stays in the out-of-git SQLite store and is
queryable through the [MCP server](../../mcp/README.md).

Decimation is a top-`N`-by-strength selection, i.e. for a set of rows with weights `w_i` the committed subset is

```math
\text{keep} = \operatorname{arg\,top\text{-}N}_i\; |w_i|
```

so the strongest evidence is always what ships, and weak or borderline edges are dropped from the web copy (not
from the DB).

The artifact shape is mirrored by `frontend/src/lib/contract.types.ts`, so any drift between what the pipeline
writes and what the web expects fails the web build (`tsc`). This is CONTRACT 2, detailed in
[08_data-contracts.md](08_data-contracts.md).

## Honesty note

The committed artifact is a **decimated** view. The web is honest that it shows the strongest N edges or findings,
not the full graph; the complete graph is reachable only through the offline DB and the MCP server. Nothing in the
web recomputes the science; the only in-browser computation is the live lane (semantic search and affinity
reweight), which is explicitly labeled where it runs.
