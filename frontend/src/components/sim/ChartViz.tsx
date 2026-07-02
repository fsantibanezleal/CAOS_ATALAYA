import type { ChartTrace } from "@/lib/types";

/** Multi-line chart for a ChartTrace: optional confidence band, horizontal reference lines, a histogram,
 *  and a playhead that reveals the series up to the current x (so CI-narrowing / bullwhip build-up are
 *  visible while playing). Theme-aware via CSS variables. */
export function ChartViz({ trace, current, es }: { trace: ChartTrace; current: number; es: boolean }) {
  const xs = trace.series.x ?? [];
  if (xs.length < 2) return null;
  const W = 580;
  const H = 270;
  const ml = 48;
  const mr = 14;
  const mt = 14;
  const mb = 40;
  const plotW = W - ml - mr;
  const plotH = H - mt - mb;
  const xMin = xs[0];
  const xMax = xs[xs.length - 1] || 1;

  let yMax = 0;
  for (const ln of trace.lines) for (const v of trace.series[ln.key] ?? []) yMax = Math.max(yMax, v);
  if (trace.band) for (const v of trace.series[trace.band.hi] ?? []) yMax = Math.max(yMax, v);
  for (const r of trace.ref_lines) yMax = Math.max(yMax, r.y);
  yMax = yMax > 0 ? yMax * 1.08 : 1;

  const sx = (x: number) => ml + ((x - xMin) / (xMax - xMin || 1)) * plotW;
  const sy = (y: number) => mt + plotH - (Math.max(0, y) / yMax) * plotH;
  const idx = Math.max(0, Math.min(current, xs.length - 1));
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((g) => g * yMax);
  const curX = sx(xs[idx]);

  // histogram scale
  const bars = trace.bars;
  const HB = bars ? 120 : 0;
  const bMax = bars ? Math.max(1, ...bars.counts) : 1;

  return (
    <div className="chart-stage">
      <svg className="fig-svg wide" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={trace.title}>
        {yTicks.map((y, i) => (
          <g key={i}>
            <line className="dg-grid" x1={ml} y1={sy(y)} x2={W - mr} y2={sy(y)} />
            <text className="dg-tick" x={ml - 5} y={sy(y) + 3} textAnchor="end">{y.toFixed(y < 1 ? 2 : 1)}</text>
          </g>
        ))}
        <line className="dg-axis" x1={ml} y1={mt} x2={ml} y2={mt + plotH} />
        <line className="dg-axis" x1={ml} y1={mt + plotH} x2={W - mr} y2={mt + plotH} />
        <text className="dg-axis-label" x={W - mr} y={H - 6} textAnchor="end">{es ? trace.x_label_es : trace.x_label_en}</text>
        <text className="dg-axis-label" transform={`translate(12 ${mt + plotH / 2}) rotate(-90)`} textAnchor="middle">
          {es ? trace.y_label_es : trace.y_label_en}
        </text>

        {/* confidence band up to current */}
        {trace.band && (() => {
          const lo = trace.series[trace.band.lo] ?? [];
          const hi = trace.series[trace.band.hi] ?? [];
          const up = xs.slice(0, idx + 1).map((x, i) => `${sx(x)},${sy(hi[i] ?? 0)}`);
          const dn = xs.slice(0, idx + 1).map((x, i) => `${sx(x)},${sy(lo[i] ?? 0)}`).reverse();
          return <polygon points={[...up, ...dn].join(" ")} fill={trace.band.color} opacity={0.18} stroke="none" />;
        })()}

        {/* reference lines (theory) */}
        {trace.ref_lines.map((r, i) => (
          <g key={i}>
            <line x1={ml} y1={sy(r.y)} x2={W - mr} y2={sy(r.y)} stroke={r.color} strokeWidth={1.5} strokeDasharray="5 4" />
            <text x={W - mr - 2} y={sy(r.y) - 4} textAnchor="end" fontSize={11} fill={r.color}>{es ? r.label_es : r.label_en}</text>
          </g>
        ))}

        {/* lines revealed up to current */}
        {trace.lines.map((ln) => {
          const ys = trace.series[ln.key] ?? [];
          const pts = xs.slice(0, idx + 1).map((x, i) => `${sx(x)},${sy(ys[i] ?? 0)}`).join(" ");
          return <polyline key={ln.key} points={pts} fill="none" stroke={ln.color} strokeWidth={2}
                           strokeDasharray={ln.dashed ? "5 4" : undefined} />;
        })}

        <line x1={curX} y1={mt} x2={curX} y2={mt + plotH} stroke="var(--color-fg-faint)" strokeWidth={1} strokeDasharray="3 3" />

        {/* leading-edge markers so the eye tracks "now" on each series */}
        {trace.lines.map((ln) => {
          const ys = trace.series[ln.key] ?? [];
          return <circle key={`led-${ln.key}`} cx={curX} cy={sy(ys[idx] ?? 0)} r={3.4} fill={ln.color} stroke="var(--color-bg)" strokeWidth={1} />;
        })}
      </svg>

      <p className="hint chart-legend">
        {trace.lines.map((ln) => (
          <span key={ln.key} className="grid-legend-item"><span className="legend-dot" style={{ background: ln.color }} /> {es ? ln.label_es : ln.label_en}</span>
        ))}
        {trace.band && <span className="grid-legend-item"><span className="legend-dot" style={{ background: trace.band.color, opacity: 0.4 }} /> {es ? trace.band.label_es : trace.band.label_en}</span>}
      </p>

      {bars && (
        <svg className="fig-svg wide" viewBox={`0 0 ${W} ${HB + 30}`} role="img" aria-label={es ? bars.label_es : bars.label_en}>
          <text className="dg-axis-label" x={ml} y={12}>{es ? bars.label_es : bars.label_en}</text>
          {bars.counts.map((cnt, i) => {
            const x0 = ml + (i / bars.counts.length) * plotW;
            const bw = (plotW / bars.counts.length) - 1;
            const bh = (cnt / bMax) * HB;
            return <rect key={i} x={x0} y={20 + HB - bh} width={bw} height={bh} fill={bars.color} opacity={0.7} />;
          })}
          <line className="dg-axis" x1={ml} y1={20 + HB} x2={W - mr} y2={20 + HB} />
          <text className="dg-tick" x={ml} y={HB + 32} textAnchor="start">{bars.edges[0]}</text>
          <text className="dg-tick" x={W - mr} y={HB + 32} textAnchor="end">{bars.edges[bars.edges.length - 1]}</text>
        </svg>
      )}
    </div>
  );
}
