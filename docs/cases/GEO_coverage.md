# GEO_coverage, Geographic coverage

**Category:** geographic · **render_kind:** `coverage` · **builder:** `build_geographic`

## The question

How is the catalog geo-referenced? Which datasets carry point coordinates, which are keyed to comuna or region,
and which have no usable geography at all?

## The method

`build_geographic` classifies each profiled dataset by its strongest geographic handle: `points` if it carries a
representative lat/lon, else `comuna_cut`, else `region`, else `none`. It emits per-dataset rows (theme, level,
coordinate, entity keys) plus the level counts. Lat/lon come from the catalog's `geo_locations` (parsed in
`inventory.py`) and from columns detected as `lat`/`lon` within Chile's coordinate band (`entities.py`).

## The variants

A level knob (comuna-keyed, region-keyed, point-located, any geo key) and a metric knob (dataset count, theme
mix), letting the reader ask "how many datasets can I place on a map at this resolution" versus "what themes are
covered where".

## Honesty note

Geographic level is a coverage statement, not a geometry: a comuna-keyed dataset can be mapped to comuna polygons,
but Atalaya stores only a representative point and the key, not the shapes. `none` is reported honestly rather than
imputed; a dataset with no detected geo key is simply not placeable and says so.
