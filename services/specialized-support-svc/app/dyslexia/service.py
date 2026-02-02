"""
Main Dyslexia Support Service.

Orchestrates all dyslexia support features including reading support,
writing support, and learning accommodations.
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Protocol

from .models import (
    DecodingStrategy,
    DyslexiaProfile,
    DyslexiaType,
    FormattedText,
    ReadingAssistance,
    ReadingPreferences,
    TextFormat,
    WritingAssistance,
    WritingChallenge,
    WritingSupport,
)
from .reading_support import ReadingSupportService
from .writing_support import WritingSupportService

logger = logging.getLogger(__name__)


class LLMClient(Protocol):
    """Protocol for LLM client interface."""

    async def generate(
        self,
        prompt: str,
        temperature: float = 0.3,
        max_tokens: int = 1000,
    ) -> str:
        """Generate text from a prompt."""
        ...


class DyslexiaProfileRepository(Protocol):
    """Protocol for dyslexia profile storage interface."""

    async def get_profile(self, learner_id: str) -> Optional[DyslexiaProfile]:
        """Get dyslexia profile for a learner."""
        ...

    async def save_profile(self, profile: DyslexiaProfile) -> None:
        """Save dyslexia profile for a learner."""
        ...


class InMemoryDyslexiaProfileRepository:
    """In-memory implementation of profile repository for testing/development."""

    def __init__(self) -> None:
        self._profiles: Dict[str, DyslexiaProfile] = {}

    async def get_profile(self, learner_id: str) -> Optional[DyslexiaProfile]:
        """Get dyslexia profile for a learner."""
        return self._profiles.get(learner_id)

    async def save_profile(self, profile: DyslexiaProfile) -> None:
        """Save dyslexia profile for a learner."""
        self._profiles[profile.learner_id] = profile


class DyslexiaSupportService:
    """
    Main dyslexia AI support service.

    Provides a unified interface for all dyslexia support features:
    - Reading support and text formatting
    - Decoding strategies
    - Writing assistance
    - Spelling support
    - Accommodations
    """

    def __init__(
        self,
        llm_client: Optional[LLMClient] = None,
        profile_repository: Optional[DyslexiaProfileRepository] = None,
    ):
        """
        Initialize the dyslexia AI service.

        Args:
            llm_client: Optional LLM client for AI-powered features.
            profile_repository: Repository for storing/retrieving profiles.
        """
        self.llm = llm_client
        self.profile_repo = profile_repository or InMemoryDyslexiaProfileRepository()

        # Initialize component services
        self.reading_support = ReadingSupportService(llm_client=llm_client)
        self.writing_support = WritingSupportService(llm_client=llm_client)

        # Default profile
        self._default_profile = DyslexiaProfile(
            learner_id="default",
            dyslexia_type=DyslexiaType.MIXED,
            preferred_decoding_strategies=[
                DecodingStrategy.SYLLABLE,
                DecodingStrategy.CONTEXT,
            ],
        )

        logger.info("DyslexiaSupportService initialized")

    async def get_support(
        self,
        learner_id: str,
        support_type: str,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Main entry point for dyslexia support.

        Support types:
        - format_text: Format text for easier reading
        - decoding_help: Get decoding strategies for a word
        - reading_assistance: Get comprehensive reading support
        - writing_assistance: Get writing help and organizers
        - spelling_support: Get spelling help for a word
        - check_writing: Check and suggest improvements
        - accommodations: Get recommended accommodations

        Args:
            learner_id: ID of the learner
            support_type: Type of support requested
            context: Context-specific data

        Returns:
            Dictionary containing the support response
        """
        # Get or create profile
        profile = await self.profile_repo.get_profile(learner_id)
        if not profile:
            profile = DyslexiaProfile(
                learner_id=learner_id,
                dyslexia_type=self._default_profile.dyslexia_type,
                preferred_decoding_strategies=self._default_profile.preferred_decoding_strategies.copy(),
            )
            await self.profile_repo.save_profile(profile)

        # Route to appropriate handler
        handlers = {
            "format_text": self._handle_format_text,
            "decoding_help": self._handle_decoding_help,
            "reading_assistance": self._handle_reading_assistance,
            "reading_accommodations": self._handle_reading_accommodations,
            "writing_assistance": self._handle_writing_assistance,
            "spelling_support": self._handle_spelling_support,
            "check_writing": self._handle_check_writing,
            "writing_accommodations": self._handle_writing_accommodations,
            "word_bank": self._handle_word_bank,
            "all_accommodations": self._handle_all_accommodations,
        }

        handler = handlers.get(support_type)
        if not handler:
            raise ValueError(
                f"Unknown support type: {support_type}. "
                f"Valid types: {list(handlers.keys())}"
            )

        return await handler(profile, context)

    async def _handle_format_text(
        self,
        profile: DyslexiaProfile,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Handle text formatting request."""
        text = context.get("text", "")
        format_type = context.get("format_type")
        
        if format_type:
            format_type = TextFormat(format_type)
        
        formatted = await self.reading_support.format_text(
            text=text,
            profile=profile,
            format_type=format_type,
        )
        
        return {
            "support_type": "format_text",
            "original_text": formatted.original_text,
            "formatted_text": formatted.formatted_text,
            "syllabified_text": formatted.syllabified_text,
            "word_count": formatted.word_count,
            "estimated_reading_time_seconds": formatted.estimated_reading_time_seconds,
            "difficult_words": formatted.difficult_words,
            "format_applied": formatted.format_applied.value,
        }

    async def _handle_decoding_help(
        self,
        profile: DyslexiaProfile,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Handle decoding help request."""
        word = context.get("word", "")
        
        strategies = await self.reading_support.get_decoding_strategies(
            word=word,
            profile=profile,
        )
        
        return {
            "support_type": "decoding_help",
            "word": word,
            **strategies,
        }

    async def _handle_reading_assistance(
        self,
        profile: DyslexiaProfile,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Handle comprehensive reading assistance request."""
        text = context.get("text", "")
        
        assistance = await self.reading_support.create_reading_assistance(
            text=text,
            profile=profile,
        )
        
        return {
            "support_type": "reading_assistance",
            "text_id": assistance.text_id,
            "vocabulary_support": assistance.vocabulary_support,
            "phonetic_hints": assistance.phonetic_hints,
            "comprehension_questions": assistance.comprehension_questions,
            "key_points": assistance.key_points,
        }

    async def _handle_reading_accommodations(
        self,
        profile: DyslexiaProfile,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Handle reading accommodations request."""
        accommodations = await self.reading_support.get_reading_accommodations(
            profile=profile,
            context=context,
        )
        
        return {
            "support_type": "reading_accommodations",
            "accommodations": accommodations,
            "reading_preferences": {
                "font": profile.reading_preferences.font.value,
                "font_size": profile.reading_preferences.font_size,
                "line_spacing": profile.reading_preferences.line_spacing,
                "text_to_speech": profile.reading_preferences.text_to_speech,
            },
        }

    async def _handle_writing_assistance(
        self,
        profile: DyslexiaProfile,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Handle writing assistance request."""
        task_type = context.get("task_type", "paragraph")
        topic = context.get("topic")
        
        assistance = await self.writing_support.get_writing_assistance(
            task_type=task_type,
            profile=profile,
            topic=topic,
        )
        
        return {
            "support_type": "writing_assistance",
            "task_type": assistance.task_type,
            "graphic_organizer": assistance.graphic_organizer,
            "sentence_starters": assistance.sentence_starters,
            "word_suggestions": assistance.word_suggestions,
            "structure_template": assistance.structure_template,
        }

    async def _handle_spelling_support(
        self,
        profile: DyslexiaProfile,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Handle spelling support request."""
        word = context.get("word", "")
        
        support = await self.writing_support.get_spelling_support(
            word=word,
            profile=profile,
        )
        
        return {
            "support_type": "spelling_support",
            **support,
        }

    async def _handle_check_writing(
        self,
        profile: DyslexiaProfile,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Handle writing check request."""
        text = context.get("text", "")
        
        suggestions = await self.writing_support.check_and_suggest(
            text=text,
            profile=profile,
        )
        
        return {
            "support_type": "check_writing",
            **suggestions,
        }

    async def _handle_writing_accommodations(
        self,
        profile: DyslexiaProfile,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Handle writing accommodations request."""
        accommodations = await self.writing_support.get_writing_accommodations(
            profile=profile,
            context=context,
        )
        
        return {
            "support_type": "writing_accommodations",
            "accommodations": accommodations,
            "writing_support_enabled": {
                "spell_check": profile.writing_support.spell_check_enabled,
                "word_prediction": profile.writing_support.word_prediction,
                "speech_to_text": profile.writing_support.speech_to_text,
                "graphic_organizers": profile.writing_support.graphic_organizers,
            },
        }

    async def _handle_word_bank(
        self,
        profile: DyslexiaProfile,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Handle word bank request."""
        topic = context.get("topic", "general")
        word_type = context.get("word_type")
        
        word_bank = await self.writing_support.get_word_bank(
            topic=topic,
            word_type=word_type,
        )
        
        return {
            "support_type": "word_bank",
            "topic": topic,
            "word_bank": word_bank,
        }

    async def _handle_all_accommodations(
        self,
        profile: DyslexiaProfile,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Handle request for all accommodations."""
        reading_accommodations = await self.reading_support.get_reading_accommodations(
            profile=profile,
            context=context,
        )
        
        writing_accommodations = await self.writing_support.get_writing_accommodations(
            profile=profile,
            context=context,
        )
        
        # Combine and deduplicate
        all_accommodations = list(set(reading_accommodations + writing_accommodations))
        
        return {
            "support_type": "all_accommodations",
            "reading_accommodations": reading_accommodations,
            "writing_accommodations": writing_accommodations,
            "combined_accommodations": all_accommodations,
            "profile_accommodations": profile.accommodations,
        }

    async def update_profile(
        self,
        learner_id: str,
        updates: Dict[str, Any],
    ) -> DyslexiaProfile:
        """
        Update a learner's dyslexia profile.

        Args:
            learner_id: ID of the learner
            updates: Dictionary of profile updates

        Returns:
            Updated DyslexiaProfile
        """
        profile = await self.profile_repo.get_profile(learner_id)
        if not profile:
            profile = DyslexiaProfile(learner_id=learner_id)

        # Apply updates
        if "dyslexia_type" in updates:
            profile.dyslexia_type = DyslexiaType(updates["dyslexia_type"])
        
        if "reading_preferences" in updates:
            prefs = updates["reading_preferences"]
            profile.reading_preferences = ReadingPreferences(**prefs)
        
        if "writing_support" in updates:
            ws = updates["writing_support"]
            profile.writing_support = WritingSupport(**ws)
        
        if "preferred_decoding_strategies" in updates:
            profile.preferred_decoding_strategies = [
                DecodingStrategy(s) for s in updates["preferred_decoding_strategies"]
            ]
        
        if "writing_challenges" in updates:
            profile.writing_challenges = [
                WritingChallenge(c) for c in updates["writing_challenges"]
            ]
        
        if "sight_words_mastered" in updates:
            profile.sight_words_mastered = updates["sight_words_mastered"]
        
        if "difficult_patterns" in updates:
            profile.difficult_patterns = updates["difficult_patterns"]
        
        if "accommodations" in updates:
            profile.accommodations = updates["accommodations"]

        profile.updated_at = datetime.now()
        await self.profile_repo.save_profile(profile)
        
        return profile

    async def get_profile(self, learner_id: str) -> Optional[DyslexiaProfile]:
        """Get a learner's dyslexia profile."""
        return await self.profile_repo.get_profile(learner_id)

    async def add_mastered_sight_words(
        self,
        learner_id: str,
        words: List[str],
    ) -> DyslexiaProfile:
        """
        Add mastered sight words to a learner's profile.

        Args:
            learner_id: ID of the learner
            words: Words to add as mastered

        Returns:
            Updated profile
        """
        profile = await self.profile_repo.get_profile(learner_id)
        if not profile:
            profile = DyslexiaProfile(learner_id=learner_id)
        
        profile.sight_words_mastered.extend(words)
        profile.sight_words_mastered = list(set(profile.sight_words_mastered))
        profile.updated_at = datetime.now()
        
        await self.profile_repo.save_profile(profile)
        return profile

    async def track_difficult_pattern(
        self,
        learner_id: str,
        pattern: str,
    ) -> DyslexiaProfile:
        """
        Track a difficult pattern for a learner.

        Args:
            learner_id: ID of the learner
            pattern: Pattern that is difficult (e.g., "ough", "tion")

        Returns:
            Updated profile
        """
        profile = await self.profile_repo.get_profile(learner_id)
        if not profile:
            profile = DyslexiaProfile(learner_id=learner_id)
        
        if pattern not in profile.difficult_patterns:
            profile.difficult_patterns.append(pattern)
            profile.updated_at = datetime.now()
            await self.profile_repo.save_profile(profile)
        
        return profile
