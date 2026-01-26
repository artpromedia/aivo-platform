"""
Rubric Mapper for mapping assessment scores to rubric criteria.

Maps raw scores to rubric levels and generates descriptors
based on defined rubric criteria.
"""

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class RubricLevel:
    """Single level within a rubric criterion."""

    level: int
    label: str
    description: str
    min_score: float
    max_score: float


@dataclass
class RubricCriterion:
    """Single rubric criterion with levels."""

    name: str
    weight: float
    description: str = ""
    levels: List[RubricLevel] = field(default_factory=list)


@dataclass
class Rubric:
    """Complete rubric definition."""

    rubric_id: str
    name: str
    description: str
    criteria: List[RubricCriterion] = field(default_factory=list)
    max_total_score: float = 100.0


@dataclass
class RubricScore:
    """Score mapped to a rubric."""

    criterion: str
    raw_score: float
    level: int
    level_label: str
    level_description: str
    weighted_score: float


@dataclass
class RubricResult:
    """Complete rubric scoring result."""

    rubric_id: str
    rubric_name: str
    scores: List[RubricScore] = field(default_factory=list)
    total_score: float = 0.0
    max_score: float = 100.0
    percentage: float = 0.0


class RubricMapper:
    """
    Map assessment scores to rubric criteria and descriptors.

    Features:
    - Custom rubric definitions
    - Score-to-level mapping
    - Descriptor generation
    - Multi-rubric support
    - Grade-level specific rubrics

    Usage:
        mapper = RubricMapper()
        mapper.register_rubric(my_rubric)
        result = mapper.map_scores(trait_scores, rubric_id="6trait")
    """

    def __init__(self):
        """Initialize the rubric mapper."""
        self.rubrics: Dict[str, Rubric] = {}
        self._register_default_rubrics()
        logger.info("RubricMapper initialized")

    def _register_default_rubrics(self) -> None:
        """Register default rubric definitions."""
        # 6+1 Writing Traits Rubric
        six_trait = Rubric(
            rubric_id="6trait",
            name="6+1 Writing Traits",
            description="Standard 6+1 writing traits rubric for holistic assessment.",
            max_total_score=24.0,
            criteria=[
                RubricCriterion(
                    name="ideas_content",
                    weight=1.0,
                    description="Ideas & Content: Clear, focused topic with relevant supporting details.",
                    levels=[
                        RubricLevel(1, "Beginning", "Ideas are unclear or unrelated to the topic.", 0.0, 1.0),
                        RubricLevel(2, "Developing", "Ideas are present but lack focus or development.", 1.0, 2.0),
                        RubricLevel(3, "Proficient", "Ideas are clear and adequately supported.", 2.0, 3.0),
                        RubricLevel(4, "Advanced", "Ideas are insightful, focused, and well-developed.", 3.0, 4.0),
                    ],
                ),
                RubricCriterion(
                    name="organization",
                    weight=1.0,
                    description="Organization: Logical structure with smooth transitions.",
                    levels=[
                        RubricLevel(1, "Beginning", "No clear structure; ideas are disorganized.", 0.0, 1.0),
                        RubricLevel(2, "Developing", "Some structure present but transitions are weak.", 1.0, 2.0),
                        RubricLevel(3, "Proficient", "Clear structure with adequate transitions.", 2.0, 3.0),
                        RubricLevel(4, "Advanced", "Strong structure with smooth, effective transitions.", 3.0, 4.0),
                    ],
                ),
                RubricCriterion(
                    name="voice",
                    weight=1.0,
                    description="Voice: Personal tone that engages the reader.",
                    levels=[
                        RubricLevel(1, "Beginning", "No identifiable voice; flat or generic tone.", 0.0, 1.0),
                        RubricLevel(2, "Developing", "Some voice present but inconsistent.", 1.0, 2.0),
                        RubricLevel(3, "Proficient", "Clear voice appropriate to audience and purpose.", 2.0, 3.0),
                        RubricLevel(4, "Advanced", "Distinctive, engaging voice throughout.", 3.0, 4.0),
                    ],
                ),
                RubricCriterion(
                    name="word_choice",
                    weight=1.0,
                    description="Word Choice: Precise, varied vocabulary.",
                    levels=[
                        RubricLevel(1, "Beginning", "Limited vocabulary; words often misused.", 0.0, 1.0),
                        RubricLevel(2, "Developing", "Basic vocabulary; some variety.", 1.0, 2.0),
                        RubricLevel(3, "Proficient", "Good vocabulary with appropriate word choices.", 2.0, 3.0),
                        RubricLevel(4, "Advanced", "Rich, precise vocabulary that enhances meaning.", 3.0, 4.0),
                    ],
                ),
                RubricCriterion(
                    name="sentence_fluency",
                    weight=1.0,
                    description="Sentence Fluency: Varied sentence structures with natural flow.",
                    levels=[
                        RubricLevel(1, "Beginning", "Choppy or run-on sentences; difficult to read.", 0.0, 1.0),
                        RubricLevel(2, "Developing", "Some variety but rhythm is inconsistent.", 1.0, 2.0),
                        RubricLevel(3, "Proficient", "Good variety; sentences flow well.", 2.0, 3.0),
                        RubricLevel(4, "Advanced", "Excellent variety; rhythmic, flowing sentences.", 3.0, 4.0),
                    ],
                ),
                RubricCriterion(
                    name="conventions",
                    weight=1.0,
                    description="Conventions: Correct spelling, grammar, and punctuation.",
                    levels=[
                        RubricLevel(1, "Beginning", "Frequent errors that impede understanding.", 0.0, 1.0),
                        RubricLevel(2, "Developing", "Some errors that distract the reader.", 1.0, 2.0),
                        RubricLevel(3, "Proficient", "Few errors; generally correct conventions.", 2.0, 3.0),
                        RubricLevel(4, "Advanced", "Nearly error-free with sophisticated conventions.", 3.0, 4.0),
                    ],
                ),
            ],
        )
        self.rubrics["6trait"] = six_trait

        # Simplified 4-point rubric
        simple_rubric = Rubric(
            rubric_id="simple",
            name="Simple 4-Point Rubric",
            description="Basic rubric for quick assessment.",
            max_total_score=16.0,
            criteria=[
                RubricCriterion(
                    name="content",
                    weight=1.0,
                    description="Content and Ideas",
                    levels=[
                        RubricLevel(1, "Needs Work", "Content is unclear or off-topic.", 0.0, 1.0),
                        RubricLevel(2, "Developing", "Content addresses topic but needs detail.", 1.0, 2.0),
                        RubricLevel(3, "Good", "Content is clear and well-supported.", 2.0, 3.0),
                        RubricLevel(4, "Excellent", "Content is exceptional and insightful.", 3.0, 4.0),
                    ],
                ),
                RubricCriterion(
                    name="organization",
                    weight=1.0,
                    description="Organization and Structure",
                    levels=[
                        RubricLevel(1, "Needs Work", "No clear organization.", 0.0, 1.0),
                        RubricLevel(2, "Developing", "Some organization present.", 1.0, 2.0),
                        RubricLevel(3, "Good", "Well-organized with clear structure.", 2.0, 3.0),
                        RubricLevel(4, "Excellent", "Excellent organization throughout.", 3.0, 4.0),
                    ],
                ),
                RubricCriterion(
                    name="language",
                    weight=1.0,
                    description="Language and Style",
                    levels=[
                        RubricLevel(1, "Needs Work", "Limited vocabulary and style.", 0.0, 1.0),
                        RubricLevel(2, "Developing", "Basic vocabulary and style.", 1.0, 2.0),
                        RubricLevel(3, "Good", "Good vocabulary and engaging style.", 2.0, 3.0),
                        RubricLevel(4, "Excellent", "Excellent vocabulary and compelling style.", 3.0, 4.0),
                    ],
                ),
                RubricCriterion(
                    name="mechanics",
                    weight=1.0,
                    description="Grammar and Mechanics",
                    levels=[
                        RubricLevel(1, "Needs Work", "Many errors that interfere with meaning.", 0.0, 1.0),
                        RubricLevel(2, "Developing", "Some errors but meaning is clear.", 1.0, 2.0),
                        RubricLevel(3, "Good", "Few errors; writing is clear.", 2.0, 3.0),
                        RubricLevel(4, "Excellent", "Nearly error-free.", 3.0, 4.0),
                    ],
                ),
            ],
        )
        self.rubrics["simple"] = simple_rubric

        # Holistic rubric (1-6 scale)
        holistic_rubric = Rubric(
            rubric_id="holistic",
            name="Holistic 6-Point Rubric",
            description="Single holistic score on 1-6 scale.",
            max_total_score=6.0,
            criteria=[
                RubricCriterion(
                    name="overall",
                    weight=1.0,
                    description="Overall Writing Quality",
                    levels=[
                        RubricLevel(1, "Minimal", "Minimal writing that doesn't address the prompt.", 0.0, 1.0),
                        RubricLevel(2, "Below Basic", "Writing shows limited understanding and development.", 1.0, 2.0),
                        RubricLevel(3, "Basic", "Writing demonstrates basic competency.", 2.0, 3.0),
                        RubricLevel(4, "Proficient", "Writing shows good command of skills.", 3.0, 4.0),
                        RubricLevel(5, "Advanced", "Writing demonstrates strong skills throughout.", 4.0, 5.0),
                        RubricLevel(6, "Exemplary", "Exceptional writing that exceeds expectations.", 5.0, 6.0),
                    ],
                ),
            ],
        )
        self.rubrics["holistic"] = holistic_rubric

    def register_rubric(self, rubric: Rubric) -> None:
        """
        Register a custom rubric.

        Args:
            rubric: Rubric definition to register
        """
        self.rubrics[rubric.rubric_id] = rubric
        logger.info(f"Registered rubric: {rubric.rubric_id}")

    def get_rubric(self, rubric_id: str) -> Optional[Rubric]:
        """
        Get a rubric by ID.

        Args:
            rubric_id: Rubric identifier

        Returns:
            Rubric if found, None otherwise
        """
        return self.rubrics.get(rubric_id)

    def list_rubrics(self) -> List[Dict[str, str]]:
        """
        List available rubrics.

        Returns:
            List of rubric summaries
        """
        return [
            {
                "rubric_id": r.rubric_id,
                "name": r.name,
                "description": r.description,
            }
            for r in self.rubrics.values()
        ]

    def map_score_to_level(
        self,
        score: float,
        criterion: RubricCriterion,
    ) -> RubricLevel:
        """
        Map a score to the appropriate rubric level.

        Args:
            score: Raw score to map
            criterion: Rubric criterion with levels

        Returns:
            Matching RubricLevel
        """
        # Sort levels by min_score descending to find the highest matching level
        sorted_levels = sorted(criterion.levels, key=lambda l: l.min_score, reverse=True)

        for level in sorted_levels:
            if score >= level.min_score:
                return level

        # Return lowest level if no match
        return criterion.levels[0] if criterion.levels else RubricLevel(
            level=0, label="Unknown", description="Score could not be mapped.", min_score=0, max_score=0
        )

    def map_scores(
        self,
        trait_scores: Dict[str, float],
        rubric_id: str = "6trait",
    ) -> RubricResult:
        """
        Map trait scores to a rubric.

        Args:
            trait_scores: Dictionary of trait names to scores
            rubric_id: Rubric to use for mapping

        Returns:
            RubricResult with mapped scores and levels
        """
        rubric = self.rubrics.get(rubric_id)
        if not rubric:
            logger.warning(f"Rubric not found: {rubric_id}, using default")
            rubric = self.rubrics.get("6trait", list(self.rubrics.values())[0])

        scores: List[RubricScore] = []
        total_weighted = 0.0
        total_weight = 0.0

        for criterion in rubric.criteria:
            # Get the raw score for this criterion
            raw_score = trait_scores.get(criterion.name, 0.0)

            # Map to level
            level = self.map_score_to_level(raw_score, criterion)

            # Calculate weighted score
            weighted = raw_score * criterion.weight
            total_weighted += weighted
            total_weight += criterion.weight * (criterion.levels[-1].max_score if criterion.levels else 4.0)

            scores.append(
                RubricScore(
                    criterion=criterion.name,
                    raw_score=raw_score,
                    level=level.level,
                    level_label=level.label,
                    level_description=level.description,
                    weighted_score=weighted,
                )
            )

        # Calculate percentage
        percentage = (total_weighted / total_weight * 100) if total_weight > 0 else 0.0

        return RubricResult(
            rubric_id=rubric.rubric_id,
            rubric_name=rubric.name,
            scores=scores,
            total_score=round(total_weighted, 2),
            max_score=rubric.max_total_score,
            percentage=round(percentage, 1),
        )

    def get_level_descriptor(
        self,
        rubric_id: str,
        criterion_name: str,
        score: float,
    ) -> str:
        """
        Get the descriptor for a score level.

        Args:
            rubric_id: Rubric identifier
            criterion_name: Name of the criterion
            score: Score to get descriptor for

        Returns:
            Level description string
        """
        rubric = self.rubrics.get(rubric_id)
        if not rubric:
            return "Rubric not found."

        for criterion in rubric.criteria:
            if criterion.name == criterion_name:
                level = self.map_score_to_level(score, criterion)
                return level.description

        return "Criterion not found."

    def calculate_rubric_score(
        self,
        trait_scores: Dict[str, float],
        rubric_id: str,
    ) -> float:
        """
        Calculate weighted total score from trait scores.

        Args:
            trait_scores: Dictionary of trait names to scores
            rubric_id: Rubric to use

        Returns:
            Weighted total score
        """
        result = self.map_scores(trait_scores, rubric_id)
        return result.total_score

    def convert_to_percentage(
        self,
        score: float,
        rubric_id: str = "6trait",
    ) -> float:
        """
        Convert a rubric score to percentage.

        Args:
            score: Raw rubric score
            rubric_id: Rubric used for scoring

        Returns:
            Percentage score (0-100)
        """
        rubric = self.rubrics.get(rubric_id)
        if not rubric:
            return 0.0

        return (score / rubric.max_total_score) * 100 if rubric.max_total_score > 0 else 0.0

    def get_grade_from_percentage(
        self,
        percentage: float,
        grading_scale: Optional[Dict[str, float]] = None,
    ) -> str:
        """
        Convert percentage to letter grade.

        Args:
            percentage: Percentage score
            grading_scale: Optional custom grading scale

        Returns:
            Letter grade
        """
        if grading_scale is None:
            grading_scale = {
                "A": 90,
                "B": 80,
                "C": 70,
                "D": 60,
                "F": 0,
            }

        for grade, min_pct in sorted(grading_scale.items(), key=lambda x: x[1], reverse=True):
            if percentage >= min_pct:
                return grade

        return "F"
