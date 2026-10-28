"""Converters run in a child process: a crash or hang fails one document, not the worker."""

import functools
import time

import pytest

from knowledge.converters import convert
from knowledge.converters.isolated import CRASH_MESSAGE, convert_isolated
from knowledge.errors import JobInterrupted, NeedsOcrError, PermanentError
from tests.fixtures import converter_children
from tests.fixtures.pdfs import blank_pdf

TEXT = "พนักงานลาพักร้อนได้ปีละสิบวัน\n\nลาป่วยเกินสามวันต้องมีใบรับรองแพทย์".encode()
run = functools.partial(convert_isolated, garbled_threshold=0.6, timeout=60)


def test_result_matches_convert_in_process():
    assert run("txt", TEXT) == convert("txt", TEXT, garbled_threshold=0.6)


def test_converter_errors_keep_their_type_and_message():
    with pytest.raises(NeedsOcrError) as err:
        run("pdf", blank_pdf(2))
    assert err.value.doc_status == "needs_ocr"
    with pytest.raises(PermanentError, match="ไม่รองรับไฟล์ชนิด xls"):
        run("xls", b"x")


def test_a_crash_fails_the_document_and_the_caller_survives():
    with pytest.raises(PermanentError) as err:
        run("pdf", b"%PDF", target=converter_children.segfault)
    assert str(err.value) == CRASH_MESSAGE
    assert run("txt", TEXT).sections  # the next document still converts


def test_a_hang_times_out():
    started = time.monotonic()
    with pytest.raises(PermanentError, match="ไม่เสร็จภายใน 1 นาที"):
        run("pdf", b"%PDF", timeout=1, target=converter_children.hang)
    assert time.monotonic() - started < 10


def test_shutdown_stops_the_child():
    started = time.monotonic()
    with pytest.raises(JobInterrupted):
        run("pdf", b"%PDF", should_stop=lambda: True, target=converter_children.hang)
    assert time.monotonic() - started < 10


def test_an_exception_that_cannot_be_pickled_still_comes_back():
    with pytest.raises(RuntimeError, match="Unpicklable: ตัวอ่านไฟล์พัง"):
        run("txt", TEXT, target=converter_children.raise_unpicklable)
