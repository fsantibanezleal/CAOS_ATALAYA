import { useTranslation } from "react-i18next";
import { Pause, Play, RotateCcw } from "lucide-react";

export interface TimelineProps {
  time: number;
  tEnd: number;
  playing: boolean;
  speed: number;
  onToggle: () => void;
  onRestart: () => void;
  onSeek: (t: number) => void;
  onSpeed: (s: number) => void;
}

const SPEEDS = [0.5, 1, 2, 4, 8];

export function Timeline(p: TimelineProps) {
  const { t } = useTranslation();
  return (
    <div className="timeline">
      <div className="timeline-row">
        <button className="btn primary" onClick={p.onToggle}>
          {p.playing ? <Pause size={15} /> : <Play size={15} />}
          {p.playing ? t("sim.pause") : t("sim.play")}
        </button>
        <button className="btn" onClick={p.onRestart}>
          <RotateCcw size={15} />
          {t("sim.restart")}
        </button>
        <span className="timeline-time">
          {t("sim.time")}: {p.time.toFixed(1)} / {p.tEnd.toFixed(1)}
        </span>
        <span className="spacer" />
        <label className="timeline-time" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
          {t("sim.speed")}
          <select className="select" value={p.speed} onChange={(e) => p.onSpeed(Number(e.target.value))}>
            {SPEEDS.map((s) => (
              <option key={s} value={s}>{s}×</option>
            ))}
          </select>
        </label>
      </div>
      <input
        className="scrub"
        type="range"
        min={0}
        max={p.tEnd || 1}
        step={(p.tEnd || 1) / 1000}
        value={p.time}
        onChange={(e) => p.onSeek(Number(e.target.value))}
        aria-label={t("sim.time")}
      />
    </div>
  );
}
