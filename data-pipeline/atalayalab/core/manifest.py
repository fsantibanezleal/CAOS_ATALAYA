"""CONTRACT 2 — artifact (pipeline -> web). The manifest is the authoritative, versioned record of a baked case:
its category, the engines that produced it, the compact artifact pointer + byte size, the lane/gate verdict, the
CONTRACT-1 quality flags and the evaluation metrics. The web loads ONLY manifests + artifacts;
frontend/src/lib/contract.types.ts mirrors this schema so a drift fails the web build. A flat index.json
inventories every case (ADR-0057 default)."""
from __future__ import annotations

from .. import __version__
from .trace import TRACE_SCHEMA

MANIFEST_SCHEMA = "atalaya.manifest/v2"
INDEX_SCHEMA = "atalaya.index/v1"


def build_case_manifest(
    *,
    case,
    seed: int,
    artifact_rel: str,
    trace_bytes: int,
    gate: dict,
    engines: list[str],
    stats: dict,
    flags: list[str],
) -> dict:
    """Deterministic record of one baked case. `stats` are case-specific summary numbers (n nodes/edges/findings);
    `engines` names the real libraries that produced it (traceability, no toy-substitute claims)."""
    return {
        "schema": MANIFEST_SCHEMA,
        "case_id": case.id,
        "category": case.category,
        "title_en": case.title_en,
        "title_es": case.title_es,
        "render_kind": case.render_kind,
        "real_or_synthetic": "real",
        "engine": {"package": "atalayalab", "version": __version__, "engines": engines},
        "seed": seed,
        "artifact": {"path": artifact_rel, "format": "json", "trace_schema": TRACE_SCHEMA, "bytes": trace_bytes},
        "lane": gate["lane"],
        "gate": gate,
        "flags": flags,
        "stats": stats,
    }


def build_index(entries: list[dict]) -> dict:
    """entries: [{case_id, category, manifest_path, render_kind}] -> the flat authoritative inventory."""
    return {
        "schema": INDEX_SCHEMA,
        "engine_version": __version__,
        "n_cases": len(entries),
        "cases": sorted(entries, key=lambda e: e["case_id"]),
    }
