"""Thai PDFs generated in code. Needs the Garuda font from the dev image (fonts-tlwg-garuda-ttf);
tests that use it are skipped elsewhere, with the reason."""

from pathlib import Path

import pymupdf
import pytest

FONT = Path("/usr/share/fonts/truetype/tlwg/Garuda.ttf")
requires_thai_font = pytest.mark.skipif(
    not FONT.exists(), reason="Thai font fonts-tlwg-garuda-ttf is installed only in the dev image"
)

LINE_HEIGHT = 16
PARAGRAPH_GAP = 28


def _write(page: pymupdf.Page, y: float, text: str, size: float = 12) -> None:
    page.insert_text((72, y), text, fontname="garuda", fontsize=size)


def draw_table(page: pymupdf.Page, top: float, rows: list[list[str]], width: float = 150, height: float = 22) -> float:
    """A ruled table at `top`; returns the y below it."""
    for r, row in enumerate(rows):
        for c, cell in enumerate(row):
            rect = pymupdf.Rect(72 + c * width, top + r * height, 72 + (c + 1) * width, top + (r + 1) * height)
            page.draw_rect(rect, color=(0, 0, 0), width=0.7)
            page.insert_text((rect.x0 + 4, rect.y1 - 6), cell, fontname="garuda", fontsize=10)
    return top + len(rows) * height


def thai_pdf(
    pages: list[list[str | list[list[str]]]],
    *,
    header: str | None = None,
    footer: str | None = None,
    metadata: dict | None = None,
    toc: list | None = None,
    labels: list[dict] | None = None,
) -> bytes:
    """Each page is a list of items: a string is one line, "" starts a new paragraph, and a list
    of rows draws a table. `footer` may contain {n} for the page number."""
    doc = pymupdf.open()
    for n, items in enumerate(pages, start=1):
        page = doc.new_page()  # 595 x 842
        page.insert_font(fontname="garuda", fontfile=str(FONT))
        if header:
            _write(page, 40, header, size=9)
        y = 120.0
        for item in items:
            if isinstance(item, list):
                y = draw_table(page, y, item) + PARAGRAPH_GAP
            elif item == "":
                y += PARAGRAPH_GAP - LINE_HEIGHT
            else:
                _write(page, y, item)
                y += LINE_HEIGHT
        if footer:
            page.insert_text((280, 815), footer.format(n=n), fontname="garuda", fontsize=9)
    if metadata:
        doc.set_metadata(metadata)
    if toc:
        doc.set_toc(toc)
    if labels:
        doc.set_page_labels(labels)
    return doc.tobytes()


def write_at(page: pymupdf.Page, x: float, y: float, text: str, size: float = 11) -> None:
    page.insert_text((x, y), text, fontname="garuda", fontsize=size)


def drawn_pdf(*draws) -> bytes:
    """One page per draw(page) function, with the Thai font loaded; for layouts thai_pdf
    cannot express (unruled tables, two columns)."""
    doc = pymupdf.open()
    for draw in draws:
        page = doc.new_page()
        page.insert_font(fontname="garuda", fontfile=str(FONT))
        draw(page)
    return doc.tobytes()


def blank_pdf(pages: int) -> bytes:
    doc = pymupdf.open()
    for _ in range(pages):
        page = doc.new_page()
        page.draw_rect(pymupdf.Rect(72, 72, 300, 300), color=(0, 0, 0), fill=(0.8, 0.8, 0.8))  # "a scan"
    return doc.tobytes()


def encrypted(data: bytes) -> bytes:
    return pymupdf.open(stream=data, filetype="pdf").tobytes(
        encryption=pymupdf.PDF_ENCRYPT_AES_256, user_pw="secret", owner_pw="owner"
    )


def scanned_pages(pdf: bytes, dpi: int = 100) -> bytes:
    """Every page of `pdf` replaced by a picture of it: a scan with no text layer."""
    src = pymupdf.open(stream=pdf, filetype="pdf")
    out = pymupdf.open()
    for page in src:
        image = page.get_pixmap(dpi=dpi).tobytes("png")
        new = out.new_page(width=page.rect.width, height=page.rect.height)
        new.insert_image(new.rect, stream=image)
    return out.tobytes()
