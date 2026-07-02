# JOIN_comuna, Comuna-joinable datasets

**Category:** joinability · **render_kind:** `graph` · **builder:** `build_joinability`

## The question

Which datasets can actually be joined on the **comuna CUT** key, i.e. one dataset's comuna values are contained in
another's?

## The method

`entities.py` detects a `comuna_cut` column only when both the header and the value shape agree (a 5-digit CUT
whose region prefix is 01 to 16). `feature_extraction.py` computes a MinHash signature of each such column.
`infer.py :: _joinable_edges` estimates **containment** between key columns from their signatures
(`embed.minhash_containment`), which captures a foreign-key relationship even when the tables differ wildly in
size (where symmetric Jaccard would look tiny). Edges with containment at or above `JOIN_MIN_CONTAINMENT = 0.5`
become `JOINABLE_ON` edges carrying the key, the containment, the column names, and the cardinalities.

## The variants

A containment threshold: 0.5, 0.6, 0.7, 0.8, 0.9, 0.95 (`key = comuna_cut`). Higher thresholds keep only tighter
foreign-key relationships. Sibling case JOIN_region uses the same builder with `key = region`.

## Honesty note

Containment is estimated from a 64-permutation MinHash, so it is approximate; the evaluation's joinability-sanity
check (both endpoints declare the shared key) guards against false edges. A joinable pair means the keys align, not
that joining them is scientifically meaningful; that judgment is left to the analyst.
