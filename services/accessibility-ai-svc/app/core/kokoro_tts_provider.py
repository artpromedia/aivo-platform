"""
Kokoro TTS Provider (Hexgrad)

Ultra-lightweight open-source TTS:
- Only 82M parameters — runs on CPU in real-time
- Apache 2.0 license
- Speaker embeddings for voice customization
- Perfect for: Chromebooks, tablets, offline kiosks

K-12 Benefits:
- Runs on school Chromebooks without GPU
- Real-time on mobile devices (Flutter app)
- No network required — critical for rural schools
"""

import io
import wave
import logging
from typing import Optional, Dict

import numpy as np

logger = logging.getLogger(__name__)

from ..core.tts_providers import SynthesisResult


class KokoroTTSProvider:
    """Lightweight TTS for edge devices and CPU-only environments."""

    # Voice presets optimised for K-12
    VOICE_MAP: Dict[str, str] = {
        "default": "af_heart",       # Warm female
        "male": "am_adam",           # Adult male
        "female": "af_heart",        # Adult female
        "child_friendly": "af_bella",  # Gentle, slower cadence
        "narrator": "af_heart",
        "tutor": "am_adam",
    }

    def __init__(
        self,
        model_name: str = "hexgrad/Kokoro-82M",
        voice_preset: str = "af_heart",
    ):
        self.model_name = model_name
        self.voice_preset = voice_preset
        self._pipeline = None

    # ------------------------------------------------------------------
    # Model lifecycle
    # ------------------------------------------------------------------

    def _load_pipeline(self, lang_code: str = "a") -> None:
        """Lazy-load Kokoro pipeline on first call."""
        if self._pipeline is not None:
            return
        try:
            from kokoro import KPipeline

            self._pipeline = KPipeline(lang_code=lang_code)
            logger.info("kokoro_tts_loaded model=%s", self.model_name)
        except ImportError:
            raise ImportError(
                "Kokoro TTS not installed. Install with: "
                "pip install kokoro soundfile"
            )

    @staticmethod
    def is_available() -> bool:
        """Check whether the kokoro package is installed."""
        try:
            import kokoro  # noqa: F401
            return True
        except ImportError:
            return False

    # ------------------------------------------------------------------
    # Synthesis
    # ------------------------------------------------------------------

    def synthesize(
        self,
        text: str,
        voice: str = "default",
        speed: float = 1.0,
        language: str = "en",
    ) -> SynthesisResult:
        """Synthesize speech using Kokoro (CPU-friendly, real-time)."""
        lang_initial = language[0] if language else "a"
        self._load_pipeline(lang_code=lang_initial)

        kokoro_voice = self.VOICE_MAP.get(voice, self.voice_preset)

        generator = self._pipeline(
            text,
            voice=kokoro_voice,
            speed=speed,
        )

        audio_segments = []
        for _, _, audio_chunk in generator:
            audio_segments.append(audio_chunk)

        if not audio_segments:
            # Edge case: empty input → 0.5s silence
            full_audio = np.zeros(12000, dtype=np.float32)
        else:
            full_audio = np.concatenate(audio_segments)

        sample_rate = 24000
        audio_bytes = self._array_to_wav(full_audio, sample_rate=sample_rate)

        return SynthesisResult(
            audio_bytes=audio_bytes,
            format="wav",
            duration=len(full_audio) / sample_rate,
            sample_rate=sample_rate,
            provider="kokoro_local",
            voice_id=kokoro_voice,
        )

    # ------------------------------------------------------------------
    # Utility
    # ------------------------------------------------------------------

    @staticmethod
    def _array_to_wav(audio: np.ndarray, sample_rate: int) -> bytes:
        """Convert a float32 numpy audio array to WAV bytes."""
        audio_int16 = (audio * 32767).astype(np.int16)

        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(sample_rate)
            wav.writeframes(audio_int16.tobytes())

        return buffer.getvalue()
