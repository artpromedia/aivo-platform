"""
Special Needs Support API Router

Endpoints for disability support:
- Create/get support plans
- Apply accommodations
- Get supported disabilities
"""

from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.services.special_needs_support import (
    DisabilityType,
    DisabilitySupportPlan,
    Accommodation,
    get_special_needs_service,
)

router = APIRouter()


class CreateSupportPlanRequest(BaseModel):
    """Request to create a support plan."""

    student_id: UUID
    disability_type: str


class ApplyAccommodationsRequest(BaseModel):
    """Request to apply accommodations to content."""

    student_id: UUID
    content: Dict[str, Any]


@router.post("/support-plans")
async def create_support_plan(request: CreateSupportPlanRequest):
    """Create a support plan for a student."""
    service = get_special_needs_service()

    try:
        disability_type = DisabilityType(request.disability_type)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid disability type: {request.disability_type}",
        )

    plan = await service.create_support_plan(
        student_id=request.student_id,
        disability_type=disability_type,
    )

    return {
        "plan_id": str(plan.id),
        "student_id": str(plan.student_id),
        "disability_type": plan.disability_type.value,
        "accommodation_count": len(plan.accommodations),
        "accommodations": [
            {
                "name": a.name,
                "category": a.category.value,
                "description": a.description,
                "enabled": a.enabled,
            }
            for a in plan.accommodations
        ],
        "message": "Support plan created successfully",
    }


@router.get("/support-plans/{student_id}")
async def get_support_plan(student_id: UUID):
    """Get support plan for a student."""
    service = get_special_needs_service()

    plan = await service.get_support_plan(student_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Support plan not found")

    return {
        "plan_id": str(plan.id),
        "student_id": str(plan.student_id),
        "disability_type": plan.disability_type.value,
        "accommodation_count": len(plan.accommodations),
        "effectiveness_score": plan.effectiveness_score,
    }


@router.post("/apply-accommodations")
async def apply_accommodations(request: ApplyAccommodationsRequest):
    """Apply accommodations from student's support plan to content."""
    service = get_special_needs_service()

    adapted_content = await service.apply_accommodations(
        content=request.content,
        student_id=request.student_id,
    )

    return {
        "adapted_content": adapted_content,
        "message": "Accommodations applied successfully",
    }


@router.get("/supported-disabilities")
async def get_supported_disabilities():
    """Get list of all supported disabilities."""
    service = get_special_needs_service()

    disabilities = await service.get_all_supported_disabilities()

    return {"disabilities": disabilities}


@router.get("/demo/special-needs-showcase")
async def get_special_needs_showcase():
    """Get demo data for special needs showcase."""
    return {
        "special_needs_support": [
            {
                "name": "Autism Support",
                "icon": "🧩",
                "features": [
                    "Predictable routines",
                    "Visual supports",
                    "Sensory considerations",
                    "Social stories",
                ],
                "students_served": 1247,
                "effectiveness": 89,
            },
            {
                "name": "ADHD Support",
                "icon": "⚡",
                "features": [
                    "Gamification",
                    "Micro-breaks",
                    "Executive function scaffolding",
                    "Attention rewards",
                ],
                "students_served": 2341,
                "effectiveness": 86,
            },
            {
                "name": "Dyslexia Intervention",
                "icon": "📖",
                "features": [
                    "Multi-sensory learning",
                    "Phoneme awareness",
                    "Decodable text",
                    "Progress monitoring",
                ],
                "students_served": 1856,
                "effectiveness": 91,
            },
            {
                "name": "Speech & Language",
                "icon": "🗣️",
                "features": [
                    "Articulation therapy",
                    "Fluency practice",
                    "AAC integration",
                    "Pragmatic language",
                ],
                "students_served": 987,
                "effectiveness": 88,
            },
        ],
        "additional_services": [
            {"name": "IEP Management", "icon": "📋", "count": "5,432 active IEPs"},
            {"name": "Transition Services", "icon": "🎓", "count": "1,247 students"},
            {"name": "SEL Programs", "icon": "❤️", "count": "8,934 enrolled"},
            {"name": "Speech Therapy", "icon": "🗣️", "count": "987 students"},
            {"name": "Executive Function", "icon": "🧩", "count": "2,341 students"},
            {"name": "Vocational Training", "icon": "💼", "count": "456 students"},
            {"name": "Self-Determination", "icon": "⭐", "count": "1,123 students"},
            {"name": "Parent Coaching", "icon": "👨‍👩‍👧", "count": "3,456 families"},
        ],
        "research_foundations": [
            {"framework": "CASEL Framework", "area": "Social-Emotional Learning"},
            {"framework": "Wehmeyer Model", "area": "Self-Determination"},
            {"framework": "Universal Design for Learning", "area": "Accessibility"},
            {"framework": "Applied Behavior Analysis", "area": "Behavior Support"},
            {"framework": "Kohler Transition Model", "area": "Career Readiness"},
            {"framework": "Orton-Gillingham", "area": "Dyslexia Intervention"},
        ],
    }
