"""JPG / PNG → one page for OCR (KNOW-13). The image has no text layer, so without OCR it cannot
be indexed at all."""

import pymupdf

from knowledge.converters.base import ConvertResult, OcrPage
from knowledge.converters.pdf import render_for_ocr
from knowledge.errors import NeedsOcrError, PermanentError

NEEDS_OCR_MESSAGE = "ไฟล์รูปภาพต้องอ่านด้วย OCR ซึ่งยังไม่ได้เปิดใช้"
BROKEN_MESSAGE = "ไฟล์รูปภาพเสียหรือเปิดไม่ได้"


def convert_image(data: bytes, file_type: str, *, ocr_max_pages: int = 0) -> ConvertResult:
    if not ocr_max_pages:
        raise NeedsOcrError(NEEDS_OCR_MESSAGE)
    try:
        # PyMuPDF opens an image as a one-page document sized to the image; a broken file fails
        # here or while rendering (a cut-off one may still render, and OCR then finds little)
        with pymupdf.open(stream=data, filetype="jpeg" if file_type == "jpg" else file_type) as doc:
            image = render_for_ocr(doc[0])
    except Exception:
        raise PermanentError(BROKEN_MESSAGE) from None
    return ConvertResult(sections=[], page_count=1, quality_flag="ocr", ocr_pages=[OcrPage(image, page=1)])
