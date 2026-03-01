"""
Accommodation Recommender

Detects performance patterns, cross-references IEP accommodations,
and evaluates accommodation effectiveness over time.

Key capabilities:
- Performance-pattern detection (sustained struggles, regression,
  spiky profiles, fatigue effects, time-of-day patterns)
- IEP cross-reference to identify gaps between documented
  accommodations and observed needs
- Accommodation effectiveness evaluation with effect-size calculation
- Continuation / modification / removal recommendations
"""
import logging
import math
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


# ── Enums ───────────────────────────────────────────────────────────────

class PerformancePatternType(Enum):
    """Detectable performance patterns."""
    SUSTAINED_STRUGGLE = "sustained_struggle"   # consistently below threshold
    REGRESSION = "regression"                    # declining trend
    SPIKY_PROFILE = "spiky_profile"              # high variance across skills
    FATIGUE_EFFECT = "fatigue_effect"             # declining within sessions
    TIME_OF_DAY = "time_of_day"                  # performance varies by time
    PLATEAU = "plateau"                          # flat growth despite instruction
    RAPID_GROWTH = "rapid_growth"                # accelerating mastery
    INCONSISTENT = "inconsistent"                # random high/low pattern


class AccommodationCategory(Enum):
    """Broad accommodation categories."""
    PRESENTATION = "presentation"     # how content is delivered
    RESPONSE = "response"             # how student responds
    SETTING = "setting"               # environment modifications
    TIMING = "timing"                 # schedule/duration changes
    TECHNOLOGY = "technology"         # assistive tech
    BEHAVIOURAL = "behavioural"       # behaviour supports
    SOCIAL = "social"                 # social/emotional supports
    SENSORY = "sensory"               # sensory accommodations


class EffectivenessRating(Enum):
    """Effectiveness categories."""
    HIGHLY_EFFECTIVE = "highly_effective"     # effect size ≥ 0.8
    EFFECTIVE = "effective"                   # 0.4 ≤ effect size < 0.8
    MARGINALLY_EFFECTIVE = "marginally_effective"  # 0.2 ≤ effect size < 0.4
    INEFFECTIVE = "ineffective"              # effect size < 0.2
    INSUFFICIENT_DATA = "insufficient_data"


class RecommendationAction(Enum):
    """What to do with an accommodation."""
    CONTINUE = "continue"
    MODIFY = "modify"
    INTENSIFY = "intensify"
    FADE = "fade"
    REMOVE = "remove"
    ADD_NEW = "add_new"


# ── Pattern-to-accommodation mapping ───────────────────────────────────

PATTERN_ACCOMMODATIONS: Dict[str, List[Dict[str, str]]] = {
    "sustained_struggle": [
        {
            "name": "simplified_language",
            "category": "presentation",
            "rationale": "Reduce reading load to focus on content mastery",
        },
        {
            "name": "visual_supports",
            "category": "presentation",
            "rationale": "Visual scaffolding supports comprehension",
        },
        {
            "name": "reduced_workload",
            "category": "response",
            "rationale": "Focus on essential skills to build confidence",
        },
        {
            "name": "extended_time",
            "category": "timing",
            "rationale": "Allow additional processing time",
        },
    ],
    "regression": [
        {
            "name": "frequent_check_ins",
            "category": "behavioural",
            "rationale": "Monitor closely to identify cause of regression",
        },
        {
            "name": "review_scaffolding",
            "category": "presentation",
            "rationale": "Revisit foundational skills with scaffolding",
        },
        {
            "name": "reduced_workload",
            "category": "response",
            "rationale": "Reduce cognitive load during recovery",
        },
    ],
    "spiky_profile": [
        {
            "name": "strength_based_approach",
            "category": "presentation",
            "rationale": "Leverage strong areas to support weak areas",
        },
        {
            "name": "targeted_intervention",
            "category": "presentation",
            "rationale": "Focus resources on specific deficit areas",
        },
        {
            "name": "alternative_assessment",
            "category": "response",
            "rationale": "Assess through strongest modality",
        },
    ],
    "fatigue_effect": [
        {
            "name": "frequent_breaks",
            "category": "timing",
            "rationale": "Prevent cognitive fatigue through breaks",
        },
        {
            "name": "chunked_assignments",
            "category": "timing",
            "rationale": "Break work into smaller segments",
        },
        {
            "name": "priority_scheduling",
            "category": "timing",
            "rationale": "Schedule demanding tasks during peak energy",
        },
    ],
    "time_of_day": [
        {
            "name": "priority_scheduling",
            "category": "timing",
            "rationale": "Schedule key tasks during optimal time window",
        },
        {
            "name": "flexible_scheduling",
            "category": "timing",
            "rationale": "Allow flexibility in when tasks are completed",
        },
    ],
    "plateau": [
        {
            "name": "multi_sensory_instruction",
            "category": "presentation",
            "rationale": "Introduce different modalities to break plateau",
        },
        {
            "name": "peer_tutoring",
            "category": "social",
            "rationale": "Peer explanation can unlock new understanding",
        },
        {
            "name": "interest_integration",
            "category": "presentation",
            "rationale": "Connect content to student interests for motivation",
        },
    ],
    "rapid_growth": [
        {
            "name": "curriculum_compacting",
            "category": "presentation",
            "rationale": "Skip mastered content to maintain challenge",
        },
        {
            "name": "enrichment_opportunities",
            "category": "presentation",
            "rationale": "Provide depth and complexity",
        },
    ],
    "inconsistent": [
        {
            "name": "structured_routine",
            "category": "setting",
            "rationale": "Reduce variability through consistent structure",
        },
        {
            "name": "self_monitoring_tools",
            "category": "behavioural",
            "rationale": "Help student track own performance patterns",
        },
        {
            "name": "environmental_consistency",
            "category": "setting",
            "rationale": "Minimise environmental variables",
        },
    ],
}


# ── Result Dataclasses ──────────────────────────────────────────────────

@dataclass
class DetectedPattern:
    """A performance pattern detected from data."""
    pattern_type: str
    confidence: float      # 0–1
    evidence: List[str] = field(default_factory=list)
    affected_skills: List[str] = field(default_factory=list)
    severity: str = "moderate"  # mild / moderate / severe
    data_points: int = 0


@dataclass
class AccommodationSuggestion:
    """A suggested accommodation."""
    name: str
    category: str
    rationale: str
    triggered_by: str         # pattern or IEP gap that triggered it
    priority: str = "medium"  # high / medium / low
    implementation_notes: List[str] = field(default_factory=list)


@dataclass
class RecommendationResult:
    """Full recommendation output."""
    learner_id: str
    detected_patterns: List[DetectedPattern] = field(default_factory=list)
    iep_gaps: List[str] = field(default_factory=list)
    new_suggestions: List[AccommodationSuggestion] = field(default_factory=list)
    existing_to_review: List[str] = field(default_factory=list)
    summary: str = ""


@dataclass
class EffectivenessMetrics:
    """Quantitative effectiveness metrics."""
    pre_mean: float = 0.0
    post_mean: float = 0.0
    pre_std: float = 0.0
    post_std: float = 0.0
    effect_size: float = 0.0    # Cohen's d
    improvement_pct: float = 0.0
    data_points_pre: int = 0
    data_points_post: int = 0


@dataclass
class EffectivenessResult:
    """Full effectiveness evaluation output."""
    learner_id: str
    accommodation_name: str
    time_period: str
    rating: str
    metrics: EffectivenessMetrics
    action: str                    # RecommendationAction value
    rationale: str = ""
    modification_suggestions: List[str] = field(default_factory=list)
    summary: str = ""


# ── Main Class ──────────────────────────────────────────────────────────

class AccommodationRecommender:
    """
    Recommend and evaluate accommodations based on performance data.

    Usage::

        recommender = AccommodationRecommender()

        recs = recommender.recommend_accommodations(
            learner_profile={...},
            performance_data={...},
            existing_accommodations=[...],
        )

        effectiveness = recommender.evaluate_accommodation_effectiveness(
            learner_id="L123",
            accommodation="extended_time",
            performance_before=[0.6, 0.65, 0.55],
            performance_after=[0.75, 0.8, 0.78],
            time_period="Q1 2025",
        )
    """

    # Thresholds
    STRUGGLE_THRESHOLD = 0.5          # below this → sustained struggle
    REGRESSION_THRESHOLD = -0.1       # trend slope below this → regression
    SPIKY_THRESHOLD = 0.25            # std dev above this → spiky profile
    FATIGUE_DECLINE_THRESHOLD = -0.15 # within-session decline
    PLATEAU_GROWTH_THRESHOLD = 0.02   # growth below this → plateau
    RAPID_GROWTH_THRESHOLD = 0.15     # growth above this → rapid
    INCONSISTENCY_CV_THRESHOLD = 0.35 # coefficient of variation

    def __init__(self) -> None:
        logger.info("AccommodationRecommender initialised")

    # ── Public API ──────────────────────────────────────────────────────

    def recommend_accommodations(
        self,
        learner_profile: Dict[str, Any],
        performance_data: Dict[str, Any],
        existing_accommodations: Optional[List[str]] = None,
        iep_accommodations: Optional[List[str]] = None,
    ) -> RecommendationResult:
        """
        Analyse performance data and recommend accommodations.

        Parameters
        ----------
        learner_profile : dict
            Keys: ``learner_id``, ``age``, ``grade``, ``diagnoses``.
        performance_data : dict
            Keys: ``skill_scores`` (dict[skill, list[float]]),
            ``session_scores`` (list[float]),
            ``time_of_day_scores`` (dict[str, list[float]]),
            ``recent_trend`` (list[float]).
        existing_accommodations : list[str], optional
            Currently active accommodations.
        iep_accommodations : list[str], optional
            Accommodations documented in IEP.

        Returns
        -------
        RecommendationResult
        """
        if not learner_profile:
            raise ValueError("Learner profile cannot be empty")
        if not performance_data:
            raise ValueError("Performance data cannot be empty")

        existing = set(existing_accommodations or [])
        iep = set(iep_accommodations or [])
        learner_id = learner_profile.get("learner_id", "unknown")

        result = RecommendationResult(learner_id=learner_id)

        # 1. Detect performance patterns
        result.detected_patterns = self._detect_patterns(performance_data)

        # 2. IEP gap analysis
        result.iep_gaps = self._find_iep_gaps(existing, iep)

        # 3. Generate suggestions from patterns
        already_suggested: set = set()
        for pattern in result.detected_patterns:
            suggestions = self._suggestions_for_pattern(
                pattern, existing, already_suggested
            )
            result.new_suggestions.extend(suggestions)
            already_suggested.update(s.name for s in suggestions)

        # 4. Add IEP-gap-based suggestions
        for gap in result.iep_gaps:
            if gap not in existing and gap not in already_suggested:
                result.new_suggestions.append(
                    AccommodationSuggestion(
                        name=gap,
                        category="iep_documented",
                        rationale=f"Documented in IEP but not currently active",
                        triggered_by="iep_gap",
                        priority="high",
                    )
                )
                already_suggested.add(gap)

        # 5. Flag existing accommodations to review
        result.existing_to_review = self._flag_for_review(
            existing, result.detected_patterns
        )

        # 6. Summary
        result.summary = (
            f"Detected {len(result.detected_patterns)} pattern(s), "
            f"found {len(result.iep_gaps)} IEP gap(s), "
            f"suggesting {len(result.new_suggestions)} new accommodation(s)"
        )

        return result

    def evaluate_accommodation_effectiveness(
        self,
        learner_id: str,
        accommodation: str,
        performance_before: List[float],
        performance_after: List[float],
        time_period: str = "current",
    ) -> EffectivenessResult:
        """
        Evaluate how effective an accommodation has been.

        Parameters
        ----------
        learner_id : str
        accommodation : str
            Name of the accommodation being evaluated.
        performance_before : list[float]
            Scores before accommodation was applied.
        performance_after : list[float]
            Scores after accommodation was applied.
        time_period : str
            Label for the evaluation period.

        Returns
        -------
        EffectivenessResult
        """
        if not performance_before or not performance_after:
            return EffectivenessResult(
                learner_id=learner_id,
                accommodation_name=accommodation,
                time_period=time_period,
                rating=EffectivenessRating.INSUFFICIENT_DATA.value,
                metrics=EffectivenessMetrics(),
                action=RecommendationAction.CONTINUE.value,
                rationale="Insufficient data to evaluate effectiveness",
                summary="Need more data points to assess effectiveness",
            )

        # Calculate metrics
        metrics = self._calculate_metrics(
            performance_before, performance_after
        )

        # Determine rating
        rating = self._rate_effectiveness(metrics.effect_size)

        # Determine action
        action, rationale = self._determine_action(rating, metrics)

        # Modification suggestions
        modifications = self._suggest_modifications(
            accommodation, rating, metrics
        )

        summary = (
            f"{accommodation}: {rating} "
            f"(effect size {metrics.effect_size:+.2f}, "
            f"{metrics.improvement_pct:+.1f}% change)"
        )

        return EffectivenessResult(
            learner_id=learner_id,
            accommodation_name=accommodation,
            time_period=time_period,
            rating=rating,
            metrics=metrics,
            action=action,
            rationale=rationale,
            modification_suggestions=modifications,
            summary=summary,
        )

    # ── Pattern detection ───────────────────────────────────────────────

    def _detect_patterns(
        self, data: Dict[str, Any]
    ) -> List[DetectedPattern]:
        """Detect all performance patterns from data."""
        patterns: List[DetectedPattern] = []

        # Skill-level analysis
        skill_scores = data.get("skill_scores", {})
        if skill_scores:
            patterns.extend(self._detect_skill_patterns(skill_scores))

        # Session-level analysis
        session_scores = data.get("session_scores", [])
        if session_scores:
            patterns.extend(self._detect_session_patterns(session_scores))

        # Time-of-day analysis
        tod_scores = data.get("time_of_day_scores", {})
        if tod_scores:
            patterns.extend(self._detect_time_patterns(tod_scores))

        # Trend analysis
        recent_trend = data.get("recent_trend", [])
        if recent_trend:
            # Accept a scalar (single float) or a list
            if isinstance(recent_trend, (int, float)):
                recent_trend = [recent_trend]
            patterns.extend(self._detect_trend_patterns(recent_trend))

        return patterns

    def _detect_skill_patterns(
        self, skill_scores: Dict[str, List[float]]
    ) -> List[DetectedPattern]:
        """Detect patterns across skill areas."""
        patterns: List[DetectedPattern] = []

        # Calculate per-skill averages
        skill_avgs: Dict[str, float] = {}
        for skill, scores in skill_scores.items():
            if scores:
                skill_avgs[skill] = sum(scores) / len(scores)

        if not skill_avgs:
            return patterns

        overall_avg = sum(skill_avgs.values()) / len(skill_avgs)
        values = list(skill_avgs.values())

        # Sustained struggle
        struggling_skills = [
            s for s, avg in skill_avgs.items()
            if avg < self.STRUGGLE_THRESHOLD
        ]
        if struggling_skills:
            patterns.append(
                DetectedPattern(
                    pattern_type=PerformancePatternType.SUSTAINED_STRUGGLE.value,
                    confidence=min(1.0, len(struggling_skills) / len(skill_avgs)),
                    evidence=[
                        f"{s}: avg {skill_avgs[s]:.2f}" for s in struggling_skills
                    ],
                    affected_skills=struggling_skills,
                    severity=(
                        "severe" if len(struggling_skills) > len(skill_avgs) / 2
                        else "moderate"
                    ),
                    data_points=sum(
                        len(skill_scores[s]) for s in struggling_skills
                    ),
                )
            )

        # Spiky profile
        if len(values) >= 3:
            std = self._std_dev(values)
            if std > self.SPIKY_THRESHOLD:
                best = max(skill_avgs, key=skill_avgs.get)  # type: ignore
                worst = min(skill_avgs, key=skill_avgs.get)  # type: ignore
                patterns.append(
                    DetectedPattern(
                        pattern_type=PerformancePatternType.SPIKY_PROFILE.value,
                        confidence=min(1.0, std / 0.5),
                        evidence=[
                            f"Strongest: {best} ({skill_avgs[best]:.2f})",
                            f"Weakest: {worst} ({skill_avgs[worst]:.2f})",
                            f"Std dev: {std:.3f}",
                        ],
                        affected_skills=[worst],
                        severity=(
                            "severe" if std > 0.4 else "moderate"
                        ),
                        data_points=sum(
                            len(v) for v in skill_scores.values()
                        ),
                    )
                )

        return patterns

    def _detect_session_patterns(
        self, session_scores: List[float]
    ) -> List[DetectedPattern]:
        """Detect patterns within session data."""
        patterns: List[DetectedPattern] = []

        if len(session_scores) < 3:
            return patterns

        # Fatigue effect: last third significantly lower than first third
        third = len(session_scores) // 3
        if third > 0:
            first_third = session_scores[:third]
            last_third = session_scores[-third:]
            first_avg = sum(first_third) / len(first_third)
            last_avg = sum(last_third) / len(last_third)
            decline = last_avg - first_avg

            if decline < self.FATIGUE_DECLINE_THRESHOLD:
                patterns.append(
                    DetectedPattern(
                        pattern_type=PerformancePatternType.FATIGUE_EFFECT.value,
                        confidence=min(1.0, abs(decline) / 0.3),
                        evidence=[
                            f"Session start avg: {first_avg:.2f}",
                            f"Session end avg: {last_avg:.2f}",
                            f"Decline: {decline:+.2f}",
                        ],
                        severity=(
                            "severe" if decline < -0.25 else "moderate"
                        ),
                        data_points=len(session_scores),
                    )
                )

        # Inconsistency: high coefficient of variation
        mean = sum(session_scores) / len(session_scores)
        if mean > 0:
            std = self._std_dev(session_scores)
            cv = std / mean
            if cv > self.INCONSISTENCY_CV_THRESHOLD:
                patterns.append(
                    DetectedPattern(
                        pattern_type=PerformancePatternType.INCONSISTENT.value,
                        confidence=min(1.0, cv / 0.6),
                        evidence=[
                            f"Mean: {mean:.2f}",
                            f"Std dev: {std:.3f}",
                            f"CV: {cv:.3f}",
                        ],
                        severity=(
                            "severe" if cv > 0.5 else "moderate"
                        ),
                        data_points=len(session_scores),
                    )
                )

        return patterns

    def _detect_time_patterns(
        self, tod_scores: Dict[str, List[float]]
    ) -> List[DetectedPattern]:
        """Detect time-of-day performance patterns."""
        patterns: List[DetectedPattern] = []

        tod_avgs: Dict[str, float] = {}
        for period, scores in tod_scores.items():
            if scores:
                tod_avgs[period] = sum(scores) / len(scores)

        if len(tod_avgs) < 2:
            return patterns

        values = list(tod_avgs.values())
        spread = max(values) - min(values)

        if spread > 0.15:
            best_time = max(tod_avgs, key=tod_avgs.get)  # type: ignore
            worst_time = min(tod_avgs, key=tod_avgs.get)  # type: ignore
            patterns.append(
                DetectedPattern(
                    pattern_type=PerformancePatternType.TIME_OF_DAY.value,
                    confidence=min(1.0, spread / 0.3),
                    evidence=[
                        f"Best: {best_time} ({tod_avgs[best_time]:.2f})",
                        f"Worst: {worst_time} ({tod_avgs[worst_time]:.2f})",
                        f"Spread: {spread:.3f}",
                    ],
                    severity="moderate",
                    data_points=sum(len(v) for v in tod_scores.values()),
                )
            )

        return patterns

    def _detect_trend_patterns(
        self, trend: List[float]
    ) -> List[DetectedPattern]:
        """Detect overall trend patterns (regression, plateau, rapid growth)."""
        patterns: List[DetectedPattern] = []

        if len(trend) < 3:
            return patterns

        # Simple linear trend: average change between consecutive points
        changes = [trend[i + 1] - trend[i] for i in range(len(trend) - 1)]
        avg_change = sum(changes) / len(changes)

        if avg_change < self.REGRESSION_THRESHOLD:
            patterns.append(
                DetectedPattern(
                    pattern_type=PerformancePatternType.REGRESSION.value,
                    confidence=min(1.0, abs(avg_change) / 0.2),
                    evidence=[
                        f"Avg change per period: {avg_change:+.3f}",
                        f"Start: {trend[0]:.2f} → End: {trend[-1]:.2f}",
                    ],
                    severity=(
                        "severe" if avg_change < -0.15 else "moderate"
                    ),
                    data_points=len(trend),
                )
            )
        elif abs(avg_change) < self.PLATEAU_GROWTH_THRESHOLD:
            patterns.append(
                DetectedPattern(
                    pattern_type=PerformancePatternType.PLATEAU.value,
                    confidence=0.7,
                    evidence=[
                        f"Avg change per period: {avg_change:+.3f}",
                        f"Start: {trend[0]:.2f} → End: {trend[-1]:.2f}",
                    ],
                    severity="moderate",
                    data_points=len(trend),
                )
            )
        elif avg_change > self.RAPID_GROWTH_THRESHOLD:
            patterns.append(
                DetectedPattern(
                    pattern_type=PerformancePatternType.RAPID_GROWTH.value,
                    confidence=min(1.0, avg_change / 0.3),
                    evidence=[
                        f"Avg change per period: {avg_change:+.3f}",
                        f"Start: {trend[0]:.2f} → End: {trend[-1]:.2f}",
                    ],
                    severity="mild",
                    data_points=len(trend),
                )
            )

        return patterns

    # ── IEP gap analysis ────────────────────────────────────────────────

    def _find_iep_gaps(
        self, existing: set, iep: set
    ) -> List[str]:
        """Find accommodations in IEP but not currently active."""
        return sorted(iep - existing)

    # ── Suggestion generation ───────────────────────────────────────────

    def _suggestions_for_pattern(
        self,
        pattern: DetectedPattern,
        existing: set,
        already_suggested: set,
    ) -> List[AccommodationSuggestion]:
        """Generate accommodation suggestions for a detected pattern."""
        suggestions: List[AccommodationSuggestion] = []

        mappings = PATTERN_ACCOMMODATIONS.get(pattern.pattern_type, [])
        for mapping in mappings:
            name = mapping["name"]
            if name in existing or name in already_suggested:
                continue

            priority = "high" if pattern.severity == "severe" else "medium"

            suggestions.append(
                AccommodationSuggestion(
                    name=name,
                    category=mapping["category"],
                    rationale=mapping["rationale"],
                    triggered_by=pattern.pattern_type,
                    priority=priority,
                    implementation_notes=[
                        f"Triggered by {pattern.pattern_type} pattern "
                        f"(confidence: {pattern.confidence:.0%})",
                        f"Severity: {pattern.severity}",
                    ],
                )
            )

        return suggestions

    # ── Review flagging ─────────────────────────────────────────────────

    def _flag_for_review(
        self,
        existing: set,
        patterns: List[DetectedPattern],
    ) -> List[str]:
        """
        Flag existing accommodations that should be reviewed.

        If patterns persist despite accommodations, the accommodations
        may not be effective enough.
        """
        flagged: List[str] = []
        severe_patterns = [
            p for p in patterns if p.severity == "severe"
        ]

        if severe_patterns and existing:
            # If severe patterns exist, all current accommodations
            # should be reviewed for effectiveness
            flagged = sorted(existing)

        return flagged

    # ── Effectiveness evaluation ────────────────────────────────────────

    def _calculate_metrics(
        self,
        before: List[float],
        after: List[float],
    ) -> EffectivenessMetrics:
        """Calculate effectiveness metrics including Cohen's d."""
        pre_mean = sum(before) / len(before)
        post_mean = sum(after) / len(after)
        pre_std = self._std_dev(before)
        post_std = self._std_dev(after)

        # Pooled standard deviation for Cohen's d
        n1, n2 = len(before), len(after)
        if pre_std == 0 and post_std == 0:
            effect_size = 0.0
        else:
            pooled_var = (
                ((n1 - 1) * pre_std ** 2 + (n2 - 1) * post_std ** 2)
                / max(n1 + n2 - 2, 1)
            )
            pooled_std = math.sqrt(pooled_var) if pooled_var > 0 else 1.0
            effect_size = (post_mean - pre_mean) / pooled_std

        improvement_pct = (
            ((post_mean - pre_mean) / pre_mean * 100)
            if pre_mean > 0
            else 0.0
        )

        return EffectivenessMetrics(
            pre_mean=round(pre_mean, 3),
            post_mean=round(post_mean, 3),
            pre_std=round(pre_std, 3),
            post_std=round(post_std, 3),
            effect_size=round(effect_size, 3),
            improvement_pct=round(improvement_pct, 1),
            data_points_pre=n1,
            data_points_post=n2,
        )

    def _rate_effectiveness(self, effect_size: float) -> str:
        """Rate effectiveness based on Cohen's d."""
        if effect_size >= 0.8:
            return EffectivenessRating.HIGHLY_EFFECTIVE.value
        elif effect_size >= 0.4:
            return EffectivenessRating.EFFECTIVE.value
        elif effect_size >= 0.2:
            return EffectivenessRating.MARGINALLY_EFFECTIVE.value
        else:
            return EffectivenessRating.INEFFECTIVE.value

    def _determine_action(
        self, rating: str, metrics: EffectivenessMetrics
    ) -> tuple:
        """Determine recommended action based on rating."""
        if rating == EffectivenessRating.HIGHLY_EFFECTIVE.value:
            return (
                RecommendationAction.CONTINUE.value,
                "Accommodation is highly effective — continue as-is",
            )
        elif rating == EffectivenessRating.EFFECTIVE.value:
            return (
                RecommendationAction.CONTINUE.value,
                "Accommodation is effective — continue with monitoring",
            )
        elif rating == EffectivenessRating.MARGINALLY_EFFECTIVE.value:
            return (
                RecommendationAction.MODIFY.value,
                "Accommodation shows marginal effect — consider modifications",
            )
        else:
            if metrics.improvement_pct < -5:
                return (
                    RecommendationAction.REMOVE.value,
                    "Accommodation appears counterproductive — consider removal",
                )
            return (
                RecommendationAction.INTENSIFY.value,
                "Accommodation is not effective at current level — "
                "consider intensifying or replacing",
            )

    def _suggest_modifications(
        self, accommodation: str, rating: str, metrics: EffectivenessMetrics
    ) -> List[str]:
        """Suggest modifications for marginally effective accommodations."""
        if rating in (
            EffectivenessRating.HIGHLY_EFFECTIVE.value,
            EffectivenessRating.EFFECTIVE.value,
        ):
            return []

        suggestions: List[str] = []

        if "time" in accommodation:
            suggestions.append(
                "Increase time extension from 1.5x to 2.0x"
            )
        if "break" in accommodation:
            suggestions.append(
                "Increase break frequency or duration"
            )
        if "workload" in accommodation:
            suggestions.append(
                "Further reduce workload or focus on fewer skills"
            )

        # Generic suggestions
        suggestions.extend([
            "Combine with complementary accommodation",
            "Provide explicit instruction on using the accommodation",
            "Verify accommodation is being consistently implemented",
        ])

        return suggestions

    # ── Utility ─────────────────────────────────────────────────────────

    @staticmethod
    def _std_dev(values: List[float]) -> float:
        """Calculate population standard deviation."""
        if len(values) < 2:
            return 0.0
        mean = sum(values) / len(values)
        variance = sum((x - mean) ** 2 for x in values) / len(values)
        return math.sqrt(variance)
