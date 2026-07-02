# Guide, the knowledge graph + the MCP server

Atalaya **owns** its knowledge graph. The pipeline builds it offline and deterministically into a portable SQLite
store, and exposes a read-only query surface over it as a Model Context Protocol server, so any agent (Claude Code,
Claude Desktop, an IDE assistant) can query the Data Observatory relation graph directly.

## The graph store

`core/graphdb.py` is a SQLite-WAL store with three tables: `nodes` (datasets, columns, entity keys), `edges` (the
five mined relations plus the fused affinity), and `observations` (free-form facts on a node, e.g. its column
list). Ids are content-addressed strings, so the store is deterministic and safe to rebuild. The heavy DB lives
out of git (`config.GRAPH_DB`, under the `E:` scratch tree); a decimated `graph.json` is committed for the web, and
`graphdb.snapshot()` writes a zstd backup.

## The MCP server

`mcp/atalaya_mcp.py` is a minimal MCP JSON-RPC 2.0 stdio server with no external dependency (it runs in the thin
runtime venv). It prefers the heavy SQLite graph for full detail (including column search) and falls back to the
committed `graph.json` when the DB is absent, so it works from a fresh clone with reduced detail.

Tools it exposes:

| Tool | What it answers |
|---|---|
| `atalaya_stats()` | graph + corpus summary (node/edge counts, source) |
| `find_related(dataset, kind?, limit?)` | the strongest neighbors of a dataset, optionally one edge kind |
| `join_path(a, b, max_hops?)` | a shortest `JOINABLE_ON` path, how to link two datasets |
| `correlations_for(dataset, min_rho?)` | cross-dataset correlations that survived the null + FDR |
| `search_datasets(term)` | datasets whose title/description/theme match a term |
| `search_columns(term)` | a variable across datasets (needs the offline graph DB) |

`dataset` accepts an id, a slug, or a title substring.

## Run it

```bash
python mcp/atalaya_mcp.py              # stdio JSON-RPC (the MCP default)
python mcp/atalaya_mcp.py --selftest   # print a stats summary and exit
```

Register it in an MCP client:

```jsonc
{ "mcpServers": { "atalaya": { "command": "python", "args": ["mcp/atalaya_mcp.py"] } } }
```

Full reference: [`../../mcp/README.md`](../../mcp/README.md).

## Honesty note

The committed `graph.json` is **decimated** (strongest 4000 edges), and column search is unavailable from it (the
committed graph omits columns). Run the pipeline locally to build the full SQLite graph for exhaustive queries.
There is no GPU lane in Atalaya: every stage runs on CPU (the embeddings use a CPU torch backend), so the offline
run needs no accelerator.
