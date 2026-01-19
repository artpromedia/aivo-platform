"""
Student Brain API Router

Endpoints for Student Brain AI management:
- Create/get student brains
- Start/end learning sessions
- Generate adaptive activities
- Track flow state and frustration
"""

from typing import Any, Dict, Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.services.student_brain import (
    StudentBrain,
    LearningSession,
    AdaptiveActivity,
    get_student_brain_service,
)

router = APIRouter()


class CreateBrainRequest(BaseModel):
    """Request to create a student brain."""

    student_id: UUID
    initial_profile: Optional[Dict[str, Any]] = None


class CreateBrainResponse(BaseModel):
    """Response with created brain."""

    brain: Dict[str, Any]
    message: str


class StartSessionRequest(BaseModel):
    """Request to start a learning session."""

    student_id: UUID


class GenerateActivityRequest(BaseModel):
    """Request to generate next activity."""

    session_id: UUID
    goal_id: Optional[UUID] = None
    goal_domain: str = "reading"


class RecordActivityRequest(BaseModel):
    """Request to record activity completion."""

    activity_id: UUID
    is_correct: bool
    response_time_seconds: int
    response_data: Optional[Dict[str, Any]] = None


@router.post("/brains", response_model=CreateBrainResponse)
async def create_brain(request: CreateBrainRequest):
    """Create a new Student Brain for a student."""
    service = get_student_brain_service()

    brain = await service.create_brain(
        student_id=request.student_id,
        initial_profile=request.initial_profile,
    )

    return CreateBrainResponse(
        brain=brain.to_dict(),
        message="Student brain created successfully",
    )


@router.get("/brains/{student_id}")
async def get_brain(student_id: UUID):
    """Get Student Brain by student ID."""
    service = get_student_brain_service()

    brain = await service.get_brain(student_id)
    if not brain:
        raise HTTPException(status_code=404, detail="Student brain not found")

    return {"brain": brain.to_dict()}


@router.post("/sessions")
async def start_session(request: StartSessionRequest):
    """Start a new learning session."""
    service = get_student_brain_service()

    brain = await service.get_brain(request.student_id)
    if not brain:
        # Auto-create brain if not exists
        brain = await service.create_brain(request.student_id)

    session = await service.start_session(brain)

    return {
        "session_id": str(session.id),
        "brain_id": str(brain.id),
        "started_at": session.started_at.isoformat(),
        "message": "Learning session started",
    }


@router.post("/sessions/{session_id}/end")
async def end_session(session_id: UUID):
    """End a learning session."""
    service = get_student_brain_service()

    session = service._sessions.get(str(session_id))
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    ended_session = await service.end_session(session)

    return {
        "session_id": str(ended_session.id),
        "duration_seconds": ended_session.duration_seconds,
        "questions_attempted": ended_session.questions_attempted,
        "questions_correct": ended_session.questions_correct,
        "accuracy_percentage": ended_session.accuracy_percentage,
        "flow_state_percentage": ended_session.flow_state_percentage,
        "message": "Learning session ended",
    }


@router.post("/activities/generate")
async def generate_activity(request: GenerateActivityRequest):
    """Generate next adaptive activity for a session."""
    service = get_student_brain_service()

    session = service._sessions.get(str(request.session_id))
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    brain = await service.get_brain(session.student_id)
    if not brain:
        raise HTTPException(status_code=404, detail="Student brain not found")

    activity = await service.generate_next_activity(
        brain=brain,
        session=session,
        goal_id=request.goal_id,
        goal_domain=request.goal_domain,
    )

    return {
        "activity_id": str(activity.id),
        "activity_type": activity.activity_type,
        "difficulty_level": activity.difficulty_level,
        "content": activity.content,
    }


@router.get("/sessions/{session_id}/flow-state")
async def get_flow_state(session_id: UUID):
    """Get current flow state detection for a session."""
    service = get_student_brain_service()

    session = service._sessions.get(str(session_id))
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # For demo, generate simulated flow state
    flow_state = {
        "in_flow": True,
        "confidence": 0.85,
        "indicators": {
            "time_consistency": True,
            "accuracy_optimal": True,
            "no_frustration": session.frustration_events < 2,
        },
    }

    return flow_state


@router.get("/demo/brain-showcase")
async def get_brain_showcase():
    """Get demo data for Student Brain showcase."""
    return {
        "student_name": "Emma Johnson",
        "grade": "5th Grade",
        "learning_style": "Visual-Kinesthetic",
        "reading_level": 4.7,
        "math_level": 5.2,
        "attention_span": 18,
        "strengths": ["Pattern Recognition", "Creative Thinking", "Problem Decomposition"],
        "challenges": ["Working Memory", "Time Management"],
        "current_goals": [
            {"name": "Reading Comprehension", "progress": 78, "target": "Grade 5.0 level"},
            {"name": "Math Word Problems", "progress": 65, "target": "80% accuracy"},
            {"name": "Focus Duration", "progress": 85, "target": "20 min sessions"},
        ],
        "adaptations": [
            "Visual scaffolding for math problems",
            "Chunked reading passages",
            "Frequent micro-breaks (5 min intervals)",
            "Audio support available on-demand",
        ],
        "recent_activity": {
            "accuracy": 84,
            "flow_time": 72,
            "frustration_events": 1,
            "questions_completed": 24,
        },
    }
