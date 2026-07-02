"""Typed objects passed between pipeline stages — the inter-stage contract. Plain dataclasses (Pyodide-safe:
no third-party imports), so `model/` and `live.py` can run in the browser under Pyodide.

Domain: the Data Observatory catalog. A DATASET carries RESOURCES (downloadable files); a resource that is a
table yields a per-column PROFILE; cross-dataset relations are EDGES in the knowledge graph.
"""
from __future__ import annotations

from dataclasses import dataclass, field

# --- download-behaviour classes (from the catalog research; harvest.py assigns one per resource) ---
TIER_DIRECT = "A_gov_direct"      # Chilean-gov direct file (mirror in full)
TIER_NOURL = "B_no_url"           # sized but no file_uri (source-portal fetch, optional)
TIER_GEOSERVICE = "C_geoservice"  # WFS/OGC/metadata endpoint (API pull, not a file mirror)
TIER_DOI = "D_doi_archive"        # DOI landing page for a foreign archive (metadata only, do NOT mirror)
TIER_BROKEN = "X_broken"          # blob:/dead link, unrecoverable
TIERS = (TIER_DIRECT, TIER_NOURL, TIER_GEOSERVICE, TIER_DOI, TIER_BROKEN)


@dataclass(frozen=True)
class ResourceRef:
    """One downloadable (or referenced) file inside a dataset (a catalog `media_files[]` entry)."""
    dataset_id: str
    name: str
    url: str | None
    fmt: str                       # normalized short format token: csv|xlsx|zip|json|geojson|pdf|rar|html|...
    size_bytes: int | None         # from `sizes[]`, else summed `Collections[]`, else None
    tier: str                      # one of TIERS
    checksum: str = ""             # sha256 of the downloaded bytes (filled by harvest), else ""


@dataclass(frozen=True)
class DatasetRef:
    """A catalog dataset (one OpenSearch document)."""
    id: str                        # stable OpenSearch _id
    slug: str                      # url-safe slug derived from the title
    title: str
    org: str                       # publisher / roles
    origin: str                    # "Data Observatory" | "DataCite"
    theme: str                     # top-level OECD category (first)
    sub_category: str
    license: str
    description: str
    lat: float | None = None       # representative point if geo_locations present
    lon: float | None = None
    resources: list[ResourceRef] = field(default_factory=list)


@dataclass(frozen=True)
class ColumnProfile:
    """Per-column fingerprint (feature_extraction). Statistical + semantic + key-role signals."""
    dataset_id: str
    resource_name: str
    name: str                      # column header (as found)
    dtype: str                     # inferred: int|float|str|date|bool|geo
    n: int                         # non-null count
    null_frac: float
    n_unique: int
    unique_frac: float
    sample_values: list[str]       # a few example values (for the UI + semantic string)
    entity_role: str               # "" | comuna_cut | region | year | date | lat | lon | rut | ... (entities.py)
    num_min: float | None = None
    num_max: float | None = None
    num_mean: float | None = None
    num_std: float | None = None
    minhash: list[int] = field(default_factory=list)   # datasketch MinHash signature (for containment/joinability)


@dataclass(frozen=True)
class DatasetProfile:
    """Per-dataset fingerprint: the rolled-up column profiles + a semantic text + an embedding."""
    dataset_id: str
    n_rows: int
    n_cols: int
    columns: list[ColumnProfile]
    entity_keys: list[str]         # entity roles present (comuna_cut, year, ...) -> joinability candidates
    year_min: int | None
    year_max: int | None
    semantic_text: str             # title + description + column names (the string that gets embedded)
    embedding: list[float] = field(default_factory=list)  # EMBED_DIM MiniLM vector


@dataclass(frozen=True)
class Edge:
    """A relation in the knowledge graph (infer/relate stage)."""
    src: str                       # dataset_id (or "dataset_id::column")
    dst: str
    kind: str                      # JOINABLE_ON | CORRELATES | SEMANTICALLY_SIMILAR | SPATIALLY_OVERLAPS | SAME_SOURCE
    weight: float                  # normalized [0,1] strength
    evidence: dict                 # kind-specific: {key, containment} | {rho, p_adj, n, lag} | {cosine} | ...
