import threading
import time
from datetime import timedelta

import pytest

from knowledge import db
from knowledge.errors import JobInterrupted, NeedsOcrError, PermanentError, TransientError
from knowledge.pipeline import WorkerContext
from knowledge.storage import LocalStorage
from knowledge.worker import Worker
from tests.fixtures.db import insert_document

pytestmark = pytest.mark.integration


@pytest.fixture
def ctx(migrated, tmp_path):
    return WorkerContext(settings=migrated, storage=LocalStorage(tmp_path), qdrant=None)


def worker(ctx, handler, **kw):
    return Worker(ctx, {"index": handler, "reindex": handler, "delete": handler}, **kw)


def job_rows(ctx, doc_id):
    with db.connect(ctx.settings) as conn:
        return conn.execute(
            "SELECT id, kind, state, attempts, run_after - now() AS wait, last_error, locked_at"
            " FROM ingestion_jobs WHERE doc_id = %s ORDER BY id",
            (doc_id,),
        ).fetchall()


def document(ctx, doc_id):
    with db.connect(ctx.settings) as conn:
        return conn.execute("SELECT status, error, quality_flag FROM documents WHERE id = %s", (doc_id,)).fetchone()


def sql(ctx, query, *params):
    with db.connect(ctx.settings) as conn:
        conn.execute(query, params)


def ok(_ctx, _doc_id):
    pass


# --------------------------------------------------------------------------- claiming


def test_runs_a_job_and_marks_it_done(ctx):
    doc_id = insert_document(ctx.settings)
    seen = []
    w = worker(ctx, lambda _c, d: seen.append(d))
    assert w.run_once() is True
    assert w.run_once() is False  # queue empty
    assert seen == [doc_id]
    [job] = job_rows(ctx, doc_id)
    assert (job["state"], job["attempts"], job["locked_at"]) == ("done", 1, None)


def test_concurrent_workers_never_share_a_job(ctx):
    docs = [insert_document(ctx.settings) for _ in range(40)]
    processed: list = []
    lock = threading.Lock()

    def handler(_c, doc_id):
        time.sleep(0.005)
        with lock:
            processed.append(doc_id)

    def drain():
        w = worker(ctx, handler)
        while w.run_once():
            pass
        w.close()

    threads = [threading.Thread(target=drain) for _ in range(4)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert sorted(processed) == sorted(docs)  # every job exactly once
    with db.connect(ctx.settings) as conn:
        states = conn.execute("SELECT state, attempts FROM ingestion_jobs").fetchall()
    assert all(r == {"state": "done", "attempts": 1} for r in states)


def test_one_job_per_document_at_a_time(ctx):
    doc_id = insert_document(ctx.settings, jobs=("index", "delete"))
    other = insert_document(ctx.settings)
    started, release = threading.Event(), threading.Event()

    def slow(_c, d):
        if d == doc_id:
            started.set()
            release.wait(5)

    a = worker(ctx, slow)
    t = threading.Thread(target=a.run_once)
    t.start()
    assert started.wait(5)

    seen = []
    b = worker(ctx, lambda _c, d: seen.append(d))
    assert b.run_once() is True and seen == [other]  # skips doc_id's delete while its index runs
    assert b.run_once() is False

    release.set()
    t.join()
    assert b.run_once() is True and seen == [other, doc_id]
    assert [j["state"] for j in job_rows(ctx, doc_id)] == ["done", "done"]


def test_document_locked_by_another_worker_is_put_back(ctx):
    doc_id = insert_document(ctx.settings)
    holder = worker(ctx, ok)
    assert holder._lock_document(doc_id)
    w = worker(ctx, pytest.fail)
    assert w.run_once() is True
    [job] = job_rows(ctx, doc_id)
    assert (job["state"], job["attempts"]) == ("queued", 0)  # attempt not counted
    assert job["wait"] > timedelta(seconds=3)
    holder._unlock_document(doc_id)


# --------------------------------------------------------------------------- failures


def test_transient_error_retries_with_backoff_then_fails(ctx):
    doc_id = insert_document(ctx.settings)
    sql(ctx, "UPDATE ingestion_jobs SET max_attempts = 3 WHERE doc_id = %s", doc_id)

    def flaky(_c, _d):
        raise TransientError("OpenAI 503")

    w = worker(ctx, flaky)
    for attempt, minutes in [(1, 2), (2, 4)]:
        assert w.run_once() is True
        [job] = job_rows(ctx, doc_id)
        assert (job["state"], job["attempts"]) == ("queued", attempt)
        assert timedelta(minutes=minutes, seconds=-10) < job["wait"] <= timedelta(minutes=minutes)
        assert "OpenAI 503" in job["last_error"]
        assert w.run_once() is False  # not due yet
        sql(ctx, "UPDATE ingestion_jobs SET run_after = now() WHERE doc_id = %s", doc_id)

    assert w.run_once() is True
    [job] = job_rows(ctx, doc_id)
    assert (job["state"], job["attempts"]) == ("failed", 3)
    assert document(ctx, doc_id) == {
        "status": "failed",
        "error": "ประมวลผลไม่สำเร็จหลังลองใหม่ 3 ครั้ง",
        "quality_flag": None,
    }


def test_unexpected_exceptions_are_retried(ctx):
    doc_id = insert_document(ctx.settings)

    def boom(_c, _d):
        raise RuntimeError("bug")

    worker(ctx, boom).run_once()
    [job] = job_rows(ctx, doc_id)
    assert job["state"] == "queued"
    assert job["last_error"] == "RuntimeError: bug"


def test_permanent_error_fails_without_retry(ctx):
    doc_id = insert_document(ctx.settings)

    def broken(_c, _d):
        raise PermanentError("ไฟล์ PDF มีรหัสผ่าน กรุณาปลดรหัสก่อนอัปโหลด")

    worker(ctx, broken).run_once()
    [job] = job_rows(ctx, doc_id)
    assert (job["state"], job["attempts"]) == ("failed", 1)
    assert document(ctx, doc_id)["status"] == "failed"
    assert document(ctx, doc_id)["error"] == "ไฟล์ PDF มีรหัสผ่าน กรุณาปลดรหัสก่อนอัปโหลด"


def test_needs_ocr_sets_status_and_quality_flag(ctx):
    doc_id = insert_document(ctx.settings)

    def scanned(_c, _d):
        raise NeedsOcrError("เอกสารเป็นภาพสแกน ต้องใช้ OCR")

    worker(ctx, scanned).run_once()
    assert document(ctx, doc_id) == {
        "status": "needs_ocr",
        "error": "เอกสารเป็นภาพสแกน ต้องใช้ OCR",
        "quality_flag": "needs_ocr",
    }


def test_failed_delete_keeps_document_status(ctx):
    doc_id = insert_document(ctx.settings, status="indexed", jobs=("delete",))

    def cannot(_c, _d):
        raise PermanentError("storage ปฏิเสธ")

    worker(ctx, cannot).run_once()
    doc = document(ctx, doc_id)
    assert doc["status"] == "indexed"
    assert doc["error"] == "ลบเอกสารไม่สำเร็จ: storage ปฏิเสธ"


def test_unknown_job_kind_fails(ctx):
    doc_id = insert_document(ctx.settings)
    Worker(ctx, {"delete": ok}).run_once()
    assert job_rows(ctx, doc_id)[0]["state"] == "failed"


def test_interrupted_job_goes_back_without_counting(ctx):
    doc_id = insert_document(ctx.settings)

    def interrupted(_c, _d):
        raise JobInterrupted()

    worker(ctx, interrupted).run_once()
    [job] = job_rows(ctx, doc_id)
    assert (job["state"], job["attempts"]) == ("queued", 0)
    assert job["wait"] <= timedelta(0)


# --------------------------------------------------------------------------- stale jobs / heartbeat


def test_stale_running_job_is_requeued_or_failed(ctx):
    alive = insert_document(ctx.settings)
    dead = insert_document(ctx.settings)
    out_of_attempts = insert_document(ctx.settings)
    minutes = ctx.settings.job_stale_minutes
    sql(ctx, "UPDATE ingestion_jobs SET state = 'running', attempts = 1, locked_at = now()")
    sql(ctx, "UPDATE ingestion_jobs SET locked_at = now() - make_interval(mins => %s + 1)"
             " WHERE doc_id IN (%s, %s)", minutes, dead, out_of_attempts)  # fmt: skip
    sql(ctx, "UPDATE ingestion_jobs SET attempts = max_attempts WHERE doc_id = %s", out_of_attempts)

    assert worker(ctx, ok).requeue_stale() == 2
    assert job_rows(ctx, alive)[0]["state"] == "running"
    assert job_rows(ctx, dead)[0]["state"] == "queued"
    assert job_rows(ctx, out_of_attempts)[0]["state"] == "failed"
    assert document(ctx, out_of_attempts)["status"] == "failed"
    assert document(ctx, dead)["status"] == "uploaded"


def test_heartbeat_keeps_long_job_fresh(ctx):
    insert_document(ctx.settings)
    seen = []

    def long_job(c, d):
        with db.connect(c.settings) as conn:
            q = "SELECT locked_at FROM ingestion_jobs WHERE doc_id = %s"
            first = conn.execute(q, (d,)).fetchone()["locked_at"]
            time.sleep(0.6)
            seen.append(conn.execute(q, (d,)).fetchone()["locked_at"] > first)

    worker(ctx, long_job, heartbeat_seconds=0.1).run_once()
    assert seen == [True]


def test_run_forever_stops_on_signal(ctx):
    insert_document(ctx.settings)
    w = worker(ctx, lambda c, _d: c.stop.set())  # the job itself asks the worker to stop
    t = threading.Thread(target=w.run_forever)
    t.start()
    t.join(10)
    assert not t.is_alive()
    assert w.conn is None
