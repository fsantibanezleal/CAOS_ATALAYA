import { Suspense, lazy, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import type { GraphPayload, MapNode } from "@/lib/types";
import { useLang } from "@/lib/useLang";

// react-force-graph default exports are permissively typed; cast to accept our prop bag.
const ForceGraph2D = lazy(() => import("react-force-graph-2d")) as unknown as ComponentType<Record<string, unknown>>;
const ForceGraph3D = lazy(() => import("react-force-graph-3d")) as unknown as ComponentType<Record<string, unknown>>;

interface GNode { id: string; name: string; theme: string; deg: number; color: string; dim: boolean }
interface GLink { source: string; target: string; w: number }

/** WebGL graph renderer: a canvas 2D "glow" mode (additive blending -> the nebula look) and a three.js 3D mode
 * with Unreal bloom. Live force simulation (drag nodes, they spring); zoom/pan/orbit. Heavy, so lazy-loaded and
 * only mounted when the user picks a WebGL mode. Dark viz surface (additive glow needs a dark background). */
export default function GraphGL({
  payload, minWeight, mode, showLabels, query, colorFor,
}: {
  payload: GraphPayload; minWeight: number; mode: "glow" | "3d"; showLabels: boolean; query: string;
  colorFor: (n: MapNode) => string;
}) {
  const lang = useLang();
  const fgRef = useRef<{
    postProcessingComposer?: () => { addPass: (p: unknown) => void };
    zoomToFit?: (ms?: number, px?: number) => void;
    pauseAnimation?: () => void; resumeAnimation?: () => void;
  } | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 800, h: 560 });

  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: 560 }));
    ro.observe(el); return () => ro.disconnect();
  }, []);

  // Compute-bomb guard: react-force-graph keeps a render rAF alive for interaction. Pause it whenever the browser
  // tab is hidden so a graph left on-screen in a background tab never burns CPU unattended (no-autoplay rule).
  useEffect(() => {
    const onVis = () => {
      const fg = fgRef.current; if (!fg) return;
      if (document.hidden) fg.pauseAnimation?.(); else fg.resumeAnimation?.();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const data = useMemo(() => {
    const edges = payload.edges.filter((e) => e.w >= minWeight);
    const deg = new Map<string, number>();
    edges.forEach((e) => { deg.set(e.s, (deg.get(e.s) ?? 0) + 1); deg.set(e.t, (deg.get(e.t) ?? 0) + 1); });
    const used = new Set<string>([...edges.map((e) => e.s), ...edges.map((e) => e.t)]);
    const q = query.trim().toLowerCase();
    const nodes: GNode[] = payload.nodes.filter((n) => used.has(n.id)).map((n) => ({
      id: n.id, name: n.title, theme: n.theme, deg: deg.get(n.id) ?? 0,
      color: colorFor(n), dim: q.length > 0 && !n.title.toLowerCase().includes(q),
    }));
    const links: GLink[] = edges.map((e) => ({ source: e.s, target: e.t, w: e.w }));
    return { nodes, links };
  }, [payload, minWeight, query, colorFor]);

  // 3D bloom pass
  useEffect(() => {
    if (mode !== "3d") return;
    let cancelled = false;
    const id = setTimeout(() => {
      const fg = fgRef.current;
      if (!fg?.postProcessingComposer) return;
      import("three/examples/jsm/postprocessing/UnrealBloomPass.js").then(({ UnrealBloomPass }) => {
        if (cancelled) return;
        try {
          const bloom = new (UnrealBloomPass as unknown as new () => { strength: number; radius: number; threshold: number })();
          bloom.strength = 0.8; bloom.radius = 0.5; bloom.threshold = 0.2;   // subtle glow, not a white-out
          fg.postProcessingComposer!().addPass(bloom);
        } catch { /* bloom is a nicety; ignore if the pass API shifts */ }
      }).catch(() => { /* ignore */ });
    }, 400);
    return () => { cancelled = true; clearTimeout(id); };
  }, [mode]);

  const common: Record<string, unknown> = {
    ref: fgRef,
    graphData: data,
    width: size.w,
    height: size.h,
    backgroundColor: "#070b12",
    nodeLabel: (n: GNode) => `${n.name} · ${n.theme} · ${n.deg} rel`,
    nodeVal: (n: GNode) => 1 + Math.sqrt(n.deg),
    nodeColor: (n: GNode) => (n.dim ? "#334155" : n.color),
    cooldownTicks: 120,
    onEngineStop: () => fgRef.current?.zoomToFit?.(500, 40),
  };

  if (data.nodes.length === 0) {
    return (
      <div ref={wrapRef} className="graphgl-wrap graphgl-empty">
        <p className="viz-empty">{lang === "es" ? "Sin relaciones en este umbral. Bajar el umbral." : "No relations at this threshold. Lower the threshold."}</p>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="graphgl-wrap">
      <Suspense fallback={<div className="banner">{lang === "es" ? "Cargando el renderizador…" : "Loading renderer…"}</div>}>
        {mode === "3d" ? (
          <ForceGraph3D
            {...common}
            nodeOpacity={0.92}
            linkColor={() => "rgba(120,180,255,0.28)"}
            linkOpacity={0.35}
            linkWidth={(l: GLink) => 0.3 + 2 * l.w}
            enableNodeDrag
          />
        ) : (
          <ForceGraph2D
            {...common}
            nodeCanvasObjectMode={() => "replace"}
            linkCanvasObjectMode={() => "replace"}
            linkCanvasObject={(link: { source: { x: number; y: number }; target: { x: number; y: number }; w: number }, ctx: CanvasRenderingContext2D) => {
              const s = link.source, tg = link.target;
              if (!s || !tg || !Number.isFinite(s.x) || !Number.isFinite(s.y) || !Number.isFinite(tg.x) || !Number.isFinite(tg.y)) return;
              ctx.save();
              ctx.globalCompositeOperation = "lighter";
              ctx.strokeStyle = `rgba(96,165,250,${0.04 + 0.28 * link.w})`;
              ctx.lineWidth = 0.35 + 1.6 * link.w;
              ctx.beginPath(); ctx.moveTo(link.source.x, link.source.y); ctx.lineTo(link.target.x, link.target.y); ctx.stroke();
              ctx.restore();
            }}
            nodeCanvasObject={(node: GNode & { x: number; y: number }, ctx: CanvasRenderingContext2D, scale: number) => {
              if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;  // first frame before layout positions
              const r = 1.6 + Math.sqrt(node.deg) * 1.1;
              ctx.save();
              if (!node.dim) {
                ctx.globalCompositeOperation = "lighter";
                const grd = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r * 3.2);
                grd.addColorStop(0, node.color + "cc");
                grd.addColorStop(1, node.color + "00");
                ctx.fillStyle = grd;
                ctx.beginPath(); ctx.arc(node.x, node.y, r * 3.2, 0, 2 * Math.PI); ctx.fill();
              }
              ctx.globalCompositeOperation = "source-over";
              ctx.fillStyle = node.dim ? "#2a3446" : node.color;
              ctx.beginPath(); ctx.arc(node.x, node.y, r, 0, 2 * Math.PI); ctx.fill();
              if (showLabels && scale > 2.2 && !node.dim) {
                ctx.fillStyle = "#cbd5e1"; ctx.font = `${9 / scale}px system-ui`;
                ctx.fillText(node.name.slice(0, 26), node.x + r + 1.5, node.y + 3 / scale);
              }
              ctx.restore();
            }}
            enableNodeDrag
          />
        )}
      </Suspense>
    </div>
  );
}
