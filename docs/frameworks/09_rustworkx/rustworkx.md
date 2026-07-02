# Framework card · graph analytics + portable store (rustworkx + zstandard)

## What & why

The mined relations form a knowledge graph over 1000+ datasets, and questions about it (communities of related
datasets, central hub datasets, shortest join paths between two datasets) are graph algorithms. **rustworkx** is a
Rust-backed graph library with a fast NetworkX-like API: modularity-based community detection, centrality, and
shortest paths at this scale in milliseconds. The graph itself is persisted in a SQLite-WAL store (`core/graphdb.py`)
and snapshotted with **zstandard** (zstd), the codebase-memory-mcp portable-store pattern adapted from a code
ontology to a data ontology.

Chosen over NetworkX (pure-Python, slow at corpus scale) for the analytics, and over a heavyweight graph DB
(Neo4j) for storage: SQLite-WAL + a zstd snapshot is deterministic, dependency-light, and trivially shareable.

## Install (exact, verified)

Pinned in `data-pipeline/requirements-precompute.txt`:

```
rustworkx==0.15.1
zstandard==0.23.0
```

## Usage

```python
import rustworkx as rx
g = rx.PyGraph()
idx = {n: g.add_node(n) for n in dataset_ids}
for e in edges:
    g.add_edge(idx[e.src], idx[e.dst], e.weight)
communities = rx.community.louvain_communities(g)   # modularity communities
central = rx.betweenness_centrality(g)               # hub datasets
```

## Applying it here

- `core/graphdb.py` `GraphDB` is the SQLite-WAL store (nodes / edges / observations, content-addressed ids,
  idempotent upserts, `PRAGMA journal_mode=WAL`). `infer.py` `run` writes every mined edge kind into it and reads
  it back; `export.py` `_graph_json` decimates it (top-4000 edges by weight) into the committed `graph.json`.
- `snapshot` (in `graphdb.py`) writes a `zstandard`-compressed backup of the DB file (level 19), the shareable
  portable store.
- rustworkx provides the graph analytics over the persisted graph (communities / centrality / join paths) that the
  `graph` render kind surfaces; `export.py` credits `rustworkx` as a producing engine for that kind.

## Caveats / license

rustworkx Apache-2.0, zstandard BSD (redistributable). The heavy SQLite DB + zstd snapshot live out-of-git; only
the decimated `graph.json` is committed. Community detection is stochastic unless seeded; report the modularity so
the partition is auditable. Reference for modularity communities: Newman, *Modularity and community structure in
networks* (PNAS 2006, DOI 10.1073/pnas.0601602103).
