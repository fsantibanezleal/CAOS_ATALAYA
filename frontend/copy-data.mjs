// Copy the committed web artifacts (per-case artifacts + manifests + catalog + graph + embeddings + metrics)
// from data/derived into frontend/public/data so the dev server and local build serve them. In CI the Pages
// workflow overlays the same files into dist/ directly. Cross-platform (Node fs). The web loads only these.
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..");
mkdirSync(resolve(here, "public"), { recursive: true });

const src = resolve(repo, "data", "derived");
const dst = resolve(here, "public", "data");
if (existsSync(src)) {
  cpSync(src, dst, { recursive: true });
  console.log("copied data/derived -> frontend/public/data");
} else {
  console.warn("skip (missing): data/derived — run the pipeline first (scripts/precompute.*)");
}
