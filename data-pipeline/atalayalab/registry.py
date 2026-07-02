"""The case registry — analytical cases grouped by CATEGORY. Each case is a genuine analytical VIEW over the real
harvested catalog + mined knowledge graph (never a meta-tab): a cartographic map, a joinability subgraph, a
correlation-finding table, a geographic/temporal coverage view, a data-quality census, or the novel affinity
ranking. The App shows ONE selected case; Experiments/Benchmark show cross-case summaries by category.

A case carries the render family the web switches on, bilingual titles + context prose, and a VARIANT family (a
real parametric knob: color-by, key, threshold) so the App variant bar is honest and data-driven, not padded.
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Variant:
    id: str
    label_en: str
    label_es: str
    params: dict = field(default_factory=dict)


@dataclass(frozen=True)
class Case:
    id: str
    category: str
    render_kind: str            # map | graph | findings | coverage | timeline | quality | affinity | overview
    title_en: str
    title_es: str
    builder: str                # function name in cases.builders
    variants: list[Variant]


def _v(*items) -> list[Variant]:
    return [Variant(*i) for i in items]


CASES: list[Case] = [
    # --- CARTOGRAPHY -------------------------------------------------------------------------------------------
    Case("CART_map", "cartography", "map", "Catalog map", "Mapa del catálogo", "build_cartography",
         _v(("theme", "Colour by theme", "Color por tema", {"color": "theme"}),
            ("origin", "Colour by origin", "Color por origen", {"color": "origin"}),
            ("cluster", "Colour by cluster", "Color por clúster", {"color": "cluster"}),
            ("keys", "Colour by join keys", "Color por claves", {"color": "keys"}),
            ("year", "Colour by recency", "Color por año", {"color": "year"}),
            ("quality", "Colour by null rate", "Color por nulos", {"color": "quality"}))),
    Case("CAT_overview", "cartography", "overview", "Catalog composition", "Composición del catálogo",
         "build_overview",
         _v(("theme", "By theme", "Por tema", {"facet": "theme"}),
            ("origin", "By origin", "Por origen", {"facet": "origin"}),
            ("license", "By license", "Por licencia", {"facet": "license"}),
            ("format", "By format", "Por formato", {"facet": "format"}),
            ("tier", "By download tier", "Por tier de descarga", {"facet": "tier"}),
            ("size", "By size on disk", "Por tamaño", {"facet": "size"}))),
    # --- SEMANTIC ----------------------------------------------------------------------------------------------
    Case("SEM_network", "semantic", "graph", "Semantic similarity network", "Red de similitud semántica",
         "build_semantic",
         _v(("t45", "cos ≥ 0.45", "cos ≥ 0.45", {"min_cos": 0.45}),
            ("t55", "cos ≥ 0.55", "cos ≥ 0.55", {"min_cos": 0.55}),
            ("t65", "cos ≥ 0.65", "cos ≥ 0.65", {"min_cos": 0.65}),
            ("t75", "cos ≥ 0.75", "cos ≥ 0.75", {"min_cos": 0.75}),
            ("t85", "cos ≥ 0.85", "cos ≥ 0.85", {"min_cos": 0.85}),
            ("t92", "cos ≥ 0.92", "cos ≥ 0.92", {"min_cos": 0.92}))),
    # --- JOINABILITY -------------------------------------------------------------------------------------------
    Case("JOIN_comuna", "joinability", "graph", "Comuna-joinable datasets", "Datasets unibles por comuna",
         "build_joinability",
         _v(("c50", "containment ≥ 0.5", "contención ≥ 0.5", {"key": "comuna_cut", "min_c": 0.5}),
            ("c60", "containment ≥ 0.6", "contención ≥ 0.6", {"key": "comuna_cut", "min_c": 0.6}),
            ("c70", "containment ≥ 0.7", "contención ≥ 0.7", {"key": "comuna_cut", "min_c": 0.7}),
            ("c80", "containment ≥ 0.8", "contención ≥ 0.8", {"key": "comuna_cut", "min_c": 0.8}),
            ("c90", "containment ≥ 0.9", "contención ≥ 0.9", {"key": "comuna_cut", "min_c": 0.9}),
            ("c95", "containment ≥ 0.95", "contención ≥ 0.95", {"key": "comuna_cut", "min_c": 0.95}))),
    Case("JOIN_region", "joinability", "graph", "Region-joinable datasets", "Datasets unibles por región",
         "build_joinability",
         _v(("c50", "containment ≥ 0.5", "contención ≥ 0.5", {"key": "region", "min_c": 0.5}),
            ("c60", "containment ≥ 0.6", "contención ≥ 0.6", {"key": "region", "min_c": 0.6}),
            ("c70", "containment ≥ 0.7", "contención ≥ 0.7", {"key": "region", "min_c": 0.7}),
            ("c80", "containment ≥ 0.8", "contención ≥ 0.8", {"key": "region", "min_c": 0.8}),
            ("c90", "containment ≥ 0.9", "contención ≥ 0.9", {"key": "region", "min_c": 0.9}),
            ("c95", "containment ≥ 0.95", "contención ≥ 0.95", {"key": "region", "min_c": 0.95}))),
    # --- CORRELATION -------------------------------------------------------------------------------------------
    Case("CORR_findings", "correlation", "findings", "Cross-dataset correlations", "Correlaciones entre datasets",
         "build_correlations",
         _v(("r35", "|rho| >= 0.35", "|rho| >= 0.35", {"min_rho": 0.35}),
            ("r50", "|rho| >= 0.50", "|rho| >= 0.50", {"min_rho": 0.50}),
            ("r65", "|rho| >= 0.65", "|rho| >= 0.65", {"min_rho": 0.65}),
            ("r80", "|rho| >= 0.80", "|rho| >= 0.80", {"min_rho": 0.80}),
            ("pos", "positive only", "solo positivas", {"sign": "pos"}),
            ("neg", "negative only", "solo negativas", {"sign": "neg"}))),
    Case("CORR_network", "correlation", "graph", "Correlation network", "Red de correlaciones",
         "build_corr_network",
         _v(("r35", "|rho| >= 0.35", "|rho| >= 0.35", {"min_rho": 0.35}),
            ("r50", "|rho| >= 0.50", "|rho| >= 0.50", {"min_rho": 0.50}),
            ("r65", "|rho| >= 0.65", "|rho| >= 0.65", {"min_rho": 0.65}),
            ("comuna", "comuna-keyed", "clave comuna", {"key": "comuna_cut"}),
            ("region", "region-keyed", "clave region", {"key": "region"}),
            ("r80", "|rho| >= 0.80", "|rho| >= 0.80", {"min_rho": 0.80}))),
    # --- GEOGRAPHIC --------------------------------------------------------------------------------------------
    Case("GEO_coverage", "geographic", "coverage", "Geographic coverage", "Cobertura geográfica",
         "build_geographic",
         _v(("comuna", "Comuna-keyed", "Clave comuna", {"level": "comuna_cut"}),
            ("region", "Region-keyed", "Clave región", {"level": "region"}),
            ("points", "Point-located", "Con coordenadas", {"level": "points"}),
            ("any", "Any geo key", "Cualquier clave", {"level": "any"}),
            ("count", "Dataset count", "N.º de datasets", {"metric": "count"}),
            ("themes", "Theme mix", "Mezcla de temas", {"metric": "themes"}))),
    # --- TEMPORAL ----------------------------------------------------------------------------------------------
    Case("TIME_coverage", "temporal", "timeline", "Temporal coverage", "Cobertura temporal",
         "build_temporal",
         _v(("all", "All datasets", "Todos", {"scope": "all"}),
            ("comuna", "Comuna-keyed", "Clave comuna", {"scope": "comuna_cut"}),
            ("region", "Region-keyed", "Clave región", {"scope": "region"}),
            ("recent", "Since 2015", "Desde 2015", {"since": 2015}),
            ("decade", "Since 2010", "Desde 2010", {"since": 2010}),
            ("span", "By span length", "Por extensión", {"sort": "span"}))),
    # --- QUALITY -----------------------------------------------------------------------------------------------
    Case("QC_census", "quality", "quality", "Data-quality census", "Censo de calidad de datos",
         "build_quality",
         _v(("nulls", "Null fraction", "Fracción de nulos", {"metric": "null"}),
            ("wide", "Wide tables", "Tablas anchas", {"metric": "wide"}),
            ("flags", "Contract flags", "Flags de contrato", {"metric": "flags"}),
            ("dtypes", "Type mix", "Mezcla de tipos", {"metric": "dtypes"}),
            ("keys", "Key coverage", "Cobertura de claves", {"metric": "keys"}),
            ("card", "Cardinality", "Cardinalidad", {"metric": "card"}))),
    # --- AFFINITY (the novel proposal) -------------------------------------------------------------------------
    Case("AFF_top", "affinity", "affinity", "Multi-evidence affinity", "Afinidad multi-evidencia",
         "build_affinity",
         _v(("bal", "Balanced weights", "Pesos balanceados", {"w": [0.34, 0.40, 0.26]}),
            ("sem", "Semantic-led", "Sesgo semántico", {"w": [0.6, 0.25, 0.15]}),
            ("join", "Join-led", "Sesgo unión", {"w": [0.2, 0.65, 0.15]}),
            ("stat", "Correlation-led", "Sesgo correlación", {"w": [0.2, 0.3, 0.5]}),
            ("top", "Top 200 pairs", "Top 200 pares", {"limit": 200}),
            ("strong", "score >= 0.6", "score >= 0.6", {"min_score": 0.6}))),
]

_BY_ID = {c.id: c for c in CASES}


def list_cases() -> list[Case]:
    return list(CASES)


def get_case(case_id: str) -> Case:
    if case_id not in _BY_ID:
        raise KeyError(f"unknown case: {case_id!r}. known: {sorted(_BY_ID)}")
    return _BY_ID[case_id]


def list_categories() -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    for c in CASES:
        out.setdefault(c.category, []).append(c.id)
    return out
