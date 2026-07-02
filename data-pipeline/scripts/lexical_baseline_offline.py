"""Offline computation of the CLASSICAL lexical baseline (TF-IDF) vs the SOTA embedding, from the committed
web artifacts (catalog.json + embeddings.json). Mirrors atalayalab.stages.evaluate.lexical_baseline so the
shipped metrics.json can be patched without a full pipeline re-bake. Same k, same nodes, same theme labels
as the embedding coherence -> an honest apples-to-apples "does SOTA beat lexical?" number.

Run: data-pipeline/.venv/Scripts/python.exe scripts/lexical_baseline_offline.py
"""
import json
from pathlib import Path

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

ROOT = Path(__file__).resolve().parents[1].parent  # repo root
PUB = ROOT / "frontend" / "public" / "data"
K = 5


def top_k_theme_match(sim_rows, order_fn, themes, k=K):
    """For each row, take its top-k neighbors (excluding self) and the fraction sharing the row's theme."""
    hits = tot = 0
    n = len(themes)
    for i in range(n):
        th = themes[i]
        if not th:
            continue
        top = order_fn(i)[:k]
        for j in top:
            tot += 1
            if themes[j] == th:
                hits += 1
    return round(hits / tot, 4) if tot else 0.0, tot


def main():
    emb = json.loads((PUB / "embeddings.json").read_text(encoding="utf-8"))
    cat = json.loads((PUB / "catalog.json").read_text(encoding="utf-8"))
    theme_of = {d["id"]: d.get("theme", "") for d in cat["datasets"]}
    text_of = {d["id"]: " ".join(str(d.get(f, "") or "") for f in ("title", "sub", "desc")) for d in cat["datasets"]}

    # align to the embedded set (all 1017), keep only those with a theme + some text
    rows = [d for d in emb["datasets"] if theme_of.get(d["id"]) and text_of.get(d["id"], "").strip()]
    ids = [d["id"] for d in rows]
    themes = [theme_of[i] for i in ids]
    texts = [text_of[i] for i in ids]
    V = np.asarray([d["v"] for d in rows], dtype=np.float32)
    n = len(ids)

    # --- embedding cosine (L2-normalize -> dot) ---
    Vn = V / (np.linalg.norm(V, axis=1, keepdims=True) + 1e-9)
    S_emb = Vn @ Vn.T
    np.fill_diagonal(S_emb, -1.0)
    emb_order = lambda i: np.argsort(-S_emb[i])
    emb_match, emb_tot = top_k_theme_match(S_emb, emb_order, themes)

    # --- TF-IDF lexical cosine ---
    tfidf = TfidfVectorizer(lowercase=True, strip_accents="unicode", min_df=2, max_df=0.6,
                            ngram_range=(1, 2), sublinear_tf=True)
    X = tfidf.fit_transform(texts)  # already L2-normalized rows
    S_lex = (X @ X.T).toarray()
    np.fill_diagonal(S_lex, -1.0)
    lex_order = lambda i: np.argsort(-S_lex[i])
    lex_match, lex_tot = top_k_theme_match(S_lex, lex_order, themes)

    # --- chance base-rate (theme purity if neighbors were random) ---
    from collections import Counter
    c = Counter(themes)
    base_rate = round(sum((v / n) ** 2 for v in c.values()), 4)

    out = {
        "schema": "atalaya.lexical_baseline/1",
        "k": K,
        "n_scored": n,
        "vocab_terms": int(len(tfidf.vocabulary_)),
        "lexical_neighbor_theme_match": lex_match,        # CLASSICAL: TF-IDF over title+sub+desc
        "embedding_neighbor_theme_match": emb_match,       # SOTA: MiniLM, same k / same nodes (parity recompute)
        "theme_base_rate": base_rate,                      # chance
        "sota_gain_over_lexical": round(emb_match - lex_match, 4),
        "note": "top-5 nearest-neighbour theme coherence, computed identically for both similarities over the same "
                "embedded set; SOTA MiniLM vs the classical TF-IDF lexical foil. Chance = sum(theme_share^2).",
    }
    print(json.dumps(out, ensure_ascii=False, indent=2))
    (Path(__file__).parent / "lexical_baseline_result.json").write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
