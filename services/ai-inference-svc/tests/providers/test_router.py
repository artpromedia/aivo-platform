"""Tests for provider router and circuit breaker."""

import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from app.providers.router import CircuitBreaker, CircuitState, ProviderRouter
from app.providers.models import (
    AIRequest,
    AIResponse,
    AllProvidersFailedError,
    FinishReason,
    Message,
    NoAvailableProviderError,
    ProviderAPIError,
    ProviderConfig,
    ProviderRateLimitError,
    ProviderStatus,
    ProviderType,
    TokenUsage,
)
from app.providers.fallback_provider import MockProvider


def create_mock_provider(
    provider_id: str,
    priority: int = 1,
    is_available: bool = True,
    provider_type: ProviderType = ProviderType.OPENAI,
) -> MockProvider:
    """Create a mock provider for testing."""
    config = ProviderConfig(
        provider_id=provider_id,
        provider_type=provider_type,
        default_model="test-model",
        priority=priority,
    )
    provider = MockProvider(config)
    provider._is_available_override = is_available
    return provider


def create_test_request(request_id: str = "test-123") -> AIRequest:
    """Create a test AI request."""
    return AIRequest(
        request_id=request_id,
        messages=[Message(role="user", content="Hello")],
    )


class TestCircuitBreaker:
    """Tests for CircuitBreaker."""

    def test_initial_state_closed(self):
        """Test that circuit starts in closed state."""
        cb = CircuitBreaker()
        assert cb.get_state("provider-1") == CircuitState.CLOSED

    def test_allows_requests_when_closed(self):
        """Test that requests are allowed in closed state."""
        cb = CircuitBreaker()
        assert cb.is_allowed("provider-1") is True

    def test_opens_after_failures(self):
        """Test that circuit opens after reaching failure threshold."""
        cb = CircuitBreaker(failure_threshold=3)

        for _ in range(3):
            cb.record_failure("provider-1")

        assert cb.get_state("provider-1") == CircuitState.OPEN
        assert cb.is_allowed("provider-1") is False

    def test_success_resets_failure_count(self):
        """Test that success resets failure counter."""
        cb = CircuitBreaker(failure_threshold=3)

        # 2 failures
        cb.record_failure("provider-1")
        cb.record_failure("provider-1")

        # Success resets
        cb.record_success("provider-1")

        # Now 3 more failures needed
        cb.record_failure("provider-1")
        cb.record_failure("provider-1")
        assert cb.get_state("provider-1") == CircuitState.CLOSED

    def test_half_open_after_timeout(self):
        """Test transition to half-open after recovery timeout."""
        cb = CircuitBreaker(failure_threshold=2, recovery_timeout=0)

        # Open the circuit
        cb.record_failure("provider-1")
        cb.record_failure("provider-1")
        assert cb.get_state("provider-1") == CircuitState.OPEN

        # With 0 second timeout, should immediately allow
        assert cb.is_allowed("provider-1") is True
        assert cb.get_state("provider-1") == CircuitState.HALF_OPEN

    def test_half_open_closes_on_success(self):
        """Test that circuit closes after successes in half-open."""
        cb = CircuitBreaker(failure_threshold=2, recovery_timeout=0, half_open_max_calls=2)

        # Open and transition to half-open
        cb.record_failure("provider-1")
        cb.record_failure("provider-1")
        cb.is_allowed("provider-1")  # Triggers half-open

        # Successes close the circuit
        cb.record_success("provider-1")
        cb.record_success("provider-1")

        assert cb.get_state("provider-1") == CircuitState.CLOSED

    def test_half_open_reopens_on_failure(self):
        """Test that circuit reopens on failure in half-open."""
        cb = CircuitBreaker(failure_threshold=2, recovery_timeout=0)

        # Open and transition to half-open
        cb.record_failure("provider-1")
        cb.record_failure("provider-1")
        cb.is_allowed("provider-1")

        # Failure reopens
        cb.record_failure("provider-1")
        assert cb.get_state("provider-1") == CircuitState.OPEN

    def test_reset(self):
        """Test resetting circuit breaker."""
        cb = CircuitBreaker(failure_threshold=2)

        # Open the circuit
        cb.record_failure("provider-1")
        cb.record_failure("provider-1")
        assert cb.get_state("provider-1") == CircuitState.OPEN

        # Reset
        cb.reset("provider-1")
        assert cb.get_state("provider-1") == CircuitState.CLOSED
        assert cb.is_allowed("provider-1") is True

    def test_independent_providers(self):
        """Test that different providers have independent circuits."""
        cb = CircuitBreaker(failure_threshold=2)

        # Open circuit for provider-1
        cb.record_failure("provider-1")
        cb.record_failure("provider-1")

        # Provider-2 should still be allowed
        assert cb.is_allowed("provider-1") is False
        assert cb.is_allowed("provider-2") is True


class TestProviderRouter:
    """Tests for ProviderRouter."""

    @pytest.mark.asyncio
    async def test_routes_to_highest_priority(self):
        """Test that router selects highest priority provider."""
        provider1 = create_mock_provider("primary", priority=1)
        provider2 = create_mock_provider("secondary", priority=2)

        router = ProviderRouter([provider2, provider1])  # Out of order
        request = create_test_request()

        provider, is_fallback = await router.route(request)

        assert provider.provider_id == "primary"
        assert is_fallback is False

    @pytest.mark.asyncio
    async def test_routes_to_preferred_provider(self):
        """Test that router respects preferred provider."""
        provider1 = create_mock_provider("primary", priority=1)
        provider2 = create_mock_provider("secondary", priority=2)

        router = ProviderRouter([provider1, provider2])
        request = AIRequest(
            request_id="test",
            messages=[Message(role="user", content="Hello")],
            preferred_provider="secondary",
        )

        provider, is_fallback = await router.route(request)

        assert provider.provider_id == "secondary"

    @pytest.mark.asyncio
    async def test_skips_unavailable_providers(self):
        """Test that router skips unavailable providers."""
        provider1 = create_mock_provider("primary", priority=1)
        provider1.health.status = ProviderStatus.UNAVAILABLE

        provider2 = create_mock_provider("secondary", priority=2)

        router = ProviderRouter([provider1, provider2])
        request = create_test_request()

        provider, is_fallback = await router.route(request)

        assert provider.provider_id == "secondary"
        assert is_fallback is True  # Because it's not the first provider

    @pytest.mark.asyncio
    async def test_uses_fallback_when_all_primary_unavailable(self):
        """Test fallback is used when primary providers unavailable."""
        provider1 = create_mock_provider("primary", priority=1)
        provider1.health.status = ProviderStatus.UNAVAILABLE

        fallback = create_mock_provider(
            "fallback", priority=99, provider_type=ProviderType.FALLBACK
        )

        router = ProviderRouter([provider1, fallback])
        request = create_test_request()

        provider, is_fallback = await router.route(request)

        assert provider.provider_id == "fallback"
        assert is_fallback is True

    @pytest.mark.asyncio
    async def test_no_providers_available_raises(self):
        """Test that error is raised when no providers available."""
        provider1 = create_mock_provider("primary", priority=1)
        provider1.health.status = ProviderStatus.UNAVAILABLE

        router = ProviderRouter([provider1])
        request = AIRequest(
            request_id="test",
            messages=[Message(role="user", content="Hello")],
            allow_fallback=False,
        )

        with pytest.raises(NoAvailableProviderError):
            await router.route(request)

    @pytest.mark.asyncio
    async def test_execute_with_failover_success(self):
        """Test successful execution without failover."""
        provider = create_mock_provider("primary", priority=1)

        router = ProviderRouter([provider])
        request = create_test_request()

        response = await router.execute_with_failover(request)

        assert response.provider_used == "primary"
        assert response.attempts == 1
        assert response.fallback_used is False

    @pytest.mark.asyncio
    async def test_execute_with_failover_tries_next(self):
        """Test failover to next provider on error."""
        provider1 = create_mock_provider("primary", priority=1)
        provider1.simulate_failure = True

        provider2 = create_mock_provider("secondary", priority=2)

        router = ProviderRouter([provider1, provider2])
        request = create_test_request()

        response = await router.execute_with_failover(request)

        assert response.provider_used == "secondary"
        assert response.attempts == 2

    @pytest.mark.asyncio
    async def test_execute_with_failover_all_fail(self):
        """Test error when all providers fail."""
        provider1 = create_mock_provider("primary", priority=1)
        provider1.simulate_failure = True

        provider2 = create_mock_provider("secondary", priority=2)
        provider2.simulate_failure = True

        router = ProviderRouter([provider1, provider2])
        request = AIRequest(
            request_id="test",
            messages=[Message(role="user", content="Hello")],
            allow_fallback=False,
        )

        with pytest.raises(AllProvidersFailedError):
            await router.execute_with_failover(request)

    @pytest.mark.asyncio
    async def test_execute_respects_circuit_breaker(self):
        """Test that circuit breaker is respected during execution."""
        provider1 = create_mock_provider("primary", priority=1)
        provider2 = create_mock_provider("secondary", priority=2)

        cb = CircuitBreaker(failure_threshold=1)
        router = ProviderRouter([provider1, provider2], circuit_breaker=cb)

        # Open circuit for provider1
        cb.record_failure("primary")

        request = create_test_request()
        provider, _ = await router.route(request)

        # Should skip provider1 due to open circuit
        assert provider.provider_id == "secondary"

    def test_get_provider_health(self):
        """Test getting health status of all providers."""
        provider1 = create_mock_provider("primary", priority=1)
        provider2 = create_mock_provider("secondary", priority=2)

        router = ProviderRouter([provider1, provider2])
        health = router.get_provider_health()

        assert "primary" in health
        assert "secondary" in health
        assert health["primary"].status == ProviderStatus.HEALTHY

    def test_reset_provider(self):
        """Test resetting a provider."""
        provider = create_mock_provider("primary", priority=1)
        provider.health.status = ProviderStatus.UNAVAILABLE

        cb = CircuitBreaker()
        cb.record_failure("primary")
        cb.record_failure("primary")

        router = ProviderRouter([provider], circuit_breaker=cb)

        result = router.reset_provider("primary")

        assert result is True
        assert provider.health.status == ProviderStatus.HEALTHY
        assert cb.get_state("primary") == CircuitState.CLOSED

    def test_reset_unknown_provider(self):
        """Test resetting an unknown provider returns False."""
        provider = create_mock_provider("primary", priority=1)
        router = ProviderRouter([provider])

        result = router.reset_provider("unknown")

        assert result is False
