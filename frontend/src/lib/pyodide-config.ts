// Single source of truth for the Pyodide runtime pin. Bump here to upgrade (self-hosting later = flip the
// base URL). 0.28.x ships Python 3.13.2 + numpy 2.2.5 and the UMD pyodide.js (classic-worker importScripts).
export const PYODIDE_VERSION = "0.28.3";
export const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
export const PYODIDE_JS_URL = `${PYODIDE_INDEX_URL}pyodide.js`;
