"""Postgres access (psycopg 3). Every connection is pinned to the engine schema,
so queries name tables without a schema prefix and never touch the app's `public` tables."""

import psycopg
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from knowledge.config import Settings, get_settings


def _connect_kwargs(s: Settings) -> dict:
    return {
        "row_factory": dict_row,
        # postgres_schema is validated as a plain identifier in config.py
        "options": f"-c search_path={s.postgres_schema}",
        "connect_timeout": 10,
    }


def connect(settings: Settings | None = None, *, autocommit: bool = False) -> psycopg.Connection:
    s = settings or get_settings()
    return psycopg.connect(s.postgres_url, autocommit=autocommit, **_connect_kwargs(s))


def make_pool(settings: Settings | None = None, *, max_size: int = 10) -> ConnectionPool:
    """Pool for long-running services (api). `with pool.connection() as conn:` commits on
    success and rolls back on error."""
    s = settings or get_settings()
    return ConnectionPool(
        s.postgres_url,
        min_size=1,
        max_size=max_size,
        kwargs=_connect_kwargs(s),
        open=True,
        name="knowledge",
    )


def ping(settings: Settings | None = None) -> None:
    """Raise if the database is unreachable."""
    with connect(settings, autocommit=True) as conn:
        conn.execute("SELECT 1")
