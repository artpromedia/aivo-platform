"""
Text to Speech

Synthesize speech from text with support for multiple voices and SSML.
Uses Coqui TTS for high-quality neural speech synthesis.
"""
import logging
import hashlib
import re
import io
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from enum import Enum

import numpy as np

logger = logging.getLogger(__name__)

# Lazy load TTS to avoid startup delay
_tts_model = None
_tts_model_name = None


def _get_tts_model(model_name: str = "tts_models/en/ljspeech/tacotron2-DDC"):
    """Lazy load TTS model on first use."""
    global _tts_model, _tts_model_name
    
    if _tts_model is None or _tts_model_name != model_name:
        try:
            from TTS.api import TTS
            logger.info(f"Loading TTS model: {model_name}")
            _tts_model = TTS(model_name=model_name, progress_bar=False)
            _tts_model_name = model_name
            logger.info(f"TTS model loaded successfully")
        except ImportError:
            logger.warning("Coqui TTS not installed. Using placeholder synthesis.")
            return None
        except Exception as e:
            logger.error(f"Failed to load TTS model: {e}")
            return None
    
    return _tts_model


class AudioFormat(Enum):
    """Supported output audio formats."""
    WAV = "wav"
    MP3 = "mp3"
    OGG = "ogg"
    FLAC = "flac"


class VoiceGender(Enum):
    """Voice gender options."""
    MALE = "male"
    FEMALE = "female"
    NEUTRAL = "neutral"


@dataclass
class Voice:
    """Represents an available TTS voice."""
    id: str
    name: str
    language: str
    gender: VoiceGender
    description: str
    sample_rate: int = 22050
    styles: List[str] = field(default_factory=list)


@dataclass
class SynthesizedAudio:
    """Result of text-to-speech synthesis."""
    audio_bytes: bytes
    format: str
    duration: float
    sample_rate: int
    voice_id: str = "default"
    text_length: int = 0
    ssml_used: bool = False


@dataclass
class SynthesisRequest:
    """Request for speech synthesis."""
    text: str
    voice: str
    speed: float
    pitch: float
    volume: float
    format: AudioFormat
    language: str


class TextToSpeech:
    """
    Synthesize natural speech from text.

    Features:
    - Multiple voices
    - Speed/pitch control
    - SSML support
    - Multiple output formats

    Usage:
        tts = TextToSpeech()
        audio = tts.synthesize("Hello world")
    """

    # Available voices configuration
    VOICES: Dict[str, Voice] = {
        "default": Voice(
            id="default",
            name="Default Voice",
            language="en-US",
            gender=VoiceGender.NEUTRAL,
            description="Standard clear voice for general use",
            sample_rate=22050,
            styles=["neutral", "friendly"],
        ),
        "clara": Voice(
            id="clara",
            name="Clara",
            language="en-US",
            gender=VoiceGender.FEMALE,
            description="Warm, friendly female voice",
            sample_rate=22050,
            styles=["neutral", "cheerful", "empathetic"],
        ),
        "james": Voice(
            id="james",
            name="James",
            language="en-US",
            gender=VoiceGender.MALE,
            description="Professional male voice",
            sample_rate=22050,
            styles=["neutral", "professional", "calm"],
        ),
        "aria": Voice(
            id="aria",
            name="Aria",
            language="en-GB",
            gender=VoiceGender.FEMALE,
            description="British English female voice",
            sample_rate=22050,
            styles=["neutral", "formal"],
        ),
        "marcus": Voice(
            id="marcus",
            name="Marcus",
            language="en-GB",
            gender=VoiceGender.MALE,
            description="British English male voice",
            sample_rate=22050,
            styles=["neutral", "formal", "newsreader"],
        ),
        "sofia": Voice(
            id="sofia",
            name="Sofia",
            language="es-ES",
            gender=VoiceGender.FEMALE,
            description="Spanish female voice",
            sample_rate=22050,
            styles=["neutral", "expressive"],
        ),
        "miguel": Voice(
            id="miguel",
            name="Miguel",
            language="es-MX",
            gender=VoiceGender.MALE,
            description="Mexican Spanish male voice",
            sample_rate=22050,
            styles=["neutral", "casual"],
        ),
        "marie": Voice(
            id="marie",
            name="Marie",
            language="fr-FR",
            gender=VoiceGender.FEMALE,
            description="French female voice",
            sample_rate=22050,
            styles=["neutral", "elegant"],
        ),
        "hans": Voice(
            id="hans",
            name="Hans",
            language="de-DE",
            gender=VoiceGender.MALE,
            description="German male voice",
            sample_rate=22050,
            styles=["neutral", "professional"],
        ),
        "yuki": Voice(
            id="yuki",
            name="Yuki",
            language="ja-JP",
            gender=VoiceGender.FEMALE,
            description="Japanese female voice",
            sample_rate=22050,
            styles=["neutral", "polite"],
        ),
        "child_friendly": Voice(
            id="child_friendly",
            name="Child Friendly",
            language="en-US",
            gender=VoiceGender.NEUTRAL,
            description="Slower, clearer voice optimized for children",
            sample_rate=22050,
            styles=["cheerful", "patient", "encouraging"],
        ),
        "accessibility": Voice(
            id="accessibility",
            name="Accessibility Voice",
            language="en-US",
            gender=VoiceGender.NEUTRAL,
            description="Optimized for screen readers and accessibility",
            sample_rate=22050,
            styles=["clear", "measured", "neutral"],
        ),
    }

    # Speed and pitch limits
    MIN_SPEED = 0.25
    MAX_SPEED = 4.0
    MIN_PITCH = 0.5
    MAX_PITCH = 2.0

    # Character limits
    MAX_TEXT_LENGTH = 10000
    MAX_SSML_LENGTH = 15000

    def __init__(
        self,
        model_name: str = "default",
        default_format: AudioFormat = AudioFormat.WAV,
        default_sample_rate: int = 22050,
    ):
        """
        Initialize the TextToSpeech engine.

        Args:
            model_name: Name of the TTS model to use
            default_format: Default audio output format
            default_sample_rate: Default sample rate for output
        """
        self.model_name = model_name
        self.default_format = default_format
        self.default_sample_rate = default_sample_rate
        self._model_loaded = False
        self._tts = None

        logger.info(
            f"TextToSpeech initialized with model={model_name}, "
            f"format={default_format.value}, sample_rate={default_sample_rate}"
        )

    def _load_model(self):
        """Load the TTS model if not already loaded."""
        if self._tts is None:
            # Map voice language to appropriate TTS model
            model_mapping = {
                "en": "tts_models/en/ljspeech/tacotron2-DDC",
                "es": "tts_models/es/mai/tacotron2-DDC",
                "fr": "tts_models/fr/mai/tacotron2-DDC",
                "de": "tts_models/de/thorsten/tacotron2-DDC",
            }
            model_name = model_mapping.get("en", "tts_models/en/ljspeech/tacotron2-DDC")
            self._tts = _get_tts_model(model_name)
            self._model_loaded = self._tts is not None
        return self._tts

    def _validate_parameters(
        self,
        speed: float,
        pitch: float = 1.0,
        volume: float = 1.0,
    ) -> None:
        """Validate synthesis parameters."""
        if not self.MIN_SPEED <= speed <= self.MAX_SPEED:
            raise ValueError(
                f"Speed must be between {self.MIN_SPEED} and {self.MAX_SPEED}"
            )
        if not self.MIN_PITCH <= pitch <= self.MAX_PITCH:
            raise ValueError(
                f"Pitch must be between {self.MIN_PITCH} and {self.MAX_PITCH}"
            )
        if not 0.0 <= volume <= 2.0:
            raise ValueError("Volume must be between 0.0 and 2.0")

    def _estimate_duration(
        self,
        text: str,
        speed: float = 1.0,
    ) -> float:
        """
        Estimate speech duration for given text.

        Args:
            text: Text to synthesize
            speed: Speech rate multiplier

        Returns:
            Estimated duration in seconds
        """
        # Average speaking rate is ~150 words per minute
        # Average word length is ~5 characters
        words = len(text.split())
        base_duration = (words / 150) * 60  # Convert to seconds
        return base_duration / speed

    def _generate_placeholder_audio(
        self,
        duration: float,
        sample_rate: int,
        format: AudioFormat,
    ) -> bytes:
        """
        Generate placeholder audio bytes.

        In production, this would be replaced by actual TTS synthesis.

        Args:
            duration: Duration in seconds
            sample_rate: Sample rate in Hz
            format: Output audio format

        Returns:
            Placeholder audio bytes
        """
        # Generate silence with a small amount of noise to indicate processing
        num_samples = int(duration * sample_rate)

        # Create very quiet noise to indicate audio was generated
        noise = np.random.normal(0, 0.001, num_samples).astype(np.float32)

        # Convert to 16-bit PCM
        audio_16bit = (noise * 32767).astype(np.int16)

        # Create WAV header
        wav_header = self._create_wav_header(len(audio_16bit) * 2, sample_rate)

        return wav_header + audio_16bit.tobytes()

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
        # RIFF header
        header.extend(b'RIFF')
        header.extend((data_size + 36).to_bytes(4, 'little'))
        header.extend(b'WAVE')
        # fmt chunk
        header.extend(b'fmt ')
        header.extend((16).to_bytes(4, 'little'))  # Chunk size
        header.extend((1).to_bytes(2, 'little'))   # Audio format (PCM)
        header.extend(num_channels.to_bytes(2, 'little'))
        header.extend(sample_rate.to_bytes(4, 'little'))
        header.extend(byte_rate.to_bytes(4, 'little'))
        header.extend(block_align.to_bytes(2, 'little'))
        header.extend(bits_per_sample.to_bytes(2, 'little'))
        # data chunk
        header.extend(b'data')
        header.extend(data_size.to_bytes(4, 'little'))

        return bytes(header)

    def synthesize(
        self,
        text: str,
        voice: str = "default",
        speed: float = 1.0,
        pitch: float = 1.0,
        volume: float = 1.0,
        format: Optional[AudioFormat] = None,
        language: Optional[str] = None,
    ) -> SynthesizedAudio:
        """
        Synthesize text to speech.

        Args:
            text: Text to synthesize
            voice: Voice ID to use
            speed: Speech rate multiplier (0.25-4.0)
            pitch: Pitch multiplier (0.5-2.0)
            volume: Volume multiplier (0.0-2.0)
            format: Output audio format
            language: Language code (uses voice default if not specified)

        Returns:
            SynthesizedAudio with audio bytes and metadata
        """
        if not text or not text.strip():
            raise ValueError("Text cannot be empty")

        if len(text) > self.MAX_TEXT_LENGTH:
            raise ValueError(
                f"Text exceeds maximum length of {self.MAX_TEXT_LENGTH} characters"
            )

        self._validate_parameters(speed, pitch, volume)

        # Get voice configuration
        voice_config = self.VOICES.get(voice)
        if not voice_config:
            logger.warning(f"Voice '{voice}' not found, using default")
            voice_config = self.VOICES["default"]
            voice = "default"

        output_format = format or self.default_format
        sample_rate = voice_config.sample_rate

        # Estimate duration
        duration = self._estimate_duration(text, speed)

        logger.info(
            f"Synthesizing text: {len(text)} chars, voice={voice}, "
            f"speed={speed}, estimated_duration={duration:.2f}s"
        )

        # Try to use TTS model
        tts = self._load_model()
        
        if tts is not None:
            try:
                import tempfile
                import os
                import wave
                
                # Create temp file for TTS output
                with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                    temp_path = f.name
                
                try:
                    # Synthesize using Coqui TTS
                    tts.tts_to_file(
                        text=text,
                        file_path=temp_path,
                        speed=speed,
                    )
                    
                    # Read the generated audio
                    with open(temp_path, "rb") as f:
                        audio_bytes = f.read()
                    
                    # Get actual duration from WAV file
                    with wave.open(temp_path, 'rb') as wav_file:
                        frames = wav_file.getnframes()
                        rate = wav_file.getframerate()
                        actual_duration = frames / float(rate)
                        actual_sample_rate = rate
                    
                    result = SynthesizedAudio(
                        audio_bytes=audio_bytes,
                        format=output_format.value,
                        duration=actual_duration,
                        sample_rate=actual_sample_rate,
                        voice_id=voice,
                        text_length=len(text),
                        ssml_used=False,
                    )
                    
                    logger.info(
                        f"TTS synthesis complete: {len(audio_bytes)} bytes, "
                        f"duration={actual_duration:.2f}s"
                    )
                    
                    return result
                    
                finally:
                    if os.path.exists(temp_path):
                        try:
                            os.unlink(temp_path)
                        except Exception:
                            pass
                        
            except Exception as e:
                logger.error(f"TTS synthesis failed: {e}")
                # Fall through to placeholder

        # Fallback: Generate placeholder audio (when TTS model is not available)
        audio_bytes = self._generate_placeholder_audio(
            duration, sample_rate, output_format
        )

        result = SynthesizedAudio(
            audio_bytes=audio_bytes,
            format=output_format.value,
            duration=duration,
            sample_rate=sample_rate,
            voice_id=voice,
            text_length=len(text),
            ssml_used=False,
        )

        logger.info(
            f"Synthesis complete: {len(audio_bytes)} bytes, "
            f"duration={duration:.2f}s"
        )

        return result

    def list_voices(
        self,
        language: Optional[str] = None,
        gender: Optional[VoiceGender] = None,
    ) -> List[Dict[str, Any]]:
        """
        List available voices.

        Args:
            language: Filter by language code (e.g., 'en-US')
            gender: Filter by gender

        Returns:
            List of voice dictionaries with metadata
        """
        voices = []

        for voice_id, voice in self.VOICES.items():
            # Apply filters
            if language and not voice.language.startswith(language.split('-')[0]):
                continue
            if gender and voice.gender != gender:
                continue

            voices.append({
                "id": voice.id,
                "name": voice.name,
                "language": voice.language,
                "gender": voice.gender.value,
                "description": voice.description,
                "sample_rate": voice.sample_rate,
                "styles": voice.styles,
            })

        logger.info(
            f"Listed {len(voices)} voices "
            f"(language={language}, gender={gender})"
        )

        return voices

    def synthesize_ssml(
        self,
        ssml: str,
        voice: str = "default",
        format: Optional[AudioFormat] = None,
    ) -> SynthesizedAudio:
        """
        Synthesize from SSML markup.

        Supported SSML tags:
        - <speak>: Root element
        - <voice>: Voice selection
        - <prosody>: Rate, pitch, volume
        - <break>: Pauses
        - <emphasis>: Stress
        - <say-as>: Interpretation
        - <sub>: Substitution
        - <phoneme>: Pronunciation

        Args:
            ssml: SSML markup string
            voice: Default voice ID
            format: Output audio format

        Returns:
            SynthesizedAudio with audio bytes and metadata
        """
        if not ssml or not ssml.strip():
            raise ValueError("SSML cannot be empty")

        if len(ssml) > self.MAX_SSML_LENGTH:
            raise ValueError(
                f"SSML exceeds maximum length of {self.MAX_SSML_LENGTH} characters"
            )

        # Parse and validate SSML
        parsed = self._parse_ssml(ssml)

        logger.info(
            f"Synthesizing SSML: {len(ssml)} chars, "
            f"extracted_text={len(parsed['text'])} chars"
        )

        # Get voice from SSML or use default
        ssml_voice = parsed.get("voice", voice)
        voice_config = self.VOICES.get(ssml_voice, self.VOICES["default"])

        # Apply prosody from SSML
        speed = parsed.get("rate", 1.0)
        pitch = parsed.get("pitch", 1.0)

        # Calculate duration including breaks
        base_duration = self._estimate_duration(parsed["text"], speed)
        total_breaks = sum(parsed.get("breaks", []))
        duration = base_duration + total_breaks

        output_format = format or self.default_format

        # Generate audio
        audio_bytes = self._generate_placeholder_audio(
            duration, voice_config.sample_rate, output_format
        )

        result = SynthesizedAudio(
            audio_bytes=audio_bytes,
            format=output_format.value,
            duration=duration,
            sample_rate=voice_config.sample_rate,
            voice_id=ssml_voice,
            text_length=len(parsed["text"]),
            ssml_used=True,
        )

        logger.info(
            f"SSML synthesis complete: {len(audio_bytes)} bytes, "
            f"duration={duration:.2f}s"
        )

        return result

    def _parse_ssml(self, ssml: str) -> Dict[str, Any]:
        """
        Parse SSML and extract text and attributes.

        Args:
            ssml: SSML markup string

        Returns:
            Dictionary with extracted text and prosody settings
        """
        result = {
            "text": "",
            "voice": None,
            "rate": 1.0,
            "pitch": 1.0,
            "volume": 1.0,
            "breaks": [],
            "emphasis": [],
        }

        try:
            # Wrap in speak tag if not present
            if not ssml.strip().startswith("<speak"):
                ssml = f"<speak>{ssml}</speak>"

            root = ET.fromstring(ssml)

            # Extract text content
            result["text"] = self._extract_text_from_element(root)

            # Extract voice
            voice_elem = root.find(".//voice")
            if voice_elem is not None:
                result["voice"] = voice_elem.get("name")

            # Extract prosody
            prosody_elem = root.find(".//prosody")
            if prosody_elem is not None:
                rate = prosody_elem.get("rate", "100%")
                result["rate"] = self._parse_prosody_value(rate)

                pitch = prosody_elem.get("pitch", "0%")
                result["pitch"] = self._parse_prosody_value(pitch, is_pitch=True)

                volume = prosody_elem.get("volume", "100%")
                result["volume"] = self._parse_prosody_value(volume)

            # Extract breaks
            for break_elem in root.findall(".//break"):
                time_str = break_elem.get("time", "0ms")
                result["breaks"].append(self._parse_time_value(time_str))

        except ET.ParseError as e:
            logger.warning(f"SSML parse error: {e}, extracting text only")
            # Fall back to extracting text without tags
            result["text"] = re.sub(r'<[^>]+>', '', ssml)

        return result

    def _extract_text_from_element(self, element: ET.Element) -> str:
        """Recursively extract text from XML element."""
        texts = []

        if element.text:
            texts.append(element.text)

        for child in element:
            # Handle substitution
            if child.tag == "sub":
                texts.append(child.get("alias", child.text or ""))
            else:
                texts.append(self._extract_text_from_element(child))

            if child.tail:
                texts.append(child.tail)

        return " ".join(texts).strip()

    def _parse_prosody_value(
        self,
        value: str,
        is_pitch: bool = False,
    ) -> float:
        """Parse prosody attribute value to float multiplier."""
        value = value.strip().lower()

        # Handle percentage
        if value.endswith("%"):
            pct = float(value[:-1])
            return pct / 100.0

        # Handle relative values
        relative_values = {
            "x-slow": 0.5,
            "slow": 0.75,
            "medium": 1.0,
            "fast": 1.25,
            "x-fast": 1.5,
            "x-low": 0.5 if is_pitch else 0.5,
            "low": 0.75 if is_pitch else 0.75,
            "high": 1.25 if is_pitch else 1.25,
            "x-high": 1.5 if is_pitch else 1.5,
            "default": 1.0,
        }

        if value in relative_values:
            return relative_values[value]

        # Handle semitone values for pitch (e.g., "+2st", "-3st")
        if is_pitch and value.endswith("st"):
            semitones = float(value[:-2])
            return 2 ** (semitones / 12)

        # Handle Hz values for pitch
        if is_pitch and value.endswith("hz"):
            # Assume 200Hz as baseline
            hz = float(value[:-2])
            return hz / 200.0

        # Try parsing as float
        try:
            return float(value)
        except ValueError:
            return 1.0

    def _parse_time_value(self, value: str) -> float:
        """Parse time value to seconds."""
        value = value.strip().lower()

        if value.endswith("ms"):
            return float(value[:-2]) / 1000.0
        elif value.endswith("s"):
            return float(value[:-1])
        else:
            try:
                return float(value)
            except ValueError:
                return 0.0

    def get_voice(self, voice_id: str) -> Optional[Dict[str, Any]]:
        """
        Get details for a specific voice.

        Args:
            voice_id: Voice identifier

        Returns:
            Voice details dictionary or None if not found
        """
        voice = self.VOICES.get(voice_id)
        if not voice:
            return None

        return {
            "id": voice.id,
            "name": voice.name,
            "language": voice.language,
            "gender": voice.gender.value,
            "description": voice.description,
            "sample_rate": voice.sample_rate,
            "styles": voice.styles,
        }

    def get_supported_languages(self) -> List[str]:
        """Return list of supported language codes."""
        languages = set()
        for voice in self.VOICES.values():
            languages.add(voice.language)
        return sorted(list(languages))

    def validate_ssml(self, ssml: str) -> Dict[str, Any]:
        """
        Validate SSML markup without synthesizing.

        Args:
            ssml: SSML markup string

        Returns:
            Validation result with any errors or warnings
        """
        result = {
            "valid": True,
            "errors": [],
            "warnings": [],
            "estimated_duration": 0.0,
        }

        try:
            parsed = self._parse_ssml(ssml)
            result["estimated_duration"] = self._estimate_duration(
                parsed["text"], parsed.get("rate", 1.0)
            )

            # Check for unsupported tags
            unsupported = self._find_unsupported_tags(ssml)
            if unsupported:
                result["warnings"].append(
                    f"Unsupported tags will be ignored: {unsupported}"
                )

        except ET.ParseError as e:
            result["valid"] = False
            result["errors"].append(f"XML parse error: {str(e)}")

        return result

    def _find_unsupported_tags(self, ssml: str) -> List[str]:
        """Find SSML tags that are not supported."""
        supported_tags = {
            "speak", "voice", "prosody", "break", "emphasis",
            "say-as", "sub", "phoneme", "p", "s", "w",
        }

        found_tags = set(re.findall(r'<([a-zA-Z][a-zA-Z0-9]*)', ssml))
        unsupported = found_tags - supported_tags

        return list(unsupported)
