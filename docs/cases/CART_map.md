# CART_map, Catalog map

**Category:** cartography · **render_kind:** `map` · **builder:** `build_cartography`

## The question

Where does each profiled dataset sit in the catalog's semantic space, and how does that layout change when you
color it by different attributes?

## The method

`train.py` fits a PCA to 2-D over the MiniLM dataset embeddings and a KMeans clustering of the same space; the
2-D coordinates and cluster ids are baked per dataset. `build_cartography` emits one node per profiled dataset
with its coordinate, cluster, theme, origin, entity keys, temporal span, and average null fraction, plus the PCA
explained-variance ratio for the axes. The web renders it as a scatter map (`ScatterMap.tsx`) that recolors
instantly from the single payload.

## The variants

A single, honest color-by knob: theme, origin, cluster, join-keys present, recency (year), or null-rate. Each is a
different lens on the same layout; nothing is recomputed per variant.

## Honesty note

The coordinates are a 2-D PCA projection of a 384-dim embedding space, so nearby points are only approximately
similar; the explained variance is shown so the reader knows how much structure the two axes capture. Only
datasets with a normalized table (an embedding) appear; the full catalog composition is in CAT_overview.
