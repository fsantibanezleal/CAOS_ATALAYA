import { useMemo } from "react";
import type { CaseArtifact, CaseDef, Variant } from "@/lib/types";
import { useLang } from "@/lib/useLang";
import { viridis } from "@/components/viz/vizUtils";

/** Cross-VARIANT comparison for one case (cross-case aggregates belong on Experiments/Benchmark, not here).
 * Each variant's headline count is computed client-side from the single payload, so you see how the regime knob
 * changes what the view shows · a bar per variant, no recompute. */
export default function VariantCompare({ def, artifact }: { def: CaseDef; artifact: CaseArtifact }) {
  const lang = useLang();
  const rows = useMemo(() => def.variants.map((v) => ({
    v, n: countForVariant(def.render_kind, artifact.payload as never, v),
  })), [def, artifact]);
  const max = Math.max(1, ...rows.map((r) => r.n));
  const unit = unitLabel(def.render_kind, lang);

  return (
    <div className="viz-wrap">
      <p className="viz-hint">
        {lang === "es"
          ? `Cuántos ${unit} deja ver cada variante de esta vista (mismo dato, distinta regla).`
          : `How many ${unit} each variant of this view surfaces (same data, different rule).`}
      </p>
      <div className="ov-bars">
        {rows.map(({ v, n }, i) => (
          <div key={v.id} className="cov-row">
            <span className="cov-label">{lang === "es" ? v.label_es : v.label_en}</span>
            <span className="cov-track"><span className="cov-fill" style={{ width: `${(n / max) * 100}%`, background: viridis(1 - i / Math.max(1, rows.length)) }} /></span>
            <span className="num">{n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function countForVariant(kind: string, payload: Record<string, unknown>, v: Variant): number {
  const p = v.params as Record<string, unknown>;
  if (kind === "graph") {
    const edges = (payload.edges as { w: number }[]) ?? [];
    const min = (p.min_cos as number) ?? (p.min_c as number) ?? (p.min_rho as number) ?? 0;
    return edges.filter((e) => e.w >= min).length;
  }
  if (kind === "findings") {
    const rows = (payload.rows as { rho: number }[]) ?? [];
    let r = rows.filter((x) => Math.abs(x.rho) >= ((p.min_rho as number) ?? 0));
    if (p.sign === "pos") r = r.filter((x) => x.rho > 0);
    if (p.sign === "neg") r = r.filter((x) => x.rho < 0);
    return r.length;
  }
  if (kind === "affinity") {
    const rows = (payload.rows as { score: number }[]) ?? [];
    return rows.filter((x) => x.score >= ((p.min_score as number) ?? 0)).slice(0, (p.limit as number) ?? 9999).length;
  }
  if (kind === "map") return (payload.nodes as unknown[])?.length ?? 0;
  if (kind === "coverage") {
    const counts = (payload.counts as Record<string, number>) ?? {};
    const lvl = p.level as string;
    return lvl && lvl !== "any" ? (counts[lvl] ?? 0) : Object.values(counts).reduce((a, b) => a + b, 0);
  }
  if (kind === "timeline") {
    const rows = (payload.rows as { y1: number; keys: string[] }[]) ?? [];
    let r = rows;
    if (p.scope && p.scope !== "all") r = r.filter((x) => x.keys.includes(p.scope as string));
    if (p.since) r = r.filter((x) => x.y1 >= (p.since as number));
    return r.length;
  }
  if (kind === "quality") return (payload.rows as unknown[])?.length ?? 0;
  if (kind === "overview") {
    const src = (payload as Record<string, Record<string, number>>)[(p.facet as string) ?? "theme"] ?? {};
    return Object.keys(src).length;
  }
  return 0;
}

function unitLabel(kind: string, lang: string): string {
  const es = lang === "es";
  if (kind === "graph") return es ? "relaciones" : "relations";
  if (kind === "findings" || kind === "affinity") return es ? "pares" : "pairs";
  if (kind === "timeline" || kind === "coverage" || kind === "map" || kind === "quality") return "datasets";
  return es ? "categorías" : "categories";
}
