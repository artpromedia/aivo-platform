"""TTS Engine Configuration."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Environment-based configuration."""

    MODELS_DIR: str = "/app/models"
    HOST: str = "0.0.0.0"
    PORT: int = 5100
    LOG_LEVEL: str = "INFO"
    MAX_TEXT_LENGTH: int = 5000
    WORKERS: int = 2

    class Config:
        env_prefix = "TTS_"


settings = Settings()
