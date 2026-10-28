"""End to end through the real API, worker, Postgres and Qdrant; only OpenAI is faked."""

import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr
from qdrant_client import models

from knowledge import db, pipeline
from knowledge.api import create_app
from knowledge.bm25 import encode_query
from knowledge.converters import isolated
from knowledge.converters.isolated import CRASH_MESSAGE
from knowledge.errors import TransientError
from knowledge.pipeline import NO_TEXT_MESSAGE, WorkerContext
from knowledge.storage import LocalStorage
from knowledge.thai_text import TOKENIZER_VERSION
from knowledge.vector_store import (
    DENSE_SIZE,
    DENSE_VECTOR,
    SPARSE_VECTOR,
    count_doc_points,
    ensure_collection,
    point_id,
)
from knowledge.worker import Worker
from tests.fixtures import converter_children
from tests.fixtures.db import insert_document
from tests.fixtures.embedder import FakeEmbedder
from tests.fixtures.files import make_docx, make_jpg, make_png, make_pptx
from tests.fixtures.ocr import FakeOcr
from tests.fixtures.pdfs import blank_pdf, requires_thai_font, thai_pdf

pytestmark = pytest.mark.integration

TOKEN = "t" * 48
ORG = "acme"
DESCRIPTION = "คู่มือนโยบายการลาของพนักงาน"
POLICY = "พนักงานที่ปฏิบัติงานครบหนึ่งปีมีสิทธิ์ลาพักผ่อนประจำปีได้ไม่เกินสิบวันทำการ ตามตั๋ว KNOW-07"


@pytest.fixture
def settings(migrated, tmp_path):
    return migrated.model_copy(
        update={
            "internal_api_token": SecretStr(TOKEN),
            "storage_backend": "local",
            "local_storage_dir": str(tmp_path / "files"),
        }
    )


@pytest.fixture
def ctx(settings, qdrant):
    ensure_collection(qdrant, settings.qdrant_collection)
    return WorkerContext(
        settings=settings,
        storage=LocalStorage(settings.local_storage_dir),
        qdrant=qdrant,
        embedder=FakeEmbedder(),
    )


@pytest.fixture
def api(settings):
    with TestClient(create_app(settings)) as client:
        yield client


HEADERS = {"Authorization": f"Bearer {TOKEN}", "X-Org-Id": ORG}


def upload(api, name: str, data: bytes) -> str:
    res = api.post("/documents", files={"file": (name, data)}, data={"description": DESCRIPTION, "tags": ["HR"]},
                   headers=HEADERS)  # fmt: skip
    assert res.status_code == 201, res.text
    return res.json()["doc_id"]


def drain(ctx) -> None:
    worker = Worker(ctx)
    while worker.run_once():
        pass
    worker.close()


def doc(api, doc_id: str) -> dict:
    return api.get(f"/documents/{doc_id}", headers=HEADERS).json()


def points(ctx, doc_id: str) -> int:
    return count_doc_points(ctx.qdrant, ctx.settings.qdrant_collection, org_id=ORG, doc_id=doc_id)


# --------------------------------------------------------------------------- indexing every file type


FILES = [
    pytest.param("policy.pdf", lambda: thai_pdf([[POLICY], [POLICY]]), "หน้า 1", marks=requires_thai_font),
    pytest.param("guide.docx", make_docx, "หัวข้อ หัวข้อ"),
    pytest.param("deck.pptx", make_pptx, "สไลด์ 1"),
    pytest.param("notes.txt", lambda: (POLICY + "\n\n" + POLICY.replace("สิบ", "สิบห้า")).encode(), "ส่วนที่ 1"),
    pytest.param("readme.md", lambda: f"# การลา\n\n{POLICY}".encode(), "หัวข้อ การลา"),
]


@pytest.mark.parametrize(("name", "make", "where"), FILES)
def test_upload_then_index_every_file_type(api, ctx, name, make, where):
    doc_id = upload(api, name, make())
    drain(ctx)

    d = doc(api, doc_id)
    assert d["status"] == "indexed", d
    assert d["error"] is None and d["pending_job"] is None
    assert d["chunk_count"] >= 1
    assert points(ctx, doc_id) == d["chunk_count"]

    [point] = ctx.qdrant.retrieve(ctx.settings.qdrant_collection, [point_id(doc_id, 0)], with_payload=True)
    payload = point.payload
    assert (payload["org_id"], payload["doc_id"], payload["filename"]) == (ORG, doc_id, name)
    assert payload["citation"].startswith(f"{name}, {where}")
    assert payload["tags"] == ["HR"] and payload["description"] == DESCRIPTION
    assert (payload["embed_model"], payload["tokenizer_version"]) == ("fake-embedding", TOKENIZER_VERSION)
    with db.connect(ctx.settings) as conn:
        row = conn.execute("SELECT embed_model, tokenizer_version FROM documents WHERE id = %s", (doc_id,)).fetchone()
    assert row == {"embed_model": "fake-embedding", "tokenizer_version": TOKENIZER_VERSION}


def test_indexed_document_is_found_by_bm25_within_its_org(api, ctx):
    doc_id = upload(api, "notes.txt", POLICY.encode())
    drain(ctx)
    org = models.Filter(must=[models.FieldCondition(key="org_id", match=models.MatchValue(value=ORG))])
    hits = ctx.qdrant.query_points(
        ctx.settings.qdrant_collection, query=encode_query("KNOW-07"), using=SPARSE_VECTOR, query_filter=org, limit=3
    ).points
    assert [h.payload["doc_id"] for h in hits] == [doc_id]
    other = models.Filter(must=[models.FieldCondition(key="org_id", match=models.MatchValue(value="other-org"))])
    assert ctx.qdrant.query_points(ctx.settings.qdrant_collection, query=encode_query("KNOW-07"),
                                   using=SPARSE_VECTOR, query_filter=other).points == []  # fmt: skip


def test_dense_vectors_are_stored(api, ctx):
    doc_id = upload(api, "notes.txt", POLICY.encode())
    drain(ctx)
    [point] = ctx.qdrant.retrieve(ctx.settings.qdrant_collection, [point_id(doc_id, 0)], with_vectors=True)
    assert len(point.vector[DENSE_VECTOR]) == DENSE_SIZE
    assert point.vector[SPARSE_VECTOR].indices


@requires_thai_font
def test_pdf_metadata_and_quality_are_saved(api, ctx):
    data = thai_pdf([[POLICY]], metadata={"title": "คู่มือพนักงาน", "author": "ฝ่ายบุคคล"})
    doc_id = upload(api, "policy.pdf", data)
    drain(ctx)
    d = doc(api, doc_id)
    assert d["metadata"]["title"] == "คู่มือพนักงาน"
    assert d["metadata"]["author"] == "ฝ่ายบุคคล"
    assert (d["page_count"], d["quality_flag"]) == (1, "ok")


# --------------------------------------------------------------------------- OCR (KNOW-13)

SCANNED = "ข้อ ๑ พนักงานลาพักร้อนได้ปีละสิบวันทำการ ตามแบบฟอร์ม KNOW-13"


def bm25_doc_ids(ctx, term: str) -> list[str]:
    org = models.Filter(must=[models.FieldCondition(key="org_id", match=models.MatchValue(value=ORG))])
    hits = ctx.qdrant.query_points(
        ctx.settings.qdrant_collection, query=encode_query(term), using=SPARSE_VECTOR, query_filter=org, limit=5
    ).points
    return [h.payload["doc_id"] for h in hits]


def test_scanned_pdf_is_read_by_ocr_and_found_by_its_words(api, ctx):
    ctx.ocr = FakeOcr(SCANNED)
    doc_id = upload(api, "scan.pdf", blank_pdf(2))
    drain(ctx)
    d = doc(api, doc_id)
    assert (d["status"], d["quality_flag"], d["page_count"]) == ("indexed", "ocr", 2), d
    assert d["metadata"]["ocr_pages"] == 2 and d["metadata"]["ocr_model"] == "fake-ocr"
    assert len(ctx.ocr.images) == 2
    [point] = ctx.qdrant.retrieve(ctx.settings.qdrant_collection, [point_id(doc_id, 0)], with_payload=True)
    assert point.payload["citation"].startswith("scan.pdf, หน้า 1")
    assert "KNOW-13" in point.payload["text"]
    assert bm25_doc_ids(ctx, "KNOW-13") == [doc_id]


IMAGES = [("photo.png", make_png, "png"), ("photo.jpeg", make_jpg, "jpg")]


@pytest.mark.parametrize(("name", "make", "file_type"), IMAGES)
def test_an_uploaded_image_is_read_by_ocr(api, ctx, name, make, file_type):
    ctx.ocr = FakeOcr(SCANNED)
    doc_id = upload(api, name, make())
    drain(ctx)
    d = doc(api, doc_id)
    assert (d["status"], d["file_type"], d["quality_flag"]) == ("indexed", file_type, "ocr")
    [point] = ctx.qdrant.retrieve(ctx.settings.qdrant_collection, [point_id(doc_id, 0)], with_payload=True)
    assert point.payload["citation"].startswith(f"{name}, หน้า 1")


def test_without_ocr_an_image_needs_ocr(api, ctx):
    doc_id = upload(api, "photo.png", make_png())
    drain(ctx)
    d = doc(api, doc_id)
    assert (d["status"], d["quality_flag"]) == ("needs_ocr", "needs_ocr")


def test_ocr_that_reads_nothing_fails_with_no_text(api, ctx):
    ctx.ocr = FakeOcr("")
    doc_id = upload(api, "blank-scan.pdf", blank_pdf(1))
    drain(ctx)
    d = doc(api, doc_id)
    assert (d["status"], d["error"]) == ("failed", NO_TEXT_MESSAGE)


def test_ocr_outage_retries_the_job(api, ctx):
    def down(_image):
        raise TransientError("OpenAI OCR: APIConnectionError")

    ctx.ocr = FakeOcr(down)
    doc_id = upload(api, "scan.pdf", blank_pdf(1))
    drain(ctx)
    with db.connect(ctx.settings) as conn:
        job = conn.execute("SELECT state, attempts FROM ingestion_jobs WHERE doc_id = %s", (doc_id,)).fetchone()
    assert job == {"state": "queued", "attempts": 1}


# --------------------------------------------------------------------------- reindex / delete


def test_reindex_does_not_add_points_and_follows_the_current_file(api, ctx):
    long_text = "\n\n".join([POLICY] * 60)
    doc_id = upload(api, "notes.txt", long_text.encode())
    drain(ctx)
    before = doc(api, doc_id)["chunk_count"]
    assert before > 1 and points(ctx, doc_id) == before

    assert api.post(f"/documents/{doc_id}/reindex", headers=HEADERS).status_code == 202
    drain(ctx)
    assert points(ctx, doc_id) == before
    assert doc(api, doc_id)["status"] == "indexed"

    # a shorter file → fewer chunks, and the extra old points are gone too
    with db.connect(ctx.settings) as conn:
        key = conn.execute("SELECT storage_path FROM documents WHERE id = %s", (doc_id,)).fetchone()["storage_path"]
    ctx.storage.put(key, POLICY.encode(), "text/plain")
    api.post(f"/documents/{doc_id}/reindex", headers=HEADERS)
    drain(ctx)
    assert doc(api, doc_id)["chunk_count"] == 1
    assert points(ctx, doc_id) == 1


def test_delete_removes_points_and_file(api, ctx):
    doc_id = upload(api, "notes.txt", POLICY.encode())
    drain(ctx)
    assert points(ctx, doc_id) == 1
    assert api.delete(f"/documents/{doc_id}", headers=HEADERS).status_code == 202
    drain(ctx)
    assert points(ctx, doc_id) == 0
    assert doc(api, doc_id)["status"] == "deleted"
    assert not any((ctx.storage.root / ORG).rglob("*.txt"))


def test_delete_that_arrives_during_embedding_wins(api, ctx):
    doc_id = upload(api, "notes.txt", POLICY.encode())

    def delete_meanwhile(_texts):
        api.delete(f"/documents/{doc_id}", headers=HEADERS)

    ctx.embedder = FakeEmbedder(on_embed=delete_meanwhile)
    drain(ctx)  # runs the index job (skips the upsert), then the delete job
    assert points(ctx, doc_id) == 0
    assert doc(api, doc_id)["status"] == "deleted"


# --------------------------------------------------------------------------- statuses and failures


def test_status_moves_through_the_stages(api, ctx):
    seen = []
    doc_id = upload(api, "notes.txt", POLICY.encode())
    ctx.embedder = FakeEmbedder(on_embed=lambda _t: seen.append(doc(api, doc_id)["status"]))
    drain(ctx)
    assert seen == ["embedding"]
    assert doc(api, doc_id)["status"] == "indexed"


def test_document_without_text_fails(api, ctx):
    doc_id = upload(api, "empty.txt", b"   \n\n   \n")
    drain(ctx)
    d = doc(api, doc_id)
    assert (d["status"], d["error"]) == ("failed", NO_TEXT_MESSAGE)
    assert points(ctx, doc_id) == 0


def test_missing_file_fails_permanently(api, ctx):
    doc_id = upload(api, "notes.txt", POLICY.encode())
    with db.connect(ctx.settings) as conn:
        key = conn.execute("SELECT storage_path FROM documents WHERE id = %s", (doc_id,)).fetchone()["storage_path"]
    ctx.storage.delete(key)
    drain(ctx)
    d = doc(api, doc_id)
    assert d["status"] == "failed" and "ไม่พบไฟล์ต้นฉบับ" in d["error"]


def test_scanned_pdf_needs_ocr(api, ctx):
    doc_id = upload(api, "scan.pdf", blank_pdf(5))
    drain(ctx)
    d = doc(api, doc_id)
    assert (d["status"], d["quality_flag"]) == ("needs_ocr", "needs_ocr")
    assert "OCR" in d["error"]


def test_converter_crash_fails_the_document_once_and_the_worker_goes_on(api, ctx, monkeypatch):
    crashing = upload(api, "crash.pdf", blank_pdf(1))
    fine = upload(api, "notes.txt", POLICY.encode())
    real = pipeline.convert_isolated

    def convert(file_type, data, **kw):
        target = converter_children.segfault if file_type == "pdf" else isolated._child
        return real(file_type, data, target=target, **kw)

    monkeypatch.setattr(pipeline, "convert_isolated", convert)
    drain(ctx)
    d = doc(api, crashing)
    assert (d["status"], d["error"]) == ("failed", CRASH_MESSAGE)
    with db.connect(ctx.settings) as conn:
        job = conn.execute("SELECT state, attempts FROM ingestion_jobs WHERE doc_id = %s", (crashing,)).fetchone()
    assert job == {"state": "failed", "attempts": 1}  # not retried: the same bytes crash again
    assert doc(api, fine)["status"] == "indexed"


def test_without_embedder_the_job_retries(api, ctx):
    doc_id = upload(api, "notes.txt", POLICY.encode())
    ctx.embedder = None
    drain(ctx)
    with db.connect(ctx.settings) as conn:
        job = conn.execute("SELECT state, attempts FROM ingestion_jobs WHERE doc_id = %s", (doc_id,)).fetchone()
    assert job == {"state": "queued", "attempts": 1}


# --------------------------------------------------------------------------- handlers directly


def test_delete_only_touches_its_own_org(ctx):
    doc_id = insert_document(ctx.settings, status="indexed", storage_path="acme/x/a.txt", jobs=())
    for org in (ORG, "other-org"):
        ctx.qdrant.upsert(
            ctx.settings.qdrant_collection,
            points=[
                models.PointStruct(
                    id=point_id(f"{org}-{doc_id}", 0),
                    vector={DENSE_VECTOR: [0.1] * DENSE_SIZE},
                    payload={"org_id": org, "doc_id": str(doc_id)},
                )
            ],  # fmt: skip
            wait=True,
        )
    pipeline.delete_document(ctx, doc_id)
    assert count_doc_points(ctx.qdrant, ctx.settings.qdrant_collection, org_id=ORG, doc_id=str(doc_id)) == 0
    assert count_doc_points(ctx.qdrant, ctx.settings.qdrant_collection, org_id="other-org", doc_id=str(doc_id)) == 1


def test_index_is_skipped_when_a_delete_is_pending(ctx):
    doc_id = insert_document(ctx.settings, jobs=("index", "delete"))
    pipeline.process_document(ctx, doc_id)
    with db.connect(ctx.settings) as conn:
        assert conn.execute("SELECT status FROM documents WHERE id = %s", (doc_id,)).fetchone()["status"] == "uploaded"


def test_index_of_deleted_document_is_skipped(ctx):
    doc_id = insert_document(ctx.settings, status="deleted")
    pipeline.process_document(ctx, doc_id)
    with db.connect(ctx.settings) as conn:
        assert conn.execute("SELECT status FROM documents WHERE id = %s", (doc_id,)).fetchone()["status"] == "deleted"
