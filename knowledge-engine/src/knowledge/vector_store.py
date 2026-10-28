"""Qdrant access (plan §6): one collection for every org, separated by the `org_id` payload.

Every query must filter on org_id — no exceptions. hybrid_query arrives in T10.
"""

import logging
import uuid
from collections.abc import Sequence
from typing import Any

from qdrant_client import QdrantClient, models

from knowledge.chunker import Chunk
from knowledge.config import Settings, get_settings

log = logging.getLogger("knowledge.vector_store")

DENSE_VECTOR = "dense"
SPARSE_VECTOR = "bm25"
# text-embedding-3-small; changing the model means a full reindex
DENSE_SIZE = 1536

# field -> index params; org_id is the tenant key, so Qdrant co-locates each org's points
PAYLOAD_INDEXES: dict[str, models.PayloadSchemaType | models.KeywordIndexParams] = {
    "org_id": models.KeywordIndexParams(type=models.KeywordIndexType.KEYWORD, is_tenant=True),
    "doc_id": models.PayloadSchemaType.KEYWORD,
    "tags": models.PayloadSchemaType.KEYWORD,
}


def get_client(settings: Settings | None = None) -> QdrantClient:
    s = settings or get_settings()
    return QdrantClient(
        url=s.qdrant_url,
        api_key=s.qdrant_api_key.get_secret_value() if s.qdrant_api_key else None,
        timeout=30,
    )


def ensure_collection(client: QdrantClient, name: str) -> bool:
    """Create the collection and its payload indexes if missing. Idempotent.
    Returns True when the collection was created by this call.
    Raises if an existing collection has a different vector layout."""
    created = False
    if not client.collection_exists(name):
        client.create_collection(
            collection_name=name,
            vectors_config={
                DENSE_VECTOR: models.VectorParams(size=DENSE_SIZE, distance=models.Distance.COSINE),
            },
            sparse_vectors_config={
                SPARSE_VECTOR: models.SparseVectorParams(modifier=models.Modifier.IDF),
            },
        )
        created = True
        log.info("created Qdrant collection %s", name)

    info = client.get_collection(name)
    _check_layout(name, info)

    for field, schema in PAYLOAD_INDEXES.items():
        if field not in (info.payload_schema or {}):
            client.create_payload_index(name, field, field_schema=schema, wait=True)
            log.info("created payload index %s.%s", name, field)
    return created


UPSERT_BATCH = 128
# Fixed namespace so a chunk keeps the same point id across reindexes
POINT_NAMESPACE = uuid.UUID("6f1c8a52-3c1e-4d5e-9b7a-2f4e8d0c1a77")


def point_id(doc_id: str, chunk_index: int) -> str:
    return str(uuid.uuid5(POINT_NAMESPACE, f"{doc_id}:{chunk_index}"))


def chunk_payload(doc: dict[str, Any], chunk: Chunk, *, embed_model: str, tokenizer_version: str) -> dict[str, Any]:
    created = doc.get("created_at")
    return {
        "org_id": doc["org_id"],
        "doc_id": str(doc["id"]),
        "filename": doc["filename"],
        "file_type": doc["file_type"],
        "description": doc["description"],
        "tags": list(doc.get("tags") or []),
        "chunk_index": chunk.chunk_index,
        "text": chunk.text,
        "page": chunk.page,
        "page_end": chunk.page_end,
        "page_label": chunk.page_label,
        "slide": chunk.slide,
        "slide_end": chunk.slide_end,
        "section": chunk.section,
        "citation": chunk.citation,
        "is_table": chunk.is_table,
        "token_count": chunk.token_count,
        "embed_model": embed_model,
        "tokenizer_version": tokenizer_version,
        "created_at": created.isoformat() if hasattr(created, "isoformat") else created,
    }


def upsert_chunks(
    client: QdrantClient,
    name: str,
    *,
    doc: dict[str, Any],
    chunks: Sequence[Chunk],
    dense: Sequence[Sequence[float]],
    sparse: Sequence[models.SparseVector],
    embed_model: str,
    tokenizer_version: str,
) -> None:
    """Write one point per chunk, in batches. A chunk with no BM25 terms gets no sparse vector."""
    if not (len(chunks) == len(dense) == len(sparse)):
        raise ValueError("chunks, dense and sparse must have the same length")
    points = []
    for chunk, vector, terms in zip(chunks, dense, sparse, strict=True):
        vectors: dict[str, Any] = {DENSE_VECTOR: list(vector)}
        if terms.indices:
            vectors[SPARSE_VECTOR] = terms
        points.append(
            models.PointStruct(
                id=point_id(str(doc["id"]), chunk.chunk_index),
                vector=vectors,
                payload=chunk_payload(doc, chunk, embed_model=embed_model, tokenizer_version=tokenizer_version),
            )
        )
    for start in range(0, len(points), UPSERT_BATCH):
        client.upsert(collection_name=name, points=points[start : start + UPSERT_BATCH], wait=True)


def count_doc_points(client: QdrantClient, name: str, *, org_id: str, doc_id: str) -> int:
    return client.count(name, count_filter=org_doc_filter(org_id, doc_id), exact=True).count


def org_doc_filter(org_id: str, doc_id: str) -> models.Filter:
    return models.Filter(
        must=[
            models.FieldCondition(key="org_id", match=models.MatchValue(value=org_id)),
            models.FieldCondition(key="doc_id", match=models.MatchValue(value=doc_id)),
        ]
    )


def delete_by_doc(client: QdrantClient, name: str, *, org_id: str, doc_id: str) -> None:
    """Remove every point of one document. Filters on org_id too, like every query here."""
    client.delete(
        collection_name=name,
        points_selector=models.FilterSelector(filter=org_doc_filter(org_id, doc_id)),
        wait=True,
    )


def _check_layout(name: str, info: models.CollectionInfo) -> None:
    vectors = info.config.params.vectors
    dense = vectors.get(DENSE_VECTOR) if isinstance(vectors, dict) else None
    if dense is None or dense.size != DENSE_SIZE or dense.distance != models.Distance.COSINE:
        raise RuntimeError(
            f"Qdrant collection {name!r} exists with an unexpected dense vector config "
            f"(want {DENSE_VECTOR!r}: {DENSE_SIZE} dims, Cosine)"
        )
    sparse = (info.config.params.sparse_vectors or {}).get(SPARSE_VECTOR)
    if sparse is None or sparse.modifier != models.Modifier.IDF:
        raise RuntimeError(
            f"Qdrant collection {name!r} exists without the {SPARSE_VECTOR!r} sparse vector (IDF modifier)"
        )
