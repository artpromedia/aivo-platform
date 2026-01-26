"""
Configuration settings for Vision Analysis Service.

Uses pydantic-settings for environment variable management.
"""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Service metadata
    PROJECT_NAME: str = "Vision Analysis Service"
    VERSION: str = "1.0.0"
    SERVICE_NAME: str = "vision-analysis-svc"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    API_V1_STR: str = "/api/v1"

    # Server configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Model settings - Handwriting Recognition
    TROCR_MODEL: str = "microsoft/trocr-base-handwritten"
    EASYOCR_LANGUAGES: List[str] = ["en"]
    OCR_CONFIDENCE_THRESHOLD: float = 0.7

    # Model settings - Math Equation Detection
    LATEX_OCR_MODEL: str = "OleehyO/latex-ocr"
    MAX_EQUATION_RESOLUTION: int = 1024

    # Model settings - Diagram Analysis
    CHART_DETECTION_MODEL: str = "microsoft/table-transformer-detection"
    ENABLE_DIAGRAM_OCR: bool = True

    # Device configuration
    DEVICE: str = "cpu"
    USE_GPU_IF_AVAILABLE: bool = True

    # Image processing limits
    MAX_IMAGE_SIZE_MB: int = 10
    MAX_RESOLUTION: int = 4096
    DEFAULT_OUTPUT_DPI: int = 300
    MIN_IMAGE_DIMENSION: int = 32

    # Processing timeouts (milliseconds)
    OCR_TIMEOUT_MS: int = 30000
    MATH_RECOGNITION_TIMEOUT_MS: int = 30000
    DIAGRAM_ANALYSIS_TIMEOUT_MS: int = 60000

    # Service URLs for integration
    DOCUMENT_INTELLIGENCE_URL: str = "http://document-intelligence-svc:8000"
    GRADING_ENGINE_URL: str = "http://grading-engine:8000"

    # Cache settings
    REDIS_URL: str = "redis://localhost:6379/0"
    CACHE_PROCESSED_IMAGES: bool = True
    CACHE_TTL: int = 3600  # seconds
    ENABLE_CACHE: bool = True

    # Batch processing
    MAX_BATCH_SIZE: int = 5
    BATCH_TIMEOUT_MS: int = 120000

    # Document Scanner settings
    SCANNER_AUTO_ENHANCE: bool = True
    SCANNER_DENOISE_STRENGTH: float = 10.0
    SCANNER_CONTRAST_METHOD: str = "clahe"

    # Multimodal fusion settings
    FUSION_STRATEGY: str = "attention"
    EMBEDDING_DIM: int = 512

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"  # or "text"

    # CORS
    CORS_ORIGINS: List[str] = ["*"]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["*"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]

    # Metrics
    ENABLE_METRICS: bool = True
    METRICS_PATH: str = "/metrics"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Convenience exports
settings = get_settings()
