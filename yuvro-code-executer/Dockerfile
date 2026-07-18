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
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Cache-bust: forces COPY . . to always run with latest code
ARG CACHEBUST=1

# Copy application code
COPY . .

# Expose port
EXPOSE 8009

# Run the application
CMD ["python", "run_server.py"]