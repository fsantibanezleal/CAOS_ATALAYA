# AFF_top, Multi-evidence affinity (the novel proposal)

**Category:** affinity · **render_kind:** `affinity` · **builder:** `build_affinity`

## The question

Which dataset pairs are genuinely related when you fuse **three orthogonal evidences** (semantic, joinability,
statistical) and calibrate each against chance, rather than trusting any single signal?

## The method

The novel proposal (`model/affinity.py`). Each raw evidence is passed through its empirical **null CDF** (fit
offline in `train.py` from random background pairs), turning a raw magnitude into a percentile ("stronger than
chance"). The three calibrated terms are fused with evidence-reliability weights that down-weight an evidence that
contradicts the others (e.g. high semantic match with no joinable key):

```math
S(A,B) = \frac{w_{\text{sem}}\,f_{\text{sem}} + w_{\text{join}}\,f_{\text{join}} + w_{\text{stat}}\,f_{\text{stat}}}
              {w_{\text{sem}} + w_{\text{join}} + w_{\text{stat}}}
```

`infer.py :: _affinity_edges` writes one `AFFINITY` summary edge per related pair, carrying `score`, `f_sem`,
`f_join`, `f_stat`. `build_affinity` renders the top pairs; the App can reweight live (see the
[live lane](../architecture/04_live-lane.md)).

## The variants

Weight presets: balanced (`0.34/0.40/0.26`), semantic-led, join-led, correlation-led, plus a top-200 cap and a
`score >= 0.6` filter. Because every term is in the payload, reweighting is instant and client-side.

## Honesty note

The score is interpretable and auditable: every term is reported, so the UI can show **why** two datasets are
linked, never an opaque number. It means "more evidence than chance across three signals", not importance,
quality, or causation. It is the one novel contribution beyond off-the-shelf single-signal dataset search
(Auctus/Lazo on containment, semantic catalog search on cosine, correlation miners on association).
