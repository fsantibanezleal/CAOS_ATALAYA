import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Chrome / UI strings. Long-form page content (methodology, case context) is rendered by language-branching
// React components (see useLang), not stored here, to keep rich formatting readable.

const LANG_KEY = "caos.atalaya.lang";

export const SUPPORTED_LANGUAGES = ["en", "es"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

const en = {
  product: { name: "Atalaya", tagline: "A watchtower over Chile's open data" },
  nav: {
    app: "Explorer",
    introduction: "Introduction",
    methodology: "Methodology",
    implementation: "Implementation",
    experiments: "Experiments",
    benchmark: "Benchmark",
  },
  header: {
    github: "Source on GitHub",
    personal: "Personal site",
    portfolio: "Portfolio",
    source: "Data source",
    toggleTheme: "Toggle light / dark",
    toggleLanguage: "Switch language",
    lightThemeShort: "Light",
    darkThemeShort: "Dark",
  },
  footer: {
    lab: "CAOS research project",
    devBy: "Developed by Felipe Santibáñez-Leal",
    dataLabel: "Data",
    dataName: "Data Observatory",
    dataLicense: "CC-BY family",
    github: "GitHub",
    license: "MIT",
    version: "v",
    note: "Replay of committed artifacts; semantic search runs live in your browser.",
  },
  common: { loading: "Loading…", error: "Could not load", none: "No data", of: "of", showing: "Showing" },
  arch: {
    title: "Architecture · how it works",
    subtitle: "What runs where, the engines, and the data contracts · the whole system at a glance.",
    open: "Architecture / how it works",
    close: "Close",
    footer: "The offline pipeline mines the graph; the web replays committed artifacts and runs semantic search live.",
  },
  app: {
    caseSelector: "Analytical view",
    variants: "Variants",
    tabField: "View",
    tabLive: "Live (your browser)",
    tabCharts: "Compare",
    tabContext: "Context",
    category: "Category",
    engines: "Engines",
    stats: "Summary",
    readout: "Hover for values",
    reset: "Reset view",
    search: "Search datasets…",
    lane: "lane",
    lanePrecomputed: "replay",
    laneLive: "live",
  },
  ctx: {
    problem: "The question",
    components: "Components & variables",
    formalization: "Formalization",
    scope: "Scope & assumptions",
    variants: "What each variant shows",
    howto: "How to read & use this view",
  },
  live: {
    intro: "Type a query and search all datasets by meaning · the multilingual encoder runs in your browser (ONNX Runtime Web), no server. Or reweight the affinity evidences and watch the ranking recompute live.",
    badge: "computed live in your browser",
    query: "Semantic query",
    run: "Search",
    weights: "Evidence weights",
    wSem: "Semantic",
    wJoin: "Joinability",
    wStat: "Correlation",
    recompute: "Recompute affinity",
    loadingRuntime: "Loading the encoder (one-time download)…",
    running: "Encoding…",
    error: "Live run failed",
    firstRunNote: "The first search downloads the ONNX encoder once; later searches are instant.",
    fallbackTitle: "Encoder not loaded · dataset-similarity mode",
    fallbackBody: "Free-text search needs the ONNX encoder. Until it loads you can still explore 'datasets similar to this one' using the baked embeddings.",
  },
  viz: {
    datasets: "datasets",
    edges: "relations",
    nodes: "nodes",
    findings: "findings",
    weight: "strength",
    theme: "theme",
    origin: "origin",
    key: "join key",
    rho: "ρ (Spearman)",
    padj: "adj. p",
    containment: "containment",
    cosine: "cosine",
    score: "affinity",
    coverage: "coverage",
    year: "year",
    nulls: "null fraction",
    columns: "columns",
    rows: "rows",
  },
};

const es: typeof en = {
  product: { name: "Atalaya", tagline: "Una atalaya sobre los datos abiertos de Chile" },
  nav: {
    app: "Explorador",
    introduction: "Introducción",
    methodology: "Metodología",
    implementation: "Implementación",
    experiments: "Experimentos",
    benchmark: "Benchmark",
  },
  header: {
    github: "Código en GitHub",
    personal: "Sitio personal",
    portfolio: "Portafolio",
    source: "Fuente de datos",
    toggleTheme: "Cambiar claro / oscuro",
    toggleLanguage: "Cambiar idioma",
    lightThemeShort: "Claro",
    darkThemeShort: "Oscuro",
  },
  footer: {
    lab: "Proyecto de investigación CAOS",
    devBy: "Desarrollado por Felipe Santibáñez-Leal",
    dataLabel: "Datos",
    dataName: "Data Observatory",
    dataLicense: "familia CC-BY",
    github: "GitHub",
    license: "MIT",
    version: "v",
    note: "Replay de artefactos commiteados; la búsqueda semántica corre en vivo en tu navegador.",
  },
  common: { loading: "Cargando…", error: "No se pudo cargar", none: "Sin datos", of: "de", showing: "Mostrando" },
  arch: {
    title: "Arquitectura · cómo funciona",
    subtitle: "Qué corre dónde, los motores y los contratos de datos · todo el sistema de un vistazo.",
    open: "Arquitectura / cómo funciona",
    close: "Cerrar",
    footer: "El pipeline offline mina el grafo; la web reproduce artefactos commiteados y corre búsqueda semántica en vivo.",
  },
  app: {
    caseSelector: "Vista analítica",
    variants: "Variantes",
    tabField: "Vista",
    tabLive: "En vivo (tu navegador)",
    tabCharts: "Comparar",
    tabContext: "Contexto",
    category: "Categoría",
    engines: "Motores",
    stats: "Resumen",
    readout: "Al pasar el cursor para ver valores",
    reset: "Reiniciar vista",
    search: "Buscar datasets…",
    lane: "modo",
    lanePrecomputed: "replay",
    laneLive: "en vivo",
  },
  ctx: {
    problem: "La pregunta",
    components: "Componentes y variables",
    formalization: "Formalización",
    scope: "Alcance y supuestos",
    variants: "Qué muestra cada variante",
    howto: "Cómo leer y usar esta vista",
  },
  live: {
    intro: "Escribe una consulta y busca todos los datasets por significado · el codificador multilingüe corre en tu navegador (ONNX Runtime Web), sin servidor. O re-pondera las evidencias de afinidad y observa el ranking recomputarse en vivo.",
    badge: "calculado en vivo en tu navegador",
    query: "Consulta semántica",
    run: "Buscar",
    weights: "Pesos de evidencia",
    wSem: "Semántica",
    wJoin: "Unión",
    wStat: "Correlación",
    recompute: "Recomputar afinidad",
    loadingRuntime: "Cargando el codificador (descarga única)…",
    running: "Codificando…",
    error: "Falló la ejecución en vivo",
    firstRunNote: "La primera búsqueda descarga el codificador ONNX una vez; las siguientes son instantáneas.",
    fallbackTitle: "Codificador no cargado · modo similitud entre datasets",
    fallbackBody: "La búsqueda de texto libre necesita el codificador ONNX. Hasta que cargue puedes explorar 'datasets similares a este' con los embeddings precalculados.",
  },
  viz: {
    datasets: "datasets",
    edges: "relaciones",
    nodes: "nodos",
    findings: "hallazgos",
    weight: "fuerza",
    theme: "tema",
    origin: "origen",
    key: "clave de unión",
    rho: "ρ (Spearman)",
    padj: "p ajustada",
    containment: "contención",
    cosine: "coseno",
    score: "afinidad",
    coverage: "cobertura",
    year: "año",
    nulls: "fracción de nulos",
    columns: "columnas",
    rows: "filas",
  },
};

export function persistLanguage(lang: Language): void {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* ignore */
  }
}

function initialLang(): Language {
  try {
    const saved = localStorage.getItem(LANG_KEY) as Language | null;
    if (saved && SUPPORTED_LANGUAGES.includes(saved)) return saved;
  } catch {
    /* ignore */
  }
  return "en";
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, es: { translation: es } },
  lng: initialLang(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
