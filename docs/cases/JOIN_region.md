# JOIN_region, Region-joinable datasets

**Category:** joinability · **render_kind:** `graph` · **builder:** `build_joinability`

## The question

Which datasets can be joined on the **region** key? Region is a coarser geographic key than the comuna CUT, so
this view surfaces broader, higher-recall linkages.

## The method

Same machinery as [JOIN_comuna](JOIN_comuna.md): `entities.py` detects a `region` column (header hint plus, for the
strongly-typed keys, a value-shape check), `feature_extraction.py` MinHashes it, and `infer.py :: _joinable_edges`
estimates containment between region columns across datasets. The builder (`build_joinability`) reads the same
`JOINABLE_ON` edge kind; the case differs only by its variant key.

## The variants

A containment threshold: 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, with `key = region`. Because region has far fewer distinct
values than comuna, containment saturates more easily, so the higher thresholds are the discriminating ones.

## Honesty note

A region-level join is coarser than a comuna-level one: many datasets share the 16 region codes, so a high
containment here is weaker evidence of a specific relationship than the same containment on comuna. The affinity
proposal accounts for this by treating joinability as a fact but calibrating its strength against a null.
