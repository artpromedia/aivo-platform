FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files
COPY pyproject.toml ./
RUN touch README.md

# Install Python dependencies
RUN pip install --no-cache-dir .

# Copy source code
COPY src/ ./src/

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Expose port
EXPOSE 8080

# Run the application
CMD ["python", "-m", "src.main"]
