"""Atalaya MCP server — a read-only Model Context Protocol surface over the mined knowledge graph, so any agent
(Claude Code, Claude Desktop, an IDE assistant) can query the Data Observatory relation graph directly.

This is the durable, in-repo realization of "use a memory/graph tool to find relations in the data": rather than
depend on a generic memory MCP at runtime, Atalaya OWNS its graph (offline, deterministic) and exposes it through
the same protocol. The design mirrors codebase-memory-mcp (SQLite-backed, read-only query surface), adapted from a
code ontology to a DATA ontology (datasets / columns / entity-keys as nodes; joinable / correlates / similar /
overlaps / same-source as edges).

Tools exposed:
  atalaya_stats()                          graph + corpus summary
  find_related(dataset, kind?, limit?)     neighbours of a dataset, optionally by edge kind, ranked by weight
  join_path(a, b, max_hops?)               a shortest JOINABLE_ON path between two datasets (how to link them)
  correlations_for(dataset, min_rho?)      surviving cross-dataset correlations involving a dataset
  search_columns(term, limit?)             columns whose name/samples match a term (find a variable across datasets)
  search_datasets(term, limit?)            datasets whose title/description match a term

Transport: stdio (the MCP default). Requires the offline graph DB to exist (run the pipeline first). Falls back to
the committed decimated graph.json if the heavy DB is absent, so it works from a fresh clone too.

Run:  python mcp/atalaya_mcp.py         (register in an MCP client as command="python", args=["mcp/atalaya_mcp.py"])
"""
from __future__ import annotations

import json
import sys
from collections import deque
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "data-pipeline"))

from atalayalab import config  # noqa: E402


# --------------------------------------------------------------------------- graph access (DB or committed JSON) ---

class GraphView:
    """Unified read access: prefers the heavy SQLite graph (full detail); falls back to the committed graph.json."""

    def __init__(self) -> None:
        self.db = None
        self.json = None
        if Path(config.GRAPH_DB).exists():
            from atalayalab.core.graphdb import GraphDB
            self.db = GraphDB(config.GRAPH_DB)
        else:
            gj = config.DERIVED_DIR / "graph.json"
            if gj.exists():
                self.json = json.loads(gj.read_text(encoding="utf-8"))
        self.catalog = self._load_catalog()

    def _load_catalog(self) -> dict:
        cj = config.DERIVED_DIR / "catalog.json"
        if cj.exists():
            return {d["id"]: d for d in json.loads(cj.read_text(encoding="utf-8")).get("datasets", [])}
        return {}

    def ready(self) -> bool:
        return self.db is not None or self.json is not None

    def title(self, ds_id: str) -> str:
        return self.catalog.get(ds_id, {}).get("title", ds_id)

    def nodes(self) -> list[dict]:
        if self.db:
            return self.db.nodes(kind="dataset")
        return [{"id": n["id"], "label": n.get("label", n["id"]), "attrs": n} for n in (self.json or {}).get("nodes", [])]

    def edges(self, kind: str | None = None) -> list[dict]:
        if self.db:
            return self.db.edges(kind=kind)
        out = []
        for e in (self.json or {}).get("edges", []):
            if kind is None or e["k"] == kind:
                out.append({"src": e["s"], "dst": e["t"], "kind": e["k"], "weight": e["w"], "evidence": {}})
        return out

    def neighbors(self, ds_id: str, min_weight: float = 0.0) -> list[dict]:
        if self.db:
            return self.db.neighbors(ds_id, min_weight=min_weight)
        out = []
        for e in (self.json or {}).get("edges", []):
            if e["w"] < min_weight:
                continue
            if e["s"] == ds_id or e["t"] == ds_id:
                other = e["t"] if e["s"] == ds_id else e["s"]
                out.append({"neighbor": other, "kind": e["k"], "weight": e["w"], "evidence": {}})
        return sorted(out, key=lambda x: -x["weight"])


# --------------------------------------------------------------------------- tool implementations -----------------

def _resolve(gv: GraphView, ref: str) -> str | None:
    """Accept a dataset id, slug or a title substring; return the id."""
    if ref in gv.catalog:
        return ref
    low = ref.lower()
    for did, d in gv.catalog.items():
        if d.get("slug") == ref:
            return did
    for did, d in gv.catalog.items():
        if low in d.get("title", "").lower():
            return did
    return None


def tool_stats(gv: GraphView) -> dict:
    counts = gv.db.counts() if gv.db else {"nodes": len(gv.nodes()), "edges": len(gv.edges())}
    return {"catalog_datasets": len(gv.catalog), "graph": counts,
            "source": "sqlite" if gv.db else "committed-json"}


def tool_find_related(gv: GraphView, dataset: str, kind: str | None = None, limit: int = 15) -> dict:
    ds = _resolve(gv, dataset)
    if not ds:
        return {"error": f"dataset not found: {dataset!r}"}
    nbrs = [n for n in gv.neighbors(ds) if kind is None or n["kind"] == kind][:limit]
    return {"dataset": {"id": ds, "title": gv.title(ds)},
            "related": [{"id": n["neighbor"], "title": gv.title(n["neighbor"]), "kind": n["kind"],
                         "weight": n["weight"], "evidence": n.get("evidence", {})} for n in nbrs]}


def tool_join_path(gv: GraphView, a: str, b: str, max_hops: int = 4) -> dict:
    ai, bi = _resolve(gv, a), _resolve(gv, b)
    if not ai or not bi:
        return {"error": "one or both datasets not found"}
    adj: dict[str, list[tuple[str, dict]]] = {}
    for e in gv.edges(kind="JOINABLE_ON"):
        adj.setdefault(e["src"], []).append((e["dst"], e))
        adj.setdefault(e["dst"], []).append((e["src"], e))
    q = deque([(ai, [ai], [])])
    seen = {ai}
    while q:
        node, path, ev = q.popleft()
        if node == bi:
            return {"path": [{"id": p, "title": gv.title(p)} for p in path],
                    "hops": len(path) - 1, "keys": [x.get("evidence", {}).get("key") for x in ev]}
        if len(path) - 1 >= max_hops:
            continue
        for nxt, e in adj.get(node, []):
            if nxt not in seen:
                seen.add(nxt)
                q.append((nxt, path + [nxt], ev + [e]))
    return {"path": None, "reason": f"no JOINABLE_ON path within {max_hops} hops"}


def tool_correlations_for(gv: GraphView, dataset: str, min_rho: float = 0.0, limit: int = 25) -> dict:
    ds = _resolve(gv, dataset)
    if not ds:
        return {"error": f"dataset not found: {dataset!r}"}
    out = []
    for e in gv.edges(kind="CORRELATES"):
        if ds in (e["src"], e["dst"]) and e["weight"] >= min_rho:
            other = e["dst"] if e["src"] == ds else e["src"]
            out.append({"id": other, "title": gv.title(other), "weight": e["weight"],
                        "evidence": e.get("evidence", {})})
    out.sort(key=lambda x: -x["weight"])
    return {"dataset": {"id": ds, "title": gv.title(ds)}, "correlations": out[:limit]}


def tool_search_datasets(gv: GraphView, term: str, limit: int = 20) -> dict:
    low = term.lower()
    hits = []
    for d in gv.catalog.values():
        blob = f"{d.get('title', '')} {d.get('desc', '')} {d.get('theme', '')}".lower()
        if low in blob:
            hits.append({"id": d["id"], "title": d.get("title"), "theme": d.get("theme"),
                         "profiled": d.get("profiled", False)})
    return {"term": term, "n": len(hits), "results": hits[:limit]}


def tool_search_columns(gv: GraphView, term: str, limit: int = 30) -> dict:
    """Search columns via node observations (requires the SQLite graph; the committed graph.json omits columns)."""
    if not gv.db:
        return {"error": "column search needs the offline graph DB (run the pipeline)", "results": []}
    low = term.lower()
    hits = []
    for n in gv.db.nodes(kind="dataset"):
        cols = gv.db.observations(n["id"]).get("columns", [])
        for c in cols:
            if low in str(c).lower():
                hits.append({"dataset": n["id"], "title": gv.title(n["id"]), "column": c})
                if len(hits) >= limit:
                    return {"term": term, "n": len(hits), "results": hits}
    return {"term": term, "n": len(hits), "results": hits}


TOOLS = {
    "atalaya_stats": (tool_stats, "Graph + corpus summary.", {}),
    "find_related": (tool_find_related, "Neighbours of a dataset (id/slug/title), optionally by edge kind.",
                     {"dataset": "str", "kind": "str?", "limit": "int?"}),
    "join_path": (tool_join_path, "Shortest JOINABLE_ON path between two datasets.",
                  {"a": "str", "b": "str", "max_hops": "int?"}),
    "correlations_for": (tool_correlations_for, "Surviving cross-dataset correlations involving a dataset.",
                         {"dataset": "str", "min_rho": "float?", "limit": "int?"}),
    "search_datasets": (tool_search_datasets, "Datasets whose title/description/theme match a term.",
                        {"term": "str", "limit": "int?"}),
    "search_columns": (tool_search_columns, "Columns across datasets whose name matches a term.",
                       {"term": "str", "limit": "int?"}),
}


# --------------------------------------------------------------------------- MCP stdio server ---------------------

def _serve_stdio() -> None:
    """Minimal MCP JSON-RPC 2.0 stdio loop (no external dependency, so it runs in the thin runtime venv)."""
    gv = GraphView()
    if not gv.ready():
        sys.stderr.write("[atalaya-mcp] no graph found; run the pipeline or ship data/derived/graph.json\n")

    def reply(msg_id, result=None, error=None):
        out = {"jsonrpc": "2.0", "id": msg_id}
        if error is not None:
            out["error"] = {"code": -32000, "message": error}
        else:
            out["result"] = result
        sys.stdout.write(json.dumps(out, ensure_ascii=False) + "\n")
        sys.stdout.flush()

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
        except json.JSONDecodeError:
            continue
        method, mid, params = req.get("method"), req.get("id"), req.get("params", {})
        if method == "initialize":
            reply(mid, {"protocolVersion": "2024-11-05", "serverInfo": {"name": "atalaya", "version": "0.9.2"},
                        "capabilities": {"tools": {}}})
        elif method == "tools/list":
            reply(mid, {"tools": [{"name": n, "description": d,
                                   "inputSchema": {"type": "object",
                                                   "properties": {k: {"type": "string"} for k in sig},
                                                   "required": [k for k, v in sig.items() if not v.endswith("?")]}}
                                  for n, (_, d, sig) in TOOLS.items()]})
        elif method == "tools/call":
            name = params.get("name")
            args = params.get("arguments", {})
            if name not in TOOLS:
                reply(mid, error=f"unknown tool: {name}")
                continue
            fn = TOOLS[name][0]
            try:
                result = fn(gv, **args)
                reply(mid, {"content": [{"type": "text", "text": json.dumps(result, ensure_ascii=False, indent=2)}]})
            except Exception as e:  # noqa: BLE001 - report tool errors back over the protocol
                reply(mid, error=f"{type(e).__name__}: {e}")
        elif method in ("notifications/initialized", "notifications/cancelled"):
            continue
        else:
            reply(mid, error=f"unknown method: {method}")


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        gv = GraphView()
        print(json.dumps(tool_stats(gv), indent=2))
    else:
        _serve_stdio()
