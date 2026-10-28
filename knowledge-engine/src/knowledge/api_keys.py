"""MCP API keys (plan T9): one key ↔ one org_id. Only the SHA-256 of a key is stored; the key
itself is printed once when it is created and never again."""

import hashlib
import re
import secrets
import threading
import time

from knowledge import db
from knowledge.config import Settings

KEY_PREFIX = "kn_"
ORG_ID = re.compile(r"^[a-z0-9][a-z0-9_-]{1,62}$")  # same rule as the app's groups.org_id
CACHE_SECONDS = 30  # a revoked key stops working within this long


def hash_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


def bearer_token(authorization: str | None) -> str | None:
    scheme, _, token = (authorization or "").partition(" ")
    token = token.strip()
    return token if scheme.lower() == "bearer" and token else None


def create_key(settings: Settings, org_id: str, label: str | None = None) -> str:
    if not ORG_ID.match(org_id):
        raise ValueError("org_id must be a-z, 0-9, - or _, 2-63 characters, starting with a letter or digit")
    key = KEY_PREFIX + secrets.token_urlsafe(32)
    with db.connect(settings) as conn:
        conn.execute(
            "INSERT INTO api_keys (key_hash, org_id, label) VALUES (%s, %s, %s)",
            (hash_key(key), org_id, label),
        )
    return key


def revoke_key(settings: Settings, key: str) -> bool:
    with db.connect(settings) as conn:
        row = conn.execute(
            "UPDATE api_keys SET revoked = true WHERE key_hash = %s RETURNING org_id", (hash_key(key),)
        ).fetchone()
    return row is not None


def list_keys(settings: Settings, org_id: str | None = None) -> list[dict]:
    with db.connect(settings) as conn:
        return conn.execute(
            """SELECT org_id, label, revoked, created_at, left(key_hash, 12) AS hash_prefix FROM api_keys
               WHERE %s::text IS NULL OR org_id = %s ORDER BY org_id, created_at""",
            (org_id, org_id),
        ).fetchall()


class KeyResolver:
    """org_id for a key, cached briefly so every MCP request does not hit Postgres."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self._cache: dict[str, tuple[float, str | None]] = {}
        self._lock = threading.Lock()

    def org_for(self, key: str | None) -> str | None:
        if not key:
            return None
        digest = hash_key(key)
        now = time.monotonic()
        with self._lock:
            hit = self._cache.get(digest)
            if hit and now - hit[0] < CACHE_SECONDS:
                return hit[1]
        with db.connect(self.settings) as conn:
            row = conn.execute("SELECT org_id FROM api_keys WHERE key_hash = %s AND NOT revoked", (digest,)).fetchone()
        org_id = row["org_id"] if row else None
        with self._lock:
            self._cache[digest] = (now, org_id)
        return org_id
