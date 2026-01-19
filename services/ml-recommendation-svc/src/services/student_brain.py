"""
Student Brain AI Service

Personalized AI model per student that:
- Learns from IEP goals and disability profile
- Adapts difficulty based on real-time performance
- Tracks engagement, flow state, and frustration signals
- Generates activity sequences based on learning style
"""

import json
import random
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

import structlog
from pydantic import BaseModel, Field

from src.services.ai_provider import get_ai_provider

logger = structlog.get_logger()


class StudentProfile(BaseModel):
    """Student profile discovered over time by the brain."""

    learning_style: str = Field(default="visual")
    strengths: List[str] = Field(default_factory=list)
    challenges: List[str] = Field(default_factory=list)
    interests: List[str] = Field(default_factory=lambda: ["animals", "sports", "space"])
    disability: Optional[str] = None
    grade: int = 3
    preferred_activity_types: List[str] = Field(default_factory=list)
    attention_span_minutes: int = 15
    optimal_session_length: int = 20
    best_time_of_day: str = "morning"
    font_preference: str = "OpenDyslexic"
    timer_preference: str = "visible"


class StudentBrain(BaseModel):
    """AI Brain for a student - personalized learning model."""

    id: UUID = Field(default_factory=uuid4)
    student_id: UUID
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    master_brain_version: str = "1.0.0"

    # Assessment data
    assessment_completed: bool = False
    assessment_date: Optional[datetime] = None
    reading_level: float = 3.0
    math_level: float = 3.0
    attention_span_seconds: int = 900

    # Learning profile
    profile: StudentProfile = Field(default_factory=StudentProfile)

    # Model configuration
    model_config_data: Dict[str, Any] = Field(
        default_factory=lambda: {"base_model": "llama3.1-8b", "quantization": "int8"}
    )

    @property
    def is_initialized(self) -> bool:
        """Check if brain is fully initialized."""
        return self.reading_level is not None and self.math_level is not None

    def to_dict(self) -> Dict[str, Any]:
        """Convert brain to dictionary."""
        return {
            "id": str(self.id),
            "student_id": str(self.student_id),
            "created_at": self.created_at.isoformat(),
            "last_updated": self.last_updated.isoformat(),
            "master_brain_version": self.master_brain_version,
            "assessment_completed": self.assessment_completed,
            "assessment_date": (
                self.assessment_date.isoformat() if self.assessment_date else None
            ),
            "reading_level": self.reading_level,
            "math_level": self.math_level,
            "attention_span_seconds": self.attention_span_seconds,
            "profile": self.profile.model_dump(),
            "model_config": self.model_config_data,
            "is_initialized": self.is_initialized,
        }


class LearningSession(BaseModel):
    """Individual learning session for a student."""

    id: UUID = Field(default_factory=uuid4)
    student_id: UUID
    brain_id: UUID
    started_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None

    # Session metrics
    questions_attempted: int = 0
    questions_correct: int = 0
    time_in_flow_state_seconds: int = 0
    frustration_events: int = 0

    # Session context
    session_data: Dict[str, Any] = Field(default_factory=dict)

    @property
    def is_active(self) -> bool:
        """Check if session is currently active."""
        return self.ended_at is None

    @property
    def accuracy_percentage(self) -> Optional[float]:
        """Calculate accuracy percentage."""
        if self.questions_attempted == 0:
            return None
        return (self.questions_correct / self.questions_attempted) * 100

    @property
    def flow_state_percentage(self) -> Optional[float]:
        """Calculate percentage of time in flow state."""
        if not self.duration_seconds or self.duration_seconds == 0:
            return None
        return (self.time_in_flow_state_seconds / self.duration_seconds) * 100


class AdaptiveActivity(BaseModel):
    """Individual adaptive activity within a learning session."""

    id: UUID = Field(default_factory=uuid4)
    session_id: UUID
    goal_id: Optional[UUID] = None
    activity_type: str
    difficulty_level: int
    content: Dict[str, Any]
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    time_taken_seconds: Optional[int] = None
    accuracy: Optional[float] = None
    response_data: Dict[str, Any] = Field(default_factory=dict)

    @property
    def is_completed(self) -> bool:
        """Check if activity is completed."""
        return self.completed_at is not None


class StudentBrainService:
    """Service for managing Student Brain AI."""

    def __init__(self):
        self.ai_provider = get_ai_provider()
        # In-memory storage for demo (would use database in production)
        self._brains: Dict[str, StudentBrain] = {}
        self._sessions: Dict[str, LearningSession] = {}

    async def create_brain(
        self,
        student_id: UUID,
        initial_profile: Optional[Dict[str, Any]] = None,
    ) -> StudentBrain:
        """Create a new Student Brain for a student."""
        profile = StudentProfile(**(initial_profile or {}))

        brain = StudentBrain(
            student_id=student_id,
            profile=profile,
        )

        self._brains[str(brain.id)] = brain
        self._brains[str(student_id)] = brain  # Also index by student_id

        logger.info(
            "student_brain_created",
            brain_id=str(brain.id),
            student_id=str(student_id),
        )

        return brain

    async def get_brain(
        self, student_id: UUID
    ) -> Optional[StudentBrain]:
        """Get Student Brain by student ID."""
        return self._brains.get(str(student_id))

    async def update_brain_from_session(
        self,
        brain: StudentBrain,
        session: LearningSession,
    ) -> StudentBrain:
        """Update brain profile based on session performance."""

        # Adjust difficulty preferences based on accuracy
        if session.accuracy_percentage:
            if session.accuracy_percentage > 90:
                # Student found it too easy, increase difficulty preference
                brain.profile.preferred_activity_types.append("challenging")
            elif session.accuracy_percentage < 70:
                # Student struggled, adjust approach
                brain.profile.challenges.append("current_difficulty_level")

        # Update attention span based on flow state
        if session.flow_state_percentage:
            if session.flow_state_percentage > 70:
                brain.attention_span_seconds = min(
                    brain.attention_span_seconds + 60, 1800
                )
            elif session.flow_state_percentage < 30:
                brain.attention_span_seconds = max(
                    brain.attention_span_seconds - 60, 300
                )

        # Track frustration patterns
        if session.frustration_events > 3:
            brain.profile.optimal_session_length = max(
                brain.profile.optimal_session_length - 5, 10
            )

        brain.last_updated = datetime.utcnow()

        logger.info(
            "brain_updated_from_session",
            brain_id=str(brain.id),
            accuracy=session.accuracy_percentage,
            flow_state=session.flow_state_percentage,
        )

        return brain

    async def calculate_optimal_difficulty(
        self,
        brain: StudentBrain,
        goal_domain: str,
        session_context: Dict[str, Any],
    ) -> int:
        """Calculate optimal difficulty level for next activity."""

        # Base difficulty on academic level
        base_level = int(brain.reading_level if goal_domain == "reading" else brain.math_level)

        # Adjust based on recent performance
        recent_accuracy = session_context.get("recent_accuracy", 75)
        if recent_accuracy > 90:
            adjustment = 1
        elif recent_accuracy < 70:
            adjustment = -1
        else:
            adjustment = 0

        # Adjust for frustration
        frustration_level = session_context.get("frustration_level", 0)
        if frustration_level > 50:
            adjustment -= 1

        # Ensure difficulty is within bounds
        return max(1, min(10, base_level + adjustment))

    async def detect_flow_state(
        self,
        session: LearningSession,
        recent_activities: List[AdaptiveActivity],
    ) -> Dict[str, Any]:
        """Detect if student is in flow state based on activity patterns."""

        if not recent_activities:
            return {"in_flow": False, "confidence": 0.0}

        # Calculate metrics
        avg_time_per_activity = sum(
            a.time_taken_seconds or 0 for a in recent_activities
        ) / len(recent_activities)

        avg_accuracy = sum(
            a.accuracy or 0 for a in recent_activities
        ) / len(recent_activities)

        # Flow state indicators:
        # 1. Consistent response times (not too fast, not too slow)
        # 2. High accuracy (70-90%)
        # 3. Completing activities without frustration events

        time_consistency = 10 < avg_time_per_activity < 60
        accuracy_optimal = 70 <= avg_accuracy <= 95
        no_frustration = session.frustration_events < 2

        in_flow = time_consistency and accuracy_optimal and no_frustration
        confidence = (
            (0.33 if time_consistency else 0)
            + (0.34 if accuracy_optimal else 0)
            + (0.33 if no_frustration else 0)
        )

        return {
            "in_flow": in_flow,
            "confidence": confidence,
            "indicators": {
                "time_consistency": time_consistency,
                "accuracy_optimal": accuracy_optimal,
                "no_frustration": no_frustration,
            },
        }

    async def detect_frustration(
        self,
        activity: AdaptiveActivity,
        response_time_seconds: int,
        is_correct: bool,
    ) -> Dict[str, Any]:
        """Detect frustration signals from activity response."""

        frustration_signals = []

        # Signal 1: Very fast incorrect response (giving up)
        if not is_correct and response_time_seconds < 3:
            frustration_signals.append("rapid_incorrect_response")

        # Signal 2: Very slow response (struggling)
        expected_time = activity.content.get("expected_time", 30)
        if response_time_seconds > expected_time * 3:
            frustration_signals.append("prolonged_struggle")

        # Signal 3: Multiple incorrect attempts on same type
        previous_incorrect = activity.response_data.get("incorrect_attempts", 0)
        if not is_correct and previous_incorrect >= 2:
            frustration_signals.append("repeated_failure")

        is_frustrated = len(frustration_signals) > 0
        severity = min(len(frustration_signals) * 0.33, 1.0)

        return {
            "is_frustrated": is_frustrated,
            "severity": severity,
            "signals": frustration_signals,
            "recommendation": (
                "reduce_difficulty" if is_frustrated else "continue"
            ),
        }

    async def start_session(
        self,
        brain: StudentBrain,
    ) -> LearningSession:
        """Start a new learning session."""
        session = LearningSession(
            student_id=brain.student_id,
            brain_id=brain.id,
        )

        self._sessions[str(session.id)] = session

        logger.info(
            "learning_session_started",
            session_id=str(session.id),
            student_id=str(brain.student_id),
        )

        return session

    async def end_session(
        self,
        session: LearningSession,
    ) -> LearningSession:
        """End a learning session and update brain."""
        session.ended_at = datetime.utcnow()
        session.duration_seconds = int(
            (session.ended_at - session.started_at).total_seconds()
        )

        # Get the brain and update it
        brain = self._brains.get(str(session.student_id))
        if brain:
            await self.update_brain_from_session(brain, session)

        logger.info(
            "learning_session_ended",
            session_id=str(session.id),
            duration_seconds=session.duration_seconds,
            accuracy=session.accuracy_percentage,
        )

        return session

    async def generate_next_activity(
        self,
        brain: StudentBrain,
        session: LearningSession,
        goal_id: Optional[UUID] = None,
        goal_domain: str = "reading",
    ) -> AdaptiveActivity:
        """Generate next adaptive activity for the session."""

        # Calculate optimal difficulty
        session_context = {
            "recent_accuracy": session.accuracy_percentage or 75,
            "frustration_level": min(session.frustration_events * 20, 100),
        }

        difficulty = await self.calculate_optimal_difficulty(
            brain, goal_domain, session_context
        )

        # Select activity type based on brain preferences
        activity_types = {
            "reading": ["reading_game", "phonics_drill", "interactive_story"],
            "math": ["math_problem", "math_game", "word_problem"],
            "behavior": ["social_story", "role_play", "self_regulation_activity"],
        }

        available_types = activity_types.get(goal_domain, ["reading_game"])
        activity_type = random.choice(available_types)

        # Generate activity content using AI
        content = await self._generate_activity_content(
            brain, activity_type, difficulty, goal_domain
        )

        activity = AdaptiveActivity(
            session_id=session.id,
            goal_id=goal_id,
            activity_type=activity_type,
            difficulty_level=difficulty,
            content=content,
        )

        logger.info(
            "activity_generated",
            activity_id=str(activity.id),
            activity_type=activity_type,
            difficulty=difficulty,
        )

        return activity

    async def _generate_activity_content(
        self,
        brain: StudentBrain,
        activity_type: str,
        difficulty: int,
        domain: str,
    ) -> Dict[str, Any]:
        """Generate activity content using AI provider."""

        interests = brain.profile.interests
        interest = random.choice(interests) if interests else "animals"

        prompt = f"""
Generate an engaging {activity_type} for a grade {brain.profile.grade} student.

Domain: {domain}
Difficulty: {difficulty}/10
Student interest: {interest}
Reading level: {brain.reading_level}
Math level: {brain.math_level}
Learning style: {brain.profile.learning_style}

Return valid JSON with:
{{
  "title": "Activity title with {interest} theme",
  "instructions": "Clear, simple instructions",
  "questions": [
    {{
      "id": "q1",
      "type": "multiple_choice",
      "content": "Question text",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "A",
      "hint": "Helpful hint",
      "explanation": "Why this is correct"
    }}
  ],
  "success_criteria": {{
    "accuracy_threshold": 0.8,
    "time_limit_per_question": 30
  }}
}}
"""

        try:
            result = await self.ai_provider.complete_with_json(
                prompt=prompt,
                system_prompt="You are an educational content generator. Create engaging, age-appropriate learning activities.",
                temperature=0.7,
            )
            return result
        except Exception as e:
            logger.error("activity_generation_failed", error=str(e))
            # Return fallback content
            return self._get_fallback_content(activity_type, interest, difficulty)

    def _get_fallback_content(
        self,
        activity_type: str,
        interest: str,
        difficulty: int,
    ) -> Dict[str, Any]:
        """Get fallback content when AI generation fails."""
        return {
            "title": f"{interest.title()} {activity_type.replace('_', ' ').title()}",
            "instructions": "Complete the activity by answering all questions.",
            "questions": [
                {
                    "id": "q1",
                    "type": "multiple_choice",
                    "content": "What is 2 + 2?",
                    "options": ["3", "4", "5", "6"],
                    "correct_answer": "4",
                    "hint": "Count on your fingers",
                    "explanation": "2 + 2 = 4",
                }
            ],
            "success_criteria": {
                "accuracy_threshold": 0.8,
                "time_limit_per_question": 30,
            },
        }


# Global service instance
_student_brain_service: Optional[StudentBrainService] = None


def get_student_brain_service() -> StudentBrainService:
    """Get global Student Brain service instance."""
    global _student_brain_service
    if _student_brain_service is None:
        _student_brain_service = StudentBrainService()
    return _student_brain_service
