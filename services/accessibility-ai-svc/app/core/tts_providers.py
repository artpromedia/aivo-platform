"""
Multi-provider Text-to-Speech service.

Supports automatic failover between:
- Coqui TTS (local)
- OpenAI TTS API
- Google Cloud Text-to-Speech
- Azure Speech Services
- ElevenLabs
- Amazon Polly
"""
import logging
import tempfile
import os
import base64
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field

from ..core.config import get_config, TTSProvider
from ..core.providers import MultiProviderManager

logger = logging.getLogger(__name__)


@dataclass
class SynthesisResult:
    """Unified synthesis result across providers."""
    audio_bytes: bytes
    format: str
    duration: float
    sample_rate: int
    provider: str
    voice_id: str = "default"


class MultiProviderTTS:
    """
    Text-to-Speech with multi-provider support and automatic failover.
    
    Usage:
        tts = MultiProviderTTS()
        result = tts.synthesize("Hello world", voice="default")
    """
    
    def __init__(self):
        self.config = get_config()
        self._manager = MultiProviderManager(
            name="TTS",
            enable_failover=self.config.enable_failover,
            max_retries=self.config.max_failover_attempts,
        )
        self._setup_providers()
    
    def _setup_providers(self) -> None:
        """Register available providers."""
        available = self.config.get_available_tts_providers()
        
        for i, provider in enumerate(available):
            if provider == TTSProvider.COQUI_LOCAL:
                self._manager.register_provider(
                    "coqui_local",
                    self._synthesize_coqui_local,
                    priority=i,
                )
            elif provider == TTSProvider.OPENAI_API:
                self._manager.register_provider(
                    "openai_api",
                    self._synthesize_openai_api,
                    priority=i,
                )
            elif provider == TTSProvider.GOOGLE_CLOUD:
                self._manager.register_provider(
                    "google_cloud",
                    self._synthesize_google_cloud,
                    priority=i,
                )
            elif provider == TTSProvider.AZURE:
                self._manager.register_provider(
                    "azure",
                    self._synthesize_azure,
                    priority=i,
                )
            elif provider == TTSProvider.ELEVENLABS:
                self._manager.register_provider(
                    "elevenlabs",
                    self._synthesize_elevenlabs,
                    priority=i,
                )
            elif provider == TTSProvider.AMAZON_POLLY:
                self._manager.register_provider(
                    "amazon_polly",
                    self._synthesize_amazon_polly,
                    priority=i,
                )
        
        logger.info(f"TTS providers configured: {self._manager.get_available_providers()}")
    
    def synthesize(
        self,
        text: str,
        voice: str = "default",
        speed: float = 1.0,
        language: str = "en",
        preferred_provider: Optional[str] = None,
    ) -> SynthesisResult:
        """
        Synthesize text to speech with automatic failover.
        
        Args:
            text: Text to synthesize
            voice: Voice ID to use
            speed: Speech rate (0.5-2.0)
            language: Language code
            preferred_provider: Specific provider to try first
            
        Returns:
            SynthesisResult with audio bytes and metadata
        """
        result = self._manager.execute(
            text=text,
            voice=voice,
            speed=speed,
            language=language,
            preferred_provider=preferred_provider,
        )
        
        if result.success and result.result:
            return result.result
        
        # Return empty/silent audio on failure
        logger.error(f"All TTS providers failed: {result.error}")
        return self._generate_silent_audio()
    
    def get_health(self) -> Dict[str, Any]:
        """Get health status of all providers."""
        return self._manager.get_health()
    
    def _generate_silent_audio(self) -> SynthesisResult:
        """Generate 1 second of silence as fallback."""
        import numpy as np
        
        sample_rate = 22050
        duration = 1.0
        samples = int(sample_rate * duration)
        silence = np.zeros(samples, dtype=np.int16)
        
        # Create WAV header
        header = self._create_wav_header(len(silence) * 2, sample_rate)
        audio_bytes = header + silence.tobytes()
        
        return SynthesisResult(
            audio_bytes=audio_bytes,
            format="wav",
            duration=duration,
            sample_rate=sample_rate,
            provider="fallback",
            voice_id="silent",
        )
    
    def _create_wav_header(
        self,
        data_size: int,
        sample_rate: int,
        num_channels: int = 1,
        bits_per_sample: int = 16,
    ) -> bytes:
        """Create a WAV file header."""
        byte_rate = sample_rate * num_channels * bits_per_sample // 8
        block_align = num_channels * bits_per_sample // 8

        header = bytearray()
        header.extend(b'RIFF')
        header.extend((data_size + 36).to_bytes(4, 'little'))
        header.extend(b'WAVE')
        header.extend(b'fmt ')
        header.extend((16).to_bytes(4, 'little'))
        header.extend((1).to_bytes(2, 'little'))
        header.extend(num_channels.to_bytes(2, 'little'))
        header.extend(sample_rate.to_bytes(4, 'little'))
        header.extend(byte_rate.to_bytes(4, 'little'))
        header.extend(block_align.to_bytes(2, 'little'))
        header.extend(bits_per_sample.to_bytes(2, 'little'))
        header.extend(b'data')
        header.extend(data_size.to_bytes(4, 'little'))

        return bytes(header)
    
    # ==================== Provider Implementations ====================
    
    def _synthesize_coqui_local(
        self,
        text: str,
        voice: str = "default",
        speed: float = 1.0,
        language: str = "en",
    ) -> SynthesisResult:
        """Synthesize using local Coqui TTS model."""
        from TTS.api import TTS
        import wave
        
        # Load model
        model_name = self.config.tts_model_name
        tts = TTS(model_name=model_name, progress_bar=False)
        
        # Generate to temp file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            temp_path = f.name
        
        try:
            tts.tts_to_file(text=text, file_path=temp_path, speed=speed)
            
            # Read generated audio
            with open(temp_path, "rb") as f:
                audio_bytes = f.read()
            
            # Get duration
            with wave.open(temp_path, 'rb') as wav_file:
                frames = wav_file.getnframes()
                rate = wav_file.getframerate()
                duration = frames / float(rate)
            
            return SynthesisResult(
                audio_bytes=audio_bytes,
                format="wav",
                duration=duration,
                sample_rate=rate,
                provider="coqui_local",
                voice_id=voice,
            )
        finally:
            if os.path.exists(temp_path):
                os.unlink(temp_path)
    
    # OpenAI TTS voice map — expanded for K-12 education contexts
    OPENAI_VOICE_MAP = {
        "default": "alloy",
        "male": "onyx",
        "female": "nova",
        "child_friendly": "shimmer",
        "clara": "nova",
        "james": "onyx",
        "narrator": "fable",
        "storyteller": "fable",
        "tutor": "echo",
        "reading_buddy": "shimmer",
        "alloy": "alloy",
        "echo": "echo",
        "nova": "nova",
        "shimmer": "shimmer",
        "fable": "fable",
        "onyx": "onyx",
    }

    # Style instructions for emotion/tone steering (gpt-4o-mini-tts)
    OPENAI_STYLE_INSTRUCTIONS: Dict[str, str] = {
        "encouraging": "Speak in a warm, encouraging tone suitable for a young student. "
                       "Use positive reinforcement and gentle pacing.",
        "calm": "Speak in a calm, soothing, and measured voice. Keep the pace slow "
                "and steady, ideal for bedtime stories or relaxation.",
        "excited": "Speak with enthusiasm and excitement, as if sharing an amazing "
                   "discovery with a student. Slightly faster pacing.",
        "professional": "Speak in a clear, professional tone suitable for formal "
                        "educational content and assessments.",
        "empathetic": "Speak with empathy and understanding, as if comforting a "
                      "student who is struggling. Gentle and patient.",
        "neutral": "Speak in a clear, neutral tone at a moderate pace.",
        "storytelling": "Speak as an engaging storyteller, varying pace and emphasis "
                        "to bring characters and events to life.",
    }

    def _synthesize_openai_api(
        self,
        text: str,
        voice: str = "default",
        speed: float = 1.0,
        language: str = "en",
        style: Optional[str] = None,
    ) -> SynthesisResult:
        """Synthesize using OpenAI TTS API (gpt-4o-mini-tts with emotion steering)."""
        import httpx

        openai_voice = self.OPENAI_VOICE_MAP.get(voice, "alloy")

        # Build request payload — primary model: gpt-4o-mini-tts
        payload: Dict[str, Any] = {
            "model": "gpt-4o-mini-tts",
            "input": text,
            "voice": openai_voice,
            "speed": speed,
            "response_format": "wav",
        }

        # Apply style / emotion steering via instructions field
        style_key = style or "encouraging"  # K-12 default
        instructions = self.OPENAI_STYLE_INSTRUCTIONS.get(
            style_key, self.OPENAI_STYLE_INSTRUCTIONS["neutral"]
        )
        payload["instructions"] = instructions

        try:
            response = httpx.post(
                "https://api.openai.com/v1/audio/speech",
                headers={"Authorization": f"Bearer {self.config.openai_api_key}"},
                json=payload,
                timeout=60.0,
            )
            response.raise_for_status()
        except Exception as primary_err:
            # Fallback to tts-1-hd if gpt-4o-mini-tts fails
            logger.warning(
                "gpt-4o-mini-tts failed (%s), falling back to tts-1-hd", primary_err
            )
            fallback_payload = {
                "model": "tts-1-hd",
                "input": text,
                "voice": openai_voice,
                "speed": speed,
                "response_format": "wav",
            }
            response = httpx.post(
                "https://api.openai.com/v1/audio/speech",
                headers={"Authorization": f"Bearer {self.config.openai_api_key}"},
                json=fallback_payload,
                timeout=60.0,
            )
            response.raise_for_status()

        audio_bytes = response.content

        # Estimate duration (OpenAI TTS ~150 words/min)
        word_count = len(text.split())
        duration = (word_count / 150) * 60 / speed

        return SynthesisResult(
            audio_bytes=audio_bytes,
            format="wav",
            duration=duration,
            sample_rate=24000,  # OpenAI TTS uses 24 kHz
            provider="openai_api",
            voice_id=openai_voice,
        )
    
    def _synthesize_google_cloud(
        self,
        text: str,
        voice: str = "default",
        speed: float = 1.0,
        language: str = "en",
    ) -> SynthesisResult:
        """Synthesize using Google Cloud Text-to-Speech."""
        import httpx
        
        # Map voice and language
        lang_code = f"{language}-US" if language == "en" else language
        voice_map = {
            "default": f"{lang_code}-Standard-A",
            "male": f"{lang_code}-Standard-B",
            "female": f"{lang_code}-Standard-C",
        }
        google_voice = voice_map.get(voice, f"{lang_code}-Standard-A")
        
        response = httpx.post(
            "https://texttospeech.googleapis.com/v1/text:synthesize",
            params={"key": self.config.google_cloud_key},
            json={
                "input": {"text": text},
                "voice": {
                    "languageCode": lang_code,
                    "name": google_voice,
                },
                "audioConfig": {
                    "audioEncoding": "LINEAR16",
                    "speakingRate": speed,
                    "sampleRateHertz": 22050,
                },
            },
            timeout=60.0,
        )
        
        response.raise_for_status()
        data = response.json()
        
        audio_bytes = base64.b64decode(data["audioContent"])
        
        # Estimate duration
        words = len(text.split())
        duration = (words / 150) * 60 / speed
        
        return SynthesisResult(
            audio_bytes=audio_bytes,
            format="wav",
            duration=duration,
            sample_rate=22050,
            provider="google_cloud",
            voice_id=google_voice,
        )
    
    def _synthesize_azure(
        self,
        text: str,
        voice: str = "default",
        speed: float = 1.0,
        language: str = "en",
    ) -> SynthesisResult:
        """Synthesize using Azure Speech Services."""
        import httpx
        
        # Map voice
        voice_map = {
            "default": "en-US-JennyNeural",
            "male": "en-US-GuyNeural",
            "female": "en-US-JennyNeural",
            "child_friendly": "en-US-AnaNeural",
        }
        azure_voice = voice_map.get(voice, "en-US-JennyNeural")
        
        # Build SSML
        rate_percent = int((speed - 1) * 100)
        rate_str = f"+{rate_percent}%" if rate_percent >= 0 else f"{rate_percent}%"
        
        ssml = f"""<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='{language}'>
            <voice name='{azure_voice}'>
                <prosody rate='{rate_str}'>{text}</prosody>
            </voice>
        </speak>"""
        
        endpoint = f"https://{self.config.azure_region}.tts.speech.microsoft.com/cognitiveservices/v1"
        
        response = httpx.post(
            endpoint,
            headers={
                "Ocp-Apim-Subscription-Key": self.config.azure_key,
                "Content-Type": "application/ssml+xml",
                "X-Microsoft-OutputFormat": "riff-22050hz-16bit-mono-pcm",
            },
            content=ssml,
            timeout=60.0,
        )
        
        response.raise_for_status()
        audio_bytes = response.content
        
        # Estimate duration
        words = len(text.split())
        duration = (words / 150) * 60 / speed
        
        return SynthesisResult(
            audio_bytes=audio_bytes,
            format="wav",
            duration=duration,
            sample_rate=22050,
            provider="azure",
            voice_id=azure_voice,
        )
    
    def _synthesize_elevenlabs(
        self,
        text: str,
        voice: str = "default",
        speed: float = 1.0,
        language: str = "en",
    ) -> SynthesisResult:
        """Synthesize using ElevenLabs."""
        import httpx
        
        # ElevenLabs voice IDs
        voice_map = {
            "default": "21m00Tcm4TlvDq8ikWAM",  # Rachel
            "male": "VR6AewLTigWG4xSOukaG",      # Arnold
            "female": "21m00Tcm4TlvDq8ikWAM",    # Rachel
        }
        voice_id = voice_map.get(voice, "21m00Tcm4TlvDq8ikWAM")
        
        response = httpx.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
            headers={
                "xi-api-key": self.config.elevenlabs_key,
                "Content-Type": "application/json",
            },
            json={
                "text": text,
                "model_id": "eleven_monolingual_v1",
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.75,
                },
            },
            timeout=60.0,
        )
        
        response.raise_for_status()
        audio_bytes = response.content
        
        # Estimate duration
        words = len(text.split())
        duration = (words / 150) * 60 / speed
        
        return SynthesisResult(
            audio_bytes=audio_bytes,
            format="mp3",  # ElevenLabs returns mp3
            duration=duration,
            sample_rate=44100,
            provider="elevenlabs",
            voice_id=voice_id,
        )
    
    def _synthesize_amazon_polly(
        self,
        text: str,
        voice: str = "default",
        speed: float = 1.0,
        language: str = "en",
    ) -> SynthesisResult:
        """Synthesize using Amazon Polly."""
        import boto3
        
        polly = boto3.client(
            "polly",
            aws_access_key_id=self.config.aws_access_key,
            aws_secret_access_key=self.config.aws_secret_key,
            region_name=self.config.aws_region,
        )
        
        # Map voice
        voice_map = {
            "default": "Joanna",
            "male": "Matthew",
            "female": "Joanna",
            "child_friendly": "Ivy",
        }
        polly_voice = voice_map.get(voice, "Joanna")
        
        # Build SSML for speed
        if speed != 1.0:
            rate_percent = int(speed * 100)
            text = f"<speak><prosody rate='{rate_percent}%'>{text}</prosody></speak>"
            text_type = "ssml"
        else:
            text_type = "text"
        
        response = polly.synthesize_speech(
            Text=text,
            TextType=text_type,
            OutputFormat="pcm",
            VoiceId=polly_voice,
            SampleRate="22050",
            Engine="neural",
        )
        
        audio_bytes = response["AudioStream"].read()
        
        # Add WAV header to PCM data
        wav_header = self._create_wav_header(len(audio_bytes), 22050)
        audio_bytes = wav_header + audio_bytes
        
        # Estimate duration
        words = len(text.split())
        duration = (words / 150) * 60 / speed
        
        return SynthesisResult(
            audio_bytes=audio_bytes,
            format="wav",
            duration=duration,
            sample_rate=22050,
            provider="amazon_polly",
            voice_id=polly_voice,
        )


# Singleton instance
_tts_instance: Optional[MultiProviderTTS] = None


def get_multi_provider_tts() -> MultiProviderTTS:
    """Get the singleton MultiProviderTTS instance."""
    global _tts_instance
    if _tts_instance is None:
        _tts_instance = MultiProviderTTS()
    return _tts_instance
