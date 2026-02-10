# Training Service Dockerfile
# Part of AIVO Platform ML Infrastructure

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for ML
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies, download spaCy model, and create directories
RUN pip install --no-cache-dir -r requirements.txt \
    && (python -m spacy download en_core_web_sm || true)

# Copy application code
COPY . .

# Create directories for models and non-root user
RUN mkdir -p models/learners models/checkpoints \
    && useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/training/health || exit 1

# Expose port
EXPOSE 8000

# Run with Gunicorn for production
CMD ["gunicorn", "app.main:app", \
     "--workers", "4", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8000", \
     "--timeout", "120", \
     "--log-level", "info"]
