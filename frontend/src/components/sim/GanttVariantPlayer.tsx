import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pause, Play, RotateCcw } from "lucide-react";
import { loadGanttTrace } from "@/lib/data";
import { useLang } from "@/lib/useLang";
import type { GanttTrace, VariantEntry } from "@/lib/types";
import { GanttViz } from "./GanttViz";

const JOB_COLORS = [
  "var(--color-accent)", "var(--color-magenta)", "var(--color-good)", "var(--color-warn)",
  "var(--color-accent-2)", "var(--color-bad)", "var(--color-fg-faint)", "var(--color-accent)",
];
const KPI_MAP: Record<string, { en: string; es: string }> = {
  makespan: { en: "Makespan", es: "Makespan" },
  optimal: { en: "Proven optimal", es: "Óptimo probado" },
  n_jobs: { en: "Jobs", es: "Trabajos" },
  n_machines: { en: "Machines", es: "Máquinas" },
  n_operations: { en: "Operations", es: "Operaciones" },
  utilization: { en: "Machine utilization", es: "Utilización de máquinas" },
};
const SPEEDS = [0.5, 1, 2, 4];
const BASE_RATE = 6; // makespan-units per real second at 1×

export function GanttVariantPlayer({ variant }: { variant: VariantEntry }) {
  const { t } = useTranslation();
  const es = useLang() === "es";
  const [trace, setTrace] = useState<GanttTrace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const posRef = useRef(0);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  useEffect(() => {
    let alive = true;
    setTrace(null);
    setError(null);
    setNow(0);
    posRef.current = 0;
    loadGanttTrace(variant.trace)
      .then((tr) => alive && (setTrace(tr), setPlaying(true)))
      .catch((e) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
  }, [variant.trace]);

  const ms = trace?.makespan ?? 0;

  useEffect(() => {
    if (!playing || !trace) return;
    let raf = 0;
    let last = performance.now();
    const step = (tnow: number) => {
      const dt = (tnow - last) / 1000;
      last = tnow;
      posRef.current += dt * BASE_RATE * speedRef.current;
      if (posRef.current >= ms) {
        posRef.current = ms;
        setNow(ms);
        setPlaying(false);
        return;
      }
      setNow(posRef.current);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, trace, ms]);

  if (error) return <div className="banner error">⚠ {error}</div>;
  if (!trace) return <div className="loading">{t("common.loading")}</div>;

  const seek = (v: number) => {
    posRef.current = v;
    setNow(v);
  };
  const toggle = () => {
    if (posRef.current >= ms) seek(0);
    setPlaying((p) => !p);
  };
  const restart = () => {
    seek(0);
    setPlaying(true);
  };
  const fmtKpi = (v: number | boolean) =>
    typeof v === "boolean" ? (v ? (es ? "sí" : "yes") : "no") : !Number.isInteger(v) ? (v as number).toFixed(3) : v;

  return (
    <div className="sim-layout">
      <div className="sim-stage">
        <div className="card grid-stage">
          <GanttViz trace={trace} now={now} es={es} />
          <div className="grid-legend">
            {Array.from({ length: trace.jobs }).map((_, j) => (
              <span key={j} className="grid-legend-item"><span className="legend-dot" style={{ background: JOB_COLORS[j % JOB_COLORS.length] }} /> {es ? "Trabajo" : "Job"} {j + 1}</span>
            ))}
          </div>
        </div>
        <div className="card timeline">
          <div className="timeline-row">
            <button className="btn primary" onClick={toggle}>{playing ? <Pause size={15} /> : <Play size={15} />}{playing ? t("sim.pause") : t("sim.play")}</button>
            <button className="btn" onClick={restart}><RotateCcw size={15} />{t("sim.restart")}</button>
            <span className="timeline-time">{t("sim.time")}: {now.toFixed(0)} / {ms}</span>
            <span className="spacer" />
            <label className="timeline-time" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
              {t("sim.speed")}
              <select className="select" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
                {SPEEDS.map((s) => <option key={s} value={s}>{s}×</option>)}
              </select>
            </label>
          </div>
          <input className="scrub" type="range" min={0} max={ms || 1} step={Math.max(1, Math.round((ms || 1) / 200))} value={now}
                 onChange={(e) => seek(Number(e.target.value))} aria-label={t("sim.time")} />
        </div>
      </div>
      <aside className="sim-side">
        <div className="kpi card">
          <h3>{es ? "Resultado del optimizador" : "Optimizer result"}</h3>
          <div className="kpi-grid">
            {Object.entries(trace.kpis).map(([k, v]) => (
              <div className="kpi-cell" key={k}>
                <div className="kpi-cell-val">{fmtKpi(v as number | boolean)}</div>
                <div className="kpi-cell-lbl">{KPI_MAP[k] ? (es ? KPI_MAP[k].es : KPI_MAP[k].en) : k}</div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
