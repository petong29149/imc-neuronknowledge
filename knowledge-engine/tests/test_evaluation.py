"""T11: retrieval evaluation — question file, metrics, corpus stats, and a run on a synthetic corpus."""

import json
import sys
from pathlib import Path

import pytest

from knowledge import evaluation
from knowledge.evaluation import ConfigResult, Outcome, Question, corpus_stats, evaluate, parse_questions
from knowledge.search import Hit
from knowledge.vector_store import ensure_collection
from tests.fixtures.embedder import FakeEmbedder
from tests.fixtures.search import WordReranker, add_doc

EVAL_DIR = Path(__file__).resolve().parents[1] / "eval"


def hit(doc_id="d1", filename="a.pdf", citation="a.pdf, หน้า 1"):
    return Hit(text="x", citation=citation, filename=filename, doc_id=doc_id, chunk_index=0, score=1.0)


# --------------------------------------------------------------------------- questions


def test_parse_questions_skips_comments_and_blank_lines():
    qs = parse_questions(
        [
            "# comment",
            "",
            '{"q": "ลากี่วัน", "org_id": "acme", "expected_doc_id": "d1"}',
            '{"q": "KNOW-07", "org_id": "acme", "expected_filename": "f.docx", "kind": "name"}',
        ]
    )
    assert [(q.q, q.kind) for q in qs] == [("ลากี่วัน", "general"), ("KNOW-07", "name")]


@pytest.mark.parametrize(
    ("line", "message"),
    [
        ('{"q": "x", "org_id": "acme"}', "expected_doc_id"),
        ('{"q": " ", "org_id": "acme", "expected_doc_id": "d"}', "required"),
        ('{"q": "x", "org_id": "acme", "expected_doc_id": "d", "typo": 1}', "line 1"),
        ("{not json", "line 1"),
    ],
)
def test_parse_questions_rejects_bad_lines(line, message):
    with pytest.raises(ValueError, match=message):
        parse_questions([line])


def test_template_file_parses_and_shows_every_kind():
    qs = evaluation.load_questions(EVAL_DIR / "questions.jsonl")
    assert len(qs) == 3
    assert {q.kind for q in qs} == {"general", "name", "number"}


def test_a_hit_must_match_every_expectation():
    q = Question("x", "acme", expected_filename="a.pdf", expected_citation_contains="หน้า 5")
    assert q.matches(hit(citation="a.pdf, หน้า 5 (บทที่ 1)"))
    assert not q.matches(hit(citation="a.pdf, หน้า 6"))
    assert not q.matches(hit(filename="b.pdf", citation="b.pdf, หน้า 5"))
    assert Question("x", "acme", expected_doc_id="d1").matches(hit(doc_id="d1"))
    assert not Question("x", "acme", expected_doc_id="d1").matches(hit(doc_id="d2"))


# --------------------------------------------------------------------------- metrics


def test_recall_and_mrr():
    questions = [
        Question("first", "acme", expected_doc_id="a"),
        Question("second", "acme", expected_doc_id="b", kind="name"),
        Question("missed", "acme", expected_doc_id="z", kind="name"),
    ]
    ranked = {"first": ["a", "x"], "second": ["x", "b"], "missed": ["x", "y"]}

    def fake_search(q, mode, rerank, k):
        return [hit(doc_id=d) for d in ranked[q.q]]

    [result] = evaluate(questions, fake_search, ["hybrid"], k=5)
    assert [o.rank for o in result.outcomes] == [1, 2, None]
    assert result.recall == pytest.approx(2 / 3)
    assert result.mrr == pytest.approx((1 + 1 / 2) / 3)
    assert result.by_kind() == {"general": (1, 1.0, 1.0), "name": (2, 0.5, 0.25)}


def test_evaluate_cuts_at_k_and_passes_each_config():
    calls = []

    def fake_search(q, mode, rerank, k):
        calls.append((mode, rerank, k))
        return [hit(doc_id="x")] * 5 + [hit(doc_id="a")]  # relevant only at rank 6

    results = evaluate([Question("q", "acme", expected_doc_id="a")], fake_search, ["dense", "hybrid+rerank"], k=5)
    assert calls == [("dense", False, 5), ("hybrid", True, 5)]
    assert [r.recall for r in results] == [0.0, 0.0]


def test_corpus_stats_recommends_bm25_avgdl():
    thai = "พนักงานมีสิทธิ์ลาพักร้อนปีละสิบวันทำการ"
    english = "Employees may take ten days of annual leave"
    stats = corpus_stats([thai, english], [40, 10], top_k=5)
    assert stats["chunks"] == 2 and stats["thai_chunks"] == 1 and stats["other_chunks"] == 1
    assert stats["chars_mean_thai"] == len(thai) and stats["chars_mean_other"] == len(english)
    assert stats["recommended_bm25_avgdl"] == round(stats["bm25_terms_mean"])
    assert stats["llm_input_tokens_per_search"] == 125
    assert corpus_stats([], []) == {"chunks": 0}
    assert corpus_stats([thai], [])["llm_input_tokens_per_search"] is None


def test_report_lists_configs_kinds_corpus_and_misses(test_settings):
    results = [
        ConfigResult("dense", 5, [Outcome("ลากี่วัน", "general", 1, []), Outcome("KNOW-07", "name", None, ["a.pdf"])]),
        ConfigResult("hybrid", 5, [Outcome("ลากี่วัน", "general", 1, []), Outcome("KNOW-07", "name", 1, [])]),
    ]
    stats = corpus_stats(["ลาพักร้อนสิบวัน"], [20])
    text = evaluation.report(results, stats, test_settings)
    assert "| dense | 2 | 0.500 | 0.500 |" in text and "| hybrid | 2 | 1.000 | 1.000 |" in text
    assert "| name | 1 | 0.00 / 0.00 | 1.00 / 1.00 |" in text
    assert "BM25_AVGDL=" in text and "[dense] KNOW-07 → a.pdf" in text


# --------------------------------------------------------------------------- synthetic corpus


DOCS = {
    "handbook.pdf": ["พนักงานลาพักร้อนได้ปีละสิบวันทำการ", "ลาป่วยเกินสามวันต้องมีใบรับรองแพทย์"],
    "forms.docx": ["แบบฟอร์ม KNOW-07 ใช้ขอเบิกค่าเดินทางไปต่างจังหวัด", "แบบฟอร์ม HR-12 ใช้ขอเปลี่ยนแปลงข้อมูลพนักงาน"],
    "travel.pptx": ["ค่าที่พักต่างจังหวัดเบิกได้ไม่เกินคืนละ 1,500 บาท", "ค่าเบี้ยเลี้ยงวันละ 270 บาท"],
}
# General questions share words with their answer: a pure paraphrase that BM25 ranks under another
# chunk ties with it in RRF (one first on each side) — the case the reranker and T11 on real data are for.
QUESTIONS = [
    # (question, file, the chunk the fake dense vector points at)
    ("ลาพักร้อนได้ปีละกี่วัน", "handbook.pdf", "พนักงานลาพักร้อนได้ปีละสิบวันทำการ"),
    ("ใช้ฟอร์ม KNOW-07 ตอนไหน", "forms.docx", "ค่าเบี้ยเลี้ยงวันละ 270 บาท"),  # dense misses the code
    ("HR-12 คือฟอร์มอะไร", "forms.docx", "ลาป่วยเกินสามวันต้องมีใบรับรองแพทย์"),  # dense misses the code
    ("ที่พักต่างจังหวัดเบิกได้คืนละกี่บาท", "travel.pptx", "ค่าที่พักต่างจังหวัดเบิกได้ไม่เกินคืนละ 1,500 บาท"),
]


@pytest.fixture
def corpus(migrated, qdrant):
    ensure_collection(qdrant, migrated.qdrant_collection)
    targets = {target: q for q, _, target in QUESTIONS}
    for filename, texts in DOCS.items():
        # each chunk gets the vector of the question that "means" it (fake embeddings)
        for text in texts:
            add_doc(migrated, qdrant, "acme", [text], filename=filename, match=text, query=targets.get(text, text))
    add_doc(migrated, qdrant, "beta", ["แบบฟอร์ม KNOW-07 ของบริษัทอื่น"], filename="forms.docx")
    lines = [
        json.dumps({"q": q, "org_id": "acme", "expected_filename": f, "kind": "name" if "-" in q else "general"})
        for q, f, _ in QUESTIONS
    ]
    return migrated, qdrant, lines


@pytest.mark.integration
def test_synthetic_corpus_hybrid_beats_dense_on_codes(corpus):
    settings, qdrant, lines = corpus
    questions = parse_questions(lines)
    fn = evaluation.engine_search_fn(settings, qdrant, FakeEmbedder(), WordReranker())
    dense, hybrid, reranked = evaluate(questions, fn, ["dense", "hybrid", "hybrid+rerank"], k=1)
    assert dense.by_kind()["name"][1] == 0.0  # recall@1 of the code questions
    assert hybrid.by_kind()["name"][1] == 1.0
    assert hybrid.by_kind()["general"][1] == 1.0
    assert hybrid.recall > dense.recall
    assert len(reranked.outcomes) == len(questions)

    texts, tokens = evaluation.read_corpus(settings, qdrant, ["acme"])
    assert sorted(texts) == sorted(t for ts in DOCS.values() for t in ts)  # no beta chunk


@pytest.mark.integration
def test_run_eval_cli_writes_results(corpus, tmp_path, monkeypatch, capsys):
    settings, _, lines = corpus
    questions = tmp_path / "questions.jsonl"
    questions.write_text("# synthetic\n" + "\n".join(lines) + "\n", encoding="utf-8")
    monkeypatch.setattr(evaluation, "get_settings", lambda: settings)
    monkeypatch.setattr(evaluation, "OpenAIEmbedder", lambda _settings: FakeEmbedder())
    monkeypatch.setitem(sys.modules, "sentence_transformers", None)  # no rerank image → that config is skipped

    out = tmp_path / "results"
    assert evaluation.main(["--questions", str(questions), "--out", str(out), "--k", "5"]) == 0
    printed = capsys.readouterr()
    assert "skipping rerank" in printed.err
    assert "| dense | 4 |" in printed.out and "| hybrid | 4 | 1.000 |" in printed.out
    assert "BM25_AVGDL=" in printed.out
    [md] = out.glob("eval-*.md")
    [js] = out.glob("eval-*.json")
    data = json.loads(js.read_text(encoding="utf-8"))
    assert [r["config"] for r in data["results"]] == ["dense", "hybrid"]
    assert data["corpus"]["chunks"] == 6
    assert md.read_text(encoding="utf-8").startswith("## Retrieval")
