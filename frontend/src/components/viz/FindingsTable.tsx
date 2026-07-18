import { useMemo, useState } from "react";
import type { CorrRow, FindingsPayload } from "@/lib/types";
import { useLang } from "@/lib/useLang";
import { fmt } from "./vizUtils";

/** Cross-dataset correlation findings: a sortable table (each a real Spearman that survived the permutation
 * null + BH-FDR) with a signed strength bar, over a scatter of rho vs adjusted p. Filter via variant params. */
export default function FindingsTable({
  payload, minRho = 0, sign,
}: { payload: FindingsPayload; minRho?: number; sign?: "pos" | "neg" }) {
  const lang = useLang();
  const [sortKey, setSortKey] = useState<keyof CorrRow>("weight");
  const [desc, setDesc] = useState(true);
  const [hover, setHover] = useState<CorrRow | null>(null);

  const rows = useMemo(() => {
    let r = payload.rows.filter((x) => Math.abs(x.rho) >= minRho);
    if (sign === "pos") r = r.filter((x) => x.rho > 0);
    if (sign === "neg") r = r.filter((x) => x.rho < 0);
    return [...r].sort((a, b) => {
      const av = a[sortKey] as number, bv = b[sortKey] as number;
      const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
      return desc ? -cmp : cmp;
    });
  }, [payload.rows, minRho, sign, sortKey, desc]);

  const th = (k: keyof CorrRow, label: string) => (
    <th onClick={() => { if (sortKey === k) setDesc(!desc); else { setSortKey(k); setDesc(true); } }}
        className={"sortable" + (sortKey === k ? " sorted" : "")} scope="col">
      {label}{sortKey === k ? (desc ? " ▾" : " ▴") : ""}
    </th>
  );

  const SW = 320, SH = 150, PAD = 26;
  const sx = (p: number) => PAD + (1 - Math.min(1, p)) * (SW - 2 * PAD); // low p to the right
  const syc = (rho: number) => SH / 2 - (rho * (SH / 2 - PAD));

  return (
    <div className="viz-wrap">
      <div className="viz-toolbar">
        <span className="viz-hint">{rows.length} {lang === "es" ? "correlaciones (post FDR)" : "correlations (post-FDR)"}</span>
      </div>
      <div className="viz-split">
        <svg viewBox={`0 0 ${SW} ${SH}`} className="viz-mini" role="img"
             aria-label={lang === "es" ? "ρ vs p ajustada" : "rho vs adjusted p"}>
          <line x1={PAD} y1={SH / 2} x2={SW - PAD} y2={SH / 2} stroke="var(--color-border)" />
          {rows.map((r, i) => (
            <circle key={i} cx={sx(r.p_adj)} cy={syc(r.rho)} r={hover === r ? 5 : 3}
                    fill={r.rho > 0 ? "var(--color-good)" : "var(--color-bad)"} fillOpacity={0.7}
                    onPointerEnter={() => setHover(r)} onPointerLeave={() => setHover(null)}
                    style={{ cursor: "pointer" }} />
          ))}
          <text x={SW - PAD} y={SH - 6} textAnchor="end" className="viz-axis-lbl">← {lang === "es" ? "más significativo" : "more significant"}</text>
          <text x={PAD} y={12} className="viz-axis-lbl">ρ +1</text>
          <text x={PAD} y={SH - 6} className="viz-axis-lbl">ρ −1</text>
        </svg>
        <div className="viz-tablewrap">
          <table className="viz-table">
            <thead><tr>
              {th("a", lang === "es" ? "Dataset A" : "Dataset A")}
              {th("b", lang === "es" ? "Dataset B" : "Dataset B")}
              {th("key", lang === "es" ? "Clave" : "Key")}
              {th("rho", "ρ")}{th("p_adj", lang === "es" ? "p aj." : "p adj")}{th("n", "n")}
            </tr></thead>
            <tbody>
              {rows.slice(0, 200).map((r, i) => (
                <tr key={i} className={hover === r ? "hl" : ""} onPointerEnter={() => setHover(r)} onPointerLeave={() => setHover(null)}>
                  <td title={r.a}>{r.a.slice(0, 34)}</td>
                  <td title={r.b}>{r.b.slice(0, 34)}</td>
                  <td>{r.key}</td>
                  <td className="num">
                    <span className="cell-bar"><span className={"cell-bar-fill " + (r.rho > 0 ? "pos" : "neg")}
                      style={{ width: `${Math.abs(r.rho) * 100}%` }} />{fmt(r.rho, 2)}</span>
                  </td>
                  <td className="num">{fmt(r.p_adj, 3)}</td>
                  <td className="num">{r.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {hover && (
        <div className="viz-readout" role="status">
          <strong>{hover.a} ↔ {hover.b}</strong>
          <span>{lang === "es" ? "alineado en" : "aligned on"} {hover.key} · ρ={fmt(hover.rho, 3)} · {lang === "es" ? "p ajustada" : "adj p"}={fmt(hover.p_adj, 4)} · n={hover.n} {lang === "es" ? "unidades" : "units"}</span>
          <span>{lang === "es" ? "columnas" : "columns"}: {hover.cols.join(" ~ ")}</span>
        </div>
      )}
    </div>
  );
}
