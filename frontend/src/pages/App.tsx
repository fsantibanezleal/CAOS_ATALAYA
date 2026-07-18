import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Categories, CaseDef } from "@/lib/types";
import { loadCategories } from "@/lib/data";
import { useLang } from "@/lib/useLang";
import { Tabs } from "@/components/content/Tabs";
import CategoryView from "@/components/app/CategoryView";
import { EXTERNAL_LINKS } from "@/lib/links";

// The 8 analytical lenses, in reading order, with bilingual labels. Each is a genuine domain view (never a
// meta-tab); its concrete views live as sub-tabs inside CategoryView.
const LENSES: { id: string; en: string; es: string }[] = [
  { id: "cartography", en: "Catalog map", es: "Mapa del catálogo" },
  { id: "semantic", en: "Semantic network", es: "Red semántica" },
  { id: "joinability", en: "Joinability", es: "Unibilidad" },
  { id: "correlation", en: "Correlations", es: "Correlaciones" },
  { id: "geographic", en: "Geographic", es: "Geográfico" },
  { id: "temporal", en: "Temporal", es: "Temporal" },
  { id: "quality", en: "Data quality", es: "Calidad de datos" },
  { id: "affinity", en: "Affinity", es: "Afinidad" },
];

/** The landing workbench: enter and go straight to the tool. The primary selector is the analytical lens (8
 * genuine domain views); each lens exposes its concrete views + Context as sub-tabs, over the real mined catalog. */
export default function App() {
  const { t } = useTranslation();
  const lang = useLang();
  const [cats, setCats] = useState<Categories | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { loadCategories().then(setCats).catch((e) => setErr(String(e))); }, []);

  const byCat = useMemo(() => {
    const m = new Map<string, CaseDef[]>();
    (cats?.cases ?? []).forEach((c) => {
      if (!m.has(c.category)) m.set(c.category, []);
      m.get(c.category)!.push(c);
    });
    return m;
  }, [cats]);

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
          {lang === "es"
            ? " · 1017 datasets catalogados y embebidos; el subconjunto de archivos directos, además, descargado y procesado offline."
            : " · 1017 datasets catalogued and embedded; the direct-file subset additionally downloaded and processed offline."}
        </p>
      </div>

      {err && <div className="banner error">{t("common.error")}: {err}</div>}
      {!cats && !err && <div className="banner">{t("common.loading")}</div>}
      {cats && (
        <Tabs
          ariaLabel={t("app.caseSelector")}
          initial="semantic"
          tabs={LENSES.filter((l) => byCat.get(l.id)?.length).map((l) => ({
            id: l.id,
            label: lang === "es" ? l.es : l.en,
            content: <CategoryView name={l.id} cases={byCat.get(l.id) ?? []} />,
          }))}
        />
      )}
    </div>
  );
}
