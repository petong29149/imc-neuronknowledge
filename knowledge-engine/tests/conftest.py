"""Integration tests use their own Postgres schema and Qdrant collection (default
`knowledge_test`), created and dropped by the tests — never the real ones."""

import os

import pytest
from psycopg import sql

from knowledge import db, vector_store
from knowledge.config import Settings
from knowledge.migrate import run_sql_migrations

TEST_NAME = os.environ.get("TEST_KNOWLEDGE_NAMESPACE", "knowledge_test")


@pytest.fixture(scope="session")
def test_settings() -> Settings:
    base = Settings()
    if TEST_NAME in (base.postgres_schema, base.qdrant_collection):
        pytest.exit(f"TEST_KNOWLEDGE_NAMESPACE must differ from the real schema/collection ({TEST_NAME!r})")
    return base.model_copy(update={"postgres_schema": TEST_NAME, "qdrant_collection": TEST_NAME})


@pytest.fixture
def clean_schema(test_settings: Settings):
    def drop():
        with db.connect(test_settings, autocommit=True) as conn:
            conn.execute(sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(TEST_NAME)))

    drop()
    yield test_settings
    drop()


@pytest.fixture
def migrated(clean_schema: Settings) -> Settings:
    run_sql_migrations(clean_schema)
    return clean_schema


@pytest.fixture
def qdrant(test_settings: Settings):
    client = vector_store.get_client(test_settings)
    client.delete_collection(TEST_NAME)
    yield client
    client.delete_collection(TEST_NAME)
    client.close()
