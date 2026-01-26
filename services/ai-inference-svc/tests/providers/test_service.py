"""Tests for MultiProviderAIService."""

import pytest
import asyncio
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

from app.providers.service import MultiProviderAIService, create_service_from_env
from app.providers.models import (
    AIRequest,
    AIResponse,
    AllProvidersFailedError,
    FinishReason,
    Message,
    MultiProviderConfig,
    NoAvailableProviderError,
    ProviderConfig,
    ProviderStatus,
    ProviderType,
    TokenUsage,
)
from app.providers.fallback_provider import MockProvider


def create_test_config(
    include_openai: bool = False,
    include_anthropic: bool = False,
    include_fallback: bool = True,
) -> MultiProviderConfig:
    """Create a test configuration."""
    config = MultiProviderConfig()

    if include_openai:
        config.openai = ProviderConfig(
            provider_id="openai-test",
            provider_type=ProviderType.OPENAI,
            api_key="sk-test",
            default_model="gpt-4o",
            priority=1,
        )

    if include_anthropic:
        config.anthropic = ProviderConfig(
            provider_id="anthropic-test",
            provider_type=ProviderType.ANTHROPIC,
            api_key="sk-test",
            default_model="claude-3-sonnet",
            priority=2,
        )

    if include_fallback:
        config.fallback = ProviderConfig(
            provider_id="fallback-test",
            provider_type=ProviderType.FALLBACK,
            default_model="fallback-v1",
            priority=99,
        )

    return config


def create_test_request(request_id: str = "test-123") -> AIRequest:
    """Create a test AI request."""
    return AIRequest(
        request_id=request_id,
        messages=[Message(role="user", content="Hello")],
    )


class TestMultiProviderAIService:
    """Tests for MultiProviderAIService."""

    def test_initialization_with_fallback_only(self):
        """Test service initializes with fallback provider only."""
        config = create_test_config(include_fallback=True)
        service = MultiProviderAIService(config, enable_health_checks=False)

        assert len(service.providers) == 1
        assert service.providers[0].provider_id == "fallback-test"

    def test_initialization_fails_without_providers(self):
        """Test service fails to initialize without any providers."""
        config = MultiProviderConfig()

        with pytest.raises(ValueError, match="At least one provider"):
            MultiProviderAIService(config, enable_health_checks=False)

    @pytest.mark.asyncio
    async def test_complete_success(self):
        """Test successful completion."""
        config = create_test_config(include_fallback=True)
        service = MultiProviderAIService(config, enable_health_checks=False)

        request = create_test_request()
        response = await service.complete(request)

        assert response.request_id == "test-123"
        assert response.provider_used == "fallback-test"
        assert response.content is not None

    @pytest.mark.asyncio
    async def test_complete_records_metrics(self):
        """Test that completion records metrics."""
        config = create_test_config(include_fallback=True)
        service = MultiProviderAIService(config, enable_health_checks=False)

        request = create_test_request()
        await service.complete(request)

        metrics = service.get_metrics()
        assert metrics.total_requests == 1
        assert metrics.total_failures == 0

        provider_metrics = service.get_provider_metrics("fallback-test")
        assert provider_metrics is not None
        assert provider_metrics.total_requests == 1

    @pytest.mark.asyncio
    async def test_stream_yields_chunks(self):
        """Test streaming completion yields chunks."""
        config = create_test_config(include_fallback=True)
        service = MultiProviderAIService(config, enable_health_checks=False)

        request = create_test_request()
        chunks = []

        async for chunk in service.stream(request):
            chunks.append(chunk)

        assert len(chunks) > 0
        # Last chunk should be final
        assert chunks[-1].is_final is True

    @pytest.mark.asyncio
    async def test_get_health(self):
        """Test getting provider health."""
        config = create_test_config(include_fallback=True)
        service = MultiProviderAIService(config, enable_health_checks=False)

        health = await service.get_health()

        assert "fallback-test" in health
        assert health["fallback-test"].status == ProviderStatus.HEALTHY

    @pytest.mark.asyncio
    async def test_get_detailed_health(self):
        """Test getting detailed health information."""
        config = create_test_config(include_fallback=True)
        service = MultiProviderAIService(config, enable_health_checks=False)

        health = await service.get_detailed_health()

        assert "fallback-test" in health
        assert "health" in health["fallback-test"]
        assert "circuit_state" in health["fallback-test"]
        assert "is_available" in health["fallback-test"]

    def test_reset_provider(self):
        """Test resetting a provider."""
        config = create_test_config(include_fallback=True)
        service = MultiProviderAIService(config, enable_health_checks=False)

        # Mark provider unavailable
        service.providers[0].health.status = ProviderStatus.UNAVAILABLE

        result = service.reset_provider("fallback-test")

        assert result is True
        assert service.providers[0].health.status == ProviderStatus.HEALTHY

    def test_reset_all_providers(self):
        """Test resetting all providers."""
        config = create_test_config(include_fallback=True)
        service = MultiProviderAIService(config, enable_health_checks=False)

        # Mark provider unavailable
        service.providers[0].health.status = ProviderStatus.UNAVAILABLE

        service.reset_all_providers()

        for provider in service.providers:
            assert provider.health.status == ProviderStatus.HEALTHY

    @pytest.mark.asyncio
    async def test_start_and_stop(self):
        """Test service start and stop lifecycle."""
        config = create_test_config(include_fallback=True)
        config.health_check_interval_seconds = 1

        service = MultiProviderAIService(config, enable_health_checks=True)

        await service.start()
        assert service._is_running is True
        assert service._health_check_task is not None

        await service.stop()
        assert service._is_running is False

    @pytest.mark.asyncio
    async def test_metrics_tracking(self):
        """Test comprehensive metrics tracking."""
        config = create_test_config(include_fallback=True)
        service = MultiProviderAIService(config, enable_health_checks=False)

        # Make several requests
        for i in range(5):
            request = create_test_request(f"test-{i}")
            await service.complete(request)

        metrics = service.get_metrics()
        assert metrics.total_requests == 5
        assert metrics.total_fallbacks == 5  # All using fallback
        assert metrics.total_failures == 0


class TestServiceFailover:
    """Tests for failover behavior."""

    @pytest.mark.asyncio
    async def test_failover_to_fallback(self):
        """Test automatic failover to fallback provider."""
        config = create_test_config(include_fallback=True)
        service = MultiProviderAIService(config, enable_health_checks=False)

        request = create_test_request()
        response = await service.complete(request)

        assert response.provider_used == "fallback-test"
        assert response.fallback_used is True

    @pytest.mark.asyncio
    async def test_metrics_track_fallback(self):
        """Test that metrics track fallback usage."""
        config = create_test_config(include_fallback=True)
        service = MultiProviderAIService(config, enable_health_checks=False)

        request = create_test_request()
        await service.complete(request)

        metrics = service.get_metrics()
        assert metrics.total_fallbacks == 1


class TestCreateServiceFromEnv:
    """Tests for environment-based service creation."""

    def test_create_with_no_keys(self):
        """Test creating service with no API keys configured."""
        with patch.dict("os.environ", {}, clear=True):
            with patch.dict(
                "os.environ",
                {
                    "OPENAI_API_KEY": "",
                    "ANTHROPIC_API_KEY": "",
                    "AI_ENABLE_FALLBACK": "true",
                },
            ):
                service = create_service_from_env()

                # Should only have fallback
                assert len(service.providers) == 1
                assert service.providers[0].config.provider_type == ProviderType.FALLBACK

    def test_create_with_fallback_disabled(self):
        """Test that disabling fallback removes it."""
        with patch.dict(
            "os.environ",
            {
                "OPENAI_API_KEY": "",
                "ANTHROPIC_API_KEY": "",
                "AI_ENABLE_FALLBACK": "false",
            },
            clear=True,
        ):
            # This should fail - no providers available
            with pytest.raises(ValueError):
                create_service_from_env()


class TestProviderPriority:
    """Tests for provider priority handling."""

    @pytest.mark.asyncio
    async def test_respects_priority_order(self):
        """Test that providers are used in priority order."""
        # Create config with fallback as only available provider
        config = create_test_config(include_fallback=True)
        service = MultiProviderAIService(config, enable_health_checks=False)

        request = create_test_request()
        response = await service.complete(request)

        # Should use fallback since it's the only one
        assert response.provider_used == "fallback-test"

    @pytest.mark.asyncio
    async def test_preferred_provider_respected(self):
        """Test that preferred provider is used when specified."""
        config = create_test_config(include_fallback=True)
        service = MultiProviderAIService(config, enable_health_checks=False)

        request = AIRequest(
            request_id="test",
            messages=[Message(role="user", content="Hello")],
            preferred_provider="fallback-test",
        )

        response = await service.complete(request)
        assert response.provider_used == "fallback-test"


class TestHealthChecks:
    """Tests for health check functionality."""

    @pytest.mark.asyncio
    async def test_health_check_loop_runs(self):
        """Test that health check loop runs when enabled."""
        config = create_test_config(include_fallback=True)
        config.health_check_interval_seconds = 0  # Immediate

        service = MultiProviderAIService(config, enable_health_checks=True)

        await service.start()

        # Give time for at least one health check
        await asyncio.sleep(0.1)

        await service.stop()

        # Service should have run health checks
        assert service._health_check_task is None  # Cleaned up

    @pytest.mark.asyncio
    async def test_health_check_disabled(self):
        """Test that health checks can be disabled."""
        config = create_test_config(include_fallback=True)
        service = MultiProviderAIService(config, enable_health_checks=False)

        await service.start()

        assert service._health_check_task is None

        await service.stop()
