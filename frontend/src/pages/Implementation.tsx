import { useLang } from "@/lib/useLang";
import { InlineMath } from "@/components/content/Equation";

export default function Implementation() {
  const lang = useLang();
  const es = lang === "es";
  return (
    <div className="page-body">
      <div className="page-head">
        <h1>{es ? "Implementación" : "Implementation"}</h1>
        <p className="lede">{es
          ? "El pipeline offline real, las tres capas de ejecución, los dos contratos de datos y cómo la web reproduce sin servidor."
          : "The real offline pipeline, the three execution lanes, the two data contracts, and how the web replays without a server."}</p>
      </div>
      <div className="prose measure">
        <h2>{es ? "El pipeline por etapas" : "The staged pipeline"}</h2>
        <p>{es ? "Etapas deterministas y sembradas, con contrato explícito entre cada una:" : "Deterministic, seeded stages with an explicit contract between each:"}</p>
        <ol>
          <li><strong>harvest</strong> {es ? "enumera los 1017 datasets vía el backend OpenSearch, clasifica cada recurso en un tier de descarga, y espeja el subconjunto de archivos directos del gobierno con tope de disco, reanudable y con checksum." : "enumerates all 1017 datasets via the OpenSearch backend, classifies each resource into a download tier, and mirrors the gov direct-file subset with a disk cap, resumable and checksummed."}</li>
          <li><strong>preprocess</strong> {es ? "aplica el contrato de ingesta (detección de codificación/separador, política de outliers) y normaliza a parquet." : "applies the ingestion contract (encoding/separator detection, outlier policy) and normalizes to parquet."}</li>
          <li><strong>feature_extraction</strong> {es ? "perfila cada tabla: huellas por columna, claves de entidad, MinHash y embeddings MiniLM." : "profiles each table: per-column fingerprints, entity keys, MinHash and MiniLM embeddings."}</li>
          <li><strong>train</strong> {es ? "ajusta el ladder de modelos (PCA/k-means clásico, embeddings/ONNX SOTA, nulos de la afinidad novel) y exporta el codificador a ONNX." : "fits the model ladder (classical PCA/k-means, SOTA embeddings/ONNX, the novel affinity nulls) and exports the encoder to ONNX."}</li>
          <li><strong>infer</strong> ({es ? "relate" : "relate"}) {es ? "mina las cinco clases de relación al grafo de conocimiento (SQLite-WAL)." : "mines the five relation kinds into the knowledge graph (SQLite-WAL)."}</li>
          <li><strong>evaluate</strong> {es ? "valida con controles negativos y coherencia." : "validates with negative controls and coherence."}</li>
          <li><strong>export</strong> {es ? "escribe los artefactos web compactos + manifiestos (Contrato 2)." : "writes the compact web artifacts + manifests (Contract 2)."}</li>
        </ol>

        <h2>{es ? "Tres capas de ejecución" : "Three execution lanes"}</h2>
        <ul>
          <li><strong>{es ? "Offline (precompute)" : "Offline (precompute)"}</strong>: {es ? "los motores SOTA pesados (polars, DuckDB, sentence-transformers, datasketch, phik, LightGBM, rustworkx) en un venv local; nunca se despliega." : "the heavy SOTA engines (polars, DuckDB, sentence-transformers, datasketch, phik, LightGBM, rustworkx) in a local venv; never deployed."}</li>
          <li><strong>{es ? "Vivo (navegador)" : "Live (browser)"}</strong>: {es ? "búsqueda semántica con el codificador ONNX (onnxruntime-web/WASM) y re-pesado de afinidad en JS puro; ambos sub-milisegundo, sin servidor." : "semantic search with the ONNX encoder (onnxruntime-web/WASM) and affinity reweighting in pure JS; both sub-millisecond, no server."}</li>
          <li><strong>{es ? "Replay" : "Replay"}</strong>: {es ? "la web carga solo los artefactos horneados; nunca recomputa el grafo." : "the web loads only the baked artifacts; it never recomputes the graph."}</li>
        </ul>

        <h2>{es ? "Los dos contratos" : "The two contracts"}</h2>
        <p>{es ? "Contrato 1 (ingesta): esquema + política de outliers; la puerta de trae-tus-propios-datos. Contrato 2 (artefacto): un manifiesto versionado por caso, espejado por tipos TypeScript, de modo que cualquier deriva rompe el build y un guard de CI verifica que cada manifiesto apunta a un artefacto con el tamaño registrado." : "Contract 1 (ingestion): schema + outlier policy; the bring-your-own-data gate. Contract 2 (artifact): a versioned per-case manifest, mirrored by TypeScript types, so any drift breaks the build and a CI guard verifies each manifest points at an artifact with the recorded byte size."}</p>

        <h2>{es ? "Rendimiento y tamaños" : "Performance & sizes"}</h2>
        <p>{es ? "El espejo de archivos directos ocupa ~21 GB en disco (fuera de git); los artefactos web comprometidos son <1 MB por lo que la carga es instantánea. El codificador ONNX cuantizado se descarga una vez y se cachea. Los datasets pesados y los modelos viven fuera de git; solo los artefactos compactos se comprometen." : "The direct-file mirror is ~21 GB on disk (out-of-git); the committed web artifacts are <1 MB so first paint is instant. The quantized ONNX encoder downloads once and is cached. Heavy datasets and models live out-of-git; only the compact artifacts are committed."}</p>
        <p className="faint">{es ? "El grafo completo es consultable vía el servidor MCP incluido (find_related, join_path, correlations_for)." : "The full graph is queryable via the included MCP server (find_related, join_path, correlations_for)."}</p>
        <p>{es ? "Determinismo: cada corrida es función pura de " : "Determinism: each run is a pure function of "}<InlineMath tex="(\text{params},\text{seed})" />{es ? "; el artefacto comprometido es la fuente de verdad." : "; the committed artifact is the source of truth."}</p>
      </div>
    </div>
  );
}
