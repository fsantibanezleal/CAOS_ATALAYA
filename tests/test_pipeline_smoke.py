"""Heavy pipeline smoke on a SYNTHETIC fixture (importorskip: needs polars + sentence-transformers, i.e. the
precompute lane). Builds three tiny tables sharing a comuna key, runs preprocess -> profile -> train(no ONNX) ->
relate -> evaluate -> export, and asserts the artifacts + manifests are consistent (CONTRACT 2) and the negative
control is clean. Skipped automatically in the numpy-only CI lane."""
import json

import pytest

pytest.importorskip("polars")
pytest.importorskip("sentence_transformers")

import polars as pl  # noqa: E402

from atalayalab import registry  # noqa: E402
from atalayalab.cases.builders import CorpusContext  # noqa: E402
from atalayalab.io.schema import DatasetRef  # noqa: E402
from atalayalab.stages import evaluate, export, feature_extraction, infer, preprocess, train  # noqa: E402


def _make_raw(raw: str):
    import pathlib
    base = pathlib.Path(raw)
    # three comuna-keyed tables; A and B correlate, C is unrelated noise
    comunas = [13101 + i for i in range(12)]
    pov = [40 - i for i in range(12)]
    crime = [80 - 2 * i for i in range(12)]          # correlates with pov
    noise = [3, 9, 1, 7, 2, 8, 4, 6, 5, 0, 9, 1]     # unrelated
    (base / "poverty").mkdir(parents=True, exist_ok=True)
    (base / "crime").mkdir(parents=True, exist_ok=True)
    (base / "noise").mkdir(parents=True, exist_ok=True)
    pl.DataFrame({"cod_comuna": comunas, "poverty_rate": pov}).write_csv(base / "poverty" / "p.csv")
    pl.DataFrame({"cod_comuna": comunas, "crime_rate": crime}).write_csv(base / "crime" / "c.csv")
    pl.DataFrame({"cod_comuna": comunas, "noise_metric": noise}).write_csv(base / "noise" / "n.csv")


def test_full_pipeline_on_synthetic(tmp_path):
    raw = tmp_path / "raw"
    norm = tmp_path / "norm"
    _make_raw(str(raw))
    datasets = [
        DatasetRef("D_pov", "poverty", "Comuna poverty rate", "INE", "Data Observatory", "Social", "econ",
                   "cc-by-4.0", "poverty by comuna"),
        DatasetRef("D_crime", "crime", "Comuna crime rate", "Fiscalia", "Data Observatory", "Social", "safety",
                   "cc-by-4.0", "crime by comuna"),
        DatasetRef("D_noise", "noise", "Comuna noise metric", "Other", "Data Observatory", "Social", "misc",
                   "cc-by-4.0", "unrelated noise"),
    ]
    slug_to_id = {d.slug: d.id for d in datasets}
    normalized = preprocess.run(raw_dir=raw, norm_dir=norm, sample_rows=1000, slug_to_id=slug_to_id)
    assert len(normalized) == 3

    profiles = feature_extraction.run(datasets, normalized)
    assert len(profiles) == 3
    assert all("comuna_cut" in p.entity_keys for p in profiles)

    model = train.run(profiles, model_root=tmp_path / "models", export_onnx=False)
    assert model["n_datasets"] == 3

    db = infer.run(profiles, normalized, datasets, model, graph_path=tmp_path / "g.db")
    counts = db.counts()
    assert counts["nodes"] == 3
    # poverty~crime should be found; the alignment must be a real correlation edge
    corr = db.edges(kind="CORRELATES")
    assert any({e["src"], e["dst"]} == {"D_pov", "D_crime"} for e in corr)

    metrics = evaluate.run(db, profiles, normalized, datasets)
    assert metrics["negative_control"]["survivors"] == 0    # shuffled alignment finds nothing

    ctx = CorpusContext(datasets, profiles, normalized, db, model, {"by_tier": {}})
    entries = export.run(ctx, metrics, derived_dir=tmp_path / "derived")
    assert len(entries) == len(registry.list_cases())
    idx = json.loads((tmp_path / "derived" / "manifests" / "index.json").read_text(encoding="utf-8"))
    assert idx["n_cases"] == len(entries)
    # CONTRACT 2: every manifest points to a real artifact with the recorded byte size
    for e in entries:
        man = json.loads((tmp_path / "derived" / "manifests" / f"{e['case_id']}.json").read_text(encoding="utf-8"))
        art = tmp_path / "derived" / man["artifact"]["path"]
        assert art.exists() and art.stat().st_size == man["artifact"]["bytes"]
    db.close()
