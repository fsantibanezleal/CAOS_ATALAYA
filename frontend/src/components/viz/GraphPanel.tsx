import { useMemo, useState } from "react";
import type { GraphPayload } from "@/lib/types";
import { useLang } from "@/lib/useLang";
import GraphView from "./GraphView";
import GraphGL, { themeColorer } from "./GraphGL";
import { legendFor } from "./vizUtils";

type Mode = "clean" | "glow" | "3d";

/** The graph workbench: choose how to render the relation network. "Clean" is the precise, accessible SVG (baked
 * force layout). "Glow" is a WebGL 2D canvas with additive blending + live physics (the nebula look). "3D" is a
 * three.js orbitable graph with bloom. Plus a labels toggle + node search that highlights matches. */
export default function GraphPanel({
  payload, minWeight = 0, edgeLabel = "strength",
}: { payload: GraphPayload; minWeight?: number; edgeLabel?: string }) {
  const lang = useLang();
  const [mode, setMode] = useState<Mode>("clean");
  const [labels, setLabels] = useState(false);
  const [query, setQuery] = useState("");
  const colorForTheme = useMemo(() => themeColorer(payload.nodes), [payload.nodes]);
  const legend = useMemo(() => legendFor(payload.nodes.map((n) => n.theme)), [payload.nodes]);

  const MODES: { id: Mode; en: string; es: string }[] = [
    { id: "clean", en: "Clean 2D", es: "Limpio 2D" },
    { id: "glow", en: "Glow (WebGL)", es: "Glow (WebGL)" },
    { id: "3d", en: "3D", es: "3D" },
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
          {mode !== "clean" && (
            <label className="graph-toggle">
              <input type="checkbox" checked={labels} onChange={(e) => setLabels(e.target.checked)} />
              {lang === "es" ? "Etiquetas" : "Labels"}
            </label>
          )}
          <input className="graph-search" type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                 placeholder={lang === "es" ? "Resaltar dataset…" : "Highlight dataset…"} />
        </div>
      </div>

      {mode === "clean"
        ? <GraphView payload={payload} minWeight={minWeight} edgeLabel={edgeLabel} />
        : <GraphGL payload={payload} minWeight={minWeight} mode={mode} showLabels={labels} query={query}
                   colorForTheme={colorForTheme} />}

      {mode !== "clean" && (
        <div className="viz-legend">
          {legend.map((l) => <span key={l.label} className="viz-legend-item"><span className="viz-swatch" style={{ background: l.color }} /> {l.label}</span>)}
          <span className="viz-hint">{lang === "es" ? "arrastra un nodo · rueda = zoom" + (mode === "3d" ? " · arrastra el fondo = orbitar" : "") : "drag a node · wheel = zoom" + (mode === "3d" ? " · drag background = orbit" : "")}</span>
        </div>
      )}
    </div>
  );
}
