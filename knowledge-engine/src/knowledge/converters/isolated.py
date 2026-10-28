"""Run a converter in a child process, so a crash or hang in native code fails one document
instead of the whole worker.

PyMuPDF is C: on 2026-10-28 a real 25-page PDF segfaulted inside find_tables, which killed the
worker process; its job then sat 'running' until the stale-job timeout and would have crashed
it again on every retry. Here the parent only waits: a child that dies, or runs longer than
CONVERT_TIMEOUT_SECONDS, becomes a PermanentError for that document (retrying the same bytes
cannot help) and the worker moves on to the next job.

Children fork from a forkserver that has already imported the converters and loaded the Thai
dictionary (_preload), so each document starts in well under a second.
"""

import logging
import multiprocessing
import pickle
import time
from collections.abc import Callable
from multiprocessing.connection import Connection

from knowledge.converters import convert
from knowledge.converters.base import ConvertResult
from knowledge.errors import JobInterrupted, PermanentError

log = logging.getLogger("knowledge.converters")

CRASH_MESSAGE = (
    "อ่านไฟล์ไม่ได้: ตัวอ่านไฟล์หยุดทำงานกะทันหัน (ไฟล์อาจเสียหรือมีโครงสร้างที่ไม่รองรับ) ลองเปิดแล้วบันทึกหรือส่งออกเป็นไฟล์ใหม่ แล้วอัปโหลดอีกครั้ง"
)
TIMEOUT_MESSAGE = "อ่านไฟล์ไม่เสร็จภายใน {minutes} นาที ลองแบ่งไฟล์เป็นส่วนเล็กลงแล้วอัปโหลดใหม่"
POLL_SECONDS = 0.5

_context = None


def _mp_context():
    global _context
    if _context is None:
        _context = multiprocessing.get_context("forkserver")
        _context.set_forkserver_preload(["knowledge.converters._preload"])
    return _context


def warmup() -> None:
    """Start the forkserver (imports + Thai dictionary, ~20 s in the worker image) at worker
    startup, so the first document of the day does not wait for it."""
    convert_isolated("txt", "ทดสอบ".encode(), garbled_threshold=0.0, timeout=120)


def _child(conn: Connection, file_type: str, data: bytes, garbled_threshold: float, ocr_max_pages: int) -> None:
    try:
        outcome = ("ok", convert(file_type, data, garbled_threshold=garbled_threshold, ocr_max_pages=ocr_max_pages))
    except Exception as err:
        outcome = ("error", err)
    try:
        conn.send(outcome)
    except (pickle.PicklingError, TypeError, AttributeError):
        # an exception the parent could not rebuild: keep its type name and message
        conn.send(("error", RuntimeError(f"{type(outcome[1]).__name__}: {outcome[1]}")))
    finally:
        conn.close()


def convert_isolated(
    file_type: str,
    data: bytes,
    *,
    garbled_threshold: float,
    ocr_max_pages: int = 0,
    timeout: float,
    should_stop: Callable[[], bool] = lambda: False,
    target: Callable[..., None] = _child,
) -> ConvertResult:
    """convert() in a child process. Raises what convert() raises; PermanentError when the
    child dies or times out; JobInterrupted when `should_stop()` turns true (worker shutdown).
    `target` is replaced only in tests."""
    ctx = _mp_context()
    receive, send = ctx.Pipe(duplex=False)
    child = ctx.Process(target=target, args=(send, file_type, data, garbled_threshold, ocr_max_pages), daemon=True)
    child.start()
    send.close()  # the child holds the only write end now, so its death shows up as EOF
    deadline = time.monotonic() + timeout
    try:
        # poll() also returns when the child dies: the pipe then reads as EOF
        while not receive.poll(POLL_SECONDS):
            if should_stop():
                raise JobInterrupted()
            if time.monotonic() > deadline:
                log.warning("converter timed out after %.0fs (%s, %d bytes)", timeout, file_type, len(data))
                raise PermanentError(TIMEOUT_MESSAGE.format(minutes=max(1, round(timeout / 60))))
        try:
            status, value = receive.recv()  # before join: a large result would block the child's send
        except EOFError:
            child.join(5)
            log.error("converter crashed (exit code %s, %s, %d bytes)", child.exitcode, file_type, len(data))
            raise PermanentError(CRASH_MESSAGE) from None
    finally:
        receive.close()
        if child.is_alive():
            child.kill()
        child.join(5)
    if status == "error":
        raise value
    return value
