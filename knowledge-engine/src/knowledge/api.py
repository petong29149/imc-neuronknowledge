"""Internal upload API: `uvicorn knowledge.api:app` (plan T2a).

Only the Next.js server calls this. Every /documents request needs
`Authorization: Bearer <INTERNAL_API_TOKEN>` and `X-Org-Id`; the org comes from that
header only (the Next.js server derives it from the user's session), never from the
body or query. This API must never be reachable from the internet.

Errors are `{"error": "<Thai message>"}` (plus `doc_id` on a duplicate upload), so the
Next.js route handlers can pass them straight to the browser.
"""

import hashlib
import hmac
import logging
import re
import unicodedata
import uuid
from contextlib import asynccontextmanager
from typing import Annotated, Any

from fastapi import APIRouter, Depends, FastAPI, Query, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.datastructures import UploadFile
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.formparsers import MultiPartException

from knowledge import db
from knowledge.config import Settings, get_settings, setup_logging
from knowledge.file_types import FileType, UnsupportedFileError, detect_file_type, extension_of
from knowledge.storage import get_storage

log = logging.getLogger("knowledge.api")

MIN_TOKEN_LENGTH = 32
# Same rule as groups.org_id in the app; also safe as the first segment of a storage key
ORG_ID = re.compile(r"^[a-z0-9][a-z0-9_-]{1,62}$")
MIN_DESCRIPTION = 10
MAX_DESCRIPTION = 1000  # the description is prepended to every chunk's embed_text (T7)
MAX_TAGS = 20
MAX_TAG_LENGTH = 50
MAX_FILENAME = 200
STATUSES = ("uploaded", "extracting", "chunking", "embedding", "indexed", "failed", "needs_ocr", "deleted")

DOCUMENT_FIELDS = """
  d.id AS doc_id, d.filename, d.file_type, d.size_bytes, d.description, d.tags, d.status,
  d.quality_flag, d.error, d.page_count, d.chunk_count, d.metadata, d.created_at, d.updated_at,
  (SELECT j.kind FROM ingestion_jobs j
   WHERE j.doc_id = d.id AND j.state IN ('queued', 'running')
   ORDER BY j.id DESC LIMIT 1) AS pending_job
"""


class ApiError(Exception):
    def __init__(self, status: int, message: str, **extra: Any):
        super().__init__(message)
        self.status = status
        self.message = message
        self.extra = extra


NOT_FOUND = "ไม่พบเอกสาร"


# --------------------------------------------------------------------------- auth


def require_org(request: Request) -> str:
    """Check the service token, then return the org from X-Org-Id."""
    expected = request.app.state.settings.internal_api_token.get_secret_value().encode()
    scheme, _, token = request.headers.get("authorization", "").partition(" ")
    if scheme.lower() != "bearer" or not hmac.compare_digest(token.strip().encode(), expected):
        raise ApiError(401, "ไม่ได้รับอนุญาตให้เรียก API นี้")
    org_id = request.headers.get("x-org-id", "").strip()
    if not ORG_ID.match(org_id):
        raise ApiError(400, "ต้องระบุ X-Org-Id ที่ถูกต้อง")
    return org_id


OrgId = Annotated[str, Depends(require_org)]

router = APIRouter()


@router.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


# --------------------------------------------------------------------------- upload


def clean_filename(raw: str) -> str:
    """Display name and last storage-key segment: no directories, control chars or leading dots."""
    name = unicodedata.normalize("NFC", re.split(r"[\\/]", raw)[-1])
    name = "".join(ch for ch in name if unicodedata.category(ch)[0] != "C").strip().lstrip(".").strip()
    if len(name) > MAX_FILENAME:
        ext = extension_of(name)
        keep = MAX_FILENAME - len(ext) - 1
        name = f"{name[:keep]}.{ext}" if ext and keep > 0 else name[:MAX_FILENAME]
    if not name:
        raise ApiError(400, "ชื่อไฟล์ไม่ถูกต้อง")
    return name


def clean_description(value: Any) -> str:
    description = value.strip() if isinstance(value, str) else ""
    if len(description) < MIN_DESCRIPTION:
        raise ApiError(400, f"กรุณาเขียนคำอธิบายเอกสารอย่างน้อย {MIN_DESCRIPTION} ตัวอักษร")
    if len(description) > MAX_DESCRIPTION:
        raise ApiError(400, f"คำอธิบายเอกสารยาวได้ไม่เกิน {MAX_DESCRIPTION:,} ตัวอักษร")
    if "\x00" in description:
        raise ApiError(400, "คำอธิบายเอกสารมีอักขระที่ไม่รองรับ")
    return description


def clean_tags(values: list[Any]) -> list[str]:
    tags: list[str] = []
    for value in values:
        if not isinstance(value, str):
            raise ApiError(400, "tags ต้องเป็นข้อความ")
        tag = " ".join(value.replace("\x00", "").split())
        if not tag:
            continue
        if len(tag) > MAX_TAG_LENGTH:
            raise ApiError(400, f"แต่ละ tag ยาวได้ไม่เกิน {MAX_TAG_LENGTH} ตัวอักษร")
        if tag not in tags:
            tags.append(tag)
    if len(tags) > MAX_TAGS:
        raise ApiError(400, f"ใส่ tag ได้ไม่เกิน {MAX_TAGS} รายการ")
    return tags


def too_large(settings: Settings) -> ApiError:
    return ApiError(413, f"ไฟล์มีขนาดเกิน {settings.max_file_mb} MB")


async def read_limited(upload: UploadFile, max_bytes: int, settings: Settings) -> bytes:
    chunks: list[bytes] = []
    total = 0
    while chunk := await upload.read(1024 * 1024):
        total += len(chunk)
        if total > max_bytes:
            raise too_large(settings)
        chunks.append(chunk)
    return b"".join(chunks)


@router.post("/documents", status_code=201)
async def upload_document(request: Request, org_id: OrgId) -> dict[str, str]:
    settings: Settings = request.app.state.settings
    max_bytes = settings.max_file_mb * 1024 * 1024
    # Refuse an obviously oversized body before parsing it (1 MB allowance for the multipart envelope)
    length = request.headers.get("content-length", "")
    if length.isdigit() and int(length) > max_bytes + 1024 * 1024:
        raise too_large(settings)

    try:
        form = await request.form(max_files=1, max_fields=MAX_TAGS * 2 + 5)
    except MultiPartException:
        raise ApiError(400, "รูปแบบคำขอไม่ถูกต้อง (ต้องเป็น multipart/form-data)") from None
    try:
        upload = form.get("file")
        if not isinstance(upload, UploadFile):
            raise ApiError(400, "กรุณาเลือกไฟล์ที่จะอัปโหลด")
        filename = clean_filename(upload.filename or "")
        description = clean_description(form.get("description"))
        tags = clean_tags(form.getlist("tags") + form.getlist("tags[]"))
        data = await read_limited(upload, max_bytes, settings)
    finally:
        await form.close()

    if not data:
        raise ApiError(400, "ไฟล์ว่างเปล่า")
    try:
        file_type = detect_file_type(filename, data)
    except UnsupportedFileError as err:
        raise ApiError(415, str(err)) from None

    doc_id = await run_in_threadpool(
        store_document, request.app.state, org_id, filename, file_type, data, description, tags
    )
    return {"doc_id": str(doc_id), "status": "uploaded"}


def store_document(
    state: Any,
    org_id: str,
    filename: str,
    file_type: FileType,
    data: bytes,
    description: str,
    tags: list[str],
) -> uuid.UUID:
    """Store the file and queue it for indexing, all or nothing: the rows commit only after
    the file is written, and the file is removed again if the commit fails."""
    file_hash = hashlib.sha256(data).hexdigest()
    doc_id = uuid.uuid4()
    key = f"{org_id}/{doc_id}/{filename}"
    written = False
    try:
        with state.pool.connection() as conn:
            # Two uploads of the same file to the same org queue up here instead of racing
            conn.execute("SELECT pg_advisory_xact_lock(hashtext(%s))", (f"upload:{org_id}:{file_hash}",))
            existing = conn.execute(
                "SELECT id, status FROM documents WHERE org_id = %s AND file_hash = %s",
                (org_id, file_hash),
            ).fetchone()
            if existing and existing["status"] != "deleted":
                raise ApiError(409, "ไฟล์นี้เคยอัปโหลดแล้ว", doc_id=str(existing["id"]))
            if existing:
                # Its points and file were removed when it was deleted; free UNIQUE (org_id, file_hash)
                conn.execute("DELETE FROM documents WHERE id = %s", (existing["id"],))

            conn.execute(
                """INSERT INTO documents
                     (id, org_id, filename, file_type, mime, size_bytes, storage_path, file_hash,
                      description, tags)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (doc_id, org_id, filename, file_type.name, file_type.mime, len(data), key, file_hash,
                 description, tags),
            )  # fmt: skip
            conn.execute("INSERT INTO ingestion_jobs (doc_id, kind) VALUES (%s, 'index')", (doc_id,))
            state.storage.put(key, data, file_type.mime)
            written = True
    except BaseException:
        if written:
            try:
                state.storage.delete(key)
            except Exception:
                log.exception("could not remove orphaned file for doc=%s", doc_id)
        raise
    log.info("uploaded doc=%s org=%s type=%s bytes=%d", doc_id, org_id, file_type.name, len(data))
    return doc_id


# --------------------------------------------------------------------------- read


def parse_doc_id(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError:
        raise ApiError(404, NOT_FOUND) from None


@router.get("/documents")
def list_documents(
    request: Request,
    org_id: OrgId,
    status: str | None = None,
    tag: str | None = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> dict[str, Any]:
    if status is not None and status not in STATUSES:
        raise ApiError(400, f"status ต้องเป็นหนึ่งใน {', '.join(STATUSES)}")
    where = ["d.org_id = %s", "d.status = %s" if status else "d.status <> 'deleted'"]
    params: list[Any] = [org_id] + ([status] if status else [])
    if tag:
        where.append("%s = ANY(d.tags)")
        params.append(tag)
    with request.app.state.pool.connection() as conn:
        rows = conn.execute(
            f"SELECT {DOCUMENT_FIELDS} FROM documents d WHERE {' AND '.join(where)}"
            " ORDER BY d.created_at DESC, d.id LIMIT %s OFFSET %s",
            [*params, limit, offset],
        ).fetchall()
    return {"documents": rows}


@router.get("/documents/{doc_id}")
def get_document(request: Request, org_id: OrgId, doc_id: str) -> dict[str, Any]:
    with request.app.state.pool.connection() as conn:
        row = conn.execute(
            f"SELECT {DOCUMENT_FIELDS} FROM documents d WHERE d.id = %s AND d.org_id = %s",
            (parse_doc_id(doc_id), org_id),
        ).fetchone()
    # Another org's document is "not found", never "forbidden"
    if row is None:
        raise ApiError(404, NOT_FOUND)
    return row


# --------------------------------------------------------------------------- reindex / delete


def lock_document(conn, doc_id: str, org_id: str) -> uuid.UUID:
    """Lock the org's live document row for this transaction; 404 if missing or deleted."""
    row = conn.execute(
        "SELECT id, status FROM documents WHERE id = %s AND org_id = %s FOR UPDATE",
        (parse_doc_id(doc_id), org_id),
    ).fetchone()
    if row is None or row["status"] == "deleted":
        raise ApiError(404, NOT_FOUND)
    return row["id"]


def pending_jobs(conn, doc_uuid: uuid.UUID) -> list[dict[str, Any]]:
    return conn.execute(
        "SELECT id, kind, state FROM ingestion_jobs WHERE doc_id = %s AND state IN ('queued', 'running') ORDER BY id",
        (doc_uuid,),
    ).fetchall()


def job_response(doc_uuid: uuid.UUID, job: dict[str, Any]) -> dict[str, Any]:
    return {"doc_id": str(doc_uuid), "job_id": job["id"], "kind": job["kind"]}


@router.post("/documents/{doc_id}/reindex", status_code=202)
def reindex_document(request: Request, org_id: OrgId, doc_id: str) -> dict[str, Any]:
    with request.app.state.pool.connection() as conn:
        doc_uuid = lock_document(conn, doc_id, org_id)
        jobs = pending_jobs(conn, doc_uuid)
        if any(j["kind"] == "delete" for j in jobs):
            raise ApiError(409, "เอกสารนี้กำลังถูกลบ")
        # A job that has not started yet will index the current file anyway
        queued = next((j for j in jobs if j["state"] == "queued"), None)
        if queued is None:
            queued = conn.execute(
                "INSERT INTO ingestion_jobs (doc_id, kind) VALUES (%s, 'reindex') RETURNING id, kind",
                (doc_uuid,),
            ).fetchone()
            conn.execute("UPDATE documents SET updated_at = now() WHERE id = %s", (doc_uuid,))
    log.info("queued reindex doc=%s org=%s", doc_uuid, org_id)
    return job_response(doc_uuid, queued)


@router.delete("/documents/{doc_id}", status_code=202)
def delete_document(request: Request, org_id: OrgId, doc_id: str) -> dict[str, Any]:
    """Queue the delete; the worker removes the Qdrant points and the file, then sets status 'deleted'."""
    with request.app.state.pool.connection() as conn:
        doc_uuid = lock_document(conn, doc_id, org_id)
        jobs = pending_jobs(conn, doc_uuid)
        job = next((j for j in jobs if j["kind"] == "delete"), None)
        if job is None:
            # Indexing that has not started is pointless now
            conn.execute(
                "DELETE FROM ingestion_jobs WHERE doc_id = %s AND state = 'queued' AND kind <> 'delete'",
                (doc_uuid,),
            )
            job = conn.execute(
                "INSERT INTO ingestion_jobs (doc_id, kind) VALUES (%s, 'delete') RETURNING id, kind",
                (doc_uuid,),
            ).fetchone()
            conn.execute("UPDATE documents SET updated_at = now() WHERE id = %s", (doc_uuid,))
    log.info("queued delete doc=%s org=%s", doc_uuid, org_id)
    return job_response(doc_uuid, job)


# --------------------------------------------------------------------------- app


HTTP_MESSAGES = {404: "ไม่พบ endpoint นี้", 405: "ไม่รองรับ method นี้"}


def error_response(status: int, message: str, **extra: Any) -> JSONResponse:
    headers = {"WWW-Authenticate": "Bearer"} if status == 401 else None
    return JSONResponse({"error": message, **extra}, status_code=status, headers=headers)


def create_app(settings: Settings | None = None) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        setup_logging()
        s = settings or get_settings()
        token = s.internal_api_token
        if token is None or len(token.get_secret_value()) < MIN_TOKEN_LENGTH:
            raise RuntimeError(f"INTERNAL_API_TOKEN must be set (at least {MIN_TOKEN_LENGTH} characters)")
        app.state.settings = s
        app.state.storage = get_storage(s)
        app.state.pool = db.make_pool(s)
        log.info("api ready (storage=%s, max %d MB)", s.storage_backend, s.max_file_mb)
        try:
            yield
        finally:
            app.state.pool.close()

    # Internal service: no interactive docs or schema endpoint
    app = FastAPI(
        title="Knowledge Engine internal API",
        lifespan=lifespan,
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
    )
    app.include_router(router)

    @app.exception_handler(ApiError)
    async def _api_error(_request: Request, err: ApiError) -> JSONResponse:
        return error_response(err.status, err.message, **err.extra)

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_request: Request, _err: RequestValidationError) -> JSONResponse:
        return error_response(400, "พารามิเตอร์ของคำขอไม่ถูกต้อง")

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(_request: Request, err: StarletteHTTPException) -> JSONResponse:
        return error_response(err.status_code, HTTP_MESSAGES.get(err.status_code, "คำขอไม่ถูกต้อง"))

    @app.exception_handler(Exception)
    async def _unexpected(request: Request, _err: Exception) -> JSONResponse:
        log.exception("unhandled error on %s %s", request.method, request.url.path)
        return error_response(500, "เกิดข้อผิดพลาดภายในระบบคลังความรู้")

    return app


app = create_app()
