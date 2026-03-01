"""Tests for Google Gemini provider."""

from unittest.mock import AsyncMock, MagicMock, patch, PropertyMock
from datetime import datetime

import pytest

from app.providers.models import (
    AIRequest,
    FinishReason,
    Message,
    ProviderConfig,
    ProviderStatus,
    ProviderType,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def gemini_config() -> ProviderConfig:
    """Create a Gemini provider configuration."""
    return ProviderConfig(
        provider_id="gemini-test",
        provider_type=ProviderType.GEMINI,
        api_key="test-gemini-key",
        default_model="gemini-3.1-pro",
        available_models=["gemini-3.1-pro", "gemini-3.1-flash"],
        priority=1,
        max_retries=3,
        timeout_seconds=30,
    )


@pytest.fixture
def simple_request() -> AIRequest:
    """Create a simple test request."""
    return AIRequest(
        request_id="test-gemini-simple",
        messages=[Message(role="user", content="Hello")],
    )


@pytest.fixture
def request_with_system() -> AIRequest:
    """Create a request with a system prompt."""
    return AIRequest(
        request_id="test-gemini-system",
        messages=[
            Message(role="system", content="You are a helpful K-12 tutor."),
            Message(role="user", content="What is photosynthesis?"),
        ],
        max_tokens=500,
        temperature=0.5,
    )


def _make_mock_response(
    text: str = "Hello! How can I help?",
    finish_reason: str = "STOP",
    prompt_tokens: int = 10,
    completion_tokens: int = 20,
    blocked: bool = False,
):
    """Build a mock Gemini GenerateContentResponse."""
    # Usage metadata
    usage = MagicMock()
    usage.prompt_token_count = prompt_tokens
    usage.candidates_token_count = completion_tokens

    # Parts
    part = MagicMock()
    part.text = text
    part.function_call = None
    # Make hasattr checks work
    type(part).text = PropertyMock(return_value=text)

    # Candidate
    candidate = MagicMock()
    candidate.content.parts = [part]
    candidate.finish_reason = finish_reason

    # Prompt feedback
    prompt_feedback = MagicMock()
    if blocked:
        prompt_feedback.block_reason = "SAFETY"
    else:
        prompt_feedback.block_reason = None

    response = MagicMock()
    response.candidates = [candidate]
    response.usage_metadata = usage
    response.prompt_feedback = prompt_feedback

    return response


def _make_mock_stream_chunks(
    texts: list[str] | None = None,
):
    """Build a list of mock streaming chunks."""
    if texts is None:
        texts = ["Hello", " world", "!"]

    chunks = []
    for i, text in enumerate(texts):
        part = MagicMock()
        part.text = text
        type(part).text = PropertyMock(return_value=text)

        candidate = MagicMock()
        candidate.content.parts = [part]

        is_last = i == len(texts) - 1
        candidate.finish_reason = "STOP" if is_last else None

        chunk = MagicMock()
        chunk.candidates = [candidate]

        if is_last:
            usage = MagicMock()
            usage.prompt_token_count = 10
            usage.candidates_token_count = len("".join(texts))
            chunk.usage_metadata = usage
        else:
            chunk.usage_metadata = None

        chunks.append(chunk)

    return chunks


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestGeminiProviderInit:
    """Tests for GeminiProvider initialization."""

    @patch("app.providers.gemini_provider.GEMINI_AVAILABLE", True)
    @patch("app.providers.gemini_provider.genai")
    def test_init_configures_api_key(self, mock_genai, gemini_config):
        from app.providers.gemini_provider import GeminiProvider

        provider = GeminiProvider(gemini_config)

        mock_genai.configure.assert_called_once_with(api_key="test-gemini-key")
        assert provider.provider_id == "gemini-test"

    @patch("app.providers.gemini_provider.GEMINI_AVAILABLE", False)
    def test_init_raises_when_package_missing(self, gemini_config):
        from app.providers.gemini_provider import GeminiProvider

        with pytest.raises(ImportError, match="google-generativeai"):
            GeminiProvider(gemini_config)


class TestGeminiProviderComplete:
    """Tests for GeminiProvider.complete()."""

    @pytest.mark.asyncio
    @patch("app.providers.gemini_provider.GEMINI_AVAILABLE", True)
    @patch("app.providers.gemini_provider.genai")
    async def test_complete_returns_response(self, mock_genai, gemini_config, simple_request):
        from app.providers.gemini_provider import GeminiProvider

        mock_model_instance = MagicMock()
        mock_model_instance.generate_content.return_value = _make_mock_response()
        mock_genai.GenerativeModel.return_value = mock_model_instance

        provider = GeminiProvider(gemini_config)
        response = await provider.complete(simple_request)

        assert response.request_id == "test-gemini-simple"
        assert response.provider_used == "gemini-test"
        assert response.model_used == "gemini-3.1-pro"
        assert response.content == "Hello! How can I help?"
        assert response.finish_reason == FinishReason.STOP
        assert response.usage.prompt_tokens == 10
        assert response.usage.completion_tokens == 20
        assert response.usage.total_tokens == 30

    @pytest.mark.asyncio
    @patch("app.providers.gemini_provider.GEMINI_AVAILABLE", True)
    @patch("app.providers.gemini_provider.genai")
    async def test_complete_with_system_prompt(self, mock_genai, gemini_config, request_with_system):
        from app.providers.gemini_provider import GeminiProvider

        mock_model_instance = MagicMock()
        mock_model_instance.generate_content.return_value = _make_mock_response(
            text="Photosynthesis is the process..."
        )
        mock_genai.GenerativeModel.return_value = mock_model_instance

        provider = GeminiProvider(gemini_config)
        response = await provider.complete(request_with_system)

        assert response.content == "Photosynthesis is the process..."
        # Verify model was created with system_instruction
        mock_genai.GenerativeModel.assert_called_with(
            "gemini-3.1-pro",
            system_instruction="You are a helpful K-12 tutor.",
        )

    @pytest.mark.asyncio
    @patch("app.providers.gemini_provider.GEMINI_AVAILABLE", True)
    @patch("app.providers.gemini_provider.genai")
    async def test_complete_safety_filtered(self, mock_genai, gemini_config, simple_request):
        from app.providers.gemini_provider import GeminiProvider

        mock_model_instance = MagicMock()
        mock_model_instance.generate_content.return_value = _make_mock_response(
            blocked=True
        )
        mock_genai.GenerativeModel.return_value = mock_model_instance

        provider = GeminiProvider(gemini_config)
        response = await provider.complete(simple_request)

        assert response.finish_reason == FinishReason.CONTENT_FILTER
        assert response.content == ""
        assert response.metadata.get("safety_filtered") is True

    @pytest.mark.asyncio
    @patch("app.providers.gemini_provider.GEMINI_AVAILABLE", True)
    @patch("app.providers.gemini_provider.genai")
    async def test_complete_records_success_metrics(self, mock_genai, gemini_config, simple_request):
        from app.providers.gemini_provider import GeminiProvider

        mock_model_instance = MagicMock()
        mock_model_instance.generate_content.return_value = _make_mock_response()
        mock_genai.GenerativeModel.return_value = mock_model_instance

        provider = GeminiProvider(gemini_config)
        initial_requests = provider.health.total_requests

        await provider.complete(simple_request)

        assert provider.health.total_requests == initial_requests + 1
        assert provider.health.successful_requests >= 1

    @pytest.mark.asyncio
    @patch("app.providers.gemini_provider.GEMINI_AVAILABLE", True)
    @patch("app.providers.gemini_provider.genai")
    async def test_complete_rate_limit_error(self, mock_genai, gemini_config, simple_request):
        from app.providers.gemini_provider import GeminiProvider
        from app.providers.models import ProviderRateLimitError

        mock_model_instance = MagicMock()
        mock_model_instance.generate_content.side_effect = Exception("429 rate limit exceeded")
        mock_genai.GenerativeModel.return_value = mock_model_instance

        provider = GeminiProvider(gemini_config)

        with pytest.raises(ProviderRateLimitError):
            await provider.complete(simple_request)

    @pytest.mark.asyncio
    @patch("app.providers.gemini_provider.GEMINI_AVAILABLE", True)
    @patch("app.providers.gemini_provider.genai")
    async def test_complete_auth_error(self, mock_genai, gemini_config, simple_request):
        from app.providers.gemini_provider import GeminiProvider
        from app.providers.models import ProviderAuthenticationError

        mock_model_instance = MagicMock()
        mock_model_instance.generate_content.side_effect = Exception("403 invalid api key")
        mock_genai.GenerativeModel.return_value = mock_model_instance

        provider = GeminiProvider(gemini_config)

        with pytest.raises(ProviderAuthenticationError):
            await provider.complete(simple_request)

    @pytest.mark.asyncio
    @patch("app.providers.gemini_provider.GEMINI_AVAILABLE", True)
    @patch("app.providers.gemini_provider.genai")
    async def test_complete_generic_api_error(self, mock_genai, gemini_config, simple_request):
        from app.providers.gemini_provider import GeminiProvider
        from app.providers.models import ProviderAPIError

        mock_model_instance = MagicMock()
        mock_model_instance.generate_content.side_effect = Exception("Something went wrong")
        mock_genai.GenerativeModel.return_value = mock_model_instance

        provider = GeminiProvider(gemini_config)

        with pytest.raises(ProviderAPIError, match="Gemini API error"):
            await provider.complete(simple_request)


class TestGeminiProviderStream:
    """Tests for GeminiProvider.stream()."""

    @pytest.mark.asyncio
    @patch("app.providers.gemini_provider.GEMINI_AVAILABLE", True)
    @patch("app.providers.gemini_provider.genai")
    async def test_stream_yields_chunks(self, mock_genai, gemini_config, simple_request):
        from app.providers.gemini_provider import GeminiProvider

        mock_model_instance = MagicMock()
        mock_model_instance.generate_content.return_value = iter(
            _make_mock_stream_chunks()
        )
        mock_genai.GenerativeModel.return_value = mock_model_instance

        provider = GeminiProvider(gemini_config)

        chunks = []
        async for chunk in provider.stream(simple_request):
            chunks.append(chunk)

        assert len(chunks) >= 2
        # Last chunk should be final
        assert chunks[-1].is_final is True
        assert chunks[-1].usage is not None

    @pytest.mark.asyncio
    @patch("app.providers.gemini_provider.GEMINI_AVAILABLE", True)
    @patch("app.providers.gemini_provider.genai")
    async def test_stream_accumulates_content(self, mock_genai, gemini_config, simple_request):
        from app.providers.gemini_provider import GeminiProvider

        mock_model_instance = MagicMock()
        mock_model_instance.generate_content.return_value = iter(
            _make_mock_stream_chunks(["Hello", " world", "!"])
        )
        mock_genai.GenerativeModel.return_value = mock_model_instance

        provider = GeminiProvider(gemini_config)

        content = ""
        async for chunk in provider.stream(simple_request):
            content += chunk.content

        assert "Hello" in content
        assert "world" in content


class TestGeminiProviderHealthCheck:
    """Tests for GeminiProvider.health_check()."""

    @pytest.mark.asyncio
    @patch("app.providers.gemini_provider.GEMINI_AVAILABLE", True)
    @patch("app.providers.gemini_provider.genai")
    async def test_health_check_healthy(self, mock_genai, gemini_config):
        from app.providers.gemini_provider import GeminiProvider

        mock_genai.list_models.return_value = []

        provider = GeminiProvider(gemini_config)
        health = await provider.health_check()

        assert health.status == ProviderStatus.HEALTHY
        assert health.last_check is not None

    @pytest.mark.asyncio
    @patch("app.providers.gemini_provider.GEMINI_AVAILABLE", True)
    @patch("app.providers.gemini_provider.genai")
    async def test_health_check_failure(self, mock_genai, gemini_config):
        from app.providers.gemini_provider import GeminiProvider

        mock_genai.list_models.side_effect = Exception("API Error")

        provider = GeminiProvider(gemini_config)
        health = await provider.health_check()

        # Should still return health (just not recovered)
        assert health.last_check is not None

    @pytest.mark.asyncio
    @patch("app.providers.gemini_provider.GEMINI_AVAILABLE", True)
    @patch("app.providers.gemini_provider.genai")
    async def test_health_check_recovery(self, mock_genai, gemini_config):
        from app.providers.gemini_provider import GeminiProvider

        mock_genai.list_models.return_value = []

        provider = GeminiProvider(gemini_config)
        provider.health.status = ProviderStatus.UNAVAILABLE

        health = await provider.health_check()

        assert health.status == ProviderStatus.HEALTHY
        assert health.consecutive_failures == 0


class TestGeminiProviderMessageFormatting:
    """Tests for message formatting."""

    @patch("app.providers.gemini_provider.GEMINI_AVAILABLE", True)
    @patch("app.providers.gemini_provider.genai")
    def test_assistant_maps_to_model_role(self, mock_genai, gemini_config):
        from app.providers.gemini_provider import GeminiProvider

        provider = GeminiProvider(gemini_config)

        request = AIRequest(
            request_id="test",
            messages=[
                Message(role="user", content="Hi"),
                Message(role="assistant", content="Hello!"),
                Message(role="user", content="How are you?"),
            ],
        )

        system, contents = provider._format_messages_for_gemini(request)

        assert system == ""
        assert len(contents) == 3
        assert contents[0]["role"] == "user"
        assert contents[1]["role"] == "model"  # assistant → model
        assert contents[2]["role"] == "user"

    @patch("app.providers.gemini_provider.GEMINI_AVAILABLE", True)
    @patch("app.providers.gemini_provider.genai")
    def test_system_prompt_extracted(self, mock_genai, gemini_config):
        from app.providers.gemini_provider import GeminiProvider

        provider = GeminiProvider(gemini_config)

        request = AIRequest(
            request_id="test",
            messages=[
                Message(role="system", content="You are a tutor."),
                Message(role="user", content="Hello"),
            ],
        )

        system, contents = provider._format_messages_for_gemini(request)

        assert system == "You are a tutor."
        assert len(contents) == 1
        assert contents[0]["role"] == "user"


class TestGeminiProviderFinishReasons:
    """Tests for finish reason mapping."""

    @patch("app.providers.gemini_provider.GEMINI_AVAILABLE", True)
    @patch("app.providers.gemini_provider.genai")
    def test_finish_reason_mapping(self, mock_genai, gemini_config):
        from app.providers.gemini_provider import GeminiProvider

        provider = GeminiProvider(gemini_config)

        assert provider._map_finish_reason("STOP") == FinishReason.STOP
        assert provider._map_finish_reason("MAX_TOKENS") == FinishReason.LENGTH
        assert provider._map_finish_reason("SAFETY") == FinishReason.CONTENT_FILTER
        assert provider._map_finish_reason("RECITATION") == FinishReason.CONTENT_FILTER
        assert provider._map_finish_reason(None) == FinishReason.STOP
        assert provider._map_finish_reason("UNKNOWN") == FinishReason.STOP
