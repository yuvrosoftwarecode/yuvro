# syntax=docker/dockerfile:1.7
# Multi-stage build for YHub Django backend
# BuildKit is required: DOCKER_BUILDKIT=1

# ── base ──────────────────────────────────────────────────────────────────────
FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
        postgresql-client \
        libpq-dev \
        curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    apt-get update -qq && apt-get install -y --no-install-recommends gcc build-essential -qq 2>/dev/null; \
    pip install --no-cache-dir -r requirements.txt; \
    apt-get purge -y --auto-remove gcc build-essential 2>/dev/null || true; \
    rm -rf /var/lib/apt/lists/*

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
RUN mkdir -p /app/staticfiles \
    && SECRET_KEY=build-placeholder DATABASE_URL=sqlite:///tmp/build.db \
       python manage.py collectstatic --noinput 2>/dev/null || true
EXPOSE 8000
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "120", "yhub-backend-api.wsgi:application"]
