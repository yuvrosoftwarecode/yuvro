# syntax=docker/dockerfile:1.7
# TanStack Start SSR build for YLabs React frontend
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

# ── build: compile TanStack Start SSR bundle ──────────────────────────────────
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
# Verify build output
RUN if [ ! -d /app/dist/server ] || [ ! -f /app/dist/server/server.js ]; then \
      echo "ERROR: Build failed - no dist/server/server.js" && \
      ls -la /app/dist/ && exit 1; \
    fi && \
    if [ ! -d /app/dist/client ]; then \
      echo "ERROR: Build failed - no dist/client" && \
      exit 1; \
    fi && \
    echo "✓ SSR build successful"

# ── serve: Node.js server with TanStack Start ──────────────────────────────────
FROM node:20-alpine AS serve
WORKDIR /app
ENV NODE_ENV=production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy built application and dependencies
COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/dist /app/dist
COPY --from=build /app/node_modules /app/node_modules

EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server/server.js"]
