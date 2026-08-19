# Lightweight FastAPI service for code execution
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set work directory
WORKDIR /app

# Install system dependencies for code execution
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        gcc \
        g++ \
        nodejs \
        npm \
        default-jre-headless \
        default-jdk-headless \
        curl \
        procps \
        libgl1 \
        libglib2.0-0 \
        sqlite3 \
        git \
        postgresql-client \
        default-mysql-client \
    && rm -rf /var/lib/apt/lists/*

# Install mongosh
RUN curl -sS https://downloads.mongodb.com/compass/mongosh-2.2.12-linux-x64.tgz | tar -zxv -C /tmp \
    && cp /tmp/mongosh-2.2.12-linux-x64/bin/* /usr/local/bin/ \
    && rm -rf /tmp/mongosh-2.2.12-linux-x64

# Install Python dependencies
COPY requirements.txt .
RUN pip install --default-timeout=1000 --no-cache-dir -r requirements.txt
RUN playwright install --with-deps chromium

# Cache-bust: forces COPY . . to always run with latest code
ARG CACHEBUST=1

# Copy application code
COPY . .

# Expose port
EXPOSE 8009

# Run the application
CMD ["python", "run_server.py"]