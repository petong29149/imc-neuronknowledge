import pytest

from knowledge.converters import GarbledTextError, convert
from knowledge.converters.base import pdf_date
from knowledge.converters.pdf import convert_pdf
from knowledge.errors import NeedsOcrError, PermanentError
from tests.fixtures.pdfs import blank_pdf, draw_table, drawn_pdf, encrypted, requires_thai_font, thai_pdf, write_at

POLICY = ["นโยบายการลาพักร้อนของพนักงาน ปี ๒๕๖๗", "", "พนักงานที่ปฏิบัติงานครบหนึ่งปีมีสิทธิ์ลา", "พักผ่อนประจำปีได้ไม่เกินสิบวันทำการ"]
SICK = ["พนักงานลาป่วยได้ตามจริง หากลาป่วยเกินสามวันต้องมีใบรับรองแพทย์ประกอบการลา"]
BENEFITS = ["บริษัทจัดให้มีประกันสุขภาพกลุ่มสำหรับพนักงานประจำทุกคนตั้งแต่วันแรกที่เริ่มงาน"]
TRAINING = ["พนักงานมีสิทธิ์เข้าอบรมหลักสูตรพัฒนาทักษะได้ปีละไม่เกินสามหลักสูตรโดยบริษัทออกค่าใช้จ่าย"]
HEADER = "บริษัท ตัวอย่าง จำกัด เอกสารภายใน"


def leading_vowel_after_consonant(text: str) -> str:
    out, i = list(text), 0
    while i < len(out) - 1:
        if out[i] in "เแโใไ":
            out[i], out[i + 1] = out[i + 1], out[i]
            i += 2
        else:
            i += 1
    return "".join(out)


def texts(result):
    return [s.text for s in result.sections]


# --------------------------------------------------------------------------- text, wraps, pages


@requires_thai_font
def test_thai_text_pages_and_hard_wraps():
    result = convert_pdf(thai_pdf([POLICY, SICK]))
    assert result.page_count == 2
    assert [s.page for s in result.sections] == [1, 2]
    page1 = result.sections[0].text
    assert "นโยบายการลาพักร้อนของพนักงาน ปี ๒๕๖๗" in page1
    # a Thai line broken mid-sentence is joined without a space
    assert "มีสิทธิ์ลาพักผ่อนประจำปีได้ไม่เกินสิบวันทำการ" in page1
    assert "\n\n" in page1  # separate blocks stay separate paragraphs
    assert result.quality_flag == "ok"
    assert result.warnings == []


@requires_thai_font
def test_bullet_lines_are_not_joined():
    result = convert_pdf(thai_pdf([["สิทธิการลา", "- ลาพักร้อนปีละสิบวันทำการ", "- ลาป่วยได้ตามจริงตามใบรับรองแพทย์"]]))
    assert "- ลาพักร้อนปีละสิบวันทำการ\n- ลาป่วยได้ตามจริงตามใบรับรองแพทย์" in result.sections[0].text


# --------------------------------------------------------------------------- running header / footer


@requires_thai_font
def test_running_header_and_page_numbers_are_removed_and_header_kept_as_metadata():
    result = convert_pdf(thai_pdf([POLICY, SICK, BENEFITS, TRAINING], header=HEADER, footer="- {n} -"))
    body = "\n".join(texts(result))
    assert HEADER not in body
    assert "- 2 -" not in body and "- 4 -" not in body
    assert result.metadata["running_header"] == HEADER
    assert "running_footer" not in result.metadata  # bare page numbers are not worth keeping


@requires_thai_font
def test_short_documents_keep_their_headers():
    result = convert_pdf(thai_pdf([POLICY, SICK], header=HEADER))
    assert HEADER in result.sections[0].text
    assert "running_header" not in result.metadata


# --------------------------------------------------------------------------- document metadata, TOC, labels


@requires_thai_font
def test_document_metadata_toc_and_page_labels():
    data = thai_pdf(
        [POLICY, SICK, BENEFITS, TRAINING],
        metadata={
            "title": "คู่มือพนักงาน ๒๕๖๗",
            "author": "ฝ่ายทรัพยากรบุคคล",
            "subject": "สวัสดิการ",
            "keywords": "HR, การลา",
            "creationDate": "D:20240115103000+07'00'",
        },
        toc=[[1, "บทที่ 1 การลา", 1], [2, "1.1 ลาพักร้อน", 1], [2, "1.2 ลาป่วย", 2], [1, "บทที่ 2 สวัสดิการ", 3]],
        labels=[
            {"startpage": 0, "prefix": "", "style": "r", "firstpagenum": 1},
            {"startpage": 1, "prefix": "", "style": "D", "firstpagenum": 1},
        ],
    )
    result = convert(file_type="pdf", data=data)
    assert result.metadata == {
        "title": "คู่มือพนักงาน ๒๕๖๗",
        "author": "ฝ่ายทรัพยากรบุคคล",
        "subject": "สวัสดิการ",
        "keywords": "HR, การลา",
        "created": "2024-01-15T10:30:00+07:00",
        "has_toc": True,
        "page_labels": True,
    }
    by_page = {s.page: s for s in result.sections}
    assert [by_page[p].page_label for p in (1, 2, 3, 4)] == ["i", "1", "2", "3"]
    assert by_page[1].heading_path == ["บทที่ 1 การลา", "1.1 ลาพักร้อน"]
    assert by_page[2].heading_path == ["บทที่ 1 การลา", "1.2 ลาป่วย"]
    assert by_page[3].heading_path == ["บทที่ 2 สวัสดิการ"]
    assert by_page[4].heading_path == ["บทที่ 2 สวัสดิการ"]


@requires_thai_font
def test_pdf_without_toc_or_labels():
    result = convert_pdf(thai_pdf([POLICY]))
    section = result.sections[0]
    assert section.heading_path == []
    assert section.page_label is None
    assert result.metadata == {"has_toc": False, "page_labels": False}


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("D:20240115103000+07'00'", "2024-01-15T10:30:00+07:00"),
        ("D:20240115103000Z", "2024-01-15T10:30:00+00:00"),
        ("D:20240115", "2024-01-15T00:00:00"),
        ("D:2024", "2024-01-01T00:00:00"),
        ("D:20241345", None),  # month 13
        ("15/01/2024", None),
        ("", None),
        (None, None),
    ],
)
def test_pdf_date(raw, expected):
    assert pdf_date(raw) == expected


# --------------------------------------------------------------------------- tables


@requires_thai_font
def test_thai_table_keeps_vowels_and_order():
    rows = [["รายการ", "จำนวน", "หมายเหตุ"], ["ลาพักร้อน", "10", "ต่อปี"], ["ลาป่วย", "30", "มีใบแพทย์"]]
    result = convert_pdf(
        thai_pdf([["สรุปสิทธิการลาของพนักงานประจำปีงบประมาณ", "", rows, "ข้อความหลังตารางสำหรับหมายเหตุเพิ่มเติม"]])
    )
    kinds = [(s.is_table, s.text.splitlines()[0]) for s in result.sections]
    assert kinds == [
        (False, "สรุปสิทธิการลาของพนักงานประจำปีงบประมาณ"),
        (True, "| รายการ | จำนวน | หมายเหตุ |"),
        (False, "ข้อความหลังตารางสำหรับหมายเหตุเพิ่มเติม"),
    ]
    table = result.sections[1].text
    # PyMuPDF's own to_markdown() would give "ลาพกรอน" and "ตอป" here
    assert "| ลาพักร้อน | 10 | ต่อปี |" in table
    assert "| ลาป่วย | 30 | มีใบแพทย์ |" in table
    assert "ลาพักร้อน" not in result.sections[0].text + result.sections[2].text  # not read twice


# --------------------------------------------------------------------------- tables PyMuPDF misses, columns

LEAVE_ROWS = [["รายการ", "จำนวน", "หมายเหตุ"], ["ลาพักร้อน", "10", "ต่อปี"], ["ลาป่วย", "30", "มีใบแพทย์"]]


def tables(result):
    return [s.text for s in result.sections if s.is_table]


def all_text(result):
    return "\n".join(s.text for s in result.sections)


@requires_thai_font
def test_two_row_ruled_table_is_still_a_table():
    # PyMuPDF's find_tables() needs 3+ rows; this used to come out as "รายการจำนวนหมายเหตุ"
    result = convert_pdf(drawn_pdf(lambda page: draw_table(page, 150, LEAVE_ROWS[:2])))
    assert tables(result) == ["| รายการ | จำนวน | หมายเหตุ |\n|---|---|---|\n| ลาพักร้อน | 10 | ต่อปี |"]
    assert "รายการจำนวน" not in all_text(result)


@requires_thai_font
def test_unruled_table_is_recovered():
    def unruled(page):
        for r, row in enumerate(LEAVE_ROWS):
            for c, cell in enumerate(row):
                write_at(page, 72 + c * 150, 150 + r * 22, cell)

    [table] = tables(convert_pdf(drawn_pdf(unruled)))
    assert table.splitlines()[0] == "| รายการ | จำนวน | หมายเหตุ |"
    assert "| ลาป่วย | 30 | มีใบแพทย์ |" in table


@requires_thai_font
def test_table_row_with_an_empty_cell_keeps_its_columns():
    def gappy(page):
        for r, row in enumerate([["รายการ", "จำนวน", "หมายเหตุ"], ["ลาพักร้อน", "10", ""], ["ลาบวช", "", "ตามระเบียบ"]]):
            for c, cell in enumerate(row):
                if cell:
                    write_at(page, 72 + c * 150, 150 + r * 22, cell)

    [table] = tables(convert_pdf(drawn_pdf(gappy)))
    assert "| ลาพักร้อน | 10 | |" in table  # empty cells stay in their column
    assert "| ลาบวช | | ตามระเบียบ |" in table


@requires_thai_font
def test_two_text_columns_are_read_one_after_the_other():
    left = ["พนักงานที่ปฏิบัติงานครบหนึ่งปี", "มีสิทธิ์ลาพักผ่อนประจำปีได้", "ไม่เกินสิบวันทำการ"]
    right = ["บริษัทจัดให้มีประกันสุขภาพ", "กลุ่มสำหรับพนักงานประจำทุกคน", "ตั้งแต่วันแรกที่เริ่มงาน"]

    def columns(page):
        for i, (a, b) in enumerate(zip(left, right, strict=True)):
            write_at(page, 72, 150 + i * 16, a)
            write_at(page, 320, 150 + i * 16, b)

    result = convert_pdf(drawn_pdf(columns))
    assert tables(result) == []
    text = all_text(result)
    # each column reads as its own paragraph; before, left and right lines were glued together
    assert "".join(left) in text
    assert "".join(right) in text
    assert "หนึ่งปีบริษัท" not in text


@requires_thai_font
def test_label_and_value_on_one_row_keep_a_space():
    result = convert_pdf(drawn_pdf(lambda page: (write_at(page, 72, 150, "ชื่อผู้ขออนุมัติ:"),
                                                 write_at(page, 220, 150, "นายสมชาย ใจดี"))))  # fmt: skip
    assert tables(result) == []
    assert "ชื่อผู้ขออนุมัติ: นายสมชาย ใจดี" in all_text(result)


@requires_thai_font
def test_prose_columns_then_a_table_stay_apart():
    def mixed(page):
        write_at(page, 72, 120, "พนักงานที่ปฏิบัติงานครบหนึ่งปีมีสิทธิ์")
        write_at(page, 320, 120, "บริษัทจัดให้มีประกันสุขภาพกลุ่มสำหรับ")
        write_at(page, 72, 136, "ลาพักผ่อนประจำปีได้ไม่เกินสิบวัน")
        write_at(page, 320, 136, "พนักงานประจำทุกคนตั้งแต่วันแรก")
        for r, row in enumerate(LEAVE_ROWS):
            for c, cell in enumerate(row):
                write_at(page, 90 + c * 140, 260 + r * 22, cell)

    result = convert_pdf(drawn_pdf(mixed))
    assert len(tables(result)) == 1 and "| ลาป่วย | 30 | มีใบแพทย์ |" in tables(result)[0]
    assert "พนักงานที่ปฏิบัติงานครบหนึ่งปีมีสิทธิ์ลาพักผ่อนประจำปีได้ไม่เกินสิบวัน" in all_text(result)


# --------------------------------------------------------------------------- failures and quality


def test_scanned_pdf_needs_ocr():
    with pytest.raises(NeedsOcrError, match="OCR"):
        convert_pdf(blank_pdf(5))


@requires_thai_font
def test_password_protected_pdf():
    with pytest.raises(PermanentError, match="รหัสผ่าน"):
        convert_pdf(encrypted(thai_pdf([POLICY])))


def test_corrupt_pdf():
    with pytest.raises(PermanentError, match="เสียหาย"):
        convert_pdf(b"%PDF-1.7 not really a pdf")


@requires_thai_font
def test_garbled_page_is_skipped_with_a_warning():
    garbled = [leading_vowel_after_consonant(line) for line in SICK]
    result = convert_pdf(thai_pdf([POLICY, garbled, BENEFITS]))
    assert [s.page for s in result.sections] == [1, 3]
    assert result.quality_flag == "partial_garbled"
    assert len(result.warnings) == 1 and result.warnings[0].startswith("หน้า 2:")


@requires_thai_font
def test_mostly_garbled_document_is_flagged():
    pages = [
        POLICY,
        [leading_vowel_after_consonant(x) for x in SICK],
        [leading_vowel_after_consonant(x) for x in BENEFITS],
    ]
    result = convert_pdf(thai_pdf(pages))
    assert result.quality_flag == "garbled"
    assert [s.page for s in result.sections] == [1]


@requires_thai_font
def test_fully_garbled_document_needs_ocr():
    pages = [[leading_vowel_after_consonant(x) for x in page] for page in (SICK, BENEFITS)]
    with pytest.raises(GarbledTextError) as err:
        convert_pdf(thai_pdf(pages))
    assert (err.value.doc_status, err.value.quality_flag) == ("needs_ocr", "garbled")
