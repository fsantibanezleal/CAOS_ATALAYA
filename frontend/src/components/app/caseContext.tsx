import type { ReactNode } from "react";
import type { Language } from "@/i18n/config";
import { Equation, InlineMath } from "@/components/content/Equation";

// Per-case Context write-up, in the fixed bilingual order (the question, components & variables, formalization,
// scope & assumptions, what each variant shows, how to read & use). Each returns a <div className="prose">.

type Sec = { problem: ReactNode; components: ReactNode; formal: ReactNode; scope: ReactNode; variants: ReactNode; howto: ReactNode };

function block(lang: Language, s: Sec, es: Sec) {
  const c = lang === "es" ? es : s;
  const h = lang === "es"
    ? ["La pregunta", "Componentes y variables", "Formalización", "Alcance y supuestos", "Qué muestra cada variante", "Cómo leer y usar esta vista"]
    : ["The question", "Components & variables", "Formalization", "Scope & assumptions", "What each variant shows", "How to read & use this view"];
  return (
    <div className="prose">
      <h3>{h[0]}</h3>{c.problem}
      <h3>{h[1]}</h3>{c.components}
      <h3>{h[2]}</h3>{c.formal}
      <h3>{h[3]}</h3>{c.scope}
      <h3>{h[4]}</h3>{c.variants}
      <h3>{h[5]}</h3>{c.howto}
    </div>
  );
}

const li = (items: ReactNode[]) => <ul>{items.map((x, i) => <li key={i}>{x}</li>)}</ul>;

// ------------------------------------------------------------------ CART_map -------------------------------------
const CART_map = (lang: Language) => block(lang,
  {
    problem: <p>Where does each dataset sit in "meaning space", and which datasets are neighbours? A catalog of a thousand datasets has no map; this view builds one from the text of every dataset.</p>,
    components: li(["Nodes: one per profiled dataset.", "Position: a 2-D PCA projection of the dataset's multilingual sentence embedding (a 2D/3D toggle also orbits a 3-D PCA layout).", "Colour: the facet you choose (theme, origin, cluster, join keys, recency, null rate, or topic).", "Read-out: title, theme, publisher, size, keys, temporal span, null fraction, and the dataset's full list of OECD sub-categories (topics)."]),
    formal: <><p>Each dataset's title + description + column names is encoded to a vector <InlineMath tex="\mathbf{e}\in\mathbb{R}^{384}" /> by a multilingual MiniLM. We project to 2-D with PCA:</p><Equation tex="\mathbf{y}_i = W^\top (\mathbf{e}_i - \bar{\mathbf{e}}),\quad W=[\mathbf{w}_1,\mathbf{w}_2]" caption={lang === "es" ? "las dos primeras componentes principales de los embeddings" : "the top two principal components of the embeddings"} /></>,
    scope: <p><strong>Modeled:</strong> semantic proximity of dataset descriptions. <strong>Out of scope:</strong> row-level content (this is metadata + column-name semantics, not the values). <strong>Honesty:</strong> PCA keeps only the two directions of largest variance; datasets far apart in 2-D are dissimilar, but 2-D closeness can hide differences visible in the full 384-D space.</p>,
    variants: <p>The seven variants recolour the same points: by <em>theme</em> (the OECD area), <em>origin</em> (curated vs DOI), <em>cluster</em> (k-means over the embeddings), <em>join keys</em> (which entity key a dataset carries), <em>recency</em> (viridis over the latest year), <em>null rate</em> (data quality), and <em>topic</em> (the full 27-value OECD sub-category taxonomy, finer than the five top themes). The layout never changes, so you compare facets on a fixed map; a 2D/3D toggle switches between the flat SVG map and an orbitable 3-D PCA view.</p>,
    howto: <p>Look for tight colour clusters (a theme that is semantically coherent) and outliers (a dataset that sits far from its theme-mates). Hover any point to read the dataset; switch the colour facet to ask a different question of the same geography.</p>,
  },
  {
    problem: <p>¿Dónde se ubica cada dataset en el "espacio de significado" y cuáles son vecinos? Un catálogo de mil datasets no tiene mapa; esta vista construye uno a partir del texto de cada dataset.</p>,
    components: li(["Nodos: uno por dataset perfilado.", "Posición: proyección PCA 2-D del embedding multilingüe (un toggle 2D/3D también orbita un layout PCA 3-D).", "Color: la faceta que elijas (tema, origen, clúster, claves, actualidad, tasa de nulos o subcategoría).", "Lectura: título, tema, editor, tamaño, claves, extensión temporal, fracción de nulos, y la lista completa de subcategorías OECD (temas) del dataset."]),
    formal: <><p>El título + descripción + nombres de columnas de cada dataset se codifica a un vector <InlineMath tex="\mathbf{e}\in\mathbb{R}^{384}" /> con un MiniLM multilingüe. Proyectamos a 2-D con PCA:</p><Equation tex="\mathbf{y}_i = W^\top (\mathbf{e}_i - \bar{\mathbf{e}}),\quad W=[\mathbf{w}_1,\mathbf{w}_2]" caption="las dos primeras componentes principales de los embeddings" /></>,
    scope: <p><strong>Modelado:</strong> proximidad semántica de las descripciones. <strong>Fuera de alcance:</strong> el contenido a nivel de fila (esto es metadata + semántica de nombres de columnas, no los valores). <strong>Honestidad:</strong> PCA conserva solo las dos direcciones de mayor varianza; puntos lejanos en 2-D son distintos, pero cercanía en 2-D puede ocultar diferencias del espacio completo de 384-D.</p>,
    variants: <p>Las siete variantes recolorean los mismos puntos: por <em>tema</em>, <em>origen</em> (curado vs DOI), <em>clúster</em> (k-means sobre embeddings), <em>claves de unión</em>, <em>actualidad</em> (viridis sobre el último año), <em>tasa de nulos</em>, y <em>subcategoría</em> (la taxonomía OECD completa de 27 valores, más fina que los cinco temas). El layout no cambia, así comparas facetas sobre un mapa fijo; un toggle 2D/3D alterna entre el mapa plano SVG y una vista PCA 3-D orbitable.</p>,
    howto: <p>Busca clústers de color compactos (un tema semánticamente coherente) y outliers (un dataset lejos de sus pares). Pasa el cursor por cualquier punto para leer el dataset; cambia la faceta de color para hacer otra pregunta sobre la misma geografía.</p>,
  });

// generic builder for the rest (concise but real content)
const mk = (en: Sec, es: Sec) => (lang: Language) => block(lang, en, es);

const SEM_network = mk(
  { problem: <p>Which datasets describe the same kind of thing, purely from their text? This network links datasets whose embeddings are close.</p>,
    components: li(["Nodes: datasets. Edges: cosine similarity above a threshold. Node size: degree.", "Colour: theme, or the mined k-means cluster (toggle)."]),
    formal: <><p>The edge weight is the cosine of the two embeddings:</p><Equation tex="\text{sim}(i,j)=\frac{\mathbf{e}_i\cdot\mathbf{e}_j}{\lVert\mathbf{e}_i\rVert\,\lVert\mathbf{e}_j\rVert}" /></>,
    scope: <p><strong>Honesty:</strong> semantic similarity is topical, not causal or joinable. Two datasets can be neighbours here yet share no join key (see Joinability).</p>,
    variants: <p>The threshold variants raise the cosine cutoff (0.45 to 0.92): higher thresholds keep only the tightest topical pairs, so the graph thins to its strongest communities. The same graph renders five ways: <em>Clean 2D</em> (SVG), <em>Glow</em> (WebGL), <em>3D</em> (orbitable, the default), <em>Matrix</em> (a cluster-reordered adjacency, occlusion-free), and <em>Arc</em> (a 1-D diagram). A Colour-by toggle switches theme vs mined cluster, plus a Labels toggle and a Highlight-dataset search.</p>,
    howto: <p>Raise the threshold to find the most confidently related pairs; hover a node to list its neighbours with their cosine. Use it to discover datasets you did not know were related.</p> },
  { problem: <p>¿Qué datasets describen lo mismo, solo por su texto? Esta red une datasets con embeddings cercanos.</p>,
    components: li(["Nodos: datasets. Aristas: similitud coseno sobre un umbral. Tamaño: grado.", "Color: tema, o el clúster k-means minado (toggle)."]),
    formal: <><p>El peso de la arista es el coseno de los dos embeddings:</p><Equation tex="\text{sim}(i,j)=\frac{\mathbf{e}_i\cdot\mathbf{e}_j}{\lVert\mathbf{e}_i\rVert\,\lVert\mathbf{e}_j\rVert}" /></>,
    scope: <p><strong>Honestidad:</strong> la similitud semántica es temática, no causal ni unible. Dos datasets pueden ser vecinos aquí sin compartir clave de unión.</p>,
    variants: <p>Las variantes de umbral suben el coseno (0.45 a 0.92): umbrales altos dejan solo los pares más cercanos, adelgazando el grafo a sus comunidades fuertes. El mismo grafo se dibuja de cinco formas: <em>Limpio 2D</em> (SVG), <em>Glow</em> (WebGL), <em>3D</em> (orbitable, por defecto), <em>Matriz</em> (adyacencia reordenada por clúster, sin oclusión) y <em>Arco</em> (diagrama 1-D). Un toggle de color alterna tema vs clúster minado, más un toggle de etiquetas y una búsqueda de resaltado.</p>,
    howto: <p>Sube el umbral para hallar los pares más confiables; pasa el cursor por un nodo para ver sus vecinos con su coseno.</p> });

const JOIN = mk(
  { problem: <p>Which datasets can actually be <em>joined</em>? Two datasets are joinable when they share an entity key whose values overlap, so you can merge them for analysis.</p>,
    components: li(["Nodes: datasets carrying the key. Edges: high MinHash containment between the key columns.", "Evidence on each edge: the key, the containment estimate, the column names."]),
    formal: <><p>Joinability is set containment of the smaller key set in the larger, estimated from MinHash signatures:</p><Equation tex="C(A,B)=\frac{|A\cap B|}{|A|},\qquad |A\cap B|=\frac{J}{1+J}\,(|A|+|B|)" caption={"J = MinHash Jaccard estimate"} /></>,
    scope: <p><strong>Honesty:</strong> a shared key means the join is <em>possible</em>, not that the joined result is meaningful · that is what the Correlation view tests. Containment is estimated (MinHash), so near-threshold edges carry sampling error.</p>,
    variants: <p>The variants raise the containment threshold (0.5, 0.95). At 0.95 you keep only near-perfect foreign-key relationships.</p>,
    howto: <p>Raise the threshold to find clean join keys; hover a node to see which datasets it joins and on which column. This is the map of "what can I merge with what".</p> },
  { problem: <p>¿Qué datasets se pueden <em>unir</em> de verdad? Dos datasets son unibles cuando comparten una clave de entidad cuyos valores se solapan.</p>,
    components: li(["Nodos: datasets con la clave. Aristas: alta contención MinHash entre columnas clave.", "Evidencia por arista: la clave, la contención estimada, los nombres de columna."]),
    formal: <><p>La unibilidad es contención del conjunto menor en el mayor, estimada con MinHash:</p><Equation tex="C(A,B)=\frac{|A\cap B|}{|A|},\qquad |A\cap B|=\frac{J}{1+J}\,(|A|+|B|)" caption={"J = estimación Jaccard por MinHash"} /></>,
    scope: <p><strong>Honestidad:</strong> una clave compartida hace la unión <em>posible</em>, no significativa; eso lo prueba la vista de Correlación. La contención es estimada, así que aristas cerca del umbral tienen error de muestreo.</p>,
    variants: <p>Las variantes suben el umbral de contención (0.5, 0.95). En 0.95 quedan relaciones de clave foránea casi perfectas.</p>,
    howto: <p>Sube el umbral para hallar claves limpias; pasa el cursor por un nodo para ver con qué datasets une y por qué columna.</p> });

const CORR = mk(
  { problem: <p>Do two datasets, aligned on a shared entity (comuna or region), actually <em>correlate</em>? This is the payoff: cross-dataset relationships that survive a real significance test.</p>,
    components: li(["Rows: a pair of numeric indicators aligned on a shared key.", "ρ: Spearman rank correlation. p adj: Benjamini-Hochberg-adjusted permutation p-value. n: shared units."]),
    formal: <><p>We aggregate each indicator to the key level, rank-correlate, calibrate significance with a seeded permutation null, and control the false-discovery rate across the whole family:</p><Equation tex="\rho = \text{Spearman}(x,y),\quad p=\frac{1+\#\{|\rho^\ast|\ge|\rho|\}}{1+B},\quad \text{keep if } p_{(k)}\le \tfrac{k}{m}q" caption={"permutation null (B draws) + Benjamini-Hochberg at q=0.05"} /></>,
    scope: <p><strong>Honesty:</strong> correlation is not causation, and a shared driver (population, region) can induce it · the pipeline partials out common drivers and the negative control confirms shuffled alignments yield ~0 survivors. Only edges surviving FDR are shown.</p>,
    variants: <p>The variants raise the |ρ| floor (0.35, 0.80) and filter by sign (positive / negative only).</p>,
    howto: <p>Sort by ρ or adjusted p; the scatter plots each finding as ρ vs significance. Hover to see the exact columns and the number of aligned units behind the number.</p> },
  { problem: <p>¿Dos datasets, alineados sobre una entidad común (comuna o región), realmente <em>correlacionan</em>? Este es el premio: relaciones entre datasets que sobreviven a una prueba de significancia real.</p>,
    components: li(["Filas: un par de indicadores numéricos alineados sobre una clave común.", "ρ: correlación de Spearman. p aj: p de permutación ajustada por Benjamini-Hochberg. n: unidades comunes."]),
    formal: <><p>Agregamos cada indicador al nivel de la clave, correlacionamos por rangos, calibramos la significancia con un nulo de permutación sembrado, y controlamos la tasa de falsos descubrimientos en toda la familia:</p><Equation tex="\rho = \text{Spearman}(x,y),\quad p=\frac{1+\#\{|\rho^\ast|\ge|\rho|\}}{1+B},\quad \text{conservar si } p_{(k)}\le \tfrac{k}{m}q" caption={"nulo de permutación (B sorteos) + Benjamini-Hochberg a q=0.05"} /></>,
    scope: <p><strong>Honestidad:</strong> correlación no es causalidad, y un driver común (población, región) puede inducirla; el pipeline parcializa drivers comunes y el control negativo confirma que alineaciones barajadas dan ~0 sobrevivientes. Solo se muestran aristas que sobreviven FDR.</p>,
    variants: <p>Las variantes suben el piso de |ρ| (0.35, 0.80) y filtran por signo (solo positivas / negativas).</p>,
    howto: <p>Ordena por ρ o p ajustada; el scatter grafica cada hallazgo como ρ vs significancia. Pasa el cursor para ver las columnas exactas y el n detrás del número.</p> });

const GEO = mk(
  { problem: <p>How geographically grounded is the catalog? Which datasets can be placed on a comuna, a region, or a point, and where are the georeferenced ones?</p>,
    components: li(["Coverage bars: datasets per geographic key level.", "Point map: datasets with lat/lon, over a Chile bounding box, coloured by theme."]),
    formal: <p>Coverage is a simple count by the strongest geographic key detected per dataset (comuna CUT ≻ region ≻ point ≻ none). Points use the dataset's representative coordinate.</p>,
    scope: <p><strong>Honesty:</strong> a comuna/region key means the dataset can be mapped to that unit, not that it has been. Point coordinates are a single representative location, not full geometry.</p>,
    variants: <p>The variants filter to comuna-keyed, region-keyed, point-located, or any geo key, and switch the summary between dataset count and theme mix.</p>,
    howto: <p>Use the bars to gauge how much of the catalog is joinable to a Chilean administrative map; hover points to see which datasets carry coordinates.</p> },
  { problem: <p>¿Qué tan anclado geográficamente está el catálogo? ¿Qué datasets se ubican en una comuna, región o punto, y dónde están los georreferenciados?</p>,
    components: li(["Barras de cobertura: datasets por nivel de clave geográfica.", "Mapa de puntos: datasets con lat/lon sobre un bounding box de Chile, coloreados por tema."]),
    formal: <p>La cobertura es un conteo por la clave geográfica más fuerte detectada por dataset (comuna CUT ≻ región ≻ punto ≻ ninguna). Los puntos usan la coordenada representativa del dataset.</p>,
    scope: <p><strong>Honestidad:</strong> una clave comuna/región significa que el dataset se puede mapear a esa unidad, no que lo esté. Las coordenadas son una ubicación representativa, no geometría completa.</p>,
    variants: <p>Las variantes filtran a clave comuna, región, con coordenadas o cualquier clave geo, y cambian el resumen entre conteo y mezcla de temas.</p>,
    howto: <p>Usa las barras para dimensionar cuánto del catálogo es unible a un mapa administrativo chileno; pasa el cursor por los puntos para ver qué datasets llevan coordenadas.</p> });

const TIME = mk(
  { problem: <p>When do the datasets live in time, and where do their coverage windows overlap? Overlap in time is a precondition for any longitudinal cross-dataset analysis.</p>,
    components: li(["Histogram: how many datasets cover each year.", "Spans: a bar per dataset from its first to last year, coloured by theme."]),
    formal: <p>Each dataset's temporal span is <InlineMath tex="[y_{\min}, y_{\max}]" /> read from its year columns; the histogram counts, per year, the datasets whose span includes it.</p>,
    scope: <p><strong>Honesty:</strong> the span is inferred from detected year columns, so datasets without an explicit year are absent here even if they are dated in prose.</p>,
    variants: <p>The variants scope to all / comuna-keyed / region-keyed, restrict to recent windows (since 2015 / 2010), or sort by span length.</p>,
    howto: <p>Find the years with the densest coverage (best for a cross-sectional merge) and datasets with long spans (best for trends); hover a bar for its exact window.</p> },
  { problem: <p>¿Cuándo viven los datasets en el tiempo y dónde se solapan sus ventanas? El solape temporal es precondición de cualquier análisis longitudinal entre datasets.</p>,
    components: li(["Histograma: cuántos datasets cubren cada año.", "Extensiones: una barra por dataset desde su primer a su último año, coloreada por tema."]),
    formal: <p>La extensión temporal de cada dataset es <InlineMath tex="[y_{\min}, y_{\max}]" /> leída de sus columnas de año; el histograma cuenta, por año, los datasets cuya extensión lo incluye.</p>,
    scope: <p><strong>Honestidad:</strong> la extensión se infiere de columnas de año detectadas, así que datasets sin año explícito no aparecen aunque estén fechados en prosa.</p>,
    variants: <p>Las variantes acotan a todos / clave comuna / clave región, restringen a ventanas recientes (desde 2015 / 2010), u ordenan por extensión.</p>,
    howto: <p>Halla los años de mayor cobertura (mejores para un merge transversal) y datasets de extensión larga (mejores para tendencias); pasa el cursor por una barra para su ventana exacta.</p> });

const QC = mk(
  { problem: <p>How clean is the catalog, table by table? Before trusting any relation, you need to know null rates, table shapes, key coverage and the ingestion flags each table raised.</p>,
    components: li(["Distribution panel: the chosen quality metric across all tables.", "Table: per-dataset columns, rows, null fraction, key count, max cardinality."]),
    formal: <p>The null fraction is <InlineMath tex="\text{null} = \frac{\#\text{null cells}}{n_{\text{rows}}\cdot n_{\text{cols}}}" />; contract flags come from the ingestion contract (wide tables, high-null, duplicate headers, dropped columns).</p>,
    scope: <p><strong>Honesty:</strong> quality here is structural (shape, nulls, types), not semantic correctness of values · a clean-looking table can still contain wrong numbers.</p>,
    variants: <p>The variants switch the metric: null fraction, wide tables, contract flags, type mix, key coverage, cardinality.</p>,
    howto: <p>Sort the table to find the messiest datasets; check the type/flag distributions to understand systematic issues before joining or correlating.</p> },
  { problem: <p>¿Qué tan limpio está el catálogo, tabla por tabla? Antes de confiar en cualquier relación necesitas saber tasas de nulos, formas de tabla, cobertura de claves y los flags que cada tabla levantó en ingesta.</p>,
    components: li(["Panel de distribución: la métrica de calidad elegida en todas las tablas.", "Tabla: por dataset columnas, filas, fracción de nulos, n.º de claves, cardinalidad máxima."]),
    formal: <p>La fracción de nulos es <InlineMath tex="\text{null} = \frac{\#\text{celdas nulas}}{n_{\text{filas}}\cdot n_{\text{cols}}}" />; los flags vienen del contrato de ingesta (tablas anchas, muchos nulos, headers duplicados, columnas eliminadas).</p>,
    scope: <p><strong>Honestidad:</strong> la calidad aquí es estructural (forma, nulos, tipos), no la corrección semántica de los valores; una tabla limpia puede tener números equivocados.</p>,
    variants: <p>Las variantes cambian la métrica: fracción de nulos, tablas anchas, flags de contrato, mezcla de tipos, cobertura de claves, cardinalidad.</p>,
    howto: <p>Ordena la tabla para hallar los datasets más sucios; revisa las distribuciones de tipos/flags para entender problemas sistemáticos antes de unir o correlacionar.</p> });

const AFF = mk(
  { problem: <p>Given three different reasons two datasets might be related (they read alike, they join, they correlate), which pairs are related when you fuse the evidence? This is Atalaya's novel proposal.</p>,
    components: li(["Rows: dataset pairs ranked by a fused affinity score.", "Stacked bar: the contribution of each evidence (semantic / joinability / correlation).", "Live sliders: reweight the three evidences and the ranking recomputes in your browser."]),
    formal: <><p>Each raw evidence is passed through its null CDF (a percentile vs random pairs), then fused with reliability-weighted evidences that down-weight a lone signal:</p><Equation tex="S(A,B)=\frac{\sum_e w_e\, r_e\, f_e}{\sum_e w_e\, r_e},\quad f_e=F^{\text{null}}_e(\text{signal}_e)" caption={"calibrated multi-evidence affinity; r_e discounts contradicted evidence"} /></>,
    scope: <p><strong>Honesty:</strong> the score is a ranking aid, not a truth value; it is only as good as its three evidences, which is why every term is shown. Calibration is against the corpus, so scores are relative to this catalog.</p>,
    variants: <p>The presets bias the weights (balanced, semantic-led, join-led, correlation-led) and limit to the top pairs or a minimum score; the live sliders let you set any weighting.</p>,
    howto: <p>Move the sliders to see which pairs rise under each philosophy; read the stacked bar to understand <em>why</em> a pair ranks where it does. Use it to shortlist datasets worth merging.</p> },
  { problem: <p>Dadas tres razones distintas por las que dos datasets podrían relacionarse (se leen parecido, se unen, correlacionan), ¿qué pares están relacionados al fusionar la evidencia? Esta es la propuesta novel de Atalaya.</p>,
    components: li(["Filas: pares de datasets rankeados por un score de afinidad fusionado.", "Barra apilada: la contribución de cada evidencia (semántica / unión / correlación).", "Sliders en vivo: re-pondera las tres evidencias y el ranking se recomputa en tu navegador."]),
    formal: <><p>Cada evidencia cruda pasa por su CDF nula (un percentil vs pares al azar), luego se fusiona con pesos de fiabilidad que descuentan una señal aislada:</p><Equation tex="S(A,B)=\frac{\sum_e w_e\, r_e\, f_e}{\sum_e w_e\, r_e},\quad f_e=F^{\text{null}}_e(\text{señal}_e)" caption={"afinidad multi-evidencia calibrada; r_e descuenta evidencia contradicha"} /></>,
    scope: <p><strong>Honestidad:</strong> el score es una ayuda de ranking, no un valor de verdad; vale lo que sus tres evidencias, por eso se muestra cada término. La calibración es contra el corpus, así que los scores son relativos a este catálogo.</p>,
    variants: <p>Los presets sesgan los pesos (balanceado, semántico, unión, correlación) y limitan al top o a un score mínimo; los sliders en vivo permiten cualquier ponderación.</p>,
    howto: <p>Mueve los sliders para ver qué pares suben bajo cada filosofía; lee la barra apilada para entender <em>por qué</em> un par rankea donde rankea. Úsalo para preseleccionar datasets que valga la pena unir.</p> });

const OVERVIEW = mk(
  { problem: <p>What is in the catalog, in aggregate? Composition by theme, origin, license, format and download tier, plus how much data actually lands on disk.</p>,
    components: li(["Faceted bars over all 1017 datasets.", "Size breakdown by download tier from the harvest report."]),
    formal: <p>Simple counts per facet over the full catalog; the size breakdown sums known resource bytes per download tier (gov-direct, DOI-archive, geoservice, no-url, broken).</p>,
    scope: <p><strong>Honesty:</strong> ~44% of resources lack size metadata, so the byte totals are lower bounds; the tier split reflects how the catalog references data, most of which lives on external sites.</p>,
    variants: <p>The variants switch the facet: theme, origin, license, format, download tier, or size on disk.</p>,
    howto: <p>Use it to understand the catalog's shape and licensing before diving in, and to see why only the gov-direct tier is mirrored locally.</p> },
  { problem: <p>¿Qué hay en el catálogo, en agregado? Composición por tema, origen, licencia, formato y tier de descarga, más cuántos datos aterrizan en disco.</p>,
    components: li(["Barras por faceta sobre los 1017 datasets.", "Desglose de tamaño por tier de descarga desde el reporte de harvest."]),
    formal: <p>Conteos por faceta sobre el catálogo completo; el desglose de tamaño suma los bytes conocidos por tier (gob-directo, archivo-DOI, geoservicio, sin-url, roto).</p>,
    scope: <p><strong>Honestidad:</strong> ~44% de los recursos no tienen metadata de tamaño, así que los totales son cotas inferiores; el split por tier refleja cómo el catálogo referencia los datos, la mayoría en sitios externos.</p>,
    variants: <p>Las variantes cambian la faceta: tema, origen, licencia, formato, tier de descarga o tamaño en disco.</p>,
    howto: <p>Úsalo para entender la forma y el licenciamiento del catálogo antes de entrar, y para ver por qué solo el tier gob-directo se espeja localmente.</p> });

export const CASE_CONTEXT: Record<string, (lang: Language) => ReactNode> = {
  CART_map, CAT_overview: OVERVIEW, SEM_network, JOIN_comuna: JOIN, JOIN_region: JOIN,
  CORR_findings: CORR, CORR_network: CORR, GEO_coverage: GEO, TIME_coverage: TIME,
  QC_census: QC, AFF_top: AFF,
};
