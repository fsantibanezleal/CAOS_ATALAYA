import { useCallback, useRef, useState } from "react";

export interface Transform { k: number; x: number; y: number }

/** Minimal pan + wheel-zoom for an SVG/HTML viewport. Returns the transform, handlers, and a reset. Keyboard
 * accessible via the returned onKeyDown (arrows pan, +/- zoom). No animation loop (satisfies the no-compute-bomb
 * rule · it only updates state on user input). */
export function usePanZoom(initial: Transform = { k: 1, x: 0, y: 0 }) {
  const [t, setT] = useState<Transform>(initial);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
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
    if (!drag.current) return;
    setT((p) => ({ ...p, x: drag.current!.ox + (e.clientX - drag.current!.x),
      y: drag.current!.oy + (e.clientY - drag.current!.y) }));
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

  return { t, reset, handlers: { onWheel, onPointerDown, onPointerMove, onPointerUp, onKeyDown } };
}
