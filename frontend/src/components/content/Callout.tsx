import type { ReactNode } from "react";

export function Callout({
  variant = "note",
  title,
  children,
}: {
  variant?: "note" | "honest" | "strong";
  title?: ReactNode;
  children: ReactNode;
}) {
  const cls =
    variant === "honest" ? "callout callout-honest" : variant === "strong" ? "callout callout-strong" : "callout callout-note";
  return (
    <div className={cls}>
      {title && <p className="callout-title">{title}</p>}
      <div className="callout-body">{children}</div>
    </div>
  );
}
