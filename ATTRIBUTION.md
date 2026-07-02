# Attribution

## Data source

**Data Observatory Foundation** (Chile) · the open data catalog Atalaya explores:
https://catalogo.dataobservatory.net. A non-profit public-private-academic technology centre. Underlying datasets
belong to the Data Observatory and the original Chilean public institutions (INE, datos.gob.cl, MINSAL, Mineduc,
Meteochile, Servel, DIPRES, CONAF, and others), catalogued under FAIR principles.

## Methods (real DOIs)

- Reimers, N., & Gurevych, I. (2019). Sentence-BERT. EMNLP-IJCNLP. doi:10.18653/v1/D19-1410
- Reimers, N., & Gurevych, I. (2020). Multilingual sentence embeddings via knowledge distillation. EMNLP. doi:10.18653/v1/2020.emnlp-main.365
- Wang, W., et al. (2020). MiniLM. NeurIPS 33.
- Broder, A. Z. (1997). On the resemblance and containment of documents. doi:10.1109/SEQUEN.1997.666900
- Zhu, E., et al. (2016). LSH Ensemble. PVLDB. doi:10.14778/2994509.2994534
- Spearman, C. (1904). The proof and measurement of association. doi:10.2307/1412159
- Benjamini, Y., & Hochberg, Y. (1995). Controlling the false discovery rate. doi:10.1111/j.2517-6161.1995.tb02031.x
- Baak, M., et al. (2020). phi_k correlation. doi:10.1016/j.csda.2020.107043
- Pearson, K. (1901). PCA. doi:10.1080/14786440109462720
- Lloyd, S. (1982). k-means. doi:10.1109/TIT.1982.1056489
- Newman, M. E. J. (2006). Modularity. doi:10.1073/pnas.0601602103
- Wilkinson, M. D., et al. (2016). FAIR Guiding Principles. doi:10.1038/sdata.2016.18

## Design patterns

- The SQLite-WAL knowledge-graph store + read-only query surface follows the design of
  `DeusData/codebase-memory-mcp` (re-pointed from a code ontology to a data ontology).
- The web app shell, deterministic-replay discipline and docs-wiki structure mirror the CAOS_SIMLAB exemplar.

Colormap: viridis (Smith & van der Walt, 2015). No jet/rainbow colormaps are used.
