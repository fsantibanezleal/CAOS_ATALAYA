import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { CaseDef } from "@/lib/types";
import { useLang } from "@/lib/useLang";
import { SubTabs } from "@/components/content/SubTabs";
import CaseView from "@/components/app/CaseView";
import SemanticSearch from "@/components/app/SemanticSearch";
import { CASE_CONTEXT } from "@/components/app/caseContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";

/** A genuine analytical LENS over the catalog (cartography, semantic, joinability, correlation, geographic,
 * temporal, quality, affinity). Its sub-tabs are the REAL views of that lens (one per case), plus a Context
 * write-up, plus (semantic only) the live search where it belongs. No repeated meta-tabs across lenses. */
export default function CategoryView({ name, cases }: { name: string; cases: CaseDef[] }) {
  const { t } = useTranslation();
  const lang = useLang();

  const tabs: { id: string; label: ReactNode; content: ReactNode }[] = cases.map((c) => ({
    id: c.id,
    label: lang === "es" ? c.title_es : c.title_en,
    content: <CaseView def={c} />,
  }));

  // live search belongs to the semantic lens (contextually right), not repeated everywhere
  if (name === "semantic") {
    tabs.push({ id: "search", label: t("app.tabLive"),
      content: <ErrorBoundary label="live-search"><SemanticSearch /></ErrorBoundary> });
  }

  // one Context write-up per lens (the representative case's), always available
  const ctxCase = cases[0];
  tabs.push({ id: "context", label: t("app.tabContext"),
    content: (CASE_CONTEXT[ctxCase?.id]?.(lang) ?? <p className="prose">-</p>) });

  return <SubTabs ariaLabel={name} tabs={tabs} />;
}
