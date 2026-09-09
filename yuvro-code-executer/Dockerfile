# syntax=docker/dockerfile:1.7
# YLabs Code Executor — FastAPI service for multi-language code execution
# BuildKit is required: DOCKER_BUILDKIT=1

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /app

# ── system dependencies ───────────────────────────────────────────────────────
# All installed in one layer with apt cache mount for fast rebuilds.
# Node / JDK / g++ are needed for multi-language code execution.
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        g++ \
        nodejs \
        npm \
        default-jre-headless \
        default-jdk-headless \
        curl \
        procps \
        git \
        libgl1 \
        libglib2.0-0 \
        sqlite3 \
        # Playwright Chromium runtime deps
        libnss3 \
        libnspr4 \
        libatk1.0-0 \
        libatk-bridge2.0-0 \
        libcups2 \
        libdrm2 \
        libxkbcommon0 \
        libxcomposite1 \
        libxdamage1 \
        libxfixes3 \
        libxrandr2 \
        libgbm1 \
        libasound2 \
    && rm -rf /var/lib/apt/lists/*

# ── Python dependencies ───────────────────────────────────────────────────────
# pip cache mount: repeated builds skip downloading packages already in cache.
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# ── Playwright browser ────────────────────────────────────────────────────────
# Separate cache mount so browser is not re-downloaded when requirements.txt changes.
RUN --mount=type=cache,target=/ms-playwright-cache \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright-cache playwright install --with-deps chromium \
    && mkdir -p /ms-playwright \
    && cp -r /ms-playwright-cache/chromium-* /ms-playwright/ 2>/dev/null || \
       PLAYWRIGHT_BROWSERS_PATH=/ms-playwright playwright install --with-deps chromium

# ── application code ──────────────────────────────────────────────────────────
# CACHEBUST must be AFTER all install steps so every code change doesn't
# invalidate the expensive pip / apt / playwright layers above.
ARG CACHEBUST=1
COPY . .

EXPOSE 8009
CMD ["python", "run_server.py"]
