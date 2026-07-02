import { useMemo, useState } from "react";
import type { GraphPayload, GraphEdgeRow, MapNode } from "@/lib/types";
import { useLang } from "@/lib/useLang";
import { usePanZoom } from "./usePanZoom";
import { hashAngle, makeCategoryColor, legendFor, fmt } from "./vizUtils";

const W = 760;
const H = 480;
const R = 200;

/** Relation network: nodes are datasets, edges the mined relation of one kind. Layout uses the PCA embedding
 * coordinate when present (so semantic structure is visible), else a deterministic circular placement. Edge
 * opacity/width encode strength. Filter by min strength (variant knob). Hover a node to highlight its edges. */
export default function GraphView({
  payload, minWeight = 0, edgeLabel = "strength",
}: { payload: GraphPayload; minWeight?: number; edgeLabel?: string }) {
  const lang = useLang();
  const { t, reset, handlers } = usePanZoom();
  const [hover, setHover] = useState<string | null>(null);

  const nodes = payload.nodes;
  const edges = useMemo(() => payload.edges.filter((e) => e.w >= minWeight), [payload.edges, minWeight]);

  const pos = useMemo(() => layout(nodes), [nodes]);
  const colorFn = useMemo(() => makeCategoryColor(nodes.map((n) => n.theme)), [nodes]);
  const legend = useMemo(() => legendFor(nodes.map((n) => n.theme)), [nodes]);
  const deg = useMemo(() => {
    const d = new Map<string, number>();
    edges.forEach((e) => { d.set(e.s, (d.get(e.s) ?? 0) + 1); d.set(e.t, (d.get(e.t) ?? 0) + 1); });
    return d;
  }, [edges]);

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const hoverNode = hover ? byId.get(hover) : null;
  const hoverEdges = hover ? edges.filter((e) => e.s === hover || e.t === hover) : [];

  return (
    <div className="viz-wrap">
      <div className="viz-toolbar">
        <span className="viz-hint">{nodes.length} {lang === "es" ? "nodos" : "nodes"} · {edges.length} {lang === "es" ? "relaciones" : "edges"}</span>
        <button type="button" className="btn" onClick={reset}>{lang === "es" ? "Reiniciar vista" : "Reset view"}</button>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="viz-svg" role="img" tabIndex={0} {...handlers}
           onPointerLeave={() => setHover(null)}
           aria-label={lang === "es" ? "Red de relaciones entre datasets" : "Dataset relation network"}>
        <g transform={`translate(${t.x},${t.y}) scale(${t.k})`}>
          {edges.map((e, i) => {
            const a = pos.get(e.s); const b = pos.get(e.t);
            if (!a || !b) return null;
            const active = !hover || e.s === hover || e.t === hover;
            return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                         stroke="var(--color-accent)" strokeOpacity={active ? 0.15 + 0.6 * e.w : 0.04}
                         strokeWidth={(0.4 + 2.4 * e.w) / t.k} />;
          })}
          {nodes.map((n) => {
            const p = pos.get(n.id); if (!p) return null;
            const r = (4 + Math.min(9, (deg.get(n.id) ?? 0))) / t.k;
            const active = !hover || n.id === hover || hoverEdges.some((e) => e.s === n.id || e.t === n.id);
            return <circle key={n.id} cx={p.x} cy={p.y} r={r} fill={colorFn(n.theme)}
                           fillOpacity={active ? 0.9 : 0.2} stroke={n.id === hover ? "var(--color-fg)" : "none"}
                           strokeWidth={1.5 / t.k} style={{ cursor: "pointer" }}
                           onPointerEnter={() => setHover(n.id)} />;
          })}
        </g>
      </svg>
      <div className="viz-legend">
        {legend.map((l) => <span key={l.label} className="viz-legend-item"><span className="viz-swatch" style={{ background: l.color }} /> {l.label}</span>)}
      </div>
      {hoverNode ? (
        <div className="viz-readout" role="status">
          <strong>{hoverNode.title}</strong>
          <span>{hoverNode.theme} · {hoverEdges.length} {lang === "es" ? "relaciones" : "relations"}</span>
          <span className="viz-edge-list">
            {hoverEdges.slice(0, 5).sort((x, y) => y.w - x.w).map((e, i) => {
              const other = e.s === hover ? e.t : e.s;
              return <span key={i}>{byId.get(other)?.title?.slice(0, 40) ?? other} · {edgeLabel} {fmt(e.w, 2)}{edgeEvidence(e, lang)}</span>;
            })}
          </span>
        </div>
      ) : <div className="viz-readout viz-readout-idle">{lang === "es" ? "Pasa el cursor sobre un nodo para ver sus relaciones" : "Hover a node to see its relations"}</div>}
    </div>
  );
}

function layout(nodes: MapNode[]): Map<string, { x: number; y: number }> {
  const m = new Map<string, { x: number; y: number }>();
  const withCoord = nodes.filter((n) => n.coord && (n.coord[0] || n.coord[1]));
  if (withCoord.length >= nodes.length * 0.6) {
    const xs = withCoord.map((n) => n.coord[0]); const ys = withCoord.map((n) => n.coord[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    nodes.forEach((n) => {
      const cx = W / 2 + ((n.coord[0] - (x0 + x1) / 2) / ((x1 - x0) || 1)) * (W - 80);
      const cy = H / 2 - ((n.coord[1] - (y0 + y1) / 2) / ((y1 - y0) || 1)) * (H - 80);
      m.set(n.id, { x: cx, y: cy });
    });
  } else {
    nodes.forEach((n) => { const a = hashAngle(n.id); m.set(n.id, { x: W / 2 + R * Math.cos(a), y: H / 2 + R * Math.sin(a) }); });
  }
  return m;
}

function edgeEvidence(e: GraphEdgeRow, lang: string): string {
  const ev = e.ev || {};
  if (ev.containment !== undefined) return ` · ${lang === "es" ? "contención" : "containment"} ${fmt(ev.containment as number, 2)} (${ev.key})`;
  if (ev.rho !== undefined) return ` · ρ ${fmt(ev.rho as number, 2)}, p ${fmt(ev.p_adj as number, 3)}`;
  if (ev.cosine !== undefined) return ` · cos ${fmt(ev.cosine as number, 2)}`;
  return "";
}
