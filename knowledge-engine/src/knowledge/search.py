"""What the MCP tools do (plans T9, T10), as plain functions of an org_id.

The org_id always comes from the caller's API key, never from tool arguments, and every
Qdrant query and SQL statement here filters on it.

Search modes (T10):
- hybrid (default): dense + BM25 candidates fused with RRF inside Qdrant. Falls back to dense
  when the query has no BM25 terms (only stopwords), and to BM25 when embeddings are
  temporarily unavailable — names and codes such as "KNOW-07" are found by BM25 even when
  the dense vector misses them.
- dense / sparse: one side only (evaluation, debugging).
An optional reranker re-scores RERANK_CANDIDATES fused results and keeps top_k.
"""

import logging
import uuid
from dataclasses import asdict, dataclass
from typing import Any, Literal, Protocol

from qdrant_client import QdrantClient, models

from knowledge import bm25, db
from knowledge.config import Settings
from knowledge.embedder import Embedder
from knowledge.errors import TransientError
from knowledge.vector_store import DENSE_VECTOR, SPARSE_VECTOR, point_id

log = logging.getLogger("knowledge.search")

MAX_TOP_K = 20
MAX_WINDOW = 3
PREFETCH_LIMIT = 30  # candidates each side contributes to the fusion
RERANK_CANDIDATES = 20  # fused results the reranker re-scores

Mode = Literal["hybrid", "dense", "sparse"]


@dataclass
class Hit:
    text: str
    citation: str
    filename: str
    doc_id: str
    chunk_index: int
    score: float
    page: int | None = None
    page_label: str | None = None
    slide: int | None = None
    section: str | None = None

    def as_dict(self) -> dict[str, Any]:
        return {k: v for k, v in asdict(self).items() if v is not None}


class Reranker(Protocol):
    def rerank(self, query: str, hits: list["Hit"]) -> list["Hit"]:
        """Return the hits re-ordered (best first) with new scores."""
        ...


def _require_org(org_id: str) -> None:
    if not org_id:
        raise ValueError("org_id is required for every knowledge query")


def org_filter(org_id: str, *, tags: list[str] | None = None, doc_ids: list[str] | None = None) -> models.Filter:
    _require_org(org_id)
    must: list[models.Condition] = [models.FieldCondition(key="org_id", match=models.MatchValue(value=org_id))]
    if tags:
        must.append(models.FieldCondition(key="tags", match=models.MatchAny(any=list(tags))))
    if doc_ids:
        must.append(models.FieldCondition(key="doc_id", match=models.MatchAny(any=[str(d) for d in doc_ids])))
    return models.Filter(must=must)


def _hit(payload: dict[str, Any], score: float) -> Hit:
    return Hit(
        text=payload["text"],
        citation=payload["citation"],
        filename=payload["filename"],
        doc_id=payload["doc_id"],
        chunk_index=payload["chunk_index"],
        score=round(float(score), 4),
        page=payload.get("page"),
        page_label=payload.get("page_label"),
        slide=payload.get("slide"),
        section=payload.get("section"),
    )


def search(
    *,
    settings: Settings,
    qdrant: QdrantClient,
    embedder: Embedder,
    org_id: str,
    query: str,
    top_k: int = 5,
    tags: list[str] | None = None,
    doc_ids: list[str] | None = None,
    mode: Mode = "hybrid",
    reranker: Reranker | None = None,
) -> list[Hit]:
    """Search within one organization; see the module docstring for the modes."""
    flt = org_filter(org_id, tags=tags, doc_ids=doc_ids)
    query = " ".join(query.split())
    if not query:
        return []
    top_k = max(1, min(int(top_k), MAX_TOP_K))
    limit = max(top_k, RERANK_CANDIDATES) if reranker else top_k

    sparse = bm25.encode_query(query) if mode != "dense" else None
    has_terms = sparse is not None and not bm25.is_empty(sparse)
    dense: list[float] | None = None
    if mode != "sparse":
        try:
            [dense] = embedder.embed([query])
        except TransientError:
            if mode == "dense" or not has_terms:
                raise
            log.warning("embeddings unavailable; searching with BM25 only")

    if dense is not None and has_terms:
        result = qdrant.query_points(
            settings.qdrant_collection,
            prefetch=[
                models.Prefetch(query=dense, using=DENSE_VECTOR, limit=PREFETCH_LIMIT, filter=flt),
                models.Prefetch(query=sparse, using=SPARSE_VECTOR, limit=PREFETCH_LIMIT, filter=flt),
            ],
            query=models.FusionQuery(fusion=models.Fusion.RRF),
            query_filter=flt,
            limit=limit,
            with_payload=True,
        )
    elif dense is not None:
        result = qdrant.query_points(
            settings.qdrant_collection,
            query=dense,
            using=DENSE_VECTOR,
            query_filter=flt,
            limit=limit,
            with_payload=True,
        )
    elif has_terms:
        result = qdrant.query_points(
            settings.qdrant_collection,
            query=sparse,
            using=SPARSE_VECTOR,
            query_filter=flt,
            limit=limit,
            with_payload=True,
        )
    else:
        return []  # sparse mode and the query has only stopwords

    hits = [_hit(p.payload, p.score) for p in result.points]
    if reranker and hits:
        hits = reranker.rerank(query, hits)
    return hits[:top_k]


def list_documents(settings: Settings, org_id: str, tags: list[str] | None = None) -> list[dict[str, Any]]:
    """The organization's searchable (indexed) documents."""
    _require_org(org_id)
    with db.connect(settings) as conn:
        rows = conn.execute(
            """SELECT id AS doc_id, filename, description, tags, file_type, status, chunk_count, page_count
               FROM documents
               WHERE org_id = %s AND status = 'indexed' AND (%s::text[] IS NULL OR tags && %s::text[])
               ORDER BY filename""",
            (org_id, tags or None, tags or None),
        ).fetchall()
    return [{**r, "doc_id": str(r["doc_id"])} for r in rows]


def get_document_chunk(
    *, settings: Settings, qdrant: QdrantClient, org_id: str, doc_id: str, chunk_index: int, window: int = 1
) -> list[Hit]:
    """A chunk and its neighbours (± window) — only if the document belongs to `org_id`."""
    _require_org(org_id)
    try:
        doc = str(uuid.UUID(str(doc_id)))
    except ValueError:
        return []
    window = max(0, min(int(window), MAX_WINDOW))
    indexes = range(max(0, int(chunk_index) - window), int(chunk_index) + window + 1)
    points = qdrant.retrieve(settings.qdrant_collection, [point_id(doc, i) for i in indexes], with_payload=True)
    # A point id is derived from doc_id alone; the org check is what keeps other orgs out
    mine = [p for p in points if p.payload.get("org_id") == org_id and p.payload.get("doc_id") == doc]
    if not any(p.payload.get("chunk_index") == int(chunk_index) for p in mine):
        return []
    return [_hit(p.payload, 1.0) for p in sorted(mine, key=lambda p: p.payload["chunk_index"])]
