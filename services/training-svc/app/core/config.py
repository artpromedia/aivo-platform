"""
Configuration settings for Training Service.
"""

import os
from typing import List
from pydantic_settings import BaseSettings


def _require_env_in_production(var_name: str, default: str) -> str:
    """Require environment variable in production, allow default in development."""
    value = os.getenv(var_name)
    if value:
        return value
    if os.getenv("NODE_ENV") == "production" or os.getenv("ENVIRONMENT") == "production":
        raise ValueError(f"{var_name} environment variable is required in production")
    return default


class Settings(BaseSettings):
    """Application settings."""

    # Service info
    PROJECT_NAME: str = "Training Service"
    VERSION: str = "1.0.0"
    SERVICE_VERSION: str = "1.0.0"
    SERVICE_NAME: str = "training-service"
    API_V1_STR: str = "/api/v1"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False

    # CORS
    CORS_ORIGINS: List[str] = ["*"]

    # Database - required in production
    DATABASE_URL: str = _require_env_in_production(
        "DATABASE_URL", "postgresql://user:pass@localhost:5432/training"
    )

    # Redis - required in production
    REDIS_URL: str = _require_env_in_production(
        "REDIS_URL", "redis://localhost:6379/1"
    )

    # AI Providers
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""

    # AI Inference Service
    AI_INFERENCE_URL: str = "http://ai-inference-svc:8000"

    # Logging
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
