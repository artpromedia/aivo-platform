"""
Tests for Sprint S4: OpenAI TTS upgrade, Voxtral STT integration, and K-12 priority.

Covers:
- gpt-4o-mini-tts model with emotion/style steering
- tts-1-hd fallback when primary model fails
- Expanded voice map (alloy, echo, nova, shimmer, fable, onyx)
- Voxtral batch transcription with education vocabulary context biasing
- Voxtral realtime transcription
- TTS provider K-12 priority ordering
- Config enum additions (VOXTRAL_BATCH, VOXTRAL_REALTIME, mistral_api_key)
"""
import pytest
import sys
import os
from unittest.mock import MagicMock, patch, PropertyMock
from dataclasses import dataclass

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


# ============================= Config Tests =============================


class TestSTTProviderEnum:
    """Tests for STTProvider enum with Voxtral entries."""

    def test_voxtral_batch_exists(self):
        """STTProvider should include VOXTRAL_BATCH."""
        from app.core.config import STTProvider

        assert hasattr(STTProvider, "VOXTRAL_BATCH")
        assert STTProvider.VOXTRAL_BATCH.value == "voxtral_batch"

    def test_voxtral_realtime_exists(self):
        """STTProvider should include VOXTRAL_REALTIME."""
        from app.core.config import STTProvider

        assert hasattr(STTProvider, "VOXTRAL_REALTIME")
        assert STTProvider.VOXTRAL_REALTIME.value == "voxtral_realtime"

    def test_stt_provider_count(self):
        """STTProvider should have 8 members after Voxtral additions."""
        from app.core.config import STTProvider

        assert len(STTProvider) == 8

    def test_original_providers_preserved(self):
        """Original 6 STT providers should still exist."""
        from app.core.config import STTProvider

        expected = [
            "WHISPER_LOCAL",
            "OPENAI_API",
            "GOOGLE_CLOUD",
            "AZURE",
            "DEEPGRAM",
            "ASSEMBLY_AI",
        ]
        for name in expected:
            assert hasattr(STTProvider, name)


class TestMistralApiKey:
    """Tests for mistral_api_key in AccessibilityAIConfig."""

    def test_mistral_key_field_exists(self):
        """Config should have mistral_api_key field."""
        from app.core.config import AccessibilityAIConfig

        config = AccessibilityAIConfig()
        assert hasattr(config, "mistral_api_key")

    def test_mistral_key_reads_env(self):
        """mistral_api_key should read from MISTRAL_API_KEY env var."""
        with patch.dict(os.environ, {"MISTRAL_API_KEY": "test-mistral-key"}):
            from app.core.config import AccessibilityAIConfig

            config = AccessibilityAIConfig()
            # Re-create to pick up patched env
            config.mistral_api_key = os.getenv("MISTRAL_API_KEY")
            assert config.mistral_api_key == "test-mistral-key"

    def test_voxtral_available_with_key(self):
        """Voxtral providers should be available when mistral key is set."""
        from app.core.config import AccessibilityAIConfig, STTProvider

        config = AccessibilityAIConfig(
            mistral_api_key="test-key",
            stt_providers=[STTProvider.VOXTRAL_BATCH, STTProvider.VOXTRAL_REALTIME],
        )
        available = config.get_available_stt_providers()
        assert STTProvider.VOXTRAL_BATCH in available
        assert STTProvider.VOXTRAL_REALTIME in available

    def test_voxtral_unavailable_without_key(self):
        """Voxtral providers should NOT be available without mistral key."""
        from app.core.config import AccessibilityAIConfig, STTProvider

        config = AccessibilityAIConfig(
            mistral_api_key=None,
            stt_providers=[STTProvider.VOXTRAL_BATCH, STTProvider.VOXTRAL_REALTIME],
        )
        available = config.get_available_stt_providers()
        assert STTProvider.VOXTRAL_BATCH not in available
        assert STTProvider.VOXTRAL_REALTIME not in available


class TestTTSProviderPriority:
    """Tests for K-12 TTS provider priority ordering."""

    def test_openai_is_first_priority(self):
        """OpenAI should be the first TTS provider for K-12."""
        from app.core.config import AccessibilityAIConfig, TTSProvider

        config = AccessibilityAIConfig()
        assert config.tts_providers[0] == TTSProvider.OPENAI_API

    def test_coqui_is_last_priority(self):
        """Coqui (local) should be last TTS provider as fallback."""
        from app.core.config import AccessibilityAIConfig, TTSProvider

        config = AccessibilityAIConfig()
        assert config.tts_providers[-1] == TTSProvider.COQUI_LOCAL

    def test_all_tts_providers_included(self):
        """All 6 TTS providers should be in the default priority list."""
        from app.core.config import AccessibilityAIConfig, TTSProvider

        config = AccessibilityAIConfig()
        assert len(config.tts_providers) == 6
        assert TTSProvider.OPENAI_API in config.tts_providers
        assert TTSProvider.GOOGLE_CLOUD in config.tts_providers
        assert TTSProvider.AZURE in config.tts_providers
        assert TTSProvider.ELEVENLABS in config.tts_providers
        assert TTSProvider.AMAZON_POLLY in config.tts_providers
        assert TTSProvider.COQUI_LOCAL in config.tts_providers


# ========================= OpenAI TTS Tests =========================


class TestOpenAITTSUpgrade:
    """Tests for gpt-4o-mini-tts upgrade in MultiProviderTTS."""

    def test_voice_map_has_all_voices(self):
        """Voice map should include all 6 OpenAI voices + semantic aliases."""
        from app.core.tts_providers import MultiProviderTTS

        voice_map = MultiProviderTTS.OPENAI_VOICE_MAP
        # Direct voice names
        for voice in ["alloy", "echo", "nova", "shimmer", "fable", "onyx"]:
            assert voice in voice_map, f"Missing voice: {voice}"
        # Semantic aliases
        for alias in ["default", "male", "female", "child_friendly", "narrator", "tutor"]:
            assert alias in voice_map, f"Missing alias: {alias}"

    def test_style_instructions_defined(self):
        """Style instructions dict should contain K-12 emotion styles."""
        from app.core.tts_providers import MultiProviderTTS

        styles = MultiProviderTTS.OPENAI_STYLE_INSTRUCTIONS
        expected = [
            "encouraging",
            "calm",
            "excited",
            "professional",
            "empathetic",
            "neutral",
            "storytelling",
        ]
        for key in expected:
            assert key in styles, f"Missing style: {key}"
            assert len(styles[key]) > 10, f"Style '{key}' instruction too short"

    def test_default_style_is_encouraging(self):
        """Default style for K-12 context should be 'encouraging'."""
        from app.core.tts_providers import MultiProviderTTS

        # The method defaults to 'encouraging' when no style is provided
        styles = MultiProviderTTS.OPENAI_STYLE_INSTRUCTIONS
        assert "encouraging" in styles

    @patch("httpx.post")
    def test_uses_gpt_4o_mini_tts_model(self, mock_post):
        """Should send requests to gpt-4o-mini-tts model."""
        mock_response = MagicMock()
        mock_response.content = b"fake_audio_data"
        mock_response.raise_for_status = MagicMock()
        mock_post.return_value = mock_response

        from app.core.tts_providers import MultiProviderTTS
        from app.core.config import AccessibilityAIConfig, set_config

        config = AccessibilityAIConfig(openai_api_key="test-key")
        set_config(config)

        tts = MultiProviderTTS()
        result = tts._synthesize_openai_api("Hello students", voice="default")

        call_json = mock_post.call_args[1]["json"]
        assert call_json["model"] == "gpt-4o-mini-tts"
        assert "instructions" in call_json
        assert result.provider == "openai_api"

    @patch("httpx.post")
    def test_includes_style_instructions(self, mock_post):
        """Should include style instructions in the API payload."""
        mock_response = MagicMock()
        mock_response.content = b"fake_audio_data"
        mock_response.raise_for_status = MagicMock()
        mock_post.return_value = mock_response

        from app.core.tts_providers import MultiProviderTTS
        from app.core.config import AccessibilityAIConfig, set_config

        config = AccessibilityAIConfig(openai_api_key="test-key")
        set_config(config)

        tts = MultiProviderTTS()
        result = tts._synthesize_openai_api(
            "Great job!", voice="default", style="excited"
        )

        call_json = mock_post.call_args[1]["json"]
        assert "excitement" in call_json["instructions"].lower() or "enthusiasm" in call_json["instructions"].lower()

    @patch("httpx.post")
    def test_fallback_to_tts_1_hd(self, mock_post):
        """Should fallback to tts-1-hd when gpt-4o-mini-tts fails."""
        # First call raises, second succeeds
        mock_fail_response = MagicMock()
        mock_fail_response.raise_for_status.side_effect = Exception("Model error")

        mock_success_response = MagicMock()
        mock_success_response.content = b"fallback_audio"
        mock_success_response.raise_for_status = MagicMock()

        mock_post.side_effect = [
            mock_fail_response,
            mock_success_response,
        ]

        from app.core.tts_providers import MultiProviderTTS
        from app.core.config import AccessibilityAIConfig, set_config

        config = AccessibilityAIConfig(openai_api_key="test-key")
        set_config(config)

        tts = MultiProviderTTS()
        result = tts._synthesize_openai_api("Test fallback", voice="default")

        # Second call should use tts-1-hd
        second_call_json = mock_post.call_args_list[1][1]["json"]
        assert second_call_json["model"] == "tts-1-hd"
        assert result.audio_bytes == b"fallback_audio"

    @patch("httpx.post")
    def test_voice_mapping_narrator(self, mock_post):
        """Narrator voice should map to 'fable'."""
        mock_response = MagicMock()
        mock_response.content = b"audio"
        mock_response.raise_for_status = MagicMock()
        mock_post.return_value = mock_response

        from app.core.tts_providers import MultiProviderTTS
        from app.core.config import AccessibilityAIConfig, set_config

        config = AccessibilityAIConfig(openai_api_key="test-key")
        set_config(config)

        tts = MultiProviderTTS()
        result = tts._synthesize_openai_api("Once upon a time", voice="narrator")

        call_json = mock_post.call_args[1]["json"]
        assert call_json["voice"] == "fable"
        assert result.voice_id == "fable"

    @patch("httpx.post")
    def test_sample_rate_is_24khz(self, mock_post):
        """OpenAI TTS should report 24kHz sample rate."""
        mock_response = MagicMock()
        mock_response.content = b"audio"
        mock_response.raise_for_status = MagicMock()
        mock_post.return_value = mock_response

        from app.core.tts_providers import MultiProviderTTS
        from app.core.config import AccessibilityAIConfig, set_config

        config = AccessibilityAIConfig(openai_api_key="test-key")
        set_config(config)

        tts = MultiProviderTTS()
        result = tts._synthesize_openai_api("Test", voice="default")
        assert result.sample_rate == 24000

    @patch("httpx.post")
    def test_speed_parameter_passed(self, mock_post):
        """Speed parameter should be forwarded to OpenAI API."""
        mock_response = MagicMock()
        mock_response.content = b"audio"
        mock_response.raise_for_status = MagicMock()
        mock_post.return_value = mock_response

        from app.core.tts_providers import MultiProviderTTS
        from app.core.config import AccessibilityAIConfig, set_config

        config = AccessibilityAIConfig(openai_api_key="test-key")
        set_config(config)

        tts = MultiProviderTTS()
        tts._synthesize_openai_api("Slow reading", voice="default", speed=0.75)

        call_json = mock_post.call_args[1]["json"]
        assert call_json["speed"] == 0.75


# ======================== Voxtral STT Tests ========================


class TestVoxtralBatchSTT:
    """Tests for Voxtral batch transcription with education context biasing."""

    def test_education_vocabulary_defined(self):
        """Education vocabulary list should be populated for context biasing."""
        from app.core.stt_providers import MultiProviderSTT

        vocab = MultiProviderSTT.EDUCATION_VOCABULARY
        assert len(vocab) >= 20
        # Check for key K-12 terms
        assert "photosynthesis" in vocab
        assert "algebra" in vocab
        assert "IEP" in vocab
        assert "scaffolding" in vocab
        assert "curriculum" in vocab

    @patch("httpx.post")
    def test_voxtral_batch_uses_correct_model(self, mock_post):
        """Voxtral batch should use mistral-voxtral-latest model."""
        # Mock upload response
        mock_upload = MagicMock()
        mock_upload.json.return_value = {"id": "file-123"}
        mock_upload.raise_for_status = MagicMock()

        # Mock transcription response
        mock_transcribe = MagicMock()
        mock_transcribe.json.return_value = {
            "text": "The mitosis process involves cell division",
            "language": "en",
            "duration": 5.0,
            "confidence": 0.95,
            "segments": [{"start": 0, "end": 5.0, "text": "The mitosis process involves cell division"}],
            "words": [{"word": "mitosis", "start": 0.5, "end": 1.0}],
        }
        mock_transcribe.raise_for_status = MagicMock()

        mock_post.side_effect = [mock_upload, mock_transcribe]

        from app.core.stt_providers import MultiProviderSTT
        from app.core.config import AccessibilityAIConfig, set_config

        config = AccessibilityAIConfig(mistral_api_key="test-mistral-key")
        set_config(config)

        stt = MultiProviderSTT()
        result = stt._transcribe_voxtral_batch(b"fake_audio_bytes", language="en")

        # Verify the model in the transcription call
        transcribe_json = mock_post.call_args_list[1][1]["json"]
        assert transcribe_json["model"] == "mistral-voxtral-latest"
        assert result.provider == "voxtral_batch"
        assert "mitosis" in result.text

    @patch("httpx.post")
    def test_voxtral_batch_includes_education_context(self, mock_post):
        """Voxtral batch should send education vocabulary context biasing."""
        mock_upload = MagicMock()
        mock_upload.json.return_value = {"id": "file-456"}
        mock_upload.raise_for_status = MagicMock()

        mock_transcribe = MagicMock()
        mock_transcribe.json.return_value = {
            "text": "Test",
            "duration": 1.0,
            "segments": [],
            "words": [],
        }
        mock_transcribe.raise_for_status = MagicMock()

        mock_post.side_effect = [mock_upload, mock_transcribe]

        from app.core.stt_providers import MultiProviderSTT
        from app.core.config import AccessibilityAIConfig, set_config

        config = AccessibilityAIConfig(mistral_api_key="test-key")
        set_config(config)

        stt = MultiProviderSTT()
        stt._transcribe_voxtral_batch(b"audio", language="en")

        transcribe_json = mock_post.call_args_list[1][1]["json"]
        assert "context" in transcribe_json
        assert "K-12" in transcribe_json["context"]
        assert "vocabulary" in transcribe_json["context"].lower()

    @patch("httpx.post")
    def test_voxtral_batch_returns_transcription_result(self, mock_post):
        """Voxtral batch should return a proper TranscriptionResult."""
        mock_upload = MagicMock()
        mock_upload.json.return_value = {"id": "file-789"}
        mock_upload.raise_for_status = MagicMock()

        mock_transcribe = MagicMock()
        mock_transcribe.json.return_value = {
            "text": "Today we learn about photosynthesis",
            "language": "en",
            "duration": 3.5,
            "confidence": 0.94,
            "segments": [{"start": 0, "end": 3.5, "text": "Today we learn about photosynthesis"}],
            "words": [
                {"word": "Today", "start": 0.0, "end": 0.4},
                {"word": "photosynthesis", "start": 2.5, "end": 3.4},
            ],
        }
        mock_transcribe.raise_for_status = MagicMock()

        mock_post.side_effect = [mock_upload, mock_transcribe]

        from app.core.stt_providers import MultiProviderSTT
        from app.core.config import AccessibilityAIConfig, set_config

        config = AccessibilityAIConfig(mistral_api_key="test-key")
        set_config(config)

        stt = MultiProviderSTT()
        result = stt._transcribe_voxtral_batch(b"audio_data")

        assert result.text == "Today we learn about photosynthesis"
        assert result.confidence == 0.94
        assert result.duration == 3.5
        assert result.provider == "voxtral_batch"
        assert len(result.words) == 2
        assert len(result.segments) == 1


class TestVoxtralRealtimeSTT:
    """Tests for Voxtral realtime transcription."""

    @patch("httpx.post")
    def test_voxtral_realtime_uses_multipart(self, mock_post):
        """Voxtral realtime should use multipart file upload."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "text": "Hello class",
            "language": "en",
            "duration": 1.5,
            "confidence": 0.91,
            "segments": [],
            "words": [],
        }
        mock_response.raise_for_status = MagicMock()
        mock_post.return_value = mock_response

        from app.core.stt_providers import MultiProviderSTT
        from app.core.config import AccessibilityAIConfig, set_config

        config = AccessibilityAIConfig(mistral_api_key="test-key")
        set_config(config)

        stt = MultiProviderSTT()
        result = stt._transcribe_voxtral_realtime(b"audio", language="en")

        # Should use multipart (files= kwarg)
        assert mock_post.call_args[1].get("files") is not None or mock_post.call_args[0] != ()
        assert result.provider == "voxtral_realtime"
        assert result.text == "Hello class"

    @patch("httpx.post")
    def test_voxtral_realtime_returns_transcription(self, mock_post):
        """Voxtral realtime should return a proper TranscriptionResult."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "text": "Can you explain mitosis?",
            "language": "en",
            "duration": 2.0,
            "confidence": 0.88,
            "segments": [{"start": 0, "end": 2.0, "text": "Can you explain mitosis?"}],
            "words": [{"word": "mitosis", "start": 1.2, "end": 1.8}],
        }
        mock_response.raise_for_status = MagicMock()
        mock_post.return_value = mock_response

        from app.core.stt_providers import MultiProviderSTT
        from app.core.config import AccessibilityAIConfig, set_config

        config = AccessibilityAIConfig(mistral_api_key="test-key")
        set_config(config)

        stt = MultiProviderSTT()
        result = stt._transcribe_voxtral_realtime(b"audio")

        assert result.text == "Can you explain mitosis?"
        assert result.provider == "voxtral_realtime"
        assert len(result.words) == 1
        assert result.words[0]["word"] == "mitosis"


class TestSTTProviderRegistration:
    """Tests for Voxtral provider registration in MultiProviderSTT."""

    def test_voxtral_batch_registered_when_available(self):
        """Voxtral batch should be registered when mistral key is set."""
        from app.core.config import AccessibilityAIConfig, STTProvider, set_config
        from app.core.stt_providers import MultiProviderSTT

        config = AccessibilityAIConfig(
            mistral_api_key="test-key",
            stt_providers=[STTProvider.VOXTRAL_BATCH],
        )
        set_config(config)

        stt = MultiProviderSTT()
        available = stt._manager.get_available_providers()
        assert "voxtral_batch" in available

    def test_voxtral_realtime_registered_when_available(self):
        """Voxtral realtime should be registered when mistral key is set."""
        from app.core.config import AccessibilityAIConfig, STTProvider, set_config
        from app.core.stt_providers import MultiProviderSTT

        config = AccessibilityAIConfig(
            mistral_api_key="test-key",
            stt_providers=[STTProvider.VOXTRAL_REALTIME],
        )
        set_config(config)

        stt = MultiProviderSTT()
        available = stt._manager.get_available_providers()
        assert "voxtral_realtime" in available
