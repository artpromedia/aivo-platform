"""
Grading Engine Configuration.

Pydantic settings for the grading engine service.
"""

from typing import List, Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Service configuration loaded from environment variables."""

    # Service Info
    SERVICE_NAME: str = "grading-engine"
    VERSION: str = "0.1.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Database
    DATABASE_URL: str = ""

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # AI Provider
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    DEFAULT_AI_PROVIDER: str = "openai"
    DEFAULT_MODEL: str = "gpt-4o"

    # Grading Settings
    MAX_RESPONSE_LENGTH: int = 10000
    RUBRIC_MAX_CRITERIA: int = 20
    CONFIDENCE_THRESHOLD: float = 0.75

    # Essay Grading
    ESSAY_MIN_WORDS: int = 50
    ESSAY_MAX_WORDS: int = 5000
    PLAGIARISM_CHECK_ENABLED: bool = True

    # Math Grading
    MATH_TOLERANCE: float = 0.001
    SHOW_WORK_WEIGHT: float = 0.3

    # Batch Processing
    BATCH_SIZE: int = 50
    MAX_CONCURRENT_GRADES: int = 10

    # CORS
    CORS_ORIGINS: List[str] = ["*"]

    # Logging
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()
