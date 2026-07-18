"""LIVE lane entrypoint (Pyodide-safe: numpy only). Runs in the BROWSER, recomputing on user interaction without
any server. Two live interactions the App exposes:

  - recompute_affinity(pairs, weights): re-rank dataset pairs with the NOVEL calibrated multi-evidence affinity
    when the user moves the semantic / join / correlation weight sliders. Uses the same model.affinity code the
    offline `infer` stage used, so the live number matches the baked one at the default weights (parity).
  - rank_semantic(query_vec, ids, embeddings): cosine-rank datasets against a query vector. The query vector is
    produced in-browser by onnxruntime-web running the exported MiniLM encoder, so full semantic search is live +
    offline-capable; this function is the pure-Python scorer Pyodide calls with that vector.

The gate (core/gate.py) records these as LIVE because they are pure-Python, numpy-only, sub-millisecond and tiny.
"""
from __future__ import annotations

from .model import affinity, embed


def recompute_affinity(pairs: list[dict], weights: list[float], nulls: dict | None = None,
                       limit: int = 200) -> list[dict]:
    """pairs: [{a_id,b_id,f_sem,f_join,f_stat}] already-calibrated evidences; weights: [w_sem,w_join,w_stat].
    Returns the pairs re-scored + sorted, so the browser reflects the user's evidence weighting instantly. The
    payload already stores CALIBRATED f_* percentiles from the offline null models, so no null CDF is reapplied
    here (that would double-calibrate); `nulls` is accepted for API symmetry with the offline stage."""
    _ = nulls
    w_sem, w_join, w_stat = (list(weights) + [0, 0, 0])[:3]
    out = []
    for p in pairs:
        # the offline payload already stores CALIBRATED f_* (percentiles); pass them straight through by using
        # identity nulls unless raw signals + nulls are supplied.
        res = affinity.affinity(
            sem_cos=p.get("f_sem", 0.0), join_containment=p.get("f_join", 0.0), stat_strength=p.get("f_stat", 0.0),
            null_sem=None, null_join=None, null_stat=None,
            w_sem=w_sem, w_join=w_join, w_stat=w_stat)
        out.append({**p, "score": res["score"], "w_sem": res["w_sem"], "w_join": res["w_join"],
                    "w_stat": res["w_stat"]})
    out.sort(key=lambda r: -r["score"])
    return out[:limit]


def rank_semantic(query_vec: list[float], ids: list[str], embeddings: list[list[float]],
                  top_k: int = 25) -> list[dict]:
    """Cosine-rank datasets against a query embedding (produced live by onnxruntime-web). Pure numpy."""
    scored = [{"id": i, "score": round(embed.cosine(query_vec, e), 4)} for i, e in zip(ids, embeddings)]
    scored.sort(key=lambda r: -r["score"])
    return scored[:top_k]
