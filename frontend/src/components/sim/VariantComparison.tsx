import { useTranslation } from "react-i18next";
import { useLang } from "@/lib/useLang";
import type { VariantEntry } from "@/lib/types";

/**
 * Scatter of every pre-simulated regime: x = utilization ρ, y = mean wait Wq, with the simulated value
 * (magenta) and the closed-form M/M/c theory (accent) per regime, connected by a thin line so the
 * sim-vs-theory gap and the load/pooling structure are visible at a glance. Click a point to load it.
 */
export function VariantComparison({
  variants,
  activeId,
  onSelect,
}: {
  variants: VariantEntry[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const { t } = useTranslation();
  const lang = useLang();

  const W = 600;
  const H = 340;
  const ml = 46;
  const mr = 16;
  const mt = 18;
  const mb = 46;
  const plotW = W - ml - mr;
  const plotH = H - mt - mb;

  const xMax = 1.25;
  const finite = (x: number | null) => (x !== null && Number.isFinite(x) ? x : null);
  const yVals = variants.flatMap((v) => [v.kpis.Wq_sim, finite(v.analytic.Wq) ?? 0]);
  const yMax = Math.max(1, Math.ceil(Math.max(...yVals) + 0.5));

  const xs = (rho: number) => ml + (Math.min(rho, xMax) / xMax) * plotW;
  const ys = (wq: number) => mt + plotH - (Math.min(wq, yMax) / yMax) * plotH;

  const xTicks = [0, 0.25, 0.5, 0.75, 1.0, 1.25];
  const yTickStep = yMax <= 6 ? 1 : 2;
  const yTicks: number[] = [];
  for (let y = 0; y <= yMax; y += yTickStep) yTicks.push(y);

  return (
    <div className="compare card">
      <h3>{t("compare.title")}</h3>
      <p className="hint">{t("compare.note")}</p>

      <svg className="cmp-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="comparison">
        {/* grid + ticks */}
        {yTicks.map((y) => (
          <g key={"y" + y}>
            <line className="cmp-grid" x1={ml} y1={ys(y)} x2={W - mr} y2={ys(y)} />
            <text className="cmp-tick" x={ml - 6} y={ys(y) + 3} textAnchor="end">{y}</text>
          </g>
        ))}
        {xTicks.map((x) => (
          <text key={"x" + x} className="cmp-tick" x={xs(x)} y={H - mb + 16} textAnchor="middle">{x}</text>
        ))}
        <line className="cmp-axis" x1={ml} y1={mt} x2={ml} y2={mt + plotH} />
        <line className="cmp-axis" x1={ml} y1={mt + plotH} x2={W - mr} y2={mt + plotH} />
        <text className="cmp-axis-label" x={ml + plotW / 2} y={H - 6} textAnchor="middle">{t("compare.axisRho")}</text>
        <text className="cmp-axis-label" transform={`translate(12 ${mt + plotH / 2}) rotate(-90)`} textAnchor="middle">
          {t("compare.axisWq")}
        </text>

        {/* per-variant markers */}
        {variants.map((v) => {
          const rho = v.analytic.rho;
          const wqSim = v.kpis.Wq_sim;
          const wqTh = finite(v.analytic.Wq);
          const active = v.id === activeId;
          return (
            <g key={v.id} style={{ cursor: "pointer" }} onClick={() => onSelect(v.id)}>
              {wqTh !== null && <line className="cmp-grid" x1={xs(rho)} y1={ys(wqSim)} x2={xs(rho)} y2={ys(wqTh)} />}
              {wqTh !== null && (
                <circle className={"cmp-pt-active"} cx={xs(rho)} cy={ys(wqTh)} r={active ? 6 : 4}
                        fill="var(--color-accent)" stroke={active ? "var(--color-fg)" : "none"} strokeWidth={active ? 2 : 0} />
              )}
              <circle className="cmp-pt-sim" cx={xs(rho)} cy={ys(wqSim)} r={active ? 6 : 4}
                      stroke={active ? "var(--color-fg)" : "none"} strokeWidth={active ? 2 : 0} />
              <title>{(lang === "es" ? v.label_es : v.label_en)}</title>
            </g>
          );
        })}
      </svg>

      <p className="hint" style={{ marginTop: "0.4rem" }}>
        <span className="legend-dot sim" /> {t("kpi.sim")} &nbsp;&nbsp; <span className="legend-dot theory" /> {t("kpi.theory")}
      </p>

      <table className="cmp-table">
        <thead>
          <tr>
            <th>{t("compare.colVariant")}</th>
            <th>{t("compare.colRho")}</th>
            <th>{t("compare.colServers")}</th>
            <th>{t("compare.colWqSim")}</th>
            <th>{t("compare.colWqTheory")}</th>
          </tr>
        </thead>
        <tbody>
          {variants.map((v) => (
            <tr key={v.id} className={v.id === activeId ? "active" : ""} style={{ cursor: "pointer" }} onClick={() => onSelect(v.id)}>
              <td>{lang === "es" ? v.label_es : v.label_en}</td>
              <td className="num">{v.analytic.rho.toFixed(2)}</td>
              <td className="num">{v.params.c}</td>
              <td className="num">{v.kpis.Wq_sim.toFixed(3)}</td>
              <td className="num">{v.analytic.Wq === null ? "∞" : v.analytic.Wq.toFixed(3)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
