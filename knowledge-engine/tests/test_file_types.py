import pytest

from knowledge.file_types import UnsupportedFileError, decode_text, detect_file_type
from tests.fixtures.files import EXE, THAI, make_docx, make_jpg, make_pdf, make_png, make_pptx, make_zip


@pytest.mark.parametrize(
    ("filename", "data", "expected"),
    [
        ("a.pdf", make_pdf(), "pdf"),
        ("A.PDF", make_pdf(), "pdf"),
        ("a.docx", make_docx(), "docx"),
        ("a.pptx", make_pptx(), "pptx"),
        ("a.txt", THAI.encode("utf-8"), "txt"),
        ("a.md", f"# {THAI}\n\nเนื้อหา".encode(), "md"),
        ("scan.png", make_png(), "png"),
        ("scan.jpg", make_jpg(), "jpg"),
        ("scan.JPEG", make_jpg(), "jpg"),
    ],
)
def test_detects_supported_types(filename, data, expected):
    assert detect_file_type(filename, data).name == expected


@pytest.mark.parametrize("filename", ["a.exe", "a.xlsx", "a.doc", "a.ppt", "noextension", "a."])
def test_rejects_unsupported_extensions(filename):
    with pytest.raises(UnsupportedFileError, match="ยังไม่รองรับไฟล์ชนิดนี้"):
        detect_file_type(filename, b"anything")


@pytest.mark.parametrize(
    ("filename", "data"),
    [
        ("fake.pdf", EXE),
        ("fake.docx", EXE),
        ("fake.docx", make_pptx()),  # a real PPTX renamed to .docx
        ("fake.pptx", make_docx()),
        ("fake.docx", make_zip(["hello.txt"])),
        ("fake.docx", b"PK\x03\x04 not really a zip"),
        ("fake.txt", EXE),
        ("fake.png", make_jpg()),
        ("fake.jpg", make_png()),
        ("fake.png", make_pdf()),
    ],
)
def test_rejects_content_that_does_not_match_extension(filename, data):
    with pytest.raises(UnsupportedFileError):
        detect_file_type(filename, data)


def test_decodes_thai_text_encodings():
    assert decode_text(THAI.encode("utf-8")) == THAI
    assert decode_text("\ufeff".encode() + THAI.encode("utf-8")) == THAI
    assert decode_text(THAI.encode("cp874")) == THAI
