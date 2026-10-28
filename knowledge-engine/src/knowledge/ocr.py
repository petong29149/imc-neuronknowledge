"""OCR of scanned pages and images with an OpenAI vision model (KNOW-13).

The converter (in its child process) renders each page without a text layer to a JPEG
(converters/base.OcrPage); the worker sends those here, a few at a time, and the text comes
back as Markdown Sections in page order. Probe on a rendered Thai page (2026-10-28,
gpt-4.1-mini): 99.8% of the characters matched, Thai digits and the table kept, ~3,600 input
and ~200 output tokens per page.

Failures follow the embedder's rules: rate limits, server/network errors and a missing or
rejected key are TransientError (the job retries); a request OpenAI refuses is PermanentError.
Documents leave the server only for OpenAI, which already receives their text for embeddings.
"""

import base64
import logging
import threading
from collections.abc import Sequence
from concurrent.futures import ThreadPoolExecutor
from typing import Protocol

import openai
from tenacity import retry, retry_if_exception, stop_after_attempt, wait_exponential

from knowledge.config import Settings, get_settings
from knowledge.converters.base import OcrPage, Section
from knowledge.embedder import RETRY_ATTEMPTS, _retryable
from knowledge.errors import PermanentError, TransientError
from knowledge.thai_text import normalize

log = logging.getLogger("knowledge.ocr")

PROMPT = (
    "ถอดข้อความจากภาพหน้าเอกสารนี้ให้ครบและตรงตามต้นฉบับทุกตัวอักษร (ภาษาไทยและอังกฤษ ตัวเลขไทยคงไว้ตามเดิม) "
    "ตอบเป็น Markdown: ย่อหน้าคั่นด้วยบรรทัดว่าง ตารางเป็นตาราง Markdown หัวข้อใช้ # "
    "ห้ามแปล ห้ามสรุป ห้ามเพิ่มคำอธิบาย ถ้าหน้าว่างหรือไม่มีข้อความ ให้ตอบว่างเปล่า"
)


class Ocr(Protocol):
    model: str

    def read(self, image: bytes) -> str:
        """The page's text as Markdown; "" for a page with no text."""
        ...


class OpenAIOcr:
    def __init__(self, settings: Settings | None = None, client: openai.OpenAI | None = None):
        s = settings or get_settings()
        self.model = s.ocr_model
        key = s.openai_api_key.get_secret_value() if s.openai_api_key else ""
        self.client = client or (openai.OpenAI(api_key=key, max_retries=0, timeout=120) if key else None)
        self.input_tokens = 0
        self.output_tokens = 0
        self._lock = threading.Lock()

    def read(self, image: bytes) -> str:
        if self.client is None:
            raise TransientError("OPENAI_API_KEY ยังไม่ได้ตั้งค่า — อ่านหน้าสแกนด้วย OCR ไม่ได้")
        try:
            response = self._create(image)
        except openai.APIError as err:
            status = getattr(err, "status_code", None)
            if _retryable(err) or status in (401, 403):
                raise TransientError(f"OpenAI OCR: {type(err).__name__} {status or ''}".strip()) from err
            raise PermanentError(f"OpenAI ปฏิเสธคำขออ่านหน้าสแกน ({status})") from err
        if response.usage:
            with self._lock:
                self.input_tokens += response.usage.prompt_tokens
                self.output_tokens += response.usage.completion_tokens
        return (response.choices[0].message.content or "").strip()

    @retry(
        retry=retry_if_exception(_retryable),
        wait=wait_exponential(multiplier=1, min=1, max=20),
        stop=stop_after_attempt(RETRY_ATTEMPTS),
        reraise=True,
    )
    def _create(self, image: bytes):
        url = "data:image/jpeg;base64," + base64.b64encode(image).decode("ascii")
        return self.client.chat.completions.create(
            model=self.model,
            temperature=0,
            messages=[
                {"role": "system", "content": PROMPT},
                {"role": "user", "content": [{"type": "image_url", "image_url": {"url": url, "detail": "high"}}]},
            ],
        )


def load_ocr(settings: Settings) -> OpenAIOcr | None:
    return OpenAIOcr(settings) if settings.ocr_enabled else None


def _is_table_line(line: str) -> bool:
    return line.lstrip().startswith("|")


def markdown_sections(text: str, page: OcrPage) -> list[Section]:
    """Split OCR Markdown into paragraph and table Sections of one page (tables separate, like
    the PDF converter's, so the chunker keeps their header rows)."""
    common = {"page": page.page, "page_label": page.page_label, "heading_path": list(page.heading_path)}
    sections: list[Section] = []
    lines: list[str] = []
    in_table = False

    def flush() -> None:
        body = "\n".join(lines).strip()
        if body:
            sections.append(Section(body, is_table=in_table, **common))
        lines.clear()

    for raw in normalize(text).splitlines():
        line = raw.rstrip()  # drop Markdown hard-break spaces
        if _is_table_line(line) != in_table and (line or in_table):
            flush()
            in_table = _is_table_line(line)
        lines.append(line)
    flush()
    return sections


def read_pages(ocr: Ocr, pages: Sequence[OcrPage], concurrency: int = 4) -> tuple[list[Section], list[str]]:
    """OCR every page (a few in parallel); Sections in page order, plus warnings for pages
    where nothing was read."""
    with ThreadPoolExecutor(max_workers=max(1, concurrency)) as pool:
        texts = list(pool.map(lambda p: ocr.read(p.image), pages))
    sections: list[Section] = []
    warnings: list[str] = []
    for page, text in zip(pages, texts, strict=True):
        found = markdown_sections(text, page) if text else []
        if not found:
            warnings.append(f"หน้า {page.page_label or page.page}: OCR ไม่พบข้อความ")
        sections.extend(found)
    return sections, warnings
