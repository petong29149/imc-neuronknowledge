"""Sections → Chunks (plan T7, citations per v4.2).

Sizes are counted with tiktoken `CHUNK_ENCODING` (o200k_base: about 2.3x more Thai per token
than cl100k_base). Rules:

1. Within a section: paragraphs; a paragraph over MAX → sentences (split_sentences); a
   sentence still over MAX → cut on token boundaries (never inside a character).
2. Units are added while the chunk is under TARGET and the result stays ≤ MAX.
3. A new chunk starts with the previous chunk's last CHUNK_OVERLAP_SENTENCES sentences
   (capped at a quarter of MAX), within the same run of text only.
4. Tables are never cut inside a row; a long table is split by rows with the header repeated.
5. Chunks never cross a page / slide / heading. Pages or slides shorter than MIN merge with
   the next one if it has the same heading and no table; the citation becomes a range.

Document metadata (title, author, dates) is never added to chunk text.
"""

from dataclasses import dataclass
from functools import lru_cache

import tiktoken

from knowledge.config import Settings, get_settings
from knowledge.converters.base import Section
from knowledge.thai_text import split_sentences

OVERLAP_MAX_SHARE = 0.25
RANGE_DASH = "–"


@dataclass(frozen=True)
class ChunkParams:
    min_tokens: int = 150
    target_tokens: int = 600
    max_tokens: int = 800
    overlap_sentences: int = 2
    encoding: str = "o200k_base"

    @classmethod
    def from_settings(cls, settings: Settings | None = None) -> "ChunkParams":
        s = settings or get_settings()
        return cls(
            min_tokens=s.chunk_min_tokens,
            target_tokens=s.chunk_target_tokens,
            max_tokens=s.chunk_max_tokens,
            overlap_sentences=s.chunk_overlap_sentences,
            encoding=s.chunk_encoding,
        )


@dataclass
class Chunk:
    chunk_index: int
    text: str  # stored in the payload; BM25 is computed from this
    embed_text: str  # context header + text; the dense vector is computed from this
    token_count: int  # of text, counted with ChunkParams.encoding
    citation: str
    page: int | None = None
    page_end: int | None = None  # set when short pages were merged
    page_label: str | None = None
    slide: int | None = None
    slide_end: int | None = None
    section: str | None = None  # heading_path joined ' > '
    is_table: bool = False


# --------------------------------------------------------------------------- tokens


@lru_cache(maxsize=4)
def _encoding(name: str) -> tiktoken.Encoding:
    return tiktoken.get_encoding(name)


def count_tokens(text: str, encoding: str = "o200k_base") -> int:
    return len(_encoding(encoding).encode(text, disallowed_special=()))


def warmup() -> None:
    """Load the encodings once; at image build time this stores them in TIKTOKEN_CACHE_DIR
    so the services never download them at runtime."""
    for name in ("o200k_base", "cl100k_base"):
        _encoding(name)


def hard_split(text: str, max_tokens: int, encoding: str) -> list[str]:
    """Cut text into pieces of at most max_tokens on token boundaries, moving each cut back
    until it falls between characters (a Thai character can span two tokens)."""
    enc = _encoding(encoding)
    tokens = enc.encode(text, disallowed_special=())
    pieces, start = [], 0
    while start < len(tokens):
        end = min(start + max(max_tokens, 1), len(tokens))
        step = -1  # shrink to the last character boundary
        while True:
            try:
                piece = enc.decode_bytes(tokens[start:end]).decode("utf-8") if end > start else ""
            except UnicodeDecodeError:
                piece = None
            if piece:
                break
            if end <= start + 1 and step < 0:
                step, end = 1, start + 1  # one character needs more tokens than allowed: take it whole
            end += step
        pieces.append(piece)
        start = end
    return [p.strip() for p in pieces if p.strip()]


# --------------------------------------------------------------------------- text runs


@dataclass(frozen=True)
class _Unit:
    text: str
    glue: str  # placed before it when it is not first in a chunk


def _render(units: list[_Unit]) -> str:
    return "".join((u.glue if i else "") + u.text for i, u in enumerate(units))


def _units(text: str, p: ChunkParams) -> list[_Unit]:
    units: list[_Unit] = []
    for paragraph in text.split("\n\n"):
        paragraph = paragraph.strip()
        if not paragraph:
            continue
        if count_tokens(paragraph, p.encoding) <= p.max_tokens:
            units.append(_Unit(paragraph, "\n\n"))
            continue
        glue = "\n\n"
        for sentence in split_sentences(paragraph):
            pieces = (
                [sentence]
                if count_tokens(sentence, p.encoding) <= p.max_tokens
                else hard_split(sentence, p.max_tokens, p.encoding)
            )
            for piece in pieces:
                units.append(_Unit(piece, glue))
                glue = " "  # the rest of this paragraph continues on the same line
    return units


def _overlap(text: str, p: ChunkParams) -> list[_Unit]:
    """The last overlap_sentences sentences of a finished chunk, if it has more than that."""
    if p.overlap_sentences <= 0:
        return []
    sentences = split_sentences(text)
    if len(sentences) <= p.overlap_sentences:
        return []
    tail = sentences[-p.overlap_sentences :]
    while tail and count_tokens(" ".join(tail), p.encoding) > p.max_tokens * OVERLAP_MAX_SHARE:
        tail = tail[1:]
    return [_Unit(" ".join(tail), "\n\n")] if tail else []


def _text_chunks(units: list[_Unit], p: ChunkParams) -> list[str]:
    chunks: list[str] = []
    current: list[_Unit] = []
    for unit in units:
        if not current:
            current = [unit]
            continue
        candidate = current + [unit]
        if (
            count_tokens(_render(current), p.encoding) < p.target_tokens
            and count_tokens(_render(candidate), p.encoding) <= p.max_tokens
        ):
            current = candidate
            continue
        finished = _render(current)
        chunks.append(finished)
        with_overlap = _overlap(finished, p) + [unit]
        fits = count_tokens(_render(with_overlap), p.encoding) <= p.max_tokens
        current = with_overlap if fits else [unit]
    if current:
        chunks.append(_render(current))
    return chunks


def _table_chunks(table: str, p: ChunkParams) -> list[str]:
    if count_tokens(table, p.encoding) <= p.max_tokens:
        return [table]
    lines = table.split("\n")
    header, rows = (lines[:2], lines[2:]) if len(lines) > 2 and lines[1].startswith("|-") else (lines[:1], lines[1:])
    head = "\n".join(header)
    if count_tokens(head, p.encoding) > p.max_tokens // 2:
        # a header this large cannot be repeated: split the table like text, one row per line
        return _text_chunks([_Unit(line, "\n") for line in lines], p)
    chunks: list[str] = []
    current: list[str] = []
    for row in rows:
        candidate = "\n".join([head, *current, row])
        if current and count_tokens(candidate, p.encoding) > p.max_tokens:
            chunks.append("\n".join([head, *current]))
            current = []
        if count_tokens("\n".join([head, row]), p.encoding) > p.max_tokens:
            # one row longer than a chunk: the only case where a row is cut
            budget = p.max_tokens - count_tokens(head + "\n", p.encoding)
            chunks.extend(f"{head}\n{piece}" for piece in hard_split(row, budget, p.encoding))
            continue
        current.append(row)
    if current:
        chunks.append("\n".join([head, *current]))
    return chunks


# --------------------------------------------------------------------------- groups


@dataclass
class _Group:
    sections: list[Section]

    @property
    def first(self) -> Section:
        return self.sections[0]

    @property
    def last(self) -> Section:
        return self.sections[-1]

    @property
    def paged(self) -> bool:
        return self.first.page is not None or self.first.slide is not None

    @property
    def has_table(self) -> bool:
        return any(s.is_table for s in self.sections)


def _location(section: Section) -> tuple:
    return (section.page, section.slide, tuple(section.heading_path))


def _groups(sections: list[Section]) -> list[_Group]:
    groups: list[_Group] = []
    for section in sections:
        if groups and _location(groups[-1].last) == _location(section):
            groups[-1].sections.append(section)
        else:
            groups.append(_Group([section]))
    return groups


def _next_to(a: _Group, b: _Group) -> bool:
    if a.last.page is not None and b.first.page is not None:
        return b.first.page == a.last.page + 1
    if a.last.slide is not None and b.first.slide is not None:
        return b.first.slide == a.last.slide + 1
    return False


def _merge_short(groups: list[_Group], p: ChunkParams) -> list[_Group]:
    """Short pages/slides join the following one (same heading, adjacent, no tables)."""
    out: list[_Group] = []
    carry: _Group | None = None
    for group in groups:
        if carry is not None:
            if not group.has_table and _next_to(carry, group) and carry.first.heading_path == group.first.heading_path:
                group = _Group(carry.sections + group.sections)
            else:
                out.append(carry)
            carry = None
        short = sum(count_tokens(s.text, p.encoding) for s in group.sections) < p.min_tokens
        if group.paged and not group.has_table and short:
            carry = group
        else:
            out.append(group)
    if carry is not None:
        out.append(carry)
    return out


# --------------------------------------------------------------------------- citations


def _label(section: Section) -> str:
    return section.page_label or str(section.page)


def _where(group: _Group, chunk_index: int) -> str:
    first, last = group.first, group.last
    heading = first.heading_path
    if first.page is not None:
        pages = _label(first) if first.page == last.page else f"{_label(first)}{RANGE_DASH}{_label(last)}"
        return f"หน้า {pages}" + (f" ({heading[-1]})" if heading else "")
    if first.slide is not None:
        slides = str(first.slide) if first.slide == last.slide else f"{first.slide}{RANGE_DASH}{last.slide}"
        return f"สไลด์ {slides}"
    if heading:
        return "หัวข้อ " + " > ".join(heading)
    return f"ส่วนที่ {chunk_index + 1}"


def _header(description: str, filename: str, section: str | None, where: str) -> str:
    parts = [f"[เอกสาร: {' '.join(description.split())}]", f"[ไฟล์: {filename}]"]
    if section and not where.startswith("หัวข้อ"):
        parts.append(f"[หัวข้อ: {section}]")
    parts.append(f"[{where}]")
    return " ".join(parts)


# --------------------------------------------------------------------------- entry point


def chunk_document(
    sections: list[Section], *, filename: str, description: str, params: ChunkParams | None = None
) -> list[Chunk]:
    p = params or ChunkParams.from_settings()
    chunks: list[Chunk] = []
    for group in _merge_short(_groups(sections), p):
        pieces: list[tuple[str, bool]] = []
        units: list[_Unit] = []
        for section in group.sections:
            if section.is_table:
                pieces += [(text, False) for text in _text_chunks(units, p)]
                units = []
                pieces += [(text, True) for text in _table_chunks(section.text, p)]
            else:
                units += _units(section.text, p)
        pieces += [(text, False) for text in _text_chunks(units, p)]

        section_name = " > ".join(group.first.heading_path) or None
        for text, is_table in pieces:
            index = len(chunks)
            where = _where(group, index)
            chunks.append(
                Chunk(
                    chunk_index=index,
                    text=text,
                    embed_text=f"{_header(description, filename, section_name, where)}\n{text}",
                    token_count=count_tokens(text, p.encoding),
                    citation=f"{filename}, {where}",
                    page=group.first.page,
                    page_end=group.last.page if group.last.page != group.first.page else None,
                    page_label=group.first.page_label,
                    slide=group.first.slide,
                    slide_end=group.last.slide if group.last.slide != group.first.slide else None,
                    section=section_name,
                    is_table=is_table,
                )
            )
    return chunks
