"""Rows for worker/pipeline tests."""

from knowledge import db
from knowledge.config import Settings


def insert_document(settings: Settings, *, org_id="acme", status="uploaded", storage_path=None, jobs=("index",)):
    """A document row plus queued jobs, as the API would create them. Returns the doc id."""
    with db.connect(settings) as conn:
        doc_id = conn.execute(
            """INSERT INTO documents (org_id, filename, file_type, storage_path, file_hash, description, status)
               VALUES (%s, 'a.txt', 'txt', %s, gen_random_uuid()::text, 'เอกสารสำหรับทดสอบ', %s)
               RETURNING id""",
            (org_id, storage_path or "unused", status),
        ).fetchone()["id"]
        for kind in jobs:
            conn.execute("INSERT INTO ingestion_jobs (doc_id, kind) VALUES (%s, %s)", (doc_id, kind))
    return doc_id
