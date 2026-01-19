"""
Configuration settings for Curriculum Python Service.
"""

from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""

    # Service info
    PROJECT_NAME: str = "Curriculum Service"
    VERSION: str = "1.0.0"
    SERVICE_NAME: str = "curriculum-service"
    SERVICE_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False

    # CORS
    CORS_ORIGINS: List[str] = ["*"]

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://aivo:aivo@localhost:5432/curriculum"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/2"

    # Logging
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
