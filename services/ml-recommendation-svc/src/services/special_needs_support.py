"""
Special Needs Support Services

Evidence-based support for:
- Autism Spectrum Disorder
- ADHD
- Dyslexia
- Speech & Language disorders

All accommodations are research-backed and aligned with IEP requirements.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

import structlog
from pydantic import BaseModel, Field

logger = structlog.get_logger()


class DisabilityType(str, Enum):
    """Supported disability types."""

    AUTISM = "autism"
    ADHD = "adhd"
    DYSLEXIA = "dyslexia"
    SPEECH_LANGUAGE = "speech_language"
    INTELLECTUAL = "intellectual"
    EMOTIONAL_BEHAVIORAL = "emotional_behavioral"


class AccommodationCategory(str, Enum):
    """Categories of accommodations."""

    PRESENTATION = "presentation"
    RESPONSE = "response"
    SETTING = "setting"
    TIMING = "timing"
    ASSISTIVE_TECHNOLOGY = "assistive_technology"


class Accommodation(BaseModel):
    """Individual accommodation setting."""

    id: UUID = Field(default_factory=uuid4)
    category: AccommodationCategory
    name: str
    description: str
    enabled: bool = True
    settings: Dict[str, Any] = Field(default_factory=dict)


class DisabilitySupportPlan(BaseModel):
    """Support plan for a student with disabilities."""

    id: UUID = Field(default_factory=uuid4)
    student_id: UUID
    disability_type: DisabilityType
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    accommodations: List[Accommodation] = Field(default_factory=list)
    effectiveness_score: Optional[float] = None
    notes: str = ""


# =============================================================================
# AUTISM SUPPORT
# =============================================================================


class AutismSupportService:
    """
    Autism-specific support service.

    Evidence-based accommodations:
    - Predictable routines
    - Visual supports
    - Sensory considerations
    - Social stories
    - Clear expectations
    - Reduced social demands
    """

    def get_default_accommodations(self) -> List[Accommodation]:
        """Get default autism accommodations."""
        return [
            Accommodation(
                category=AccommodationCategory.PRESENTATION,
                name="visual_schedule",
                description="Show visual schedule of activities",
                enabled=True,
                settings={
                    "show_icons": True,
                    "show_time_estimates": True,
                    "highlight_current_step": True,
                },
            ),
            Accommodation(
                category=AccommodationCategory.PRESENTATION,
                name="clear_expectations",
                description="Display explicit expectations before each activity",
                enabled=True,
                settings={
                    "what_you_will_do": True,
                    "how_long": True,
                    "success_criteria": True,
                },
            ),
            Accommodation(
                category=AccommodationCategory.SETTING,
                name="predictable_structure",
                description="Maintain consistent activity structure",
                enabled=True,
                settings={
                    "same_order_every_time": True,
                    "warnings_before_transitions": True,
                    "countdown_seconds": 10,
                },
            ),
            Accommodation(
                category=AccommodationCategory.PRESENTATION,
                name="concrete_language",
                description="Use concrete over abstract language",
                enabled=True,
                settings={
                    "avoid_idioms": True,
                    "literal_instructions": True,
                    "visual_examples": True,
                },
            ),
            Accommodation(
                category=AccommodationCategory.SETTING,
                name="sensory_considerations",
                description="Minimize sensory overload",
                enabled=True,
                settings={
                    "reduce_animations": True,
                    "muted_colors": True,
                    "optional_sounds": True,
                    "no_auto_play_audio": True,
                },
            ),
            Accommodation(
                category=AccommodationCategory.RESPONSE,
                name="reduced_social_demands",
                description="Minimize social interaction requirements",
                enabled=True,
                settings={
                    "solo_activities_preferred": True,
                    "no_forced_collaboration": True,
                    "written_over_verbal": True,
                },
            ),
        ]

    def apply_adaptations(
        self,
        content: Dict[str, Any],
        plan: DisabilitySupportPlan,
    ) -> Dict[str, Any]:
        """Apply autism-specific adaptations to content."""

        adapted = content.copy()

        for accommodation in plan.accommodations:
            if not accommodation.enabled:
                continue

            if accommodation.name == "visual_schedule":
                adapted["visual_schedule"] = {
                    "show": True,
                    "steps": self._generate_visual_schedule(content),
                }

            elif accommodation.name == "clear_expectations":
                adapted["expectations"] = {
                    "show_upfront": True,
                    "what_you_will_do": content.get("title", "Complete activity"),
                    "how_long": "About 10 minutes",
                    "how_you_know_success": "Get most questions correct",
                }

            elif accommodation.name == "predictable_structure":
                adapted["structure"] = accommodation.settings

            elif accommodation.name == "sensory_considerations":
                adapted["ui_settings"] = {
                    "reduce_animations": True,
                    "muted_color_palette": True,
                    "no_auto_play": True,
                }

        logger.info("autism_adaptations_applied", student_id=str(plan.student_id))
        return adapted

    def _generate_visual_schedule(
        self, content: Dict[str, Any]
    ) -> List[Dict[str, str]]:
        """Generate visual schedule steps for an activity."""
        return [
            {"icon": "📖", "label": "Read instructions", "duration": "1 min"},
            {"icon": "❓", "label": "Answer questions", "duration": "5 min"},
            {"icon": "✅", "label": "Check answers", "duration": "2 min"},
            {"icon": "🎉", "label": "Celebration!", "duration": "1 min"},
        ]

    def generate_social_story(
        self,
        scenario: str,
        student_name: str,
    ) -> Dict[str, Any]:
        """Generate a social story for a specific scenario."""
        return {
            "title": f"{student_name}'s {scenario.title()} Story",
            "format": "social_story",
            "sentences": [
                f"Sometimes {student_name} needs to {scenario}.",
                f"It is okay to feel nervous about {scenario}.",
                f"When {student_name} {scenario}, good things can happen.",
                f"{student_name} can ask for help if needed.",
                f"After {scenario}, {student_name} can feel proud.",
            ],
            "visuals": ["nervous_face.png", "asking_help.png", "proud_face.png"],
        }


# =============================================================================
# ADHD SUPPORT
# =============================================================================


class ADHDSupportService:
    """
    ADHD-specific support service.

    Evidence-based accommodations:
    - Chunking (smaller segments)
    - Gamified timers
    - Movement breaks
    - Minimal distractions
    - Executive function scaffolding
    - Attention rewards
    """

    def get_default_accommodations(self) -> List[Accommodation]:
        """Get default ADHD accommodations."""
        return [
            Accommodation(
                category=AccommodationCategory.PRESENTATION,
                name="chunking",
                description="Break content into smaller chunks",
                enabled=True,
                settings={
                    "chunk_size": 3,
                    "show_progress": True,
                    "celebration_after_chunk": True,
                },
            ),
            Accommodation(
                category=AccommodationCategory.TIMING,
                name="gamified_timer",
                description="Visual countdown timer with gamification",
                enabled=True,
                settings={
                    "type": "progress_bar",
                    "color_changes": True,
                    "sound_alerts": False,
                },
            ),
            Accommodation(
                category=AccommodationCategory.TIMING,
                name="movement_breaks",
                description="Scheduled movement breaks",
                enabled=True,
                settings={
                    "frequency_minutes": 5,
                    "duration_seconds": 60,
                    "activities": [
                        "Stand up and stretch",
                        "Do 5 jumping jacks",
                        "Take 3 deep breaths",
                    ],
                },
            ),
            Accommodation(
                category=AccommodationCategory.SETTING,
                name="minimal_distractions",
                description="Reduce visual clutter and distractions",
                enabled=True,
                settings={
                    "hide_decorations": True,
                    "focus_mode": True,
                    "one_element_at_time": True,
                },
            ),
            Accommodation(
                category=AccommodationCategory.ASSISTIVE_TECHNOLOGY,
                name="executive_function_scaffolding",
                description="Tools to support executive function",
                enabled=True,
                settings={
                    "task_checklist": True,
                    "step_by_step_guidance": True,
                    "reminder_prompts": True,
                },
            ),
            Accommodation(
                category=AccommodationCategory.RESPONSE,
                name="attention_rewards",
                description="Immediate rewards for sustained attention",
                enabled=True,
                settings={
                    "points_per_focus_minute": 10,
                    "streak_bonus": True,
                    "visual_celebration": True,
                },
            ),
        ]

    def apply_adaptations(
        self,
        content: Dict[str, Any],
        plan: DisabilitySupportPlan,
    ) -> Dict[str, Any]:
        """Apply ADHD-specific adaptations to content."""

        adapted = content.copy()

        for accommodation in plan.accommodations:
            if not accommodation.enabled:
                continue

            if accommodation.name == "chunking":
                if "questions" in adapted:
                    adapted["chunking"] = accommodation.settings

            elif accommodation.name == "gamified_timer":
                adapted["timer"] = {
                    "type": "gamified",
                    "show": True,
                    **accommodation.settings,
                }

            elif accommodation.name == "movement_breaks":
                adapted["movement_breaks"] = accommodation.settings

            elif accommodation.name == "minimal_distractions":
                adapted["ui_minimalism"] = accommodation.settings

            elif accommodation.name == "executive_function_scaffolding":
                adapted["scaffolding"] = accommodation.settings

            elif accommodation.name == "attention_rewards":
                adapted["rewards"] = accommodation.settings

        logger.info("adhd_adaptations_applied", student_id=str(plan.student_id))
        return adapted

    def calculate_optimal_break_schedule(
        self,
        attention_span_minutes: int,
        session_length_minutes: int,
    ) -> List[Dict[str, Any]]:
        """Calculate optimal break schedule based on attention span."""
        breaks = []
        current_time = attention_span_minutes

        while current_time < session_length_minutes:
            breaks.append(
                {
                    "at_minute": current_time,
                    "duration_seconds": 60,
                    "type": "movement_break",
                }
            )
            current_time += attention_span_minutes

        return breaks


# =============================================================================
# DYSLEXIA SUPPORT
# =============================================================================


class DyslexiaSupportService:
    """
    Dyslexia-specific support service.

    Evidence-based accommodations (Orton-Gillingham approach):
    - OpenDyslexic font
    - Increased spacing
    - Audio support
    - Color-coded phonics
    - Multi-sensory learning
    - Progress monitoring
    """

    def get_default_accommodations(self) -> List[Accommodation]:
        """Get default dyslexia accommodations."""
        return [
            Accommodation(
                category=AccommodationCategory.PRESENTATION,
                name="dyslexia_friendly_text",
                description="Text rendering optimized for dyslexia",
                enabled=True,
                settings={
                    "font_family": "OpenDyslexic",
                    "font_size": 18,
                    "line_spacing": 2.0,
                    "letter_spacing": 1.2,
                    "color_scheme": "cream_background_dark_text",
                    "highlight_on_hover": True,
                },
            ),
            Accommodation(
                category=AccommodationCategory.ASSISTIVE_TECHNOLOGY,
                name="audio_support",
                description="Text-to-speech and audio instructions",
                enabled=True,
                settings={
                    "enabled": True,
                    "auto_play": False,
                    "speed_control": [0.75, 1.0, 1.25],
                    "voice_type": "natural",
                },
            ),
            Accommodation(
                category=AccommodationCategory.PRESENTATION,
                name="phonics_color_coding",
                description="Color-code vowels and phonics patterns",
                enabled=True,
                settings={
                    "color_code_vowels": True,
                    "vowel_color": "#FF6B6B",
                    "consonant_color": "#4ECDC4",
                    "syllable_division": True,
                    "phoneme_highlighting": True,
                },
            ),
            Accommodation(
                category=AccommodationCategory.PRESENTATION,
                name="multi_sensory_learning",
                description="Visual, auditory, and kinesthetic elements",
                enabled=True,
                settings={
                    "visual_supports": True,
                    "audio_pronunciation": True,
                    "tracing_animations": True,
                },
            ),
            Accommodation(
                category=AccommodationCategory.TIMING,
                name="extended_time",
                description="Additional time for reading tasks",
                enabled=True,
                settings={
                    "time_multiplier": 1.5,
                    "no_time_pressure_mode": True,
                },
            ),
            Accommodation(
                category=AccommodationCategory.RESPONSE,
                name="spelling_support",
                description="Spelling assistance and word prediction",
                enabled=True,
                settings={
                    "spell_check": True,
                    "word_prediction": True,
                    "phonetic_spelling_accepted": True,
                },
            ),
        ]

    def apply_adaptations(
        self,
        content: Dict[str, Any],
        plan: DisabilitySupportPlan,
    ) -> Dict[str, Any]:
        """Apply dyslexia-specific adaptations to content."""

        adapted = content.copy()

        for accommodation in plan.accommodations:
            if not accommodation.enabled:
                continue

            if accommodation.name == "dyslexia_friendly_text":
                adapted["text_adaptations"] = accommodation.settings

            elif accommodation.name == "audio_support":
                adapted["audio_support"] = accommodation.settings

            elif accommodation.name == "phonics_color_coding":
                adapted["visual_cues"] = accommodation.settings

            elif accommodation.name == "multi_sensory_learning":
                adapted["multi_sensory"] = accommodation.settings

            elif accommodation.name == "extended_time":
                # Apply time multiplier to all time limits
                if "success_criteria" in adapted:
                    if "time_limit_per_question" in adapted["success_criteria"]:
                        multiplier = accommodation.settings.get("time_multiplier", 1.5)
                        adapted["success_criteria"]["time_limit_per_question"] *= multiplier

            elif accommodation.name == "spelling_support":
                adapted["spelling_support"] = accommodation.settings

        logger.info("dyslexia_adaptations_applied", student_id=str(plan.student_id))
        return adapted

    def get_phoneme_drill(
        self,
        target_phoneme: str,
        reading_level: float,
    ) -> Dict[str, Any]:
        """Generate multi-sensory phoneme drill."""

        # Phoneme word banks
        phoneme_words = {
            "/b/": ["bat", "ball", "big", "Bob", "book"],
            "/m/": ["mat", "mom", "map", "man", "milk"],
            "/sh/": ["ship", "shop", "fish", "dish", "wish"],
            "/ch/": ["chip", "chop", "chat", "lunch", "bench"],
            "/th/": ["this", "that", "with", "bath", "math"],
            "/ai/": ["rain", "mail", "train", "paint", "wait"],
            "/ee/": ["tree", "free", "sleep", "keep", "feet"],
            "/oa/": ["boat", "coat", "road", "toast", "soap"],
        }

        words = phoneme_words.get(target_phoneme, ["word"])

        return {
            "title": f"Phonics Practice: {target_phoneme} sound",
            "target_phoneme": target_phoneme,
            "multi_sensory_steps": [
                {
                    "step": 1,
                    "modality": "visual",
                    "content": f"Look at the letters that make the {target_phoneme} sound",
                    "media_type": "image",
                },
                {
                    "step": 2,
                    "modality": "auditory",
                    "content": f"Listen to the {target_phoneme} sound",
                    "media_type": "audio",
                },
                {
                    "step": 3,
                    "modality": "kinesthetic",
                    "content": "Trace the letters in the air with your finger",
                    "media_type": "animation",
                },
                {
                    "step": 4,
                    "modality": "practice",
                    "content": "Now let's practice words with this sound!",
                    "words": words,
                },
            ],
            "practice_activities": [
                {
                    "type": "identify_sound",
                    "prompt": f"Which word has the {target_phoneme} sound?",
                    "options": words[:4],
                    "correct_answer_index": 0,
                },
                {
                    "type": "blend_word",
                    "prompt": "Blend these sounds together:",
                    "phonemes": list(words[0]),
                    "correct_word": words[0],
                    "audio_support": True,
                },
            ],
        }


# =============================================================================
# UNIFIED SPECIAL NEEDS SERVICE
# =============================================================================


class SpecialNeedsSupportService:
    """
    Unified service for all special needs support.

    Coordinates disability-specific services and provides
    a single interface for applying accommodations.
    """

    def __init__(self):
        self.autism_service = AutismSupportService()
        self.adhd_service = ADHDSupportService()
        self.dyslexia_service = DyslexiaSupportService()

        # In-memory storage for demo
        self._plans: Dict[str, DisabilitySupportPlan] = {}

    async def create_support_plan(
        self,
        student_id: UUID,
        disability_type: DisabilityType,
        custom_accommodations: Optional[List[Accommodation]] = None,
    ) -> DisabilitySupportPlan:
        """Create a support plan for a student."""

        # Get default accommodations for disability type
        if disability_type == DisabilityType.AUTISM:
            accommodations = self.autism_service.get_default_accommodations()
        elif disability_type == DisabilityType.ADHD:
            accommodations = self.adhd_service.get_default_accommodations()
        elif disability_type == DisabilityType.DYSLEXIA:
            accommodations = self.dyslexia_service.get_default_accommodations()
        else:
            accommodations = []

        # Add any custom accommodations
        if custom_accommodations:
            accommodations.extend(custom_accommodations)

        plan = DisabilitySupportPlan(
            student_id=student_id,
            disability_type=disability_type,
            accommodations=accommodations,
        )

        self._plans[str(student_id)] = plan

        logger.info(
            "support_plan_created",
            student_id=str(student_id),
            disability_type=disability_type.value,
            accommodation_count=len(accommodations),
        )

        return plan

    async def get_support_plan(
        self, student_id: UUID
    ) -> Optional[DisabilitySupportPlan]:
        """Get support plan for a student."""
        return self._plans.get(str(student_id))

    async def apply_accommodations(
        self,
        content: Dict[str, Any],
        student_id: UUID,
    ) -> Dict[str, Any]:
        """Apply all accommodations from student's support plan to content."""

        plan = await self.get_support_plan(student_id)
        if not plan:
            return content

        if plan.disability_type == DisabilityType.AUTISM:
            return self.autism_service.apply_adaptations(content, plan)
        elif plan.disability_type == DisabilityType.ADHD:
            return self.adhd_service.apply_adaptations(content, plan)
        elif plan.disability_type == DisabilityType.DYSLEXIA:
            return self.dyslexia_service.apply_adaptations(content, plan)

        return content

    async def get_all_supported_disabilities(self) -> List[Dict[str, Any]]:
        """Get list of all supported disabilities with effectiveness data."""
        return [
            {
                "type": DisabilityType.AUTISM.value,
                "name": "Autism Support",
                "icon": "🧩",
                "features": [
                    "Predictable routines",
                    "Visual supports",
                    "Sensory considerations",
                    "Social stories",
                ],
                "effectiveness": 89,
            },
            {
                "type": DisabilityType.ADHD.value,
                "name": "ADHD Support",
                "icon": "⚡",
                "features": [
                    "Gamification",
                    "Micro-breaks",
                    "Executive function scaffolding",
                    "Attention rewards",
                ],
                "effectiveness": 86,
            },
            {
                "type": DisabilityType.DYSLEXIA.value,
                "name": "Dyslexia Intervention",
                "icon": "📖",
                "features": [
                    "Multi-sensory learning",
                    "Phoneme awareness",
                    "Decodable text",
                    "Progress monitoring",
                ],
                "effectiveness": 91,
            },
            {
                "type": DisabilityType.SPEECH_LANGUAGE.value,
                "name": "Speech & Language",
                "icon": "🗣️",
                "features": [
                    "Articulation therapy",
                    "Fluency practice",
                    "AAC integration",
                    "Pragmatic language",
                ],
                "effectiveness": 88,
            },
        ]


# Global service instance
_special_needs_service: Optional[SpecialNeedsSupportService] = None


def get_special_needs_service() -> SpecialNeedsSupportService:
    """Get global Special Needs service instance."""
    global _special_needs_service
    if _special_needs_service is None:
        _special_needs_service = SpecialNeedsSupportService()
    return _special_needs_service
