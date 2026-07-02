import type { VariantEntry } from "@/lib/types";
import { VariantPlayer } from "./VariantPlayer";
import { GridVariantPlayer } from "./GridVariantPlayer";
import { ChartVariantPlayer } from "./ChartVariantPlayer";
import { FlowVariantPlayer } from "./FlowVariantPlayer";
import { GanttVariantPlayer } from "./GanttVariantPlayer";
import { RouteVariantPlayer } from "./RouteVariantPlayer";

/** Map a manifest viz renderer to its animated player. Shared by the precomputed Simulator tab and the
 *  Pyodide live lane — both feed a VariantEntry (the live lane uses a synthetic in-memory trace path). */
export function PlayerSwitch({ renderer, variant }: { renderer: string; variant: VariantEntry }) {
  switch (renderer) {
    case "agent-grid":
      return <GridVariantPlayer variant={variant} />;
    case "chart":
      return <ChartVariantPlayer variant={variant} />;
    case "flow":
      return <FlowVariantPlayer variant={variant} />;
    case "gantt":
      return <GanttVariantPlayer variant={variant} />;
    case "route":
      return <RouteVariantPlayer variant={variant} />;
    default:
      return <VariantPlayer variant={variant} />;
  }
}
