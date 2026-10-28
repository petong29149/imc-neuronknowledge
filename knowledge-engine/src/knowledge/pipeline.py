"""Job handlers the worker runs: index / reindex → process_document, delete → delete_document.

process_document (plan T8): file → converter (T6) → chunker (T7) → dense embeddings of
embed_text + BM25 of text (T5) → delete the document's old points → upsert → 'indexed'.
The converter runs in a child process (converters/isolated.py) so a crash in it fails only that document.
Deleting first makes reindex idempotent: the point count always equals chunk_count.
"""

import logging
import threading
import uuid
from dataclasses import dataclass, field

from psycopg.types.json import Jsonb
from qdrant_client import QdrantClient

from knowledge import bm25, db, vector_store
from knowledge.chunker import ChunkParams, chunk_document
from knowledge.config import Settings
from knowledge.converters.isolated import convert_isolated
from knowledge.embedder import Embedder
from knowledge.errors import JobInterrupted, PermanentError, TransientError
from knowledge.ocr import Ocr, read_pages
from knowledge.storage import Storage
from knowledge.thai_text import TOKENIZER_VERSION

log = logging.getLogger("knowledge.pipeline")

NO_TEXT_MESSAGE = "ไม่พบข้อความในเอกสาร"
MISSING_FILE_MESSAGE = "ไม่พบไฟล์ต้นฉบับในที่เก็บไฟล์ กรุณาอัปโหลดใหม่"
MAX_WARNINGS = 20

DOCUMENT_COLUMNS = "id, org_id, filename, file_type, description, tags, status, storage_path, created_at"


@dataclass
class WorkerContext:
    """What a handler needs; one per worker process."""

    settings: Settings
    storage: Storage
    qdrant: QdrantClient
    embedder: Embedder | None = None
    ocr: Ocr | None = None  # None: scanned pages and images are not read (needs_ocr)
    stop: threading.Event = field(default_factory=threading.Event)

    def check_stop(self) -> None:
        """Call between pipeline stages so shutdown does not wait for a whole document."""
        if self.stop.is_set():
            raise JobInterrupted()


def has_pending_delete(conn, doc_id: uuid.UUID) -> bool:
    row = conn.execute(
        "SELECT 1 FROM ingestion_jobs WHERE doc_id = %s AND kind = 'delete' AND state IN ('queued', 'running')",
        (doc_id,),
    ).fetchone()
    return row is not None


def _set_status(ctx: WorkerContext, doc_id: uuid.UUID, status: str) -> None:
    with db.connect(ctx.settings) as conn:
        conn.execute(
            "UPDATE documents SET status = %s, error = NULL, updated_at = now() WHERE id = %s",
            (status, doc_id),
        )


def _read_file(ctx: WorkerContext, key: str) -> bytes:
    try:
        return ctx.storage.get(key)
    except FileNotFoundError:
        raise PermanentError(MISSING_FILE_MESSAGE) from None
    except Exception as err:
        response = getattr(err, "response", None)  # botocore ClientError
        code = response.get("Error", {}).get("Code") if isinstance(response, dict) else None
        if code in ("NoSuchKey", "404"):
            raise PermanentError(MISSING_FILE_MESSAGE) from None
        raise TransientError(f"storage: {type(err).__name__}") from err


def process_document(ctx: WorkerContext, doc_id: uuid.UUID) -> None:
    settings = ctx.settings
    with db.connect(settings) as conn:
        doc = conn.execute(f"SELECT {DOCUMENT_COLUMNS} FROM documents WHERE id = %s", (doc_id,)).fetchone()
        if doc is None or doc["status"] == "deleted":
            log.info("skip index doc=%s: document is gone", doc_id)
            return
        # A delete queued while this job waited wins: indexing now would only be thrown away
        if has_pending_delete(conn, doc_id):
            log.info("skip index doc=%s: a delete is pending", doc_id)
            return
    if ctx.embedder is None:
        raise TransientError("worker has no embedder configured")

    _set_status(ctx, doc_id, "extracting")
    data = _read_file(ctx, doc["storage_path"])
    result = convert_isolated(
        doc["file_type"],
        data,
        garbled_threshold=settings.garbled_threshold,
        timeout=settings.convert_timeout_seconds,
        should_stop=ctx.stop.is_set,
        ocr_max_pages=settings.ocr_max_pages if ctx.ocr is not None else 0,
    )
    if result.ocr_pages:
        ocr_sections, ocr_warnings = read_pages(ctx.ocr, result.ocr_pages, settings.ocr_concurrency)
        # stable sort: the text pages' Sections keep their order within a page
        result.sections = sorted(result.sections + ocr_sections, key=lambda s: s.page or 0)
        result.warnings.extend(ocr_warnings)
        result.metadata["ocr_pages"] = len(result.ocr_pages)
        result.metadata["ocr_model"] = ctx.ocr.model
        log.info("ocr doc=%s pages=%d", doc_id, len(result.ocr_pages))
    ctx.check_stop()

    _set_status(ctx, doc_id, "chunking")
    chunks = chunk_document(
        result.sections,
        filename=doc["filename"],
        description=doc["description"],
        params=ChunkParams.from_settings(settings),
    )
    if not chunks:
        raise PermanentError(NO_TEXT_MESSAGE)
    ctx.check_stop()

    _set_status(ctx, doc_id, "embedding")
    dense = ctx.embedder.embed([c.embed_text for c in chunks])
    params = bm25.Bm25Params.from_settings(settings)
    sparse = [bm25.encode_document(c.text, params) for c in chunks]
    ctx.check_stop()

    with db.connect(settings) as conn:
        if has_pending_delete(conn, doc_id):
            log.info("skip upsert doc=%s: a delete arrived while indexing", doc_id)
            return
    vector_store.delete_by_doc(ctx.qdrant, settings.qdrant_collection, org_id=doc["org_id"], doc_id=str(doc_id))
    vector_store.upsert_chunks(
        ctx.qdrant,
        settings.qdrant_collection,
        doc=doc,
        chunks=chunks,
        dense=dense,
        sparse=sparse,
        embed_model=ctx.embedder.model,
        tokenizer_version=TOKENIZER_VERSION,
    )

    metadata = dict(result.metadata)
    if result.warnings:
        metadata["warnings"] = result.warnings[:MAX_WARNINGS]
    with db.connect(settings) as conn:
        conn.execute(
            """UPDATE documents
               SET status = 'indexed', error = NULL, chunk_count = %s, page_count = %s, quality_flag = %s,
                   metadata = %s, embed_model = %s, tokenizer_version = %s, updated_at = now()
               WHERE id = %s""",
            (len(chunks), result.page_count, result.quality_flag, Jsonb(metadata), ctx.embedder.model,
             TOKENIZER_VERSION, doc_id),
        )  # fmt: skip
    log.info("indexed doc=%s org=%s chunks=%d quality=%s", doc_id, doc["org_id"], len(chunks), result.quality_flag)


def delete_document(ctx: WorkerContext, doc_id: uuid.UUID) -> None:
    """Remove the document's points and file, then mark it 'deleted' (the API's signal
    that the delete finished and the same file may be uploaded again). Idempotent."""
    with db.connect(ctx.settings) as conn:
        doc = conn.execute("SELECT org_id, storage_path FROM documents WHERE id = %s", (doc_id,)).fetchone()
    if doc is None:
        return
    vector_store.delete_by_doc(ctx.qdrant, ctx.settings.qdrant_collection, org_id=doc["org_id"], doc_id=str(doc_id))
    ctx.storage.delete(doc["storage_path"])
    with db.connect(ctx.settings) as conn:
        conn.execute(
            """UPDATE documents
               SET status = 'deleted', chunk_count = NULL, error = NULL, updated_at = now()
               WHERE id = %s""",
            (doc_id,),
        )
    log.info("deleted doc=%s org=%s", doc_id, doc["org_id"])
