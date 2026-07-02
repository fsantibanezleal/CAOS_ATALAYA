/**
 * Architecture / "How it works" modal content (ADR-0058) — Atalaya.
 *
 * Five tabs, each pairing ONE hand-authored, theme-aware SVG (public/svg/tech/) with a compact bilingual
 * explanation at complete depth. The SVGs use the app's CSS-variable palette tokens (zero hardcoded hex) and are
 * fetched + inlined by ArchitectureModal so they inherit the light/dark theme. Copy is product-specific.
 */
import type { Language } from "@/i18n/config";

export interface ArchTab {
  id: string;
  svg: string;
  label: Record<Language, string>;
  body: Record<Language, string[]>;
}

export const ARCH_TABS: ArchTab[] = [
  {
    id: "app",
    svg: "01-the-app.svg",
    label: { en: "The app", es: "La app" },
    body: {
      en: [
        "Atalaya is a public relation explorer over Chile's Data Observatory open catalog. It harvests the catalog, profiles every downloadable table, and mines five kinds of cross-dataset relation into a knowledge graph that the web app replays and lets you explore.",
        "Design-build lifecycle: research the catalog backend and the relation-mining methods → harvest the direct-file subset into an out-of-git scratch → run the staged offline pipeline in a local .venv (profile, embed, mine, validate) → commit the compact web artifacts (git-as-data) → build the SPA (Vite) → publish static. One engine produces the graph; the web replays it and runs semantic search live in the browser.",
        "The offline pipeline + its committed artifacts ARE the product; the web app is a read-only projection plus two genuinely live client-side computations (semantic search and affinity reweighting).",
      ],
      es: [
        "Atalaya es un explorador público de relaciones sobre el catálogo abierto del Data Observatory de Chile. Cosecha el catálogo, perfila cada tabla descargable y mina cinco clases de relación entre datasets en un grafo de conocimiento que la app web reproduce y deja explorar.",
        "Ciclo de diseño-construcción: investigar el backend del catálogo y los métodos de minería → cosechar el subconjunto de archivos directos a un scratch fuera de git → correr el pipeline offline por etapas en un .venv local (perfilar, embeddings, minar, validar) → commitear los artefactos web compactos (git-as-data) → construir la SPA (Vite) → publicar estático. Un motor produce el grafo; la web lo reproduce y corre búsqueda semántica en vivo en el navegador.",
        "El pipeline offline + sus artefactos commiteados SON el producto; la app web es una proyección de solo lectura más dos cómputos genuinamente en vivo del lado cliente (búsqueda semántica y re-pesado de afinidad).",
      ],
    },
  },
  {
    id: "lanes",
    svg: "02-lanes.svg",
    label: { en: "Lanes · web / offline", es: "Carriles · web / offline" },
    body: {
      en: [
        "Three lanes, cleanly separated. LIVE (web): the multilingual MiniLM encoder runs in the browser via onnxruntime-web / transformers.js (WASM) for free-text semantic search, and the novel affinity score recomputes in pure JS when you move the evidence weights — both sub-millisecond, no server.",
        "OFFLINE / COMPUTE (.venv): the heavy SOTA engines that have no place in a browser — polars + DuckDB (tabular), sentence-transformers + torch (embeddings), datasketch (MinHash joinability), phik + SciPy (correlation), LightGBM, rustworkx (graph) — run the staged pipeline and export the ONNX encoder. This lane is local-only; the venv never ships.",
        "REPLAY is the shared fallback: the web loads the committed compact artifacts (catalog, graph, per-case payloads, embeddings) and never recomputes the mine. The measured lane gate records, per case, whether a computation is live-eligible, so the app never mislabels what it is doing.",
      ],
      es: [
        "Tres carriles, limpiamente separados. LIVE (web): el codificador MiniLM multilingüe corre en el navegador vía onnxruntime-web / transformers.js (WASM) para búsqueda semántica de texto libre, y el score de afinidad novel se recomputa en JS puro al mover los pesos de evidencia — ambos sub-milisegundo, sin servidor.",
        "OFFLINE / COMPUTE (.venv): los motores SOTA pesados sin lugar en un navegador — polars + DuckDB (tabular), sentence-transformers + torch (embeddings), datasketch (unibilidad MinHash), phik + SciPy (correlación), LightGBM, rustworkx (grafo) — corren el pipeline por etapas y exportan el codificador ONNX. Este carril es solo local; el venv nunca se despliega.",
        "REPLAY es el respaldo común: la web carga los artefactos compactos commiteados (catálogo, grafo, payloads por caso, embeddings) y nunca recomputa la mina. La compuerta de carril medida registra, por caso, si un cómputo es elegible en vivo, así la app nunca etiqueta mal lo que hace.",
      ],
    },
  },
  {
    id: "webapp",
    svg: "03-web-flow.svg",
    label: { en: "Web-app flow", es: "Flujo de la app" },
    body: {
      en: [
        "The SPA (React 19 + Vite) has six pages: Explorer (the workbench), Introduction, Methodology, Implementation, Experiments and Benchmark. The Explorer lands directly on the tool: one tab per analytical case, each a genuine domain view (map, graph, findings, coverage, timeline, quality, affinity, overview).",
        "Each case is a workbench with a variant bar (real regime knobs: colour-by, join key, threshold, weights) and four sub-tabs — View (the interactive viz), Live (in-browser semantic search), Compare (how each variant changes the result), and Context (the bilingual write-up with KaTeX). Variant switching is client-side from a single payload, so it is instant and never recomputes.",
        "At build time copy-data.mjs overlays the committed data/derived into the SPA and inlines the Pyodide-safe Python for the live lane. The static site publishes to GitHub Pages — no backend, no database.",
      ],
      es: [
        "La SPA (React 19 + Vite) tiene seis páginas: Explorador (el workbench), Introducción, Metodología, Implementación, Experimentos y Benchmark. El Explorador aterriza directo en la herramienta: una pestaña por caso analítico, cada una una vista de dominio genuina (mapa, grafo, hallazgos, cobertura, línea de tiempo, calidad, afinidad, resumen).",
        "Cada caso es un workbench con una barra de variantes (perillas de régimen reales: color-por, clave de unión, umbral, pesos) y cuatro sub-pestañas — Vista (la viz interactiva), En vivo (búsqueda semántica en el navegador), Comparar (cómo cada variante cambia el resultado) y Contexto (el texto bilingüe con KaTeX). El cambio de variante es del lado cliente desde un solo payload, así es instantáneo y nunca recomputa.",
        "En el build, copy-data.mjs superpone el data/derived commiteado en la SPA e inlinea el Python Pyodide-safe para el carril en vivo. El sitio estático se publica en GitHub Pages — sin backend, sin base de datos.",
      ],
    },
  },
  {
    id: "science",
    svg: "04-the-science.svg",
    label: { en: "The science", es: "La ciencia" },
    body: {
      en: [
        "Relations are mined, not asserted. SEMANTIC: MiniLM sentence embeddings, cosine above a threshold. JOINABLE: MinHash signatures of key columns, ranked by set containment (a small table joins into a big one when its keys are contained), following the Auctus/Lazo/LSH-Ensemble idea. SPATIAL: shared comuna/region keys or coordinates in the same area. SAME_SOURCE: shared publisher.",
        "CORRELATES is the careful one: two indicators aligned on a shared entity key, Spearman rank correlation, significance calibrated by a seeded permutation null (not a normality assumption), the false-discovery rate controlled with Benjamini-Hochberg across the whole family, and common drivers partialled out. A negative control re-mines shuffled alignments and confirms ~0 survivors — the honest proof the findings are real.",
        "The novel proposal fuses the three orthogonal evidences into a Calibrated Multi-Evidence Affinity: each raw signal is passed through its empirical null CDF (a percentile vs random pairs) and combined with reliability weights that discount an evidence contradicted by the others. Every term is reported, so the score is auditable, and it recomputes live when you reweight.",
      ],
      es: [
        "Las relaciones se minan, no se afirman. SEMÁNTICA: embeddings de oraciones MiniLM, coseno sobre un umbral. UNIBLE: firmas MinHash de columnas clave, rankeadas por contención de conjuntos (una tabla pequeña se une a una grande cuando sus claves están contenidas), siguiendo la idea Auctus/Lazo/LSH-Ensemble. ESPACIAL: claves comuna/región compartidas o coordenadas en la misma zona. SAME_SOURCE: editor compartido.",
        "CORRELATES es la cuidadosa: dos indicadores alineados por una clave de entidad compartida, correlación de rangos de Spearman, significancia calibrada por un nulo de permutación sembrado (no un supuesto de normalidad), la tasa de falsos descubrimientos controlada con Benjamini-Hochberg en toda la familia, y drivers comunes parcializados. Un control negativo re-mina alineaciones barajadas y confirma ~0 sobrevivientes — la prueba honesta de que los hallazgos son reales.",
        "La propuesta novel fusiona las tres evidencias ortogonales en una Afinidad Multi-Evidencia Calibrada: cada señal cruda pasa por su CDF nula empírica (un percentil vs pares al azar) y se combina con pesos de fiabilidad que descuentan una evidencia contradicha por las demás. Cada término se reporta, así el score es auditable, y se recomputa en vivo al re-ponderar.",
      ],
    },
  },
  {
    id: "contracts",
    svg: "05-data-contracts.svg",
    label: { en: "Data contracts", es: "Contratos de datos" },
    body: {
      en: [
        "Two enforced contracts. Contract 1 (ingestion, raw → pipeline): io/contract.py accepts any tabular file that meets minimum quality bounds, with an explicit reject/drop/flag outlier policy and encoding/separator sniffing. This is the bring-your-own-data gate; the download-tier classifier upstream ensures only mirrorable gov files are fetched, never DOI landing pages.",
        "Contract 2 (artifact, pipeline → web): core/manifest.py writes a versioned per-case manifest (category, engines used, artifact pointer + byte size, lane verdict, quality flags, stats). A TypeScript type mirrors it so any drift fails the build, and a CI guard verifies every manifest points at an artifact of the recorded size.",
        "There is no runtime database — the data layer is the git history (git-as-data). Heavy raw data and models stay out-of-git on a scratch volume; only the compact derived artifacts are committed. The full knowledge graph is also queryable by any agent through the in-repo read-only MCP server (find_related, join_path, correlations_for, search_columns).",
      ],
      es: [
        "Dos contratos exigidos. Contrato 1 (ingesta, raw → pipeline): io/contract.py acepta cualquier archivo tabular que cumpla cotas mínimas de calidad, con política de outliers explícita rechazar/eliminar/marcar y detección de codificación/separador. Es la puerta de trae-tus-propios-datos; el clasificador de tier de descarga aguas arriba asegura que solo se bajen archivos de gobierno espejables, nunca landing pages DOI.",
        "Contrato 2 (artefacto, pipeline → web): core/manifest.py escribe un manifiesto versionado por caso (categoría, motores usados, puntero al artefacto + tamaño en bytes, veredicto de carril, flags de calidad, estadísticas). Un tipo TypeScript lo espeja, así cualquier deriva rompe el build, y un guard de CI verifica que cada manifiesto apunte a un artefacto del tamaño registrado.",
        "No hay base de datos en runtime — la capa de datos es la historia de git (git-as-data). Los datos crudos pesados y los modelos quedan fuera de git en un volumen scratch; solo se comprometen los artefactos derivados compactos. El grafo de conocimiento completo también es consultable por cualquier agente vía el servidor MCP de solo lectura incluido (find_related, join_path, correlations_for, search_columns).",
      ],
    },
  },
];
