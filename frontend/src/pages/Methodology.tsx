import { useLang } from "@/lib/useLang";
import { SubTabs } from "@/components/content/SubTabs";
import { Equation, InlineMath } from "@/components/content/Equation";
import { Refs } from "@/components/content/Cite";

export default function Methodology() {
  const lang = useLang();
  const es = lang === "es";
  const refsLabel = es ? "Refs:" : "Refs:";

  return (
    <div className="page-body">
      <div className="page-head">
        <h1>{es ? "Metodología" : "Methodology"}</h1>
        <p className="lede">{es
          ? "Cada familia de método que Atalaya usa, con su matemática, sus supuestos y cuándo funciona o falla."
          : "Every method family Atalaya uses, with its mathematics, assumptions, and when it works or fails."}</p>
      </div>
      <SubTabs ariaLabel="methodology" tabs={[
        {
          id: "embed", label: es ? "Embeddings y cartografía" : "Embeddings & cartography",
          content: (
            <div className="prose measure">
              <p>{es ? "Cada dataset se representa por su texto (título, descripción, nombres de columnas) codificado con un modelo de oraciones multilingüe destilado (MiniLM), que mapea texto a un vector de 384 dimensiones donde la cercanía coseno refleja similitud de significado, en español e inglés." : "Each dataset is represented by its text (title, description, column names) encoded with a distilled multilingual sentence model (MiniLM), mapping text to a 384-dimensional vector where cosine proximity reflects meaning similarity, across Spanish and English."}</p>
              <Equation tex="\text{sim}(i,j)=\cos(\mathbf{e}_i,\mathbf{e}_j)=\frac{\mathbf{e}_i\cdot\mathbf{e}_j}{\lVert\mathbf{e}_i\rVert\,\lVert\mathbf{e}_j\rVert}" />
              <p>{es ? "Para el mapa, proyectamos con PCA (las dos componentes de mayor varianza); para agrupar, k-means sobre los embeddings." : "For the map we project with PCA (the two highest-variance components); to group, k-means over the embeddings."}</p>
              <p><strong>{es ? "Cuándo falla:" : "When it fails:"}</strong> {es ? "descripciones pobres o genéricas dan embeddings poco informativos; PCA a 2-D descarta estructura." : "poor or generic descriptions yield uninformative embeddings; 2-D PCA discards structure."}</p>
              <Refs ids={["reimers2019", "reimers2020multi", "wang2020minilm", "pearson1901", "lloyd1982"]} label={refsLabel} />
            </div>
          ),
        },
        {
          id: "join", label: es ? "Unibilidad" : "Joinability",
          content: (
            <div className="prose measure">
              <p>{es ? "Dos datasets son unibles si comparten una columna clave cuyos conjuntos de valores se solapan. En vez de comparar valores directamente (caro entre miles de columnas), estimamos el solape con firmas MinHash y medimos contención, no Jaccard, porque una tabla pequeña se une a una grande cuando sus claves están contenidas en la grande aunque el Jaccard sea diminuto." : "Two datasets are joinable if they share a key column whose value sets overlap. Instead of comparing values directly (costly across thousands of columns), we estimate overlap with MinHash signatures and measure containment, not Jaccard, because a small table joins into a big one when its keys are contained in the big one even if Jaccard is tiny."}</p>
              <Equation tex="J(A,B)=\frac{|A\cap B|}{|A\cup B|},\qquad C(A,B)=\frac{|A\cap B|}{|A|}=\frac{J(1+ \tfrac{|B|}{|A|})}{1+J}" caption={es ? "Jaccard (MinHash) y contención derivada" : "Jaccard (MinHash) and derived containment"} />
              <p><strong>{es ? "Cuándo falla:" : "When it fails:"}</strong> {es ? "claves con formato distinto (códigos vs nombres de comuna) no solapan aunque sean la misma entidad; por eso normalizamos claves de entidad primero." : "keys in different formats (codes vs comuna names) do not overlap even for the same entity; that is why we normalize entity keys first."}</p>
              <Refs ids={["broder1997", "zhu2016lshensemble", "leskovec2020", "castro2019auctus"]} label={refsLabel} />
            </div>
          ),
        },
        {
          id: "corr", label: es ? "Minería de correlaciones" : "Correlation mining",
          content: (
            <div className="prose measure">
              <p>{es ? "Cuando dos datasets comparten una clave de entidad fuerte (comuna o región), agregamos cada indicador numérico al nivel de la clave y medimos correlación de rangos de Spearman, robusta a no-linealidad monótona y outliers." : "When two datasets share a strong entity key (comuna or region), we aggregate each numeric indicator to the key level and measure Spearman rank correlation, robust to monotone nonlinearity and outliers."}</p>
              <Equation tex="\rho = 1 - \frac{6\sum_i d_i^2}{n(n^2-1)},\quad d_i = \operatorname{rank}(x_i)-\operatorname{rank}(y_i)" />
              <p>{es ? "La significancia se calibra con un nulo de permutación sembrado (no una aproximación t que asume normalidad), y la tasa de falsos descubrimientos se controla con Benjamini-Hochberg sobre toda la familia de pruebas:" : "Significance is calibrated with a seeded permutation null (not a t-approximation assuming normality), and the false-discovery rate is controlled with Benjamini-Hochberg over the whole family of tests:"}</p>
              <Equation tex="\text{keep } (k)\iff p_{(k)}\le \frac{k}{m}\,q,\quad q=0.05" />
              <p>{es ? "Además parcializamos un driver común (p. ej. población o región) para descartar correlaciones espurias:" : "We also partial out a common driver (e.g. population or region) to discard spurious correlations:"} <InlineMath tex="\rho_{xy\cdot z}=\dfrac{\rho_{xy}-\rho_{xz}\rho_{yz}}{\sqrt{(1-\rho_{xz}^2)(1-\rho_{yz}^2)}}" />.</p>
              <p><strong>{es ? "Cuándo falla:" : "When it fails:"}</strong> {es ? "pocas unidades comunes (n bajo) dan poca potencia; correlación no implica causalidad." : "few shared units (low n) give low power; correlation does not imply causation."}</p>
              <Refs ids={["spearman1904", "good2000", "bh1995", "baak2020"]} label={refsLabel} />
            </div>
          ),
        },
        {
          id: "affinity", label: es ? "Afinidad (novel)" : "Affinity (novel)",
          content: (
            <div className="prose measure">
              <p>{es ? "La propuesta más allá del estado del arte: en vez de rankear relación por una sola señal (contención, como Auctus/Lazo; o coseno, como la búsqueda semántica; o correlación), Atalaya fusiona las tres en un score de afinidad calibrado. Cada evidencia cruda pasa por su CDF nula (percentil frente a pares al azar), de modo que el score significa más fuerte que el azar, no un número grande:" : "The beyond-state-of-the-art proposal: instead of ranking relatedness by a single signal (containment, like Auctus/Lazo; or cosine, like semantic search; or correlation), Atalaya fuses all three into a calibrated affinity score. Each raw evidence passes through its null CDF (a percentile against random pairs), so the score means stronger than chance, not a big number:"}</p>
              <Equation tex="S(A,B)=\frac{\sum_{e} w_e\, r_e\, f_e}{\sum_{e} w_e\, r_e},\qquad f_e=F^{\text{null}}_e(\text{signal}_e)" caption={es ? "e ∈ {semántica, unión, correlación}" : "e ∈ {semantic, join, correlation}"} />
              <p>{es ? "Los pesos de fiabilidad r_e descuentan una evidencia que contradice a las demás (una alta similitud semántica sin ninguna unibilidad es una coincidencia temática débil):" : "The reliability weights r_e down-weight an evidence that contradicts the others (a high semantic similarity with no joinability is a weak topical coincidence):"}</p>
              <Equation tex="r_{\text{sem}}=0.6+0.4\max(f_{\text{join}},f_{\text{stat}}),\; r_{\text{join}}=0.85+0.15\max(f_{\text{sem}},f_{\text{stat}}),\; r_{\text{stat}}=0.5+0.5\,f_{\text{join}}" />
              <p>{es ? "Es interpretable (cada término se reporta y se ve en la barra apilada) y ajustable en vivo (los pesos se mueven en el navegador). No es un valor de verdad, es una ayuda de ranking auditable." : "It is interpretable (every term is reported and shown in the stacked bar) and live-adjustable (the weights move in the browser). It is not a truth value, it is an auditable ranking aid."}</p>
              <Refs ids={["castro2019auctus", "zhu2016lshensemble", "reimers2020multi", "bh1995"]} label={refsLabel} />
            </div>
          ),
        },
        {
          id: "contracts", label: es ? "Contratos y perfilado" : "Contracts & profiling",
          content: (
            <div className="prose measure">
              <p>{es ? "El contrato de ingesta acepta cualquier tabla que cumpla cotas mínimas de calidad (rechaza ilegibles/vacías/matrices; marca anchas/muy nulas; elimina columnas todo-nulas), con política de outliers explícita, nunca coerción silenciosa. El perfilado extrae por columna: tipo, nulos, cardinalidad, estadísticas y una firma MinHash; y detecta claves de entidad chilenas (CUT comuna, región, año, lat/lon, RUT) exigiendo pista de encabezado Y forma de valor, para no inventar claves." : "The ingestion contract accepts any table meeting minimum quality bounds (rejects unreadable/empty/matrix dumps; flags wide/high-null; drops all-null columns), with an explicit outlier policy, never silent coercion. Profiling extracts per column: dtype, nulls, cardinality, statistics and a MinHash signature; and detects Chilean entity keys (comuna CUT, region, year, lat/lon, RUT) requiring BOTH a header hint AND a value shape, so no false keys."}</p>
              <p>{es ? "Esto es lo que hace a Atalaya aplicable a datos nuevos: apúntalo a otra tabla y el mismo contrato + perfilado la integran." : "This is what makes Atalaya applicable to new data: point it at another table and the same contract + profiling integrate it."}</p>
              <Refs ids={["wilkinson2016fair", "baak2020"]} label={refsLabel} />
            </div>
          ),
        },
        {
          id: "validation", label: es ? "Validación" : "Validation",
          content: (
            <div className="prose measure">
              <p>{es ? "La pregunta honesta no es si hallamos relaciones, sino si son más fuertes que un mundo nulo. El control negativo re-mina correlaciones sobre alineaciones barajadas y verifica que casi ninguna sobrevive al mismo nulo + FDR (una tasa empírica de falsos descubrimientos). También medimos coherencia de vecinos semánticos (fracción del top-k que comparte tema) y cordura de unibilidad." : "The honest question is not whether we find relations, but whether they are stronger than a null world. The negative control re-mines correlations on shuffled alignments and verifies that almost none survive the same null + FDR (an empirical false-discovery rate). We also measure semantic-neighbour coherence (fraction of the top-k sharing a theme) and joinability sanity."}</p>
              <p>{es ? "Los resultados reales de estos controles se muestran en Experimentos y Benchmark, leídos directamente de los artefactos horneados." : "The real results of these controls are shown on Experiments and Benchmark, read directly from the baked artifacts."}</p>
              <Refs ids={["good2000", "bh1995", "newman2006modularity"]} label={refsLabel} />
            </div>
          ),
        },
      ]} />
    </div>
  );
}
