# Architecture

- [01 · overview](architecture/01_overview.md): the observatory-of-the-observatory idea, the pipeline, the three lanes, the flow
- [02 · determinism + the compact artifact](architecture/02_determinism-and-trace.md)
- [03 · the measured live/precompute gate](architecture/03_the-gate.md)
- [04 · the live lane (ONNX semantic search + affinity reweight)](architecture/04_live-lane.md)
- [05 · the staged precompute pipeline](architecture/05_precompute-pipeline.md)
- [06 · model evaluation (negative control, FDR, semantic coherence)](architecture/06_model-evaluation.md)
- [07 · deploy (static-first: GitHub Pages / vps-static, no backend)](architecture/07_deploy.md)
- [08 · the two data contracts](architecture/08_data-contracts.md)

Binding decision: ADR-0057, the internal CAOS product-repo archetype (offline-pipeline-heavy, backend-optional,
deploying as a static deterministic-replay viewer). The ADRs are internal architecture decision records and are
not part of this public repo.
