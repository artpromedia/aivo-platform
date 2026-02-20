# ==============================================================================
# AIVO Platform - ML Recommendation Service Dockerfile
# Python-based ML service for recommendations, risk prediction, and student brain modeling
# ==============================================================================

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY requirements.txt .
RUN pip install --no-cache-dir --retries 5 --timeout 120 -r requirements.txt

# Copy application code
COPY . .

# Create directories for models and non-root user
RUN mkdir -p models/hybrid models/risk models/student_brain \
    && useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Environment variables
ENV PYTHONUNBUFFERED=1 \
    PORT=8000

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run with Gunicorn for production
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
