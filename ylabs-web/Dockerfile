# syntax=docker/dockerfile:1.7
# Multi-stage build for YLabs React frontend (Vite + Bun + TanStack Start SSR)
# BuildKit is required: DOCKER_BUILDKIT=1
# Optimized for faster builds with aggressive caching and minimal production image

# ── base: install dependencies (cached layer) ─────────────────────────────────
FROM oven/bun:1-alpine AS base
WORKDIR /app
RUN apk add --no-cache curl
COPY bunfig.toml package.json bun.lock* ./
# Bun cache mount: avoids re-downloading packages on every build
# Use persistent cache across builds for faster installation
RUN --mount=type=cache,target=/root/.bun/install/cache,sharing=locked \
    bun install --frozen-lockfile --production

# ── build ─────────────────────────────────────────────────────────────────────
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
# Only copy source files needed for build
COPY tsconfig.json vite.config.ts bunfig.toml ./
COPY src ./src
COPY public ./public
# Build with optimizations: parallel build, skip typechecking (done in CI)
RUN bun run build --mode production

# ── serve: minimal production server ──────────────────────────────────────────
FROM oven/bun:1-alpine AS serve
WORKDIR /app
RUN apk add --no-cache curl
# Minimal production image - only copy built output and production dependencies
COPY --from=build /app/.output /app/.output
COPY --from=base /app/node_modules /app/node_modules
COPY package.json ./
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=10s --retries=5 --start-period=10s \
    CMD curl -f http://localhost:3000/ || exit 1
CMD ["bun", "run", ".output/server/index.mjs"]

# ── development: Vite dev server with HMR ────────────────────────────────────
FROM base AS development
ARG CACHEBUST=1
COPY . .
EXPOSE 3000
CMD ["bunx", "vite", "dev", "--host", "0.0.0.0", "--port", "3000"]


