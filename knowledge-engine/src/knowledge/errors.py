"""How a job failure is handled by the worker (plan T3)."""


class PermanentError(Exception):
    """Retrying cannot help (broken or unsupported file, no text, password-protected PDF).
    The message is Thai and is shown to the user as documents.error."""

    doc_status = "failed"
    quality_flag: str | None = None


class NeedsOcrError(PermanentError):
    """The document is scanned images with no text layer (OCR is Phase 2, KNOW-13)."""

    doc_status = "needs_ocr"
    quality_flag = "needs_ocr"


class TransientError(Exception):
    """Worth retrying with backoff (OpenAI 429/5xx, Qdrant or storage unavailable).
    Unexpected exceptions are treated the same way."""


class JobInterrupted(Exception):
    """The worker is shutting down; put the job back without counting an attempt."""
