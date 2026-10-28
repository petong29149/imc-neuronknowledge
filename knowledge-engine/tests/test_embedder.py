import httpx2
import openai
import pytest
from pydantic import SecretStr
from tenacity import wait_none

from knowledge.config import Settings
from knowledge.embedder import RETRY_ATTEMPTS, OpenAIEmbedder
from knowledge.errors import PermanentError, TransientError
from tests.fixtures.embedder import FakeOpenAIClient, fake_vector

REQUEST = httpx2.Request("POST", "https://api.openai.com/v1/embeddings")


def status_error(cls, code: int):
    return cls("error", response=httpx2.Response(code, request=REQUEST), body=None)


@pytest.fixture(autouse=True)
def no_retry_wait(monkeypatch):
    monkeypatch.setattr(OpenAIEmbedder._create.retry, "wait", wait_none())


def settings(**kw) -> Settings:
    return Settings(_env_file=None, postgres_url="postgresql://x@y/z", openai_api_key=SecretStr("sk-test"), **kw)


def embedder(client, **kw) -> OpenAIEmbedder:
    return OpenAIEmbedder(settings(**kw), client=client)


def test_batches_of_100_in_input_order():
    client = FakeOpenAIClient()
    texts = [f"ข้อความที่ {i}" for i in range(250)]
    vectors = embedder(client).embed(texts)
    assert [len(c) for c in client.calls] == [100, 100, 50]
    assert vectors == [fake_vector(t) for t in texts]  # despite the client returning them reversed


@pytest.mark.parametrize(
    "error",
    [
        status_error(openai.RateLimitError, 429),
        status_error(openai.InternalServerError, 503),
        openai.APIConnectionError(request=REQUEST),
        openai.APITimeoutError(request=REQUEST),
    ],
)
def test_retries_rate_limits_server_and_network_errors(error):
    client = FakeOpenAIClient(script=[error, None])
    assert len(embedder(client).embed(["a"])) == 1
    assert len(client.calls) == 2


def test_gives_up_with_transient_error_after_retries():
    client = FakeOpenAIClient(script=[status_error(openai.InternalServerError, 500)] * RETRY_ATTEMPTS)
    with pytest.raises(TransientError):
        embedder(client).embed(["a"])
    assert len(client.calls) == RETRY_ATTEMPTS


def test_bad_request_is_permanent_and_not_retried():
    client = FakeOpenAIClient(script=[status_error(openai.BadRequestError, 400)])
    with pytest.raises(PermanentError):
        embedder(client).embed(["a"])
    assert len(client.calls) == 1


def test_rejected_key_is_transient_so_jobs_recover_once_fixed():
    client = FakeOpenAIClient(script=[status_error(openai.AuthenticationError, 401)])
    with pytest.raises(TransientError):
        embedder(client).embed(["a"])
    assert len(client.calls) == 1


def test_missing_key_is_transient():
    # explicit None: the container env has a real key once OPENAI_API_KEY is set in .env
    no_key = Settings(_env_file=None, postgres_url="postgresql://x@y/z", openai_api_key=None)
    with pytest.raises(TransientError, match="OPENAI_API_KEY"):
        OpenAIEmbedder(no_key).embed(["a"])


def test_text_over_the_model_limit_is_permanent_before_any_call():
    client = FakeOpenAIClient()
    with pytest.raises(PermanentError, match="ชิ้นที่ 2"):
        embedder(client, embed_max_tokens=50).embed(["สั้น", "ยาวมาก " * 200])
    assert client.calls == []


def test_wrong_vector_size_is_permanent():
    with pytest.raises(PermanentError, match="1536"):
        embedder(FakeOpenAIClient(size=768)).embed(["a"])


def test_missing_vectors_in_the_response_is_transient():
    with pytest.raises(TransientError):
        embedder(FakeOpenAIClient(drop=1)).embed(["a", "b"])
