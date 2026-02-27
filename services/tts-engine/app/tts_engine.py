"""
Piper TTS Engine Wrapper

Manages voice model loading and audio synthesis via Piper.
Voice models are stored on a persistent volume and loaded lazily.
"""

import asyncio
import logging
from pathlib import Path

import numpy as np

logger = logging.getLogger(__name__)

# Piper voice model registry — maps persona voice IDs to Piper model files.
# These are downloaded by scripts/download_voices.sh
VOICE_MODEL_MAP: dict[str, dict] = {
    # English voices (one per persona style)
    "en_US-amy-medium": {
        "locale": "en-US",
        "quality": "medium",
        "sample_rate": 22050,
        "description": "Amy — clear, warm female voice (Nova, Spark)",
    },
    "en_US-lessac-medium": {
        "locale": "en-US",
        "quality": "medium",
        "sample_rate": 22050,
        "description": "Lessac — calm, authoritative voice (Sage, Chrono)",
    },
    "en_US-ryan-medium": {
        "locale": "en-US",
        "quality": "medium",
        "sample_rate": 22050,
        "description": "Ryan — friendly male voice (Pixel)",
    },
    # Spanish voices
    "es_MX-claude-high": {
        "locale": "es-MX",
        "quality": "high",
        "sample_rate": 22050,
        "description": "Claude — Mexican Spanish voice",
    },
    # French voices
    "fr_FR-siwis-medium": {
        "locale": "fr-FR",
        "quality": "medium",
        "sample_rate": 22050,
        "description": "Siwis — French voice",
    },
    # Portuguese (Brazil)
    "pt_BR-edresson-low": {
        "locale": "pt-BR",
        "quality": "low",
        "sample_rate": 22050,
        "description": "Edresson — Brazilian Portuguese voice",
    },
    # Arabic
    "ar_JO-kareem-medium": {
        "locale": "ar",
        "quality": "medium",
        "sample_rate": 22050,
        "description": "Kareem — Arabic voice",
    },
    # Swahili
    "sw_CD-lanfrica-medium": {
        "locale": "sw",
        "quality": "medium",
        "sample_rate": 22050,
        "description": "Lanfrica — Swahili voice",
    },
}


class PiperTTSEngine:
    """Manages Piper TTS voice models and synthesis."""

    def __init__(self, models_dir: str = "/app/models"):
        self.models_dir = Path(models_dir)
        self.models_dir.mkdir(parents=True, exist_ok=True)
        self._loaded_voices: dict[str, object] = {}
        self.available_voices: list[str] = []

    async def load_default_voices(self):
        """Scan models directory and register available voices."""
        self.available_voices = []

        for voice_name, meta in VOICE_MODEL_MAP.items():
            model_path = self.models_dir / f"{voice_name}.onnx"
            config_path = self.models_dir / f"{voice_name}.onnx.json"

            if model_path.exists() and config_path.exists():
                self.available_voices.append(voice_name)
                logger.info(
                    "Voice available: %s (%s)", voice_name, meta["locale"]
                )
            else:
                logger.warning(
                    "Voice model not found: %s — download with "
                    "scripts/download_voices.sh",
                    voice_name,
                )

        logger.info("Loaded %d voice models", len(self.available_voices))

    async def synthesize(
        self,
        text: str,
        voice: str = "en_US-amy-medium",
        speaking_rate: float = 1.0,
    ) -> tuple[np.ndarray, int]:
        """
        Synthesize text to audio using Piper.

        Returns (audio_data, sample_rate).
        """
        model_path = self.models_dir / f"{voice}.onnx"
        config_path = self.models_dir / f"{voice}.onnx.json"

        if not model_path.exists():
            raise FileNotFoundError(f"Voice model not found: {voice}")

        meta = VOICE_MODEL_MAP.get(voice, {})
        sample_rate = meta.get("sample_rate", 22050)

        # Run Piper synthesis in a thread pool to avoid blocking the event loop
        loop = asyncio.get_event_loop()
        audio_data = await loop.run_in_executor(
            None,
            self._synthesize_sync,
            text,
            str(model_path),
            str(config_path),
            speaking_rate,
        )

        return audio_data, sample_rate

    def _synthesize_sync(
        self,
        text: str,
        model_path: str,
        config_path: str,
        speaking_rate: float,
    ) -> np.ndarray:
        """Synchronous Piper synthesis (runs in thread pool)."""
        from piper import PiperVoice

        voice = PiperVoice.load(model_path, config_path=config_path)

        # Piper synthesize_stream_raw returns raw PCM audio chunks
        audio_chunks = []
        for chunk in voice.synthesize_stream_raw(
            text,
            # Piper uses length_scale (inverse of rate)
            length_scale=1.0 / speaking_rate,
        ):
            audio_chunks.append(
                np.frombuffer(chunk, dtype=np.int16).astype(np.float32)
                / 32768.0
            )

        if not audio_chunks:
            return np.array([], dtype=np.float32)

        return np.concatenate(audio_chunks)

    def get_voice_list(self) -> list[dict]:
        """Return list of available voices with metadata."""
        voices = []
        for name in self.available_voices:
            meta = VOICE_MODEL_MAP.get(name, {})
            voices.append(
                {
                    "name": name,
                    "locale": meta.get("locale", "unknown"),
                    "quality": meta.get("quality", "medium"),
                    "sample_rate": meta.get("sample_rate", 22050),
                    "description": meta.get("description", ""),
                }
            )
        return voices
