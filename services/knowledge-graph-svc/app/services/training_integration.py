"""
Training Service Integration

Integration with the training service for enhanced knowledge tracing
and personalized remediation recommendations.
"""
import logging
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Set, Tuple, Any
from datetime import datetime
from enum import Enum

import numpy as np

logger = logging.getLogger(__name__)


class SkillState(str, Enum):
    """State of skill mastery."""
    NOT_STARTED = "not_started"
    LEARNING = "learning"
    STRUGGLING = "struggling"
    PROFICIENT = "proficient"
    MASTERED = "mastered"


class EventType(str, Enum):
    """Types of mastery update events."""
    ASSESSMENT_COMPLETED = "assessment_completed"
    PRACTICE_COMPLETED = "practice_completed"
    LESSON_COMPLETED = "lesson_completed"
    SKILL_MASTERED = "skill_mastered"
    SKILL_DECAY = "skill_decay"


@dataclass
class MasteryUpdateEvent:
    """Event from training service about mastery update."""
    event_type: str
    student_id: str
    skill_id: str
    previous_mastery: float
    new_mastery: float
    timestamp: str
    assessment_score: Optional[float] = None
    time_spent_seconds: Optional[int] = None
    attempts: int = 1
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class EnhancedTracingResult:
    """Result of enhanced knowledge tracing."""
    student_id: str
    skill_id: str
    original_probability: float
    adjusted_probability: float
    prerequisite_factor: float
    transfer_effects: Dict[str, float]
    confidence: float
    recommendations: List[str]


@dataclass
class RemediationStep:
    """A step in the remediation path."""
    concept_id: str
    concept_name: str
    step_type: str  # review, practice, assessment
    priority: int
    estimated_duration_minutes: int
    resources: List[str]
    rationale: str
    expected_improvement: float


@dataclass
class RemediationPlan:
    """Complete remediation plan for a student."""
    student_id: str
    failed_skill: str
    weak_prerequisites: List[str]
    remediation_steps: List[RemediationStep]
    estimated_total_time_minutes: int
    predicted_time_to_mastery_hours: float
    success_probability: float


@dataclass
class MasteryPropagation:
    """Result of mastery propagation through graph."""
    source_skill: str
    affected_skills: Dict[str, float]
    propagation_type: str  # forward (enables), backward (prerequisite)
    timestamp: str


@dataclass
class TrainingIntegrationConfig:
    """Configuration for training integration."""
    # Prerequisite influence
    prerequisite_weight: float = 0.3
    transfer_decay: float = 0.7

    # Mastery thresholds
    mastery_threshold: float = 0.8
    struggling_threshold: float = 0.4
    decay_rate: float = 0.01  # Per day

    # Remediation settings
    max_remediation_steps: int = 10
    min_review_interval_days: int = 1

    # Integration settings
    webhook_url: Optional[str] = None
    sync_interval_seconds: int = 60


# Knowledge graph for integration
SKILL_PREREQUISITES = {
    "algebra": ["arithmetic", "fractions"],
    "calculus": ["algebra", "trigonometry"],
    "trigonometry": ["geometry", "algebra"],
    "linear_algebra": ["algebra"],
    "differential_equations": ["calculus", "linear_algebra"],
    "statistics": ["algebra", "probability"],
    "probability": ["fractions"],
    "data_structures": ["programming_basics"],
    "algorithms": ["data_structures"],
    "machine_learning": ["linear_algebra", "statistics", "programming_basics"],
    "deep_learning": ["machine_learning", "calculus"],
    "physics": ["calculus", "algebra"],
    "chemistry": ["algebra"],
    "genetics": ["biology", "probability"],
}

# Skill metadata
SKILL_METADATA = {
    "arithmetic": {"domain": "math", "difficulty": 0.1, "learning_time_hours": 10},
    "fractions": {"domain": "math", "difficulty": 0.2, "learning_time_hours": 8},
    "algebra": {"domain": "math", "difficulty": 0.4, "learning_time_hours": 20},
    "geometry": {"domain": "math", "difficulty": 0.35, "learning_time_hours": 15},
    "trigonometry": {"domain": "math", "difficulty": 0.5, "learning_time_hours": 15},
    "calculus": {"domain": "math", "difficulty": 0.7, "learning_time_hours": 40},
    "linear_algebra": {"domain": "math", "difficulty": 0.65, "learning_time_hours": 30},
    "statistics": {"domain": "math", "difficulty": 0.5, "learning_time_hours": 25},
    "probability": {"domain": "math", "difficulty": 0.5, "learning_time_hours": 20},
    "programming_basics": {"domain": "cs", "difficulty": 0.3, "learning_time_hours": 30},
    "data_structures": {"domain": "cs", "difficulty": 0.55, "learning_time_hours": 40},
    "algorithms": {"domain": "cs", "difficulty": 0.65, "learning_time_hours": 50},
    "machine_learning": {"domain": "cs", "difficulty": 0.75, "learning_time_hours": 60},
    "deep_learning": {"domain": "cs", "difficulty": 0.85, "learning_time_hours": 80},
    "physics": {"domain": "science", "difficulty": 0.55, "learning_time_hours": 40},
    "chemistry": {"domain": "science", "difficulty": 0.45, "learning_time_hours": 35},
    "biology": {"domain": "science", "difficulty": 0.35, "learning_time_hours": 30},
    "genetics": {"domain": "science", "difficulty": 0.6, "learning_time_hours": 35},
}


class TrainingIntegration:
    """
    Integration with training service for enhanced knowledge tracing.

    Capabilities:
    - Enhanced BKT/DKT predictions using prerequisite mastery
    - Remediation path generation for failed skills
    - Mastery propagation through the knowledge graph
    - Webhook handling for mastery updates

    Usage:
        integration = TrainingIntegration()
        result = await integration.enhance_knowledge_tracing(
            student_id="student123",
            skill_id="calculus",
            performance=0.7
        )
    """

    def __init__(
        self,
        config: Optional[TrainingIntegrationConfig] = None,
    ):
        self.config = config or TrainingIntegrationConfig()

        # Skill graph
        self._prerequisites = {k.lower(): [p.lower() for p in v] for k, v in SKILL_PREREQUISITES.items()}
        self._dependents: Dict[str, Set[str]] = {}
        self._skill_metadata = {k.lower(): v for k, v in SKILL_METADATA.items()}

        # Build dependents index
        for skill, prereqs in self._prerequisites.items():
            for prereq in prereqs:
                if prereq not in self._dependents:
                    self._dependents[prereq] = set()
                self._dependents[prereq].add(skill)

        # Student state cache
        self._student_mastery: Dict[str, Dict[str, float]] = {}

        logger.info("TrainingIntegration initialized")

    async def enhance_knowledge_tracing(
        self,
        student_id: str,
        skill_id: str,
        performance: float,
    ) -> EnhancedTracingResult:
        """
        Use knowledge graph to enhance BKT/DKT predictions.

        1. Get prerequisites for skill
        2. Check mastery of prerequisites
        3. Adjust skill probability based on prerequisite mastery
        4. Predict transfer effects to related skills

        Args:
            student_id: Student identifier
            skill_id: Skill being assessed
            performance: Performance score (0-1)

        Returns:
            EnhancedTracingResult with adjusted predictions
        """
        skill_id = skill_id.lower()

        # Get student's current mastery state
        student_mastery = self._get_student_mastery(student_id)

        # Get prerequisites for the skill
        prerequisites = self._prerequisites.get(skill_id, [])

        # Calculate prerequisite mastery factor
        prereq_masteries = [
            student_mastery.get(prereq, 0.0)
            for prereq in prerequisites
        ]
        prereq_factor = np.mean(prereq_masteries) if prereq_masteries else 1.0

        # Original probability (simple Bayesian update)
        prior = student_mastery.get(skill_id, 0.3)
        likelihood = performance  # Simplified
        original_probability = self._bayesian_update(prior, likelihood)

        # Adjust based on prerequisite mastery
        adjusted_probability = self._adjust_for_prerequisites(
            original_probability, prereq_factor, performance
        )

        # Predict transfer effects to related skills
        transfer_effects = self._predict_transfer_effects(
            skill_id, adjusted_probability, student_mastery
        )

        # Generate recommendations
        recommendations = self._generate_tracing_recommendations(
            skill_id, adjusted_probability, prereq_factor, prerequisites, student_mastery
        )

        # Update student mastery
        self._update_student_mastery(student_id, skill_id, adjusted_probability)

        return EnhancedTracingResult(
            student_id=student_id,
            skill_id=skill_id,
            original_probability=original_probability,
            adjusted_probability=adjusted_probability,
            prerequisite_factor=prereq_factor,
            transfer_effects=transfer_effects,
            confidence=self._calculate_confidence(prereq_factor, len(prerequisites)),
            recommendations=recommendations,
        )

    async def get_remediation_recommendations(
        self,
        student_id: str,
        failed_skill: str,
    ) -> RemediationPlan:
        """
        Generate remediation path when student fails a skill.

        1. Identify which prerequisites might be weak
        2. Generate targeted practice path
        3. Predict time to mastery

        Args:
            student_id: Student identifier
            failed_skill: Skill that was failed

        Returns:
            RemediationPlan with steps and predictions
        """
        failed_skill = failed_skill.lower()
        student_mastery = self._get_student_mastery(student_id)

        # Find weak prerequisites
        weak_prerequisites = self._identify_weak_prerequisites(
            failed_skill, student_mastery
        )

        # Generate remediation steps
        remediation_steps = []
        total_time = 0

        # First, address weak prerequisites
        for prereq in weak_prerequisites:
            step = self._create_remediation_step(
                prereq,
                "review",
                priority=1,
                current_mastery=student_mastery.get(prereq, 0.0),
            )
            remediation_steps.append(step)
            total_time += step.estimated_duration_minutes

        # Then, practice the failed skill
        failed_step = self._create_remediation_step(
            failed_skill,
            "practice",
            priority=2,
            current_mastery=student_mastery.get(failed_skill, 0.0),
        )
        remediation_steps.append(failed_step)
        total_time += failed_step.estimated_duration_minutes

        # Add assessment step
        assessment_step = self._create_remediation_step(
            failed_skill,
            "assessment",
            priority=3,
            current_mastery=student_mastery.get(failed_skill, 0.0),
        )
        remediation_steps.append(assessment_step)
        total_time += assessment_step.estimated_duration_minutes

        # Predict time to mastery
        time_to_mastery = self._predict_time_to_mastery(
            failed_skill, student_mastery, weak_prerequisites
        )

        # Calculate success probability
        success_probability = self._calculate_remediation_success(
            weak_prerequisites, student_mastery
        )

        return RemediationPlan(
            student_id=student_id,
            failed_skill=failed_skill,
            weak_prerequisites=weak_prerequisites,
            remediation_steps=remediation_steps[:self.config.max_remediation_steps],
            estimated_total_time_minutes=total_time,
            predicted_time_to_mastery_hours=time_to_mastery,
            success_probability=success_probability,
        )

    async def handle_mastery_update(
        self,
        event: MasteryUpdateEvent,
    ) -> MasteryPropagation:
        """
        Handle mastery update from training service.

        Updates graph state and tracks mastery propagation.

        Args:
            event: Mastery update event

        Returns:
            MasteryPropagation result
        """
        student_id = event.student_id
        skill_id = event.skill_id.lower()
        new_mastery = event.new_mastery

        # Update local mastery state
        self._update_student_mastery(student_id, skill_id, new_mastery)

        # Calculate propagation effects
        affected_skills = {}

        # Forward propagation (to skills this enables)
        dependents = self._dependents.get(skill_id, set())
        for dependent in dependents:
            # Dependent skills get a boost when prerequisites are mastered
            if new_mastery >= self.config.mastery_threshold:
                current = self._get_student_mastery(student_id).get(dependent, 0.0)
                boost = (new_mastery - self.config.mastery_threshold) * self.config.transfer_decay * 0.2
                affected_skills[dependent] = min(1.0, current + boost)

        # Backward propagation (prerequisite mastery affects current skill)
        prerequisites = self._prerequisites.get(skill_id, [])
        for prereq in prerequisites:
            prereq_mastery = self._get_student_mastery(student_id).get(prereq, 0.0)
            if prereq_mastery < self.config.struggling_threshold:
                # Weak prerequisite may decay current skill
                affected_skills[prereq] = prereq_mastery

        # Update affected skills
        for affected_skill, effect in affected_skills.items():
            if effect > 0:
                current = self._get_student_mastery(student_id).get(affected_skill, 0.0)
                # Small update based on propagation
                new_value = current * 0.9 + effect * 0.1
                self._update_student_mastery(student_id, affected_skill, new_value)

        propagation_type = "forward" if dependents else "backward"

        return MasteryPropagation(
            source_skill=skill_id,
            affected_skills=affected_skills,
            propagation_type=propagation_type,
            timestamp=event.timestamp,
        )

    def get_skill_state(
        self,
        student_id: str,
        skill_id: str,
    ) -> SkillState:
        """Get the state of a skill for a student."""
        mastery = self._get_student_mastery(student_id).get(skill_id.lower(), 0.0)

        if mastery >= self.config.mastery_threshold:
            return SkillState.MASTERED
        elif mastery >= 0.6:
            return SkillState.PROFICIENT
        elif mastery >= self.config.struggling_threshold:
            return SkillState.LEARNING
        elif mastery > 0:
            return SkillState.STRUGGLING
        else:
            return SkillState.NOT_STARTED

    def get_prerequisite_readiness(
        self,
        student_id: str,
        skill_id: str,
    ) -> Dict[str, Any]:
        """Check if student is ready for a skill based on prerequisites."""
        skill_id = skill_id.lower()
        prerequisites = self._prerequisites.get(skill_id, [])
        student_mastery = self._get_student_mastery(student_id)

        prereq_status = {}
        all_ready = True

        for prereq in prerequisites:
            mastery = student_mastery.get(prereq, 0.0)
            ready = mastery >= self.config.mastery_threshold
            prereq_status[prereq] = {
                "mastery": mastery,
                "ready": ready,
                "state": self.get_skill_state(student_id, prereq).value,
            }
            if not ready:
                all_ready = False

        return {
            "skill_id": skill_id,
            "ready": all_ready,
            "prerequisites": prereq_status,
            "readiness_score": np.mean([p["mastery"] for p in prereq_status.values()]) if prereq_status else 1.0,
        }

    def _get_student_mastery(self, student_id: str) -> Dict[str, float]:
        """Get student's mastery state."""
        if student_id not in self._student_mastery:
            self._student_mastery[student_id] = {}
        return self._student_mastery[student_id]

    def _update_student_mastery(
        self,
        student_id: str,
        skill_id: str,
        mastery: float,
    ):
        """Update student's mastery for a skill."""
        if student_id not in self._student_mastery:
            self._student_mastery[student_id] = {}
        self._student_mastery[student_id][skill_id] = mastery

    def _bayesian_update(
        self,
        prior: float,
        likelihood: float,
    ) -> float:
        """Simple Bayesian update for mastery probability."""
        # Simplified BKT-style update
        learn_rate = 0.3
        guess = 0.2
        slip = 0.1

        # P(L|correct) = P(L) + P(~L) * P(T)
        # P(L|incorrect) = P(L) * (1 - P(S)) / P(incorrect)

        if likelihood >= 0.5:  # Correct-ish
            posterior = prior + (1 - prior) * learn_rate
        else:  # Incorrect-ish
            posterior = prior * (1 - slip) / max(0.01, 1 - prior * (1 - slip) - (1 - prior) * guess)

        return min(1.0, max(0.0, posterior))

    def _adjust_for_prerequisites(
        self,
        probability: float,
        prereq_factor: float,
        performance: float,
    ) -> float:
        """Adjust probability based on prerequisite mastery."""
        # If prerequisites are weak, limit the maximum achievable mastery
        max_mastery = prereq_factor * 0.5 + 0.5  # Range 0.5-1.0 based on prereqs

        # Weight the adjustment
        weight = self.config.prerequisite_weight
        adjusted = probability * (1 - weight) + (probability * prereq_factor) * weight

        # Cap at max mastery
        return min(adjusted, max_mastery)

    def _predict_transfer_effects(
        self,
        skill_id: str,
        new_mastery: float,
        current_mastery: Dict[str, float],
    ) -> Dict[str, float]:
        """Predict transfer effects to related skills."""
        effects = {}

        # Forward transfer (to skills this enables)
        dependents = self._dependents.get(skill_id, set())
        for dependent in dependents:
            current = current_mastery.get(dependent, 0.0)
            # Transfer effect decays with distance
            effect = new_mastery * self.config.transfer_decay * 0.1
            effects[dependent] = min(1.0, current + effect)

        # Lateral transfer (to similar skills in same domain)
        skill_meta = self._skill_metadata.get(skill_id, {})
        skill_domain = skill_meta.get("domain", "")

        for other_skill, meta in self._skill_metadata.items():
            if other_skill != skill_id and meta.get("domain") == skill_domain:
                if other_skill not in effects:
                    current = current_mastery.get(other_skill, 0.0)
                    # Smaller lateral transfer
                    effect = new_mastery * self.config.transfer_decay * 0.05
                    effects[other_skill] = min(1.0, current + effect)

        return effects

    def _generate_tracing_recommendations(
        self,
        skill_id: str,
        mastery: float,
        prereq_factor: float,
        prerequisites: List[str],
        student_mastery: Dict[str, float],
    ) -> List[str]:
        """Generate recommendations based on tracing results."""
        recommendations = []

        if mastery < self.config.struggling_threshold:
            recommendations.append(f"Student is struggling with {skill_id}")

            # Check prerequisites
            weak_prereqs = [
                p for p in prerequisites
                if student_mastery.get(p, 0.0) < self.config.mastery_threshold
            ]
            if weak_prereqs:
                recommendations.append(
                    f"Review prerequisites: {', '.join(weak_prereqs)}"
                )

        elif mastery >= self.config.mastery_threshold:
            recommendations.append(f"Student has mastered {skill_id}")

            # Suggest next skills
            dependents = list(self._dependents.get(skill_id, set()))[:3]
            if dependents:
                recommendations.append(
                    f"Ready to advance to: {', '.join(dependents)}"
                )

        else:
            recommendations.append(f"Continue practice on {skill_id}")

        if prereq_factor < 0.7:
            recommendations.append("Prerequisite knowledge needs strengthening")

        return recommendations

    def _calculate_confidence(
        self,
        prereq_factor: float,
        num_prerequisites: int,
    ) -> float:
        """Calculate confidence in the prediction."""
        # Higher confidence when more data about prerequisites
        base_confidence = 0.5
        prereq_bonus = prereq_factor * 0.3
        data_bonus = min(0.2, num_prerequisites * 0.05)
        return min(1.0, base_confidence + prereq_bonus + data_bonus)

    def _identify_weak_prerequisites(
        self,
        skill_id: str,
        student_mastery: Dict[str, float],
    ) -> List[str]:
        """Identify prerequisites that are weak."""
        prerequisites = self._prerequisites.get(skill_id, [])
        weak = []

        for prereq in prerequisites:
            mastery = student_mastery.get(prereq, 0.0)
            if mastery < self.config.mastery_threshold:
                weak.append(prereq)

                # Recursively check prerequisites of weak prerequisites
                sub_weak = self._identify_weak_prerequisites(prereq, student_mastery)
                for sw in sub_weak:
                    if sw not in weak:
                        weak.append(sw)

        return weak

    def _create_remediation_step(
        self,
        skill_id: str,
        step_type: str,
        priority: int,
        current_mastery: float,
    ) -> RemediationStep:
        """Create a remediation step."""
        meta = self._skill_metadata.get(skill_id, {})
        skill_name = skill_id.replace("_", " ").title()

        # Estimate duration based on current mastery and step type
        base_time = 30  # minutes
        if step_type == "review":
            duration = int(base_time * (1 - current_mastery))
        elif step_type == "practice":
            duration = int(base_time * 1.5 * (1 - current_mastery))
        else:  # assessment
            duration = 15

        # Generate rationale
        if step_type == "review":
            rationale = f"Review {skill_name} to strengthen foundational understanding"
        elif step_type == "practice":
            rationale = f"Practice {skill_name} with targeted exercises"
        else:
            rationale = f"Assess mastery of {skill_name}"

        # Expected improvement
        expected = min(0.3, 0.1 + (1 - current_mastery) * 0.2)

        return RemediationStep(
            concept_id=skill_id,
            concept_name=skill_name,
            step_type=step_type,
            priority=priority,
            estimated_duration_minutes=max(10, duration),
            resources=[f"{skill_id}_{step_type}_resource"],
            rationale=rationale,
            expected_improvement=expected,
        )

    def _predict_time_to_mastery(
        self,
        skill_id: str,
        student_mastery: Dict[str, float],
        weak_prerequisites: List[str],
    ) -> float:
        """Predict time to mastery in hours."""
        meta = self._skill_metadata.get(skill_id, {})
        base_time = meta.get("learning_time_hours", 20)
        current_mastery = student_mastery.get(skill_id, 0.0)

        # Remaining time based on current progress
        remaining_factor = 1 - current_mastery

        # Add time for weak prerequisites
        prereq_time = 0
        for prereq in weak_prerequisites:
            prereq_meta = self._skill_metadata.get(prereq, {})
            prereq_mastery = student_mastery.get(prereq, 0.0)
            prereq_time += prereq_meta.get("learning_time_hours", 10) * (1 - prereq_mastery) * 0.5

        return base_time * remaining_factor + prereq_time

    def _calculate_remediation_success(
        self,
        weak_prerequisites: List[str],
        student_mastery: Dict[str, float],
    ) -> float:
        """Calculate probability of successful remediation."""
        if not weak_prerequisites:
            return 0.9

        # Success probability based on how weak the prerequisites are
        avg_mastery = np.mean([
            student_mastery.get(p, 0.0) for p in weak_prerequisites
        ])

        # More weak prerequisites = lower success probability
        prereq_penalty = len(weak_prerequisites) * 0.05

        return max(0.3, min(0.9, 0.7 + avg_mastery * 0.2 - prereq_penalty))

    def set_student_mastery(
        self,
        student_id: str,
        mastery_levels: Dict[str, float],
    ):
        """Set mastery levels for a student (for testing/initialization)."""
        self._student_mastery[student_id] = {
            k.lower(): v for k, v in mastery_levels.items()
        }

    def get_all_skills(self) -> List[str]:
        """Get all skills in the knowledge graph."""
        return list(self._skill_metadata.keys())

    def get_skill_info(self, skill_id: str) -> Optional[Dict[str, Any]]:
        """Get information about a skill."""
        skill_id = skill_id.lower()
        if skill_id not in self._skill_metadata:
            return None

        meta = self._skill_metadata[skill_id]
        return {
            "id": skill_id,
            "name": skill_id.replace("_", " ").title(),
            **meta,
            "prerequisites": self._prerequisites.get(skill_id, []),
            "dependents": list(self._dependents.get(skill_id, set())),
        }
