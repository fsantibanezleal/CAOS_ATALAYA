"""Central paths + tunables for Atalaya. Heavy data + models live OUTSIDE git (E:\\_Datos, E:\\_Models); only the
compact derived artifacts + manifests are committed. Everything is overridable by environment variable so the
pipeline is portable (a fresh clone sets ATALAYA_DATA_ROOT / ATALAYA_MODEL_ROOT and runs)."""
from __future__ import annotations

import os
from pathlib import Path

# data-pipeline/atalayalab/config.py -> parents[2] = repo root (works under `pip install -e .` too).
REPO_ROOT = Path(__file__).resolve().parents[2]

# --- committed (in-repo) locations: the compact processing->web artifacts + manifests ---
DATA_DIR = REPO_ROOT / "data"
DERIVED_DIR = DATA_DIR / "derived"          # compact committed artifacts (per case) + graph.json
MANIFESTS_DIR = DERIVED_DIR / "manifests"   # Contract-2 manifests (one per case + index.json)
EXAMPLES_DIR = DATA_DIR / "examples"        # tiny committed sample inputs (bring-your-own-data demo)


def _env_path(var: str, default: str) -> Path:
    return Path(os.environ.get(var, default)).expanduser()


# --- OUT-OF-GIT scratch (heavy) — default to the E: volume, override per machine ---
DATA_ROOT = _env_path("ATALAYA_DATA_ROOT", r"E:\_Datos\atalaya")
MODEL_ROOT = _env_path("ATALAYA_MODEL_ROOT", r"E:\_Models\atalaya")

RAW_DIR = DATA_ROOT / "raw"                 # mirrored source files, one folder per dataset
NORM_DIR = DATA_ROOT / "derived"            # normalized parquet per resource (heavy, out-of-git)
CATALOG_DIR = DATA_ROOT / "catalog"         # cached OpenSearch pages + the built inventory + graph.db
GRAPH_DB = CATALOG_DIR / "graph.db"         # SQLite-WAL knowledge graph (out-of-git; a decimated JSON is committed)

# --- the Data Observatory catalog backend (verified 2026-07-01; see docs/frameworks/opensearch-catalog/) ---
DO_API_BASE = os.environ.get("ATALAYA_DO_API_BASE", "https://d2i4qx9nxxjzd9.cloudfront.net/prod-v3")
DO_API_USER = os.environ.get("ATALAYA_DO_API_USER", "front-reader")
DO_API_PASS = os.environ.get("ATALAYA_DO_API_PASS", "")   # materialized from the vault by scripts/setup.*

# --- harvest budget guardrails ---
DISK_CAP_GB = float(os.environ.get("ATALAYA_DISK_CAP_GB", "400"))       # hard cap on the raw mirror
MONSTER_GB = float(os.environ.get("ATALAYA_MONSTER_GB", "50"))          # a single resource above this is subset, not mirrored
MAX_CONCURRENCY_PER_HOST = int(os.environ.get("ATALAYA_MAX_CONCURRENCY_PER_HOST", "3"))

# --- determinism ---
DEFAULT_SEED = 42

# --- the local multilingual embedder (fully offline; exported to ONNX for the browser live lane) ---
EMBED_MODEL = os.environ.get("ATALAYA_EMBED_MODEL", "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
EMBED_DIM = 384


def ensure_scratch_dirs() -> None:
    """Create the out-of-git scratch tree (idempotent). Never touches git-tracked dirs."""
    for d in (RAW_DIR, NORM_DIR, CATALOG_DIR, MODEL_ROOT):
        d.mkdir(parents=True, exist_ok=True)
