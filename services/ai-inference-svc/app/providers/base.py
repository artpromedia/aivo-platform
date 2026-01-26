"""
Base AI Provider Interface.

Defines the abstract base class for all AI provider implementations
with common functionality for health tracking and metrics.
"""

from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from typing import AsyncIterator, List, Optional

import structlog

from .models import (
    AIRequest,
    AIResponse,
    Message,
    ProviderConfig,
    ProviderHealth,
    ProviderStatus,
    StreamChunk,
)

logger = structlog.get_logger(__name__)


class BaseAIProvider(ABC):
    """
    Base interface for AI providers.

    All provider implementations must inherit from this class and implement
    the abstract methods for completion, streaming, and health checks.
    """

    def __init__(self, config: ProviderConfig):
        """
        Initialize the provider with configuration.

        Args:
            config: Provider configuration including API keys and settings.
        """
        self.config = config
        self.health = ProviderHealth(
            provider_id=config.provider_id,
            status=ProviderStatus.HEALTHY,
            last_check=datetime.utcnow(),
        )
        self._latency_history: List[int] = []
        self._max_latency_samples = 100

    @property
    def provider_id(self) -> str:
        """Get the provider identifier."""
        return self.config.provider_id

    @property
    def is_enabled(self) -> bool:
        """Check if provider is enabled in configuration."""
        return self.config.is_enabled

    @abstractmethod
    async def complete(self, request: AIRequest) -> AIResponse:
        """
        Generate a completion for the given request.

        Args:
            request: The AI request with messages and parameters.

        Returns:
            AIResponse with generated content and metadata.

        Raises:
            ProviderAPIError: When the API call fails.
            ProviderRateLimitError: When rate limited.
            ProviderTimeoutError: When request times out.
        """
        pass

    @abstractmethod
    async def stream(self, request: AIRequest) -> AsyncIterator[StreamChunk]:
        """
        Stream a completion for the given request.

        Args:
            request: The AI request with messages and parameters.

        Yields:
            StreamChunk objects with partial content.

        Raises:
            ProviderAPIError: When the API call fails.
            ProviderRateLimitError: When rate limited.
        """
        pass

    @abstractmethod
    async def health_check(self) -> ProviderHealth:
        """
        Check provider health status.

        Returns:
            Updated ProviderHealth with current status.
        """
        pass

    async def is_available(self) -> bool:
        """
        Check if provider is available for requests.

        Returns:
            True if provider can accept requests, False otherwise.
        """
        if not self.config.is_enabled:
            return False

        if self.health.status == ProviderStatus.UNAVAILABLE:
            return False

        if self.health.status == ProviderStatus.RATE_LIMITED:
            if not self.health.is_rate_limit_expired():
                return False
            # Rate limit expired, reset status
            self.health.status = ProviderStatus.HEALTHY
            self.health.rate_limit_reset_at = None

        return True

    def _record_success(self, latency_ms: int, tokens: int = 0) -> None:
        """
        Record a successful request.

        Args:
            latency_ms: Request latency in milliseconds.
            tokens: Number of tokens used.
        """
        now = datetime.utcnow()
        self.health.last_success = now
        self.health.last_check = now
        self.health.consecutive_failures = 0
        self.health.total_requests += 1
        self.health.successful_requests += 1

        # Update rolling average latency
        self._latency_history.append(latency_ms)
        if len(self._latency_history) > self._max_latency_samples:
            self._latency_history.pop(0)

        if self._latency_history:
            self.health.avg_latency_ms = sum(self._latency_history) / len(
                self._latency_history
            )

        # Reset status if it was degraded
        if self.health.status == ProviderStatus.DEGRADED:
            self.health.status = ProviderStatus.HEALTHY

        self.health.error_rate = self.health.calculate_error_rate()

        logger.debug(
            "provider_request_success",
            provider_id=self.provider_id,
            latency_ms=latency_ms,
            tokens=tokens,
            avg_latency_ms=self.health.avg_latency_ms,
        )

    def _record_failure(self, error: Exception, mark_unavailable: bool = True) -> None:
        """
        Record a failed request.

        Args:
            error: The exception that caused the failure.
            mark_unavailable: Whether to mark provider unavailable after threshold.
        """
        now = datetime.utcnow()
        self.health.last_failure = now
        self.health.last_check = now
        self.health.failure_count += 1
        self.health.consecutive_failures += 1
        self.health.total_requests += 1
        self.health.error_rate = self.health.calculate_error_rate()

        logger.warning(
            "provider_request_failure",
            provider_id=self.provider_id,
            error=str(error),
            failure_count=self.health.failure_count,
            consecutive_failures=self.health.consecutive_failures,
        )

        # Mark degraded after some failures
        if self.health.consecutive_failures >= 2:
            self.health.status = ProviderStatus.DEGRADED

        # Mark unavailable after reaching threshold
        if mark_unavailable and self.health.consecutive_failures >= self.config.max_retries:
            self.health.status = ProviderStatus.UNAVAILABLE
            logger.error(
                "provider_marked_unavailable",
                provider_id=self.provider_id,
                consecutive_failures=self.health.consecutive_failures,
            )

    def _record_rate_limit(self, retry_after: Optional[int] = None) -> None:
        """
        Record a rate limit event.

        Args:
            retry_after: Seconds to wait before retrying (if provided by API).
        """
        now = datetime.utcnow()
        self.health.status = ProviderStatus.RATE_LIMITED
        self.health.last_check = now

        cooldown = retry_after or self.config.rate_limit_cooldown_seconds
        self.health.rate_limit_reset_at = now + timedelta(seconds=cooldown)

        logger.warning(
            "provider_rate_limited",
            provider_id=self.provider_id,
            retry_after=cooldown,
            reset_at=self.health.rate_limit_reset_at.isoformat(),
        )

    def _format_messages(
        self, request: AIRequest
    ) -> List[Message]:
        """
        Format messages for the provider API.

        Prepends system prompt if provided.

        Args:
            request: The AI request.

        Returns:
            List of formatted messages.
        """
        messages = list(request.messages)

        if request.system_prompt:
            # Check if first message is already a system message
            if not messages or messages[0].role != "system":
                messages.insert(
                    0, Message(role="system", content=request.system_prompt)
                )
            else:
                # Prepend to existing system message
                messages[0] = Message(
                    role="system",
                    content=f"{request.system_prompt}\n\n{messages[0].content}",
                )

        return messages

    def get_model(self, request: AIRequest) -> str:
        """
        Get the model to use for a request.

        Args:
            request: The AI request.

        Returns:
            Model name to use.
        """
        if request.model:
            # Validate requested model is available
            if (
                self.config.available_models
                and request.model not in self.config.available_models
            ):
                logger.warning(
                    "requested_model_not_available",
                    provider_id=self.provider_id,
                    requested_model=request.model,
                    available_models=self.config.available_models,
                    using_default=self.config.default_model,
                )
                return self.config.default_model
            return request.model
        return self.config.default_model

    def reset_health(self) -> None:
        """Reset health status to healthy state."""
        self.health.status = ProviderStatus.HEALTHY
        self.health.consecutive_failures = 0
        self.health.rate_limit_reset_at = None
        self.health.last_check = datetime.utcnow()
        logger.info("provider_health_reset", provider_id=self.provider_id)

    def __repr__(self) -> str:
        """String representation of the provider."""
        return (
            f"{self.__class__.__name__}("
            f"provider_id={self.provider_id!r}, "
            f"status={self.health.status.value!r}, "
            f"priority={self.config.priority}"
            f")"
        )
