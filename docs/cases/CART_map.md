# CART_map, Catalog map

**Category:** cartography · **render_kind:** `map` · **builder:** `build_cartography`

## The question

Where does each profiled dataset sit in the catalog's semantic space, and how does that layout change when you
color it by different attributes?

## The method

`train.py` fits a PCA to 2-D over the MiniLM dataset embeddings and a KMeans clustering of the same space; the
2-D coordinates and cluster ids are baked per dataset. `build_cartography` emits one node per profiled dataset
with its coordinate (`coord`), cluster, theme, origin, entity keys, temporal span, its full topic list
(`topics[]`, see below), and average null fraction, plus the PCA explained-variance ratio for the axes. The web
renders it as a scatter map (`ScatterMap.tsx`) that recolors instantly from the single payload.

## The 2-D and 3-D views

The map has two dimensions of view, switched by a **2D / 3D** toggle in the map toolbar:

- **2D** · the SVG scatter (`ScatterMap.tsx`) over the 2-D PCA `coord`. Zoom (wheel), pan (drag), hover for a
  value read-out.
- **3D** · an orbitable three.js view (`ScatterMap3D.tsx`) over a `coord3 = [x, y, z]` baked per node. `coord3`
  is a **3-D PCA of the same MiniLM embeddings** (`scripts/pca3d_offline.py` fits `PCA(n_components=3)` over the
  baked `embeddings.json` and writes `coord3` onto each catalog node; the 2-D `coord` is left untouched). Drag to
  orbit, wheel to zoom. The 3-D view appears only when nodes carry `coord3`.

## The variants

A single, honest color-by knob: theme, origin, cluster, join-keys present, **topic**, recency (year), or
null-rate. Each is a different lens on the same layout; nothing is recomputed per variant.

**Colour by topic** uses `topics[]`, the full OECD sub-category list per dataset (see below): points are coloured
by the dataset's first topic. The topic list is also shown on hover, alongside theme, org, columns, rows, keys,
year span and null rate.

## Topics (the `topics[]` field)

The catalog's DataCite `categories` are **multi-valued**: about 70% of datasets carry 2 to 5 categories. Rather
than keep only the first, every dataset now exposes `topics[]`, its **full list of OECD sub-categories** (27 clean
values across the corpus: `Ciencias de la salud`, `Derecho`, `Economía y negocios`, `Sociología`, `Ciencias de
la Tierra`, and so on). It is baked onto the catalog and map nodes by the offline `scripts/topics_offline.py`
(which reads every `categories[].sub_category` from the harvested documents) and surfaced two ways: as the map's
**Colour by topic** variant and on the hover read-out. A shared-topic relation graph was evaluated and dropped
(too dense a hairball to be informative), so topics stay a colour + hover facet rather than an edge kind.

## Honesty note

The coordinates are a 2-D PCA projection of a 384-dim embedding space, so nearby points are only approximately
similar; the explained variance is shown so the reader knows how much structure the two axes capture. Only
datasets with a normalized table (an embedding) appear; the full catalog composition is in CAT_overview.
