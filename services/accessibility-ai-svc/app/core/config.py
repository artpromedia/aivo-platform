"""
Configuration for accessibility-ai-svc.

Supports multiple AI providers with automatic failover.
"""
import os
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from enum import Enum


class STTProvider(Enum):
    """Speech-to-Text providers."""
    WHISPER_LOCAL = "whisper_local"      # OpenAI Whisper (local)
    OPENAI_API = "openai_api"            # OpenAI Whisper API
    GOOGLE_CLOUD = "google_cloud"        # Google Cloud Speech-to-Text
    AZURE = "azure"                      # Azure Speech Services
    DEEPGRAM = "deepgram"                # Deepgram
    ASSEMBLY_AI = "assembly_ai"          # AssemblyAI
    VOXTRAL_BATCH = "voxtral_batch"      # Mistral Voxtral (batch transcription)
    VOXTRAL_REALTIME = "voxtral_realtime"  # Mistral Voxtral (realtime streaming)


class TTSProvider(Enum):
    """Text-to-Speech providers."""
    COQUI_LOCAL = "coqui_local"          # Coqui TTS (local)
    OPENAI_API = "openai_api"            # OpenAI TTS API
    GOOGLE_CLOUD = "google_cloud"        # Google Cloud Text-to-Speech
    AZURE = "azure"                      # Azure Speech Services
    ELEVENLABS = "elevenlabs"            # ElevenLabs
    AMAZON_POLLY = "amazon_polly"        # Amazon Polly


class VisionProvider(Enum):
    """Vision/Image Analysis providers."""
    BLIP_LOCAL = "blip_local"            # BLIP (local)
    OPENAI_API = "openai_api"            # OpenAI GPT-4 Vision
    GOOGLE_CLOUD = "google_cloud"        # Google Cloud Vision
    AZURE = "azure"                      # Azure Computer Vision
    ANTHROPIC = "anthropic"              # Claude Vision
    REPLICATE = "replicate"              # Replicate (various models)


class OCRProvider(Enum):
    """OCR providers."""
    TESSERACT_LOCAL = "tesseract_local"  # Tesseract (local)
    GOOGLE_CLOUD = "google_cloud"        # Google Cloud Vision OCR
    AZURE = "azure"                      # Azure OCR
    AWS_TEXTRACT = "aws_textract"        # AWS Textract


@dataclass
class ProviderConfig:
    """Configuration for a single provider."""
    name: str
    enabled: bool = True
    priority: int = 0  # Lower = higher priority
    api_key: Optional[str] = None
    endpoint: Optional[str] = None
    model: Optional[str] = None
    timeout: float = 30.0
    max_retries: int = 2
    extra: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AccessibilityAIConfig:
    """Main configuration for accessibility AI service."""
    
    # Provider priority lists (in order of preference)
    stt_providers: List[STTProvider] = field(default_factory=lambda: [
        STTProvider.WHISPER_LOCAL,
        STTProvider.OPENAI_API,
        STTProvider.GOOGLE_CLOUD,
        STTProvider.AZURE,
    ])
    
    tts_providers: List[TTSProvider] = field(default_factory=lambda: [
        TTSProvider.OPENAI_API,
        TTSProvider.GOOGLE_CLOUD,
        TTSProvider.AZURE,
        TTSProvider.ELEVENLABS,
        TTSProvider.AMAZON_POLLY,
        TTSProvider.COQUI_LOCAL,
    ])
    
    vision_providers: List[VisionProvider] = field(default_factory=lambda: [
        VisionProvider.BLIP_LOCAL,
        VisionProvider.OPENAI_API,
        VisionProvider.GOOGLE_CLOUD,
        VisionProvider.AZURE,
    ])
    
    ocr_providers: List[OCRProvider] = field(default_factory=lambda: [
        OCRProvider.TESSERACT_LOCAL,
        OCRProvider.GOOGLE_CLOUD,
        OCRProvider.AZURE,
    ])
    
    # API Keys (loaded from environment)
    openai_api_key: Optional[str] = field(default_factory=lambda: os.getenv("OPENAI_API_KEY"))
    google_cloud_key: Optional[str] = field(default_factory=lambda: os.getenv("GOOGLE_CLOUD_API_KEY"))
    azure_key: Optional[str] = field(default_factory=lambda: os.getenv("AZURE_SPEECH_KEY"))
    azure_region: Optional[str] = field(default_factory=lambda: os.getenv("AZURE_SPEECH_REGION", "eastus"))
    elevenlabs_key: Optional[str] = field(default_factory=lambda: os.getenv("ELEVENLABS_API_KEY"))
    deepgram_key: Optional[str] = field(default_factory=lambda: os.getenv("DEEPGRAM_API_KEY"))
    assembly_ai_key: Optional[str] = field(default_factory=lambda: os.getenv("ASSEMBLY_AI_API_KEY"))
    anthropic_key: Optional[str] = field(default_factory=lambda: os.getenv("ANTHROPIC_API_KEY"))
    mistral_api_key: Optional[str] = field(default_factory=lambda: os.getenv("MISTRAL_API_KEY"))
    aws_access_key: Optional[str] = field(default_factory=lambda: os.getenv("AWS_ACCESS_KEY_ID"))
    aws_secret_key: Optional[str] = field(default_factory=lambda: os.getenv("AWS_SECRET_ACCESS_KEY"))
    aws_region: Optional[str] = field(default_factory=lambda: os.getenv("AWS_REGION", "us-east-1"))
    
    # Failover settings
    enable_failover: bool = True
    failover_timeout: float = 5.0  # Seconds before trying next provider
    max_failover_attempts: int = 3
    
    # Local model settings
    whisper_model_size: str = field(default_factory=lambda: os.getenv("WHISPER_MODEL_SIZE", "base"))
    tts_model_name: str = field(default_factory=lambda: os.getenv("TTS_MODEL_NAME", "tts_models/en/ljspeech/tacotron2-DDC"))
    blip_model_name: str = field(default_factory=lambda: os.getenv("BLIP_MODEL_NAME", "Salesforce/blip-image-captioning-base"))
    
    def get_available_stt_providers(self) -> List[STTProvider]:
        """Get STT providers that have required credentials."""
        available = []
        for provider in self.stt_providers:
            if provider == STTProvider.WHISPER_LOCAL:
                available.append(provider)
            elif provider == STTProvider.OPENAI_API and self.openai_api_key:
                available.append(provider)
            elif provider == STTProvider.GOOGLE_CLOUD and self.google_cloud_key:
                available.append(provider)
            elif provider == STTProvider.AZURE and self.azure_key:
                available.append(provider)
            elif provider == STTProvider.DEEPGRAM and self.deepgram_key:
                available.append(provider)
            elif provider == STTProvider.ASSEMBLY_AI and self.assembly_ai_key:
                available.append(provider)
            elif provider in (STTProvider.VOXTRAL_BATCH, STTProvider.VOXTRAL_REALTIME) and self.mistral_api_key:
                available.append(provider)
        return available
    
    def get_available_tts_providers(self) -> List[TTSProvider]:
        """Get TTS providers that have required credentials."""
        available = []
        for provider in self.tts_providers:
            if provider == TTSProvider.COQUI_LOCAL:
                available.append(provider)
            elif provider == TTSProvider.OPENAI_API and self.openai_api_key:
                available.append(provider)
            elif provider == TTSProvider.GOOGLE_CLOUD and self.google_cloud_key:
                available.append(provider)
            elif provider == TTSProvider.AZURE and self.azure_key:
                available.append(provider)
            elif provider == TTSProvider.ELEVENLABS and self.elevenlabs_key:
                available.append(provider)
            elif provider == TTSProvider.AMAZON_POLLY and self.aws_access_key:
                available.append(provider)
        return available
    
    def get_available_vision_providers(self) -> List[VisionProvider]:
        """Get Vision providers that have required credentials."""
        available = []
        for provider in self.vision_providers:
            if provider == VisionProvider.BLIP_LOCAL:
                available.append(provider)
            elif provider == VisionProvider.OPENAI_API and self.openai_api_key:
                available.append(provider)
            elif provider == VisionProvider.GOOGLE_CLOUD and self.google_cloud_key:
                available.append(provider)
            elif provider == VisionProvider.AZURE and self.azure_key:
                available.append(provider)
            elif provider == VisionProvider.ANTHROPIC and self.anthropic_key:
                available.append(provider)
        return available
    
    def get_available_ocr_providers(self) -> List[OCRProvider]:
        """Get OCR providers that have required credentials."""
        available = []
        for provider in self.ocr_providers:
            if provider == OCRProvider.TESSERACT_LOCAL:
                available.append(provider)
            elif provider == OCRProvider.GOOGLE_CLOUD and self.google_cloud_key:
                available.append(provider)
            elif provider == OCRProvider.AZURE and self.azure_key:
                available.append(provider)
            elif provider == OCRProvider.AWS_TEXTRACT and self.aws_access_key:
                available.append(provider)
        return available


# Global config instance
_config: Optional[AccessibilityAIConfig] = None


def get_config() -> AccessibilityAIConfig:
    """Get or create the global config instance."""
    global _config
    if _config is None:
        _config = AccessibilityAIConfig()
    return _config


def set_config(config: AccessibilityAIConfig) -> None:
    """Set the global config instance."""
    global _config
    _config = config
