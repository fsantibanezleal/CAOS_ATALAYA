import { Suspense, lazy, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import type { MapNode } from "@/lib/types";
import { useLang } from "@/lib/useLang";

const ForceGraph3D = lazy(() => import("react-force-graph-3d")) as unknown as ComponentType<Record<string, unknown>>;

interface P3 { id: string; name: string; theme: string; color: string; fx: number; fy: number; fz: number }

/** 3-D embedding cartography: every dataset placed at its 3-D PCA coordinate (fixed, no physics) in an orbitable
 * three.js scene, coloured by the chosen facet. The 2-D map stays the precise SVG; this is the "pretty" spatial
 * view. Heavy (three.js) so lazy-loaded; the layout is fixed (fx/fy/fz) so no force simulation runs. */
export default function ScatterMap3D({ nodes, colorFn }: { nodes: MapNode[]; colorFn: (n: MapNode) => string }) {
  const lang = useLang();
  const fgRef = useRef<{ pauseAnimation?: () => void; resumeAnimation?: () => void; zoomToFit?: (ms?: number, px?: number) => void } | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 800, h: 540 });

  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: 540 }));
    ro.observe(el); return () => ro.disconnect();
  }, []);

  // no unattended CPU: pause the render loop when the tab is hidden
  useEffect(() => {
    const onVis = () => { const fg = fgRef.current; if (!fg) return; if (document.hidden) fg.pauseAnimation?.(); else fg.resumeAnimation?.(); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // fit the camera to the cloud once it is laid out (fixed positions -> onEngineStop can fire too early)
  useEffect(() => {
    if (!nodes.some((n) => n.coord3)) return;
    const id = setTimeout(() => fgRef.current?.zoomToFit?.(700, 60), 400);
    return () => clearTimeout(id);
  }, [nodes, size.w]);

  const data = useMemo(() => {
    const ns: P3[] = nodes.filter((n) => n.coord3).map((n) => ({
      id: n.id, name: n.title, theme: n.theme, color: colorFn(n),
      fx: n.coord3![0], fy: n.coord3![1], fz: n.coord3![2],
    }));
    return { nodes: ns, links: [] as unknown[] };
  }, [nodes, colorFn]);

  return (
    <div ref={wrapRef} className="graphgl-wrap">
      <Suspense fallback={<div className="banner">{lang === "es" ? "Cargando el renderizador 3D…" : "Loading 3D renderer…"}</div>}>
        <ForceGraph3D
          ref={fgRef}
          graphData={data}
          width={size.w}
          height={size.h}
          backgroundColor="#070b12"
          nodeLabel={(n: P3) => `${n.name} · ${n.theme}`}
          nodeColor={(n: P3) => n.color}
          nodeOpacity={0.9}
          nodeRelSize={3}
          nodeResolution={12}
          enableNodeDrag={false}
          cooldownTicks={0}
          warmupTicks={0}
          onEngineStop={() => fgRef.current?.zoomToFit?.(600, 40)}
        />
      </Suspense>
    </div>
  );
}
