import { useMemo, useState } from "react";
import type { CoveragePayload, CoverageRow } from "@/lib/types";
import { useLang } from "@/lib/useLang";
import { makeCategoryColor, legendFor } from "./vizUtils";

// Rough Chile bounding box for the point map (lat/lon), mainland + a margin.
const LAT0 = -56, LAT1 = -17, LON0 = -76, LON1 = -66;
const W = 300, H = 470;

/** Geographic coverage: which datasets are keyed at comuna / region / point level, as a coverage bar, plus a
 * point map of the datasets that carry coordinates. Colour by theme. The `metric` variant switches the bars
 * between a plain dataset count and a theme-mix stack (the theme composition within each key level). */
export default function CoverageView({ payload, level = "any", metric = "count" }:
  { payload: CoveragePayload; level?: string; metric?: string }) {
  const lang = useLang();
  const [hover, setHover] = useState<CoverageRow | null>(null);
  const rows = payload.rows;
  const colorFn = useMemo(() => makeCategoryColor(rows.map((r) => r.theme)), [rows]);
  const legend = useMemo(() => legendFor(rows.map((r) => r.theme)), [rows]);

  const counts = payload.counts;
  const order = ["comuna_cut", "region", "points", "none"];
  const labels: Record<string, string> = {
    comuna_cut: lang === "es" ? "Por comuna (CUT)" : "Comuna (CUT)",
    region: lang === "es" ? "Por región" : "Region",
    points: lang === "es" ? "Con coordenadas" : "Point-located",
    none: lang === "es" ? "Sin clave geo" : "No geo key",
  };
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

  // Theme composition within each geo-key level (for the "Theme mix" metric): from the rows themselves so the
  // stack answers "is comuna-keyed data mostly one theme, or diverse?".
  const themeMix = useMemo(() => {
    const m = new Map<string, Map<string, number>>();
    for (const r of rows) {
      const lvl = order.includes(r.level) ? r.level : "none";
      if (!m.has(lvl)) m.set(lvl, new Map());
      const tm = m.get(lvl)!;
      tm.set(r.theme, (tm.get(r.theme) ?? 0) + 1);
    }
    return m;
  }, [rows]);
  const showThemes = metric === "themes";

  const pts = rows.filter((r) => r.lat != null && r.lon != null &&
    (level === "any" || level === "points" || r.level === level));
  const sx = (lon: number) => ((lon - LON0) / (LON1 - LON0)) * (W - 30) + 15;
  const sy = (lat: number) => ((LAT1 - lat) / (LAT1 - LAT0)) * (H - 30) + 15;

  return (
    <div className="viz-wrap">
      <div className="viz-split">
        <div className="cov-bars">
          <span className="viz-hint">{showThemes
            ? (lang === "es" ? "Mezcla temática por nivel de clave geográfica" : "Theme mix by geographic key level")
            : (lang === "es" ? "Cobertura por nivel de clave geográfica" : "Coverage by geographic key level")}</span>
          {order.map((k) => {
            const c = counts[k] ?? 0;
            const mix = themeMix.get(k);
            return (
              <div key={k} className="cov-row" onPointerEnter={() => setHover(null)}>
                <span className="cov-label">{labels[k]}</span>
                <span className="cov-track">
                  {showThemes && mix
                    ? <span className="cov-fill cov-fill-stack" style={{ width: `${(c / total) * 100}%` }}>
                        {Array.from(mix.entries()).sort((a, b) => b[1] - a[1]).map(([th, n]) => (
                          <span key={th} className="cov-seg" title={`${th} · ${n}`} style={{ flex: n, background: colorFn(th) }} />
                        ))}
                      </span>
                    : <span className="cov-fill" style={{ width: `${(c / total) * 100}%` }} />}
                </span>
                <span className="num">{c}</span>
              </div>
            );
          })}
          <div className="viz-legend">
            {legend.map((l) => <span key={l.label} className="viz-legend-item"><span className="viz-swatch" style={{ background: l.color }} /> {l.label}</span>)}
          </div>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="viz-map" role="img"
             aria-label={lang === "es" ? "Mapa de datasets con coordenadas" : "Point-located datasets map"}>
          <rect x={12} y={12} width={W - 24} height={H - 24} fill="var(--color-surface-2)" stroke="var(--color-border)" rx={6} />
          {pts.map((r, i) => (
            <circle key={i} cx={sx(r.lon!)} cy={sy(r.lat!)} r={hover === r ? 6 : 4} fill={colorFn(r.theme)}
                    fillOpacity={0.8} stroke={hover === r ? "var(--color-fg)" : "none"} strokeWidth={1.2}
                    onPointerEnter={() => setHover(r)} onPointerLeave={() => setHover(null)} style={{ cursor: "pointer" }} />
          ))}
          <text x={W / 2} y={H - 4} textAnchor="middle" className="viz-axis-lbl">{pts.length} {lang === "es" ? "datasets georreferenciados" : "geo-located datasets"}</text>
        </svg>
      </div>
      {hover && (
        <div className="viz-readout" role="status">
          <strong>{hover.title}</strong>
          <span>{hover.theme} · {hover.lat?.toFixed(2)}, {hover.lon?.toFixed(2)} · {lang === "es" ? "claves" : "keys"}: {hover.keys.join(", ") || "-"}</span>
        </div>
      )}
    </div>
  );
}
