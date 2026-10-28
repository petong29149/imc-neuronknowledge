"""DOCX → Sections with python-docx (plan T6). A new Section starts at every heading, so each
one carries its heading_path; tables are their own Sections. Page headers/footers are skipped."""

import io
import re

import docx
from docx.table import Table

from knowledge.converters.base import (
    ConvertResult,
    Section,
    core_properties_metadata,
    markdown_table,
    text_quality,
)
from knowledge.errors import PermanentError
from knowledge.thai_text import DEFAULT_GARBLED_THRESHOLD, normalize

_HEADING_STYLE = re.compile(r"^heading\s*([1-9])$", re.IGNORECASE)


def _heading_level(paragraph) -> int | None:
    name = (paragraph.style.name if paragraph.style is not None else "") or ""
    if name.lower() == "title":
        return 1
    match = _HEADING_STYLE.match(name.strip())
    return int(match.group(1)) if match else None


def _is_list_item(paragraph) -> bool:
    ppr = paragraph._p.pPr
    if ppr is not None and ppr.numPr is not None:
        return True
    name = (paragraph.style.name if paragraph.style is not None else "") or ""
    return name.lower().startswith("list")


def _table_rows(table: Table) -> list[list[str]]:
    rows = []
    for row in table.rows:
        cells, last = [], None
        for cell in row.cells:
            if cell._tc is last:  # a merged cell repeats in row.cells
                continue
            last = cell._tc
            cells.append(cell.text)
        rows.append(cells)
    return rows


def convert_docx(data: bytes, *, garbled_threshold: float = DEFAULT_GARBLED_THRESHOLD) -> ConvertResult:
    try:
        document = docx.Document(io.BytesIO(data))
    except Exception:
        raise PermanentError("เปิดไฟล์ DOCX ไม่ได้ ไฟล์อาจเสียหาย") from None

    sections: list[Section] = []
    heading_path: list[str] = []
    parts: list[str] = []  # Markdown pieces of the current section
    last_was_list = False

    def flush() -> None:
        text = normalize("\n\n".join(parts))
        if text:
            sections.append(Section(text, heading_path=list(heading_path)))
        parts.clear()

    for block in document.iter_inner_content():
        if isinstance(block, Table):
            flush()
            text = normalize(markdown_table(_table_rows(block)))
            if text:
                sections.append(Section(text, heading_path=list(heading_path), is_table=True))
            last_was_list = False
            continue

        text = block.text.strip()
        if not text:
            continue
        level = _heading_level(block)
        if level is not None:
            flush()
            title = " ".join(text.split())
            heading_path[:] = heading_path[: level - 1] + [title]
            parts.append(f"{'#' * level} {title}")
            last_was_list = False
        elif _is_list_item(block):
            item = f"- {text}"
            if last_was_list:
                parts[-1] += "\n" + item  # keep a list together
            else:
                parts.append(item)
            last_was_list = True
        else:
            parts.append(text)
            last_was_list = False
    flush()

    return ConvertResult(
        sections=sections,
        page_count=None,
        metadata=core_properties_metadata(document.core_properties),
        quality_flag=text_quality(sections, garbled_threshold),
    )
