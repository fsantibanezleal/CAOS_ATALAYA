import { useMemo, useState } from "react";
import type { GraphPayload, GraphEdgeRow, MapNode } from "@/lib/types";
import { useLang } from "@/lib/useLang";
import { usePanZoom } from "./usePanZoom";
import { hashAngle, makeCategoryColor, legendFor, fmt } from "./vizUtils";

const W = 820;
const H = 540;
const R = 240;

/** Relation network: nodes are datasets, edges the mined relation of one kind. Layout uses the baked force-directed
 * positions (rustworkx spring layout) so clusters pull together; falls back to the PCA embedding coordinate, then a
 * deterministic circular placement. Vibrant node colours + a glow, edge opacity/width by strength, node size by
 * degree. Zoom (wheel), pan (drag), hover to highlight a node's edges. No animation loop (no compute bomb). */
export default function GraphView({
  payload, minWeight = 0, edgeLabel = "strength",
}: { payload: GraphPayload; minWeight?: number; edgeLabel?: string }) {
  const lang = useLang();
  const { t, reset, zoomRef, handlers } = usePanZoom();
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
  const hoverSet = useMemo(() => {
    if (!hover) return null;
    const s = new Set<string>([hover]);
    hoverEdges.forEach((e) => { s.add(e.s); s.add(e.t); });
    return s;
  }, [hover, hoverEdges]);

  return (
    <div className="viz-wrap">
      <div className="viz-toolbar">
        <span className="viz-hint">{nodes.length} {lang === "es" ? "nodos" : "nodes"} · {edges.length} {lang === "es" ? "relaciones" : "edges"} · {lang === "es" ? "rueda = zoom, arrastra = mover" : "wheel = zoom, drag = pan"}</span>
        <button type="button" className="btn" onClick={reset}>{lang === "es" ? "Reiniciar vista" : "Reset view"}</button>
      </div>
      <svg ref={zoomRef} viewBox={`0 0 ${W} ${H}`} className="viz-svg viz-graph" role="img" tabIndex={0} {...handlers}
           onPointerLeave={() => setHover(null)}
           aria-label={lang === "es" ? "Red de relaciones entre datasets" : "Dataset relation network"}>
        <defs>
          <filter id="atl-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.4" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <g transform={`translate(${t.x},${t.y}) scale(${t.k})`}>
          {edges.map((e, i) => {
            const a = pos.get(e.s); const b = pos.get(e.t);
            if (!a || !b) return null;
            const active = !hover || e.s === hover || e.t === hover;
            return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                         stroke={active && hover ? colorFn((byId.get(hover)?.theme) ?? "") : "var(--color-accent)"}
                         strokeOpacity={active ? 0.12 + 0.55 * e.w : 0.03}
                         strokeWidth={(0.5 + 3 * e.w) / t.k} strokeLinecap="round" />;
          })}
          {nodes.map((n) => {
            const p = pos.get(n.id); if (!p) return null;
            const r = (3.2 + 1.4 * Math.sqrt(deg.get(n.id) ?? 0)) / t.k;
            const active = !hoverSet || hoverSet.has(n.id);
            return <circle key={n.id} cx={p.x} cy={p.y} r={r} fill={colorFn(n.theme)}
                           fillOpacity={active ? 0.95 : 0.15}
                           filter={n.id === hover ? "url(#atl-glow)" : undefined}
                           stroke={n.id === hover ? "var(--color-fg)" : "none"} strokeWidth={1.5 / t.k}
                           style={{ cursor: "pointer" }} onPointerEnter={() => setHover(n.id)} />;
          })}
        </g>
      </svg>
      <div className="viz-legend">
        {legend.map((l) => <span key={l.label} className="viz-legend-item"><span className="viz-swatch" style={{ background: l.color }} /> {l.label}</span>)}
      </div>
      {hoverNode ? (
        <div className="viz-readout" role="status">
          <strong>{hoverNode.title}</strong>
          <span>{hoverNode.theme} · {hoverEdges.length} {lang === "es" ? "relaciones" : "relations"}{hoverNode.profiled === false ? (lang === "es" ? " · solo metadata" : " · metadata-only") : ""}</span>
          <span className="viz-edge-list">
            {hoverEdges.slice().sort((x, y) => y.w - x.w).slice(0, 6).map((e, i) => {
              const other = e.s === hover ? e.t : e.s;
              return <span key={i}>{byId.get(other)?.title?.slice(0, 44) ?? other} · {edgeLabel} {fmt(e.w, 2)}{edgeEvidence(e, lang)}</span>;
            })}
          </span>
        </div>
      ) : <div className="viz-readout viz-readout-idle">{lang === "es" ? "Pasa el cursor sobre un nodo para ver sus relaciones" : "Hover a node to see its relations"}</div>}
    </div>
  );
}

function layout(nodes: MapNode[]): Map<string, { x: number; y: number }> {
  const m = new Map<string, { x: number; y: number }>();
  const useKey: "fpos" | "coord" | null =
    nodes.filter((n) => n.fpos && (n.fpos[0] || n.fpos[1])).length >= nodes.length * 0.6 ? "fpos"
    : nodes.filter((n) => n.coord && (n.coord[0] || n.coord[1])).length >= nodes.length * 0.6 ? "coord"
    : null;
  if (useKey) {
    const pts = nodes.map((n) => (useKey === "fpos" ? n.fpos! : n.coord));
    const xs = pts.map((p) => p[0]); const ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    nodes.forEach((n, i) => {
      m.set(n.id, {
        x: W / 2 + ((pts[i][0] - (x0 + x1) / 2) / ((x1 - x0) || 1)) * (W - 90),
        y: H / 2 - ((pts[i][1] - (y0 + y1) / 2) / ((y1 - y0) || 1)) * (H - 90),
      });
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
