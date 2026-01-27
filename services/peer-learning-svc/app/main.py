"""Peer Learning Service - FastAPI Application"""
import logging
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.models import PeerMatcher, GroupFormer, CollaborationScorer, DiscussionFacilitator
from app.services import MatchingEngine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize model instances
peer_matcher: Optional[PeerMatcher] = None
group_former: Optional[GroupFormer] = None
collaboration_scorer: Optional[CollaborationScorer] = None
discussion_facilitator: Optional[DiscussionFacilitator] = None
matching_engine: Optional[MatchingEngine] = None

# In-memory candidate pool for demonstration
candidate_pool: List[Dict] = []


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and cleanup application resources."""
    global peer_matcher, group_former, collaboration_scorer, discussion_facilitator, matching_engine

    logger.info("Initializing Peer Learning Service...")

    # Initialize models
    peer_matcher = PeerMatcher()
    group_former = GroupFormer()
    collaboration_scorer = CollaborationScorer()
    discussion_facilitator = DiscussionFacilitator()
    matching_engine = MatchingEngine()

    logger.info("All peer learning models initialized successfully")

    yield

    logger.info("Shutting down Peer Learning Service...")


app = FastAPI(
    title="Peer Learning Service",
    description="""
AI-powered peer matching and collaborative learning.

## Features

- **Peer Matching**: Match learners for tutoring/collaboration
- **Group Formation**: Form optimal study groups
- **Collaboration Scoring**: Score collaboration quality
- **Discussion Facilitation**: AI-assisted discussions
    """,
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LearnerProfile(BaseModel):
    """Learner profile for matching and grouping."""
    learner_id: str
    knowledge_state: Dict[str, float] = Field(
        default_factory=dict,
        description="Knowledge levels by topic (0.0 to 1.0)"
    )
    learning_style: Optional[str] = Field(
        default=None,
        description="Learning style: visual, auditory, kinesthetic, reading"
    )
    availability: List[str] = Field(
        default_factory=list,
        description="Available time slots"
    )
    preferences: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional preferences"
    )


class GroupRequest(BaseModel):
    """Request for group formation."""
    learner_ids: List[str] = Field(description="IDs of learners to group")
    learner_profiles: Optional[List[LearnerProfile]] = Field(
        default=None,
        description="Optional full profiles for learners"
    )
    topic: str = Field(description="Topic for the study group")
    group_size: int = Field(default=4, ge=2, le=10, description="Target group size")
    optimization_goal: str = Field(
        default="balanced",
        description="Optimization goal: balanced, diverse, or similar"
    )


class CollaborationScoreRequest(BaseModel):
    """Request for collaboration scoring."""
    group_id: str
    messages: List[Dict[str, Any]] = Field(
        description="List of messages with sender_id, content, and optional timestamp"
    )
    topic: Optional[str] = Field(default=None, description="Discussion topic")
    member_ids: Optional[List[str]] = Field(
        default=None,
        description="List of all member IDs (including inactive)"
    )


class DiscussionFacilitationRequest(BaseModel):
    """Request for discussion facilitation."""
    group_id: str
    topic: str
    messages: List[Dict[str, Any]] = Field(
        description="List of messages in the discussion"
    )


class CandidatePoolRequest(BaseModel):
    """Request to update the candidate pool."""
    candidates: List[LearnerProfile]


@app.get("/health")
async def health() -> Dict[str, Any]:
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "peer-learning-svc",
        "models_initialized": all([
            peer_matcher is not None,
            group_former is not None,
            collaboration_scorer is not None,
            discussion_facilitator is not None,
            matching_engine is not None,
        ])
    }


@app.post("/api/v1/candidates/update")
async def update_candidate_pool(request: CandidatePoolRequest) -> Dict[str, Any]:
    """Update the candidate pool for matching."""
    global candidate_pool

    candidate_pool = [c.model_dump() for c in request.candidates]

    if peer_matcher:
        peer_matcher.set_candidate_pool(candidate_pool)

    logger.info("Updated candidate pool with %d candidates", len(candidate_pool))

    return {
        "status": "success",
        "message": f"Updated candidate pool with {len(candidate_pool)} candidates",
        "pool_size": len(candidate_pool)
    }


@app.post("/api/v1/match/peer")
async def match_peer(
    profile: LearnerProfile,
    role: str = "study_partner",
    candidates: Optional[List[LearnerProfile]] = None,
) -> Dict[str, Any]:
    """
    Find matching peer for a learner.

    Args:
        profile: The learner's profile
        role: Match type - study_partner, peer_tutor, or discussion_partner
        candidates: Optional list of candidate profiles (uses pool if not provided)

    Returns:
        Match result with matched peer and compatibility score
    """
    if peer_matcher is None:
        raise HTTPException(status_code=503, detail="Peer matcher not initialized")

    try:
        # Use provided candidates or fall back to pool
        candidate_list = None
        if candidates:
            candidate_list = [c.model_dump() for c in candidates]
        elif candidate_pool:
            candidate_list = candidate_pool

        if not candidate_list:
            return {
                "status": "no_candidates",
                "message": "No candidates available for matching. Please provide candidates or update the candidate pool.",
                "learner_id": profile.learner_id,
                "role_requested": role,
                "matches": []
            }

        match = peer_matcher.find_match(
            learner_profile=profile.model_dump(),
            role=role,
            candidates=candidate_list,
        )

        logger.info(
            "Peer match found for %s: %s (score: %.3f)",
            profile.learner_id, match.matched_peer_id, match.compatibility_score
        )

        return {
            "status": "success",
            "learner_id": match.learner_id,
            "matched_peer_id": match.matched_peer_id,
            "compatibility_score": match.compatibility_score,
            "match_reasons": match.match_reasons,
            "role": role
        }

    except ValueError as e:
        logger.warning("Match failed for %s: %s", profile.learner_id, str(e))
        return {
            "status": "no_match",
            "message": str(e),
            "learner_id": profile.learner_id,
            "role_requested": role,
            "matches": []
        }
    except Exception as e:
        logger.error("Error in peer matching: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Matching error: {str(e)}")


@app.post("/api/v1/match/tutor")
async def match_tutor(
    profile: LearnerProfile,
    topic: str,
    candidates: Optional[List[LearnerProfile]] = None,
) -> Dict[str, Any]:
    """
    Find peer tutor for a topic.

    Args:
        profile: The learner's profile
        topic: The topic for which tutoring is needed
        candidates: Optional list of candidate profiles

    Returns:
        Match result with best tutoring peer
    """
    if peer_matcher is None:
        raise HTTPException(status_code=503, detail="Peer matcher not initialized")

    try:
        candidate_list = None
        if candidates:
            candidate_list = [c.model_dump() for c in candidates]
        elif candidate_pool:
            candidate_list = candidate_pool

        if not candidate_list:
            return {
                "status": "no_candidates",
                "message": "No candidates available for tutor matching",
                "learner_id": profile.learner_id,
                "topic": topic,
                "matches": []
            }

        match = peer_matcher.find_tutor(
            learner_profile=profile.model_dump(),
            topic=topic,
            candidates=candidate_list,
        )

        logger.info(
            "Tutor match found for %s on '%s': %s (score: %.3f)",
            profile.learner_id, topic, match.matched_peer_id, match.compatibility_score
        )

        return {
            "status": "success",
            "learner_id": match.learner_id,
            "matched_tutor_id": match.matched_peer_id,
            "compatibility_score": match.compatibility_score,
            "match_reasons": match.match_reasons,
            "topic": topic
        }

    except ValueError as e:
        logger.warning("Tutor match failed for %s: %s", profile.learner_id, str(e))
        return {
            "status": "no_match",
            "message": str(e),
            "learner_id": profile.learner_id,
            "topic": topic,
            "matches": []
        }
    except Exception as e:
        logger.error("Error in tutor matching: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Matching error: {str(e)}")


@app.post("/api/v1/groups/form")
async def form_groups(request: GroupRequest) -> Dict[str, Any]:
    """
    Form optimal study groups.

    Args:
        request: Group formation request with learner IDs and preferences

    Returns:
        Formed groups with optimization scores
    """
    if group_former is None:
        raise HTTPException(status_code=503, detail="Group former not initialized")

    try:
        # Build profiles from request or candidate pool
        if request.learner_profiles:
            profiles = [p.model_dump() for p in request.learner_profiles]
        else:
            # Try to get profiles from candidate pool
            profile_map = {p["learner_id"]: p for p in candidate_pool}
            profiles = []
            for lid in request.learner_ids:
                if lid in profile_map:
                    profiles.append(profile_map[lid])
                else:
                    # Create minimal profile
                    profiles.append({"learner_id": lid, "knowledge_state": {}})

        if len(profiles) < 2:
            return {
                "status": "insufficient_learners",
                "message": "At least 2 learners required to form groups",
                "topic": request.topic,
                "groups": []
            }

        groups = group_former.form(
            learner_profiles=profiles,
            group_size=request.group_size,
            optimization_goal=request.optimization_goal,
        )

        logger.info(
            "Formed %d groups for topic '%s' with goal '%s'",
            len(groups), request.topic, request.optimization_goal
        )

        # Convert to response format
        group_data = []
        for group in groups:
            group_data.append({
                "group_id": group.group_id,
                "members": group.member_ids,
                "balance_score": group.balance_score,
                "predicted_effectiveness": group.predicted_effectiveness,
            })

        return {
            "status": "success",
            "topic": request.topic,
            "optimization_goal": request.optimization_goal,
            "groups": group_data,
            "total_learners": len(profiles),
            "groups_formed": len(groups)
        }

    except Exception as e:
        logger.error("Error in group formation: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Group formation error: {str(e)}")


@app.post("/api/v1/groups/validate")
async def validate_groups(
    groups: List[Dict[str, Any]],
    learner_profiles: Optional[List[LearnerProfile]] = None,
) -> Dict[str, Any]:
    """
    Validate group compatibility.

    Args:
        groups: List of groups to validate (each with group_id and member_ids)
        learner_profiles: Optional learner profiles for detailed validation

    Returns:
        Validation results for each group
    """
    if group_former is None:
        raise HTTPException(status_code=503, detail="Group former not initialized")

    try:
        from app.models.group_former import StudyGroup

        # Convert input to StudyGroup objects
        study_groups = []
        for g in groups:
            study_groups.append(StudyGroup(
                group_id=g.get("group_id", "unknown"),
                member_ids=g.get("member_ids", g.get("members", [])),
                balance_score=g.get("balance_score", 0.0),
                predicted_effectiveness=g.get("predicted_effectiveness", 0.0),
            ))

        # Get profiles
        if learner_profiles:
            profiles = [p.model_dump() for p in learner_profiles]
        else:
            profiles = candidate_pool

        validations = group_former.validate_groups(study_groups, profiles)

        results = []
        for i, validation in enumerate(validations):
            results.append({
                "group_id": study_groups[i].group_id,
                "is_valid": validation.is_valid,
                "compatibility_score": validation.compatibility_score,
                "issues": validation.issues,
                "suggestions": validation.suggestions,
            })

        return {
            "status": "success",
            "validations": results,
            "all_valid": all(v.is_valid for v in validations)
        }

    except Exception as e:
        logger.error("Error in group validation: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Validation error: {str(e)}")


@app.post("/api/v1/collaboration/score")
async def score_collaboration(request: CollaborationScoreRequest) -> Dict[str, Any]:
    """
    Score collaboration quality.

    Args:
        request: Collaboration score request with messages and metadata

    Returns:
        Collaboration scores across multiple dimensions
    """
    if collaboration_scorer is None:
        raise HTTPException(status_code=503, detail="Collaboration scorer not initialized")

    try:
        interaction_data = {
            "messages": request.messages,
            "topic": request.topic,
            "member_ids": request.member_ids,
        }

        score = collaboration_scorer.score(interaction_data)

        # Also get engagement metrics
        engagement = collaboration_scorer.compute_engagement(
            request.messages,
            request.member_ids
        )

        engagement_data = []
        for e in engagement:
            engagement_data.append({
                "member_id": e.member_id,
                "message_count": e.message_count,
                "avg_message_length": e.avg_message_length,
                "response_rate": e.response_rate,
                "engagement_level": e.engagement_level,
            })

        logger.info(
            "Collaboration scored for group %s: overall=%.2f",
            request.group_id, score.overall
        )

        return {
            "status": "success",
            "group_id": request.group_id,
            "scores": {
                "overall": score.overall,
                "participation_balance": score.participation_balance,
                "knowledge_sharing": score.knowledge_sharing,
                "supportiveness": score.supportiveness,
                "task_focus": score.task_focus,
            },
            "engagement": engagement_data,
            "message_count": len(request.messages)
        }

    except Exception as e:
        logger.error("Error in collaboration scoring: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Scoring error: {str(e)}")


@app.post("/api/v1/collaboration/issues")
async def detect_collaboration_issues(request: CollaborationScoreRequest) -> Dict[str, Any]:
    """
    Detect collaboration issues in a group.

    Args:
        request: Request with messages and metadata

    Returns:
        List of detected issues with severity and suggestions
    """
    if collaboration_scorer is None:
        raise HTTPException(status_code=503, detail="Collaboration scorer not initialized")

    try:
        interaction_data = {
            "messages": request.messages,
            "topic": request.topic,
            "member_ids": request.member_ids,
        }

        issues = collaboration_scorer.detect_issues(interaction_data)

        issue_data = []
        for issue in issues:
            issue_data.append({
                "issue_type": issue.issue_type,
                "severity": issue.severity,
                "affected_members": issue.affected_members,
                "description": issue.description,
                "suggestions": issue.suggestions,
            })

        return {
            "status": "success",
            "group_id": request.group_id,
            "issues": issue_data,
            "issue_count": len(issues),
            "has_critical_issues": any(i.severity == "critical" for i in issues)
        }

    except Exception as e:
        logger.error("Error detecting issues: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Issue detection error: {str(e)}")


@app.post("/api/v1/discussion/facilitate")
async def facilitate_discussion(request: DiscussionFacilitationRequest) -> Dict[str, Any]:
    """
    Generate discussion facilitation suggestions.

    Args:
        request: Facilitation request with messages and topic

    Returns:
        Facilitation actions and suggestions
    """
    if discussion_facilitator is None:
        raise HTTPException(status_code=503, detail="Discussion facilitator not initialized")

    try:
        # Get facilitation actions
        actions = discussion_facilitator.suggest_actions(
            messages=request.messages,
            topic=request.topic,
        )

        # Get general suggestions
        suggestions = discussion_facilitator.generate_suggestions(
            messages=request.messages,
            topic=request.topic,
            suggestion_count=5,
        )

        # Check for conflicts
        conflicts = discussion_facilitator.identify_conflicts(request.messages)

        action_data = []
        for action in actions:
            action_data.append({
                "action_type": action.action_type,
                "target": action.target,
                "message": action.message,
                "priority": action.priority,
            })

        conflict_data = []
        for conflict in conflicts:
            conflict_data.append({
                "conflict_type": conflict.conflict_type,
                "involved_members": conflict.involved_members,
                "description": conflict.description,
                "severity": conflict.severity,
            })

        logger.info(
            "Generated %d facilitation actions for group %s",
            len(actions), request.group_id
        )

        return {
            "status": "success",
            "group_id": request.group_id,
            "topic": request.topic,
            "actions": action_data,
            "suggestions": suggestions,
            "conflicts": conflict_data,
            "ai_analysis_available": True
        }

    except Exception as e:
        logger.error("Error in discussion facilitation: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Facilitation error: {str(e)}")


@app.post("/api/v1/discussion/summarize")
async def summarize_discussion(
    messages: List[Dict[str, Any]],
    topic: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Summarize discussion so far.

    Args:
        messages: List of discussion messages
        topic: Optional topic for context

    Returns:
        Discussion summary
    """
    if discussion_facilitator is None:
        raise HTTPException(status_code=503, detail="Discussion facilitator not initialized")

    try:
        summary = discussion_facilitator.summarize_discussion(messages, topic)

        return {
            "status": "success",
            "summary": summary,
            "message_count": len(messages),
            "topic": topic
        }

    except Exception as e:
        logger.error("Error in summarization: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Summarization error: {str(e)}")


@app.post("/api/v1/match/compatibility")
async def compute_compatibility(
    profile_a: LearnerProfile,
    profile_b: LearnerProfile,
    role: str = "study_partner",
) -> Dict[str, Any]:
    """
    Compute compatibility between two learners.

    Args:
        profile_a: First learner's profile
        profile_b: Second learner's profile
        role: Context for compatibility calculation

    Returns:
        Compatibility score
    """
    if peer_matcher is None:
        raise HTTPException(status_code=503, detail="Peer matcher not initialized")

    try:
        score = peer_matcher.compute_compatibility(
            profile_a=profile_a.model_dump(),
            profile_b=profile_b.model_dump(),
            role=role,
        )

        return {
            "status": "success",
            "learner_a": profile_a.learner_id,
            "learner_b": profile_b.learner_id,
            "compatibility_score": score,
            "role": role
        }

    except Exception as e:
        logger.error("Error computing compatibility: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Compatibility error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
