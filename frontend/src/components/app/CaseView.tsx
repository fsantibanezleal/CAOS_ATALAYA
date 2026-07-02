import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { CaseArtifact, CaseDef, CaseManifest } from "@/lib/types";
import { loadArtifact, loadManifest } from "@/lib/data";
import { useLang } from "@/lib/useLang";
import RenderSwitch from "@/components/viz/RenderSwitch";
import { ErrorBoundary } from "@/components/ErrorBoundary";

/** One concrete analytical VIEW of a lens: the variant bar (real regime knobs) + the interactive viz + a small
 * provenance footer. Loads its manifest + artifact once; variant switching is client-side (no recompute). This is
 * the leaf the CategoryView composes; the Context write-up + live search are separate sub-tabs at the lens level. */
export default function CaseView({ def }: { def: CaseDef }) {
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

  return (
    <div className="caseview">
      <div className="variant-bar">
        <span className="variant-bar-label">{t("app.variants")} ({def.variants.length})</span>
        <div className="variant-chips">
          {def.variants.map((v) => (
            <button key={v.id} type="button" className={"variant-chip" + (v.id === activeVar ? " active" : "")}
                    onClick={() => setActiveVar(v.id)}>
              {lang === "es" ? v.label_es : v.label_en}
            </button>
          ))}
        </div>
      </div>

      <ErrorBoundary label={def.id}>
        <RenderSwitch kind={def.render_kind} artifact={artifact} variant={variant} />
      </ErrorBoundary>

      <div className="workbench-meta">
        <span>{t("app.engines")}: {manifest.engine.engines.join(", ") || "-"}</span>
        <span>{t("app.stats")}: {Object.entries(manifest.stats).map(([k, v]) => `${k}=${v}`).join(" · ")}</span>
      </div>
    </div>
  );
}
