import io

import boto3
import pytest
from botocore.response import StreamingBody
from botocore.stub import Stubber

from knowledge.config import Settings
from knowledge.storage import LocalStorage, S3Storage


def test_local_put_get_delete(tmp_path):
    storage = LocalStorage(tmp_path)
    storage.put("acme/doc-1/คู่มือ.pdf", b"data", "application/pdf")
    assert storage.get("acme/doc-1/คู่มือ.pdf") == b"data"
    storage.delete("acme/doc-1/คู่มือ.pdf")
    storage.delete("acme/doc-1/คู่มือ.pdf")  # already gone: no error
    assert not (tmp_path / "acme").exists()  # empty org/doc directories are removed
    assert tmp_path.exists()


@pytest.mark.parametrize("key", ["../escape.txt", "acme/../../escape.txt", "/abs.txt", "a//b", "a\\b", ""])
def test_local_rejects_unsafe_keys(tmp_path, key):
    with pytest.raises(ValueError):
        LocalStorage(tmp_path).put(key, b"x", "text/plain")


def test_s3_calls():
    settings = Settings(_env_file=None, postgres_url="postgresql://x@y/z", s3_bucket="kb")
    client = boto3.client("s3", region_name="us-east-1", aws_access_key_id="a", aws_secret_access_key="b")
    storage = S3Storage(settings, client=client)
    with Stubber(client) as stub:
        stub.add_response(
            "put_object",
            {},
            {"Bucket": "kb", "Key": "acme/d/a.pdf", "Body": b"data", "ContentType": "application/pdf"},
        )
        stub.add_response(
            "get_object",
            {"Body": StreamingBody(io.BytesIO(b"data"), 4)},
            {"Bucket": "kb", "Key": "acme/d/a.pdf"},
        )
        stub.add_response("delete_object", {}, {"Bucket": "kb", "Key": "acme/d/a.pdf"})
        storage.put("acme/d/a.pdf", b"data", "application/pdf")
        assert storage.get("acme/d/a.pdf") == b"data"
        storage.delete("acme/d/a.pdf")
        stub.assert_no_pending_responses()
