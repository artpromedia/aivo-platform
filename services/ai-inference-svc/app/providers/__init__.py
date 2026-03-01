"""
Multi-Provider AI Service Module.

Provides high availability AI inference with automatic failover
between multiple AI providers (OpenAI, Anthropic, etc.).

Usage:
    from app.providers import (
        MultiProviderAIService,
        AIRequest,
        AIResponse,
        get_ai_service,
    )

    # Using singleton pattern
    service = get_ai_service()
    response = await service.complete(request)

    # Or create custom configuration
    from app.providers import MultiProviderConfig, ProviderConfig, ProviderType

    config = MultiProviderConfig(
        openai=ProviderConfig(
            provider_id="openai",
            provider_type=ProviderType.OPENAI,
            api_key="sk-...",
            default_model="gpt-4o",
            priority=1,
        ),
    )
    service = MultiProviderAIService(config)
"""

# Models and types
from .models import (
    # Enums
    ProviderStatus,
    ProviderType,
    FinishReason,
    # Exceptions
    ProviderError,
    ProviderRateLimitError,
    ProviderAPIError,
    ProviderTimeoutError,
    ProviderAuthenticationError,
    NoAvailableProviderError,
    AllProvidersFailedError,
    # Configuration
    ProviderConfig,
    MultiProviderConfig,
    # Health
    ProviderHealth,
    # Request/Response
    Message,
    ToolDefinition,
    AIRequest,
    AIResponse,
    TokenUsage,
    StreamChunk,
    # Metrics
    ProviderMetrics,
    ServiceMetrics,
)

# Base provider
from .base import BaseAIProvider

# Provider implementations
from .openai_provider import OpenAIProvider
from .anthropic_provider import AnthropicProvider
from .gemini_provider import GeminiProvider
from .fallback_provider import FallbackProvider, MockProvider

# Router
from .router import (
    ProviderRouter,
    CircuitBreaker,
    CircuitState,
)

# Main service
from .service import (
    MultiProviderAIService,
    create_service_from_env,
    get_ai_service,
    init_ai_service,
    shutdown_ai_service,
)


__all__ = [
    # Enums
    "ProviderStatus",
    "ProviderType",
    "FinishReason",
    # Exceptions
    "ProviderError",
    "ProviderRateLimitError",
    "ProviderAPIError",
    "ProviderTimeoutError",
    "ProviderAuthenticationError",
    "NoAvailableProviderError",
    "AllProvidersFailedError",
    # Configuration
    "ProviderConfig",
    "MultiProviderConfig",
    # Health
    "ProviderHealth",
    # Request/Response
    "Message",
    "ToolDefinition",
    "AIRequest",
    "AIResponse",
    "TokenUsage",
    "StreamChunk",
    # Metrics
    "ProviderMetrics",
    "ServiceMetrics",
    # Base provider
    "BaseAIProvider",
    # Providers
    "OpenAIProvider",
    "AnthropicProvider",
    "GeminiProvider",
    "FallbackProvider",
    "MockProvider",
    # Router
    "ProviderRouter",
    "CircuitBreaker",
    "CircuitState",
    # Service
    "MultiProviderAIService",
    "create_service_from_env",
    "get_ai_service",
    "init_ai_service",
    "shutdown_ai_service",
]
