"""
Configuration settings for Cognitive Load Service.

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
    PROJECT_NAME: str = "Cognitive Load Service"
    VERSION: str = "1.0.0"
    SERVICE_NAME: str = "cognitive-load-svc"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    API_V1_STR: str = "/api/v1"

    # Server configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Cognitive Load Thresholds
    LOW_LOAD_THRESHOLD: float = 0.3
    OPTIMAL_LOAD_THRESHOLD: float = 0.7
    HIGH_LOAD_THRESHOLD: float = 0.85
    CRITICAL_LOAD_THRESHOLD: float = 0.95

    # Working Memory Configuration
    DEFAULT_WM_CAPACITY: int = 7  # Miller's magic number
    WM_CHUNK_SIZE: int = 4  # Typical chunk size
    WM_DECAY_RATE: float = 0.1  # Per-second decay rate

    # Intrinsic Load Analysis
    MAX_ELEMENT_INTERACTIVITY: int = 10
    VOCABULARY_COMPLEXITY_WEIGHT: float = 0.25
    SYNTACTIC_COMPLEXITY_WEIGHT: float = 0.25
    CONCEPTUAL_DENSITY_WEIGHT: float = 0.3
    ELEMENT_INTERACTIVITY_WEIGHT: float = 0.2

    # Extraneous Load Detection
    MAX_DISTRACTORS: int = 5
    VISUAL_CLUTTER_THRESHOLD: float = 0.6
    NAVIGATION_COMPLEXITY_THRESHOLD: float = 0.5

    # Overload Prediction
    PREDICTION_WINDOW_SECONDS: int = 60
    OVERLOAD_WARNING_THRESHOLD: float = 0.8
    TREND_SENSITIVITY: float = 0.1

    # Scaffolding Configuration
    MIN_SCAFFOLDING_LEVEL: int = 1
    MAX_SCAFFOLDING_LEVEL: int = 5
    SCAFFOLDING_DECAY_SESSIONS: int = 3

    # Model settings
    SPACY_MODEL: str = "en_core_web_sm"
    TRANSFORMER_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    DEVICE: str = "cpu"
    USE_GPU_IF_AVAILABLE: bool = True

    # Processing limits
    MAX_TEXT_LENGTH: int = 10000
    MAX_CONTENT_ITEMS: int = 50
    ANALYSIS_TIMEOUT_MS: int = 30000

    # Service URLs for integration
    REALTIME_SVC_URL: str = "http://realtime-svc:8000"
    TRAINING_SVC_URL: str = "http://training-svc:8000"
    CONTENT_SVC_URL: str = "http://content-svc:8000"
    SESSION_SVC_URL: str = "http://session-svc:8000"

    # Cache settings
    REDIS_URL: str = "redis://localhost:6379/0"
    ENABLE_CACHE: bool = True
    CACHE_TTL: int = 3600  # seconds

    # Batch processing
    MAX_BATCH_SIZE: int = 10
    BATCH_TIMEOUT_MS: int = 120000

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
