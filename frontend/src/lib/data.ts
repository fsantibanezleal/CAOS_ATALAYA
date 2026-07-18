// Loaders for the committed Contract-2 artifacts. The web loads only these; it never recomputes the pipeline.
// Everything is fetched from the Pages base URL and cached in-module (the corpus is static per deploy).
import type {
  Catalog, CaseArtifact, CaseManifest, Categories, GraphData, Metrics,
} from "./types";

const BASE = import.meta.env.BASE_URL; // "/" on the custom domain, "/CAOS_ATALAYA/" on the project Pages path

const cache = new Map<string, Promise<unknown>>();

async function getJson<T>(path: string): Promise<T> {
  if (!cache.has(path)) {
    cache.set(path, (async () => {
      const res = await fetch(`${BASE}data/${path}`);
      if (!res.ok) throw new Error(`load ${path}: HTTP ${res.status}`);
      return res.json();
    })());
  }
  return cache.get(path) as Promise<T>;
}

export const loadCatalog = () => getJson<Catalog>("catalog.json");
export const loadGraph = () => getJson<GraphData>("graph.json");
export const loadMetrics = () => getJson<Metrics>("metrics.json");
export const loadCategories = () => getJson<Categories>("categories.json");
export const loadManifest = (id: string) => getJson<CaseManifest>(`manifests/${id}.json`);
export const loadArtifact = <P>(id: string) => getJson<CaseArtifact<P>>(`${id}/artifact.json`);

export const loadManifestIndex = () =>
  getJson<{ schema: string; engine_version: string; n_cases: number; cases: { case_id: string; category: string }[] }>(
    "manifests/index.json");
