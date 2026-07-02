#!/usr/bin/env bash
# Create BOTH venvs + install per-lane requirements + the editable package, and materialize .env. Idempotent.
#   .venv-pipeline = heavy OFFLINE lane (requirements-precompute.txt) + dev + editable pkg   (local-only)
#   .venv          = runtime/live-thin lane (requirements.txt = numpy)                         (what ships)
# No global installs. Re-runnable.
set -euo pipefail
cd "$(dirname "$0")/.."
PY="${PYTHON:-python}"

mkvenv() { [ -d "$1" ] || "$PY" -m venv "$1"; }
venvpy() { local p="$1/bin/python"; [ -x "$p" ] || p="$1/Scripts/python.exe"; echo "$p"; }

# --- .env: prefer the vault copy if the caller points ATALAYA_ENV_SRC at it, else seed from the example ---
if [ ! -f .env ]; then
  if [ -n "${ATALAYA_ENV_SRC:-}" ] && [ -f "${ATALAYA_ENV_SRC}" ]; then
    cp "${ATALAYA_ENV_SRC}" .env; echo "[setup] .env materialized from the vault ($ATALAYA_ENV_SRC)"
  else
    cp .env.example .env; echo "[setup] .env seeded from .env.example (fill secrets from the vault to re-harvest)"
  fi
fi

echo "[setup] .venv-pipeline (offline SOTA lane)…"
mkvenv .venv-pipeline
VP="$(venvpy .venv-pipeline)"
"$VP" -m pip install --upgrade pip -q
"$VP" -m pip install -q -r requirements-precompute.txt -r requirements-dev.txt
"$VP" -m pip install -q -e .
echo "[setup] .venv-pipeline ready."

echo "[setup] .venv (runtime/live-thin lane)…"
mkvenv .venv
VR="$(venvpy .venv)"
"$VR" -m pip install --upgrade pip -q
"$VR" -m pip install -q -r requirements.txt
echo "[setup] .venv ready."

echo "[setup] done. Next:  ./scripts/precompute.sh   then   cd frontend && npm install && npm run dev"
