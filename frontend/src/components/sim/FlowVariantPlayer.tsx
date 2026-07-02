import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pause, Play, RotateCcw } from "lucide-react";
import { loadFlowTrace } from "@/lib/data";
import { buildPatients, flowStateAt } from "@/lib/flowReplay";
import { useLang } from "@/lib/useLang";
import type { FlowTrace, VariantEntry } from "@/lib/types";
import { FlowViz } from "./FlowViz";

const KPI_MAP: Record<string, { en: string; es: string }> = {
  mean_LOS: { en: "Mean length-of-stay", es: "Estancia media" },
  mean_LOS_urgent: { en: "LOS — urgent", es: "Estancia — urgente" },
  mean_LOS_standard: { en: "LOS — standard", es: "Estancia — estándar" },
  mean_wait_treatment: { en: "Wait for treatment", es: "Espera a tratamiento" },
  n_patients: { en: "Patients", es: "Pacientes" },
  rho_treatment: { en: "Treatment ρ", es: "ρ tratamiento" },
  urgent_frac: { en: "Urgent fraction", es: "Fracción urgente" },
};
const PARAM_MAP: Record<string, { en: string; es: string }> = {
  lam: { en: "Arrival rate λ", es: "Tasa llegada λ" },
  mu_triage: { en: "Triage rate μ_t", es: "Tasa triage μ_t" },
  mu_treat: { en: "Treatment rate μ_x", es: "Tasa tratamiento μ_x" },
  c_triage: { en: "Triage nurses", es: "Enfermeras triage" },
  c_treat: { en: "Treatment bays", es: "Camillas tratamiento" },
  p_urgent: { en: "Urgent fraction", es: "Fracción urgente" },
  surge: { en: "Daytime surge", es: "Surge diurno" },
  n_patients: { en: "Patients", es: "Pacientes" },
};
const SPEEDS = [0.5, 1, 2, 4, 8];

export function FlowVariantPlayer({ variant }: { variant: VariantEntry }) {
  const { t } = useTranslation();
  const es = useLang() === "es";
  const [trace, setTrace] = useState<FlowTrace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(2);
  const timeRef = useRef(0);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  useEffect(() => {
    let alive = true;
    setTrace(null);
    setError(null);
    setTime(0);
    timeRef.current = 0;
    loadFlowTrace(variant.trace)
      .then((tr) => alive && (setTrace(tr), setPlaying(true)))
      .catch((e) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
  }, [variant.trace]);

  const patients = useMemo(() => (trace ? buildPatients(trace) : []), [trace]);
  const tEnd = trace?.timeline.t_end ?? 0;

  useEffect(() => {
    if (!playing || !trace) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      let next = timeRef.current + dt * speedRef.current;
      if (next >= tEnd) {
        next = tEnd;
        timeRef.current = next;
        setTime(next);
        setPlaying(false);
        return;
      }
      timeRef.current = next;
      setTime(next);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, trace, tEnd]);

  if (error) return <div className="banner error">⚠ {error}</div>;
  if (!trace) return <div className="loading">{t("common.loading")}</div>;

  const seek = (v: number) => {
    timeRef.current = v;
    setTime(v);
  };
  const toggle = () => {
    if (timeRef.current >= tEnd) seek(0);
    setPlaying((p) => !p);
  };
  const restart = () => {
    seek(0);
    setPlaying(true);
  };
  const win = Math.max(0.6, tEnd / 200); // flash/transit window in sim-time (matches the queue viz feel)
  const state = flowStateAt(patients, time, win);

  return (
    <div className="sim-layout">
      <div className="sim-stage">
        <div className="card grid-stage">
          <FlowViz trace={trace} state={state} />
          <div className="grid-legend">
            {trace.legend.map((l) => (
              <span key={l.code} className="grid-legend-item"><span className="legend-dot" style={{ background: l.color }} /> {es ? l.label_es : l.label_en}</span>
            ))}
          </div>
        </div>
        <div className="card timeline">
          <div className="timeline-row">
            <button className="btn primary" onClick={toggle}>{playing ? <Pause size={15} /> : <Play size={15} />}{playing ? t("sim.pause") : t("sim.play")}</button>
            <button className="btn" onClick={restart}><RotateCcw size={15} />{t("sim.restart")}</button>
            <span className="timeline-time">{t("sim.time")}: {time.toFixed(1)} / {tEnd.toFixed(1)}</span>
            <span className="spacer" />
            <label className="timeline-time" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
              {t("sim.speed")}
              <select className="select" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
                {SPEEDS.map((s) => <option key={s} value={s}>{s}×</option>)}
              </select>
            </label>
          </div>
          <input className="scrub" type="range" min={0} max={tEnd || 1} step={(tEnd || 1) / 1000} value={time}
                 onChange={(e) => seek(Number(e.target.value))} aria-label={t("sim.time")} />
        </div>
      </div>
      <aside className="sim-side">
        <div className="kpi card">
          <h3>{t("kpi.title")}</h3>
          <div className="kpi-grid">
            {Object.entries(trace.kpis).map(([k, v]) => (
              <div className="kpi-cell" key={k}>
                <div className="kpi-cell-val">{typeof v === "number" && !Number.isInteger(v) ? v.toFixed(3) : v}</div>
                <div className="kpi-cell-lbl">{KPI_MAP[k] ? (es ? KPI_MAP[k].es : KPI_MAP[k].en) : k}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="params card">
          <h3>{t("sim.runConfig")}</h3>
          <ul className="param-list">
            {Object.entries(trace.params).map(([k, v]) => (
              <li key={k}><span className="k">{PARAM_MAP[k] ? (es ? PARAM_MAP[k].es : PARAM_MAP[k].en) : k}</span><span className="v">{Number.isInteger(v) ? v : v.toFixed(2)}</span></li>
            ))}
            <li><span className="k">{t("sim.seed")}</span><span className="v">{trace.seed}</span></li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
