"""Compute a 3-D PCA of the baked MiniLM embeddings and add `coord3:[x,y,z]` to each catalog node, so the
Catalog map can offer a 3-D embedding view (the 2-D `coord` is untouched). Mirrors the pipeline's PCA; a future
full bake can produce coord3 directly in train._pca_3d. Run with the data-pipeline .venv."""
import json
from pathlib import Path
import numpy as np
from sklearn.decomposition import PCA

ROOT = Path(__file__).resolve().parents[1].parent
PUB = ROOT / "frontend" / "public" / "data"
DER = ROOT / "data" / "derived"

emb = json.loads((PUB / "embeddings.json").read_text(encoding="utf-8"))
ids = [d["id"] for d in emb["datasets"]]
V = np.asarray([d["v"] for d in emb["datasets"]], dtype=np.float64)
Z = PCA(n_components=3, random_state=42).fit_transform(V)
# normalize each axis to ~[-100, 100] for a stable 3-D layout
Z = Z - Z.mean(0)
Z = Z / (np.abs(Z).max(0) + 1e-9) * 100.0
coord3 = {i: [round(float(x), 2), round(float(y), 2), round(float(z), 2)] for i, (x, y, z) in zip(ids, Z)}

# patch the catalog.json used by the map (both derived source + public copy)
for p in [DER / "CART_map" / "artifact.json"]:
    pass
for cat_path in [DER / "catalog.json", PUB / "catalog.json"]:
    if not cat_path.exists():
        continue
    d = json.loads(cat_path.read_text(encoding="utf-8"))
    n = 0
    for node in d["datasets"]:
        if node["id"] in coord3:
            node["coord3"] = coord3[node["id"]]; n += 1
    cat_path.write_text(json.dumps(d, ensure_ascii=False), encoding="utf-8")
    print("patched", cat_path.name, "->", n, "nodes with coord3")

# also patch the CART_map artifact (the map view reads MapPayload from there)
for art in [DER / "CART_map" / "artifact.json"]:
    if not art.exists():
        continue
    d = json.loads(art.read_text(encoding="utf-8"))
    n = 0
    for node in d["payload"]["nodes"]:
        if node["id"] in coord3:
            node["coord3"] = coord3[node["id"]]; n += 1
    art.write_text(json.dumps(d, ensure_ascii=False), encoding="utf-8")
    print("patched CART_map artifact ->", n, "nodes")
