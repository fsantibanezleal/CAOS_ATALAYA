import { useMemo } from "react";
import type { OverviewPayload } from "@/lib/types";
import { useLang } from "@/lib/useLang";
import { viridis, fmtInt, bytesGB } from "./vizUtils";

/** Catalog composition: a faceted bar chart over the whole 1017-dataset catalog (theme / origin / license /
 * format / download tier), plus the size-on-disk breakdown from the harvest size report. */
export default function OverviewView({ payload, facet = "theme" }: { payload: OverviewPayload; facet?: string }) {
  const lang = useLang();

  const data = useMemo(() => {
    if (facet === "size") {
      return Object.entries(payload.size_report).map(([tier, v]) => ({
        label: tier, value: v.known_bytes, sub: `${v.resources} res · ${v.unsized} ${lang === "es" ? "sin tamaño" : "unsized"}`,
      })).sort((a, b) => b.value - a.value);
    }
    const src = (payload as unknown as Record<string, Record<string, number>>)[facet] ?? {};
    return Object.entries(src).map(([label, value]) => ({ label, value, sub: "" }))
      .sort((a, b) => b.value - a.value).slice(0, 16);
  }, [payload, facet, lang]);

  const max = Math.max(1, ...data.map((d) => d.value));
  const isSize = facet === "size";

  return (
    <div className="viz-wrap">
      <div className="ov-totals">
        <span className="ov-stat"><strong>{fmtInt(payload.totals.datasets)}</strong> {lang === "es" ? "datasets" : "datasets"}</span>
        <span className="ov-stat"><strong>{fmtInt(payload.totals.resources)}</strong> {lang === "es" ? "recursos" : "resources"}</span>
        <span className="ov-stat"><strong>{fmtInt(payload.totals.profiled)}</strong> {lang === "es" ? "perfilados" : "profiled"}</span>
      </div>
      <div className="ov-bars">
        {data.map((d, i) => (
          <div key={d.label} className="cov-row">
            <span className="cov-label" title={d.label}>{d.label.slice(0, 34) || "-"}</span>
            <span className="cov-track">
              <span className="cov-fill" style={{ width: `${(d.value / max) * 100}%`, background: viridis(1 - i / Math.max(1, data.length)) }} />
            </span>
            <span className="num">{isSize ? bytesGB(d.value) : fmtInt(d.value)}{d.sub ? ` · ${d.sub}` : ""}</span>
          </div>
        ))}
      </div>
      <p className="viz-caption">
        {lang === "es"
          ? "Composición del catálogo completo (los 1017 datasets del Data Observatory). El desglose por tier de descarga muestra qué se puede espejar vs qué son enlaces DOI a archivos externos."
          : "Composition of the full catalog (all 1017 Data Observatory datasets). The download-tier breakdown shows what is mirrorable vs DOI links to external archives."}
      </p>
    </div>
  );
}
