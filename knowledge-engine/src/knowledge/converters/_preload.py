"""Imported once by the converter forkserver (converters/isolated.py): every child forked from
it already has the converters imported and the Thai dictionary and models loaded."""

from knowledge import thai_text
from knowledge.converters import docx, image, pdf, pptx, text  # noqa: F401

thai_text.warmup()
