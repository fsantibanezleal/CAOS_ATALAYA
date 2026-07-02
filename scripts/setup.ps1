# Create BOTH venvs + install per-lane requirements + the editable package, and materialize .env. Idempotent.
# .ps1 parity of setup.sh (Felipe runs PowerShell on Windows). No global installs.
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
$py = if ($env:PYTHON) { $env:PYTHON } else { "python" }

function Get-VenvPy($dir) {
  $p = Join-Path $dir "Scripts\python.exe"
  if (-not (Test-Path $p)) { $p = Join-Path $dir "bin/python" }
  return $p
}

# --- .env: prefer the vault copy if ATALAYA_ENV_SRC points at it, else seed from the example ---
if (-not (Test-Path ".env")) {
  if ($env:ATALAYA_ENV_SRC -and (Test-Path $env:ATALAYA_ENV_SRC)) {
    Copy-Item $env:ATALAYA_ENV_SRC ".env"; Write-Host "[setup] .env materialized from the vault"
  } else {
    Copy-Item ".env.example" ".env"; Write-Host "[setup] .env seeded from .env.example (fill secrets to re-harvest)"
  }
}

Write-Host "[setup] .venv-pipeline (offline SOTA lane)..."
if (-not (Test-Path ".venv-pipeline")) { & $py -m venv .venv-pipeline }
$vp = Get-VenvPy ".venv-pipeline"
& $vp -m pip install --upgrade pip -q
& $vp -m pip install -q -r requirements-precompute.txt -r requirements-dev.txt
& $vp -m pip install -q -e .
Write-Host "[setup] .venv-pipeline ready."

Write-Host "[setup] .venv (runtime/live-thin lane)..."
if (-not (Test-Path ".venv")) { & $py -m venv .venv }
$vr = Get-VenvPy ".venv"
& $vr -m pip install --upgrade pip -q
& $vr -m pip install -q -r requirements.txt
Write-Host "[setup] .venv ready."

Write-Host "[setup] done. Next:  ./scripts/precompute.ps1   then   cd frontend; npm install; npm run dev"
