import type { GridTrace } from "@/lib/types";

export interface SeriesKey {
  key: string;
  color: string; // CSS var() expression
  labelEn: string;
  labelEs: string;
}

/** Line chart of per-step series (e.g. SIR S/I/R fractions, or Schelling segregation), all in [0,1],
 *  with a vertical marker at the current frame. Theme-aware via CSS variables. */
export function SeriesChart({
  trace,
  keys,
  current,
  es,
}: {
  trace: GridTrace;
  keys: SeriesKey[];
  current: number;
  es: boolean;
}) {
  const xs = trace.series.x ?? [];
  if (xs.length < 2) return null;
  const W = 520;
  const H = 200;
  const ml = 38;
  const mr = 12;
  const mt = 12;
  const mb = 28;
  const plotW = W - ml - mr;
  const plotH = H - mt - mb;
  const xMax = xs[xs.length - 1] || 1;
  const sx = (x: number) => ml + (x / xMax) * plotW;
  const sy = (y: number) => mt + plotH - Math.max(0, Math.min(1, y)) * plotH;
  const curX = sx(xs[Math.max(0, Math.min(current, xs.length - 1))] ?? 0);

  return (
    <div className="card">
      <h3>{es ? "Evolución" : "Over time"}</h3>
      <svg className="fig-svg wide" viewBox={`0 0 ${W} ${H}`} role="img">
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <g key={g}>
            <line className="dg-grid" x1={ml} y1={sy(g)} x2={W - mr} y2={sy(g)} />
            <text className="dg-tick" x={ml - 5} y={sy(g) + 3} textAnchor="end">{g}</text>
          </g>
        ))}
        <line className="dg-axis" x1={ml} y1={mt} x2={ml} y2={mt + plotH} />
        <line className="dg-axis" x1={ml} y1={mt + plotH} x2={W - mr} y2={mt + plotH} />
        <text className="dg-tick" x={W - mr} y={H - 8} textAnchor="end">{es ? "paso" : "step"}</text>
        {/* current-frame marker */}
        <line x1={curX} y1={mt} x2={curX} y2={mt + plotH} stroke="var(--color-fg-faint)" strokeWidth={1} strokeDasharray="3 3" />
        {keys.map((k) => {
          const ys = trace.series[k.key] ?? [];
          const pts = xs.map((x, i) => `${sx(x)},${sy(ys[i] ?? 0)}`).join(" ");
          return <polyline key={k.key} points={pts} fill="none" stroke={k.color} strokeWidth={2} />;
        })}
      </svg>
      <p className="hint">
        {keys.map((k, i) => (
          <span key={k.key} style={{ marginRight: "1rem" }}>
            <span className="legend-dot" style={{ background: k.color }} /> {es ? k.labelEs : k.labelEn}
            {i < 0 ? "" : ""}
          </span>
        ))}
      </p>
    </div>
  );
}
