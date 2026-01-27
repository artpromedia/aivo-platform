"""
Mental Model Assessor

Assess learner mental model development and identify misconceptions.
Tracks schema formation and predicts learning trajectories.
"""
import logging
import re
import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class MentalModelAssessment:
    """Results from mental model assessment."""
    concept: str
    completeness: float  # How complete the mental model is (0-1)
    accuracy: float  # How accurate the understanding is (0-1)
    coherence: float  # How well-integrated the model is (0-1)
    overall_score: float  # Combined assessment score (0-1)
    misconceptions: List[str]  # Identified misconceptions
    gaps: List[str]  # Missing knowledge areas
    strengths: List[str]  # Areas of strong understanding
    recommended_interventions: List[str]  # Suggested next steps
    germane_load_opportunity: float  # Opportunity for productive learning (0-1)
    processing_time_ms: int = 0


@dataclass
class Misconception:
    """A detected misconception."""
    misconception_id: str
    concept: str
    description: str
    severity: str  # low, medium, high
    confidence: float  # How confident we are in the detection (0-1)
    evidence: List[str]  # Evidence from learner responses
    common_cause: Optional[str] = None
    remediation_strategy: Optional[str] = None


@dataclass
class DevelopmentTrajectory:
    """Mental model development trajectory."""
    learner_id: str
    concept: str
    current_level: float  # Current mastery (0-1)
    predicted_mastery_1week: float
    predicted_mastery_1month: float
    growth_rate: float  # Rate of improvement
    stability: float  # Consistency of understanding (0-1)
    risk_of_regression: float  # Risk of forgetting (0-1)
    recommendations: List[str]


@dataclass
class MentalModelAssessorConfig:
    """Configuration for the mental model assessor."""
    # Completeness thresholds
    complete_threshold: float = 0.8
    partial_threshold: float = 0.5

    # Accuracy thresholds
    accurate_threshold: float = 0.85
    inaccurate_threshold: float = 0.5

    # Misconception detection
    misconception_confidence_threshold: float = 0.6
    max_misconceptions_to_return: int = 5

    # Development tracking
    min_assessments_for_trajectory: int = 3
    decay_rate: float = 0.05  # Daily decay rate for unused knowledge


# Common misconceptions by domain
COMMON_MISCONCEPTIONS = {
    "math": {
        "multiplication_always_bigger": {
            "pattern": r"multipl\w*.*bigger|larger.*multipl",
            "description": "Believing multiplication always makes numbers bigger",
            "remediation": "Show examples of multiplying by fractions and decimals",
        },
        "equals_means_answer": {
            "pattern": r"equals?\s*(means?|is)\s*answer",
            "description": "Thinking '=' means 'the answer is' rather than equivalence",
            "remediation": "Practice with equations where the unknown is on different sides",
        },
        "fractions_separate_numbers": {
            "pattern": r"fraction.*two\s*number|numerator.*denominator.*separate",
            "description": "Treating numerator and denominator as separate unrelated numbers",
            "remediation": "Use visual representations and part-whole relationships",
        },
    },
    "science": {
        "heavier_falls_faster": {
            "pattern": r"heav\w+.*fall.*fast|heavy.*faster",
            "description": "Believing heavier objects fall faster",
            "remediation": "Demonstrate with controlled experiments showing air resistance vs. gravity",
        },
        "seasons_distance": {
            "pattern": r"season.*closer|farther.*sun.*season|distance.*summer",
            "description": "Attributing seasons to Earth's distance from the sun",
            "remediation": "Explain axial tilt with visual demonstrations",
        },
        "evolution_ladder": {
            "pattern": r"evolv\w*.*higher|progress.*evolution|evolution.*goal",
            "description": "Viewing evolution as a ladder of progress toward 'higher' forms",
            "remediation": "Emphasize evolution as adaptation, not progress toward a goal",
        },
    },
    "reading": {
        "meaning_in_words": {
            "pattern": r"meaning.*in.*word|word.*contain.*meaning",
            "description": "Believing meaning is contained within individual words",
            "remediation": "Practice context clues and understanding meaning from context",
        },
        "reading_decoding": {
            "pattern": r"reading.*just.*sound|decod\w*.*reading",
            "description": "Equating reading with decoding rather than comprehension",
            "remediation": "Focus on comprehension strategies alongside decoding",
        },
    },
    "general": {
        "learning_style_fixed": {
            "pattern": r"learning\s*style|visual\s*learner|auditory\s*learner",
            "description": "Believing in fixed learning styles",
            "remediation": "Explain that effective learning uses multiple modalities",
        },
    },
}

# Key concept components for assessing completeness
CONCEPT_COMPONENTS = {
    "photosynthesis": [
        "light energy", "chlorophyll", "carbon dioxide", "water", "glucose", "oxygen",
        "chloroplast", "energy conversion", "plants"
    ],
    "gravity": [
        "force", "mass", "attraction", "distance", "acceleration", "weight", "universal"
    ],
    "fraction": [
        "numerator", "denominator", "part", "whole", "equal parts", "division", "ratio"
    ],
    "democracy": [
        "voting", "representation", "citizens", "rights", "government", "elections", "majority"
    ],
}


class MentalModelAssessor:
    """
    Assess learner's mental model of concepts.

    Mental models are internal representations that learners construct
    to understand concepts. This assessor evaluates:
    - Schema completeness: How complete is the mental model?
    - Accuracy: Is the understanding correct?
    - Coherence: How well-integrated is the knowledge?
    - Misconceptions: What incorrect beliefs are present?
    - Gaps: What knowledge is missing?

    Usage:
        assessor = MentalModelAssessor()
        model = assessor.assess("photosynthesis", learner_responses)
        print(f"Completeness: {model.completeness}")
        print(f"Misconceptions: {model.misconceptions}")
    """

    def __init__(self, config: Optional[MentalModelAssessorConfig] = None):
        """Initialize the mental model assessor.

        Args:
            config: Optional configuration overrides
        """
        self.config = config or MentalModelAssessorConfig()

        # Track learner development history
        self._learner_history: Dict[str, Dict[str, List[Dict[str, Any]]]] = {}

        logger.info("MentalModelAssessor initialized")

    def assess(
        self,
        concept: str,
        responses: List[Dict[str, Any]],
        domain: Optional[str] = None,
        expected_components: Optional[List[str]] = None,
    ) -> MentalModelAssessment:
        """
        Assess mental model from learner responses.

        Args:
            concept: The concept being assessed
            responses: List of learner responses with format:
                       {"prompt": str, "response_text": str, "response_time_seconds": float}
            domain: Educational domain for context
            expected_components: Expected components of the mental model

        Returns:
            MentalModelAssessment with detailed breakdown
        """
        start_time = time.time()

        if not responses:
            logger.warning(f"No responses provided for assessing concept: {concept}")
            return MentalModelAssessment(
                concept=concept,
                completeness=0.0,
                accuracy=0.0,
                coherence=0.0,
                overall_score=0.0,
                misconceptions=[],
                gaps=["No responses to analyze"],
                strengths=[],
                recommended_interventions=["Collect learner responses first"],
                germane_load_opportunity=0.0,
                processing_time_ms=0,
            )

        try:
            # Get expected components for this concept
            if expected_components is None:
                expected_components = CONCEPT_COMPONENTS.get(
                    concept.lower(),
                    self._infer_components(concept)
                )

            # Combine all response text for analysis
            combined_response = " ".join(r.get("response_text", "") for r in responses)
            combined_lower = combined_response.lower()

            # Assess completeness
            completeness, present_components, missing_components = self._assess_completeness(
                combined_lower, expected_components
            )

            # Assess accuracy
            accuracy, inaccuracies = self._assess_accuracy(responses, concept, domain)

            # Detect misconceptions
            misconceptions = self.detect_misconceptions(concept, combined_response, domain)

            # Assess coherence
            coherence = self._assess_coherence(responses, present_components)

            # Calculate overall score
            overall_score = self._calculate_overall_score(
                completeness, accuracy, coherence, len(misconceptions)
            )

            # Identify strengths
            strengths = self._identify_strengths(
                present_components, accuracy, coherence, responses
            )

            # Calculate germane load opportunity
            germane_opportunity = self._calculate_germane_opportunity(
                completeness, accuracy, len(misconceptions)
            )

            # Generate recommendations
            recommendations = self._generate_recommendations(
                completeness, accuracy, misconceptions, missing_components
            )

            processing_time = int((time.time() - start_time) * 1000)

            return MentalModelAssessment(
                concept=concept,
                completeness=float(completeness),
                accuracy=float(accuracy),
                coherence=float(coherence),
                overall_score=float(overall_score),
                misconceptions=misconceptions,
                gaps=missing_components,
                strengths=strengths,
                recommended_interventions=recommendations,
                germane_load_opportunity=float(germane_opportunity),
                processing_time_ms=processing_time,
            )

        except Exception as e:
            logger.error(f"Error assessing mental model for {concept}: {e}", exc_info=True)
            processing_time = int((time.time() - start_time) * 1000)
            return MentalModelAssessment(
                concept=concept,
                completeness=0.5,
                accuracy=0.5,
                coherence=0.5,
                overall_score=0.5,
                misconceptions=[],
                gaps=["Assessment error occurred"],
                strengths=[],
                recommended_interventions=["Review learner responses manually"],
                germane_load_opportunity=0.5,
                processing_time_ms=processing_time,
            )

    def assess_mental_model(
        self,
        concept: str,
        responses: List[Dict[str, Any]],
        domain: Optional[str] = None,
    ) -> MentalModelAssessment:
        """
        Assess learner's mental model completeness.

        Alias for assess() method for API compatibility.

        Args:
            concept: The concept being assessed
            responses: Learner responses to analyze
            domain: Educational domain

        Returns:
            MentalModelAssessment with detailed analysis
        """
        return self.assess(concept, responses, domain)

    def detect_misconceptions(
        self,
        concept: str,
        response: str,
        domain: Optional[str] = None,
    ) -> List[str]:
        """
        Detect specific misconceptions in a response.

        Args:
            concept: The concept being assessed
            response: The learner's response text
            domain: Educational domain for context

        Returns:
            List of detected misconceptions (as strings)
        """
        if not response:
            return []

        detected = []
        response_lower = response.lower()

        # Check domain-specific misconceptions
        domains_to_check = [domain] if domain else list(COMMON_MISCONCEPTIONS.keys())

        for check_domain in domains_to_check:
            if check_domain not in COMMON_MISCONCEPTIONS:
                continue

            for misconception_id, details in COMMON_MISCONCEPTIONS[check_domain].items():
                pattern = details.get("pattern", "")
                if pattern and re.search(pattern, response_lower, re.IGNORECASE):
                    detected.append(details["description"])

        # Check for general logical misconceptions
        general_misconceptions = self._detect_general_misconceptions(response_lower, concept)
        detected.extend(general_misconceptions)

        # Remove duplicates while preserving order
        seen = set()
        unique_detected = []
        for m in detected:
            if m not in seen:
                seen.add(m)
                unique_detected.append(m)

        return unique_detected[:self.config.max_misconceptions_to_return]

    def identify_misconceptions(
        self,
        concept: str,
        response: str,
        domain: Optional[str] = None,
    ) -> List[Misconception]:
        """
        Identify potential misconceptions with detailed information.

        Args:
            concept: The concept being assessed
            response: The learner's response text
            domain: Educational domain

        Returns:
            List of Misconception objects with detailed info
        """
        if not response:
            return []

        misconceptions = []
        response_lower = response.lower()

        domains_to_check = [domain] if domain else list(COMMON_MISCONCEPTIONS.keys())

        for check_domain in domains_to_check:
            if check_domain not in COMMON_MISCONCEPTIONS:
                continue

            for misconception_id, details in COMMON_MISCONCEPTIONS[check_domain].items():
                pattern = details.get("pattern", "")
                if pattern:
                    matches = re.findall(pattern, response_lower, re.IGNORECASE)
                    if matches:
                        # Calculate confidence based on match strength
                        confidence = min(1.0, 0.6 + 0.1 * len(matches))

                        misconceptions.append(Misconception(
                            misconception_id=misconception_id,
                            concept=concept,
                            description=details["description"],
                            severity=self._determine_severity(details, len(matches)),
                            confidence=confidence,
                            evidence=matches[:3],
                            common_cause=f"Common {check_domain} misconception",
                            remediation_strategy=details.get("remediation"),
                        ))

        return misconceptions[:self.config.max_misconceptions_to_return]

    def track_development(
        self,
        learner_id: str,
        concept: str,
        assessments: List[MentalModelAssessment],
    ) -> Dict[str, Any]:
        """
        Track mental model development over time.

        Args:
            learner_id: Learner identifier
            concept: Concept being tracked
            assessments: List of historical assessments

        Returns:
            Development tracking data with trends and predictions
        """
        if not assessments:
            return {
                "learner_id": learner_id,
                "concept": concept,
                "status": "insufficient_data",
                "message": "No assessments provided for tracking",
            }

        # Extract scores over time
        completeness_scores = [a.completeness for a in assessments]
        accuracy_scores = [a.accuracy for a in assessments]
        overall_scores = [a.overall_score for a in assessments]

        # Calculate trends
        completeness_trend = self._calculate_trend(completeness_scores)
        accuracy_trend = self._calculate_trend(accuracy_scores)
        overall_trend = self._calculate_trend(overall_scores)

        # Calculate current level and growth rate
        current_level = overall_scores[-1]
        growth_rate = overall_trend["slope"]

        # Predict future mastery
        predicted_1week = self._predict_mastery(current_level, growth_rate, 7)
        predicted_1month = self._predict_mastery(current_level, growth_rate, 30)

        # Calculate stability
        stability = 1.0 - np.std(overall_scores) if len(overall_scores) > 1 else 0.5

        # Assess regression risk
        regression_risk = self._assess_regression_risk(overall_scores, stability)

        # Generate recommendations
        recommendations = self._generate_development_recommendations(
            current_level, growth_rate, stability, regression_risk
        )

        # Store in history
        self._update_learner_history(learner_id, concept, assessments[-1])

        return {
            "learner_id": learner_id,
            "concept": concept,
            "current_level": float(current_level),
            "completeness_trend": completeness_trend,
            "accuracy_trend": accuracy_trend,
            "overall_trend": overall_trend,
            "growth_rate": float(growth_rate),
            "stability": float(stability),
            "predicted_mastery_1week": float(predicted_1week),
            "predicted_mastery_1month": float(predicted_1month),
            "regression_risk": float(regression_risk),
            "assessment_count": len(assessments),
            "recommendations": recommendations,
        }

    def predict_model_development(
        self,
        learner_id: str,
        concept: str,
        current_assessment: MentalModelAssessment,
        historical_assessments: Optional[List[MentalModelAssessment]] = None,
    ) -> DevelopmentTrajectory:
        """
        Predict mental model development trajectory.

        Args:
            learner_id: Learner identifier
            concept: Concept being tracked
            current_assessment: Current assessment
            historical_assessments: Previous assessments if available

        Returns:
            DevelopmentTrajectory with predictions
        """
        all_assessments = (historical_assessments or []) + [current_assessment]

        if len(all_assessments) < self.config.min_assessments_for_trajectory:
            # Insufficient data - use defaults
            return DevelopmentTrajectory(
                learner_id=learner_id,
                concept=concept,
                current_level=current_assessment.overall_score,
                predicted_mastery_1week=min(1.0, current_assessment.overall_score + 0.05),
                predicted_mastery_1month=min(1.0, current_assessment.overall_score + 0.15),
                growth_rate=0.01,  # Default slow growth
                stability=0.5,
                risk_of_regression=0.3,
                recommendations=[
                    "Continue practicing to establish stable understanding",
                    "More assessments needed for accurate predictions",
                ],
            )

        # Calculate development metrics
        scores = [a.overall_score for a in all_assessments]
        growth_rate = self._calculate_trend(scores)["slope"]
        stability = float(1.0 - np.std(scores))

        current_level = current_assessment.overall_score
        predicted_1week = self._predict_mastery(current_level, growth_rate, 7)
        predicted_1month = self._predict_mastery(current_level, growth_rate, 30)

        regression_risk = self._assess_regression_risk(scores, stability)

        recommendations = self._generate_development_recommendations(
            current_level, growth_rate, stability, regression_risk
        )

        return DevelopmentTrajectory(
            learner_id=learner_id,
            concept=concept,
            current_level=float(current_level),
            predicted_mastery_1week=float(predicted_1week),
            predicted_mastery_1month=float(predicted_1month),
            growth_rate=float(growth_rate),
            stability=float(stability),
            risk_of_regression=float(regression_risk),
            recommendations=recommendations,
        )

    def _infer_components(self, concept: str) -> List[str]:
        """Infer expected components for an unknown concept."""
        # Generate generic components based on concept name
        words = concept.lower().split()
        components = []

        # Add the concept itself and related terms
        components.append(concept.lower())
        components.extend(words)

        # Add common expected elements
        generic_components = [
            "definition", "example", "characteristics",
            "relationship", "application", "properties"
        ]
        components.extend(generic_components)

        return list(set(components))

    def _assess_completeness(
        self,
        response_lower: str,
        expected_components: List[str],
    ) -> Tuple[float, List[str], List[str]]:
        """Assess how complete the mental model is."""
        present = []
        missing = []

        for component in expected_components:
            # Check if component or synonyms are present
            if component.lower() in response_lower:
                present.append(component)
            else:
                missing.append(component)

        completeness = len(present) / len(expected_components) if expected_components else 0.0
        return completeness, present, missing

    def _assess_accuracy(
        self,
        responses: List[Dict[str, Any]],
        concept: str,
        domain: Optional[str] = None,
    ) -> Tuple[float, List[str]]:
        """Assess the accuracy of understanding."""
        inaccuracies = []

        # Start with assumption of accuracy
        accuracy_score = 0.8

        for response in responses:
            response_text = response.get("response_text", "").lower()

            # Check for uncertainty markers
            uncertainty_markers = ["maybe", "i think", "not sure", "probably", "might be"]
            uncertainty_count = sum(1 for m in uncertainty_markers if m in response_text)
            if uncertainty_count > 2:
                accuracy_score -= 0.1
                inaccuracies.append("High uncertainty in responses")

            # Check for contradictions
            if self._has_contradictions(response_text):
                accuracy_score -= 0.15
                inaccuracies.append("Contradictory statements detected")

            # Check response time - very fast or very slow may indicate issues
            response_time = response.get("response_time_seconds", 0)
            if response_time > 0:
                if response_time < 1.0:
                    accuracy_score -= 0.05  # Too fast might be guessing
                elif response_time > 60:
                    accuracy_score -= 0.05  # Too slow might indicate struggle

        # Check for misconceptions (already detected)
        combined = " ".join(r.get("response_text", "") for r in responses)
        misconceptions = self.detect_misconceptions(concept, combined, domain)
        accuracy_score -= 0.1 * len(misconceptions)

        return float(np.clip(accuracy_score, 0.0, 1.0)), inaccuracies

    def _has_contradictions(self, text: str) -> bool:
        """Detect contradictory statements in text."""
        # Simple heuristic: check for opposing statements
        contradiction_pairs = [
            ("is", "is not"),
            ("always", "never"),
            ("increases", "decreases"),
            ("more", "less"),
            ("true", "false"),
        ]

        for pos, neg in contradiction_pairs:
            if pos in text and neg in text:
                return True

        return False

    def _assess_coherence(
        self,
        responses: List[Dict[str, Any]],
        present_components: List[str],
    ) -> float:
        """Assess how well-integrated the knowledge is."""
        if not responses or not present_components:
            return 0.5

        coherence_score = 0.5

        # Check for connections between components
        combined = " ".join(r.get("response_text", "") for r in responses).lower()

        # Look for relational language
        connectors = ["because", "therefore", "leads to", "causes", "results in",
                     "is related to", "connects", "influences"]
        connector_count = sum(1 for c in connectors if c in combined)

        if connector_count > 0:
            coherence_score += min(0.3, connector_count * 0.1)

        # Check for logical flow in responses
        if len(responses) > 1:
            # Consistent theme across responses
            themes = [set(r.get("response_text", "").lower().split()) for r in responses]
            if themes:
                common = set.intersection(*themes) if len(themes) > 1 else themes[0]
                meaningful_common = [w for w in common if len(w) > 4]
                if len(meaningful_common) > 3:
                    coherence_score += 0.2

        return float(np.clip(coherence_score, 0.0, 1.0))

    def _calculate_overall_score(
        self,
        completeness: float,
        accuracy: float,
        coherence: float,
        misconception_count: int,
    ) -> float:
        """Calculate overall mental model score."""
        # Weighted combination
        base_score = (
            0.35 * completeness +
            0.40 * accuracy +
            0.25 * coherence
        )

        # Penalty for misconceptions
        misconception_penalty = min(0.3, misconception_count * 0.1)
        final_score = base_score - misconception_penalty

        return float(np.clip(final_score, 0.0, 1.0))

    def _identify_strengths(
        self,
        present_components: List[str],
        accuracy: float,
        coherence: float,
        responses: List[Dict[str, Any]],
    ) -> List[str]:
        """Identify areas of strong understanding."""
        strengths = []

        if len(present_components) > 3:
            strengths.append(f"Good coverage of key components ({len(present_components)} identified)")

        if accuracy > 0.8:
            strengths.append("High accuracy in explanations")

        if coherence > 0.7:
            strengths.append("Well-integrated understanding with clear connections")

        # Check for detailed responses
        avg_length = np.mean([len(r.get("response_text", "").split()) for r in responses])
        if avg_length > 30:
            strengths.append("Detailed and elaborate explanations")

        return strengths

    def _calculate_germane_opportunity(
        self,
        completeness: float,
        accuracy: float,
        misconception_count: int,
    ) -> float:
        """Calculate opportunity for productive learning."""
        # Germane load is most beneficial when:
        # - Some foundation exists (not too low completeness)
        # - Accuracy is reasonable (can build on correct understanding)
        # - Not too many misconceptions (less unlearning needed)

        if completeness < 0.2:
            # Too little foundation
            opportunity = 0.3
        elif completeness > 0.9 and accuracy > 0.9:
            # Already mastered
            opportunity = 0.2
        else:
            # Sweet spot for learning
            opportunity = 0.5 + (completeness * 0.2) + (accuracy * 0.2)

        # Reduce for misconceptions
        opportunity -= misconception_count * 0.1

        return float(np.clip(opportunity, 0.0, 1.0))

    def _generate_recommendations(
        self,
        completeness: float,
        accuracy: float,
        misconceptions: List[str],
        missing_components: List[str],
    ) -> List[str]:
        """Generate intervention recommendations."""
        recommendations = []

        if completeness < 0.5:
            recommendations.append("Provide structured overview of the complete concept")
            if missing_components:
                components = ", ".join(missing_components[:3])
                recommendations.append(f"Focus on missing components: {components}")

        if accuracy < 0.7:
            recommendations.append("Review foundational concepts and correct understanding")

        if misconceptions:
            recommendations.append("Address identified misconceptions with targeted examples")
            recommendations.append("Use contrasting cases to highlight correct vs. incorrect thinking")

        if completeness > 0.7 and accuracy > 0.7:
            recommendations.append("Ready for more advanced applications and connections")
            recommendations.append("Encourage transfer to new contexts")

        if not recommendations:
            recommendations.append("Continue current learning path with regular practice")

        return recommendations[:5]

    def _detect_general_misconceptions(
        self,
        response_lower: str,
        concept: str,
    ) -> List[str]:
        """Detect general logical misconceptions."""
        misconceptions = []

        # Overgeneralization
        overgeneralization_markers = ["always", "never", "all", "none", "every"]
        if sum(1 for m in overgeneralization_markers if m in response_lower) > 2:
            misconceptions.append("Possible overgeneralization - real phenomena often have exceptions")

        # Correlation-causation confusion
        if "because" in response_lower and ("happened" in response_lower or "after" in response_lower):
            if not any(w in response_lower for w in ["caused", "leads to", "results"]):
                pass  # Could add: "May be confusing correlation with causation"

        return misconceptions

    def _determine_severity(
        self,
        misconception_details: Dict[str, Any],
        match_count: int,
    ) -> str:
        """Determine severity of a misconception."""
        if match_count > 2:
            return "high"
        elif match_count > 1:
            return "medium"
        return "low"

    def _calculate_trend(self, scores: List[float]) -> Dict[str, Any]:
        """Calculate trend from a series of scores."""
        if len(scores) < 2:
            return {"direction": "unknown", "slope": 0.0, "confidence": 0.0}

        n = len(scores)
        x = np.arange(n)
        y = np.array(scores)

        # Linear regression
        x_mean = np.mean(x)
        y_mean = np.mean(y)

        numerator = float(np.sum((x - x_mean) * (y - y_mean)))
        denominator = float(np.sum((x - x_mean) ** 2))

        slope = numerator / denominator if denominator != 0 else 0.0

        # Determine direction
        if slope > 0.02:
            direction = "improving"
        elif slope < -0.02:
            direction = "declining"
        else:
            direction = "stable"

        # Calculate confidence based on consistency
        residuals = y - (slope * x + (y_mean - slope * x_mean))
        confidence = max(0.0, 1.0 - float(np.std(residuals)))

        return {
            "direction": direction,
            "slope": float(slope),
            "confidence": float(confidence),
        }

    def _predict_mastery(
        self,
        current_level: float,
        growth_rate: float,
        days: int,
    ) -> float:
        """Predict future mastery level."""
        # Simple linear projection with decay factor
        projected = current_level + (growth_rate * days)

        # Apply ceiling at 1.0 with diminishing returns
        if projected > current_level:
            gain = projected - current_level
            adjusted_gain = gain * (1 - current_level * 0.5)  # Harder to improve at higher levels
            projected = current_level + adjusted_gain

        # Apply decay for lack of practice
        decay = 1 - (self.config.decay_rate * days * 0.1)
        projected = projected * decay

        return float(np.clip(projected, 0.0, 1.0))

    def _assess_regression_risk(
        self,
        scores: List[float],
        stability: float,
    ) -> float:
        """Assess risk of knowledge regression."""
        if len(scores) < 2:
            return 0.3  # Default medium-low risk

        # Check for declining trend
        recent_scores = scores[-3:] if len(scores) >= 3 else scores
        trend = self._calculate_trend(recent_scores)

        risk = 0.2  # Base risk

        if trend["direction"] == "declining":
            risk += 0.3
        elif trend["direction"] == "stable":
            risk += 0.1

        # Low stability increases risk
        risk += (1 - stability) * 0.3

        # Current level affects risk (lower levels more prone to regression)
        current = scores[-1]
        if current < 0.5:
            risk += 0.2

        return float(np.clip(risk, 0.0, 1.0))

    def _generate_development_recommendations(
        self,
        current_level: float,
        growth_rate: float,
        stability: float,
        regression_risk: float,
    ) -> List[str]:
        """Generate recommendations for development."""
        recommendations = []

        if growth_rate < 0:
            recommendations.append("Review recent sessions - understanding may be declining")
            recommendations.append("Consider revisiting foundational concepts")
        elif growth_rate < 0.01:
            recommendations.append("Progress has plateaued - try different learning approaches")
            recommendations.append("Introduce more challenging applications")

        if stability < 0.5:
            recommendations.append("Understanding is variable - focus on consolidation")
            recommendations.append("Use spaced repetition to build stable knowledge")

        if regression_risk > 0.5:
            recommendations.append("High risk of forgetting - schedule regular review sessions")

        if current_level > 0.8 and growth_rate > 0:
            recommendations.append("Excellent progress - ready for advanced topics")
            recommendations.append("Consider teaching the concept to reinforce mastery")

        if not recommendations:
            recommendations.append("Continue current learning trajectory")

        return recommendations[:4]

    def _update_learner_history(
        self,
        learner_id: str,
        concept: str,
        assessment: MentalModelAssessment,
    ) -> None:
        """Update learner history with new assessment."""
        if learner_id not in self._learner_history:
            self._learner_history[learner_id] = {}

        if concept not in self._learner_history[learner_id]:
            self._learner_history[learner_id][concept] = []

        self._learner_history[learner_id][concept].append({
            "timestamp": datetime.utcnow().isoformat(),
            "completeness": assessment.completeness,
            "accuracy": assessment.accuracy,
            "overall_score": assessment.overall_score,
            "misconceptions": assessment.misconceptions,
        })

        # Keep history bounded
        max_history = 50
        if len(self._learner_history[learner_id][concept]) > max_history:
            self._learner_history[learner_id][concept] = \
                self._learner_history[learner_id][concept][-max_history:]
