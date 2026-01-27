"""
Adaptation Engine

Coordinate adaptive responses to cognitive load.
Generates and prioritizes adaptation actions based on current load state.
"""
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)


class AdaptationType(str, Enum):
    """Types of adaptation actions."""
    REDUCE_COMPLEXITY = "reduce_complexity"
    ADD_SCAFFOLDING = "add_scaffolding"
    SUGGEST_BREAK = "suggest_break"
    CHANGE_MODALITY = "change_modality"
    SLOW_PACE = "slow_pace"
    PROVIDE_SUMMARY = "provide_summary"
    OFFER_HELP = "offer_help"
    SKIP_TO_EASIER = "skip_to_easier"
    CHUNK_CONTENT = "chunk_content"
    ADD_VISUAL_AID = "add_visual_aid"
    REDUCE_DISTRACTORS = "reduce_distractors"
    ACTIVATE_PRIOR_KNOWLEDGE = "activate_prior_knowledge"


class UrgencyLevel(str, Enum):
    """Urgency levels for adaptations."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class AdaptationAction:
    """A single adaptation action recommendation."""
    action_type: AdaptationType
    priority: int  # 1-5, lower is higher priority
    description: str
    parameters: Dict[str, Any]
    expected_effect: str
    expected_load_reduction: float  # 0.0 to 0.5
    reversible: bool = True
    estimated_duration_seconds: Optional[int] = None


@dataclass
class AdaptationPlan:
    """Complete adaptation plan."""
    adaptations: List[AdaptationAction]
    urgency: UrgencyLevel
    expected_load_after: float
    fallback_plan: Optional[str]
    confidence: float
    processing_time_ms: int


@dataclass
class AdaptationEngineConfig:
    """Configuration for the adaptation engine."""
    # Load thresholds
    critical_load_threshold: float = 0.9
    high_load_threshold: float = 0.8
    medium_load_threshold: float = 0.7
    low_load_threshold: float = 0.5

    # Adaptation limits
    max_adaptations_per_request: int = 5
    min_time_between_adaptations_seconds: int = 30

    # Load reduction estimates
    break_load_reduction: float = 0.15
    scaffolding_load_reduction: float = 0.1
    complexity_reduction_effect: float = 0.15
    modality_change_effect: float = 0.1
    pacing_adjustment_effect: float = 0.08

    # Effectiveness tracking
    track_effectiveness: bool = True
    effectiveness_window_size: int = 10


# Adaptation templates with expected effects
ADAPTATION_TEMPLATES = {
    AdaptationType.SUGGEST_BREAK: {
        "description": "Suggest a short break to recover cognitive resources",
        "parameters": {"duration_seconds": 180},
        "expected_effect": "Reduce total load by 15-20% and restore attention",
        "load_reduction": 0.15,
        "min_load_trigger": 0.75,
    },
    AdaptationType.REDUCE_COMPLEXITY: {
        "description": "Simplify the content or interface to reduce extraneous load",
        "parameters": {"target_reduction": 0.2},
        "expected_effect": "Reduce extraneous load by simplifying presentation",
        "load_reduction": 0.15,
        "min_load_trigger": 0.6,
    },
    AdaptationType.ADD_SCAFFOLDING: {
        "description": "Provide scaffolding support for complex content",
        "parameters": {"scaffold_type": "hint"},
        "expected_effect": "Make intrinsic load more manageable with support",
        "load_reduction": 0.1,
        "min_load_trigger": 0.65,
    },
    AdaptationType.SLOW_PACE: {
        "description": "Slow down content delivery pace",
        "parameters": {"pace_factor": 0.7},
        "expected_effect": "Allow more processing time for each concept",
        "load_reduction": 0.08,
        "min_load_trigger": 0.6,
    },
    AdaptationType.CHANGE_MODALITY: {
        "description": "Switch to a different content modality",
        "parameters": {"from_modality": "text", "to_modality": "visual"},
        "expected_effect": "Distribute load across different processing channels",
        "load_reduction": 0.1,
        "min_load_trigger": 0.65,
    },
    AdaptationType.PROVIDE_SUMMARY: {
        "description": "Provide a summary of key concepts",
        "parameters": {"summary_length": "brief"},
        "expected_effect": "Consolidate understanding and reduce memory demands",
        "load_reduction": 0.08,
        "min_load_trigger": 0.5,
    },
    AdaptationType.OFFER_HELP: {
        "description": "Proactively offer assistance",
        "parameters": {"help_type": "contextual"},
        "expected_effect": "Address potential confusion before it increases load",
        "load_reduction": 0.05,
        "min_load_trigger": 0.55,
    },
    AdaptationType.SKIP_TO_EASIER: {
        "description": "Skip to easier content temporarily",
        "parameters": {"difficulty_reduction": 0.3},
        "expected_effect": "Reduce intrinsic load by deferring complex content",
        "load_reduction": 0.12,
        "min_load_trigger": 0.8,
    },
    AdaptationType.CHUNK_CONTENT: {
        "description": "Break content into smaller chunks",
        "parameters": {"chunk_size": "small"},
        "expected_effect": "Reduce working memory demands per unit",
        "load_reduction": 0.1,
        "min_load_trigger": 0.6,
    },
    AdaptationType.ADD_VISUAL_AID: {
        "description": "Add visual aids to support understanding",
        "parameters": {"visual_type": "diagram"},
        "expected_effect": "Offload some cognitive processing to visual channel",
        "load_reduction": 0.08,
        "min_load_trigger": 0.55,
    },
    AdaptationType.REDUCE_DISTRACTORS: {
        "description": "Remove or hide distracting elements",
        "parameters": {"distractor_types": ["ads", "sidebars"]},
        "expected_effect": "Reduce extraneous load from irrelevant elements",
        "load_reduction": 0.1,
        "min_load_trigger": 0.5,
    },
    AdaptationType.ACTIVATE_PRIOR_KNOWLEDGE: {
        "description": "Connect to previously learned concepts",
        "parameters": {"related_concepts": []},
        "expected_effect": "Leverage existing schemas to reduce new learning load",
        "load_reduction": 0.08,
        "min_load_trigger": 0.5,
    },
}


class AdaptationEngine:
    """
    Coordinate adaptive learning responses based on cognitive load.

    The adaptation engine analyzes the current load state and generates
    prioritized recommendations for adapting the learning experience.

    Actions include:
    - Adjusting content difficulty
    - Modifying presentation format
    - Inserting scaffolding
    - Triggering breaks
    - Changing modality

    Usage:
        engine = AdaptationEngine()
        actions = engine.get_adaptations(load_estimate, context)
        for action in actions:
            print(f"{action.action_type}: {action.description}")
    """

    def __init__(self, config: Optional[AdaptationEngineConfig] = None):
        """Initialize the adaptation engine.

        Args:
            config: Optional configuration overrides
        """
        self.config = config or AdaptationEngineConfig()

        # Track adaptation history and effectiveness
        self._adaptation_history: Dict[str, List[Dict[str, Any]]] = {}
        self._effectiveness_scores: Dict[str, List[float]] = {}

        logger.info("AdaptationEngine initialized")

    def get_adaptations(
        self,
        load_estimate: Dict[str, float],
        current_context: Dict[str, Any],
        learner_id: Optional[str] = None,
        available_adaptations: Optional[List[AdaptationType]] = None,
        recent_adaptations: Optional[List[AdaptationType]] = None,
    ) -> List[AdaptationAction]:
        """
        Generate adaptation actions based on current load.

        Args:
            load_estimate: Dictionary with load components:
                          - intrinsic_load (0-1)
                          - extraneous_load (0-1)
                          - germane_load (0-1)
                          - total_load (0-1)
            current_context: Current learning context information
            learner_id: Optional learner identifier
            available_adaptations: Types of adaptations available in the system
            recent_adaptations: Recently applied adaptations to avoid repetition

        Returns:
            List of AdaptationAction recommendations, prioritized
        """
        recent_adaptations = recent_adaptations or []
        available_adaptations = available_adaptations or list(AdaptationType)

        # Extract load components
        total_load = load_estimate.get("total_load", 0.5)
        intrinsic_load = load_estimate.get("intrinsic_load", total_load * 0.4)
        extraneous_load = load_estimate.get("extraneous_load", total_load * 0.3)
        germane_load = load_estimate.get("germane_load", total_load * 0.3)

        # Determine urgency
        urgency = self._determine_urgency(total_load)

        # Generate candidate adaptations
        candidates = self._generate_candidates(
            total_load, intrinsic_load, extraneous_load, germane_load,
            current_context, available_adaptations
        )

        # Filter out recently used adaptations
        candidates = [c for c in candidates if c.action_type not in recent_adaptations]

        # Prioritize adaptations
        prioritized = self._prioritize_adaptations(
            candidates, total_load, urgency, learner_id
        )

        # Limit to max adaptations
        result = prioritized[:self.config.max_adaptations_per_request]

        # Update history
        if learner_id:
            self._update_history(learner_id, result, total_load)

        return result

    def get_recommendations(
        self,
        load_estimate: Dict[str, float],
        current_context: Dict[str, Any],
        **kwargs
    ) -> AdaptationPlan:
        """
        Get adaptation recommendations with full plan.

        Args:
            load_estimate: Current load measurements
            current_context: Learning context

        Returns:
            AdaptationPlan with prioritized recommendations
        """
        start_time = time.time()

        actions = self.get_adaptations(load_estimate, current_context, **kwargs)

        total_load = load_estimate.get("total_load", 0.5)
        urgency = self._determine_urgency(total_load)

        # Calculate expected load after adaptations
        total_reduction = sum(a.expected_load_reduction for a in actions)
        expected_load_after = max(0.3, total_load - total_reduction)

        # Generate fallback plan
        fallback = self._generate_fallback_plan(urgency, actions)

        # Calculate confidence
        confidence = self._calculate_confidence(
            len(actions), total_load, kwargs.get("learner_id")
        )

        processing_time = int((time.time() - start_time) * 1000)

        return AdaptationPlan(
            adaptations=actions,
            urgency=urgency,
            expected_load_after=expected_load_after,
            fallback_plan=fallback,
            confidence=confidence,
            processing_time_ms=processing_time,
        )

    def compute_adaptations(
        self,
        intrinsic_load: float,
        extraneous_load: float,
        germane_load: float,
        context: Optional[Dict[str, Any]] = None,
    ) -> List[AdaptationAction]:
        """
        Compute needed adaptations based on load components.

        Args:
            intrinsic_load: Intrinsic load (0-1)
            extraneous_load: Extraneous load (0-1)
            germane_load: Germane load (0-1)
            context: Optional context information

        Returns:
            List of computed adaptation actions
        """
        total_load = (intrinsic_load + extraneous_load + germane_load * 0.5) / 2.5
        total_load = min(1.0, total_load)

        load_estimate = {
            "intrinsic_load": intrinsic_load,
            "extraneous_load": extraneous_load,
            "germane_load": germane_load,
            "total_load": total_load,
        }

        return self.get_adaptations(load_estimate, context or {})

    def prioritize_actions(
        self,
        actions: List[AdaptationAction],
        urgency: UrgencyLevel,
        learner_preferences: Optional[Dict[str, Any]] = None,
    ) -> List[AdaptationAction]:
        """
        Prioritize adaptation actions by urgency and effectiveness.

        Args:
            actions: List of candidate actions
            urgency: Current urgency level
            learner_preferences: Optional learner preferences

        Returns:
            List of actions sorted by priority
        """
        preferences = learner_preferences or {}

        # Score each action
        scored_actions = []
        for action in actions:
            score = self._score_action(action, urgency, preferences)
            scored_actions.append((action, score))

        # Sort by score (descending)
        scored_actions.sort(key=lambda x: x[1], reverse=True)

        # Update priority numbers
        result = []
        for i, (action, score) in enumerate(scored_actions):
            action.priority = i + 1
            result.append(action)

        return result

    def apply_scaffolding(
        self,
        content: str,
        load_level: float,
        scaffold_type: str = "hint",
    ) -> str:
        """
        Apply scaffolding to reduce extraneous load.

        Args:
            content: Original content
            load_level: Current load level
            scaffold_type: Type of scaffolding to apply

        Returns:
            Modified content with scaffolding applied
        """
        if load_level < 0.5:
            # Low load - minimal scaffolding
            return content

        scaffolded = content

        if scaffold_type == "hint":
            # Add guiding questions
            scaffolded = self._add_hints(content, load_level)
        elif scaffold_type == "chunk":
            # Break into smaller pieces
            scaffolded = self._chunk_content(content, load_level)
        elif scaffold_type == "highlight":
            # Highlight key points
            scaffolded = self._highlight_key_points(content)
        elif scaffold_type == "summary":
            # Add summary
            scaffolded = self._add_summary(content)

        return scaffolded

    def simplify_presentation(
        self,
        content: str,
        target_complexity: float,
        current_complexity: Optional[float] = None,
    ) -> str:
        """
        Simplify content presentation to reduce cognitive load.

        Args:
            content: Original content
            target_complexity: Target complexity level (0-1)
            current_complexity: Current complexity (if known)

        Returns:
            Simplified content
        """
        if current_complexity is not None and current_complexity <= target_complexity:
            return content

        simplified = content

        # Apply simplification strategies
        if target_complexity < 0.3:
            # Heavy simplification
            simplified = self._simplify_heavily(content)
        elif target_complexity < 0.5:
            # Moderate simplification
            simplified = self._simplify_moderately(content)
        else:
            # Light simplification
            simplified = self._simplify_lightly(content)

        return simplified

    def _determine_urgency(self, total_load: float) -> UrgencyLevel:
        """Determine urgency level from total load."""
        if total_load >= self.config.critical_load_threshold:
            return UrgencyLevel.CRITICAL
        elif total_load >= self.config.high_load_threshold:
            return UrgencyLevel.HIGH
        elif total_load >= self.config.medium_load_threshold:
            return UrgencyLevel.MEDIUM
        else:
            return UrgencyLevel.LOW

    def _generate_candidates(
        self,
        total_load: float,
        intrinsic_load: float,
        extraneous_load: float,
        germane_load: float,
        context: Dict[str, Any],
        available_types: List[AdaptationType],
    ) -> List[AdaptationAction]:
        """Generate candidate adaptation actions."""
        candidates = []

        for adaptation_type in available_types:
            template = ADAPTATION_TEMPLATES.get(adaptation_type)
            if not template:
                continue

            # Check if load triggers this adaptation
            min_trigger = template.get("min_load_trigger", 0.5)
            if total_load < min_trigger:
                continue

            # Check for specific load type triggers
            should_include = self._should_include_adaptation(
                adaptation_type, total_load, intrinsic_load, extraneous_load, germane_load
            )

            if should_include:
                action = AdaptationAction(
                    action_type=adaptation_type,
                    priority=5,  # Will be recalculated
                    description=template["description"],
                    parameters=dict(template.get("parameters", {})),
                    expected_effect=template["expected_effect"],
                    expected_load_reduction=template.get("load_reduction", 0.1),
                )
                candidates.append(action)

        return candidates

    def _should_include_adaptation(
        self,
        adaptation_type: AdaptationType,
        total_load: float,
        intrinsic_load: float,
        extraneous_load: float,
        germane_load: float,
    ) -> bool:
        """Determine if an adaptation should be included based on load profile."""
        # Break is always good for high total load
        if adaptation_type == AdaptationType.SUGGEST_BREAK:
            return total_load > 0.8

        # Scaffolding for high intrinsic load
        if adaptation_type in (AdaptationType.ADD_SCAFFOLDING, AdaptationType.CHUNK_CONTENT):
            return intrinsic_load > 0.6

        # Complexity reduction for high extraneous load
        if adaptation_type in (AdaptationType.REDUCE_COMPLEXITY, AdaptationType.REDUCE_DISTRACTORS):
            return extraneous_load > 0.5

        # Visual aids for medium-high load
        if adaptation_type == AdaptationType.ADD_VISUAL_AID:
            return total_load > 0.6 and intrinsic_load > 0.5

        # Pacing adjustments for sustained high load
        if adaptation_type == AdaptationType.SLOW_PACE:
            return total_load > 0.65

        # Modality change for very high load
        if adaptation_type == AdaptationType.CHANGE_MODALITY:
            return total_load > 0.7

        # Skip to easier for critical situations
        if adaptation_type == AdaptationType.SKIP_TO_EASIER:
            return total_load > 0.85

        # Summaries and prior knowledge for moderate load
        if adaptation_type in (AdaptationType.PROVIDE_SUMMARY, AdaptationType.ACTIVATE_PRIOR_KNOWLEDGE):
            return total_load > 0.5 and germane_load < 0.3

        # Help offer for any elevated load
        if adaptation_type == AdaptationType.OFFER_HELP:
            return total_load > 0.55

        return total_load > 0.5

    def _prioritize_adaptations(
        self,
        candidates: List[AdaptationAction],
        total_load: float,
        urgency: UrgencyLevel,
        learner_id: Optional[str],
    ) -> List[AdaptationAction]:
        """Prioritize adaptation candidates."""
        if not candidates:
            return []

        # Score each candidate
        scored = []
        for action in candidates:
            score = self._calculate_action_score(action, total_load, urgency, learner_id)
            scored.append((action, score))

        # Sort by score (descending)
        scored.sort(key=lambda x: x[1], reverse=True)

        # Assign priorities
        result = []
        for i, (action, score) in enumerate(scored):
            action.priority = i + 1
            result.append(action)

        return result

    def _calculate_action_score(
        self,
        action: AdaptationAction,
        total_load: float,
        urgency: UrgencyLevel,
        learner_id: Optional[str],
    ) -> float:
        """Calculate priority score for an action."""
        score = 0.0

        # Base score from expected load reduction
        score += action.expected_load_reduction * 2

        # Urgency bonus
        urgency_multipliers = {
            UrgencyLevel.CRITICAL: 2.0,
            UrgencyLevel.HIGH: 1.5,
            UrgencyLevel.MEDIUM: 1.0,
            UrgencyLevel.LOW: 0.5,
        }
        score *= urgency_multipliers.get(urgency, 1.0)

        # Critical situations favor immediate relief
        if urgency == UrgencyLevel.CRITICAL:
            if action.action_type == AdaptationType.SUGGEST_BREAK:
                score += 0.5
            elif action.action_type == AdaptationType.SKIP_TO_EASIER:
                score += 0.3

        # Historical effectiveness
        if learner_id and action.action_type.value in self._effectiveness_scores:
            historical = self._effectiveness_scores.get(action.action_type.value, [])
            if historical:
                avg_effectiveness = float(np.mean(historical[-5:]))
                score += avg_effectiveness * 0.3

        # Reversibility bonus (prefer reversible actions)
        if action.reversible:
            score += 0.1

        return score

    def _score_action(
        self,
        action: AdaptationAction,
        urgency: UrgencyLevel,
        preferences: Dict[str, Any],
    ) -> float:
        """Score an action for prioritization."""
        score = action.expected_load_reduction * 10

        # Urgency factor
        if urgency == UrgencyLevel.CRITICAL:
            if action.action_type in (AdaptationType.SUGGEST_BREAK, AdaptationType.SKIP_TO_EASIER):
                score *= 2
        elif urgency == UrgencyLevel.HIGH:
            if action.action_type in (AdaptationType.ADD_SCAFFOLDING, AdaptationType.REDUCE_COMPLEXITY):
                score *= 1.5

        # Preference adjustments
        if preferences:
            preferred_types = preferences.get("preferred_adaptations", [])
            if action.action_type.value in preferred_types:
                score *= 1.3

            avoided_types = preferences.get("avoided_adaptations", [])
            if action.action_type.value in avoided_types:
                score *= 0.5

        return score

    def _generate_fallback_plan(
        self,
        urgency: UrgencyLevel,
        primary_actions: List[AdaptationAction],
    ) -> Optional[str]:
        """Generate fallback plan if primary adaptations fail."""
        if urgency == UrgencyLevel.CRITICAL:
            return "If adaptations fail, end session and reschedule. Learner is at cognitive capacity."
        elif urgency == UrgencyLevel.HIGH:
            return "If adaptations are insufficient, suggest a longer break or session pause."
        elif urgency == UrgencyLevel.MEDIUM:
            return "Continue monitoring; additional scaffolding may be needed."
        else:
            return None

    def _calculate_confidence(
        self,
        action_count: int,
        total_load: float,
        learner_id: Optional[str],
    ) -> float:
        """Calculate confidence in the adaptation plan."""
        confidence = 0.7  # Base confidence

        # More actions available = slightly higher confidence
        if action_count > 3:
            confidence += 0.1

        # Known learner = higher confidence
        if learner_id and learner_id in self._adaptation_history:
            confidence += 0.1

        # Extreme loads are more certain
        if total_load > 0.9 or total_load < 0.3:
            confidence += 0.05

        return min(1.0, confidence)

    def _update_history(
        self,
        learner_id: str,
        actions: List[AdaptationAction],
        load_before: float,
    ) -> None:
        """Update adaptation history for tracking effectiveness."""
        if learner_id not in self._adaptation_history:
            self._adaptation_history[learner_id] = []

        entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "actions": [a.action_type.value for a in actions],
            "load_before": load_before,
        }
        self._adaptation_history[learner_id].append(entry)

        # Keep history bounded
        max_history = 100
        if len(self._adaptation_history[learner_id]) > max_history:
            self._adaptation_history[learner_id] = \
                self._adaptation_history[learner_id][-max_history:]

    def record_effectiveness(
        self,
        learner_id: str,
        adaptation_type: AdaptationType,
        load_before: float,
        load_after: float,
    ) -> None:
        """Record the effectiveness of an adaptation for learning."""
        if not self.config.track_effectiveness:
            return

        # Calculate effectiveness score
        if load_before > 0:
            effectiveness = (load_before - load_after) / load_before
            effectiveness = float(np.clip(effectiveness, 0.0, 1.0))
        else:
            effectiveness = 0.0

        key = adaptation_type.value
        if key not in self._effectiveness_scores:
            self._effectiveness_scores[key] = []

        self._effectiveness_scores[key].append(effectiveness)

        # Keep history bounded
        if len(self._effectiveness_scores[key]) > self.config.effectiveness_window_size:
            self._effectiveness_scores[key] = \
                self._effectiveness_scores[key][-self.config.effectiveness_window_size:]

        logger.debug(
            f"Recorded effectiveness for {adaptation_type.value}: "
            f"{effectiveness:.2f} (load: {load_before:.2f} -> {load_after:.2f})"
        )

    def _add_hints(self, content: str, load_level: float) -> str:
        """Add guiding hints to content."""
        hint_count = 1 if load_level < 0.7 else 2 if load_level < 0.85 else 3

        hints = [
            "Focus on the key concept here.",
            "Consider how this relates to what you learned before.",
            "Take your time with this section.",
        ]

        selected_hints = hints[:hint_count]
        hint_text = "\n".join(f"[Hint: {h}]" for h in selected_hints)

        return f"{hint_text}\n\n{content}"

    def _chunk_content(self, content: str, load_level: float) -> str:
        """Break content into smaller chunks."""
        # Split into sentences
        import re
        sentences = re.split(r'(?<=[.!?])\s+', content)

        if len(sentences) <= 2:
            return content

        # Determine chunk size based on load
        if load_level > 0.8:
            chunk_size = 1  # One sentence at a time
        elif load_level > 0.65:
            chunk_size = 2
        else:
            chunk_size = 3

        chunks = []
        for i in range(0, len(sentences), chunk_size):
            chunk = " ".join(sentences[i:i + chunk_size])
            chunks.append(chunk)

        return "\n\n---\n\n".join(chunks)

    def _highlight_key_points(self, content: str) -> str:
        """Highlight key points in content."""
        # Simple implementation - mark first sentence of each paragraph
        paragraphs = content.split("\n\n")
        highlighted = []

        for para in paragraphs:
            if para.strip():
                sentences = para.split(". ")
                if sentences:
                    sentences[0] = f"**{sentences[0]}**"
                highlighted.append(". ".join(sentences))

        return "\n\n".join(highlighted)

    def _add_summary(self, content: str) -> str:
        """Add a summary to the content."""
        # Simple summary - take first sentence of each paragraph
        paragraphs = content.split("\n\n")
        key_sentences = []

        for para in paragraphs:
            if para.strip():
                first_sentence = para.split(". ")[0]
                if len(first_sentence) > 20:
                    key_sentences.append(first_sentence)

        if key_sentences:
            summary = "Key Points:\n" + "\n".join(f"- {s}" for s in key_sentences[:3])
            return f"{summary}\n\n---\n\n{content}"

        return content

    def _simplify_heavily(self, content: str) -> str:
        """Apply heavy simplification."""
        import re

        simplified = content

        # Remove parenthetical asides
        simplified = re.sub(r'\([^)]+\)', '', simplified)

        # Shorten long sentences
        sentences = re.split(r'(?<=[.!?])\s+', simplified)
        short_sentences = []
        for sent in sentences:
            words = sent.split()
            if len(words) > 15:
                # Take first part
                short_sentences.append(" ".join(words[:12]) + "...")
            else:
                short_sentences.append(sent)

        return " ".join(short_sentences)

    def _simplify_moderately(self, content: str) -> str:
        """Apply moderate simplification."""
        import re

        simplified = content

        # Remove some subordinate clauses
        simplified = re.sub(r',\s*which[^,]+,', ', ', simplified)
        simplified = re.sub(r',\s*who[^,]+,', ', ', simplified)

        return simplified

    def _simplify_lightly(self, content: str) -> str:
        """Apply light simplification."""
        # Just clean up whitespace and formatting
        import re
        simplified = re.sub(r'\s+', ' ', content)
        return simplified.strip()
