"""
Accessibility Profile Manager

Manage learner accessibility profiles and preferences.
"""
import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from enum import Enum
import copy

logger = logging.getLogger(__name__)


class AccessibilityCategory(Enum):
    """Categories of accessibility needs."""
    VISUAL = "visual"
    AUDITORY = "auditory"
    MOTOR = "motor"
    COGNITIVE = "cognitive"
    SPEECH = "speech"
    NEUROLOGICAL = "neurological"


class NeedSeverity(Enum):
    """Severity levels for accessibility needs."""
    NONE = "none"
    MILD = "mild"
    MODERATE = "moderate"
    SEVERE = "severe"


@dataclass
class AccessibilityNeed:
    """Represents a specific accessibility need."""
    category: AccessibilityCategory
    type: str
    severity: NeedSeverity
    preferences: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AccessibilityProfile:
    """Complete accessibility profile for a learner."""
    profile_id: str
    learner_id: str
    needs: List[AccessibilityNeed]
    visual_preferences: Dict[str, Any]
    audio_preferences: Dict[str, Any]
    cognitive_preferences: Dict[str, Any]
    input_preferences: Dict[str, Any]
    created_at: datetime
    updated_at: datetime
    is_active: bool = True
    version: int = 1


class AccessibilityProfileManager:
    """
    Manage accessibility profiles for learners.

    Stores:
    - Visual preferences
    - Audio preferences
    - Cognitive support needs
    - Input method preferences

    Usage:
        manager = AccessibilityProfileManager()
        profile = manager.create_profile(learner_id, needs)
        settings = manager.get_recommended_settings(learner_id)
    """

    # Default settings for each preference category
    DEFAULT_VISUAL_PREFERENCES: Dict[str, Any] = {
        "font_size": "16px",
        "font_family": "Arial, sans-serif",
        "line_height": 1.5,
        "letter_spacing": "normal",
        "word_spacing": "normal",
        "text_color": "#333333",
        "background_color": "#ffffff",
        "high_contrast": False,
        "color_blind_mode": None,  # None, "protanopia", "deuteranopia", "tritanopia"
        "reduce_motion": False,
        "cursor_size": "default",
        "focus_indicators": True,
    }

    DEFAULT_AUDIO_PREFERENCES: Dict[str, Any] = {
        "tts_enabled": False,
        "tts_voice": "default",
        "tts_speed": 1.0,
        "tts_pitch": 1.0,
        "volume": 1.0,
        "captions_enabled": True,
        "audio_descriptions": False,
        "sound_effects": True,
        "mono_audio": False,
    }

    DEFAULT_COGNITIVE_PREFERENCES: Dict[str, Any] = {
        "text_simplification": False,
        "target_reading_level": 8,
        "reading_profile": "default",
        "chunk_size": 200,
        "auto_summaries": False,
        "term_explanations": True,
        "visual_supports": True,
        "predictable_layout": True,
        "progress_indicators": True,
        "time_extensions": 1.0,  # multiplier for time limits
    }

    DEFAULT_INPUT_PREFERENCES: Dict[str, Any] = {
        "keyboard_navigation": True,
        "voice_input": False,
        "switch_access": False,
        "touch_accommodations": False,
        "click_assistance": False,
        "auto_complete": True,
        "spell_check": True,
        "input_timeout": 0,  # 0 means no timeout
    }

    # Recommended settings based on accessibility needs
    NEED_RECOMMENDATIONS: Dict[str, Dict[str, Any]] = {
        "dyslexia": {
            "visual": {
                "font_family": "OpenDyslexic, Comic Sans MS, Arial, sans-serif",
                "font_size": "18px",
                "line_height": 2.0,
                "letter_spacing": "0.12em",
                "word_spacing": "0.25em",
                "background_color": "#faf8f0",
            },
            "cognitive": {
                "text_simplification": True,
                "reading_profile": "dyslexia",
                "chunk_size": 100,
                "term_explanations": True,
            },
        },
        "low_vision": {
            "visual": {
                "font_size": "24px",
                "high_contrast": True,
                "text_color": "#000000",
                "background_color": "#ffffff",
                "cursor_size": "large",
                "focus_indicators": True,
            },
            "audio": {
                "tts_enabled": True,
                "audio_descriptions": True,
            },
        },
        "blind": {
            "visual": {
                "focus_indicators": True,
            },
            "audio": {
                "tts_enabled": True,
                "tts_speed": 1.2,
                "audio_descriptions": True,
            },
            "input": {
                "keyboard_navigation": True,
            },
        },
        "color_blind_protanopia": {
            "visual": {
                "color_blind_mode": "protanopia",
                "high_contrast": True,
            },
        },
        "color_blind_deuteranopia": {
            "visual": {
                "color_blind_mode": "deuteranopia",
                "high_contrast": True,
            },
        },
        "hearing_impaired": {
            "audio": {
                "captions_enabled": True,
                "sound_effects": False,
                "mono_audio": True,
            },
            "visual": {
                "focus_indicators": True,
            },
        },
        "deaf": {
            "audio": {
                "captions_enabled": True,
                "tts_enabled": False,
                "sound_effects": False,
            },
        },
        "adhd": {
            "visual": {
                "reduce_motion": True,
            },
            "cognitive": {
                "reading_profile": "adhd",
                "chunk_size": 75,
                "progress_indicators": True,
                "predictable_layout": True,
            },
        },
        "cognitive_disability": {
            "visual": {
                "font_size": "18px",
                "line_height": 1.8,
            },
            "cognitive": {
                "text_simplification": True,
                "target_reading_level": 5,
                "reading_profile": "cognitive",
                "chunk_size": 50,
                "auto_summaries": True,
                "term_explanations": True,
                "time_extensions": 2.0,
            },
        },
        "motor_impairment": {
            "input": {
                "keyboard_navigation": True,
                "click_assistance": True,
                "input_timeout": 0,
                "auto_complete": True,
            },
            "visual": {
                "cursor_size": "large",
            },
        },
        "epilepsy": {
            "visual": {
                "reduce_motion": True,
            },
            "audio": {
                "sound_effects": False,
            },
        },
    }

    def __init__(self):
        """Initialize the AccessibilityProfileManager."""
        # In-memory storage (in production, this would be a database)
        self._profiles: Dict[str, AccessibilityProfile] = {}
        self._learner_profiles: Dict[str, str] = {}  # learner_id -> profile_id

        logger.info("AccessibilityProfileManager initialized")

    def create_profile(
        self,
        learner_id: str,
        needs: Optional[List[Dict[str, Any]]] = None,
        visual_preferences: Optional[Dict[str, Any]] = None,
        audio_preferences: Optional[Dict[str, Any]] = None,
        cognitive_preferences: Optional[Dict[str, Any]] = None,
        input_preferences: Optional[Dict[str, Any]] = None,
    ) -> AccessibilityProfile:
        """
        Create accessibility profile for user.

        Args:
            learner_id: Unique identifier for the learner
            needs: List of accessibility needs
            visual_preferences: Visual preference overrides
            audio_preferences: Audio preference overrides
            cognitive_preferences: Cognitive preference overrides
            input_preferences: Input preference overrides

        Returns:
            Created AccessibilityProfile
        """
        if not learner_id:
            raise ValueError("Learner ID cannot be empty")

        logger.info(f"Creating accessibility profile for learner {learner_id}")

        # Generate profile ID
        profile_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)

        # Parse needs
        parsed_needs = []
        if needs:
            for need in needs:
                parsed_needs.append(AccessibilityNeed(
                    category=AccessibilityCategory(need.get("category", "cognitive")),
                    type=need.get("type", "general"),
                    severity=NeedSeverity(need.get("severity", "mild")),
                    preferences=need.get("preferences", {}),
                ))

        # Build preferences with defaults
        visual = self.DEFAULT_VISUAL_PREFERENCES.copy()
        if visual_preferences:
            visual.update(visual_preferences)

        audio = self.DEFAULT_AUDIO_PREFERENCES.copy()
        if audio_preferences:
            audio.update(audio_preferences)

        cognitive = self.DEFAULT_COGNITIVE_PREFERENCES.copy()
        if cognitive_preferences:
            cognitive.update(cognitive_preferences)

        input_prefs = self.DEFAULT_INPUT_PREFERENCES.copy()
        if input_preferences:
            input_prefs.update(input_preferences)

        # Apply recommendations based on needs
        for need in parsed_needs:
            recommendations = self.NEED_RECOMMENDATIONS.get(need.type, {})
            if "visual" in recommendations:
                visual.update(recommendations["visual"])
            if "audio" in recommendations:
                audio.update(recommendations["audio"])
            if "cognitive" in recommendations:
                cognitive.update(recommendations["cognitive"])
            if "input" in recommendations:
                input_prefs.update(recommendations["input"])

        # Create profile
        profile = AccessibilityProfile(
            profile_id=profile_id,
            learner_id=learner_id,
            needs=parsed_needs,
            visual_preferences=visual,
            audio_preferences=audio,
            cognitive_preferences=cognitive,
            input_preferences=input_prefs,
            created_at=now,
            updated_at=now,
            is_active=True,
            version=1,
        )

        # Store profile
        self._profiles[profile_id] = profile
        self._learner_profiles[learner_id] = profile_id

        logger.info(
            f"Created profile {profile_id} for learner {learner_id} "
            f"with {len(parsed_needs)} needs"
        )

        return profile

    def get_profile(
        self,
        learner_id: str,
    ) -> Dict[str, Any]:
        """
        Get learner's accessibility profile.

        Args:
            learner_id: Learner identifier

        Returns:
            Profile dictionary or empty dict if not found
        """
        if not learner_id:
            raise ValueError("Learner ID cannot be empty")

        profile_id = self._learner_profiles.get(learner_id)
        if not profile_id:
            logger.info(f"No profile found for learner {learner_id}")
            return {}

        profile = self._profiles.get(profile_id)
        if not profile:
            logger.warning(f"Profile {profile_id} not found in storage")
            return {}

        logger.info(f"Retrieved profile for learner {learner_id}")

        return self._profile_to_dict(profile)

    def update_profile(
        self,
        learner_id: str,
        settings: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Update accessibility settings.

        Args:
            learner_id: Learner identifier
            settings: Settings to update (can include any preference category)

        Returns:
            Updated profile dictionary
        """
        if not learner_id:
            raise ValueError("Learner ID cannot be empty")

        profile_id = self._learner_profiles.get(learner_id)
        if not profile_id:
            logger.info(f"No existing profile for {learner_id}, creating new")
            # Create a new profile with the provided settings
            return self._profile_to_dict(self.create_profile(
                learner_id,
                visual_preferences=settings.get("visual_preferences"),
                audio_preferences=settings.get("audio_preferences"),
                cognitive_preferences=settings.get("cognitive_preferences"),
                input_preferences=settings.get("input_preferences"),
            ))

        profile = self._profiles.get(profile_id)
        if not profile:
            raise ValueError(f"Profile {profile_id} not found")

        logger.info(f"Updating profile for learner {learner_id}")

        # Update preferences
        if "visual_preferences" in settings:
            profile.visual_preferences.update(settings["visual_preferences"])
        if "audio_preferences" in settings:
            profile.audio_preferences.update(settings["audio_preferences"])
        if "cognitive_preferences" in settings:
            profile.cognitive_preferences.update(settings["cognitive_preferences"])
        if "input_preferences" in settings:
            profile.input_preferences.update(settings["input_preferences"])

        # Update needs if provided
        if "needs" in settings:
            profile.needs = [
                AccessibilityNeed(
                    category=AccessibilityCategory(n.get("category", "cognitive")),
                    type=n.get("type", "general"),
                    severity=NeedSeverity(n.get("severity", "mild")),
                    preferences=n.get("preferences", {}),
                )
                for n in settings["needs"]
            ]

        # Update metadata
        profile.updated_at = datetime.now(timezone.utc)
        profile.version += 1

        logger.info(f"Updated profile {profile_id} to version {profile.version}")

        return self._profile_to_dict(profile)

    def get_recommended_settings(
        self,
        learner_id: Optional[str] = None,
        needs: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Get recommended settings based on needs.

        Args:
            learner_id: Optional learner ID to get profile-based recommendations
            needs: List of need types to get recommendations for

        Returns:
            Dictionary of recommended settings
        """
        logger.info(
            f"Getting recommended settings for learner={learner_id}, needs={needs}"
        )

        # Start with defaults
        recommendations = {
            "visual_preferences": self.DEFAULT_VISUAL_PREFERENCES.copy(),
            "audio_preferences": self.DEFAULT_AUDIO_PREFERENCES.copy(),
            "cognitive_preferences": self.DEFAULT_COGNITIVE_PREFERENCES.copy(),
            "input_preferences": self.DEFAULT_INPUT_PREFERENCES.copy(),
        }

        # Get needs from profile if learner_id provided
        profile_needs = []
        if learner_id:
            profile_id = self._learner_profiles.get(learner_id)
            if profile_id:
                profile = self._profiles.get(profile_id)
                if profile:
                    profile_needs = [n.type for n in profile.needs]

        # Combine with provided needs
        all_needs = set(profile_needs)
        if needs:
            all_needs.update(needs)

        # Apply recommendations for each need
        for need_type in all_needs:
            need_recs = self.NEED_RECOMMENDATIONS.get(need_type, {})

            if "visual" in need_recs:
                recommendations["visual_preferences"].update(need_recs["visual"])
            if "audio" in need_recs:
                recommendations["audio_preferences"].update(need_recs["audio"])
            if "cognitive" in need_recs:
                recommendations["cognitive_preferences"].update(need_recs["cognitive"])
            if "input" in need_recs:
                recommendations["input_preferences"].update(need_recs["input"])

        # Add metadata
        recommendations["needs_addressed"] = list(all_needs)
        recommendations["recommendation_version"] = "1.0"

        logger.info(
            f"Generated recommendations for {len(all_needs)} needs"
        )

        return recommendations

    def recommend_settings(
        self,
        learner_id: str,
        usage_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Recommend accessibility settings based on usage.

        Analyzes usage patterns to suggest optimal settings.

        Args:
            learner_id: Learner identifier
            usage_data: Dictionary of usage data including:
                - reading_time: Average reading time
                - error_rate: Input error rate
                - zoom_usage: How often zoom is used
                - tts_usage: Text-to-speech usage
                - navigation_patterns: How the user navigates

        Returns:
            Dictionary of recommended settings with explanations
        """
        if not learner_id:
            raise ValueError("Learner ID cannot be empty")

        logger.info(f"Analyzing usage data for learner {learner_id}")

        recommendations = {
            "visual_preferences": {},
            "audio_preferences": {},
            "cognitive_preferences": {},
            "input_preferences": {},
            "explanations": [],
        }

        # Analyze reading patterns
        reading_time = usage_data.get("reading_time", 0)
        if reading_time > 0:
            # Slower readers might benefit from larger text and simplification
            avg_reading_speed = usage_data.get("words_read", 0) / reading_time
            if avg_reading_speed < 100:  # Below average reading speed
                recommendations["visual_preferences"]["font_size"] = "18px"
                recommendations["visual_preferences"]["line_height"] = 1.8
                recommendations["cognitive_preferences"]["text_simplification"] = True
                recommendations["explanations"].append(
                    "Based on reading speed, larger text and simplified content recommended"
                )

        # Analyze zoom usage
        zoom_usage = usage_data.get("zoom_usage", 0)
        if zoom_usage > 0.3:  # Used zoom more than 30% of the time
            recommendations["visual_preferences"]["font_size"] = "20px"
            recommendations["explanations"].append(
                "Frequent zoom usage suggests larger default font size would help"
            )

        # Analyze TTS usage
        tts_usage = usage_data.get("tts_usage", 0)
        if tts_usage > 0.2:  # Used TTS more than 20% of the time
            recommendations["audio_preferences"]["tts_enabled"] = True
            recommendations["explanations"].append(
                "TTS usage patterns suggest enabling text-to-speech by default"
            )

        # Analyze error rates
        error_rate = usage_data.get("error_rate", 0)
        if error_rate > 0.1:  # More than 10% error rate
            recommendations["input_preferences"]["auto_complete"] = True
            recommendations["input_preferences"]["spell_check"] = True
            recommendations["explanations"].append(
                "Input error patterns suggest enabling assistance features"
            )

        # Analyze navigation patterns
        navigation = usage_data.get("navigation_patterns", {})
        keyboard_usage = navigation.get("keyboard", 0)
        if keyboard_usage > 0.7:  # Primarily keyboard navigation
            recommendations["input_preferences"]["keyboard_navigation"] = True
            recommendations["visual_preferences"]["focus_indicators"] = True
            recommendations["explanations"].append(
                "Keyboard-focused navigation detected, enhancing keyboard support"
            )

        # Analyze session patterns
        avg_session_length = usage_data.get("avg_session_length", 30)
        if avg_session_length < 15:  # Short sessions
            recommendations["cognitive_preferences"]["chunk_size"] = 50
            recommendations["cognitive_preferences"]["progress_indicators"] = True
            recommendations["explanations"].append(
                "Short session patterns suggest smaller content chunks"
            )

        logger.info(
            f"Generated {len(recommendations['explanations'])} usage-based recommendations"
        )

        return recommendations

    def delete_profile(self, learner_id: str) -> bool:
        """
        Delete a learner's accessibility profile.

        Args:
            learner_id: Learner identifier

        Returns:
            True if deleted, False if not found
        """
        if not learner_id:
            raise ValueError("Learner ID cannot be empty")

        profile_id = self._learner_profiles.get(learner_id)
        if not profile_id:
            logger.info(f"No profile found to delete for learner {learner_id}")
            return False

        # Remove from storage
        if profile_id in self._profiles:
            del self._profiles[profile_id]
        if learner_id in self._learner_profiles:
            del self._learner_profiles[learner_id]

        logger.info(f"Deleted profile for learner {learner_id}")
        return True

    def list_available_needs(self) -> List[Dict[str, Any]]:
        """
        List all available accessibility need types.

        Returns:
            List of need type information
        """
        needs = []

        for need_type, recommendations in self.NEED_RECOMMENDATIONS.items():
            needs.append({
                "type": need_type,
                "categories_affected": list(recommendations.keys()),
                "description": self._get_need_description(need_type),
            })

        return needs

    def _get_need_description(self, need_type: str) -> str:
        """Get description for a need type."""
        descriptions = {
            "dyslexia": "Reading difficulty that benefits from specialized fonts and spacing",
            "low_vision": "Reduced vision that benefits from larger text and high contrast",
            "blind": "No functional vision, requires screen reader support",
            "color_blind_protanopia": "Red-green color blindness (red weakness)",
            "color_blind_deuteranopia": "Red-green color blindness (green weakness)",
            "hearing_impaired": "Partial hearing loss, benefits from captions",
            "deaf": "No functional hearing, requires visual alternatives to audio",
            "adhd": "Attention difficulties that benefit from focused, chunked content",
            "cognitive_disability": "General cognitive support needs",
            "motor_impairment": "Physical difficulties with fine motor control",
            "epilepsy": "Sensitivity to flashing or moving content",
        }
        return descriptions.get(need_type, "Accessibility support")

    def _profile_to_dict(self, profile: AccessibilityProfile) -> Dict[str, Any]:
        """Convert profile to dictionary."""
        return {
            "profile_id": profile.profile_id,
            "learner_id": profile.learner_id,
            "needs": [
                {
                    "category": n.category.value,
                    "type": n.type,
                    "severity": n.severity.value,
                    "preferences": n.preferences,
                }
                for n in profile.needs
            ],
            "visual_preferences": profile.visual_preferences,
            "audio_preferences": profile.audio_preferences,
            "cognitive_preferences": profile.cognitive_preferences,
            "input_preferences": profile.input_preferences,
            "created_at": profile.created_at.isoformat(),
            "updated_at": profile.updated_at.isoformat(),
            "is_active": profile.is_active,
            "version": profile.version,
        }

    def export_profile(self, learner_id: str) -> Dict[str, Any]:
        """
        Export profile for backup or transfer.

        Args:
            learner_id: Learner identifier

        Returns:
            Exportable profile dictionary
        """
        profile_dict = self.get_profile(learner_id)
        if not profile_dict:
            return {}

        # Add export metadata
        profile_dict["export_timestamp"] = datetime.now(timezone.utc).isoformat()
        profile_dict["export_version"] = "1.0"

        return profile_dict

    def import_profile(
        self,
        learner_id: str,
        profile_data: Dict[str, Any],
    ) -> AccessibilityProfile:
        """
        Import a profile from exported data.

        Args:
            learner_id: Learner identifier to import for
            profile_data: Exported profile data

        Returns:
            Imported AccessibilityProfile
        """
        if not learner_id:
            raise ValueError("Learner ID cannot be empty")

        if not profile_data:
            raise ValueError("Profile data cannot be empty")

        logger.info(f"Importing profile for learner {learner_id}")

        return self.create_profile(
            learner_id=learner_id,
            needs=profile_data.get("needs"),
            visual_preferences=profile_data.get("visual_preferences"),
            audio_preferences=profile_data.get("audio_preferences"),
            cognitive_preferences=profile_data.get("cognitive_preferences"),
            input_preferences=profile_data.get("input_preferences"),
        )
