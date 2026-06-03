# Multi-stage build for React frontend
FROM node:20-alpine as base

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (use npm install to handle missing lock file)
RUN apk add --no-cache curl && npm install && npm cache clean --force

# Development stage
FROM base as development
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Build stage - accepts VITE_ env vars as build args so they are baked into the bundle
FROM base as build
# Declare build args (passed via docker-compose build.args or --build-arg)
ARG VITE_BACKEND_API_BASE_URL
ARG VITE_CODE_EXECUTOR_BASE_URL
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_DEPLOY_COMMIT_SHA
ARG VITE_DEPLOY_BRANCH
ARG VITE_DEPLOY_APP_VERSION
# Expose them as env vars so Vite picks them up at build time
ENV VITE_BACKEND_API_BASE_URL=$VITE_BACKEND_API_BASE_URL
ENV VITE_CODE_EXECUTOR_BASE_URL=$VITE_CODE_EXECUTOR_BASE_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_DEPLOY_COMMIT_SHA=$VITE_DEPLOY_COMMIT_SHA
ENV VITE_DEPLOY_BRANCH=$VITE_DEPLOY_BRANCH
ENV VITE_DEPLOY_APP_VERSION=$VITE_DEPLOY_APP_VERSION
COPY . .
RUN npm run build

# Serve stage - serves pre-built static files via nginx (fast, no Node.js overhead)
# Used for dev, staging, and production deployments
FROM nginx:alpine as serve
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]