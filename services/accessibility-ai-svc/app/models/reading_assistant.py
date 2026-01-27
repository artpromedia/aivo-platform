"""
Reading Assistant

Reading assistance for different accessibility needs including dyslexia,
low vision, and ADHD-friendly formatting.
"""
import logging
import re
import html
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum

import numpy as np

logger = logging.getLogger(__name__)


class ReadingProfile(Enum):
    """Predefined reading assistance profiles."""
    DEFAULT = "default"
    DYSLEXIA = "dyslexia"
    LOW_VISION = "low_vision"
    ADHD = "adhd"
    COGNITIVE = "cognitive"
    CUSTOM = "custom"


@dataclass
class FormattedText:
    """Result of reading assistance formatting."""
    html: str
    styles: Dict[str, str]
    annotations: List[Dict[str, Any]] = field(default_factory=list)
    chunks: List[str] = field(default_factory=list)
    word_count: int = 0
    estimated_reading_time: float = 0.0


@dataclass
class ReadingPaceRecommendation:
    """Recommendation for reading pace."""
    words_per_minute: int
    suggested_breaks: List[Dict[str, Any]]
    chunk_size: int
    estimated_total_time: float
    difficulty_level: str


@dataclass
class HighlightedText:
    """Text with highlighted important words."""
    html: str
    important_words: List[str]
    highlight_count: int


class ReadingAssistant:
    """
    Apply reading assistance formatting.

    Profiles:
    - Dyslexia-friendly (OpenDyslexic font, spacing)
    - Low vision (high contrast, large text)
    - ADHD-friendly (chunking, highlighting)
    - Cognitive (simplified layout, clear structure)

    Usage:
        assistant = ReadingAssistant()
        formatted = assistant.format(text, profile="dyslexia")
    """

    # Profile configurations
    PROFILES: Dict[str, Dict[str, Any]] = {
        "default": {
            "font_family": "Arial, sans-serif",
            "font_size": "16px",
            "line_height": 1.5,
            "letter_spacing": "normal",
            "word_spacing": "normal",
            "background_color": "#ffffff",
            "text_color": "#333333",
            "highlight_color": "#ffeb3b",
            "chunk_size": 200,
            "paragraph_spacing": "1em",
        },
        "dyslexia": {
            "font_family": "OpenDyslexic, Comic Sans MS, Arial, sans-serif",
            "font_size": "18px",
            "line_height": 2.0,
            "letter_spacing": "0.12em",
            "word_spacing": "0.25em",
            "background_color": "#faf8f0",  # Cream/off-white reduces glare
            "text_color": "#1a1a1a",
            "highlight_color": "#b3e5fc",
            "chunk_size": 100,
            "paragraph_spacing": "1.5em",
            "max_line_width": "70ch",  # Optimal line length
        },
        "low_vision": {
            "font_family": "Arial, Helvetica, sans-serif",
            "font_size": "24px",
            "font_weight": "500",
            "line_height": 1.8,
            "letter_spacing": "0.05em",
            "word_spacing": "0.15em",
            "background_color": "#000000",  # High contrast
            "text_color": "#ffff00",  # Yellow on black
            "highlight_color": "#00ff00",
            "chunk_size": 150,
            "paragraph_spacing": "2em",
            "border_focus": "3px solid #ffff00",
        },
        "adhd": {
            "font_family": "Verdana, Geneva, sans-serif",
            "font_size": "16px",
            "line_height": 1.6,
            "letter_spacing": "0.02em",
            "word_spacing": "0.1em",
            "background_color": "#ffffff",
            "text_color": "#2c3e50",
            "highlight_color": "#e74c3c",
            "chunk_size": 75,  # Smaller chunks for focus
            "paragraph_spacing": "1.5em",
            "focus_mode": True,
            "highlight_key_words": True,
        },
        "cognitive": {
            "font_family": "Tahoma, Arial, sans-serif",
            "font_size": "18px",
            "line_height": 1.8,
            "letter_spacing": "0.03em",
            "word_spacing": "0.1em",
            "background_color": "#f5f5f5",
            "text_color": "#333333",
            "highlight_color": "#81c784",
            "chunk_size": 50,  # Very small chunks
            "paragraph_spacing": "2em",
            "numbered_paragraphs": True,
            "simple_layout": True,
        },
    }

    # Important/key words to highlight (common educational keywords)
    KEY_WORDS = {
        "important", "key", "main", "primary", "essential", "critical",
        "note", "remember", "definition", "example", "summary", "conclusion",
        "first", "second", "third", "finally", "next", "then", "therefore",
        "because", "however", "although", "while", "result", "cause", "effect",
    }

    # Common stop words to exclude from importance analysis
    STOP_WORDS = {
        "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
        "have", "has", "had", "do", "does", "did", "will", "would", "could",
        "should", "may", "might", "must", "shall", "can", "need", "dare",
        "to", "of", "in", "for", "on", "with", "at", "by", "from", "up",
        "about", "into", "over", "after", "it", "its", "this", "that",
        "these", "those", "and", "or", "but", "if", "as", "so", "than",
    }

    # Reading speed estimates (words per minute) by difficulty
    READING_SPEEDS = {
        "easy": 200,
        "medium": 150,
        "difficult": 100,
        "technical": 75,
    }

    def __init__(
        self,
        default_profile: str = "default",
        custom_key_words: Optional[List[str]] = None,
    ):
        """
        Initialize the ReadingAssistant.

        Args:
            default_profile: Default profile to use
            custom_key_words: Additional keywords to highlight
        """
        self.default_profile = default_profile
        self.key_words = self.KEY_WORDS.copy()
        if custom_key_words:
            self.key_words.update(word.lower() for word in custom_key_words)

        logger.info(
            f"ReadingAssistant initialized with profile={default_profile}, "
            f"{len(self.key_words)} key words"
        )

    def _get_profile_settings(
        self,
        profile: str,
        custom_settings: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Get profile settings with optional customizations."""
        base_settings = self.PROFILES.get(profile, self.PROFILES["default"]).copy()

        if custom_settings:
            base_settings.update(custom_settings)

        return base_settings

    def _escape_html(self, text: str) -> str:
        """Escape HTML special characters."""
        return html.escape(text)

    def _generate_css(self, settings: Dict[str, Any]) -> Dict[str, str]:
        """Generate CSS styles from settings."""
        styles = {
            "font-family": settings.get("font_family", "Arial, sans-serif"),
            "font-size": settings.get("font_size", "16px"),
            "line-height": str(settings.get("line_height", 1.5)),
            "letter-spacing": settings.get("letter_spacing", "normal"),
            "word-spacing": settings.get("word_spacing", "normal"),
            "background-color": settings.get("background_color", "#ffffff"),
            "color": settings.get("text_color", "#333333"),
            "padding": "1em",
            "margin": "0 auto",
        }

        if "font_weight" in settings:
            styles["font-weight"] = settings["font_weight"]

        if "max_line_width" in settings:
            styles["max-width"] = settings["max_line_width"]

        return styles

    def format(
        self,
        text: str,
        profile: str = "default",
        custom_settings: Optional[Dict[str, Any]] = None,
    ) -> FormattedText:
        """
        Apply reading assistance formatting.

        Args:
            text: Text to format
            profile: Reading profile to use
            custom_settings: Optional custom settings override

        Returns:
            FormattedText with HTML and styles
        """
        if not text or not text.strip():
            raise ValueError("Text cannot be empty")

        logger.info(f"Formatting text ({len(text)} chars) with profile={profile}")

        settings = self._get_profile_settings(profile, custom_settings)
        styles = self._generate_css(settings)

        # Process text based on profile
        processed_text = text
        annotations = []

        # Apply profile-specific processing
        if profile == "dyslexia":
            processed_text, annotations = self._apply_dyslexia_formatting_internal(
                text, settings
            )
        elif profile == "adhd":
            processed_text, annotations = self._apply_adhd_formatting(text, settings)
        elif profile == "low_vision":
            processed_text, annotations = self._apply_low_vision_formatting(
                text, settings
            )
        elif profile == "cognitive":
            processed_text, annotations = self._apply_cognitive_formatting(
                text, settings
            )
        else:
            processed_text = self._basic_html_format(text, settings)

        # Calculate metrics
        word_count = len(text.split())
        reading_time = self._estimate_reading_time(text, profile)

        # Generate chunks
        chunk_size = settings.get("chunk_size", 200)
        chunks = self.chunk_text(text, chunk_size)

        result = FormattedText(
            html=processed_text,
            styles=styles,
            annotations=annotations,
            chunks=chunks,
            word_count=word_count,
            estimated_reading_time=reading_time,
        )

        logger.info(
            f"Formatting complete: {word_count} words, "
            f"{len(chunks)} chunks, {reading_time:.1f}min"
        )

        return result

    def _basic_html_format(
        self,
        text: str,
        settings: Dict[str, Any],
    ) -> str:
        """Apply basic HTML formatting."""
        escaped = self._escape_html(text)
        paragraphs = escaped.split('\n\n')

        spacing = settings.get("paragraph_spacing", "1em")
        html_parts = []

        for para in paragraphs:
            if para.strip():
                html_parts.append(
                    f'<p style="margin-bottom: {spacing};">{para.strip()}</p>'
                )

        return '\n'.join(html_parts)

    def apply_dyslexia_formatting(
        self,
        text: str,
        custom_settings: Optional[Dict[str, Any]] = None,
    ) -> FormattedText:
        """
        Apply dyslexia-friendly formatting.

        Features:
        - Increased letter and word spacing
        - OpenDyslexic or similar font suggestion
        - Cream/off-white background
        - Shorter line lengths
        - Larger line height

        Args:
            text: Text to format
            custom_settings: Optional custom settings

        Returns:
            FormattedText with dyslexia-friendly formatting
        """
        return self.format(text, "dyslexia", custom_settings)

    def _apply_dyslexia_formatting_internal(
        self,
        text: str,
        settings: Dict[str, Any],
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """Internal dyslexia formatting implementation."""
        annotations = []
        escaped = self._escape_html(text)
        paragraphs = escaped.split('\n\n')

        spacing = settings.get("paragraph_spacing", "1.5em")
        max_width = settings.get("max_line_width", "70ch")

        html_parts = []
        for i, para in enumerate(paragraphs):
            if para.strip():
                # Add visual markers for paragraph start
                html_parts.append(
                    f'<p style="margin-bottom: {spacing}; max-width: {max_width}; '
                    f'text-align: left;">'
                    f'<span style="font-weight: bold; color: #666;">{i + 1}.</span> '
                    f'{para.strip()}</p>'
                )
                annotations.append({
                    "type": "paragraph",
                    "index": i,
                    "word_count": len(para.split()),
                })

        html_output = '\n'.join(html_parts)

        # Add dyslexia-specific wrapper
        html_output = (
            f'<div class="dyslexia-friendly" style="'
            f'font-family: {settings.get("font_family")}; '
            f'letter-spacing: {settings.get("letter_spacing")}; '
            f'word-spacing: {settings.get("word_spacing")}; '
            f'line-height: {settings.get("line_height")}; '
            f'background-color: {settings.get("background_color")}; '
            f'padding: 2em;">'
            f'{html_output}</div>'
        )

        return html_output, annotations

    def _apply_adhd_formatting(
        self,
        text: str,
        settings: Dict[str, Any],
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """Apply ADHD-friendly formatting with chunking and highlighting."""
        annotations = []
        escaped = self._escape_html(text)

        # Highlight key words
        highlight_color = settings.get("highlight_color", "#e74c3c")
        words = escaped.split()
        highlighted_words = []

        for word in words:
            clean_word = re.sub(r'[^\w]', '', word.lower())
            if clean_word in self.key_words:
                highlighted_words.append(
                    f'<mark style="background-color: {highlight_color}; '
                    f'padding: 0.1em 0.2em; border-radius: 3px;">{word}</mark>'
                )
                annotations.append({"type": "highlight", "word": clean_word})
            else:
                highlighted_words.append(word)

        text_with_highlights = ' '.join(highlighted_words)

        # Split into paragraphs
        paragraphs = text_with_highlights.split('\n\n')
        spacing = settings.get("paragraph_spacing", "1.5em")

        html_parts = []
        for i, para in enumerate(paragraphs):
            if para.strip():
                html_parts.append(
                    f'<p style="margin-bottom: {spacing}; padding: 0.5em; '
                    f'border-left: 4px solid {highlight_color};">'
                    f'{para.strip()}</p>'
                )

        html_output = '\n'.join(html_parts)

        # Add focus mode wrapper
        html_output = (
            f'<div class="adhd-friendly" style="max-width: 65ch; margin: 0 auto;">'
            f'{html_output}</div>'
        )

        return html_output, annotations

    def _apply_low_vision_formatting(
        self,
        text: str,
        settings: Dict[str, Any],
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """Apply low vision formatting with high contrast."""
        annotations = []
        escaped = self._escape_html(text)
        paragraphs = escaped.split('\n\n')

        bg_color = settings.get("background_color", "#000000")
        text_color = settings.get("text_color", "#ffff00")
        spacing = settings.get("paragraph_spacing", "2em")

        html_parts = []
        for para in paragraphs:
            if para.strip():
                html_parts.append(
                    f'<p style="margin-bottom: {spacing}; padding: 1em; '
                    f'border: 2px solid {text_color};">{para.strip()}</p>'
                )

        html_output = '\n'.join(html_parts)

        # High contrast wrapper
        html_output = (
            f'<div class="low-vision-friendly" style="'
            f'background-color: {bg_color}; color: {text_color}; '
            f'font-size: {settings.get("font_size")}; '
            f'font-weight: {settings.get("font_weight", "500")}; '
            f'padding: 2em;">'
            f'{html_output}</div>'
        )

        return html_output, annotations

    def _apply_cognitive_formatting(
        self,
        text: str,
        settings: Dict[str, Any],
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """Apply cognitive-friendly formatting with simple structure."""
        annotations = []
        escaped = self._escape_html(text)

        # Split into sentences for numbered display
        sentences = re.split(r'(?<=[.!?])\s+', escaped)
        spacing = settings.get("paragraph_spacing", "2em")

        html_parts = []
        for i, sentence in enumerate(sentences):
            if sentence.strip():
                html_parts.append(
                    f'<div style="margin-bottom: 1em; padding: 0.5em; '
                    f'background-color: {"#e8f5e9" if i % 2 == 0 else "#fff3e0"}; '
                    f'border-radius: 4px;">'
                    f'<span style="font-weight: bold; color: #666; '
                    f'margin-right: 0.5em;">{i + 1}.</span>'
                    f'{sentence.strip()}</div>'
                )
                annotations.append({
                    "type": "sentence",
                    "index": i,
                    "text": sentence.strip()[:50],
                })

        html_output = '\n'.join(html_parts)

        # Simple layout wrapper
        html_output = (
            f'<div class="cognitive-friendly" style="max-width: 50ch; margin: 0 auto; '
            f'padding: 1em;">{html_output}</div>'
        )

        return html_output, annotations

    def highlight_important_words(
        self,
        text: str,
        custom_words: Optional[List[str]] = None,
        highlight_color: str = "#ffeb3b",
    ) -> HighlightedText:
        """
        Highlight important words in text.

        Args:
            text: Text to process
            custom_words: Additional words to highlight
            highlight_color: Color for highlights

        Returns:
            HighlightedText with highlighted words
        """
        if not text:
            raise ValueError("Text cannot be empty")

        logger.info(f"Highlighting important words in text ({len(text)} chars)")

        words_to_highlight = self.key_words.copy()
        if custom_words:
            words_to_highlight.update(word.lower() for word in custom_words)

        escaped = self._escape_html(text)
        words = escaped.split()
        highlighted = []
        important_found = []

        for word in words:
            clean_word = re.sub(r'[^\w]', '', word.lower())
            if clean_word in words_to_highlight:
                highlighted.append(
                    f'<mark style="background-color: {highlight_color}; '
                    f'padding: 0.1em 0.2em;">{word}</mark>'
                )
                if clean_word not in important_found:
                    important_found.append(clean_word)
            else:
                highlighted.append(word)

        html_output = ' '.join(highlighted)

        result = HighlightedText(
            html=html_output,
            important_words=important_found,
            highlight_count=len(important_found),
        )

        logger.info(f"Highlighted {len(important_found)} important words")

        return result

    def highlight_key_points(
        self,
        text: str,
        num_points: int = 5,
    ) -> str:
        """
        Highlight key points in text.

        Args:
            text: Text to analyze
            num_points: Number of key points to highlight

        Returns:
            HTML with highlighted key points
        """
        if not text:
            raise ValueError("Text cannot be empty")

        # Find sentences with key indicators
        sentences = re.split(r'(?<=[.!?])\s+', text)
        scored_sentences = []

        for sentence in sentences:
            score = 0
            words = sentence.lower().split()

            # Score based on key words
            for word in words:
                clean_word = re.sub(r'[^\w]', '', word)
                if clean_word in self.key_words:
                    score += 2
                if clean_word not in self.STOP_WORDS:
                    score += 0.1

            # Bonus for sentences at start of paragraphs (assumed key points)
            if sentences.index(sentence) == 0:
                score += 1

            scored_sentences.append((sentence, score))

        # Sort by score and get top sentences
        scored_sentences.sort(key=lambda x: x[1], reverse=True)
        key_sentences = {s[0] for s in scored_sentences[:num_points]}

        # Rebuild text with highlights
        escaped = self._escape_html(text)
        result_sentences = re.split(r'(?<=[.!?])\s+', escaped)
        highlighted_parts = []

        for sentence in result_sentences:
            original = self._unescape_for_comparison(sentence)
            if original in key_sentences:
                highlighted_parts.append(
                    f'<span style="background-color: #fff59d; '
                    f'padding: 0.2em;">{sentence}</span>'
                )
            else:
                highlighted_parts.append(sentence)

        return ' '.join(highlighted_parts)

    def _unescape_for_comparison(self, text: str) -> str:
        """Unescape HTML for comparison."""
        return html.unescape(text)

    def chunk_text(
        self,
        text: str,
        chunk_size: int = 100,
        overlap: int = 0,
    ) -> List[str]:
        """
        Break text into manageable chunks.

        Args:
            text: Text to chunk
            chunk_size: Target words per chunk
            overlap: Number of words to overlap between chunks

        Returns:
            List of text chunks
        """
        if not text:
            return []

        words = text.split()
        chunks = []
        current_chunk = []
        current_size = 0

        for word in words:
            current_chunk.append(word)
            current_size += 1

            # Check for natural break points (end of sentence)
            if current_size >= chunk_size and word.endswith(('.', '!', '?')):
                chunks.append(' '.join(current_chunk))

                # Handle overlap
                if overlap > 0:
                    current_chunk = current_chunk[-overlap:]
                    current_size = overlap
                else:
                    current_chunk = []
                    current_size = 0

        # Add remaining words
        if current_chunk:
            chunks.append(' '.join(current_chunk))

        return chunks

    def suggest_reading_pace(
        self,
        text: str,
        reader_profile: Optional[str] = None,
    ) -> ReadingPaceRecommendation:
        """
        Suggest reading pace and breaks.

        Args:
            text: Text to analyze
            reader_profile: Reader's accessibility profile

        Returns:
            ReadingPaceRecommendation with pace and break suggestions
        """
        if not text:
            raise ValueError("Text cannot be empty")

        logger.info(f"Calculating reading pace for text ({len(text)} chars)")

        # Analyze text difficulty
        difficulty = self._assess_difficulty(text)

        # Get base reading speed
        base_speed = self.READING_SPEEDS.get(difficulty, 150)

        # Adjust for profile
        if reader_profile == "dyslexia":
            base_speed = int(base_speed * 0.7)  # 30% slower
        elif reader_profile == "adhd":
            base_speed = int(base_speed * 0.8)  # 20% slower
        elif reader_profile == "low_vision":
            base_speed = int(base_speed * 0.75)  # 25% slower
        elif reader_profile == "cognitive":
            base_speed = int(base_speed * 0.6)  # 40% slower

        # Calculate reading time
        word_count = len(text.split())
        total_time = word_count / base_speed  # in minutes

        # Determine chunk size based on profile
        chunk_size = self.PROFILES.get(
            reader_profile or "default", {}
        ).get("chunk_size", 100)

        # Calculate suggested breaks
        chunks = self.chunk_text(text, chunk_size)
        breaks = []

        cumulative_time = 0
        for i, chunk in enumerate(chunks):
            chunk_words = len(chunk.split())
            chunk_time = chunk_words / base_speed

            cumulative_time += chunk_time

            if i < len(chunks) - 1:  # Don't add break after last chunk
                # Suggest break duration based on chunk difficulty
                break_duration = 30 if difficulty in ("difficult", "technical") else 15

                breaks.append({
                    "after_chunk": i + 1,
                    "position_minutes": round(cumulative_time, 1),
                    "suggested_duration_seconds": break_duration,
                    "activity": self._suggest_break_activity(i, len(chunks)),
                })

        result = ReadingPaceRecommendation(
            words_per_minute=base_speed,
            suggested_breaks=breaks,
            chunk_size=chunk_size,
            estimated_total_time=round(total_time, 1),
            difficulty_level=difficulty,
        )

        logger.info(
            f"Reading pace: {base_speed} wpm, {len(breaks)} breaks, "
            f"{total_time:.1f}min total"
        )

        return result

    def _assess_difficulty(self, text: str) -> str:
        """Assess text difficulty level."""
        words = text.split()
        if not words:
            return "easy"

        # Calculate average word length
        avg_word_length = np.mean([len(w) for w in words])

        # Count complex words (3+ syllables approximated by length)
        complex_words = sum(1 for w in words if len(w) > 8)
        complex_ratio = complex_words / len(words)

        # Calculate sentence length
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        avg_sentence_length = len(words) / max(len(sentences), 1)

        # Determine difficulty
        if avg_word_length > 7 or complex_ratio > 0.2 or avg_sentence_length > 25:
            return "technical"
        elif avg_word_length > 6 or complex_ratio > 0.15 or avg_sentence_length > 20:
            return "difficult"
        elif avg_word_length > 5 or complex_ratio > 0.1 or avg_sentence_length > 15:
            return "medium"
        else:
            return "easy"

    def _suggest_break_activity(self, break_index: int, total_chunks: int) -> str:
        """Suggest an activity for the break."""
        activities = [
            "Take a deep breath and relax your eyes",
            "Look away from the screen at something distant",
            "Stretch your neck and shoulders",
            "Think about what you just read",
            "Take a short walk or stand up",
            "Get a drink of water",
        ]

        return activities[break_index % len(activities)]

    def _estimate_reading_time(self, text: str, profile: str) -> float:
        """Estimate reading time in minutes."""
        word_count = len(text.split())
        difficulty = self._assess_difficulty(text)
        base_speed = self.READING_SPEEDS.get(difficulty, 150)

        # Adjust for profile
        speed_multipliers = {
            "dyslexia": 0.7,
            "adhd": 0.8,
            "low_vision": 0.75,
            "cognitive": 0.6,
            "default": 1.0,
        }

        multiplier = speed_multipliers.get(profile, 1.0)
        adjusted_speed = base_speed * multiplier

        return word_count / adjusted_speed

    def get_profile_settings(self, profile: str) -> Dict[str, Any]:
        """
        Get settings for a specific profile.

        Args:
            profile: Profile name

        Returns:
            Dictionary of profile settings
        """
        return self.PROFILES.get(profile, self.PROFILES["default"]).copy()

    def list_profiles(self) -> List[Dict[str, Any]]:
        """
        List all available reading profiles.

        Returns:
            List of profile information dictionaries
        """
        profiles = []

        descriptions = {
            "default": "Standard formatting suitable for most readers",
            "dyslexia": "Optimized for readers with dyslexia: increased spacing, "
                        "specialized fonts, cream background",
            "low_vision": "High contrast formatting for readers with low vision: "
                          "large text, yellow on black",
            "adhd": "Focus-oriented formatting for readers with ADHD: chunking, "
                    "key word highlighting, visual markers",
            "cognitive": "Simplified layout for cognitive accessibility: numbered "
                         "sentences, alternating colors, small chunks",
        }

        for name, settings in self.PROFILES.items():
            profiles.append({
                "name": name,
                "description": descriptions.get(name, "Custom profile"),
                "font_size": settings.get("font_size"),
                "chunk_size": settings.get("chunk_size"),
                "line_height": settings.get("line_height"),
            })

        return profiles
