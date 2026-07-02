import { useMemo, useState } from "react";
import type { MapNode, MapPayload } from "@/lib/types";
import { useLang } from "@/lib/useLang";
import { usePanZoom } from "./usePanZoom";
import { legendFor, makeCategoryColor, viridis, fmtPct } from "./vizUtils";

const W = 760;
const H = 460;
const PAD = 28;

type ColorBy = "theme" | "origin" | "cluster" | "keys" | "year" | "quality";

/** Catalog cartography: each dataset placed by its 2-D PCA embedding coordinate; colour encodes the chosen
 * facet. Zoom (wheel), pan (drag), hover for a value read-out. Reacts to the variant colour knob. */
export default function ScatterMap({ payload, colorBy = "theme" }: { payload: MapPayload; colorBy?: ColorBy }) {
  const lang = useLang();
  const { t, reset, zoomRef, handlers } = usePanZoom();
  const [hover, setHover] = useState<MapNode | null>(null);

  const nodes = payload.nodes;
  const bounds = useMemo(() => {
    const xs = nodes.map((n) => n.coord[0]);
    const ys = nodes.map((n) => n.coord[1]);
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  }, [nodes]);

  const sx = (x: number) => PAD + ((x - bounds.x0) / (bounds.x1 - bounds.x0 || 1)) * (W - 2 * PAD);
  const sy = (y: number) => H - PAD - ((y - bounds.y0) / (bounds.y1 - bounds.y0 || 1)) * (H - 2 * PAD);

  const colorFn = useMemo(() => buildColor(nodes, colorBy), [nodes, colorBy]);
  const legend = useMemo(() => buildLegend(nodes, colorBy), [nodes, colorBy]);

  return (
    <div className="viz-wrap">
      <div className="viz-toolbar">
        <span className="viz-hint">{nodes.length} {lang === "es" ? "datasets" : "datasets"} · {lang === "es" ? "rueda = zoom, arrastra = mover" : "wheel = zoom, drag = pan"}</span>
        <button type="button" className="btn" onClick={reset}>{lang === "es" ? "Reiniciar vista" : "Reset view"}</button>
      </div>
      <svg ref={zoomRef} viewBox={`0 0 ${W} ${H}`} className="viz-svg" role="img"
           tabIndex={0} {...handlers} onPointerLeave={() => setHover(null)}
           aria-label={lang === "es" ? "Mapa del catálogo por embedding" : "Catalog embedding map"}>
        <g transform={`translate(${t.x},${t.y}) scale(${t.k})`}>
          {nodes.map((n) => (
            <circle key={n.id} cx={sx(n.coord[0])} cy={sy(n.coord[1])} r={hover?.id === n.id ? 7 / t.k : 4.2 / t.k}
                    fill={colorFn(n)} fillOpacity={0.82} stroke={hover?.id === n.id ? "var(--color-fg)" : "none"}
                    strokeWidth={1.5 / t.k} onPointerEnter={() => setHover(n)} style={{ cursor: "pointer" }} />
          ))}
        </g>
      </svg>
      <div className="viz-legend">
        {legend.map((l) => (
          <span key={l.label} className="viz-legend-item">
            <span className="viz-swatch" style={{ background: l.color }} /> {l.label}
          </span>
        ))}
      </div>
      {hover && (
        <div className="viz-readout" role="status">
          <strong>{hover.title}</strong>
          <span>{hover.theme}{hover.org ? ` · ${hover.org}` : ""}</span>
          <span>{hover.n_cols} {lang === "es" ? "columnas" : "cols"} · {hover.n_rows.toLocaleString()} {lang === "es" ? "filas" : "rows"}
            {hover.keys.length ? ` · ${lang === "es" ? "claves" : "keys"}: ${hover.keys.join(", ")}` : ""}
            {hover.year_min ? ` · ${hover.year_min}–${hover.year_max ?? hover.year_min}` : ""}
            {` · ${lang === "es" ? "nulos" : "null"} ${fmtPct(hover.null_frac)}`}</span>
        </div>
      )}
      {!hover && <div className="viz-readout viz-readout-idle">{lang === "es" ? "Pasa el cursor sobre un punto para ver el dataset" : "Hover a point to inspect the dataset"}</div>}
      <p className="viz-caption">
        {lang === "es"
          ? `Coordenadas = proyección PCA de los embeddings MiniLM (varianza explicada ${(payload.pca_var[0] * 100).toFixed(0)}% + ${(payload.pca_var[1] * 100).toFixed(0)}%). La cercanía indica similitud semántica.`
          : `Coordinates = PCA projection of the MiniLM embeddings (explained variance ${(payload.pca_var[0] * 100).toFixed(0)}% + ${(payload.pca_var[1] * 100).toFixed(0)}%). Proximity means semantic similarity.`}
      </p>
    </div>
  );
}

function buildColor(nodes: MapNode[], by: ColorBy): (n: MapNode) => string {
  if (by === "theme") { const c = makeCategoryColor(nodes.map((n) => n.theme)); return (n) => c(n.theme); }
  if (by === "origin") { const c = makeCategoryColor(nodes.map((n) => n.origin)); return (n) => c(n.origin); }
  if (by === "cluster") { const c = makeCategoryColor(nodes.map((n) => String(n.cluster))); return (n) => c(String(n.cluster)); }
  if (by === "keys") { const c = makeCategoryColor(nodes.map((n) => n.keys[0] ?? "none")); return (n) => c(n.keys[0] ?? "none"); }
  if (by === "year") {
    const ys = nodes.map((n) => n.year_max ?? n.year_min ?? 0).filter(Boolean);
    const lo = Math.min(...ys, 2000), hi = Math.max(...ys, 2025);
    return (n) => { const y = n.year_max ?? n.year_min; return y ? viridis((y - lo) / (hi - lo || 1)) : "#666"; };
  }
  return (n) => viridis(1 - n.null_frac); // quality: greener = fewer nulls
}

function buildLegend(nodes: MapNode[], by: ColorBy) {
  if (by === "theme") return legendFor(nodes.map((n) => n.theme));
  if (by === "origin") return legendFor(nodes.map((n) => n.origin));
  if (by === "cluster") return legendFor(nodes.map((n) => `cluster ${n.cluster}`));
  if (by === "keys") return legendFor(nodes.map((n) => n.keys[0] ?? "none"));
  if (by === "year") return [{ label: "older", color: viridis(0) }, { label: "newer", color: viridis(1) }];
  return [{ label: "more nulls", color: viridis(0) }, { label: "clean", color: viridis(1) }];
}
