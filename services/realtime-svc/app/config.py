"""
Configuration Settings

Pydantic settings for the WebSocket manager service with environment variable support.
"""

from functools import lru_cache
from typing import List, Literal, Optional

from pydantic import Field, RedisDsn
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Service configuration
    service_name: str = "realtime-svc-python"
    service_version: str = "1.0.0"
    host: str = "0.0.0.0"
    port: int = 8080
    environment: Literal["development", "staging", "production"] = "development"
    debug: bool = False
    log_level: str = "INFO"

    # Redis configuration
    redis_url: RedisDsn = Field(default="redis://localhost:6379/0")
    redis_max_connections: int = 100
    redis_connection_timeout: int = 10
    redis_key_prefix: str = "ws:py:"

    # WebSocket configuration
    ws_path: str = "/ws"
    ws_ping_interval: int = 25  # seconds
    ws_ping_timeout: int = 60  # seconds
    ws_max_message_size: int = 1048576  # 1MB
    ws_max_connections_per_learner: int = 5

    # Heartbeat configuration
    heartbeat_interval: int = 30  # seconds
    heartbeat_timeout: int = 90  # seconds
    heartbeat_check_interval: int = 15  # seconds

    # Connection configuration
    connection_ttl: int = 3600  # 1 hour in seconds
    stale_connection_timeout: int = 300  # 5 minutes in seconds
    reconnection_grace_period: int = 30  # seconds

    # Room configuration
    room_ttl: int = 86400  # 24 hours in seconds
    room_max_members: int = 1000
    room_message_history_limit: int = 100

    # Cognitive state configuration
    cognitive_update_interval: int = 5  # seconds
    frustration_threshold: float = 0.7
    cognitive_overload_threshold: float = 0.8
    engagement_low_threshold: float = 0.3

    # Intervention configuration
    min_intervention_interval: int = 60  # seconds between interventions
    max_interventions_per_session: int = 10

    # Metrics configuration
    metrics_enabled: bool = True
    metrics_collection_interval: int = 30  # seconds
    metrics_prefix: str = "realtime_ws"

    # CORS configuration
    cors_origins: List[str] = Field(
        default=[
            "http://localhost:3000",
            "http://localhost:5173",
            "https://*.aivo.com",
        ]
    )
    cors_allow_credentials: bool = True

    # Authentication
    jwt_secret: Optional[str] = None
    jwt_algorithm: str = "HS256"
    auth_required: bool = True

    # External services
    cognitive_service_url: Optional[str] = None
    intervention_service_url: Optional[str] = None
    analytics_service_url: Optional[str] = None

    # RabbitMQ (for cross-service communication)
    rabbitmq_url: Optional[str] = None
    rabbitmq_exchange: str = "realtime_events"

    @property
    def redis_url_str(self) -> str:
        """Get Redis URL as string."""
        return str(self.redis_url)


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
