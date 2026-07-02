"""The measured lane gate (pure python). LIVE requires pure-python ∧ safe wheels ∧ within budgets; anything
outside flips to precompute with a recorded reason."""
from atalayalab.core.gate import classify_lane


def test_small_pure_python_is_live():
    v = classify_lane(pure_python=True, wheels=set(), run_ms=5.0, trace_bytes=1024)
    assert v["lane"] == "live" and not v["reasons"]


def test_native_dep_forces_precompute():
    v = classify_lane(pure_python=False, wheels={"numpy"}, run_ms=5.0, trace_bytes=1024)
    assert v["lane"] == "precompute" and any("pure-python" in r for r in v["reasons"])


def test_unsafe_wheel_forces_precompute():
    v = classify_lane(pure_python=True, wheels={"torch"}, run_ms=5.0, trace_bytes=1024)
    assert v["lane"] == "precompute" and any("Pyodide-safe" in r for r in v["reasons"])


def test_oversized_trace_forces_precompute():
    v = classify_lane(pure_python=True, wheels=set(), run_ms=5.0, trace_bytes=10_000_000)
    assert v["lane"] == "precompute"
