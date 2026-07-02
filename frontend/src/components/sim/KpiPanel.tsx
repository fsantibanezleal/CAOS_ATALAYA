import { useTranslation } from "react-i18next";
import type { Analytic } from "@/lib/types";

function fmt(x: number | null | undefined, digits = 3): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return "∞";
  return x.toFixed(digits);
}

export function KpiPanel({ kpis, analytic }: { kpis: Record<string, number>; analytic: Analytic }) {
  const { t } = useTranslation();
  const stable = analytic.stable && analytic.Wq !== null && Number.isFinite(analytic.Wq);
  const wqSim = kpis.Wq_sim ?? 0;
  const wqTh = analytic.Wq;

  const max = Math.max(wqSim, stable && wqTh !== null ? wqTh : 0, 1e-6);
  const pct = (v: number) => `${Math.min(100, (v / max) * 100)}%`;

  return (
    <div className="kpi card">
      <h3>{t("kpi.title")}</h3>
      {!stable && <div className="banner warn">{t("kpi.unstable")}</div>}

      <div className="kpi-bars">
        <div className="kpi-bar-row">
          <span className="kpi-bar-label"><span className="legend-dot sim" />{t("kpi.wqSim")}</span>
          <div className="kpi-bar-track"><div className="kpi-bar-fill sim" style={{ width: pct(wqSim) }} /></div>
          <span className="kpi-bar-val">{fmt(wqSim)}</span>
        </div>
        <div className="kpi-bar-row">
          <span className="kpi-bar-label"><span className="legend-dot theory" />{t("kpi.wqTheory")}</span>
          <div className="kpi-bar-track">
            <div className="kpi-bar-fill theory" style={{ width: pct(stable && wqTh !== null ? wqTh : 0) }} />
          </div>
          <span className="kpi-bar-val">{fmt(wqTh)}</span>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-cell">
          <div className="kpi-cell-val">{fmt(analytic.rho, 3)}</div>
          <div className="kpi-cell-lbl">{t("kpi.rho")}</div>
        </div>
        <div className="kpi-cell">
          <div className="kpi-cell-val">{fmt(analytic.p_wait, 3)}</div>
          <div className="kpi-cell-lbl">{t("kpi.pwait")}</div>
        </div>
        <div className="kpi-cell">
          <div className="kpi-cell-val">{fmt(kpis.Lq_little, 3)}</div>
          <div className="kpi-cell-lbl">{t("kpi.lq")}</div>
        </div>
      </div>

      <p className="kpi-note">{t("kpi.note")}</p>
    </div>
  );
}
