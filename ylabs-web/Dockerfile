# syntax=docker/dockerfile:1.7
# Multi-stage build for YLabs React frontend with SSR (TanStack Start + Nitro)
# BuildKit is required: DOCKER_BUILDKIT=1

# ── base: install dependencies (cached layer) ─────────────────────────────────
FROM oven/bun:1-alpine AS base
WORKDIR /app
RUN apk add --no-cache curl
COPY package.json bun.lock* ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install || bun install --no-save

# ── development: Vite dev server with HMR ────────────────────────────────────
FROM base AS development
ARG CACHEBUST=1
COPY . .
EXPOSE 3000
CMD ["bunx", "vite", "dev", "--host", "0.0.0.0", "--port", "3000"]

# ── build: compile static bundle with Nitro SSR ─────────────────────────────
FROM base AS build
ARG VITE_BACKEND_API_BASE_URL
ARG VITE_YHUB_BACKEND_API_BASE_URL
ARG VITE_YCODE_BACKEND_API_BASE_URL
ARG VITE_CODE_EXECUTOR_BASE_URL
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_DEPLOY_COMMIT_SHA
ARG VITE_DEPLOY_BRANCH
ARG VITE_DEPLOY_APP_VERSION
ARG CACHEBUST=1
ENV VITE_BACKEND_API_BASE_URL=$VITE_BACKEND_API_BASE_URL \
    VITE_YHUB_BACKEND_API_BASE_URL=$VITE_YHUB_BACKEND_API_BASE_URL \
    VITE_YCODE_BACKEND_API_BASE_URL=$VITE_YCODE_BACKEND_API_BASE_URL \
    VITE_CODE_EXECUTOR_BASE_URL=$VITE_CODE_EXECUTOR_BASE_URL \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    VITE_DEPLOY_COMMIT_SHA=$VITE_DEPLOY_COMMIT_SHA \
    VITE_DEPLOY_BRANCH=$VITE_DEPLOY_BRANCH \
    VITE_DEPLOY_APP_VERSION=$VITE_DEPLOY_APP_VERSION
COPY . .
RUN bun run build
# Normalize output: copy .output/public or dist/client to /app/dist-output
# For TanStack builds, we need the dist/client folder which has the SPA assets
RUN mkdir -p /app/dist-output && \
    if [ -d /app/.output/public ]; then \
        echo "Using .output/public (Nitro SSR)" && \
        cp -r /app/.output/public/* /app/dist-output/; \
    elif [ -d /app/dist/client ]; then \
        echo "Using dist/client (TanStack/Vite SPA)" && \
        echo "Files in dist/client:" && ls -la /app/dist/client/ && \
        cp -r /app/dist/client/* /app/dist-output/ && \
        echo "Files copied to dist-output:" && ls -la /app/dist-output/; \
    elif [ -d /app/dist ]; then \
        echo "Using dist (Plain Vite SPA)" && \
        cp -r /app/dist/* /app/dist-output/; \
    else \
        echo "ERROR: No build output found" && \
        exit 1; \
    fi

# ── serve: minimal nginx serving normalized static files ──────────────────────────────
FROM nginx:alpine AS serve
# Remove default nginx files first
RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /app/dist-output /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
