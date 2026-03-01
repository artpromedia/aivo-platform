"""
Differentiation Engine

Generates content-differentiation strategies tailored to individual
learner profiles and IEP requirements.

Strategies available:
- TIERED instruction (same concept, varying complexity)
- FLEXIBLE GROUPING (skill-based, interest-based, mixed-ability)
- COMPACTING (pre-test → skip mastered content → enrichment)
- INTEREST CENTERS (learner-chosen exploration paths)
- SCAFFOLDED (graduated support removal)
- MULTI-SENSORY (visual + auditory + kinesthetic channels)

Also generates teacher implementation guides with step-by-step
instructions per strategy.
"""
import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


# ── Strategy Definitions ────────────────────────────────────────────────

class StrategyType(Enum):
    """Available differentiation strategies."""
    TIERED = "tiered"
    FLEXIBLE_GROUPING = "flexible_grouping"
    COMPACTING = "compacting"
    INTEREST_CENTERS = "interest_centers"
    SCAFFOLDED = "scaffolded"
    MULTI_SENSORY = "multi_sensory"


class ContentDimension(Enum):
    """Dimensions along which content can be differentiated."""
    COMPLEXITY = "complexity"       # Bloom's taxonomy level
    ABSTRACTNESS = "abstractness"   # concrete → abstract
    DEPTH = "depth"                 # surface → deep understanding
    PACE = "pace"                   # speed of progression
    MODALITY = "modality"           # visual / auditory / kinesthetic
    SUPPORT_LEVEL = "support_level" # independent → heavily scaffolded


class GroupingStrategy(Enum):
    """Grouping approaches for flexible grouping."""
    SKILL_BASED = "skill_based"
    INTEREST_BASED = "interest_based"
    MIXED_ABILITY = "mixed_ability"
    RANDOM = "random"
    COOPERATIVE = "cooperative"


class TierLevel(Enum):
    """Tier levels for tiered instruction."""
    APPROACHING = "approaching"    # below grade level
    ON_LEVEL = "on_level"          # at grade level
    ADVANCED = "advanced"          # above grade level


# ── Result Dataclasses ──────────────────────────────────────────────────

@dataclass
class TieredContent:
    """Content adapted for a specific tier."""
    tier: str
    complexity_level: str
    content_modifications: List[str] = field(default_factory=list)
    support_structures: List[str] = field(default_factory=list)
    assessment_adjustments: List[str] = field(default_factory=list)
    sample_activities: List[str] = field(default_factory=list)


@dataclass
class GroupingPlan:
    """A grouping arrangement for flexible grouping."""
    strategy: str
    rationale: str
    group_count: int = 3
    rotation_interval_minutes: int = 20
    group_descriptions: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class CompactingPlan:
    """Plan for curriculum compacting."""
    pretest_skills: List[str] = field(default_factory=list)
    mastered_content: List[str] = field(default_factory=list)
    skip_sections: List[str] = field(default_factory=list)
    enrichment_activities: List[str] = field(default_factory=list)
    acceleration_options: List[str] = field(default_factory=list)


@dataclass
class InterestCenter:
    """An interest-based exploration center."""
    name: str
    description: str
    learning_objectives: List[str] = field(default_factory=list)
    activities: List[str] = field(default_factory=list)
    materials: List[str] = field(default_factory=list)
    duration_minutes: int = 30


@dataclass
class ScaffoldLevel:
    """A level in a scaffolded support sequence."""
    level: int
    support_type: str
    description: str
    when_to_use: str
    fade_criteria: str


@dataclass
class MultiSensoryPlan:
    """Multi-sensory instructional plan."""
    visual_activities: List[str] = field(default_factory=list)
    auditory_activities: List[str] = field(default_factory=list)
    kinesthetic_activities: List[str] = field(default_factory=list)
    combined_activities: List[str] = field(default_factory=list)


@dataclass
class DifferentiationResult:
    """Complete differentiation output."""
    strategy_type: str
    content_area: str
    learner_summary: str
    tiered_content: Optional[List[TieredContent]] = None
    grouping_plan: Optional[GroupingPlan] = None
    compacting_plan: Optional[CompactingPlan] = None
    interest_centers: Optional[List[InterestCenter]] = None
    scaffold_levels: Optional[List[ScaffoldLevel]] = None
    multi_sensory_plan: Optional[MultiSensoryPlan] = None
    accommodations_applied: List[str] = field(default_factory=list)
    implementation_notes: List[str] = field(default_factory=list)


@dataclass
class TeacherGuide:
    """Step-by-step teacher implementation guide."""
    lesson_title: str
    strategy_used: str
    preparation_steps: List[str] = field(default_factory=list)
    implementation_steps: List[str] = field(default_factory=list)
    monitoring_checklist: List[str] = field(default_factory=list)
    adjustment_triggers: List[str] = field(default_factory=list)
    reflection_prompts: List[str] = field(default_factory=list)


@dataclass
class ClassDiversityAnalysis:
    """Analysis of learning diversity within a class."""
    total_students: int = 0
    skill_distribution: Dict[str, int] = field(default_factory=dict)
    iep_count: int = 0
    ell_count: int = 0
    gifted_count: int = 0
    disability_categories: List[str] = field(default_factory=list)
    diversity_score: float = 0.0   # 0–100 (higher = more diverse)
    primary_challenges: List[str] = field(default_factory=list)


@dataclass
class DifferentiationSuggestion:
    """Strategy suggestion for a teacher."""
    strategy: str
    priority: str          # high / medium / low
    rationale: str
    implementation_guide: TeacherGuide
    estimated_prep_minutes: int = 0
    evidence_base: str = ""


@dataclass
class SuggestionResult:
    """Full suggestion output for a lesson plan + class profiles."""
    class_analysis: ClassDiversityAnalysis
    suggestions: List[DifferentiationSuggestion] = field(default_factory=list)
    summary: str = ""


# ── Strategy Templates ──────────────────────────────────────────────────

TIERED_TEMPLATES: Dict[str, Dict[str, Any]] = {
    "approaching": {
        "complexity": "concrete, single-step",
        "support": [
            "Graphic organisers provided",
            "Sentence starters / frames",
            "Vocabulary pre-teaching",
            "Worked examples available",
            "Frequent check-ins",
        ],
        "assessment": [
            "Reduced number of items",
            "Multiple-choice or matching formats",
            "Oral demonstration option",
        ],
    },
    "on_level": {
        "complexity": "grade-level, multi-step",
        "support": [
            "Reference materials available",
            "Peer collaboration encouraged",
            "Self-check rubrics",
        ],
        "assessment": [
            "Standard grade-level assessment",
            "Short constructed response",
        ],
    },
    "advanced": {
        "complexity": "abstract, open-ended",
        "support": [
            "Independent research opportunities",
            "Cross-curricular connections",
            "Mentor text analysis",
        ],
        "assessment": [
            "Extended response / essay",
            "Project-based demonstration",
            "Peer teaching component",
        ],
    },
}

SCAFFOLD_TEMPLATES: List[Dict[str, str]] = [
    {
        "support_type": "full_model",
        "description": "Teacher demonstrates entire process",
        "when_to_use": "Introducing new concept, student cannot begin independently",
        "fade_criteria": "Student can identify steps with prompting",
    },
    {
        "support_type": "guided_practice",
        "description": "Teacher and student work through examples together",
        "when_to_use": "Student recognises steps but cannot execute independently",
        "fade_criteria": "Student completes with minimal teacher input",
    },
    {
        "support_type": "collaborative",
        "description": "Student works with peers, teacher monitors",
        "when_to_use": "Student can execute with peer support",
        "fade_criteria": "Student can explain process to peers",
    },
    {
        "support_type": "independent_with_checklist",
        "description": "Student works alone using checklist / rubric",
        "when_to_use": "Student can complete but may skip steps",
        "fade_criteria": "Student self-corrects without checklist",
    },
    {
        "support_type": "independent",
        "description": "Student works fully independently",
        "when_to_use": "Student demonstrates consistent mastery",
        "fade_criteria": "Maintained over 3+ sessions",
    },
]

MULTI_SENSORY_ACTIVITIES: Dict[str, List[str]] = {
    "visual": [
        "Colour-coded notes and highlights",
        "Graphic organisers and mind maps",
        "Diagrams, charts, and infographics",
        "Video demonstrations",
        "Anchor charts and posters",
    ],
    "auditory": [
        "Think-aloud protocols",
        "Partner discussions",
        "Audio recordings of key concepts",
        "Songs or mnemonics",
        "Read-aloud with discussion",
    ],
    "kinesthetic": [
        "Hands-on manipulatives",
        "Movement-based activities",
        "Role-play and simulations",
        "Interactive whiteboard tasks",
        "Gallery walks",
    ],
}


# ── Accommodation-to-content-modification mapping ──────────────────────

ACCOMMODATION_CONTENT_MODS: Dict[str, List[str]] = {
    "extended_time": ["Allow extra processing time", "Reduce time pressure in activities"],
    "simplified_language": ["Use shorter sentences", "Pre-teach vocabulary", "Provide glossary"],
    "visual_supports": ["Add diagrams", "Use colour coding", "Provide graphic organisers"],
    "audio_supports": ["Offer text-to-speech", "Provide audio instructions", "Allow verbal responses"],
    "reduced_workload": ["Fewer problems/questions", "Focus on essential skills only"],
    "frequent_breaks": ["Chunk activities into 10-15 min segments", "Include movement breaks"],
    "assistive_technology": ["Allow speech-to-text", "Provide calculator access"],
    "behaviour_support": ["Use positive reinforcement schedule", "Provide behaviour checklist"],
    "sensory_accommodations": ["Reduce visual clutter", "Offer noise-reducing options"],
    "social_skills_support": ["Structure peer interactions", "Provide conversation scripts"],
}


# ── Main Class ──────────────────────────────────────────────────────────

class DifferentiationEngine:
    """
    Generates differentiated content and teacher guides.

    Usage::

        engine = DifferentiationEngine()

        result = engine.differentiate_content(
            content={"topic": "Fractions", "grade": 5},
            learner_profile={"reading_level": 3, "diagnoses": ["ADHD"]},
            iep_data={"accommodations": ["extended_time", "visual_supports"]},
        )

        suggestions = engine.suggest_differentiation(
            lesson_plan={"title": "Intro to Fractions", "grade": 5},
            class_profiles=[...],
        )
    """

    def __init__(self) -> None:
        logger.info("DifferentiationEngine initialised")

    # ── Public API ──────────────────────────────────────────────────────

    def differentiate_content(
        self,
        content: Dict[str, Any],
        learner_profile: Dict[str, Any],
        iep_data: Optional[Dict[str, Any]] = None,
        strategy: Optional[str] = None,
    ) -> DifferentiationResult:
        """
        Generate differentiated content for a single learner.

        Parameters
        ----------
        content : dict
            Keys: ``topic``, ``grade``, ``subject``, ``objectives``, etc.
        learner_profile : dict
            Keys: ``reading_level``, ``skill_level``, ``diagnoses``,
            ``interests``, ``learning_style``, etc.
        iep_data : dict, optional
            IEP accommodations and goals if applicable.
        strategy : str, optional
            Force a specific strategy. If None, auto-selects based on
            learner profile.

        Returns
        -------
        DifferentiationResult
        """
        if not content:
            raise ValueError("Content cannot be empty")
        if not learner_profile:
            raise ValueError("Learner profile cannot be empty")

        strategy_type = strategy or self._select_strategy(
            learner_profile, iep_data
        )

        # Build learner summary
        learner_summary = self._build_learner_summary(learner_profile)

        result = DifferentiationResult(
            strategy_type=strategy_type,
            content_area=content.get("topic", content.get("subject", "unknown")),
            learner_summary=learner_summary,
        )

        # Apply IEP accommodations
        if iep_data:
            result.accommodations_applied = self._apply_accommodations(
                iep_data.get("accommodations", [])
            )

        # Generate strategy-specific content
        if strategy_type == StrategyType.TIERED.value:
            result.tiered_content = self._generate_tiered(
                content, learner_profile
            )
        elif strategy_type == StrategyType.FLEXIBLE_GROUPING.value:
            result.grouping_plan = self._generate_grouping(
                content, learner_profile
            )
        elif strategy_type == StrategyType.COMPACTING.value:
            result.compacting_plan = self._generate_compacting(
                content, learner_profile
            )
        elif strategy_type == StrategyType.INTEREST_CENTERS.value:
            result.interest_centers = self._generate_interest_centers(
                content, learner_profile
            )
        elif strategy_type == StrategyType.SCAFFOLDED.value:
            result.scaffold_levels = self._generate_scaffolding(content)
        elif strategy_type == StrategyType.MULTI_SENSORY.value:
            result.multi_sensory_plan = self._generate_multi_sensory(content)

        # Implementation notes
        result.implementation_notes = self._generate_implementation_notes(
            strategy_type, learner_profile, iep_data
        )

        return result

    def suggest_differentiation(
        self,
        lesson_plan: Dict[str, Any],
        class_profiles: List[Dict[str, Any]],
    ) -> SuggestionResult:
        """
        Analyse class diversity and suggest differentiation strategies
        for a lesson plan.

        Parameters
        ----------
        lesson_plan : dict
            Keys: ``title``, ``grade``, ``subject``, ``objectives``,
            ``duration_minutes``, ``activities``.
        class_profiles : list[dict]
            Per-student dicts with ``student_id``, ``reading_level``,
            ``skill_level``, ``diagnoses``, ``iep``, ``ell``, ``gifted``.

        Returns
        -------
        SuggestionResult
        """
        if not lesson_plan:
            raise ValueError("Lesson plan cannot be empty")
        if not class_profiles:
            raise ValueError("Class profiles cannot be empty")

        # Analyse class diversity
        analysis = self._analyze_class_diversity(class_profiles)

        # Generate suggestions
        suggestions = self._generate_suggestions(lesson_plan, analysis)

        summary = (
            f"{len(suggestions)} differentiation strategies suggested "
            f"for a class of {analysis.total_students} students "
            f"(diversity score: {analysis.diversity_score:.0f}/100)"
        )

        return SuggestionResult(
            class_analysis=analysis,
            suggestions=suggestions,
            summary=summary,
        )

    # ── Strategy selection ──────────────────────────────────────────────

    def _select_strategy(
        self,
        profile: Dict[str, Any],
        iep_data: Optional[Dict[str, Any]],
    ) -> str:
        """Auto-select the best differentiation strategy."""
        skill_level = profile.get("skill_level", "on_level")
        reading_level = profile.get("reading_level")
        grade = profile.get("grade", 5)
        diagnoses = profile.get("diagnoses", [])
        learning_style = profile.get("learning_style", "")

        # Sensory-heavy learner → multi-sensory
        if learning_style in ("kinesthetic", "tactile"):
            return StrategyType.MULTI_SENSORY.value

        # Far below grade level → scaffolded
        if reading_level and grade and reading_level <= grade - 2:
            return StrategyType.SCAFFOLDED.value

        # Has IEP with accommodations → tiered
        if iep_data and iep_data.get("accommodations"):
            return StrategyType.TIERED.value

        # High-performer → compacting
        if skill_level in ("advanced", "gifted"):
            return StrategyType.COMPACTING.value

        # Has interests specified → interest centers
        if profile.get("interests"):
            return StrategyType.INTEREST_CENTERS.value

        # Default → tiered
        return StrategyType.TIERED.value

    # ── Tiered content generation ───────────────────────────────────────

    def _generate_tiered(
        self,
        content: Dict[str, Any],
        profile: Dict[str, Any],
    ) -> List[TieredContent]:
        """Generate three tiers of content."""
        topic = content.get("topic", "the topic")
        tiers: List[TieredContent] = []

        for tier_key, template in TIERED_TEMPLATES.items():
            tier = TieredContent(
                tier=tier_key,
                complexity_level=template["complexity"],
                content_modifications=[
                    f"Adapt {topic} content to {template['complexity']} level",
                    f"Use {tier_key}-appropriate vocabulary",
                ],
                support_structures=list(template["support"]),
                assessment_adjustments=list(template["assessment"]),
                sample_activities=[
                    f"{tier_key.replace('_', ' ').title()}: "
                    f"Explore {topic} through {template['complexity']} tasks"
                ],
            )
            tiers.append(tier)

        return tiers

    # ── Grouping plan ───────────────────────────────────────────────────

    def _generate_grouping(
        self,
        content: Dict[str, Any],
        profile: Dict[str, Any],
    ) -> GroupingPlan:
        """Generate a flexible grouping plan."""
        interests = profile.get("interests", [])
        strategy = (
            GroupingStrategy.INTEREST_BASED.value
            if interests
            else GroupingStrategy.SKILL_BASED.value
        )

        groups = []
        if strategy == GroupingStrategy.SKILL_BASED.value:
            groups = [
                {
                    "name": "Support Group",
                    "description": "Students needing additional support",
                    "activity_focus": "Guided practice with teacher",
                },
                {
                    "name": "Practice Group",
                    "description": "Students at grade level",
                    "activity_focus": "Collaborative problem-solving",
                },
                {
                    "name": "Extension Group",
                    "description": "Students ready for challenge",
                    "activity_focus": "Independent exploration / projects",
                },
            ]
        else:
            groups = [
                {
                    "name": f"Interest Group {i + 1}",
                    "description": f"Focus: {interest}",
                    "activity_focus": f"Explore topic through {interest}",
                }
                for i, interest in enumerate(interests[:4])
            ]

        return GroupingPlan(
            strategy=strategy,
            rationale=f"Selected {strategy} based on learner profile",
            group_count=len(groups),
            rotation_interval_minutes=20,
            group_descriptions=groups,
        )

    # ── Compacting plan ─────────────────────────────────────────────────

    def _generate_compacting(
        self,
        content: Dict[str, Any],
        profile: Dict[str, Any],
    ) -> CompactingPlan:
        """Generate a curriculum compacting plan."""
        objectives = content.get("objectives", [])
        topic = content.get("topic", "the topic")

        return CompactingPlan(
            pretest_skills=[
                f"Assess mastery of {obj}" for obj in objectives[:5]
            ] if objectives else [f"Pre-assess {topic} foundational skills"],
            mastered_content=[
                "Content the student has already demonstrated mastery of"
            ],
            skip_sections=[
                "Sections covering already-mastered skills (determined by pre-test)"
            ],
            enrichment_activities=[
                f"Independent research project on advanced {topic} concepts",
                f"Cross-curricular connection: {topic} in real-world contexts",
                "Mentor/peer teaching opportunity",
                "Create a presentation or product demonstrating deep understanding",
            ],
            acceleration_options=[
                "Move to next unit's concepts early",
                "Explore related higher-grade-level standards",
                "Participate in enrichment cluster or competition",
            ],
        )

    # ── Interest centers ────────────────────────────────────────────────

    def _generate_interest_centers(
        self,
        content: Dict[str, Any],
        profile: Dict[str, Any],
    ) -> List[InterestCenter]:
        """Generate interest-based exploration centers."""
        topic = content.get("topic", "the topic")
        interests = profile.get("interests", ["science", "art", "technology"])

        centers: List[InterestCenter] = []
        for interest in interests[:4]:
            centers.append(
                InterestCenter(
                    name=f"{interest.title()} Explorer",
                    description=(
                        f"Explore {topic} through the lens of {interest}"
                    ),
                    learning_objectives=[
                        f"Understand {topic} concepts through {interest}",
                        f"Make connections between {topic} and {interest}",
                    ],
                    activities=[
                        f"Create a {interest}-themed project about {topic}",
                        f"Research how {topic} relates to {interest}",
                        f"Present findings using {interest} medium",
                    ],
                    materials=[
                        f"{interest}-related reference materials",
                        "Project planning template",
                        "Reflection journal",
                    ],
                    duration_minutes=30,
                )
            )

        return centers

    # ── Scaffolding ─────────────────────────────────────────────────────

    def _generate_scaffolding(
        self, content: Dict[str, Any]
    ) -> List[ScaffoldLevel]:
        """Generate graduated scaffold levels."""
        return [
            ScaffoldLevel(
                level=i + 1,
                support_type=t["support_type"],
                description=t["description"],
                when_to_use=t["when_to_use"],
                fade_criteria=t["fade_criteria"],
            )
            for i, t in enumerate(SCAFFOLD_TEMPLATES)
        ]

    # ── Multi-sensory ───────────────────────────────────────────────────

    def _generate_multi_sensory(
        self, content: Dict[str, Any]
    ) -> MultiSensoryPlan:
        """Generate multi-sensory instructional plan."""
        topic = content.get("topic", "the topic")

        return MultiSensoryPlan(
            visual_activities=[
                f"{a} for {topic}" for a in MULTI_SENSORY_ACTIVITIES["visual"]
            ],
            auditory_activities=[
                f"{a} for {topic}"
                for a in MULTI_SENSORY_ACTIVITIES["auditory"]
            ],
            kinesthetic_activities=[
                f"{a} for {topic}"
                for a in MULTI_SENSORY_ACTIVITIES["kinesthetic"]
            ],
            combined_activities=[
                f"Multi-modal station rotation: visual → auditory → kinesthetic for {topic}",
                f"Create a {topic} study guide using all three modalities",
            ],
        )

    # ── Accommodations application ──────────────────────────────────────

    def _apply_accommodations(
        self, accommodations: List[Any]
    ) -> List[str]:
        """Collect content modifications from IEP accommodations."""
        applied: List[str] = []
        for acc in accommodations:
            key = acc if isinstance(acc, str) else acc.get("name", "")
            key_norm = key.lower().replace(" ", "_").replace("-", "_")
            mods = ACCOMMODATION_CONTENT_MODS.get(key_norm, [])
            applied.extend(mods)
        return applied

    # ── Implementation notes ────────────────────────────────────────────

    def _generate_implementation_notes(
        self,
        strategy_type: str,
        profile: Dict[str, Any],
        iep_data: Optional[Dict[str, Any]],
    ) -> List[str]:
        """Generate practical implementation notes."""
        notes: List[str] = []

        notes.append(
            f"Strategy selected: {strategy_type.replace('_', ' ').title()}"
        )

        diagnoses = profile.get("diagnoses", [])
        if diagnoses:
            notes.append(
                f"Consider needs related to: {', '.join(diagnoses)}"
            )

        if iep_data:
            goal_count = len(iep_data.get("annual_goals", []))
            if goal_count:
                notes.append(
                    f"Align activities with {goal_count} IEP goal(s)"
                )

        notes.append(
            "Monitor student response and adjust difficulty as needed"
        )
        notes.append(
            "Document differentiation decisions for IEP progress reports"
        )

        return notes

    # ── Learner summary ─────────────────────────────────────────────────

    def _build_learner_summary(self, profile: Dict[str, Any]) -> str:
        """Build a human-readable learner summary."""
        parts: List[str] = []

        skill = profile.get("skill_level", "unknown")
        parts.append(f"Skill level: {skill}")

        reading = profile.get("reading_level")
        grade = profile.get("grade")
        if reading and grade:
            diff = reading - grade
            if diff < -1:
                parts.append(f"Reading {abs(diff)} levels below grade")
            elif diff > 1:
                parts.append(f"Reading {diff} levels above grade")
            else:
                parts.append("Reading near grade level")

        diagnoses = profile.get("diagnoses", [])
        if diagnoses:
            parts.append(f"Diagnoses: {', '.join(diagnoses)}")

        interests = profile.get("interests", [])
        if interests:
            parts.append(f"Interests: {', '.join(interests[:3])}")

        return "; ".join(parts)

    # ── Class diversity analysis ────────────────────────────────────────

    def _analyze_class_diversity(
        self, profiles: List[Dict[str, Any]]
    ) -> ClassDiversityAnalysis:
        """Analyse the diversity of a class."""
        analysis = ClassDiversityAnalysis(total_students=len(profiles))

        skill_counts: Dict[str, int] = {}
        disabilities: set = set()

        for p in profiles:
            # Skill distribution
            skill = p.get("skill_level", "unknown")
            skill_counts[skill] = skill_counts.get(skill, 0) + 1

            # IEP count
            if p.get("iep"):
                analysis.iep_count += 1

            # ELL count
            if p.get("ell"):
                analysis.ell_count += 1

            # Gifted count
            if p.get("gifted"):
                analysis.gifted_count += 1

            # Disability categories
            for d in p.get("diagnoses", []):
                disabilities.add(d)

        analysis.skill_distribution = skill_counts
        analysis.disability_categories = sorted(disabilities)

        # Diversity score (0–100)
        factors = [
            min(1.0, len(skill_counts) / 3) * 25,  # skill variety
            min(1.0, analysis.iep_count / max(len(profiles), 1) * 5) * 25,
            min(1.0, analysis.ell_count / max(len(profiles), 1) * 5) * 25,
            min(1.0, len(disabilities) / 3) * 25,
        ]
        analysis.diversity_score = round(sum(factors), 1)

        # Primary challenges
        if analysis.iep_count > 0:
            analysis.primary_challenges.append(
                f"{analysis.iep_count} students with IEPs "
                "require individualised accommodations"
            )
        if analysis.ell_count > 0:
            analysis.primary_challenges.append(
                f"{analysis.ell_count} ELL students need "
                "language support"
            )
        if len(skill_counts) >= 3:
            analysis.primary_challenges.append(
                "Wide skill-level range requires multi-tier instruction"
            )

        return analysis

    # ── Suggestion generation ───────────────────────────────────────────

    def _generate_suggestions(
        self,
        lesson: Dict[str, Any],
        analysis: ClassDiversityAnalysis,
    ) -> List[DifferentiationSuggestion]:
        """Generate prioritised strategy suggestions."""
        suggestions: List[DifferentiationSuggestion] = []
        title = lesson.get("title", "Lesson")

        # Always suggest tiered if diversity is high
        if analysis.diversity_score >= 40 or analysis.iep_count > 0:
            suggestions.append(
                DifferentiationSuggestion(
                    strategy=StrategyType.TIERED.value,
                    priority="high",
                    rationale=(
                        f"Class has {analysis.iep_count} IEP students and "
                        f"diversity score of {analysis.diversity_score:.0f}"
                    ),
                    implementation_guide=self._build_teacher_guide(
                        title, StrategyType.TIERED.value
                    ),
                    estimated_prep_minutes=30,
                    evidence_base=(
                        "Tomlinson (2014): Tiered instruction addresses "
                        "readiness differences effectively"
                    ),
                )
            )

        # Flexible grouping for mid-size classes
        if analysis.total_students >= 10:
            suggestions.append(
                DifferentiationSuggestion(
                    strategy=StrategyType.FLEXIBLE_GROUPING.value,
                    priority="medium",
                    rationale=(
                        f"Class of {analysis.total_students} benefits "
                        "from flexible grouping rotations"
                    ),
                    implementation_guide=self._build_teacher_guide(
                        title, StrategyType.FLEXIBLE_GROUPING.value
                    ),
                    estimated_prep_minutes=20,
                    evidence_base=(
                        "Hattie (2009): Flexible grouping effect size 0.49"
                    ),
                )
            )

        # Scaffolded for classes with struggling readers
        below_level = analysis.skill_distribution.get("below_level", 0) + \
                      analysis.skill_distribution.get("approaching", 0) + \
                      analysis.skill_distribution.get("below_grade", 0)
        if below_level > 0:
            suggestions.append(
                DifferentiationSuggestion(
                    strategy=StrategyType.SCAFFOLDED.value,
                    priority="high",
                    rationale=f"{below_level} students below grade level",
                    implementation_guide=self._build_teacher_guide(
                        title, StrategyType.SCAFFOLDED.value
                    ),
                    estimated_prep_minutes=15,
                    evidence_base=(
                        "Vygotsky ZPD: Graduated support improves "
                        "student independence"
                    ),
                )
            )

        # Compacting for gifted
        if analysis.gifted_count > 0:
            suggestions.append(
                DifferentiationSuggestion(
                    strategy=StrategyType.COMPACTING.value,
                    priority="medium",
                    rationale=f"{analysis.gifted_count} gifted students",
                    implementation_guide=self._build_teacher_guide(
                        title, StrategyType.COMPACTING.value
                    ),
                    estimated_prep_minutes=25,
                    evidence_base=(
                        "Reis & Renzulli (1992): Curriculum compacting "
                        "eliminates 40-50% of content without loss"
                    ),
                )
            )

        # Multi-sensory for ELL or diverse learning styles
        if analysis.ell_count > 0:
            suggestions.append(
                DifferentiationSuggestion(
                    strategy=StrategyType.MULTI_SENSORY.value,
                    priority="medium",
                    rationale=(
                        f"{analysis.ell_count} ELL students benefit "
                        "from multi-sensory input"
                    ),
                    implementation_guide=self._build_teacher_guide(
                        title, StrategyType.MULTI_SENSORY.value
                    ),
                    estimated_prep_minutes=20,
                    evidence_base=(
                        "Orton-Gillingham approach: multi-sensory "
                        "instruction supports diverse learners"
                    ),
                )
            )

        return suggestions

    # ── Teacher guide builder ───────────────────────────────────────────

    def _build_teacher_guide(
        self, lesson_title: str, strategy: str
    ) -> TeacherGuide:
        """Build a step-by-step teacher implementation guide."""
        preparation: List[str] = [
            f"Review {strategy.replace('_', ' ')} strategy guidelines",
            "Gather necessary materials and resources",
            "Prepare differentiated materials for each level/group",
            "Set up classroom space for strategy implementation",
        ]

        implementation: List[str] = []
        monitoring: List[str] = [
            "Observe student engagement levels",
            "Check for understanding at each level",
            "Note students who need additional support or challenge",
            "Document adjustments made during the lesson",
        ]

        if strategy == StrategyType.TIERED.value:
            implementation = [
                "Introduce the lesson objective to the whole class",
                "Distribute tiered materials to appropriate groups",
                "Circulate to support approaching-level group first",
                "Check in with on-level group for understanding",
                "Engage advanced group in deeper discussion",
                "Bring all groups together for closing discussion",
            ]
        elif strategy == StrategyType.FLEXIBLE_GROUPING.value:
            implementation = [
                "Explain grouping purpose and rotation schedule",
                "Assign students to initial groups",
                "Set timer for rotation intervals (15-20 min)",
                "Facilitate transitions between stations",
                "Provide direct instruction to support group",
                "Debrief as whole class",
            ]
        elif strategy == StrategyType.SCAFFOLDED.value:
            implementation = [
                "Model the complete process for the whole class",
                "Move to guided practice with full scaffolding",
                "Gradually release responsibility group by group",
                "Provide checklists for independent workers",
                "Circle back to students still needing full support",
            ]
        elif strategy == StrategyType.COMPACTING.value:
            implementation = [
                "Administer pre-test to identify mastered content",
                "Identify students who can compact",
                "Assign enrichment or acceleration activities",
                "Teach core lesson to remaining students",
                "Check in with compacting students on progress",
            ]
        elif strategy == StrategyType.MULTI_SENSORY.value:
            implementation = [
                "Set up visual, auditory, and kinesthetic stations",
                "Introduce concept through visual channel first",
                "Reinforce through auditory discussion",
                "Solidify through hands-on kinesthetic activity",
                "Allow students to choose preferred modality for practice",
            ]
        else:
            implementation = [
                "Introduce the lesson objective",
                "Implement differentiated activities",
                "Monitor and adjust as needed",
                "Close with whole-class reflection",
            ]

        return TeacherGuide(
            lesson_title=lesson_title,
            strategy_used=strategy,
            preparation_steps=preparation,
            implementation_steps=implementation,
            monitoring_checklist=monitoring,
            adjustment_triggers=[
                "Student showing frustration or disengagement",
                "Student completing work too quickly",
                "Group dynamics not productive",
                "Strategy not matching observed learning needs",
            ],
            reflection_prompts=[
                "Which students benefited most from this strategy?",
                "What adjustments were needed during implementation?",
                "How would you modify this for next time?",
                "Did the differentiation address IEP goals effectively?",
            ],
        )
