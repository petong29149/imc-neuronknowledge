import psycopg
import pytest

from knowledge import db
from knowledge.migrate import run_sql_migrations

pytestmark = pytest.mark.integration

ENGINE_TABLES = {"documents", "ingestion_jobs", "api_keys", "schema_migrations"}


def tables_in(conn, schema: str) -> set[str]:
    rows = conn.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = %s", (schema,))
    return {r["table_name"] for r in rows}


def test_creates_engine_tables_in_own_schema(clean_schema):
    applied = run_sql_migrations(clean_schema)
    assert applied == ["001_init.sql", "002_document_metadata.sql", "003_ocr.sql"]
    with db.connect(clean_schema) as conn:
        assert tables_in(conn, clean_schema.postgres_schema) == ENGINE_TABLES


def test_is_idempotent(clean_schema):
    run_sql_migrations(clean_schema)
    assert run_sql_migrations(clean_schema) == []
    with db.connect(clean_schema) as conn:
        assert conn.execute("SELECT count(*) AS n FROM schema_migrations").fetchone()["n"] == 3


def test_connections_resolve_to_engine_schema(clean_schema):
    run_sql_migrations(clean_schema)
    with db.connect(clean_schema) as conn:
        doc = conn.execute(
            """INSERT INTO documents (org_id, filename, file_type, storage_path, file_hash, description)
               VALUES ('acme', 'a.pdf', 'pdf', 'acme/x/a.pdf', 'h1', 'คู่มือทดสอบระบบ') RETURNING id, status"""
        ).fetchone()
        assert doc["status"] == "uploaded"
        job = conn.execute(
            "INSERT INTO ingestion_jobs (doc_id) VALUES (%s) RETURNING state, kind, attempts", (doc["id"],)
        ).fetchone()
        assert (job["state"], job["kind"], job["attempts"]) == ("queued", "index", 0)


def test_constraints(clean_schema):
    run_sql_migrations(clean_schema)
    insert = """INSERT INTO documents (org_id, filename, file_type, storage_path, file_hash, description)
                VALUES (%s, 'f', %s, 'p', %s, 'd')"""
    with db.connect(clean_schema) as conn:
        with pytest.raises(psycopg.errors.CheckViolation):
            conn.execute(insert, ("acme", "exe", "h"))
    with db.connect(clean_schema) as conn:
        conn.execute(insert, ("acme", "pdf", "same-hash"))
        conn.execute(insert, ("other-org", "pdf", "same-hash"))  # same file in another org is fine
        with pytest.raises(psycopg.errors.UniqueViolation):
            conn.execute(insert, ("acme", "pdf", "same-hash"))
