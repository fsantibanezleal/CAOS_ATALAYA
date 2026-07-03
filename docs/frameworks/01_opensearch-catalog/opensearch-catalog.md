# Framework card · Data Observatory catalog backend (AWS OpenSearch)

## What & why

The Data Observatory catalog (`catalogo.dataobservatory.net`) is a static SvelteKit single-page app served from
S3 + CloudFront. Its data does **not** come from a CKAN JSON API (the `/api/3/action/*` paths return the SPA's
HTML). The SPA queries an **AWS OpenSearch (Elasticsearch) cluster** directly, behind CloudFront, using a
read-only Basic-auth credential embedded in the JS bundle (role `readall`).

Atalaya harvests through this same endpoint because it is the only complete, machine-readable index of the
catalog. It is treated as an **unofficial, read-only** source: polite pagination, aggressive caching (one crawl,
then work from the cache), and a documented re-extraction step if the credential rotates.

- Base: `https://d2i4qx9nxxjzd9.cloudfront.net/prod-v3`
- Endpoints: `POST /_search`, `POST /_count` (admin endpoints such as `/_mapping` return `403`).
- Auth: HTTP Basic, user `front-reader` (credential read from your environment into `.env`, never
  committed). If `_search` starts returning `401`, re-extract by grepping the SPA JS bundle for
  `d2i4qx9nxxjzd9` / `front-reader`.

## The document schema (DataCite-derived)

`_source` carries: `titles[].name`, `descriptions[].description`, `categories[]{name, sub_category}` (the six
OECD areas at `name`, finer OECD sub-categories at `sub_category`), `rights[].rights_identifier` (SPDX license
id), `publishers[].publisher_name`, `roles[]`, `geo_locations[]`, `origin_name` (`Data Observatory` vs
`DataCite`), and the download field `media_files[]{file_uri, format, sizes[], Collections[]}`.

**`categories` is multi-valued.** About 70% of datasets carry 2 to 5 categories. `inventory.py` keeps the first
as the primary `theme` / `sub_category`, but the full set matters downstream: the offline
`scripts/topics_offline.py` reads **every** `categories[].sub_category` and bakes a `topics[]` list onto each
catalog node (27 clean sub-category values across the corpus: `Ciencias de la salud`, `Derecho`, `Economía y
negocios`, `Sociología`, `Ciencias de la Tierra`, and so on). Those `topics[]` power the Catalog map's "Colour by
topic" variant and the hover read-out (see [CART_map](../../cases/CART_map.md)).

`max_result_window` (10 000) far exceeds the 1017 documents, so plain `from`/`size` paging enumerates the whole
catalog; no scroll/PIT is needed. The document `_id` is the stable key used everywhere downstream.

## Install (exact, verified)

Pinned in `requirements-precompute.txt`:

```
httpx[http2]==0.28.1
h2==4.1.0
tenacity==9.0.0
```

## Usage (verified request)

```python
import base64, httpx, json
BASE = "https://d2i4qx9nxxjzd9.cloudfront.net/prod-v3"
auth = base64.b64encode(b"front-reader:<read-only-password-from-the-catalog-site>").decode()
h = {"Authorization": f"Basic {auth}", "Content-Type": "application/json"}
r = httpx.post(f"{BASE}/_count", headers=h, content=json.dumps({"query": {"match_all": {}}}))
print(r.json())   # {"count": 1017, ...}
```

## Applying it here

`atalayalab.catalog.client.CatalogClient` wraps this endpoint; `stages/harvest.py` enumerates every document,
`catalog/inventory.py` parses each into a typed `DatasetRef` and classifies its resources into download tiers.
This is the head of the ingestion path; the size/tier policy it feeds is documented in
[`../../data-contract.md`](../../data-contract.md).

## Scope & honesty

The catalog is a **metadata catalog**, not a data host: `media_files[].file_uri` points at external sites. About
half the datasets are Chilean-gov direct files (mirrorable); the other half are DOI records whose `file_uri` is an
HTML landing page for large foreign scientific archives (not directly downloadable). Atalaya mirrors only the
former and references the latter · see the download-tier policy in the data contract.
