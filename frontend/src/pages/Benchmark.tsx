import { useEffect, useState } from "react";
import { useLang } from "@/lib/useLang";
import type { Metrics } from "@/lib/types";
import { loadMetrics } from "@/lib/data";
import { SubTabs } from "@/components/content/SubTabs";
import { viridis } from "@/components/viz/vizUtils";

function BarTable({ data, unit }: { data: [string, number][]; unit?: string }) {
  const max = Math.max(1, ...data.map((d) => d[1]));
  return (
    <div className="ov-bars">
      {data.map(([k, v], i) => (
        <div key={k} className="cov-row">
          <span className="cov-label">{k}</span>
          <span className="cov-track"><span className="cov-fill" style={{ width: `${(v / max) * 100}%`, background: viridis(1 - i / Math.max(1, data.length)) }} /></span>
          <span className="num">{v}{unit ? ` ${unit}` : ""}</span>
        </div>
      ))}
    </div>
  );
}

export default function Benchmark() {
  const lang = useLang();
  const es = lang === "es";
  const [m, setM] = useState<Metrics | null>(null);
  useEffect(() => { loadMetrics().then(setM).catch(() => setM(null)); }, []);

  return (
    <div className="page-body">
      <div className="page-head">
        <h1>Benchmark</h1>
        <p className="lede">{es
          ? "El resultado de la mina de relaciones frente a un mundo nulo, y la composición del grafo, leídos de los artefactos horneados sobre el corpus completo."
          : "The relation mine's result against a null world, and the graph composition, read from the baked artifacts over the full corpus."}</p>
      </div>
      {!m && <div className="banner">{es ? "Cargando…" : "Loading…"}</div>}
      {m && (
        <SubTabs ariaLabel="benchmark" tabs={[
          {
            id: "control", label: es ? "Control negativo" : "Negative control",
            content: (
              <div className="prose measure">
                <p>{es ? "El benchmark decisivo: minamos correlaciones sobre los datos reales y sobre las mismas alineaciones barajadas, con idéntico nulo de permutación + FDR. Un pipeline honesto encuentra señal real y ~cero en el barajado." : "The decisive benchmark: we mine correlations on the real data and on the same alignments shuffled, with identical permutation null + FDR. An honest pipeline finds real signal and ~zero on the shuffle."}</p>
                <BarTable data={[
                  [es ? "Correlaciones reales (sobreviven FDR)" : "Real correlations (survive FDR)", m.graph.by_edge_kind?.CORRELATES ?? 0],
                  [es ? "Sobreviven en datos barajados" : "Survive on shuffled data", m.negative_control.survivors],
                ]} />
                <p className="callout callout-strong">{es
                  ? `FDR empírica = ${m.negative_control.empirical_fdr} (${m.negative_control.survivors} de ${m.negative_control.candidates} candidatas barajadas). Cuanto más cerca de 0, más confiables los hallazgos reales.`
                  : `Empirical FDR = ${m.negative_control.empirical_fdr} (${m.negative_control.survivors} of ${m.negative_control.candidates} shuffled candidates). The closer to 0, the more trustworthy the real findings.`}</p>
              </div>
            ),
          },
          {
            id: "graph", label: es ? "Composición del grafo" : "Graph composition",
            content: (
              <div className="prose measure">
                <p>{es ? "Cuántas relaciones de cada tipo se minaron sobre el corpus." : "How many relations of each kind were mined over the corpus."}</p>
                <BarTable data={Object.entries(m.graph.by_edge_kind).sort((a, b) => b[1] - a[1])} unit={es ? "aristas" : "edges"} />
                <p className="faint">{m.graph.nodes} {es ? "nodos" : "nodes"} · {m.graph.edges} {es ? "aristas" : "edges"} · {es ? "aisladas" : "isolated"} {(m.isolated_node_frac * 100).toFixed(1)}%</p>
              </div>
            ),
          },
          {
            id: "quality", label: es ? "Calidad de las relaciones" : "Relation quality",
            content: (
              <div className="prose measure">
                <p>{es ? "Métricas de calidad de las capas semántica y de unibilidad." : "Quality metrics for the semantic and joinability layers."}</p>
                <table className="viz-table"><tbody>
                  <tr><td>{es ? "Coherencia de vecinos semánticos (comparten tema)" : "Semantic-neighbour coherence (share theme)"}</td><td className="num">{(m.semantic_coherence.neighbor_theme_match * 100).toFixed(1)}%</td></tr>
                  <tr><td>{es ? "Aristas semánticas evaluadas" : "Semantic edges scored"}</td><td className="num">{m.semantic_coherence.n_scored}</td></tr>
                  <tr><td>{es ? "Unibilidad: comparten clave declarada" : "Joinability: share declared key"}</td><td className="num">{(m.joinability_sanity.share_declared_key_frac * 100).toFixed(1)}%</td></tr>
                  <tr><td>{es ? "Aristas de unibilidad" : "Joinable edges"}</td><td className="num">{m.joinability_sanity.joinable_edges}</td></tr>
                </tbody></table>
              </div>
            ),
          },
          {
            id: "themes", label: es ? "Temas" : "Themes",
            content: (
              <div className="prose measure">
                <p>{es ? "Distribución temática de los datasets perfilados en el grafo." : "Thematic distribution of the profiled datasets in the graph."}</p>
                <BarTable data={Object.entries(m.theme_distribution).sort((a, b) => b[1] - a[1])} unit="datasets" />
              </div>
            ),
          },
        ]} />
      )}
    </div>
  );
}
