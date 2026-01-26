"""
Anthropic Provider Implementation.

Provides integration with Anthropic's Claude API including Claude 3 Opus,
Sonnet, and Haiku models with full support for streaming and tool use.
"""

import asyncio
from datetime import datetime
from typing import AsyncIterator, Dict, List, Any, Optional, Tuple

import structlog

try:
    import anthropic
    from anthropic import AsyncAnthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False
    AsyncAnthropic = None

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


class AnthropicProvider(BaseAIProvider):
    """
    Anthropic Claude API provider implementation.

    Supports Claude 3 Opus, Sonnet, Haiku and other Anthropic models
    with streaming, tool use, and automatic retry handling.
    """

    # Map Anthropic stop reasons to our enum
    FINISH_REASON_MAP = {
        "end_turn": FinishReason.STOP,
        "stop_sequence": FinishReason.STOP,
        "max_tokens": FinishReason.LENGTH,
        "tool_use": FinishReason.TOOL_CALLS,
    }

    def __init__(self, config: ProviderConfig):
        """
        Initialize Anthropic provider.

        Args:
            config: Provider configuration with API key and settings.

        Raises:
            ImportError: If anthropic package is not installed.
        """
        if not ANTHROPIC_AVAILABLE:
            raise ImportError(
                "anthropic package not installed. Install with: pip install anthropic"
            )

        super().__init__(config)

        self.client = AsyncAnthropic(
            api_key=config.api_key,
            timeout=config.timeout_seconds,
        )

        logger.info(
            "anthropic_provider_initialized",
            provider_id=self.provider_id,
            default_model=config.default_model,
        )

    async def complete(self, request: AIRequest) -> AIResponse:
        """
        Generate a completion using Anthropic API.

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
            system, messages = self._format_messages_for_anthropic(request)
            kwargs = self._build_request_kwargs(request, model, system, messages)

            response = await self.client.messages.create(**kwargs)

            latency_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)

            # Extract content from response
            content = ""
            tool_calls = None

            for block in response.content:
                if block.type == "text":
                    content += block.text
                elif block.type == "tool_use":
                    if tool_calls is None:
                        tool_calls = []
                    tool_calls.append({
                        "id": block.id,
                        "type": "tool_use",
                        "name": block.name,
                        "input": block.input,
                    })

            # Map finish reason
            finish_reason = self._map_finish_reason(response.stop_reason)

            # Extract usage
            usage = TokenUsage(
                prompt_tokens=response.usage.input_tokens,
                completion_tokens=response.usage.output_tokens,
                total_tokens=response.usage.input_tokens + response.usage.output_tokens,
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
                    "anthropic_id": response.id,
                    "stop_reason": response.stop_reason,
                },
            )

        except anthropic.RateLimitError as e:
            retry_after = self._extract_retry_after(e)
            self._record_rate_limit(retry_after)
            raise ProviderRateLimitError(self.provider_id, retry_after)

        except anthropic.AuthenticationError as e:
            self._record_failure(e, mark_unavailable=True)
            raise ProviderAuthenticationError(self.provider_id)

        except anthropic.APITimeoutError as e:
            self._record_failure(e)
            raise ProviderTimeoutError(self.provider_id, self.config.timeout_seconds)

        except anthropic.APIStatusError as e:
            self._record_failure(e)
            raise ProviderAPIError(
                self.provider_id, str(e), status_code=e.status_code
            )

        except anthropic.APIError as e:
            self._record_failure(e)
            raise ProviderAPIError(self.provider_id, str(e))

        except Exception as e:
            self._record_failure(e)
            raise ProviderAPIError(self.provider_id, f"Unexpected error: {str(e)}")

    async def stream(self, request: AIRequest) -> AsyncIterator[StreamChunk]:
        """
        Stream a completion using Anthropic API.

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
            system, messages = self._format_messages_for_anthropic(request)
            kwargs = self._build_request_kwargs(request, model, system, messages)

            async with self.client.messages.stream(**kwargs) as stream:
                async for event in stream:
                    if event.type == "content_block_delta":
                        if hasattr(event.delta, "text"):
                            content = event.delta.text
                            accumulated_content += content
                            yield StreamChunk(
                                request_id=request.request_id,
                                provider_used=self.provider_id,
                                content=content,
                                is_final=False,
                            )

                    elif event.type == "message_stop":
                        latency_ms = int(
                            (datetime.utcnow() - start_time).total_seconds() * 1000
                        )

                        # Get final message for usage
                        final_message = await stream.get_final_message()
                        usage = TokenUsage(
                            prompt_tokens=final_message.usage.input_tokens,
                            completion_tokens=final_message.usage.output_tokens,
                            total_tokens=(
                                final_message.usage.input_tokens
                                + final_message.usage.output_tokens
                            ),
                        )

                        self._record_success(latency_ms, usage.total_tokens)

                        yield StreamChunk(
                            request_id=request.request_id,
                            provider_used=self.provider_id,
                            content="",
                            is_final=True,
                            finish_reason=self._map_finish_reason(
                                final_message.stop_reason
                            ),
                            usage=usage,
                        )

        except anthropic.RateLimitError as e:
            retry_after = self._extract_retry_after(e)
            self._record_rate_limit(retry_after)
            raise ProviderRateLimitError(self.provider_id, retry_after)

        except anthropic.AuthenticationError as e:
            self._record_failure(e, mark_unavailable=True)
            raise ProviderAuthenticationError(self.provider_id)

        except anthropic.APIError as e:
            self._record_failure(e)
            raise ProviderAPIError(self.provider_id, str(e))

    async def health_check(self) -> ProviderHealth:
        """
        Check provider health with a minimal API call.

        Returns:
            Updated ProviderHealth with current status.
        """
        try:
            # Use a minimal message as health check
            # Anthropic doesn't have a models.list endpoint like OpenAI
            await asyncio.wait_for(
                self.client.messages.create(
                    model=self.config.default_model,
                    max_tokens=1,
                    messages=[{"role": "user", "content": "ping"}],
                ),
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

    def _format_messages_for_anthropic(
        self, request: AIRequest
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Format messages for Anthropic API format.

        Anthropic requires system prompt to be separate from messages,
        and only accepts user/assistant roles in messages.

        Args:
            request: The AI request.

        Returns:
            Tuple of (system_prompt, messages).
        """
        formatted_messages = self._format_messages(request)

        system_prompt = ""
        messages = []

        for msg in formatted_messages:
            if msg.role == "system":
                if system_prompt:
                    system_prompt += "\n\n"
                system_prompt += msg.content
            else:
                messages.append({"role": msg.role, "content": msg.content})

        # Anthropic requires at least one message and must start with user
        if not messages:
            messages.append({"role": "user", "content": "Hello"})
        elif messages[0]["role"] != "user":
            messages.insert(0, {"role": "user", "content": "..."})

        return system_prompt, messages

    def _build_request_kwargs(
        self,
        request: AIRequest,
        model: str,
        system: str,
        messages: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Build kwargs for Anthropic API call.

        Args:
            request: The AI request.
            model: Model to use.
            system: System prompt.
            messages: Formatted messages.

        Returns:
            Dict of kwargs for API call.
        """
        kwargs = {
            "model": model,
            "max_tokens": request.max_tokens,
            "messages": messages,
        }

        if system:
            kwargs["system"] = system

        if request.temperature is not None:
            kwargs["temperature"] = request.temperature

        if request.stop_sequences:
            kwargs["stop_sequences"] = request.stop_sequences

        if request.tools:
            kwargs["tools"] = [
                {
                    "name": tool.name,
                    "description": tool.description,
                    "input_schema": tool.parameters,
                }
                for tool in request.tools
            ]

        return kwargs

    def _map_finish_reason(self, reason: Optional[str]) -> FinishReason:
        """Map Anthropic stop reason to our enum."""
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
