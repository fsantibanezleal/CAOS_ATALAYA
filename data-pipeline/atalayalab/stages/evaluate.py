"""Stage 5 — evaluate (the TEST stage): validate the relation graph + the ladder with leakage-safe, adversarial
checks. The honest question is not "did we find links" but "are the links stronger than a null world".

Metrics:
  - NEGATIVE CONTROL (the key one): re-mine correlations on shuffled key alignments; report how many survive the
    same permutation-null + FDR. A trustworthy pipeline yields ~0 survivors on shuffled data (an empirical false
    discovery rate). If the control leaks, the correlation edges are not to be believed.
  - Semantic neighbor coherence: fraction of each dataset's top-k semantic neighbors sharing its theme (a proxy
    for embedding quality; higher is better, chance = theme base-rate).
  - Lexical baseline (the classical foil): the SAME top-k neighbor-theme coherence computed over a TF-IDF lexical
    similarity of the same text, so the SOTA embedding is honestly measured against a classical baseline (both far
    above chance; the embedding wins by a modest, reported margin).
  - Joinability sanity: fraction of JOINABLE_ON edges whose two datasets share a declared entity key (should be 1.0
    by construction; a drop signals a bug).
  - Graph coverage: node/edge counts by kind, isolated-node fraction.
"""
from __future__ import annotations

from collections import Counter

import numpy as np

from ..core.graphdb import GraphDB
from ..io.schema import DatasetProfile
from ..model import stats
from .infer import (CORR_FDR_Q, CORR_MIN_ABS_RHO, CORR_MIN_OVERLAP, JOIN_KEYS,
                    _indicator_series)


def _negative_control(profiles, normalized, *, seed: int, log=print) -> dict:
    """Shuffle the key labels of each indicator series, then re-run the exact correlation test family. Survivors
    estimate the empirical false-discovery rate under the null (should be near 0)."""
    from collections import defaultdict
    rng = np.random.default_rng(seed + 7)
    nr_paths_by_ds = defaultdict(list)
    for nr in normalized:
        nr_paths_by_ds[nr.dataset_id].append((nr.parquet_path, nr.report.n_rows))

    cand = []
    for key_role in JOIN_KEYS:
        holders = [p for p in profiles if key_role in p.entity_keys]
        series_by_ds = {p.dataset_id: _indicator_series(nr_paths_by_ds, p.dataset_id, key_role) for p in holders}
        ids = list(series_by_ds)
        for a in range(len(ids)):
            for b in range(a + 1, len(ids)):
                for _, sa in series_by_ds[ids[a]]:
                    for _, sb in series_by_ds[ids[b]]:
                        shared = sorted(set(sa) & set(sb))
                        if len(shared) < CORR_MIN_OVERLAP:
                            continue
                        xa = [sa[k] for k in shared]
                        xb = [sb[k] for k in shared]
                        perm = list(range(len(xb)))
                        rng.shuffle(perm)                 # break the alignment -> the null world
                        xb = [xb[i] for i in perm]
                        rho = stats.spearman(xa, xb)
                        if abs(rho) >= CORR_MIN_ABS_RHO:
                            cand.append((xa, xb, rho))
    if not cand:
        return {"candidates": 0, "survivors": 0, "empirical_fdr": 0.0}
    pvals = [stats.permutation_pvalue(xa, xb, rho, n_perm=500, seed=seed) for xa, xb, rho in cand]
    keep = stats.bh_fdr(pvals, q=CORR_FDR_Q)
    survivors = sum(keep)
    log(f"[evaluate] negative control: {survivors}/{len(cand)} shuffled correlations survive FDR")
    return {"candidates": len(cand), "survivors": survivors,
            "empirical_fdr": round(survivors / len(cand), 4) if cand else 0.0}


def _semantic_coherence(db: GraphDB, by_theme, k: int = 5) -> dict:
    edges = db.edges(kind="SEMANTICALLY_SIMILAR")
    nbrs = {}
    for e in edges:
        nbrs.setdefault(e["src"], []).append((e["dst"], e["weight"]))
        nbrs.setdefault(e["dst"], []).append((e["src"], e["weight"]))
    hits = tot = 0
    for node, lst in nbrs.items():
        theme = by_theme.get(node, "")
        top = [n for n, _ in sorted(lst, key=lambda x: -x[1])[:k]]
        for n in top:
            tot += 1
            if by_theme.get(n, "") == theme and theme:
                hits += 1
    return {"neighbor_theme_match": round(hits / tot, 4) if tot else 0.0, "n_scored": tot}


def lexical_baseline(profiles: list[DatasetProfile], by_theme, k: int = 5) -> dict:
    """CLASSICAL lexical foil of the model ladder: a TF-IDF vectorizer over the same semantic text the SOTA
    encoder embeds, scored with the SAME top-k neighbor-theme-coherence as the embedding. An honest, leakage-free
    "does the SOTA embedding beat a classical lexical baseline at finding thematically related datasets?" number.
    Both similarities run over the identical set of datasets, so the gap is apples-to-apples; chance = sum(share^2)."""
    from collections import Counter
    from sklearn.feature_extraction.text import TfidfVectorizer

    rows = [p for p in profiles if p.embedding and p.semantic_text and by_theme.get(p.dataset_id)]
    if len(rows) < k + 2:
        return {"k": k, "n_scored": len(rows), "note": "too few datasets to score"}
    themes = [by_theme[p.dataset_id] for p in rows]

    def topk_theme_match(sim: np.ndarray) -> float:
        np.fill_diagonal(sim, -1.0)
        hits = tot = 0
        for i in range(len(themes)):
            if not themes[i]:
                continue
            for j in np.argsort(-sim[i])[:k]:
                tot += 1
                if themes[j] == themes[i]:
                    hits += 1
        return round(hits / tot, 4) if tot else 0.0

    # SOTA: MiniLM embedding cosine
    V = np.asarray([p.embedding for p in rows], dtype=np.float64)
    Vn = V / (np.linalg.norm(V, axis=1, keepdims=True) + 1e-9)
    emb_match = topk_theme_match(Vn @ Vn.T)

    # CLASSICAL: TF-IDF lexical cosine over the same text
    tfidf = TfidfVectorizer(lowercase=True, strip_accents="unicode", min_df=2, max_df=0.6,
                            ngram_range=(1, 2), sublinear_tf=True)
    X = tfidf.fit_transform([p.semantic_text for p in rows])   # rows are L2-normalized
    lex_match = topk_theme_match((X @ X.T).toarray())

    n = len(rows)
    base_rate = round(sum((v / n) ** 2 for v in Counter(themes).values()), 4)
    return {
        "k": k, "n_scored": n, "vocab_terms": int(len(tfidf.vocabulary_)),
        "lexical_neighbor_theme_match": lex_match,
        "embedding_neighbor_theme_match": emb_match,
        "theme_base_rate": base_rate,
        "sota_gain_over_lexical": round(emb_match - lex_match, 4),
    }


def _joinability_sanity(db: GraphDB, keys_by_node) -> dict:
    edges = db.edges(kind="JOINABLE_ON")
    ok = sum(1 for e in edges if set(keys_by_node.get(e["src"], [])) & set(keys_by_node.get(e["dst"], [])))
    return {"joinable_edges": len(edges), "share_declared_key_frac": round(ok / len(edges), 4) if edges else 0.0}


def run(db: GraphDB, profiles: list[DatasetProfile], normalized: list, datasets: list, *,
        seed: int = 42, log=print) -> dict:
    by_theme = {p.dataset_id: (next((d.theme for d in datasets if d.id == p.dataset_id), "")) for p in profiles}
    keys_by_node = {p.dataset_id: p.entity_keys for p in profiles}
    counts = db.counts()
    edge_kinds = counts.get("by_edge_kind", {})
    n_nodes = counts.get("nodes", 0)
    connected = set()
    for e in db.edges():
        connected.add(e["src"])
        connected.add(e["dst"])
    metrics = {
        "graph": counts,
        "isolated_node_frac": round(1 - len(connected) / n_nodes, 4) if n_nodes else 0.0,
        "negative_control": _negative_control(profiles, normalized, seed=seed, log=log),
        "semantic_coherence": _semantic_coherence(db, by_theme),
        "lexical_baseline": lexical_baseline(profiles, by_theme),
        "joinability_sanity": _joinability_sanity(db, keys_by_node),
        "theme_distribution": dict(Counter(by_theme.values()).most_common(8)),
    }
    log(f"[evaluate] {n_nodes} nodes, {sum(edge_kinds.values())} edges, "
        f"neg-control FDR={metrics['negative_control']['empirical_fdr']}, "
        f"sem-coherence={metrics['semantic_coherence']['neighbor_theme_match']}")
    return metrics
