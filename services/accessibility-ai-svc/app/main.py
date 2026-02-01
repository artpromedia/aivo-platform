"""Accessibility AI Service - FastAPI Application"""
import logging
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Body, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field

from .models import (
    SpeechToText,
    TextToSpeech,
    AltTextGenerator,
    TextSimplifier,
    ReadingAssistant,
)
from .services import AccessibilityProfileManager

# Multi-provider imports for resilient AI operations
from .core import (
    get_config,
    get_multi_provider_stt,
    get_multi_provider_tts,
    get_multi_provider_vision,
    MultiProviderSTT,
    MultiProviderTTS,
    MultiProviderVision,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize models and services
stt_engine: Optional[SpeechToText] = None
tts_engine: Optional[TextToSpeech] = None
alt_text_generator: Optional[AltTextGenerator] = None
text_simplifier: Optional[TextSimplifier] = None
reading_assistant: Optional[ReadingAssistant] = None
profile_manager: Optional[AccessibilityProfileManager] = None

# Multi-provider services for resilient operations
multi_stt: Optional[MultiProviderSTT] = None
multi_tts: Optional[MultiProviderTTS] = None
multi_vision: Optional[MultiProviderVision] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    global stt_engine, tts_engine, alt_text_generator
    global text_simplifier, reading_assistant, profile_manager
    global multi_stt, multi_tts, multi_vision

    logger.info("Initializing Accessibility AI Service...")

    # Initialize all models and services
    stt_engine = SpeechToText(model_size="base")
    tts_engine = TextToSpeech()
    alt_text_generator = AltTextGenerator()
    text_simplifier = TextSimplifier()
    reading_assistant = ReadingAssistant()
    profile_manager = AccessibilityProfileManager()

    # Initialize multi-provider services for resilience
    try:
        multi_stt = get_multi_provider_stt()
        multi_tts = get_multi_provider_tts()
        multi_vision = get_multi_provider_vision()
        logger.info("Multi-provider services initialized for resilient operations")
    except Exception as e:
        logger.warning(f"Multi-provider services initialization failed: {e}")
        logger.warning("Falling back to single-provider mode")

    logger.info("All models and services initialized successfully")

    yield

    logger.info("Shutting down Accessibility AI Service...")


app = FastAPI(
    title="Accessibility AI Service",
    description="""
AI-powered accessibility features for inclusive learning.

## Features

- **Speech-to-Text**: Convert speech to text with multi-language support
- **Text-to-Speech**: Generate natural speech with multiple voices
- **Alt-text Generation**: Generate image descriptions for accessibility
- **Content Simplification**: Simplify complex text for different reading levels
- **Reading Assistance**: Dyslexia-friendly and other accessibility formatting
- **Profile Management**: Manage learner accessibility preferences
    """,
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response Models
class TextToSpeechRequest(BaseModel):
    """Request for text-to-speech synthesis."""
    text: str = Field(..., description="Text to synthesize")
    voice: str = Field(default="default", description="Voice ID to use")
    speed: float = Field(default=1.0, ge=0.25, le=4.0, description="Speech speed")
    language: str = Field(default="en", description="Language code")


class TextToSpeechResponse(BaseModel):
    """Response from text-to-speech synthesis."""
    format: str
    duration: float
    sample_rate: int
    voice_id: str
    text_length: int
    audio_size_bytes: int


class SimplificationRequest(BaseModel):
    """Request for text simplification."""
    text: str = Field(..., description="Text to simplify")
    target_grade: int = Field(default=5, ge=1, le=12, description="Target grade level")
    preserve_meaning: bool = Field(default=True, description="Prioritize meaning preservation")


class SimplificationResponse(BaseModel):
    """Response from text simplification."""
    text: str
    original_grade: float
    simplified_grade: float
    changes_made: List[str]
    word_count_original: int
    word_count_simplified: int


class ReadingAssistRequest(BaseModel):
    """Request for reading assistance."""
    text: str = Field(..., description="Text to format")
    profile: str = Field(default="default", description="Reading profile")


class ReadingAssistResponse(BaseModel):
    """Response from reading assistance."""
    html: str
    styles: Dict[str, str]
    word_count: int
    estimated_reading_time: float
    chunks: List[str]


class ProfileCreateRequest(BaseModel):
    """Request to create accessibility profile."""
    learner_id: str = Field(..., description="Unique learner identifier")
    needs: Optional[List[Dict[str, Any]]] = Field(default=None, description="Accessibility needs")
    visual_preferences: Optional[Dict[str, Any]] = None
    audio_preferences: Optional[Dict[str, Any]] = None
    cognitive_preferences: Optional[Dict[str, Any]] = None
    input_preferences: Optional[Dict[str, Any]] = None


class ProfileUpdateRequest(BaseModel):
    """Request to update accessibility profile."""
    visual_preferences: Optional[Dict[str, Any]] = None
    audio_preferences: Optional[Dict[str, Any]] = None
    cognitive_preferences: Optional[Dict[str, Any]] = None
    input_preferences: Optional[Dict[str, Any]] = None
    needs: Optional[List[Dict[str, Any]]] = None


# Health Check
@app.get("/health")
async def health() -> Dict[str, Any]:
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "accessibility-ai-svc",
        "models_loaded": {
            "stt": stt_engine is not None,
            "tts": tts_engine is not None,
            "alt_text": alt_text_generator is not None,
            "simplifier": text_simplifier is not None,
            "reading_assistant": reading_assistant is not None,
            "profile_manager": profile_manager is not None,
        },
        "multi_provider": {
            "enabled": multi_stt is not None,
            "stt": multi_stt is not None,
            "tts": multi_tts is not None,
            "vision": multi_vision is not None,
        },
    }


@app.get("/health/providers")
async def provider_health() -> Dict[str, Any]:
    """
    Detailed health status of all AI providers.
    
    Returns health information for each provider including:
    - Status (healthy/degraded/unhealthy)
    - Consecutive failures
    - Average latency
    - Last success/failure timestamps
    """
    result = {
        "multi_provider_enabled": multi_stt is not None,
        "providers": {},
    }
    
    if multi_stt:
        result["providers"]["stt"] = multi_stt.get_health()
    
    if multi_tts:
        result["providers"]["tts"] = multi_tts.get_health()
    
    if multi_vision:
        result["providers"]["vision"] = multi_vision.get_health()
    
    return result


# Speech-to-Text Endpoints
@app.post("/api/v1/stt/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    language: Optional[str] = Query(None, description="Language code (auto-detect if not specified)"),
) -> Dict[str, Any]:
    """
    Transcribe audio to text.

    Supports multiple audio formats (WAV, MP3, OGG, FLAC, WEBM).
    Returns transcription with confidence scores and word-level timestamps.
    """
    if not stt_engine:
        raise HTTPException(status_code=503, detail="STT engine not initialized")

    try:
        audio_bytes = await audio.read()

        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Empty audio file")

        result = stt_engine.transcribe(audio_bytes, language=language)

        return {
            "text": result.text,
            "confidence": result.confidence,
            "language": result.language,
            "duration": result.duration,
            "words": result.words,
            "segments": result.segments,
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail="Transcription failed")


@app.post("/api/v1/stt/detect-language")
async def detect_language(audio: UploadFile = File(...)) -> Dict[str, Any]:
    """Detect the language spoken in audio."""
    if not stt_engine:
        raise HTTPException(status_code=503, detail="STT engine not initialized")

    try:
        audio_bytes = await audio.read()

        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Empty audio file")

        result = stt_engine.detect_language(audio_bytes)

        return {
            "language": result.language,
            "confidence": result.confidence,
            "alternatives": result.alternatives,
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Language detection error: {e}")
        raise HTTPException(status_code=500, detail="Language detection failed")


@app.get("/api/v1/stt/languages")
async def list_stt_languages() -> Dict[str, Any]:
    """List supported languages for speech-to-text."""
    if not stt_engine:
        raise HTTPException(status_code=503, detail="STT engine not initialized")

    return {
        "languages": stt_engine.get_supported_languages(),
    }


# Text-to-Speech Endpoints
@app.post("/api/v1/tts/synthesize")
async def synthesize(request: TextToSpeechRequest) -> Response:
    """
    Synthesize speech from text.

    Returns audio file in WAV format with metadata in headers.
    """
    if not tts_engine:
        raise HTTPException(status_code=503, detail="TTS engine not initialized")

    try:
        result = tts_engine.synthesize(
            text=request.text,
            voice=request.voice,
            speed=request.speed,
        )

        return Response(
            content=result.audio_bytes,
            media_type="audio/wav",
            headers={
                "X-Duration": str(result.duration),
                "X-Sample-Rate": str(result.sample_rate),
                "X-Voice-ID": result.voice_id,
                "X-Text-Length": str(result.text_length),
            },
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Synthesis error: {e}")
        raise HTTPException(status_code=500, detail="Speech synthesis failed")


@app.post("/api/v1/tts/synthesize-metadata")
async def synthesize_metadata(request: TextToSpeechRequest) -> TextToSpeechResponse:
    """
    Synthesize speech and return metadata only (no audio).

    Useful for estimating duration and validating parameters.
    """
    if not tts_engine:
        raise HTTPException(status_code=503, detail="TTS engine not initialized")

    try:
        result = tts_engine.synthesize(
            text=request.text,
            voice=request.voice,
            speed=request.speed,
        )

        return TextToSpeechResponse(
            format=result.format,
            duration=result.duration,
            sample_rate=result.sample_rate,
            voice_id=result.voice_id,
            text_length=result.text_length,
            audio_size_bytes=len(result.audio_bytes),
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Synthesis error: {e}")
        raise HTTPException(status_code=500, detail="Speech synthesis failed")


@app.get("/api/v1/tts/voices")
async def list_voices(
    language: Optional[str] = Query(None, description="Filter by language"),
) -> Dict[str, Any]:
    """List available TTS voices."""
    if not tts_engine:
        raise HTTPException(status_code=503, detail="TTS engine not initialized")

    voices = tts_engine.list_voices(language=language)

    return {"voices": voices}


# Alt-Text Generation Endpoints
@app.post("/api/v1/alt-text/generate")
async def generate_alt_text(
    image: UploadFile = File(...),
    context: Optional[str] = Query(None, description="Context about the image"),
) -> Dict[str, Any]:
    """
    Generate alt-text for image.

    Returns short and long descriptions with educational context.
    """
    if not alt_text_generator:
        raise HTTPException(status_code=503, detail="Alt-text generator not initialized")

    try:
        image_bytes = await image.read()

        if not image_bytes:
            raise HTTPException(status_code=400, detail="Empty image file")

        result = alt_text_generator.generate(image_bytes, context=context)

        return {
            "short_description": result.short_description,
            "long_description": result.long_description,
            "educational_context": result.educational_context,
            "image_type": result.image_type.value,
            "confidence": result.confidence,
            "detected_objects": result.detected_objects,
            "colors": result.colors,
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Alt-text generation error: {e}")
        raise HTTPException(status_code=500, detail="Alt-text generation failed")


@app.post("/api/v1/alt-text/describe")
async def describe_image(
    image: UploadFile = File(...),
    detail_level: str = Query(default="medium", description="Detail level (low, medium, high)"),
) -> Dict[str, Any]:
    """Describe image content in detail."""
    if not alt_text_generator:
        raise HTTPException(status_code=503, detail="Alt-text generator not initialized")

    try:
        image_bytes = await image.read()

        if not image_bytes:
            raise HTTPException(status_code=400, detail="Empty image file")

        result = alt_text_generator.describe_image(image_bytes, detail_level=detail_level)

        return result

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Image description error: {e}")
        raise HTTPException(status_code=500, detail="Image description failed")


@app.post("/api/v1/alt-text/extract-text")
async def extract_text_from_image(
    image: UploadFile = File(...),
    language: str = Query(default="en", description="Expected language"),
) -> Dict[str, Any]:
    """Extract text from image using OCR."""
    if not alt_text_generator:
        raise HTTPException(status_code=503, detail="Alt-text generator not initialized")

    try:
        image_bytes = await image.read()

        if not image_bytes:
            raise HTTPException(status_code=400, detail="Empty image file")

        result = alt_text_generator.extract_text_from_image(image_bytes, language=language)

        return result

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Text extraction error: {e}")
        raise HTTPException(status_code=500, detail="Text extraction failed")


# Text Simplification Endpoints
@app.post("/api/v1/simplify")
async def simplify_text(request: SimplificationRequest) -> SimplificationResponse:
    """
    Simplify complex text.

    Reduces reading level by replacing complex words and splitting sentences.
    """
    if not text_simplifier:
        raise HTTPException(status_code=503, detail="Text simplifier not initialized")

    try:
        result = text_simplifier.simplify(
            text=request.text,
            target_grade=request.target_grade,
            preserve_meaning=request.preserve_meaning,
        )

        return SimplificationResponse(
            text=result.text,
            original_grade=result.original_grade,
            simplified_grade=result.simplified_grade,
            changes_made=result.changes_made,
            word_count_original=result.word_count_original,
            word_count_simplified=result.word_count_simplified,
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Simplification error: {e}")
        raise HTTPException(status_code=500, detail="Text simplification failed")


@app.post("/api/v1/simplify/explain-terms")
async def explain_terms(
    text: str = Body(..., embed=True),
    terms: Optional[List[str]] = Body(None, embed=True),
    target_grade: int = Body(default=5, embed=True),
) -> Dict[str, Any]:
    """Explain difficult terms in text."""
    if not text_simplifier:
        raise HTTPException(status_code=503, detail="Text simplifier not initialized")

    try:
        explanations = text_simplifier.explain_terms(
            text=text,
            terms=terms,
            target_grade=target_grade,
        )

        return {
            "explanations": {
                term: {
                    "term": exp.term,
                    "definition": exp.definition,
                    "simplified_definition": exp.simplified_definition,
                    "example_usage": exp.example_usage,
                    "related_terms": exp.related_terms,
                }
                for term, exp in explanations.items()
            }
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Term explanation error: {e}")
        raise HTTPException(status_code=500, detail="Term explanation failed")


@app.post("/api/v1/simplify/readability")
async def get_readability_metrics(text: str = Body(..., embed=True)) -> Dict[str, Any]:
    """Get readability metrics for text."""
    if not text_simplifier:
        raise HTTPException(status_code=503, detail="Text simplifier not initialized")

    try:
        metrics = text_simplifier.get_readability_metrics(text)
        return {"metrics": metrics}

    except Exception as e:
        logger.error(f"Readability analysis error: {e}")
        raise HTTPException(status_code=500, detail="Readability analysis failed")


# Reading Assistance Endpoints
@app.post("/api/v1/reading/assist")
async def reading_assist(request: ReadingAssistRequest) -> ReadingAssistResponse:
    """
    Apply reading assistance (dyslexia-friendly, etc.).

    Formats text according to the specified accessibility profile.
    """
    if not reading_assistant:
        raise HTTPException(status_code=503, detail="Reading assistant not initialized")

    try:
        result = reading_assistant.format(
            text=request.text,
            profile=request.profile,
        )

        return ReadingAssistResponse(
            html=result.html,
            styles=result.styles,
            word_count=result.word_count,
            estimated_reading_time=result.estimated_reading_time,
            chunks=result.chunks,
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Reading assist error: {e}")
        raise HTTPException(status_code=500, detail="Reading assistance failed")


@app.post("/api/v1/reading/highlight")
async def highlight_important(
    text: str = Body(..., embed=True),
    custom_words: Optional[List[str]] = Body(None, embed=True),
) -> Dict[str, Any]:
    """Highlight important words in text."""
    if not reading_assistant:
        raise HTTPException(status_code=503, detail="Reading assistant not initialized")

    try:
        result = reading_assistant.highlight_important_words(
            text=text,
            custom_words=custom_words,
        )

        return {
            "html": result.html,
            "important_words": result.important_words,
            "highlight_count": result.highlight_count,
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Highlight error: {e}")
        raise HTTPException(status_code=500, detail="Highlighting failed")


@app.post("/api/v1/reading/pace")
async def suggest_pace(
    text: str = Body(..., embed=True),
    profile: Optional[str] = Body(None, embed=True),
) -> Dict[str, Any]:
    """Suggest reading pace and breaks."""
    if not reading_assistant:
        raise HTTPException(status_code=503, detail="Reading assistant not initialized")

    try:
        result = reading_assistant.suggest_reading_pace(
            text=text,
            reader_profile=profile,
        )

        return {
            "words_per_minute": result.words_per_minute,
            "suggested_breaks": result.suggested_breaks,
            "chunk_size": result.chunk_size,
            "estimated_total_time": result.estimated_total_time,
            "difficulty_level": result.difficulty_level,
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Pace suggestion error: {e}")
        raise HTTPException(status_code=500, detail="Pace suggestion failed")


@app.get("/api/v1/reading/profiles")
async def list_reading_profiles() -> Dict[str, Any]:
    """List available reading assistance profiles."""
    if not reading_assistant:
        raise HTTPException(status_code=503, detail="Reading assistant not initialized")

    return {"profiles": reading_assistant.list_profiles()}


# Profile Management Endpoints
@app.post("/api/v1/profiles")
async def create_profile(request: ProfileCreateRequest) -> Dict[str, Any]:
    """Create accessibility profile for a learner."""
    if not profile_manager:
        raise HTTPException(status_code=503, detail="Profile manager not initialized")

    try:
        profile = profile_manager.create_profile(
            learner_id=request.learner_id,
            needs=request.needs,
            visual_preferences=request.visual_preferences,
            audio_preferences=request.audio_preferences,
            cognitive_preferences=request.cognitive_preferences,
            input_preferences=request.input_preferences,
        )

        return profile_manager._profile_to_dict(profile)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Profile creation error: {e}")
        raise HTTPException(status_code=500, detail="Profile creation failed")


@app.get("/api/v1/profiles/{learner_id}")
async def get_profile(learner_id: str) -> Dict[str, Any]:
    """Get learner's accessibility profile."""
    if not profile_manager:
        raise HTTPException(status_code=503, detail="Profile manager not initialized")

    try:
        profile = profile_manager.get_profile(learner_id)

        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")

        return profile

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Profile retrieval error: {e}")
        raise HTTPException(status_code=500, detail="Profile retrieval failed")


@app.put("/api/v1/profiles/{learner_id}")
async def update_profile(
    learner_id: str,
    request: ProfileUpdateRequest,
) -> Dict[str, Any]:
    """Update learner's accessibility profile."""
    if not profile_manager:
        raise HTTPException(status_code=503, detail="Profile manager not initialized")

    try:
        settings = {}
        if request.visual_preferences:
            settings["visual_preferences"] = request.visual_preferences
        if request.audio_preferences:
            settings["audio_preferences"] = request.audio_preferences
        if request.cognitive_preferences:
            settings["cognitive_preferences"] = request.cognitive_preferences
        if request.input_preferences:
            settings["input_preferences"] = request.input_preferences
        if request.needs:
            settings["needs"] = request.needs

        return profile_manager.update_profile(learner_id, settings)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Profile update error: {e}")
        raise HTTPException(status_code=500, detail="Profile update failed")


@app.delete("/api/v1/profiles/{learner_id}")
async def delete_profile(learner_id: str) -> Dict[str, Any]:
    """Delete learner's accessibility profile."""
    if not profile_manager:
        raise HTTPException(status_code=503, detail="Profile manager not initialized")

    try:
        deleted = profile_manager.delete_profile(learner_id)

        if not deleted:
            raise HTTPException(status_code=404, detail="Profile not found")

        return {"status": "deleted", "learner_id": learner_id}

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Profile deletion error: {e}")
        raise HTTPException(status_code=500, detail="Profile deletion failed")


@app.get("/api/v1/profiles/{learner_id}/recommendations")
async def get_recommendations(
    learner_id: str,
    needs: Optional[List[str]] = Query(None, description="Additional needs to consider"),
) -> Dict[str, Any]:
    """Get recommended settings based on learner's profile and needs."""
    if not profile_manager:
        raise HTTPException(status_code=503, detail="Profile manager not initialized")

    try:
        return profile_manager.get_recommended_settings(
            learner_id=learner_id,
            needs=needs,
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Recommendations error: {e}")
        raise HTTPException(status_code=500, detail="Recommendations failed")


@app.get("/api/v1/profiles/needs/available")
async def list_available_needs() -> Dict[str, Any]:
    """List all available accessibility need types."""
    if not profile_manager:
        raise HTTPException(status_code=503, detail="Profile manager not initialized")

    return {"needs": profile_manager.list_available_needs()}


# =============================================================================
# Multi-Provider Resilient Endpoints (v2)
# =============================================================================
# These endpoints use automatic failover between multiple AI providers
# (OpenAI, Google Cloud, Azure, Anthropic, local models) to ensure
# the service remains functional even when individual providers are unavailable.

@app.post("/api/v2/stt/transcribe")
async def transcribe_resilient(
    audio: UploadFile = File(...),
    language: Optional[str] = Query(None, description="Language code (auto-detect if not specified)"),
    preferred_provider: Optional[str] = Query(None, description="Preferred provider (e.g., whisper_local, openai_api)"),
) -> Dict[str, Any]:
    """
    Transcribe audio to text with automatic provider failover.
    
    If the primary provider fails, automatically falls back to alternative providers.
    Supports: whisper_local, openai_api, google_cloud, azure, deepgram, assembly_ai
    """
    if not multi_stt:
        raise HTTPException(status_code=503, detail="Multi-provider STT not available")

    try:
        audio_bytes = await audio.read()

        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Empty audio file")

        result = multi_stt.transcribe(
            audio=audio_bytes,
            language=language,
            preferred_provider=preferred_provider,
        )

        return {
            "text": result.text,
            "confidence": result.confidence,
            "language": result.language,
            "duration": result.duration,
            "provider": result.provider,
            "words": result.words,
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Multi-provider transcription error: {e}")
        raise HTTPException(status_code=500, detail="Transcription failed across all providers")


@app.post("/api/v2/tts/synthesize")
async def synthesize_resilient(request: TextToSpeechRequest) -> Response:
    """
    Synthesize speech from text with automatic provider failover.
    
    If the primary provider fails, automatically falls back to alternative providers.
    Supports: coqui_local, openai_api, google_cloud, azure, elevenlabs, amazon_polly
    """
    if not multi_tts:
        raise HTTPException(status_code=503, detail="Multi-provider TTS not available")

    try:
        result = multi_tts.synthesize(
            text=request.text,
            voice=request.voice,
            speed=request.speed,
            language=request.language,
        )

        return Response(
            content=result.audio_bytes,
            media_type="audio/wav",
            headers={
                "X-Duration": str(result.duration),
                "X-Sample-Rate": str(result.sample_rate),
                "X-Voice-ID": result.voice_id,
                "X-Provider": result.provider,
                "X-Text-Length": str(len(request.text)),
            },
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Multi-provider synthesis error: {e}")
        raise HTTPException(status_code=500, detail="Speech synthesis failed across all providers")


@app.post("/api/v2/alt-text/generate")
async def generate_alt_text_resilient(
    image: UploadFile = File(...),
    context: Optional[str] = Query(None, description="Context about the image"),
    preferred_provider: Optional[str] = Query(None, description="Preferred provider (e.g., blip_local, openai_api)"),
) -> Dict[str, Any]:
    """
    Generate alt-text for image with automatic provider failover.
    
    If the primary provider fails, automatically falls back to alternative providers.
    Supports: blip_local, openai_api, google_cloud, azure, anthropic
    """
    if not multi_vision:
        raise HTTPException(status_code=503, detail="Multi-provider Vision not available")

    try:
        image_bytes = await image.read()

        if not image_bytes:
            raise HTTPException(status_code=400, detail="Empty image file")

        result = multi_vision.generate_caption(
            image=image_bytes,
            context=context,
            preferred_provider=preferred_provider,
        )

        return {
            "short_description": result.caption,
            "long_description": result.detailed_description or result.caption,
            "confidence": result.confidence,
            "provider": result.provider,
            "detected_objects": result.detected_objects,
            "detected_labels": result.detected_labels,
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Multi-provider alt-text generation error: {e}")
        raise HTTPException(status_code=500, detail="Alt-text generation failed across all providers")


@app.post("/api/v2/alt-text/extract-text")
async def extract_text_resilient(
    image: UploadFile = File(...),
    language: str = Query(default="en", description="Expected language"),
    preferred_provider: Optional[str] = Query(None, description="Preferred provider (e.g., tesseract_local, google_cloud)"),
) -> Dict[str, Any]:
    """
    Extract text from image using OCR with automatic provider failover.
    
    If the primary provider fails, automatically falls back to alternative providers.
    Supports: tesseract_local, google_cloud, azure, aws_textract
    """
    if not multi_vision:
        raise HTTPException(status_code=503, detail="Multi-provider Vision not available")

    try:
        image_bytes = await image.read()

        if not image_bytes:
            raise HTTPException(status_code=400, detail="Empty image file")

        result = multi_vision.extract_text(
            image=image_bytes,
            language=language,
            preferred_provider=preferred_provider,
        )

        return {
            "text": result.text,
            "confidence": result.confidence,
            "provider": result.provider,
            "language": result.language,
            "regions": result.regions,
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Multi-provider OCR error: {e}")
        raise HTTPException(status_code=500, detail="Text extraction failed across all providers")


@app.get("/api/v2/providers")
async def list_available_providers() -> Dict[str, Any]:
    """
    List all available AI providers for each service.
    
    Returns which providers are configured and available for STT, TTS, and Vision services.
    """
    config = get_config()
    
    return {
        "stt": {
            "available": [p.value for p in config.get_available_stt_providers()],
            "health": multi_stt.get_health() if multi_stt else {},
        },
        "tts": {
            "available": [p.value for p in config.get_available_tts_providers()],
            "health": multi_tts.get_health() if multi_tts else {},
        },
        "vision": {
            "available": [p.value for p in config.get_available_vision_providers()],
            "health": multi_vision.get_health().get("caption", {}) if multi_vision else {},
        },
        "ocr": {
            "available": [p.value for p in config.get_available_ocr_providers()],
            "health": multi_vision.get_health().get("ocr", {}) if multi_vision else {},
        },
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
