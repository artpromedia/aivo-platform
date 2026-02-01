"""
Multi-provider abstraction layer for AI services.

Provides automatic failover between multiple providers for resilience.
"""
import logging
import asyncio
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional, List, Dict, Any, TypeVar, Generic, Callable
from enum import Enum
import time

logger = logging.getLogger(__name__)

T = TypeVar('T')  # Result type


@dataclass
class ProviderResult(Generic[T]):
    """Result from a provider call."""
    success: bool
    result: Optional[T] = None
    provider: Optional[str] = None
    error: Optional[str] = None
    latency_ms: float = 0.0


class ProviderStatus(Enum):
    """Provider health status."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"


@dataclass
class ProviderHealth:
    """Health tracking for a provider."""
    provider: str
    status: ProviderStatus = ProviderStatus.UNKNOWN
    consecutive_failures: int = 0
    last_success: Optional[float] = None
    last_failure: Optional[float] = None
    total_requests: int = 0
    total_failures: int = 0
    avg_latency_ms: float = 0.0
    
    def record_success(self, latency_ms: float) -> None:
        """Record a successful request."""
        self.consecutive_failures = 0
        self.last_success = time.time()
        self.total_requests += 1
        # Running average
        self.avg_latency_ms = (self.avg_latency_ms * (self.total_requests - 1) + latency_ms) / self.total_requests
        self._update_status()
    
    def record_failure(self) -> None:
        """Record a failed request."""
        self.consecutive_failures += 1
        self.last_failure = time.time()
        self.total_requests += 1
        self.total_failures += 1
        self._update_status()
    
    def _update_status(self) -> None:
        """Update health status based on metrics."""
        if self.consecutive_failures >= 5:
            self.status = ProviderStatus.UNHEALTHY
        elif self.consecutive_failures >= 2:
            self.status = ProviderStatus.DEGRADED
        elif self.total_requests > 0:
            failure_rate = self.total_failures / self.total_requests
            if failure_rate > 0.5:
                self.status = ProviderStatus.UNHEALTHY
            elif failure_rate > 0.2:
                self.status = ProviderStatus.DEGRADED
            else:
                self.status = ProviderStatus.HEALTHY
    
    def should_skip(self, cooldown_seconds: float = 60.0) -> bool:
        """Check if provider should be skipped due to failures."""
        if self.status == ProviderStatus.UNHEALTHY and self.last_failure:
            # Skip unhealthy providers for cooldown period
            return (time.time() - self.last_failure) < cooldown_seconds
        return False


class MultiProviderManager:
    """
    Manages multiple providers with automatic failover.
    
    Features:
    - Automatic failover on failure
    - Health tracking per provider
    - Circuit breaker pattern
    - Load balancing (optional)
    """
    
    def __init__(
        self,
        name: str,
        enable_failover: bool = True,
        max_retries: int = 3,
        timeout: float = 30.0,
        cooldown_seconds: float = 60.0,
    ):
        self.name = name
        self.enable_failover = enable_failover
        self.max_retries = max_retries
        self.timeout = timeout
        self.cooldown_seconds = cooldown_seconds
        self._health: Dict[str, ProviderHealth] = {}
        self._providers: Dict[str, Callable] = {}
        self._provider_order: List[str] = []
    
    def register_provider(
        self,
        name: str,
        handler: Callable,
        priority: int = 0,
    ) -> None:
        """Register a provider with its handler function."""
        self._providers[name] = handler
        self._health[name] = ProviderHealth(provider=name)
        
        # Insert in priority order
        inserted = False
        for i, existing in enumerate(self._provider_order):
            existing_priority = i  # Use position as proxy for priority
            if priority < existing_priority:
                self._provider_order.insert(i, name)
                inserted = True
                break
        if not inserted:
            self._provider_order.append(name)
        
        logger.info(f"[{self.name}] Registered provider: {name}")
    
    def get_health(self, provider: Optional[str] = None) -> Dict[str, Any]:
        """Get health status for one or all providers."""
        if provider:
            health = self._health.get(provider)
            if health:
                return {
                    "provider": health.provider,
                    "status": health.status.value,
                    "consecutive_failures": health.consecutive_failures,
                    "total_requests": health.total_requests,
                    "failure_rate": health.total_failures / max(health.total_requests, 1),
                    "avg_latency_ms": health.avg_latency_ms,
                }
            return {"error": "Provider not found"}
        
        return {
            name: {
                "status": h.status.value,
                "consecutive_failures": h.consecutive_failures,
                "total_requests": h.total_requests,
                "failure_rate": h.total_failures / max(h.total_requests, 1),
                "avg_latency_ms": h.avg_latency_ms,
            }
            for name, h in self._health.items()
        }
    
    def get_available_providers(self) -> List[str]:
        """Get list of providers that are not in cooldown."""
        available = []
        for name in self._provider_order:
            health = self._health.get(name)
            if health and not health.should_skip(self.cooldown_seconds):
                available.append(name)
        return available
    
    async def execute_async(
        self,
        *args,
        preferred_provider: Optional[str] = None,
        **kwargs,
    ) -> ProviderResult:
        """
        Execute with automatic failover (async version).
        
        Args:
            *args: Arguments to pass to provider
            preferred_provider: Specific provider to try first
            **kwargs: Keyword arguments to pass to provider
            
        Returns:
            ProviderResult with success/failure and result
        """
        providers_to_try = self._get_providers_to_try(preferred_provider)
        
        if not providers_to_try:
            return ProviderResult(
                success=False,
                error="No providers available",
            )
        
        last_error = None
        
        for provider_name in providers_to_try[:self.max_retries]:
            health = self._health[provider_name]
            
            if health.should_skip(self.cooldown_seconds):
                logger.debug(f"[{self.name}] Skipping {provider_name} (in cooldown)")
                continue
            
            handler = self._providers[provider_name]
            start_time = time.time()
            
            try:
                logger.debug(f"[{self.name}] Trying provider: {provider_name}")
                
                # Execute with timeout
                if asyncio.iscoroutinefunction(handler):
                    result = await asyncio.wait_for(
                        handler(*args, **kwargs),
                        timeout=self.timeout,
                    )
                else:
                    # Run sync function in executor
                    loop = asyncio.get_event_loop()
                    result = await asyncio.wait_for(
                        loop.run_in_executor(None, lambda: handler(*args, **kwargs)),
                        timeout=self.timeout,
                    )
                
                latency_ms = (time.time() - start_time) * 1000
                health.record_success(latency_ms)
                
                logger.info(
                    f"[{self.name}] Success with {provider_name} "
                    f"(latency: {latency_ms:.1f}ms)"
                )
                
                return ProviderResult(
                    success=True,
                    result=result,
                    provider=provider_name,
                    latency_ms=latency_ms,
                )
                
            except asyncio.TimeoutError:
                health.record_failure()
                last_error = f"Timeout after {self.timeout}s"
                logger.warning(f"[{self.name}] {provider_name} timed out")
                
            except Exception as e:
                health.record_failure()
                last_error = str(e)
                logger.warning(f"[{self.name}] {provider_name} failed: {e}")
            
            if not self.enable_failover:
                break
        
        return ProviderResult(
            success=False,
            error=last_error or "All providers failed",
        )
    
    def execute(
        self,
        *args,
        preferred_provider: Optional[str] = None,
        **kwargs,
    ) -> ProviderResult:
        """
        Execute with automatic failover (sync version).
        
        Args:
            *args: Arguments to pass to provider
            preferred_provider: Specific provider to try first
            **kwargs: Keyword arguments to pass to provider
            
        Returns:
            ProviderResult with success/failure and result
        """
        providers_to_try = self._get_providers_to_try(preferred_provider)
        
        if not providers_to_try:
            return ProviderResult(
                success=False,
                error="No providers available",
            )
        
        last_error = None
        
        for provider_name in providers_to_try[:self.max_retries]:
            health = self._health[provider_name]
            
            if health.should_skip(self.cooldown_seconds):
                logger.debug(f"[{self.name}] Skipping {provider_name} (in cooldown)")
                continue
            
            handler = self._providers[provider_name]
            start_time = time.time()
            
            try:
                logger.debug(f"[{self.name}] Trying provider: {provider_name}")
                
                result = handler(*args, **kwargs)
                
                latency_ms = (time.time() - start_time) * 1000
                health.record_success(latency_ms)
                
                logger.info(
                    f"[{self.name}] Success with {provider_name} "
                    f"(latency: {latency_ms:.1f}ms)"
                )
                
                return ProviderResult(
                    success=True,
                    result=result,
                    provider=provider_name,
                    latency_ms=latency_ms,
                )
                
            except Exception as e:
                health.record_failure()
                last_error = str(e)
                logger.warning(f"[{self.name}] {provider_name} failed: {e}")
            
            if not self.enable_failover:
                break
        
        return ProviderResult(
            success=False,
            error=last_error or "All providers failed",
        )
    
    def _get_providers_to_try(self, preferred: Optional[str]) -> List[str]:
        """Get ordered list of providers to try."""
        if preferred and preferred in self._providers:
            # Put preferred first, then others
            others = [p for p in self._provider_order if p != preferred]
            return [preferred] + others
        return self._provider_order.copy()
