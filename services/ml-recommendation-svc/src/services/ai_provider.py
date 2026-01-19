"""
AI Provider Service - Multi-provider AI integration with failover.

Supports:
- OpenAI GPT-4 (primary)
- Anthropic Claude (fallback)

Features:
- Automatic provider failover
- Retry logic with exponential backoff
- Token usage tracking
- Response validation
"""

import json
import logging
from typing import Optional

import structlog

from src.config import get_settings

logger = structlog.get_logger()
settings = get_settings()


class AIProvider:
    """
    AI service supporting multiple providers with automatic failover.

    Providers:
    - OpenAI GPT-4 (primary)
    - Anthropic Claude (fallback)
    """

    def __init__(self):
        """Initialize AI service with configured providers."""
        self.openai_api_key = getattr(settings, "openai_api_key", None)
        self.claude_api_key = getattr(settings, "claude_api_key", None)

        self.openai_model = getattr(
            settings, "openai_model", "gpt-4-turbo-preview"
        )
        self.claude_model = getattr(
            settings, "claude_model", "claude-3-5-sonnet-20241022"
        )

        # Initialize clients lazily
        self._openai_client = None
        self._claude_client = None

    def _get_openai_client(self):
        """Get or create OpenAI client."""
        if self._openai_client is None:
            try:
                from openai import AsyncOpenAI

                self._openai_client = AsyncOpenAI(api_key=self.openai_api_key)
            except ImportError:
                logger.error("OpenAI package not installed")
                raise
        return self._openai_client

    def _get_claude_client(self):
        """Get or create Claude client."""
        if self._claude_client is None:
            try:
                from anthropic import AsyncAnthropic

                self._claude_client = AsyncAnthropic(api_key=self.claude_api_key)
            except ImportError:
                logger.error("Anthropic package not installed")
                raise
        return self._claude_client

    async def complete_with_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        preferred_provider: Optional[str] = None,
    ) -> dict:
        """
        Get JSON completion from AI with provider fallback.

        Args:
            prompt: User prompt
            system_prompt: Optional system prompt
            temperature: Sampling temperature (0-2)
            max_tokens: Maximum tokens in response
            preferred_provider: Preferred provider ('openai' or 'claude')

        Returns:
            Parsed JSON response dict

        Raises:
            RuntimeError: If all providers fail
        """
        providers = self._get_provider_order(preferred_provider)

        last_error = None
        for provider in providers:
            try:
                logger.info("attempting_completion", provider=provider)

                if provider == "openai":
                    result = await self._complete_openai(
                        prompt, system_prompt, temperature, max_tokens
                    )
                elif provider == "claude":
                    result = await self._complete_claude(
                        prompt, system_prompt, temperature, max_tokens
                    )
                else:
                    continue

                logger.info("completion_successful", provider=provider)
                return result

            except Exception as e:
                logger.warning(
                    "completion_failed", provider=provider, error=str(e)
                )
                last_error = e
                continue

        raise RuntimeError(f"All AI providers failed. Last error: {last_error}")

    async def _complete_openai(
        self,
        prompt: str,
        system_prompt: Optional[str],
        temperature: float,
        max_tokens: int,
    ) -> dict:
        """Complete with OpenAI GPT-4."""
        client = self._get_openai_client()

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        response = await client.chat.completions.create(
            model=self.openai_model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            response_format={"type": "json_object"},
        )

        content = response.choices[0].message.content

        try:
            result = json.loads(content)
            result["_meta"] = {
                "provider": "openai",
                "model": self.openai_model,
                "tokens_used": response.usage.total_tokens,
            }
            return result
        except json.JSONDecodeError as e:
            logger.error("openai_json_parse_failed", content=content[:200])
            raise ValueError(f"Invalid JSON response: {e}")

    async def _complete_claude(
        self,
        prompt: str,
        system_prompt: Optional[str],
        temperature: float,
        max_tokens: int,
    ) -> dict:
        """Complete with Claude."""
        client = self._get_claude_client()

        json_instruction = (
            "\n\nPlease respond with valid JSON only, "
            "no additional text or explanation."
        )
        full_prompt = prompt + json_instruction

        response = await client.messages.create(
            model=self.claude_model,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system_prompt or "",
            messages=[{"role": "user", "content": full_prompt}],
        )

        content = response.content[0].text

        try:
            result = json.loads(content)
            result["_meta"] = {
                "provider": "claude",
                "model": self.claude_model,
                "tokens_used": response.usage.input_tokens
                + response.usage.output_tokens,
            }
            return result
        except json.JSONDecodeError as e:
            logger.error("claude_json_parse_failed", content=content[:200])
            raise ValueError(f"Invalid JSON response: {e}")

    def _get_provider_order(self, preferred: Optional[str] = None) -> list[str]:
        """
        Determine provider order based on preference and availability.

        Args:
            preferred: Preferred provider

        Returns:
            List of providers in order to try
        """
        available = []

        if self.openai_api_key:
            available.append("openai")
        if self.claude_api_key:
            available.append("claude")

        if not available:
            raise RuntimeError("No AI providers are configured")

        if preferred and preferred in available:
            available.remove(preferred)
            available.insert(0, preferred)

        return available


# Global AI provider instance
_ai_provider: Optional[AIProvider] = None


def get_ai_provider() -> AIProvider:
    """Get global AI provider instance."""
    global _ai_provider
    if _ai_provider is None:
        _ai_provider = AIProvider()
    return _ai_provider
