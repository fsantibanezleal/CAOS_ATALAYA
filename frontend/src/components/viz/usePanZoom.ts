import { useCallback, useEffect, useRef, useState } from "react";

export interface Transform { k: number; x: number; y: number }

/** Minimal pan + wheel-zoom for an SVG/HTML viewport. Returns the transform, handlers, a reset, and a `zoomRef`
 * to attach to the viewport element (a NON-passive wheel listener is bound there so zoom can preventDefault the
 * page scroll without the passive-listener warning). Keyboard accessible (arrows pan, +/- zoom). No animation
 * loop (it only updates state on user input), so no compute bomb. */
export function usePanZoom(initial: Transform = { k: 1, x: 0, y: 0 }) {
  const [t, setT] = useState<Transform>(initial);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const zoomRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const el = zoomRef.current;
    if (!el) return;
    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setT((p) => {
        const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
        const k = Math.max(0.3, Math.min(12, p.k * factor));
        const x = mx - (mx - p.x) * (k / p.k);
        const y = my - (my - p.y) * (k / p.k);
        return { k, x, y };
      });
    };
    el.addEventListener("wheel", onWheelNative, { passive: false });
    return () => el.removeEventListener("wheel", onWheelNative);
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    // fallback for any element that binds handlers without the ref (native listener above is the primary path)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setT((p) => {
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const k = Math.max(0.3, Math.min(12, p.k * factor));
      // zoom toward the cursor
      const x = mx - (mx - p.x) * (k / p.k);
      const y = my - (my - p.y) * (k / p.k);
      return { k, x, y };
    });
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: t.x, oy: t.y };
  }, [t.x, t.y]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current;               // snapshot: the setT updater may flush after pointerup nulls drag.current
    if (!d) return;
    const nx = d.ox + (e.clientX - d.x);
    const ny = d.oy + (e.clientY - d.y);
    setT((p) => ({ ...p, x: nx, y: ny }));
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    drag.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = 30;
    if (e.key === "ArrowLeft") setT((p) => ({ ...p, x: p.x + step }));
    else if (e.key === "ArrowRight") setT((p) => ({ ...p, x: p.x - step }));
    else if (e.key === "ArrowUp") setT((p) => ({ ...p, y: p.y + step }));
    else if (e.key === "ArrowDown") setT((p) => ({ ...p, y: p.y - step }));
    else if (e.key === "+" || e.key === "=") setT((p) => ({ ...p, k: Math.min(12, p.k * 1.15) }));
    else if (e.key === "-") setT((p) => ({ ...p, k: Math.max(0.3, p.k / 1.15) }));
    else return;
    e.preventDefault();
  }, []);

  const reset = useCallback(() => setT(initial), [initial]);

  // onWheel is intentionally NOT in handlers: the non-passive native listener (zoomRef) is the wheel path, so it
  // can preventDefault the page scroll. onWheel is exported only for callers without a ref.
  void onWheel;
  return { t, reset, zoomRef, handlers: { onPointerDown, onPointerMove, onPointerUp, onKeyDown } };
}
