"""
Configuration settings for Question Generation Service.

Uses Pydantic Settings for environment-based configuration.
"""

from functools import lru_cache
from typing import List, Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Service Info
    PROJECT_NAME: str = "Question Generation Service"
    VERSION: str = "1.0.0"
    SERVICE_NAME: str = "question-generation-svc"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = False
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Model Settings
    QG_MODEL_NAME: str = Field(
        default="valhalla/t5-base-qg-hl",
        description="HuggingFace model for question generation",
    )
    SENTENCE_TRANSFORMER_MODEL: str = Field(
        default="all-MiniLM-L6-v2",
        description="Sentence transformer for semantic similarity",
    )
    SPACY_MODEL: str = Field(
        default="en_core_web_sm",
        description="spaCy model for NER and NLP",
    )
    DEVICE: str = Field(
        default="cpu",
        description="Device for model inference (cpu/cuda)",
    )
    MAX_INPUT_LENGTH: int = Field(
        default=512,
        description="Maximum input sequence length",
    )
    MAX_OUTPUT_LENGTH: int = Field(
        default=64,
        description="Maximum output sequence length for generation",
    )
    NUM_BEAMS: int = Field(
        default=4,
        description="Number of beams for beam search",
    )

    # Generation Settings
    DEFAULT_NUM_QUESTIONS: int = Field(
        default=5,
        ge=1,
        le=20,
        description="Default number of questions to generate",
    )
    DEFAULT_NUM_DISTRACTORS: int = Field(
        default=3,
        ge=2,
        le=5,
        description="Default number of distractors for MCQ",
    )
    MIN_QUALITY_SCORE: float = Field(
        default=0.6,
        ge=0.0,
        le=1.0,
        description="Minimum quality score threshold",
    )

    # Service URLs (for integration)
    CURRICULUM_SERVICE_URL: str = Field(
        default="http://curriculum-py-svc:8000",
        description="URL of the curriculum service",
    )
    GRADING_ENGINE_URL: str = Field(
        default="http://grading-engine:8000",
        description="URL of the grading engine",
    )

    # Redis for caching
    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection URL",
    )
    CACHE_TTL_SECONDS: int = Field(
        default=3600,
        description="Cache time-to-live in seconds",
    )
    CACHE_ENABLED: bool = Field(
        default=True,
        description="Enable/disable caching",
    )

    # Resource Limits
    MAX_PASSAGE_LENGTH: int = Field(
        default=5000,
        description="Maximum passage length in characters",
    )
    MAX_BATCH_SIZE: int = Field(
        default=10,
        description="Maximum batch size for generation",
    )
    REQUEST_TIMEOUT_SECONDS: int = Field(
        default=60,
        description="Request timeout in seconds",
    )

    # Logging
    LOG_LEVEL: str = Field(
        default="INFO",
        description="Logging level",
    )
    LOG_FORMAT: str = Field(
        default="json",
        description="Log format (json/text)",
    )

    # CORS
    CORS_ORIGINS: List[str] = Field(
        default=["*"],
        description="Allowed CORS origins",
    )


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Global settings instance
settings = get_settings()
