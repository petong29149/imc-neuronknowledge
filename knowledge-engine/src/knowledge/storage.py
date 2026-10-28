"""Where uploaded files live: S3 (or S3-compatible) in production, a local directory
(the compose `files` volume) in dev. Keys look like `{org_id}/{doc_id}/{filename}`."""

import os
import tempfile
from pathlib import Path, PurePosixPath
from typing import Protocol

from knowledge.config import Settings, get_settings


class Storage(Protocol):
    def put(self, key: str, data: bytes, content_type: str) -> None: ...
    def get(self, key: str) -> bytes: ...
    def delete(self, key: str) -> None:
        """Remove the object; no error if it is already gone."""
        ...


def check_key(key: str) -> str:
    """Reject keys that could escape the storage root or are not plain relative paths."""
    path = PurePosixPath(key)
    if not key or path.is_absolute() or "\\" in key or any(p in ("", ".", "..") for p in key.split("/")):
        raise ValueError(f"invalid storage key: {key!r}")
    return key


class LocalStorage:
    def __init__(self, root: str | Path):
        self.root = Path(root).resolve()

    def _path(self, key: str) -> Path:
        path = (self.root / check_key(key)).resolve()
        if not path.is_relative_to(self.root):
            raise ValueError(f"invalid storage key: {key!r}")
        return path

    def put(self, key: str, data: bytes, content_type: str) -> None:
        path = self._path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        # Write to a temp file and rename, so a reader never sees half a file
        fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=".upload-")
        try:
            with os.fdopen(fd, "wb") as f:
                f.write(data)
            os.replace(tmp, path)
        except BaseException:
            Path(tmp).unlink(missing_ok=True)
            raise

    def get(self, key: str) -> bytes:
        return self._path(key).read_bytes()

    def delete(self, key: str) -> None:
        path = self._path(key)
        path.unlink(missing_ok=True)
        # Drop the now-empty {org_id}/{doc_id} directories, never the root
        for parent in path.parents:
            if parent == self.root or not parent.is_relative_to(self.root):
                break
            try:
                parent.rmdir()
            except OSError:
                break


class S3Storage:
    def __init__(self, settings: Settings, client=None):
        self.bucket = settings.s3_bucket
        if client is None:
            import boto3

            client = boto3.client(
                "s3",
                endpoint_url=settings.s3_endpoint or None,
                region_name=settings.s3_region,
                aws_access_key_id=settings.s3_access_key.get_secret_value() if settings.s3_access_key else None,
                aws_secret_access_key=(settings.s3_secret_key.get_secret_value() if settings.s3_secret_key else None),
            )
        self.client = client

    def put(self, key: str, data: bytes, content_type: str) -> None:
        self.client.put_object(Bucket=self.bucket, Key=check_key(key), Body=data, ContentType=content_type)

    def get(self, key: str) -> bytes:
        return self.client.get_object(Bucket=self.bucket, Key=check_key(key))["Body"].read()

    def delete(self, key: str) -> None:
        # S3 DeleteObject succeeds for keys that do not exist
        self.client.delete_object(Bucket=self.bucket, Key=check_key(key))


def get_storage(settings: Settings | None = None) -> Storage:
    s = settings or get_settings()
    if s.storage_backend == "s3":
        return S3Storage(s)
    return LocalStorage(s.local_storage_dir)
