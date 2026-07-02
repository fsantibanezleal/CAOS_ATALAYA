// Single source of truth for the product routes. Both the router and the header nav read this list.
// Order matters: the WORKBENCH is the landing ("/") — you enter and go straight to the tool. The five deep
// pages (Introduction, Methodology, Implementation, Experiments, Benchmark) sit alongside it.
export interface RouteDef {
  path: string;
  labelKey: string; // i18n key under nav.*
  id: string;
}

export const ROUTES: readonly RouteDef[] = [
  { id: "app", path: "/", labelKey: "nav.app" },
  { id: "introduction", path: "/introduction", labelKey: "nav.introduction" },
  { id: "methodology", path: "/methodology", labelKey: "nav.methodology" },
  { id: "implementation", path: "/implementation", labelKey: "nav.implementation" },
  { id: "experiments", path: "/experiments", labelKey: "nav.experiments" },
  { id: "benchmark", path: "/benchmark", labelKey: "nav.benchmark" },
] as const;
