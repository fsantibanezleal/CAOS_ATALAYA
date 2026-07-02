import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pause, Play, RotateCcw } from "lucide-react";
import { loadGridTrace } from "@/lib/data";
import { useLang } from "@/lib/useLang";
import type { GridTrace, VariantEntry } from "@/lib/types";
import { AgentGridViz } from "./AgentGridViz";
import { SeriesChart, type SeriesKey } from "./SeriesChart";

const SERIES_MAP: Record<string, { color: string; en: string; es: string }> = {
  segregation: { color: "var(--color-accent)", en: "Segregation index", es: "Índice de segregación" },
  happy: { color: "var(--color-good)", en: "Happy fraction", es: "Fracción feliz" },
  S: { color: "var(--color-accent)", en: "Susceptible", es: "Susceptible" },
  I: { color: "var(--color-bad)", en: "Infected", es: "Infectado" },
  R: { color: "var(--color-good)", en: "Recovered", es: "Recuperado" },
};
const KPI_MAP: Record<string, { en: string; es: string }> = {
  final_segregation: { en: "Final segregation", es: "Segregación final" },
  final_happy_frac: { en: "Happy fraction", es: "Fracción feliz" },
  steps_run: { en: "Steps", es: "Pasos" },
  tolerance: { en: "Tolerance", es: "Tolerancia" },
  peak_infected_frac: { en: "Peak infected", es: "Pico infectados" },
  peak_step: { en: "Peak step", es: "Paso del pico" },
  attack_rate: { en: "Attack rate", es: "Tasa de ataque" },
  duration_steps: { en: "Duration (steps)", es: "Duración (pasos)" },
  beta: { en: "β (infection)", es: "β (infección)" },
  gamma: { en: "γ (recovery)", es: "γ (recuperación)" },
};
const PARAM_MAP: Record<string, { en: string; es: string }> = {
  size: { en: "Grid size", es: "Tamaño de grilla" },
  empty: { en: "Empty fraction", es: "Fracción vacía" },
  tolerance: { en: "Tolerance", es: "Tolerancia" },
  steps: { en: "Max steps", es: "Pasos máx." },
  beta: { en: "β (infection)", es: "β (infección)" },
  gamma: { en: "γ (recovery)", es: "γ (recuperación)" },
  init_infected: { en: "Initial infected", es: "Infectados iniciales" },
};
const SPEEDS = [0.5, 1, 2, 4];
const BASE_FPS = 6;

export function GridVariantPlayer({ variant }: { variant: VariantEntry }) {
  const { t } = useTranslation();
  const es = useLang() === "es";
  const [trace, setTrace] = useState<GridTrace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(2);

  const posRef = useRef(0);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  useEffect(() => {
    let alive = true;
    setTrace(null);
    setError(null);
    setFrame(0);
    posRef.current = 0;
    loadGridTrace(variant.trace)
      .then((tr) => alive && (setTrace(tr), setPlaying(true)))
      .catch((e) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
  }, [variant.trace]);

  const nFrames = trace?.frames.length ?? 0;

  useEffect(() => {
    if (!playing || !trace) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      posRef.current += dt * BASE_FPS * speedRef.current;
      if (posRef.current >= nFrames - 1) {
        posRef.current = nFrames - 1;
        setFrame(nFrames - 1);
        setPlaying(false);
        return;
      }
      setFrame(Math.floor(posRef.current));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, trace, nFrames]);

  const seriesKeys = useMemo<SeriesKey[]>(() => {
    if (!trace) return [];
    return Object.keys(trace.series)
      .filter((k) => k !== "x" && SERIES_MAP[k])
      .map((k) => ({ key: k, color: SERIES_MAP[k].color, labelEn: SERIES_MAP[k].en, labelEs: SERIES_MAP[k].es }));
  }, [trace]);

  if (error) return <div className="banner error">⚠ {error}</div>;
  if (!trace) return <div className="loading">{t("common.loading")}</div>;

  const seek = (v: number) => {
    posRef.current = v;
    setFrame(Math.floor(v));
  };
  const toggle = () => {
    if (posRef.current >= nFrames - 1) seek(0);
    setPlaying((p) => !p);
  };
  const restart = () => {
    seek(0);
    setPlaying(true);
  };
  const curStep = trace.series.x?.[frame] ?? frame;

  return (
    <div className="sim-layout">
      <div className="sim-stage">
        <div className="card grid-stage">
          <AgentGridViz trace={trace} frameIndex={frame} />
          <div className="grid-legend">
            {trace.legend.map((l) => (
              <span key={l.code} className="grid-legend-item">
                <span className="legend-dot" style={{ background: l.color }} /> {es ? l.label_es : l.label_en}
              </span>
            ))}
          </div>
        </div>
        <div className="card timeline">
          <div className="timeline-row">
            <button className="btn primary" onClick={toggle}>
              {playing ? <Pause size={15} /> : <Play size={15} />}
              {playing ? t("sim.pause") : t("sim.play")}
            </button>
            <button className="btn" onClick={restart}><RotateCcw size={15} />{t("sim.restart")}</button>
            <span className="timeline-time">{t("sim.time")}: {curStep} / {trace.series.x?.[nFrames - 1] ?? nFrames - 1}</span>
            <span className="spacer" />
            <label className="timeline-time" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
              {t("sim.speed")}
              <select className="select" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
                {SPEEDS.map((s) => <option key={s} value={s}>{s}×</option>)}
              </select>
            </label>
          </div>
          <input className="scrub" type="range" min={0} max={Math.max(1, nFrames - 1)} step={1} value={frame}
                 onChange={(e) => seek(Number(e.target.value))} aria-label={t("sim.time")} />
        </div>
      </div>

      <aside className="sim-side">
        {seriesKeys.length > 0 && <SeriesChart trace={trace} keys={seriesKeys} current={frame} es={es} />}
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
              <li key={k}>
                <span className="k">{PARAM_MAP[k] ? (es ? PARAM_MAP[k].es : PARAM_MAP[k].en) : k}</span>
                <span className="v">{Number.isInteger(v) ? v : v.toFixed(2)}</span>
              </li>
            ))}
            <li><span className="k">{t("sim.seed")}</span><span className="v">{trace.seed}</span></li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
