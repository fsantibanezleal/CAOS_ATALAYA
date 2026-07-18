import { useMemo, useState } from "react";
import type { GraphPayload, GraphEdgeRow, MapNode } from "@/lib/types";
import { useLang } from "@/lib/useLang";
import { viridis, fmt } from "./vizUtils";

const W = 820, H = 340, MARGIN = 24, BASE = H - 70;

/** Arc diagram: nodes on a single baseline ordered by mined community (cluster), each relation drawn as a
 * semicircle above it. Intra-community links are short arcs; the long high arcs are the cross-community BRIDGES,
 * which a force layout buries inside the hairball. Best for the sparse lenses (correlations, high-threshold
 * joinability). For a correlation network the arc is signed: green = positive ρ, red = negative. No physics. */
export default function GraphArc({
  payload, minWeight = 0, edgeLabel = "strength", colorFor, query = "", signed = false,
}: {
  payload: GraphPayload; minWeight?: number; edgeLabel?: string;
  colorFor?: (n: MapNode) => string; query?: string; signed?: boolean;
}) {
  const lang = useLang();
  const [hover, setHover] = useState<number | null>(null);

  const model = useMemo(() => {
    const edges = payload.edges.filter((e) => e.w >= minWeight);
    const deg = new Map<string, number>();
    edges.forEach((e) => { deg.set(e.s, (deg.get(e.s) ?? 0) + 1); deg.set(e.t, (deg.get(e.t) ?? 0) + 1); });
    const nodes = payload.nodes.filter((n) => deg.has(n.id))
      .sort((a, b) => (a.cluster - b.cluster) || a.title.localeCompare(b.title));
    const idx = new Map(nodes.map((n, i) => [n.id, i]));
    return { nodes, idx, edges, deg };
  }, [payload, minWeight]);

  const { nodes, idx, edges, deg } = model;
  const n = nodes.length;
  const q = query.trim().toLowerCase();
  const step = n > 1 ? (W - 2 * MARGIN) / (n - 1) : 0;
  const xOf = (i: number) => MARGIN + i * step;

  if (n === 0) {
    return <div className="viz-wrap"><p className="viz-empty">{lang === "es" ? "Sin relaciones en este umbral. Bajar el umbral." : "No relations at this threshold. Lower the threshold."}</p></div>;
  }

  const hoverNode = hover != null ? nodes[hover] : null;
  const hoverEdges = hover != null ? edges.filter((e) => idx.get(e.s) === hover || idx.get(e.t) === hover) : [];

  const edgeColor = (e: GraphEdgeRow): string => {
    if (signed) return (Number(e.ev?.rho ?? 0) >= 0 ? "#10b981" : "#ef4444");
    return viridis(0.2 + 0.8 * e.w);
  };

  const onMove = (ev: React.PointerEvent<SVGSVGElement>) => {
    const rect = ev.currentTarget.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * W;
    const i = Math.round((x - MARGIN) / (step || 1));
    setHover(i >= 0 && i < n ? i : null);
  };

  return (
    <div className="viz-wrap">
      <div className="viz-toolbar">
        <span className="viz-hint">
          {n} {lang === "es" ? "datasets" : "datasets"} · {edges.length} {lang === "es" ? "relaciones" : "relations"} · {lang === "es" ? "ordenado por clúster · arcos altos = puentes" : "ordered by cluster · high arcs = bridges"}
          {signed ? (lang === "es" ? " · verde +ρ / rojo −ρ" : " · green +ρ / red −ρ") : ""}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="viz-svg viz-arc" role="img" onPointerMove={onMove} onPointerLeave={() => setHover(null)}
           aria-label={lang === "es" ? "Diagrama de arcos de relaciones" : "Relation arc diagram"}>
        {/* edges: semicircle per relation, signed green (+rho) / red (-rho) for correlations */}
        {edges.map((e, k) => {
          const i = idx.get(e.s)!, j = idx.get(e.t)!;
          const xi = xOf(i), xj = xOf(j);
          const r = Math.abs(xj - xi) / 2;
          const active = hover == null || i === hover || j === hover;
          const dimQ = q.length > 0 && !(nodes[i].title.toLowerCase().includes(q) || nodes[j].title.toLowerCase().includes(q));
          return (
            <path key={k} d={`M ${xi} ${BASE} A ${r} ${r} 0 0 0 ${xj} ${BASE}`} fill="none"
                  stroke={edgeColor(e)} strokeOpacity={dimQ ? 0.06 : active ? 0.35 + 0.55 * e.w : 0.08}
                  strokeWidth={0.6 + 3 * e.w} strokeLinecap="round" />
          );
        })}
        {/* baseline */}
        <line x1={MARGIN} y1={BASE} x2={W - MARGIN} y2={BASE} stroke="rgba(148,163,184,0.5)" strokeWidth={1} />
        {/* nodes on the baseline + cluster gutter tick */}
        {nodes.map((nd, i) => {
          const x = xOf(i);
          const c = colorFor ? colorFor(nd) : "#64748b";
          const dimQ = q.length > 0 && !nd.title.toLowerCase().includes(q);
          const active = hover == null || i === hover || hoverEdges.some((e) => idx.get(e.s) === i || idx.get(e.t) === i);
          const rr = 2 + Math.min(3, Math.sqrt(deg.get(nd.id) ?? 0));
          return (
            <g key={nd.id}>
              <rect x={x - Math.max(0.5, step / 2)} y={BASE + 4} width={Math.max(1, step)} height={7} fill={c} fillOpacity={dimQ ? 0.15 : 0.85} />
              <circle cx={x} cy={BASE} r={i === hover ? rr + 1.5 : rr} fill={c} fillOpacity={dimQ ? 0.15 : active ? 1 : 0.3}
                      stroke={i === hover ? "var(--color-fg)" : "none"} strokeWidth={1} />
            </g>
          );
        })}
      </svg>
      {hoverNode ? (
        <div className="viz-readout" role="status">
          <strong>{hoverNode.title}</strong>
          <span>{hoverNode.theme} · {lang === "es" ? "clúster" : "cluster"} {hoverNode.cluster} · {hoverEdges.length} {lang === "es" ? "relaciones" : "relations"}</span>
          <span className="viz-edge-list">
            {hoverEdges.slice().sort((x, y) => y.w - x.w).slice(0, 6).map((e, k) => {
              const otherId = idx.get(e.s) === hover ? e.t : e.s;
              const other = nodes[idx.get(otherId)!];
              return <span key={k}>{other?.title?.slice(0, 40) ?? otherId} · {edgeLabel} {fmt(e.w, 2)}{signed && e.ev?.rho !== undefined ? ` (ρ ${fmt(Number(e.ev.rho), 2)})` : ""}</span>;
            })}
          </span>
        </div>
      ) : <div className="viz-readout viz-readout-idle">{lang === "es" ? "Al mover el cursor por la línea base se resalta un dataset y sus puentes" : "Move along the baseline to highlight a dataset and its bridges"}</div>}
    </div>
  );
}
