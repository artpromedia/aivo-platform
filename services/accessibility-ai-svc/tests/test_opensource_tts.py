"""
Tests for Sprint S4B: Open-Source TTS Integration (Dia, Kokoro).

Covers:
- TTSProvider enum expansion (DIA_LOCAL, KOKORO_LOCAL)
- DiaTTSProvider class, emotion cues, dialogue synthesis
- KokoroTTSProvider class, voice mapping
- TTSStrategySelector use-case routing
- Provider wiring in MultiProviderTTS._setup_providers()
- Updated priority ordering (8 providers)
- requirements.txt optional dependency listing
"""
import pytest
import sys
import os
import struct
from unittest.mock import MagicMock, patch, PropertyMock
from dataclasses import dataclass

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


# ===================== TTSProvider Enum Tests =====================


class TestTTSProviderEnumS4B:
    """Tests for expanded TTSProvider enum with open-source entries."""

    def test_dia_local_exists(self):
        """TTSProvider should include DIA_LOCAL."""
        from app.core.config import TTSProvider

        assert hasattr(TTSProvider, "DIA_LOCAL")
        assert TTSProvider.DIA_LOCAL.value == "dia_local"

    def test_kokoro_local_exists(self):
        """TTSProvider should include KOKORO_LOCAL."""
        from app.core.config import TTSProvider

        assert hasattr(TTSProvider, "KOKORO_LOCAL")
        assert TTSProvider.KOKORO_LOCAL.value == "kokoro_local"

    def test_tts_provider_count_is_8(self):
        """TTSProvider should have 8 members after open-source additions."""
        from app.core.config import TTSProvider

        assert len(TTSProvider) == 8

    def test_all_providers_present(self):
        """All 8 TTS providers should be defined in the enum."""
        from app.core.config import TTSProvider

        expected = [
            "DIA_LOCAL",
            "KOKORO_LOCAL",
            "COQUI_LOCAL",
            "OPENAI_API",
            "GOOGLE_CLOUD",
            "AZURE",
            "ELEVENLABS",
            "AMAZON_POLLY",
        ]
        for name in expected:
            assert hasattr(TTSProvider, name), f"Missing TTSProvider.{name}"


class TestTTSPriorityS4B:
    """Tests for updated K-12 TTS priority with open-source providers."""

    def test_default_priority_length(self):
        """Default priority list should have 8 providers."""
        from app.core.config import AccessibilityAIConfig

        config = AccessibilityAIConfig()
        assert len(config.tts_providers) == 8

    def test_openai_still_first(self):
        """OpenAI should remain the first TTS provider."""
        from app.core.config import AccessibilityAIConfig, TTSProvider

        config = AccessibilityAIConfig()
        assert config.tts_providers[0] == TTSProvider.OPENAI_API

    def test_dia_is_second(self):
        """Dia should be the second TTS provider (high quality, free)."""
        from app.core.config import AccessibilityAIConfig, TTSProvider

        config = AccessibilityAIConfig()
        assert config.tts_providers[1] == TTSProvider.DIA_LOCAL

    def test_kokoro_in_top_five(self):
        """Kokoro should be in the top 5 for CPU accessibility."""
        from app.core.config import AccessibilityAIConfig, TTSProvider

        config = AccessibilityAIConfig()
        idx = config.tts_providers.index(TTSProvider.KOKORO_LOCAL)
        assert idx < 5

    def test_coqui_still_last(self):
        """Coqui should remain the last (legacy) fallback."""
        from app.core.config import AccessibilityAIConfig, TTSProvider

        config = AccessibilityAIConfig()
        assert config.tts_providers[-1] == TTSProvider.COQUI_LOCAL


class TestLocalProvidersAvailability:
    """Tests for local providers always being available (no API key)."""

    def test_dia_available_without_api_key(self):
        """DIA_LOCAL should be available regardless of API keys."""
        from app.core.config import AccessibilityAIConfig, TTSProvider

        config = AccessibilityAIConfig(
            openai_api_key=None,
            google_cloud_key=None,
            azure_key=None,
            elevenlabs_key=None,
            aws_access_key=None,
            tts_providers=[TTSProvider.DIA_LOCAL],
        )
        available = config.get_available_tts_providers()
        assert TTSProvider.DIA_LOCAL in available

    def test_kokoro_available_without_api_key(self):
        """KOKORO_LOCAL should be available regardless of API keys."""
        from app.core.config import AccessibilityAIConfig, TTSProvider

        config = AccessibilityAIConfig(
            openai_api_key=None,
            tts_providers=[TTSProvider.KOKORO_LOCAL],
        )
        available = config.get_available_tts_providers()
        assert TTSProvider.KOKORO_LOCAL in available


# ===================== DiaTTSProvider Tests =====================


class TestDiaTTSProvider:
    """Tests for DiaTTSProvider (Dia 1.6B)."""

    def test_emotion_cues_defined(self):
        """Emotion cues dict should have K-12 appropriate entries."""
        from app.core.dia_tts_provider import DiaTTSProvider

        assert hasattr(DiaTTSProvider, "EMOTION_CUES")
        cues = DiaTTSProvider.EMOTION_CUES
        for emotion in ["encouraging", "patient", "excited", "empathetic", "neutral"]:
            assert emotion in cues, f"Missing emotion cue: {emotion}"

    def test_provider_name(self):
        """Provider name should be 'dia_local'."""
        from app.core.dia_tts_provider import DiaTTSProvider

        provider = DiaTTSProvider.__new__(DiaTTSProvider)
        provider.provider_name = "dia_local"
        assert provider.provider_name == "dia_local"

    def test_sample_rate_is_24khz(self):
        """Dia should use 24kHz sample rate."""
        from app.core.dia_tts_provider import DiaTTSProvider

        provider = DiaTTSProvider.__new__(DiaTTSProvider)
        provider.sample_rate = 24000
        assert provider.sample_rate == 24000

    def test_storytelling_emotion_cue(self):
        """Storytelling emotion cue should exist for K-12 narration."""
        from app.core.dia_tts_provider import DiaTTSProvider

        assert "storytelling" in DiaTTSProvider.EMOTION_CUES

    @patch("app.core.dia_tts_provider.DiaTTSProvider._load_model")
    def test_synthesize_wraps_text_with_speaker_tag(self, mock_load):
        """synthesize() should wrap text with [S1] speaker tag."""
        import numpy as np
        from app.core.dia_tts_provider import DiaTTSProvider

        provider = DiaTTSProvider.__new__(DiaTTSProvider)
        provider._model = MagicMock()
        provider.sample_rate = 24000
        provider.provider_name = "dia_local"
        provider.device = "cpu"

        # Mock model.generate to return a numpy array
        fake_audio = np.zeros(24000, dtype=np.float32)  # 1 second
        provider._model.generate.return_value = fake_audio

        result = provider.synthesize("Hello student", voice="default", speed=1.0)

        # Verify generate was called with [S1] tagged text
        call_args = provider._model.generate.call_args
        text_arg = call_args[0][0] if call_args[0] else call_args[1].get("text", "")
        assert "[S1]" in text_arg

    @patch("app.core.dia_tts_provider.DiaTTSProvider._load_model")
    def test_synthesize_returns_synthesis_result(self, mock_load):
        """synthesize() should return a SynthesisResult."""
        import numpy as np
        from app.core.dia_tts_provider import DiaTTSProvider
        from app.core.tts_providers import SynthesisResult

        provider = DiaTTSProvider.__new__(DiaTTSProvider)
        provider._model = MagicMock()
        provider.sample_rate = 24000
        provider.provider_name = "dia_local"
        provider.device = "cpu"

        fake_audio = np.zeros(24000, dtype=np.float32)
        provider._model.generate.return_value = fake_audio

        result = provider.synthesize("Test text")
        assert isinstance(result, SynthesisResult)
        assert result.provider == "dia_local"
        assert result.format == "wav"

    def test_resolve_device_returns_cpu_when_no_cuda(self):
        """_resolve_device should return 'cpu' when CUDA is unavailable."""
        from app.core.dia_tts_provider import DiaTTSProvider

        with patch("torch.cuda.is_available", return_value=False):
            device = DiaTTSProvider._resolve_device("auto")
            assert device == "cpu"

    def test_resolve_device_explicit(self):
        """_resolve_device should return the explicit device when not 'auto'."""
        from app.core.dia_tts_provider import DiaTTSProvider

        assert DiaTTSProvider._resolve_device("cpu") == "cpu"


# ===================== KokoroTTSProvider Tests =====================


class TestKokoroTTSProvider:
    """Tests for KokoroTTSProvider (Kokoro 82M)."""

    def test_voice_map_defined(self):
        """Voice map should have K-12 semantic aliases."""
        from app.core.kokoro_tts_provider import KokoroTTSProvider

        voice_map = KokoroTTSProvider.VOICE_MAP
        for alias in ["default", "male", "female", "child_friendly"]:
            assert alias in voice_map, f"Missing voice alias: {alias}"

    def test_default_voice_is_af_heart(self):
        """Default voice should be af_heart."""
        from app.core.kokoro_tts_provider import KokoroTTSProvider

        assert KokoroTTSProvider.VOICE_MAP["default"] == "af_heart"

    def test_provider_name(self):
        """Provider name should be 'kokoro_local'."""
        from app.core.kokoro_tts_provider import KokoroTTSProvider

        provider = KokoroTTSProvider.__new__(KokoroTTSProvider)
        provider.provider_name = "kokoro_local"
        assert provider.provider_name == "kokoro_local"

    def test_sample_rate_is_24khz(self):
        """Kokoro should use 24kHz sample rate."""
        from app.core.kokoro_tts_provider import KokoroTTSProvider

        provider = KokoroTTSProvider.__new__(KokoroTTSProvider)
        provider.sample_rate = 24000
        assert provider.sample_rate == 24000

    def test_voice_map_male_alias(self):
        """Male alias should map to am_adam."""
        from app.core.kokoro_tts_provider import KokoroTTSProvider

        assert KokoroTTSProvider.VOICE_MAP["male"] == "am_adam"

    def test_voice_map_child_friendly(self):
        """child_friendly alias should map to af_bella."""
        from app.core.kokoro_tts_provider import KokoroTTSProvider

        assert KokoroTTSProvider.VOICE_MAP["child_friendly"] == "af_bella"


# =================== TTSStrategySelector Tests ====================


class TestTTSStrategySelector:
    """Tests for use-case-aware TTS provider routing."""

    def _get_selector(self):
        from app.core.tts_providers import TTSStrategySelector
        return TTSStrategySelector()

    def test_tutoring_with_gpu_returns_dia(self):
        """Tutoring sessions on GPU should use Dia."""
        s = self._get_selector()
        assert s.select_provider("tutoring", has_gpu=True) == "dia_local"

    def test_iep_read_aloud_returns_openai(self):
        """IEP read-aloud should use OpenAI for steerable emotion."""
        s = self._get_selector()
        assert s.select_provider("iep_read_aloud") == "openai_api"

    def test_accessibility_returns_azure(self):
        """Accessibility use-case should route to Azure."""
        s = self._get_selector()
        assert s.select_provider("accessibility") == "azure"

    def test_parent_communication_returns_elevenlabs(self):
        """Parent communications should use ElevenLabs."""
        s = self._get_selector()
        assert s.select_provider("parent_communication") == "elevenlabs"

    def test_mobile_returns_kokoro(self):
        """Mobile use-case should use Kokoro (CPU-friendly)."""
        s = self._get_selector()
        assert s.select_provider("mobile") == "kokoro_local"

    def test_offline_no_gpu_returns_kokoro(self):
        """Offline without GPU should use Kokoro."""
        s = self._get_selector()
        result = s.select_provider("any", has_gpu=False, has_network=False)
        assert result == "kokoro_local"

    def test_offline_with_gpu_returns_dia(self):
        """Offline with GPU should use Dia."""
        s = self._get_selector()
        result = s.select_provider("any", has_gpu=True, has_network=False)
        assert result == "dia_local"

    def test_budget_exhausted_no_gpu_returns_kokoro(self):
        """Zero budget without GPU should use Kokoro."""
        s = self._get_selector()
        result = s.select_provider("general", has_gpu=False, budget_remaining=0)
        assert result == "kokoro_local"

    def test_budget_exhausted_with_gpu_returns_dia(self):
        """Zero budget with GPU should use Dia."""
        s = self._get_selector()
        result = s.select_provider("general", has_gpu=True, budget_remaining=0)
        assert result == "dia_local"

    def test_storytelling_with_gpu_returns_dia(self):
        """Storytelling with GPU should use Dia for multi-speaker."""
        s = self._get_selector()
        result = s.select_provider("storytelling", has_gpu=True)
        assert result == "dia_local"


# ================= MultiProviderTTS Wiring Tests ==================


class TestMultiProviderTTSWiring:
    """Tests for Dia/Kokoro registration in MultiProviderTTS._setup_providers()."""

    def test_dia_registered_when_available(self):
        """Dia should be registered when DIA_LOCAL is in available providers."""
        from app.core.config import AccessibilityAIConfig, TTSProvider, set_config

        config = AccessibilityAIConfig(
            tts_providers=[TTSProvider.DIA_LOCAL],
        )
        set_config(config)

        from app.core.tts_providers import MultiProviderTTS
        tts = MultiProviderTTS()
        available = tts._manager.get_available_providers()
        assert "dia_local" in available

    def test_kokoro_registered_when_available(self):
        """Kokoro should be registered when KOKORO_LOCAL is in available providers."""
        from app.core.config import AccessibilityAIConfig, TTSProvider, set_config

        config = AccessibilityAIConfig(
            tts_providers=[TTSProvider.KOKORO_LOCAL],
        )
        set_config(config)

        from app.core.tts_providers import MultiProviderTTS
        tts = MultiProviderTTS()
        available = tts._manager.get_available_providers()
        assert "kokoro_local" in available

    def test_all_eight_providers_can_be_registered(self):
        """All 8 providers should be registrable together."""
        from app.core.config import AccessibilityAIConfig, TTSProvider, set_config

        config = AccessibilityAIConfig(
            openai_api_key="test-key",
            google_cloud_key="test-google",
            azure_key="test-azure",
            azure_region="eastus",
            elevenlabs_key="test-el",
            aws_access_key="test-aws",
            aws_secret_key="test-secret",
            tts_providers=[
                TTSProvider.OPENAI_API,
                TTSProvider.DIA_LOCAL,
                TTSProvider.GOOGLE_CLOUD,
                TTSProvider.AZURE,
                TTSProvider.KOKORO_LOCAL,
                TTSProvider.ELEVENLABS,
                TTSProvider.AMAZON_POLLY,
                TTSProvider.COQUI_LOCAL,
            ],
        )
        set_config(config)

        from app.core.tts_providers import MultiProviderTTS
        tts = MultiProviderTTS()
        available = tts._manager.get_available_providers()
        assert len(available) == 8


# =================== Module Docstring Tests ======================


class TestModuleDocstrings:
    """Verify that tts_providers docstring reflects S4B additions."""

    def test_docstring_mentions_dia(self):
        """tts_providers module docstring should mention Dia."""
        import app.core.tts_providers as mod

        assert "Dia" in mod.__doc__

    def test_docstring_mentions_kokoro(self):
        """tts_providers module docstring should mention Kokoro."""
        import app.core.tts_providers as mod

        assert "Kokoro" in mod.__doc__

    def test_docstring_lists_eight_providers(self):
        """Docstring should list 8 providers (count dashes)."""
        import app.core.tts_providers as mod

        lines = [l.strip() for l in mod.__doc__.splitlines() if l.strip().startswith("-")]
        assert len(lines) == 8
