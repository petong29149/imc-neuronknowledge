"""PDF → Sections with PyMuPDF (plan T6, metadata design v4.2).

Per page: tables (read cell by cell — PyMuPDF's own table.to_markdown() drops Thai vowel and
tone marks) and text blocks in reading order, hard wraps joined, running headers/footers
removed, then a quality check. Document level: PDF info, TOC headings, page labels,
running header/footer text.

Pages without a text layer that show something (an image or drawings: a scan) are rendered to
JPEG for OCR when it is on (KNOW-13); blank pages are skipped.
"""

import re
from collections import Counter
from dataclasses import dataclass

import pymupdf

from knowledge.converters.base import (
    METADATA_KEYS,
    ConvertResult,
    GarbledTextError,
    OcrPage,
    QualityFlag,
    Section,
    clean_value,
    document_metadata,
    join_wrapped_lines,
    markdown_table,
    pdf_date,
)
from knowledge.errors import NeedsOcrError, PermanentError
from knowledge.thai_text import DEFAULT_GARBLED_THRESHOLD, normalize, quality_check

MARGIN_BAND = 0.10  # top/bottom share of the page height where headers and footers live
RUNNING_MIN_PAGES = 3  # shorter documents keep everything
RUNNING_SHARE = 0.5  # a header/footer repeats on more than this share of pages
MIN_PAGE_CHARS = 20  # fewer non-space characters → the page has no text layer
NEEDS_OCR_SHARE = 0.8
GARBLED_SHARE = 0.5
OCR_DPI = 150  # Thai vowel and tone marks stay legible; the vision model downsizes larger images anyway
OCR_MAX_SIDE = 2000  # pixels, for pages bigger than A4
OCR_JPEG_QUALITY = 85
NEEDS_OCR_MESSAGE = "เอกสาร PDF นี้เป็นภาพสแกน ไม่มีชั้นข้อความ ต้องใช้ OCR ซึ่งยังไม่ได้เปิดใช้"
TOO_MANY_OCR_PAGES = "เอกสารมีหน้าที่ต้องอ่านด้วย OCR {count} หน้า เกินขีดจำกัด {limit} หน้า กรุณาแบ่งไฟล์แล้วอัปโหลดใหม่"

_DIGITS = re.compile(r"[0-9๐-๙]+")
_SPACE = re.compile(r"\s+")


@dataclass
class _Block:
    y0: float
    y1: float
    text: str
    is_table: bool = False


@dataclass
class _Page:
    number: int  # from 1
    label: str | None
    height: float
    blocks: list[_Block]
    has_graphics: bool = False  # images or drawings: a page without text that is not blank


def _open(data: bytes) -> pymupdf.Document:
    try:
        doc = pymupdf.open(stream=data, filetype="pdf")
    except Exception:
        raise PermanentError("เปิดไฟล์ PDF ไม่ได้ ไฟล์อาจเสียหาย") from None
    if doc.needs_pass:
        doc.close()
        raise PermanentError("ไฟล์ PDF มีรหัสผ่าน กรุณาปลดรหัสก่อนอัปโหลด")
    return doc


def _cell_text(page: pymupdf.Page, bbox) -> str:
    if bbox is None:
        return ""
    return join_wrapped_lines(normalize(page.get_textbox(pymupdf.Rect(bbox)))).replace("\n", " ")


# --------------------------------------------------------------------------- lines → rows / columns
#
# PyMuPDF's find_tables() misses small tables (header + one row) and tables without rules,
# and a two-column page can come back as ONE block whose lines alternate left, right, left…
# Reading such lines top to bottom glues unrelated text together (Thai lines join without a
# space). So text is read line by line with positions: lines side by side form a row of cells,
# and aligned rows become either a Markdown table or columns read one after the other.

COLUMN_TOLERANCE = 12.0  # points between the left edges of cells in the same column
SHORT_CELL_CHARS = 20  # average cell length below which aligned 2-column rows are a table, not prose
RULE_MIN_ITEMS = 2  # drawn lines/boxes overlapping a region that make it a ruled table


@dataclass
class _Line:
    x0: float
    y0: float
    x1: float
    y1: float
    text: str


@dataclass
class _TextBlock:
    rect: pymupdf.Rect
    lines: list[_Line]
    rows: list[list[_Line]]  # lines grouped by vertical overlap, each row left to right


def _rows(lines: list[_Line]) -> list[list[_Line]]:
    rows: list[list[_Line]] = []
    for line in sorted(lines, key=lambda ln: (ln.y0, ln.x0)):
        if rows:
            last = rows[-1]
            top, bottom = max(ln.y0 for ln in last), min(ln.y1 for ln in last)
            overlap = min(bottom, line.y1) - max(top, line.y0)
            if overlap > 0.5 * min(line.y1 - line.y0, bottom - top):
                last.append(line)
                continue
        rows.append([line])
    return [sorted(row, key=lambda ln: ln.x0) for row in rows]


def _anchors(lines: list[_Line]) -> list[float]:
    """Left edges shared by lines in the same column."""
    anchors: list[float] = []
    for x in sorted(ln.x0 for ln in lines):
        if anchors and x - anchors[-1] <= COLUMN_TOLERANCE:
            continue
        anchors.append(x)
    return anchors


def _same_columns(a: list[float], b: list[float]) -> bool:
    """One set of column edges fits inside the other (a row may leave cells empty)."""
    small, big = (a, b) if len(a) <= len(b) else (b, a)
    return all(any(abs(x - y) <= COLUMN_TOLERANCE for y in big) for x in small)


def _column_of(line: _Line, anchors: list[float]) -> int:
    return min(range(len(anchors)), key=lambda i: abs(anchors[i] - line.x0))


def _ruled(rect: pymupdf.Rect, drawings: list[pymupdf.Rect], page_area: float) -> bool:
    near = rect + (-3, -3, 3, 3)
    hits = [d for d in drawings if d.intersects(near) and d.get_area() < 0.8 * page_area]
    return len(hits) >= RULE_MIN_ITEMS


def _is_table(rows: list[list[_Line]], anchors: list[float], ruled: bool) -> bool:
    if len(rows) < 2 or len(anchors) < 2 or any(len(row) < 2 for row in rows):
        return False
    if ruled or len(anchors) >= 3:
        return True
    cells = [ln.text for row in rows for ln in row]
    return sum(len(c) for c in cells) / len(cells) <= SHORT_CELL_CHARS


def _table_text(rows: list[list[_Line]], anchors: list[float]) -> str:
    grid = []
    for row in rows:
        cells = [""] * len(anchors)
        for line in row:
            col = _column_of(line, anchors)
            cells[col] = f"{cells[col]} {line.text}".strip()
        grid.append(cells)
    return normalize(markdown_table(grid))


def _prose_text(block: _TextBlock) -> str:
    """Several columns of lines → one column after another; one column → its rows in order."""
    anchors = _anchors(block.lines)
    if len(anchors) >= 2 and len(block.rows) >= 2 and all(len(r) >= 2 for r in block.rows):
        columns = [
            "\n".join(ln.text for ln in sorted((ln for ln in block.lines if _column_of(ln, anchors) == i),
                                                  key=lambda ln: ln.y0))
            for i in range(len(anchors))
        ]  # fmt: skip
        return "\n\n".join(join_wrapped_lines(normalize(col)) for col in columns)
    # Side-by-side pieces on one row keep a space between them; rows may be wrapped lines
    return join_wrapped_lines(normalize("\n".join(" ".join(ln.text for ln in row) for row in block.rows)))


def _text_blocks(page: pymupdf.Page, skip: list[pymupdf.Rect]) -> list[_TextBlock]:
    blocks = []
    for raw in page.get_text("dict", sort=True)["blocks"]:
        if raw.get("type") != 0:  # images
            continue
        rect = pymupdf.Rect(raw["bbox"])
        if any(pymupdf.Point((rect.x0 + rect.x1) / 2, (rect.y0 + rect.y1) / 2) in r for r in skip):
            continue  # already read as a table cell
        lines = []
        for ln in raw.get("lines", []):
            text = "".join(span["text"] for span in ln["spans"]).strip()
            if text:
                lines.append(_Line(*ln["bbox"], text))
        if lines:
            blocks.append(_TextBlock(rect, lines, _rows(lines)))
    return blocks


def _read_text(page: pymupdf.Page, skip: list[pymupdf.Rect]) -> list[_Block]:
    """Text blocks in reading order; runs of aligned multi-cell rows (one block or several
    consecutive ones) become tables when they look like one."""
    drawings = [pymupdf.Rect(d["rect"]) for d in page.get_drawings()]
    page_area = page.rect.get_area()
    out: list[_Block] = []
    run: list[_TextBlock] = []

    def flush() -> None:
        if not run:
            return
        rows = [row for b in run for row in b.rows]
        lines = [ln for b in run for ln in b.lines]
        anchors = _anchors(lines)
        rect = pymupdf.Rect(run[0].rect)
        for b in run[1:]:
            rect |= b.rect
        if _is_table(rows, anchors, _ruled(rect, drawings, page_area)):
            text = _table_text(rows, anchors)
            if text:
                out.append(_Block(rect.y0, rect.y1, text, is_table=True))
        else:
            for b in run:
                text = _prose_text(b)
                if text:
                    out.append(_Block(b.rect.y0, b.rect.y1, text))
        run.clear()

    for block in _text_blocks(page, skip):
        multi_cell = all(len(row) >= 2 for row in block.rows)
        if multi_cell:
            if run and not _same_columns(_anchors([ln for b in run for ln in b.lines]), _anchors(block.lines)):
                flush()  # a different layout starts here
            run.append(block)
            continue
        flush()
        text = _prose_text(block)
        if text:
            out.append(_Block(block.rect.y0, block.rect.y1, text))
    flush()
    return out


def _read_page(page: pymupdf.Page) -> _Page:
    try:
        # use_layout=False: PyMuPDF 2.0's default runs an ONNX layout model first, which
        # segfaulted (killing the worker) on a real 25-page report; ruled tables are found from
        # the drawn lines without it, and unruled ones by _read_text below
        tables = page.find_tables(use_layout=False).tables
    except Exception:
        tables = []  # table detection is best effort; the text is still read below
    table_rects = [pymupdf.Rect(t.bbox) for t in tables]

    blocks: list[_Block] = []
    for table, rect in zip(tables, table_rects, strict=True):
        rows = [[_cell_text(page, cell) for cell in row.cells] for row in table.rows]
        text = normalize(markdown_table(rows))
        if text:
            blocks.append(_Block(rect.y0, rect.y1, text, is_table=True))

    blocks += _read_text(page, table_rects)
    blocks.sort(key=lambda b: b.y0)
    has_graphics = bool(page.get_images()) or bool(page.get_drawings())
    return _Page(page.number + 1, page.get_label() or None, page.rect.height, blocks, has_graphics)


def render_for_ocr(page: pymupdf.Page) -> bytes:
    """The page as a JPEG at OCR_DPI, its long side capped at OCR_MAX_SIDE pixels."""
    zoom = min(OCR_DPI / 72, OCR_MAX_SIDE / max(page.rect.width, page.rect.height))
    pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), colorspace=pymupdf.csRGB, alpha=False)
    return pix.tobytes("jpeg", jpg_quality=OCR_JPEG_QUALITY)


def _headings_by_page(toc: list, page_count: int) -> dict[int, list[str]]:
    """heading_path of every page: the TOC path in force after the last entry starting on or
    before that page (page-level precision)."""
    entries = sorted((e for e in toc if e[2] >= 1), key=lambda e: e[2])
    result: dict[int, list[str]] = {}
    stack: list[tuple[int, str]] = []
    i = 0
    for page in range(1, page_count + 1):
        while i < len(entries) and entries[i][2] <= page:
            level, title = entries[i][0], clean_value(entries[i][1])
            while stack and stack[-1][0] >= level:
                stack.pop()
            if title:
                stack.append((level, title))
            i += 1
        result[page] = [title for _, title in stack]
    return result


def _key(text: str) -> str:
    return _SPACE.sub(" ", _DIGITS.sub("#", text.lower())).strip()


def _band(block: _Block, page: _Page) -> str | None:
    if block.is_table:
        return None
    if block.y1 <= page.height * MARGIN_BAND:
        return "top"
    if block.y0 >= page.height * (1 - MARGIN_BAND):
        return "bottom"
    return None


def _running(pages: list[_Page]) -> tuple[set[tuple[str, str]], dict[str, str | None]]:
    """(band, key) pairs repeated on more than half the pages, and the text to keep as metadata
    for each band (bare page numbers are dropped, not kept)."""
    if len(pages) < RUNNING_MIN_PAGES:
        return set(), {"top": None, "bottom": None}
    counts: Counter[tuple[str, str]] = Counter()
    first_text: dict[tuple[str, str], str] = {}
    for page in pages:
        seen = set()
        for block in page.blocks:
            band = _band(block, page)
            if band:
                item = (band, _key(block.text))
                seen.add(item)
                first_text.setdefault(item, block.text)
        counts.update(seen)
    running = {item for item, n in counts.items() if n > len(pages) * RUNNING_SHARE}
    kept: dict[str, str | None] = {}
    for band in ("top", "bottom"):
        texts = [first_text[i] for i in sorted(running) if i[0] == band and any(c.isalpha() for c in i[1])]
        kept[band] = clean_value(" · ".join(texts)) if texts else None
    return running, kept


def convert_pdf(
    data: bytes, *, garbled_threshold: float = DEFAULT_GARBLED_THRESHOLD, ocr_max_pages: int = 0
) -> ConvertResult:
    doc = _open(data)
    with doc:
        if doc.page_count == 0:
            raise PermanentError("ไฟล์ PDF ไม่มีหน้าใดเลย")
        info = doc.metadata or {}
        toc = doc.get_toc(simple=True)
        pages = [_read_page(page) for page in doc]
    headings = _headings_by_page(toc, len(pages))
    running, running_text = _running(pages)

    sections: list[Section] = []
    warnings: list[str] = []
    to_ocr: list[_Page] = []
    no_text = garbled = with_text = 0
    for page in pages:
        body = [b for b in page.blocks if (_band(b, page), _key(b.text)) not in running]
        page_text = "\n\n".join(b.text for b in body)
        if len(_SPACE.sub("", page_text)) < MIN_PAGE_CHARS:
            no_text += 1
            if ocr_max_pages and page.has_graphics:
                to_ocr.append(page)  # OCR reads the whole page, including any stray text on it
                continue
        if not page_text:
            continue
        with_text += 1
        if quality_check(page_text, garbled_threshold).flag == "garbled":
            garbled += 1
            warnings.append(f"หน้า {page.label or page.number}: ข้อความอ่านไม่ได้ (ฟอนต์อาจเสีย) — ข้ามหน้านี้")
            continue

        common = {"page": page.number, "page_label": page.label, "heading_path": list(headings[page.number])}
        paragraphs: list[str] = []
        for block in body:
            if block.is_table:
                if paragraphs:
                    sections.append(Section("\n\n".join(paragraphs), **common))
                    paragraphs = []
                sections.append(Section(block.text, is_table=True, **common))
            else:
                paragraphs.append(block.text)
        if paragraphs:
            sections.append(Section("\n\n".join(paragraphs), **common))

    if len(to_ocr) > ocr_max_pages > 0:
        raise PermanentError(TOO_MANY_OCR_PAGES.format(count=len(to_ocr), limit=ocr_max_pages))
    ocr_pages = _render_for_ocr(data, to_ocr, headings) if to_ocr else []
    if not ocr_pages and no_text > len(pages) * NEEDS_OCR_SHARE:
        raise NeedsOcrError(NEEDS_OCR_MESSAGE)
    if garbled and not sections and not ocr_pages:
        raise GarbledTextError("ข้อความใน PDF นี้อ่านไม่ได้ทั้งเล่ม (ฟอนต์ภาษาไทยเสีย) ต้องใช้ OCR ซึ่งยังไม่รองรับ")

    quality: QualityFlag = "ok"
    if garbled:
        quality = "garbled" if garbled > with_text * GARBLED_SHARE else "partial_garbled"

    metadata = document_metadata(
        {
            **{key: clean_value(info.get(key)) for key in METADATA_KEYS},
            "created": pdf_date(info.get("creationDate")),
            "modified": pdf_date(info.get("modDate")),
            "running_header": running_text["top"],
            "running_footer": running_text["bottom"],
            "has_toc": bool(toc),
            "page_labels": any(p.label for p in pages),
        }
    )
    if ocr_pages and quality == "ok":
        quality = "ocr"
    return ConvertResult(
        sections=sections,
        page_count=len(pages),
        warnings=warnings,
        metadata=metadata,
        quality_flag=quality,
        ocr_pages=ocr_pages,
    )


def _render_for_ocr(data: bytes, pages: list[_Page], headings: dict[int, list[str]]) -> list[OcrPage]:
    with _open(data) as doc:
        return [OcrPage(render_for_ocr(doc[p.number - 1]), p.number, p.label, list(headings[p.number])) for p in pages]
