"""
Dia TTS Provider (Nari Labs)

Open-source, Apache 2.0 licensed TTS model with:
- 1.6B parameters, ultra-realistic dialogue generation
- Multi-speaker support with emotion/nonverbal cues
- Voice cloning capability
- Laughter, sighs, pauses naturally rendered

GitHub: https://github.com/nari-labs/dia
HuggingFace: https://huggingface.co/nari-labs/Dia-1.6B

K-12 Benefits:
- Zero API cost for unlimited student interactions
- Student data never leaves school infrastructure
- Customizable voices for accessibility needs
- Works offline for schools with limited connectivity
"""

import io
import wave
import logging
from typing import Optional, List, Dict, Any

import numpy as np

logger = logging.getLogger(__name__)

# Import SynthesisResult type (avoid circular import at module level)
from ..core.tts_providers import SynthesisResult


class DiaTTSProvider:
    """
    Dia TTS provider for high-quality open-source speech synthesis.

    Recommended deployment:
    - GPU: NVIDIA T4 or better (1.6B params needs ~6 GB VRAM)
    - For CPU-only environments, use Kokoro instead (82M params)
    """

    # Emotion cue suffixes mapped to K-12 use cases
    EMOTION_CUES: Dict[str, str] = {
        "encouraging": " (cheerful)",
        "patient": " (calm, slow)",
        "excited": " (enthusiastic)",
        "empathetic": " (gentle, comforting)",
        "neutral": "",
        "storytelling": " (animated, expressive)",
    }

    def __init__(
        self,
        model_name: str = "nari-labs/Dia-1.6B",
        device: str = "auto",
        cache_dir: Optional[str] = None,
    ):
        self.model_name = model_name
        self.device = self._resolve_device(device)
        self.cache_dir = cache_dir
        self._model = None
        self._loaded = False

    # ------------------------------------------------------------------
    # Model lifecycle
    # ------------------------------------------------------------------

    def _load_model(self) -> None:
        """Lazy-load model on first synthesis request."""
        if self._loaded:
            return

        try:
            from dia.model import Dia

            self._model = Dia.from_pretrained(
                self.model_name,
                device=self.device,
            )
            self._loaded = True
            logger.info("dia_tts_loaded device=%s", self.device)
        except ImportError:
            raise ImportError(
                "Dia TTS not installed. Install with: "
                "pip install dia-tts torch torchaudio"
            )

    @staticmethod
    def is_available() -> bool:
        """Check whether the dia-tts package is installed."""
        try:
            import dia  # noqa: F401
            return True
        except ImportError:
            return False

    # ------------------------------------------------------------------
    # Single-speaker synthesis
    # ------------------------------------------------------------------

    def synthesize(
        self,
        text: str,
        voice: str = "default",
        speed: float = 1.0,
        language: str = "en",
        emotion: Optional[str] = None,
    ) -> SynthesisResult:
        """
        Synthesize speech using Dia.

        Dia supports dialogue tags for multi-speaker output::

            [S1] Hello, how are you today?
            [S2] I'm doing great, thanks for asking!

        For K-12 tutoring, single-speaker is the default::

            [S1] Let's work through this math problem together.
        """
        self._load_model()

        # Wrap in speaker tag if not already tagged
        if not text.startswith("[S"):
            text = f"[S1] {text}"

        # Append emotional cue if specified
        if emotion and emotion in self.EMOTION_CUES:
            text = text + self.EMOTION_CUES[emotion]

        # Generate audio
        audio_array = self._model.generate(
            text,
            max_tokens=None,  # auto-determine length
            top_p=0.95,
            cfg_scale=3.0,  # classifier-free guidance for quality
        )

        sample_rate = 24000
        audio_bytes = self._array_to_wav(audio_array, sample_rate=sample_rate)
        duration = len(audio_array) / sample_rate

        return SynthesisResult(
            audio_bytes=audio_bytes,
            format="wav",
            duration=duration,
            sample_rate=sample_rate,
            provider="dia_local",
            voice_id=voice,
        )

    # ------------------------------------------------------------------
    # Multi-speaker dialogue synthesis
    # ------------------------------------------------------------------

    def synthesize_dialogue(
        self,
        dialogue: List[Dict[str, str]],
        voices: Optional[Dict[str, str]] = None,
    ) -> SynthesisResult:
        """
        Synthesize multi-speaker dialogue.

        Useful for:
        - Socratic tutoring dialogues
        - Story read-aloud with characters
        - Parent-teacher meeting summaries

        Args:
            dialogue: ``[{"speaker": "tutor", "text": "..."}, ...]``
            voices:  ``{"tutor": "S1", "student": "S2"}``
        """
        voice_map = voices or {"tutor": "S1", "student": "S2"}

        tagged_text = "\n".join(
            f"[{voice_map.get(turn['speaker'], 'S1')}] {turn['text']}"
            for turn in dialogue
        )

        return self.synthesize(tagged_text)

    # ------------------------------------------------------------------
    # Utility helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _resolve_device(device: str) -> str:
        """Pick CUDA when available, else CPU."""
        if device == "auto":
            try:
                import torch
                return "cuda" if torch.cuda.is_available() else "cpu"
            except ImportError:
                return "cpu"
        return device

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
