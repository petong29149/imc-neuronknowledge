import pytest

from knowledge.converters import convert
from knowledge.converters.base import clean_value, join_wrapped_lines, markdown_table
from knowledge.errors import PermanentError

MARKDOWN = """คำนำของเอกสาร

# บทที่ 1 การลา
พนักงานมีสิทธิ์ลาพักร้อน
ได้ปีละสิบวัน

```
# ไม่ใช่หัวข้อ เพราะอยู่ในโค้ด
config:
  days: 10
```

## 1.1 ลาป่วย
- ลาได้ตามจริง
- เกินสามวันต้องมีใบแพทย์

# บทที่ 2 สวัสดิการ
ประกันสุขภาพกลุ่ม
"""


def test_markdown_sections_and_heading_paths():
    result = convert("md", MARKDOWN.encode())
    assert [s.heading_path for s in result.sections] == [
        [],
        ["บทที่ 1 การลา"],
        ["บทที่ 1 การลา", "1.1 ลาป่วย"],
        ["บทที่ 2 สวัสดิการ"],
    ]
    chapter1 = result.sections[1].text
    assert chapter1.startswith("# บทที่ 1 การลา\nพนักงานมีสิทธิ์ลาพักร้อนได้ปีละสิบวัน")  # soft wrap joined
    assert "# ไม่ใช่หัวข้อ เพราะอยู่ในโค้ด\nconfig:\ndays: 10" in chapter1  # code lines kept apart
    assert "- ลาได้ตามจริง\n- เกินสามวันต้องมีใบแพทย์" in result.sections[2].text
    assert result.metadata == {}


def test_txt_is_one_section_with_wraps_joined():
    text = "Employees are entitled to ten\nworking days of annual leave.\n\nพนักงานมีสิทธิ์ลา\nพักผ่อนประจำปี"
    result = convert("txt", text.encode())
    assert [s.text for s in result.sections] == [
        "Employees are entitled to ten working days of annual leave.\n\nพนักงานมีสิทธิ์ลาพักผ่อนประจำปี"
    ]
    assert result.sections[0].page is None and result.sections[0].heading_path == []


def test_txt_in_tis620_and_normalized():
    result = convert("txt", "เเมว นโยบายภาษาไทย".encode("cp874"))
    assert result.sections[0].text == "แมว นโยบายภาษาไทย"


def test_binary_text_file_is_permanent_error():
    with pytest.raises(PermanentError):
        convert("txt", b"MZ\x00\x00binary")


def test_empty_text_file_has_no_sections():
    assert convert("txt", b"   \n\n ").sections == []


# --------------------------------------------------------------------------- helpers


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("พนักงานมีสิทธิ์ลา\nพักผ่อนประจำปี", "พนักงานมีสิทธิ์ลาพักผ่อนประจำปี"),
        ("annual\nleave", "annual leave"),
        ("infor-\nmation", "information"),
        ("ข้อ ๑\nดังนี้", "ข้อ ๑ ดังนี้"),
        ("หัวข้อ\n- ข้อแรก\n- ข้อสอง", "หัวข้อ\n- ข้อแรก\n- ข้อสอง"),
        ("รายการ\n๑. แรก\n(ก) ย่อย\n2) two", "รายการ\n๑. แรก\n(ก) ย่อย\n2) two"),
        ("| a | b |\n| c | d |", "| a | b |\n| c | d |"),
        ("ย่อหน้าแรก\n\nย่อหน้าสอง", "ย่อหน้าแรก\n\nย่อหน้าสอง"),
    ],
)
def test_join_wrapped_lines(raw, expected):
    assert join_wrapped_lines(raw) == expected


def test_markdown_table_pads_and_escapes():
    assert markdown_table([["a", "b|c"], ["only one"]]) == "| a | b\\|c |\n|---|---|\n| only one |  |"
    assert markdown_table([]) == ""


def test_clean_value():
    assert clean_value("  คู่มือ\x00\n พนักงาน  ") == "คู่มือ พนักงาน"
    assert clean_value("x" * 600) == "x" * 500
    assert clean_value("   ") is None and clean_value(None) is None and clean_value(5) is None
