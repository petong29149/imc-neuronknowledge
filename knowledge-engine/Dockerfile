# syntax=docker/dockerfile:1
# One image for api / worker / mcp / migrate (they must share thai_text.py and bm25.py — plan §3).
# Targets: base (no torch) · dev (base + pytest/ruff) · rerank (base + torch CPU + sentence-transformers)
#          · dev-rerank (dev + the same, for running the reranker under the dev override)

FROM python:3.11-slim-bookworm AS base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONPATH=/app/src \
    PYTHAINLP_DATA=/opt/pythainlp-data \
    TIKTOKEN_CACHE_DIR=/opt/tiktoken-cache \
    HF_HOME=/opt/hf-cache
WORKDIR /app

# Dependencies first, in their own layer: rebuilt only when pyproject.toml changes
COPY pyproject.toml ./
# Versions are locked by docker/constraints.txt (what the test suite passed with)
COPY docker/deps.py docker/constraints.txt ./docker/
RUN python docker/deps.py > /tmp/requirements.txt \
 && pip install -c docker/constraints.txt -r /tmp/requirements.txt

# Code runs from /app/src via PYTHONPATH (not installed), so dev can bind-mount it
COPY src/ ./src/
COPY migrations/ ./migrations/
COPY resources/ ./resources/
# Load the dictionary, the crfcut model and the tiktoken encodings once so their data files
# are in the image (tiktoken would otherwise download them at runtime)
RUN python -c "from knowledge import chunker, thai_text; thai_text.warmup(); chunker.warmup()"

RUN useradd --create-home --uid 10001 app \
 && mkdir -p /opt/hf-cache /data/files \
 && chown -R app /opt /data
USER app
# CMD is set per service in docker-compose.yml


FROM base AS dev
USER root
# A Thai TrueType font so tests can generate Thai PDFs (dev image only)
RUN apt-get update && apt-get install -y --no-install-recommends fonts-tlwg-garuda-ttf \
 && rm -rf /var/lib/apt/lists/*
RUN python docker/deps.py dev > /tmp/requirements-dev.txt \
 && pip install -c docker/constraints.txt -r /tmp/requirements-dev.txt
COPY tests/ ./tests/
# pytest and ruff write their caches under /app
RUN chown app /app
USER app


FROM base AS rerank
USER root
RUN pip install -c docker/constraints.txt torch --index-url https://download.pytorch.org/whl/cpu \
 && python docker/deps.py rerank > /tmp/requirements-rerank.txt \
 && pip install -c docker/constraints.txt -r /tmp/requirements-rerank.txt
# The reranker model (~2GB) is NOT baked in: it downloads into the hf_cache volume (HF_HOME)
USER app


FROM dev AS dev-rerank
USER root
RUN pip install -c docker/constraints.txt torch --index-url https://download.pytorch.org/whl/cpu \
 && python docker/deps.py rerank > /tmp/requirements-rerank.txt \
 && pip install -c docker/constraints.txt -r /tmp/requirements-rerank.txt
USER app
