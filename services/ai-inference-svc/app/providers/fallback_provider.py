"""
Fallback Provider Implementation.

Provides a local fallback when all primary AI providers are unavailable.
Generates simple, rule-based responses to maintain basic functionality.
"""

import asyncio
import random
from datetime import datetime
from typing import AsyncIterator, Dict, List, Any, Optional

import structlog

from .base import BaseAIProvider
from .models import (
    AIRequest,
    AIResponse,
    FinishReason,
    Message,
    ProviderConfig,
    ProviderHealth,
    ProviderStatus,
    StreamChunk,
    TokenUsage,
)

logger = structlog.get_logger(__name__)


class FallbackProvider(BaseAIProvider):
    """
    Fallback provider for when all primary providers are unavailable.

    Provides rule-based responses to maintain basic system functionality
    during provider outages. Responses are limited but functional.
    """

    # Pre-defined responses for common scenarios
    FALLBACK_RESPONSES = {
        "greeting": [
            "Hello! I'm currently operating in limited mode. How can I help you?",
            "Hi there! My advanced features are temporarily limited, but I'll do my best to assist.",
            "Hello! Please note that I'm running with reduced capabilities at the moment.",
        ],
        "question": [
            "I understand you have a question. I'm currently operating with limited capabilities, "
            "so I may not be able to provide a complete answer. Please try again later or "
            "rephrase your question.",
            "Thank you for your question. Due to temporary limitations, I can only provide "
            "basic assistance right now. For a more detailed response, please try again shortly.",
        ],
        "task": [
            "I've received your request. Due to current system limitations, I can acknowledge "
            "your request but may not be able to complete complex tasks. Please try again later.",
            "I understand what you're asking. Unfortunately, my capabilities are limited right now. "
            "I've noted your request and suggest trying again when full service is restored.",
        ],
        "error": [
            "I apologize, but I'm experiencing technical difficulties. Please try again in a few moments.",
            "Something went wrong on my end. I'm operating in backup mode with limited functionality.",
        ],
        "default": [
            "I've received your message. I'm currently operating in limited mode with reduced "
            "capabilities. For the best experience, please try again shortly.",
            "Thank you for your message. I'm running with limited functionality at the moment "
            "but will do my best to help.",
        ],
    }

    def __init__(self, config: ProviderConfig):
        """
        Initialize fallback provider.

        Args:
            config: Provider configuration.
        """
        super().__init__(config)

        # Fallback is always available
        self.health.status = ProviderStatus.HEALTHY

        logger.info(
            "fallback_provider_initialized",
            provider_id=self.provider_id,
        )

    async def complete(self, request: AIRequest) -> AIResponse:
        """
        Generate a fallback completion.

        Args:
            request: The AI request.

        Returns:
            AIResponse with fallback content.
        """
        start_time = datetime.utcnow()

        # Simulate minimal latency
        await asyncio.sleep(0.1)

        # Determine response type based on message content
        response_type = self._classify_request(request)
        content = self._generate_response(response_type, request)

        latency_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)

        # Estimate token usage (rough approximation)
        prompt_tokens = sum(len(m.content.split()) for m in request.messages)
        completion_tokens = len(content.split())

        usage = TokenUsage(
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=prompt_tokens + completion_tokens,
        )

        self._record_success(latency_ms, usage.total_tokens)

        logger.info(
            "fallback_response_generated",
            request_id=request.request_id,
            response_type=response_type,
            content_length=len(content),
        )

        return AIResponse(
            request_id=request.request_id,
            provider_used=self.provider_id,
            model_used="fallback-v1",
            content=content,
            finish_reason=FinishReason.STOP,
            usage=usage,
            latency_ms=latency_ms,
            metadata={
                "is_fallback": True,
                "response_type": response_type,
            },
        )

    async def stream(self, request: AIRequest) -> AsyncIterator[StreamChunk]:
        """
        Stream a fallback completion.

        Simulates streaming by yielding content in chunks.

        Args:
            request: The AI request.

        Yields:
            StreamChunk objects with partial content.
        """
        start_time = datetime.utcnow()

        # Determine response
        response_type = self._classify_request(request)
        content = self._generate_response(response_type, request)

        # Split content into words for streaming effect
        words = content.split()
        chunk_size = 3  # Words per chunk

        prompt_tokens = sum(len(m.content.split()) for m in request.messages)
        completion_tokens = 0

        for i in range(0, len(words), chunk_size):
            chunk_words = words[i : i + chunk_size]
            chunk_content = " ".join(chunk_words)

            # Add space between chunks (except first)
            if i > 0:
                chunk_content = " " + chunk_content

            completion_tokens += len(chunk_words)

            yield StreamChunk(
                request_id=request.request_id,
                provider_used=self.provider_id,
                content=chunk_content,
                is_final=False,
            )

            # Simulate typing delay
            await asyncio.sleep(0.05)

        latency_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)

        usage = TokenUsage(
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=prompt_tokens + completion_tokens,
        )

        self._record_success(latency_ms, usage.total_tokens)

        yield StreamChunk(
            request_id=request.request_id,
            provider_used=self.provider_id,
            content="",
            is_final=True,
            finish_reason=FinishReason.STOP,
            usage=usage,
        )

    async def health_check(self) -> ProviderHealth:
        """
        Check provider health.

        Fallback provider is always healthy as it requires no external services.

        Returns:
            ProviderHealth indicating healthy status.
        """
        self.health.last_check = datetime.utcnow()
        self.health.status = ProviderStatus.HEALTHY
        return self.health

    async def is_available(self) -> bool:
        """
        Check if provider is available.

        Fallback is always available when enabled.

        Returns:
            True if enabled, False otherwise.
        """
        return self.config.is_enabled

    def _classify_request(self, request: AIRequest) -> str:
        """
        Classify the type of request to select appropriate response.

        Args:
            request: The AI request.

        Returns:
            Response type key.
        """
        if not request.messages:
            return "default"

        # Get the last user message
        last_user_msg = None
        for msg in reversed(request.messages):
            if msg.role == "user":
                last_user_msg = msg.content.lower()
                break

        if not last_user_msg:
            return "default"

        # Simple classification based on keywords
        greeting_keywords = ["hello", "hi", "hey", "greetings", "good morning", "good afternoon"]
        question_keywords = ["what", "why", "how", "when", "where", "who", "?", "explain", "describe"]
        task_keywords = ["please", "can you", "could you", "help me", "create", "make", "generate", "write"]

        if any(kw in last_user_msg for kw in greeting_keywords):
            return "greeting"
        elif any(kw in last_user_msg for kw in question_keywords):
            return "question"
        elif any(kw in last_user_msg for kw in task_keywords):
            return "task"

        return "default"

    def _generate_response(self, response_type: str, request: AIRequest) -> str:
        """
        Generate a response based on type and request context.

        Args:
            response_type: Type of response to generate.
            request: The original request for context.

        Returns:
            Generated response text.
        """
        responses = self.FALLBACK_RESPONSES.get(response_type, self.FALLBACK_RESPONSES["default"])
        base_response = random.choice(responses)

        # Add context if available
        context_note = ""
        if request.system_prompt:
            context_note = " I understand this is related to an educational context. "

        # Add metadata note if this was a retry
        metadata_note = ""
        if request.metadata.get("retry_count", 0) > 0:
            metadata_note = " I notice this request has been retried. I apologize for any inconvenience. "

        return f"{base_response}{context_note}{metadata_note}".strip()


class MockProvider(FallbackProvider):
    """
    Mock provider for testing purposes.

    Extends FallbackProvider with configurable responses for testing
    various scenarios including failures and delays.
    """

    def __init__(
        self,
        config: ProviderConfig,
        mock_responses: Optional[Dict[str, str]] = None,
        simulate_failure: bool = False,
        simulate_delay_ms: int = 0,
        simulate_rate_limit: bool = False,
    ):
        """
        Initialize mock provider.

        Args:
            config: Provider configuration.
            mock_responses: Dict mapping request_id to response content.
            simulate_failure: Whether to simulate API failures.
            simulate_delay_ms: Artificial delay in milliseconds.
            simulate_rate_limit: Whether to simulate rate limiting.
        """
        super().__init__(config)

        self.mock_responses = mock_responses or {}
        self.simulate_failure = simulate_failure
        self.simulate_delay_ms = simulate_delay_ms
        self.simulate_rate_limit = simulate_rate_limit
        self._request_count = 0

    async def complete(self, request: AIRequest) -> AIResponse:
        """
        Generate a mock completion.

        Args:
            request: The AI request.

        Returns:
            AIResponse with mock content.

        Raises:
            Various provider errors based on simulation settings.
        """
        from .models import ProviderAPIError, ProviderRateLimitError

        self._request_count += 1

        # Simulate delay
        if self.simulate_delay_ms > 0:
            await asyncio.sleep(self.simulate_delay_ms / 1000)

        # Simulate rate limit
        if self.simulate_rate_limit and self._request_count > 5:
            self._record_rate_limit(60)
            raise ProviderRateLimitError(self.provider_id, 60)

        # Simulate failure
        if self.simulate_failure:
            error = Exception("Simulated failure")
            self._record_failure(error)
            raise ProviderAPIError(self.provider_id, "Simulated API failure")

        # Check for pre-configured mock response
        if request.request_id in self.mock_responses:
            content = self.mock_responses[request.request_id]
        else:
            content = f"Mock response for request {request.request_id}"

        start_time = datetime.utcnow()
        latency_ms = self.simulate_delay_ms or 10

        usage = TokenUsage(
            prompt_tokens=10,
            completion_tokens=5,
            total_tokens=15,
        )

        self._record_success(latency_ms, usage.total_tokens)

        return AIResponse(
            request_id=request.request_id,
            provider_used=self.provider_id,
            model_used="mock-v1",
            content=content,
            finish_reason=FinishReason.STOP,
            usage=usage,
            latency_ms=latency_ms,
            metadata={"is_mock": True},
        )

    def reset(self) -> None:
        """Reset mock provider state."""
        self._request_count = 0
        self.simulate_failure = False
        self.simulate_rate_limit = False
        self.reset_health()
