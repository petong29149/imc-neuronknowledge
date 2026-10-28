"""Show what a converter extracts from a file — for checking real documents by hand.

    docker compose run --rm --no-deps worker python -m knowledge.converters tests/fixtures/real/report.pdf
    ... --full        print every section in full (default: first 300 characters)
    ... --json        machine-readable output

Nothing is stored; the file is only read.
"""

import argparse
import json
import sys
from dataclasses import asdict
from pathlib import Path

from knowledge.converters import convert
from knowledge.errors import PermanentError
from knowledge.file_types import UnsupportedFileError, detect_file_type
from knowledge.thai_text import quality_check

PREVIEW = 300


def main() -> int:
    parser = argparse.ArgumentParser(prog="python -m knowledge.converters", description=__doc__.splitlines()[0])
    parser.add_argument("path", type=Path)
    parser.add_argument("--full", action="store_true", help="print sections in full")
    parser.add_argument("--json", action="store_true", help="print JSON")
    args = parser.parse_args()

    data = args.path.read_bytes()
    try:
        file_type = detect_file_type(args.path.name, data)
        result = convert(file_type.name, data)
    except (UnsupportedFileError, PermanentError) as err:
        status = getattr(err, "doc_status", "failed")
        print(f"✗ {type(err).__name__} (status={status}): {err}")
        return 1

    if args.json:
        print(json.dumps(asdict(result), ensure_ascii=False, indent=2))
        return 0

    print(f"file:         {args.path.name} ({file_type.label}, {len(data):,} bytes)")
    print(f"pages/slides: {result.page_count}")
    print(f"sections:     {len(result.sections)} ({sum(s.is_table for s in result.sections)} tables)")
    print(f"quality:      {result.quality_flag}")
    print(f"metadata:     {json.dumps(result.metadata, ensure_ascii=False)}")
    for warning in result.warnings:
        print(f"warning:      {warning}")
    for i, section in enumerate(result.sections, start=1):
        where = [
            f"page {section.page}" if section.page else None,
            f"label {section.page_label!r}" if section.page_label else None,
            f"slide {section.slide}" if section.slide else None,
            "TABLE" if section.is_table else None,
        ]
        q = quality_check(section.text)
        print(f"\n── section {i} · {' · '.join(w for w in where if w) or 'no page'} · {len(section.text):,} chars "
              f"· quality {q.flag} (score {q.score:.2f})")  # fmt: skip
        if section.heading_path:
            print(f"   heading: {' > '.join(section.heading_path)}")
        text = section.text if args.full or len(section.text) <= PREVIEW else section.text[:PREVIEW] + " …"
        print("   " + text.replace("\n", "\n   "))
    return 0


if __name__ == "__main__":
    sys.exit(main())
