# Atalaya · documentation

Atalaya harvests Chile's Data Observatory open catalog, profiles every downloadable table, and mines five kinds of
cross-dataset relation into an explorable knowledge graph. This wiki documents how it works, the engines it uses,
the analytical cases, and how to run and extend it.

## How to read this wiki

Each theme is a folder with numbered pages in reading order, plus a same-named landing entry. Start here, then
follow the section that matches your question.

| Section | What it covers |
|---|---|
| [architecture/](architecture/) | The lanes (offline / live / replay), the staged pipeline, the measured gate, the two data contracts, and deploy. |
| [frameworks/](frameworks/) | One card per research-chosen engine actually used by the pipeline: what it is, why it was chosen, how it is installed, and where it is called. |
| [cases/](cases/README.md) | The category taxonomy and the coverage matrix: the 11 analytical cases across 8 categories. |
| [guides/](guides/) | Run the precompute pipeline, bring your own data, the architecture modal, and instantiate the base. |
| [data-contract.md](data-contract.md) | The two enforced contracts: ingestion (raw → pipeline) and artifact (pipeline → web), plus the download-tier policy. |

## What Atalaya is, and is not

- **Is:** a relation explorer over real open data, honest about uncertainty (every correlation passes a permutation
  null + FDR; a negative control confirms shuffled data yields ~0 findings). A reproducible offline pipeline whose
  committed artifacts the web replays, plus two genuinely live client-side computations.
- **Is not:** a data warehouse or a replacement for the official catalog; it does not invent causation; it does not
  mirror the heavy DOI scientific archives (it references them by link).

## Using the tools on other data

The pipeline is not hard-wired to the Data Observatory. The ingestion contract (`io/contract.py`) accepts any
tabular file that meets minimum quality bounds, and the profiler + relation miner run on whatever normalized tables
exist. See [guides/02_bring-your-own-data.md](guides/02_bring-your-own-data.md).

## Provenance + honesty

Dataset content belongs to the Data Observatory and the original Chilean sources under their licenses (mostly
CC-BY family). Atalaya stores only derived metadata + compact artifacts. Method references carry real DOIs
(see each framework card and the app's Methodology page).
