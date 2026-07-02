import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { loadTrace } from "@/lib/data";
import { assignServers, buildCustomers, frameAt } from "@/lib/replay";
import type { Trace, VariantEntry } from "@/lib/types";
import { KpiPanel } from "./KpiPanel";
import { QueueViz } from "./QueueViz";
import { Timeline } from "./Timeline";

const PARAM_LABELS: Record<string, string> = {
  lam: "Arrival rate λ (/min)",
  mu: "Service rate μ (/min)",
  c: "Servers c",
  n_customers: "Customers",
};

/** Loads a variant's committed trace and plays it: animated queue + KPIs + run config. */
export function VariantPlayer({ variant }: { variant: VariantEntry }) {
  const { t } = useTranslation();
  const [trace, setTrace] = useState<Trace | null>(null);
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
    loadTrace(variant.trace)
      .then((tr) => {
        if (!alive) return;
        setTrace(tr);
        setPlaying(true);
      })
      .catch((e) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
  }, [variant.trace]);

  const customers = useMemo(() => {
    if (!trace) return [];
    const cs = buildCustomers(trace);
    assignServers(cs, Math.round(trace.params.c));
    return cs;
  }, [trace]);
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

  const seek = (v: number) => {
    timeRef.current = v;
    setTime(v);
  };
  const restart = () => {
    seek(0);
    setPlaying(true);
  };
  const toggle = () => {
    if (timeRef.current >= tEnd) seek(0);
    setPlaying((p) => !p);
  };

  if (error) return <div className="banner error">⚠ {error}</div>;
  if (!trace) return <div className="loading">{t("common.loading")}</div>;

  const c = Math.round(trace.params.c);
  const win = Math.max(0.45, tEnd / 260); // flash/transit window in sim-time
  const frame = frameAt(customers, c, time, win);

  return (
    <div className="sim-layout">
      <div className="sim-stage">
        <QueueViz frame={frame} c={c} />
        <div className="card">
          <Timeline
            time={time}
            tEnd={tEnd}
            playing={playing}
            speed={speed}
            onToggle={toggle}
            onRestart={restart}
            onSeek={seek}
            onSpeed={setSpeed}
          />
        </div>
      </div>
      <aside className="sim-side">
        <div className="params card">
          <h3>{t("sim.runConfig")}</h3>
          <ul className="param-list">
            {Object.entries(trace.params).map(([k, v]) => (
              <li key={k}>
                <span className="k">{PARAM_LABELS[k] ?? k}</span>
                <span className="v">{Number.isInteger(v) ? v : v.toFixed(2)}</span>
              </li>
            ))}
            <li>
              <span className="k">{t("sim.seed")}</span>
              <span className="v">{trace.seed}</span>
            </li>
          </ul>
        </div>
        <KpiPanel kpis={trace.kpis} analytic={trace.analytic} />
      </aside>
    </div>
  );
}
