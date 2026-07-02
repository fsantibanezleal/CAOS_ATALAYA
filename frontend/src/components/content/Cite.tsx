import { CITATIONS, CITATIONS_BY_ID, citationHref, type Citation, type CitationId } from "@/data/citations";

/** Inline reference, linked to its DOI/URL, e.g. "(Little 1961)". */
export function Cite({ id, paren = true }: { id: CitationId; paren?: boolean }) {
  const c = CITATIONS_BY_ID[id];
  if (!c) return <cite className="cite-inline">[{id}]</cite>;
  const href = citationHref(c);
  const label = href ? (
    <a href={href} target="_blank" rel="noreferrer noopener">{c.label}</a>
  ) : (
    <span>{c.label}</span>
  );
  return (
    <cite className="cite-inline">
      {paren ? "(" : null}
      {label}
      {paren ? ")" : null}
    </cite>
  );
}

/** A short inline "Refs: a · b · c" row, used under each theory sub-tab. */
export function Refs({ ids, label }: { ids: CitationId[]; label: string }) {
  return (
    <p className="th-refs">
      <span className="th-refs-label">{label}</span>{" "}
      {ids.map((id, i) => (
        <span key={id}>
          {i > 0 ? " · " : null}
          <Cite id={id} paren={false} />
        </span>
      ))}
    </p>
  );
}

/** Full ordered bibliography block. Omit `ids` to render every citation. */
export function ReferenceList({ ids, heading }: { ids?: CitationId[]; heading?: string }) {
  const items: Citation[] = ids ? ids.map((k) => CITATIONS_BY_ID[k]).filter(Boolean) : CITATIONS;
  return (
    <section className="references" aria-label={heading ?? "References"}>
      {heading ? <h2>{heading}</h2> : null}
      <ol className="reference-list">
        {items.map((c) => {
          const href = citationHref(c);
          return (
            <li key={c.id}>
              <span>{c.citation}</span>{" "}
              {href ? (
                <a href={href} target="_blank" rel="noreferrer noopener" className="faint">
                  {c.doi ? `doi:${c.doi}` : "link"}
                </a>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
