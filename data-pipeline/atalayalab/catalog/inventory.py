"""Turn raw OpenSearch documents into typed `DatasetRef`s and classify every resource into a download tier.

This is the guard that stops the naive "download every url" failure: ~529 of 1017 datasets are DOI records whose
`file_uri` is an HTML landing page for a huge foreign archive (200-650 GB seismic networks). Only Chilean-gov
direct files (tier A) are mirrored. See docs/data-contract.md for the classification rules + evidence.
"""
from __future__ import annotations

import re
import unicodedata
from urllib.parse import urlparse

from ..io.schema import (DatasetRef, ResourceRef, TIER_BROKEN, TIER_DIRECT, TIER_DOI,
                         TIER_GEOSERVICE, TIER_NOURL)

# hosts whose file_uri is a landing page, not a file -> tier D (metadata only)
_DOI_HOSTS = ("doi.pangaea.de", "pangaea.de", "gfz.de", "dataservices.gfz.de", "geofon.gfz",
              "resif.fr", "data.eol.ucar.edu", "marine-geo.org", "earthref.org", "bas.ac.uk",
              "doi.org", "hdl.handle.net", "seanoe.org", "zenodo.org")
# OGC / geoservice endpoints -> tier C (API pull, not a file)
_GEO_HOSTS = ("geoportal.cl", "ide-energia", "ide.minagri", "ide.subpesca", "geoservicios",
              "arcgis.com", "mapas.")
_GEO_HINTS = ("wfs", "wms", "getcapabilities", "service=wfs", "service=wms", "/geoserver/")

# short format token normalization
_FMT = [
    (re.compile(r"csv"), "csv"), (re.compile(r"sheet|xlsx|openxmlformats"), "xlsx"),
    (re.compile(r"ms-excel|\.xls$"), "xls"), (re.compile(r"zip"), "zip"), (re.compile(r"rar"), "rar"),
    (re.compile(r"geo\+json|geojson"), "geojson"), (re.compile(r"json"), "json"),
    (re.compile(r"pdf"), "pdf"), (re.compile(r"html"), "html"), (re.compile(r"xml"), "xml"),
    (re.compile(r"shp|shapefile"), "shp"), (re.compile(r"tif|geotiff"), "tiff"),
    (re.compile(r"netcdf|\bnc\b"), "netcdf"), (re.compile(r"parquet"), "parquet"), (re.compile(r"txt|plain"), "txt"),
]


def _slugify(title: str, doc_id: str) -> str:
    s = unicodedata.normalize("NFKD", title).encode("ascii", "ignore").decode().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:60].strip("-")
    return s or f"ds-{doc_id[:8].lower()}"


def _first(seq: list | None, key: str | None = None, default: str = "") -> str:
    if not seq:
        return default
    v = seq[0]
    if key and isinstance(v, dict):
        return str(v.get(key, default) or default)
    return str(v or default)


def _norm_format(raw: str, url: str | None) -> str:
    blob = f"{raw} {url or ''}".lower()
    for rx, tok in _FMT:
        if rx.search(blob):
            return tok
    ext = (urlparse(url).path.rsplit(".", 1)[-1].lower() if url and "." in urlparse(url).path else "")
    return ext[:8] if ext else "unknown"


def _parse_size_bytes(mf: dict) -> int | None:
    """Prefer the download `sizes[]` (the actual file); fall back to summed `Collections[]` bytes."""
    for entry in mf.get("sizes") or []:
        try:
            val = float(str(entry.get("size")).replace(",", ""))
        except (TypeError, ValueError):
            continue
        unit = str(entry.get("unit", "")).strip().lower()
        mult = {"bytes": 1, "b": 1, "kb": 1024, "mb": 1024**2, "gb": 1024**3, "tb": 1024**4}.get(unit, 1)
        if val > 0:
            return int(val * mult)
    total = 0
    for c in mf.get("Collections") or []:
        try:
            total += int(str(c.get("size", "0")).replace(",", ""))
        except (TypeError, ValueError):
            pass
    return total or None


def _classify(url: str | None, fmt: str) -> str:
    if not url:
        return TIER_NOURL
    low = url.lower()
    if low.startswith("blob:") or low.startswith("data:"):
        return TIER_BROKEN
    host = (urlparse(url).netloc or "").lower()
    if any(h in host for h in _DOI_HOSTS) or fmt == "html":
        return TIER_DOI
    if any(h in host for h in _GEO_HOSTS) or any(h in low for h in _GEO_HINTS):
        return TIER_GEOSERVICE
    if low.startswith(("http://", "https://")):
        return TIER_DIRECT
    return TIER_BROKEN


def _rep_point(geo: list | None) -> tuple[float | None, float | None]:
    for g in geo or []:
        for k in ("geo_location_point", "point", "geoLocationPoint"):
            p = g.get(k) if isinstance(g, dict) else None
            if isinstance(p, dict):
                try:
                    return float(p.get("point_latitude") or p.get("lat")), float(p.get("point_longitude") or p.get("lon"))
                except (TypeError, ValueError):
                    pass
    return None, None


def parse_document(doc: dict) -> DatasetRef:
    """Map one `{"_id":..., "_source":{...}}` OpenSearch hit to a typed DatasetRef with classified resources."""
    doc_id = str(doc.get("_id"))
    src = doc.get("_source", {})
    title = _first(src.get("titles"), "name") or f"Dataset {doc_id[:8]}"
    lat, lon = _rep_point(src.get("geo_locations"))
    cats = src.get("categories") or []
    theme = _first(cats, "name")
    sub = _first(cats, "sub_category")
    lic = (_first(src.get("rights"), "rights_identifier") or _first(src.get("rights"), "rights")
           or _first(src.get("rights"), "rights_uri"))
    org = _first(src.get("publishers"), "publisher_name") or _first(src.get("roles"), "role_name") or src.get("origin_name", "")

    resources: list[ResourceRef] = []
    for i, mf in enumerate(src.get("media_files") or []):
        url = (mf.get("file_uri") or "").strip() or None
        fmt = _norm_format(mf.get("format", ""), url)
        resources.append(ResourceRef(
            dataset_id=doc_id,
            name=(mf.get("title") or f"resource_{i+1}").strip(),
            url=url, fmt=fmt, size_bytes=_parse_size_bytes(mf), tier=_classify(url, fmt),
        ))
    return DatasetRef(
        id=doc_id, slug=_slugify(title, doc_id), title=title.strip(),
        org=str(org).strip(), origin=str(src.get("origin_name", "")).strip(),
        theme=theme, sub_category=sub, license=lic,
        description=(_first(src.get("descriptions"), "description") or "").strip()[:4000],
        lat=lat, lon=lon, resources=resources,
    )
