import { useMemo, useState } from "react";
import type { AffinityPayload, AffRow } from "@/lib/types";
import { useLang } from "@/lib/useLang";
import { fmt } from "./vizUtils";

// TS mirror of atalayalab.model.affinity.affinity() reliability + fusion, so the live reweight matches the
// baked score at the default weights (parity). The payload stores the CALIBRATED f_* percentiles, so no null
// CDF is reapplied here.
function reliability(sem: number, join: number, stat: number) {
  return {
    rSem: 0.6 + 0.4 * Math.max(join, stat),
    rJoin: 0.85 + 0.15 * Math.max(sem, stat),
    rStat: 0.5 + 0.5 * join,
  };
}
function fuse(r: AffRow, w: [number, number, number]): number {
  const { rSem, rJoin, rStat } = reliability(r.f_sem, r.f_join, r.f_stat);
  const ws = w[0] * rSem, wj = w[1] * rJoin, wt = w[2] * rStat;
  const z = ws + wj + wt;
  return z > 0 ? Math.min(1, Math.max(0, (ws * r.f_sem + wj * r.f_join + wt * r.f_stat) / z)) : 0;
}

const PRESETS: Record<string, [number, number, number]> = {
  bal: [0.34, 0.4, 0.26], sem: [0.6, 0.25, 0.15], join: [0.2, 0.65, 0.15], stat: [0.2, 0.3, 0.5],
};

/** The novel calibrated multi-evidence affinity. Ranked dataset pairs with a stacked evidence bar (semantic /
 * joinability / correlation). LIVE control: reweight the three evidences and the ranking recomputes instantly
 * in the browser (no server), showing that affinity is a fused, auditable judgement, not one opaque signal. */
export default function AffinityView({
  payload, weights = [0.34, 0.4, 0.26], limit = 120, minScore = 0,
}: { payload: AffinityPayload; weights?: [number, number, number]; limit?: number; minScore?: number }) {
  const lang = useLang();
  const [w, setW] = useState<[number, number, number]>(weights);
  const [hover, setHover] = useState<AffRow | null>(null);

  const ranked = useMemo(() => {
    return payload.rows
      .map((r) => ({ ...r, live: fuse(r, w) }))
      .filter((r) => r.live >= minScore)
      .sort((a, b) => b.live - a.live)
      .slice(0, limit);
  }, [payload.rows, w, limit, minScore]);

  const setWi = (i: number, v: number) => setW((p) => { const n = [...p] as [number, number, number]; n[i] = v; return n; });

  return (
    <div className="viz-wrap">
      <div className="aff-controls">
        <span className="viz-hint">{lang === "es" ? "Pesos de evidencia (recomputa en vivo)" : "Evidence weights (recompute live)"}</span>
        <div className="aff-presets">
          {Object.entries(PRESETS).map(([k, v]) => (
            <button key={k} type="button" className={"chip" + (w.join() === v.join() ? " on" : "")} onClick={() => setW(v)}>{k}</button>
          ))}
        </div>
        {[["Semantic", "Semántica"], ["Joinability", "Unión"], ["Correlation", "Correlación"]].map((lbl, i) => (
          <label key={i} className="aff-slider">
            <span><span className="aff-key" data-k={i} /> {lang === "es" ? lbl[1] : lbl[0]}</span>
            <input type="range" min={0} max={1} step={0.02} value={w[i]} onChange={(e) => setWi(i, +e.target.value)} />
            <span className="num">{w[i].toFixed(2)}</span>
          </label>
        ))}
      </div>
      <div className="aff-list">
        {ranked.map((r, i) => (
          <div key={i} className={"aff-row" + (hover === r ? " hl" : "")}
               onPointerEnter={() => setHover(r)} onPointerLeave={() => setHover(null)}>
            <span className="aff-rank">{i + 1}</span>
            <span className="aff-pair">{r.a.slice(0, 40)} <span className="mu">↔</span> {r.b.slice(0, 40)}</span>
            <span className="aff-bar" title={`sem ${fmt(r.f_sem, 2)} · join ${fmt(r.f_join, 2)} · corr ${fmt(r.f_stat, 2)}`}>
              <span className="aff-seg s0" style={{ flex: w[0] * r.f_sem || 0.001 }} />
              <span className="aff-seg s1" style={{ flex: w[1] * r.f_join || 0.001 }} />
              <span className="aff-seg s2" style={{ flex: w[2] * r.f_stat || 0.001 }} />
            </span>
            <span className="aff-score num">{fmt(r.live, 3)}</span>
          </div>
        ))}
      </div>
      {hover && (
        <div className="viz-readout" role="status">
          <strong>{hover.a} ↔ {hover.b}</strong>
          <span>{lang === "es" ? "afinidad" : "affinity"} {fmt(fuse(hover, w), 3)} · {lang === "es" ? "evidencias calibradas" : "calibrated evidences"}: sem {fmt(hover.f_sem, 2)} · join {fmt(hover.f_join, 2)} · corr {fmt(hover.f_stat, 2)}</span>
        </div>
      )}
      <p className="viz-caption">
        {lang === "es"
          ? "Cada evidencia está calibrada contra un modelo nulo (percentil vs pares al azar); la fusión pondera y descuenta evidencias que se contradicen. Mueve los pesos para ver la afinidad recomputarse."
          : "Each evidence is calibrated against a null model (percentile vs random pairs); the fusion weights and discounts evidences that contradict each other. Move the weights to watch affinity recompute."}
      </p>
    </div>
  );
}
