"""Stand-ins for the converter child (converters/isolated.py). Module-level so the forkserver
child can import them by name."""

import os
import signal
import time


def segfault(conn, *_args):
    os.kill(os.getpid(), signal.SIGSEGV)  # what PyMuPDF did on a real PDF


def hang(conn, *_args):
    time.sleep(3600)


class Unpicklable(Exception):
    def __init__(self, message):
        super().__init__(message)
        self.callback = lambda: None  # lambdas cannot be pickled


def raise_unpicklable(conn, file_type, data, garbled_threshold, ocr_max_pages):
    from knowledge.converters import isolated

    original = isolated.convert
    isolated.convert = lambda *a, **k: (_ for _ in ()).throw(Unpicklable("ตัวอ่านไฟล์พัง"))
    try:
        isolated._child(conn, file_type, data, garbled_threshold, ocr_max_pages)
    finally:
        isolated.convert = original
