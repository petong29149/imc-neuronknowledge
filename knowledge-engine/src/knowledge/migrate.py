"""Prepare Postgres and Qdrant: `python -m knowledge.migrate` (the compose `migrate` service).

1. Create the engine schema and apply migrations/*.sql in filename order, recording
   each in schema_migrations. Runs in one transaction under an advisory lock, so two
   migrate runs never interleave.
2. ensure_collection() in Qdrant.

Safe to run any number of times.
"""

import logging
import os
from pathlib import Path

from psycopg import sql

from knowledge import db, vector_store
from knowledge.config import Settings, get_settings, redact_url, setup_logging

log = logging.getLogger("knowledge.migrate")

MIGRATIONS_DIR = Path(os.environ.get("MIGRATIONS_DIR", Path(__file__).resolve().parents[2] / "migrations"))


def run_sql_migrations(settings: Settings, migrations_dir: Path = MIGRATIONS_DIR) -> list[str]:
    """Apply pending migrations; returns the filenames applied by this call."""
    files = sorted(migrations_dir.glob("*.sql"))
    if not files:
        raise RuntimeError(f"no migrations found in {migrations_dir}")

    schema = sql.Identifier(settings.postgres_schema)
    applied: list[str] = []
    with db.connect(settings) as conn:
        conn.execute(
            "SELECT pg_advisory_xact_lock(hashtext(%s))",
            (f"knowledge-migrate:{settings.postgres_schema}",),
        )
        conn.execute(sql.SQL("CREATE SCHEMA IF NOT EXISTS {}").format(schema))
        conn.execute(sql.SQL("SET LOCAL search_path TO {}").format(schema))
        conn.execute(
            """CREATE TABLE IF NOT EXISTS schema_migrations (
                 filename   TEXT PRIMARY KEY,
                 applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
               )"""
        )
        done = {row["filename"] for row in conn.execute("SELECT filename FROM schema_migrations")}
        for path in files:
            if path.name in done:
                continue
            conn.execute(path.read_text("utf-8"))
            conn.execute("INSERT INTO schema_migrations (filename) VALUES (%s)", (path.name,))
            applied.append(path.name)
    return applied


def main() -> None:
    setup_logging()
    settings = get_settings()

    applied = run_sql_migrations(settings)
    log.info(
        "postgres %s schema %s: %s",
        redact_url(settings.postgres_url),
        settings.postgres_schema,
        f"applied {', '.join(applied)}" if applied else "up to date",
    )

    client = vector_store.get_client(settings)
    created = vector_store.ensure_collection(client, settings.qdrant_collection)
    log.info("qdrant collection %s: %s", settings.qdrant_collection, "created" if created else "up to date")


if __name__ == "__main__":
    main()
