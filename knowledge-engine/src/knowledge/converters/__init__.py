"""File → Sections + document metadata (plan T6). Every converter returns text that is already
normalized (thai_text.normalize) and raises errors.PermanentError subclasses for files that
cannot be read, so the worker fails them without retrying."""

from knowledge.converters.base import ConvertResult, GarbledTextError, OcrPage, Section
from knowledge.errors import PermanentError
from knowledge.thai_text import DEFAULT_GARBLED_THRESHOLD

__all__ = ["ConvertResult", "GarbledTextError", "OcrPage", "Section", "convert"]


def convert(
    file_type: str, data: bytes, *, garbled_threshold: float = DEFAULT_GARBLED_THRESHOLD, ocr_max_pages: int = 0
) -> ConvertResult:
    """ocr_max_pages > 0: pages without text (scans, images) come back in ConvertResult.ocr_pages,
    at most that many; 0: OCR is off and such files raise NeedsOcrError as before."""
    if file_type == "pdf":
        from knowledge.converters.pdf import convert_pdf

        return convert_pdf(data, garbled_threshold=garbled_threshold, ocr_max_pages=ocr_max_pages)
    if file_type in ("jpg", "png"):
        from knowledge.converters.image import convert_image

        return convert_image(data, file_type, ocr_max_pages=ocr_max_pages)
    if file_type == "docx":
        from knowledge.converters.docx import convert_docx

        return convert_docx(data, garbled_threshold=garbled_threshold)
    if file_type == "pptx":
        from knowledge.converters.pptx import convert_pptx

        return convert_pptx(data, garbled_threshold=garbled_threshold)
    if file_type in ("txt", "md"):
        from knowledge.converters.text import convert_text

        return convert_text(data, file_type, garbled_threshold=garbled_threshold)
    raise PermanentError(f"ไม่รองรับไฟล์ชนิด {file_type}")
