"""
Configuration settings for Training Service.
"""

from typing import List
from pydantic_settings import BaseSettings


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

    # Database
    DATABASE_URL: str = "postgresql://user:pass@localhost:5432/training"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/1"

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
