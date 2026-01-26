"""
Multi-Provider AI Service.

Main service class that provides a unified interface for AI completions
with automatic failover, health monitoring, and metrics collection.
"""

import asyncio
from datetime import datetime
from typing import AsyncIterator, Dict, List, Optional

import structlog

from .base import BaseAIProvider
from .models import (
    AIRequest,
    AIResponse,
    MultiProviderConfig,
    ProviderConfig,
    ProviderHealth,
    ProviderMetrics,
    ProviderStatus,
    ProviderType,
    ServiceMetrics,
    StreamChunk,
)
from .router import CircuitBreaker, CircuitState, ProviderRouter
from .openai_provider import OpenAIProvider, OPENAI_AVAILABLE
from .anthropic_provider import AnthropicProvider, ANTHROPIC_AVAILABLE
from .fallback_provider import FallbackProvider

logger = structlog.get_logger(__name__)


class MultiProviderAIService:
    """
    Main multi-provider AI service.

    Provides a unified interface for AI completions with:
    - Automatic failover between providers
    - Health monitoring with periodic checks
    - Metrics collection per provider
    - Circuit breaker protection
    - Streaming support
    """

    def __init__(
        self,
        config: MultiProviderConfig,
        enable_health_checks: bool = True,
    ):
        """
        Initialize multi-provider service.

        Args:
            config: Configuration for all providers.
            enable_health_checks: Whether to run periodic health checks.
        """
        self.config = config
        self._enable_health_checks = enable_health_checks
        self._health_check_task: Optional[asyncio.Task] = None
        self._is_running = False

        # Initialize providers
        self.providers = self._initialize_providers(config)

        if not self.providers:
            raise ValueError("At least one provider must be configured")

        # Initialize router with circuit breaker
        circuit_breaker = CircuitBreaker(
            failure_threshold=config.circuit_breaker_threshold,
            recovery_timeout=config.circuit_breaker_timeout_seconds,
        )
        self.router = ProviderRouter(self.providers, circuit_breaker)

        # Initialize metrics
        self.metrics = ServiceMetrics()
        for provider in self.providers:
            self.metrics.provider_metrics[provider.provider_id] = ProviderMetrics(
                provider_id=provider.provider_id
            )

        logger.info(
            "multi_provider_service_initialized",
            providers=[p.provider_id for p in self.providers],
            health_checks_enabled=enable_health_checks,
        )

    def _initialize_providers(
        self, config: MultiProviderConfig
    ) -> List[BaseAIProvider]:
        """
        Initialize all configured providers.

        Args:
            config: Multi-provider configuration.

        Returns:
            List of initialized provider instances.
        """
        providers = []

        # Initialize OpenAI provider
        if config.openai and config.openai.is_enabled:
            if OPENAI_AVAILABLE:
                try:
                    provider = OpenAIProvider(config.openai)
                    providers.append(provider)
                    logger.info(
                        "provider_initialized",
                        provider_id=config.openai.provider_id,
                        provider_type="openai",
                    )
                except Exception as e:
                    logger.error(
                        "provider_initialization_failed",
                        provider_id=config.openai.provider_id,
                        error=str(e),
                    )
            else:
                logger.warning(
                    "openai_package_not_available",
                    message="OpenAI provider configured but package not installed",
                )

        # Initialize Anthropic provider
        if config.anthropic and config.anthropic.is_enabled:
            if ANTHROPIC_AVAILABLE:
                try:
                    provider = AnthropicProvider(config.anthropic)
                    providers.append(provider)
                    logger.info(
                        "provider_initialized",
                        provider_id=config.anthropic.provider_id,
                        provider_type="anthropic",
                    )
                except Exception as e:
                    logger.error(
                        "provider_initialization_failed",
                        provider_id=config.anthropic.provider_id,
                        error=str(e),
                    )
            else:
                logger.warning(
                    "anthropic_package_not_available",
                    message="Anthropic provider configured but package not installed",
                )

        # Initialize fallback provider (always available)
        if config.fallback and config.fallback.is_enabled:
            try:
                provider = FallbackProvider(config.fallback)
                providers.append(provider)
                logger.info(
                    "provider_initialized",
                    provider_id=config.fallback.provider_id,
                    provider_type="fallback",
                )
            except Exception as e:
                logger.error(
                    "fallback_provider_initialization_failed",
                    error=str(e),
                )

        return providers

    async def start(self) -> None:
        """Start the service including background health checks."""
        if self._is_running:
            return

        self._is_running = True

        if self._enable_health_checks:
            self._health_check_task = asyncio.create_task(
                self._health_check_loop()
            )
            logger.info("health_check_loop_started")

    async def stop(self) -> None:
        """Stop the service and cleanup resources."""
        self._is_running = False

        if self._health_check_task:
            self._health_check_task.cancel()
            try:
                await self._health_check_task
            except asyncio.CancelledError:
                pass
            self._health_check_task = None

        logger.info("multi_provider_service_stopped")

    async def complete(self, request: AIRequest) -> AIResponse:
        """
        Generate a completion with automatic failover.

        Args:
            request: The AI request with messages and parameters.

        Returns:
            AIResponse from the successful provider.

        Raises:
            AllProvidersFailedError: If all providers fail.
            NoAvailableProviderError: If no providers are available.
        """
        start_time = datetime.utcnow()

        response = await self.router.execute_with_failover(request)

        # Record metrics
        self._record_metrics(
            provider_id=response.provider_used,
            success=True,
            latency_ms=response.latency_ms,
            tokens=response.usage.total_tokens,
            fallback_used=response.fallback_used,
        )

        return response

    async def stream(self, request: AIRequest) -> AsyncIterator[StreamChunk]:
        """
        Stream a completion with automatic failover.

        Args:
            request: The AI request with messages and parameters.

        Yields:
            StreamChunk objects with partial content.

        Raises:
            NoAvailableProviderError: If no provider is available.
        """
        provider, is_fallback = await self.router.route(request)
        start_time = datetime.utcnow()
        total_tokens = 0

        try:
            async for chunk in provider.stream(request):
                yield chunk

                if chunk.is_final and chunk.usage:
                    total_tokens = chunk.usage.total_tokens

            # Record success metrics
            latency_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            self._record_metrics(
                provider_id=provider.provider_id,
                success=True,
                latency_ms=latency_ms,
                tokens=total_tokens,
                fallback_used=is_fallback,
            )

        except Exception as e:
            # Record failure metrics
            latency_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            self._record_metrics(
                provider_id=provider.provider_id,
                success=False,
                latency_ms=latency_ms,
                tokens=0,
                fallback_used=is_fallback,
            )
            raise

    async def get_health(self) -> Dict[str, ProviderHealth]:
        """
        Get health status of all providers.

        Returns:
            Dict mapping provider_id to ProviderHealth.
        """
        return self.router.get_provider_health()

    async def get_detailed_health(self) -> Dict[str, Dict]:
        """
        Get detailed health information including circuit breaker states.

        Returns:
            Dict with comprehensive health information.
        """
        health = await self.get_health()
        circuit_states = self.router.get_circuit_states()

        result = {}
        for provider_id, provider_health in health.items():
            circuit_state = circuit_states.get(provider_id, CircuitState.CLOSED)
            result[provider_id] = {
                "health": provider_health.model_dump(),
                "circuit_state": circuit_state.value,
                "is_available": (
                    provider_health.status != ProviderStatus.UNAVAILABLE
                    and circuit_state != CircuitState.OPEN
                ),
            }

        return result

    def get_metrics(self) -> ServiceMetrics:
        """
        Get service-level metrics.

        Returns:
            ServiceMetrics with aggregated statistics.
        """
        self.metrics.last_updated = datetime.utcnow()
        return self.metrics

    def get_provider_metrics(self, provider_id: str) -> Optional[ProviderMetrics]:
        """
        Get metrics for a specific provider.

        Args:
            provider_id: Provider identifier.

        Returns:
            ProviderMetrics or None if provider not found.
        """
        return self.metrics.provider_metrics.get(provider_id)

    def reset_provider(self, provider_id: str) -> bool:
        """
        Reset a provider's health status and circuit breaker.

        Args:
            provider_id: Provider to reset.

        Returns:
            True if provider was found and reset.
        """
        return self.router.reset_provider(provider_id)

    def reset_all_providers(self) -> None:
        """Reset all providers' health status and circuit breakers."""
        self.router.reset_all_providers()

    def _record_metrics(
        self,
        provider_id: str,
        success: bool,
        latency_ms: int,
        tokens: int = 0,
        fallback_used: bool = False,
        rate_limited: bool = False,
    ) -> None:
        """Record metrics for a request."""
        # Update service-level metrics
        self.metrics.total_requests += 1
        if fallback_used:
            self.metrics.total_fallbacks += 1
        if not success:
            self.metrics.total_failures += 1
        self.metrics.last_updated = datetime.utcnow()

        # Update provider-level metrics
        provider_metrics = self.metrics.provider_metrics.get(provider_id)
        if provider_metrics:
            provider_metrics.record_request(
                success=success,
                latency_ms=latency_ms,
                tokens=tokens,
                rate_limited=rate_limited,
                is_fallback=fallback_used,
            )

    async def _health_check_loop(self) -> None:
        """Background task for periodic health checks."""
        while self._is_running:
            try:
                await asyncio.sleep(self.config.health_check_interval_seconds)

                if not self._is_running:
                    break

                await self._run_health_checks()

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(
                    "health_check_loop_error",
                    error=str(e),
                )

    async def _run_health_checks(self) -> None:
        """Run health checks on all providers."""
        logger.debug("running_health_checks")

        tasks = []
        for provider in self.providers:
            # Skip fallback provider - it's always healthy
            if provider.config.provider_type == ProviderType.FALLBACK:
                continue
            tasks.append(self._check_provider_health(provider))

        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    async def _check_provider_health(self, provider: BaseAIProvider) -> None:
        """Check health of a single provider."""
        try:
            health = await asyncio.wait_for(
                provider.health_check(),
                timeout=15.0,
            )

            logger.debug(
                "health_check_completed",
                provider_id=provider.provider_id,
                status=health.status.value,
                avg_latency_ms=health.avg_latency_ms,
            )

        except asyncio.TimeoutError:
            logger.warning(
                "health_check_timeout",
                provider_id=provider.provider_id,
            )
        except Exception as e:
            logger.warning(
                "health_check_failed",
                provider_id=provider.provider_id,
                error=str(e),
            )


def create_service_from_env() -> MultiProviderAIService:
    """
    Create multi-provider service from environment variables.

    Expected environment variables:
    - OPENAI_API_KEY: OpenAI API key
    - ANTHROPIC_API_KEY: Anthropic API key
    - AI_PRIMARY_PROVIDER: Primary provider (openai/anthropic)
    - AI_ENABLE_FALLBACK: Enable fallback provider (true/false)

    Returns:
        Configured MultiProviderAIService instance.
    """
    import os

    openai_key = os.environ.get("OPENAI_API_KEY", "")
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")
    primary_provider = os.environ.get("AI_PRIMARY_PROVIDER", "openai")
    enable_fallback = os.environ.get("AI_ENABLE_FALLBACK", "true").lower() == "true"

    openai_config = None
    anthropic_config = None
    fallback_config = None

    # Configure OpenAI
    if openai_key:
        openai_priority = 1 if primary_provider == "openai" else 2
        openai_config = ProviderConfig(
            provider_id="openai-primary",
            provider_type=ProviderType.OPENAI,
            api_key=openai_key,
            default_model="gpt-4o",
            available_models=["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
            priority=openai_priority,
            max_retries=3,
            timeout_seconds=30,
        )

    # Configure Anthropic
    if anthropic_key:
        anthropic_priority = 1 if primary_provider == "anthropic" else 2
        anthropic_config = ProviderConfig(
            provider_id="anthropic-primary",
            provider_type=ProviderType.ANTHROPIC,
            api_key=anthropic_key,
            default_model="claude-3-5-sonnet-20241022",
            available_models=[
                "claude-3-5-sonnet-20241022",
                "claude-3-opus-20240229",
                "claude-3-haiku-20240307",
            ],
            priority=anthropic_priority,
            max_retries=3,
            timeout_seconds=30,
        )

    # Configure fallback
    if enable_fallback:
        fallback_config = ProviderConfig(
            provider_id="fallback",
            provider_type=ProviderType.FALLBACK,
            default_model="fallback-v1",
            priority=99,  # Lowest priority
        )

    config = MultiProviderConfig(
        openai=openai_config,
        anthropic=anthropic_config,
        fallback=fallback_config,
    )

    return MultiProviderAIService(config)


# Singleton instance
_service_instance: Optional[MultiProviderAIService] = None


def get_ai_service() -> MultiProviderAIService:
    """
    Get the singleton AI service instance.

    Creates the service on first call using environment configuration.

    Returns:
        MultiProviderAIService instance.
    """
    global _service_instance
    if _service_instance is None:
        _service_instance = create_service_from_env()
    return _service_instance


async def init_ai_service() -> MultiProviderAIService:
    """
    Initialize and start the AI service.

    Returns:
        Started MultiProviderAIService instance.
    """
    service = get_ai_service()
    await service.start()
    return service


async def shutdown_ai_service() -> None:
    """Shutdown the AI service."""
    global _service_instance
    if _service_instance:
        await _service_instance.stop()
        _service_instance = None
