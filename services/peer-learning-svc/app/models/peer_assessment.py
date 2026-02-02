"""
Peer Assessment System

Structured peer review with rubrics, feedback, and validation.
"""
import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import List, Dict, Optional, Set, Any

import numpy as np

logger = logging.getLogger(__name__)


class AssessmentStatus(str, Enum):
    """Status of an assessment."""
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    COMPLETED = "completed"
    DISPUTED = "disputed"
    WITHDRAWN = "withdrawn"


class AssessmentType(str, Enum):
    """Types of peer assessments."""
    WORK_REVIEW = "work_review"  # Review of submitted work
    SESSION_FEEDBACK = "session_feedback"  # Feedback on collaboration
    TUTOR_RATING = "tutor_rating"  # Rating of peer tutor
    PARTICIPATION = "participation"  # Participation assessment
    SKILL_VERIFICATION = "skill_verification"  # Verify peer's skill level


class RatingScale(str, Enum):
    """Rating scales available."""
    BINARY = "binary"  # Yes/No
    THREE_POINT = "three_point"  # Below/Meets/Exceeds
    FIVE_POINT = "five_point"  # 1-5
    TEN_POINT = "ten_point"  # 1-10
    PERCENTAGE = "percentage"  # 0-100


@dataclass
class RubricCriterion:
    """A single criterion in a rubric."""
    criterion_id: str
    name: str
    description: str
    weight: float  # 0.0 to 1.0, weights should sum to 1.0
    scale: RatingScale
    scale_labels: Dict[int, str] = field(default_factory=dict)  # e.g., {1: "Poor", 5: "Excellent"}
    required: bool = True
    min_score: int = 1
    max_score: int = 5


@dataclass
class Rubric:
    """A complete assessment rubric."""
    rubric_id: str
    name: str
    description: str
    assessment_type: AssessmentType
    criteria: List[RubricCriterion]
    created_at: datetime
    created_by: str
    is_template: bool = True
    version: int = 1
    
    def validate_weights(self) -> bool:
        """Check if criterion weights sum to approximately 1.0."""
        total_weight = sum(c.weight for c in self.criteria)
        return abs(total_weight - 1.0) < 0.01
    
    def get_max_score(self) -> float:
        """Calculate maximum possible score."""
        return sum(c.weight * c.max_score for c in self.criteria)


@dataclass
class CriterionScore:
    """Score for a single criterion."""
    criterion_id: str
    score: float
    comments: str = ""


@dataclass
class PeerAssessment:
    """A peer assessment submission."""
    assessment_id: str
    rubric_id: str
    assessor_id: str  # Who is giving the assessment
    assessee_id: str  # Who is being assessed
    group_id: Optional[str]
    session_id: Optional[str]
    assessment_type: AssessmentType
    status: AssessmentStatus
    scores: List[CriterionScore]
    overall_feedback: str
    strengths: List[str]
    areas_for_improvement: List[str]
    created_at: datetime
    submitted_at: Optional[datetime]
    overall_score: Optional[float] = None
    is_anonymous: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AssessmentSummary:
    """Summary of assessments for a user."""
    user_id: str
    total_received: int
    total_given: int
    average_score_received: float
    score_distribution: Dict[str, int]  # score bucket -> count
    common_strengths: List[str]
    common_improvements: List[str]
    assessment_trend: str  # improving, stable, declining


@dataclass
class CalibrationResult:
    """Result of assessment calibration check."""
    assessor_id: str
    calibration_score: float  # How well calibrated the assessor is
    bias_detected: Optional[str]  # harsh, lenient, or None
    consistency_score: float
    recommendations: List[str]


class RubricManager:
    """
    Manages assessment rubrics.
    
    Provides:
    - Rubric templates for different assessment types
    - Rubric creation and customization
    - Validation
    """
    
    def __init__(self):
        """Initialize RubricManager."""
        self._rubrics: Dict[str, Rubric] = {}
        self._create_default_rubrics()
        logger.info("RubricManager initialized with default rubrics")
    
    def _create_default_rubrics(self) -> None:
        """Create default rubric templates."""
        # Work Review Rubric
        work_review_criteria = [
            RubricCriterion(
                criterion_id="clarity",
                name="Clarity",
                description="How clearly is the work presented?",
                weight=0.25,
                scale=RatingScale.FIVE_POINT,
                scale_labels={1: "Unclear", 3: "Somewhat Clear", 5: "Very Clear"},
            ),
            RubricCriterion(
                criterion_id="completeness",
                name="Completeness",
                description="How complete is the work?",
                weight=0.25,
                scale=RatingScale.FIVE_POINT,
                scale_labels={1: "Incomplete", 3: "Mostly Complete", 5: "Fully Complete"},
            ),
            RubricCriterion(
                criterion_id="correctness",
                name="Correctness",
                description="How correct/accurate is the work?",
                weight=0.30,
                scale=RatingScale.FIVE_POINT,
                scale_labels={1: "Many Errors", 3: "Some Errors", 5: "No Errors"},
            ),
            RubricCriterion(
                criterion_id="effort",
                name="Effort",
                description="How much effort is evident in the work?",
                weight=0.20,
                scale=RatingScale.FIVE_POINT,
                scale_labels={1: "Minimal", 3: "Adequate", 5: "Exceptional"},
            ),
        ]
        
        self._rubrics["work_review_default"] = Rubric(
            rubric_id="work_review_default",
            name="Default Work Review Rubric",
            description="Standard rubric for reviewing peer work submissions",
            assessment_type=AssessmentType.WORK_REVIEW,
            criteria=work_review_criteria,
            created_at=datetime.now(timezone.utc),
            created_by="system",
        )
        
        # Session Feedback Rubric
        session_feedback_criteria = [
            RubricCriterion(
                criterion_id="participation",
                name="Participation",
                description="How well did the peer participate?",
                weight=0.30,
                scale=RatingScale.FIVE_POINT,
                scale_labels={1: "Did not participate", 3: "Moderate", 5: "Very Active"},
            ),
            RubricCriterion(
                criterion_id="helpfulness",
                name="Helpfulness",
                description="How helpful was the peer to others?",
                weight=0.30,
                scale=RatingScale.FIVE_POINT,
                scale_labels={1: "Not Helpful", 3: "Somewhat Helpful", 5: "Very Helpful"},
            ),
            RubricCriterion(
                criterion_id="respectfulness",
                name="Respectfulness",
                description="How respectful was the peer?",
                weight=0.25,
                scale=RatingScale.FIVE_POINT,
                scale_labels={1: "Disrespectful", 3: "Neutral", 5: "Very Respectful"},
            ),
            RubricCriterion(
                criterion_id="collaboration",
                name="Collaboration",
                description="How well did they collaborate?",
                weight=0.15,
                scale=RatingScale.FIVE_POINT,
                scale_labels={1: "Poor", 3: "Adequate", 5: "Excellent"},
            ),
        ]
        
        self._rubrics["session_feedback_default"] = Rubric(
            rubric_id="session_feedback_default",
            name="Default Session Feedback Rubric",
            description="Standard rubric for session participation feedback",
            assessment_type=AssessmentType.SESSION_FEEDBACK,
            criteria=session_feedback_criteria,
            created_at=datetime.now(timezone.utc),
            created_by="system",
        )
        
        # Tutor Rating Rubric
        tutor_rating_criteria = [
            RubricCriterion(
                criterion_id="knowledge",
                name="Subject Knowledge",
                description="How knowledgeable was the tutor?",
                weight=0.30,
                scale=RatingScale.FIVE_POINT,
                scale_labels={1: "Not Knowledgeable", 3: "Adequate", 5: "Expert"},
            ),
            RubricCriterion(
                criterion_id="explanation",
                name="Explanation Quality",
                description="How well did they explain concepts?",
                weight=0.30,
                scale=RatingScale.FIVE_POINT,
                scale_labels={1: "Poor", 3: "Adequate", 5: "Excellent"},
            ),
            RubricCriterion(
                criterion_id="patience",
                name="Patience",
                description="How patient was the tutor?",
                weight=0.20,
                scale=RatingScale.FIVE_POINT,
                scale_labels={1: "Impatient", 3: "Neutral", 5: "Very Patient"},
            ),
            RubricCriterion(
                criterion_id="engagement",
                name="Engagement",
                description="How engaged and attentive were they?",
                weight=0.20,
                scale=RatingScale.FIVE_POINT,
                scale_labels={1: "Distracted", 3: "Attentive", 5: "Very Engaged"},
            ),
        ]
        
        self._rubrics["tutor_rating_default"] = Rubric(
            rubric_id="tutor_rating_default",
            name="Default Tutor Rating Rubric",
            description="Standard rubric for rating peer tutors",
            assessment_type=AssessmentType.TUTOR_RATING,
            criteria=tutor_rating_criteria,
            created_at=datetime.now(timezone.utc),
            created_by="system",
        )
    
    def get_rubric(self, rubric_id: str) -> Optional[Rubric]:
        """Get a rubric by ID."""
        return self._rubrics.get(rubric_id)
    
    def get_default_rubric(self, assessment_type: AssessmentType) -> Optional[Rubric]:
        """Get the default rubric for an assessment type."""
        default_map = {
            AssessmentType.WORK_REVIEW: "work_review_default",
            AssessmentType.SESSION_FEEDBACK: "session_feedback_default",
            AssessmentType.TUTOR_RATING: "tutor_rating_default",
        }
        rubric_id = default_map.get(assessment_type)
        return self._rubrics.get(rubric_id) if rubric_id else None
    
    def create_rubric(
        self,
        name: str,
        description: str,
        assessment_type: AssessmentType,
        criteria: List[Dict[str, Any]],
        created_by: str,
    ) -> Rubric:
        """Create a custom rubric."""
        rubric_id = str(uuid.uuid4())
        
        rubric_criteria = []
        for c in criteria:
            rubric_criteria.append(RubricCriterion(
                criterion_id=c.get("criterion_id", str(uuid.uuid4())),
                name=c["name"],
                description=c.get("description", ""),
                weight=c.get("weight", 1.0 / len(criteria)),
                scale=RatingScale(c.get("scale", "five_point")),
                scale_labels=c.get("scale_labels", {}),
                required=c.get("required", True),
                min_score=c.get("min_score", 1),
                max_score=c.get("max_score", 5),
            ))
        
        rubric = Rubric(
            rubric_id=rubric_id,
            name=name,
            description=description,
            assessment_type=assessment_type,
            criteria=rubric_criteria,
            created_at=datetime.now(timezone.utc),
            created_by=created_by,
            is_template=False,
        )
        
        self._rubrics[rubric_id] = rubric
        logger.info("Created custom rubric %s: %s", rubric_id, name)
        
        return rubric
    
    def list_rubrics(
        self,
        assessment_type: Optional[AssessmentType] = None,
        templates_only: bool = False,
    ) -> List[Rubric]:
        """List available rubrics."""
        rubrics = list(self._rubrics.values())
        
        if assessment_type:
            rubrics = [r for r in rubrics if r.assessment_type == assessment_type]
        
        if templates_only:
            rubrics = [r for r in rubrics if r.is_template]
        
        return rubrics


class PeerAssessmentService:
    """
    Manages peer assessments.
    
    Handles:
    - Assessment creation and submission
    - Score calculation
    - Feedback aggregation
    - Calibration checks
    """
    
    # Minimum assessments needed for summary
    MIN_ASSESSMENTS_FOR_SUMMARY = 3
    
    def __init__(self, rubric_manager: Optional[RubricManager] = None):
        """Initialize PeerAssessmentService."""
        self.rubric_manager = rubric_manager or RubricManager()
        self._assessments: Dict[str, PeerAssessment] = {}
        self._user_assessments_given: Dict[str, List[str]] = {}
        self._user_assessments_received: Dict[str, List[str]] = {}
        logger.info("PeerAssessmentService initialized")
    
    def create_assessment(
        self,
        assessor_id: str,
        assessee_id: str,
        assessment_type: AssessmentType,
        rubric_id: Optional[str] = None,
        group_id: Optional[str] = None,
        session_id: Optional[str] = None,
        is_anonymous: bool = False,
    ) -> PeerAssessment:
        """
        Create a new peer assessment.
        
        Args:
            assessor_id: ID of the assessor
            assessee_id: ID of the person being assessed
            assessment_type: Type of assessment
            rubric_id: Optional specific rubric ID (uses default if not provided)
            group_id: Optional group context
            session_id: Optional session context
            is_anonymous: Whether assessment is anonymous
        
        Returns:
            Created assessment
        """
        # Validate not self-assessment
        if assessor_id == assessee_id:
            raise ValueError("Cannot assess yourself")
        
        # Get rubric
        if rubric_id:
            rubric = self.rubric_manager.get_rubric(rubric_id)
        else:
            rubric = self.rubric_manager.get_default_rubric(assessment_type)
        
        if not rubric:
            raise ValueError(f"No rubric found for assessment type {assessment_type}")
        
        assessment_id = str(uuid.uuid4())
        
        # Initialize empty scores for all criteria
        scores = [
            CriterionScore(criterion_id=c.criterion_id, score=0)
            for c in rubric.criteria
        ]
        
        assessment = PeerAssessment(
            assessment_id=assessment_id,
            rubric_id=rubric.rubric_id,
            assessor_id=assessor_id,
            assessee_id=assessee_id,
            group_id=group_id,
            session_id=session_id,
            assessment_type=assessment_type,
            status=AssessmentStatus.DRAFT,
            scores=scores,
            overall_feedback="",
            strengths=[],
            areas_for_improvement=[],
            created_at=datetime.now(timezone.utc),
            submitted_at=None,
            is_anonymous=is_anonymous,
        )
        
        self._assessments[assessment_id] = assessment
        
        logger.info(
            "Assessment created: %s (assessor=%s, assessee=%s, type=%s)",
            assessment_id, assessor_id, assessee_id, assessment_type.value
        )
        
        return assessment
    
    def get_assessment(self, assessment_id: str) -> Optional[PeerAssessment]:
        """Get an assessment by ID."""
        return self._assessments.get(assessment_id)
    
    def update_scores(
        self,
        assessment_id: str,
        scores: List[Dict[str, Any]],
    ) -> Optional[PeerAssessment]:
        """
        Update scores for an assessment.
        
        Args:
            assessment_id: Assessment ID
            scores: List of {criterion_id, score, comments} dicts
        
        Returns:
            Updated assessment
        """
        assessment = self._assessments.get(assessment_id)
        if not assessment:
            return None
        
        if assessment.status not in [AssessmentStatus.DRAFT, AssessmentStatus.UNDER_REVIEW]:
            logger.warning("Cannot update scores: assessment status is %s", assessment.status)
            return assessment
        
        # Update scores
        score_map = {s["criterion_id"]: s for s in scores}
        for existing_score in assessment.scores:
            if existing_score.criterion_id in score_map:
                new_data = score_map[existing_score.criterion_id]
                existing_score.score = new_data.get("score", existing_score.score)
                existing_score.comments = new_data.get("comments", existing_score.comments)
        
        return assessment
    
    def update_feedback(
        self,
        assessment_id: str,
        overall_feedback: Optional[str] = None,
        strengths: Optional[List[str]] = None,
        areas_for_improvement: Optional[List[str]] = None,
    ) -> Optional[PeerAssessment]:
        """Update feedback for an assessment."""
        assessment = self._assessments.get(assessment_id)
        if not assessment:
            return None
        
        if overall_feedback is not None:
            assessment.overall_feedback = overall_feedback
        if strengths is not None:
            assessment.strengths = strengths
        if areas_for_improvement is not None:
            assessment.areas_for_improvement = areas_for_improvement
        
        return assessment
    
    def submit_assessment(
        self,
        assessment_id: str,
    ) -> tuple[bool, str, Optional[PeerAssessment]]:
        """
        Submit a completed assessment.
        
        Args:
            assessment_id: Assessment ID
        
        Returns:
            Tuple of (success, message, assessment)
        """
        assessment = self._assessments.get(assessment_id)
        if not assessment:
            return False, "Assessment not found", None
        
        if assessment.status != AssessmentStatus.DRAFT:
            return False, f"Assessment cannot be submitted (status: {assessment.status})", assessment
        
        # Validate scores
        rubric = self.rubric_manager.get_rubric(assessment.rubric_id)
        if rubric:
            for criterion in rubric.criteria:
                if criterion.required:
                    score_entry = next(
                        (s for s in assessment.scores if s.criterion_id == criterion.criterion_id),
                        None
                    )
                    if not score_entry or score_entry.score == 0:
                        return False, f"Missing required score for {criterion.name}", assessment
        
        # Calculate overall score
        assessment.overall_score = self._calculate_overall_score(assessment)
        
        # Update status
        assessment.status = AssessmentStatus.SUBMITTED
        assessment.submitted_at = datetime.now(timezone.utc)
        
        # Track user assessments
        if assessment.assessor_id not in self._user_assessments_given:
            self._user_assessments_given[assessment.assessor_id] = []
        self._user_assessments_given[assessment.assessor_id].append(assessment_id)
        
        if assessment.assessee_id not in self._user_assessments_received:
            self._user_assessments_received[assessment.assessee_id] = []
        self._user_assessments_received[assessment.assessee_id].append(assessment_id)
        
        logger.info(
            "Assessment %s submitted: overall_score=%.2f",
            assessment_id, assessment.overall_score or 0
        )
        
        return True, "Assessment submitted successfully", assessment
    
    def _calculate_overall_score(self, assessment: PeerAssessment) -> float:
        """Calculate weighted overall score for an assessment."""
        rubric = self.rubric_manager.get_rubric(assessment.rubric_id)
        if not rubric:
            # Simple average if no rubric
            scores = [s.score for s in assessment.scores if s.score > 0]
            return np.mean(scores) if scores else 0.0
        
        total_score = 0.0
        total_weight = 0.0
        
        for criterion in rubric.criteria:
            score_entry = next(
                (s for s in assessment.scores if s.criterion_id == criterion.criterion_id),
                None
            )
            if score_entry and score_entry.score > 0:
                # Normalize score to 0-1 range
                normalized = (score_entry.score - criterion.min_score) / (
                    criterion.max_score - criterion.min_score
                )
                total_score += normalized * criterion.weight
                total_weight += criterion.weight
        
        if total_weight == 0:
            return 0.0
        
        # Return as percentage (0-100)
        return (total_score / total_weight) * 100
    
    def get_user_assessments_given(
        self,
        user_id: str,
        assessment_type: Optional[AssessmentType] = None,
    ) -> List[PeerAssessment]:
        """Get assessments given by a user."""
        assessment_ids = self._user_assessments_given.get(user_id, [])
        assessments = [self._assessments[aid] for aid in assessment_ids if aid in self._assessments]
        
        if assessment_type:
            assessments = [a for a in assessments if a.assessment_type == assessment_type]
        
        return assessments
    
    def get_user_assessments_received(
        self,
        user_id: str,
        assessment_type: Optional[AssessmentType] = None,
    ) -> List[PeerAssessment]:
        """Get assessments received by a user."""
        assessment_ids = self._user_assessments_received.get(user_id, [])
        assessments = [self._assessments[aid] for aid in assessment_ids if aid in self._assessments]
        
        if assessment_type:
            assessments = [a for a in assessments if a.assessment_type == assessment_type]
        
        return assessments
    
    def get_session_assessments(
        self,
        session_id: str,
    ) -> List[PeerAssessment]:
        """Get all assessments for a session."""
        return [
            a for a in self._assessments.values()
            if a.session_id == session_id
        ]
    
    def get_group_assessments(
        self,
        group_id: str,
    ) -> List[PeerAssessment]:
        """Get all assessments for a group."""
        return [
            a for a in self._assessments.values()
            if a.group_id == group_id
        ]
    
    def get_user_summary(
        self,
        user_id: str,
    ) -> Optional[AssessmentSummary]:
        """
        Get assessment summary for a user.
        
        Args:
            user_id: User ID
        
        Returns:
            AssessmentSummary or None if insufficient data
        """
        received = self.get_user_assessments_received(user_id)
        given = self.get_user_assessments_given(user_id)
        
        completed_received = [
            a for a in received
            if a.status == AssessmentStatus.SUBMITTED and a.overall_score is not None
        ]
        
        if len(completed_received) < self.MIN_ASSESSMENTS_FOR_SUMMARY:
            return None
        
        # Calculate average score
        scores = [a.overall_score for a in completed_received]
        average_score = np.mean(scores)
        
        # Score distribution
        distribution = {"0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0}
        for score in scores:
            if score <= 20:
                distribution["0-20"] += 1
            elif score <= 40:
                distribution["21-40"] += 1
            elif score <= 60:
                distribution["41-60"] += 1
            elif score <= 80:
                distribution["61-80"] += 1
            else:
                distribution["81-100"] += 1
        
        # Aggregate feedback
        all_strengths = []
        all_improvements = []
        for a in completed_received:
            all_strengths.extend(a.strengths)
            all_improvements.extend(a.areas_for_improvement)
        
        # Find common themes (simplified - in production use NLP)
        common_strengths = self._find_common_themes(all_strengths)
        common_improvements = self._find_common_themes(all_improvements)
        
        # Determine trend
        if len(completed_received) >= 5:
            recent_scores = [a.overall_score for a in sorted(
                completed_received, key=lambda x: x.submitted_at or x.created_at
            )[-5:]]
            trend = self._calculate_trend(recent_scores)
        else:
            trend = "insufficient_data"
        
        return AssessmentSummary(
            user_id=user_id,
            total_received=len(received),
            total_given=len(given),
            average_score_received=average_score,
            score_distribution=distribution,
            common_strengths=common_strengths[:5],
            common_improvements=common_improvements[:5],
            assessment_trend=trend,
        )
    
    def _find_common_themes(self, items: List[str], min_occurrences: int = 2) -> List[str]:
        """Find commonly occurring themes in feedback."""
        if not items:
            return []
        
        # Simple frequency counting (in production, use NLP clustering)
        from collections import Counter
        counter = Counter(items)
        common = [item for item, count in counter.most_common() if count >= min_occurrences]
        
        return common
    
    def _calculate_trend(self, scores: List[float]) -> str:
        """Calculate trend from recent scores."""
        if len(scores) < 2:
            return "stable"
        
        # Simple linear trend
        x = np.arange(len(scores))
        slope = np.polyfit(x, scores, 1)[0]
        
        if slope > 2:
            return "improving"
        elif slope < -2:
            return "declining"
        else:
            return "stable"
    
    def check_calibration(
        self,
        assessor_id: str,
    ) -> Optional[CalibrationResult]:
        """
        Check how well calibrated an assessor is.
        
        Compares assessor's scores against aggregate scores for same assessees.
        
        Args:
            assessor_id: ID of the assessor
        
        Returns:
            CalibrationResult or None if insufficient data
        """
        given = self.get_user_assessments_given(assessor_id)
        submitted = [a for a in given if a.status == AssessmentStatus.SUBMITTED and a.overall_score]
        
        if len(submitted) < 5:
            return None
        
        deviations = []
        consistency_scores = []
        
        for assessment in submitted:
            # Get other assessments for same assessee
            assessee_assessments = [
                a for a in self.get_user_assessments_received(assessment.assessee_id)
                if a.assessment_id != assessment.assessment_id
                and a.status == AssessmentStatus.SUBMITTED
                and a.overall_score is not None
            ]
            
            if assessee_assessments:
                avg_others = np.mean([a.overall_score for a in assessee_assessments])
                deviation = assessment.overall_score - avg_others
                deviations.append(deviation)
        
        if not deviations:
            return None
        
        avg_deviation = np.mean(deviations)
        std_deviation = np.std(deviations)
        
        # Determine bias
        bias = None
        if avg_deviation > 10:
            bias = "lenient"
        elif avg_deviation < -10:
            bias = "harsh"
        
        # Calibration score (100 = perfectly calibrated)
        calibration_score = max(0, 100 - abs(avg_deviation) * 2)
        
        # Consistency score (low std = more consistent)
        consistency_score = max(0, 100 - std_deviation * 2)
        
        # Recommendations
        recommendations = []
        if bias == "lenient":
            recommendations.append("Consider being more critical in assessments")
        elif bias == "harsh":
            recommendations.append("Consider recognizing positive aspects more")
        if consistency_score < 60:
            recommendations.append("Try to maintain more consistent scoring standards")
        
        return CalibrationResult(
            assessor_id=assessor_id,
            calibration_score=calibration_score,
            bias_detected=bias,
            consistency_score=consistency_score,
            recommendations=recommendations,
        )
    
    def dispute_assessment(
        self,
        assessment_id: str,
        reason: str,
    ) -> tuple[bool, str]:
        """
        Flag an assessment as disputed.
        
        Args:
            assessment_id: Assessment ID
            reason: Reason for dispute
        
        Returns:
            Tuple of (success, message)
        """
        assessment = self._assessments.get(assessment_id)
        if not assessment:
            return False, "Assessment not found"
        
        if assessment.status != AssessmentStatus.SUBMITTED:
            return False, "Only submitted assessments can be disputed"
        
        assessment.status = AssessmentStatus.DISPUTED
        assessment.metadata["dispute_reason"] = reason
        assessment.metadata["disputed_at"] = datetime.now(timezone.utc).isoformat()
        
        logger.info("Assessment %s disputed: %s", assessment_id, reason)
        return True, "Assessment marked as disputed"
    
    def complete_assessment(
        self,
        assessment_id: str,
    ) -> Optional[PeerAssessment]:
        """Mark an assessment as completed (after review if disputed)."""
        assessment = self._assessments.get(assessment_id)
        if not assessment:
            return None
        
        assessment.status = AssessmentStatus.COMPLETED
        return assessment
