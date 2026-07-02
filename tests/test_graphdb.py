"""Knowledge-graph store (sqlite stdlib — runs everywhere). Upserts are idempotent; reads return what was
written; neighbor queries are symmetric."""
from atalayalab.core.graphdb import GraphDB


def test_upsert_and_read(tmp_path):
    db = GraphDB(tmp_path / "g.db")
    db.add_node("A", "dataset", "Dataset A", {"theme": "x"})
    db.add_node("B", "dataset", "Dataset B", {"theme": "y"})
    db.add_edge("A", "B", "JOINABLE_ON", 0.9, {"key": "comuna_cut"})
    db.commit()
    assert len(db.nodes("dataset")) == 2
    edges = db.edges(kind="JOINABLE_ON")
    assert len(edges) == 1 and edges[0]["evidence"]["key"] == "comuna_cut"
    db.close()


def test_edge_upsert_is_idempotent(tmp_path):
    db = GraphDB(tmp_path / "g.db")
    db.add_node("A", "dataset", "A")
    db.add_node("B", "dataset", "B")
    db.add_edge("A", "B", "CORRELATES", 0.5, {"rho": 0.5})
    db.add_edge("A", "B", "CORRELATES", 0.7, {"rho": 0.7})   # same (src,dst,kind) -> update, not duplicate
    db.commit()
    edges = db.edges(kind="CORRELATES")
    assert len(edges) == 1 and edges[0]["weight"] == 0.7
    db.close()


def test_neighbors_symmetric_and_weight_filter(tmp_path):
    db = GraphDB(tmp_path / "g.db")
    for n in ("A", "B", "C"):
        db.add_node(n, "dataset", n)
    db.add_edge("A", "B", "SEMANTICALLY_SIMILAR", 0.8, {})
    db.add_edge("C", "A", "SEMANTICALLY_SIMILAR", 0.3, {})
    db.commit()
    nb = db.neighbors("A", min_weight=0.5)
    assert [x["neighbor"] for x in nb] == ["B"]     # C filtered out by weight; edge direction ignored
    db.close()


def test_counts(tmp_path):
    db = GraphDB(tmp_path / "g.db")
    db.add_node("A", "dataset", "A")
    db.add_node("B", "dataset", "B")
    db.add_edge("A", "B", "JOINABLE_ON", 0.9, {})
    db.commit()
    c = db.counts()
    assert c["nodes"] == 2 and c["edges"] == 1 and c["by_edge_kind"]["JOINABLE_ON"] == 1
    db.close()
