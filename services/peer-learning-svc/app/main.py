"""Peer Learning Service - FastAPI Application

Complete peer learning platform with:
- Peer matching and group formation
- Collaborative sessions with real-time features
- Peer assessment with rubrics
- Safety features including content moderation and minor protection
- WebSocket support for live collaboration
- S13: Outcome-aware scoring, neurodivergent facilitation, teacher dashboard
"""
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

import httpx
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Query, Path
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.models import (
    # Original
    PeerMatcher,
    GroupFormer,
    CollaborationScorer,
    DiscussionFacilitator,
    # Safety
    SafetyManager,
    ContentCategory,
    ReportStatus,
    ActionType,
    ConsentType,
    # Session
    SessionManager,
    SessionStatus,
    SessionType,
    ParticipantRole,
    PresenceStatus,
    # Assessment
    PeerAssessmentService,
    RubricManager,
    AssessmentStatus,
    AssessmentType,
)
from app.services import MatchingEngine, ws_manager, MessageType

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize model instances
peer_matcher: Optional[PeerMatcher] = None
group_former: Optional[GroupFormer] = None
collaboration_scorer: Optional[CollaborationScorer] = None
discussion_facilitator: Optional[DiscussionFacilitator] = None
matching_engine: Optional[MatchingEngine] = None
safety_manager: Optional[SafetyManager] = None
session_manager: Optional[SessionManager] = None
assessment_service: Optional[PeerAssessmentService] = None
rubric_manager: Optional[RubricManager] = None

# In-memory candidate pool for demonstration
candidate_pool: List[Dict] = []

# S13: Match persistence (in-memory)
active_matches: Dict[str, Dict[str, Any]] = {}   # match_id → match record
match_history: List[Dict[str, Any]] = []          # ordered list
excluded_pairs: set = set()                       # frozenset(a,b) of bad combos

# S13: Classroom groups (in-memory, keyed by class_id)
classroom_groups: Dict[str, List[Dict[str, Any]]] = {}

# S13: Learner-model-svc URL
LEARNER_MODEL_SVC_URL = os.getenv("LEARNER_MODEL_SVC_URL", "http://learner-model-svc:4015")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and cleanup application resources."""
    global peer_matcher, group_former, collaboration_scorer, discussion_facilitator
    global matching_engine, safety_manager, session_manager, assessment_service, rubric_manager

    logger.info("Initializing Peer Learning Service...")

    # Initialize original models
    peer_matcher = PeerMatcher()
    group_former = GroupFormer()
    collaboration_scorer = CollaborationScorer()
    discussion_facilitator = DiscussionFacilitator()
    matching_engine = MatchingEngine()

    # Initialize new services
    safety_manager = SafetyManager(strict_mode=True)
    session_manager = SessionManager()
    rubric_manager = RubricManager()
    assessment_service = PeerAssessmentService(rubric_manager)

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
- **Real-time Collaboration**: WebSocket support for live sessions
- **Peer Assessment**: Structured peer review with rubrics
- **Safety Features**: Content moderation, reporting, and minor protection
    """,
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Request/Response Models
# ============================================================================

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


class GroupCreateRequest(BaseModel):
    """Request for creating a study group."""
    name: str = Field(description="Group name")
    topic: str = Field(description="Topic for the study group")
    creator_id: str = Field(description="ID of the user creating the group")
    member_ids: List[str] = Field(default_factory=list, description="Initial member IDs")
    max_members: int = Field(default=10, ge=2, le=20, description="Maximum group size")
    description: Optional[str] = Field(default=None, description="Group description")
    is_public: bool = Field(default=True, description="Whether group is publicly visible")


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


class SessionStartRequest(BaseModel):
    """Request for starting a collaborative session."""
    group_id: str = Field(description="ID of the group")
    session_type: str = Field(
        default="study_group",
        description="Session type: study_group, peer_tutoring, discussion, project, review"
    )
    topic: str = Field(description="Session topic")
    created_by: str = Field(description="User ID of session creator")
    scheduled_duration_minutes: Optional[int] = Field(
        default=60,
        ge=15,
        le=180,
        description="Planned session duration"
    )
    requires_recording_consent: bool = Field(
        default=True,
        description="Whether participants must consent to recording"
    )


class SessionJoinRequest(BaseModel):
    """Request to join a session."""
    user_id: str = Field(description="User ID")
    role: str = Field(default="learner", description="Role: host, tutor, learner, observer")
    has_recording_consent: bool = Field(
        default=False,
        description="Whether user consents to session recording"
    )


class PeerReviewRequest(BaseModel):
    """Request for peer review/assessment."""
    assessor_id: str = Field(description="ID of the user giving assessment")
    assessee_id: str = Field(description="ID of the user being assessed")
    assessment_type: str = Field(
        default="session_feedback",
        description="Type: work_review, session_feedback, tutor_rating, participation"
    )
    group_id: Optional[str] = Field(default=None, description="Related group ID")
    session_id: Optional[str] = Field(default=None, description="Related session ID")
    scores: List[Dict[str, Any]] = Field(
        description="List of criterion scores: [{criterion_id, score, comments}]"
    )
    overall_feedback: str = Field(default="", description="Overall feedback text")
    strengths: List[str] = Field(default_factory=list, description="Identified strengths")
    areas_for_improvement: List[str] = Field(
        default_factory=list,
        description="Areas for improvement"
    )
    is_anonymous: bool = Field(default=False, description="Whether assessment is anonymous")


class ReportRequest(BaseModel):
    """Request for reporting content or behavior."""
    reporter_id: str = Field(description="ID of user making report")
    reported_user_id: str = Field(description="ID of user being reported")
    report_type: str = Field(
        description="Type: harassment, inappropriate_content, spam, safety_concern, other"
    )
    description: str = Field(description="Description of the issue")
    content_id: Optional[str] = Field(default=None, description="ID of reported content")
    group_id: Optional[str] = Field(default=None, description="Related group ID")
    session_id: Optional[str] = Field(default=None, description="Related session ID")


class ContentModerationRequest(BaseModel):
    """Request for content moderation."""
    content: str = Field(description="Content to moderate")
    user_id: Optional[str] = Field(default=None, description="User ID for context")
    content_id: Optional[str] = Field(default=None, description="Content ID for tracking")


class ConsentRequest(BaseModel):
    """Request to record user consent."""
    user_id: str = Field(description="User ID")
    consent_type: str = Field(
        description="Type: session_recording, peer_matching, group_participation, etc."
    )
    granted: bool = Field(description="Whether consent is granted")


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


# S13 request models --------------------------------------------------------

class ScoreWithOutcomesRequest(BaseModel):
    """Request for outcome-aware collaboration scoring."""
    group_id: str
    messages: List[Dict[str, Any]]
    topic: Optional[str] = None
    member_ids: Optional[List[str]] = None
    pre_mastery: Optional[Dict[str, float]] = Field(
        default=None, description="Mastery per member before the session"
    )
    post_mastery: Optional[Dict[str, float]] = Field(
        default=None, description="Mastery per member after the session"
    )


class InclusiveFacilitationRequest(BaseModel):
    """Request for neurodivergent-inclusive facilitation."""
    group_id: str
    topic: str
    messages: List[Dict[str, Any]]
    member_profiles: Optional[Dict[str, Dict[str, Any]]] = Field(
        default=None,
        description='E.g. {"user_1": {"neurodivergent_needs": ["adhd"]}}'
    )


class ClassroomFormGroupsRequest(BaseModel):
    """Request to form groups for a classroom."""
    learner_ids: List[str]
    topic: str
    group_size: int = Field(default=4, ge=2, le=10)
    optimization_goal: str = Field(default="balanced")
    learner_profiles: Optional[List[LearnerProfile]] = None


# ============================================================================
# Health Check
# ============================================================================

@app.get("/health")
async def health() -> Dict[str, Any]:
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "peer-learning-svc",
        "version": "1.0.0",
        "models_initialized": all([
            peer_matcher is not None,
            group_former is not None,
            collaboration_scorer is not None,
            discussion_facilitator is not None,
            matching_engine is not None,
            safety_manager is not None,
            session_manager is not None,
            assessment_service is not None,
        ]),
        "websocket_connections": ws_manager.get_connection_count(),
        "active_sessions": ws_manager.get_session_count(),
    }


# ============================================================================
# Group Management Endpoints
# ============================================================================

@app.post("/api/v1/groups/create")
async def create_group(request: GroupCreateRequest) -> Dict[str, Any]:
    """
    Create a new study group.
    
    Creates a group and optionally forms initial sub-groups if there are enough members.
    """
    if group_former is None:
        raise HTTPException(status_code=503, detail="Group former not initialized")
    
    try:
        # Create group ID
        import uuid
        group_id = str(uuid.uuid4())
        
        # Build initial member list
        members = [request.creator_id] + [m for m in request.member_ids if m != request.creator_id]
        
        logger.info(
            "Creating group %s: name='%s', topic='%s', creator=%s, members=%d",
            group_id, request.name, request.topic, request.creator_id, len(members)
        )
        
        return {
            "status": "success",
            "group_id": group_id,
            "name": request.name,
            "topic": request.topic,
            "creator_id": request.creator_id,
            "members": members,
            "max_members": request.max_members,
            "description": request.description,
            "is_public": request.is_public,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    
    except Exception as e:
        logger.error("Error creating group: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Group creation error: {str(e)}")


@app.get("/api/v1/groups/{group_id}/activity")
async def get_group_activity(
    group_id: str = Path(description="Group ID"),
) -> Dict[str, Any]:
    """
    Get activity summary for a group.
    
    Returns session history, participation stats, and recent messages.
    """
    if session_manager is None or collaboration_scorer is None:
        raise HTTPException(status_code=503, detail="Services not initialized")
    
    try:
        # Get sessions for this group
        sessions = session_manager.get_group_sessions(group_id, include_completed=True)
        
        session_summaries = []
        for session in sessions[-10:]:  # Last 10 sessions
            activity = session_manager.get_session_activity(session.session_id)
            if activity:
                session_summaries.append({
                    "session_id": session.session_id,
                    "topic": session.topic,
                    "status": session.status.value,
                    "created_at": session.created_at.isoformat(),
                    "duration_minutes": session.get_duration_minutes(),
                    "participant_count": len(session.participants),
                    "message_count": activity.total_messages,
                    "participation_scores": activity.participation_scores,
                })
        
        # Get assessments for this group
        assessments = []
        if assessment_service:
            group_assessments = assessment_service.get_group_assessments(group_id)
            for a in group_assessments[-20:]:
                assessments.append({
                    "assessment_id": a.assessment_id,
                    "type": a.assessment_type.value,
                    "status": a.status.value,
                    "overall_score": a.overall_score,
                    "created_at": a.created_at.isoformat(),
                })
        
        return {
            "status": "success",
            "group_id": group_id,
            "total_sessions": len(sessions),
            "active_sessions": len([s for s in sessions if s.status == SessionStatus.ACTIVE]),
            "sessions": session_summaries,
            "assessments": assessments,
            "websocket_participants": ws_manager.get_session_participants(group_id),
        }
    
    except Exception as e:
        logger.error("Error getting group activity: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Activity retrieval error: {str(e)}")


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


# ============================================================================
# User Matching Endpoints
# ============================================================================

@app.get("/api/v1/users/{user_id}/matches")
async def get_user_matches(
    user_id: str = Path(description="User ID"),
    role: str = Query(default="study_partner", description="Match role"),
    limit: int = Query(default=10, ge=1, le=50, description="Maximum matches to return"),
) -> Dict[str, Any]:
    """
    Get potential peer matches for a user.
    
    Returns ranked list of compatible peers based on knowledge state,
    learning style, availability, and preferences.
    """
    if peer_matcher is None:
        raise HTTPException(status_code=503, detail="Peer matcher not initialized")
    
    try:
        # Get user profile from pool (in production, fetch from database)
        user_profile = next(
            (p for p in candidate_pool if p.get("learner_id") == user_id),
            {"learner_id": user_id, "knowledge_state": {}}
        )
        
        if not candidate_pool:
            return {
                "status": "no_candidates",
                "message": "No candidates available for matching",
                "user_id": user_id,
                "matches": []
            }
        
        # Filter out the user themselves
        candidates = [c for c in candidate_pool if c.get("learner_id") != user_id]
        
        if not candidates:
            return {
                "status": "no_candidates",
                "message": "No other candidates available",
                "user_id": user_id,
                "matches": []
            }
        
        # Get matches
        matches = []
        for candidate in candidates[:limit * 2]:  # Get more than needed for filtering
            try:
                score = peer_matcher.compute_compatibility(
                    profile_a=user_profile,
                    profile_b=candidate,
                    role=role,
                )
                matches.append({
                    "peer_id": candidate.get("learner_id"),
                    "compatibility_score": score,
                    "learning_style": candidate.get("learning_style"),
                    "common_topics": list(
                        set(user_profile.get("knowledge_state", {}).keys()) &
                        set(candidate.get("knowledge_state", {}).keys())
                    ),
                })
            except Exception as e:
                logger.warning("Error computing compatibility: %s", str(e))
        
        # Sort by score and limit
        matches.sort(key=lambda m: m["compatibility_score"], reverse=True)
        matches = matches[:limit]
        
        return {
            "status": "success",
            "user_id": user_id,
            "role": role,
            "matches": matches,
            "total_candidates": len(candidates),
        }
    
    except Exception as e:
        logger.error("Error getting matches: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Matching error: {str(e)}")


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


# ============================================================================
# Session Management Endpoints
# ============================================================================

@app.post("/api/v1/sessions/start")
async def start_session(request: SessionStartRequest) -> Dict[str, Any]:
    """
    Start a new collaborative session.
    
    Creates a session for a group with specified type and settings.
    """
    if session_manager is None:
        raise HTTPException(status_code=503, detail="Session manager not initialized")
    
    try:
        # Map string to enum
        session_type_map = {
            "study_group": SessionType.STUDY_GROUP,
            "peer_tutoring": SessionType.PEER_TUTORING,
            "discussion": SessionType.DISCUSSION,
            "project": SessionType.PROJECT,
            "review": SessionType.REVIEW,
            "practice": SessionType.PRACTICE,
        }
        session_type = session_type_map.get(request.session_type, SessionType.STUDY_GROUP)
        
        # Create session
        session = session_manager.create_session(
            group_id=request.group_id,
            session_type=session_type,
            topic=request.topic,
            created_by=request.created_by,
            requires_recording_consent=request.requires_recording_consent,
        )
        
        # Start the session
        session_manager.start_session(session.session_id, request.created_by)
        
        # Auto-join the creator as host
        session_manager.join_session(
            session.session_id,
            request.created_by,
            ParticipantRole.HOST,
            has_recording_consent=True,
        )
        
        logger.info(
            "Session started: %s (group=%s, type=%s, topic=%s)",
            session.session_id, request.group_id, session_type.value, request.topic
        )
        
        return {
            "status": "success",
            "session_id": session.session_id,
            "group_id": session.group_id,
            "session_type": session.session_type.value,
            "topic": session.topic,
            "session_status": session.status.value,
            "created_by": session.created_by,
            "started_at": session.actual_start.isoformat() if session.actual_start else None,
            "requires_recording_consent": session.requires_recording_consent,
            "websocket_url": f"/ws/session/{session.session_id}",
        }
    
    except Exception as e:
        logger.error("Error starting session: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Session start error: {str(e)}")


@app.post("/api/v1/sessions/{session_id}/join")
async def join_session(
    session_id: str,
    request: SessionJoinRequest,
) -> Dict[str, Any]:
    """
    Join an existing session.
    """
    if session_manager is None:
        raise HTTPException(status_code=503, detail="Session manager not initialized")
    
    try:
        role_map = {
            "host": ParticipantRole.HOST,
            "tutor": ParticipantRole.TUTOR,
            "learner": ParticipantRole.LEARNER,
            "observer": ParticipantRole.OBSERVER,
            "facilitator": ParticipantRole.FACILITATOR,
        }
        role = role_map.get(request.role, ParticipantRole.LEARNER)
        
        success, message = session_manager.join_session(
            session_id,
            request.user_id,
            role,
            request.has_recording_consent,
        )
        
        if not success:
            raise HTTPException(status_code=400, detail=message)
        
        session = session_manager.get_session(session_id)
        
        return {
            "status": "success",
            "message": message,
            "session_id": session_id,
            "user_id": request.user_id,
            "role": role.value,
            "participant_count": len(session.participants) if session else 0,
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error joining session: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Session join error: {str(e)}")


@app.post("/api/v1/sessions/{session_id}/leave")
async def leave_session(
    session_id: str,
    user_id: str,
) -> Dict[str, Any]:
    """
    Leave a session.
    """
    if session_manager is None:
        raise HTTPException(status_code=503, detail="Session manager not initialized")
    
    success, message = session_manager.leave_session(session_id, user_id)
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return {
        "status": "success",
        "message": message,
        "session_id": session_id,
        "user_id": user_id,
    }


@app.post("/api/v1/sessions/{session_id}/end")
async def end_session(
    session_id: str,
    ended_by: str,
    reason: str = "completed",
) -> Dict[str, Any]:
    """
    End a session.
    """
    if session_manager is None:
        raise HTTPException(status_code=503, detail="Session manager not initialized")
    
    session = session_manager.end_session(session_id, ended_by, reason)
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "status": "success",
        "session_id": session_id,
        "session_status": session.status.value,
        "duration_minutes": session.get_duration_minutes(),
        "ended_by": ended_by,
        "reason": reason,
    }


@app.get("/api/v1/sessions/{session_id}")
async def get_session(session_id: str) -> Dict[str, Any]:
    """
    Get session details.
    """
    if session_manager is None:
        raise HTTPException(status_code=503, detail="Session manager not initialized")
    
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    participants = []
    for user_id, state in session.participants.items():
        participants.append({
            "user_id": user_id,
            "role": state.role.value,
            "presence": state.presence.value,
            "joined_at": state.joined_at.isoformat(),
            "contributions_count": state.contributions_count,
        })
    
    return {
        "status": "success",
        "session": {
            "session_id": session.session_id,
            "group_id": session.group_id,
            "session_type": session.session_type.value,
            "topic": session.topic,
            "status": session.status.value,
            "created_at": session.created_at.isoformat(),
            "started_at": session.actual_start.isoformat() if session.actual_start else None,
            "duration_minutes": session.get_duration_minutes(),
            "participants": participants,
            "message_count": len(session.messages),
            "resource_count": len(session.resources),
        },
    }


# ============================================================================
# Peer Assessment Endpoints
# ============================================================================

@app.post("/api/v1/assessments/peer-review")
async def submit_peer_review(request: PeerReviewRequest) -> Dict[str, Any]:
    """
    Submit a peer review/assessment.
    
    Creates and submits a peer assessment with scores and feedback.
    """
    if assessment_service is None:
        raise HTTPException(status_code=503, detail="Assessment service not initialized")
    
    try:
        # Map assessment type
        type_map = {
            "work_review": AssessmentType.WORK_REVIEW,
            "session_feedback": AssessmentType.SESSION_FEEDBACK,
            "tutor_rating": AssessmentType.TUTOR_RATING,
            "participation": AssessmentType.PARTICIPATION,
            "skill_verification": AssessmentType.SKILL_VERIFICATION,
        }
        assessment_type = type_map.get(request.assessment_type, AssessmentType.SESSION_FEEDBACK)
        
        # Create assessment
        assessment = assessment_service.create_assessment(
            assessor_id=request.assessor_id,
            assessee_id=request.assessee_id,
            assessment_type=assessment_type,
            group_id=request.group_id,
            session_id=request.session_id,
            is_anonymous=request.is_anonymous,
        )
        
        # Update scores
        assessment_service.update_scores(assessment.assessment_id, request.scores)
        
        # Update feedback
        assessment_service.update_feedback(
            assessment.assessment_id,
            overall_feedback=request.overall_feedback,
            strengths=request.strengths,
            areas_for_improvement=request.areas_for_improvement,
        )
        
        # Submit
        success, message, assessment = assessment_service.submit_assessment(
            assessment.assessment_id
        )
        
        if not success:
            raise HTTPException(status_code=400, detail=message)
        
        logger.info(
            "Peer review submitted: %s (assessor=%s, assessee=%s, score=%.2f)",
            assessment.assessment_id, request.assessor_id, request.assessee_id,
            assessment.overall_score or 0
        )
        
        return {
            "status": "success",
            "assessment_id": assessment.assessment_id,
            "assessor_id": assessment.assessor_id,
            "assessee_id": assessment.assessee_id,
            "assessment_type": assessment.assessment_type.value,
            "overall_score": assessment.overall_score,
            "assessment_status": assessment.status.value,
            "submitted_at": assessment.submitted_at.isoformat() if assessment.submitted_at else None,
        }
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error submitting peer review: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Assessment error: {str(e)}")


@app.get("/api/v1/assessments/user/{user_id}/received")
async def get_user_assessments_received(
    user_id: str,
    assessment_type: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Get assessments received by a user.
    """
    if assessment_service is None:
        raise HTTPException(status_code=503, detail="Assessment service not initialized")
    
    type_map = {
        "work_review": AssessmentType.WORK_REVIEW,
        "session_feedback": AssessmentType.SESSION_FEEDBACK,
        "tutor_rating": AssessmentType.TUTOR_RATING,
        "participation": AssessmentType.PARTICIPATION,
    }
    at = type_map.get(assessment_type) if assessment_type else None
    
    assessments = assessment_service.get_user_assessments_received(user_id, at)
    
    assessment_data = []
    for a in assessments:
        assessment_data.append({
            "assessment_id": a.assessment_id,
            "assessment_type": a.assessment_type.value,
            "assessor_id": None if a.is_anonymous else a.assessor_id,
            "overall_score": a.overall_score,
            "status": a.status.value,
            "created_at": a.created_at.isoformat(),
        })
    
    # Get summary if enough assessments
    summary = assessment_service.get_user_summary(user_id)
    
    return {
        "status": "success",
        "user_id": user_id,
        "assessments": assessment_data,
        "total_count": len(assessments),
        "summary": {
            "average_score": summary.average_score_received,
            "common_strengths": summary.common_strengths,
            "common_improvements": summary.common_improvements,
            "trend": summary.assessment_trend,
        } if summary else None,
    }


@app.get("/api/v1/assessments/rubrics")
async def list_rubrics(
    assessment_type: Optional[str] = None,
) -> Dict[str, Any]:
    """
    List available assessment rubrics.
    """
    if rubric_manager is None:
        raise HTTPException(status_code=503, detail="Rubric manager not initialized")
    
    type_map = {
        "work_review": AssessmentType.WORK_REVIEW,
        "session_feedback": AssessmentType.SESSION_FEEDBACK,
        "tutor_rating": AssessmentType.TUTOR_RATING,
    }
    at = type_map.get(assessment_type) if assessment_type else None
    
    rubrics = rubric_manager.list_rubrics(at)
    
    rubric_data = []
    for r in rubrics:
        criteria = []
        for c in r.criteria:
            criteria.append({
                "criterion_id": c.criterion_id,
                "name": c.name,
                "description": c.description,
                "weight": c.weight,
                "min_score": c.min_score,
                "max_score": c.max_score,
            })
        
        rubric_data.append({
            "rubric_id": r.rubric_id,
            "name": r.name,
            "description": r.description,
            "assessment_type": r.assessment_type.value,
            "criteria": criteria,
            "is_template": r.is_template,
        })
    
    return {
        "status": "success",
        "rubrics": rubric_data,
        "total_count": len(rubrics),
    }


# ============================================================================
# Collaboration Scoring Endpoints
# ============================================================================

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


# ============================================================================
# Discussion Facilitation Endpoints
# ============================================================================

@app.post("/api/v1/discussion/facilitate")
async def facilitate_discussion(request: DiscussionFacilitationRequest) -> Dict[str, Any]:
    """
    Generate discussion facilitation suggestions.
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


# ============================================================================
# Safety Endpoints
# ============================================================================

@app.post("/api/v1/safety/moderate")
async def moderate_content(request: ContentModerationRequest) -> Dict[str, Any]:
    """
    Moderate content for safety.
    
    Checks content for inappropriate material, personal information, etc.
    """
    if safety_manager is None:
        raise HTTPException(status_code=503, detail="Safety manager not initialized")
    
    try:
        result = safety_manager.moderate_and_check(
            content=request.content,
            user_id=request.user_id or "anonymous",
            content_id=request.content_id,
        )
        
        return {
            "status": "success",
            "content_id": result.content_id,
            "is_safe": result.is_safe,
            "categories": [c.value for c in result.categories],
            "confidence": result.confidence,
            "flagged_phrases": result.flagged_phrases,
            "suggestions": result.suggestions,
            "requires_review": result.requires_review,
            "auto_action": result.auto_action.value if result.auto_action else None,
        }
    
    except Exception as e:
        logger.error("Error in content moderation: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Moderation error: {str(e)}")


@app.post("/api/v1/safety/report")
async def submit_report(request: ReportRequest) -> Dict[str, Any]:
    """
    Submit a report for inappropriate content or behavior.
    """
    if safety_manager is None:
        raise HTTPException(status_code=503, detail="Safety manager not initialized")
    
    try:
        report = safety_manager.handle_report(
            reporter_id=request.reporter_id,
            reported_user_id=request.reported_user_id,
            report_type=request.report_type,
            description=request.description,
            content_id=request.content_id,
            group_id=request.group_id,
            session_id=request.session_id,
        )
        
        return {
            "status": "success",
            "report_id": report.report_id,
            "report_status": report.status.value,
            "message": "Report submitted successfully. Our team will review it.",
        }
    
    except Exception as e:
        logger.error("Error submitting report: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Report error: {str(e)}")


@app.post("/api/v1/safety/consent")
async def record_consent(request: ConsentRequest) -> Dict[str, Any]:
    """
    Record user consent for a feature.
    """
    if safety_manager is None:
        raise HTTPException(status_code=503, detail="Safety manager not initialized")
    
    try:
        consent_type_map = {
            "session_recording": ConsentType.SESSION_RECORDING,
            "peer_matching": ConsentType.PEER_MATCHING,
            "group_participation": ConsentType.GROUP_PARTICIPATION,
            "assessment_participation": ConsentType.ASSESSMENT_PARTICIPATION,
            "data_sharing": ConsentType.DATA_SHARING,
            "communication": ConsentType.COMMUNICATION,
        }
        consent_type = consent_type_map.get(request.consent_type)
        
        if not consent_type:
            raise HTTPException(status_code=400, detail=f"Invalid consent type: {request.consent_type}")
        
        success = safety_manager.minor_protection.record_consent(
            request.user_id,
            consent_type,
            request.granted,
        )
        
        if not success:
            # User not registered, register as adult
            safety_manager.minor_protection.register_adult(request.user_id)
            safety_manager.minor_protection.record_consent(
                request.user_id,
                consent_type,
                request.granted,
            )
        
        return {
            "status": "success",
            "user_id": request.user_id,
            "consent_type": request.consent_type,
            "granted": request.granted,
            "recorded_at": datetime.now(timezone.utc).isoformat(),
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error recording consent: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Consent error: {str(e)}")


@app.get("/api/v1/safety/check-session")
async def check_session_safety(
    participant_ids: str = Query(description="Comma-separated participant IDs"),
    session_type: str = Query(default="study", description="Session type"),
) -> Dict[str, Any]:
    """
    Check if a session is safe for all participants.
    """
    if safety_manager is None:
        raise HTTPException(status_code=503, detail="Safety manager not initialized")
    
    ids = [p.strip() for p in participant_ids.split(",") if p.strip()]
    
    all_allowed, issues = safety_manager.check_session_safety(ids, session_type)
    
    return {
        "status": "success",
        "all_allowed": all_allowed,
        "issues": issues,
        "participant_count": len(ids),
    }


# ============================================================================
# WebSocket Endpoint
# ============================================================================

@app.websocket("/ws/session/{session_id}")
async def websocket_session(
    websocket: WebSocket,
    session_id: str,
    user_id: str = Query(description="User ID"),
):
    """
    WebSocket endpoint for real-time session collaboration.
    
    Supports:
    - Presence updates
    - Chat messages
    - Typing indicators
    - Cursor positions (collaborative editing)
    - Content edits
    """
    connection = await ws_manager.connect(websocket, user_id)
    
    try:
        # Join the session
        await ws_manager.join_session(connection.connection_id, session_id)
        
        # Main message loop
        while True:
            try:
                data = await websocket.receive_text()
                response = await ws_manager.handle_message(connection.connection_id, data)
                
                if response:
                    await websocket.send_text(response.to_json())
                    
            except WebSocketDisconnect:
                break
    
    finally:
        await ws_manager.disconnect(connection.connection_id)


# ============================================================================
# Group Validation Endpoints
# ============================================================================

@app.post("/api/v1/groups/validate")
async def validate_groups(
    groups: List[Dict[str, Any]],
    learner_profiles: Optional[List[LearnerProfile]] = None,
) -> Dict[str, Any]:
    """
    Validate group compatibility.
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


# ============================================================================
# S13: Outcome-aware collaboration scoring
# ============================================================================

@app.post("/api/v1/peer-learning/score-collaboration")
async def score_collaboration_with_outcomes(
    request: ScoreWithOutcomesRequest,
) -> Dict[str, Any]:
    """Score collaboration quality including outcome improvement.

    When *pre_mastery* and *post_mastery* are provided the response
    includes an ``outcome_improvement`` dimension.  Without them the
    standard 4-dimension score is returned with ``outcome_improvement``
    at the neutral default of 0.5.
    """
    if collaboration_scorer is None:
        raise HTTPException(status_code=503, detail="Collaboration scorer not initialized")

    try:
        interaction_data = {
            "messages": request.messages,
            "topic": request.topic,
            "member_ids": request.member_ids,
        }

        score = collaboration_scorer.score_with_outcomes(
            interaction_data,
            pre_mastery=request.pre_mastery,
            post_mastery=request.post_mastery,
        )

        engagement = collaboration_scorer.compute_engagement(
            request.messages,
            request.member_ids or [],
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
                "outcome_improvement": score.outcome_improvement,
            },
            "recommendations": score.recommendations,
            "engagement": [
                {
                    "member_id": e.member_id,
                    "message_count": e.message_count,
                    "avg_message_length": e.avg_message_length,
                    "response_rate": e.response_rate,
                    "engagement_level": e.engagement_level,
                }
                for e in engagement
            ],
            "message_count": len(request.messages),
        }
    except Exception as e:
        logger.error("Error in outcome-aware scoring: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Scoring error: {str(e)}")


# ============================================================================
# S13: Neurodivergent-inclusive facilitation
# ============================================================================

@app.post("/api/v1/peer-learning/facilitate")
async def inclusive_facilitate(
    request: InclusiveFacilitationRequest,
) -> Dict[str, Any]:
    """Facilitate discussion with neurodivergent-aware turn-taking."""
    if discussion_facilitator is None:
        raise HTTPException(status_code=503, detail="Facilitator not initialized")

    try:
        actions = discussion_facilitator.suggest_inclusive_actions(
            messages=request.messages,
            topic=request.topic,
            member_profiles=request.member_profiles,
        )

        return {
            "status": "success",
            "group_id": request.group_id,
            "actions": [
                {
                    "action_type": a.action_type,
                    "target": a.target,
                    "message": a.message,
                    "priority": a.priority,
                }
                for a in actions
            ],
            "action_count": len(actions),
        }
    except Exception as e:
        logger.error("Error in inclusive facilitation: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Facilitation error: {str(e)}")


# ============================================================================
# S13: Match persistence helpers
# ============================================================================

async def _fetch_learner_mastery(learner_id: str) -> Optional[Dict[str, float]]:
    """Fetch mastery data from learner-model-svc (best-effort)."""
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            res = await client.get(
                f"{LEARNER_MODEL_SVC_URL}/api/v1/learners/{learner_id}/mastery"
            )
            if res.status_code == 200:
                data = res.json()
                return data.get("mastery", data.get("data", {}).get("mastery"))
    except Exception as exc:
        logger.warning("learner-model-svc unreachable for %s: %s", learner_id, exc)
    return None


def _persist_match(match_record: Dict[str, Any]) -> str:
    """Store a match in the in-memory persistence layer."""
    match_id = match_record.get("match_id") or str(uuid4())
    match_record["match_id"] = match_id
    match_record["created_at"] = datetime.now(timezone.utc).isoformat()
    active_matches[match_id] = match_record
    match_history.append(match_record)
    return match_id


@app.post("/api/v1/peer-learning/match")
async def peer_learning_match(
    learner_id: str = Query(..., description="Learner to match"),
    match_type: str = Query("study_partner", description="study_partner | peer_tutor | discussion_partner"),
    topic: Optional[str] = Query(None),
) -> Dict[str, Any]:
    """Match a learner with a peer, persisting the result.

    Optionally enriches the learner's profile from learner-model-svc
    before performing the match.
    """
    if peer_matcher is None:
        raise HTTPException(status_code=503, detail="Peer matcher not initialized")

    try:
        # Build profile, optionally enriched with real mastery data
        mastery = await _fetch_learner_mastery(learner_id)

        profile = {
            "learner_id": learner_id,
            "knowledge_state": mastery or {},
            "preferences": {"match_type": match_type},
        }

        # Add topic preference if supplied
        if topic:
            profile["preferences"]["topic"] = topic

        # Filter out excluded peers
        pool = [
            c for c in candidate_pool
            if frozenset([learner_id, c.get("learner_id", "")]) not in excluded_pairs
        ]

        match = peer_matcher.find_match(profile, pool)

        if match is None:
            return {"status": "no_match", "learner_id": learner_id, "message": "No compatible peer found"}

        # Persist
        match_record = {
            "learner_id": learner_id,
            "matched_peer_id": match.matched_peer_id,
            "compatibility_score": match.compatibility_score,
            "match_reasons": match.match_reasons,
            "match_type": match_type,
            "topic": topic,
        }
        match_id = _persist_match(match_record)

        return {
            "status": "success",
            "match_id": match_id,
            "learner_id": learner_id,
            "matched_peer_id": match.matched_peer_id,
            "compatibility_score": match.compatibility_score,
            "match_reasons": match.match_reasons,
        }
    except Exception as e:
        logger.error("Error in peer-learning match: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Matching error: {str(e)}")


@app.get("/api/v1/peer-learning/matches/{learner_id}")
async def get_match_history(
    learner_id: str = Path(...),
    limit: int = Query(20, ge=1, le=100),
) -> Dict[str, Any]:
    """Return match history for a learner."""
    records = [
        m for m in reversed(match_history)
        if m.get("learner_id") == learner_id or m.get("matched_peer_id") == learner_id
    ][:limit]
    return {"status": "success", "learner_id": learner_id, "matches": records}


# ============================================================================
# S13: Teacher dashboard — Classroom group management
# ============================================================================

@app.post("/api/v1/peer-learning/classrooms/{class_id}/form-groups")
async def form_classroom_groups(
    class_id: str,
    request: ClassroomFormGroupsRequest,
) -> Dict[str, Any]:
    """Form peer-learning groups for a classroom.

    The teacher supplies learner IDs (and optional profiles).
    Groups are formed and persisted under the class.
    """
    if group_former is None:
        raise HTTPException(status_code=503, detail="Group former not initialized")

    try:
        # Build profiles from request or candidate pool
        if request.learner_profiles:
            profiles = [p.model_dump() for p in request.learner_profiles]
        else:
            # Try to enrich from learner-model-svc
            profiles = []
            for lid in request.learner_ids:
                mastery = await _fetch_learner_mastery(lid)
                profiles.append({
                    "learner_id": lid,
                    "knowledge_state": mastery or {},
                })

        groups = group_former.form(
            profiles,
            group_size=request.group_size,
            strategy=request.optimization_goal,
        )

        # Persist under classroom
        group_records = []
        for g in groups:
            record = {
                "group_id": g.group_id,
                "class_id": class_id,
                "member_ids": g.member_ids,
                "balance_score": g.balance_score,
                "predicted_effectiveness": g.predicted_effectiveness,
                "member_roles": getattr(g, "member_roles", {}),
                "topic": request.topic,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            group_records.append(record)

        classroom_groups[class_id] = group_records

        logger.info(
            "Formed %d groups for classroom %s with %d learners",
            len(group_records), class_id, len(request.learner_ids),
        )

        return {
            "status": "success",
            "class_id": class_id,
            "groups": group_records,
            "group_count": len(group_records),
        }
    except Exception as e:
        logger.error("Error forming classroom groups: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Group formation error: {str(e)}")


@app.get("/api/v1/peer-learning/classrooms/{class_id}/groups")
async def list_classroom_groups(
    class_id: str = Path(...),
) -> Dict[str, Any]:
    """List groups for a classroom."""
    groups = classroom_groups.get(class_id, [])
    return {
        "status": "success",
        "class_id": class_id,
        "groups": groups,
        "group_count": len(groups),
    }


if __name__ == "__main__":  # pragma: no cover
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
