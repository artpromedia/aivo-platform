"""
Emotion Recognition API Router

Endpoints for SEL emotion recognition:
- Get emotion library
- Generate scenarios
- Track mastery
- Get recommendations
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.services.emotion_recognition import (
    EmotionCategory,
    get_emotion_recognition_service,
)

router = APIRouter()


class RecordAttemptRequest(BaseModel):
    """Request to record an emotion recognition attempt."""

    student_id: UUID
    emotion_id: str
    is_correct: bool


class GenerateScenarioRequest(BaseModel):
    """Request to generate an emotion scenario."""

    emotion_id: str
    difficulty_level: int = 1


@router.get("/emotions")
async def get_all_emotions():
    """Get all emotions in the library."""
    service = get_emotion_recognition_service()

    emotions = await service.get_all_emotions()

    return {
        "emotions": [
            {
                "id": e.id,
                "name": e.name,
                "category": e.category.value,
                "description": e.description,
                "difficulty_level": e.difficulty_level,
                "facial_cues": e.facial_cues,
                "body_cues": e.body_cues,
            }
            for e in emotions
        ],
        "total_count": len(emotions),
    }


@router.get("/emotions/{emotion_id}")
async def get_emotion(emotion_id: str):
    """Get a specific emotion by ID."""
    service = get_emotion_recognition_service()

    emotion = await service.get_emotion(emotion_id)
    if not emotion:
        raise HTTPException(status_code=404, detail="Emotion not found")

    return {
        "id": emotion.id,
        "name": emotion.name,
        "category": emotion.category.value,
        "description": emotion.description,
        "difficulty_level": emotion.difficulty_level,
        "facial_cues": emotion.facial_cues,
        "body_cues": emotion.body_cues,
        "situations": emotion.situations,
    }


@router.get("/emotions/category/{category}")
async def get_emotions_by_category(category: str):
    """Get emotions by category."""
    service = get_emotion_recognition_service()

    try:
        cat = EmotionCategory(category)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid category: {category}")

    emotions = await service.get_emotions_by_category(cat)

    return {
        "category": category,
        "emotions": [
            {
                "id": e.id,
                "name": e.name,
                "difficulty_level": e.difficulty_level,
            }
            for e in emotions
        ],
        "count": len(emotions),
    }


@router.post("/scenarios")
async def generate_scenario(request: GenerateScenarioRequest):
    """Generate an emotion recognition scenario."""
    service = get_emotion_recognition_service()

    try:
        scenario = await service.generate_scenario(
            emotion_id=request.emotion_id,
            difficulty_level=request.difficulty_level,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "scenario_id": str(scenario.id),
        "emotion_id": scenario.emotion_id,
        "difficulty_level": scenario.difficulty_level,
        "scenario_text": scenario.scenario_text,
        "visual_cues": scenario.visual_cues,
        "correct_answer": scenario.correct_answer,
        "options": [scenario.correct_answer] + scenario.distractors,
        "explanation": scenario.explanation,
    }


@router.post("/attempts")
async def record_attempt(request: RecordAttemptRequest):
    """Record an emotion recognition attempt."""
    service = get_emotion_recognition_service()

    mastery = await service.record_attempt(
        student_id=request.student_id,
        emotion_id=request.emotion_id,
        is_correct=request.is_correct,
    )

    return {
        "emotion_id": mastery.emotion_id,
        "attempts": mastery.attempts,
        "correct": mastery.correct,
        "accuracy": round(mastery.accuracy, 1),
        "is_mastered": mastery.is_mastered,
    }


@router.get("/mastery/{student_id}")
async def get_mastery_summary(student_id: UUID):
    """Get emotion mastery summary for a student."""
    service = get_emotion_recognition_service()

    summary = await service.get_mastery_summary(student_id)

    return summary


@router.get("/recommendations/{student_id}")
async def get_recommendations(student_id: UUID, count: int = 5):
    """Get recommended emotions to practice for a student."""
    service = get_emotion_recognition_service()

    recommendations = await service.get_recommended_emotions(
        student_id=student_id,
        count=count,
    )

    return {"recommendations": recommendations}


@router.get("/demo/emotion-showcase")
async def get_emotion_showcase():
    """Get demo data for emotion recognition showcase."""
    service = get_emotion_recognition_service()

    emotions = await service.get_all_emotions()

    return {
        "total_emotions": len(emotions),
        "categories": {
            "basic": len([e for e in emotions if e.category == EmotionCategory.BASIC]),
            "social": len([e for e in emotions if e.category == EmotionCategory.SOCIAL]),
            "self_conscious": len([e for e in emotions if e.category == EmotionCategory.SELF_CONSCIOUS]),
            "cognitive": len([e for e in emotions if e.category == EmotionCategory.COGNITIVE]),
        },
        "sample_emotions": [
            {"name": e.name, "category": e.category.value, "difficulty": e.difficulty_level}
            for e in list(emotions)[:10]
        ],
        "features": [
            "20+ emotions with research-backed definitions",
            "5 difficulty levels for adaptive learning",
            "Multi-sensory scenario generation",
            "Individual mastery tracking",
            "CASEL framework alignment",
        ],
    }
