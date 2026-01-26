"""
SMART Goal Planning Models.

This module defines the data models for learning goals, milestones,
and weekly action plans. Goals follow SMART criteria (Specific, Measurable,
Achievable, Relevant, Time-bound) and can be adapted based on learner diagnoses.
"""

from datetime import date, datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional
import uuid

from pydantic import BaseModel, Field, field_validator


class GoalDomain(str, Enum):
    """Learning domains for goal categorization."""

    READING = "reading"
    WRITING = "writing"
    MATH = "math"
    COMMUNICATION = "communication"
    SOCIAL_EMOTIONAL = "social_emotional"
    EXECUTIVE_FUNCTION = "executive_function"
    BEHAVIOR = "behavior"
    MOTOR = "motor"
    DAILY_LIVING = "daily_living"


class GoalStatus(str, Enum):
    """Status tracking for goals and milestones."""

    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    REVISED = "revised"


class MeasurementFrequency(str, Enum):
    """Frequency options for goal measurement."""

    DAILY = "daily"
    WEEKLY = "weekly"
    BI_WEEKLY = "bi_weekly"
    MONTHLY = "monthly"
    PER_SESSION = "per_session"


class SMARTCriteria(BaseModel):
    """
    SMART criteria evaluation with confidence scores.

    Each criterion is scored 0-1 with accompanying text explanation.
    Overall score is the average of all five criteria.
    """

    specific_score: float = Field(
        ge=0.0, le=1.0, description="How specific is the goal (0-1)"
    )
    specific_text: str = Field(
        ..., description="Explanation of the specific component"
    )
    measurable_score: float = Field(
        ge=0.0, le=1.0, description="How measurable is the goal (0-1)"
    )
    measurable_text: str = Field(
        ..., description="Explanation of the measurement method"
    )
    achievable_score: float = Field(
        ge=0.0, le=1.0, description="How achievable is the goal (0-1)"
    )
    achievable_text: str = Field(
        ..., description="Explanation of achievability"
    )
    relevant_score: float = Field(
        ge=0.0, le=1.0, description="How relevant is the goal (0-1)"
    )
    relevant_text: str = Field(
        ..., description="Explanation of relevance to learner"
    )
    timebound_score: float = Field(
        ge=0.0, le=1.0, description="How time-bound is the goal (0-1)"
    )
    timebound_text: str = Field(
        ..., description="Explanation of timeline"
    )

    @property
    def overall_score(self) -> float:
        """Calculate average score across all SMART criteria."""
        return (
            self.specific_score
            + self.measurable_score
            + self.achievable_score
            + self.relevant_score
            + self.timebound_score
        ) / 5

    @property
    def is_smart_compliant(self) -> bool:
        """Check if goal meets minimum SMART compliance (>0.8 overall)."""
        return self.overall_score >= 0.8

    def get_weakest_criterion(self) -> tuple[str, float]:
        """Identify the weakest SMART criterion for improvement."""
        scores = {
            "specific": self.specific_score,
            "measurable": self.measurable_score,
            "achievable": self.achievable_score,
            "relevant": self.relevant_score,
            "timebound": self.timebound_score,
        }
        weakest = min(scores, key=scores.get)
        return weakest, scores[weakest]

    def to_dict(self) -> Dict[str, Any]:
        """Serialize to dictionary."""
        return {
            "specific_score": self.specific_score,
            "specific_text": self.specific_text,
            "measurable_score": self.measurable_score,
            "measurable_text": self.measurable_text,
            "achievable_score": self.achievable_score,
            "achievable_text": self.achievable_text,
            "relevant_score": self.relevant_score,
            "relevant_text": self.relevant_text,
            "timebound_score": self.timebound_score,
            "timebound_text": self.timebound_text,
            "overall_score": self.overall_score,
        }


class ProgressEvidence(BaseModel):
    """Evidence documenting progress toward a goal or milestone."""

    evidence_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    evidence_type: str = Field(
        ..., description="Type: assessment, observation, work_sample, self_report"
    )
    description: str = Field(..., description="Description of the evidence")
    metric_value: Optional[float] = Field(
        default=None, description="Quantitative metric if applicable"
    )
    metric_unit: Optional[str] = Field(
        default=None, description="Unit of measurement"
    )
    source: str = Field(
        default="system", description="Source: teacher, parent, system, self"
    )
    attachments: List[str] = Field(
        default_factory=list, description="URLs or paths to attached files"
    )
    metadata: Dict[str, Any] = Field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Serialize to dictionary."""
        return {
            "evidence_id": self.evidence_id,
            "timestamp": self.timestamp.isoformat(),
            "evidence_type": self.evidence_type,
            "description": self.description,
            "metric_value": self.metric_value,
            "metric_unit": self.metric_unit,
            "source": self.source,
            "attachments": self.attachments,
            "metadata": self.metadata,
        }


class Milestone(BaseModel):
    """
    Goal milestone with success criteria.

    Milestones break goals into achievable chunks with clear
    success criteria and target dates.
    """

    milestone_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    goal_id: str = Field(..., description="Parent goal ID")
    sequence: int = Field(ge=1, description="Order in milestone sequence")
    title: str = Field(..., description="Short milestone title")
    description: str = Field(..., description="Detailed milestone description")
    success_criteria: List[str] = Field(
        ..., min_length=1, description="List of criteria for completion"
    )
    target_date: date = Field(..., description="Target completion date")
    status: GoalStatus = Field(default=GoalStatus.ACTIVE)
    progress_percentage: float = Field(
        default=0.0, ge=0.0, le=100.0, description="Progress toward completion"
    )
    evidence: List[ProgressEvidence] = Field(
        default_factory=list, description="Evidence of progress"
    )
    notes: List[str] = Field(
        default_factory=list, description="Teacher/system notes"
    )
    started_at: Optional[datetime] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)

    @property
    def is_overdue(self) -> bool:
        """Check if milestone is past target date and not completed."""
        return (
            self.status not in [GoalStatus.COMPLETED, GoalStatus.REVISED]
            and date.today() > self.target_date
        )

    @property
    def days_remaining(self) -> int:
        """Calculate days until target date (negative if overdue)."""
        return (self.target_date - date.today()).days

    def add_evidence(self, evidence: ProgressEvidence) -> None:
        """Add evidence and update progress."""
        self.evidence.append(evidence)

    def to_dict(self) -> Dict[str, Any]:
        """Serialize to dictionary."""
        return {
            "milestone_id": self.milestone_id,
            "goal_id": self.goal_id,
            "sequence": self.sequence,
            "title": self.title,
            "description": self.description,
            "success_criteria": self.success_criteria,
            "target_date": self.target_date.isoformat(),
            "status": self.status.value,
            "progress_percentage": self.progress_percentage,
            "evidence": [e.to_dict() for e in self.evidence],
            "notes": self.notes,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "is_overdue": self.is_overdue,
            "days_remaining": self.days_remaining,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Milestone":
        """Deserialize from dictionary."""
        data = data.copy()
        if isinstance(data.get("target_date"), str):
            data["target_date"] = date.fromisoformat(data["target_date"])
        if isinstance(data.get("status"), str):
            data["status"] = GoalStatus(data["status"])
        if isinstance(data.get("started_at"), str):
            data["started_at"] = datetime.fromisoformat(data["started_at"])
        if isinstance(data.get("completed_at"), str):
            data["completed_at"] = datetime.fromisoformat(data["completed_at"])
        if "evidence" in data:
            data["evidence"] = [
                ProgressEvidence(**e) if isinstance(e, dict) else e
                for e in data["evidence"]
            ]
        data.pop("is_overdue", None)
        data.pop("days_remaining", None)
        return cls(**data)


class WeeklyActivity(BaseModel):
    """Individual activity within a weekly action plan."""

    activity_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = Field(..., description="Activity title")
    description: str = Field(..., description="Detailed description")
    duration_minutes: int = Field(ge=5, le=120, description="Expected duration")
    materials: List[str] = Field(
        default_factory=list, description="Required materials"
    )
    instructions: List[str] = Field(
        default_factory=list, description="Step-by-step instructions"
    )
    skill_focus: List[str] = Field(
        default_factory=list, description="Skills targeted"
    )
    modality: str = Field(
        default="multimodal",
        description="Learning modality: visual, auditory, kinesthetic, multimodal",
    )
    difficulty_level: float = Field(
        default=0.5, ge=0.0, le=1.0, description="Difficulty 0-1"
    )
    completed: bool = Field(default=False)

    def to_dict(self) -> Dict[str, Any]:
        """Serialize to dictionary."""
        return {
            "activity_id": self.activity_id,
            "title": self.title,
            "description": self.description,
            "duration_minutes": self.duration_minutes,
            "materials": self.materials,
            "instructions": self.instructions,
            "skill_focus": self.skill_focus,
            "modality": self.modality,
            "difficulty_level": self.difficulty_level,
            "completed": self.completed,
        }


class WeeklyActionPlan(BaseModel):
    """
    Weekly action plan with scaffolding and parent involvement.

    Provides structured activities, scaffolds, and success indicators
    for a specific week in the goal timeline.
    """

    plan_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    goal_id: str = Field(..., description="Parent goal ID")
    week_number: int = Field(ge=1, description="Week number in goal timeline")
    week_start_date: date = Field(..., description="Start date of the week")
    focus_area: str = Field(..., description="Primary focus for this week")
    theme: Optional[str] = Field(default=None, description="Optional weekly theme")
    activities: List[WeeklyActivity] = Field(
        default_factory=list, description="Activities for the week"
    )
    scaffolds: List[str] = Field(
        default_factory=list, description="Scaffolding supports"
    )
    success_indicators: List[str] = Field(
        default_factory=list, description="How to know the week was successful"
    )
    parent_involvement: List[str] = Field(
        default_factory=list, description="Ways parents can support"
    )
    check_in_prompts: List[str] = Field(
        default_factory=list, description="Questions for progress check-ins"
    )
    adaptations_applied: List[str] = Field(
        default_factory=list, description="Diagnosis adaptations applied"
    )
    notes: str = Field(default="", description="Additional notes")

    @property
    def total_duration_minutes(self) -> int:
        """Calculate total activity duration for the week."""
        return sum(a.duration_minutes for a in self.activities)

    @property
    def completion_percentage(self) -> float:
        """Calculate percentage of activities completed."""
        if not self.activities:
            return 0.0
        completed = sum(1 for a in self.activities if a.completed)
        return (completed / len(self.activities)) * 100

    def to_dict(self) -> Dict[str, Any]:
        """Serialize to dictionary."""
        return {
            "plan_id": self.plan_id,
            "goal_id": self.goal_id,
            "week_number": self.week_number,
            "week_start_date": self.week_start_date.isoformat(),
            "focus_area": self.focus_area,
            "theme": self.theme,
            "activities": [a.to_dict() for a in self.activities],
            "scaffolds": self.scaffolds,
            "success_indicators": self.success_indicators,
            "parent_involvement": self.parent_involvement,
            "check_in_prompts": self.check_in_prompts,
            "adaptations_applied": self.adaptations_applied,
            "notes": self.notes,
            "total_duration_minutes": self.total_duration_minutes,
            "completion_percentage": self.completion_percentage,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "WeeklyActionPlan":
        """Deserialize from dictionary."""
        data = data.copy()
        if isinstance(data.get("week_start_date"), str):
            data["week_start_date"] = date.fromisoformat(data["week_start_date"])
        if "activities" in data:
            data["activities"] = [
                WeeklyActivity(**a) if isinstance(a, dict) else a
                for a in data["activities"]
            ]
        data.pop("total_duration_minutes", None)
        data.pop("completion_percentage", None)
        return cls(**data)


class LearnerContext(BaseModel):
    """
    Context information about a learner for goal planning.

    Contains diagnosis information, current levels, preferences,
    and other data needed for personalized goal generation.
    """

    learner_id: str = Field(..., description="Unique learner identifier")
    grade_level: int = Field(ge=0, le=12, description="Grade level (K=0)")
    age_years: Optional[int] = Field(default=None, ge=3, le=22)
    diagnoses: List[str] = Field(
        default_factory=list, description="Diagnoses: ADHD, ASD, Dyslexia, Anxiety, etc."
    )
    accommodations: List[str] = Field(
        default_factory=list, description="Required accommodations"
    )
    has_iep: bool = Field(default=False, description="Has Individualized Education Program")
    iep_goals: List[str] = Field(
        default_factory=list, description="Existing IEP goal IDs"
    )
    present_levels: Dict[str, str] = Field(
        default_factory=dict, description="Domain -> present level description"
    )
    strengths: List[str] = Field(default_factory=list)
    challenges: List[str] = Field(default_factory=list)
    interests: List[str] = Field(default_factory=list)
    learning_style: str = Field(
        default="multimodal",
        description="Preferred: visual, auditory, kinesthetic, multimodal",
    )
    attention_span_minutes: int = Field(
        default=25, ge=5, le=120, description="Typical attention span"
    )
    preferred_difficulty: float = Field(
        default=0.5, ge=0.0, le=1.0, description="Preferred challenge level"
    )
    session_preferences: Dict[str, Any] = Field(
        default_factory=dict, description="Session configuration preferences"
    )

    @property
    def has_adhd(self) -> bool:
        """Check if learner has ADHD diagnosis."""
        return any("adhd" in d.lower() for d in self.diagnoses)

    @property
    def has_asd(self) -> bool:
        """Check if learner has ASD diagnosis."""
        return any(d.lower() in ["asd", "autism"] for d in self.diagnoses)

    @property
    def has_dyslexia(self) -> bool:
        """Check if learner has dyslexia diagnosis."""
        return any("dyslexia" in d.lower() for d in self.diagnoses)

    @property
    def has_anxiety(self) -> bool:
        """Check if learner has anxiety diagnosis."""
        return any("anxiety" in d.lower() for d in self.diagnoses)

    def to_dict(self) -> Dict[str, Any]:
        """Serialize to dictionary."""
        return {
            "learner_id": self.learner_id,
            "grade_level": self.grade_level,
            "age_years": self.age_years,
            "diagnoses": self.diagnoses,
            "accommodations": self.accommodations,
            "has_iep": self.has_iep,
            "iep_goals": self.iep_goals,
            "present_levels": self.present_levels,
            "strengths": self.strengths,
            "challenges": self.challenges,
            "interests": self.interests,
            "learning_style": self.learning_style,
            "attention_span_minutes": self.attention_span_minutes,
            "preferred_difficulty": self.preferred_difficulty,
            "session_preferences": self.session_preferences,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "LearnerContext":
        """Deserialize from dictionary."""
        return cls(**data)


class LearningGoal(BaseModel):
    """
    Complete learning goal with SMART criteria.

    Represents a full SMART goal with milestones, weekly plans,
    diagnosis adaptations, and progress tracking.
    """

    goal_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    learner_id: str = Field(..., description="Learner this goal belongs to")
    domain: GoalDomain = Field(..., description="Learning domain")
    goal_text: str = Field(..., min_length=10, description="Full goal statement")
    rationale: str = Field(..., description="Why this goal was chosen")

    # SMART components
    smart_criteria: SMARTCriteria = Field(..., description="SMART evaluation")

    # Measurement
    baseline: str = Field(..., description="Starting performance level")
    target: str = Field(..., description="Target performance level")
    measurement_method: str = Field(..., description="How progress is measured")
    measurement_frequency: MeasurementFrequency = Field(
        default=MeasurementFrequency.WEEKLY
    )

    # Timeline
    start_date: date = Field(default_factory=date.today)
    target_date: date = Field(..., description="Goal completion target date")
    review_dates: List[date] = Field(
        default_factory=list, description="Scheduled review dates"
    )

    # Structure
    milestones: List[Milestone] = Field(default_factory=list)
    weekly_actions: List[WeeklyActionPlan] = Field(default_factory=list)

    # Adaptations
    diagnosis_adaptations: Dict[str, List[str]] = Field(
        default_factory=dict, description="Diagnosis -> list of adaptations"
    )
    accommodations: List[str] = Field(
        default_factory=list, description="Applied accommodations"
    )

    # Status
    status: GoalStatus = Field(default=GoalStatus.DRAFT)
    overall_progress: float = Field(
        default=0.0, ge=0.0, le=100.0, description="Overall progress percentage"
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str = Field(default="system", description="Creator: system, teacher, etc.")

    @field_validator("target_date")
    @classmethod
    def target_date_must_be_future(cls, v: date, info) -> date:
        """Ensure target date is after start date."""
        start = info.data.get("start_date", date.today())
        if v <= start:
            raise ValueError("target_date must be after start_date")
        return v

    @property
    def duration_weeks(self) -> int:
        """Calculate goal duration in weeks."""
        delta = self.target_date - self.start_date
        return max(1, delta.days // 7)

    @property
    def weeks_remaining(self) -> int:
        """Calculate weeks remaining until target date."""
        delta = self.target_date - date.today()
        return max(0, delta.days // 7)

    @property
    def is_overdue(self) -> bool:
        """Check if goal is past target date and not completed."""
        return (
            self.status not in [GoalStatus.COMPLETED, GoalStatus.REVISED]
            and date.today() > self.target_date
        )

    @property
    def active_milestone(self) -> Optional[Milestone]:
        """Get the current active milestone."""
        for milestone in sorted(self.milestones, key=lambda m: m.sequence):
            if milestone.status == GoalStatus.ACTIVE:
                return milestone
        return None

    @property
    def completed_milestones_count(self) -> int:
        """Count completed milestones."""
        return sum(1 for m in self.milestones if m.status == GoalStatus.COMPLETED)

    def calculate_progress(self) -> float:
        """Calculate overall progress from milestones."""
        if not self.milestones:
            return 0.0
        total_progress = sum(m.progress_percentage for m in self.milestones)
        return total_progress / len(self.milestones)

    def get_current_week_plan(self) -> Optional[WeeklyActionPlan]:
        """Get the action plan for the current week."""
        today = date.today()
        for plan in self.weekly_actions:
            week_end = plan.week_start_date + timedelta(days=6)
            if plan.week_start_date <= today <= week_end:
                return plan
        return None

    def update_status(self, new_status: GoalStatus) -> None:
        """Update goal status with timestamp."""
        self.status = new_status
        self.updated_at = datetime.utcnow()

    def to_dict(self) -> Dict[str, Any]:
        """Serialize to dictionary."""
        return {
            "goal_id": self.goal_id,
            "learner_id": self.learner_id,
            "domain": self.domain.value,
            "goal_text": self.goal_text,
            "rationale": self.rationale,
            "smart_criteria": self.smart_criteria.to_dict(),
            "baseline": self.baseline,
            "target": self.target,
            "measurement_method": self.measurement_method,
            "measurement_frequency": self.measurement_frequency.value,
            "start_date": self.start_date.isoformat(),
            "target_date": self.target_date.isoformat(),
            "review_dates": [d.isoformat() for d in self.review_dates],
            "milestones": [m.to_dict() for m in self.milestones],
            "weekly_actions": [w.to_dict() for w in self.weekly_actions],
            "diagnosis_adaptations": self.diagnosis_adaptations,
            "accommodations": self.accommodations,
            "status": self.status.value,
            "overall_progress": self.overall_progress,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "created_by": self.created_by,
            "duration_weeks": self.duration_weeks,
            "weeks_remaining": self.weeks_remaining,
            "is_overdue": self.is_overdue,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "LearningGoal":
        """Deserialize from dictionary."""
        data = data.copy()
        if isinstance(data.get("domain"), str):
            data["domain"] = GoalDomain(data["domain"])
        if isinstance(data.get("status"), str):
            data["status"] = GoalStatus(data["status"])
        if isinstance(data.get("measurement_frequency"), str):
            data["measurement_frequency"] = MeasurementFrequency(
                data["measurement_frequency"]
            )
        if isinstance(data.get("start_date"), str):
            data["start_date"] = date.fromisoformat(data["start_date"])
        if isinstance(data.get("target_date"), str):
            data["target_date"] = date.fromisoformat(data["target_date"])
        if isinstance(data.get("created_at"), str):
            data["created_at"] = datetime.fromisoformat(data["created_at"])
        if isinstance(data.get("updated_at"), str):
            data["updated_at"] = datetime.fromisoformat(data["updated_at"])
        if "review_dates" in data:
            data["review_dates"] = [
                date.fromisoformat(d) if isinstance(d, str) else d
                for d in data["review_dates"]
            ]
        if isinstance(data.get("smart_criteria"), dict):
            data["smart_criteria"] = SMARTCriteria(**data["smart_criteria"])
        if "milestones" in data:
            data["milestones"] = [
                Milestone.from_dict(m) if isinstance(m, dict) else m
                for m in data["milestones"]
            ]
        if "weekly_actions" in data:
            data["weekly_actions"] = [
                WeeklyActionPlan.from_dict(w) if isinstance(w, dict) else w
                for w in data["weekly_actions"]
            ]
        # Remove computed properties
        for key in ["duration_weeks", "weeks_remaining", "is_overdue"]:
            data.pop(key, None)
        return cls(**data)


def generate_id() -> str:
    """Generate a unique identifier."""
    return str(uuid.uuid4())
