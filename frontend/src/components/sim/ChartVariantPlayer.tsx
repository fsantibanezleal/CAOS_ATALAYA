import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pause, Play, RotateCcw } from "lucide-react";
import { loadChartTrace } from "@/lib/data";
import { useLang } from "@/lib/useLang";
import type { ChartTrace, VariantEntry } from "@/lib/types";
import { ChartViz } from "./ChartViz";

const KPI_MAP: Record<string, { en: string; es: string }> = {
  bullwhip_factory: { en: "Bullwhip — factory", es: "Bullwhip — fábrica" },
  bullwhip_distributor: { en: "Bullwhip — distributor", es: "Bullwhip — distribuidor" },
  bullwhip_wholesaler: { en: "Bullwhip — wholesaler", es: "Bullwhip — mayorista" },
  bullwhip_retailer: { en: "Bullwhip — retailer", es: "Bullwhip — minorista" },
  peak_factory_order: { en: "Peak factory order", es: "Pico orden fábrica" },
  final_mean: { en: "Final mean Wq", es: "Media final Wq" },
  ci_halfwidth: { en: "CI half-width", es: "Semiancho IC" },
  theory_Wq: { en: "Erlang-C Wq", es: "Wq Erlang-C" },
  rel_error_pct: { en: "Rel. error %", es: "Error rel. %" },
  n_reps: { en: "Replications", es: "Réplicas" },
  rho: { en: "Utilization ρ", es: "Utilización ρ" },
};
const PARAM_MAP: Record<string, { en: string; es: string }> = {
  lam: { en: "Arrival rate λ", es: "Tasa llegada λ" },
  mu: { en: "Service rate μ", es: "Tasa servicio μ" },
  c: { en: "Servers c", es: "Servidores c" },
  n_customers: { en: "Customers/run", es: "Clientes/corrida" },
  n_reps: { en: "Replications", es: "Réplicas" },
  weeks: { en: "Weeks", es: "Semanas" },
  lead: { en: "Lead time L", es: "Lead time L" },
  theta: { en: "Smoothing θ", es: "Suavizado θ" },
  step: { en: "Demand change", es: "Cambio demanda" },
  pattern: { en: "Demand pattern", es: "Patrón demanda" },
};
const SPEEDS = [0.5, 1, 2, 4];
const BASE_FPS = 12;

export function ChartVariantPlayer({ variant }: { variant: VariantEntry }) {
  const { t } = useTranslation();
  const es = useLang() === "es";
  const [trace, setTrace] = useState<ChartTrace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const posRef = useRef(0);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  useEffect(() => {
    let alive = true;
    setTrace(null);
    setError(null);
    setFrame(0);
    posRef.current = 0;
    loadChartTrace(variant.trace)
      .then((tr) => alive && (setTrace(tr), setPlaying(true)))
      .catch((e) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
  }, [variant.trace]);

  const n = trace?.series.x?.length ?? 0;

  useEffect(() => {
    if (!playing || !trace) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      posRef.current += dt * BASE_FPS * speedRef.current;
      if (posRef.current >= n - 1) {
        posRef.current = n - 1;
        setFrame(n - 1);
        setPlaying(false);
        return;
      }
      setFrame(Math.floor(posRef.current));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, trace, n]);

  if (error) return <div className="banner error">⚠ {error}</div>;
  if (!trace) return <div className="loading">{t("common.loading")}</div>;

  const seek = (v: number) => {
    posRef.current = v;
    setFrame(Math.floor(v));
  };
  const toggle = () => {
    if (posRef.current >= n - 1) seek(0);
    setPlaying((p) => !p);
  };
  const restart = () => {
    seek(0);
    setPlaying(true);
  };

  return (
    <div className="sim-layout">
      <div className="sim-stage">
        <div className="card">
          <ChartViz trace={trace} current={frame} es={es} />
        </div>
        <div className="card timeline">
          <div className="timeline-row">
            <button className="btn primary" onClick={toggle}>{playing ? <Pause size={15} /> : <Play size={15} />}{playing ? t("sim.pause") : t("sim.play")}</button>
            <button className="btn" onClick={restart}><RotateCcw size={15} />{t("sim.restart")}</button>
            <span className="timeline-time">{t("sim.time")}: {trace.series.x?.[frame] ?? frame} / {trace.series.x?.[n - 1] ?? n - 1}</span>
            <span className="spacer" />
            <label className="timeline-time" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
              {t("sim.speed")}
              <select className="select" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
                {SPEEDS.map((s) => <option key={s} value={s}>{s}×</option>)}
              </select>
            </label>
          </div>
          <input className="scrub" type="range" min={0} max={Math.max(1, n - 1)} step={1} value={frame}
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
