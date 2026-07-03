"""Client for the Data Observatory catalog backend — an AWS OpenSearch cluster behind CloudFront.

Discovered 2026-07-01 from the public SvelteKit SPA bundle (the `/api/3/action/*` CKAN path is a dead end that
returns SPA HTML). The SPA talks straight to OpenSearch with an embedded read-only Basic-auth credential
(`<catalog-read-user>`, role `readall`). This is an UNOFFICIAL, undocumented endpoint: treat it as read-only, be polite,
cache aggressively, and re-extract the credential from the JS bundle if it starts returning 401. Full mapping: docs/frameworks/opensearch-catalog/.

    POST {BASE}/_search   {"query":..., "from":..., "size":..., "_source":[...]}
    POST {BASE}/_count    {"query":...}

max_result_window (10k) >> 1017 documents, so plain from/size paging is enough (no scroll/PIT).
"""
from __future__ import annotations

import base64
import json
from typing import Any, Iterator

import httpx

from .. import config

# the _source fields the detail page uses — the safe contract (no _mapping access on the read-only role).
SOURCE_FIELDS = [
    "titles", "descriptions", "categories", "rights", "roles", "publishers",
    "resource", "dates", "subjects", "geo_locations", "media_files", "origin_name", "origin_priority",
]


class CatalogClient:
    """Thin, polite OpenSearch reader. Use as a context manager so the HTTP/2 pool closes cleanly."""

    def __init__(self, base: str | None = None, user: str | None = None, password: str | None = None,
                 timeout: float = 60.0) -> None:
        self.base = (base or config.DO_API_BASE).rstrip("/")
        user = user or config.DO_API_USER
        password = password if password is not None else config.DO_API_PASS
        token = base64.b64encode(f"{user}:{password}".encode()).decode()
        self._client = httpx.Client(
            headers={"Authorization": f"Basic {token}", "Content-Type": "application/json",
                     "Accept-Encoding": "gzip", "User-Agent": "atalaya-harvester/0.1 (+research; polite)"},
            timeout=timeout, http2=True,
        )

    def __enter__(self) -> "CatalogClient":
        return self

    def __exit__(self, *exc: object) -> None:
        self._client.close()

    def _post(self, path: str, body: dict[str, Any]) -> dict[str, Any]:
        r = self._client.post(f"{self.base}{path}", content=json.dumps(body))
        r.raise_for_status()
        return r.json()

    def count(self) -> int:
        """Total documents in the catalog."""
        return int(self._post("/_count", {"query": {"match_all": {}}})["count"])

    def iter_documents(self, page_size: int = 250) -> Iterator[dict[str, Any]]:
        """Yield every catalog document as `{"_id":..., "_source":{...}}`, paginating from/size.

        Sorted by `origin_priority` for a stable, resumable order. Stops when a short page is returned.
        """
        total = self.count()
        frm = 0
        while frm < total:
            body = {
                "query": {"match_all": {}},
                "from": frm, "size": page_size,
                "sort": [{"origin_priority": {"order": "asc"}}, {"_id": {"order": "asc"}}],
                "_source": SOURCE_FIELDS,
            }
            hits = self._post("/_search", body)["hits"]["hits"]
            if not hits:
                break
            yield from hits
            frm += len(hits)

    def get(self, doc_id: str) -> dict[str, Any] | None:
        """Fetch a single document by its stable OpenSearch _id (what the detail page uses)."""
        hits = self._post("/_search", {"query": {"ids": {"values": [doc_id]}}, "_source": SOURCE_FIELDS})
        docs = hits["hits"]["hits"]
        return docs[0] if docs else None

    def category_facets(self) -> dict[str, int]:
        """Authoritative per-top-level-category counts (nested aggregation)."""
        body = {
            "size": 0,
            "aggs": {"nc": {"nested": {"path": "categories"},
                            "aggs": {"cl": {"terms": {"field": "categories.name", "size": 50},
                                            "aggs": {"tp": {"reverse_nested": {}}}}}}},
        }
        buckets = self._post("/_search", body)["aggregations"]["nc"]["cl"]["buckets"]
        return {b["key"]: b["tp"]["doc_count"] for b in buckets}
