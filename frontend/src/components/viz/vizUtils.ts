// Shared visualization helpers: perceptually-uniform sequential colour (viridis · NEVER jet/rainbow, per the
// interactive-viz rubric), a qualitative categorical palette legible in both themes, and small formatters.
// Colours are concrete (needed for SVG/canvas fills); the surrounding chrome themes via CSS variables.

// 8-stop viridis (perceptually uniform); linear-interpolated by `viridis(t)` for t in [0,1].
const VIRIDIS: [number, number, number][] = [
  [68, 1, 84], [72, 40, 120], [62, 74, 137], [49, 104, 142],
  [38, 130, 142], [31, 158, 137], [53, 183, 121], [143, 215, 68],
];

export function viridis(t: number): string {
  const x = Math.max(0, Math.min(1, t)) * (VIRIDIS.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  const a = VIRIDIS[i];
  const b = VIRIDIS[Math.min(i + 1, VIRIDIS.length - 1)];
  const c = a.map((v, k) => Math.round(v + (b[k] - v) * f));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

// Vibrant qualitative palette (high-saturation, distinct, legible on both light and dark surfaces). Qualitative,
// NOT a rainbow gradient over continuous data (viridis handles sequential), so it stays within the viz rubric.
const CATEGORICAL = [
  "#3b82f6", "#ef4444", "#f59e0b", "#10b981", "#a855f7",
  "#ec4899", "#06b6d4", "#f97316", "#84cc16", "#8b5cf6",
  "#14b8a6", "#eab308", "#f43f5e", "#0ea5e9", "#22c55e",
];

// Parse "#rrggbb" or "rgb(r,g,b)" to [r,g,b].
function toRGB(c: string): [number, number, number] {
  if (c.startsWith("#")) {
    const m = c.slice(1);
    const h = m.length === 3 ? m.split("").map((x) => x + x).join("") : m;
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const m = c.match(/(\d+)/g);
  return m ? [+m[0], +m[1], +m[2]] : [136, 136, 136];
}

/** Shade a colour toward white (amt > 0) or black (amt < 0); amt in [-1, 1]. Used to build spherical node
 * gradients (light highlight -> base -> dark rim) that read as depth on BOTH light and dark surfaces. */
export function shade(c: string, amt: number): string {
  const [r, g, b] = toRGB(c);
  const t = amt < 0 ? 0 : 255, p = Math.min(1, Math.abs(amt));
  const mix = (v: number) => Math.round(v + (t - v) * p);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}

export function makeCategoryColor(values: string[]): (v: string) => string {
  const uniq = Array.from(new Set(values.filter(Boolean))).sort();
  const map = new Map(uniq.map((v, i) => [v, CATEGORICAL[i % CATEGORICAL.length]]));
  return (v: string) => map.get(v) ?? "#888";
}

export function legendFor(values: string[], max = 12): { label: string; color: string }[] {
  const color = makeCategoryColor(values);
  const uniq = Array.from(new Set(values.filter(Boolean))).sort();
  const shown = uniq.slice(0, max).map((v) => ({ label: v, color: color(v) }));
  if (uniq.length > max) shown.push({ label: `+${uniq.length - max} more`, color: "#888" });
  return shown;
}

export const fmtInt = (n: number) => n.toLocaleString("en-US");
export const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;
export const fmt = (n: number, d = 3) => (Number.isFinite(n) ? n.toFixed(d) : "-");

export function shortNum(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return `${n}`;
}

export function bytesGB(b: number): string {
  const gb = b / 1024 ** 3;
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(b / 1024 ** 2).toFixed(0)} MB`;
}

// Deterministic 2D layout from a seed string (for graph nodes without PCA coords). Circular by hash.
export function hashAngle(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 3600) / 3600 * Math.PI * 2;
}
