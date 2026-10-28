"""File types: PDF, DOCX, PPTX, TXT, MD (plan §1) and JPG / PNG for OCR (KNOW-13) — checked by extension AND content,
so a renamed .exe is refused at upload. `decode_text` is shared with the TXT/MD converter (T6)."""

import io
import zipfile
from dataclasses import dataclass

from charset_normalizer import from_bytes

UNSUPPORTED_MESSAGE = "ยังไม่รองรับไฟล์ชนิดนี้ รองรับเฉพาะ PDF, DOCX, PPTX, TXT, MD, JPG, PNG"


@dataclass(frozen=True)
class FileType:
    name: str  # documents.file_type
    mime: str
    label: str


FILE_TYPES = {
    "pdf": FileType("pdf", "application/pdf", "PDF"),
    "docx": FileType("docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "DOCX"),
    "pptx": FileType("pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "PPTX"),
    "txt": FileType("txt", "text/plain; charset=utf-8", "TXT"),
    "md": FileType("md", "text/markdown; charset=utf-8", "Markdown"),
    "jpg": FileType("jpg", "image/jpeg", "JPG"),
    "png": FileType("png", "image/png", "PNG"),
}
EXTENSION_ALIASES = {"jpeg": "jpg"}
_IMAGE_SIGNATURES = {"jpg": b"\xff\xd8\xff", "png": b"\x89PNG\r\n\x1a\n"}

# The part every real DOCX / PPTX package has
_OOXML_MAIN_PART = {"docx": "word/document.xml", "pptx": "ppt/presentation.xml"}


class UnsupportedFileError(ValueError):
    """The file is not one of the supported types, or its content does not match its extension.
    `str(error)` is a Thai message safe to show to the user."""


def extension_of(filename: str) -> str:
    _, dot, ext = filename.rpartition(".")
    return ext.lower() if dot else ""


def decode_text(data: bytes) -> str:
    """Decode a text file: UTF-8 (with or without BOM) → cp874 (TIS-620) → charset detection."""
    if b"\x00" in data:
        raise UnsupportedFileError("ไฟล์ข้อความนี้มีข้อมูลแบบ binary อ่านเป็นข้อความไม่ได้")
    for encoding in ("utf-8-sig", "cp874"):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            pass
    best = from_bytes(data).best()
    if best is None:
        raise UnsupportedFileError("อ่านการเข้ารหัสตัวอักษรของไฟล์ข้อความนี้ไม่ได้ กรุณาบันทึกเป็น UTF-8")
    return str(best)


def detect_file_type(filename: str, data: bytes) -> FileType:
    """The file's type, or UnsupportedFileError. Never trusts the extension alone."""
    ext = extension_of(filename)
    ext = EXTENSION_ALIASES.get(ext, ext)
    file_type = FILE_TYPES.get(ext)
    if file_type is None:
        raise UnsupportedFileError(UNSUPPORTED_MESSAGE)

    mismatch = UnsupportedFileError(f"เนื้อไฟล์ไม่ใช่ {file_type.label} จริง (ไม่ตรงกับนามสกุล .{ext}) — {UNSUPPORTED_MESSAGE}")
    if ext == "pdf":
        # The spec allows a few junk bytes before the header
        if b"%PDF-" not in data[:1024]:
            raise mismatch
    elif ext in _IMAGE_SIGNATURES:
        if not data.startswith(_IMAGE_SIGNATURES[ext]):
            raise mismatch
    elif ext in _OOXML_MAIN_PART:
        if not data.startswith(b"PK\x03\x04"):
            raise mismatch
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as zf:
                names = set(zf.namelist())
        except zipfile.BadZipFile:
            raise mismatch from None
        if _OOXML_MAIN_PART[ext] not in names:
            raise mismatch
    else:
        decode_text(data)
    return file_type
