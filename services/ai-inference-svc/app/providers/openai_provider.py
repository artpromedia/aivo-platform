"""
OpenAI Provider Implementation.

Provides integration with OpenAI's API including GPT-5.2/5.3, GPT-4o,
and other OpenAI models with full support for streaming and tool use.
"""

import asyncio
from datetime import datetime
from typing import AsyncIterator, Dict, List, Any, Optional

import structlog

try:
    import openai
    from openai import AsyncOpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    AsyncOpenAI = None

from .base import BaseAIProvider
from .models import (
    AIRequest,
    AIResponse,
    FinishReason,
    Message,
    ProviderAPIError,
    ProviderAuthenticationError,
    ProviderConfig,
    ProviderHealth,
    ProviderRateLimitError,
    ProviderStatus,
    ProviderTimeoutError,
    StreamChunk,
    TokenUsage,
)

logger = structlog.get_logger(__name__)


class OpenAIProvider(BaseAIProvider):
    """
    OpenAI API provider implementation.

    Supports GPT-5.2, GPT-5.3, GPT-4o, and other OpenAI models
    with streaming, tool use, and automatic retry handling.
    """

    # Map OpenAI finish reasons to our enum
    FINISH_REASON_MAP = {
        "stop": FinishReason.STOP,
        "length": FinishReason.LENGTH,
        "tool_calls": FinishReason.TOOL_CALLS,
        "content_filter": FinishReason.CONTENT_FILTER,
        "function_call": FinishReason.TOOL_CALLS,
        # GPT-5.x new finish reasons
        "max_completion_tokens": FinishReason.LENGTH,
        "safety": FinishReason.CONTENT_FILTER,
    }

    def __init__(self, config: ProviderConfig):
        """
        Initialize OpenAI provider.

        Args:
            config: Provider configuration with API key and settings.

        Raises:
            ImportError: If openai package is not installed.
        """
        if not OPENAI_AVAILABLE:
            raise ImportError(
                "openai package not installed. Install with: pip install openai"
            )

        super().__init__(config)

        self.client = AsyncOpenAI(
            api_key=config.api_key,
            base_url=config.api_base,
            timeout=config.timeout_seconds,
        )

        logger.info(
            "openai_provider_initialized",
            provider_id=self.provider_id,
            default_model=config.default_model,
            api_base=config.api_base or "default",
        )

    async def complete(self, request: AIRequest) -> AIResponse:
        """
        Generate a completion using OpenAI API.

        Args:
            request: The AI request with messages and parameters.

        Returns:
            AIResponse with generated content.

        Raises:
            ProviderAPIError: When the API call fails.
            ProviderRateLimitError: When rate limited.
            ProviderTimeoutError: When request times out.
        """
        start_time = datetime.utcnow()
        model = self.get_model(request)

        try:
            messages = self._format_messages_for_openai(request)
            kwargs = self._build_request_kwargs(request, model, messages)

            response = await self.client.chat.completions.create(**kwargs)

            latency_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)

            # Extract content safely
            content = ""
            tool_calls = None
            if response.choices and response.choices[0].message:
                content = response.choices[0].message.content or ""
                if response.choices[0].message.tool_calls:
                    tool_calls = [
                        {
                            "id": tc.id,
                            "type": tc.type,
                            "function": {
                                "name": tc.function.name,
                                "arguments": tc.function.arguments,
                            },
                        }
                        for tc in response.choices[0].message.tool_calls
                    ]

            # Map finish reason
            finish_reason = self._map_finish_reason(
                response.choices[0].finish_reason if response.choices else None
            )

            # Extract usage
            usage = TokenUsage(
                prompt_tokens=response.usage.prompt_tokens if response.usage else 0,
                completion_tokens=response.usage.completion_tokens if response.usage else 0,
                total_tokens=response.usage.total_tokens if response.usage else 0,
            )

            self._record_success(latency_ms, usage.total_tokens)

            return AIResponse(
                request_id=request.request_id,
                provider_used=self.provider_id,
                model_used=response.model,
                content=content,
                finish_reason=finish_reason,
                usage=usage,
                latency_ms=latency_ms,
                tool_calls=tool_calls,
                metadata={
                    "openai_id": response.id,
                    "system_fingerprint": getattr(response, "system_fingerprint", None),
                },
            )

        except openai.RateLimitError as e:
            retry_after = self._extract_retry_after(e)
            self._record_rate_limit(retry_after)
            raise ProviderRateLimitError(self.provider_id, retry_after)

        except openai.AuthenticationError as e:
            self._record_failure(e, mark_unavailable=True)
            raise ProviderAuthenticationError(self.provider_id)

        except openai.APITimeoutError as e:
            self._record_failure(e)
            raise ProviderTimeoutError(self.provider_id, self.config.timeout_seconds)

        except openai.APIStatusError as e:
            self._record_failure(e)
            raise ProviderAPIError(
                self.provider_id, str(e), status_code=e.status_code
            )

        except openai.APIError as e:
            self._record_failure(e)
            raise ProviderAPIError(self.provider_id, str(e))

        except Exception as e:
            self._record_failure(e)
            raise ProviderAPIError(self.provider_id, f"Unexpected error: {str(e)}")

    async def stream(self, request: AIRequest) -> AsyncIterator[StreamChunk]:
        """
        Stream a completion using OpenAI API.

        Args:
            request: The AI request with messages and parameters.

        Yields:
            StreamChunk objects with partial content.

        Raises:
            ProviderAPIError: When the API call fails.
            ProviderRateLimitError: When rate limited.
        """
        start_time = datetime.utcnow()
        model = self.get_model(request)
        accumulated_content = ""

        try:
            messages = self._format_messages_for_openai(request)
            kwargs = self._build_request_kwargs(request, model, messages)
            kwargs["stream"] = True
            kwargs["stream_options"] = {"include_usage": True}

            stream = await self.client.chat.completions.create(**kwargs)

            async for chunk in stream:
                if not chunk.choices:
                    continue

                delta = chunk.choices[0].delta
                content = delta.content if delta else None

                if content:
                    accumulated_content += content
                    yield StreamChunk(
                        request_id=request.request_id,
                        provider_used=self.provider_id,
                        content=content,
                        is_final=False,
                    )

                # Check for final chunk
                if chunk.choices[0].finish_reason:
                    latency_ms = int(
                        (datetime.utcnow() - start_time).total_seconds() * 1000
                    )

                    usage = None
                    if chunk.usage:
                        usage = TokenUsage(
                            prompt_tokens=chunk.usage.prompt_tokens,
                            completion_tokens=chunk.usage.completion_tokens,
                            total_tokens=chunk.usage.total_tokens,
                        )
                        self._record_success(latency_ms, usage.total_tokens)
                    else:
                        self._record_success(latency_ms)

                    yield StreamChunk(
                        request_id=request.request_id,
                        provider_used=self.provider_id,
                        content="",
                        is_final=True,
                        finish_reason=self._map_finish_reason(
                            chunk.choices[0].finish_reason
                        ),
                        usage=usage,
                    )

        except openai.RateLimitError as e:
            retry_after = self._extract_retry_after(e)
            self._record_rate_limit(retry_after)
            raise ProviderRateLimitError(self.provider_id, retry_after)

        except openai.AuthenticationError:
            self._record_failure(e, mark_unavailable=True)
            raise ProviderAuthenticationError(self.provider_id)

        except openai.APIError as e:
            self._record_failure(e)
            raise ProviderAPIError(self.provider_id, str(e))

    async def health_check(self) -> ProviderHealth:
        """
        Check provider health with a minimal API call.

        Returns:
            Updated ProviderHealth with current status.
        """
        try:
            # Use models list as health check - lightweight API call
            await asyncio.wait_for(
                self.client.models.list(),
                timeout=10.0,
            )

            self.health.last_check = datetime.utcnow()

            if self.health.status == ProviderStatus.UNAVAILABLE:
                self.health.status = ProviderStatus.HEALTHY
                self.health.consecutive_failures = 0
                logger.info(
                    "provider_recovered",
                    provider_id=self.provider_id,
                )

            return self.health

        except Exception as e:
            self._record_failure(e, mark_unavailable=False)
            logger.warning(
                "provider_health_check_failed",
                provider_id=self.provider_id,
                error=str(e),
            )
            return self.health

    def _format_messages_for_openai(
        self, request: AIRequest
    ) -> List[Dict[str, Any]]:
        """
        Format messages for OpenAI API format.

        Args:
            request: The AI request.

        Returns:
            List of message dicts in OpenAI format.
        """
        messages = self._format_messages(request)
        return [{"role": m.role, "content": m.content} for m in messages]

    def _build_request_kwargs(
        self,
        request: AIRequest,
        model: str,
        messages: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Build kwargs for OpenAI API call.

        Args:
            request: The AI request.
            model: Model to use.
            messages: Formatted messages.

        Returns:
            Dict of kwargs for API call.
        """
        kwargs = {
            "model": model,
            "messages": messages,
            "max_tokens": request.max_tokens,
            "temperature": request.temperature,
        }

        if request.stop_sequences:
            kwargs["stop"] = request.stop_sequences

        if request.tools:
            kwargs["tools"] = [
                {
                    "type": "function",
                    "function": {
                        "name": tool.name,
                        "description": tool.description,
                        "parameters": tool.parameters,
                    },
                }
                for tool in request.tools
            ]

        return kwargs

    def _map_finish_reason(self, reason: Optional[str]) -> FinishReason:
        """Map OpenAI finish reason to our enum."""
        if not reason:
            return FinishReason.STOP
        return self.FINISH_REASON_MAP.get(reason, FinishReason.STOP)

    def _extract_retry_after(self, error: Exception) -> Optional[int]:
        """Extract retry-after seconds from rate limit error."""
        if hasattr(error, "response") and error.response:
            headers = getattr(error.response, "headers", {})
            retry_after = headers.get("retry-after")
            if retry_after:
                try:
                    return int(retry_after)
                except ValueError:
                    pass
        return None
