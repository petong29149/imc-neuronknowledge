"""Cross-encoder rerank (plan T10): re-scores the fused search results with
BAAI/bge-reranker-v2-m3, which reads the query and each chunk together (multilingual, Thai OK).

Off by default (RERANK_ENABLED=false). It needs torch + sentence-transformers, which only the
`rerank` image has; the model (~2.3GB) downloads into HF_HOME (the hf_cache volume) on first
load. On CPU, 20 chunks of up to RERANK_MAX_LENGTH tokens take roughly 1–3 s per query.
"""

import logging
from dataclasses import replace
from typing import Any

from knowledge.config import Settings
from knowledge.search import Hit

log = logging.getLogger("knowledge.rerank")


class CrossEncoderReranker:
    def __init__(self, model: Any):
        self.model = model  # anything with predict(list[(query, text)]) -> scores

    @classmethod
    def load(cls, name: str, max_length: int) -> "CrossEncoderReranker":
        try:
            from sentence_transformers import CrossEncoder
        except ImportError as err:
            raise RuntimeError(
                "RERANK_ENABLED=true needs sentence-transformers: run the mcp service from the "
                "`rerank` image (MCP_TARGET=rerank, or MCP_DEV_TARGET=dev-rerank in dev)"
            ) from err
        log.info("loading reranker %s (max_length=%d)", name, max_length)
        return cls(CrossEncoder(name, max_length=max_length, device="cpu"))

    def rerank(self, query: str, hits: list[Hit]) -> list[Hit]:
        if not hits:
            return []
        scores = self.model.predict([(query, h.text) for h in hits], show_progress_bar=False)
        scored = [replace(h, score=float(s)) for h, s in zip(hits, scores, strict=True)]
        return sorted(scored, key=lambda h: h.score, reverse=True)


def load_reranker(settings: Settings) -> CrossEncoderReranker | None:
    if not settings.rerank_enabled:
        return None
    return CrossEncoderReranker.load(settings.rerank_model, settings.rerank_max_length)
