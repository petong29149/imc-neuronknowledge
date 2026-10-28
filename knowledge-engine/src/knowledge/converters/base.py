"""What every converter returns (plan T6), plus helpers they share.

Metadata is kept at three levels and never mixed:
- document → ConvertResult.metadata / quality_flag → Postgres documents
- page/part → Section.page / page_label / slide / heading_path / is_table → chunker (T7)
- chunk → Qdrant payload (T7/T8)
"""

import re
import unicodedata
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any, Literal

from knowledge.errors import PermanentError
from knowledge.thai_text import quality_check

QualityFlag = Literal["ok", "partial_garbled", "garbled", "ocr"]

MAX_METADATA_LENGTH = 500
METADATA_KEYS = ("title", "author", "subject", "keywords")


@dataclass
class Section:
    text: str  # Markdown, already normalized
    page: int | None = None  # PDF: page number in the file, from 1
    page_label: str | None = None  # PDF: number printed on the page ("iv", "5"); None when the file has none
    slide: int | None = None  # PPTX
    heading_path: list[str] = field(default_factory=list)  # DOCX/MD from headings, PDF from the TOC
    is_table: bool = False


@dataclass
class OcrPage:
    """A page with no text layer (a scan, or an uploaded image), rendered for OCR. The converter
    runs in a child process with no network, so the worker reads these afterwards (ocr.py)."""

    image: bytes  # JPEG
    page: int  # from 1
    page_label: str | None = None
    heading_path: list[str] = field(default_factory=list)


@dataclass
class ConvertResult:
    sections: list[Section]
    page_count: int | None
    warnings: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)  # → documents.metadata (migration 002)
    quality_flag: QualityFlag = "ok"  # → documents.quality_flag
    ocr_pages: list[OcrPage] = field(default_factory=list)  # only when OCR was asked for


class GarbledTextError(PermanentError):
    """No readable text at all — the font mapping is broken; only OCR can recover it (KNOW-13)."""

    doc_status = "needs_ocr"
    quality_flag = "garbled"


# --------------------------------------------------------------------------- metadata values


def clean_value(value: Any) -> str | None:
    """A metadata string safe to store: NFC, no control characters, collapsed spaces, ≤ 500 chars."""
    if not isinstance(value, str):
        return None
    text = unicodedata.normalize("NFC", value)
    text = "".join(ch if unicodedata.category(ch)[0] != "C" else " " for ch in text)
    text = " ".join(text.split())
    return text[:MAX_METADATA_LENGTH] or None


def iso(value: date | datetime | None) -> str | None:
    return value.isoformat() if value else None


_PDF_DATE = re.compile(r"^D:(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?(Z|[+-]\d{2}'?\d{2}'?)?")


def pdf_date(value: Any) -> str | None:
    """PDF date ("D:20240115103000+07'00'") → ISO 8601; None when it does not parse."""
    match = _PDF_DATE.match(value.strip()) if isinstance(value, str) else None
    if not match:
        return None
    year, month, day, hour, minute, second, tz = match.groups()
    try:
        dt = datetime(int(year), int(month or 1), int(day or 1), int(hour or 0), int(minute or 0), int(second or 0))
    except ValueError:
        return None
    text = dt.isoformat()
    if tz == "Z":
        return text + "+00:00"
    if tz:
        digits = tz.replace("'", "")
        return f"{text}{digits[:3]}:{digits[3:5]}"
    return text


def document_metadata(values: dict[str, Any]) -> dict[str, Any]:
    """Keep the known keys that have a value."""
    return {k: v for k, v in values.items() if v not in (None, "", [], {})}


def core_properties_metadata(props: Any) -> dict[str, Any]:
    """DOCX/PPTX core properties (python-docx and python-pptx share the shape)."""
    return document_metadata(
        {
            **{key: clean_value(getattr(props, key, None)) for key in METADATA_KEYS},
            "created": iso(getattr(props, "created", None)),
            "modified": iso(getattr(props, "modified", None)),
        }
    )


def text_quality(sections: list[Section], threshold: float) -> QualityFlag:
    """Whole-document check for formats that store real characters (DOCX/PPTX/TXT/MD);
    PDFs are checked page by page instead."""
    text = "\n\n".join(s.text for s in sections if not s.is_table)
    return "garbled" if text and quality_check(text, threshold).flag == "garbled" else "ok"


# --------------------------------------------------------------------------- text helpers

_LIST_ITEM = re.compile(r"^(?:[-*•▪●◦‣–]\s|\d{1,3}[.)]\s|[๐-๙]{1,3}[.)]\s|\([ก-ฮa-zA-Z0-9๐-๙]{1,3}\)\s|[ก-ฮ][.)]\s)")
# Thai letters, vowels and marks — not Thai digits: "ข้อ ๑" + "ดังนี้" keeps its space
_THAI_AT_END = re.compile(r"[ก-ฺเ-๎]$")
_THAI_AT_START = re.compile(r"^[ก-ฺเ-๎]")


def _keeps_own_line(line: str) -> bool:
    return bool(_LIST_ITEM.match(line)) or line.startswith(("|", "#", ">", "```"))


def join_wrapped_lines(text: str) -> str:
    """Undo hard line wraps inside paragraphs: Thai + Thai joins without a space (Thai has no
    spaces between words), "infor-" + "mation" drops the hyphen, anything else joins with one
    space. List items, table rows, headings and blank lines keep their own line."""
    out: list[str] = []
    for raw in text.split("\n"):
        line = raw.strip()
        if not line:
            out.append("")
            continue
        prev = out[-1] if out else ""
        if prev and not _keeps_own_line(line) and not prev.startswith(("|", "#", "```")):
            if prev.endswith("-") and line[:1].islower():
                out[-1] = prev[:-1] + line
            elif _THAI_AT_END.search(prev) and _THAI_AT_START.match(line):
                out[-1] = prev + line
            else:
                out[-1] = f"{prev} {line}"
        else:
            out.append(line)
    return "\n".join(out)


def markdown_table(rows: list[list[str]]) -> str:
    """Rows of cell text → a Markdown table; the first row is the header."""
    width = max((len(r) for r in rows), default=0)
    if width == 0:
        return ""

    def cell(value: str | None) -> str:
        return " ".join((value or "").split()).replace("|", "\\|")

    lines = []
    for i, row in enumerate(rows):
        padded = [cell(v) for v in row] + [""] * (width - len(row))
        lines.append("| " + " | ".join(padded) + " |")
        if i == 0:
            lines.append("|" + "|".join(["---"] * width) + "|")
    return "\n".join(lines)
