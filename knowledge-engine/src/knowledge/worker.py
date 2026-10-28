"""Ingestion worker: `python -m knowledge.worker` (plan T3). Run as many as you like
(`docker compose up -d --scale worker=3`); they coordinate through Postgres only.

- Claim: UPDATE … WHERE id = (SELECT … FOR UPDATE SKIP LOCKED) — no two workers get one job.
- One job per document at a time: the claim skips documents with a running job, and a
  per-document advisory lock catches the rare race between two claims.
- Failure: PermanentError → failed now; anything else → retry after 2^attempts minutes,
  failed once attempts reach max_attempts.
- A heartbeat refreshes locked_at while a job runs; jobs whose locked_at is older than
  JOB_STALE_MINUTES (the worker died) go back to the queue.
- SIGINT/SIGTERM: finish or interrupt the current job, then exit.
"""

import logging
import signal
import threading
import time
import uuid
from collections.abc import Callable
from typing import Any

import psycopg

from knowledge import chunker, db, pipeline, thai_text, vector_store
from knowledge.config import get_settings, redact_url, setup_logging
from knowledge.converters import isolated
from knowledge.embedder import OpenAIEmbedder
from knowledge.errors import JobInterrupted, PermanentError
from knowledge.ocr import load_ocr
from knowledge.pipeline import WorkerContext
from knowledge.storage import get_storage

log = logging.getLogger("knowledge.worker")

Handler = Callable[[WorkerContext, uuid.UUID], None]

DEFAULT_HANDLERS: dict[str, Handler] = {
    "index": pipeline.process_document,
    "reindex": pipeline.process_document,
    "delete": pipeline.delete_document,
}

CLAIM_SQL = """
UPDATE ingestion_jobs SET state = 'running', locked_at = now(), attempts = attempts + 1
WHERE id = (
  SELECT j.id FROM ingestion_jobs j
  WHERE j.state = 'queued' AND j.run_after <= now()
    AND NOT EXISTS (
      SELECT 1 FROM ingestion_jobs r WHERE r.doc_id = j.doc_id AND r.state = 'running'
    )
  ORDER BY j.id
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
RETURNING id, doc_id, kind, attempts, max_attempts
"""

STALE_CHECK_SECONDS = 60
LOCKED_RETRY_SECONDS = 5
MAX_ERROR_LENGTH = 2000


def describe(err: BaseException) -> str:
    text = str(err) if isinstance(err, PermanentError) else f"{type(err).__name__}: {err}"
    return text[:MAX_ERROR_LENGTH]


class Heartbeat:
    """Refresh the running job's locked_at from a side thread (its own connection)."""

    def __init__(self, ctx: WorkerContext, job_id: int, interval: float):
        self.ctx, self.job_id, self.interval = ctx, job_id, interval
        self._done = threading.Event()
        self._thread = threading.Thread(target=self._run, name=f"heartbeat-{job_id}", daemon=True)

    def __enter__(self) -> "Heartbeat":
        self._thread.start()
        return self

    def __exit__(self, *_exc: object) -> None:
        self._done.set()
        self._thread.join()

    def _run(self) -> None:
        try:
            with db.connect(self.ctx.settings, autocommit=True) as conn:
                while not self._done.wait(self.interval):
                    conn.execute(
                        "UPDATE ingestion_jobs SET locked_at = now() WHERE id = %s AND state = 'running'",
                        (self.job_id,),
                    )
        except Exception:
            # Without a heartbeat the job may be requeued as stale; the document lock still
            # prevents a second worker from processing it at the same time
            log.exception("heartbeat stopped for job=%s", self.job_id)


class Worker:
    def __init__(
        self,
        ctx: WorkerContext,
        handlers: dict[str, Handler] | None = None,
        *,
        heartbeat_seconds: float = 60,
    ):
        self.ctx = ctx
        self.handlers = handlers or DEFAULT_HANDLERS
        self.heartbeat_seconds = heartbeat_seconds
        self.conn: psycopg.Connection | None = None

    # ---------------------------------------------------------------- connection

    def connect(self) -> None:
        self.conn = db.connect(self.ctx.settings, autocommit=True)

    def close(self) -> None:
        if self.conn is not None:
            self.conn.close()
            self.conn = None

    def _sql(self, query: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
        if self.conn is None or self.conn.closed:
            self.connect()
        cur = self.conn.execute(query, params)
        return cur.fetchall() if cur.description else []

    # ---------------------------------------------------------------- jobs

    def claim(self) -> dict[str, Any] | None:
        rows = self._sql(CLAIM_SQL)
        return rows[0] if rows else None

    def run_once(self) -> bool:
        """Claim and run one job. False when there was nothing to do."""
        job = self.claim()
        if job is None:
            return False
        doc_id = job["doc_id"]
        if not self._lock_document(doc_id):
            # Another worker holds this document right now; try again shortly
            self._release(job, delay_seconds=LOCKED_RETRY_SECONDS)
            return True
        try:
            log.info("job=%s %s doc=%s attempt %s/%s", job["id"], job["kind"], doc_id,
                     job["attempts"], job["max_attempts"])  # fmt: skip
            with Heartbeat(self.ctx, job["id"], self.heartbeat_seconds):
                self._run(job)
        finally:
            self._unlock_document(doc_id)
        return True

    def _run(self, job: dict[str, Any]) -> None:
        handler = self.handlers.get(job["kind"])
        try:
            if handler is None:
                raise PermanentError(f"ไม่รู้จักงานชนิด {job['kind']}")
            handler(self.ctx, job["doc_id"])
        except JobInterrupted:
            log.info("job=%s interrupted by shutdown; back to the queue", job["id"])
            self._release(job, delay_seconds=0)
        except PermanentError as err:
            log.warning("job=%s failed permanently: %s", job["id"], describe(err))
            self._fail(job, err, str(err))
        except Exception as err:
            if job["attempts"] < job["max_attempts"]:
                log.warning("job=%s attempt %s failed, will retry: %s", job["id"], job["attempts"], describe(err))
                self._retry(job, err)
            else:
                log.error("job=%s failed after %s attempts: %s", job["id"], job["attempts"], describe(err))
                self._fail(job, err, f"ประมวลผลไม่สำเร็จหลังลองใหม่ {job['attempts']} ครั้ง")
        else:
            self._sql(
                "UPDATE ingestion_jobs SET state = 'done', locked_at = NULL, last_error = NULL WHERE id = %s",
                (job["id"],),
            )

    def _release(self, job: dict[str, Any], *, delay_seconds: float) -> None:
        """Back to the queue without counting the attempt."""
        self._sql(
            """UPDATE ingestion_jobs
               SET state = 'queued', locked_at = NULL, attempts = attempts - 1,
                   run_after = now() + make_interval(secs => %s)
               WHERE id = %s""",
            (delay_seconds, job["id"]),
        )

    def _retry(self, job: dict[str, Any], err: BaseException) -> None:
        self._sql(
            """UPDATE ingestion_jobs
               SET state = 'queued', locked_at = NULL, last_error = %s,
                   run_after = now() + make_interval(mins => power(2, attempts)::int)
               WHERE id = %s""",
            (describe(err), job["id"]),
        )

    def _fail(self, job: dict[str, Any], err: BaseException, user_message: str) -> None:
        self._sql(
            "UPDATE ingestion_jobs SET state = 'failed', locked_at = NULL, last_error = %s WHERE id = %s",
            (describe(err), job["id"]),
        )
        self._mark_document_failed(job["doc_id"], job["kind"], user_message, err)

    def _mark_document_failed(self, doc_id: uuid.UUID, kind: str, message: str, err: BaseException | None) -> None:
        if kind == "delete":
            # The document still exists as it was; only record why the delete did not happen
            self._sql(
                "UPDATE documents SET error = %s, updated_at = now() WHERE id = %s",
                (f"ลบเอกสารไม่สำเร็จ: {message}", doc_id),
            )
            return
        status = err.doc_status if isinstance(err, PermanentError) else "failed"
        quality_flag = err.quality_flag if isinstance(err, PermanentError) else None
        self._sql(
            """UPDATE documents
               SET status = %s, error = %s, quality_flag = coalesce(%s, quality_flag), updated_at = now()
               WHERE id = %s AND status <> 'deleted'""",
            (status, message, quality_flag, doc_id),
        )

    def requeue_stale(self) -> int:
        """Jobs whose worker stopped responding: back to the queue, or failed if out of attempts."""
        rows = self._sql(
            """UPDATE ingestion_jobs j
               SET state = CASE WHEN j.attempts < j.max_attempts THEN 'queued' ELSE 'failed' END,
                   locked_at = NULL, run_after = now(),
                   last_error = 'worker stopped responding (stale job)'
               WHERE j.id IN (
                 SELECT id FROM ingestion_jobs
                 WHERE state = 'running' AND locked_at < now() - make_interval(mins => %s)
                 FOR UPDATE SKIP LOCKED
               )
               RETURNING j.id, j.doc_id, j.kind, j.state""",
            (self.ctx.settings.job_stale_minutes,),
        )
        for row in rows:
            log.warning("stale job=%s %s doc=%s → %s", row["id"], row["kind"], row["doc_id"], row["state"])
            if row["state"] == "failed":
                self._mark_document_failed(
                    row["doc_id"], row["kind"], "ประมวลผลไม่สำเร็จ (worker หยุดตอบสนองซ้ำหลายครั้ง)", None
                )
        return len(rows)

    # ---------------------------------------------------------------- document lock

    @staticmethod
    def _lock_key(doc_id: uuid.UUID) -> str:
        return f"knowledge-doc:{doc_id}"

    def _lock_document(self, doc_id: uuid.UUID) -> bool:
        rows = self._sql("SELECT pg_try_advisory_lock(hashtext(%s)) AS ok", (self._lock_key(doc_id),))
        return rows[0]["ok"]

    def _unlock_document(self, doc_id: uuid.UUID) -> None:
        self._sql("SELECT pg_advisory_unlock(hashtext(%s))", (self._lock_key(doc_id),))

    # ---------------------------------------------------------------- loop

    def run_forever(self) -> None:
        stop = self.ctx.stop
        next_stale_check = 0.0
        while not stop.is_set():
            try:
                if time.monotonic() >= next_stale_check:
                    self.requeue_stale()
                    next_stale_check = time.monotonic() + STALE_CHECK_SECONDS
                if not self.run_once():
                    stop.wait(self.ctx.settings.worker_poll_seconds)
            except psycopg.OperationalError as err:
                log.warning("database unavailable (%s); retrying in 5s", type(err).__name__)
                self.close()
                stop.wait(5)
        self.close()


def main() -> None:
    setup_logging()
    settings = get_settings()

    ctx = WorkerContext(
        settings=settings,
        storage=get_storage(settings),
        qdrant=vector_store.get_client(settings),
        embedder=OpenAIEmbedder(settings),
        ocr=load_ocr(settings),
    )
    if settings.openai_api_key is None:
        log.warning("OPENAI_API_KEY is not set: index jobs will retry until it is")
    for sig in (signal.SIGINT, signal.SIGTERM):
        signal.signal(sig, lambda _signum, _frame: ctx.stop.set())

    db.ping(settings)
    thai_text.warmup()
    chunker.warmup()
    isolated.warmup()
    log.info(
        "worker ready (db=%s schema=%s, poll %ss)",
        redact_url(settings.postgres_url),
        settings.postgres_schema,
        settings.worker_poll_seconds,
    )
    Worker(ctx).run_forever()
    log.info("worker stopped")


if __name__ == "__main__":
    main()
