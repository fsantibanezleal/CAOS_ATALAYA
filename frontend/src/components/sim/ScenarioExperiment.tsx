import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { SubTabs } from "@/components/content/SubTabs";
import { loadManifest } from "@/lib/data";
import { useLang } from "@/lib/useLang";
import type { ScenarioManifest } from "@/lib/types";
import { VariantComparison } from "./VariantComparison";
import { PlayerSwitch } from "./PlayerSwitch";
import { LivePanel } from "./LivePanel";
import { GridComparison } from "./GridComparison";

export interface GridKpiConfig {
  key: string;
  en: string;
  es: string;
  cols: { key: string; en: string; es: string }[];
}

/** One case study: a ≥10-regime selector, then 3 sub-tabs — Simulator · Summary charts · Context.
 *  Branches the player + comparison on the manifest's viz renderer (queue-network vs agent-grid). */
export function ScenarioExperiment({
  manifestId,
  description,
  gridKpi,
}: {
  manifestId: string;
  description: ReactNode;
  gridKpi?: GridKpiConfig;
}) {
  const { t } = useTranslation();
  const lang = useLang();
  const [manifest, setManifest] = useState<ScenarioManifest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    let alive = true;
    loadManifest(manifestId)
      .then((m) => {
        if (!alive) return;
        setManifest(m);
        const preferred = m.variants.find((v) => v.id === "moderate") ?? m.variants[0];
        setActiveId(preferred?.id ?? "");
      })
      .catch((e) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
  }, [manifestId]);

  if (error) return <div className="banner error">⚠ {error}</div>;
  if (!manifest) return <div className="loading">{t("common.loading")}</div>;

  const active = manifest.variants.find((v) => v.id === activeId) ?? manifest.variants[0];
  const renderer = manifest.viz.renderer;

  const player = active ? <PlayerSwitch key={active.id} renderer={renderer} variant={active} /> : null;

  const charts =
    gridKpi ? (
      <GridComparison variants={manifest.variants} activeId={active?.id ?? ""} onSelect={setActiveId}
        kpiKey={gridKpi.key} kpiLabelEn={gridKpi.en} kpiLabelEs={gridKpi.es} cols={gridKpi.cols} />
    ) : (
      <VariantComparison variants={manifest.variants} activeId={active?.id ?? ""} onSelect={setActiveId} />
    );

  const tabs = [
    { id: "sim", label: t("sim.tabSimulator"), content: player },
    { id: "live", label: t("sim.tabLive"), content: active ? <LivePanel manifest={manifest} variant={active} /> : null },
    { id: "charts", label: t("sim.tabCharts"), content: charts },
    { id: "context", label: t("sim.tabContext"), content: <div className="prose">{description}</div> },
  ];

  return (
    <div>
      <div className="variant-bar">
        <span className="variant-bar-label">
          {t("sim.variants")} ({manifest.variants.length}) · {manifest.lane === "live" ? t("sim.laneLive") : t("sim.lanePrecomputed")}
        </span>
        <div className="variant-chips">
          {manifest.variants.map((v) => (
            <button key={v.id} className={"variant-chip" + (v.id === active.id ? " active" : "")} onClick={() => setActiveId(v.id)}>
              {lang === "es" ? v.label_es : v.label_en}
            </button>
          ))}
        </div>
        {active && <p className="variant-note">{lang === "es" ? active.note_es : active.note_en}</p>}
      </div>
      <SubTabs tabs={tabs} ariaLabel={t("sim.tabSimulator")} />
    </div>
  );
}
