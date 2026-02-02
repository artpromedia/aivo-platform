"""
Dyslexia Support Data Models.

Defines data structures for dyslexia support including reading preferences,
text formatting, decoding strategies, and writing accommodations.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
import uuid


def generate_id() -> str:
    """Generate a unique identifier."""
    return str(uuid.uuid4())


class DyslexiaType(str, Enum):
    """Types of dyslexia."""
    PHONOLOGICAL = "phonological"  # Difficulty with phoneme awareness
    SURFACE = "surface"  # Difficulty with whole word recognition
    MIXED = "mixed"  # Combination
    RAPID_NAMING = "rapid_naming"  # Difficulty with quick word retrieval


class TextFormat(str, Enum):
    """Text formatting preferences."""
    STANDARD = "standard"
    DYSLEXIA_FRIENDLY = "dyslexia_friendly"
    HIGH_CONTRAST = "high_contrast"
    LARGE_TEXT = "large_text"
    SPACED = "spaced"


class FontPreference(str, Enum):
    """Font preferences for readability."""
    OPENDYSLEXIC = "opendyslexic"
    LEXIE_READABLE = "lexie_readable"
    COMIC_SANS = "comic_sans"
    ARIAL = "arial"
    VERDANA = "verdana"
    DEFAULT = "default"


class DecodingStrategy(str, Enum):
    """Reading decoding strategies."""
    PHONETIC = "phonetic"  # Sound out words
    SYLLABLE = "syllable"  # Break into syllables
    MORPHEME = "morpheme"  # Break into meaning units
    CONTEXT = "context"  # Use context clues
    VISUAL = "visual"  # Visual word recognition


class WritingChallenge(str, Enum):
    """Common writing challenges."""
    SPELLING = "spelling"
    ORGANIZATION = "organization"
    PUNCTUATION = "punctuation"
    SENTENCE_STRUCTURE = "sentence_structure"
    LETTER_REVERSAL = "letter_reversal"
    WORD_RETRIEVAL = "word_retrieval"


@dataclass
class ReadingPreferences:
    """Reading display and support preferences."""
    font: FontPreference = FontPreference.DEFAULT
    font_size: int = 14
    line_spacing: float = 1.5
    letter_spacing: float = 1.0
    word_spacing: float = 1.2
    paragraph_spacing: float = 2.0
    background_color: str = "#FFFEF0"  # Cream/off-white
    text_color: str = "#333333"
    highlight_color: str = "#FFFF99"
    reading_ruler: bool = True
    text_to_speech: bool = True
    syllable_highlighting: bool = True


@dataclass
class WritingSupport:
    """Writing support preferences."""
    spell_check_enabled: bool = True
    word_prediction: bool = True
    speech_to_text: bool = True
    graphic_organizers: bool = True
    sentence_starters: bool = True
    word_bank: bool = True
    grammar_support: bool = True


@dataclass
class DecodingProgress:
    """Track decoding strategy progress."""
    strategy: DecodingStrategy
    proficiency_level: float = 0.0  # 0-1 scale
    words_practiced: int = 0
    last_practiced: Optional[datetime] = None
    notes: str = ""


@dataclass
class DyslexiaProfile:
    """Complete dyslexia support profile for a learner."""
    learner_id: str
    dyslexia_type: DyslexiaType = DyslexiaType.MIXED
    reading_preferences: ReadingPreferences = field(default_factory=ReadingPreferences)
    writing_support: WritingSupport = field(default_factory=WritingSupport)
    preferred_decoding_strategies: List[DecodingStrategy] = field(default_factory=list)
    writing_challenges: List[WritingChallenge] = field(default_factory=list)
    reading_level: Optional[str] = None  # e.g., "Grade 3"
    target_reading_level: Optional[str] = None
    sight_words_mastered: List[str] = field(default_factory=list)
    difficult_patterns: List[str] = field(default_factory=list)  # e.g., "ough", "tion"
    strengths: List[str] = field(default_factory=list)
    accommodations: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)


@dataclass
class FormattedText:
    """Text formatted for dyslexia-friendly reading."""
    original_text: str
    formatted_text: str
    syllabified_text: Optional[str] = None
    word_count: int = 0
    estimated_reading_time_seconds: int = 0
    difficult_words: List[str] = field(default_factory=list)
    format_applied: TextFormat = TextFormat.STANDARD


@dataclass
class ReadingAssistance:
    """Assistance for reading a specific text."""
    text_id: str = field(default_factory=generate_id)
    original_text: str = ""
    simplified_text: Optional[str] = None
    vocabulary_support: Dict[str, str] = field(default_factory=dict)  # word: definition
    phonetic_hints: Dict[str, str] = field(default_factory=dict)  # word: pronunciation
    comprehension_questions: List[str] = field(default_factory=list)
    key_points: List[str] = field(default_factory=list)


@dataclass
class WritingAssistance:
    """Assistance for writing tasks."""
    task_id: str = field(default_factory=generate_id)
    task_type: str = ""  # essay, paragraph, sentence, etc.
    graphic_organizer: Optional[Dict[str, Any]] = None
    sentence_starters: List[str] = field(default_factory=list)
    word_suggestions: List[str] = field(default_factory=list)
    spelling_alternatives: Dict[str, List[str]] = field(default_factory=dict)
    structure_template: Optional[str] = None


@dataclass
class SupportRequest:
    """Request for dyslexia support."""
    learner_id: str
    support_type: str
    content: str = ""
    context: Dict[str, Any] = field(default_factory=dict)
    request_time: datetime = field(default_factory=datetime.now)


@dataclass
class SupportResponse:
    """Response containing dyslexia support."""
    request_id: str = field(default_factory=generate_id)
    formatted_content: Optional[FormattedText] = None
    reading_assistance: Optional[ReadingAssistance] = None
    writing_assistance: Optional[WritingAssistance] = None
    accommodations: List[str] = field(default_factory=list)
    strategies: List[str] = field(default_factory=list)
