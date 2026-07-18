import { useEffect, useMemo, useRef, useState } from "react";
import type { GraphPayload, GraphEdgeRow, MapNode } from "@/lib/types";
import { useLang } from "@/lib/useLang";
import { viridis, fmt } from "./vizUtils";

const SIDE = 560;        // square drawing area (px)
const GUTTER = 12;       // cluster colour strip (px)
const CAP = 160;         // readable/interactive cap; larger graphs show the top-CAP most connected

/** Cluster-reordered adjacency matrix: the occlusion-free reading of a dense relation network. Rows and columns
 * are the datasets, ordered by mined community (cluster) then degree, so communities appear as bright blocks on
 * the diagonal; a filled cell (i,j) is a relation, its colour the strength (viridis). This answers what a
 * node-link hairball cannot: within a community, is it a clique (fully joinable) or a star (one hub)? Drawn to a
 * canvas (only the real edges are painted, so it is O(edges), fast even for hundreds of nodes). */
export default function GraphMatrix({
  payload, minWeight = 0, edgeLabel = "strength", colorFor, query = "",
}: {
  payload: GraphPayload; minWeight?: number; edgeLabel?: string;
  colorFor?: (n: MapNode) => string; query?: string;
}) {
  const lang = useLang();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverCell, setHoverCell] = useState<{ i: number; j: number } | null>(null);

  const model = useMemo(() => {
    const edges = payload.edges.filter((e) => e.w >= minWeight);
    const deg = new Map<string, number>();
    edges.forEach((e) => { deg.set(e.s, (deg.get(e.s) ?? 0) + 1); deg.set(e.t, (deg.get(e.t) ?? 0) + 1); });
    const used = payload.nodes.filter((n) => deg.has(n.id));
    // Order by community then degree; cap to the most-connected for readability on large graphs.
    used.sort((a, b) => (a.cluster - b.cluster) || ((deg.get(b.id) ?? 0) - (deg.get(a.id) ?? 0)));
    const capped = used.length > CAP;
    const nodes = capped ? used.slice(0, CAP) : used;
    const idx = new Map(nodes.map((n, i) => [n.id, i]));
    const cellOf = new Map<string, GraphEdgeRow>();
    for (const e of edges) {
      if (!idx.has(e.s) || !idx.has(e.t)) continue;
      cellOf.set(`${e.s}|${e.t}`, e);
    }
    const wOf = (i: number, j: number): GraphEdgeRow | undefined =>
      cellOf.get(`${nodes[i].id}|${nodes[j].id}`) ?? cellOf.get(`${nodes[j].id}|${nodes[i].id}`);
    return { nodes, idx, wOf, capped, total: used.length, edgeCount: edges.length };
  }, [payload, minWeight]);

  const { nodes } = model;
  const n = nodes.length;
  const cell = n > 0 ? (SIDE - GUTTER) / n : 0;
  const q = query.trim().toLowerCase();

  useEffect(() => {
    const cv = canvasRef.current; if (!cv || n === 0) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = SIDE * dpr; cv.height = SIDE * dpr;
    const ctx = cv.getContext("2d"); if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, SIDE, SIDE);

    // cluster gutters (top + left)
    nodes.forEach((nd, i) => {
      const p = GUTTER + i * cell;
      const c = colorFor ? colorFor(nd) : "#64748b";
      ctx.fillStyle = c;
      ctx.fillRect(p, 0, Math.max(1, cell), GUTTER - 2);       // top
      ctx.fillRect(0, p, GUTTER - 2, Math.max(1, cell));       // left
    });

    // faint grid background for the matrix body
    ctx.fillStyle = "rgba(148,163,184,0.06)";
    ctx.fillRect(GUTTER, GUTTER, SIDE - GUTTER, SIDE - GUTTER);

    // diagonal (self) faint cluster tint
    ctx.fillStyle = "rgba(148,163,184,0.10)";
    for (let i = 0; i < nodes.length; i++) {
      const p = GUTTER + i * cell;
      ctx.fillRect(p, p, Math.max(1, cell), Math.max(1, cell));
    }

    // cells: only real edges are painted (symmetric)
    for (const e of payload.edges) {
      if (e.w < minWeight) continue;
      const i = model.idx.get(e.s); const j = model.idx.get(e.t);
      if (i === undefined || j === undefined) continue;
      const dim = q.length > 0 && !(nodes[i].title.toLowerCase().includes(q) || nodes[j].title.toLowerCase().includes(q));
      ctx.fillStyle = dim ? "rgba(100,116,139,0.18)" : viridis(0.15 + 0.85 * e.w);
      const xi = GUTTER + i * cell, xj = GUTTER + j * cell;
      ctx.fillRect(xj, xi, Math.max(1, cell), Math.max(1, cell));
      ctx.fillRect(xi, xj, Math.max(1, cell), Math.max(1, cell));
    }

    // hover crosshair
    if (hoverCell) {
      const { i, j } = hoverCell;
      ctx.strokeStyle = "rgba(226,232,240,0.7)"; ctx.lineWidth = 1;
      ctx.strokeRect(GUTTER + j * cell, GUTTER, Math.max(1, cell), SIDE - GUTTER);
      ctx.strokeRect(GUTTER, GUTTER + i * cell, SIDE - GUTTER, Math.max(1, cell));
    }
  }, [nodes, cell, n, colorFor, q, hoverCell, minWeight, payload.edges, model.idx]);

  if (n === 0) {
    return <div className="viz-wrap"><p className="viz-empty">{lang === "es" ? "Sin relaciones en este umbral. Bajar el umbral." : "No relations at this threshold. Lower the threshold."}</p></div>;
  }

  const onMove = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = ev.currentTarget.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * SIDE - GUTTER;
    const y = ((ev.clientY - rect.top) / rect.height) * SIDE - GUTTER;
    const j = Math.floor(x / cell), i = Math.floor(y / cell);
    if (i < 0 || j < 0 || i >= n || j >= n) { setHoverCell(null); return; }
    setHoverCell({ i, j });
  };

  const he = hoverCell ? model.wOf(hoverCell.i, hoverCell.j) : undefined;
  const a = hoverCell ? nodes[hoverCell.i] : null;
  const b = hoverCell ? nodes[hoverCell.j] : null;

  return (
    <div className="viz-wrap">
      <div className="viz-toolbar">
        <span className="viz-hint">
          {model.capped
            ? (lang === "es" ? `${n} de ${model.total} datasets más conectados · ${model.edgeCount} relaciones` : `${n} of ${model.total} most-connected datasets · ${model.edgeCount} relations`)
            : (lang === "es" ? `${n} datasets · ${model.edgeCount} relaciones · ordenado por clúster` : `${n} datasets · ${model.edgeCount} relations · ordered by cluster`)}
        </span>
      </div>
      <canvas ref={canvasRef} className="viz-matrix" style={{ width: SIDE, maxWidth: "100%", aspectRatio: "1 / 1" }}
              role="img" aria-label={lang === "es" ? "Matriz de adyacencia de relaciones" : "Relation adjacency matrix"}
              onPointerMove={onMove} onPointerLeave={() => setHoverCell(null)} />
      {a && b ? (
        <div className="viz-readout" role="status">
          <strong>{a.title.slice(0, 44)} <span className="mu">↔</span> {b.title.slice(0, 44)}</strong>
          <span>
            {he
              ? `${edgeLabel} ${fmt(he.w, 2)}${edgeEvidence(he, lang)}`
              : (lang === "es" ? "sin relación directa" : "no direct relation")}
            {" · "}{lang === "es" ? "clúster" : "cluster"} {a.cluster} / {b.cluster}
          </span>
        </div>
      ) : <div className="viz-readout viz-readout-idle">{lang === "es" ? "Al pasar el cursor por una celda: bloques en la diagonal = comunidades" : "Hover a cell: bright diagonal blocks are communities"}</div>}
    </div>
  );
}

function edgeEvidence(e: GraphEdgeRow, lang: string): string {
  const ev = e.ev || {};
  if (ev.containment !== undefined) return ` · ${lang === "es" ? "contención" : "containment"} ${fmt(ev.containment as number, 2)} (${ev.key})`;
  if (ev.rho !== undefined) return ` · ρ ${fmt(ev.rho as number, 2)}`;
  if (ev.cosine !== undefined) return ` · cos ${fmt(ev.cosine as number, 2)}`;
  return "";
}
