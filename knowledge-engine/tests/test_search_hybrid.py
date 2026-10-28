"""T10: hybrid search (dense + BM25 → RRF), its fallbacks, and rerank."""

import json
import sys

import pytest
from fastapi.testclient import TestClient

from knowledge import api_keys, search
from knowledge.errors import TransientError
from knowledge.mcp_server import Services, build_app
from knowledge.rerank import CrossEncoderReranker, load_reranker
from knowledge.search import Hit
from knowledge.vector_store import ensure_collection
from tests.fixtures.embedder import FakeEmbedder
from tests.fixtures.search import WordReranker, add_doc, run_search

CODE_QUERY = "แบบฟอร์ม KNOW-07 ใช้ทำอะไร"
TARGET = "แบบฟอร์ม KNOW-07 ใช้ขอเบิกค่าเดินทางไปต่างจังหวัด"
DISTRACTOR = "นโยบายการทำงานจากที่บ้านสำหรับพนักงานประจำ"  # what the dense vector points at
OTHERS = ["สวัสดิการประกันสุขภาพกลุ่ม", "วันหยุดประจำปีของบริษัท", "ขั้นตอนการขออนุมัติจัดซื้อ"]


@pytest.fixture
def env(migrated, qdrant):
    ensure_collection(qdrant, migrated.qdrant_collection)
    return migrated, qdrant


@pytest.fixture
def code_doc(env):
    """A form code the dense vector misses: the query's vector matches DISTRACTOR instead —
    what an embedding model does with a code it has never seen."""
    settings, qdrant = env
    return add_doc(settings, qdrant, "acme", [DISTRACTOR, TARGET, *OTHERS], match=DISTRACTOR, query=CODE_QUERY)


def failing_embedder():
    def fail(_texts):
        raise TransientError("OPENAI_API_KEY is not set")

    return FakeEmbedder(on_embed=fail)


# --------------------------------------------------------------------------- hybrid


@pytest.mark.integration
def test_hybrid_finds_a_code_that_dense_misses(env, code_doc):
    settings, qdrant = env
    [dense] = run_search(settings, qdrant, "acme", query=CODE_QUERY, top_k=1, mode="dense")
    assert dense.text == DISTRACTOR

    [hybrid] = run_search(settings, qdrant, "acme", query=CODE_QUERY, top_k=1)
    assert hybrid.text == TARGET and hybrid.doc_id == code_doc
    [sparse] = run_search(settings, qdrant, "acme", query=CODE_QUERY, top_k=1, mode="sparse")
    assert sparse.text == TARGET
    # lowercase and without the surrounding words: same BM25 term
    assert run_search(settings, qdrant, "acme", query="know-07", top_k=1)[0].text == TARGET


@pytest.mark.integration
def test_hybrid_keeps_the_dense_match_for_a_meaning_query(env):
    settings, qdrant = env
    add_doc(settings, qdrant, "acme", ["พนักงานลาหยุดพักผ่อนได้ปีละสิบวันทำการ", *OTHERS],
            match="พนักงานลาหยุดพักผ่อนได้ปีละสิบวันทำการ", query="ขอวันพักร้อนได้เท่าไร")  # fmt: skip
    hits = run_search(settings, qdrant, "acme", query="ขอวันพักร้อนได้เท่าไร", top_k=3)
    assert hits[0].text == "พนักงานลาหยุดพักผ่อนได้ปีละสิบวันทำการ"


@pytest.mark.integration
def test_hybrid_stays_inside_the_org_and_filters(env, code_doc):
    settings, qdrant = env
    beta = add_doc(settings, qdrant, "beta", [TARGET])  # the same words in another org
    sales = add_doc(settings, qdrant, "acme", ["ใบเสนอราคา KNOW-07 ฝ่ายขาย"], tags=("Sales",))

    acme = run_search(settings, qdrant, "acme", query=CODE_QUERY, top_k=20)
    assert beta not in {h.doc_id for h in acme}
    assert {h.doc_id for h in acme} == {code_doc, sales}
    assert {h.doc_id for h in run_search(settings, qdrant, "beta", query=CODE_QUERY, top_k=20)} == {beta}
    # tags / doc_ids apply to both the dense and the BM25 side
    assert {h.doc_id for h in run_search(settings, qdrant, "acme", query=CODE_QUERY, tags=["Sales"])} == {sales}
    assert {h.doc_id for h in run_search(settings, qdrant, "acme", query=CODE_QUERY, doc_ids=[code_doc])} == {code_doc}


@pytest.mark.integration
def test_query_without_bm25_terms_falls_back_to_dense(env):
    settings, qdrant = env
    stopwords_only = "และ หรือ the of"
    add_doc(settings, qdrant, "acme", OTHERS, match=OTHERS[1], query=stopwords_only)
    hits = run_search(settings, qdrant, "acme", query=stopwords_only, top_k=1)
    assert [h.text for h in hits] == [OTHERS[1]]
    assert run_search(settings, qdrant, "acme", query=stopwords_only, mode="sparse") == []


@pytest.mark.integration
def test_embeddings_down_falls_back_to_bm25(env, code_doc):
    settings, qdrant = env
    embedder = failing_embedder()
    [hit] = run_search(settings, qdrant, "acme", query=CODE_QUERY, top_k=1, embedder=embedder)
    assert hit.text == TARGET
    with pytest.raises(TransientError):
        run_search(settings, qdrant, "acme", query=CODE_QUERY, mode="dense", embedder=embedder)
    with pytest.raises(TransientError):  # nothing to fall back on
        run_search(settings, qdrant, "acme", query="และ หรือ", embedder=embedder)
    # sparse mode never calls the embedder
    assert run_search(settings, qdrant, "acme", query=CODE_QUERY, mode="sparse", embedder=embedder)


# --------------------------------------------------------------------------- rerank


@pytest.mark.integration
def test_rerank_sees_candidates_and_reorders(env):
    settings, qdrant = env
    texts = [f"หัวข้อทั่วไปลำดับที่ {i}" for i in range(24)] + ["ค่าเดินทาง KNOW-07 เบิกได้ทันที"]
    add_doc(settings, qdrant, "acme", texts, match=texts[0], query="ค่าเดินทาง KNOW-07")
    reranker = WordReranker()
    hits = run_search(settings, qdrant, "acme", query="ค่าเดินทาง KNOW-07", top_k=3, reranker=reranker)
    assert reranker.seen == [search.RERANK_CANDIDATES]  # more than top_k, so rerank can promote
    assert len(hits) == 3
    assert hits[0].text == "ค่าเดินทาง KNOW-07 เบิกได้ทันที" and hits[0].score == 2.0
    assert [h.score for h in hits] == sorted((h.score for h in hits), reverse=True)


@pytest.mark.integration
def test_mcp_search_is_hybrid_and_reranked(env, code_doc):
    settings, qdrant = env
    reranker = WordReranker()
    with TestClient(build_app(Services(settings, embedder=FakeEmbedder(), reranker=reranker))) as client:
        key = api_keys.create_key(settings, "acme")
        headers = {
            "Accept": "application/json, text/event-stream",
            "Authorization": f"Bearer {key}",
        }
        body = {
            "jsonrpc": "2.0", "id": 1, "method": "tools/call",
            "params": {"name": "search_knowledge", "arguments": {"query": CODE_QUERY, "top_k": 1}},
        }  # fmt: skip
        res = client.post("/mcp", headers=headers, json=body)
    [result] = json.loads(res.json()["result"]["content"][0]["text"])["results"]
    assert result["text"] == TARGET
    assert reranker.seen == [len(OTHERS) + 2]  # every chunk of the org: fewer than RERANK_CANDIDATES


class FakeCrossEncoder:
    def __init__(self, scores):
        self.scores = scores
        self.pairs = None

    def predict(self, pairs, show_progress_bar=False):
        self.pairs = pairs
        return self.scores


def hit(text, score):
    return Hit(text=text, citation="a.pdf", filename="a.pdf", doc_id="d", chunk_index=0, score=score)


def test_cross_encoder_reranker_reorders_with_its_own_scores():
    model = FakeCrossEncoder([0.1, 0.9, 0.5])
    hits = CrossEncoderReranker(model).rerank("คำถาม", [hit("a", 3), hit("b", 2), hit("c", 1)])
    assert model.pairs == [("คำถาม", "a"), ("คำถาม", "b"), ("คำถาม", "c")]
    assert [(h.text, h.score) for h in hits] == [("b", 0.9), ("c", 0.5), ("a", 0.1)]
    assert CrossEncoderReranker(model).rerank("คำถาม", []) == []


def test_load_reranker(test_settings, monkeypatch):
    assert load_reranker(test_settings.model_copy(update={"rerank_enabled": False})) is None
    monkeypatch.setitem(sys.modules, "sentence_transformers", None)  # as in the base image
    with pytest.raises(RuntimeError, match="MCP_TARGET=rerank"):
        load_reranker(test_settings.model_copy(update={"rerank_enabled": True}))


LONG_TEXTS = {
    "thai": "พนักงานที่ปฏิบัติงานครบหนึ่งปีมีสิทธิ์ลาพักผ่อนประจำปีได้ไม่เกินสิบวันทำการ โดยต้องแจ้งผู้บังคับบัญชาล่วงหน้า ",
    "english": "Employees who have completed one year of service may take up to ten working days of annual leave. ",
    "table": "| ลำดับ | รายการ | จำนวน | ราคาต่อหน่วย | รวม |\n| 12 | ค่าเดินทาง KNOW-07 | 3 | 1,250.75 | 3,752.25 |\n",
}


@pytest.mark.parametrize("kind", LONG_TEXTS)
def test_the_largest_chunk_and_a_query_fit_the_reranker(test_settings, kind):
    """RERANK_MAX_LENGTH must hold a CHUNK_MAX_TOKENS chunk (counted with o200k) plus the query,
    counted with the reranker's own tokenizer — otherwise the end of the chunk is never scored.
    Runs where transformers is installed (the rerank images) and the tokenizer can be loaded."""
    transformers = pytest.importorskip("transformers")
    from knowledge.chunker import hard_split

    try:
        tokenizer = transformers.AutoTokenizer.from_pretrained(test_settings.rerank_model)
    except OSError as err:
        pytest.skip(f"reranker tokenizer unavailable: {err}")
    chunk = hard_split(LONG_TEXTS[kind] * 400, test_settings.chunk_max_tokens, test_settings.chunk_encoding)[0]
    query = "พนักงานใหม่ที่ทำงานยังไม่ครบหนึ่งปีลาพักร้อนได้หรือไม่ และต้องแจ้งล่วงหน้ากี่วัน"
    length = len(tokenizer(query, chunk)["input_ids"])
    assert length <= test_settings.rerank_max_length, f"{kind}: {length} tokens"
