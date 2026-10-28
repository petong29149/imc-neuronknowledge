import pytest
from pydantic import ValidationError

from knowledge.config import Settings, redact_url

URL = "postgresql://user:secret@db.example:5432/app"


def make(**overrides) -> Settings:
    return Settings(_env_file=None, postgres_url=URL, **overrides)


def test_defaults_match_plan():
    s = make()
    assert s.postgres_schema == "knowledge"
    assert s.qdrant_collection == "knowledge"
    assert s.embed_model == "text-embedding-3-small"
    assert s.chunk_encoding == "o200k_base"
    assert (s.chunk_min_tokens, s.chunk_target_tokens, s.chunk_max_tokens) == (150, 600, 800)
    assert s.rerank_enabled is False
    assert s.rerank_max_length == 1024


@pytest.mark.parametrize("schema", ["public", "Knowledge", "knowledge;drop", "1abc", ""])
def test_schema_must_be_a_safe_non_app_identifier(schema):
    with pytest.raises(ValidationError):
        make(postgres_schema=schema)


def test_chunk_sizes_must_be_ordered():
    with pytest.raises(ValidationError):
        make(chunk_target_tokens=900, chunk_max_tokens=800)


def test_secrets_stay_out_of_repr():
    s = make(internal_api_token="x" * 40, openai_api_key="sk-test-value")
    assert "x" * 40 not in repr(s)
    assert "sk-test-value" not in repr(s)
    assert "user:secret@" not in repr(s) and "db.example" not in repr(s)  # POSTGRES_URL holds the password


def test_redact_url_drops_credentials():
    assert redact_url(URL) == "db.example:5432/app"


def test_convert_timeout_must_be_below_the_stale_job_timeout():
    assert make(convert_timeout_seconds=900, job_stale_minutes=30).convert_timeout_seconds == 900
    with pytest.raises(ValidationError, match="CONVERT_TIMEOUT_SECONDS"):
        make(convert_timeout_seconds=1800, job_stale_minutes=30)
