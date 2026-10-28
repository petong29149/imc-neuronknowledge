"""Dense embeddings with OpenAI (plan T8): batches of 100, retries for 429 / 5xx / network
errors, results in input order.

Failures map onto the worker's rules: rate limits, server and network errors, and a missing
or rejected API key are TransientError (the job retries with backoff, so fixing the key
recovers queued documents); a request OpenAI refuses as invalid is PermanentError.
"""

import logging
from collections.abc import Sequence
from typing import Protocol

import openai
from tenacity import retry, retry_if_exception, stop_after_attempt, wait_exponential

from knowledge.chunker import count_tokens
from knowledge.config import Settings, get_settings
from knowledge.errors import PermanentError, TransientError
from knowledge.vector_store import DENSE_SIZE

log = logging.getLogger("knowledge.embedder")

BATCH_SIZE = 100
RETRY_ATTEMPTS = 4  # inside one job; the worker's own backoff comes after these


class Embedder(Protocol):
    model: str

    def embed(self, texts: Sequence[str]) -> list[list[float]]: ...


def _retryable(err: BaseException) -> bool:
    if isinstance(err, openai.APIConnectionError):  # includes timeouts
        return True
    status = getattr(err, "status_code", None)
    return status == 429 or (isinstance(status, int) and status >= 500)


class OpenAIEmbedder:
    def __init__(self, settings: Settings | None = None, client: openai.OpenAI | None = None):
        s = settings or get_settings()
        self.model = s.embed_model
        self.max_tokens = s.embed_max_tokens
        key = s.openai_api_key.get_secret_value() if s.openai_api_key else ""
        self.client = client or (openai.OpenAI(api_key=key, max_retries=0, timeout=60) if key else None)

    def embed(self, texts: Sequence[str]) -> list[list[float]]:
        if self.client is None:
            raise TransientError("OPENAI_API_KEY ยังไม่ได้ตั้งค่า — สร้าง embedding ไม่ได้")
        for i, text in enumerate(texts):
            # text-embedding-3-* count input in cl100k_base and accept at most 8,191 tokens
            if count_tokens(text, "cl100k_base") > self.max_tokens:
                raise PermanentError(f"ข้อความชิ้นที่ {i + 1} ยาวเกินขีดจำกัดของ embedding model")
        vectors: list[list[float]] = []
        for start in range(0, len(texts), BATCH_SIZE):
            vectors.extend(self._batch(list(texts[start : start + BATCH_SIZE])))
        return vectors

    def _batch(self, batch: list[str]) -> list[list[float]]:
        try:
            response = self._create(batch)
        except openai.APIError as err:
            status = getattr(err, "status_code", None)
            if _retryable(err) or status in (401, 403):
                raise TransientError(f"OpenAI embeddings: {type(err).__name__} {status or ''}".strip()) from err
            raise PermanentError(f"OpenAI ปฏิเสธคำขอสร้าง embedding ({status})") from err
        data = sorted(response.data, key=lambda d: d.index)
        if len(data) != len(batch):
            raise TransientError(f"OpenAI returned {len(data)} embeddings for {len(batch)} inputs")
        vectors = [list(d.embedding) for d in data]
        if any(len(v) != DENSE_SIZE for v in vectors):
            raise PermanentError(f"embedding model {self.model} ไม่ได้ให้เวกเตอร์ขนาด {DENSE_SIZE} มิติ")
        return vectors

    @retry(
        retry=retry_if_exception(_retryable),
        wait=wait_exponential(multiplier=1, min=1, max=20),
        stop=stop_after_attempt(RETRY_ATTEMPTS),
        reraise=True,
    )
    def _create(self, batch: list[str]):
        return self.client.embeddings.create(model=self.model, input=batch)
