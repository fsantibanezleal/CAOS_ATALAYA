import { useMemo, useState } from "react";
import type { GraphPayload, MapNode } from "@/lib/types";
import { useLang } from "@/lib/useLang";
import { makeCategoryColor, legendFor } from "./vizUtils";
import GraphView from "./GraphView";
import GraphGL from "./GraphGL";
import GraphMatrix from "./GraphMatrix";
import GraphArc from "./GraphArc";

type Mode = "clean" | "glow" | "3d" | "matrix" | "arc";
type ColorKey = "theme" | "cluster";

/** The graph workbench: choose HOW to render the relation network — the same mined graph, five genuinely
 * different representations. "Clean" is the precise, accessible SVG node-link (baked force layout); "Glow" is a
 * WebGL 2D nebula; "3D" is an orbitable three.js graph; "Matrix" is a cluster-reordered adjacency matrix
 * (occlusion-free — reads the dense hairballs a node-link cannot); "Arc" is a 1-D arc diagram (best for sparse
 * lenses, makes cross-community bridges obvious). Plus a colour-by (theme / mined cluster) toggle, a labels
 * toggle, and a node search that highlights matches across every mode. */
export default function GraphPanel({
  payload, minWeight = 0, edgeLabel = "strength", edgeKey, initialMode = "3d",
}: { payload: GraphPayload; minWeight?: number; edgeLabel?: string; edgeKey?: string; initialMode?: Mode }) {
  const lang = useLang();
  const [mode, setMode] = useState<Mode>(initialMode);   // 3D orbit is the default; correlations open on their signed Arc
  const [labels, setLabels] = useState(false);
  const [query, setQuery] = useState("");
  const [colorKey, setColorKey] = useState<ColorKey>("theme");

  // A variant may scope the network to one join key (e.g. comuna_cut vs region); filter edges by ev.key.
  const view = useMemo<GraphPayload>(() => {
    if (!edgeKey) return payload;
    const edges = payload.edges.filter((e) => (e.ev?.key as string | undefined) === edgeKey);
    const used = new Set<string>([...edges.map((e) => e.s), ...edges.map((e) => e.t)]);
    return { nodes: payload.nodes.filter((n) => used.has(n.id)), edges };
  }, [payload, edgeKey]);

  const catValue = (n: MapNode) => (colorKey === "cluster" ? `cluster ${n.cluster}` : n.theme);
  const colorFor = useMemo(() => {
    const cat = makeCategoryColor(view.nodes.map(catValue));
    return (n: MapNode) => cat(catValue(n));
  }, [view.nodes, colorKey]);
  const legend = useMemo(() => legendFor(view.nodes.map(catValue)), [view.nodes, colorKey]);

  const MODES: { id: Mode; en: string; es: string }[] = [
    { id: "clean", en: "Clean 2D", es: "Limpio 2D" },
    { id: "glow", en: "Glow (WebGL)", es: "Glow (WebGL)" },
    { id: "3d", en: "3D", es: "3D" },
    { id: "matrix", en: "Matrix", es: "Matriz" },
    { id: "arc", en: "Arc", es: "Arco" },
  ];

  return (
    <div className="graph-panel">
      <div className="graph-controls">
        <div className="graph-modes">
          {MODES.map((m) => (
            <button key={m.id} type="button" className={"chip" + (mode === m.id ? " on" : "")} onClick={() => setMode(m.id)}>
              {lang === "es" ? m.es : m.en}
            </button>
          ))}
        </div>
        <div className="graph-tools">
          <div className="graph-colorby" role="group" aria-label={lang === "es" ? "Colorear por" : "Colour by"}>
            <span className="graph-tool-lbl">{lang === "es" ? "Color" : "Colour"}</span>
            <button type="button" className={"chip sm" + (colorKey === "theme" ? " on" : "")} onClick={() => setColorKey("theme")}>{lang === "es" ? "tema" : "theme"}</button>
            <button type="button" className={"chip sm" + (colorKey === "cluster" ? " on" : "")} onClick={() => setColorKey("cluster")}>{lang === "es" ? "clúster" : "cluster"}</button>
          </div>
          <label className={"graph-toggle" + (mode === "glow" || mode === "3d" ? "" : " disabled")}
                 title={mode === "glow" || mode === "3d" ? undefined : (lang === "es" ? "Solo en Glow / 3D" : "Glow / 3D only")}>
            <input type="checkbox" checked={labels} disabled={!(mode === "glow" || mode === "3d")}
                   onChange={(e) => setLabels(e.target.checked)} />
            {lang === "es" ? "Etiquetas" : "Labels"}
          </label>
          <input className="graph-search" type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                 placeholder={lang === "es" ? "Resaltar dataset…" : "Highlight dataset…"} />
        </div>
      </div>

      {mode === "clean"
        ? <GraphView payload={view} minWeight={minWeight} edgeLabel={edgeLabel} colorFor={colorFor} legend={legend} query={query} />
        : mode === "matrix"
        ? <GraphMatrix payload={view} minWeight={minWeight} edgeLabel={edgeLabel} colorFor={colorFor} query={query} />
        : mode === "arc"
        ? <GraphArc payload={view} minWeight={minWeight} edgeLabel={edgeLabel} colorFor={colorFor} query={query} signed={edgeLabel === "ρ"} />
        : <GraphGL payload={view} minWeight={minWeight} mode={mode} showLabels={labels} query={query} colorFor={colorFor} />}

      {mode !== "clean" && mode !== "matrix" && (
        <div className="viz-legend">
          {legend.map((l) => <span key={l.label} className="viz-legend-item"><span className="viz-swatch" style={{ background: l.color }} /> {l.label}</span>)}
          <span className="viz-hint">{lang === "es"
            ? (mode === "arc" ? "nodos ordenados por clúster · pasa el cursor" : "arrastra un nodo · rueda = zoom" + (mode === "3d" ? " · arrastra el fondo = orbitar" : ""))
            : (mode === "arc" ? "nodes ordered by cluster · hover" : "drag a node · wheel = zoom" + (mode === "3d" ? " · drag background = orbit" : ""))}</span>
        </div>
      )}
    </div>
  );
}
