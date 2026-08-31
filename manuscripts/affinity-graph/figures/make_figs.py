#!/usr/bin/env python3
"""Regenerate the data figures for the Atalaya affinity-graph manuscript, deterministically, from the
COMMITTED derived artifacts (no network, no recompute). Two figures:

  fig-evidence.pdf    - edge-kind composition as an evidence-strength hierarchy (from metrics.json).
  fig-validation.pdf  - the empirical false-discovery gate (real vs shuffled) + the honest SOTA-vs-classical
                        neighbor-theme coherence bars (from metrics.json).

The hand-authored fig-affinity.svg (the method schematic) is converted to PDF separately via svglib.

Run:  python make_figs.py            (writes *.pdf next to this file)
Deps: matplotlib, svglib, reportlab  (isolated venv; see the campaign tooling notes).
"""
from __future__ import annotations

import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Patch

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]                       # repo root: manuscripts/affinity-graph/figures -> repo
DERIVED = ROOT / "data" / "derived"

# a calm, print-safe palette (colour-blind-aware, no reliance on hue alone)
INK = "#1a1a2e"
HARD = "#1b6ca8"     # hard structural evidence
MED = "#3fa34d"      # medium evidence
SOFT = "#c7c7c7"     # soft prior
FUSE = "#e07a3f"     # the fused affinity
GRID = "#d8d8e0"

plt.rcParams.update({
    "font.family": "serif", "font.size": 9.4, "axes.edgecolor": INK,
    "axes.labelcolor": INK, "text.color": INK, "xtick.color": INK, "ytick.color": INK,
    "axes.linewidth": 0.8, "figure.dpi": 200,
})


def _load(name: str) -> dict:
    return json.loads((DERIVED / name).read_text(encoding="utf-8"))


def fig_evidence(metrics: dict) -> None:
    """Edge-kind composition, grouped and coloured by evidence strength. The narrative figure of the honest
    hierarchy: a few hard structural links (joins, FDR-passing correlations), more medium semantic/spatial
    evidence, a large cheap same-source prior, and the fused affinity summary."""
    by = metrics["graph"]["by_edge_kind"]
    # (label, count, tier, colour) ordered by the evidence-strength story
    rows = [
        ("JOINABLE_ON\n(MinHash containment)", by["JOINABLE_ON"], "hard", HARD),
        ("CORRELATES\n(Spearman+perm+FDR)", by["CORRELATES"], "hard", HARD),
        ("SPATIALLY_OVERLAPS", by["SPATIALLY_OVERLAPS"], "medium", MED),
        ("SEMANTICALLY_SIMILAR\n(MiniLM cosine)", by["SEMANTICALLY_SIMILAR"], "medium", MED),
        ("SAME_SOURCE\n(publisher prior)", by["SAME_SOURCE"], "soft", SOFT),
        ("AFFINITY\n(fused, null-calibrated)", by["AFFINITY"], "fused", FUSE),
    ]
    fig, ax = plt.subplots(figsize=(6.9, 2.9))
    ys = range(len(rows))
    ax.barh(list(ys), [r[1] for r in rows], color=[r[3] for r in rows],
            edgecolor=INK, linewidth=0.6, height=0.66, zorder=3)
    for y, r in zip(ys, rows):
        ax.text(r[1] + 90, y, f"{r[1]:,}", va="center", ha="left", fontsize=8.8, fontweight="bold")
    ax.set_yticks(list(ys))
    ax.set_yticklabels([r[0] for r in rows], fontsize=8.1)
    ax.invert_yaxis()
    ax.set_xlim(0, max(r[1] for r in rows) * 1.16)
    ax.set_xlabel("number of edges (total 14,413 over 1,017 datasets)")
    ax.grid(axis="x", color=GRID, linewidth=0.7, zorder=0)
    ax.set_axisbelow(True)
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    legend = [Patch(facecolor=HARD, edgecolor=INK, label="hard structural"),
              Patch(facecolor=MED, edgecolor=INK, label="medium"),
              Patch(facecolor=SOFT, edgecolor=INK, label="soft prior"),
              Patch(facecolor=FUSE, edgecolor=INK, label="fused affinity")]
    ax.legend(handles=legend, loc="upper right", bbox_to_anchor=(1.0, 0.98), fontsize=7.6,
              frameon=True, facecolor="white", edgecolor=GRID, ncol=2)
    fig.tight_layout()
    fig.savefig(HERE / "fig-evidence.pdf", bbox_inches="tight")
    plt.close(fig)


def fig_validation(metrics: dict) -> None:
    """Two adversarial-validation panels side by side.
    (a) the empirical FDR gate: real correlations that pass vs shuffled-alignment survivors (should be ~0).
    (b) the honest SOTA-vs-classical: MiniLM embedding vs TF-IDF lexical neighbor-theme coherence, above chance.
    """
    nc = metrics["negative_control"]
    lx = metrics["lexical_baseline"]
    real_pass = metrics["graph"]["by_edge_kind"]["CORRELATES"]     # 24 that survive on REAL data
    fig, (axa, axb) = plt.subplots(1, 2, figsize=(6.9, 2.9), gridspec_kw={"width_ratios": [1, 1.05]})

    # (a) the gate
    labels = ["real data\n(FDR-passing)", f"shuffled null\n({nc['candidates']} candidates)"]
    vals = [real_pass, nc["survivors"]]
    bars = axa.bar(labels, vals, color=[HARD, "#b23a48"], edgecolor=INK, linewidth=0.7, width=0.62, zorder=3)
    for b, v in zip(bars, vals):
        axa.text(b.get_x() + b.get_width() / 2, v + 0.4, str(v), ha="center", va="bottom",
                 fontsize=10, fontweight="bold")
    axa.set_ylim(0, max(real_pass, 1) * 1.32)
    axa.set_ylabel("correlation edges surviving\npermutation-null + BH-FDR")
    axa.set_title(f"(a) false-discovery gate\nempirical FDR = {nc['empirical_fdr']:.2f}", fontsize=8.8)
    axa.grid(axis="y", color=GRID, linewidth=0.7, zorder=0)
    axa.set_axisbelow(True)
    for s in ("top", "right"):
        axa.spines[s].set_visible(False)

    # (b) SOTA vs classical
    names = ["MiniLM\nembedding", "TF-IDF\nlexical", "chance\n(theme base rate)"]
    v = [lx["embedding_neighbor_theme_match"], lx["lexical_neighbor_theme_match"], lx["theme_base_rate"]]
    cols = [FUSE, MED, SOFT]
    bars = axb.bar(names, v, color=cols, edgecolor=INK, linewidth=0.7, width=0.64, zorder=3)
    for b, x in zip(bars, v):
        axb.text(b.get_x() + b.get_width() / 2, x + 0.012, f"{x:.3f}", ha="center", va="bottom",
                 fontsize=8.8, fontweight="bold")
    axb.set_ylim(0, 1.06)
    axb.set_ylabel("top-5 neighbor-theme coherence")
    gain = lx["sota_gain_over_lexical"]
    axb.set_title(f"(b) SOTA vs classical\nembedding gain = +{gain:.3f} (honest)", fontsize=8.8)
    axb.grid(axis="y", color=GRID, linewidth=0.7, zorder=0)
    axb.set_axisbelow(True)
    for s in ("top", "right"):
        axb.spines[s].set_visible(False)

    fig.tight_layout()
    fig.savefig(HERE / "fig-validation.pdf", bbox_inches="tight")
    plt.close(fig)


def main() -> None:
    metrics = _load("metrics.json")
    fig_evidence(metrics)
    fig_validation(metrics)
    print("wrote fig-evidence.pdf, fig-validation.pdf from", DERIVED)


if __name__ == "__main__":
    main()
