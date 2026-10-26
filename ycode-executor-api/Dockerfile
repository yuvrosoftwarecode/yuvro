# syntax=docker/dockerfile:1.7
# YLabs Code Executor — FastAPI service for multi-language code execution
# BuildKit is required: DOCKER_BUILDKIT=1
# Uses `uv` for 10-100x faster pip installations

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# ── system dependencies ───────────────────────────────────────────────────────
# Minimal set for code execution + UI testing + database evaluation.
# - gcc/g++ for C/C++ code compilation
# - Node/NPM for JavaScript execution
# - JRE/JDK for Java code execution
# - libxrender/libxext for PIL/matplotlib (image processing)
# - sqlite3 for database evaluation
# - libpq5 for PostgreSQL driver (psycopg2)
# - curl for downloading uv installer
# - Note: pymysql is pure Python, doesn't need system libs
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        g++ \
        nodejs \
        npm \
        default-jre-headless \
        default-jdk-headless \
        maven \
        curl \
        git \
        libxrender1 \
        libxext6 \
        sqlite3 \
        libpq5 \
    && rm -rf /var/lib/apt/lists/*

# ── Install uv for faster dependency resolution and installation ────────────────
RUN curl -LsSf https://astral.sh/uv/install.sh | sh && \
    mv /root/.local/bin/uv /usr/local/bin/uv

# ── Python dependencies ────────────────────────────────────────────────────────
# Use uv for 10-100x faster installation compared to pip
# All dependencies are verified as actually used in code:
# - FastAPI + Uvicorn: REST API service
# - Playwright: For UI testing/scoring (API-only, no Chromium needed)
# - OpenTelemetry: Observability/tracing
# - Database drivers: PostgreSQL, MySQL, MongoDB
# - PIL/OpenCV/scikit-image/matplotlib/scipy: UI-DIFF (pixel comparison)
COPY requirements.txt .
RUN uv pip install --system --no-cache-dir -r requirements.txt

# ── application code ──────────────────────────────────────────────────────────
# CACHEBUST must be AFTER all install steps so every code change doesn't
# invalidate the expensive pip / apt layers above.
ARG CACHEBUST=1
COPY . .

EXPOSE 8009
CMD ["python", "run_server.py"]
