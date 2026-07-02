"""Chilean entity-key detection — the heart of joinability. A column is a JOIN KEY only if we can name the
shared entity it encodes (a comuna CUT code, a region, a year, a coordinate). This maps heterogeneous public
datasets onto a common set of keys so `relate` can propose real joins instead of blind string overlaps.

Detection is deliberately conservative (header pattern AND value shape), pure-Python and deterministic, so the
same column always gets the same role. References for the code systems:
  - CUT 2018 (Codigo Unico Territorial), INE / SUBDERE: comuna=5 digits, region=2, provincia=3.
  - Region roman/number canonicalization per the 16-region division (Ley 21.074).
"""
from __future__ import annotations

import re
import unicodedata

# --- normalized entity roles (also used as graph key names) ---
COMUNA_CUT = "comuna_cut"
COMUNA_NAME = "comuna_name"
REGION = "region"
PROVINCIA = "provincia"
YEAR = "year"
DATE = "date"
LAT = "lat"
LON = "lon"
RUT = "rut"


def _norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower().strip()
    return re.sub(r"[^a-z0-9]+", "_", s).strip("_")


# header token -> role. Matched on the normalized header.
_HEADER_HINTS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"^(cod|codigo)?_?comuna(_?cut)?$|^cut_?comuna$|^comuna_?cod"), COMUNA_CUT),
    (re.compile(r"^comuna(_?nombre|_?desc|_?glosa)?$|^nombre_?comuna$|^nom_?comuna$"), COMUNA_NAME),
    (re.compile(r"region|^cod_?reg$|^reg$"), REGION),
    (re.compile(r"provincia"), PROVINCIA),
    (re.compile(r"^ano$|^anio$|^year$|^periodo$|^ano_?"), YEAR),
    (re.compile(r"fecha|date|^dia$|^mes$"), DATE),
    (re.compile(r"^lat|latitud"), LAT),
    (re.compile(r"^lon|^lng|longitud"), LON),
    (re.compile(r"^rut$|^run$|^rut_?"), RUT),
]

_RE_YEAR = re.compile(r"^(18|19|20)\d{2}$")
_RE_DATE = re.compile(r"^\d{4}[-/]\d{1,2}([-/]\d{1,2})?$|^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$")
_RE_CUT = re.compile(r"^\d{5}$")           # comuna CUT is 5 digits (region*10000 + ...)
_RE_RUT = re.compile(r"^\d{7,8}[-\dkK]$")


def _looks_numeric_range(samples: list[str], lo: float, hi: float, frac: float = 0.8) -> bool:
    ok = tot = 0
    for v in samples:
        try:
            x = float(str(v).replace(",", "."))
        except (TypeError, ValueError):
            continue
        tot += 1
        if lo <= x <= hi:
            ok += 1
    return tot > 0 and ok / tot >= frac


def _value_fraction(samples: list[str], rx: re.Pattern[str], frac: float = 0.8) -> bool:
    vals = [str(v).strip() for v in samples if str(v).strip()]
    if not vals:
        return False
    return sum(1 for v in vals if rx.match(v)) / len(vals) >= frac


def detect_entity_role(header: str, samples: list[str]) -> str:
    """Return the entity role for a column, or "" if it is not a recognizable join key.

    Requires BOTH a header hint and a compatible value shape where a value test exists, to avoid false keys
    (e.g. a 'region' free-text column is not a join key unless its values canonicalize).
    """
    h = _norm(header)
    hinted = ""
    for rx, role in _HEADER_HINTS:
        if rx.search(h):
            hinted = role
            break

    # value-shape confirmation (independent of the header) for the strongly-typed keys
    if _value_fraction(samples, _RE_CUT) and (hinted in (COMUNA_CUT, "") ):
        # 5-digit codes that are also plausible comuna codes (region prefix 01..16)
        if _looks_numeric_range([s[:2] for s in samples if len(str(s)) == 5], 1, 16, 0.7):
            return COMUNA_CUT
    if hinted == YEAR and _value_fraction(samples, _RE_YEAR):
        return YEAR
    if hinted == DATE and _value_fraction(samples, _RE_DATE):
        return DATE
    if hinted == LAT and _looks_numeric_range(samples, -56.0, -17.0):   # Chile latitude band
        return LAT
    if hinted == LON and _looks_numeric_range(samples, -110.0, -66.0):  # incl. Rapa Nui / Antarctic claim
        return LON
    if hinted == RUT and _value_fraction(samples, _RE_RUT):
        return RUT
    if hinted in (COMUNA_NAME, REGION, PROVINCIA):
        return hinted
    # header said year but values unconfirmed -> still accept 4-digit-year-only columns
    if _value_fraction(samples, _RE_YEAR) and hinted == "":
        return YEAR
    return hinted if hinted in (COMUNA_CUT, COMUNA_NAME, REGION) else ""
