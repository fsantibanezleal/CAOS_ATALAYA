import { useTranslation } from "react-i18next";
import { useLang } from "@/lib/useLang";
import type { VariantEntry } from "@/lib/types";

/** Compare a headline KPI across all pre-simulated regimes of an ABM scenario (bars + table). */
export function GridComparison({
  variants,
  activeId,
  onSelect,
  kpiKey,
  kpiLabelEn,
  kpiLabelEs,
  cols,
}: {
  variants: VariantEntry[];
  activeId: string;
  onSelect: (id: string) => void;
  kpiKey: string;
  kpiLabelEn: string;
  kpiLabelEs: string;
  cols: { key: string; en: string; es: string }[];
}) {
  const { t } = useTranslation();
  const es = useLang() === "es";
  const W = 600;
  const H = 320;
  const ml = 46;
  const mr = 16;
  const mt = 16;
  const mb = 96;
  const plotW = W - ml - mr;
  const plotH = H - mt - mb;
  const vals = variants.map((v) => Number(v.kpis[kpiKey] ?? 0));
  const max = Math.max(0.0001, ...vals);
  const bw = plotW / variants.length;

  return (
    <div className="compare card">
      <h3>{t("compare.title")}</h3>
      <p className="hint">{es ? `${kpiLabelEs} por régimen. Haz clic para cargar uno.` : `${kpiLabelEn} per regime. Click to load one.`}</p>
      <svg className="cmp-svg" viewBox={`0 0 ${W} ${H}`} role="img">
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <g key={g}>
            <line className="cmp-grid" x1={ml} y1={mt + plotH - g * plotH} x2={W - mr} y2={mt + plotH - g * plotH} />
            <text className="cmp-tick" x={ml - 5} y={mt + plotH - g * plotH + 3} textAnchor="end">{(g * max).toFixed(2)}</text>
          </g>
        ))}
        <line className="cmp-axis" x1={ml} y1={mt} x2={ml} y2={mt + plotH} />
        <line className="cmp-axis" x1={ml} y1={mt + plotH} x2={W - mr} y2={mt + plotH} />
        {variants.map((v, i) => {
          const h = (Number(v.kpis[kpiKey] ?? 0) / max) * plotH;
          const x = ml + i * bw + bw * 0.15;
          const active = v.id === activeId;
          return (
            <g key={v.id} style={{ cursor: "pointer" }} onClick={() => onSelect(v.id)}>
              <rect x={x} y={mt + plotH - h} width={bw * 0.7} height={h} rx="2"
                    fill={active ? "var(--color-magenta)" : "var(--color-accent)"} />
              <text className="cmp-tick" x={x + bw * 0.35} y={mt + plotH + 12} textAnchor="end"
                    transform={`rotate(-40 ${x + bw * 0.35} ${mt + plotH + 12})`}>
                {(es ? v.label_es : v.label_en).slice(0, 16)}
              </text>
            </g>
          );
        })}
      </svg>
      <table className="cmp-table">
        <thead>
          <tr>
            <th>{es ? "Régimen" : "Regime"}</th>
            {cols.map((c) => <th key={c.key}>{es ? c.es : c.en}</th>)}
          </tr>
        </thead>
        <tbody>
          {variants.map((v) => (
            <tr key={v.id} className={v.id === activeId ? "active" : ""} style={{ cursor: "pointer" }} onClick={() => onSelect(v.id)}>
              <td>{es ? v.label_es : v.label_en}</td>
              {cols.map((c) => {
                const val = v.kpis[c.key];
                return <td key={c.key} className="num">{typeof val === "number" && !Number.isInteger(val) ? val.toFixed(3) : val ?? "—"}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
