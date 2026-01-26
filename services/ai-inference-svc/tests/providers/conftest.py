"""Test fixtures for provider tests."""

import pytest
from typing import List

from app.providers.models import (
    AIRequest,
    Message,
    MultiProviderConfig,
    ProviderConfig,
    ProviderType,
)
from app.providers.fallback_provider import FallbackProvider, MockProvider


@pytest.fixture
def fallback_config() -> ProviderConfig:
    """Create a fallback provider configuration."""
    return ProviderConfig(
        provider_id="fallback-test",
        provider_type=ProviderType.FALLBACK,
        default_model="fallback-v1",
        priority=99,
    )


@pytest.fixture
def fallback_provider(fallback_config: ProviderConfig) -> FallbackProvider:
    """Create a fallback provider instance."""
    return FallbackProvider(fallback_config)


@pytest.fixture
def mock_provider_config() -> ProviderConfig:
    """Create a mock provider configuration."""
    return ProviderConfig(
        provider_id="mock-test",
        provider_type=ProviderType.LOCAL,
        default_model="mock-v1",
        priority=1,
    )


@pytest.fixture
def mock_provider(mock_provider_config: ProviderConfig) -> MockProvider:
    """Create a mock provider instance."""
    return MockProvider(mock_provider_config)


@pytest.fixture
def simple_request() -> AIRequest:
    """Create a simple test request."""
    return AIRequest(
        request_id="test-simple",
        messages=[Message(role="user", content="Hello")],
    )


@pytest.fixture
def complex_request() -> AIRequest:
    """Create a more complex test request."""
    return AIRequest(
        request_id="test-complex",
        messages=[
            Message(role="system", content="You are a helpful assistant."),
            Message(role="user", content="What is the capital of France?"),
        ],
        max_tokens=500,
        temperature=0.5,
    )


@pytest.fixture
def multi_provider_config() -> MultiProviderConfig:
    """Create a multi-provider configuration with fallback only."""
    return MultiProviderConfig(
        fallback=ProviderConfig(
            provider_id="fallback",
            provider_type=ProviderType.FALLBACK,
            default_model="fallback-v1",
            priority=99,
        ),
        health_check_interval_seconds=60,
        circuit_breaker_threshold=5,
        circuit_breaker_timeout_seconds=60,
    )
