import hashlib

import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr

from knowledge import db
from knowledge.api import create_app
from knowledge.file_types import UNSUPPORTED_MESSAGE
from tests.fixtures.files import EXE, THAI, make_docx, make_pdf, make_pptx

pytestmark = pytest.mark.integration

TOKEN = "t" * 48
DESCRIPTION = "คู่มือนโยบายการลาของพนักงาน ปี 2567"
# PyMuPDF stamps a unique ID into every new PDF, so reuse one for duplicate checks
PDF = make_pdf()


@pytest.fixture
def settings(migrated, tmp_path):
    return migrated.model_copy(
        update={
            "internal_api_token": SecretStr(TOKEN),
            "storage_backend": "local",
            "local_storage_dir": str(tmp_path / "files"),
            "max_file_mb": 1,
        }
    )


@pytest.fixture
def client(settings):
    with TestClient(create_app(settings)) as c:
        yield c


def headers(org="acme", token=TOKEN):
    h = {"X-Org-Id": org}
    if token is not None:
        h["Authorization"] = f"Bearer {token}"
    return h


def upload(client, name="policy.pdf", data=None, *, org="acme", description=DESCRIPTION, tags=(), **kw):
    files = {"file": (name, PDF if data is None else data)}
    form = {"description": description, "tags": list(tags)}
    return client.post("/documents", files=files, data=form, headers=kw.pop("hdrs", None) or headers(org))


def fetch(conn, sql, *params):
    return conn.execute(sql, params).fetchall()


# --------------------------------------------------------------------------- upload


@pytest.mark.parametrize(
    ("name", "data", "file_type"),
    [
        ("policy.pdf", make_pdf(), "pdf"),
        ("คู่มือ.docx", make_docx(), "docx"),
        ("deck.pptx", make_pptx(), "pptx"),
        ("notes.txt", THAI.encode("cp874"), "txt"),
        ("readme.md", f"# {THAI}\n\nเนื้อหา".encode(), "md"),
    ],
)
def test_upload_stores_file_and_queues_index_job(client, settings, name, data, file_type):
    res = upload(client, name, data, tags=["HR", " นโยบาย ", "HR", ""])
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["status"] == "uploaded"

    with db.connect(settings) as conn:
        [doc] = fetch(conn, "SELECT * FROM documents WHERE id = %s", body["doc_id"])
        jobs = fetch(conn, "SELECT kind, state FROM ingestion_jobs WHERE doc_id = %s", body["doc_id"])
    assert doc["org_id"] == "acme"
    assert doc["filename"] == name
    assert doc["file_type"] == file_type
    assert doc["size_bytes"] == len(data)
    assert doc["file_hash"] == hashlib.sha256(data).hexdigest()
    assert doc["tags"] == ["HR", "นโยบาย"]
    assert doc["storage_path"] == f"acme/{body['doc_id']}/{name}"
    assert jobs == [{"kind": "index", "state": "queued"}]
    stored = client.app.state.storage.get(doc["storage_path"])
    assert stored == data


def test_unsupported_type_is_415(client):
    res = upload(client, "sheet.xlsx", b"PK\x03\x04whatever")
    assert res.status_code == 415
    assert res.json() == {"error": UNSUPPORTED_MESSAGE}


@pytest.mark.parametrize(("name", "data"), [("virus.pdf", EXE), ("fake.docx", EXE), ("deck.pptx", make_docx())])
def test_renamed_file_is_415(client, settings, name, data):
    res = upload(client, name, data)
    assert res.status_code == 415
    assert "ไม่ตรงกับนามสกุล" in res.json()["error"]
    with db.connect(settings) as conn:
        assert fetch(conn, "SELECT id FROM documents") == []


def test_duplicate_in_same_org_is_409_with_existing_doc_id(client):
    first = upload(client).json()["doc_id"]
    res = upload(client, "renamed-copy.pdf")
    assert res.status_code == 409
    assert res.json() == {"error": "ไฟล์นี้เคยอัปโหลดแล้ว", "doc_id": first}


def test_same_file_in_another_org_is_allowed(client):
    assert upload(client, org="acme").status_code == 201
    assert upload(client, org="other-org").status_code == 201


@pytest.mark.parametrize("description", ["", "   ", "สั้นไป", None])
def test_description_is_required(client, description):
    files = {"file": ("a.pdf", make_pdf())}
    form = {} if description is None else {"description": description}
    res = client.post("/documents", files=files, data=form, headers=headers())
    assert res.status_code == 400
    assert "คำอธิบาย" in res.json()["error"]


def test_missing_and_empty_file_are_400(client):
    assert client.post("/documents", data={"description": DESCRIPTION}, headers=headers()).status_code == 400
    assert upload(client, "empty.txt", b"").json() == {"error": "ไฟล์ว่างเปล่า"}


def test_file_over_limit_is_413(client):
    res = upload(client, "big.txt", b"a" * (1024 * 1024 + 1))  # MAX_FILE_MB=1 in these tests
    assert res.status_code == 413
    assert res.json() == {"error": "ไฟล์มีขนาดเกิน 1 MB"}


def test_filename_cannot_escape_storage_path(client, settings):
    res = upload(client, "../../etc/passwd.txt", b"root:x:0:0")
    assert res.status_code == 201
    with db.connect(settings) as conn:
        [doc] = fetch(conn, "SELECT filename, storage_path FROM documents")
    assert doc["filename"] == "passwd.txt"
    assert doc["storage_path"] == f"acme/{res.json()['doc_id']}/passwd.txt"


def test_too_many_tags_is_400(client):
    assert upload(client, tags=[f"t{i}" for i in range(21)]).status_code == 400


# --------------------------------------------------------------------------- auth


def test_healthz_needs_no_auth(client):
    assert client.get("/healthz").json() == {"status": "ok"}


@pytest.mark.parametrize("token", [None, "wrong-token", TOKEN + "x", ""])
def test_bad_token_is_401(client, token):
    res = client.get("/documents", headers=headers(token=token))
    assert res.status_code == 401
    assert res.headers["www-authenticate"] == "Bearer"
    assert upload(client, hdrs=headers(token=token)).status_code == 401


@pytest.mark.parametrize("org", ["", "ACME", "a", "../acme", "acme/x", "-acme"])
def test_missing_or_invalid_org_is_400(client, org):
    res = client.get("/documents", headers={"Authorization": f"Bearer {TOKEN}", "X-Org-Id": org})
    assert res.status_code == 400
    assert res.json() == {"error": "ต้องระบุ X-Org-Id ที่ถูกต้อง"}


def test_org_cannot_be_set_from_query_or_body(client):
    res = client.post(
        "/documents?org_id=evil",
        files={"file": ("a.pdf", make_pdf())},
        data={"description": DESCRIPTION, "org_id": "evil"},
        headers=headers("acme"),
    )
    doc_id = res.json()["doc_id"]
    assert client.get(f"/documents/{doc_id}", headers=headers("evil")).status_code == 404
    assert client.get(f"/documents/{doc_id}", headers=headers("acme")).status_code == 200


# --------------------------------------------------------------------------- read / isolation


def test_org_cannot_see_or_change_another_orgs_documents(client):
    doc_id = upload(client, org="acme").json()["doc_id"]
    other = headers("other-org")
    assert client.get("/documents", headers=other).json() == {"documents": []}
    assert client.get(f"/documents/{doc_id}", headers=other).status_code == 404
    assert client.post(f"/documents/{doc_id}/reindex", headers=other).status_code == 404
    assert client.delete(f"/documents/{doc_id}", headers=other).status_code == 404
    # still intact for its owner
    assert client.get(f"/documents/{doc_id}", headers=headers("acme")).json()["pending_job"] == "index"


def test_get_document(client):
    doc_id = upload(client, tags=["HR"]).json()["doc_id"]
    doc = client.get(f"/documents/{doc_id}", headers=headers()).json()
    assert doc["doc_id"] == doc_id
    assert doc["filename"] == "policy.pdf"
    assert doc["status"] == "uploaded"
    assert doc["tags"] == ["HR"]
    assert {"quality_flag", "error", "chunk_count", "page_count", "metadata", "created_at"} <= set(doc)
    assert doc["metadata"] == {}
    assert client.get("/documents/not-a-uuid", headers=headers()).status_code == 404


def test_list_filters(client, settings):
    hr = upload(client, "hr.pdf", make_pdf("hr"), tags=["HR"]).json()["doc_id"]
    sales = upload(client, "sales.pdf", make_pdf("sales"), tags=["Sales"]).json()["doc_id"]
    with db.connect(settings) as conn:
        conn.execute("UPDATE documents SET status = 'indexed' WHERE id = %s", (sales,))

    def ids(**params):
        res = client.get("/documents", params=params, headers=headers())
        return {d["doc_id"] for d in res.json()["documents"]}

    assert ids() == {hr, sales}
    assert ids(tag="HR") == {hr}
    assert ids(status="indexed") == {sales}
    assert client.get("/documents", params={"status": "bogus"}, headers=headers()).status_code == 400
    assert client.get("/documents", params={"limit": 0}, headers=headers()).status_code == 400


# --------------------------------------------------------------------------- reindex / delete


def jobs_of(settings, doc_id):
    with db.connect(settings) as conn:
        return fetch(conn, "SELECT id, kind, state FROM ingestion_jobs WHERE doc_id = %s ORDER BY id", doc_id)


def test_reindex_reuses_a_queued_job_and_queues_one_otherwise(client, settings):
    doc_id = upload(client).json()["doc_id"]
    [index_job] = jobs_of(settings, doc_id)
    res = client.post(f"/documents/{doc_id}/reindex", headers=headers())
    assert res.status_code == 202
    assert res.json() == {"doc_id": doc_id, "job_id": index_job["id"], "kind": "index"}

    with db.connect(settings) as conn:
        conn.execute("UPDATE ingestion_jobs SET state = 'done' WHERE doc_id = %s", (doc_id,))
    first = client.post(f"/documents/{doc_id}/reindex", headers=headers()).json()
    second = client.post(f"/documents/{doc_id}/reindex", headers=headers()).json()
    assert first["kind"] == "reindex"
    assert second == first
    assert [j["kind"] for j in jobs_of(settings, doc_id)] == ["index", "reindex"]


def test_delete_queues_delete_and_drops_pending_index(client, settings):
    doc_id = upload(client).json()["doc_id"]
    res = client.delete(f"/documents/{doc_id}", headers=headers())
    assert res.status_code == 202
    assert res.json()["kind"] == "delete"
    assert [(j["kind"], j["state"]) for j in jobs_of(settings, doc_id)] == [("delete", "queued")]
    # deleting again is idempotent; reindex is refused while the delete is pending
    assert client.delete(f"/documents/{doc_id}", headers=headers()).json() == res.json()
    assert client.post(f"/documents/{doc_id}/reindex", headers=headers()).status_code == 409
    assert client.get(f"/documents/{doc_id}", headers=headers()).json()["pending_job"] == "delete"


def test_deleted_document_is_gone_and_can_be_uploaded_again(client, settings):
    doc_id = upload(client).json()["doc_id"]
    with db.connect(settings) as conn:  # what the worker does once the delete job ran
        conn.execute("UPDATE documents SET status = 'deleted' WHERE id = %s", (doc_id,))
    assert client.get("/documents", headers=headers()).json() == {"documents": []}
    assert client.delete(f"/documents/{doc_id}", headers=headers()).status_code == 404
    assert client.post(f"/documents/{doc_id}/reindex", headers=headers()).status_code == 404

    res = upload(client)
    assert res.status_code == 201
    assert res.json()["doc_id"] != doc_id


def test_unknown_route_uses_error_shape(client):
    assert client.get("/nope", headers=headers()).json() == {"error": "ไม่พบ endpoint นี้"}


def test_refuses_to_start_without_a_strong_token(settings):
    app = create_app(settings.model_copy(update={"internal_api_token": SecretStr("short")}))
    with pytest.raises(RuntimeError, match="INTERNAL_API_TOKEN"):
        with TestClient(app):
            pass
