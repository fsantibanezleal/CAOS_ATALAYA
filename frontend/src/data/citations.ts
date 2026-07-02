// Atalaya bibliography. DOIs/URLs are the primary sources for the methods the pipeline actually uses.
// verified:false means "no DOI exists to verify" (book/standard/software), NOT "in doubt".
// Resolve DOIs at https://doi.org/<doi>.

export interface Citation {
  id: string;
  label: string;
  citation: string;
  doi?: string;
  url?: string;
  verified: boolean;
  tags: string[];
}

export const CITATIONS: Citation[] = [
  { id: "spearman1904", label: "Spearman 1904", citation: "Spearman, C. (1904). The proof and measurement of association between two things. The American Journal of Psychology 15(1), 72–101.", doi: "10.2307/1412159", verified: true, tags: ["stats"] },
  { id: "bh1995", label: "Benjamini & Hochberg 1995", citation: "Benjamini, Y., & Hochberg, Y. (1995). Controlling the false discovery rate: a practical and powerful approach to multiple testing. JRSS B 57(1), 289–300.", doi: "10.1111/j.2517-6161.1995.tb02031.x", verified: true, tags: ["stats"] },
  { id: "good2000", label: "Good 2000", citation: "Good, P. (2000). Permutation Tests: A Practical Guide to Resampling Methods for Testing Hypotheses (2nd ed.). Springer.", doi: "10.1007/978-1-4757-3235-1", verified: true, tags: ["stats"] },
  { id: "baak2020", label: "Baak et al. 2020 (phi_k)", citation: "Baak, M., Koopman, R., Snoek, H., & Klous, S. (2020). A new correlation coefficient between categorical, ordinal and interval variables with Pearson characteristics. Computational Statistics & Data Analysis 152, 107043.", doi: "10.1016/j.csda.2020.107043", verified: true, tags: ["stats"] },
  { id: "broder1997", label: "Broder 1997 (MinHash)", citation: "Broder, A. Z. (1997). On the resemblance and containment of documents. Proc. Compression and Complexity of Sequences, 21–29.", doi: "10.1109/SEQUEN.1997.666900", verified: true, tags: ["joinability"] },
  { id: "leskovec2020", label: "Leskovec, Rajaraman & Ullman 2020", citation: "Leskovec, J., Rajaraman, A., & Ullman, J. D. (2020). Mining of Massive Datasets (3rd ed.), Ch. 3 (LSH). Cambridge University Press.", url: "http://www.mmds.org/", verified: false, tags: ["joinability"] },
  { id: "zhu2016lshensemble", label: "Zhu et al. 2016 (LSH Ensemble)", citation: "Zhu, E., Nargesian, F., Pu, K. Q., & Miller, R. J. (2016). LSH Ensemble: Internet-scale domain search. PVLDB 9(12), 1185–1196.", doi: "10.14778/2994509.2994534", verified: true, tags: ["joinability"] },
  { id: "castro2019auctus", label: "Castro Fernandez et al. 2018", citation: "Castro Fernandez, R., et al. (2018). Aurum: A data discovery system. IEEE ICDE, 1001–1012.", doi: "10.1109/ICDE.2018.00094", verified: true, tags: ["joinability"] },
  { id: "reimers2019", label: "Reimers & Gurevych 2019 (SBERT)", citation: "Reimers, N., & Gurevych, I. (2019). Sentence-BERT: Sentence embeddings using Siamese BERT-networks. EMNLP-IJCNLP, 3982–3992.", doi: "10.18653/v1/D19-1410", verified: true, tags: ["embeddings"] },
  { id: "reimers2020multi", label: "Reimers & Gurevych 2020", citation: "Reimers, N., & Gurevych, I. (2020). Making monolingual sentence embeddings multilingual using knowledge distillation. EMNLP, 4512–4525.", doi: "10.18653/v1/2020.emnlp-main.365", verified: true, tags: ["embeddings"] },
  { id: "wang2020minilm", label: "Wang et al. 2020 (MiniLM)", citation: "Wang, W., et al. (2020). MiniLM: Deep self-attention distillation for task-agnostic compression of pre-trained transformers. NeurIPS 33.", url: "https://proceedings.neurips.cc/paper/2020/hash/3f5ee243547dee91fbd053c1c4a845aa-Abstract.html", verified: false, tags: ["embeddings"] },
  { id: "pearson1901", label: "Pearson 1901 (PCA)", citation: "Pearson, K. (1901). On lines and planes of closest fit to systems of points in space. Philosophical Magazine 2(11), 559–572.", doi: "10.1080/14786440109462720", verified: true, tags: ["ml"] },
  { id: "lloyd1982", label: "Lloyd 1982 (k-means)", citation: "Lloyd, S. (1982). Least squares quantization in PCM. IEEE Transactions on Information Theory 28(2), 129–137.", doi: "10.1109/TIT.1982.1056489", verified: true, tags: ["ml"] },
  { id: "ke2017lgbm", label: "Ke et al. 2017 (LightGBM)", citation: "Ke, G., et al. (2017). LightGBM: A highly efficient gradient boosting decision tree. NeurIPS 30.", url: "https://papers.nips.cc/paper/2017/hash/6449f44a102fde848669bdd9eb6b76fa-Abstract.html", verified: false, tags: ["ml"] },
  { id: "wilkinson2016fair", label: "Wilkinson et al. 2016 (FAIR)", citation: "Wilkinson, M. D., et al. (2016). The FAIR Guiding Principles for scientific data management and stewardship. Scientific Data 3, 160018.", doi: "10.1038/sdata.2016.18", verified: true, tags: ["data"] },
  { id: "smith2015viridis", label: "Smith & van der Walt 2015 (viridis)", citation: "Smith, N., & van der Walt, S. (2015). A better default colormap for Matplotlib (viridis). SciPy 2015 talk.", url: "https://bids.github.io/colormap/", verified: false, tags: ["viz"] },
  { id: "newman2006modularity", label: "Newman 2006 (modularity)", citation: "Newman, M. E. J. (2006). Modularity and community structure in networks. PNAS 103(23), 8577–8582.", doi: "10.1073/pnas.0601602103", verified: true, tags: ["graph"] },
];

export type CitationId = string;
export const CITATIONS_BY_ID: Record<string, Citation> = Object.fromEntries(CITATIONS.map((c) => [c.id, c]));

export function citationHref(c?: Citation): string | undefined {
  if (!c) return undefined;
  if (c.doi) return `https://doi.org/${c.doi}`;
  return c.url;
}
