"""Stage 6 — export (CONTRACT 2): write the compact per-case artifacts + manifests, the global catalog + graph
payloads, and the case index. The web loads ONLY these; it never recomputes. Everything here is committed-small
(decimated); the heavy graph DB + raw data stay out-of-git.

Outputs (into data/derived, then copied to frontend/public/data by frontend/copy-data.mjs):
  derived/<case>/artifact.json       the case payload (CONTRACT 2)
  derived/manifests/<case>.json      the case manifest (+ index.json)
  derived/catalog.json               the full 1017-dataset lightweight inventory (for search + the App)
  derived/graph.json                 the decimated global knowledge graph (nodes + all edge kinds)
  derived/metrics.json               the evaluate() metrics (Experiments/Benchmark read these)
"""
from __future__ import annotations

from dataclasses import asdict
from pathlib import Path

from .. import config, registry
from ..cases.builders import BUILDERS, CorpusContext
from ..core.gate import classify_lane
from ..core.manifest import build_case_manifest, build_index
from ..core.trace import build_artifact, decimate_rows
from ..io.formats import write_json

# which real engines produced each render kind (traceability on the manifest)
ENGINES_BY_KIND = {
    "map": ["sentence-transformers", "scikit-learn.PCA", "scikit-learn.KMeans"],
    "overview": ["polars"],
    "graph": ["sentence-transformers", "datasketch.MinHashLSHEnsemble", "rustworkx"],
    "findings": ["numpy", "atalayalab.stats(Spearman+permutation+BH-FDR)"],
    "coverage": ["polars", "pyproj"],
    "timeline": ["polars"],
    "quality": ["polars", "atalayalab.io.contract"],
    "affinity": ["atalayalab.model.affinity(calibrated-multi-evidence)"],
}


def _catalog_json(ctx: CorpusContext) -> dict:
    """Lightweight inventory of ALL datasets (not only the profiled subset) for search + the App browser."""
    profiled = {p.dataset_id for p in ctx.profiles}
    rows = []
    for d in ctx.datasets:
        rows.append({
            "id": d.id, "slug": d.slug, "title": d.title, "theme": d.theme, "sub": d.sub_category,
            "origin": d.origin, "org": d.org[:60], "license": d.license,
            "n_resources": len(d.resources), "formats": sorted({r.fmt for r in d.resources}),
            "tiers": sorted({r.tier for r in d.resources}), "profiled": d.id in profiled,
            "lat": d.lat, "lon": d.lon, "desc": d.description[:280],
        })
    return {"schema": "atalaya.catalog/v1", "n": len(rows), "datasets": rows}


def _embeddings_json(ctx: CorpusContext) -> dict:
    """Compact baked embeddings for the browser live semantic-search lane: cosine of an in-browser query vector
    (encoded by transformers.js / onnxruntime-web) against these gives live free-text ranking. Rounded to keep
    the file small; only profiled datasets (which carry an embedding)."""
    by_title = {d.id: d.title for d in ctx.datasets}
    rows = [{"id": p.dataset_id, "title": (by_title.get(p.dataset_id, p.dataset_id))[:90],
             "v": [round(x, 4) for x in p.embedding]} for p in ctx.profiles if p.embedding]
    dim = len(rows[0]["v"]) if rows else 0
    return {"schema": "atalaya.embeddings/v1", "model": "paraphrase-multilingual-MiniLM-L12-v2",
            "dim": dim, "n": len(rows), "datasets": rows}


def _graph_json(ctx: CorpusContext) -> dict:
    counts = ctx.db.counts()
    nodes = ctx.db.nodes(kind="dataset")
    edges = ctx.db.edges()
    edges = decimate_rows([{"s": e["src"], "t": e["dst"], "k": e["kind"], "w": round(e["weight"], 4)}
                           for e in edges], key=lambda r: r["w"], limit=4000)
    return {"schema": "atalaya.graph/v1", "counts": counts,
            "nodes": [{"id": n["id"], "label": n["label"], **{k: n["attrs"].get(k) for k in
                       ("theme", "origin", "cluster", "coord", "n_cols", "entity_keys")}} for n in nodes],
            "edges": edges}


def run(ctx: CorpusContext, metrics: dict, *, seed: int = config.DEFAULT_SEED,
        derived_dir: Path | None = None, log=print) -> list[dict]:
    derived = Path(derived_dir or config.DERIVED_DIR)
    manifests = derived / "manifests"
    derived.mkdir(parents=True, exist_ok=True)
    manifests.mkdir(parents=True, exist_ok=True)

    entries = []
    for case in registry.list_cases():
        builder = BUILDERS[case.builder]
        kind, payload, stats = builder(ctx)
        artifact = build_artifact(case.id, kind, payload)
        artifact_rel = f"{case.id}/artifact.json"
        nbytes = write_json(derived / artifact_rel, artifact)
        # lane: these are baked replay artifacts (precompute); the live semantic-search lane is the ONNX encoder,
        # gated separately in the web. Measure the artifact size against the gate for an honest verdict.
        gate = classify_lane(pure_python=True, wheels=set(), run_ms=0.0, trace_bytes=nbytes)
        manifest = build_case_manifest(
            case=case, seed=seed, artifact_rel=artifact_rel, trace_bytes=nbytes, gate=gate,
            engines=ENGINES_BY_KIND.get(kind, []), stats=stats, flags=[])
        write_json(manifests / f"{case.id}.json", manifest)
        entries.append({"case_id": case.id, "category": case.category, "render_kind": kind,
                        "manifest_path": f"manifests/{case.id}.json", "bytes": nbytes})
        log(f"[export] {case.id:16s} [{case.category:12s}] {kind:9s} {nbytes:>7d}B stats={stats}")

    write_json(manifests / "index.json", build_index(entries))
    write_json(derived / "catalog.json", _catalog_json(ctx))
    write_json(derived / "graph.json", _graph_json(ctx))
    write_json(derived / "embeddings.json", _embeddings_json(ctx))
    write_json(derived / "metrics.json", metrics)
    write_json(derived / "categories.json",
               {"schema": "atalaya.categories/v1", "categories": registry.list_categories(),
                "cases": [{"id": c.id, "category": c.category, "render_kind": c.render_kind,
                           "title_en": c.title_en, "title_es": c.title_es,
                           "variants": [asdict(v) for v in c.variants]} for c in registry.list_cases()]})
    log(f"[export] wrote {len(entries)} cases + catalog + graph + metrics -> {derived}")
    return entries
