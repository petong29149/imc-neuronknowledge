"""T9: API keys, org-scoped search, and the MCP server over real HTTP (JSON-RPC)."""

import json
import uuid

import pytest
from fastapi.testclient import TestClient

from knowledge import api_keys, db, search
from knowledge.mcp_server import Services, build_app
from knowledge.vector_store import ensure_collection
from tests.fixtures.embedder import FakeEmbedder
from tests.fixtures.search import QUESTION, add_doc, run_search

pytestmark = pytest.mark.integration


@pytest.fixture
def env(migrated, qdrant):
    ensure_collection(qdrant, migrated.qdrant_collection)
    return migrated, qdrant


# --------------------------------------------------------------------------- API keys


def test_keys_store_only_a_hash_and_map_to_one_org(migrated):
    key = api_keys.create_key(migrated, "acme", "app")
    assert key.startswith("kn_") and len(key) > 40
    with db.connect(migrated) as conn:
        row = conn.execute("SELECT key_hash, org_id, label FROM api_keys").fetchone()
    assert row == {"key_hash": api_keys.hash_key(key), "org_id": "acme", "label": "app"}
    assert key not in json.dumps(api_keys.list_keys(migrated), default=str)

    resolver = api_keys.KeyResolver(migrated)
    assert resolver.org_for(key) == "acme"
    assert resolver.org_for("kn_wrong") is None
    assert resolver.org_for(None) is None


def test_revoked_key_stops_working(migrated):
    key = api_keys.create_key(migrated, "acme")
    assert api_keys.revoke_key(migrated, key) is True
    assert api_keys.KeyResolver(migrated).org_for(key) is None
    assert api_keys.revoke_key(migrated, "kn_unknown") is False


@pytest.mark.parametrize("org", ["", "ACME", "a", "../x", "acme corp"])
def test_key_needs_a_valid_org_id(migrated, org):
    with pytest.raises(ValueError):
        api_keys.create_key(migrated, org)


@pytest.mark.parametrize(
    ("header", "token"),
    [
        ("Bearer kn_abc", "kn_abc"),
        ("bearer  kn_abc ", "kn_abc"),
        ("Basic kn_abc", None),
        ("Bearer", None),
        (None, None),
    ],
)
def test_bearer_token(header, token):
    assert api_keys.bearer_token(header) == token


# --------------------------------------------------------------------------- search functions


def test_search_only_returns_the_callers_org(env):
    settings, qdrant = env
    mine = add_doc(settings, qdrant, "acme", ["ลาพักร้อนได้ปีละสิบวัน", "ลาป่วยได้ตามจริง"], match="ลาพักร้อนได้ปีละสิบวัน")
    add_doc(settings, qdrant, "beta", ["ข้อมูลลับของ beta ลาพักร้อนสามสิบวัน"], match="ข้อมูลลับของ beta ลาพักร้อนสามสิบวัน")

    for mode in ("hybrid", "dense", "sparse"):
        hits = run_search(settings, qdrant, "acme", top_k=10, mode=mode)
        assert {h.doc_id for h in hits} == {mine}, mode
        assert hits[0].text == "ลาพักร้อนได้ปีละสิบวัน"
        assert hits[0].citation == "policy.pdf, หน้า 1"
        assert all("beta" not in h.text for h in hits)
    [best] = run_search(settings, qdrant, "acme", top_k=1, mode="dense")
    assert best.score == pytest.approx(1.0, abs=1e-3)  # dense scores are cosine similarities


def test_search_filters_and_limits(env):
    settings, qdrant = env
    hr = add_doc(settings, qdrant, "acme", ["นโยบายการลา"], tags=("HR",))
    sales = add_doc(settings, qdrant, "acme", ["ราคาสินค้า"], tags=("Sales",))
    assert {h.doc_id for h in run_search(settings, qdrant, "acme", tags=["Sales"])} == {sales}
    assert {h.doc_id for h in run_search(settings, qdrant, "acme", doc_ids=[hr])} == {hr}
    assert len(run_search(settings, qdrant, "acme", top_k=1)) == 1
    assert len(run_search(settings, qdrant, "acme", top_k=999)) == 2  # clamped, never above MAX_TOP_K
    assert run_search(settings, qdrant, "acme", query="   ") == []


def test_every_query_needs_an_org(env):
    settings, qdrant = env
    with pytest.raises(ValueError):
        run_search(settings, qdrant, "")
    with pytest.raises(ValueError):
        search.list_documents(settings, "")


def test_list_documents_shows_only_indexed_docs_of_the_org(env):
    settings, qdrant = env
    ready = add_doc(settings, qdrant, "acme", ["a"], filename="ready.pdf")
    add_doc(settings, qdrant, "acme", ["b"], filename="processing.pdf", status="embedding")
    add_doc(settings, qdrant, "beta", ["c"], filename="other-org.pdf")
    docs = search.list_documents(settings, "acme")
    assert [d["doc_id"] for d in docs] == [ready]
    assert docs[0]["filename"] == "ready.pdf" and docs[0]["tags"] == ["HR"]
    assert search.list_documents(settings, "acme", tags=["Sales"]) == []


def test_get_document_chunk_window_and_org_check(env):
    settings, qdrant = env
    doc = add_doc(settings, qdrant, "acme", [f"ชิ้นที่ {i}" for i in range(6)])
    chunks = search.get_document_chunk(
        settings=settings, qdrant=qdrant, org_id="acme", doc_id=doc, chunk_index=2, window=1
    )
    assert [c.chunk_index for c in chunks] == [1, 2, 3]
    edge = search.get_document_chunk(
        settings=settings, qdrant=qdrant, org_id="acme", doc_id=doc, chunk_index=0, window=9
    )
    assert [c.chunk_index for c in edge] == [0, 1, 2, 3]  # window capped at 3
    # point ids come from doc_id alone: another org asking for the same doc_id gets nothing
    assert search.get_document_chunk(settings=settings, qdrant=qdrant, org_id="beta", doc_id=doc, chunk_index=2) == []
    assert (
        search.get_document_chunk(settings=settings, qdrant=qdrant, org_id="acme", doc_id="nope", chunk_index=0) == []
    )
    missing = str(uuid.uuid4())
    assert (
        search.get_document_chunk(settings=settings, qdrant=qdrant, org_id="acme", doc_id=missing, chunk_index=0) == []
    )


# --------------------------------------------------------------------------- MCP over HTTP


@pytest.fixture
def mcp_http(env):
    settings, qdrant = env
    with TestClient(build_app(Services(settings, embedder=FakeEmbedder()))) as client:
        yield client, settings, qdrant


def rpc(client, key, method, params=None, req_id=1):
    headers = {"Accept": "application/json, text/event-stream", "Content-Type": "application/json"}
    if key is not None:
        headers["Authorization"] = f"Bearer {key}"
    body = {"jsonrpc": "2.0", "id": req_id, "method": method, "params": params or {}}
    return client.post("/mcp", headers=headers, json=body)


def call_tool(client, key, name, arguments):
    res = rpc(client, key, "tools/call", {"name": name, "arguments": arguments})
    assert res.status_code == 200, res.text
    result = res.json()["result"]
    text = result["content"][0]["text"] if result.get("content") else ""
    return result.get("isError", False), text


INIT = {"protocolVersion": "2025-06-18", "capabilities": {}, "clientInfo": {"name": "test", "version": "0"}}


@pytest.mark.parametrize("key", [None, "kn_not_a_real_key", ""])
def test_requests_without_a_valid_key_get_401(mcp_http, key):
    client, _, _ = mcp_http
    res = rpc(client, key, "initialize", INIT)
    assert res.status_code == 401
    assert res.headers["www-authenticate"] == "Bearer"
    assert "Bearer" in res.json()["error"]


def test_revoked_key_gets_401(mcp_http):
    client, settings, _ = mcp_http
    key = api_keys.create_key(settings, "acme")
    api_keys.revoke_key(settings, key)
    assert rpc(client, key, "initialize", INIT).status_code == 401


def test_tools_over_http_are_scoped_to_the_keys_org(mcp_http):
    client, settings, qdrant = mcp_http
    acme_key = api_keys.create_key(settings, "acme")
    beta_key = api_keys.create_key(settings, "beta")
    acme_doc = add_doc(settings, qdrant, "acme", ["ลาพักร้อนได้ปีละสิบวัน"], match="ลาพักร้อนได้ปีละสิบวัน")
    beta_doc = add_doc(settings, qdrant, "beta", ["ความลับของ beta"], match="ความลับของ beta")

    init = rpc(client, acme_key, "initialize", INIT)
    assert init.status_code == 200
    assert init.json()["result"]["serverInfo"]["name"] == "knowledge"

    tools = rpc(client, acme_key, "tools/list").json()["result"]["tools"]
    assert {t["name"] for t in tools} == {"search_knowledge", "list_documents", "get_document_chunk"}
    for tool in tools:
        assert "org_id" not in json.dumps(tool["inputSchema"])
    search_tool = next(t for t in tools if t["name"] == "search_knowledge")
    assert "citation" in search_tool["description"] and "อย่าแต่งเอง" in search_tool["description"]

    is_error, text = call_tool(client, acme_key, "search_knowledge", {"query": QUESTION})
    assert not is_error
    results = json.loads(text)["results"]
    assert {r["doc_id"] for r in results} == {acme_doc}
    assert results[0]["citation"] == "policy.pdf, หน้า 1"

    is_error, text = call_tool(client, beta_key, "search_knowledge", {"query": QUESTION})
    assert {r["doc_id"] for r in json.loads(text)["results"]} == {beta_doc}

    is_error, text = call_tool(client, acme_key, "list_documents", {})
    assert [d["doc_id"] for d in json.loads(text)["documents"]] == [acme_doc]

    # beta's key cannot read acme's chunk, even with the exact doc_id
    is_error, text = call_tool(client, beta_key, "get_document_chunk", {"doc_id": acme_doc, "chunk_index": 0})
    assert is_error and "ไม่พบ" in text
    is_error, text = call_tool(client, acme_key, "get_document_chunk", {"doc_id": acme_doc, "chunk_index": 0})
    assert not is_error and json.loads(text)["chunks"][0]["text"] == "ลาพักร้อนได้ปีละสิบวัน"

    # an org_id smuggled into the arguments is ignored, not obeyed
    is_error, text = call_tool(client, beta_key, "search_knowledge", {"query": QUESTION, "org_id": "acme"})
    assert acme_doc not in text


def test_search_without_openai_uses_bm25_or_says_why(env):
    settings, qdrant = env
    no_key = settings.model_copy(update={"openai_api_key": None})
    from knowledge.embedder import OpenAIEmbedder

    doc = add_doc(settings, qdrant, "acme", ["ลาพักร้อนได้ปีละสิบวัน"])
    with TestClient(build_app(Services(no_key, embedder=OpenAIEmbedder(no_key)))) as client:
        key = api_keys.create_key(settings, "acme")
        # T10: embeddings unavailable → the words of the query still find the document (BM25)
        is_error, text = call_tool(client, key, "search_knowledge", {"query": QUESTION})
        assert not is_error and [r["doc_id"] for r in json.loads(text)["results"]] == [doc]
        # a query with only stopwords has nothing for BM25 either: say why
        is_error, text = call_tool(client, key, "search_knowledge", {"query": "และ หรือ the"})
    assert is_error
    assert "OPENAI_API_KEY" in text and "ค้นหาไม่สำเร็จ" in text


def test_empty_result_says_nothing_was_found(mcp_http):
    client, settings, _ = mcp_http
    key = api_keys.create_key(settings, "empty-org")
    is_error, text = call_tool(client, key, "search_knowledge", {"query": QUESTION})
    assert not is_error
    assert json.loads(text) == {"results": [], "note": "ไม่พบข้อมูลที่เกี่ยวข้องในคลังความรู้ขององค์กร"}
