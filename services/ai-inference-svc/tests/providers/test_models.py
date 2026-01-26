"""Tests for provider models."""

import pytest
from datetime import datetime, timedelta

from app.providers.models import (
    AIRequest,
    AIResponse,
    FinishReason,
    Message,
    ProviderConfig,
    ProviderHealth,
    ProviderMetrics,
    ProviderStatus,
    ProviderType,
    TokenUsage,
)


class TestProviderConfig:
    """Tests for ProviderConfig model."""

    def test_create_valid_config(self):
        """Test creating a valid provider configuration."""
        config = ProviderConfig(
            provider_id="test-provider",
            provider_type=ProviderType.OPENAI,
            api_key="sk-test",
            default_model="gpt-4o",
            priority=1,
        )

        assert config.provider_id == "test-provider"
        assert config.provider_type == ProviderType.OPENAI
        assert config.api_key == "sk-test"
        assert config.default_model == "gpt-4o"
        assert config.priority == 1
        assert config.is_enabled is True
        assert config.max_retries == 3
        assert config.timeout_seconds == 30

    def test_config_defaults(self):
        """Test that default values are set correctly."""
        config = ProviderConfig(
            provider_id="test",
            provider_type=ProviderType.ANTHROPIC,
            default_model="claude-3-sonnet",
            priority=2,
        )

        assert config.api_key is None
        assert config.api_base is None
        assert config.available_models == []
        assert config.rate_limit_rpm is None
        assert config.rate_limit_cooldown_seconds == 60

    def test_priority_validation(self):
        """Test that priority must be >= 1."""
        with pytest.raises(ValueError):
            ProviderConfig(
                provider_id="test",
                provider_type=ProviderType.OPENAI,
                default_model="gpt-4",
                priority=0,  # Invalid
            )


class TestProviderHealth:
    """Tests for ProviderHealth model."""

    def test_create_health(self):
        """Test creating a health status."""
        health = ProviderHealth(
            provider_id="test-provider",
            status=ProviderStatus.HEALTHY,
        )

        assert health.provider_id == "test-provider"
        assert health.status == ProviderStatus.HEALTHY
        assert health.failure_count == 0
        assert health.consecutive_failures == 0
        assert health.error_rate == 0.0

    def test_is_rate_limit_expired_no_limit(self):
        """Test rate limit check when no limit is set."""
        health = ProviderHealth(provider_id="test")
        assert health.is_rate_limit_expired() is True

    def test_is_rate_limit_expired_future(self):
        """Test rate limit check when reset is in future."""
        health = ProviderHealth(
            provider_id="test",
            rate_limit_reset_at=datetime.utcnow() + timedelta(seconds=60),
        )
        assert health.is_rate_limit_expired() is False

    def test_is_rate_limit_expired_past(self):
        """Test rate limit check when reset is in past."""
        health = ProviderHealth(
            provider_id="test",
            rate_limit_reset_at=datetime.utcnow() - timedelta(seconds=60),
        )
        assert health.is_rate_limit_expired() is True

    def test_calculate_error_rate_no_requests(self):
        """Test error rate calculation with no requests."""
        health = ProviderHealth(provider_id="test")
        assert health.calculate_error_rate() == 0.0

    def test_calculate_error_rate(self):
        """Test error rate calculation."""
        health = ProviderHealth(
            provider_id="test",
            total_requests=100,
            successful_requests=80,
        )
        assert health.calculate_error_rate() == 0.2


class TestMessage:
    """Tests for Message model."""

    def test_create_user_message(self):
        """Test creating a user message."""
        msg = Message(role="user", content="Hello")
        assert msg.role == "user"
        assert msg.content == "Hello"
        assert msg.name is None

    def test_create_system_message(self):
        """Test creating a system message."""
        msg = Message(role="system", content="You are helpful")
        assert msg.role == "system"

    def test_invalid_role(self):
        """Test that invalid roles are rejected."""
        with pytest.raises(ValueError):
            Message(role="invalid", content="test")


class TestAIRequest:
    """Tests for AIRequest model."""

    def test_create_request(self):
        """Test creating a valid AI request."""
        request = AIRequest(
            request_id="req-123",
            messages=[Message(role="user", content="Hello")],
            max_tokens=500,
            temperature=0.5,
        )

        assert request.request_id == "req-123"
        assert len(request.messages) == 1
        assert request.max_tokens == 500
        assert request.temperature == 0.5
        assert request.allow_fallback is True

    def test_request_defaults(self):
        """Test request default values."""
        request = AIRequest(
            request_id="req-123",
            messages=[Message(role="user", content="test")],
        )

        assert request.model is None
        assert request.max_tokens == 1000
        assert request.temperature == 0.7
        assert request.system_prompt is None
        assert request.tools is None
        assert request.preferred_provider is None

    def test_temperature_bounds(self):
        """Test temperature validation."""
        # Valid temperature
        request = AIRequest(
            request_id="test",
            messages=[Message(role="user", content="test")],
            temperature=1.5,
        )
        assert request.temperature == 1.5

        # Too high
        with pytest.raises(ValueError):
            AIRequest(
                request_id="test",
                messages=[Message(role="user", content="test")],
                temperature=2.5,
            )


class TestAIResponse:
    """Tests for AIResponse model."""

    def test_create_response(self):
        """Test creating a valid AI response."""
        response = AIResponse(
            request_id="req-123",
            provider_used="openai",
            model_used="gpt-4o",
            content="Hello, how can I help?",
            finish_reason=FinishReason.STOP,
            usage=TokenUsage(
                prompt_tokens=10,
                completion_tokens=20,
                total_tokens=30,
            ),
            latency_ms=150,
        )

        assert response.request_id == "req-123"
        assert response.provider_used == "openai"
        assert response.content == "Hello, how can I help?"
        assert response.finish_reason == FinishReason.STOP
        assert response.usage.total_tokens == 30
        assert response.latency_ms == 150
        assert response.fallback_used is False

    def test_response_with_fallback(self):
        """Test response when fallback was used."""
        response = AIResponse(
            request_id="req-123",
            provider_used="fallback",
            model_used="fallback-v1",
            content="Limited response",
            finish_reason=FinishReason.STOP,
            latency_ms=50,
            fallback_used=True,
            attempts=3,
        )

        assert response.fallback_used is True
        assert response.attempts == 3


class TestProviderMetrics:
    """Tests for ProviderMetrics model."""

    def test_record_successful_request(self):
        """Test recording a successful request."""
        metrics = ProviderMetrics(provider_id="test")

        metrics.record_request(
            success=True,
            latency_ms=100,
            tokens=50,
        )

        assert metrics.total_requests == 1
        assert metrics.successful_requests == 1
        assert metrics.failed_requests == 0
        assert metrics.total_tokens == 50
        assert metrics.avg_latency_ms == 100
        assert metrics.error_rate == 0.0

    def test_record_failed_request(self):
        """Test recording a failed request."""
        metrics = ProviderMetrics(provider_id="test")

        metrics.record_request(success=False, latency_ms=500)

        assert metrics.total_requests == 1
        assert metrics.successful_requests == 0
        assert metrics.failed_requests == 1
        assert metrics.error_rate == 1.0

    def test_record_rate_limited_request(self):
        """Test recording a rate limited request."""
        metrics = ProviderMetrics(provider_id="test")

        metrics.record_request(
            success=False,
            latency_ms=100,
            rate_limited=True,
        )

        assert metrics.rate_limited_requests == 1
        assert metrics.failed_requests == 1

    def test_multiple_requests(self):
        """Test recording multiple requests."""
        metrics = ProviderMetrics(provider_id="test")

        # 3 successes, 1 failure
        for _ in range(3):
            metrics.record_request(success=True, latency_ms=100, tokens=10)
        metrics.record_request(success=False, latency_ms=200)

        assert metrics.total_requests == 4
        assert metrics.successful_requests == 3
        assert metrics.failed_requests == 1
        assert metrics.total_tokens == 30
        assert metrics.error_rate == 0.25
