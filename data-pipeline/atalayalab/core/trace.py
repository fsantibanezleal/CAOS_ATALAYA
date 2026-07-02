"""The compact ARTIFACT = the web-replay payload for one case (part of CONTRACT 2). Its shape is mirrored by
frontend/src/lib/contract.types.ts so a drift fails the web build. The schema id is versioned.

Unlike a physics sim's trajectory, an Atalaya case artifact is a small typed record describing a slice of the
knowledge graph or a computed finding table (the App replays it; it does not recompute it). Builders live in
cases/; this module only fixes the envelope + a size guard so committed artifacts stay small.
"""
from __future__ import annotations

TRACE_SCHEMA = "atalaya.artifact/v1"
MAX_ROWS = 600          # a case finding table is decimated to the strongest MAX_ROWS rows for the committed copy


def build_artifact(case_id: str, kind: str, payload: dict) -> dict:
    """Wrap a case payload in the versioned envelope. `kind` is the render family the web switches on
    (map | graph | findings | choropleth | timeline | quality)."""
    return {"schema": TRACE_SCHEMA, "case_id": case_id, "kind": kind, "payload": payload}


def decimate_rows(rows: list, key=lambda r: r.get("weight", 0.0), limit: int = MAX_ROWS) -> list:
    """Keep the strongest `limit` rows (by |key|) so the committed artifact stays small; the full set lives in the
    out-of-git graph DB and is queryable by the MCP server."""
    if len(rows) <= limit:
        return rows
    return sorted(rows, key=lambda r: -abs(key(r)))[:limit]
