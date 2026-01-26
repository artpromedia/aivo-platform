"""
Document Intelligence Service Configuration.

Pydantic settings for the document intelligence service.
"""

from typing import List, Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Service configuration loaded from environment variables."""

    # Service Info
    SERVICE_NAME: str = "document-intelligence-svc"
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

    # OCR Settings
    TESSERACT_PATH: Optional[str] = None
    OCR_LANGUAGE: str = "eng"
    OCR_CONFIDENCE_THRESHOLD: float = 0.7

    # PDF Processing
    MAX_PDF_PAGES: int = 100
    MAX_FILE_SIZE_MB: int = 50
    TEMP_STORAGE_PATH: str = "/tmp/document-intelligence"

    # IEP Extraction
    IEP_CONFIDENCE_THRESHOLD: float = 0.75
    IEP_MAX_GOALS: int = 50

    # CORS
    CORS_ORIGINS: List[str] = ["*"]

    # Logging
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()
