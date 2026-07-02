import { useLang } from "@/lib/useLang";
import { EXTERNAL_LINKS } from "@/lib/links";

export default function Introduction() {
  const lang = useLang();
  const es = lang === "es";
  return (
    <div className="page-body">
      <div className="page-head">
        <h1>{es ? "Introducción" : "Introduction"}</h1>
        <p className="lede">{es
          ? "Qué es Atalaya, para quién, y qué problema resuelve sobre los datos abiertos de Chile."
          : "What Atalaya is, who it is for, and the problem it solves over Chile's open data."}</p>
      </div>
      <div className="prose measure">
        <h2>{es ? "El problema" : "The problem"}</h2>
        <p>{es
          ? "El Data Observatory publica más de mil conjuntos de datos abiertos de Chile, siguiendo principios FAIR. Pero un catálogo grande y plano no dice qué datasets se relacionan entre sí: cuáles se pueden unir, cuáles hablan de lo mismo, cuáles correlacionan cuando se alinean por comuna o región. Ese conocimiento relacional queda implícito, y encontrarlo a mano en mil datasets es inviable."
          : "The Data Observatory publishes over a thousand open datasets about Chile, following FAIR principles. But a large flat catalog does not tell you which datasets relate to each other: which can be joined, which describe the same thing, which correlate when aligned by comuna or region. That relational knowledge stays implicit, and finding it by hand across a thousand datasets is infeasible."}</p>
        <p>{es
          ? "Atalaya construye ese mapa de relaciones automáticamente y lo hace explorable: un observatorio del observatorio."
          : "Atalaya builds that relation map automatically and makes it explorable: an observatory of the observatory."}</p>

        <h2>{es ? "Para quién" : "Who it is for"}</h2>
        <ul>
          <li>{es ? "Analistas de políticas públicas que necesitan cruzar indicadores por comuna o región." : "Public-policy analysts who need to cross indicators by comuna or region."}</li>
          <li>{es ? "Investigadores que buscan datasets complementarios para un estudio." : "Researchers looking for complementary datasets for a study."}</li>
          <li>{es ? "Periodistas de datos y ciudadanía que quieren entender qué hay y cómo se conecta." : "Data journalists and citizens who want to understand what exists and how it connects."}</li>
        </ul>

        <h2>{es ? "El enfoque" : "The approach"}</h2>
        <p>{es
          ? "Un pipeline offline descarga el subconjunto de archivos directos del catálogo, perfila cada tabla (esquema, estadísticas, claves de entidad chilenas, embeddings), y mina cinco tipos de relación entre datasets: mismo origen, similitud semántica, unibilidad, solape geográfico y correlación estadística. Todo se resume en un grafo de conocimiento que la web reproduce, más una propuesta novel que fusiona las evidencias en un score de afinidad calibrado."
          : "An offline pipeline downloads the catalog's direct-file subset, profiles every table (schema, statistics, Chilean entity keys, embeddings), and mines five kinds of dataset relation: same source, semantic similarity, joinability, geographic overlap and statistical correlation. It all rolls up into a knowledge graph the web replays, plus a novel proposal that fuses the evidences into a calibrated affinity score."}</p>

        <h2>{es ? "Qué es y qué no es" : "What it is and is not"}</h2>
        <p>{es
          ? "Es un explorador de relaciones sobre datos reales, honesto sobre su incertidumbre: cada correlación pasa una prueba de permutación con control de tasa de falsos descubrimientos, y un control negativo confirma que datos barajados no producen hallazgos. No es un almacén de datos ni un reemplazo del catálogo oficial; no inventa causalidad; no espeja los archivos científicos DOI pesados (los referencia)."
          : "It is a relation explorer over real data, honest about its uncertainty: every correlation passes a permutation test with false-discovery-rate control, and a negative control confirms shuffled data yields no findings. It is not a data warehouse or a replacement for the official catalog; it does not invent causation; it does not mirror the heavy DOI scientific archives (it references them)."}</p>
        <p className="faint">{es ? "Fuente de datos: " : "Data source: "}
          <a href={EXTERNAL_LINKS.source} target="_blank" rel="noreferrer noopener">Data Observatory</a>.</p>
      </div>
    </div>
  );
}
