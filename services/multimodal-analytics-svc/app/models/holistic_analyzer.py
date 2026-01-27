"""
Holistic Analyzer

Generate comprehensive learner analysis integrating multiple dimensions.
"""
import logging
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Tuple
import numpy as np
from scipy import stats

logger = logging.getLogger(__name__)


@dataclass
class HolisticProfile:
    """Comprehensive learner profile."""
    learner_id: str
    cognitive_profile: Dict[str, float]
    emotional_profile: Dict[str, float]
    behavioral_profile: Dict[str, float]
    strengths: List[str]
    growth_areas: List[str]
    recommendations: List[str]
    overall_score: float = 0.0
    confidence: float = 0.0


@dataclass
class LearningPattern:
    """Detected learning pattern."""
    pattern_type: str
    description: str
    frequency: float
    impact: str  # positive, negative, neutral
    evidence: List[str]
    recommendations: List[str]


@dataclass
class ActionableInsight:
    """Actionable insight for educators or learners."""
    category: str
    insight: str
    priority: str  # high, medium, low
    action_items: List[str]
    expected_impact: str
    confidence: float


class HolisticAnalyzer:
    """
    Generate comprehensive learner profiles.

    Integrates:
    - Cognitive metrics (understanding, retention, problem-solving)
    - Emotional indicators (engagement, frustration, motivation)
    - Behavioral patterns (study habits, interaction patterns)
    - Social interactions (collaboration, communication)

    Usage:
        analyzer = HolisticAnalyzer()
        profile = analyzer.analyze(learner_id, multimodal_data)
        patterns = analyzer.identify_patterns(profile)
        insights = analyzer.compute_insights(profile, patterns)
    """

    # Cognitive dimension weights
    COGNITIVE_DIMENSIONS = {
        "understanding": ["comprehension_score", "concept_grasp", "explanation_quality"],
        "retention": ["recall_accuracy", "long_term_memory", "spaced_repetition_score"],
        "problem_solving": ["problem_accuracy", "solution_efficiency", "creative_solutions"],
        "critical_thinking": ["analysis_depth", "evaluation_quality", "synthesis_ability"],
        "knowledge_transfer": ["cross_domain_application", "generalization_score"],
    }

    # Emotional dimension indicators
    EMOTIONAL_DIMENSIONS = {
        "engagement": ["attention_duration", "active_participation", "voluntary_interaction"],
        "motivation": ["goal_pursuit", "persistence", "self_initiated_learning"],
        "frustration": ["error_sensitivity", "help_seeking", "abandonment_rate"],
        "confidence": ["attempt_rate", "challenge_seeking", "self_assessment_accuracy"],
        "satisfaction": ["completion_rate", "positive_feedback", "return_rate"],
    }

    # Behavioral dimension patterns
    BEHAVIORAL_DIMENSIONS = {
        "study_habits": ["session_regularity", "duration_consistency", "break_patterns"],
        "interaction_style": ["passive_vs_active", "exploration_tendency", "help_usage"],
        "time_management": ["deadline_adherence", "task_completion_speed", "prioritization"],
        "self_regulation": ["goal_setting", "progress_monitoring", "strategy_adjustment"],
    }

    def __init__(
        self,
        cognitive_weight: float = 0.4,
        emotional_weight: float = 0.3,
        behavioral_weight: float = 0.3,
    ):
        """
        Initialize the HolisticAnalyzer.

        Args:
            cognitive_weight: Weight for cognitive dimensions in overall score
            emotional_weight: Weight for emotional dimensions
            behavioral_weight: Weight for behavioral dimensions
        """
        self.cognitive_weight = cognitive_weight
        self.emotional_weight = emotional_weight
        self.behavioral_weight = behavioral_weight

        # Validate weights sum to 1
        total = cognitive_weight + emotional_weight + behavioral_weight
        if abs(total - 1.0) > 0.01:
            logger.warning(f"Weights sum to {total}, normalizing to 1.0")
            self.cognitive_weight /= total
            self.emotional_weight /= total
            self.behavioral_weight /= total

        logger.info("HolisticAnalyzer initialized")

    def analyze(
        self,
        learner_id: str,
        data_sources: Optional[List[str]] = None,
        multimodal_data: Optional[Dict[str, Any]] = None,
    ) -> HolisticProfile:
        """
        Generate holistic learner profile.

        Args:
            learner_id: Unique learner identifier.
            data_sources: List of data sources to include (or None for all).
            multimodal_data: Dictionary containing multimodal analytics data.

        Returns:
            HolisticProfile with comprehensive learner analysis.
        """
        multimodal_data = multimodal_data or {}

        # Analyze each dimension
        cognitive_profile = self._analyze_cognitive_dimension(multimodal_data)
        emotional_profile = self._analyze_emotional_dimension(multimodal_data)
        behavioral_profile = self._analyze_behavioral_dimension(multimodal_data)

        # Identify strengths and growth areas
        strengths = self._identify_strengths(
            cognitive_profile, emotional_profile, behavioral_profile
        )
        growth_areas = self._identify_growth_areas(
            cognitive_profile, emotional_profile, behavioral_profile
        )

        # Generate recommendations
        recommendations = self._generate_recommendations(
            strengths, growth_areas, cognitive_profile, emotional_profile, behavioral_profile
        )

        # Compute overall score
        overall_score = self._compute_overall_score(
            cognitive_profile, emotional_profile, behavioral_profile
        )

        # Compute confidence
        confidence = self._compute_analysis_confidence(multimodal_data)

        return HolisticProfile(
            learner_id=learner_id,
            cognitive_profile=cognitive_profile,
            emotional_profile=emotional_profile,
            behavioral_profile=behavioral_profile,
            strengths=strengths,
            growth_areas=growth_areas,
            recommendations=recommendations,
            overall_score=overall_score,
            confidence=confidence,
        )

    def identify_patterns(
        self,
        profile: HolisticProfile,
        historical_data: Optional[List[HolisticProfile]] = None,
    ) -> List[LearningPattern]:
        """
        Identify notable learning patterns.

        Args:
            profile: Current holistic profile.
            historical_data: Optional historical profiles for trend analysis.

        Returns:
            List of detected LearningPattern objects.
        """
        patterns = []

        # Analyze cognitive patterns
        cognitive_patterns = self._analyze_cognitive_patterns(profile.cognitive_profile)
        patterns.extend(cognitive_patterns)

        # Analyze emotional patterns
        emotional_patterns = self._analyze_emotional_patterns(profile.emotional_profile)
        patterns.extend(emotional_patterns)

        # Analyze behavioral patterns
        behavioral_patterns = self._analyze_behavioral_patterns(profile.behavioral_profile)
        patterns.extend(behavioral_patterns)

        # Cross-dimensional patterns
        cross_patterns = self._analyze_cross_dimensional_patterns(profile)
        patterns.extend(cross_patterns)

        # Sort by impact and frequency
        patterns.sort(key=lambda p: (
            {"positive": 2, "neutral": 1, "negative": 0}.get(p.impact, 1),
            p.frequency
        ), reverse=True)

        return patterns

    def compute_insights(
        self,
        profile: HolisticProfile,
        patterns: Optional[List[LearningPattern]] = None,
    ) -> List[ActionableInsight]:
        """
        Compute actionable insights from profile and patterns.

        Args:
            profile: Holistic learner profile.
            patterns: Optional list of detected patterns.

        Returns:
            List of ActionableInsight objects.
        """
        insights = []
        patterns = patterns or []

        # Generate insights from profile strengths
        for strength in profile.strengths[:3]:  # Top 3 strengths
            insight = self._create_strength_insight(strength, profile)
            if insight:
                insights.append(insight)

        # Generate insights from growth areas
        for area in profile.growth_areas[:3]:  # Top 3 areas
            insight = self._create_growth_insight(area, profile)
            if insight:
                insights.append(insight)

        # Generate insights from patterns
        for pattern in patterns[:5]:  # Top 5 patterns
            insight = self._create_pattern_insight(pattern, profile)
            if insight:
                insights.append(insight)

        # Generate overall trajectory insight
        trajectory_insight = self._create_trajectory_insight(profile)
        if trajectory_insight:
            insights.append(trajectory_insight)

        # Sort by priority
        priority_order = {"high": 0, "medium": 1, "low": 2}
        insights.sort(key=lambda i: priority_order.get(i.priority, 1))

        return insights

    def generate_report(
        self,
        profile: HolisticProfile,
        audience: str = "teacher",
    ) -> str:
        """
        Generate human-readable report.

        Args:
            profile: Holistic learner profile.
            audience: Target audience ("teacher", "learner", "parent", "admin").

        Returns:
            Formatted report string.
        """
        patterns = self.identify_patterns(profile)
        insights = self.compute_insights(profile, patterns)

        if audience == "learner":
            return self._generate_learner_report(profile, patterns, insights)
        elif audience == "parent":
            return self._generate_parent_report(profile, patterns, insights)
        elif audience == "admin":
            return self._generate_admin_report(profile, patterns, insights)
        else:  # Default: teacher
            return self._generate_teacher_report(profile, patterns, insights)

    def _analyze_cognitive_dimension(
        self,
        data: Dict[str, Any],
    ) -> Dict[str, float]:
        """Analyze cognitive dimension metrics."""
        profile = {}

        for dimension, indicators in self.COGNITIVE_DIMENSIONS.items():
            scores = []
            for indicator in indicators:
                if indicator in data:
                    score = self._normalize_score(data[indicator])
                    scores.append(score)

            if scores:
                profile[dimension] = float(np.mean(scores))
            else:
                profile[dimension] = 0.5  # Default neutral

        return profile

    def _analyze_emotional_dimension(
        self,
        data: Dict[str, Any],
    ) -> Dict[str, float]:
        """Analyze emotional dimension metrics."""
        profile = {}

        for dimension, indicators in self.EMOTIONAL_DIMENSIONS.items():
            scores = []
            for indicator in indicators:
                if indicator in data:
                    score = self._normalize_score(data[indicator])
                    # Invert negative emotions
                    if dimension == "frustration":
                        score = 1.0 - score
                    scores.append(score)

            if scores:
                profile[dimension] = float(np.mean(scores))
            else:
                profile[dimension] = 0.5

        return profile

    def _analyze_behavioral_dimension(
        self,
        data: Dict[str, Any],
    ) -> Dict[str, float]:
        """Analyze behavioral dimension metrics."""
        profile = {}

        for dimension, indicators in self.BEHAVIORAL_DIMENSIONS.items():
            scores = []
            for indicator in indicators:
                if indicator in data:
                    score = self._normalize_score(data[indicator])
                    scores.append(score)

            if scores:
                profile[dimension] = float(np.mean(scores))
            else:
                profile[dimension] = 0.5

        return profile

    def _normalize_score(self, value: Any) -> float:
        """Normalize a value to [0, 1] range."""
        if isinstance(value, bool):
            return 1.0 if value else 0.0
        elif isinstance(value, (int, float)):
            if value < 0:
                return 0.0
            elif value > 1:
                # Sigmoid normalization for unbounded values
                return 1.0 / (1.0 + np.exp(-value / 50))
            return float(value)
        elif isinstance(value, (list, np.ndarray)):
            arr = np.asarray(value, dtype=np.float64)
            if len(arr) > 0:
                return float(np.clip(np.mean(arr), 0, 1))
        return 0.5

    def _identify_strengths(
        self,
        cognitive: Dict[str, float],
        emotional: Dict[str, float],
        behavioral: Dict[str, float],
    ) -> List[str]:
        """Identify learner strengths (top scores)."""
        all_scores = []

        for dim, score in cognitive.items():
            all_scores.append((f"cognitive_{dim}", score))
        for dim, score in emotional.items():
            all_scores.append((f"emotional_{dim}", score))
        for dim, score in behavioral.items():
            all_scores.append((f"behavioral_{dim}", score))

        # Sort by score descending
        all_scores.sort(key=lambda x: x[1], reverse=True)

        # Take top scores above threshold
        threshold = 0.65
        strengths = [name for name, score in all_scores if score >= threshold]

        # Format for readability
        formatted = []
        for s in strengths[:5]:
            category, dimension = s.split("_", 1)
            formatted.append(f"{dimension.replace('_', ' ').title()} ({category})")

        return formatted

    def _identify_growth_areas(
        self,
        cognitive: Dict[str, float],
        emotional: Dict[str, float],
        behavioral: Dict[str, float],
    ) -> List[str]:
        """Identify areas for improvement (low scores)."""
        all_scores = []

        for dim, score in cognitive.items():
            all_scores.append((f"cognitive_{dim}", score))
        for dim, score in emotional.items():
            all_scores.append((f"emotional_{dim}", score))
        for dim, score in behavioral.items():
            all_scores.append((f"behavioral_{dim}", score))

        # Sort by score ascending
        all_scores.sort(key=lambda x: x[1])

        # Take bottom scores below threshold
        threshold = 0.45
        growth_areas = [name for name, score in all_scores if score < threshold]

        # Format for readability
        formatted = []
        for area in growth_areas[:5]:
            category, dimension = area.split("_", 1)
            formatted.append(f"{dimension.replace('_', ' ').title()} ({category})")

        return formatted

    def _generate_recommendations(
        self,
        strengths: List[str],
        growth_areas: List[str],
        cognitive: Dict[str, float],
        emotional: Dict[str, float],
        behavioral: Dict[str, float],
    ) -> List[str]:
        """Generate personalized recommendations."""
        recommendations = []

        # Recommendations based on growth areas
        growth_recommendations = {
            "understanding": "Consider using more visual explanations and worked examples",
            "retention": "Implement spaced repetition practice and regular review sessions",
            "problem_solving": "Provide more practice problems with step-by-step guidance",
            "critical_thinking": "Include analysis and evaluation activities",
            "engagement": "Incorporate interactive and gamified elements",
            "motivation": "Set clear, achievable goals with visible progress tracking",
            "frustration": "Offer additional scaffolding and break complex tasks into steps",
            "confidence": "Provide encouraging feedback and celebrate small wins",
            "study_habits": "Help establish consistent study routines and schedules",
            "time_management": "Use timers and deadlines to improve task completion",
            "self_regulation": "Teach metacognitive strategies and self-monitoring",
        }

        for area in growth_areas:
            # Extract dimension from formatted string
            dimension = area.split(" (")[0].lower().replace(" ", "_")
            if dimension in growth_recommendations:
                recommendations.append(growth_recommendations[dimension])

        # Recommendations to leverage strengths
        if strengths:
            first_strength = strengths[0].split(" (")[0].lower().replace(" ", "_")
            recommendations.append(
                f"Build on strong {first_strength.replace('_', ' ')} to support other areas"
            )

        # General recommendations based on overall profile
        avg_cognitive = np.mean(list(cognitive.values()))
        avg_emotional = np.mean(list(emotional.values()))
        avg_behavioral = np.mean(list(behavioral.values()))

        if avg_emotional < avg_cognitive:
            recommendations.append(
                "Focus on emotional engagement to match cognitive potential"
            )
        if avg_behavioral < 0.5:
            recommendations.append(
                "Establish better learning habits and study routines"
            )

        return recommendations[:6]  # Limit to 6 recommendations

    def _compute_overall_score(
        self,
        cognitive: Dict[str, float],
        emotional: Dict[str, float],
        behavioral: Dict[str, float],
    ) -> float:
        """Compute weighted overall score."""
        cognitive_avg = np.mean(list(cognitive.values())) if cognitive else 0.5
        emotional_avg = np.mean(list(emotional.values())) if emotional else 0.5
        behavioral_avg = np.mean(list(behavioral.values())) if behavioral else 0.5

        overall = (
            self.cognitive_weight * cognitive_avg +
            self.emotional_weight * emotional_avg +
            self.behavioral_weight * behavioral_avg
        )

        return float(np.clip(overall, 0, 1))

    def _compute_analysis_confidence(
        self,
        data: Dict[str, Any],
    ) -> float:
        """Compute confidence in the analysis based on data availability."""
        total_expected = (
            len(self.COGNITIVE_DIMENSIONS) +
            len(self.EMOTIONAL_DIMENSIONS) +
            len(self.BEHAVIORAL_DIMENSIONS)
        )

        # Count available data points
        available = 0
        for dimensions in [self.COGNITIVE_DIMENSIONS, self.EMOTIONAL_DIMENSIONS, self.BEHAVIORAL_DIMENSIONS]:
            for indicators in dimensions.values():
                for indicator in indicators:
                    if indicator in data:
                        available += 1

        total_indicators = sum(
            len(indicators)
            for dimensions in [self.COGNITIVE_DIMENSIONS, self.EMOTIONAL_DIMENSIONS, self.BEHAVIORAL_DIMENSIONS]
            for indicators in dimensions.values()
        )

        if total_indicators == 0:
            return 0.0

        coverage = available / total_indicators
        return float(np.clip(coverage, 0, 1))

    def _analyze_cognitive_patterns(
        self,
        cognitive_profile: Dict[str, float],
    ) -> List[LearningPattern]:
        """Analyze patterns in cognitive profile."""
        patterns = []

        # Check for understanding-retention gap
        if "understanding" in cognitive_profile and "retention" in cognitive_profile:
            gap = cognitive_profile["understanding"] - cognitive_profile["retention"]
            if gap > 0.2:
                patterns.append(LearningPattern(
                    pattern_type="understanding_retention_gap",
                    description="Learner understands concepts but struggles to retain them",
                    frequency=0.8,
                    impact="negative",
                    evidence=["High understanding score", "Lower retention score"],
                    recommendations=[
                        "Implement spaced repetition",
                        "Add review sessions",
                        "Use retrieval practice"
                    ],
                ))

        # Check for strong problem-solving
        if cognitive_profile.get("problem_solving", 0) > 0.75:
            patterns.append(LearningPattern(
                pattern_type="strong_problem_solver",
                description="Learner excels at applying knowledge to solve problems",
                frequency=0.9,
                impact="positive",
                evidence=["High problem-solving score"],
                recommendations=[
                    "Provide challenging problems",
                    "Encourage peer tutoring"
                ],
            ))

        return patterns

    def _analyze_emotional_patterns(
        self,
        emotional_profile: Dict[str, float],
    ) -> List[LearningPattern]:
        """Analyze patterns in emotional profile."""
        patterns = []

        # Check for high engagement with low confidence
        engagement = emotional_profile.get("engagement", 0.5)
        confidence = emotional_profile.get("confidence", 0.5)

        if engagement > 0.7 and confidence < 0.4:
            patterns.append(LearningPattern(
                pattern_type="engaged_but_uncertain",
                description="Learner is engaged but lacks confidence in their abilities",
                frequency=0.7,
                impact="neutral",
                evidence=["High engagement", "Low confidence"],
                recommendations=[
                    "Provide positive reinforcement",
                    "Break tasks into smaller achievable goals",
                    "Celebrate progress"
                ],
            ))

        # Check for motivation issues
        if emotional_profile.get("motivation", 0.5) < 0.4:
            patterns.append(LearningPattern(
                pattern_type="motivation_challenge",
                description="Learner shows signs of low motivation",
                frequency=0.8,
                impact="negative",
                evidence=["Low motivation indicators"],
                recommendations=[
                    "Connect learning to personal interests",
                    "Use gamification",
                    "Set meaningful goals"
                ],
            ))

        return patterns

    def _analyze_behavioral_patterns(
        self,
        behavioral_profile: Dict[str, float],
    ) -> List[LearningPattern]:
        """Analyze patterns in behavioral profile."""
        patterns = []

        # Check for good study habits
        if behavioral_profile.get("study_habits", 0) > 0.7:
            patterns.append(LearningPattern(
                pattern_type="strong_study_habits",
                description="Learner demonstrates consistent and effective study habits",
                frequency=0.9,
                impact="positive",
                evidence=["Regular study sessions", "Consistent duration"],
                recommendations=["Maintain current routine", "Consider peer mentoring"],
            ))

        # Check for time management issues
        if behavioral_profile.get("time_management", 0.5) < 0.4:
            patterns.append(LearningPattern(
                pattern_type="time_management_challenge",
                description="Learner struggles with time management",
                frequency=0.7,
                impact="negative",
                evidence=["Missed deadlines", "Inconsistent task completion"],
                recommendations=[
                    "Use timers and structured schedules",
                    "Break large tasks into smaller chunks",
                    "Practice prioritization"
                ],
            ))

        return patterns

    def _analyze_cross_dimensional_patterns(
        self,
        profile: HolisticProfile,
    ) -> List[LearningPattern]:
        """Analyze patterns across dimensions."""
        patterns = []

        # Calculate dimension averages
        cognitive_avg = np.mean(list(profile.cognitive_profile.values()))
        emotional_avg = np.mean(list(profile.emotional_profile.values()))
        behavioral_avg = np.mean(list(profile.behavioral_profile.values()))

        # Check for high cognitive, low emotional pattern
        if cognitive_avg > 0.7 and emotional_avg < 0.5:
            patterns.append(LearningPattern(
                pattern_type="cognitive_emotional_imbalance",
                description="Strong cognitive abilities but emotional engagement needs support",
                frequency=0.6,
                impact="neutral",
                evidence=["High cognitive scores", "Lower emotional scores"],
                recommendations=[
                    "Focus on making learning more emotionally engaging",
                    "Connect content to personal relevance"
                ],
            ))

        # Check for well-rounded learner
        if all(avg > 0.6 for avg in [cognitive_avg, emotional_avg, behavioral_avg]):
            patterns.append(LearningPattern(
                pattern_type="well_rounded_learner",
                description="Learner shows balanced strengths across all dimensions",
                frequency=0.9,
                impact="positive",
                evidence=["Balanced profile across dimensions"],
                recommendations=[
                    "Consider advanced challenges",
                    "Explore leadership opportunities"
                ],
            ))

        return patterns

    def _create_strength_insight(
        self,
        strength: str,
        profile: HolisticProfile,
    ) -> Optional[ActionableInsight]:
        """Create insight from a strength."""
        dimension = strength.split(" (")[0].lower().replace(" ", "_")

        return ActionableInsight(
            category="strength",
            insight=f"Strong {strength.lower()} can be leveraged for learning success",
            priority="medium",
            action_items=[
                f"Use {dimension.replace('_', ' ')} as a foundation for learning",
                "Consider peer tutoring opportunities"
            ],
            expected_impact="Maintain or improve current performance",
            confidence=profile.confidence,
        )

    def _create_growth_insight(
        self,
        growth_area: str,
        profile: HolisticProfile,
    ) -> Optional[ActionableInsight]:
        """Create insight from a growth area."""
        dimension = growth_area.split(" (")[0].lower().replace(" ", "_")

        return ActionableInsight(
            category="growth",
            insight=f"{growth_area} presents an opportunity for improvement",
            priority="high",
            action_items=[
                f"Develop targeted interventions for {dimension.replace('_', ' ')}",
                "Monitor progress regularly"
            ],
            expected_impact="Significant improvement potential",
            confidence=profile.confidence,
        )

    def _create_pattern_insight(
        self,
        pattern: LearningPattern,
        profile: HolisticProfile,
    ) -> Optional[ActionableInsight]:
        """Create insight from a pattern."""
        priority = "high" if pattern.impact == "negative" else "medium"

        return ActionableInsight(
            category="pattern",
            insight=pattern.description,
            priority=priority,
            action_items=pattern.recommendations[:2],
            expected_impact="Address pattern for improved outcomes",
            confidence=pattern.frequency * profile.confidence,
        )

    def _create_trajectory_insight(
        self,
        profile: HolisticProfile,
    ) -> Optional[ActionableInsight]:
        """Create insight about learning trajectory."""
        if profile.overall_score > 0.7:
            return ActionableInsight(
                category="trajectory",
                insight="Learner is on a positive learning trajectory",
                priority="low",
                action_items=["Continue current approach", "Consider enrichment activities"],
                expected_impact="Sustained high performance",
                confidence=profile.confidence,
            )
        elif profile.overall_score < 0.4:
            return ActionableInsight(
                category="trajectory",
                insight="Learner may benefit from additional support",
                priority="high",
                action_items=profile.recommendations[:3],
                expected_impact="Improved learning outcomes with intervention",
                confidence=profile.confidence,
            )
        return None

    def _generate_teacher_report(
        self,
        profile: HolisticProfile,
        patterns: List[LearningPattern],
        insights: List[ActionableInsight],
    ) -> str:
        """Generate report for teachers."""
        lines = [
            f"# Holistic Learner Analysis Report",
            f"## Learner ID: {profile.learner_id}",
            f"",
            f"### Overall Score: {profile.overall_score:.0%} (Confidence: {profile.confidence:.0%})",
            f"",
            f"### Cognitive Profile",
        ]

        for dim, score in profile.cognitive_profile.items():
            lines.append(f"- {dim.replace('_', ' ').title()}: {score:.0%}")

        lines.extend([
            f"",
            f"### Emotional Profile",
        ])

        for dim, score in profile.emotional_profile.items():
            lines.append(f"- {dim.replace('_', ' ').title()}: {score:.0%}")

        lines.extend([
            f"",
            f"### Strengths",
        ])
        for s in profile.strengths:
            lines.append(f"- {s}")

        lines.extend([
            f"",
            f"### Areas for Growth",
        ])
        for a in profile.growth_areas:
            lines.append(f"- {a}")

        lines.extend([
            f"",
            f"### Recommendations",
        ])
        for r in profile.recommendations:
            lines.append(f"- {r}")

        return "\n".join(lines)

    def _generate_learner_report(
        self,
        profile: HolisticProfile,
        patterns: List[LearningPattern],
        insights: List[ActionableInsight],
    ) -> str:
        """Generate report for learners (student-friendly)."""
        lines = [
            f"# Your Learning Profile",
            f"",
            f"Great job on your learning journey! Here's what we found:",
            f"",
            f"### Your Strengths",
        ]
        for s in profile.strengths[:3]:
            lines.append(f"- {s}")

        lines.extend([
            f"",
            f"### Where You Can Grow",
        ])
        for a in profile.growth_areas[:3]:
            lines.append(f"- {a}")

        lines.extend([
            f"",
            f"### Tips for Success",
        ])
        for r in profile.recommendations[:3]:
            lines.append(f"- {r}")

        return "\n".join(lines)

    def _generate_parent_report(
        self,
        profile: HolisticProfile,
        patterns: List[LearningPattern],
        insights: List[ActionableInsight],
    ) -> str:
        """Generate report for parents."""
        lines = [
            f"# Learning Progress Report",
            f"",
            f"### Overall Progress: {profile.overall_score:.0%}",
            f"",
            f"### Key Strengths",
        ]
        for s in profile.strengths[:3]:
            lines.append(f"- {s}")

        lines.extend([
            f"",
            f"### How You Can Help",
        ])
        for r in profile.recommendations[:3]:
            lines.append(f"- {r}")

        return "\n".join(lines)

    def _generate_admin_report(
        self,
        profile: HolisticProfile,
        patterns: List[LearningPattern],
        insights: List[ActionableInsight],
    ) -> str:
        """Generate report for administrators."""
        lines = [
            f"# Administrative Learning Analytics Report",
            f"## Learner: {profile.learner_id}",
            f"",
            f"### Metrics Summary",
            f"- Overall Score: {profile.overall_score:.2f}",
            f"- Analysis Confidence: {profile.confidence:.2f}",
            f"- Patterns Detected: {len(patterns)}",
            f"- Insights Generated: {len(insights)}",
            f"",
            f"### Profile Data",
            f"Cognitive: {profile.cognitive_profile}",
            f"Emotional: {profile.emotional_profile}",
            f"Behavioral: {profile.behavioral_profile}",
        ]

        return "\n".join(lines)
