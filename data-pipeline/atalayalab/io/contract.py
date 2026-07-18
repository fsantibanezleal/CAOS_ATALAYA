"""Contract 1 — ingestion (raw -> pipeline). The *bring-your-own-data* gate for Atalaya.

A raw resource is ACCEPTED as a profilable table iff it reads into a rectangular table that satisfies minimum
quality bounds; it is REJECTED (with a reason) when it cannot be read or is structurally unusable; it is FLAGGED
(accepted, but the flag is recorded in the manifest) when it is readable but suspicious (very wide, mostly-null,
single-row). This is what lets Atalaya be pointed at ANY new tabular dataset, not only the DO catalog.

The outlier / missing policy is EXPLICIT (never silent coercion):
  - encoding/format failure                -> REJECT
  - 0 rows or 0 columns                     -> REJECT
  - > MAX_COLS columns                      -> REJECT (not a tidy table; likely a matrix dump)
  - all-null column                         -> DROP the column, FLAG
  - > MAX_NULL_FRAC null cells overall      -> FLAG (accepted, quality-flagged)
  - duplicated headers                      -> de-duplicate (suffix), FLAG
Documented in data/README.md + docs/data-contract.md.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

from .formats import UnreadableResource, read_table

MAX_COLS = 512
MIN_ROWS = 1
MAX_NULL_FRAC = 0.6
FLAG_WIDE_COLS = 120


@dataclass
class TableReport:
    """Outcome of applying Contract 1 to one raw resource."""
    resource_path: str
    accepted: bool
    n_rows: int = 0
    n_cols: int = 0
    reason: str = ""
    flags: list[str] = field(default_factory=list)
    df: object = None                 # the cleaned polars DataFrame when accepted, else None

    def summary(self) -> str:
        s = "ACCEPT" if self.accepted else "REJECT"
        return f"{s} {self.resource_path} rows={self.n_rows} cols={self.n_cols} flags={self.flags} {self.reason}".strip()


def validate_table(resource_path: str | Path, *, max_rows: int | None = None) -> TableReport:
    """Apply Contract 1 to a raw file. Pure w.r.t. the file (reads, does not mutate the source)."""
    path = str(resource_path)
    try:
        df = read_table(path, max_rows=max_rows)
    except UnreadableResource as e:
        return TableReport(path, accepted=False, reason=f"unreadable: {e}")

    flags: list[str] = []
    n_rows, n_cols = df.height, df.width
    if n_cols == 0 or n_rows < MIN_ROWS:
        return TableReport(path, accepted=False, n_rows=n_rows, n_cols=n_cols, reason="empty table")
    if n_cols > MAX_COLS:
        return TableReport(path, accepted=False, n_rows=n_rows, n_cols=n_cols,
                           reason=f"too wide ({n_cols} > {MAX_COLS} cols); not a tidy table")

    # de-duplicate headers (gov exports often repeat a header) -> suffix + flag
    seen: dict[str, int] = {}
    new_cols = []
    dup = False
    for c in df.columns:
        name = c if c not in seen else f"{c}__{seen[c]}"
        if c in seen:
            dup = True
        seen[c] = seen.get(c, 0) + 1
        new_cols.append(name)
    if dup:
        df.columns = new_cols
        flags.append("duplicate_headers")

    # drop all-null columns -> flag
    null_counts = df.null_count().row(0)
    keep = [c for c, nc in zip(df.columns, null_counts) if nc < n_rows]
    if len(keep) < n_cols:
        df = df.select(keep)
        flags.append(f"dropped_{n_cols - len(keep)}_null_cols")
        n_cols = df.width

    total_cells = max(1, n_rows * n_cols)
    null_frac = sum(df.null_count().row(0)) / total_cells
    if null_frac > MAX_NULL_FRAC:
        flags.append(f"high_null_frac_{null_frac:.2f}")
    if n_cols > FLAG_WIDE_COLS:
        flags.append(f"wide_{n_cols}_cols")
    if n_rows == 1:
        flags.append("single_row")

    return TableReport(path, accepted=True, n_rows=n_rows, n_cols=n_cols, flags=flags, df=df)
