"""Portable knowledge-graph store: SQLite in WAL mode (nodes / edges / observations) plus a zstd snapshot.

Design borrowed from codebase-memory-mcp (SQLite-WAL + zstd snapshot + read-only query surface), adapted from a
code ontology to a DATA ontology. Nodes are datasets, columns and entity-keys; edges are the mined relations;
observations are free-form facts attached to a node (profile stats, provenance, license). The DB lives out-of-git
(heavy); a decimated graph.json is exported for the web, and a zstd snapshot is the shareable backup.

The store is deterministic (no autoincrement surprises: ids are content-addressed strings) and safe to rebuild.
"""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any, Iterable

SCHEMA = """
CREATE TABLE IF NOT EXISTS nodes (
    id      TEXT PRIMARY KEY,
    kind    TEXT NOT NULL,          -- dataset | column | entity
    label   TEXT NOT NULL,
    attrs   TEXT NOT NULL           -- JSON
);
CREATE TABLE IF NOT EXISTS edges (
    src     TEXT NOT NULL,
    dst     TEXT NOT NULL,
    kind    TEXT NOT NULL,          -- JOINABLE_ON | CORRELATES | SEMANTICALLY_SIMILAR | SPATIALLY_OVERLAPS | SAME_SOURCE
    weight  REAL NOT NULL,
    evidence TEXT NOT NULL,         -- JSON
    PRIMARY KEY (src, dst, kind)
);
CREATE TABLE IF NOT EXISTS observations (
    node_id TEXT NOT NULL,
    key     TEXT NOT NULL,
    value   TEXT NOT NULL,          -- JSON
    PRIMARY KEY (node_id, key)
);
CREATE INDEX IF NOT EXISTS idx_edges_src ON edges(src);
CREATE INDEX IF NOT EXISTS idx_edges_dst ON edges(dst);
CREATE INDEX IF NOT EXISTS idx_edges_kind ON edges(kind);
CREATE INDEX IF NOT EXISTS idx_nodes_kind ON nodes(kind);
"""


class GraphDB:
    def __init__(self, path: str | Path) -> None:
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(str(self.path))
        self.conn.execute("PRAGMA journal_mode=WAL")
        self.conn.execute("PRAGMA synchronous=NORMAL")
        self.conn.executescript(SCHEMA)

    # ---- writes (idempotent upserts) ----
    def add_node(self, node_id: str, kind: str, label: str, attrs: dict | None = None) -> None:
        self.conn.execute(
            "INSERT INTO nodes(id,kind,label,attrs) VALUES(?,?,?,?) "
            "ON CONFLICT(id) DO UPDATE SET kind=excluded.kind,label=excluded.label,attrs=excluded.attrs",
            (node_id, kind, label, json.dumps(attrs or {}, ensure_ascii=False)))

    def add_edge(self, src: str, dst: str, kind: str, weight: float, evidence: dict | None = None) -> None:
        self.conn.execute(
            "INSERT INTO edges(src,dst,kind,weight,evidence) VALUES(?,?,?,?,?) "
            "ON CONFLICT(src,dst,kind) DO UPDATE SET weight=excluded.weight,evidence=excluded.evidence",
            (src, dst, kind, float(weight), json.dumps(evidence or {}, ensure_ascii=False)))

    def add_observation(self, node_id: str, key: str, value: Any) -> None:
        self.conn.execute(
            "INSERT INTO observations(node_id,key,value) VALUES(?,?,?) "
            "ON CONFLICT(node_id,key) DO UPDATE SET value=excluded.value",
            (node_id, key, json.dumps(value, ensure_ascii=False)))

    def commit(self) -> None:
        self.conn.commit()

    def clear(self) -> None:
        for t in ("edges", "observations", "nodes"):
            self.conn.execute(f"DELETE FROM {t}")
        self.conn.commit()

    # ---- reads (the query surface the MCP server + export use) ----
    def nodes(self, kind: str | None = None) -> list[dict]:
        q = "SELECT id,kind,label,attrs FROM nodes" + (" WHERE kind=?" if kind else "")
        rows = self.conn.execute(q, (kind,) if kind else ()).fetchall()
        return [{"id": r[0], "kind": r[1], "label": r[2], "attrs": json.loads(r[3])} for r in rows]

    def edges(self, kind: str | None = None, min_weight: float = 0.0) -> list[dict]:
        q = "SELECT src,dst,kind,weight,evidence FROM edges WHERE weight>=?"
        args: list[Any] = [min_weight]
        if kind:
            q += " AND kind=?"
            args.append(kind)
        rows = self.conn.execute(q, args).fetchall()
        return [{"src": r[0], "dst": r[1], "kind": r[2], "weight": r[3], "evidence": json.loads(r[4])} for r in rows]

    def neighbors(self, node_id: str, min_weight: float = 0.0) -> list[dict]:
        rows = self.conn.execute(
            "SELECT src,dst,kind,weight,evidence FROM edges WHERE (src=? OR dst=?) AND weight>=? "
            "ORDER BY weight DESC", (node_id, node_id, min_weight)).fetchall()
        out = []
        for r in rows:
            other = r[1] if r[0] == node_id else r[0]
            out.append({"neighbor": other, "kind": r[2], "weight": r[3], "evidence": json.loads(r[4])})
        return out

    def observations(self, node_id: str) -> dict:
        rows = self.conn.execute("SELECT key,value FROM observations WHERE node_id=?", (node_id,)).fetchall()
        return {r[0]: json.loads(r[1]) for r in rows}

    def counts(self) -> dict:
        c = self.conn.execute
        return {
            "nodes": c("SELECT COUNT(*) FROM nodes").fetchone()[0],
            "edges": c("SELECT COUNT(*) FROM edges").fetchone()[0],
            "by_edge_kind": dict(c("SELECT kind,COUNT(*) FROM edges GROUP BY kind").fetchall()),
            "by_node_kind": dict(c("SELECT kind,COUNT(*) FROM nodes GROUP BY kind").fetchall()),
        }

    def close(self) -> None:
        self.conn.close()


def add_edges(db: GraphDB, edges: Iterable) -> int:
    """Bulk-add typed Edge objects (from io.schema). Returns the count."""
    n = 0
    for e in edges:
        db.add_edge(e.src, e.dst, e.kind, e.weight, e.evidence)
        n += 1
    db.commit()
    return n


def snapshot(db_path: str | Path, out_path: str | Path | None = None) -> Path:
    """Write a zstd-compressed snapshot of the DB file (shareable backup, codebase-memory-mcp style)."""
    import zstandard as zstd
    src = Path(db_path)
    out = Path(out_path) if out_path else src.with_suffix(src.suffix + ".zst")
    cctx = zstd.ZstdCompressor(level=19)
    with open(src, "rb") as fi, open(out, "wb") as fo:
        cctx.copy_stream(fi, fo)
    return out
