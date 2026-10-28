"""Stand-in for the OCR model (knowledge.ocr)."""

from collections.abc import Callable


class FakeOcr:
    model = "fake-ocr"

    def __init__(self, text: str | Callable[[bytes], str] = "ข้อความจากหน้าสแกน"):
        self.text = text
        self.images: list[bytes] = []

    def read(self, image: bytes) -> str:
        self.images.append(image)
        return self.text(image) if callable(self.text) else self.text
