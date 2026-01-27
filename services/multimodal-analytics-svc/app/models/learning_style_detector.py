"""
Learning Style Detector

Detect learning style preferences from multimodal behavioral data.
Implements VARK model and provides modality recommendations.
"""
import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any
import numpy as np
from scipy.special import softmax

logger = logging.getLogger(__name__)


@dataclass
class LearningStyle:
    """Represents a learner's learning style profile."""
    visual: float
    auditory: float
    kinesthetic: float
    reading_writing: float
    primary_style: str
    confidence: float
    secondary_style: Optional[str] = None
    multimodal: bool = False


@dataclass
class ModalityPreference:
    """Detailed modality preference analysis."""
    modality: str
    preference_score: float
    engagement_level: float
    effectiveness_score: float
    evidence: List[str] = field(default_factory=list)


@dataclass
class OptimalModalityPrediction:
    """Prediction for optimal content modality."""
    recommended_modality: str
    confidence: float
    modality_scores: Dict[str, float]
    reasoning: List[str]
    content_suggestions: List[str]


class LearningStyleDetector:
    """
    Detect learning style from behavioral data.

    Models:
    - VARK (Visual, Auditory, Read/Write, Kinesthetic)
    - Kolb's Learning Styles (planned)
    - Felder-Silverman (planned)

    Usage:
        detector = LearningStyleDetector()
        style = detector.detect_learning_style(behavioral_data)
        preferences = detector.analyze_preferences(behavioral_data)
        optimal = detector.predict_optimal_modality(style, context)
    """

    # Feature mappings to VARK dimensions
    VARK_FEATURE_MAPPINGS = {
        "visual": [
            "video_watch_time", "image_interactions", "diagram_views",
            "chart_engagement", "visual_content_time", "screenshot_count",
            "animation_views", "infographic_time", "color_preference"
        ],
        "auditory": [
            "audio_listen_time", "podcast_engagement", "voice_interactions",
            "lecture_attention", "verbal_questions", "discussion_participation",
            "audio_replay_count", "speech_to_text_usage"
        ],
        "reading_writing": [
            "text_read_time", "notes_written", "text_highlighting",
            "document_downloads", "article_reads", "written_responses",
            "text_copy_count", "text_search_frequency", "book_chapter_reads"
        ],
        "kinesthetic": [
            "interactive_exercises", "simulation_time", "practice_problems",
            "hands_on_activities", "lab_engagement", "drag_drop_interactions",
            "physical_movement_detected", "touch_interactions", "game_time"
        ],
    }

    # Behavioral indicators for style detection
    BEHAVIORAL_INDICATORS = {
        "visual": {
            "prefers_diagrams": 0.3,
            "quick_image_processing": 0.2,
            "spatial_navigation": 0.2,
            "color_sensitivity": 0.15,
            "visual_memory": 0.15,
        },
        "auditory": {
            "responds_to_verbal": 0.3,
            "audio_seeking": 0.25,
            "discussion_preference": 0.2,
            "verbal_repetition": 0.15,
            "sound_distraction": 0.1,
        },
        "reading_writing": {
            "text_preference": 0.35,
            "note_taking": 0.25,
            "written_expression": 0.2,
            "list_making": 0.1,
            "text_search": 0.1,
        },
        "kinesthetic": {
            "movement_during_learning": 0.25,
            "hands_on_preference": 0.3,
            "trial_error_approach": 0.2,
            "simulation_engagement": 0.15,
            "short_attention_spans": 0.1,
        },
    }

    def __init__(
        self,
        model: str = "vark",
        confidence_threshold: float = 0.6,
        multimodal_threshold: float = 0.15,
    ):
        """
        Initialize the LearningStyleDetector.

        Args:
            model: Learning style model to use ("vark", "kolb", "felder_silverman")
            confidence_threshold: Minimum confidence to declare a primary style
            multimodal_threshold: Max difference to consider learner multimodal
        """
        self.model = model
        self.confidence_threshold = confidence_threshold
        self.multimodal_threshold = multimodal_threshold
        logger.info(f"LearningStyleDetector initialized with model={model}")

    def detect_learning_style(
        self,
        behavioral_data: Dict[str, Any],
    ) -> LearningStyle:
        """
        Detect learner's learning style using VARK model.

        Args:
            behavioral_data: Dictionary containing behavioral metrics.
                Can include raw features or pre-computed indicators.

        Returns:
            LearningStyle with scores for each dimension and primary style.
        """
        # Extract and normalize features for each VARK dimension
        dimension_scores = {
            "visual": 0.0,
            "auditory": 0.0,
            "reading_writing": 0.0,
            "kinesthetic": 0.0,
        }

        evidence_counts = {dim: 0 for dim in dimension_scores}

        # Process raw behavioral features
        for dimension, feature_names in self.VARK_FEATURE_MAPPINGS.items():
            for feature in feature_names:
                if feature in behavioral_data:
                    value = self._normalize_feature_value(behavioral_data[feature])
                    dimension_scores[dimension] += value
                    evidence_counts[dimension] += 1

        # Process behavioral indicators
        for dimension, indicators in self.BEHAVIORAL_INDICATORS.items():
            for indicator, weight in indicators.items():
                if indicator in behavioral_data:
                    value = self._normalize_feature_value(behavioral_data[indicator])
                    dimension_scores[dimension] += value * weight
                    evidence_counts[dimension] += weight

        # Normalize scores to [0, 1] range
        total_evidence = sum(evidence_counts.values())
        if total_evidence > 0:
            for dim in dimension_scores:
                if evidence_counts[dim] > 0:
                    dimension_scores[dim] /= evidence_counts[dim]
                else:
                    dimension_scores[dim] = 0.25  # Default equal probability

        # If no data, use prior distribution (equal)
        if total_evidence == 0:
            logger.warning("No behavioral data provided, using uniform distribution")
            dimension_scores = {dim: 0.25 for dim in dimension_scores}

        # Apply softmax for proper probability distribution
        scores_array = np.array(list(dimension_scores.values()))
        probabilities = softmax(scores_array * 2)  # Temperature scaling

        for i, dim in enumerate(dimension_scores.keys()):
            dimension_scores[dim] = float(probabilities[i])

        # Determine primary and secondary styles
        sorted_dims = sorted(dimension_scores.items(), key=lambda x: x[1], reverse=True)
        primary_style = sorted_dims[0][0]
        primary_score = sorted_dims[0][1]
        secondary_style = sorted_dims[1][0]
        secondary_score = sorted_dims[1][1]

        # Check if learner is multimodal
        is_multimodal = (primary_score - secondary_score) < self.multimodal_threshold

        # Compute confidence
        confidence = self._compute_style_confidence(
            dimension_scores, primary_score, total_evidence
        )

        return LearningStyle(
            visual=dimension_scores["visual"],
            auditory=dimension_scores["auditory"],
            kinesthetic=dimension_scores["kinesthetic"],
            reading_writing=dimension_scores["reading_writing"],
            primary_style=primary_style,
            secondary_style=secondary_style if is_multimodal else None,
            confidence=confidence,
            multimodal=is_multimodal,
        )

    def analyze_preferences(
        self,
        behavioral_data: Dict[str, Any],
    ) -> List[ModalityPreference]:
        """
        Analyze detailed modality preferences.

        Args:
            behavioral_data: Dictionary containing behavioral metrics.

        Returns:
            List of ModalityPreference objects for each modality.
        """
        preferences = []

        modalities = {
            "visual": ["video", "image", "diagram", "chart", "animation"],
            "auditory": ["audio", "podcast", "lecture", "discussion"],
            "reading_writing": ["text", "article", "notes", "document"],
            "kinesthetic": ["interactive", "simulation", "practice", "hands_on"],
        }

        for modality, content_types in modalities.items():
            # Calculate preference score
            preference_score = self._calculate_preference_score(
                behavioral_data, content_types
            )

            # Calculate engagement level
            engagement_level = self._calculate_engagement_level(
                behavioral_data, content_types
            )

            # Calculate effectiveness (if outcome data available)
            effectiveness_score = self._calculate_effectiveness(
                behavioral_data, modality
            )

            # Gather evidence
            evidence = self._gather_preference_evidence(
                behavioral_data, modality, content_types
            )

            preferences.append(ModalityPreference(
                modality=modality,
                preference_score=preference_score,
                engagement_level=engagement_level,
                effectiveness_score=effectiveness_score,
                evidence=evidence,
            ))

        # Sort by preference score
        preferences.sort(key=lambda p: p.preference_score, reverse=True)

        return preferences

    def predict_optimal_modality(
        self,
        style: LearningStyle,
        context: Optional[Dict[str, Any]] = None,
    ) -> OptimalModalityPrediction:
        """
        Predict optimal content modality for the learner.

        Args:
            style: Learner's detected learning style.
            context: Optional context (topic, difficulty, time constraints, etc.)

        Returns:
            OptimalModalityPrediction with recommendations.
        """
        context = context or {}

        # Base scores from learning style
        modality_scores = {
            "visual": style.visual,
            "auditory": style.auditory,
            "reading_writing": style.reading_writing,
            "kinesthetic": style.kinesthetic,
        }

        reasoning = []

        # Adjust based on context
        if context:
            modality_scores, context_reasoning = self._adjust_for_context(
                modality_scores, context
            )
            reasoning.extend(context_reasoning)

        # Determine recommended modality
        sorted_modalities = sorted(
            modality_scores.items(), key=lambda x: x[1], reverse=True
        )
        recommended = sorted_modalities[0][0]
        confidence = sorted_modalities[0][1]

        # Add primary reasoning
        reasoning.insert(
            0, f"Primary learning style: {style.primary_style} ({style.confidence:.0%} confidence)"
        )
        if style.multimodal:
            reasoning.append(
                f"Learner shows multimodal tendencies with {style.secondary_style}"
            )

        # Generate content suggestions
        content_suggestions = self._generate_content_suggestions(
            recommended, modality_scores, context
        )

        return OptimalModalityPrediction(
            recommended_modality=recommended,
            confidence=confidence,
            modality_scores=modality_scores,
            reasoning=reasoning,
            content_suggestions=content_suggestions,
        )

    def detect(
        self,
        behavioral_data: Dict,
    ) -> LearningStyle:
        """
        Detect learning style from behavior (alias for detect_learning_style).

        Args:
            behavioral_data: Dictionary containing behavioral metrics.

        Returns:
            LearningStyle object.
        """
        return self.detect_learning_style(behavioral_data)

    def track_style_evolution(
        self,
        learner_id: str,
        time_range: str = "30d",
    ) -> List[LearningStyle]:
        """
        Track how style preferences evolve over time.

        Note: This method requires access to historical data storage.
        In production, this would query a time-series database.

        Args:
            learner_id: Unique learner identifier.
            time_range: Time range to analyze (e.g., "7d", "30d", "90d").

        Returns:
            List of LearningStyle snapshots over time.
        """
        # Placeholder implementation - in production, query historical data
        logger.info(f"Tracking style evolution for learner {learner_id} over {time_range}")

        # Return empty list - actual implementation would query database
        return []

    def recommend_content_format(
        self,
        style: LearningStyle,
    ) -> Dict[str, float]:
        """
        Recommend content format distribution based on learning style.

        Args:
            style: Learner's learning style profile.

        Returns:
            Dictionary mapping content formats to recommended proportions.
        """
        # Map VARK dimensions to specific content formats
        format_mappings = {
            "visual": {
                "video": 0.3,
                "infographic": 0.25,
                "diagram": 0.2,
                "animation": 0.15,
                "presentation": 0.1,
            },
            "auditory": {
                "podcast": 0.3,
                "lecture": 0.25,
                "discussion": 0.2,
                "audio_book": 0.15,
                "voice_explanation": 0.1,
            },
            "reading_writing": {
                "article": 0.3,
                "ebook": 0.25,
                "notes": 0.2,
                "documentation": 0.15,
                "worksheet": 0.1,
            },
            "kinesthetic": {
                "interactive_exercise": 0.3,
                "simulation": 0.25,
                "lab": 0.2,
                "game": 0.15,
                "project": 0.1,
            },
        }

        # Calculate weighted format distribution
        format_scores: Dict[str, float] = {}
        style_weights = {
            "visual": style.visual,
            "auditory": style.auditory,
            "reading_writing": style.reading_writing,
            "kinesthetic": style.kinesthetic,
        }

        for dimension, weight in style_weights.items():
            for format_name, format_weight in format_mappings[dimension].items():
                if format_name not in format_scores:
                    format_scores[format_name] = 0.0
                format_scores[format_name] += weight * format_weight

        # Normalize to sum to 1
        total = sum(format_scores.values())
        if total > 0:
            format_scores = {k: v / total for k, v in format_scores.items()}

        # Filter to top formats
        sorted_formats = sorted(format_scores.items(), key=lambda x: x[1], reverse=True)
        top_formats = dict(sorted_formats[:8])

        # Re-normalize
        total = sum(top_formats.values())
        if total > 0:
            top_formats = {k: v / total for k, v in top_formats.items()}

        return top_formats

    def _normalize_feature_value(self, value: Any) -> float:
        """Normalize a feature value to [0, 1] range."""
        if isinstance(value, bool):
            return 1.0 if value else 0.0
        elif isinstance(value, (int, float)):
            # Assume values are already in reasonable range or normalize
            if value < 0:
                return 0.0
            elif value > 1:
                # Apply sigmoid for unbounded values
                return 1.0 / (1.0 + np.exp(-value / 100))
            return float(value)
        elif isinstance(value, (list, np.ndarray)):
            arr = np.asarray(value, dtype=np.float64)
            return float(np.mean(arr)) if len(arr) > 0 else 0.0
        return 0.0

    def _compute_style_confidence(
        self,
        dimension_scores: Dict[str, float],
        primary_score: float,
        evidence_count: float,
    ) -> float:
        """Compute confidence in the style detection."""
        # Factor 1: Separation from other styles
        scores = list(dimension_scores.values())
        mean_score = np.mean(scores)
        separation = (primary_score - mean_score) / (np.std(scores) + 0.01)
        separation_confidence = min(1.0, max(0.0, separation / 2))

        # Factor 2: Amount of evidence
        evidence_confidence = min(1.0, evidence_count / 10)

        # Factor 3: Primary score strength
        strength_confidence = primary_score

        # Weighted combination
        confidence = (
            0.4 * separation_confidence +
            0.3 * evidence_confidence +
            0.3 * strength_confidence
        )

        return float(np.clip(confidence, 0.0, 1.0))

    def _calculate_preference_score(
        self,
        behavioral_data: Dict[str, Any],
        content_types: List[str],
    ) -> float:
        """Calculate preference score for content types."""
        scores = []

        for content_type in content_types:
            # Check for various feature patterns
            for key, value in behavioral_data.items():
                if content_type in key.lower():
                    scores.append(self._normalize_feature_value(value))

        if not scores:
            return 0.5  # Default neutral

        return float(np.mean(scores))

    def _calculate_engagement_level(
        self,
        behavioral_data: Dict[str, Any],
        content_types: List[str],
    ) -> float:
        """Calculate engagement level for content types."""
        engagement_indicators = ["time", "engagement", "duration", "completion", "attention"]
        scores = []

        for content_type in content_types:
            for key, value in behavioral_data.items():
                if content_type in key.lower():
                    for indicator in engagement_indicators:
                        if indicator in key.lower():
                            scores.append(self._normalize_feature_value(value))

        if not scores:
            return 0.5

        return float(np.mean(scores))

    def _calculate_effectiveness(
        self,
        behavioral_data: Dict[str, Any],
        modality: str,
    ) -> float:
        """Calculate effectiveness of modality based on outcomes."""
        effectiveness_keys = [
            f"{modality}_quiz_score",
            f"{modality}_retention",
            f"{modality}_performance",
            f"{modality}_success_rate",
        ]

        scores = []
        for key in effectiveness_keys:
            if key in behavioral_data:
                scores.append(self._normalize_feature_value(behavioral_data[key]))

        # Also check for general outcome correlations
        outcome_keys = ["quiz_score", "retention", "performance", "success_rate"]
        for key in outcome_keys:
            if key in behavioral_data:
                scores.append(self._normalize_feature_value(behavioral_data[key]))

        if not scores:
            return 0.5

        return float(np.mean(scores))

    def _gather_preference_evidence(
        self,
        behavioral_data: Dict[str, Any],
        modality: str,
        content_types: List[str],
    ) -> List[str]:
        """Gather evidence supporting modality preference."""
        evidence = []

        for content_type in content_types:
            for key, value in behavioral_data.items():
                if content_type in key.lower() and isinstance(value, (int, float)):
                    normalized = self._normalize_feature_value(value)
                    if normalized > 0.6:
                        evidence.append(f"High {key}: {value}")
                    elif normalized < 0.3:
                        evidence.append(f"Low {key}: {value}")

        return evidence[:5]  # Limit to top 5 pieces of evidence

    def _adjust_for_context(
        self,
        modality_scores: Dict[str, float],
        context: Dict[str, Any],
    ) -> Tuple[Dict[str, float], List[str]]:
        """Adjust modality scores based on context."""
        adjusted = modality_scores.copy()
        reasoning = []

        # Adjust for topic type
        topic = context.get("topic", "").lower()
        if any(word in topic for word in ["math", "science", "physics", "chemistry"]):
            adjusted["visual"] *= 1.2  # Diagrams help with STEM
            adjusted["kinesthetic"] *= 1.1  # Practice helps
            reasoning.append("STEM topic: boosting visual and kinesthetic")

        if any(word in topic for word in ["language", "literature", "writing"]):
            adjusted["reading_writing"] *= 1.3
            adjusted["auditory"] *= 1.1
            reasoning.append("Language topic: boosting reading/writing and auditory")

        # Adjust for difficulty level
        difficulty = context.get("difficulty", "medium").lower()
        if difficulty == "high":
            adjusted["kinesthetic"] *= 1.2  # Practice helps with difficult content
            reasoning.append("High difficulty: boosting kinesthetic for practice")
        elif difficulty == "low":
            adjusted["reading_writing"] *= 1.1  # Quick reading for easy content
            reasoning.append("Low difficulty: boosting reading for efficiency")

        # Adjust for time constraints
        time_available = context.get("time_minutes", 30)
        if time_available < 15:
            adjusted["reading_writing"] *= 1.2  # Text is fastest
            adjusted["kinesthetic"] *= 0.8  # Interactive takes time
            reasoning.append("Time constrained: preferring quick-consume formats")

        # Adjust for environment
        environment = context.get("environment", "").lower()
        if "mobile" in environment or "commute" in environment:
            adjusted["auditory"] *= 1.5  # Audio works while moving
            adjusted["kinesthetic"] *= 0.5  # Hard to interact on mobile
            reasoning.append("Mobile environment: preferring audio content")

        # Normalize
        total = sum(adjusted.values())
        if total > 0:
            adjusted = {k: v / total for k, v in adjusted.items()}

        return adjusted, reasoning

    def _generate_content_suggestions(
        self,
        recommended_modality: str,
        modality_scores: Dict[str, float],
        context: Dict[str, Any],
    ) -> List[str]:
        """Generate specific content suggestions."""
        suggestions = []

        # Primary modality suggestions
        modality_suggestions = {
            "visual": [
                "Use video tutorials with clear visual demonstrations",
                "Include diagrams and flowcharts for complex concepts",
                "Leverage infographics for summary information",
                "Use color-coded notes and highlights",
            ],
            "auditory": [
                "Provide audio lectures or podcasts for learning on-the-go",
                "Include verbal explanations with examples",
                "Encourage discussion-based learning activities",
                "Use read-aloud features for text content",
            ],
            "reading_writing": [
                "Provide comprehensive text-based materials",
                "Include note-taking exercises and written activities",
                "Offer detailed documentation and articles",
                "Encourage journaling and written reflection",
            ],
            "kinesthetic": [
                "Include interactive exercises and simulations",
                "Provide hands-on practice problems",
                "Use drag-and-drop activities for engagement",
                "Incorporate project-based learning tasks",
            ],
        }

        suggestions.extend(modality_suggestions.get(recommended_modality, [])[:2])

        # Add secondary modality suggestions if multimodal
        sorted_modalities = sorted(modality_scores.items(), key=lambda x: x[1], reverse=True)
        if len(sorted_modalities) > 1:
            secondary = sorted_modalities[1][0]
            secondary_suggestions = modality_suggestions.get(secondary, [])
            if secondary_suggestions:
                suggestions.append(f"Supplement with: {secondary_suggestions[0]}")

        return suggestions
