"""
Multi-provider Speech-to-Text service.

Supports automatic failover between:
- Whisper (local)
- OpenAI Whisper API
- Google Cloud Speech-to-Text
- Azure Speech Services
- Deepgram
- AssemblyAI
"""
import logging
import tempfile
import os
import base64
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field

from ..core.config import get_config, STTProvider
from ..core.providers import MultiProviderManager, ProviderResult

logger = logging.getLogger(__name__)


@dataclass
class TranscriptionResult:
    """Unified transcription result across providers."""
    text: str
    confidence: float
    language: str
    duration: float
    provider: str
    words: List[Dict[str, Any]] = field(default_factory=list)
    segments: List[Dict[str, Any]] = field(default_factory=list)


class MultiProviderSTT:
    """
    Speech-to-Text with multi-provider support and automatic failover.
    
    Usage:
        stt = MultiProviderSTT()
        result = stt.transcribe(audio_bytes, language="en")
    """
    
    def __init__(self):
        self.config = get_config()
        self._manager = MultiProviderManager(
            name="STT",
            enable_failover=self.config.enable_failover,
            max_retries=self.config.max_failover_attempts,
        )
        self._setup_providers()
    
    def _setup_providers(self) -> None:
        """Register available providers."""
        available = self.config.get_available_stt_providers()
        
        for i, provider in enumerate(available):
            if provider == STTProvider.WHISPER_LOCAL:
                self._manager.register_provider(
                    "whisper_local",
                    self._transcribe_whisper_local,
                    priority=i,
                )
            elif provider == STTProvider.OPENAI_API:
                self._manager.register_provider(
                    "openai_api",
                    self._transcribe_openai_api,
                    priority=i,
                )
            elif provider == STTProvider.GOOGLE_CLOUD:
                self._manager.register_provider(
                    "google_cloud",
                    self._transcribe_google_cloud,
                    priority=i,
                )
            elif provider == STTProvider.AZURE:
                self._manager.register_provider(
                    "azure",
                    self._transcribe_azure,
                    priority=i,
                )
            elif provider == STTProvider.DEEPGRAM:
                self._manager.register_provider(
                    "deepgram",
                    self._transcribe_deepgram,
                    priority=i,
                )
            elif provider == STTProvider.ASSEMBLY_AI:
                self._manager.register_provider(
                    "assembly_ai",
                    self._transcribe_assembly_ai,
                    priority=i,
                )
        
        logger.info(f"STT providers configured: {self._manager.get_available_providers()}")
    
    def transcribe(
        self,
        audio: bytes,
        language: Optional[str] = None,
        word_timestamps: bool = True,
        preferred_provider: Optional[str] = None,
    ) -> TranscriptionResult:
        """
        Transcribe audio to text with automatic failover.
        
        Args:
            audio: Raw audio bytes
            language: Language code (auto-detect if None)
            word_timestamps: Whether to include word-level timestamps
            preferred_provider: Specific provider to try first
            
        Returns:
            TranscriptionResult with text and metadata
        """
        result = self._manager.execute(
            audio=audio,
            language=language,
            word_timestamps=word_timestamps,
            preferred_provider=preferred_provider,
        )
        
        if result.success and result.result:
            return result.result
        
        # Return empty result on failure
        logger.error(f"All STT providers failed: {result.error}")
        return TranscriptionResult(
            text="",
            confidence=0.0,
            language=language or "unknown",
            duration=0.0,
            provider="none",
        )
    
    def get_health(self) -> Dict[str, Any]:
        """Get health status of all providers."""
        return self._manager.get_health()
    
    # ==================== Provider Implementations ====================
    
    def _transcribe_whisper_local(
        self,
        audio: bytes,
        language: Optional[str] = None,
        word_timestamps: bool = True,
    ) -> TranscriptionResult:
        """Transcribe using local Whisper model."""
        import whisper
        
        # Get or load model
        model_size = self.config.whisper_model_size
        model = whisper.load_model(model_size)
        
        # Save to temp file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            f.write(audio)
            temp_path = f.name
        
        try:
            options = {"word_timestamps": word_timestamps}
            if language:
                options["language"] = language
            
            result = model.transcribe(temp_path, **options)
            
            # Extract words and segments
            words = []
            segments = []
            
            for seg in result.get("segments", []):
                segments.append({
                    "start": seg.get("start", 0),
                    "end": seg.get("end", 0),
                    "text": seg.get("text", ""),
                })
                for w in seg.get("words", []):
                    words.append({
                        "word": w.get("word", ""),
                        "start": w.get("start", 0),
                        "end": w.get("end", 0),
                    })
            
            # Estimate duration from last segment
            duration = segments[-1]["end"] if segments else 0.0
            
            return TranscriptionResult(
                text=result.get("text", "").strip(),
                confidence=0.95,  # Whisper doesn't provide confidence
                language=result.get("language", language or "en"),
                duration=duration,
                provider="whisper_local",
                words=words,
                segments=segments,
            )
        finally:
            if os.path.exists(temp_path):
                os.unlink(temp_path)
    
    def _transcribe_openai_api(
        self,
        audio: bytes,
        language: Optional[str] = None,
        word_timestamps: bool = True,
    ) -> TranscriptionResult:
        """Transcribe using OpenAI Whisper API."""
        import httpx
        
        # Save to temp file (API requires file upload)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            f.write(audio)
            temp_path = f.name
        
        try:
            with open(temp_path, "rb") as audio_file:
                response = httpx.post(
                    "https://api.openai.com/v1/audio/transcriptions",
                    headers={"Authorization": f"Bearer {self.config.openai_api_key}"},
                    files={"file": ("audio.wav", audio_file, "audio/wav")},
                    data={
                        "model": "whisper-1",
                        "response_format": "verbose_json",
                        "timestamp_granularities[]": "word" if word_timestamps else "segment",
                        **({"language": language} if language else {}),
                    },
                    timeout=60.0,
                )
            
            response.raise_for_status()
            data = response.json()
            
            # Parse response
            words = []
            segments = []
            
            for seg in data.get("segments", []):
                segments.append({
                    "start": seg.get("start", 0),
                    "end": seg.get("end", 0),
                    "text": seg.get("text", ""),
                })
            
            for w in data.get("words", []):
                words.append({
                    "word": w.get("word", ""),
                    "start": w.get("start", 0),
                    "end": w.get("end", 0),
                })
            
            return TranscriptionResult(
                text=data.get("text", "").strip(),
                confidence=0.95,
                language=data.get("language", language or "en"),
                duration=data.get("duration", 0.0),
                provider="openai_api",
                words=words,
                segments=segments,
            )
        finally:
            if os.path.exists(temp_path):
                os.unlink(temp_path)
    
    def _transcribe_google_cloud(
        self,
        audio: bytes,
        language: Optional[str] = None,
        word_timestamps: bool = True,
    ) -> TranscriptionResult:
        """Transcribe using Google Cloud Speech-to-Text."""
        import httpx
        
        # Encode audio as base64
        audio_base64 = base64.b64encode(audio).decode("utf-8")
        
        # Map language code
        lang_code = f"{language or 'en'}-US" if language else "en-US"
        
        response = httpx.post(
            f"https://speech.googleapis.com/v1/speech:recognize",
            params={"key": self.config.google_cloud_key},
            json={
                "config": {
                    "encoding": "LINEAR16",
                    "languageCode": lang_code,
                    "enableWordTimeOffsets": word_timestamps,
                    "enableAutomaticPunctuation": True,
                    "model": "latest_long",
                },
                "audio": {"content": audio_base64},
            },
            timeout=60.0,
        )
        
        response.raise_for_status()
        data = response.json()
        
        # Parse results
        text_parts = []
        words = []
        confidence_sum = 0.0
        confidence_count = 0
        
        for result in data.get("results", []):
            alt = result.get("alternatives", [{}])[0]
            text_parts.append(alt.get("transcript", ""))
            confidence_sum += alt.get("confidence", 0.9)
            confidence_count += 1
            
            for w in alt.get("words", []):
                words.append({
                    "word": w.get("word", ""),
                    "start": float(w.get("startTime", "0s").rstrip("s")),
                    "end": float(w.get("endTime", "0s").rstrip("s")),
                })
        
        duration = words[-1]["end"] if words else 0.0
        avg_confidence = confidence_sum / max(confidence_count, 1)
        
        return TranscriptionResult(
            text=" ".join(text_parts),
            confidence=avg_confidence,
            language=language or "en",
            duration=duration,
            provider="google_cloud",
            words=words,
            segments=[],
        )
    
    def _transcribe_azure(
        self,
        audio: bytes,
        language: Optional[str] = None,
        word_timestamps: bool = True,
    ) -> TranscriptionResult:
        """Transcribe using Azure Speech Services."""
        import httpx
        
        # Azure Speech endpoint
        endpoint = f"https://{self.config.azure_region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1"
        
        params = {
            "language": f"{language or 'en'}-US",
            "format": "detailed",
        }
        
        response = httpx.post(
            endpoint,
            params=params,
            headers={
                "Ocp-Apim-Subscription-Key": self.config.azure_key,
                "Content-Type": "audio/wav",
            },
            content=audio,
            timeout=60.0,
        )
        
        response.raise_for_status()
        data = response.json()
        
        # Parse Azure response
        best_result = data.get("NBest", [{}])[0]
        
        words = []
        for w in best_result.get("Words", []):
            words.append({
                "word": w.get("Word", ""),
                "start": w.get("Offset", 0) / 10_000_000,  # Convert from 100ns units
                "end": (w.get("Offset", 0) + w.get("Duration", 0)) / 10_000_000,
            })
        
        return TranscriptionResult(
            text=best_result.get("Display", ""),
            confidence=best_result.get("Confidence", 0.9),
            language=language or "en",
            duration=data.get("Duration", 0) / 10_000_000,
            provider="azure",
            words=words,
            segments=[],
        )
    
    def _transcribe_deepgram(
        self,
        audio: bytes,
        language: Optional[str] = None,
        word_timestamps: bool = True,
    ) -> TranscriptionResult:
        """Transcribe using Deepgram."""
        import httpx
        
        params = {
            "model": "nova-2",
            "smart_format": "true",
            "punctuate": "true",
        }
        if language:
            params["language"] = language
        
        response = httpx.post(
            "https://api.deepgram.com/v1/listen",
            params=params,
            headers={
                "Authorization": f"Token {self.config.deepgram_key}",
                "Content-Type": "audio/wav",
            },
            content=audio,
            timeout=60.0,
        )
        
        response.raise_for_status()
        data = response.json()
        
        # Parse Deepgram response
        channel = data.get("results", {}).get("channels", [{}])[0]
        alt = channel.get("alternatives", [{}])[0]
        
        words = []
        for w in alt.get("words", []):
            words.append({
                "word": w.get("word", ""),
                "start": w.get("start", 0),
                "end": w.get("end", 0),
                "confidence": w.get("confidence", 0.9),
            })
        
        duration = words[-1]["end"] if words else 0.0
        
        return TranscriptionResult(
            text=alt.get("transcript", ""),
            confidence=alt.get("confidence", 0.9),
            language=channel.get("detected_language", language or "en"),
            duration=duration,
            provider="deepgram",
            words=words,
            segments=[],
        )
    
    def _transcribe_assembly_ai(
        self,
        audio: bytes,
        language: Optional[str] = None,
        word_timestamps: bool = True,
    ) -> TranscriptionResult:
        """Transcribe using AssemblyAI."""
        import httpx
        import time
        
        headers = {"authorization": self.config.assembly_ai_key}
        
        # Upload audio
        upload_response = httpx.post(
            "https://api.assemblyai.com/v2/upload",
            headers=headers,
            content=audio,
            timeout=60.0,
        )
        upload_response.raise_for_status()
        upload_url = upload_response.json()["upload_url"]
        
        # Start transcription
        transcript_response = httpx.post(
            "https://api.assemblyai.com/v2/transcript",
            headers=headers,
            json={
                "audio_url": upload_url,
                "language_code": language or "en",
            },
            timeout=30.0,
        )
        transcript_response.raise_for_status()
        transcript_id = transcript_response.json()["id"]
        
        # Poll for completion
        while True:
            poll_response = httpx.get(
                f"https://api.assemblyai.com/v2/transcript/{transcript_id}",
                headers=headers,
                timeout=30.0,
            )
            poll_response.raise_for_status()
            data = poll_response.json()
            
            if data["status"] == "completed":
                break
            elif data["status"] == "error":
                raise Exception(f"AssemblyAI error: {data.get('error')}")
            
            time.sleep(1)
        
        # Parse response
        words = []
        for w in data.get("words", []):
            words.append({
                "word": w.get("text", ""),
                "start": w.get("start", 0) / 1000,  # Convert ms to seconds
                "end": w.get("end", 0) / 1000,
                "confidence": w.get("confidence", 0.9),
            })
        
        return TranscriptionResult(
            text=data.get("text", ""),
            confidence=data.get("confidence", 0.9),
            language=language or "en",
            duration=data.get("audio_duration", 0),
            provider="assembly_ai",
            words=words,
            segments=[],
        )


# Singleton instance
_stt_instance: Optional[MultiProviderSTT] = None


def get_multi_provider_stt() -> MultiProviderSTT:
    """Get the singleton MultiProviderSTT instance."""
    global _stt_instance
    if _stt_instance is None:
        _stt_instance = MultiProviderSTT()
    return _stt_instance
