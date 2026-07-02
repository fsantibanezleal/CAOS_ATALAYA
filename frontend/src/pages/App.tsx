import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Categories, CaseDef } from "@/lib/types";
import { loadCategories } from "@/lib/data";
import { useLang } from "@/lib/useLang";
import { Tabs } from "@/components/content/Tabs";
import CaseWorkbench from "@/components/app/CaseWorkbench";
import { EXTERNAL_LINKS } from "@/lib/links";

/** The landing workbench: enter and go straight to the tool. One tab per analytical case (grouped by category);
 * each is a genuine domain view over the real, mined Data Observatory catalog. */
export default function App() {
  const { t } = useTranslation();
  const lang = useLang();
  const [cats, setCats] = useState<Categories | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    loadCategories().then(setCats).catch((e) => setErr(String(e)));
  }, []);

  return (
    <div className="page-body">
      <div className="page-head">
        <h1>{t("product.name")}</h1>
        <p className="lede">
          {lang === "es"
            ? "Explorador de relaciones sobre el catálogo abierto del Data Observatory de Chile: cartografía, unibilidad, correlaciones, geografía, tiempo, calidad y afinidad, minados de datos reales."
            : "A relation explorer over Chile's Data Observatory open catalog: cartography, joinability, correlations, geography, time, quality and affinity, mined from real data."}
        </p>
        <p className="data-note">
          {lang === "es" ? "Datos reales de " : "Real data from "}
          <a href={EXTERNAL_LINKS.source} target="_blank" rel="noreferrer noopener">catalogo.dataobservatory.net</a>
          {lang === "es" ? " · 1017 datasets catalogados, el subconjunto de archivos directos descargado y procesado offline." : " · 1017 datasets catalogued, the direct-file subset downloaded and processed offline."}
        </p>
      </div>

      {err && <div className="banner error">{t("common.error")}: {err}</div>}
      {!cats && !err && <div className="banner">{t("common.loading")}</div>}
      {cats && (
        <Tabs
          ariaLabel={t("app.caseSelector")}
          tabs={cats.cases.map((c: CaseDef) => ({
            id: c.id,
            label: <span className="case-tab"><span className="case-cat">{c.category}</span>{lang === "es" ? c.title_es : c.title_en}</span>,
            content: <CaseWorkbench def={c} />,
          }))}
        />
      )}
    </div>
  );
}
