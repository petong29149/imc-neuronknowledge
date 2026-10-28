"""Thai text processing shared by the worker and the MCP server (plan T4).

Word segmentation must be identical at index time and query time, or BM25 breaks
(plan §3) — so normalize / tokenize_words live here and nowhere else. Any change to
the rules below or to resources/custom_words.txt needs a TOKENIZER_VERSION bump and a
sparse reindex.

v1 rules: normalize() first; tokenize_words() splits the text into Thai abbreviations
(ก.พ., พ.ศ. — kept whole when they start a word), Thai runs, non-Thai words (letters/digits
joined by . _ ' -) and single symbols, and runs newmm with the dictionary trie (PyThaiNLP
words + custom words) on each Thai run. Custom words must therefore be all-Thai or
all-non-Thai. bm25.bm25_terms() filters these tokens; its rules count as part of the version.
"""

import os
import re
import unicodedata
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pythainlp.tokenize import sent_tokenize, word_tokenize
from pythainlp.util import remove_dangling, remove_repeat_vowels, remove_spaces_before_marks

TOKENIZER_VERSION = "newmm-v1"

CUSTOM_WORDS_PATH = Path(
    os.environ.get(
        "CUSTOM_WORDS_PATH",
        Path(__file__).resolve().parents[2] / "resources" / "custom_words.txt",
    )
)

DEFAULT_GARBLED_THRESHOLD = 0.6
# Above this share of Thai characters in impossible sequences, the text is garbled even if
# newmm still finds dictionary words in it (e.g. leading vowels moved after their consonant)
MAX_INVALID_RATIO = 0.01
# Too little Thai to judge: treat as ok (English text must never be flagged)
MIN_THAI_CHARS = 20
# A Thai run this short followed by "." is an abbreviation (ก.พ., สป.อว., สสวท., จำกัด.)
MAX_ABBREVIATION_CHARS = 5

_ZERO_WIDTH = dict.fromkeys(map(ord, "\u200b\u200c\u200d\u2060\ufeff\u00ad"), None)
# PDF fonts often map "-" to HYPHEN (U+2010), NON-BREAKING HYPHEN, FIGURE DASH or MINUS SIGN;
# fold them so bullets parse and codes like KNOW-07 match what users type
_HYPHENS = dict.fromkeys([0x2010, 0x2011, 0x2012, 0x2212], "-")
_INLINE_SPACE = re.compile(r"[ \t\u00a0\u2000-\u200a\u202f\u205f\u3000]+")
_LINE_BREAKS = re.compile(r"\r\n?|[\f\v\u2028\u2029]")
_THAI_CHAR = re.compile(r"[\u0e00-\u0e7f]")
# Thai block plus the private-use glyphs legacy Thai fonts leak into extracted PDF text
_THAI_OR_FONT_GLYPH = re.compile(r"[\u0e00-\u0e7f\uf700-\uf71a]")
_THAI_SYMBOLS = re.compile(r"[๐-๙ๆฯ฿๏๚๛]+")
_CONSONANT = "ก-ฮ"
_INVALID_SEQUENCE = re.compile(
    rf"[เแโใไ](?![{_CONSONANT}])"  # a leading vowel must be followed by a consonant
    rf"|(?<![{_CONSONANT}])[ัิีึืุู็]"  # an above/below vowel needs a consonant before it
    rf"|(?<![{_CONSONANT}ัิีึืุู])[่้๊๋]"  # a tone mark follows a consonant or above/below vowel
    r"|[่้๊๋์][ัิีึืุู็่้๊๋]"  # nothing stacks on top of a tone mark
    r"|[\uf700-\uf71a]"  # legacy font glyphs instead of real characters
)
_NON_THAI_WORD_CHAR = r"(?:(?![\u0e00-\u0e7f])[^\W_])"
_RUNS = re.compile(
    # Thai abbreviations stay one token when they start a word: ก.พ., พ.ศ., สป.อว., ศ.ดร., มก.
    # (two or more dotted parts, or one part of up to 4 letters). ก-๛ spans all assigned Thai characters.
    r"(?P<abbr>(?<![ก-๛])(?:(?:[ก-๛]{1,5}\.){2,}|[ก-๛]{1,4}\.(?![ก-๛])))"
    r"|"
    r"(?P<thai>[\u0e00-\u0e7f]+)"
    rf"|(?P<word>{_NON_THAI_WORD_CHAR}+(?:[._'’-]{_NON_THAI_WORD_CHAR}+)*)"
    r"|(?P<symbol>\S)"
)
# English (or other non-Thai) sentence ends: punctuation, space, then a likely sentence start
_SENTENCE_END = re.compile(r"(?<=[.!?])\s+(?=[\"'(\[]?[A-Z0-9])")


# --------------------------------------------------------------------------- dictionary


def load_custom_words(path: Path) -> set[str]:
    """One word per line; blank lines and lines starting with # are skipped."""
    if not path.exists():
        return set()
    words = set()
    for line in path.read_text("utf-8").splitlines():
        word = line.strip()
        if word and not word.startswith("#"):
            words.add(word)
    return words


@lru_cache(maxsize=1)
def get_trie():
    from pythainlp.corpus import thai_words
    from pythainlp.util import dict_trie

    return dict_trie(set(thai_words()) | load_custom_words(CUSTOM_WORDS_PATH))


def warmup() -> None:
    """Load the dictionary and the crfcut model once (slow on first use).
    Runs at image build time and at service start."""
    get_trie()
    sent_tokenize("ทดสอบ", engine="crfcut")


# --------------------------------------------------------------------------- normalize


def normalize(text: str) -> str:
    """NFC → drop zero-width characters → hyphen look-alikes to "-" → fix Thai vowel/tone
    order and duplicates (e.g. "เเ" → "แ") → collapse spaces within lines. Line breaks are
    kept and blank lines collapse to one, so "\\n\\n" still separates paragraphs."""
    text = unicodedata.normalize("NFC", text).translate(_ZERO_WIDTH).translate(_HYPHENS)
    text = _LINE_BREAKS.sub("\n", text)
    lines = []
    for line in text.split("\n"):
        line = _INLINE_SPACE.sub(" ", line).strip()
        if line:
            # pythainlp.util.normalize would also merge "\n\n" into "\n", so apply its steps per line
            line = remove_dangling(remove_repeat_vowels(remove_spaces_before_marks(line)))
        lines.append(line)
    return re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip("\n")


# --------------------------------------------------------------------------- segmentation


def tokenize_words(text: str) -> list[str]:
    """Words of already-normalized text, without whitespace. Thai runs go through newmm
    (short inputs: newmm slows down badly on long unbroken text); other words stay whole,
    including joined codes like "KNOW-07" or "v2.5"; any other symbol is its own token."""
    trie = get_trie()
    tokens: list[str] = []
    for run in _RUNS.finditer(text):
        if run.lastgroup == "thai":
            words = word_tokenize(run.group(), custom_dict=trie, engine="newmm", keep_whitespace=False)
            tokens.extend(w for w in words if w.strip())
        else:
            tokens.append(run.group())
    return tokens


def split_sentences(paragraph: str) -> list[str]:
    """Sentences of a paragraph. Each line is split on its own, so converters must join
    hard-wrapped lines before calling this. Lines with Thai use crfcut; others a regex."""
    sentences: list[str] = []
    for line in paragraph.split("\n"):
        line = line.strip()
        if not line:
            continue
        parts = sent_tokenize(line, engine="crfcut") if _THAI_CHAR.search(line) else _SENTENCE_END.split(line)
        sentences.extend(p.strip() for p in parts if p.strip())
    return sentences


# --------------------------------------------------------------------------- quality


@dataclass(frozen=True)
class QualityResult:
    score: float  # Thai words (2+ characters) found in the dictionary / Thai tokens, abbreviations excluded
    thai_ratio: float  # Thai characters / all letters
    invalid_ratio: float  # Thai characters in impossible sequences / Thai characters
    flag: Literal["ok", "garbled"]


def _scored_thai_tokens(text: str) -> tuple[list[str], int]:
    """Thai tokens the dictionary score is computed over, and how many Thai characters they
    cover. Abbreviations (ก.พ., พ.ศ., สป.อว., ศ.ดร., มก.) are skipped: their pieces are not
    dictionary words, and official documents are full of them."""
    trie = get_trie()
    tokens: list[str] = []
    chars = 0
    for run in _RUNS.finditer(text):
        if run.lastgroup != "thai":
            continue
        word = run.group()
        if len(word) <= MAX_ABBREVIATION_CHARS and text.startswith(".", run.end()):
            continue
        for token in word_tokenize(word, custom_dict=trie, engine="newmm", keep_whitespace=False):
            if token.strip() and not _THAI_SYMBOLS.fullmatch(token):
                tokens.append(token)
                chars += len(token)
    return tokens, chars


def quality_check(text: str, threshold: float = DEFAULT_GARBLED_THRESHOLD) -> QualityResult:
    """Is this extracted text readable Thai, or the garbage broken PDF fonts produce?
    Pass normalized text; the pipeline passes settings.garbled_threshold."""
    thai_chars = len(_THAI_OR_FONT_GLYPH.findall(text))
    other_letters = sum(1 for ch in text if ch.isalpha() and not _THAI_OR_FONT_GLYPH.match(ch))
    letters = thai_chars + other_letters
    thai_ratio = thai_chars / letters if letters else 0.0
    invalid_ratio = len(_INVALID_SEQUENCE.findall(text)) / thai_chars if thai_chars else 0.0

    thai_tokens, scored_chars = _scored_thai_tokens(text)
    if scored_chars < MIN_THAI_CHARS:
        # Too little Thai outside abbreviations to judge words; impossible sequences still count
        score = 1.0
    else:
        trie = get_trie()
        score = sum(1 for t in thai_tokens if len(t) > 1 and t in trie) / len(thai_tokens)
    if thai_chars < MIN_THAI_CHARS:
        invalid_ratio = 0.0

    garbled = score < threshold or invalid_ratio > MAX_INVALID_RATIO
    return QualityResult(
        score=round(score, 4),
        thai_ratio=round(thai_ratio, 4),
        invalid_ratio=round(invalid_ratio, 4),
        flag="garbled" if garbled else "ok",
    )
