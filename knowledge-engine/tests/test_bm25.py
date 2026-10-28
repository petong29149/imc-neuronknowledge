import uuid

import pytest
from qdrant_client import models

from knowledge import bm25
from knowledge.bm25 import Bm25Params, bm25_terms, encode_document, encode_query, is_empty, term_id
from knowledge.vector_store import DENSE_SIZE, DENSE_VECTOR, SPARSE_VECTOR, ensure_collection

PARAMS = Bm25Params(k1=1.2, b=0.75, avgdl=10)

LEAVE = "พนักงานลาพักร้อนได้สูงสุดปีละ ๑๐ วัน ต้องยื่นคำขอล่วงหน้าภายใน ๗ วัน ตามประกาศ ก.พ."
SICK = "พนักงานลาป่วยได้ตามจริง หากลาป่วยเกิน ๓ วันต้องมีใบรับรองแพทย์"
TICKET = "Ticket KNOW-07 covers the MCP search tool and citation format for the Knowledge Engine"


# --------------------------------------------------------------------------- terms


def test_terms_drop_stopwords_symbols_and_single_letters():
    terms = bm25_terms("และ the (ระบบ) , ก ข 5 . NeuronKnowledge ของ การลา")
    assert "และ" not in terms and "the" not in terms and "ของ" not in terms
    assert "," not in terms and "(" not in terms and "." not in terms
    assert "ก" not in terms and "ข" not in terms
    assert "5" in terms and "ระบบ" in terms and "neuronknowledge" in terms


def test_words_that_carry_meaning_are_kept():
    # PyThaiNLP's full stopword list would drop all of these
    terms = bm25_terms("ลาได้สูงสุดกี่วัน ต้องแจ้งภายใน ๗ วัน ทั้งก่อน และ หลัง ปีใหม่")
    assert {"สูงสุด", "วัน", "ภายใน", "ก่อน", "หลัง"} <= set(terms)


def test_terms_keep_term_frequency():
    assert bm25_terms("ลาพักร้อน ลาพักร้อน ลาป่วย").count("ลาพักร้อน") == 2


def test_case_digits_and_spelling_are_normalized():
    assert bm25_terms("Annual LEAVE") == bm25_terms("annual leave")
    assert bm25_terms("พ.ศ. ๒๕๖๗") == bm25_terms("พ.ศ. 2567") == ["พ.ศ.", "2567"]
    assert bm25_terms("เเมว") == bm25_terms("แมว")  # normalize() runs first


def test_code_from_a_pdf_hyphen_matches_typed_code():
    assert bm25_terms(f"KNOW{chr(0x2010)}07") == bm25_terms("KNOW-07") == ["know-07"]


def test_abbreviations_and_codes_are_single_terms():
    terms = bm25_terms("ตามประกาศ ก.พ. และ สป.อว. ตั๋ว KNOW-07 ยา ๕๐๐ มก.")
    assert {"ก.พ.", "สป.อว.", "know-07", "500", "มก."} <= set(terms)


# --------------------------------------------------------------------------- vectors


def test_document_and_query_use_the_same_term_ids():
    for text in (LEAVE, SICK, TICKET):
        doc, query = encode_document(text, PARAMS), encode_query(text)
        assert set(doc.indices) == set(query.indices)
        assert set(doc.indices) == {term_id(t) for t in bm25_terms(text)}


def test_indices_are_unique_and_sorted():
    for vector in (encode_document(LEAVE + LEAVE, PARAMS), encode_query(LEAVE + " " + LEAVE)):
        assert vector.indices == sorted(set(vector.indices))
        assert len(vector.indices) == len(vector.values)


def test_colliding_term_ids_are_merged(monkeypatch):
    monkeypatch.setattr(bm25, "term_id", lambda _term: 42)
    doc = encode_document("ลาพักร้อน ลาป่วย", PARAMS)
    assert doc.indices == [42]
    assert doc.values[0] == pytest.approx(2 * 1 * 2.2 / (1 + 1.2 * (1 - 0.75 + 0.75 * 2 / 10)))
    assert encode_query("ลาพักร้อน ลาป่วย").values == [2.0]


def test_query_values_are_one_per_term():
    query = encode_query("ลาพักร้อน ลาพักร้อน ลาป่วย")
    assert query.values == [1.0, 1.0]


def test_bm25_weights():
    def weight(text, params=PARAMS, term="ลาพักร้อน"):
        vector = encode_document(text, params)
        return dict(zip(vector.indices, vector.values, strict=True))[term_id(term)]

    once, twice = weight("ลาพักร้อน ระบบ"), weight("ลาพักร้อน ลาพักร้อน")
    assert once < twice < PARAMS.k1 + 1  # tf helps, but saturates
    longer = weight("ลาพักร้อน " + "ระบบ " * 20)
    assert longer < once  # same tf in a longer document counts for less
    flat = Bm25Params(k1=1.2, b=0.0, avgdl=10)
    assert weight("ลาพักร้อน ระบบ", flat) == pytest.approx(weight("ลาพักร้อน " + "ระบบ " * 20, flat))
    # exact formula: tf=1, dl=2
    assert once == pytest.approx(1 * 2.2 / (1 + 1.2 * (1 - 0.75 + 0.75 * 2 / 10)))


@pytest.mark.parametrize("text", ["", "   ", "และ ที่ the of , . (", "ก ข ค"])
def test_empty_or_stopword_only_text_gives_empty_vectors(text):
    assert is_empty(encode_document(text, PARAMS))
    assert is_empty(encode_query(text))


# --------------------------------------------------------------------------- Qdrant round trip


@pytest.mark.integration
def test_sparse_search_in_qdrant_finds_exact_terms(qdrant, test_settings):
    name = test_settings.qdrant_collection
    ensure_collection(qdrant, name)
    docs = {"leave": LEAVE, "sick": SICK, "ticket": TICKET}
    points = [
        models.PointStruct(
            id=str(uuid.uuid5(uuid.NAMESPACE_URL, key)),
            vector={DENSE_VECTOR: [0.1] * DENSE_SIZE, SPARSE_VECTOR: encode_document(text, PARAMS)},
            payload={"org_id": "acme", "doc_id": key},
        )
        for key, text in docs.items()
    ]
    # a document with no searchable terms is stored without a sparse vector
    points.append(
        models.PointStruct(
            id=str(uuid.uuid5(uuid.NAMESPACE_URL, "stopwords")),
            vector={DENSE_VECTOR: [0.1] * DENSE_SIZE},
            payload={"org_id": "acme", "doc_id": "stopwords"},
        )
    )
    qdrant.upsert(name, points=points, wait=True)
    org = models.Filter(must=[models.FieldCondition(key="org_id", match=models.MatchValue(value="acme"))])

    def top(query):
        hits = qdrant.query_points(name, query=encode_query(query), using=SPARSE_VECTOR, query_filter=org, limit=3)
        return [h.payload["doc_id"] for h in hits.points]

    assert top("KNOW-07")[0] == "ticket"
    assert top("ลาพักร้อนได้สูงสุดกี่วัน")[0] == "leave"
    assert top("ลาป่วยต้องมีใบรับรองแพทย์ไหม")[0] == "sick"
    assert top("ประกาศ ก.พ.") == ["leave"]
    assert top("พ.ศ. 2567 ไม่มีในเอกสารใด") == []
