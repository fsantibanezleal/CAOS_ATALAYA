import type { CaseArtifact, RenderKind, Variant } from "@/lib/types";
import ScatterMap from "./ScatterMap";
import GraphView from "./GraphView";
import FindingsTable from "./FindingsTable";
import AffinityView from "./AffinityView";
import CoverageView from "./CoverageView";
import TimelineView from "./TimelineView";
import QualityView from "./QualityView";
import OverviewView from "./OverviewView";

/** Dispatch a case artifact + the active variant params to the right interactive view. One stack per data
 * shape (rubric §5). Variant params are applied CLIENT-SIDE from the single payload, so switching variants is
 * instant and never recomputes the pipeline. */
export default function RenderSwitch({ kind, artifact, variant }:
  { kind: RenderKind; artifact: CaseArtifact; variant: Variant | null }) {
  const p = (variant?.params ?? {}) as Record<string, unknown>;
  const payload = artifact.payload as never;

  switch (kind) {
    case "map":
      return <ScatterMap payload={payload} colorBy={(p.color as never) ?? "theme"} />;
    case "graph":
      return <GraphView payload={payload}
        minWeight={(p.min_cos as number) ?? (p.min_c as number) ?? (p.min_rho as number) ?? 0}
        edgeLabel={p.min_cos !== undefined ? "cos" : p.min_c !== undefined ? "containment" : "ρ"} />;
    case "findings":
      return <FindingsTable payload={payload} minRho={(p.min_rho as number) ?? 0} sign={p.sign as never} />;
    case "affinity":
      return <AffinityView payload={payload} weights={(p.w as [number, number, number]) ?? [0.34, 0.4, 0.26]}
        limit={(p.limit as number) ?? 120} minScore={(p.min_score as number) ?? 0} />;
    case "coverage":
      return <CoverageView payload={payload} level={(p.level as string) ?? "any"} />;
    case "timeline":
      return <TimelineView payload={payload} scope={(p.scope as string) ?? "all"} since={p.since as number} />;
    case "quality":
      return <QualityView payload={payload} metric={(p.metric as string) ?? "null"} />;
    case "overview":
      return <OverviewView payload={payload} facet={(p.facet as string) ?? "theme"} />;
    default:
      return <p className="banner warn">Unknown render kind: {kind}</p>;
  }
}
