""".txt / .md → Sections (plan T6). Decoding is file_types.decode_text — the same rules the
upload check used (UTF-8 → cp874/TIS-620 → detection).

- .md: a new Section at every heading outside code fences, carrying its heading_path.
- .txt: one Section; the chunker splits it on blank lines. Hard-wrapped lines are joined.
"""

import re

from knowledge.converters.base import ConvertResult, Section, join_wrapped_lines, text_quality
from knowledge.errors import PermanentError
from knowledge.file_types import UnsupportedFileError, decode_text
from knowledge.thai_text import DEFAULT_GARBLED_THRESHOLD, normalize

_HEADING = re.compile(r"^(#{1,6})\s+(.+?)\s*#*\s*$")
_FENCE = re.compile(r"^\s*(```|~~~)")


def _unwrap_outside_fences(lines: list[str]) -> str:
    """join_wrapped_lines() for prose; code blocks are kept line by line."""
    out: list[str] = []
    prose: list[str] = []
    in_fence = False
    for line in lines:
        if _FENCE.match(line):
            if not in_fence and prose:
                out.append(join_wrapped_lines("\n".join(prose)))
                prose = []
            out.append(line)
            in_fence = not in_fence
        elif in_fence:
            out.append(line)
        else:
            prose.append(line)
    if prose:
        out.append(join_wrapped_lines("\n".join(prose)))
    return "\n".join(out)


def _markdown_sections(text: str) -> list[Section]:
    sections: list[Section] = []
    heading_path: list[str] = []
    lines: list[str] = []
    in_fence = False

    def flush() -> None:
        # normalize first (folds look-alike hyphens so list items are recognized), then unwrap
        body = normalize(_unwrap_outside_fences(normalize("\n".join(lines)).split("\n")))
        if body:
            sections.append(Section(body, heading_path=list(heading_path)))
        lines.clear()

    for line in text.splitlines():
        if _FENCE.match(line):
            in_fence = not in_fence
        match = None if in_fence else _HEADING.match(line)
        if match:
            flush()
            level, title = len(match.group(1)), " ".join(match.group(2).split())
            heading_path[:] = heading_path[: level - 1] + [title]
            lines.append(f"{'#' * level} {title}")
        else:
            lines.append(line)
    flush()
    return sections


def convert_text(data: bytes, file_type: str, *, garbled_threshold: float = DEFAULT_GARBLED_THRESHOLD) -> ConvertResult:
    try:
        text = decode_text(data)
    except UnsupportedFileError as err:
        raise PermanentError(str(err)) from None

    if file_type == "md":
        sections = _markdown_sections(text)
    else:
        body = join_wrapped_lines(normalize(text))
        sections = [Section(body)] if body else []
    return ConvertResult(sections=sections, page_count=None, quality_flag=text_quality(sections, garbled_threshold))
