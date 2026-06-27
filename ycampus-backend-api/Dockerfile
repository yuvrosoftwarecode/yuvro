# Multi-stage build for Django backend
FROM python:3.11-slim as base

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set work directory
WORKDIR /app

# Install system dependencies including language runtimes for code execution
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        postgresql-client \
        build-essential \
        libpq-dev \
        gcc \
        g++ \
        nodejs \
        npm \
        default-jre-headless \
        default-jdk-headless \
        curl \
        wget \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Development stage
FROM base as development
# Cache-bust: forces COPY . . to always run with latest code
ARG CACHEBUST=1
COPY . .
EXPOSE 8000
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

# Production stage
FROM base as production
# Cache-bust: forces COPY . . to always run with latest code
ARG CACHEBUST=1
COPY . .
# Collect static files at build time so WhiteNoise can serve them
RUN mkdir -p /app/staticfiles \
    && SECRET_KEY=build-placeholder \
       DATABASE_URL=sqlite:///tmp/build.db \
       APP_NAME=ycampus \
       AWS_STORAGE_BUCKET_NAME=build-placeholder \
       AWS_S3_REGION_NAME=ap-south-1 \
       AWS_S3_ENDPOINT_URL= \
       AWS_S3_ADDRESSING_STYLE=virtual \
       AWS_S3_PUBLIC_ENDPOINT_URL= \
       AWS_ACCESS_KEY_ID=build-placeholder \
       AWS_SECRET_ACCESS_KEY=build-placeholder \
       python manage.py collectstatic --noinput
EXPOSE 8000
# Use gunicorn with the correct Django project module (yc-backend-api folder)
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "120", "yc-backend-api.wsgi:application"]