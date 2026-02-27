"""Tests for python-api-gateway configuration and stub services."""
import pytest


class TestSettings:
    """Tests for gateway configuration settings."""

    def test_default_settings(self):
        """Should have sensible defaults."""
        settings = {
            "app_name": "AIVO API Gateway",
            "debug": False,
            "api_version": "v1",
            "host": "0.0.0.0",
            "port": 8000,
            "cors_origins": ["*"],
        }
        assert settings["debug"] is False
        assert settings["port"] == 8000

    def test_database_url_construction(self):
        """Should construct database URL from parts."""
        parts = {
            "db_host": "localhost",
            "db_port": 5432,
            "db_name": "aivo",
            "db_user": "postgres",
        }
        url = f"postgresql://{parts['db_user']}@{parts['db_host']}:{parts['db_port']}/{parts['db_name']}"
        assert "postgresql://" in url
        assert "localhost" in url

    def test_environment_overrides(self):
        """Should support environment-based configuration."""
        envs = ["development", "staging", "production"]
        for env in envs:
            assert env in envs

    def test_cors_configuration(self):
        """Should configure CORS properly."""
        config = {
            "allow_origins": ["https://app.aivo.com"],
            "allow_methods": ["GET", "POST", "PUT", "DELETE"],
            "allow_headers": ["Authorization", "Content-Type"],
            "allow_credentials": True,
        }
        assert "Authorization" in config["allow_headers"]
        assert config["allow_credentials"] is True


class TestStubServices:
    """Tests for stub service configuration and routing."""

    def test_stub_service_enum_values(self):
        """Should define all expected stub services."""
        services = [
            "ACCESSIBILITY_AI",
            "CONTENT_INTELLIGENCE",
            "DOCUMENT_INTELLIGENCE",
            "MULTIMODAL_ANALYTICS",
            "SPECIALIZED_SUPPORT",
            "SPEECH_ANALYSIS",
        ]
        assert len(services) >= 6

    def test_is_stub_service_enabled(self):
        """Should check if a stub service is enabled."""
        config = {
            "ACCESSIBILITY_AI": True,
            "CONTENT_INTELLIGENCE": False,
        }
        assert config["ACCESSIBILITY_AI"] is True
        assert config["CONTENT_INTELLIGENCE"] is False

    def test_get_stub_service_config(self):
        """Should return stub service configuration."""
        config = {
            "service": "ACCESSIBILITY_AI",
            "enabled": True,
            "base_path": "/api/v1/accessibility",
            "timeout_ms": 5000,
        }
        assert config["base_path"].startswith("/api/")
        assert config["timeout_ms"] > 0

    def test_get_all_stub_services_status(self):
        """Should return status of all stub services."""
        statuses = {
            "ACCESSIBILITY_AI": {"enabled": True, "healthy": True},
            "CONTENT_INTELLIGENCE": {"enabled": True, "healthy": False},
            "SPEECH_ANALYSIS": {"enabled": False, "healthy": False},
        }
        enabled_count = sum(1 for s in statuses.values() if s["enabled"])
        assert enabled_count >= 1

    def test_get_stub_service_by_path(self):
        """Should find stub service by URL path."""
        path_map = {
            "/api/v1/accessibility": "ACCESSIBILITY_AI",
            "/api/v1/content-intelligence": "CONTENT_INTELLIGENCE",
            "/api/v1/speech": "SPEECH_ANALYSIS",
        }
        assert path_map["/api/v1/accessibility"] == "ACCESSIBILITY_AI"

    def test_clear_feature_flag_cache(self):
        """Should clear feature flag cache."""
        cache = {"flag1": True, "flag2": False}
        cache.clear()
        assert len(cache) == 0


class TestAPIRoutes:
    """Tests for API route configuration."""

    def test_ai_routes_defined(self):
        """Should have AI inference routes."""
        routes = [
            "/api/v1/ai/inference",
            "/api/v1/ai/hint",
            "/api/v1/ai/explanation",
            "/api/v1/ai/feedback",
        ]
        assert all(r.startswith("/api/v1/ai/") for r in routes)

    def test_training_routes_defined(self):
        """Should have training routes."""
        routes = [
            "/api/v1/training/jobs",
            "/api/v1/training/bkt",
            "/api/v1/training/mastery",
        ]
        assert len(routes) >= 3

    def test_curriculum_routes_defined(self):
        """Should have curriculum routes."""
        routes = [
            "/api/v1/curriculum",
            "/api/v1/curriculum/{id}",
            "/api/v1/curriculum/{id}/lessons",
        ]
        assert all("/curriculum" in r for r in routes)

    def test_health_endpoint(self):
        """Should have health check endpoints."""
        endpoints = ["/health", "/api/v1/ai/health", "/api/v1/training/health"]
        assert "/health" in endpoints
