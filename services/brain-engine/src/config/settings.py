"""
Brain Engine Configuration Settings

Environment-based configuration for the brain engine service.
"""

from typing import Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Brain Engine service settings."""

    # Service configuration
    service_name: str = "brain-engine"
    service_version: str = "0.1.0"
    environment: str = "development"
    debug: bool = False

    # Server configuration
    host: str = "0.0.0.0"
    port: int = 8080

    # Supabase configuration
    supabase_url: str = ""
    supabase_key: str = ""
    supabase_service_key: Optional[str] = None

    # Redis configuration (for caching)
    redis_url: str = "redis://localhost:6379"
    cache_ttl_seconds: int = 3600  # 1 hour

    # Brain configuration
    default_mastery_target: float = 0.8
    max_recommendations: int = 5
    spaced_repetition_max_interval: int = 30  # days

    # Rate limiting
    rate_limit_requests: int = 100
    rate_limit_window: int = 60  # seconds

    # Logging
    log_level: str = "INFO"
    log_format: str = "json"

    # OpenTelemetry
    otel_enabled: bool = False
    otel_endpoint: Optional[str] = None
    otel_service_name: str = "brain-engine"

    @field_validator("port", mode="before")
    @classmethod
    def parse_port(cls, v: object) -> int:
        """Handle K8s-injected service env vars like tcp://10.43.x.x:8080."""
        if isinstance(v, str) and v.startswith("tcp://"):
            # Extract port from K8s service URL
            return int(v.rsplit(":", 1)[-1])
        return int(v)  # type: ignore[arg-type]

    class Config:
        env_file = ".env"
        env_prefix = "BRAIN_ENGINE_"
        case_sensitive = False


# Global settings instance
_settings: Optional[Settings] = None


def get_settings() -> Settings:
    """Get global settings instance."""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
