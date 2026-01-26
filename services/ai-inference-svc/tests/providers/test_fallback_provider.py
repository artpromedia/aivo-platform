"""Tests for fallback and mock providers."""

import pytest
from datetime import datetime

from app.providers.fallback_provider import FallbackProvider, MockProvider
from app.providers.models import (
    AIRequest,
    FinishReason,
    Message,
    ProviderAPIError,
    ProviderConfig,
    ProviderRateLimitError,
    ProviderStatus,
    ProviderType,
)


class TestFallbackProvider:
    """Tests for FallbackProvider."""

    @pytest.mark.asyncio
    async def test_complete_returns_response(self, fallback_provider, simple_request):
        """Test that complete returns a valid response."""
        response = await fallback_provider.complete(simple_request)

        assert response.request_id == simple_request.request_id
        assert response.provider_used == "fallback-test"
        assert response.model_used == "fallback-v1"
        assert len(response.content) > 0
        assert response.finish_reason == FinishReason.STOP
        assert response.metadata.get("is_fallback") is True

    @pytest.mark.asyncio
    async def test_complete_classifies_greeting(self, fallback_provider):
        """Test that greetings are classified correctly."""
        request = AIRequest(
            request_id="test",
            messages=[Message(role="user", content="Hello, how are you?")],
        )

        response = await fallback_provider.complete(request)

        assert response.metadata.get("response_type") == "greeting"
        # Response should mention limited mode
        assert "limited" in response.content.lower() or "Hello" in response.content

    @pytest.mark.asyncio
    async def test_complete_classifies_question(self, fallback_provider):
        """Test that questions are classified correctly."""
        request = AIRequest(
            request_id="test",
            messages=[Message(role="user", content="What is the meaning of life?")],
        )

        response = await fallback_provider.complete(request)

        assert response.metadata.get("response_type") == "question"

    @pytest.mark.asyncio
    async def test_complete_classifies_task(self, fallback_provider):
        """Test that tasks are classified correctly."""
        request = AIRequest(
            request_id="test",
            messages=[Message(role="user", content="Please help me write a poem")],
        )

        response = await fallback_provider.complete(request)

        assert response.metadata.get("response_type") == "task"

    @pytest.mark.asyncio
    async def test_stream_yields_chunks(self, fallback_provider, simple_request):
        """Test that streaming yields multiple chunks."""
        chunks = []

        async for chunk in fallback_provider.stream(simple_request):
            chunks.append(chunk)

        assert len(chunks) > 1
        # Should have a final chunk
        assert chunks[-1].is_final is True
        assert chunks[-1].usage is not None

    @pytest.mark.asyncio
    async def test_stream_accumulates_content(self, fallback_provider, simple_request):
        """Test that streamed content can be accumulated."""
        content = ""

        async for chunk in fallback_provider.stream(simple_request):
            content += chunk.content

        assert len(content) > 0

    @pytest.mark.asyncio
    async def test_health_check_always_healthy(self, fallback_provider):
        """Test that health check always returns healthy."""
        health = await fallback_provider.health_check()

        assert health.status == ProviderStatus.HEALTHY
        assert health.last_check is not None

    @pytest.mark.asyncio
    async def test_is_available_when_enabled(self, fallback_provider):
        """Test availability when enabled."""
        is_available = await fallback_provider.is_available()

        assert is_available is True

    @pytest.mark.asyncio
    async def test_is_available_when_disabled(self, fallback_config):
        """Test availability when disabled."""
        fallback_config.is_enabled = False
        provider = FallbackProvider(fallback_config)

        is_available = await provider.is_available()

        assert is_available is False

    @pytest.mark.asyncio
    async def test_records_metrics(self, fallback_provider, simple_request):
        """Test that requests record metrics."""
        initial_requests = fallback_provider.health.total_requests

        await fallback_provider.complete(simple_request)

        assert fallback_provider.health.total_requests == initial_requests + 1
        assert fallback_provider.health.successful_requests >= 1


class TestMockProvider:
    """Tests for MockProvider."""

    @pytest.mark.asyncio
    async def test_complete_with_custom_response(self, mock_provider_config):
        """Test mock provider with custom response."""
        provider = MockProvider(
            mock_provider_config,
            mock_responses={"custom-req": "Custom response content"},
        )

        request = AIRequest(
            request_id="custom-req",
            messages=[Message(role="user", content="test")],
        )

        response = await provider.complete(request)

        assert response.content == "Custom response content"

    @pytest.mark.asyncio
    async def test_complete_with_default_response(self, mock_provider_config):
        """Test mock provider generates default response."""
        provider = MockProvider(mock_provider_config)

        request = AIRequest(
            request_id="unknown-req",
            messages=[Message(role="user", content="test")],
        )

        response = await provider.complete(request)

        assert "unknown-req" in response.content

    @pytest.mark.asyncio
    async def test_simulate_failure(self, mock_provider_config):
        """Test mock provider can simulate failures."""
        provider = MockProvider(
            mock_provider_config,
            simulate_failure=True,
        )

        request = AIRequest(
            request_id="test",
            messages=[Message(role="user", content="test")],
        )

        with pytest.raises(ProviderAPIError):
            await provider.complete(request)

    @pytest.mark.asyncio
    async def test_simulate_delay(self, mock_provider_config):
        """Test mock provider can simulate delay."""
        provider = MockProvider(
            mock_provider_config,
            simulate_delay_ms=100,
        )

        request = AIRequest(
            request_id="test",
            messages=[Message(role="user", content="test")],
        )

        start = datetime.utcnow()
        await provider.complete(request)
        elapsed = (datetime.utcnow() - start).total_seconds() * 1000

        assert elapsed >= 100

    @pytest.mark.asyncio
    async def test_simulate_rate_limit(self, mock_provider_config):
        """Test mock provider can simulate rate limiting."""
        provider = MockProvider(
            mock_provider_config,
            simulate_rate_limit=True,
        )

        request = AIRequest(
            request_id="test",
            messages=[Message(role="user", content="test")],
        )

        # First 5 requests should succeed
        for i in range(5):
            await provider.complete(request)

        # 6th request should be rate limited
        with pytest.raises(ProviderRateLimitError):
            await provider.complete(request)

    @pytest.mark.asyncio
    async def test_reset_clears_state(self, mock_provider_config):
        """Test reset clears mock provider state."""
        provider = MockProvider(
            mock_provider_config,
            simulate_failure=True,
        )

        request = AIRequest(
            request_id="test",
            messages=[Message(role="user", content="test")],
        )

        # Should fail
        with pytest.raises(ProviderAPIError):
            await provider.complete(request)

        # Reset
        provider.reset()

        # Should succeed now
        response = await provider.complete(request)
        assert response is not None

    @pytest.mark.asyncio
    async def test_metadata_includes_mock_flag(self, mock_provider_config):
        """Test that mock responses include mock flag in metadata."""
        provider = MockProvider(mock_provider_config)

        request = AIRequest(
            request_id="test",
            messages=[Message(role="user", content="test")],
        )

        response = await provider.complete(request)

        assert response.metadata.get("is_mock") is True
