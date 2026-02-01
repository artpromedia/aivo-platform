# Core module for accessibility-ai-svc
"""
Multi-provider AI infrastructure for resilient accessibility services.

This module provides automatic failover between multiple AI providers
(OpenAI, Google Cloud, Azure, Anthropic, local models) to ensure
the service remains functional even when individual providers are unavailable.
"""

from .config import (
    AccessibilityAIConfig,
    get_config,
    set_config,
    STTProvider,
    TTSProvider,
    VisionProvider,
    OCRProvider,
)

from .providers import (
    MultiProviderManager,
    ProviderResult,
    ProviderHealth,
    ProviderStatus,
)

from .stt_providers import (
    MultiProviderSTT,
    TranscriptionResult,
    get_multi_provider_stt,
)

from .tts_providers import (
    MultiProviderTTS,
    SynthesisResult,
    get_multi_provider_tts,
)

from .vision_providers import (
    MultiProviderVision,
    CaptionResult,
    OCRResult,
    get_multi_provider_vision,
)


__all__ = [
    # Config
    "AccessibilityAIConfig",
    "get_config",
    "set_config",
    "STTProvider",
    "TTSProvider",
    "VisionProvider",
    "OCRProvider",
    # Base providers
    "MultiProviderManager",
    "ProviderResult",
    "ProviderHealth",
    "ProviderStatus",
    # STT
    "MultiProviderSTT",
    "TranscriptionResult",
    "get_multi_provider_stt",
    # TTS
    "MultiProviderTTS",
    "SynthesisResult",
    "get_multi_provider_tts",
    # Vision
    "MultiProviderVision",
    "CaptionResult",
    "OCRResult",
    "get_multi_provider_vision",
]
