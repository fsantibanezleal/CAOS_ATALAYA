import { useMemo, useState } from "react";
import type { QualityPayload, QualityRow } from "@/lib/types";
import { useLang } from "@/lib/useLang";
import { viridis, fmtPct, shortNum } from "./vizUtils";

/** Data-quality census: a distribution panel (chosen metric) + a per-dataset table. The metric variant picks
 * what the bars encode (null fraction, width, contract flags, dtype mix, key coverage, cardinality). */
export default function QualityView({ payload, metric = "null" }: { payload: QualityPayload; metric?: string }) {
  const lang = useLang();
  const [hover, setHover] = useState<QualityRow | null>(null);

  const rows = useMemo(() => {
    const keys: Record<string, (r: QualityRow) => number> = {
      null: (r) => r.null_frac, wide: (r) => r.n_cols, keys: (r) => r.keys,
      card: (r) => r.max_card, flags: (r) => r.n_cols, dtypes: (r) => r.n_cols,
    };
    const key = keys[metric] ?? ((r: QualityRow) => r.null_frac);
    return [...payload.rows].sort((a, b) => key(b) - key(a)).slice(0, 120);
  }, [payload.rows, metric]);

  const dist = metric === "dtypes" ? payload.dtypes : metric === "flags" ? payload.flags : null;

  return (
    <div className="viz-wrap">
      {dist ? (
        <div className="qc-dist">
          <span className="viz-hint">{metric === "dtypes" ? (lang === "es" ? "Mezcla de tipos de columna" : "Column type mix") : (lang === "es" ? "Flags de contrato de ingesta" : "Ingestion contract flags")}</span>
          {Object.entries(dist).sort((a, b) => b[1] - a[1]).map(([k, v], i, arr) => (
            <div key={k} className="cov-row">
              <span className="cov-label">{k}</span>
              <span className="cov-track"><span className="cov-fill" style={{ width: `${(v / arr[0][1]) * 100}%`, background: viridis(1 - i / arr.length) }} /></span>
              <span className="num">{v}</span>
            </div>
          ))}
        </div>
      ) : (
        <span className="viz-hint">{rows.length} {lang === "es" ? "tablas · barras = " : "tables · bars = "}{metricLabel(metric, lang)}</span>
      )}
      <div className="viz-tablewrap">
        <table className="viz-table">
          <thead><tr>
            <th scope="col">{lang === "es" ? "Dataset" : "Dataset"}</th>
            <th scope="col">{lang === "es" ? "Tema" : "Theme"}</th>
            <th scope="col">{lang === "es" ? "Cols" : "Cols"}</th>
            <th scope="col">{lang === "es" ? "Filas" : "Rows"}</th>
            <th scope="col">{lang === "es" ? "Nulos" : "Nulls"}</th>
            <th scope="col">{lang === "es" ? "Claves" : "Keys"}</th>
            <th scope="col">{lang === "es" ? "Card. máx" : "Max card"}</th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={hover === r ? "hl" : ""} onPointerEnter={() => setHover(r)} onPointerLeave={() => setHover(null)}>
                <td title={r.title}>{r.title.slice(0, 36)}</td>
                <td>{r.theme.slice(0, 20)}</td>
                <td className="num">{r.n_cols}</td>
                <td className="num">{shortNum(r.n_rows)}</td>
                <td className="num"><span className="cell-bar"><span className="cell-bar-fill neg" style={{ width: `${r.null_frac * 100}%` }} />{fmtPct(r.null_frac)}</span></td>
                <td className="num">{r.keys}</td>
                <td className="num">{shortNum(r.max_card)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function metricLabel(m: string, lang: string): string {
  const map: Record<string, [string, string]> = {
    null: ["null fraction", "fracción de nulos"], wide: ["column count", "n.º de columnas"],
    keys: ["key coverage", "cobertura de claves"], card: ["cardinality", "cardinalidad"],
  };
  const e = map[m] ?? map.null;
  return lang === "es" ? e[1] : e[0];
}
