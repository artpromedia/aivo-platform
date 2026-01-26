"""
Speech to Text

Transcribe audio to text.
"""
import logging
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class Transcription:
    text: str
    confidence: float
    language: str
    duration: float


class SpeechToText:
    """
    Transcribe speech to text using Whisper.
    
    Features:
    - Multi-language support
    - Real-time streaming
    - Speaker diarization
    
    Usage:
        stt = SpeechToText()
        result = stt.transcribe(audio_bytes)
    """
    
    def __init__(self, model_size: str = "base"):
        self.model_size = model_size
        logger.info(f"SpeechToText initialized with {model_size}")
    
    def transcribe(
        self,
        audio: bytes,
        language: Optional[str] = None,
    ) -> Transcription:
        """Transcribe audio to text."""
        raise NotImplementedError()
    
    def transcribe_realtime(
        self,
        audio_stream,
    ):
        """Stream transcription."""
        raise NotImplementedError()
    
    def detect_language(
        self,
        audio: bytes,
    ) -> str:
        """Detect audio language."""
        raise NotImplementedError()
