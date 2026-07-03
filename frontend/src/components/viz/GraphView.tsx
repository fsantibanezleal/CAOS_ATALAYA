import { useMemo, useState } from "react";
import type { GraphPayload, GraphEdgeRow, MapNode } from "@/lib/types";
import { useLang } from "@/lib/useLang";
import { usePanZoom } from "./usePanZoom";
import { hashAngle, makeCategoryColor, legendFor, fmt, shade } from "./vizUtils";

const W = 820;
const H = 540;
const R = 240;

/** Relation network: nodes are datasets, edges the mined relation of one kind. Layout uses the baked force-directed
 * positions (rustworkx spring layout) so clusters pull together; falls back to the PCA embedding coordinate, then a
 * deterministic circular placement. Vibrant node colours + a glow, edge opacity/width by strength, node size by
 * degree. Zoom (wheel), pan (drag), hover to highlight a node's edges, search to highlight by name. The colour and
 * legend come from the panel (theme or mined cluster). No animation loop (no compute bomb). */
export default function GraphView({
  payload, minWeight = 0, edgeLabel = "strength", colorFor, legend: legendProp, query = "",
}: {
  payload: GraphPayload; minWeight?: number; edgeLabel?: string;
  colorFor?: (n: MapNode) => string; legend?: { label: string; color: string }[]; query?: string;
}) {
  const lang = useLang();
  const { t, reset, zoomRef, handlers } = usePanZoom();
  const [hover, setHover] = useState<string | null>(null);

  const nodes = payload.nodes;
  const edges = useMemo(() => payload.edges.filter((e) => e.w >= minWeight), [payload.edges, minWeight]);
  const pos = useMemo(() => layout(nodes), [nodes]);
  const colorFallback = useMemo(() => makeCategoryColor(nodes.map((n) => n.theme)), [nodes]);
  const color = (n: MapNode) => (colorFor ? colorFor(n) : colorFallback(n.theme));
  const legend = legendProp ?? legendFor(nodes.map((n) => n.theme));
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
  const q = query.trim().toLowerCase();
  const ec = (id: string) => { const n = byId.get(id); return n ? color(n) : "#64748b"; };
  // one reusable spherical gradient per colour (light highlight -> base -> dark rim = volume on any theme)
  const gradId = new Map<string, string>();
  for (const n of nodes) { const c = color(n); if (!gradId.has(c)) gradId.set(c, `atl-sph-${gradId.size}`); }

  if (edges.length === 0) {
    return (
      <div className="viz-wrap">
        <div className="viz-toolbar">
          <span className="viz-hint">{nodes.length} {lang === "es" ? "nodos" : "nodes"} · 0 {lang === "es" ? "relaciones" : "edges"}</span>
        </div>
        <p className="viz-empty">{lang === "es" ? "Sin relaciones en este umbral — baja el umbral." : "No relations at this threshold — lower the threshold."}</p>
      </div>
    );
  }

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
          <filter id="atl-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2.6" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {Array.from(gradId).map(([c, id]) => (
            <radialGradient key={id} id={id} cx="0.35" cy="0.3" r="0.75">
              <stop offset="0%" stopColor={shade(c, 0.55)} />
              <stop offset="55%" stopColor={c} />
              <stop offset="100%" stopColor={shade(c, -0.32)} />
            </radialGradient>
          ))}
        </defs>
        <g transform={`translate(${t.x},${t.y}) scale(${t.k})`}>
          {/* edges coloured by their source community */}
          {edges.map((e, i) => {
            const a = pos.get(e.s); const b = pos.get(e.t);
            if (!a || !b) return null;
            const active = !hover || e.s === hover || e.t === hover;
            return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                         stroke={ec(e.s)}
                         strokeOpacity={active ? 0.14 + 0.5 * e.w : 0.04}
                         strokeWidth={(0.6 + 3.2 * e.w) / t.k} strokeLinecap="round" />;
          })}
          {/* soft colour aura (theme-agnostic: a translucent tint, not a blend mode) */}
          {nodes.map((n) => {
            const p = pos.get(n.id); if (!p) return null;
            const r = (3.2 + 1.4 * Math.sqrt(deg.get(n.id) ?? 0)) / t.k;
            const matchDim = q.length > 0 && !n.title.toLowerCase().includes(q);
            const active = !matchDim && (!hoverSet || hoverSet.has(n.id));
            if (matchDim || !active) return null;
            return <circle key={n.id} cx={p.x} cy={p.y} r={r * 2.1} fill={color(n)} fillOpacity={0.1} />;
          })}
          {/* spherical cores: radial gradient (highlight -> base -> dark rim) reads as volume on light or dark */}
          {nodes.map((n) => {
            const p = pos.get(n.id); if (!p) return null;
            const r = (3.2 + 1.4 * Math.sqrt(deg.get(n.id) ?? 0)) / t.k;
            const c = color(n);
            const matchDim = q.length > 0 && !n.title.toLowerCase().includes(q);
            const matchHit = q.length > 0 && !matchDim;
            const active = !matchDim && (!hoverSet || hoverSet.has(n.id));
            return <circle key={n.id} cx={p.x} cy={p.y} r={r}
                           fill={matchDim ? "#94a3b8" : `url(#${gradId.get(c)})`}
                           fillOpacity={matchDim ? 0.15 : active ? 1 : 0.4}
                           filter={n.id === hover || matchHit ? "url(#atl-glow)" : undefined}
                           stroke={n.id === hover || matchHit ? "#fff" : shade(c, -0.35)}
                           strokeWidth={(n.id === hover || matchHit ? 1.5 : 0.5) / t.k}
                           strokeOpacity={active ? 0.9 : 0.3}
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
