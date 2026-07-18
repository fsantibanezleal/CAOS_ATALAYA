import { useMemo, useState } from "react";
import type { MapNode, MapPayload } from "@/lib/types";
import { useLang } from "@/lib/useLang";
import { usePanZoom } from "./usePanZoom";
import { legendFor, makeCategoryColor, viridis, fmtPct, shade } from "./vizUtils";
import ScatterMap3D from "./ScatterMap3D";

const W = 760;
const H = 460;
const PAD = 28;

type ColorBy = "theme" | "origin" | "cluster" | "keys" | "year" | "quality" | "topic";

/** Catalog cartography: each dataset placed by its 2-D PCA embedding coordinate; colour encodes the chosen
 * facet. Zoom (wheel), pan (drag), hover for a value read-out. Reacts to the variant colour knob. */
export default function ScatterMap({ payload, colorBy = "theme" }: { payload: MapPayload; colorBy?: ColorBy }) {
  const lang = useLang();
  const { t, reset, zoomRef, handlers } = usePanZoom();
  const [hover, setHover] = useState<MapNode | null>(null);
  const [dim, setDim] = useState<"2d" | "3d">("2d");

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
  // reusable spherical gradient per colour -> each point reads as a small sphere (depth on light or dark)
  const gradId = new Map<string, string>();
  for (const n of nodes) { const c = colorFn(n); if (!gradId.has(c)) gradId.set(c, `atl-map-${gradId.size}`); }
  const has3d = nodes.some((n) => n.coord3);

  return (
    <div className="viz-wrap">
      <div className="viz-toolbar">
        <span className="viz-hint">{nodes.length} {lang === "es" ? "datasets" : "datasets"} · {dim === "3d" ? (lang === "es" ? "arrastrar = orbitar, rueda = zoom" : "drag = orbit, wheel = zoom") : (lang === "es" ? "rueda = zoom, arrastrar = mover" : "wheel = zoom, drag = pan")}</span>
        <span className="viz-toolbar-right">
          {has3d && (
            <span className="graph-modes" role="group">
              <button type="button" className={"chip sm" + (dim === "2d" ? " on" : "")} onClick={() => setDim("2d")}>2D</button>
              <button type="button" className={"chip sm" + (dim === "3d" ? " on" : "")} onClick={() => setDim("3d")}>3D</button>
            </span>
          )}
          {dim === "2d" && <button type="button" className="btn" onClick={reset}>{lang === "es" ? "Reiniciar vista" : "Reset view"}</button>}
        </span>
      </div>
      {dim === "3d" ? (
        <ScatterMap3D nodes={nodes} colorFn={colorFn} />
      ) : (
      <svg ref={zoomRef} viewBox={`0 0 ${W} ${H}`} className="viz-svg viz-graph" role="img"
           tabIndex={0} {...handlers} onPointerLeave={() => setHover(null)}
           aria-label={lang === "es" ? "Mapa del catálogo por embedding" : "Catalog embedding map"}>
        <defs>
          {Array.from(gradId).map(([c, id]) => (
            <radialGradient key={id} id={id} cx="0.35" cy="0.3" r="0.75">
              <stop offset="0%" stopColor={shade(c, 0.55)} />
              <stop offset="55%" stopColor={c} />
              <stop offset="100%" stopColor={shade(c, -0.32)} />
            </radialGradient>
          ))}
        </defs>
        <g transform={`translate(${t.x},${t.y}) scale(${t.k})`}>
          {/* soft colour aura (translucent tint, works on light or dark) */}
          {nodes.map((n) => (
            <circle key={n.id} cx={sx(n.coord[0])} cy={sy(n.coord[1])} r={(hover?.id === n.id ? 9 : 5.2) / t.k}
                    fill={colorFn(n)} fillOpacity={0.08} />
          ))}
          {/* spherical points: radial gradient gives each dot volume */}
          {nodes.map((n) => {
            const c = colorFn(n);
            return <circle key={n.id} cx={sx(n.coord[0])} cy={sy(n.coord[1])} r={(hover?.id === n.id ? 6.5 : 3.8) / t.k}
                    fill={`url(#${gradId.get(c)})`} fillOpacity={hover?.id === n.id ? 1 : 0.95}
                    stroke={hover?.id === n.id ? "#fff" : shade(c, -0.35)} strokeOpacity={hover?.id === n.id ? 1 : 0.85}
                    strokeWidth={(hover?.id === n.id ? 1.5 : 0.5) / t.k} onPointerEnter={() => setHover(n)} style={{ cursor: "pointer" }} />;
          })}
        </g>
      </svg>
      )}
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
          {hover.topics?.length ? <span className="faint">{lang === "es" ? "temas" : "topics"}: {hover.topics.join(" · ")}</span> : null}
          <span>{hover.n_cols} {lang === "es" ? "columnas" : "cols"} · {hover.n_rows.toLocaleString()} {lang === "es" ? "filas" : "rows"}
            {hover.keys.length ? ` · ${lang === "es" ? "claves" : "keys"}: ${hover.keys.join(", ")}` : ""}
            {hover.year_min ? ` · ${hover.year_min}–${hover.year_max ?? hover.year_min}` : ""}
            {` · ${lang === "es" ? "nulos" : "null"} ${fmtPct(hover.null_frac)}`}</span>
        </div>
      )}
      {!hover && <div className="viz-readout viz-readout-idle">{lang === "es" ? "Al pasar el cursor sobre un punto para ver el dataset" : "Hover a point to inspect the dataset"}</div>}
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
  if (by === "topic") { const c = makeCategoryColor(nodes.map((n) => n.topics?.[0] ?? "untagged")); return (n) => c(n.topics?.[0] ?? "untagged"); }
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
  if (by === "topic") return legendFor(nodes.map((n) => n.topics?.[0] ?? "untagged"), 14);
  if (by === "year") return [{ label: "older", color: viridis(0) }, { label: "newer", color: viridis(1) }];
  return [{ label: "more nulls", color: viridis(0) }, { label: "clean", color: viridis(1) }];
}
