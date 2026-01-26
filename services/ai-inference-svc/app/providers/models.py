"""
Multi-Provider AI Service Models.

Defines data models, enums, and exceptions for the multi-provider AI service
with automatic failover capabilities.
"""

from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


# =============================================================================
# Enums
# =============================================================================


class ProviderStatus(str, Enum):
    """Health status of an AI provider."""

    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNAVAILABLE = "unavailable"
    RATE_LIMITED = "rate_limited"


class ProviderType(str, Enum):
    """Supported AI provider types."""

    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GOOGLE = "google"
    LOCAL = "local"
    FALLBACK = "fallback"


class FinishReason(str, Enum):
    """Reasons for completion termination."""

    STOP = "stop"
    LENGTH = "length"
    TOOL_CALLS = "tool_calls"
    CONTENT_FILTER = "content_filter"
    ERROR = "error"


# =============================================================================
# Exceptions
# =============================================================================


class ProviderError(Exception):
    """Base exception for provider errors."""

    def __init__(self, provider_id: str, message: str):
        self.provider_id = provider_id
        self.message = message
        super().__init__(f"[{provider_id}] {message}")


class ProviderRateLimitError(ProviderError):
    """Raised when provider rate limit is exceeded."""

    def __init__(
        self, provider_id: str, retry_after: Optional[int] = None
    ):
        self.retry_after = retry_after
        message = "Rate limit exceeded"
        if retry_after:
            message += f", retry after {retry_after}s"
        super().__init__(provider_id, message)


class ProviderAPIError(ProviderError):
    """Raised when provider API returns an error."""

    def __init__(
        self,
        provider_id: str,
        message: str,
        status_code: Optional[int] = None,
    ):
        self.status_code = status_code
        super().__init__(provider_id, message)


class ProviderTimeoutError(ProviderError):
    """Raised when provider request times out."""

    def __init__(self, provider_id: str, timeout_seconds: int):
        self.timeout_seconds = timeout_seconds
        super().__init__(
            provider_id, f"Request timed out after {timeout_seconds}s"
        )


class ProviderAuthenticationError(ProviderError):
    """Raised when provider authentication fails."""

    def __init__(self, provider_id: str):
        super().__init__(provider_id, "Authentication failed - invalid API key")


class NoAvailableProviderError(Exception):
    """Raised when no providers are available to handle the request."""

    def __init__(self, message: str = "All providers unavailable"):
        self.message = message
        super().__init__(message)


class AllProvidersFailedError(Exception):
    """Raised when all providers fail to handle the request."""

    def __init__(self, last_error: Optional[Exception] = None):
        self.last_error = last_error
        message = "All providers failed to handle the request"
        if last_error:
            message += f": {str(last_error)}"
        super().__init__(message)


# =============================================================================
# Configuration Models
# =============================================================================


class ProviderConfig(BaseModel):
    """Configuration for an AI provider."""

    provider_id: str = Field(..., description="Unique identifier for this provider")
    provider_type: ProviderType = Field(..., description="Type of AI provider")
    api_key: Optional[str] = Field(default=None, description="API key for authentication")
    api_base: Optional[str] = Field(default=None, description="Custom API base URL")
    default_model: str = Field(..., description="Default model to use")
    available_models: List[str] = Field(
        default_factory=list, description="List of available models"
    )
    priority: int = Field(
        default=1, ge=1, description="Priority order (lower = higher priority)"
    )
    max_retries: int = Field(default=3, ge=1, description="Maximum retry attempts")
    timeout_seconds: int = Field(default=30, ge=1, description="Request timeout in seconds")
    rate_limit_rpm: Optional[int] = Field(
        default=None, description="Rate limit in requests per minute"
    )
    rate_limit_cooldown_seconds: int = Field(
        default=60, description="Cooldown after rate limit hit"
    )
    is_enabled: bool = Field(default=True, description="Whether provider is enabled")

    @field_validator("available_models", mode="before")
    @classmethod
    def ensure_default_in_available(cls, v: List[str], info) -> List[str]:
        """Ensure default model is in available models list."""
        if not v:
            return []
        return v


class MultiProviderConfig(BaseModel):
    """Configuration for the multi-provider service."""

    openai: Optional[ProviderConfig] = None
    anthropic: Optional[ProviderConfig] = None
    google: Optional[ProviderConfig] = None
    fallback: Optional[ProviderConfig] = None
    health_check_interval_seconds: int = Field(
        default=60, description="Interval between health checks"
    )
    circuit_breaker_threshold: int = Field(
        default=5, description="Failures before circuit opens"
    )
    circuit_breaker_timeout_seconds: int = Field(
        default=60, description="Time before circuit breaker resets"
    )


# =============================================================================
# Health Models
# =============================================================================


class ProviderHealth(BaseModel):
    """Health status of a provider."""

    provider_id: str
    status: ProviderStatus = ProviderStatus.HEALTHY
    last_check: datetime = Field(default_factory=datetime.utcnow)
    last_success: Optional[datetime] = None
    last_failure: Optional[datetime] = None
    failure_count: int = 0
    consecutive_failures: int = 0
    avg_latency_ms: float = 0.0
    error_rate: float = 0.0
    total_requests: int = 0
    successful_requests: int = 0
    rate_limit_reset_at: Optional[datetime] = None

    def is_rate_limit_expired(self) -> bool:
        """Check if rate limit cooldown has passed."""
        if self.rate_limit_reset_at is None:
            return True
        return datetime.utcnow() >= self.rate_limit_reset_at

    def calculate_error_rate(self) -> float:
        """Calculate current error rate."""
        if self.total_requests == 0:
            return 0.0
        failed = self.total_requests - self.successful_requests
        return failed / self.total_requests

    class Config:
        """Pydantic configuration."""

        json_encoders = {datetime: lambda v: v.isoformat()}


# =============================================================================
# Request/Response Models
# =============================================================================


class Message(BaseModel):
    """A single message in a conversation."""

    role: str = Field(..., description="Message role: system, user, or assistant")
    content: str = Field(..., description="Message content")
    name: Optional[str] = Field(default=None, description="Optional name identifier")

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        """Validate message role."""
        valid_roles = {"system", "user", "assistant", "tool"}
        if v not in valid_roles:
            raise ValueError(f"role must be one of {valid_roles}")
        return v


class ToolDefinition(BaseModel):
    """Definition of a tool/function for AI to use."""

    name: str = Field(..., description="Tool name")
    description: str = Field(..., description="Tool description")
    parameters: Dict[str, Any] = Field(
        default_factory=dict, description="JSON schema for parameters"
    )


class AIRequest(BaseModel):
    """Unified AI request format."""

    request_id: str = Field(..., description="Unique request identifier")
    messages: List[Message] = Field(..., description="Conversation messages")
    model: Optional[str] = Field(
        default=None, description="Specific model to use (overrides default)"
    )
    max_tokens: int = Field(default=1000, ge=1, description="Maximum tokens to generate")
    temperature: float = Field(
        default=0.7, ge=0.0, le=2.0, description="Sampling temperature"
    )
    system_prompt: Optional[str] = Field(
        default=None, description="System prompt (prepended to messages)"
    )
    tools: Optional[List[ToolDefinition]] = Field(
        default=None, description="Tools available for the AI"
    )
    stop_sequences: Optional[List[str]] = Field(
        default=None, description="Sequences that stop generation"
    )

    # Routing preferences
    preferred_provider: Optional[str] = Field(
        default=None, description="Preferred provider ID"
    )
    allow_fallback: bool = Field(
        default=True, description="Allow fallback to other providers"
    )
    require_streaming: bool = Field(
        default=False, description="Require streaming support"
    )

    # Metadata
    metadata: Dict[str, Any] = Field(
        default_factory=dict, description="Additional request metadata"
    )


class TokenUsage(BaseModel):
    """Token usage statistics."""

    prompt_tokens: int = Field(default=0, description="Tokens in the prompt")
    completion_tokens: int = Field(default=0, description="Tokens in the completion")
    total_tokens: int = Field(default=0, description="Total tokens used")


class AIResponse(BaseModel):
    """Unified AI response format."""

    request_id: str = Field(..., description="Original request identifier")
    provider_used: str = Field(..., description="Provider that handled the request")
    model_used: str = Field(..., description="Model that generated the response")
    content: str = Field(..., description="Generated content")
    finish_reason: FinishReason = Field(..., description="Why generation stopped")
    usage: TokenUsage = Field(
        default_factory=TokenUsage, description="Token usage statistics"
    )
    latency_ms: int = Field(..., description="Request latency in milliseconds")

    # Metadata
    fallback_used: bool = Field(
        default=False, description="Whether a fallback provider was used"
    )
    attempts: int = Field(default=1, description="Number of provider attempts")
    tool_calls: Optional[List[Dict[str, Any]]] = Field(
        default=None, description="Tool calls made by the AI"
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict, description="Additional response metadata"
    )

    class Config:
        """Pydantic configuration."""

        use_enum_values = True


class StreamChunk(BaseModel):
    """A chunk of streamed response."""

    request_id: str
    provider_used: str
    content: str
    is_final: bool = False
    finish_reason: Optional[FinishReason] = None
    usage: Optional[TokenUsage] = None


# =============================================================================
# Metrics Models
# =============================================================================


class ProviderMetrics(BaseModel):
    """Aggregated metrics for a provider."""

    provider_id: str
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    rate_limited_requests: int = 0
    total_tokens: int = 0
    total_latency_ms: int = 0
    avg_latency_ms: float = 0.0
    p95_latency_ms: float = 0.0
    p99_latency_ms: float = 0.0
    error_rate: float = 0.0
    fallback_count: int = 0
    last_updated: datetime = Field(default_factory=datetime.utcnow)

    def record_request(
        self,
        success: bool,
        latency_ms: int,
        tokens: int = 0,
        rate_limited: bool = False,
        is_fallback: bool = False,
    ) -> None:
        """Record a request for metrics."""
        self.total_requests += 1
        self.total_latency_ms += latency_ms

        if success:
            self.successful_requests += 1
            self.total_tokens += tokens
        else:
            self.failed_requests += 1

        if rate_limited:
            self.rate_limited_requests += 1

        if is_fallback:
            self.fallback_count += 1

        # Update averages
        if self.total_requests > 0:
            self.avg_latency_ms = self.total_latency_ms / self.total_requests
            self.error_rate = self.failed_requests / self.total_requests

        self.last_updated = datetime.utcnow()


class ServiceMetrics(BaseModel):
    """Aggregated metrics for the multi-provider service."""

    provider_metrics: Dict[str, ProviderMetrics] = Field(default_factory=dict)
    total_requests: int = 0
    total_fallbacks: int = 0
    total_failures: int = 0
    start_time: datetime = Field(default_factory=datetime.utcnow)
    last_updated: datetime = Field(default_factory=datetime.utcnow)
