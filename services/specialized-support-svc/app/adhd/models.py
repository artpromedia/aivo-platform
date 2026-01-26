"""
ADHD-specific models for executive function support.

This module defines all data models for the ADHD AI support system,
including learner profiles, project chunks, time blocks, and strategies.
"""

from datetime import date, datetime, time
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import uuid4

from pydantic import BaseModel, Field, field_validator


def generate_id() -> str:
    """Generate a unique identifier."""
    return str(uuid4())


class ExecutiveFunctionDomain(str, Enum):
    """Executive function domains that can be supported."""

    ORGANIZATION = "organization"
    TIME_MANAGEMENT = "time_management"
    PLANNING = "planning"
    TASK_INITIATION = "task_initiation"
    WORKING_MEMORY = "working_memory"
    METACOGNITION = "metacognition"
    EMOTIONAL_CONTROL = "emotional_control"
    FLEXIBILITY = "flexibility"
    SUSTAINED_ATTENTION = "sustained_attention"
    IMPULSE_CONTROL = "impulse_control"


class TimeBlockCategory(str, Enum):
    """Categories for time blocks in daily schedules."""

    HOMEWORK = "homework"
    BREAK = "break"
    MEAL = "meal"
    ROUTINE = "routine"
    EXERCISE = "exercise"
    FREE_TIME = "free_time"
    SCHOOL = "school"
    TRANSITION = "transition"
    REGULATION = "regulation"


class EnergyLevel(str, Enum):
    """Energy level requirements for tasks."""

    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class TimerStyle(str, Enum):
    """Preferred timer styles for focus sessions."""

    VISUAL = "visual"
    AUDIO = "audio"
    BOTH = "both"


class MovementBreakPreference(str, Enum):
    """Preferred movement break types."""

    ACTIVE = "active"
    STRETCHING = "stretching"
    WALK = "walk"
    FIDGET = "fidget"


class FlexibilityLevel(str, Enum):
    """Flexibility level for time blocks."""

    FIXED = "fixed"
    FLEXIBLE = "flexible"
    MOVEABLE = "moveable"


class FocusTime(str, Enum):
    """Time periods for focus assessment."""

    EARLY_MORNING = "early_morning"
    MORNING = "morning"
    LATE_MORNING = "late_morning"
    AFTER_LUNCH = "after_lunch"
    AFTERNOON = "afternoon"
    LATE_AFTERNOON = "late_afternoon"
    EVENING = "evening"
    LATE_EVENING = "late_evening"


class ADHDProfile(BaseModel):
    """
    Learner ADHD profile containing attention characteristics and preferences.

    This profile is used to personalize all ADHD support features including
    project breakdown, daily planning, and strategy selection.
    """

    learner_id: str

    # Attention characteristics
    optimal_focus_duration_minutes: int = Field(
        default=25,
        ge=10,
        le=45,
        description="Optimal focus duration before needing a break",
    )
    break_duration_minutes: int = Field(
        default=5,
        ge=3,
        le=15,
        description="Duration of short breaks between focus sessions",
    )
    long_break_duration_minutes: int = Field(
        default=15,
        ge=10,
        le=30,
        description="Duration of long breaks after multiple focus sessions",
    )
    sessions_before_long_break: int = Field(
        default=4,
        ge=2,
        le=6,
        description="Number of focus sessions before taking a long break",
    )

    # Peak performance times
    peak_focus_times: List[FocusTime] = Field(
        default_factory=lambda: [FocusTime.MORNING, FocusTime.LATE_AFTERNOON],
        description="Times of day when focus is typically best",
    )
    low_focus_times: List[FocusTime] = Field(
        default_factory=lambda: [FocusTime.AFTER_LUNCH, FocusTime.LATE_EVENING],
        description="Times of day when focus is typically lowest",
    )

    # Preferred strategies
    preferred_timer_style: TimerStyle = Field(
        default=TimerStyle.VISUAL,
        description="Preferred timer display style",
    )
    movement_break_preference: MovementBreakPreference = Field(
        default=MovementBreakPreference.ACTIVE,
        description="Preferred type of movement breaks",
    )

    # Challenges and strengths
    primary_ef_challenges: List[ExecutiveFunctionDomain] = Field(
        default_factory=list,
        description="Primary executive function challenges",
    )
    ef_strengths: List[ExecutiveFunctionDomain] = Field(
        default_factory=list,
        description="Executive function strengths to leverage",
    )

    # Accommodations
    requires_body_doubling: bool = Field(
        default=False,
        description="Whether learner benefits from body doubling support",
    )
    needs_external_deadlines: bool = Field(
        default=True,
        description="Whether learner needs external deadline accountability",
    )
    benefits_from_gamification: bool = Field(
        default=True,
        description="Whether gamification elements help motivation",
    )

    # Time blindness adjustment
    time_estimation_multiplier: float = Field(
        default=1.5,
        ge=1.0,
        le=3.0,
        description="Multiplier to apply to time estimates (accounts for time blindness)",
    )

    # Additional preferences
    prefers_visual_schedules: bool = Field(
        default=True,
        description="Whether learner prefers visual schedule representations",
    )
    needs_transition_warnings: bool = Field(
        default=True,
        description="Whether learner needs advance warning before transitions",
    )
    transition_warning_minutes: int = Field(
        default=5,
        ge=1,
        le=15,
        description="Minutes before transition to give warning",
    )

    class Config:
        """Pydantic configuration."""

        json_schema_extra = {
            "example": {
                "learner_id": "learner_123",
                "optimal_focus_duration_minutes": 25,
                "break_duration_minutes": 5,
                "sessions_before_long_break": 4,
                "peak_focus_times": ["morning", "late_afternoon"],
                "primary_ef_challenges": ["task_initiation", "time_management"],
                "ef_strengths": ["flexibility", "metacognition"],
            }
        }


class ProjectChunk(BaseModel):
    """
    Single chunk of a broken-down project.

    Each chunk is designed to be completable within the learner's
    optimal focus duration with clear start and end points.
    """

    chunk_id: str = Field(default_factory=generate_id)
    project_id: str
    sequence: int = Field(ge=1, description="Order in which to complete chunks")
    title: str = Field(min_length=1, description="Action-oriented title")
    description: str = Field(description="Detailed description of what to do")
    estimated_minutes: int = Field(
        ge=15,
        le=45,
        description="Estimated time to complete",
    )
    materials_needed: List[str] = Field(
        default_factory=list,
        description="Materials to gather before starting",
    )
    start_prompt: str = Field(
        description="Specific first action to overcome task initiation",
    )
    completion_indicator: str = Field(
        description="How to know when this chunk is done",
    )
    energy_level_required: EnergyLevel = Field(
        default=EnergyLevel.MEDIUM,
        description="Energy level required for this chunk",
    )
    can_be_interrupted: bool = Field(
        default=True,
        description="Whether this chunk can be paused and resumed",
    )

    # Progress tracking
    is_completed: bool = Field(default=False)
    actual_minutes_spent: Optional[int] = Field(
        default=None,
        description="Actual time spent (for calibration)",
    )
    started_at: Optional[datetime] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)

    @field_validator("title")
    @classmethod
    def validate_title_starts_with_verb(cls, v: str) -> str:
        """Ensure title is action-oriented (starts with verb)."""
        # Common action verbs for tasks
        action_verbs = {
            "read", "write", "create", "complete", "review", "organize",
            "research", "draft", "edit", "analyze", "outline", "gather",
            "plan", "design", "build", "test", "check", "prepare", "finish",
            "start", "continue", "brainstorm", "list", "identify", "solve",
            "answer", "practice", "study", "memorize", "calculate", "draw",
        }
        first_word = v.split()[0].lower()
        if first_word not in action_verbs:
            # Allow but don't enforce - user may have valid titles
            pass
        return v


class TimeBlock(BaseModel):
    """
    Single time block in a daily schedule.

    Represents a discrete period of time with a specific activity.
    """

    block_id: str = Field(default_factory=generate_id)
    start_time: time
    end_time: time
    category: TimeBlockCategory
    activity: str = Field(description="What to do during this block")
    notes: str = Field(default="", description="Additional notes or tips")
    flexibility: FlexibilityLevel = Field(
        default=FlexibilityLevel.FIXED,
        description="How flexible this block's timing is",
    )

    # Optional task reference
    task_id: Optional[str] = Field(
        default=None,
        description="Reference to associated task if applicable",
    )
    chunk_id: Optional[str] = Field(
        default=None,
        description="Reference to project chunk if applicable",
    )

    # For tracking
    is_completed: bool = Field(default=False)

    @property
    def duration_minutes(self) -> int:
        """Calculate block duration in minutes."""
        start_dt = datetime.combine(date.today(), self.start_time)
        end_dt = datetime.combine(date.today(), self.end_time)
        return int((end_dt - start_dt).total_seconds() / 60)

    @field_validator("end_time")
    @classmethod
    def validate_end_after_start(cls, v: time, info) -> time:
        """Ensure end time is after start time."""
        if "start_time" in info.data and v <= info.data["start_time"]:
            raise ValueError("end_time must be after start_time")
        return v


class DailySchedule(BaseModel):
    """
    Complete daily schedule optimized for ADHD.

    Contains all time blocks for the day along with tips and strategies.
    """

    schedule_id: str = Field(default_factory=generate_id)
    learner_id: str
    date: date
    time_blocks: List[TimeBlock] = Field(default_factory=list)

    # Daily guidance
    morning_tip: str = Field(
        default="",
        description="Personalized tip for starting the day",
    )
    evening_tip: str = Field(
        default="",
        description="Personalized tip for winding down",
    )
    focus_strategies: List[str] = Field(
        default_factory=list,
        description="Strategies to use throughout the day",
    )

    # Buffer and transition settings
    buffer_time_minutes: int = Field(
        default=15,
        ge=5,
        le=30,
        description="Buffer time between major activities",
    )

    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_modified_at: datetime = Field(default_factory=datetime.utcnow)

    # Schedule metrics
    total_focus_minutes: int = Field(
        default=0,
        description="Total minutes of focused work scheduled",
    )
    total_break_minutes: int = Field(
        default=0,
        description="Total minutes of breaks scheduled",
    )
    focus_to_break_ratio: float = Field(
        default=0.0,
        description="Ratio of focus time to break time",
    )

    def calculate_metrics(self) -> None:
        """Calculate schedule metrics from time blocks."""
        focus_minutes = 0
        break_minutes = 0

        for block in self.time_blocks:
            duration = block.duration_minutes
            if block.category == TimeBlockCategory.HOMEWORK:
                focus_minutes += duration
            elif block.category in [TimeBlockCategory.BREAK, TimeBlockCategory.REGULATION]:
                break_minutes += duration

        self.total_focus_minutes = focus_minutes
        self.total_break_minutes = break_minutes
        self.focus_to_break_ratio = (
            focus_minutes / break_minutes if break_minutes > 0 else 0.0
        )

    def get_sorted_blocks(self) -> List[TimeBlock]:
        """Get time blocks sorted by start time."""
        return sorted(self.time_blocks, key=lambda x: x.start_time)


class EFStrategy(BaseModel):
    """
    Executive function strategy.

    Represents a specific technique for addressing executive function challenges.
    """

    strategy_id: str = Field(default_factory=generate_id)
    domain: ExecutiveFunctionDomain
    name: str = Field(min_length=1, description="Strategy name")
    description: str = Field(description="Brief description of the strategy")
    steps: List[str] = Field(
        min_length=1,
        description="Step-by-step instructions",
    )
    tools_needed: List[str] = Field(
        default_factory=list,
        description="Tools or materials needed",
    )
    best_for: List[str] = Field(
        description="Situations where this strategy works best",
    )
    practice_frequency: str = Field(
        description="How often to practice: daily, weekly, or as_needed",
    )

    # Effectiveness tracking
    times_used: int = Field(default=0)
    effectiveness_rating: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=5.0,
        description="User-rated effectiveness (0-5)",
    )

    # Personalization
    is_favorite: bool = Field(default=False)
    personal_notes: str = Field(
        default="",
        description="Learner's personal notes about this strategy",
    )


class Task(BaseModel):
    """
    Task to be scheduled in daily planning.

    Represents a homework assignment or other task that needs to be
    incorporated into the daily schedule.
    """

    task_id: str = Field(default_factory=generate_id)
    title: str
    description: str = Field(default="")
    subject_area: str = Field(default="general")
    estimated_minutes: int = Field(ge=5, description="Estimated time to complete")
    priority: int = Field(
        default=2,
        ge=1,
        le=3,
        description="Priority level: 1=high, 2=medium, 3=low",
    )
    due_date: Optional[date] = Field(default=None)
    due_time: Optional[time] = Field(default=None)

    # Energy and focus requirements
    energy_level_required: EnergyLevel = Field(default=EnergyLevel.MEDIUM)
    requires_deep_focus: bool = Field(
        default=False,
        description="Whether task requires sustained concentration",
    )

    # Chunking
    is_chunked: bool = Field(default=False)
    chunks: List[ProjectChunk] = Field(default_factory=list)

    # Completion tracking
    is_completed: bool = Field(default=False)
    completed_at: Optional[datetime] = Field(default=None)


class SupportRequest(BaseModel):
    """
    Request for ADHD support.

    Used to request various types of support from the ADHD AI service.
    """

    learner_id: str
    support_type: str = Field(
        description="Type: project_breakdown, daily_planning, ef_strategies, focus_help, stuck_help",
    )
    context: Dict[str, Any] = Field(
        default_factory=dict,
        description="Context-specific data for the request",
    )
    urgency: str = Field(
        default="normal",
        description="Request urgency: low, normal, high",
    )


class MovementBreak(BaseModel):
    """
    Movement break activity.

    Represents a specific movement break activity with instructions.
    """

    break_id: str = Field(default_factory=generate_id)
    name: str
    category: MovementBreakPreference
    duration_minutes: int = Field(ge=1, le=15)
    instructions: List[str]
    energy_level: EnergyLevel = Field(
        description="Energy level this break provides/requires",
    )
    indoor_friendly: bool = Field(default=True)
    quiet_option: bool = Field(
        default=True,
        description="Can be done quietly (for classroom/library)",
    )


class RegulationActivity(BaseModel):
    """
    Emotional regulation activity.

    Activities for managing emotional dysregulation common with ADHD.
    """

    activity_id: str = Field(default_factory=generate_id)
    name: str
    description: str
    when_to_use: List[str] = Field(
        description="Emotional states when this activity helps",
    )
    steps: List[str]
    duration_minutes: int = Field(ge=1, le=15)
    calming_level: int = Field(
        ge=1,
        le=5,
        description="How calming (1=energizing, 5=very calming)",
    )


class FocusSession(BaseModel):
    """
    Focus session tracking.

    Tracks a single focus session for analytics and adjustment.
    """

    session_id: str = Field(default_factory=generate_id)
    learner_id: str
    started_at: datetime
    planned_duration_minutes: int
    actual_duration_minutes: Optional[int] = Field(default=None)
    ended_at: Optional[datetime] = Field(default=None)

    # Context
    task_id: Optional[str] = Field(default=None)
    chunk_id: Optional[str] = Field(default=None)

    # Outcome tracking
    was_completed: bool = Field(default=False)
    interruption_count: int = Field(default=0)
    focus_quality_rating: Optional[int] = Field(
        default=None,
        ge=1,
        le=5,
        description="Self-rated focus quality (1-5)",
    )

    # For learning optimal durations
    felt_too_long: bool = Field(default=False)
    felt_too_short: bool = Field(default=False)
