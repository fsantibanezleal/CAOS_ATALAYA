import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { CaseArtifact, CaseDef, CaseManifest } from "@/lib/types";
import { loadArtifact, loadManifest } from "@/lib/data";
import { useLang } from "@/lib/useLang";
import { SubTabs } from "@/components/content/SubTabs";
import RenderSwitch from "@/components/viz/RenderSwitch";
import SemanticSearch from "@/components/app/SemanticSearch";
import VariantCompare from "@/components/app/VariantCompare";
import { CASE_CONTEXT } from "@/components/app/caseContext";

/** The per-case workbench: variant bar (honest, data-driven regimes) + four sub-tabs (View / Live / Compare /
 * Context). Loads the manifest + artifact once; variant switching is client-side (no recompute). */
export default function CaseWorkbench({ def }: { def: CaseDef }) {
  const { t } = useTranslation();
  const lang = useLang();
  const [manifest, setManifest] = useState<CaseManifest | null>(null);
  const [artifact, setArtifact] = useState<CaseArtifact | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [activeVar, setActiveVar] = useState(def.variants[0]?.id ?? "");

  useEffect(() => {
    let live = true;
    setManifest(null); setArtifact(null); setErr(null);
    setActiveVar(def.variants[0]?.id ?? "");
    Promise.all([loadManifest(def.id), loadArtifact(def.id)])
      .then(([m, a]) => { if (live) { setManifest(m); setArtifact(a); } })
      .catch((e) => { if (live) setErr(String(e)); });
    return () => { live = false; };
  }, [def.id, def.variants]);

  const variant = useMemo(() => def.variants.find((v) => v.id === activeVar) ?? def.variants[0] ?? null,
    [def.variants, activeVar]);

  if (err) return <div className="banner error">{t("common.error")}: {err}</div>;
  if (!manifest || !artifact) return <div className="banner">{t("common.loading")}</div>;

  const lane = manifest.lane === "live" ? t("app.laneLive") : t("app.lanePrecomputed");

  return (
    <div className="workbench">
      <div className="variant-bar">
        <span className="variant-bar-label">
          {t("app.variants")} ({def.variants.length}) · <span className="badge">{lane}</span>
        </span>
        <div className="variant-chips">
          {def.variants.map((v) => (
            <button key={v.id} type="button" className={"variant-chip" + (v.id === activeVar ? " active" : "")}
                    onClick={() => setActiveVar(v.id)}>
              {lang === "es" ? v.label_es : v.label_en}
            </button>
          ))}
        </div>
      </div>

      <SubTabs
        ariaLabel={def.id}
        tabs={[
          { id: "view", label: t("app.tabField"), content: <RenderSwitch kind={def.render_kind} artifact={artifact} variant={variant} /> },
          { id: "live", label: t("app.tabLive"), content: <SemanticSearch /> },
          { id: "compare", label: t("app.tabCharts"), content: <VariantCompare def={def} artifact={artifact} /> },
          { id: "context", label: t("app.tabContext"), content: (CASE_CONTEXT[def.id]?.(lang) ?? <p className="prose">-</p>) },
        ]}
      />

      <div className="workbench-meta">
        <span>{t("app.category")}: <strong>{def.category}</strong></span>
        <span>{t("app.engines")}: {manifest.engine.engines.join(", ") || "-"}</span>
        <span>{t("app.stats")}: {Object.entries(manifest.stats).map(([k, v]) => `${k}=${v}`).join(" · ")}</span>
      </div>
    </div>
  );
}
