import pytest

from knowledge.chunker import ChunkParams, chunk_document, count_tokens, hard_split
from knowledge.config import Settings
from knowledge.converters.base import Section
from knowledge.thai_text import split_sentences

SMALL = ChunkParams(min_tokens=20, target_tokens=60, max_tokens=80, overlap_sentences=2)

THAI_SENTENCES = [
    "พนักงานที่ปฏิบัติงานครบหนึ่งปีมีสิทธิ์ลาพักผ่อนประจำปีได้ไม่เกินสิบวันทำการ",
    "การลาต้องยื่นคำขอผ่านระบบล่วงหน้าอย่างน้อยเจ็ดวันและได้รับอนุมัติจากหัวหน้างาน",
    "วันลาที่ไม่ได้ใช้ภายในปีปฏิทินสามารถสะสมไปใช้ในปีถัดไปได้ไม่เกินห้าวัน",
    "พนักงานลาป่วยได้ตามจริงหากลาเกินสามวันต้องแสดงใบรับรองแพทย์",
    "บริษัทจัดให้มีประกันสุขภาพกลุ่มสำหรับพนักงานประจำทุกคนตั้งแต่วันแรกที่เริ่มงาน",
    "พนักงานมีสิทธิ์เข้าอบรมหลักสูตรพัฒนาทักษะได้ปีละไม่เกินสามหลักสูตร",
]


def thai_text(paragraphs: int, per_paragraph: int = 3) -> str:
    out = []
    for p in range(paragraphs):
        sentences = [THAI_SENTENCES[(p * per_paragraph + i) % len(THAI_SENTENCES)] for i in range(per_paragraph)]
        out.append(" ".join(f"{s} ข้อ {p + 1}.{i + 1}" for i, s in enumerate(sentences)))
    return "\n\n".join(out)


def english(n: int, start: int = 1) -> list[str]:
    return [f"Sentence number {i} explains one rule of the leave policy." for i in range(start, start + n)]


def chunk(sections, params=SMALL, filename="f.pdf", description="คู่มือนโยบายการลาของพนักงาน"):
    return chunk_document(sections, filename=filename, description=description, params=params)


def table(rows: int) -> str:
    lines = ["| ประเภท | จำนวนวัน | หมายเหตุ |", "|---|---|---|"]
    lines += [f"| รายการที่ {i} | {i} | ลาพักร้อนประจำปีของพนักงานคนที่ {i} |" for i in range(1, rows + 1)]
    return "\n".join(lines)


# --------------------------------------------------------------------------- sizes


def test_no_chunk_exceeds_max_and_token_count_is_exact():
    sections = [
        Section(thai_text(12), page=1),
        Section("\n\n".join(english(30)), page=2),
        Section("ลาพักร้อน" * 120, page=3),  # one "sentence" far longer than MAX
        Section(table(40), page=4, is_table=True),
    ]
    chunks = chunk(sections)
    assert len(chunks) > 10
    for c in chunks:
        assert c.token_count == count_tokens(c.text)
        assert c.token_count <= SMALL.max_tokens, c.text


def test_default_size_holds_about_1500_thai_characters():
    text = thai_text(14)
    assert len(text) > 3000
    chunks = chunk([Section(text)], params=ChunkParams(), filename="a.txt")
    assert sum(len(c.text) for c in chunks) / len(chunks) >= 1000
    assert all(c.token_count <= 800 for c in chunks)


def test_hard_split_never_breaks_a_character():
    text = "ลาพักร้อนประจำปี" * 80
    pieces = hard_split(text, 50, "o200k_base")
    assert len(pieces) > 1
    assert "".join(pieces) == text
    assert all(count_tokens(p) <= 50 for p in pieces)
    assert hard_split("ก", 1, "o200k_base") == ["ก"]  # a character larger than the limit is kept whole


def test_every_paragraph_ends_up_in_a_chunk():
    text = thai_text(30)
    chunks = chunk([Section(text, page=1)], params=ChunkParams())
    assert len(chunks) > 1
    joined = "\n".join(c.text for c in chunks)
    for paragraph in text.split("\n\n"):
        assert paragraph in joined


def test_text_that_has_to_be_hard_cut_is_not_lost():
    # crfcut finds no boundary here, so the chunker must cut on tokens
    text = "ลาพักร้อนประจำปีของพนักงาน" * 40
    params = ChunkParams(min_tokens=20, target_tokens=60, max_tokens=80, overlap_sentences=0)
    chunks = chunk([Section(text, page=1)], params=params)
    assert len(chunks) > 1
    assert "".join(c.text for c in chunks) == text


# --------------------------------------------------------------------------- overlap


MEDIUM = ChunkParams(min_tokens=40, target_tokens=120, max_tokens=160, overlap_sentences=2)


def test_next_chunk_starts_with_last_two_sentences():
    chunks = chunk([Section("\n\n".join(english(40)), page=1)], params=MEDIUM)
    assert len(chunks) >= 3
    for prev, nxt in zip(chunks, chunks[1:], strict=False):
        tail = " ".join(split_sentences(prev.text)[-2:])
        assert nxt.text.startswith(tail + "\n\n")


def test_overlap_is_capped_at_a_quarter_of_max():
    # two ~12-token sentences exceed 80 / 4 = 20 tokens, so only the last one is repeated
    chunks = chunk([Section("\n\n".join(english(30)), page=1)])
    for prev, nxt in zip(chunks, chunks[1:], strict=False):
        last = split_sentences(prev.text)[-1]
        assert nxt.text.startswith(last + "\n\n")
        assert count_tokens(nxt.text.split("\n\n")[0]) <= SMALL.max_tokens // 4


def test_overlap_never_crosses_a_page_or_a_table():
    sections = [
        Section("\n\n".join(english(12, 1)), page=1),
        Section("\n\n".join(english(12, 101)), page=2),
        Section(table(2), page=2, is_table=True),
        Section("\n\n".join(english(3, 201)), page=2),
    ]
    chunks = chunk(sections)
    first_on_page2 = next(c for c in chunks if c.page == 2)
    assert first_on_page2.text.startswith("Sentence number 101 ")
    after_table = chunks[[c.is_table for c in chunks].index(True) + 1]
    assert after_table.text.startswith("Sentence number 201 ")


def test_no_overlap_when_disabled():
    params = ChunkParams(min_tokens=20, target_tokens=60, max_tokens=80, overlap_sentences=0)
    chunks = chunk([Section("\n\n".join(english(20)), page=1)], params=params)
    starts = [c.text.split(" explains")[0] for c in chunks]
    assert len(starts) == len(set(starts))


# --------------------------------------------------------------------------- tables


def test_long_table_is_split_by_rows_with_header_repeated():
    original = table(60)
    header, sep, *rows = original.split("\n")
    chunks = [c for c in chunk([Section(original, page=1, is_table=True)]) if c.is_table]
    assert len(chunks) > 1
    seen = []
    for c in chunks:
        lines = c.text.split("\n")
        assert lines[:2] == [header, sep]
        assert all(line.startswith("| ") and line.endswith(" |") for line in lines[2:])
        seen += lines[2:]
    assert seen == rows  # every row exactly once, in order, never cut


def test_short_table_is_one_chunk_between_text():
    sections = [
        Section("ข้อความก่อนตาราง", page=1),
        Section(table(2), page=1, is_table=True),
        Section("ข้อความหลังตาราง", page=1),
    ]
    chunks = chunk(sections, params=ChunkParams(min_tokens=1, target_tokens=60, max_tokens=80))
    assert [(c.is_table, c.text.split("\n")[0]) for c in chunks] == [
        (False, "ข้อความก่อนตาราง"),
        (True, "| ประเภท | จำนวนวัน | หมายเหตุ |"),
        (False, "ข้อความหลังตาราง"),
    ]


# --------------------------------------------------------------------------- citations and headers


def test_pdf_citation_uses_page_label_and_heading():
    sections = [Section(thai_text(2), page=9, page_label="5", heading_path=["บทที่ 1 การลา", "1.1 ลาพักร้อน"])]
    [c] = chunk(sections, params=ChunkParams(), filename="HR_Policy.pdf")
    assert c.citation == "HR_Policy.pdf, หน้า 5 (1.1 ลาพักร้อน)"
    assert c.section == "บทที่ 1 การลา > 1.1 ลาพักร้อน"
    assert (c.page, c.page_label, c.page_end) == (9, "5", None)
    assert c.embed_text == (
        "[เอกสาร: คู่มือนโยบายการลาของพนักงาน] [ไฟล์: HR_Policy.pdf] "
        "[หัวข้อ: บทที่ 1 การลา > 1.1 ลาพักร้อน] [หน้า 5 (1.1 ลาพักร้อน)]\n" + c.text
    )


def test_pdf_citation_without_label_or_heading():
    [c] = chunk([Section(thai_text(2), page=3)], params=ChunkParams())
    assert c.citation == "f.pdf, หน้า 3"
    assert "[หัวข้อ:" not in c.embed_text


def test_short_pages_merge_into_a_labelled_range():
    sections = [
        Section("หน้าคำนำสั้น ๆ", page=4, page_label="iv"),
        Section("เนื้อหาหน้าแรกของบทที่หนึ่ง", page=5, page_label="1"),
        Section(thai_text(4), page=6, page_label="2"),
    ]
    chunks = chunk(sections)
    first = chunks[0]
    assert first.citation.startswith("f.pdf, หน้า iv–")
    assert (first.page, first.page_label) == (4, "iv")
    assert first.page_end is not None
    assert "หน้าคำนำสั้น ๆ" in first.text and "เนื้อหาหน้าแรกของบทที่หนึ่ง" in first.text


@pytest.mark.parametrize(
    "second",
    [
        Section("เนื้อหาบทใหม่", page=2, heading_path=["บทที่ 2"]),  # different heading
        Section(table(1), page=2, is_table=True),  # next page has a table
        Section("หน้าที่ไม่ติดกัน", page=5),  # not adjacent
    ],
)
def test_short_pages_do_not_merge_across_headings_tables_or_gaps(second):
    first = Section("หน้าสั้น", page=1)
    chunks = chunk([first, second])
    assert chunks[0].text == "หน้าสั้น"
    assert chunks[0].citation == "f.pdf, หน้า 1"


def test_pptx_slide_citations_and_merged_short_slides():
    sections = [
        Section("## สไลด์ 1: นโยบายการลา\n\n" + thai_text(3), slide=1),
        Section("## สไลด์ 2: สรุป", slide=2),
        Section("## สไลด์ 3: คำถาม", slide=3),
    ]
    chunks = chunk(sections, filename="deck.pptx")
    assert chunks[0].citation == "deck.pptx, สไลด์ 1"
    assert chunks[-1].citation == "deck.pptx, สไลด์ 2–3"
    assert (chunks[-1].slide, chunks[-1].slide_end) == (2, 3)


def test_docx_and_markdown_cite_the_heading_path():
    sections = [
        Section("คำนำ", heading_path=[]),
        Section("# บทที่ 1\n\n" + thai_text(1), heading_path=["บทที่ 1", "1.1 ลาพักร้อน"]),
    ]
    chunks = chunk(sections, filename="guide.docx", params=ChunkParams())
    assert chunks[0].citation == "guide.docx, ส่วนที่ 1"
    assert chunks[1].citation == "guide.docx, หัวข้อ บทที่ 1 > 1.1 ลาพักร้อน"
    assert "[หัวข้อ:" not in chunks[1].embed_text  # the citation part already names it
    assert "[หัวข้อ บทที่ 1 > 1.1 ลาพักร้อน]" in chunks[1].embed_text


def test_txt_parts_are_numbered():
    chunks = chunk([Section(thai_text(12))], filename="notes.txt")
    assert [c.citation for c in chunks[:3]] == ["notes.txt, ส่วนที่ 1", "notes.txt, ส่วนที่ 2", "notes.txt, ส่วนที่ 3"]
    assert [c.chunk_index for c in chunks] == list(range(len(chunks)))


def test_text_holds_only_document_content():
    chunks = chunk([Section(thai_text(6), page=1)])
    for c in chunks:
        assert "[เอกสาร:" not in c.text and "[ไฟล์:" not in c.text
        assert c.embed_text.endswith("\n" + c.text)


def test_empty_input():
    assert chunk([]) == []


def test_params_from_settings():
    s = Settings(_env_file=None, postgres_url="postgresql://x@y/z", chunk_target_tokens=500, chunk_max_tokens=700)
    assert ChunkParams.from_settings(s) == ChunkParams(150, 500, 700, 2, "o200k_base")
