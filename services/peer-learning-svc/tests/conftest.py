"""Pytest configuration and fixtures for peer learning service tests."""
import pytest
from datetime import datetime, timezone
from typing import Dict, List, Any
from unittest.mock import MagicMock, AsyncMock

from fastapi.testclient import TestClient

from app.main import app
from app.models import (
    PeerMatcher,
    GroupFormer,
    CollaborationScorer,
    DiscussionFacilitator,
    SafetyManager,
    SessionManager,
    PeerAssessmentService,
    RubricManager,
    SessionType,
    ParticipantRole,
    AssessmentType,
)
from app.services import MatchingEngine, WebSocketManager


@pytest.fixture
def client():
    """Create test client."""
    with TestClient(app) as c:
        yield c


@pytest.fixture
def sample_learner_profiles() -> List[Dict[str, Any]]:
    """Create sample learner profiles for testing."""
    return [
        {
            "learner_id": "user_001",
            "knowledge_state": {
                "math": 0.7,
                "science": 0.5,
                "english": 0.8,
            },
            "learning_style": "visual",
            "availability": ["morning", "afternoon"],
            "preferences": {"group_size": 4, "language": "en"},
        },
        {
            "learner_id": "user_002",
            "knowledge_state": {
                "math": 0.5,
                "science": 0.8,
                "english": 0.6,
            },
            "learning_style": "kinesthetic",
            "availability": ["afternoon", "evening"],
            "preferences": {"group_size": 4, "language": "en"},
        },
        {
            "learner_id": "user_003",
            "knowledge_state": {
                "math": 0.8,
                "science": 0.6,
                "english": 0.4,
            },
            "learning_style": "auditory",
            "availability": ["morning", "evening"],
            "preferences": {"group_size": 3, "language": "en"},
        },
        {
            "learner_id": "user_004",
            "knowledge_state": {
                "math": 0.4,
                "science": 0.7,
                "english": 0.9,
            },
            "learning_style": "reading",
            "availability": ["morning", "afternoon", "evening"],
            "preferences": {"group_size": 5, "language": "en"},
        },
        {
            "learner_id": "user_005",
            "knowledge_state": {
                "math": 0.6,
                "science": 0.6,
                "english": 0.6,
            },
            "learning_style": "visual",
            "availability": ["afternoon"],
            "preferences": {"group_size": 4, "language": "en"},
        },
    ]


@pytest.fixture
def sample_messages() -> List[Dict[str, Any]]:
    """Create sample messages for collaboration testing."""
    return [
        {
            "sender_id": "user_001",
            "content": "I think we should start with the basics of calculus.",
            "timestamp": "2024-01-15T10:00:00Z",
        },
        {
            "sender_id": "user_002",
            "content": "Good idea! Can you explain derivatives first?",
            "timestamp": "2024-01-15T10:01:00Z",
        },
        {
            "sender_id": "user_003",
            "content": "I found a great video on this topic. Let me share it.",
            "timestamp": "2024-01-15T10:02:00Z",
        },
        {
            "sender_id": "user_001",
            "content": "Thanks! The derivative of f(x) = x^2 is f'(x) = 2x.",
            "timestamp": "2024-01-15T10:03:00Z",
        },
        {
            "sender_id": "user_004",
            "content": "I understand that. How about the chain rule?",
            "timestamp": "2024-01-15T10:05:00Z",
        },
        {
            "sender_id": "user_002",
            "content": "That's more complex. Let's practice the power rule first.",
            "timestamp": "2024-01-15T10:06:00Z",
        },
    ]


@pytest.fixture
def peer_matcher() -> PeerMatcher:
    """Create PeerMatcher instance."""
    return PeerMatcher()


@pytest.fixture
def group_former() -> GroupFormer:
    """Create GroupFormer instance."""
    return GroupFormer()


@pytest.fixture
def collaboration_scorer() -> CollaborationScorer:
    """Create CollaborationScorer instance."""
    return CollaborationScorer()


@pytest.fixture
def discussion_facilitator() -> DiscussionFacilitator:
    """Create DiscussionFacilitator instance."""
    return DiscussionFacilitator()


@pytest.fixture
def safety_manager() -> SafetyManager:
    """Create SafetyManager instance."""
    return SafetyManager(strict_mode=True)


@pytest.fixture
def session_manager() -> SessionManager:
    """Create SessionManager instance."""
    return SessionManager()


@pytest.fixture
def rubric_manager() -> RubricManager:
    """Create RubricManager instance."""
    return RubricManager()


@pytest.fixture
def assessment_service(rubric_manager) -> PeerAssessmentService:
    """Create PeerAssessmentService instance."""
    return PeerAssessmentService(rubric_manager)


@pytest.fixture
def websocket_manager() -> WebSocketManager:
    """Create WebSocketManager instance."""
    return WebSocketManager()
