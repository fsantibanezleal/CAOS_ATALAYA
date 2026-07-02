# Framework card · spatial overlap + CRS (Shapely + pyproj)

## What & why

Many Chilean-gov datasets are geographic: comuna/region-keyed, or carrying lat/lon point coverage. Two datasets
"cover the same place" is a real relation (`SPATIALLY_OVERLAPS`), and reasoning about it needs geometry ops and
correct coordinate reference systems. **Shapely** does the geometry (point/polygon containment, intersection,
overlap area); **pyproj** handles the CRS so lat/lon (EPSG:4326) is transformed correctly to the projected system
for Chile (UTM zone 19S, EPSG:32719) before any metric overlap is computed. Mixing CRSs silently is the classic
geospatial bug this pair prevents.

Chosen because Shapely (GEOS-backed) + pyproj (PROJ-backed) are the de-facto standard, correct geometry/CRS stack;
hand-rolling spatial predicates or projections is exactly the kind of subtle error that produces false overlap
edges.

## Install (exact, verified)

Pinned in `data-pipeline/requirements-precompute.txt`:

```
shapely==2.0.6
pyproj==3.7.0
```

## Usage

```python
from shapely.geometry import Point, box
from pyproj import Transformer
to_utm = Transformer.from_crs("EPSG:4326", "EPSG:32719", always_xy=True)  # lon/lat -> UTM 19S
x, y = to_utm.transform(lon, lat)
overlaps = box(*bbox_a).intersects(box(*bbox_b))                          # spatial predicate
```

## Applying it here

- `infer.py` `_spatial_edges` emits `SPATIALLY_OVERLAPS` edges. The current criterion is a shared geographic key
  (comuna CUT / region) or lat/lon presence, weighted higher for a comuna match than a region match. Shapely +
  pyproj provide the geometry/CRS foundation for lat/lon overlap (project to UTM 19S, then test intersection),
  keeping the spatial reasoning metrically correct rather than comparing raw degrees.
- Geographic coverage summaries (which comunas/regions a dataset touches, point extents) use the same stack; the
  entity-key roles (comuna CUT, region, lat, lon) come from `catalog/entities.py`.
- `export.py` credits `pyproj` as a producing engine for the `coverage` render kind.

## Caveats / license

Shapely BSD-3, pyproj MIT-style (both redistributable), bundling GEOS/PROJ respectively. Always project to a metric
CRS (UTM 19S for Chile) before computing distances/areas; comparing raw lat/lon degrees is wrong away from the
equator. pyproj downloads PROJ grids on first use; cache locally. Overlap on a shared administrative key is exact;
point-radius overlap is an approximation and should be reported as such on the edge evidence.
