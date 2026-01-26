"""
Diagnosis-Specific Goal Adaptations.

This module provides adaptation strategies for learning goals based on
learner diagnoses including ADHD, ASD, Dyslexia, and Anxiety.
Adaptations modify goals, timelines, scaffolds, and measurement approaches.
"""

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class AdaptationStrategy(BaseModel):
    """
    Adaptation strategy for a specific diagnosis.

    Contains modifications for goals, measurements, timelines,
    and scaffold additions.
    """

    goal_modifications: List[str] = Field(
        default_factory=list,
        description="Modifications to apply to goal structure",
    )
    measurement_adaptations: List[str] = Field(
        default_factory=list,
        description="Adaptations for how progress is measured",
    )
    timeline_adaptations: List[str] = Field(
        default_factory=list,
        description="Adjustments to timelines and pacing",
    )
    scaffold_additions: List[str] = Field(
        default_factory=list,
        description="Additional scaffolds and supports",
    )
    environmental_supports: List[str] = Field(
        default_factory=list,
        description="Environmental modifications",
    )
    communication_adaptations: List[str] = Field(
        default_factory=list,
        description="Adaptations for communication style",
    )

    def get_timeline_multiplier(self) -> float:
        """Extract timeline extension multiplier from adaptations."""
        for adaptation in self.timeline_adaptations:
            if "Extend timelines by" in adaptation:
                try:
                    percent = int(
                        adaptation.replace("Extend timelines by ", "")
                        .replace("%", "")
                        .strip()
                    )
                    return 1 + (percent / 100)
                except ValueError:
                    pass
        return 1.0


class BaseGoal(BaseModel):
    """Base goal before adaptations are applied."""

    text: str = Field(..., description="Goal text")
    domain: str = Field(..., description="Goal domain")
    baseline: str = Field(..., description="Baseline level")
    target: str = Field(..., description="Target level")
    duration_weeks: int = Field(default=12, description="Default duration in weeks")
    measurement_method: str = Field(default="", description="How to measure progress")
    measurement_frequency: str = Field(default="weekly")
    milestones_count: int = Field(default=4)


class AdaptedGoal(BaseModel):
    """Goal after diagnosis adaptations have been applied."""

    text: str = Field(..., description="Adapted goal text")
    domain: str = Field(..., description="Goal domain")
    rationale: str = Field(default="", description="Rationale for goal")
    baseline: str = Field(..., description="Baseline level")
    target: str = Field(..., description="Target level")
    duration_weeks: int = Field(..., description="Adapted duration in weeks")
    measurement_method: str = Field(..., description="Adapted measurement method")
    measurement_frequency: str = Field(default="weekly")
    smart_criteria: Dict[str, Any] = Field(default_factory=dict)
    adaptations: Dict[str, List[str]] = Field(
        default_factory=dict,
        description="Diagnosis -> list of adaptations applied",
    )
    scaffolds: List[str] = Field(default_factory=list)
    accommodations: List[str] = Field(default_factory=list)
    timeline_multiplier: float = Field(default=1.0)


@dataclass
class DiagnosisAdaptationConfig:
    """Configuration for diagnosis adaptation engine."""

    enable_timeline_extension: bool = True
    max_timeline_multiplier: float = 2.0
    enable_scaffold_additions: bool = True
    max_scaffolds_per_goal: int = 10
    enable_measurement_adaptations: bool = True
    combine_overlapping_adaptations: bool = True


class DiagnosisAdaptationEngine:
    """
    Adapts goals based on learner diagnoses.

    Applies research-based adaptations for ADHD, ASD, Dyslexia, Anxiety,
    and other conditions. Combines adaptations intelligently when
    multiple diagnoses are present.
    """

    ADAPTATION_STRATEGIES: Dict[str, AdaptationStrategy] = {
        "ADHD": AdaptationStrategy(
            goal_modifications=[
                "Break into smaller, more frequent milestones",
                "Include movement breaks between tasks",
                "Add visual progress tracking",
                "Incorporate gamification elements",
                "Allow flexible task ordering",
                "Use high-interest activities as rewards",
                "Include choice in how to demonstrate learning",
            ],
            measurement_adaptations=[
                "Use shorter assessment windows",
                "Allow multiple attempts",
                "Provide immediate feedback",
                "Use frequent, brief check-ins",
                "Include self-monitoring components",
            ],
            timeline_adaptations=[
                "Extend timelines by 25%",
                "More frequent check-ins",
                "Built-in catch-up periods",
                "Shorter milestone intervals",
            ],
            scaffold_additions=[
                "Task initiation prompts",
                "Time awareness supports",
                "Organization tools",
                "Visual timers",
                "Chunked task lists",
                "Transition warnings",
                "Fidget tools availability",
            ],
            environmental_supports=[
                "Minimize distractions in workspace",
                "Provide noise-canceling headphones option",
                "Allow movement breaks",
                "Flexible seating options",
            ],
            communication_adaptations=[
                "Use clear, concise instructions",
                "Provide visual cues with verbal instructions",
                "Check for understanding frequently",
                "Use positive reinforcement",
            ],
        ),
        "ASD": AdaptationStrategy(
            goal_modifications=[
                "Use concrete, literal language",
                "Avoid idioms and figurative language",
                "Include visual supports",
                "Maintain consistent routines",
                "Add explicit social skill components",
                "Break abstract concepts into concrete steps",
                "Include special interest connections when possible",
            ],
            measurement_adaptations=[
                "Use structured response formats",
                "Provide predictable assessment contexts",
                "Allow additional processing time",
                "Accept alternative demonstration methods",
                "Use consistent evaluation criteria",
            ],
            timeline_adaptations=[
                "Consistent weekly schedule",
                "Advance notice of changes",
                "Transition supports between activities",
                "Predictable routine structure",
            ],
            scaffold_additions=[
                "Visual schedules",
                "Social stories for new situations",
                "Sensory accommodations",
                "First-then boards",
                "Clear beginning and end markers",
                "Explicit expectations",
                "Concrete examples",
            ],
            environmental_supports=[
                "Reduce sensory overwhelm",
                "Provide quiet space option",
                "Consistent physical environment",
                "Clear visual boundaries",
            ],
            communication_adaptations=[
                "Use direct, explicit language",
                "Avoid sarcasm and idioms",
                "Provide written instructions",
                "Allow response time",
                "Use visual supports",
            ],
        ),
        "DYSLEXIA": AdaptationStrategy(
            goal_modifications=[
                "Incorporate multisensory approaches",
                "Focus on phonological awareness",
                "Use structured literacy methods",
                "Include assistive technology options",
                "Provide oral response alternatives",
                "Separate reading from content knowledge assessment",
                "Use graphic organizers",
            ],
            measurement_adaptations=[
                "Extended time for reading tasks",
                "Audio presentation options",
                "Oral response options",
                "Use of text-to-speech",
                "Reduce reading load in assessments",
            ],
            timeline_adaptations=[
                "Longer skill acquisition periods",
                "Mastery-based progression",
                "Cumulative review built in",
                "Extend timelines by 50%",
            ],
            scaffold_additions=[
                "Text-to-speech tools",
                "Graphic organizers",
                "Color coding for text",
                "Font and spacing adjustments",
                "Audio books and materials",
                "Spell check tools",
                "Word prediction software",
            ],
            environmental_supports=[
                "Reduce visual clutter",
                "Use dyslexia-friendly fonts",
                "Provide colored overlays if helpful",
                "Good lighting",
            ],
            communication_adaptations=[
                "Provide verbal explanations",
                "Reduce reading requirements",
                "Use visual demonstrations",
                "Check comprehension frequently",
            ],
        ),
        "ANXIETY": AdaptationStrategy(
            goal_modifications=[
                "Use gradual exposure approach",
                "Celebrate small wins explicitly",
                "Reduce performance pressure",
                "Include self-regulation skills",
                "Provide safe failure opportunities",
                "Build confidence before challenge",
                "Include choice and control",
            ],
            measurement_adaptations=[
                "Low-stakes practice opportunities",
                "Private feedback delivery",
                "Growth-focused metrics",
                "Multiple ways to show learning",
                "Reduce time pressure",
            ],
            timeline_adaptations=[
                "Flexible pacing",
                "Stress-free review periods",
                "No sudden deadlines",
                "Buffer time for difficult transitions",
            ],
            scaffold_additions=[
                "Calming strategies toolkit",
                "Positive self-talk prompts",
                "Break options available",
                "Worry management tools",
                "Grounding techniques",
                "Safe person/place identification",
                "Escape valve options",
            ],
            environmental_supports=[
                "Create predictable environment",
                "Safe space availability",
                "Reduce uncertainty when possible",
                "Provide advance notice of changes",
            ],
            communication_adaptations=[
                "Use encouraging, supportive tone",
                "Validate feelings",
                "Provide reassurance",
                "Normalize mistakes as learning",
            ],
        ),
        "DYSCALCULIA": AdaptationStrategy(
            goal_modifications=[
                "Use concrete manipulatives",
                "Connect to real-world applications",
                "Build number sense foundationally",
                "Use visual math representations",
                "Allow calculator for computation",
            ],
            measurement_adaptations=[
                "Extended time for math tasks",
                "Use of manipulatives during assessment",
                "Calculator access for non-computation goals",
                "Show work options",
            ],
            timeline_adaptations=[
                "Longer practice periods",
                "Mastery-based progression",
                "Extend timelines by 50%",
                "More review cycles",
            ],
            scaffold_additions=[
                "Number lines",
                "Manipulatives",
                "Graph paper",
                "Color-coded steps",
                "Fact reference sheets",
                "Visual problem-solving guides",
            ],
            environmental_supports=[
                "Access to math tools",
                "Quiet space for concentration",
                "Reduce time pressure",
            ],
            communication_adaptations=[
                "Use multiple representations",
                "Connect to concrete examples",
                "Break steps down explicitly",
            ],
        ),
        "PROCESSING_SPEED": AdaptationStrategy(
            goal_modifications=[
                "Allow extended time",
                "Reduce task quantity, maintain quality",
                "Break into smaller chunks",
                "Focus on accuracy over speed",
            ],
            measurement_adaptations=[
                "Extended time accommodation",
                "Untimed assessments when possible",
                "Quality-focused evaluation",
                "Reduced number of items",
            ],
            timeline_adaptations=[
                "Extend timelines by 50%",
                "More time per activity",
                "Flexible pacing throughout",
            ],
            scaffold_additions=[
                "Pre-teaching vocabulary",
                "Preview materials in advance",
                "Organizational supports",
                "Clear step-by-step guides",
            ],
            environmental_supports=[
                "Quiet environment",
                "Minimize distractions",
                "Reduce time pressure",
            ],
            communication_adaptations=[
                "Allow processing time",
                "Repeat instructions",
                "Provide written copies",
            ],
        ),
    }

    def __init__(self, config: Optional[DiagnosisAdaptationConfig] = None):
        """Initialize the adaptation engine."""
        self.config = config or DiagnosisAdaptationConfig()
        logger.info("Initialized DiagnosisAdaptationEngine")

    def get_supported_diagnoses(self) -> List[str]:
        """Return list of supported diagnoses."""
        return list(self.ADAPTATION_STRATEGIES.keys())

    def get_strategy(self, diagnosis: str) -> Optional[AdaptationStrategy]:
        """Get adaptation strategy for a specific diagnosis."""
        normalized = diagnosis.upper().replace(" ", "_").replace("-", "_")
        return self.ADAPTATION_STRATEGIES.get(normalized)

    async def adapt_goal(
        self,
        base_goal: BaseGoal,
        diagnoses: List[str],
        existing_accommodations: List[str],
    ) -> AdaptedGoal:
        """
        Apply diagnosis-specific adaptations to a goal.

        Combines adaptations from multiple diagnoses,
        avoiding conflicts and redundancy.

        Args:
            base_goal: The base goal before adaptations
            diagnoses: List of learner diagnoses
            existing_accommodations: Already-defined accommodations

        Returns:
            AdaptedGoal with all adaptations applied
        """
        all_modifications: List[str] = []
        all_scaffolds: List[str] = []
        all_measurement_adaptations: List[str] = []
        adaptations_by_diagnosis: Dict[str, List[str]] = {}
        timeline_multiplier = 1.0

        # Process each diagnosis
        for diagnosis in diagnoses:
            normalized = diagnosis.upper().replace(" ", "_").replace("-", "_")
            if normalized in self.ADAPTATION_STRATEGIES:
                strategy = self.ADAPTATION_STRATEGIES[normalized]

                # Collect modifications
                all_modifications.extend(strategy.goal_modifications)
                all_scaffolds.extend(strategy.scaffold_additions)
                all_measurement_adaptations.extend(strategy.measurement_adaptations)

                # Track adaptations by diagnosis
                adaptations_by_diagnosis[diagnosis] = (
                    strategy.goal_modifications[:3]
                    + strategy.scaffold_additions[:3]
                )

                # Accumulate timeline extensions
                if self.config.enable_timeline_extension:
                    diag_multiplier = strategy.get_timeline_multiplier()
                    timeline_multiplier *= diag_multiplier

                logger.debug(f"Applied adaptations for {diagnosis}")

        # Cap timeline multiplier
        timeline_multiplier = min(
            timeline_multiplier, self.config.max_timeline_multiplier
        )

        # Remove duplicates while preserving order
        unique_modifications = self._deduplicate_preserving_order(all_modifications)
        unique_scaffolds = self._deduplicate_preserving_order(all_scaffolds)
        unique_measurement = self._deduplicate_preserving_order(
            all_measurement_adaptations
        )

        # Limit scaffolds
        if self.config.max_scaffolds_per_goal:
            unique_scaffolds = unique_scaffolds[: self.config.max_scaffolds_per_goal]

        # Combine with existing accommodations
        all_accommodations = self._deduplicate_preserving_order(
            existing_accommodations + unique_measurement
        )

        # Apply modifications to goal
        adapted_goal = await self._apply_modifications(
            base_goal,
            unique_modifications,
            unique_scaffolds,
            timeline_multiplier,
            adaptations_by_diagnosis,
            all_accommodations,
        )

        logger.info(
            f"Adapted goal for {len(diagnoses)} diagnoses, "
            f"timeline multiplier: {timeline_multiplier:.2f}"
        )

        return adapted_goal

    def _deduplicate_preserving_order(self, items: List[str]) -> List[str]:
        """Remove duplicates while preserving order."""
        seen = set()
        result = []
        for item in items:
            normalized = item.lower().strip()
            if normalized not in seen:
                seen.add(normalized)
                result.append(item)
        return result

    async def _apply_modifications(
        self,
        base_goal: BaseGoal,
        modifications: List[str],
        scaffolds: List[str],
        timeline_multiplier: float,
        adaptations_by_diagnosis: Dict[str, List[str]],
        accommodations: List[str],
    ) -> AdaptedGoal:
        """Apply collected modifications to create adapted goal."""
        # Calculate adjusted duration
        adjusted_duration = int(base_goal.duration_weeks * timeline_multiplier)

        # Enhance measurement method based on adaptations
        enhanced_measurement = self._enhance_measurement_method(
            base_goal.measurement_method, accommodations
        )

        # Generate SMART criteria scores
        smart_criteria = self._generate_smart_criteria(
            base_goal, modifications, adjusted_duration
        )

        # Generate rationale
        rationale = self._generate_rationale(
            base_goal.domain, adaptations_by_diagnosis
        )

        return AdaptedGoal(
            text=base_goal.text,
            domain=base_goal.domain,
            rationale=rationale,
            baseline=base_goal.baseline,
            target=base_goal.target,
            duration_weeks=adjusted_duration,
            measurement_method=enhanced_measurement,
            measurement_frequency=base_goal.measurement_frequency,
            smart_criteria=smart_criteria,
            adaptations=adaptations_by_diagnosis,
            scaffolds=scaffolds,
            accommodations=accommodations,
            timeline_multiplier=timeline_multiplier,
        )

    def _enhance_measurement_method(
        self, base_method: str, accommodations: List[str]
    ) -> str:
        """Enhance measurement method based on accommodations."""
        if not base_method:
            base_method = "Progress monitoring through data collection"

        accommodation_notes = []
        if any("extended time" in a.lower() for a in accommodations):
            accommodation_notes.append("with extended time")
        if any("oral" in a.lower() for a in accommodations):
            accommodation_notes.append("oral response options available")
        if any("multiple attempt" in a.lower() for a in accommodations):
            accommodation_notes.append("allowing multiple attempts")

        if accommodation_notes:
            return f"{base_method} ({', '.join(accommodation_notes)})"
        return base_method

    def _generate_smart_criteria(
        self,
        base_goal: BaseGoal,
        modifications: List[str],
        duration_weeks: int,
    ) -> Dict[str, Any]:
        """Generate SMART criteria scores for the adapted goal."""
        # Base scores - these would ideally be LLM-generated
        specific_score = 0.85 if base_goal.target else 0.6
        measurable_score = 0.9 if base_goal.measurement_method else 0.7
        achievable_score = 0.85 if modifications else 0.8
        relevant_score = 0.9  # Assume relevance if goal was created
        timebound_score = 0.95 if duration_weeks > 0 else 0.7

        return {
            "specific_score": specific_score,
            "specific_text": f"Goal targets specific skill in {base_goal.domain}",
            "measurable_score": measurable_score,
            "measurable_text": f"Progress measured via {base_goal.measurement_method or 'data collection'}",
            "achievable_score": achievable_score,
            "achievable_text": f"Achievable with {len(modifications)} adaptations applied",
            "relevant_score": relevant_score,
            "relevant_text": f"Relevant to learner's {base_goal.domain} development",
            "timebound_score": timebound_score,
            "timebound_text": f"Timeline set for {duration_weeks} weeks",
        }

    def _generate_rationale(
        self, domain: str, adaptations_by_diagnosis: Dict[str, List[str]]
    ) -> str:
        """Generate rationale explaining why adaptations were applied."""
        if not adaptations_by_diagnosis:
            return f"Standard {domain} goal based on learner assessment."

        diagnoses = list(adaptations_by_diagnosis.keys())
        if len(diagnoses) == 1:
            return (
                f"Goal adapted for learner with {diagnoses[0]} "
                f"to support successful {domain} skill development."
            )
        else:
            diagnosis_list = ", ".join(diagnoses[:-1]) + f" and {diagnoses[-1]}"
            return (
                f"Goal adapted for learner with {diagnosis_list} "
                f"using evidence-based strategies for each condition."
            )

    def get_environmental_supports(self, diagnoses: List[str]) -> List[str]:
        """Get combined environmental supports for diagnoses."""
        supports: List[str] = []
        for diagnosis in diagnoses:
            strategy = self.get_strategy(diagnosis)
            if strategy:
                supports.extend(strategy.environmental_supports)
        return self._deduplicate_preserving_order(supports)

    def get_communication_adaptations(self, diagnoses: List[str]) -> List[str]:
        """Get combined communication adaptations for diagnoses."""
        adaptations: List[str] = []
        for diagnosis in diagnoses:
            strategy = self.get_strategy(diagnosis)
            if strategy:
                adaptations.extend(strategy.communication_adaptations)
        return self._deduplicate_preserving_order(adaptations)

    def check_adaptation_conflicts(
        self, diagnoses: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Check for potential conflicts between adaptation strategies.

        Some adaptations may conflict (e.g., ASD need for routine vs
        ADHD need for novelty). Returns list of potential conflicts
        for human review.
        """
        conflicts: List[Dict[str, Any]] = []

        # Known conflict pairs
        conflict_checks = [
            {
                "pair": ("ADHD", "ASD"),
                "issue": "routine_vs_novelty",
                "description": (
                    "ADHD benefits from novelty and variety while "
                    "ASD benefits from consistent routines"
                ),
                "resolution": (
                    "Maintain consistent structure with varied activities "
                    "within that structure"
                ),
            },
            {
                "pair": ("ADHD", "ANXIETY"),
                "issue": "stimulation_vs_calm",
                "description": (
                    "ADHD may need stimulation while "
                    "anxiety benefits from calm environments"
                ),
                "resolution": (
                    "Provide engaging activities with built-in calming "
                    "breaks and low-stakes practice"
                ),
            },
        ]

        normalized_diagnoses = {
            d.upper().replace(" ", "_").replace("-", "_") for d in diagnoses
        }

        for check in conflict_checks:
            if (
                check["pair"][0] in normalized_diagnoses
                and check["pair"][1] in normalized_diagnoses
            ):
                conflicts.append(
                    {
                        "diagnoses": check["pair"],
                        "issue": check["issue"],
                        "description": check["description"],
                        "suggested_resolution": check["resolution"],
                    }
                )

        return conflicts


def create_adaptation_engine(
    config: Optional[DiagnosisAdaptationConfig] = None,
) -> DiagnosisAdaptationEngine:
    """Factory function to create an adaptation engine."""
    return DiagnosisAdaptationEngine(config)
