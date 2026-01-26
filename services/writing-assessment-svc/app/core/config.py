"""
Configuration settings for Writing Assessment Service.

Uses pydantic-settings for environment variable management.
"""

from functools import lru_cache
from typing import List, Optional

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
    PROJECT_NAME: str = "Writing Assessment Service"
    VERSION: str = "1.0.0"
    SERVICE_NAME: str = "writing-assessment-svc"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    API_V1_STR: str = "/api/v1"

    # Server configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Model settings
    ESSAY_SCORER_MODEL: str = "allenai/longformer-base-4096"
    SENTENCE_TRANSFORMER_MODEL: str = "all-MiniLM-L6-v2"
    DEVICE: str = "cpu"

    # Essay scoring configuration
    SCORING_MODE: str = "holistic"  # or "trait-based"
    MAX_ESSAY_LENGTH: int = 2048
    HOLISTIC_SCORE_MIN: int = 1
    HOLISTIC_SCORE_MAX: int = 6
    TRAIT_SCORE_MIN: int = 0
    TRAIT_SCORE_MAX: int = 4

    # Language Tool settings
    LANGUAGE_TOOL_HOST: str = "localhost"
    LANGUAGE_TOOL_PORT: int = 8081
    LANGUAGE_TOOL_LANGUAGE: str = "en-US"

    # Text limits
    MAX_TEXT_LENGTH: int = 10000
    MIN_TEXT_LENGTH: int = 50

    # Service URLs for integration
    GRADING_ENGINE_URL: str = "http://grading-engine:8000"
    CURRICULUM_SERVICE_URL: str = "http://curriculum-svc:8000"

    # Cache settings
    REDIS_URL: str = "redis://localhost:6379/0"
    CACHE_TTL: int = 3600  # seconds
    ENABLE_CACHE: bool = True

    # Batch processing
    MAX_BATCH_SIZE: int = 10
    BATCH_TIMEOUT: int = 60000  # milliseconds

    # Quality thresholds
    MIN_COHERENCE_SCORE: float = 0.3
    MIN_GRAMMAR_SCORE: float = 0.5

    # Feedback settings
    DEFAULT_FEEDBACK_STYLE: str = "encouraging"
    MAX_SUGGESTIONS: int = 5
    FEEDBACK_DETAIL_LEVELS: List[str] = ["brief", "medium", "detailed"]

    # Readability settings
    TARGET_GRADE_LEVELS: List[int] = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

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
