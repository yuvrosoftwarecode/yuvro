# Multi-stage build for YLabs React frontend (TanStack Start / SSR)
# Uses official bun image to avoid install script issues on all platforms
FROM oven/bun:1-alpine as base

WORKDIR /app

RUN apk add --no-cache curl

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Development stage — Vite dev server with HMR
FROM base as development
COPY . .
EXPOSE 3000
CMD ["bunx", "vite", "dev", "--host", "0.0.0.0", "--port", "3000"]

# Build stage
FROM base as build
ARG VITE_BACKEND_API_BASE_URL
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_DEPLOY_COMMIT_SHA
ARG VITE_DEPLOY_BRANCH
ARG VITE_DEPLOY_APP_VERSION
ENV VITE_BACKEND_API_BASE_URL=$VITE_BACKEND_API_BASE_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_DEPLOY_COMMIT_SHA=$VITE_DEPLOY_COMMIT_SHA
ENV VITE_DEPLOY_BRANCH=$VITE_DEPLOY_BRANCH
ENV VITE_DEPLOY_APP_VERSION=$VITE_DEPLOY_APP_VERSION
COPY . .
RUN bun run build

# Serve stage — SSR node server
FROM oven/bun:1-alpine as serve
WORKDIR /app
RUN apk add --no-cache curl
COPY --from=build /app/.output /app/.output
COPY --from=build /app/package.json /app/package.json
EXPOSE 3000
CMD ["bun", "run", ".output/server/index.mjs"]
