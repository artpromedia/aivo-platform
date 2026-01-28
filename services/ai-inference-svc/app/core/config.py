"""
Configuration settings for AI Inference Service.
"""

import os
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import field_validator


def _get_database_url() -> str:
    """Get database URL, requiring it in production."""
    url = os.environ.get("DATABASE_URL")
    env = os.environ.get("ENVIRONMENT", "development")
    if not url and env == "production":
        raise EnvironmentError("DATABASE_URL is required in production")
    return url or "postgresql+asyncpg://localhost:5432/ai_inference_dev"


class Settings(BaseSettings):
    """Application settings."""

    # Service info
    PROJECT_NAME: str = "AI Inference Service"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False

    # CORS
    CORS_ORIGINS: List[str] = ["*"]

    # Database - MUST be set via environment variable in production
    DATABASE_URL: str = _get_database_url()

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # AI Providers
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""

    # Logging
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
