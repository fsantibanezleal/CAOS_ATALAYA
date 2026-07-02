import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLang } from "@/lib/useLang";
import { fmt } from "@/components/viz/vizUtils";

interface EmbRow { id: string; title: string; v: number[] }
interface EmbFile { schema: string; model: string; dim: number; n: number; datasets: EmbRow[] }

const BASE = import.meta.env.BASE_URL;
const MODEL = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";

function cosine(a: number[], b: number[]): number {
  let d = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length && i < b.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? d / Math.sqrt(na * nb) : 0;
}

/** LIVE lane: free-text semantic search over the whole catalog. The multilingual MiniLM runs in the browser
 * (transformers.js / onnxruntime-web, WASM) · no server. The query vector is cosine-ranked against the baked
 * dataset embeddings. Graceful: if the model fails to load, it falls back to keyword matching over titles. */
export default function SemanticSearch() {
  const { t } = useTranslation();
  const lang = useLang();
  const [emb, setEmb] = useState<EmbFile | null>(null);
  const [q, setQ] = useState("");
  const [phase, setPhase] = useState<"idle" | "loading" | "ready" | "encoding" | "error" | "fallback">("idle");
  const [results, setResults] = useState<{ id: string; title: string; score: number }[]>([]);
  const extractor = useRef<((text: string, opts: object) => Promise<{ data: Float32Array }>) | null>(null);

  useEffect(() => {
    fetch(`${BASE}data/embeddings.json`).then((r) => (r.ok ? r.json() : null)).then(setEmb).catch(() => setEmb(null));
  }, []);

  async function ensureModel(): Promise<boolean> {
    if (extractor.current) return true;
    setPhase("loading");
    try {
      const tf = await import(/* @vite-ignore */ "@huggingface/transformers");
      const pipe = await tf.pipeline("feature-extraction", MODEL, { dtype: "q8" });
      extractor.current = pipe as unknown as typeof extractor.current;
      setPhase("ready");
      return true;
    } catch {
      setPhase("fallback");
      return false;
    }
  }

  async function search() {
    if (!emb || !q.trim()) return;
    const ok = await ensureModel();
    if (ok && extractor.current) {
      setPhase("encoding");
      try {
        const out = await extractor.current(q, { pooling: "mean", normalize: true });
        const qv = Array.from(out.data as Float32Array);
        rank(qv);
        setPhase("ready");
        return;
      } catch {
        setPhase("fallback");
      }
    }
    // fallback: keyword score over titles
    const low = q.toLowerCase();
    setResults(emb.datasets
      .map((d) => ({ id: d.id, title: d.title, score: d.title.toLowerCase().includes(low) ? 1 : 0 }))
      .filter((r) => r.score > 0).slice(0, 20));
  }

  function rank(qv: number[]) {
    if (!emb) return;
    setResults(emb.datasets
      .map((d) => ({ id: d.id, title: d.title, score: cosine(qv, d.v) }))
      .sort((a, b) => b.score - a.score).slice(0, 20));
  }

  if (!emb) return <div className="banner">{t("common.loading")}</div>;

  return (
    <div className="live-panel">
      <p className="live-intro">{t("live.intro")}</p>
      <div className="live-row">
        <input className="live-input" type="text" value={q} placeholder={t("live.query")}
               onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void search(); }} />
        <button className="btn primary" type="button" onClick={() => void search()}>{t("live.run")}</button>
      </div>
      {phase === "loading" && <p className="live-status">{t("live.loadingRuntime")}</p>}
      {phase === "encoding" && <p className="live-status">{t("live.running")}</p>}
      {phase === "ready" && results.length > 0 && <span className="badge live">{t("live.badge")}</span>}
      {phase === "fallback" && (
        <div className="callout callout-note">
          <strong>{t("live.fallbackTitle")}</strong>
          <p>{t("live.fallbackBody")}</p>
        </div>
      )}
      {phase === "idle" && <p className="live-note">{t("live.firstRunNote")}</p>}
      <ol className="live-results">
        {results.map((r) => (
          <li key={r.id}>
            <span className="live-res-title">{r.title}</span>
            <span className="live-res-score num">{fmt(r.score, 3)}</span>
          </li>
        ))}
      </ol>
      <p className="viz-caption">
        {lang === "es"
          ? `${emb.n} datasets con embedding · modelo ${emb.model} (dim ${emb.dim})`
          : `${emb.n} datasets with an embedding · model ${emb.model} (dim ${emb.dim})`}
      </p>
    </div>
  );
}
