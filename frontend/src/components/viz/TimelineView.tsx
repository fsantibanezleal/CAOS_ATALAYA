import { useMemo, useState } from "react";
import type { TimelinePayload, TimelineRow } from "@/lib/types";
import { useLang } from "@/lib/useLang";
import { makeCategoryColor } from "./vizUtils";

/** Temporal coverage: a Gantt-like span per dataset (year_min..year_max) plus a per-year histogram of how many
 * datasets cover that year. Filter by scope / since via variant params. Colour by theme. */
export default function TimelineView({
  payload, scope = "all", since, sort = "start",
}: { payload: TimelinePayload; scope?: string; since?: number; sort?: string }) {
  const lang = useLang();
  const [hover, setHover] = useState<TimelineRow | null>(null);

  const rows = useMemo(() => {
    let r = payload.rows;
    if (scope && scope !== "all") r = r.filter((x) => x.keys.includes(scope));
    if (since) r = r.filter((x) => x.y1 >= since);
    // "By span length" orders the Gantt by coverage duration (longest first); the default orders by start year.
    const cmp = sort === "span"
      ? (a: TimelineRow, b: TimelineRow) => b.span - a.span || a.y0 - b.y0
      : (a: TimelineRow, b: TimelineRow) => a.y0 - b.y0 || b.span - a.span;
    return [...r].sort(cmp).slice(0, 60);
  }, [payload.rows, scope, since, sort]);

  const hist = Object.entries(payload.histogram).map(([y, c]) => ({ y: +y, c }))
    .filter((d) => !since || d.y >= since).sort((a, b) => a.y - b.y);
  const yMin = Math.min(...rows.map((r) => r.y0), ...(hist.length ? [hist[0].y] : [2000]));
  const yMax = Math.max(...rows.map((r) => r.y1), ...(hist.length ? [hist[hist.length - 1].y] : [2025]));
  const colorFn = useMemo(() => makeCategoryColor(rows.map((r) => r.theme)), [rows]);

  const W = 760, rowH = 16, PAD = 150;
  const sx = (y: number) => PAD + ((y - yMin) / (yMax - yMin || 1)) * (W - PAD - 20);
  const maxC = Math.max(1, ...hist.map((d) => d.c));

  return (
    <div className="viz-wrap">
      <span className="viz-hint">{rows.length} {lang === "es" ? "datasets fechados" : "dated datasets"} · {yMin}–{yMax}</span>
      <svg viewBox={`0 0 ${W} 110`} className="viz-svg" style={{ height: 110 }} role="img"
           aria-label={lang === "es" ? "Histograma de cobertura por año" : "Per-year coverage histogram"}>
        {hist.map((d, i) => (
          <rect key={i} x={sx(d.y)} y={100 - (d.c / maxC) * 88} width={Math.max(2, (W - PAD - 20) / (hist.length || 1) - 1)}
                height={(d.c / maxC) * 88} fill="var(--color-accent)" fillOpacity={0.55}>
            <title>{d.y}: {d.c} {lang === "es" ? "datasets" : "datasets"}</title>
          </rect>
        ))}
        <text x={PAD} y={12} className="viz-axis-lbl">{lang === "es" ? "datasets que cubren el año" : "datasets covering the year"} (max {maxC})</text>
        <text x={sx(yMin)} y={108} className="viz-axis-lbl">{yMin}</text>
        <text x={sx(yMax)} y={108} textAnchor="end" className="viz-axis-lbl">{yMax}</text>
      </svg>
      <div className="viz-tablewrap gantt">
        <svg viewBox={`0 0 ${W} ${rows.length * rowH + 10}`} className="viz-svg" style={{ height: rows.length * rowH + 10 }}
             role="img" aria-label={lang === "es" ? "Extensión temporal por dataset" : "Temporal span per dataset"}>
          {rows.map((r, i) => (
            <g key={r.id} onPointerEnter={() => setHover(r)} onPointerLeave={() => setHover(null)} style={{ cursor: "pointer" }}>
              <text x={0} y={i * rowH + 12} className="gantt-lbl" fill={hover === r ? "var(--color-fg)" : "var(--color-fg-subtle)"}>{r.title.slice(0, 24)}</text>
              <rect x={sx(r.y0)} y={i * rowH + 4} width={Math.max(3, sx(r.y1) - sx(r.y0))} height={rowH - 6}
                    rx={3} fill={colorFn(r.theme)} fillOpacity={hover === r ? 1 : 0.72} />
            </g>
          ))}
        </svg>
      </div>
      {hover && (
        <div className="viz-readout" role="status">
          <strong>{hover.title}</strong>
          <span>{hover.theme} · {hover.y0}–{hover.y1} ({hover.span} {lang === "es" ? "años" : "yr"}) · {lang === "es" ? "claves" : "keys"}: {hover.keys.join(", ")}</span>
        </div>
      )}
    </div>
  );
}
