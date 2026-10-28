"""Retrieval evaluation (plan T11): recall@k and MRR for dense / hybrid / hybrid+rerank on
real questions, plus corpus statistics for tuning BM25_AVGDL, chunk size and top_k.

    docker compose exec api python eval/run_eval.py --questions eval/questions.jsonl

One question per line of the JSONL file ("#" lines are comments):
    {"q": "ลาพักร้อนได้กี่วัน", "org_id": "acme", "expected_doc_id": "…",
     "expected_citation_contains": "หน้า 5", "kind": "general"}
A hit is relevant when it matches every expectation given (expected_doc_id,
expected_filename, expected_citation_contains); at least one is required. `kind` is free text
(e.g. general / name / number) and the report breaks results down by it.
"""

import argparse
import json
import re
import statistics
import sys
from collections.abc import Callable, Iterable, Sequence
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

from qdrant_client import QdrantClient

from knowledge import bm25, search
from knowledge.config import Settings, get_settings, setup_logging
from knowledge.embedder import Embedder, OpenAIEmbedder
from knowledge.search import Hit, Reranker
from knowledge.vector_store import get_client

CONFIGS: dict[str, tuple[search.Mode, bool]] = {  # name → (search mode, rerank)
    "dense": ("dense", False),
    "sparse": ("sparse", False),
    "hybrid": ("hybrid", False),
    "hybrid+rerank": ("hybrid", True),
}
DEFAULT_CONFIGS = ("dense", "hybrid", "hybrid+rerank")
_THAI = re.compile(r"[ก-๛]")


@dataclass(frozen=True)
class Question:
    q: str
    org_id: str
    expected_doc_id: str | None = None
    expected_filename: str | None = None
    expected_citation_contains: str | None = None
    kind: str = "general"

    def matches(self, hit: Hit) -> bool:
        return (
            (self.expected_doc_id is None or hit.doc_id == self.expected_doc_id)
            and (self.expected_filename is None or hit.filename == self.expected_filename)
            and (self.expected_citation_contains is None or self.expected_citation_contains in hit.citation)
        )


def parse_questions(lines: Iterable[str]) -> list[Question]:
    questions = []
    for n, line in enumerate(lines, start=1):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        try:
            raw = json.loads(line)
            q = Question(**raw)
        except (json.JSONDecodeError, TypeError) as err:
            raise ValueError(f"line {n}: {err}") from err
        if not q.q.strip() or not q.org_id:
            raise ValueError(f"line {n}: q and org_id are required")
        if q.expected_doc_id is None and q.expected_filename is None and q.expected_citation_contains is None:
            raise ValueError(f"line {n}: give expected_doc_id, expected_filename or expected_citation_contains")
        questions.append(q)
    return questions


def load_questions(path: str | Path) -> list[Question]:
    return parse_questions(Path(path).read_text(encoding="utf-8").splitlines())


@dataclass
class Outcome:
    q: str
    kind: str
    rank: int | None  # 1-based rank of the first relevant hit within k, None when missed
    top: list[str]  # citations of the hits, for reading the misses


@dataclass
class ConfigResult:
    config: str
    k: int
    outcomes: list[Outcome] = field(default_factory=list)

    @property
    def recall(self) -> float:
        return _recall(self.outcomes)

    @property
    def mrr(self) -> float:
        return _mrr(self.outcomes)

    def by_kind(self) -> dict[str, tuple[int, float, float]]:
        kinds: dict[str, list[Outcome]] = {}
        for o in self.outcomes:
            kinds.setdefault(o.kind, []).append(o)
        return {kind: (len(os), _recall(os), _mrr(os)) for kind, os in sorted(kinds.items())}


def _recall(outcomes: Sequence[Outcome]) -> float:
    return sum(o.rank is not None for o in outcomes) / len(outcomes) if outcomes else 0.0


def _mrr(outcomes: Sequence[Outcome]) -> float:
    return sum(1 / o.rank for o in outcomes if o.rank) / len(outcomes) if outcomes else 0.0


SearchFn = Callable[[Question, search.Mode, bool, int], list[Hit]]


def evaluate(
    questions: Sequence[Question], search_fn: SearchFn, configs: Sequence[str], k: int = 5
) -> list[ConfigResult]:
    results = []
    for name in configs:
        mode, rerank = CONFIGS[name]
        result = ConfigResult(name, k)
        for q in questions:
            hits = search_fn(q, mode, rerank, k)[:k]
            rank = next((i for i, h in enumerate(hits, start=1) if q.matches(h)), None)
            result.outcomes.append(Outcome(q.q, q.kind, rank, [h.citation for h in hits]))
        results.append(result)
    return results


def engine_search_fn(
    settings: Settings, qdrant: QdrantClient, embedder: Embedder, reranker: Reranker | None
) -> SearchFn:
    def run(q: Question, mode: search.Mode, rerank: bool, k: int) -> list[Hit]:
        if rerank and reranker is None:
            raise RuntimeError("hybrid+rerank needs a reranker")
        return search.search(
            settings=settings, qdrant=qdrant, embedder=embedder, org_id=q.org_id, query=q.q, top_k=k,
            mode=mode, reranker=reranker if rerank else None,
        )  # fmt: skip

    return run


# --------------------------------------------------------------------------- corpus


def _is_thai(text: str) -> bool:
    letters = [ch for ch in text if ch.isalpha()]
    return bool(letters) and sum(bool(_THAI.match(ch)) for ch in letters) / len(letters) >= 0.5


def corpus_stats(texts: Sequence[str], token_counts: Sequence[int], top_k: int = 5) -> dict[str, Any]:
    """BM25_AVGDL should be the mean number of BM25 terms per chunk (what encode_document calls dl)."""
    if not texts:
        return {"chunks": 0}
    terms = [len(bm25.bm25_terms(t)) for t in texts]
    thai = [len(t) for t in texts if _is_thai(t)]
    other = [len(t) for t in texts if not _is_thai(t)]
    mean_tokens = statistics.fmean(token_counts) if token_counts else None  # older points may lack it
    return {
        "chunks": len(texts),
        "bm25_terms_mean": round(statistics.fmean(terms), 1),
        "bm25_terms_median": statistics.median(terms),
        "recommended_bm25_avgdl": round(statistics.fmean(terms)),
        "chars_mean_thai": round(statistics.fmean(thai)) if thai else None,
        "chars_mean_other": round(statistics.fmean(other)) if other else None,
        "thai_chunks": len(thai),
        "other_chunks": len(other),
        "tokens_mean": round(mean_tokens, 1) if mean_tokens is not None else None,
        "llm_input_tokens_per_search": round(mean_tokens * top_k)
        if mean_tokens is not None
        else None,  # what top_k chunks add to a chat turn
    }


def read_corpus(settings: Settings, qdrant: QdrantClient, org_ids: Iterable[str]) -> tuple[list[str], list[int]]:
    texts: list[str] = []
    tokens: list[int] = []
    for org_id in sorted(set(org_ids)):
        offset = None
        while True:
            points, offset = qdrant.scroll(
                settings.qdrant_collection,
                scroll_filter=search.org_filter(org_id),
                limit=256,
                offset=offset,
                with_payload=["text", "token_count"],
                with_vectors=False,
            )
            for p in points:
                texts.append(p.payload.get("text") or "")
                if p.payload.get("token_count") is not None:
                    tokens.append(int(p.payload["token_count"]))
            if offset is None:
                break
    return texts, tokens


# --------------------------------------------------------------------------- report


def report(results: Sequence[ConfigResult], stats: dict[str, Any], settings: Settings) -> str:
    k = results[0].k if results else 5
    lines = [f"## Retrieval: recall@{k} / MRR@{k}", "", "| config | n | recall | MRR |", "|---|---|---|---|"]
    for r in results:
        lines.append(f"| {r.config} | {len(r.outcomes)} | {r.recall:.3f} | {r.mrr:.3f} |")
    kinds = sorted({kind for r in results for kind in r.by_kind()})
    if len(kinds) > 1:
        lines += ["", "### by kind (recall / MRR)", "", "| kind | n | " + " | ".join(r.config for r in results) + " |"]
        lines.append("|---|---|" + "---|" * len(results))
        for kind in kinds:
            cells = []
            n = 0
            for r in results:
                n, rec, mrr = r.by_kind().get(kind, (0, 0.0, 0.0))
                cells.append(f"{rec:.2f} / {mrr:.2f}")
            lines.append(f"| {kind} | {n} | " + " | ".join(cells) + " |")
    if stats.get("chunks"):
        lines += [
            "",
            "## Corpus",
            "",
            f"- chunks: {stats['chunks']} (Thai {stats['thai_chunks']}, other {stats['other_chunks']})",
            f"- BM25 terms per chunk: mean {stats['bm25_terms_mean']}, median {stats['bm25_terms_median']}"
            f" → BM25_AVGDL={stats['recommended_bm25_avgdl']} (now {settings.bm25_avgdl:g})",
            f"- chars per chunk: Thai {stats['chars_mean_thai'] or '-'}, other {stats['chars_mean_other'] or '-'}",
        ]
        if stats["tokens_mean"] is not None:
            lines.append(
                f"- tokens per chunk (o200k): {stats['tokens_mean']}"
                f" → ~{stats['llm_input_tokens_per_search']} input tokens per search_knowledge call (top_k={k})"
            )
    misses = [(r.config, o) for r in results for o in r.outcomes if o.rank is None]
    if misses:
        lines += ["", "## Misses", ""]
        lines += [f"- [{config}] {o.q} → {', '.join(o.top[:3]) or '(no results)'}" for config, o in misses]
    return "\n".join(lines) + "\n"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="eval/run_eval.py", description=__doc__.split("\n\n")[0])
    parser.add_argument("--questions", default="eval/questions.jsonl")
    parser.add_argument("--k", type=int, default=5)
    parser.add_argument("--configs", default=",".join(DEFAULT_CONFIGS), help=f"comma-separated: {', '.join(CONFIGS)}")
    parser.add_argument("--out", default="eval/results", help="directory for the JSON + Markdown results")
    args = parser.parse_args(argv)

    setup_logging()
    configs = [c.strip() for c in args.configs.split(",") if c.strip()]
    unknown = [c for c in configs if c not in CONFIGS]
    if unknown:
        parser.error(f"unknown config(s): {', '.join(unknown)}")
    questions = load_questions(args.questions)
    if not questions:
        parser.error(f"no questions in {args.questions}")

    settings = get_settings()
    qdrant = get_client(settings)
    reranker = None
    if any(CONFIGS[c][1] for c in configs):
        from knowledge.rerank import CrossEncoderReranker

        try:
            reranker = CrossEncoderReranker.load(settings.rerank_model, settings.rerank_max_length)
        except RuntimeError as err:
            print(f"skipping rerank: {err}", file=sys.stderr)
            configs = [c for c in configs if not CONFIGS[c][1]]

    fn = engine_search_fn(settings, qdrant, OpenAIEmbedder(settings), reranker)
    results = evaluate(questions, fn, configs, k=args.k)
    stats = corpus_stats(*read_corpus(settings, qdrant, (q.org_id for q in questions)), top_k=args.k)
    text = report(results, stats, settings)
    print(text)

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    (out / f"eval-{stamp}.md").write_text(text, encoding="utf-8")
    payload = {
        "k": args.k,
        "questions": len(questions),
        "results": [
            {"config": r.config, "recall": r.recall, "mrr": r.mrr, "outcomes": [asdict(o) for o in r.outcomes]}
            for r in results
        ],
        "corpus": stats,
    }
    (out / f"eval-{stamp}.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"saved {out}/eval-{stamp}.md and .json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
