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
COPY . .
EXPOSE 8000
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

# Production stage
FROM base as production
COPY . .
# Create static directory
RUN mkdir -p /app/staticfiles
EXPOSE 8000
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "backend.wsgi:application"]