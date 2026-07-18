"""STAGE 0 (domain) — harvest: enumerate the Data Observatory catalog, build the inventory, and size-gate the
download of the mirrorable subset into the out-of-git scratch (E:\\_Datos\\atalaya\\raw).

Design (see docs/frameworks/opensearch-catalog/ and docs/data-contract.md):
  1. Enumerate all ~1017 documents via the OpenSearch client; cache the raw pages to CATALOG_DIR (polite, resumable).
  2. Parse + classify every resource into a download tier; write a typed inventory.json + a size report.
  3. Download only tier-A (Chilean-gov direct file) resources, HEAD-sizing first, honoring the disk cap and the
     per-resource monster cap; resume partial files; retry with backoff; checksum; never mirror DOI/geoservice.

Deterministic + idempotent: re-running skips already-cached pages and already-complete downloads (by size+sha).
This stage is OFFLINE-only (heavy, network); never imported by the live lane.
"""
from __future__ import annotations

import hashlib
import json
import time
from dataclasses import asdict
from pathlib import Path

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from .. import config
from ..catalog.client import CatalogClient
from ..catalog.inventory import parse_document
from ..io.schema import DatasetRef, TIER_DIRECT

_GB = 1024 ** 3
_UA = "atalaya-harvester/0.1 (+research; polite; contact via github.com/fsantibanezleal)"


# ---------------------------------------------------------------- enumerate + inventory ----------------------------

def enumerate_catalog(cache_dir: Path | None = None, force: bool = False) -> list[dict]:
    """Fetch every catalog document, caching the full result to disk. Returns the raw hits."""
    cache_dir = cache_dir or config.CATALOG_DIR
    cache_dir.mkdir(parents=True, exist_ok=True)
    cache = cache_dir / "documents.json"
    if cache.exists() and not force:
        return json.loads(cache.read_text(encoding="utf-8"))
    with CatalogClient() as cli:
        docs = list(cli.iter_documents())
        facets = cli.category_facets()
    cache.write_text(json.dumps(docs, ensure_ascii=False), encoding="utf-8")
    (cache_dir / "facets.json").write_text(json.dumps(facets, ensure_ascii=False, indent=2), encoding="utf-8")
    return docs


def build_inventory(docs: list[dict]) -> list[DatasetRef]:
    return [parse_document(d) for d in docs]


def inventory_to_json(datasets: list[DatasetRef]) -> list[dict]:
    return [asdict(d) for d in datasets]


def size_report(datasets: list[DatasetRef]) -> dict:
    """Per-tier resource counts + summed known bytes; what the harvester will and will not mirror."""
    tiers: dict[str, dict] = {}
    for d in datasets:
        for r in d.resources:
            t = tiers.setdefault(r.tier, {"resources": 0, "known_bytes": 0, "unsized": 0})
            t["resources"] += 1
            if r.size_bytes:
                t["known_bytes"] += r.size_bytes
            else:
                t["unsized"] += 1
    mirror = tiers.get(TIER_DIRECT, {}).get("known_bytes", 0)
    return {
        "n_datasets": len(datasets),
        "n_with_resources": sum(1 for d in datasets if d.resources),
        "n_resources": sum(len(d.resources) for d in datasets),
        "by_tier": tiers,
        "mirror_tier_A_gb": round(mirror / _GB, 1),
        "disk_cap_gb": config.DISK_CAP_GB,
        "fits": mirror / _GB < config.DISK_CAP_GB,
    }


# ---------------------------------------------------------------- download ------------------------------------------

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=2, min=2, max=30), reraise=True)
def _head_size(client: httpx.Client, url: str) -> int | None:
    r = client.head(url, follow_redirects=True)
    if r.status_code >= 400:
        r = client.get(url, headers={"Range": "bytes=0-0"})  # some hosts reject HEAD
    cl = r.headers.get("Content-Range", "")
    if "/" in cl:
        try:
            return int(cl.rsplit("/", 1)[-1])
        except ValueError:
            pass
    try:
        return int(r.headers.get("Content-Length", "")) or None
    except ValueError:
        return None


def _download_one(client: httpx.Client, url: str, dest: Path, expected: int | None) -> tuple[bool, int, str]:
    """Stream a file to `dest` with resume + sha256. Returns (ok, bytes, sha_or_reason)."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".part")
    have = tmp.stat().st_size if tmp.exists() else 0
    if dest.exists() and (expected is None or dest.stat().st_size == expected):
        return True, dest.stat().st_size, "cached"
    headers = {"Range": f"bytes={have}-"} if have else {}
    try:
        with client.stream("GET", url, headers=headers, follow_redirects=True) as r:
            if r.status_code in (200, 206):
                mode = "ab" if (have and r.status_code == 206) else "wb"
                with open(tmp, mode) as f:
                    for chunk in r.iter_bytes(chunk_size=1 << 20):
                        f.write(chunk)
            else:
                return False, 0, f"http_{r.status_code}"
    except (httpx.HTTPError, OSError) as e:
        return False, 0, f"error:{type(e).__name__}"
    sha = hashlib.sha256()
    with open(tmp, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            sha.update(b)
    tmp.replace(dest)
    return True, dest.stat().st_size, sha.hexdigest()


def download_tier_a(datasets: list[DatasetRef], *, raw_dir: Path | None = None, disk_cap_gb: float | None = None,
                    monster_gb: float | None = None, limit: int | None = None, log=print) -> dict:
    """Mirror tier-A resources under raw_dir/<slug>/, honoring the disk cap + per-resource monster cap.

    Writes a per-resource `_manifest.jsonl` receipt (url, tier, bytes, sha, status). Returns a summary dict.
    `limit` caps how many resources are attempted (used for a smoke run / sampling).
    """
    raw_dir = raw_dir or config.RAW_DIR
    cap = (disk_cap_gb if disk_cap_gb is not None else config.DISK_CAP_GB) * _GB
    monster = (monster_gb if monster_gb is not None else config.MONSTER_GB) * _GB
    raw_dir.mkdir(parents=True, exist_ok=True)
    receipts = raw_dir / "_receipts.jsonl"

    used = sum(p.stat().st_size for p in raw_dir.rglob("*") if p.is_file())
    done = skipped = failed = attempted = 0
    with httpx.Client(timeout=120.0, headers={"User-Agent": _UA, "Accept-Encoding": "gzip"},
                      follow_redirects=True) as client, open(receipts, "a", encoding="utf-8") as rc:
        for d in datasets:
            for r in d.resources:
                if r.tier != TIER_DIRECT or not r.url:
                    continue
                if limit is not None and attempted >= limit:
                    log(f"[harvest] reached limit={limit}; stopping")
                    return _summary(done, skipped, failed, used)
                attempted += 1
                size = r.size_bytes
                if size is None:
                    try:
                        size = _head_size(client, r.url)
                    except httpx.HTTPError:
                        size = None
                if size and size > monster:
                    skipped += 1
                    _receipt(rc, r, 0, "skip_monster", d.slug)
                    continue
                if size and used + size > cap:
                    skipped += 1
                    _receipt(rc, r, 0, "skip_disk_cap", d.slug)
                    continue
                dest = raw_dir / d.slug / _safe_name(r.name, r.url, r.fmt)
                ok, nbytes, info = _download_one(client, r.url, dest, size)
                if ok:
                    done += 1
                    used += nbytes if info != "cached" else 0
                    _receipt(rc, r, nbytes, "ok" if info != "cached" else "cached", d.slug, sha=info)
                else:
                    failed += 1
                    _receipt(rc, r, 0, info, d.slug)
                if attempted % 25 == 0:
                    log(f"[harvest] attempted={attempted} ok={done} skip={skipped} fail={failed} "
                        f"used={used/_GB:.1f}GB/{cap/_GB:.0f}GB")
    return _summary(done, skipped, failed, used)


def _summary(done: int, skipped: int, failed: int, used: int) -> dict:
    return {"downloaded": done, "skipped": skipped, "failed": failed, "used_gb": round(used / _GB, 2)}


def _safe_name(name: str, url: str | None, fmt: str) -> str:
    import re
    base = re.sub(r"[^A-Za-z0-9._-]+", "_", name).strip("_")[:80] or "resource"
    if "." not in base and fmt and fmt != "unknown":
        base = f"{base}.{fmt}"
    return base


def _receipt(rc, r, nbytes: int, status: str, slug: str, sha: str = "") -> None:
    rc.write(json.dumps({"dataset": r.dataset_id, "slug": slug, "name": r.name, "url": r.url,
                         "tier": r.tier, "bytes": nbytes, "status": status, "sha256": sha,
                         "ts": int(time.time())}, ensure_ascii=False) + "\n")


def run(*, force_enumerate: bool = False, download: bool = True, limit: int | None = None, log=print) -> dict:
    """Full harvest: enumerate -> inventory + reports (committed-small) -> optional gated download (heavy)."""
    config.ensure_scratch_dirs()
    docs = enumerate_catalog(force=force_enumerate)
    datasets = build_inventory(docs)
    report = size_report(datasets)
    # persist the machine-readable inventory + report to the out-of-git catalog dir (a decimated copy is committed later)
    (config.CATALOG_DIR / "inventory.json").write_text(
        json.dumps(inventory_to_json(datasets), ensure_ascii=False), encoding="utf-8")
    (config.CATALOG_DIR / "size_report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False),
                                                         encoding="utf-8")
    log(f"[harvest] {report['n_datasets']} datasets, {report['n_resources']} resources; "
        f"tier-A mirror ~{report['mirror_tier_A_gb']}GB (cap {report['disk_cap_gb']}GB, fits={report['fits']})")
    dl = download_tier_a(datasets, limit=limit, log=log) if download else {"downloaded": 0, "skipped": 0}
    return {"report": report, "download": dl}
