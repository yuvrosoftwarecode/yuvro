# syntax=docker/dockerfile:1.7
# Static SPA build for YLabs React frontend - plain Vite (no SSR)
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

# ── build: compile static SPA bundle ──────────────────────────────────────────
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
# Verify build output exists
RUN if [ ! -f /app/dist/index.html ]; then \
      echo "ERROR: Build failed - index.html not found" && \
      ls -la /app/dist/ && exit 1; \
    fi && \
    echo "✓ SPA build successful" && \
    find /app/dist -maxdepth 1 -type f | head -10

# ── serve: nginx serving SPA static files ──────────────────────────────────────
FROM nginx:alpine AS serve
# Remove default nginx content
RUN rm -rf /usr/share/nginx/html/*

# Copy SPA dist to nginx webroot
COPY --from=build /app/dist /usr/share/nginx/html

# Configure nginx for SPA: all non-file requests → index.html for client-side routing
RUN cat > /etc/nginx/conf.d/default.conf <<'EOF'
server {
  listen 80;
  server_name _;
  client_max_body_size 50M;

  # Disable gzip for better control over caching
  gzip off;

  # Cache busting: assets with hash in filename = long cache
  location ~* /assets/.*\.[a-f0-9]{8,}\.(js|css|woff2|png|jpg|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  # Static files = moderate cache
  location ~* \.(png|jpg|jpeg|gif|ico|svg)$ {
    expires 7d;
    add_header Cache-Control "public";
  }

  # SPA routing: send all requests to index.html for client-side routing
  location / {
    try_files $uri /index.html;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
  }
}
EOF

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
