import re

import pytest

from knowledge import thai_text
from knowledge.thai_text import normalize, quality_check, split_sentences, tokenize_words

LEAVE_POLICY = (
    "พนักงานที่ปฏิบัติงานครบหนึ่งปีมีสิทธิ์ลาพักผ่อนประจำปีได้ไม่เกินสิบวันทำการ "
    "โดยต้องยื่นคำขอล่วงหน้าอย่างน้อยเจ็ดวัน และได้รับอนุมัติจากผู้บังคับบัญชาก่อน "
    "หากไม่ได้ใช้สิทธิ์ภายในปีปฏิทิน สามารถสะสมไปใช้ในปีถัดไปได้ไม่เกินห้าวัน"
)


# What broken PDF fonts and bad copy-paste do to Thai text
def leading_vowel_after_consonant(text: str) -> str:
    out, i = list(text), 0
    while i < len(out) - 1:
        if out[i] in "เแโใไ":
            out[i], out[i + 1] = out[i + 1], out[i]
            i += 2
        else:
            i += 1
    return "".join(out)


def tone_before_vowel(text: str) -> str:
    return re.sub(r"([ิีึืั])([่้๊๋])", r"\2\1", text)


def space_every_character(text: str) -> str:
    return " ".join(text.replace(" ", ""))


def legacy_font_glyphs(text: str) -> str:
    return text.translate(str.maketrans({"่": "\uf70a", "้": "\uf70b", "ั": "\uf710", "ี": "\uf712"}))


# --------------------------------------------------------------------------- normalize


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("เเมว", "แมว"),  # two sara e → sara ae
        ("ก่ี", "กี่"),  # tone mark before the vowel → standard order
        ("ก็็", "ก็"),  # duplicate mark
        ("นํ้า", "น้ำ"),  # nikhahit + sara aa → sara am
        ("ภาษา\u200bไทย\ufeff", "ภาษาไทย"),  # zero-width characters
        ("ภาษา \t\u00a0 ไทย  ", "ภาษา ไทย"),  # runs of spaces
    ],
)
def test_normalize_fixes_thai_and_spaces(raw, expected):
    assert normalize(raw) == expected


@pytest.mark.parametrize("dash", [0x2010, 0x2011, 0x2012, 0x2212])
def test_normalize_folds_hyphen_lookalikes(dash):
    # PDF fonts often extract "-" as one of these
    assert normalize(f"KNOW{chr(dash)}07 {chr(dash)} ข้อแรก") == "KNOW-07 - ข้อแรก"


def test_normalize_keeps_paragraph_breaks():
    raw = "ย่อหน้าแรก\r\nบรรทัดสอง\n\n\n\nย่อหน้า  สอง\n \n| a | b |\n"
    assert normalize(raw) == "ย่อหน้าแรก\nบรรทัดสอง\n\nย่อหน้า สอง\n\n| a | b |"


def test_normalize_is_idempotent():
    once = normalize(tone_before_vowel(LEAVE_POLICY) + "\n\n\n" + "เเมว")
    assert normalize(once) == once


# --------------------------------------------------------------------------- quality


def test_normal_thai_is_ok():
    result = quality_check(LEAVE_POLICY)
    assert result.flag == "ok"
    assert result.score > 0.9
    assert result.invalid_ratio == 0
    assert result.thai_ratio == 1.0


def test_thai_with_names_numbers_and_english_is_ok():
    text = "นายสมชาย ใจดี ผู้อำนวยการฝ่ายทรัพยากรบุคคล บริษัท ไอเอ็มซี จำกัด โทร ๐๒-๑๒๓-๔๕๖๗ ใช้ระบบ NeuronKnowledge"
    assert quality_check(normalize(text)).flag == "ok"


# Real-world Thai that is full of abbreviations, titles, units and transliterations
REALISTIC = {
    "government": "ตามประกาศ ก.พ. ลงวันที่ ๑ ม.ค. พ.ศ. ๒๕๖๗ ข้อ ๓.๒ ฯลฯ ให้ส่วนราชการ เช่น สป.อว. และ สนง.ก.พ. ดำเนินการ",
    "no_spaces": "ตามประกาศก.พ.ลงวันที่๑ม.ค.พ.ศ.๒๕๖๗ให้สป.อว.และสนง.ก.พ.ดำเนินการต่อไป",
    "only_abbreviations": "ก.พ. ป.ป.ช. ธ.ก.ส. สป.อว. สนง.ก.พ. กทม. อบจ. สสวท. สพฐ. สกสค. ม.ค. มี.ค. เม.ย. พ.ค. มิ.ย.",
    "academic_titles": "คณะกรรมการ ได้แก่ ศ.ดร.สมศักดิ์ วงศ์ไพบูลย์ รศ.ดร.ปิยะนุช ธนกิจเจริญ และ ผศ.ณัฐพงษ์ ศรีสุวรรณ",
    "medical": "ผู้ป่วยเบาหวานชนิดที่ ๒ ควรได้รับเมทฟอร์มิน ๕๐๐ มก. วันละ ๒ ครั้ง หลังอาหาร หาก eGFR < ๓๐ ให้หยุดยา",
    "company": "บริษัท ไอเอ็มซี อินสติทิวท์ จำกัด. และ บจก. ตัวอย่าง ได้ลงนามในสัญญาเมื่อ เม.ย. ๒๕๖๗",
    "transliteration": "แพลตฟอร์มคลาวด์รองรับไมโครเซอร์วิส คอนเทนเนอร์ และเวกเตอร์ดาต้าเบส ผ่านเอพีไอแบบเรสต์ฟูล",
    "law": "พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. ๒๕๖๒ กำหนดให้ผู้ควบคุมข้อมูลส่วนบุคคลต้องจัดให้มีมาตรการรักษาความมั่นคงปลอดภัย",
    "table": "| รายการ | จำนวน | ราคา (บาท) |\n|---|---|---|\n| ค่าเดินทาง | ๒ | ๑,๕๐๐.๐๐ |\n| ค่าที่พัก | ๓ คืน | ๔,๕๐๐ |",
    "chat": "555 อันนี้ดีมากกกก ชอบๆๆ เดี๋ยวลองดูนะคะ โอเคค่ะะ",
}


@pytest.mark.parametrize("name", REALISTIC)
def test_realistic_thai_is_ok(name):
    result = quality_check(normalize(REALISTIC[name]))
    assert result.flag == "ok", result


def test_abbreviations_cannot_hide_garbled_text():
    official = REALISTIC["government"] + " " + REALISTIC["academic_titles"]
    assert quality_check(leading_vowel_after_consonant(official)).flag == "garbled"
    # every letter turned into a one-letter "abbreviation"
    dotted = " ".join(ch + "." for ch in LEAVE_POLICY.replace(" ", ""))
    assert quality_check(dotted).flag == "garbled"


@pytest.mark.parametrize(
    "garble",
    [leading_vowel_after_consonant, tone_before_vowel, space_every_character, legacy_font_glyphs],
)
def test_garbled_thai_is_flagged(garble):
    assert quality_check(garble(LEAVE_POLICY)).flag == "garbled"


def test_normalize_repairs_tone_order_before_the_check():
    # The pipeline normalizes first, so swapped tone marks are fixed rather than rejected
    assert quality_check(normalize(tone_before_vowel(LEAVE_POLICY))).flag == "ok"


@pytest.mark.parametrize(
    "text",
    [
        "Employees are entitled to ten working days of annual leave per year.",
        "Revenue grew 12% in Q3 2024; see Table 4 for details. Contact: hr@example.com",
        "Our HR policy (นโยบาย) applies to all staff in every office worldwide.",
        "",
    ],
)
def test_english_or_little_thai_is_ok(text):
    assert quality_check(text).flag == "ok"


def test_threshold_is_configurable():
    garbled = leading_vowel_after_consonant(LEAVE_POLICY)
    assert quality_check(garbled, threshold=0.99).flag == "garbled"
    assert quality_check(LEAVE_POLICY, threshold=0.0).flag == "ok"


# --------------------------------------------------------------------------- tokenize


def test_tokenize_words_drops_whitespace_and_keeps_english():
    tokens = tokenize_words("พนักงาน ลาพักผ่อน\n\nได้ปีละ 10 วัน (annual leave)")
    assert all(t.strip() for t in tokens)
    assert {"พนักงาน", "10", "annual", "leave", "(", ")"} <= set(tokens)


def test_codes_stay_whole_and_symbols_split_off():
    assert tokenize_words("ดูตั๋ว KNOW-07, เวอร์ชัน v2.5 ที่ hr@example.com ปีละ10วัน") == [
        "ดู", "ตั๋ว", "KNOW-07", ",", "เวอร์ชัน", "v2.5", "ที่", "hr", "@", "example.com", "ปี", "ละ", "10", "วัน",
    ]  # fmt: skip


def test_tokenize_is_deterministic():
    assert tokenize_words(LEAVE_POLICY) == tokenize_words(LEAVE_POLICY)


def test_shipped_custom_words_are_not_split():
    tokens = tokenize_words("ระบบนิวรอนโนวเลจของไอเอ็มซี")
    assert "นิวรอนโนวเลจ" in tokens
    assert "ไอเอ็มซี" in tokens


@pytest.fixture
def custom_words(tmp_path, monkeypatch):
    path = tmp_path / "custom_words.txt"
    monkeypatch.setattr(thai_text, "CUSTOM_WORDS_PATH", path)
    thai_text.get_trie.cache_clear()
    yield path
    thai_text.get_trie.cache_clear()


def test_custom_words_file_keeps_words_whole(custom_words):
    word = "ซูเปอร์ฟาสต์คลาวด์"  # a made-up product name newmm would split
    assert word not in tokenize_words(f"ใช้{word}ทุกวัน")

    custom_words.write_text(f"# product names\n{word}\n", encoding="utf-8")
    thai_text.get_trie.cache_clear()
    assert word in tokenize_words(f"ใช้{word}ทุกวัน")


def test_load_custom_words_skips_comments_and_blanks(tmp_path):
    path = tmp_path / "words.txt"
    path.write_text("# comment\n\nNeuronKnowledge\n  ไอเอ็มซี  \n", encoding="utf-8")
    assert thai_text.load_custom_words(path) == {"NeuronKnowledge", "ไอเอ็มซี"}
    assert thai_text.load_custom_words(tmp_path / "missing.txt") == set()


# --------------------------------------------------------------------------- sentences


def test_split_thai_paragraph_into_sentences():
    sentences = split_sentences(LEAVE_POLICY)
    assert len(sentences) >= 2
    assert "".join(sentences).replace(" ", "") == LEAVE_POLICY.replace(" ", "")


def test_split_english_paragraph_with_regex():
    text = "Leave is ten days. Requests need approval! Is carry-over allowed? Yes, up to 5 days."
    assert split_sentences(text) == [
        "Leave is ten days.",
        "Requests need approval!",
        "Is carry-over allowed?",
        "Yes, up to 5 days.",
    ]


def test_each_line_is_a_boundary():
    assert split_sentences("- รายการแรก\n- second item\n\n") == ["- รายการแรก", "- second item"]
    assert split_sentences("") == []


def test_warmup_loads_models():
    thai_text.warmup()
    assert "ภาษา" in thai_text.get_trie()
