"""
ML Recommendation Service Configuration
"""

from functools import lru_cache
from typing import Literal

from pydantic import Field, PostgresDsn, RedisDsn
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Service
    service_name: str = "ml-recommendation-svc"
    port: int = 4020
    environment: Literal["development", "staging", "production"] = "development"
    log_level: Literal["debug", "info", "warning", "error"] = "info"

    # Database
    database_url: PostgresDsn = Field(
        default="postgresql+asyncpg://aivo:aivo_dev_password@localhost:5432/aivo_learner_model"
    )

    # Redis
    redis_url: RedisDsn = Field(default="redis://localhost:6379/0")
    redis_feature_ttl: int = 3600  # 1 hour
    redis_model_cache_ttl: int = 86400  # 24 hours

    # RabbitMQ
    rabbitmq_url: str = "amqp://guest:guest@localhost:5672/"
    rabbitmq_exchange: str = "aivo.events"
    rabbitmq_queue: str = "ml-recommendations"

    # ML Model Settings
    collaborative_weight: float = 0.3
    content_based_weight: float = 0.3
    knowledge_tracing_weight: float = 0.4
    
    # Bandit Settings
    epsilon: float = 0.1  # Exploration rate
    ucb_c: float = 2.0  # UCB exploration parameter
    
    # Recommendation Settings
    max_recommendations: int = 20
    min_confidence: float = 0.1
    diversity_factor: float = 0.2

    # Observability
    otel_exporter_endpoint: str | None = None
    otel_service_name: str = "ml-recommendation-svc"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
