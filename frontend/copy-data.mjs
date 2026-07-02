// Copy the committed web artifacts (per-case artifacts + manifests + catalog + graph + metrics) from
// data/derived into frontend/public/data so the dev server and local build can serve them. In CI the Pages
// workflow overlays the same files into dist/ directly.
// Also inline the pure-Python `atalayalab.model` + `atalayalab.live` sources into one JSON, so the Pyodide live
// lane (affinity reweighting) can write them to the in-browser filesystem and import the SAME code the pipeline
// used. Cross-platform (Node fs).
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..");
const pub = resolve(here, "public");
mkdirSync(pub, { recursive: true });

// --- copy data/derived -> frontend/public/data ---
const src = resolve(repo, "data", "derived");
const dst = resolve(here, "public", "data");
if (existsSync(src)) {
  cpSync(src, dst, { recursive: true });
  console.log("copied data/derived -> frontend/public/data");
} else {
  console.warn("skip (missing): data/derived — run the pipeline first (scripts/precompute.*)");
}

// --- inline the Pyodide-safe python (model/ + live.py) into public/pyodide/atalaya-sources.json ---
// Only the pure-Python, numpy-only subset the live lane imports; NEVER the heavy stages.
const pkgRoot = resolve(repo, "data-pipeline", "atalayalab");
function walkPy(dir, out) {
  if (!existsSync(dir)) return;
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "__pycache__") continue;
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walkPy(p, out);
    else if (ent.name.endsWith(".py")) {
      const rel = relative(pkgRoot, p).split("\\").join("/");
      out[`atalayalab/${rel}`] = readFileSync(p, "utf-8");
    }
  }
}
const files = {};
if (existsSync(pkgRoot)) {
  // ship the live-lane closure: __init__, live.py, and the model/ it imports
  for (const sub of ["__init__.py", "live.py"]) {
    const p = resolve(pkgRoot, sub);
    if (existsSync(p)) files[`atalayalab/${sub}`] = readFileSync(p, "utf-8");
  }
  walkPy(resolve(pkgRoot, "model"), files);
  const outDir = resolve(here, "public", "pyodide");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, "atalaya-sources.json"),
    JSON.stringify({ package: "atalayalab", files }), "utf-8");
  console.log(`inlined ${Object.keys(files).length} atalayalab/*.py -> frontend/public/pyodide/atalaya-sources.json`);
} else {
  console.warn("skip (missing): data-pipeline/atalayalab for the Pyodide live lane");
}
