"""
AI Explainability API Routes

REST API endpoints providing human-readable explanations for AI-driven
recommendations, enabling teacher/admin transparency into AI decisions.

Endpoints:
  GET /explain/{recommendation_id}          — explain a single recommendation
  GET /explain/student/{student_id}/recent  — recent explanations for a student
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
import structlog

from src.lib.supabase_client import get_supabase_client

logger = structlog.get_logger()

router = APIRouter(prefix="/explain", tags=["explainability"])


# ═══════════════════════════════════════════════════════════════════════════════
# MODELS
# ═══════════════════════════════════════════════════════════════════════════════


class ExplanationFactor(BaseModel):
    """A single contributing factor to a recommendation."""

    factor: str = Field(..., description="Factor name")
    weight: float = Field(..., ge=0.0, le=1.0, description="Relative weight 0–1")
    description: str = Field(..., description="Human-readable description")


class RecommendationExplanation(BaseModel):
    """Full explanation payload for one recommendation."""

    recommendation_id: str = Field(..., alias="recommendationId")
    factors: List[ExplanationFactor] = Field(default_factory=list)
    confidence: float = Field(..., ge=0.0, le=1.0)
    model_version: str = Field(..., alias="modelVersion")
    generated_at: str = Field(..., alias="generatedAt")

    model_config = {"populate_by_name": True}


class RecentRecommendationsResponse(BaseModel):
    """Wrapper for a list of recent recommendation explanations."""

    recommendations: List[RecommendationExplanation] = Field(default_factory=list)


# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════════


def _build_explanation_factors(
    recommendation: Dict[str, Any],
) -> List[ExplanationFactor]:
    """
    Derive explanation factors from a recommendation record.

    The factors are heuristic – they describe *why* the AI chose this
    recommendation based on the data stored alongside it.
    """
    factors: List[ExplanationFactor] = []

    # Mastery-based factor
    mastery = recommendation.get("mastery_score")
    if mastery is not None:
        desc = (
            "Low mastery in this area triggered remediation content."
            if mastery < 0.4
            else "Moderate mastery — reinforcement content selected."
            if mastery < 0.7
            else "High mastery — enrichment content selected."
        )
        factors.append(
            ExplanationFactor(factor="mastery_level", weight=0.35, description=desc)
        )

    # Engagement-based factor
    engagement = recommendation.get("engagement_score")
    if engagement is not None:
        desc = (
            "Low engagement detected — varied content format recommended."
            if engagement < 0.4
            else "Steady engagement — continuing current approach."
        )
        factors.append(
            ExplanationFactor(factor="engagement", weight=0.25, description=desc)
        )

    # Learning-style factor
    style = recommendation.get("learning_style")
    if style:
        factors.append(
            ExplanationFactor(
                factor="learning_style",
                weight=0.20,
                description=f"Content matched to '{style}' learning preference.",
            )
        )

    # Recency / spaced-repetition factor
    last_activity = recommendation.get("last_activity_at")
    if last_activity:
        factors.append(
            ExplanationFactor(
                factor="spaced_repetition",
                weight=0.20,
                description="Spaced-repetition interval scheduling influenced this recommendation.",
            )
        )

    # Fallback if we couldn't derive anything
    if not factors:
        factors.append(
            ExplanationFactor(
                factor="default",
                weight=1.0,
                description="Recommendation generated using the default curriculum pathway.",
            )
        )

    return factors


# ═══════════════════════════════════════════════════════════════════════════════
# ROUTES
# ═══════════════════════════════════════════════════════════════════════════════


@router.get(
    "/{recommendation_id}",
    response_model=RecommendationExplanation,
    summary="Explain a recommendation",
    description="Returns human-readable explanation factors, confidence, and model version "
    "for a given AI recommendation.",
)
async def explain_recommendation(recommendation_id: str) -> Dict[str, Any]:
    """
    Look up a recommendation by ID and return its explanation.

    Falls back to a synthetic explanation when the downstream DB record
    is unavailable (e.g. in dev/test).
    """
    logger.info("explain_recommendation_requested", recommendation_id=recommendation_id)

    try:
        supabase = get_supabase_client()
        result = (
            supabase.table("ai_recommendations")
            .select("*")
            .eq("id", recommendation_id)
            .maybe_single()
            .execute()
        )
        record = result.data if result else None
    except Exception as exc:
        logger.warning(
            "recommendation_lookup_failed",
            recommendation_id=recommendation_id,
            error=str(exc),
        )
        record = None

    if record:
        factors = _build_explanation_factors(record)
        confidence = record.get("confidence", 0.75)
        model_version = record.get("model_version", "brain-engine-v1")
    else:
        # Synthetic fallback for dev / missing record
        factors = [
            ExplanationFactor(
                factor="curriculum_alignment",
                weight=0.5,
                description="Content aligns with the student's current curriculum objectives.",
            ),
            ExplanationFactor(
                factor="adaptive_difficulty",
                weight=0.5,
                description="Difficulty level adjusted based on recent performance trends.",
            ),
        ]
        confidence = 0.70
        model_version = "brain-engine-v1-fallback"

    return {
        "recommendationId": recommendation_id,
        "factors": [f.model_dump() for f in factors],
        "confidence": confidence,
        "modelVersion": model_version,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }


@router.get(
    "/student/{student_id}/recent",
    response_model=RecentRecommendationsResponse,
    summary="Recent recommendation explanations for a student",
    description="Returns the last N recommendation explanations for a given student.",
)
async def recent_student_recommendations(
    student_id: str,
    limit: int = 10,
) -> Dict[str, Any]:
    """Fetch recent recommendations for a student and build explanations."""
    logger.info(
        "recent_recommendations_requested",
        student_id=student_id,
        limit=limit,
    )

    recommendations: List[Dict[str, Any]] = []

    try:
        supabase = get_supabase_client()
        result = (
            supabase.table("ai_recommendations")
            .select("*")
            .eq("student_id", student_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        records = result.data if result else []
    except Exception as exc:
        logger.warning(
            "recent_recommendations_lookup_failed",
            student_id=student_id,
            error=str(exc),
        )
        records = []

    for rec in records:
        factors = _build_explanation_factors(rec)
        recommendations.append(
            {
                "recommendationId": rec.get("id", "unknown"),
                "factors": [f.model_dump() for f in factors],
                "confidence": rec.get("confidence", 0.75),
                "modelVersion": rec.get("model_version", "brain-engine-v1"),
                "generatedAt": rec.get(
                    "created_at", datetime.now(timezone.utc).isoformat()
                ),
            }
        )

    return {"recommendations": recommendations}
