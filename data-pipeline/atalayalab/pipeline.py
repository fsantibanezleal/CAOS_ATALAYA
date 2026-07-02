"""The offline pipeline orchestrator + CLI (ADR-0057). Runs the named stages over the whole corpus, mines the
knowledge graph, fits the model ladder, validates it, and exports the compact web artifacts + manifests.

Stages (frozen names + one domain stage `harvest` prepended):
    harvest -> preprocess -> feature_extraction -> train -> infer(relate) -> evaluate -> export

    python -m atalayalab.pipeline                 # full run (assumes harvest already mirrored the data)
    python -m atalayalab.pipeline --harvest       # also (re)run the size-gated download first
    python -m atalayalab.pipeline --limit 200     # cap resources (smoke / dev)
    python -m atalayalab.pipeline --no-onnx       # skip the ONNX export (faster dev loop)
"""
from __future__ import annotations

import argparse

from . import config
from .cases.builders import CorpusContext
from .stages import evaluate, export, feature_extraction, harvest, infer, preprocess, train

STAGES = ("harvest", "preprocess", "feature_extraction", "train", "infer", "evaluate", "export")


def run_all(*, do_harvest: bool = False, seed: int = config.DEFAULT_SEED, limit: int | None = None,
            sample_rows: int | None = 50_000, export_onnx: bool = True, log=print) -> dict:
    config.ensure_scratch_dirs()
    # 0. harvest (enumerate always; download optional)
    docs = harvest.enumerate_catalog()
    datasets = harvest.build_inventory(docs)
    size_rep = harvest.size_report(datasets)
    if do_harvest:
        harvest.download_tier_a(datasets, limit=limit, log=log)
    slug_to_id = {d.slug: d.id for d in datasets}

    # 1. preprocess -> normalized parquet
    normalized = preprocess.run(sample_rows=sample_rows, slug_to_id=slug_to_id, limit=limit, log=log)
    if not normalized:
        raise SystemExit("no normalized resources; run with --harvest first to mirror the catalog")

    # 2. feature_extraction -> profiles (+ embeddings)
    profiles = feature_extraction.run(datasets, normalized, log=log)

    # 3. train -> model ladder (coords/clusters/nulls) + ONNX encoder
    model_bundle = train.run(profiles, seed=seed, export_onnx=export_onnx, log=log)

    # 4. infer (relate) -> knowledge graph
    db = infer.run(profiles, normalized, datasets, model_bundle, seed=seed, log=log)

    # 5. evaluate -> metrics (negative controls, coherence, sanity)
    metrics = evaluate.run(db, profiles, normalized, datasets, seed=seed, log=log)

    # 6. export -> compact web artifacts + manifests + catalog + graph
    ctx = CorpusContext(datasets=datasets, profiles=profiles, normalized=normalized, db=db,
                        model_bundle=model_bundle, size_report=size_rep)
    entries = export.run(ctx, metrics, seed=seed, log=log)
    db.close()
    return {"n_datasets": len(datasets), "n_profiled": len(profiles), "n_cases": len(entries),
            "graph": metrics.get("graph", {}), "neg_control": metrics.get("negative_control", {})}


def main() -> None:
    ap = argparse.ArgumentParser(prog="atalayalab.pipeline")
    ap.add_argument("--harvest", action="store_true", help="run the size-gated download before processing")
    ap.add_argument("--seed", type=int, default=config.DEFAULT_SEED)
    ap.add_argument("--limit", type=int, default=None, help="cap resources processed (smoke/dev)")
    ap.add_argument("--sample-rows", type=int, default=50_000, help="rows read per table for profiling")
    ap.add_argument("--no-onnx", action="store_true", help="skip the ONNX encoder export")
    args = ap.parse_args()
    summary = run_all(do_harvest=args.harvest, seed=args.seed, limit=args.limit,
                      sample_rows=args.sample_rows, export_onnx=not args.no_onnx)
    print(f"[pipeline] done: {summary}")


if __name__ == "__main__":
    main()
