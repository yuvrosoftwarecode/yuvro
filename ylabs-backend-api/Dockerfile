# syntax=docker/dockerfile:1.7
# Multi-stage build for YLabs Django backend (includes Playwright Chromium)
# BuildKit is required: DOCKER_BUILDKIT=1

# ── base: system deps + Python packages ──────────────────────────────────────
FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    # Playwright stores browser binaries here; we cache this directory
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /app

# System libraries required at runtime by psycopg + Playwright Chromium
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
        postgresql-client \
        libpq-dev \
        curl \
        git \
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

# Install Python deps (gcc only at build time)
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    apt-get update -qq && apt-get install -y --no-install-recommends gcc build-essential -qq \
    && pip install --no-cache-dir -r requirements.txt \
    && apt-get purge -y --auto-remove gcc build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Playwright Chromium — cached separately so pip changes don't redownload the browser
RUN --mount=type=cache,target=/ms-playwright-cache \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright-cache playwright install chromium \
    && mkdir -p /ms-playwright \
    && cp -r /ms-playwright-cache/chromium-* /ms-playwright/ 2>/dev/null || \
       PLAYWRIGHT_BROWSERS_PATH=/ms-playwright playwright install chromium

# ── development ───────────────────────────────────────────────────────────────
FROM base AS development
ARG CACHEBUST=1
COPY . .
EXPOSE 8000
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

# ── production ────────────────────────────────────────────────────────────────
FROM base AS production
ARG CACHEBUST=1
COPY . .
EXPOSE 8000
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "120", "ylabs-backend-api.wsgi:application"]
