# Atalaya MCP server

A **read-only [Model Context Protocol](https://modelcontextprotocol.io) server** over Atalaya's mined knowledge
graph. It lets any MCP client (Claude Code, Claude Desktop, an IDE assistant) query the Data Observatory relation
graph directly, so an agent can *find relations in the data* without re-deriving them.

It is the durable, in-repo answer to "use a memory/graph tool for the data": instead of depending on a generic
memory server at runtime, Atalaya **owns** its graph (built offline, deterministically, by the pipeline) and
exposes it through the same protocol. The storage + read-only-query design follows the pattern of
[`DeusData/codebase-memory-mcp`](https://github.com/DeusData/codebase-memory-mcp) (SQLite-backed graph, no writes
from the client), re-pointed from a *code* ontology to a *data* ontology.

## Tools

| Tool | What it answers |
|---|---|
| `atalaya_stats()` | graph + corpus summary (node/edge counts, source) |
| `find_related(dataset, kind?, limit?)` | the strongest neighbours of a dataset (optionally one edge kind) |
| `join_path(a, b, max_hops?)` | a shortest `JOINABLE_ON` path — *how do I link these two datasets?* |
| `correlations_for(dataset, min_rho?)` | cross-dataset correlations that survived the null + FDR |
| `search_datasets(term)` | datasets whose title/description/theme match a term |
| `search_columns(term)` | a variable across datasets (needs the offline graph DB) |

`dataset` accepts an id, a slug, or a title substring.

## Run

```bash
python mcp/atalaya_mcp.py              # stdio JSON-RPC (the MCP default)
python mcp/atalaya_mcp.py --selftest   # print a stats summary and exit
```

It prefers the heavy SQLite graph (full detail, incl. column search); if that is absent it falls back to the
committed `data/derived/graph.json`, so it works from a fresh clone (with reduced detail).

## Register in an MCP client

```jsonc
// e.g. an MCP client config
{
  "mcpServers": {
    "atalaya": { "command": "python", "args": ["mcp/atalaya_mcp.py"] }
  }
}
```

## Dev-time companion

During development we also run `codebase-memory-mcp` on this repo as a coding aid (code intelligence over the
source). That is a separate, general-purpose server; the Atalaya server here is specific to the *data* graph and
is the one that ships with the product.
