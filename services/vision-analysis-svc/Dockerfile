# Vision Analysis Service Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for OpenCV, OCR, and computer vision
RUN apt-get update && apt-get install -y --no-install-recommends \
    # OpenCV dependencies
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    # Build tools
    build-essential \
    cmake \
    pkg-config \
    # Image processing
    libjpeg-dev \
    libpng-dev \
    libtiff-dev \
    # Video processing
    ffmpeg \
    libavcodec-dev \
    libavformat-dev \
    libswscale-dev \
    # OCR dependencies
    tesseract-ocr \
    tesseract-ocr-eng \
    libtesseract-dev \
    libleptonica-dev \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables for OpenCV
ENV OPENCV_IO_ENABLE_OPENEXR=1

# Copy requirements and install Python dependencies
COPY requirements.txt .

# Install PyTorch CPU version first (smaller image size)
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Install remaining dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user for security
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app

# Create directories for model cache
RUN mkdir -p /app/.cache/huggingface /app/.cache/easyocr && \
    chown -R appuser:appuser /app/.cache

USER appuser

# Environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    HOST=0.0.0.0 \
    HF_HOME=/app/.cache/huggingface \
    EASYOCR_MODULE_PATH=/app/.cache/easyocr \
    TRANSFORMERS_CACHE=/app/.cache/huggingface \
    TORCH_HOME=/app/.cache/torch

# Expose port
EXPOSE 8000

# Health check (using Python instead of curl)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
