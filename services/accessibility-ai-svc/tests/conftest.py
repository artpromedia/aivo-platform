"""
Pytest configuration and fixtures for accessibility-ai-svc tests.
"""
import pytest
import sys
import os
from unittest.mock import MagicMock, AsyncMock, patch
from io import BytesIO
from dataclasses import dataclass
from typing import Optional, List, Dict, Any
from enum import Enum

# Add app directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from fastapi.testclient import TestClient


# Mock dataclasses for model results
@dataclass
class TranscriptionResult:
    """Mock transcription result."""
    text: str = "Hello world"
    confidence: float = 0.95
    language: str = "en"
    duration: float = 2.5
    words: List[Dict] = None
    segments: List[Dict] = None
    
    def __post_init__(self):
        if self.words is None:
            self.words = [{"word": "Hello", "start": 0.0, "end": 0.5}, {"word": "world", "start": 0.6, "end": 1.0}]
        if self.segments is None:
            self.segments = [{"text": "Hello world", "start": 0.0, "end": 1.0}]


@dataclass
class LanguageDetectionResult:
    """Mock language detection result."""
    language: str = "en"
    confidence: float = 0.98
    alternatives: List[Dict] = None
    
    def __post_init__(self):
        if self.alternatives is None:
            self.alternatives = [{"language": "en", "confidence": 0.98}]


@dataclass
class SynthesisResult:
    """Mock TTS synthesis result."""
    audio_bytes: bytes = b"fake_audio_data"
    format: str = "wav"
    duration: float = 2.5
    sample_rate: int = 22050
    voice_id: str = "default"
    text_length: int = 11


class ImageType(Enum):
    """Mock image type enum."""
    PHOTO = "photo"
    DIAGRAM = "diagram"
    CHART = "chart"
    ILLUSTRATION = "illustration"


@dataclass
class AltTextResult:
    """Mock alt-text generation result."""
    short_description: str = "A photo of a cat"
    long_description: str = "A fluffy orange cat sitting on a windowsill looking outside"
    educational_context: str = "This image could be used to teach about pet care"
    image_type: ImageType = ImageType.PHOTO
    confidence: float = 0.92
    detected_objects: List[str] = None
    colors: List[str] = None
    
    def __post_init__(self):
        if self.detected_objects is None:
            self.detected_objects = ["cat", "window", "windowsill"]
        if self.colors is None:
            self.colors = ["orange", "white", "gray"]


@dataclass
class SimplificationResult:
    """Mock text simplification result."""
    text: str = "The cat sat on the mat."
    original_grade: float = 8.5
    simplified_grade: float = 3.2
    changes_made: List[str] = None
    word_count_original: int = 10
    word_count_simplified: int = 6
    
    def __post_init__(self):
        if self.changes_made is None:
            self.changes_made = ["Replaced complex words", "Split long sentences"]


@dataclass
class TermExplanation:
    """Mock term explanation."""
    term: str
    definition: str
    simplified_definition: str
    example_usage: str
    related_terms: List[str]


@dataclass
class ReadingAssistResult:
    """Mock reading assistance result."""
    html: str = "<p>The cat sat on the mat.</p>"
    styles: Dict[str, str] = None
    word_count: int = 6
    estimated_reading_time: float = 0.5
    chunks: List[str] = None
    
    def __post_init__(self):
        if self.styles is None:
            self.styles = {"font-family": "OpenDyslexic", "line-height": "1.5"}
        if self.chunks is None:
            self.chunks = ["The cat sat", "on the mat."]


@dataclass
class HighlightResult:
    """Mock highlight result."""
    html: str = "<p>The <mark>cat</mark> sat on the <mark>mat</mark>.</p>"
    important_words: List[str] = None
    highlight_count: int = 2
    
    def __post_init__(self):
        if self.important_words is None:
            self.important_words = ["cat", "mat"]


@dataclass
class PaceResult:
    """Mock reading pace result."""
    words_per_minute: int = 150
    suggested_breaks: List[int] = None
    chunk_size: int = 50
    estimated_total_time: float = 2.0
    difficulty_level: str = "easy"
    
    def __post_init__(self):
        if self.suggested_breaks is None:
            self.suggested_breaks = [50, 100, 150]


@dataclass
class LexileEstimateMock:
    """Mock Lexile estimate result."""
    lexile: int = 650
    grade_band: str = "3-5"
    avg_sentence_length: float = 12.5
    avg_word_length: float = 4.8
    complex_word_ratio: float = 0.15
    word_count: int = 50


@dataclass
class AdaptedContentMock:
    """Mock adapted content result."""
    text: str = "The cat sat on the mat."
    original_lexile: int = 800
    adapted_lexile: int = 520
    target_lexile: int = 500
    grade_band: str = "6-8"
    changes_made: List[str] = None
    word_count_original: int = 15
    word_count_adapted: int = 12
    sentences_split: int = 1
    words_replaced: int = 3
    within_comfort_zone: bool = True

    def __post_init__(self):
        if self.changes_made is None:
            self.changes_made = ["Replaced complex words", "Split long sentence"]


@dataclass
class VisualAccommodationMock:
    """Mock visual accommodation result."""
    html: str = "<p>Hello world</p>"
    css: Dict[str, str] = None
    contrast_level: str = "high"
    font_scale: float = 1.5
    color_blind_mode: Optional[str] = None
    changes_applied: List[str] = None

    def __post_init__(self):
        if self.css is None:
            self.css = {"font-size": "24px", "line-height": "1.5"}
        if self.changes_applied is None:
            self.changes_applied = ["Font scaled to 150%", "High contrast applied"]


@dataclass
class AuditoryAccommodationMock:
    """Mock auditory accommodation result."""
    captions: List[Dict] = None
    visual_indicators: List[Dict[str, str]] = None
    text_alternative: str = "Audio content transcribed"
    changes_applied: List[str] = None

    def __post_init__(self):
        if self.captions is None:
            self.captions = [{"index": 0, "start": 0.0, "end": 3.2, "text": "Hello world"}]
        if self.visual_indicators is None:
            self.visual_indicators = [{"type": "notification_bell", "label": "🔔 Alert"}]
        if self.changes_applied is None:
            self.changes_applied = ["Captions generated", "Visual bell enabled"]


@dataclass
class MotorAccommodationMock:
    """Mock motor accommodation result."""
    css: Dict[str, str] = None
    interaction_overrides: Dict[str, Any] = None
    keyboard_shortcuts: List[Dict[str, str]] = None
    changes_applied: List[str] = None

    def __post_init__(self):
        if self.css is None:
            self.css = {"--min-target-size": "44px", "cursor": "pointer"}
        if self.interaction_overrides is None:
            self.interaction_overrides = {"min_target_size_px": 44, "keyboard_nav_enabled": True}
        if self.keyboard_shortcuts is None:
            self.keyboard_shortcuts = [{"key": "Tab", "action": "Move to next element"}]
        if self.changes_applied is None:
            self.changes_applied = ["Touch targets enlarged", "Keyboard navigation enabled"]


@dataclass
class SensoryAccommodationResultMock:
    """Mock combined sensory accommodation result."""
    visual: Optional[VisualAccommodationMock] = None
    auditory: Optional[AuditoryAccommodationMock] = None
    motor: Optional[MotorAccommodationMock] = None
    accommodations_applied: List[str] = None
    wcag_level: str = "AA"

    def __post_init__(self):
        if self.visual is None:
            self.visual = VisualAccommodationMock()
        if self.auditory is None:
            self.auditory = AuditoryAccommodationMock()
        if self.motor is None:
            self.motor = MotorAccommodationMock()
        if self.accommodations_applied is None:
            self.accommodations_applied = [
                "Font scaled to 150%", "High contrast applied",
                "Captions generated", "Visual bell enabled",
                "Touch targets enlarged", "Keyboard navigation enabled",
            ]


@dataclass
class AccessibilityProfile:
    """Mock accessibility profile."""
    learner_id: str
    needs: List[Dict] = None
    visual_preferences: Dict = None
    audio_preferences: Dict = None
    cognitive_preferences: Dict = None
    input_preferences: Dict = None


# Create mock engines
@pytest.fixture
def mock_stt_engine():
    """Create mock STT engine."""
    engine = MagicMock()
    engine.transcribe.return_value = TranscriptionResult()
    engine.detect_language.return_value = LanguageDetectionResult()
    engine.get_supported_languages.return_value = ["en", "es", "fr", "de", "zh"]
    return engine


@pytest.fixture
def mock_tts_engine():
    """Create mock TTS engine."""
    engine = MagicMock()
    engine.synthesize.return_value = SynthesisResult()
    engine.list_voices.return_value = [
        {"id": "default", "name": "Default Voice", "language": "en"},
        {"id": "male_en", "name": "Male English", "language": "en"},
    ]
    return engine


@pytest.fixture
def mock_alt_text_generator():
    """Create mock alt-text generator."""
    generator = MagicMock()
    generator.generate.return_value = AltTextResult()
    generator.describe_image.return_value = {"description": "Detailed image description"}
    generator.extract_text_from_image.return_value = {"text": "Extracted text", "confidence": 0.9}
    return generator


@pytest.fixture
def mock_text_simplifier():
    """Create mock text simplifier."""
    simplifier = MagicMock()
    simplifier.simplify.return_value = SimplificationResult()
    simplifier.explain_terms.return_value = {
        "photosynthesis": TermExplanation(
            term="photosynthesis",
            definition="The process by which plants convert light to energy",
            simplified_definition="How plants make food from sunlight",
            example_usage="Plants use photosynthesis to grow.",
            related_terms=["chlorophyll", "sunlight", "plants"]
        )
    }
    simplifier.get_readability_metrics.return_value = {
        "flesch_kincaid_grade": 8.5,
        "gunning_fog": 10.2,
        "smog_index": 9.1,
        "average_sentence_length": 15.5,
        "average_syllables_per_word": 1.8,
    }
    return simplifier


@pytest.fixture
def mock_reading_assistant():
    """Create mock reading assistant."""
    assistant = MagicMock()
    assistant.format.return_value = ReadingAssistResult()
    assistant.highlight_important_words.return_value = HighlightResult()
    assistant.suggest_reading_pace.return_value = PaceResult()
    assistant.list_profiles.return_value = [
        {"id": "dyslexia", "name": "Dyslexia-Friendly", "description": "Optimized for dyslexia"},
        {"id": "default", "name": "Default", "description": "Standard formatting"},
    ]
    return assistant


@pytest.fixture
def mock_profile_manager():
    """Create mock profile manager."""
    manager = MagicMock()
    
    def create_profile(learner_id, needs=None, **kwargs):
        return AccessibilityProfile(
            learner_id=learner_id,
            needs=needs or [],
            visual_preferences=kwargs.get("visual_preferences"),
            audio_preferences=kwargs.get("audio_preferences"),
            cognitive_preferences=kwargs.get("cognitive_preferences"),
            input_preferences=kwargs.get("input_preferences"),
        )
    
    manager.create_profile.side_effect = create_profile
    manager._profile_to_dict.return_value = {
        "learner_id": "test_learner",
        "needs": [],
        "visual_preferences": {"font_size": "large"},
        "audio_preferences": {"speed": 1.0},
        "cognitive_preferences": {"simplify_level": "medium"},
        "input_preferences": {"voice_control": True},
    }
    manager.get_profile.return_value = {
        "learner_id": "test_learner",
        "needs": [],
        "visual_preferences": {"font_size": "large"},
    }
    manager.update_profile.return_value = {
        "learner_id": "test_learner",
        "updated": True,
    }
    manager.delete_profile.return_value = True
    manager.get_recommended_settings.return_value = {
        "recommendations": {"font_size": "large", "high_contrast": True},
    }
    manager.list_available_needs.return_value = [
        {"id": "visual_impairment", "name": "Visual Impairment"},
        {"id": "hearing_impairment", "name": "Hearing Impairment"},
        {"id": "dyslexia", "name": "Dyslexia"},
        {"id": "adhd", "name": "ADHD"},
    ]
    
    return manager


@pytest.fixture
def mock_reading_level_adapter():
    """Create mock reading-level adapter."""
    adapter = MagicMock()
    adapter.estimate_lexile.return_value = LexileEstimateMock()
    adapter.adapt.return_value = AdaptedContentMock()
    adapter.adapt_to_grade_band.return_value = AdaptedContentMock(grade_band="3-5")
    adapter.get_grade_bands.return_value = {
        "K-2": {"min": 0, "max": 300, "midpoint": 150, "description": "Kindergarten – 2nd grade"},
        "3-5": {"min": 300, "max": 700, "midpoint": 500, "description": "3rd – 5th grade"},
        "6-8": {"min": 700, "max": 1000, "midpoint": 850, "description": "6th – 8th grade"},
        "9-12": {"min": 1000, "max": 1300, "midpoint": 1150, "description": "9th – 12th grade"},
    }
    return adapter


@pytest.fixture
def mock_sensory_accommodator():
    """Create mock sensory accommodator."""
    accommodator = MagicMock()
    accommodator.apply_all.return_value = SensoryAccommodationResultMock()
    accommodator.list_accommodations.return_value = {
        "visual": [{"id": "high_contrast", "name": "High Contrast", "description": "WCAG AA"}],
        "auditory": [{"id": "captions", "name": "Auto-Captions", "description": "Timed blocks"}],
        "motor": [{"id": "enlarged_targets", "name": "Enlarged Touch Targets", "description": "44px min"}],
    }
    return accommodator


@pytest.fixture
def client(
    mock_stt_engine,
    mock_tts_engine,
    mock_alt_text_generator,
    mock_text_simplifier,
    mock_reading_assistant,
    mock_profile_manager,
    mock_reading_level_adapter,
    mock_sensory_accommodator,
):
    """Create test client with mocked dependencies."""
    import app.main as main_module
    
    # Store original values
    original_stt = main_module.stt_engine
    original_tts = main_module.tts_engine
    original_alt_text = main_module.alt_text_generator
    original_simplifier = main_module.text_simplifier
    original_reading = main_module.reading_assistant
    original_profile = main_module.profile_manager
    original_multi_stt = main_module.multi_stt
    original_multi_tts = main_module.multi_tts
    original_multi_vision = main_module.multi_vision
    original_reading_level = main_module.reading_level_adapter
    original_sensory = main_module.sensory_accommodator
    
    # Set mocks
    main_module.stt_engine = mock_stt_engine
    main_module.tts_engine = mock_tts_engine
    main_module.alt_text_generator = mock_alt_text_generator
    main_module.text_simplifier = mock_text_simplifier
    main_module.reading_assistant = mock_reading_assistant
    main_module.profile_manager = mock_profile_manager
    main_module.multi_stt = None
    main_module.multi_tts = None
    main_module.multi_vision = None
    main_module.reading_level_adapter = mock_reading_level_adapter
    main_module.sensory_accommodator = mock_sensory_accommodator
    
    try:
        yield TestClient(main_module.app)
    finally:
        # Restore originals
        main_module.stt_engine = original_stt
        main_module.tts_engine = original_tts
        main_module.alt_text_generator = original_alt_text
        main_module.text_simplifier = original_simplifier
        main_module.reading_assistant = original_reading
        main_module.profile_manager = original_profile
        main_module.multi_stt = original_multi_stt
        main_module.multi_tts = original_multi_tts
        main_module.multi_vision = original_multi_vision
        main_module.reading_level_adapter = original_reading_level
        main_module.sensory_accommodator = original_sensory


@pytest.fixture
def sample_audio_file():
    """Create sample audio file bytes."""
    # Minimal WAV header for testing
    return b'RIFF' + b'\x00' * 36 + b'data' + b'\x00' * 4 + b'\x00' * 1000


@pytest.fixture
def sample_image_file():
    """Create sample image file bytes."""
    # Minimal PNG header for testing
    return b'\x89PNG\r\n\x1a\n' + b'\x00' * 100
