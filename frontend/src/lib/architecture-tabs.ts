/**
 * Architecture / "How it works" modal content (ADR-0058) — CAOS_SIMLAB.
 *
 * Five tabs, each pairing ONE hand-authored, theme-aware SVG (public/svg/tech/) with a compact bilingual
 * explanation at COMPLETE depth. CAOS_SIMLAB is a non-shell app (its own Layout), so it implements the
 * ADR-0058 pattern directly. The SVGs use the app's CSS-variable palette tokens (zero hardcoded hex) and are
 * fetched + inlined by ArchitectureModal so they inherit the light/dark theme.
 *
 * The diagrams + copy are the per-product content; the modal chrome is generic.
 */
import type { Language } from "@/i18n/config";

export interface ArchTab {
  id: string;
  /** SVG file under public/svg/tech/. */
  svg: string;
  label: Record<Language, string>;
  /** Paragraphs (rendered as <p>), bilingual. */
  body: Record<Language, string[]>;
}

export const ARCH_TABS: ArchTab[] = [
  {
    id: "app",
    svg: "01-overview.svg",
    label: { en: "The app", es: "La app" },
    body: {
      en: [
        "CAOS_SIMLAB is a public, didactic, library-led lab for four simulation families — Discrete-Event Simulation (DES), Agent-Based Modeling (ABM), Optimization / Operations Research, and Monte-Carlo. Each of the 11 worked scenarios is solved with the best DEDICATED tool for its problem type (SimPy, Ciw, Mesa 3, OR-Tools, PyVRP, NetworkX, joblib, SciPy), never a hand-rolled stand-in.",
        "Design-build lifecycle: research and decide the right tool per problem → implement the scenario once in the shared engine simlab/scenarios/<id>.py → run the precompute pipeline in the local .venv → commit the seeded trace + manifest (git-as-data) → build the SPA (Vite) → publish to GitHub Pages. One engine drives the notebooks, the offline pipeline and the live web app, so what you learn is what runs.",
        "The shared simlab/ package + its committed artifacts ARE the product; the web app replays them and, for the light scenarios, re-runs the very same Python in your browser.",
      ],
      es: [
        "CAOS_SIMLAB es un laboratorio público, didáctico y guiado-por-librerías para cuatro familias de simulación — eventos discretos (DES), basada en agentes (ABM), optimización / investigación de operaciones y Monte-Carlo. Cada uno de los 11 casos se resuelve con la herramienta DEDICADA correcta para su tipo de problema (SimPy, Ciw, Mesa 3, OR-Tools, PyVRP, NetworkX, joblib, SciPy), nunca una imitación casera.",
        "Ciclo de diseño-construcción: investigar y decidir la herramienta correcta por problema → implementar el escenario una vez en el motor compartido simlab/scenarios/<id>.py → correr el pipeline de precómputo en el .venv local → commitear la traza sembrada + el manifest (git-as-data) → construir la SPA (Vite) → publicar en GitHub Pages. Un solo motor mueve los notebooks, el pipeline offline y la app web, así que lo que aprendes es lo que corre.",
        "El paquete compartido simlab/ + sus artefactos commiteados SON el producto; la app web los reproduce y, para los escenarios livianos, re-ejecuta el mismo Python en tu navegador.",
      ],
    },
  },
  {
    id: "lanes",
    svg: "02-lanes.svg",
    label: { en: "Lanes · web / offline", es: "Carriles · web / offline" },
    body: {
      en: [
        "The core design is two lanes, and the choice is MEASURED, not guessed. LIVE (web): a Pyodide Web Worker loads numpy/pandas/scipy/networkx/sqlite3 and micropip-installs simpy/ciw/mesa/joblib, then runs the real simlab engine via simlab.live.run_trace_json — so the eight pure-Python scenarios (s01–s05, s07, s09, s10) recompute in the browser when you move a slider.",
        "OFFLINE / COMPUTE (.venv): the precompute pipeline runs the NATIVE solvers that have no WebAssembly build — OR-Tools CP-SAT (S06), OR-Tools Routing + PyVRP (S08), GLOP LP (S11), and the S07 NetworkX + OR-Tools route plan — and writes a compact seeded trace + manifest. The GPU lane (CuPy / Numba / Taichi / JAX) is documented but intentionally out of scope.",
        "REPLAY is the shared fallback: every scenario ships a committed seeded trace, so the page paints instantly while Pyodide warms, and the native scenarios replay that trace exactly. The 4-gate rule (classify_lane) decides live vs precompute from a real measurement and records it in each scenario's manifest.",
      ],
      es: [
        "El diseño central son dos carriles, y la elección se MIDE, no se adivina. LIVE (web): un Web Worker de Pyodide carga numpy/pandas/scipy/networkx/sqlite3 e instala con micropip simpy/ciw/mesa/joblib, y luego corre el motor real simlab vía simlab.live.run_trace_json — así los ocho escenarios Python-puros (s01–s05, s07, s09, s10) recomputan en el navegador al mover un control.",
        "OFFLINE / COMPUTE (.venv): el pipeline de precómputo corre los solvers NATIVOS sin build de WebAssembly — OR-Tools CP-SAT (S06), OR-Tools Routing + PyVRP (S08), GLOP LP (S11) y el plan de ruta NetworkX + OR-Tools de S07 — y escribe una traza sembrada compacta + manifest. El carril GPU (CuPy / Numba / Taichi / JAX) está documentado pero intencionalmente fuera de alcance.",
        "REPLAY es el respaldo común: cada escenario embarca una traza sembrada commiteada, así la página pinta al instante mientras Pyodide calienta, y los escenarios nativos reproducen esa traza exactamente. La regla de 4 compuertas (classify_lane) decide live vs precómputo a partir de una medición real y lo registra en el manifest de cada escenario.",
      ],
    },
  },
  {
    id: "webapp",
    svg: "03-webapp.svg",
    label: { en: "Web-app flow", es: "Flujo de la app" },
    body: {
      en: [
        "The SPA (React 19 + Vite) has four pages: Experiments (the 11 scenarios), Introduction, Theory (Queueing · DES · ABM · Optimization), and How to build. Each scenario is a ScenarioExperiment with sub-tabs: Simulator (replays the committed trace), Live (re-runs the engine in Pyodide), Summary charts, and Context.",
        "The Live sub-tab's LivePanel talks to pyodideClient, which drives pyodide.worker.ts; the worker writes the inlined simlab sources to its in-browser filesystem and calls run_trace_json(scenario, params, seed). The result is the same Trace the offline pipeline produces, so the player renders live and precomputed runs through ONE code path.",
        "At build time the prebuild hook copy-data.mjs overlays the committed data/artifacts + manifests into the build and inlines every simlab/**/*.py into pyodide/simlab-sources.json (so the live lane runs the exact engine code). deploy-pages.yml then builds and publishes the static site — no backend, no VPS.",
      ],
      es: [
        "La SPA (React 19 + Vite) tiene cuatro páginas: Experimentos (los 11 escenarios), Introducción, Teoría (Colas · DES · ABM · Optimización) y Cómo se construye. Cada escenario es un ScenarioExperiment con sub-pestañas: Simulador (reproduce la traza commiteada), En vivo (re-ejecuta el motor en Pyodide), gráficos Resumen y Contexto.",
        "El LivePanel de la sub-pestaña En vivo habla con pyodideClient, que maneja pyodide.worker.ts; el worker escribe las fuentes simlab inlineadas a su sistema de archivos en el navegador y llama run_trace_json(scenario, params, seed). El resultado es la misma Trace que produce el pipeline offline, así el reproductor dibuja las corridas live y precomputadas por UN solo camino de código.",
        "En el build, el hook prebuild copy-data.mjs superpone los data/artifacts + manifests commiteados e inlinea cada simlab/**/*.py en pyodide/simlab-sources.json (para que el carril live corra el código de motor exacto). Luego deploy-pages.yml construye y publica el sitio estático — sin backend, sin VPS.",
      ],
    },
  },
  {
    id: "science",
    svg: "04-science.svg",
    label: { en: "The science", es: "La ciencia" },
    body: {
      en: [
        "DES — SimPy drives a process-interaction event loop over a future-event list; the M/M/c queue (S01) is validated against the closed-form Erlang-C and cross-checked by an independent second engine, Ciw (10 seeded replications). S04 is a non-stationary (thinned) Poisson ED flow with FCFS triage + priority treatment.",
        "ABM — Mesa 3 (Agent / Model / AgentSet): S02 Schelling relocates unhappy agents one-by-one into a growing empty pool, S03 SIR flips cells synchronously, S05 Beer Game is a fixed-order serial cascade (the bullwhip effect). Optimization — OR-Tools CP-SAT (job-shop S06), Routing + PyVRP HGS (VRP S08), GLOP LP (mine-haul blend S11), NetworkX Dijkstra + CP-SAT route certificate (haul S07).",
        "Monte-Carlo — S10 runs N independent replications with joblib and forms a 95% confidence interval with SciPy (the exact z = norm.ppf(0.975)), showing the band tighten like 1/√n. Across all families the contract is deterministic replay: a run is a pure function of (params, seed), so the committed trace is the source of truth and the browser re-run matches it exactly.",
      ],
      es: [
        "DES — SimPy mueve un bucle de eventos por interacción de procesos sobre una lista de eventos futuros; la cola M/M/c (S01) se valida contra la fórmula cerrada Erlang-C y se contrasta con un segundo motor independiente, Ciw (10 réplicas sembradas). S04 es un flujo de urgencias Poisson no-estacionario (por thinning) con triage FCFS + tratamiento con prioridad.",
        "ABM — Mesa 3 (Agent / Model / AgentSet): S02 Schelling reubica a los descontentos uno a uno en el pool de vacías que crece, S03 SIR cambia las celdas de forma sincrónica, S05 Beer Game es una cascada serial de orden fijo (el efecto látigo). Optimización — OR-Tools CP-SAT (job-shop S06), Routing + PyVRP HGS (VRP S08), GLOP LP (mezcla minera S11), NetworkX Dijkstra + certificado de ruta CP-SAT (acarreo S07).",
        "Monte-Carlo — S10 corre N réplicas independientes con joblib y forma un intervalo de confianza al 95% con SciPy (el z exacto = norm.ppf(0.975)), mostrando la banda estrecharse como 1/√n. En todas las familias el contrato es replay determinista: una corrida es función pura de (params, seed), así la traza commiteada es la fuente de verdad y la re-ejecución en el navegador la iguala exactamente.",
      ],
    },
  },
  {
    id: "contracts",
    svg: "05-contracts.svg",
    label: { en: "Data contracts", es: "Contratos de datos" },
    body: {
      en: [
        "Two committed artifacts define every scenario. The manifest (manifests/<id>.json) carries the engine, the lane verdict, the gate numbers, the param_specs that drive the UI sliders, and a family of ≥10 variants — each with its KPIs, its own gate result and a pointer to its trace. The trace (data/artifacts/<id>/<variant>-seed42.json) is the rendered run: the event/frame timeline plus the KPIs the HUD reads.",
        "The 4-gate rule classify_lane is the single source of truth for live vs precompute: a scenario runs live only if it is pure-Python AND its wheel closure ⊆ LIVE_WHEELS AND run_ms ≤ 3 s AND trace_bytes ≤ 1 MB; failing any gate forces precompute. The verdict is computed from a real run in the pipeline and written into the manifest, so a scenario can never silently mislabel its lane.",
        "There is no runtime database — the data layer is the git history (git-as-data): committing a new trace re-publishes the site. Because run = f(params, seed) and the committed trace is canonical, replay is exact and the same engine code serves both the offline bake and the in-browser live run.",
      ],
      es: [
        "Dos artefactos commiteados definen cada escenario. El manifest (manifests/<id>.json) lleva el motor, el veredicto de carril, los números de las compuertas, los param_specs que mueven los controles de la UI y una familia de ≥10 variantes — cada una con sus KPIs, su propio resultado de compuerta y un puntero a su traza. La traza (data/artifacts/<id>/<variant>-seed42.json) es la corrida renderizada: la línea de tiempo de eventos/frames más los KPIs que lee el HUD.",
        "La regla de 4 compuertas classify_lane es la única fuente de verdad para live vs precómputo: un escenario corre live solo si es Python-puro Y su cierre de wheels ⊆ LIVE_WHEELS Y run_ms ≤ 3 s Y trace_bytes ≤ 1 MB; fallar cualquier compuerta fuerza precómputo. El veredicto se computa de una corrida real en el pipeline y se escribe en el manifest, así un escenario nunca puede etiquetar mal su carril en silencio.",
        "No hay base de datos en runtime — la capa de datos es la historia de git (git-as-data): commitear una traza nueva re-publica el sitio. Como corrida = f(params, seed) y la traza commiteada es canónica, el replay es exacto y el mismo código de motor sirve tanto el horneado offline como la corrida live en el navegador.",
      ],
    },
  },
];
