"""
IEP Analyzer

Analyses Individualized Education Programs (IEPs) for completeness,
IDEA compliance, and translates IEP accommodations into actionable
platform configurations.

Key capabilities:
- IDEA compliance validation (all 8 required sections)
- Goal measurability scoring (condition + behavior + criteria + timeframe)
- Accommodation gap detection for stated disabilities
- Overall IEP quality scoring (0–100)
- Learning-implication extraction (feature toggles, path constraints,
  scheduling rules)
- Goal-progress tracking against BKT mastery data
"""
import logging
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


# ── IDEA Required Sections ──────────────────────────────────────────────

class IDEASection(Enum):
    """The eight IDEA-required IEP sections."""
    PRESENT_LEVELS = "present_levels"            # PLAAFP
    ANNUAL_GOALS = "annual_goals"
    SPECIAL_EDUCATION_SERVICES = "special_education_services"
    SUPPLEMENTARY_AIDS = "supplementary_aids"
    PARTICIPATION_EXTENT = "participation_extent" # gen-ed participation
    ASSESSMENT_ACCOMMODATIONS = "assessment_accommodations"
    SERVICE_DATES = "service_dates"               # initiation / duration
    TRANSITION_PLAN = "transition_plan"           # age 16+


class DisabilityCategory(Enum):
    """IDEA disability categories."""
    AUTISM = "autism"
    DEAF_BLINDNESS = "deaf_blindness"
    DEAFNESS = "deafness"
    EMOTIONAL_DISTURBANCE = "emotional_disturbance"
    HEARING_IMPAIRMENT = "hearing_impairment"
    INTELLECTUAL_DISABILITY = "intellectual_disability"
    MULTIPLE_DISABILITIES = "multiple_disabilities"
    ORTHOPEDIC_IMPAIRMENT = "orthopedic_impairment"
    OTHER_HEALTH_IMPAIRMENT = "other_health_impairment"  # includes ADHD
    SPECIFIC_LEARNING_DISABILITY = "specific_learning_disability"  # includes dyslexia
    SPEECH_LANGUAGE_IMPAIRMENT = "speech_language_impairment"
    TRAUMATIC_BRAIN_INJURY = "traumatic_brain_injury"
    VISUAL_IMPAIRMENT = "visual_impairment"


class DifferentiationStrategy(Enum):
    """Content-differentiation strategies mapped from IEP accommodations."""
    EXTENDED_TIME = "extended_time"
    SIMPLIFIED_LANGUAGE = "simplified_language"
    FREQUENT_BREAKS = "frequent_breaks"
    VISUAL_SUPPORTS = "visual_supports"
    AUDIO_SUPPORTS = "audio_supports"
    REDUCED_WORKLOAD = "reduced_workload"
    ALTERNATIVE_ASSESSMENT = "alternative_assessment"
    ASSISTIVE_TECHNOLOGY = "assistive_technology"
    PREFERENTIAL_SEATING = "preferential_seating"
    BEHAVIOUR_SUPPORT = "behaviour_support"
    SOCIAL_SKILLS_SUPPORT = "social_skills_support"
    SENSORY_ACCOMMODATIONS = "sensory_accommodations"


# ── Recommended accommodations per disability ───────────────────────────

DISABILITY_ACCOMMODATIONS: Dict[str, List[str]] = {
    "autism": [
        "visual_supports", "sensory_accommodations", "social_skills_support",
        "routine_schedule", "transition_warnings", "quiet_space",
        "communication_aids", "behaviour_support",
    ],
    "other_health_impairment": [  # ADHD
        "extended_time", "frequent_breaks", "preferential_seating",
        "reduced_workload", "visual_supports", "behaviour_support",
        "assistive_technology", "movement_breaks",
    ],
    "specific_learning_disability": [  # Dyslexia, etc.
        "extended_time", "simplified_language", "audio_supports",
        "assistive_technology", "alternative_assessment",
        "visual_supports", "reduced_workload",
    ],
    "emotional_disturbance": [
        "frequent_breaks", "behaviour_support", "social_skills_support",
        "quiet_space", "counselling_access", "reduced_workload",
    ],
    "speech_language_impairment": [
        "communication_aids", "visual_supports", "extended_time",
        "simplified_language", "audio_supports",
    ],
    "hearing_impairment": [
        "audio_supports", "visual_supports", "captioning",
        "preferential_seating", "assistive_technology",
    ],
    "visual_impairment": [
        "audio_supports", "assistive_technology", "large_print",
        "screen_reader", "extended_time",
    ],
    "intellectual_disability": [
        "simplified_language", "visual_supports", "extended_time",
        "reduced_workload", "alternative_assessment",
        "frequent_breaks", "behaviour_support",
    ],
}


# ── Accommodation-to-platform-feature mapping ──────────────────────────

ACCOMMODATION_TO_FEATURE: Dict[str, Dict[str, Any]] = {
    "extended_time": {
        "feature": "time_multiplier",
        "default_value": 1.5,
        "description": "Extends time limits by multiplier",
    },
    "simplified_language": {
        "feature": "reading_level_adaptation",
        "default_value": True,
        "description": "Enable automatic text simplification",
    },
    "frequent_breaks": {
        "feature": "break_interval_minutes",
        "default_value": 15,
        "description": "Scheduled break reminders",
    },
    "visual_supports": {
        "feature": "visual_scaffolding",
        "default_value": True,
        "description": "Enable diagrams, charts, graphic organisers",
    },
    "audio_supports": {
        "feature": "text_to_speech",
        "default_value": True,
        "description": "Enable TTS for all content",
    },
    "reduced_workload": {
        "feature": "assignment_reduction_pct",
        "default_value": 30,
        "description": "Reduce assignment volume by percentage",
    },
    "alternative_assessment": {
        "feature": "assessment_format_options",
        "default_value": ["oral", "project", "portfolio"],
        "description": "Allow alternative assessment formats",
    },
    "assistive_technology": {
        "feature": "assistive_tech_enabled",
        "default_value": True,
        "description": "Enable speech-to-text, dictation, etc.",
    },
    "preferential_seating": {
        "feature": "environment_preference",
        "default_value": "front_center",
        "description": "Notify teacher of seating preference",
    },
    "behaviour_support": {
        "feature": "positive_reinforcement",
        "default_value": True,
        "description": "Enable frequent positive feedback system",
    },
    "social_skills_support": {
        "feature": "social_scaffolding",
        "default_value": True,
        "description": "Enable social scripts and peer support features",
    },
    "sensory_accommodations": {
        "feature": "sensory_profile_active",
        "default_value": True,
        "description": "Apply sensory accommodations from profile",
    },
    "routine_schedule": {
        "feature": "visual_schedule",
        "default_value": True,
        "description": "Display visual daily schedule",
    },
    "transition_warnings": {
        "feature": "transition_timer_minutes",
        "default_value": 5,
        "description": "Show countdown before activity transitions",
    },
    "quiet_space": {
        "feature": "calm_mode_available",
        "default_value": True,
        "description": "Offer low-stimulation mode",
    },
    "communication_aids": {
        "feature": "aac_enabled",
        "default_value": True,
        "description": "Enable augmentative/alternative communication tools",
    },
    "movement_breaks": {
        "feature": "movement_break_interval_minutes",
        "default_value": 20,
        "description": "Scheduled movement break reminders",
    },
    "counselling_access": {
        "feature": "counsellor_chat_enabled",
        "default_value": True,
        "description": "Enable quick access to counsellor messaging",
    },
    "captioning": {
        "feature": "auto_captions",
        "default_value": True,
        "description": "Enable automatic captioning for media",
    },
    "large_print": {
        "feature": "font_scale",
        "default_value": 1.5,
        "description": "Enlarge all text",
    },
    "screen_reader": {
        "feature": "screen_reader_optimised",
        "default_value": True,
        "description": "Optimise UI for screen reader compatibility",
    },
}


# ── Result dataclasses ──────────────────────────────────────────────────

@dataclass
class GoalAnalysis:
    """Analysis of a single IEP goal."""
    goal_id: str
    goal_text: str
    has_condition: bool = False
    has_behaviour: bool = False
    has_criteria: bool = False
    has_timeframe: bool = False
    measurability_score: float = 0.0  # 0–100
    issues: List[str] = field(default_factory=list)
    suggestions: List[str] = field(default_factory=list)


@dataclass
class SectionAnalysis:
    """Analysis of an IDEA-required section."""
    section: str
    present: bool = False
    completeness: float = 0.0  # 0–100
    issues: List[str] = field(default_factory=list)


@dataclass
class IEPAnalysisResult:
    """Full IEP analysis result."""
    quality_score: float = 0.0  # 0–100
    sections: List[SectionAnalysis] = field(default_factory=list)
    goals: List[GoalAnalysis] = field(default_factory=list)
    missing_accommodations: List[str] = field(default_factory=list)
    compliance_issues: List[str] = field(default_factory=list)
    strengths: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)


@dataclass
class LearningImplication:
    """A single platform configuration derived from an IEP."""
    source: str  # IEP accommodation / goal that triggered this
    feature: str  # platform feature key
    value: Any   # configured value
    description: str


@dataclass
class LearningImplicationsResult:
    """All platform implications extracted from an IEP."""
    feature_toggles: List[LearningImplication] = field(default_factory=list)
    path_constraints: List[Dict[str, Any]] = field(default_factory=list)
    scheduling_rules: List[Dict[str, Any]] = field(default_factory=list)
    summary: str = ""


@dataclass
class GoalProgress:
    """Progress of one IEP goal against mastery data."""
    goal_id: str
    goal_text: str
    target_criteria: str
    matched_skills: List[str] = field(default_factory=list)
    current_mastery: float = 0.0  # 0–1
    target_mastery: float = 0.8   # from IEP criteria
    progress_pct: float = 0.0     # 0–100
    on_track: bool = False
    notes: str = ""


@dataclass
class GoalProgressReport:
    """Aggregate progress report for quarterly IEP review."""
    learner_id: str
    report_period: str
    goals: List[GoalProgress] = field(default_factory=list)
    overall_progress_pct: float = 0.0
    goals_on_track: int = 0
    goals_at_risk: int = 0
    recommendations: List[str] = field(default_factory=list)


# ── Main class ──────────────────────────────────────────────────────────

class IEPAnalyzer:
    """
    Analyse IEPs for IDEA compliance, extract learning implications,
    and track goal progress.

    Usage::

        analyzer = IEPAnalyzer()
        result = analyzer.analyze_iep(iep_document)
        implications = analyzer.extract_learning_implications(iep_data)
        report = analyzer.track_goal_progress(iep_goals, mastery_data)
    """

    def __init__(self) -> None:
        logger.info("IEPAnalyzer initialised")

    # ── Public API ──────────────────────────────────────────────────────

    def analyze_iep(self, iep_document: Dict[str, Any]) -> IEPAnalysisResult:
        """
        Analyse an IEP document for completeness and IDEA compliance.

        Parameters
        ----------
        iep_document : dict
            Must contain keys like ``present_levels``, ``annual_goals``,
            ``services``, ``accommodations``, ``disabilities``, etc.

        Returns
        -------
        IEPAnalysisResult
            Quality score, section analyses, goal analyses, missing
            accommodations, compliance issues, and recommendations.
        """
        if not iep_document:
            raise ValueError("IEP document cannot be empty")

        result = IEPAnalysisResult()

        # 1. Check IDEA sections
        result.sections = self._check_sections(iep_document)

        # 2. Analyse goals
        goals = iep_document.get("annual_goals") or iep_document.get("goals", [])
        result.goals = [self._analyze_goal(g, i) for i, g in enumerate(goals)]

        # 3. Check accommodations vs. disabilities
        disabilities = iep_document.get("disabilities", [])
        existing_accommodations = iep_document.get("accommodations", [])
        result.missing_accommodations = self._find_missing_accommodations(
            disabilities, existing_accommodations
        )

        # 4. Compliance issues
        result.compliance_issues = self._check_compliance(iep_document, result)

        # 5. Strengths
        result.strengths = self._identify_strengths(iep_document, result)

        # 6. Recommendations
        result.recommendations = self._generate_recommendations(result)

        # 7. Quality score
        result.quality_score = self._calculate_quality_score(result)

        return result

    def extract_learning_implications(
        self, iep_data: Dict[str, Any]
    ) -> LearningImplicationsResult:
        """
        Translate IEP accommodations and goals into platform actions.

        Returns feature toggles, learning-path constraints, and
        session-scheduling rules.
        """
        if not iep_data:
            raise ValueError("IEP data cannot be empty")

        result = LearningImplicationsResult()

        # Feature toggles from accommodations
        accommodations = iep_data.get("accommodations", [])
        for acc in accommodations:
            acc_key = self._normalize_accommodation(acc)
            mapping = ACCOMMODATION_TO_FEATURE.get(acc_key)
            if mapping:
                result.feature_toggles.append(
                    LearningImplication(
                        source=acc if isinstance(acc, str) else acc.get("name", acc_key),
                        feature=mapping["feature"],
                        value=mapping["default_value"],
                        description=mapping["description"],
                    )
                )

        # Path constraints from goals
        goals = iep_data.get("annual_goals") or iep_data.get("goals", [])
        for goal in goals:
            constraint = self._goal_to_path_constraint(goal)
            if constraint:
                result.path_constraints.append(constraint)

        # Scheduling rules from services
        services = iep_data.get("services", [])
        for svc in services:
            rule = self._service_to_scheduling_rule(svc)
            if rule:
                result.scheduling_rules.append(rule)

        # Summary
        result.summary = (
            f"{len(result.feature_toggles)} feature toggles, "
            f"{len(result.path_constraints)} path constraints, "
            f"{len(result.scheduling_rules)} scheduling rules extracted"
        )

        return result

    def track_goal_progress(
        self,
        iep_goals: List[Dict[str, Any]],
        mastery_data: Dict[str, float],
        learner_id: str = "unknown",
        report_period: str = "current",
    ) -> GoalProgressReport:
        """
        Compare BKT mastery data against IEP goals.

        Parameters
        ----------
        iep_goals : list[dict]
            Each goal has ``goal_id``, ``text``, ``criteria`` (target),
            and ``skill_mappings`` (list of platform skill IDs).
        mastery_data : dict[str, float]
            Mapping of skill_id → mastery probability (0–1).

        Returns
        -------
        GoalProgressReport
        """
        if not iep_goals:
            raise ValueError("IEP goals list cannot be empty")

        report = GoalProgressReport(
            learner_id=learner_id,
            report_period=report_period,
        )

        for goal in iep_goals:
            gp = self._evaluate_goal_progress(goal, mastery_data)
            report.goals.append(gp)
            if gp.on_track:
                report.goals_on_track += 1
            else:
                report.goals_at_risk += 1

        # Overall progress
        if report.goals:
            report.overall_progress_pct = round(
                sum(g.progress_pct for g in report.goals) / len(report.goals), 1
            )

        # Recommendations
        report.recommendations = self._generate_progress_recommendations(report)

        return report

    # ── Section checking ────────────────────────────────────────────────

    def _check_sections(
        self, doc: Dict[str, Any]
    ) -> List[SectionAnalysis]:
        """Check presence and completeness of IDEA-required sections."""
        section_map = {
            IDEASection.PRESENT_LEVELS: "present_levels",
            IDEASection.ANNUAL_GOALS: "annual_goals",
            IDEASection.SPECIAL_EDUCATION_SERVICES: "services",
            IDEASection.SUPPLEMENTARY_AIDS: "supplementary_aids",
            IDEASection.PARTICIPATION_EXTENT: "participation_extent",
            IDEASection.ASSESSMENT_ACCOMMODATIONS: "assessment_accommodations",
            IDEASection.SERVICE_DATES: "service_dates",
            IDEASection.TRANSITION_PLAN: "transition_plan",
        }

        # Fall back to a nested "sections" sub-dict if keys aren't top-level
        sections_sub = doc.get("sections", {})

        results: List[SectionAnalysis] = []
        for section_enum, key in section_map.items():
            value = doc.get(key) or sections_sub.get(key)
            # Also try the IDEA alias names used in common IEP formats
            if value is None:
                for alias in self._section_aliases(key):
                    value = doc.get(alias) or sections_sub.get(alias)
                    if value is not None:
                        break
            present = value is not None and value != "" and value != []
            completeness = 0.0
            issues: List[str] = []

            if present:
                completeness = self._score_section_completeness(
                    section_enum, value
                )
                if completeness < 50:
                    issues.append(
                        f"{section_enum.value} section is incomplete "
                        f"({completeness:.0f}% complete)"
                    )
            else:
                issues.append(
                    f"Missing required IDEA section: {section_enum.value}"
                )

            results.append(
                SectionAnalysis(
                    section=section_enum.value,
                    present=present,
                    completeness=completeness,
                    issues=issues,
                )
            )

        return results

    @staticmethod
    def _section_aliases(key: str) -> List[str]:
        """Return common aliases for IDEA section keys."""
        aliases: Dict[str, List[str]] = {
            "services": ["special_education_services"],
            "supplementary_aids": ["accommodations_modifications"],
            "participation_extent": ["participation_in_assessments"],
            "assessment_accommodations": ["participation_in_assessments"],
            "service_dates": [],
            "transition_plan": ["transition_planning"],
        }
        return aliases.get(key, [])

    def _score_section_completeness(
        self, section: IDEASection, value: Any
    ) -> float:
        """Heuristic completeness score for a section."""
        if isinstance(value, list):
            return min(100.0, len(value) * 25.0)  # 4+ items = 100 %
        if isinstance(value, dict):
            filled = sum(1 for v in value.values() if v)
            total = max(len(value), 1)
            return round(filled / total * 100, 1)
        if isinstance(value, str):
            word_count = len(value.split())
            return min(100.0, word_count / 50 * 100)  # 50+ words = 100 %
        return 50.0  # unknown shape — assume half

    # ── Goal analysis ───────────────────────────────────────────────────

    def _analyze_goal(
        self, goal: Dict[str, Any], index: int
    ) -> GoalAnalysis:
        """Analyse a single IEP goal for measurability."""
        goal_id = goal.get("goal_id", f"goal_{index + 1}")
        goal_text = goal.get("text", goal.get("description", ""))

        analysis = GoalAnalysis(goal_id=goal_id, goal_text=goal_text)

        if not goal_text:
            analysis.issues.append("Goal text is empty")
            return analysis

        text_lower = goal_text.lower()

        # Condition: "Given …", "When …", "During …"
        condition_patterns = [
            r"\bgiven\b", r"\bwhen\b", r"\bduring\b",
            r"\bprovided\b", r"\busing\b", r"\bwith\b",
        ]
        analysis.has_condition = any(
            re.search(p, text_lower) for p in condition_patterns
        )
        if not analysis.has_condition:
            analysis.issues.append("Missing condition (e.g. 'Given …')")
            analysis.suggestions.append(
                "Add a condition describing the context "
                "(e.g. 'Given grade-level text, ...')"
            )

        # Behaviour: action verbs
        behaviour_verbs = [
            r"\bwill\s+\w+", r"\bidentif", r"\bread\b", r"\bwrite\b",
            r"\bsolve\b", r"\bcompute\b", r"\bexplain\b", r"\bdescribe\b",
            r"\bdemonstrate\b", r"\bcomplete\b", r"\buse\b", r"\bapply\b",
        ]
        analysis.has_behaviour = any(
            re.search(p, text_lower) for p in behaviour_verbs
        )
        if not analysis.has_behaviour:
            analysis.issues.append("Missing observable behaviour")
            analysis.suggestions.append(
                "Include a measurable action verb "
                "(e.g. 'will identify', 'will solve')"
            )

        # Criteria: percentages, fractions, counts
        criteria_patterns = [
            r"\d+\s*%", r"\d+\s*out\s*of\s*\d+", r"\d+/\d+",
            r"\baccuracy\b", r"\bcorrect\b", r"\bindependently\b",
            r"\b\d+\s*consecutive\b",
        ]
        analysis.has_criteria = any(
            re.search(p, text_lower) for p in criteria_patterns
        )
        if not analysis.has_criteria:
            analysis.issues.append("Missing measurable criteria")
            analysis.suggestions.append(
                "Add success criteria "
                "(e.g. 'with 80% accuracy', '4 out of 5 trials')"
            )

        # Timeframe: dates, weeks, grading period
        timeframe_patterns = [
            r"\bby\s+\w+\s+\d{4}", r"\bwithin\s+\d+", r"\bweeks?\b",
            r"\bmonths?\b", r"\bgrading\s+period\b", r"\bquarter\b",
            r"\bsemester\b", r"\byear\b", r"\bannual\b",
        ]
        analysis.has_timeframe = any(
            re.search(p, text_lower) for p in timeframe_patterns
        )
        if not analysis.has_timeframe:
            analysis.issues.append("Missing timeframe")
            analysis.suggestions.append(
                "Add a timeframe "
                "(e.g. 'by the end of the grading period')"
            )

        # Score
        components = [
            analysis.has_condition,
            analysis.has_behaviour,
            analysis.has_criteria,
            analysis.has_timeframe,
        ]
        analysis.measurability_score = round(
            sum(components) / len(components) * 100, 1
        )

        return analysis

    # ── Accommodation gap detection ─────────────────────────────────────

    def _find_missing_accommodations(
        self,
        disabilities: List[str],
        existing: List[Any],
    ) -> List[str]:
        """Identify recommended accommodations not present in the IEP."""
        existing_normalized = {
            self._normalize_accommodation(a) for a in existing
        }

        missing: List[str] = []
        for disability in disabilities:
            disability_key = self._normalize_disability(disability)
            recommended = DISABILITY_ACCOMMODATIONS.get(disability_key, [])
            for rec in recommended:
                if rec not in existing_normalized and rec not in missing:
                    missing.append(rec)

        return missing

    def _normalize_accommodation(self, acc: Any) -> str:
        """Normalise an accommodation entry to a lookup key."""
        if isinstance(acc, dict):
            text = acc.get("name", acc.get("type", ""))
        else:
            text = str(acc)
        return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")

    def _normalize_disability(self, disability: str) -> str:
        """Normalise a disability name to a lookup key."""
        text = disability.lower().replace("-", "_").replace(" ", "_")
        # Map common aliases
        aliases = {
            "adhd": "other_health_impairment",
            "adhd_combined": "other_health_impairment",
            "adhd_inattentive": "other_health_impairment",
            "adhd_hyperactive": "other_health_impairment",
            "dyslexia": "specific_learning_disability",
            "dyscalculia": "specific_learning_disability",
            "dysgraphia": "specific_learning_disability",
            "asd": "autism",
            "autism_spectrum": "autism",
            "anxiety": "emotional_disturbance",
            "depression": "emotional_disturbance",
            "odd": "emotional_disturbance",
        }
        return aliases.get(text, text)

    # ── Compliance checks ───────────────────────────────────────────────

    def _check_compliance(
        self,
        doc: Dict[str, Any],
        result: IEPAnalysisResult,
    ) -> List[str]:
        """Generate compliance issue list."""
        issues: List[str] = []

        # Missing sections
        for s in result.sections:
            if not s.present:
                issues.append(f"IDEA violation: {s.section} section missing")

        # Unmeasurable goals
        for g in result.goals:
            if g.measurability_score < 50:
                issues.append(
                    f"Goal '{g.goal_id}' is not measurable "
                    f"(score {g.measurability_score}%)"
                )

        # No goals at all
        if not result.goals:
            issues.append("IEP has no annual goals defined")

        # Transition plan required for age 16+
        student_age = doc.get("student_age", 0)
        has_transition = any(
            s.section == IDEASection.TRANSITION_PLAN.value and s.present
            for s in result.sections
        )
        if student_age >= 16 and not has_transition:
            issues.append(
                "Transition plan required for students age 16+ (IDEA §300.320(b))"
            )

        return issues

    # ── Strengths identification ────────────────────────────────────────

    def _identify_strengths(
        self,
        doc: Dict[str, Any],
        result: IEPAnalysisResult,
    ) -> List[str]:
        """Identify positive aspects of the IEP."""
        strengths: List[str] = []

        present_count = sum(1 for s in result.sections if s.present)
        if present_count == len(result.sections):
            strengths.append("All IDEA-required sections are present")
        elif present_count >= 6:
            strengths.append(
                f"{present_count}/8 IDEA-required sections present"
            )

        measurable_goals = [
            g for g in result.goals if g.measurability_score >= 75
        ]
        if measurable_goals:
            strengths.append(
                f"{len(measurable_goals)}/{len(result.goals)} goals "
                "are well-measurable"
            )

        if doc.get("accommodations"):
            strengths.append(
                f"{len(doc['accommodations'])} accommodations documented"
            )

        if doc.get("services"):
            strengths.append("Special education services specified")

        return strengths

    # ── Recommendations ─────────────────────────────────────────────────

    def _generate_recommendations(
        self, result: IEPAnalysisResult
    ) -> List[str]:
        """Generate actionable recommendations."""
        recs: List[str] = []

        # Missing sections
        missing_sections = [s for s in result.sections if not s.present]
        if missing_sections:
            names = ", ".join(s.section for s in missing_sections)
            recs.append(f"Add missing IDEA sections: {names}")

        # Low-measurability goals
        weak_goals = [g for g in result.goals if g.measurability_score < 75]
        if weak_goals:
            recs.append(
                f"Revise {len(weak_goals)} goal(s) to include "
                "condition + behaviour + criteria + timeframe"
            )

        # Missing accommodations
        if result.missing_accommodations:
            recs.append(
                "Consider adding accommodations: "
                + ", ".join(result.missing_accommodations[:5])
            )

        return recs

    # ── Quality scoring ─────────────────────────────────────────────────

    def _calculate_quality_score(
        self, result: IEPAnalysisResult
    ) -> float:
        """
        Composite quality score (0–100).

        Weights:
        - Section completeness: 30 %
        - Goal measurability:   30 %
        - Accommodation coverage: 20 %
        - Compliance (no issues): 20 %
        """
        # Section score
        if result.sections:
            section_score = sum(
                s.completeness for s in result.sections
            ) / len(result.sections)
        else:
            section_score = 0.0

        # Goal score
        if result.goals:
            goal_score = sum(
                g.measurability_score for g in result.goals
            ) / len(result.goals)
        else:
            goal_score = 0.0

        # Accommodation gap penalty
        gap_count = len(result.missing_accommodations)
        accommodation_score = max(0.0, 100.0 - gap_count * 12.5)

        # Compliance score
        issue_count = len(result.compliance_issues)
        compliance_score = max(0.0, 100.0 - issue_count * 15.0)

        quality = (
            section_score * 0.30
            + goal_score * 0.30
            + accommodation_score * 0.20
            + compliance_score * 0.20
        )

        return round(min(100.0, max(0.0, quality)), 1)

    # ── Learning-implication helpers ────────────────────────────────────

    def _goal_to_path_constraint(
        self, goal: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Map an IEP goal to a learning-path constraint."""
        skill_area = goal.get("skill_area", goal.get("domain", ""))
        if not skill_area:
            return None

        return {
            "goal_id": goal.get("goal_id", ""),
            "skill_area": skill_area,
            "target_mastery": goal.get("criteria", {}).get("target", 0.8),
            "priority": goal.get("priority", "standard"),
            "constraint": "ensure_coverage",
            "description": (
                f"Learning path must include content for '{skill_area}' "
                f"to support IEP goal"
            ),
        }

    def _service_to_scheduling_rule(
        self, service: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Map an IEP service entry to a scheduling rule."""
        service_type = service.get("type", service.get("name", ""))
        minutes_per_week = service.get("minutes_per_week", 0)
        if not service_type or not minutes_per_week:
            return None

        return {
            "service_type": service_type,
            "minutes_per_week": minutes_per_week,
            "frequency": service.get("frequency", "weekly"),
            "provider": service.get("provider", "special_education_teacher"),
            "constraint": "reserve_time",
            "description": (
                f"Reserve {minutes_per_week} min/week for {service_type}"
            ),
        }

    # ── Goal-progress helpers ───────────────────────────────────────────

    def _evaluate_goal_progress(
        self,
        goal: Dict[str, Any],
        mastery_data: Dict[str, float],
    ) -> GoalProgress:
        """Evaluate progress of a single IEP goal against mastery data."""
        goal_id = goal.get("goal_id", "")
        goal_text = goal.get("text", "")
        criteria = goal.get("criteria", {})
        target = criteria.get("target", 0.8) if isinstance(criteria, dict) else 0.8
        skill_mappings = goal.get("skill_mappings", [])

        gp = GoalProgress(
            goal_id=goal_id,
            goal_text=goal_text,
            target_criteria=str(criteria),
            target_mastery=target,
            matched_skills=skill_mappings,
        )

        if not skill_mappings:
            gp.notes = "No platform skills mapped to this goal"
            return gp

        # Average mastery across mapped skills
        mastery_values = [
            mastery_data.get(skill, 0.0) for skill in skill_mappings
        ]
        gp.current_mastery = round(
            sum(mastery_values) / len(mastery_values), 3
        )

        # Progress as percentage of target
        if target > 0:
            gp.progress_pct = round(
                min(100.0, gp.current_mastery / target * 100), 1
            )
        gp.on_track = gp.progress_pct >= 60  # at least 60 % toward target

        if not gp.on_track:
            gp.notes = (
                f"Behind target: {gp.current_mastery:.0%} mastery vs "
                f"{target:.0%} target ({gp.progress_pct:.0f}% progress)"
            )

        return gp

    def _generate_progress_recommendations(
        self, report: GoalProgressReport
    ) -> List[str]:
        """Generate recommendations from goal-progress data."""
        recs: List[str] = []

        at_risk = [g for g in report.goals if not g.on_track]
        if at_risk:
            recs.append(
                f"{len(at_risk)} goal(s) at risk — consider "
                "increasing instructional intensity"
            )

        unmapped = [g for g in report.goals if not g.matched_skills]
        if unmapped:
            recs.append(
                f"{len(unmapped)} goal(s) have no mapped platform skills — "
                "skill mapping needed for accurate tracking"
            )

        strong = [g for g in report.goals if g.progress_pct >= 90]
        if strong:
            recs.append(
                f"{len(strong)} goal(s) near mastery — consider "
                "advancing to more challenging objectives"
            )

        return recs
