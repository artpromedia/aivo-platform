"""
Piper TTS Microservice

Self-hosted text-to-speech engine with phoneme extraction for lip-sync.
Designed for the AIVO Learning Platform's AI tutor avatars.

Features:
- Neural TTS via Piper (offline, no API costs)
- Phoneme timing extraction for lip-sync
- Multiple voices per language
- WAV and MP3 output formats
- Sub-500ms latency for typical tutor responses
"""

import base64
import io
import logging
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Optional

import numpy as np
import soundfile as sf
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.config import settings
from app.phoneme_extractor import extract_phonemes_with_timing
from app.tts_engine import PiperTTSEngine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


app = FastAPI(
    title="AIVO TTS Engine",
    description="Self-hosted Piper TTS with phoneme extraction for lip-sync",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize TTS engine on startup
tts_engine: Optional[PiperTTSEngine] = None


@app.on_event("startup")
async def startup():
    global tts_engine
    logger.info("Loading Piper TTS engine...")
    tts_engine = PiperTTSEngine(models_dir=settings.MODELS_DIR)
    await tts_engine.load_default_voices()
    logger.info(
        "TTS engine ready with %d voices", len(tts_engine.available_voices)
    )


# ──────────────────────────────────────────────────────
# REQUEST / RESPONSE MODELS
# ──────────────────────────────────────────────────────


class SynthesizeRequest(BaseModel):
    text: str = Field(
        ..., min_length=1, max_length=5000,
        description="Text to synthesize",
    )
    voice: str = Field(
        default="en_US-amy-medium",
        description="Piper voice model name",
    )
    locale: str = Field(
        default="en-US", description="Locale for phonemization"
    )
    output_format: str = Field(
        default="wav", description="Output format: wav or mp3"
    )
    speaking_rate: float = Field(
        default=1.0, ge=0.5, le=2.0,
        description="Speaking rate multiplier",
    )
    include_phonemes: bool = Field(
        default=True, description="Include phoneme timing data"
    )


class PhonemeEvent(BaseModel):
    offset_ms: float = Field(
        description="Time offset from audio start in ms"
    )
    phoneme: str = Field(description="IPA phoneme string")
    duration_ms: float = Field(
        description="Duration of this phoneme in ms"
    )


class SynthesizeResponse(BaseModel):
    audio_base64: str = Field(description="Base64-encoded audio data")
    duration_ms: float = Field(description="Total audio duration in ms")
    sample_rate: int = Field(description="Audio sample rate")
    phonemes: list[PhonemeEvent] = Field(
        default_factory=list, description="Phoneme timing events"
    )
    format: str = Field(description="Audio format: wav or mp3")
    voice_used: str = Field(description="Voice model that was used")
    latency_ms: float = Field(description="Processing time in ms")


class VoiceInfo(BaseModel):
    name: str
    locale: str
    quality: str  # low, medium, high
    sample_rate: int
    description: str


# ──────────────────────────────────────────────────────
# ENDPOINTS
# ──────────────────────────────────────────────────────


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "tts-engine",
        "voices_loaded": (
            len(tts_engine.available_voices) if tts_engine else 0
        ),
    }


@app.get("/voices", response_model=list[VoiceInfo])
async def list_voices():
    """List all available TTS voice models."""
    if not tts_engine:
        raise HTTPException(
            status_code=503, detail="TTS engine not initialized"
        )

    voice_list = tts_engine.get_voice_list()
    return [VoiceInfo(**v) for v in voice_list]


@app.post("/synthesize", response_model=SynthesizeResponse)
async def synthesize(request: SynthesizeRequest):
    """
    Synthesize text to speech with phoneme timing for lip-sync.

    Returns base64-encoded audio and an array of phoneme events
    with precise timing offsets that map to avatar mouth positions.
    """
    if not tts_engine:
        raise HTTPException(
            status_code=503, detail="TTS engine not initialized"
        )

    start_time = time.perf_counter()

    try:
        # 1. Synthesize audio
        audio_data, sample_rate = await tts_engine.synthesize(
            text=request.text,
            voice=request.voice,
            speaking_rate=request.speaking_rate,
        )

        duration_ms = (
            (len(audio_data) / sample_rate) * 1000 if len(audio_data) else 0
        )

        # 2. Extract phoneme timings (if requested)
        phonemes: list[dict] = []
        if request.include_phonemes:
            phonemes = extract_phonemes_with_timing(
                text=request.text,
                locale=request.locale,
                audio_duration_ms=duration_ms,
            )

        # 3. Encode audio to requested format
        audio_buffer = io.BytesIO()

        if request.output_format == "mp3":
            # Write to WAV first then convert
            sf.write(audio_buffer, audio_data, sample_rate, format="WAV")
            audio_buffer.seek(0)
            audio_buffer = _convert_to_mp3(audio_buffer)
        else:
            sf.write(audio_buffer, audio_data, sample_rate, format="WAV")

        audio_buffer.seek(0)
        audio_base64 = base64.b64encode(audio_buffer.read()).decode("utf-8")

        latency_ms = (time.perf_counter() - start_time) * 1000

        logger.info(
            "Synthesized %d chars in %.0fms (%.0fms audio) voice=%s",
            len(request.text),
            latency_ms,
            duration_ms,
            request.voice,
        )

        return SynthesizeResponse(
            audio_base64=audio_base64,
            duration_ms=duration_ms,
            sample_rate=sample_rate,
            phonemes=[
                PhonemeEvent(
                    offset_ms=p["offset_ms"],
                    phoneme=p["phoneme"],
                    duration_ms=p["duration_ms"],
                )
                for p in phonemes
            ],
            format=request.output_format,
            voice_used=request.voice,
            latency_ms=round(latency_ms, 1),
        )

    except FileNotFoundError:
        voice_names = (
            [v["name"] for v in tts_engine.get_voice_list()]
            if tts_engine
            else []
        )
        raise HTTPException(
            status_code=404,
            detail=(
                f"Voice model '{request.voice}' not found. "
                f"Available: {voice_names}"
            ),
        )
    except Exception as e:
        logger.error("TTS synthesis failed: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Synthesis failed: {str(e)}"
        )


def _convert_to_mp3(wav_buffer: io.BytesIO) -> io.BytesIO:
    """Convert WAV buffer to MP3 using ffmpeg."""
    with tempfile.NamedTemporaryFile(
        suffix=".wav", delete=False
    ) as tmp_wav:
        tmp_wav.write(wav_buffer.read())
        tmp_wav_path = tmp_wav.name

    tmp_mp3_path = tmp_wav_path.replace(".wav", ".mp3")

    subprocess.run(
        [
            "ffmpeg", "-y", "-i", tmp_wav_path,
            "-codec:a", "libmp3lame", "-qscale:a", "4",
            tmp_mp3_path,
        ],
        capture_output=True,
        check=True,
    )

    mp3_buffer = io.BytesIO()
    with open(tmp_mp3_path, "rb") as f:
        mp3_buffer.write(f.read())

    # Cleanup temp files
    Path(tmp_wav_path).unlink(missing_ok=True)
    Path(tmp_mp3_path).unlink(missing_ok=True)

    mp3_buffer.seek(0)
    return mp3_buffer
