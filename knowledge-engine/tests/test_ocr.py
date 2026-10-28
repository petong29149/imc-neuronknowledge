"""KNOW-13 OCR: scanned PDF pages and images are rendered by the converter, read by the OCR model
in the worker, and come back as Sections in page order."""

import base64
from types import SimpleNamespace

import httpx2
import openai
import pymupdf
import pytest
from pydantic import SecretStr
from tenacity import wait_none

from knowledge.config import Settings
from knowledge.converters import OcrPage, convert
from knowledge.converters.image import convert_image
from knowledge.converters.pdf import OCR_MAX_SIDE, convert_pdf
from knowledge.embedder import RETRY_ATTEMPTS
from knowledge.errors import NeedsOcrError, PermanentError, TransientError
from knowledge.ocr import PROMPT, OpenAIOcr, load_ocr, markdown_sections, read_pages
from tests.fixtures.files import make_jpg, make_png
from tests.fixtures.ocr import FakeOcr
from tests.fixtures.pdfs import blank_pdf, requires_thai_font, scanned_pages, thai_pdf

JPEG_START = bytes([0xFF, 0xD8, 0xFF])
NL = chr(10)


def is_jpeg(data: bytes) -> bool:
    return data.startswith(JPEG_START)


# --------------------------------------------------------------------------- converters


def test_scanned_pdf_pages_come_back_for_ocr():
    result = convert_pdf(blank_pdf(3), ocr_max_pages=10)
    assert result.sections == []
    assert [p.page for p in result.ocr_pages] == [1, 2, 3]
    assert all(is_jpeg(p.image) for p in result.ocr_pages)
    assert result.quality_flag == "ocr" and result.page_count == 3


def test_without_ocr_a_scanned_pdf_still_needs_ocr():
    with pytest.raises(NeedsOcrError):
        convert_pdf(blank_pdf(3))


def test_blank_pages_are_not_sent_to_ocr():
    doc = pymupdf.open(stream=blank_pdf(1), filetype="pdf")
    doc.new_page()  # nothing on it: no text, no image, no drawing
    result = convert_pdf(doc.tobytes(), ocr_max_pages=10)
    assert [p.page for p in result.ocr_pages] == [1]


def test_too_many_pages_to_ocr_fails_before_spending():
    with pytest.raises(PermanentError, match="OCR 5 หน้า เกินขีดจำกัด 4 หน้า"):
        convert_pdf(blank_pdf(5), ocr_max_pages=4)


def test_big_pages_are_rendered_at_a_capped_size():
    doc = pymupdf.open()
    page = doc.new_page(width=2384, height=3370)  # A0
    page.draw_rect(pymupdf.Rect(100, 100, 500, 500), color=(0, 0, 0), fill=(0.5, 0.5, 0.5))
    [ocr_page] = convert_pdf(doc.tobytes(), ocr_max_pages=10).ocr_pages
    pix = pymupdf.Pixmap(ocr_page.image)
    assert max(pix.width, pix.height) <= OCR_MAX_SIDE


@requires_thai_font
def test_mixed_pdf_reads_text_pages_and_renders_only_the_scanned_one():
    pages = [["พนักงานลาพักร้อนได้ปีละสิบวันทำการ"], ["หน้านี้จะถูกสแกน"], ["ลาป่วยต้องมีใบรับรองแพทย์"]]
    labels = [{"startpage": 0, "prefix": "", "style": "D", "firstpagenum": 5}]  # pages print as 5, 6, 7
    text_pdf = thai_pdf(pages, toc=[[1, "บทที่ 1 การลา", 1]], labels=labels)
    doc = pymupdf.open(stream=text_pdf, filetype="pdf")
    scan = pymupdf.open(stream=scanned_pages(text_pdf), filetype="pdf")
    doc.delete_page(1)
    doc.insert_pdf(scan, from_page=1, to_page=1, start_at=1)
    result = convert_pdf(doc.tobytes(), ocr_max_pages=10)

    assert [s.page for s in result.sections] == [1, 3]
    [ocr_page] = result.ocr_pages
    assert (ocr_page.page, ocr_page.page_label, ocr_page.heading_path) == (2, "6", ["บทที่ 1 การลา"])
    assert result.quality_flag == "ocr"


@pytest.mark.parametrize(("make", "file_type"), [(make_png, "png"), (make_jpg, "jpg")])
def test_an_image_is_one_page_for_ocr(make, file_type):
    result = convert(file_type, make(), ocr_max_pages=10)
    [page] = result.ocr_pages
    assert page.page == 1 and is_jpeg(page.image)
    assert (result.sections, result.page_count, result.quality_flag) == ([], 1, "ocr")


def test_image_without_ocr_needs_ocr_and_a_broken_image_fails():
    with pytest.raises(NeedsOcrError):
        convert_image(make_png(), "png")
    with pytest.raises(PermanentError, match="รูปภาพเสีย"):
        convert_image(make_png()[:8] + b"junk" * 50, "png", ocr_max_pages=10)  # PNG signature, no image


# --------------------------------------------------------------------------- OCR text → Sections


def test_markdown_becomes_paragraph_and_table_sections():
    text = NL.join(
        [
            "# ระเบียบการลา  ",
            "ข้อ ๑ ลาพักร้อนได้ปีละสิบวัน  ",
            "",
            "| รายการ | จำนวน |",
            "|---|---|",
            "| ลาป่วย | 30 วัน |",
            "",
            "หมายเหตุ ตามแบบฟอร์ม KNOW-07",
        ]
    )
    page = OcrPage(b"", page=4, page_label="iv", heading_path=["บทที่ 1"])
    paragraph, table, note = markdown_sections(text, page)
    assert paragraph.text == "# ระเบียบการลา" + NL + "ข้อ ๑ ลาพักร้อนได้ปีละสิบวัน" and not paragraph.is_table
    assert table.is_table and table.text.splitlines()[0] == "| รายการ | จำนวน |" and len(table.text.splitlines()) == 3
    assert note.text == "หมายเหตุ ตามแบบฟอร์ม KNOW-07"
    assert {(s.page, s.page_label, tuple(s.heading_path)) for s in (paragraph, table, note)} == {(4, "iv", ("บทที่ 1",))}


def test_read_pages_keeps_page_order_and_warns_about_empty_pages():
    pages = [OcrPage(f"img-{n}".encode(), page=n, page_label=None if n != 3 else "iii") for n in range(1, 6)]
    texts = {b"img-1": "หน้าหนึ่ง", b"img-2": "หน้าสอง", b"img-3": "", b"img-4": "หน้าสี่", b"img-5": "หน้าห้า"}
    sections, warnings = read_pages(FakeOcr(lambda image: texts[image]), pages, concurrency=4)
    assert [(s.page, s.text) for s in sections] == [(1, "หน้าหนึ่ง"), (2, "หน้าสอง"), (4, "หน้าสี่"), (5, "หน้าห้า")]
    assert warnings == ["หน้า iii: OCR ไม่พบข้อความ"]


# --------------------------------------------------------------------------- OpenAIOcr

REQUEST = httpx2.Request("POST", "https://api.openai.com/v1/chat/completions")


def status_error(cls, code: int):
    return cls("error", response=httpx2.Response(code, request=REQUEST), body=None)


class FakeChat:
    def __init__(self, script=(), text="ข้อความ"):
        self.script = list(script)
        self.text = text
        self.calls: list[dict] = []
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self._create))

    def _create(self, **kw):
        self.calls.append(kw)
        if self.script:
            outcome = self.script.pop(0)
            if outcome is not None:
                raise outcome
        message = SimpleNamespace(content=self.text)
        usage = SimpleNamespace(prompt_tokens=3500, completion_tokens=200)
        return SimpleNamespace(choices=[SimpleNamespace(message=message)], usage=usage)


@pytest.fixture(autouse=True)
def no_retry_wait(monkeypatch):
    monkeypatch.setattr(OpenAIOcr._create.retry, "wait", wait_none())


def ocr_settings(**kw) -> Settings:
    return Settings(_env_file=None, postgres_url="postgresql://x@y/z", openai_api_key=SecretStr("sk-test"), **kw)


def test_request_sends_the_page_as_a_high_detail_jpeg():
    client = FakeChat(text="  ข้อความในหน้า  ")
    ocr = OpenAIOcr(ocr_settings(ocr_model="gpt-4.1-mini"), client=client)
    assert ocr.read(b"jpeg-bytes") == "ข้อความในหน้า"
    [call] = client.calls
    assert call["model"] == "gpt-4.1-mini" and call["temperature"] == 0
    system, user = call["messages"]
    assert system == {"role": "system", "content": PROMPT}
    [part] = user["content"]
    url = "data:image/jpeg;base64," + base64.b64encode(b"jpeg-bytes").decode()
    assert part["image_url"] == {"url": url, "detail": "high"}
    ocr.read(b"again")
    assert (ocr.input_tokens, ocr.output_tokens) == (7000, 400)


def test_rate_limits_are_retried_then_succeed():
    busy = status_error(openai.RateLimitError, 429)
    client = FakeChat(script=[busy, openai.APIConnectionError(request=REQUEST), None])
    assert OpenAIOcr(ocr_settings(), client=client).read(b"x") == "ข้อความ"
    assert len(client.calls) == 3


def test_errors_map_to_retry_or_fail():
    always_busy = FakeChat(script=[status_error(openai.InternalServerError, 500)] * RETRY_ATTEMPTS)
    with pytest.raises(TransientError):
        OpenAIOcr(ocr_settings(), client=always_busy).read(b"x")
    with pytest.raises(TransientError):  # a bad key: fixing it lets the job recover
        OpenAIOcr(ocr_settings(), client=FakeChat(script=[status_error(openai.AuthenticationError, 401)])).read(b"x")
    with pytest.raises(PermanentError, match="ปฏิเสธ"):
        OpenAIOcr(ocr_settings(), client=FakeChat(script=[status_error(openai.BadRequestError, 400)])).read(b"x")
    no_key = Settings(_env_file=None, postgres_url="postgresql://x@y/z", openai_api_key=None)
    with pytest.raises(TransientError, match="OPENAI_API_KEY"):
        OpenAIOcr(no_key).read(b"x")


def test_load_ocr_follows_the_setting():
    assert isinstance(load_ocr(ocr_settings()), OpenAIOcr)
    assert load_ocr(ocr_settings(ocr_enabled=False)) is None
