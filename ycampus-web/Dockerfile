# syntax=docker/dockerfile:1.7
# Multi-stage build for YCampus React frontend
# BuildKit is required: DOCKER_BUILDKIT=1

# ── base: install dependencies (cached layer) ─────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache curl
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline

# ── development ───────────────────────────────────────────────────────────────
FROM base AS development
ARG CACHEBUST=1
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ── build ─────────────────────────────────────────────────────────────────────
FROM base AS build
ARG VITE_BACKEND_API_BASE_URL
ARG VITE_CODE_EXECUTOR_BASE_URL
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_DEPLOY_COMMIT_SHA
ARG VITE_DEPLOY_BRANCH
ARG VITE_DEPLOY_APP_VERSION
ARG CACHEBUST=1
ENV VITE_BACKEND_API_BASE_URL=$VITE_BACKEND_API_BASE_URL \
    VITE_CODE_EXECUTOR_BASE_URL=$VITE_CODE_EXECUTOR_BASE_URL \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    VITE_DEPLOY_COMMIT_SHA=$VITE_DEPLOY_COMMIT_SHA \
    VITE_DEPLOY_BRANCH=$VITE_DEPLOY_BRANCH \
    VITE_DEPLOY_APP_VERSION=$VITE_DEPLOY_APP_VERSION
COPY . .
RUN npx vite build

# ── serve ─────────────────────────────────────────────────────────────────────
FROM nginx:alpine AS serve
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
