"""
Dyslexia Reading Support Service.

Provides text formatting, decoding strategies, and reading accommodations
for learners with dyslexia.
"""

import logging
import re
from typing import Any, Dict, List, Optional

from .models import (
    DecodingStrategy,
    DyslexiaProfile,
    DyslexiaType,
    FontPreference,
    FormattedText,
    ReadingAssistance,
    ReadingPreferences,
    TextFormat,
)

logger = logging.getLogger(__name__)


class ReadingSupportService:
    """
    Service for reading support and text formatting.
    
    Provides:
    - Dyslexia-friendly text formatting
    - Syllable highlighting
    - Decoding strategy suggestions
    - Text simplification
    - Vocabulary support
    """

    # Common difficult word patterns for dyslexia
    DIFFICULT_PATTERNS = [
        r"\w*ough\w*",  # through, though, cough
        r"\w*tion\w*",  # nation, action
        r"\w*sion\w*",  # vision, tension
        r"\w*ight\w*",  # night, light
        r"\w*eigh\w*",  # weigh, eight
        r"\b\w{8,}\b",  # Long words (8+ characters)
    ]

    # Syllable patterns (simplified)
    SYLLABLE_PATTERNS = [
        (r"([aeiou])([^aeiou])\1", r"\1-\2\1"),  # vowel-consonant-same vowel
        (r"([^aeiou]{2,})([aeiou])", r"\1-\2"),  # consonant cluster before vowel
    ]

    # CSS styles for different formats
    FORMAT_STYLES = {
        TextFormat.DYSLEXIA_FRIENDLY: {
            "font-family": "OpenDyslexic, Arial, sans-serif",
            "font-size": "16px",
            "line-height": "1.8",
            "letter-spacing": "0.12em",
            "word-spacing": "0.16em",
            "background-color": "#FFFEF0",
            "color": "#333333",
        },
        TextFormat.HIGH_CONTRAST: {
            "font-family": "Arial, sans-serif",
            "font-size": "18px",
            "line-height": "2.0",
            "background-color": "#000000",
            "color": "#FFFF00",
        },
        TextFormat.LARGE_TEXT: {
            "font-family": "Verdana, sans-serif",
            "font-size": "20px",
            "line-height": "1.8",
        },
        TextFormat.SPACED: {
            "font-family": "Arial, sans-serif",
            "font-size": "16px",
            "line-height": "2.5",
            "letter-spacing": "0.2em",
            "word-spacing": "0.3em",
        },
    }

    def __init__(self, llm_client: Optional[Any] = None):
        """Initialize the reading support service."""
        self.llm = llm_client
        logger.info("ReadingSupportService initialized")

    async def format_text(
        self,
        text: str,
        profile: DyslexiaProfile,
        format_type: Optional[TextFormat] = None,
    ) -> FormattedText:
        """
        Format text for dyslexia-friendly reading.
        
        Args:
            text: Original text to format
            profile: Dyslexia profile with preferences
            format_type: Override format type
            
        Returns:
            FormattedText with formatting applied
        """
        format_to_use = format_type or TextFormat.DYSLEXIA_FRIENDLY
        prefs = profile.reading_preferences
        
        # Apply basic formatting
        formatted = text
        
        # Break into shorter paragraphs
        paragraphs = formatted.split("\n\n")
        formatted_paragraphs = []
        
        for para in paragraphs:
            # Break long sentences
            sentences = re.split(r"(?<=[.!?])\s+", para)
            formatted_sentences = []
            
            for sentence in sentences:
                # Keep sentences manageable
                if len(sentence) > 100:
                    # Try to break at natural points
                    sentence = self._break_long_sentence(sentence)
                formatted_sentences.append(sentence)
            
            formatted_paragraphs.append(" ".join(formatted_sentences))
        
        formatted = "\n\n".join(formatted_paragraphs)
        
        # Identify difficult words
        difficult_words = self._identify_difficult_words(text, profile)
        
        # Create syllabified version if enabled
        syllabified = None
        if prefs.syllable_highlighting:
            syllabified = self._syllabify_text(text)
        
        # Calculate reading time (adjusted for dyslexia - slower pace)
        words = text.split()
        word_count = len(words)
        # Assume 100-120 words per minute for dyslexic readers
        reading_time = int(word_count / 100 * 60)
        
        return FormattedText(
            original_text=text,
            formatted_text=formatted,
            syllabified_text=syllabified,
            word_count=word_count,
            estimated_reading_time_seconds=reading_time,
            difficult_words=difficult_words,
            format_applied=format_to_use,
        )

    async def get_decoding_strategies(
        self,
        word: str,
        profile: DyslexiaProfile,
    ) -> Dict[str, Any]:
        """
        Get decoding strategies for a specific word.
        
        Args:
            word: Word to decode
            profile: Dyslexia profile
            
        Returns:
            Dictionary of decoding strategies and tips
        """
        strategies = {}
        
        # Phonetic breakdown
        strategies["phonetic"] = {
            "name": "Sound It Out",
            "steps": [
                f"Look at each letter in '{word}'",
                "Say the sound for each letter",
                "Blend the sounds together",
                "Does it sound like a word you know?",
            ],
            "phonetic_spelling": self._get_phonetic_spelling(word),
        }
        
        # Syllable breakdown
        syllables = self._syllabify_word(word)
        strategies["syllable"] = {
            "name": "Break Into Syllables",
            "syllables": syllables,
            "steps": [
                f"Break '{word}' into parts: {syllables}",
                "Say each part separately",
                "Put the parts together",
            ],
        }
        
        # Morpheme breakdown (prefixes, roots, suffixes)
        morphemes = self._identify_morphemes(word)
        if morphemes["prefix"] or morphemes["suffix"]:
            strategies["morpheme"] = {
                "name": "Find Word Parts",
                "parts": morphemes,
                "steps": [
                    f"Look for parts you know in '{word}'",
                    f"Prefix: {morphemes['prefix'] or 'none'}",
                    f"Root: {morphemes['root']}",
                    f"Suffix: {morphemes['suffix'] or 'none'}",
                ],
            }
        
        # Context clues
        strategies["context"] = {
            "name": "Use Context Clues",
            "steps": [
                "Read the words around it",
                "What would make sense here?",
                "Does your guess match the letters?",
            ],
        }
        
        # Prioritize based on profile
        preferred = profile.preferred_decoding_strategies
        if preferred:
            strategies["recommended"] = preferred[0].value
        else:
            # Default recommendation based on dyslexia type
            if profile.dyslexia_type == DyslexiaType.PHONOLOGICAL:
                strategies["recommended"] = "syllable"  # Less phoneme-focused
            elif profile.dyslexia_type == DyslexiaType.SURFACE:
                strategies["recommended"] = "phonetic"  # Build word recognition
            else:
                strategies["recommended"] = "syllable"
        
        return strategies

    async def create_reading_assistance(
        self,
        text: str,
        profile: DyslexiaProfile,
    ) -> ReadingAssistance:
        """
        Create comprehensive reading assistance for a text.
        
        Args:
            text: Text to provide assistance for
            profile: Dyslexia profile
            
        Returns:
            ReadingAssistance with vocabulary, hints, and questions
        """
        # Identify vocabulary that needs support
        difficult_words = self._identify_difficult_words(text, profile)
        
        # Create vocabulary support
        vocabulary_support = {}
        phonetic_hints = {}
        
        for word in difficult_words[:10]:  # Limit to top 10
            vocabulary_support[word] = self._get_simple_definition(word)
            phonetic_hints[word] = self._get_phonetic_spelling(word)
        
        # Generate comprehension questions
        questions = self._generate_comprehension_questions(text)
        
        # Extract key points
        key_points = self._extract_key_points(text)
        
        return ReadingAssistance(
            original_text=text,
            vocabulary_support=vocabulary_support,
            phonetic_hints=phonetic_hints,
            comprehension_questions=questions,
            key_points=key_points,
        )

    async def get_reading_accommodations(
        self,
        profile: DyslexiaProfile,
        context: Dict[str, Any] = None,
    ) -> List[str]:
        """
        Get reading accommodations based on profile.
        
        Args:
            profile: Dyslexia profile
            context: Optional context (test, homework, class)
            
        Returns:
            List of recommended accommodations
        """
        context = context or {}
        accommodations = []
        
        # Base accommodations
        accommodations.extend([
            "Extended time for reading tasks",
            "Access to text-to-speech technology",
            "Dyslexia-friendly font option",
            "Reading ruler or guide",
        ])
        
        # Based on dyslexia type
        if profile.dyslexia_type == DyslexiaType.PHONOLOGICAL:
            accommodations.extend([
                "Audio versions of text materials",
                "Reduced emphasis on phonetic spelling tests",
                "Visual word recognition supports",
            ])
        elif profile.dyslexia_type == DyslexiaType.SURFACE:
            accommodations.extend([
                "Phonetic decoding tools",
                "Word family practice materials",
                "Systematic phonics support",
            ])
        elif profile.dyslexia_type == DyslexiaType.RAPID_NAMING:
            accommodations.extend([
                "Extra processing time",
                "Reduced timed reading activities",
                "Word retrieval supports",
            ])
        
        # Context-specific
        situation = context.get("situation", "general")
        if situation == "test":
            accommodations.extend([
                "Separate quiet testing room",
                "Questions read aloud if requested",
                "Extra time (typically 1.5x)",
                "Breaks as needed",
            ])
        elif situation == "homework":
            accommodations.extend([
                "Reduced reading load",
                "Alternative formats available",
                "Chunked assignments",
            ])
        
        # Profile-specific
        accommodations.extend(profile.accommodations)
        
        return list(set(accommodations))

    def _break_long_sentence(self, sentence: str) -> str:
        """Break a long sentence at natural points."""
        # Try to break at commas or conjunctions
        parts = re.split(r"(,\s+|\s+and\s+|\s+but\s+|\s+or\s+)", sentence)
        if len(parts) > 1:
            # Add line break after natural breaks
            result = []
            current_length = 0
            for part in parts:
                current_length += len(part)
                result.append(part)
                if current_length > 60 and part.strip() in [",", "and", "but", "or"]:
                    result.append("\n")
                    current_length = 0
            return "".join(result)
        return sentence

    def _identify_difficult_words(
        self,
        text: str,
        profile: DyslexiaProfile,
    ) -> List[str]:
        """Identify words that may be difficult."""
        difficult = []
        words = set(re.findall(r"\b\w+\b", text.lower()))
        
        # Check against difficult patterns
        for word in words:
            # Skip mastered sight words
            if word in profile.sight_words_mastered:
                continue
            
            # Check difficult patterns
            for pattern in self.DIFFICULT_PATTERNS:
                if re.match(pattern, word):
                    difficult.append(word)
                    break
            
            # Check profile-specific difficult patterns
            for pattern in profile.difficult_patterns:
                if pattern in word:
                    difficult.append(word)
                    break
        
        return list(set(difficult))

    def _syllabify_text(self, text: str) -> str:
        """Add syllable markers to text."""
        words = text.split()
        syllabified_words = [self._syllabify_word(word) for word in words]
        return " ".join(syllabified_words)

    def _syllabify_word(self, word: str) -> str:
        """Break a word into syllables (simplified algorithm)."""
        # Simple syllabification based on vowel patterns
        vowels = "aeiouAEIOU"
        result = []
        current_syllable = ""
        
        for i, char in enumerate(word):
            current_syllable += char
            
            # Check if we should break
            if char in vowels and i < len(word) - 1:
                next_char = word[i + 1]
                # Break after vowel if followed by consonant-vowel
                if next_char not in vowels and i < len(word) - 2:
                    if word[i + 2] in vowels:
                        result.append(current_syllable)
                        current_syllable = ""
        
        if current_syllable:
            result.append(current_syllable)
        
        return "-".join(result) if len(result) > 1 else word

    def _get_phonetic_spelling(self, word: str) -> str:
        """Get a simplified phonetic spelling."""
        # Simple phonetic approximation
        phonetic_map = {
            "ph": "f",
            "gh": "",  # often silent
            "tion": "shun",
            "sion": "zhun",
            "ough": "uff/oh/oo",
            "ight": "ite",
            "eigh": "ay",
        }
        
        result = word.lower()
        for pattern, replacement in phonetic_map.items():
            result = result.replace(pattern, replacement)
        
        return result

    def _identify_morphemes(self, word: str) -> Dict[str, str]:
        """Identify prefix, root, and suffix in a word."""
        prefixes = ["un", "re", "pre", "dis", "mis", "non", "over", "under"]
        suffixes = ["ing", "ed", "er", "est", "ly", "tion", "ness", "ment", "able", "ible"]
        
        result = {"prefix": "", "root": word, "suffix": ""}
        
        word_lower = word.lower()
        
        # Check for prefix
        for prefix in prefixes:
            if word_lower.startswith(prefix) and len(word_lower) > len(prefix) + 2:
                result["prefix"] = prefix
                word_lower = word_lower[len(prefix):]
                break
        
        # Check for suffix
        for suffix in suffixes:
            if word_lower.endswith(suffix) and len(word_lower) > len(suffix) + 2:
                result["suffix"] = suffix
                word_lower = word_lower[:-len(suffix)]
                break
        
        result["root"] = word_lower
        return result

    def _get_simple_definition(self, word: str) -> str:
        """Get a simple definition (placeholder - would use dictionary API)."""
        return f"[Definition for '{word}' - use dictionary]"

    def _generate_comprehension_questions(self, text: str) -> List[str]:
        """Generate simple comprehension questions."""
        return [
            "What is this text mainly about?",
            "What are the most important points?",
            "Can you summarize this in your own words?",
            "What new information did you learn?",
        ]

    def _extract_key_points(self, text: str) -> List[str]:
        """Extract key points from text."""
        # Simple extraction - first sentence of each paragraph
        paragraphs = text.split("\n\n")
        key_points = []
        
        for para in paragraphs[:5]:  # Limit to first 5 paragraphs
            sentences = re.split(r"(?<=[.!?])\s+", para)
            if sentences:
                key_points.append(sentences[0][:100])  # First 100 chars
        
        return key_points
