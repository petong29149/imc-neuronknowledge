"""Settings read from the environment (and `.env` when running outside Docker).

Every variable is listed in `example.env`. Secrets are `SecretStr` so they never
show up in logs or reprs.
"""

import logging
import re
from functools import lru_cache
from typing import Literal
from urllib.parse import urlsplit

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_SCHEMA_NAME = re.compile(r"^[a-z_][a-z0-9_]{0,62}$")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Postgres (same database as the app; engine tables live in their own schema)
    # Holds the DB password: kept out of repr (pytest prints Settings when a test fails);
    # log it with redact_url()
    postgres_url: str = Field(repr=False)
    postgres_schema: str = "knowledge"

    # Internal upload API (T2a) — only the Next.js server holds this token
    internal_api_token: SecretStr | None = None
    api_port: int = 8000

    # Qdrant
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: SecretStr | None = None
    qdrant_collection: str = "knowledge"

    # Embeddings
    openai_api_key: SecretStr | None = None
    embed_model: str = "text-embedding-3-small"
    embed_max_tokens: int = 8000

    # File storage
    storage_backend: Literal["s3", "local"] = "local"
    s3_endpoint: str | None = None
    s3_bucket: str = "knowledge"
    s3_region: str = "us-east-1"
    s3_access_key: SecretStr | None = None
    s3_secret_key: SecretStr | None = None
    local_storage_dir: str = "/data/files"
    max_file_mb: int = 50

    # Chunking — sizes are counted with `chunk_encoding` (o200k_base is ~2.3x denser for Thai)
    chunk_encoding: str = "o200k_base"
    chunk_min_tokens: int = 150
    chunk_target_tokens: int = 600
    chunk_max_tokens: int = 800
    chunk_overlap_sentences: int = 2

    # BM25 sparse vectors
    bm25_k1: float = 1.2
    bm25_b: float = 0.75
    bm25_avgdl: float = 300

    # Thai text quality
    garbled_threshold: float = 0.6
    # A file that takes longer to read fails instead of holding the worker; keep it below
    # JOB_STALE_MINUTES or the job is requeued while still running
    convert_timeout_seconds: int = 900

    # OCR of scanned pages and images (KNOW-13): an OpenAI vision model reads each page
    ocr_enabled: bool = True
    ocr_model: str = "gpt-4.1-mini"
    ocr_max_pages: int = 200  # a document with more pages to OCR fails instead of running up the bill
    ocr_concurrency: int = 4

    # Rerank (T10)
    rerank_enabled: bool = False
    rerank_model: str = "BAAI/bge-reranker-v2-m3"
    rerank_max_length: int = 1024

    # Services
    mcp_port: int = 8765
    worker_poll_seconds: float = 2.0
    job_stale_minutes: int = 30

    @field_validator("postgres_schema")
    @classmethod
    def _schema_is_identifier(cls, value: str) -> str:
        # Used in a connection option and in DDL, so keep it to a plain identifier
        if not _SCHEMA_NAME.match(value):
            raise ValueError("POSTGRES_SCHEMA must be a lowercase identifier (a-z, 0-9, _)")
        if value in ("public", "pg_catalog", "information_schema"):
            raise ValueError(f"POSTGRES_SCHEMA must not be {value!r}: engine tables stay out of app schemas")
        return value

    @model_validator(mode="after")
    def _chunk_sizes_are_ordered(self) -> "Settings":
        if not 0 < self.chunk_min_tokens <= self.chunk_target_tokens <= self.chunk_max_tokens:
            raise ValueError("expected 0 < CHUNK_MIN_TOKENS <= CHUNK_TARGET_TOKENS <= CHUNK_MAX_TOKENS")
        return self

    @model_validator(mode="after")
    def _convert_timeout_below_stale(self) -> "Settings":
        if not 0 < self.convert_timeout_seconds < self.job_stale_minutes * 60:
            raise ValueError("expected 0 < CONVERT_TIMEOUT_SECONDS < JOB_STALE_MINUTES * 60")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


def redact_url(url: str) -> str:
    """host:port/db of a connection URL, without credentials, for log lines."""
    parts = urlsplit(url)
    host = parts.hostname or "?"
    port = f":{parts.port}" if parts.port else ""
    return f"{host}{port}{parts.path}"


def setup_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    # httpx logs every Qdrant/OpenAI request at INFO
    logging.getLogger("httpx").setLevel(logging.WARNING)
