"""
Speech Analysis Service Configuration.

Pydantic settings for the speech analysis service.
"""

from typing import List, Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Service configuration loaded from environment variables."""

    # Service Info
    SERVICE_NAME: str = "speech-analysis-svc"
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

    # Speech Analysis
    WHISPER_MODEL: str = "base"
    MAX_AUDIO_DURATION_SECONDS: int = 300
    SUPPORTED_AUDIO_FORMATS: List[str] = ["wav", "mp3", "m4a", "ogg", "flac"]
    SAMPLE_RATE: int = 16000

    # Articulation Analysis
    ARTICULATION_CONFIDENCE_THRESHOLD: float = 0.7
    PHONEME_ERROR_THRESHOLD: float = 0.3

    # Fluency Analysis
    FLUENCY_WINDOW_SECONDS: float = 5.0
    DISFLUENCY_TYPES: List[str] = ["repetition", "prolongation", "block", "interjection"]

    # Storage
    TEMP_AUDIO_PATH: str = "/tmp/speech-analysis"
    MAX_FILE_SIZE_MB: int = 100

    # CORS
    CORS_ORIGINS: List[str] = ["*"]

    # Logging
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()
