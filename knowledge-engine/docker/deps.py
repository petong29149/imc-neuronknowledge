"""Print requirement lines from pyproject.toml, so the Dockerfile can install
dependencies in their own cached layer before the source code is copied.

    python docker/deps.py          # [project].dependencies
    python docker/deps.py dev      # [project.optional-dependencies].dev
"""

import sys
import tomllib
from pathlib import Path

pyproject = tomllib.loads((Path(__file__).resolve().parents[1] / "pyproject.toml").read_text("utf-8"))
project = pyproject["project"]
group = sys.argv[1] if len(sys.argv) > 1 else None
print("\n".join(project["optional-dependencies"][group] if group else project["dependencies"]))
