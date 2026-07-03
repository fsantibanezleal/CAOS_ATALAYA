"""Enrich catalog nodes with the FULL subcategory taxonomy (DataCite `categories[].sub_category`, all of them,
not just the first). The catalog assigns up to 5 categories per dataset; ~70% have 2+ and there are 27 clean
sub-categories (Ciencias de la salud, Derecho, Economia y negocios, Sociologia, ...). Adds `topics: string[]`
so the map can colour by topic and the hover can list them. Mirrors what inventory.py should extract in a
future bake. Run with the data-pipeline .venv."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1].parent
DOCS = Path(r"E:\_Datos\atalaya\catalog\documents.json")
PUB = ROOT / "frontend" / "public" / "data"
DER = ROOT / "data" / "derived"

docs = json.loads(DOCS.read_text(encoding="utf-8"))
topics_of = {}
for d in docs:
    subs, order = set(), []
    for c in d["_source"].get("categories") or []:
        sc = (c.get("sub_category") or "").strip()
        if sc and sc not in subs:
            subs.add(sc); order.append(sc)
    if order:
        topics_of[d["_id"]] = order

def patch_nodes(nodes):
    n = 0
    for nd in nodes:
        t = topics_of.get(nd["id"])
        if t:
            nd["topics"] = t; n += 1
    return n

# catalog.json (both copies) + CART_map artifact + every graph/map artifact node list
targets = [DER / "catalog.json", PUB / "catalog.json"]
for base in [DER, PUB]:
    for case in ["CART_map", "SEM_network", "JOIN_comuna", "JOIN_region", "CORR_network", "AFF_top"]:
        p = base / case / "artifact.json"
        if p.exists():
            targets.append(p)

for p in targets:
    if not p.exists():
        continue
    d = json.loads(p.read_text(encoding="utf-8"))
    nodes = d.get("datasets") or d.get("payload", {}).get("nodes") or []
    n = patch_nodes(nodes)
    p.write_text(json.dumps(d, ensure_ascii=False), encoding="utf-8")
    print(f"patched {p.relative_to(ROOT)} -> {n} nodes with topics")
print("distinct subcategories:", len({t for ts in topics_of.values() for t in ts}))
