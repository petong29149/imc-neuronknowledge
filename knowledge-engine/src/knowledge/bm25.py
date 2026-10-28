"""BM25 sparse vectors (plan T5). Index time (worker) and query time (MCP) both go through
bm25_terms(), so a term in a document and the same term in a query always get the same id.

Documents carry the BM25 term-frequency part; Qdrant applies IDF itself (the collection's
`bm25` vector has Modifier.IDF), so queries only say which terms they contain.
Changing anything here changes the terms: bump thai_text.TOKENIZER_VERSION and reindex.
"""

from collections import Counter
from dataclasses import dataclass

import mmh3
from qdrant_client import models

from knowledge.config import Settings, get_settings
from knowledge.thai_text import normalize, tokenize_words

ENGLISH_STOPWORDS = frozenset(
    """a an and are as at be been but by can could did do does for from had has have he her his i if in
    into is it its may me might must my no not of on or our she should so than that the their them then
    there these they this those to too us was we were what when where which who why will with would you your""".split()
)

# Function words only. PyThaiNLP's thai_stopwords() (1,030 words) also drops words that carry
# meaning in questions — วัน, เกิน, สูงสุด, ภายใน, ก่อน, หลัง, ใหม่ — and Qdrant's IDF already
# gives very common words little weight, so a short list is safer for recall.
THAI_STOPWORDS = frozenset(
    """และ หรือ แต่ ที่ ซึ่ง อัน ของ ใน การ ความ ได้ เป็น มี ให้ จะ ว่า กับ แก่ แล้ว ก็ นี้ นั้น โดย เพื่อ จาก
    ถึง อยู่ คือ เพราะ ถ้า หาก เมื่อ ด้วย ต่อ ตาม ไว้ ยัง อีก ทั้ง จึง จน ขณะ บน แห่ง ครับ ค่ะ คะ นะ""".split()
)

_THAI_DIGITS = str.maketrans("๐๑๒๓๔๕๖๗๘๙", "0123456789")


@dataclass(frozen=True)
class Bm25Params:
    k1: float
    b: float
    avgdl: float

    @classmethod
    def from_settings(cls, settings: Settings | None = None) -> "Bm25Params":
        s = settings or get_settings()
        return cls(k1=s.bm25_k1, b=s.bm25_b, avgdl=s.bm25_avgdl)


def bm25_terms(text: str) -> list[str]:
    """normalize → tokenize_words → lowercase, Thai digits → 0-9 → drop stopwords, symbols,
    and single characters that are not digits. Keeps duplicates (term frequency matters)."""
    terms = []
    for token in tokenize_words(normalize(text)):
        term = token.lower().translate(_THAI_DIGITS)
        if not any(ch.isalnum() for ch in term):
            continue  # punctuation and other symbols
        if len(term) == 1 and not term.isdigit():
            continue
        if term in THAI_STOPWORDS or term in ENGLISH_STOPWORDS:
            continue
        terms.append(term)
    return terms


def term_id(term: str) -> int:
    return mmh3.hash(term, signed=False)


def _sparse(weights: dict[int, float]) -> models.SparseVector:
    indices = sorted(weights)
    return models.SparseVector(indices=indices, values=[weights[i] for i in indices])


def encode_document(text: str, params: Bm25Params | None = None) -> models.SparseVector:
    """value = tf·(k1+1) / (tf + k1·(1 − b + b·dl/avgdl)) per term; terms whose ids collide are
    summed so indices stay unique. Empty or all-stopword text gives an empty vector."""
    p = params or Bm25Params.from_settings()
    counts = Counter(bm25_terms(text))
    dl = sum(counts.values())
    weights: dict[int, float] = {}
    for term, tf in counts.items():
        value = tf * (p.k1 + 1) / (tf + p.k1 * (1 - p.b + p.b * dl / p.avgdl))
        index = term_id(term)
        weights[index] = weights.get(index, 0.0) + value
    return _sparse(weights)


def encode_query(text: str) -> models.SparseVector:
    """Each distinct query term once with value 1.0 (Qdrant multiplies in the IDF)."""
    weights: dict[int, float] = {}
    for term in set(bm25_terms(text)):
        index = term_id(term)
        weights[index] = weights.get(index, 0.0) + 1.0
    return _sparse(weights)


def is_empty(vector: models.SparseVector) -> bool:
    """True when the text had no searchable terms: callers skip the sparse part (T8 upsert,
    T10 falls back to dense-only search)."""
    return not vector.indices
