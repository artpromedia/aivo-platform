"""
Provider Router with Failover Logic.

Routes AI requests to appropriate providers with automatic failover,
circuit breaker pattern, and intelligent provider selection.
"""

import asyncio
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Tuple

import structlog

from .base import BaseAIProvider
from .models import (
    AIRequest,
    AIResponse,
    AllProvidersFailedError,
    NoAvailableProviderError,
    ProviderAPIError,
    ProviderHealth,
    ProviderRateLimitError,
    ProviderStatus,
    ProviderTimeoutError,
)

logger = structlog.get_logger(__name__)


class CircuitState(str, Enum):
    """Circuit breaker states."""

    CLOSED = "closed"  # Normal operation
    OPEN = "open"  # Blocking requests
    HALF_OPEN = "half_open"  # Testing recovery


class CircuitBreaker:
    """
    Circuit breaker for provider protection.

    Prevents cascade failures by temporarily blocking requests
    to failing providers and allowing gradual recovery.
    """

    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        half_open_max_calls: int = 3,
    ):
        """
        Initialize circuit breaker.

        Args:
            failure_threshold: Failures before circuit opens.
            recovery_timeout: Seconds before attempting recovery.
            half_open_max_calls: Max calls allowed in half-open state.
        """
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.half_open_max_calls = half_open_max_calls

        self._state: Dict[str, CircuitState] = {}
        self._failure_counts: Dict[str, int] = {}
        self._last_failure_time: Dict[str, datetime] = {}
        self._half_open_calls: Dict[str, int] = {}

    def get_state(self, provider_id: str) -> CircuitState:
        """Get current circuit state for a provider."""
        return self._state.get(provider_id, CircuitState.CLOSED)

    def is_allowed(self, provider_id: str) -> bool:
        """
        Check if requests are allowed for this provider.

        Args:
            provider_id: Provider identifier.

        Returns:
            True if requests are allowed.
        """
        state = self.get_state(provider_id)

        if state == CircuitState.CLOSED:
            return True

        if state == CircuitState.OPEN:
            # Check if recovery timeout has passed
            last_failure = self._last_failure_time.get(provider_id)
            if last_failure:
                elapsed = (datetime.utcnow() - last_failure).total_seconds()
                if elapsed >= self.recovery_timeout:
                    # Transition to half-open
                    self._state[provider_id] = CircuitState.HALF_OPEN
                    self._half_open_calls[provider_id] = 0
                    logger.info(
                        "circuit_half_open",
                        provider_id=provider_id,
                        elapsed_seconds=elapsed,
                    )
                    return True
            return False

        if state == CircuitState.HALF_OPEN:
            # Allow limited calls in half-open state
            calls = self._half_open_calls.get(provider_id, 0)
            return calls < self.half_open_max_calls

        return False

    def record_success(self, provider_id: str) -> None:
        """
        Record a successful request.

        Args:
            provider_id: Provider identifier.
        """
        state = self.get_state(provider_id)

        if state == CircuitState.HALF_OPEN:
            self._half_open_calls[provider_id] = (
                self._half_open_calls.get(provider_id, 0) + 1
            )

            # After enough successes, close the circuit
            if self._half_open_calls[provider_id] >= self.half_open_max_calls:
                self._state[provider_id] = CircuitState.CLOSED
                self._failure_counts[provider_id] = 0
                logger.info(
                    "circuit_closed",
                    provider_id=provider_id,
                    reason="recovery_complete",
                )

        elif state == CircuitState.CLOSED:
            # Reset failure count on success
            self._failure_counts[provider_id] = 0

    def record_failure(self, provider_id: str) -> None:
        """
        Record a failed request.

        Args:
            provider_id: Provider identifier.
        """
        state = self.get_state(provider_id)
        self._last_failure_time[provider_id] = datetime.utcnow()

        if state == CircuitState.HALF_OPEN:
            # Any failure in half-open state reopens the circuit
            self._state[provider_id] = CircuitState.OPEN
            logger.warning(
                "circuit_reopened",
                provider_id=provider_id,
                reason="half_open_failure",
            )

        elif state == CircuitState.CLOSED:
            self._failure_counts[provider_id] = (
                self._failure_counts.get(provider_id, 0) + 1
            )

            if self._failure_counts[provider_id] >= self.failure_threshold:
                self._state[provider_id] = CircuitState.OPEN
                logger.warning(
                    "circuit_opened",
                    provider_id=provider_id,
                    failure_count=self._failure_counts[provider_id],
                )

    def reset(self, provider_id: str) -> None:
        """Reset circuit breaker for a provider."""
        self._state[provider_id] = CircuitState.CLOSED
        self._failure_counts[provider_id] = 0
        self._half_open_calls[provider_id] = 0
        logger.info("circuit_reset", provider_id=provider_id)

    def get_all_states(self) -> Dict[str, CircuitState]:
        """Get circuit states for all providers."""
        return dict(self._state)


class ProviderRouter:
    """
    Routes requests to appropriate providers with failover.

    Implements intelligent provider selection with:
    - Priority-based routing
    - Automatic failover on errors
    - Circuit breaker protection
    - Preferred provider support
    """

    def __init__(
        self,
        providers: List[BaseAIProvider],
        circuit_breaker: Optional[CircuitBreaker] = None,
    ):
        """
        Initialize provider router.

        Args:
            providers: List of available providers.
            circuit_breaker: Optional circuit breaker instance.
        """
        # Sort by priority (lower number = higher priority)
        self.providers = sorted(providers, key=lambda p: p.config.priority)
        self.circuit_breaker = circuit_breaker or CircuitBreaker()

        # Build provider lookup
        self._provider_map: Dict[str, BaseAIProvider] = {
            p.provider_id: p for p in self.providers
        }

        # Track fallback provider separately
        self._fallback_provider: Optional[BaseAIProvider] = None
        for provider in reversed(self.providers):
            if provider.config.provider_type.value == "fallback":
                self._fallback_provider = provider
                break

        logger.info(
            "router_initialized",
            provider_count=len(self.providers),
            provider_ids=[p.provider_id for p in self.providers],
        )

    def get_provider(self, provider_id: str) -> Optional[BaseAIProvider]:
        """Get provider by ID."""
        return self._provider_map.get(provider_id)

    async def route(self, request: AIRequest) -> Tuple[BaseAIProvider, bool]:
        """
        Select provider for request.

        Args:
            request: The AI request.

        Returns:
            Tuple of (provider, is_fallback).

        Raises:
            NoAvailableProviderError: If no provider can handle the request.
        """
        # Check for preferred provider first
        if request.preferred_provider:
            preferred = self.get_provider(request.preferred_provider)
            if preferred:
                is_available = await self._is_provider_available(preferred)
                if is_available:
                    logger.debug(
                        "using_preferred_provider",
                        provider_id=preferred.provider_id,
                        request_id=request.request_id,
                    )
                    return preferred, False
                else:
                    logger.debug(
                        "preferred_provider_unavailable",
                        provider_id=request.preferred_provider,
                        request_id=request.request_id,
                    )

        # Find first available provider by priority
        for provider in self.providers:
            # Skip fallback provider in first pass
            if provider == self._fallback_provider:
                continue

            if await self._is_provider_available(provider):
                is_fallback = provider != self.providers[0]
                return provider, is_fallback

        # All primary providers unavailable, try fallback
        if request.allow_fallback and self._fallback_provider:
            if await self._is_provider_available(self._fallback_provider):
                logger.warning(
                    "using_fallback_provider",
                    request_id=request.request_id,
                )
                return self._fallback_provider, True

        raise NoAvailableProviderError(
            "All providers unavailable and fallback not allowed or unavailable"
        )

    async def _is_provider_available(self, provider: BaseAIProvider) -> bool:
        """Check if a provider is available for requests."""
        # Check provider's own availability
        if not await provider.is_available():
            return False

        # Check circuit breaker
        if not self.circuit_breaker.is_allowed(provider.provider_id):
            return False

        return True

    async def execute_with_failover(self, request: AIRequest) -> AIResponse:
        """
        Execute request with automatic failover.

        Tries providers in priority order until one succeeds.

        Args:
            request: The AI request.

        Returns:
            AIResponse from the successful provider.

        Raises:
            AllProvidersFailedError: If all providers fail.
            NoAvailableProviderError: If no providers are available.
        """
        attempts = 0
        last_error: Optional[Exception] = None
        providers_tried: List[str] = []

        # Build list of providers to try
        providers_to_try = list(self.providers)

        # If preferred provider specified, try it first
        if request.preferred_provider:
            preferred = self.get_provider(request.preferred_provider)
            if preferred and preferred in providers_to_try:
                providers_to_try.remove(preferred)
                providers_to_try.insert(0, preferred)

        # Move fallback to end if present
        if self._fallback_provider and self._fallback_provider in providers_to_try:
            providers_to_try.remove(self._fallback_provider)
            if request.allow_fallback:
                providers_to_try.append(self._fallback_provider)

        for provider in providers_to_try:
            if not await self._is_provider_available(provider):
                continue

            attempts += 1
            providers_tried.append(provider.provider_id)

            try:
                logger.debug(
                    "attempting_provider",
                    provider_id=provider.provider_id,
                    attempt=attempts,
                    request_id=request.request_id,
                )

                response = await provider.complete(request)

                # Record success with circuit breaker
                self.circuit_breaker.record_success(provider.provider_id)

                # Update response metadata
                response.attempts = attempts
                response.fallback_used = provider == self._fallback_provider

                logger.info(
                    "request_completed",
                    provider_id=provider.provider_id,
                    request_id=request.request_id,
                    attempts=attempts,
                    latency_ms=response.latency_ms,
                    fallback_used=response.fallback_used,
                )

                return response

            except (
                ProviderRateLimitError,
                ProviderAPIError,
                ProviderTimeoutError,
            ) as e:
                last_error = e
                self.circuit_breaker.record_failure(provider.provider_id)

                logger.warning(
                    "provider_failed_attempting_next",
                    provider_id=provider.provider_id,
                    error=str(e),
                    request_id=request.request_id,
                    attempt=attempts,
                )
                continue

            except Exception as e:
                last_error = e
                self.circuit_breaker.record_failure(provider.provider_id)

                logger.error(
                    "provider_unexpected_error",
                    provider_id=provider.provider_id,
                    error=str(e),
                    request_id=request.request_id,
                )
                continue

        # All providers failed
        if attempts == 0:
            raise NoAvailableProviderError(
                f"No providers available. Circuit states: {self.circuit_breaker.get_all_states()}"
            )

        raise AllProvidersFailedError(last_error)

    def get_provider_health(self) -> Dict[str, ProviderHealth]:
        """Get health status of all providers."""
        return {p.provider_id: p.health for p in self.providers}

    def get_circuit_states(self) -> Dict[str, CircuitState]:
        """Get circuit breaker states for all providers."""
        return self.circuit_breaker.get_all_states()

    def reset_provider(self, provider_id: str) -> bool:
        """
        Reset a provider's health and circuit breaker.

        Args:
            provider_id: Provider to reset.

        Returns:
            True if provider was found and reset.
        """
        provider = self.get_provider(provider_id)
        if provider:
            provider.reset_health()
            self.circuit_breaker.reset(provider_id)
            logger.info("provider_reset", provider_id=provider_id)
            return True
        return False

    def reset_all_providers(self) -> None:
        """Reset health and circuits for all providers."""
        for provider in self.providers:
            provider.reset_health()
            self.circuit_breaker.reset(provider.provider_id)
        logger.info("all_providers_reset")
