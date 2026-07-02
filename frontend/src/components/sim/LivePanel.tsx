import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Cpu, Loader2, Play, RotateCcw, ShieldCheck } from "lucide-react";
import { registerLiveTrace } from "@/lib/data";
import { onPyodideProgress, runLive, verifyLive, warmUp, type RuntimeInfo, type VerifyResult } from "@/lib/pyodideClient";
import type { PyPhase } from "@/lib/pyodideProtocol";
import { useLang } from "@/lib/useLang";
import type { ParamSpec, ScenarioManifest, VariantEntry } from "@/lib/types";
import { PlayerSwitch } from "./PlayerSwitch";

const BASE = import.meta.env.BASE_URL;

function fmt(spec: ParamSpec, v: number): string {
  if (spec.kind === "int") return String(Math.round(v));
  return spec.step < 1 ? v.toFixed(2) : String(v);
}

function paramsMatch(a: Record<string, number>, b: Record<string, number>, specs: ParamSpec[]): boolean {
  return specs.every((s) => {
    const av = s.kind === "int" ? Math.round(a[s.key]) : a[s.key];
    const bv = s.kind === "int" ? Math.round(b[s.key]) : b[s.key];
    return Math.abs(av - bv) < 1e-9;
  });
}

/** The Live (Pyodide) sub-tab: tune params, run the real scenario in-browser, replay the fresh trace with
 *  the same player, and optionally verify it against the committed trace. Mesa (ABM), joblib/scipy
 *  (Monte-Carlo) and networkx (graphs) are all IN LIVE_WHEELS and run live; only scenarios the browser
 *  worker can't run — native engines (OR-Tools, pure_python=false) — show a read-only explainer (no Run)
 *  so the runtime is never downloaded for them. The gate verdict (`gate.reasons` empty ⇔ live) is the
 *  single source of truth, matching simlab.core.scenario.classify_lane and simlab.live.live_lanes — never
 *  decide live from pure_python alone (the wheel closure must also fit LIVE_WHEELS). */
export function LivePanel({ manifest, variant }: { manifest: ScenarioManifest; variant: VariantEntry }) {
  const { t } = useTranslation();
  const lang = useLang();
  const specs = manifest.param_specs ?? [];
  const renderer = manifest.viz.renderer;
  const liveEligible = (variant.gate.reasons?.length ?? 0) === 0;

  const [params, setParams] = useState<Record<string, number>>(() => ({ ...variant.params }));
  const [seed, setSeed] = useState<number>(manifest.seed);
  const [phase, setPhase] = useState<PyPhase | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runMs, setRunMs] = useState<number | null>(null);
  const [liveKey, setLiveKey] = useState<string | null>(null);
  const [verify, setVerify] = useState<VerifyResult | null>(null);
  const [runtime, setRuntime] = useState<RuntimeInfo | null>(null);
  const runCount = useRef(0);
  const runToken = useRef(0); // bumped on variant-change/unmount to discard stale async results

  useEffect(() => onPyodideProgress(setPhase), []);
  useEffect(() => () => { runToken.current += 1; }, []); // invalidate in-flight runs on unmount

  // reset the panel when switching scenario/variant
  useEffect(() => {
    runToken.current += 1;
    setParams({ ...variant.params });
    setSeed(manifest.seed);
    setError(null);
    setRunMs(null);
    setLiveKey(null);
    setVerify(null);
  }, [variant.id, variant.params, manifest.seed]);

  const atCommittedRegime = useMemo(
    () => paramsMatch(params, variant.params, specs) && seed === manifest.seed,
    [params, variant.params, specs, seed, manifest.seed],
  );

  if (!liveEligible) {
    return (
      <div className="live-panel">
        <div className="callout note live-native">
          <h3>{t("live.nativeTitle")}</h3>
          <p>{t("live.nativeBody")}</p>
          <ul className="live-reasons">
            {variant.gate.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
        <LiveControls specs={specs} params={params} seed={seed} disabled onParam={() => {}} onSeed={() => {}} />
      </div>
    );
  }

  function publish(trace: unknown, ms: number): string {
    runCount.current += 1;
    const key = `live://${manifest.id}/${runCount.current}`;
    registerLiveTrace(key, trace);
    setLiveKey(key);
    setRunMs(ms);
    return key;
  }

  async function doRun(): Promise<void> {
    const token = runToken.current;
    setBusy(true);
    setError(null);
    setVerify(null);
    try {
      const info = await warmUp();
      if (token !== runToken.current) return;
      setRuntime(info);
      const r = await runLive(manifest.id, params, seed);
      if (token !== runToken.current) return; // discard a result for a regime we've since left
      publish(r.trace, r.runMs);
    } catch (e) {
      if (token === runToken.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (token === runToken.current) {
        setBusy(false);
        setPhase(null);
      }
    }
  }

  async function doVerify(): Promise<void> {
    const token = runToken.current;
    setBusy(true);
    setError(null);
    try {
      const info = await warmUp();
      if (token !== runToken.current) return;
      setRuntime(info);
      const res = await fetch(`${BASE}${variant.trace}`);
      const committed = await res.text();
      const v = await verifyLive(manifest.id, params, seed, committed);
      if (token !== runToken.current) return;
      publish(v.trace, v.runMs);
      setVerify(v);
    } catch (e) {
      if (token === runToken.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (token === runToken.current) {
        setBusy(false);
        setPhase(null);
      }
    }
  }

  function onParam(key: string, value: number): void {
    setParams((p) => ({ ...p, [key]: value }));
    setVerify(null);
  }
  function reset(): void {
    // Reset returns to THIS variant's committed regime (not the scenario's spec defaults), so a variant whose
    // params sit off the slider grid — e.g. s07 r_passR's pinned pass/lift columns — stays recoverable and the
    // "matches the committed variant" verify path is reachable again after a reset.
    setParams({ ...variant.params });
    setSeed(manifest.seed);
    setVerify(null);
  }

  const loading = busy && phase !== "running" && phase !== null;
  const liveVariant: VariantEntry = { ...variant, id: liveKey ?? variant.id, trace: liveKey ?? variant.trace };

  return (
    <div className="live-panel">
      <p className="live-intro">{t("live.intro")}</p>

      <div className="card live-controls-card">
        <LiveControls specs={specs} params={params} seed={seed} disabled={busy} onParam={onParam} onSeed={(s) => { setSeed(s); setVerify(null); }} />
        <div className="live-actions">
          <button className="btn primary" onClick={doRun} disabled={busy}>
            {busy ? <Loader2 size={15} className="spin" /> : <Play size={15} />}
            {liveKey ? t("live.rerun") : t("live.run")}
          </button>
          <button className="btn" onClick={reset} disabled={busy}>
            <RotateCcw size={15} />
            {t("live.reset")}
          </button>
          {atCommittedRegime && (
            <button className="btn" onClick={doVerify} disabled={busy} title={t("live.verify")}>
              <ShieldCheck size={15} />
              {t("live.verify")}
            </button>
          )}
        </div>
        {atCommittedRegime && !verify && (
          <p className="hint">
            {t("live.matchesVariant")} “{lang === "es" ? variant.label_es : variant.label_en}”.
          </p>
        )}
        {busy && (
          <p className="live-progress">
            <Loader2 size={14} className="spin" /> {loading ? t("live.loadingRuntime") : t("live.running")}
          </p>
        )}
        {busy && loading && <p className="hint">{t("live.firstRunNote")}</p>}
        {error && (
          <div className="banner error live-error">
            ⚠ {t("live.error")}: {error}
            <button className="btn" onClick={doRun} disabled={busy} style={{ marginLeft: "0.6rem" }}>
              <RotateCcw size={14} /> {t("sim.restart")}
            </button>
          </div>
        )}
      </div>

      {liveKey && (
        <>
          <div className="live-result-bar">
            <span className="live-badge">
              <Cpu size={14} /> {t("live.badge")}
              {runMs != null ? ` · ${runMs} ms` : ""}
              {runtime ? ` · numpy ${runtime.numpy}` : ""}
            </span>
            {verify && (
              <span className={"live-verify " + (verify.match === "differ" ? "mismatch" : "match")}>
                {verify.match === "byte"
                  ? t("live.verifyMatch")
                  : verify.match === "numeric"
                    ? t("live.verifyMatch") + " (~1e-9)"
                    : t("live.verifyMismatch") + (verify.firstDiffPath ? ` — ${verify.firstDiffPath}` : "")}
              </span>
            )}
          </div>
          <PlayerSwitch key={liveKey} renderer={renderer} variant={liveVariant} />
        </>
      )}
    </div>
  );
}

function LiveControls({
  specs,
  params,
  seed,
  disabled,
  onParam,
  onSeed,
}: {
  specs: ParamSpec[];
  params: Record<string, number>;
  seed: number;
  disabled?: boolean;
  onParam: (key: string, value: number) => void;
  onSeed: (s: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="live-controls">
      <h3>{t("live.params")}</h3>
      <div className="live-sliders">
        {specs.map((s) => (
          <label key={s.key} className="live-slider">
            <span className="live-slider-label">{s.label}</span>
            <input
              type="range"
              className="scrub"
              min={s.min}
              max={s.max}
              step={s.step}
              value={params[s.key] ?? s.default}
              disabled={disabled}
              onChange={(e) => onParam(s.key, s.kind === "int" ? Math.round(Number(e.target.value)) : Number(e.target.value))}
            />
            <span className="live-slider-val">{fmt(s, params[s.key] ?? s.default)}</span>
          </label>
        ))}
        <label className="live-slider">
          <span className="live-slider-label">{t("live.seed")}</span>
          <input
            type="number"
            className="select live-seed"
            min={0}
            step={1}
            value={seed}
            disabled={disabled}
            onChange={(e) => onSeed(Math.max(0, Math.round(Number(e.target.value) || 0)))}
          />
          <span className="live-slider-val" />
        </label>
      </div>
    </div>
  );
}
