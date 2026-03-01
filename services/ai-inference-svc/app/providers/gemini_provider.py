"""
Google Gemini Provider Implementation.

Provides integration with Google's Gemini API including Gemini 3.1 Pro
and Flash models with full support for streaming, tool use, and K-12 safety settings.
"""

import asyncio
from datetime import datetime
from typing import AsyncIterator, Dict, List, Any, Optional

import structlog

try:
    import google.generativeai as genai
    from google.generativeai.types import HarmCategory, HarmBlockThreshold

    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    genai = None  # type: ignore
    HarmCategory = None  # type: ignore
    HarmBlockThreshold = None  # type: ignore

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


class GeminiProvider(BaseAIProvider):
    """
    Google Gemini API provider with K-12 safety settings.

    Supports Gemini 3.1 Pro (1M context), Gemini 3.1 Flash, and other
    Gemini models with streaming, tool use, and strict content safety
    filtering appropriate for K-12 educational environments.
    """

    # Map Gemini finish reasons to our enum
    FINISH_REASON_MAP = {
        "STOP": FinishReason.STOP,
        "MAX_TOKENS": FinishReason.LENGTH,
        "SAFETY": FinishReason.CONTENT_FILTER,
        "RECITATION": FinishReason.CONTENT_FILTER,
        "OTHER": FinishReason.STOP,
    }

    def __init__(self, config: ProviderConfig):
        """
        Initialize Gemini provider.

        Args:
            config: Provider configuration with API key and settings.

        Raises:
            ImportError: If google-generativeai package is not installed.
        """
        if not GEMINI_AVAILABLE:
            raise ImportError(
                "google-generativeai package not installed. "
                "Install with: pip install google-generativeai"
            )

        super().__init__(config)

        genai.configure(api_key=config.api_key)
        self._api_key = config.api_key

        logger.info(
            "gemini_provider_initialized",
            provider_id=self.provider_id,
            default_model=config.default_model,
        )

    def _get_safety_settings(self) -> List[Dict[str, Any]]:
        """
        Get K-12 appropriate safety settings.

        All harm categories are set to BLOCK_LOW_AND_ABOVE for maximum
        safety in educational environments.

        Returns:
            List of safety setting dicts for Gemini API.
        """
        return [
            {
                "category": HarmCategory.HARM_CATEGORY_HARASSMENT,
                "threshold": HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
            },
            {
                "category": HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                "threshold": HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
            },
            {
                "category": HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                "threshold": HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
            },
            {
                "category": HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                "threshold": HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
            },
        ]

    def _get_model(self, model_name: str) -> Any:
        """
        Create a GenerativeModel instance.

        Args:
            model_name: Name of the Gemini model.

        Returns:
            Configured GenerativeModel instance.
        """
        return genai.GenerativeModel(model_name)

    async def complete(self, request: AIRequest) -> AIResponse:
        """
        Generate a completion using Google Gemini API.

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
        model_name = self.get_model(request)

        try:
            system_instruction, contents = self._format_messages_for_gemini(request)

            model = genai.GenerativeModel(
                model_name,
                system_instruction=system_instruction or None,
            )

            generation_config = self._build_generation_config(request)

            response = await asyncio.to_thread(
                model.generate_content,
                contents,
                generation_config=generation_config,
                safety_settings=self._get_safety_settings(),
            )

            latency_ms = int(
                (datetime.utcnow() - start_time).total_seconds() * 1000
            )

            # Check for content filter block
            if hasattr(response, "prompt_feedback") and response.prompt_feedback:
                block_reason = getattr(
                    response.prompt_feedback, "block_reason", None
                )
                if block_reason and str(block_reason) != "0":
                    self._record_success(latency_ms, 0)
                    return AIResponse(
                        request_id=request.request_id,
                        provider_used=self.provider_id,
                        model_used=model_name,
                        content="",
                        finish_reason=FinishReason.CONTENT_FILTER,
                        usage=TokenUsage(),
                        latency_ms=latency_ms,
                        metadata={
                            "block_reason": str(block_reason),
                            "safety_filtered": True,
                        },
                    )

            # Extract content
            content = ""
            tool_calls = None

            if response.candidates:
                candidate = response.candidates[0]
                for part in candidate.content.parts:
                    if hasattr(part, "text") and part.text:
                        content += part.text
                    elif hasattr(part, "function_call"):
                        if tool_calls is None:
                            tool_calls = []
                        fc = part.function_call
                        tool_calls.append(
                            {
                                "name": fc.name,
                                "args": dict(fc.args) if fc.args else {},
                            }
                        )

            # Map finish reason
            finish_reason = FinishReason.STOP
            if response.candidates:
                raw_reason = str(
                    getattr(response.candidates[0], "finish_reason", "STOP")
                )
                finish_reason = self._map_finish_reason(raw_reason)

            # Extract usage
            usage = TokenUsage()
            if hasattr(response, "usage_metadata") and response.usage_metadata:
                um = response.usage_metadata
                prompt_tokens = getattr(um, "prompt_token_count", 0) or 0
                completion_tokens = (
                    getattr(um, "candidates_token_count", 0) or 0
                )
                usage = TokenUsage(
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens,
                    total_tokens=prompt_tokens + completion_tokens,
                )

            self._record_success(latency_ms, usage.total_tokens)

            return AIResponse(
                request_id=request.request_id,
                provider_used=self.provider_id,
                model_used=model_name,
                content=content,
                finish_reason=finish_reason,
                usage=usage,
                latency_ms=latency_ms,
                tool_calls=tool_calls,
                metadata={
                    "safety_settings": "k12_strict",
                },
            )

        except Exception as e:
            error_str = str(e).lower()

            if "429" in error_str or "rate limit" in error_str:
                retry_after = self._extract_retry_after_from_error(error_str)
                self._record_rate_limit(retry_after)
                raise ProviderRateLimitError(self.provider_id, retry_after)

            if (
                "401" in error_str
                or "403" in error_str
                or "invalid api key" in error_str
                or "authentication" in error_str
            ):
                self._record_failure(e, mark_unavailable=True)
                raise ProviderAuthenticationError(self.provider_id)

            if "timeout" in error_str or "deadline" in error_str:
                self._record_failure(e)
                raise ProviderTimeoutError(
                    self.provider_id, self.config.timeout_seconds
                )

            self._record_failure(e)
            raise ProviderAPIError(
                self.provider_id, f"Gemini API error: {str(e)}"
            )

    async def stream(self, request: AIRequest) -> AsyncIterator[StreamChunk]:
        """
        Stream a completion using Google Gemini API.

        Args:
            request: The AI request with messages and parameters.

        Yields:
            StreamChunk objects with partial content.

        Raises:
            ProviderAPIError: When the API call fails.
            ProviderRateLimitError: When rate limited.
        """
        start_time = datetime.utcnow()
        model_name = self.get_model(request)

        try:
            system_instruction, contents = self._format_messages_for_gemini(request)

            model = genai.GenerativeModel(
                model_name,
                system_instruction=system_instruction or None,
            )

            generation_config = self._build_generation_config(request)

            response = await asyncio.to_thread(
                model.generate_content,
                contents,
                generation_config=generation_config,
                safety_settings=self._get_safety_settings(),
                stream=True,
            )

            for chunk in response:
                if not chunk.candidates:
                    continue

                candidate = chunk.candidates[0]
                content = ""
                for part in candidate.content.parts:
                    if hasattr(part, "text") and part.text:
                        content += part.text

                if content:
                    yield StreamChunk(
                        request_id=request.request_id,
                        provider_used=self.provider_id,
                        content=content,
                        is_final=False,
                    )

                # Check for final chunk
                if hasattr(candidate, "finish_reason") and candidate.finish_reason:
                    raw_reason = str(candidate.finish_reason)
                    if raw_reason != "0":
                        latency_ms = int(
                            (datetime.utcnow() - start_time).total_seconds()
                            * 1000
                        )

                        usage = TokenUsage()
                        if (
                            hasattr(chunk, "usage_metadata")
                            and chunk.usage_metadata
                        ):
                            um = chunk.usage_metadata
                            prompt_tokens = (
                                getattr(um, "prompt_token_count", 0) or 0
                            )
                            completion_tokens = (
                                getattr(um, "candidates_token_count", 0) or 0
                            )
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
                            finish_reason=self._map_finish_reason(raw_reason),
                            usage=usage,
                        )

        except Exception as e:
            error_str = str(e).lower()

            if "429" in error_str or "rate limit" in error_str:
                retry_after = self._extract_retry_after_from_error(error_str)
                self._record_rate_limit(retry_after)
                raise ProviderRateLimitError(self.provider_id, retry_after)

            if "401" in error_str or "403" in error_str:
                self._record_failure(e, mark_unavailable=True)
                raise ProviderAuthenticationError(self.provider_id)

            self._record_failure(e)
            raise ProviderAPIError(
                self.provider_id, f"Gemini streaming error: {str(e)}"
            )

    async def health_check(self) -> ProviderHealth:
        """
        Check provider health with a minimal API call.

        Uses model listing as a lightweight health check.

        Returns:
            Updated ProviderHealth with current status.
        """
        try:
            await asyncio.wait_for(
                asyncio.to_thread(genai.list_models),
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

    def _format_messages_for_gemini(
        self, request: AIRequest
    ) -> tuple[str, List[Dict[str, Any]]]:
        """
        Format messages for Gemini API format.

        Gemini uses a separate system_instruction parameter and expects
        role 'model' instead of 'assistant'. System messages are extracted
        and combined into the system_instruction.

        Args:
            request: The AI request.

        Returns:
            Tuple of (system_instruction, contents).
        """
        formatted_messages = self._format_messages(request)

        system_instruction = ""
        contents = []

        for msg in formatted_messages:
            if msg.role == "system":
                if system_instruction:
                    system_instruction += "\n\n"
                system_instruction += msg.content
            else:
                # Gemini uses 'model' instead of 'assistant'
                role = "model" if msg.role == "assistant" else "user"
                contents.append({"role": role, "parts": [msg.content]})

        # Gemini requires at least one message
        if not contents:
            contents.append({"role": "user", "parts": ["Hello"]})

        # Gemini requires alternating user/model turns — ensure we start with user
        if contents[0]["role"] != "user":
            contents.insert(0, {"role": "user", "parts": ["..."]})

        return system_instruction, contents

    def _build_generation_config(self, request: AIRequest) -> Dict[str, Any]:
        """
        Build generation configuration for Gemini API.

        Args:
            request: The AI request.

        Returns:
            Dict of generation config parameters.
        """
        config: Dict[str, Any] = {
            "max_output_tokens": request.max_tokens,
            "temperature": request.temperature,
        }

        if request.stop_sequences:
            config["stop_sequences"] = request.stop_sequences

        return config

    def _map_finish_reason(self, reason: Optional[str]) -> FinishReason:
        """Map Gemini finish reason to our enum."""
        if not reason:
            return FinishReason.STOP
        return self.FINISH_REASON_MAP.get(reason, FinishReason.STOP)

    def _extract_retry_after_from_error(
        self, error_str: str
    ) -> Optional[int]:
        """Extract retry-after seconds from error string if possible."""
        # Gemini doesn't always provide retry-after in a structured way
        # Default to 60 seconds for rate limits
        return 60
