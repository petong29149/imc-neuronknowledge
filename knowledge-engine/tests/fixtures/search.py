"""Documents written straight into Postgres + Qdrant for the search tests (T9, T10)."""

from qdrant_client import models

from knowledge import bm25, db, search
from knowledge.search import Hit
from knowledge.vector_store import DENSE_VECTOR, SPARSE_VECTOR, point_id
from tests.fixtures.embedder import FakeEmbedder, fake_vector

QUESTION = "ลาพักร้อนได้กี่วัน"


def add_doc(
    settings,
    qdrant,
    org_id,
    texts,
    *,
    tags=("HR",),
    match=None,
    query=QUESTION,
    status="indexed",
    filename="policy.pdf",
):
    """A document row plus one point per text, with dense and BM25 vectors like the worker
    writes. The chunk equal to `match` gets `query`'s vector, so a dense search for `query`
    ranks it first; the other chunks get unrelated vectors."""
    params = bm25.Bm25Params.from_settings(settings)
    with db.connect(settings) as conn:
        doc_id = conn.execute(
            """INSERT INTO documents (org_id, filename, file_type, storage_path, file_hash, description, tags,
                                      status, chunk_count)
               VALUES (%s, %s, 'pdf', 'x', gen_random_uuid()::text, 'คู่มือพนักงาน', %s, %s, %s) RETURNING id""",
            (org_id, filename, list(tags), status, len(texts)),
        ).fetchone()["id"]
    doc = str(doc_id)
    points = []
    for i, text in enumerate(texts):
        vectors = {DENSE_VECTOR: fake_vector(query if text == match else text)}
        sparse = bm25.encode_document(text, params)
        if not bm25.is_empty(sparse):
            vectors[SPARSE_VECTOR] = sparse
        payload = {
            "org_id": org_id, "doc_id": doc, "filename": filename, "tags": list(tags), "chunk_index": i,
            "text": text, "citation": f"{filename}, หน้า {i + 1}", "page": i + 1,
        }  # fmt: skip
        points.append(models.PointStruct(id=point_id(doc, i), vector=vectors, payload=payload))
    qdrant.upsert(settings.qdrant_collection, points=points, wait=True)
    return doc


def run_search(settings, qdrant, org_id, *, embedder=None, **kw):
    return search.search(
        settings=settings,
        qdrant=qdrant,
        embedder=embedder or FakeEmbedder(),
        org_id=org_id,
        query=kw.pop("query", QUESTION),
        **kw,
    )


class WordReranker:
    """Scores a hit by how many query words it contains; records what it was given."""

    def __init__(self):
        self.seen: list[int] = []

    def rerank(self, query, hits):
        self.seen.append(len(hits))
        words = query.split()
        rescored = [Hit(**{**h.as_dict(), "score": float(sum(w in h.text for w in words))}) for h in hits]
        return sorted(rescored, key=lambda h: h.score, reverse=True)
