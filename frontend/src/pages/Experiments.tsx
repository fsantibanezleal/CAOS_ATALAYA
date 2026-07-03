import { useEffect, useState } from "react";
import { useLang } from "@/lib/useLang";
import type { Categories, Metrics } from "@/lib/types";
import { loadMetrics, loadCategories } from "@/lib/data";

export default function Experiments() {
  const lang = useLang();
  const es = lang === "es";
  const [m, setM] = useState<Metrics | null>(null);
  const [cats, setCats] = useState<Categories | null>(null);
  useEffect(() => {
    loadMetrics().then(setM).catch(() => setM(null));
    loadCategories().then(setCats).catch(() => setCats(null));
  }, []);

  return (
    <div className="page-body">
      <div className="page-head">
        <h1>{es ? "Experimentos" : "Experiments"}</h1>
        <p className="lede">{es
          ? "El diseño experimental, las métricas exactas, el protocolo a prueba de fugas y la matriz de cobertura, con resultados reales leídos de los artefactos."
          : "The experimental design, the exact metrics, the leakage-safe protocol and the coverage matrix, with real results read from the artifacts."}</p>
      </div>
      <div className="prose measure">
        <h2>{es ? "Diseño" : "Design"}</h2>
        <p>{es ? "El experimento central prueba si las correlaciones entre datasets son reales. Protocolo: (1) alinear dos indicadores por una clave de entidad compartida; (2) medir Spearman; (3) calibrar la significancia con un nulo de permutación sembrado; (4) controlar la tasa de falsos descubrimientos con Benjamini-Hochberg sobre toda la familia; (5) el control negativo repite todo sobre alineaciones barajadas." : "The central experiment tests whether cross-dataset correlations are real. Protocol: (1) align two indicators on a shared entity key; (2) measure Spearman; (3) calibrate significance with a seeded permutation null; (4) control the false-discovery rate with Benjamini-Hochberg over the whole family; (5) the negative control repeats everything on shuffled alignments."}</p>
        <h2>{es ? "Métricas" : "Metrics"}</h2>
        <ul>
          <li><strong>{es ? "FDR empírica (control negativo)" : "Empirical FDR (negative control)"}</strong>: {es ? "correlaciones que sobreviven al nulo+FDR sobre datos barajados / candidatas. Debe ser ~0." : "correlations surviving the null+FDR on shuffled data / candidates. Should be ~0."}</li>
          <li><strong>{es ? "Coherencia de vecinos semánticos" : "Semantic-neighbour coherence"}</strong>: {es ? "fracción del top-k de vecinos que comparte tema (calidad del embedding)." : "fraction of the top-k neighbours sharing a theme (embedding quality)."}</li>
          <li><strong>{es ? "Cordura de unibilidad" : "Joinability sanity"}</strong>: {es ? "fracción de aristas JOINABLE_ON cuyos dos datasets declaran la misma clave (debe ser 1.0)." : "fraction of JOINABLE_ON edges whose two datasets declare the same key (should be 1.0)."}</li>
        </ul>

        <h2>{es ? "Resultados reales" : "Real results"}</h2>
        {!m && <div className="banner">{es ? "Cargando métricas…" : "Loading metrics…"}</div>}
        {m && (
          <table className="viz-table">
            <tbody>
              <tr><td>{es ? "Nodos (datasets perfilados)" : "Nodes (profiled datasets)"}</td><td className="num">{m.graph.nodes}</td></tr>
              <tr><td>{es ? "Aristas totales" : "Total edges"}</td><td className="num">{m.graph.edges}</td></tr>
              <tr><td>{es ? "Correlaciones (candidatas, sobreviven)" : "Correlations (candidates, survive)"}</td><td className="num">{m.negative_control.candidates}, {m.graph.by_edge_kind?.CORRELATES ?? 0}</td></tr>
              <tr className="hl"><td><strong>{es ? "FDR empírica (barajado)" : "Empirical FDR (shuffled)"}</strong></td><td className="num"><strong>{m.negative_control.empirical_fdr}</strong> ({m.negative_control.survivors}/{m.negative_control.candidates})</td></tr>
              <tr><td>{es ? "Coherencia de vecinos semánticos" : "Semantic-neighbour coherence"}</td><td className="num">{m.semantic_coherence.neighbor_theme_match}</td></tr>
              <tr><td>{es ? "Cordura de unibilidad" : "Joinability sanity"}</td><td className="num">{m.joinability_sanity.share_declared_key_frac}</td></tr>
              <tr><td>{es ? "Fracción de nodos aislados" : "Isolated-node fraction"}</td><td className="num">{m.isolated_node_frac}</td></tr>
            </tbody>
          </table>
        )}
        {m && (
          <p className="callout callout-honest">{es
            ? `Interpretación honesta: sobre datos reales, ${m.graph.by_edge_kind?.CORRELATES ?? 0} correlaciones sobreviven al control de FDR; sobre las MISMAS alineaciones barajadas, sobreviven ${m.negative_control.survivors}. Esa separación es la evidencia de que los hallazgos no son ruido.`
            : `Honest reading: on real data, ${m.graph.by_edge_kind?.CORRELATES ?? 0} correlations survive the FDR control; on the SAME alignments shuffled, ${m.negative_control.survivors} survive. That separation is the evidence the findings are not noise.`}</p>
        )}

        <h2>{es ? "Matriz de cobertura (casos × categoría)" : "Coverage matrix (cases × category)"}</h2>
        {cats && (
          <table className="viz-table">
            <thead><tr><th>{es ? "Categoría" : "Category"}</th><th>{es ? "Casos" : "Cases"}</th></tr></thead>
            <tbody>
              {Object.entries(cats.categories).map(([cat, ids]) => (
                <tr key={cat}><td>{cat}</td><td>{ids.join(", ")}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
