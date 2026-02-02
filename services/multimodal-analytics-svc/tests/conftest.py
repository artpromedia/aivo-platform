"""
Pytest configuration and fixtures for multimodal-analytics-svc tests.
"""
import pytest
import sys
import os
from datetime import datetime, timedelta

# Add app directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.fixture
def sample_video_events():
    """Sample video learning events."""
    base_time = datetime.utcnow()
    return [
        {
            "event_type": "video_play",
            "student_id": "student_001",
            "content_id": "video_001",
            "timestamp": base_time.isoformat(),
            "duration_ms": 0,
            "session_id": "session_001",
            "device_type": "desktop",
            "metadata": {"video_duration_ms": 600000},
        },
        {
            "event_type": "video_seek",
            "student_id": "student_001",
            "content_id": "video_001",
            "timestamp": (base_time + timedelta(seconds=30)).isoformat(),
            "duration_ms": 30000,
            "session_id": "session_001",
            "device_type": "desktop",
            "metadata": {"from_position": 0.05, "to_position": 0.1},
        },
        {
            "event_type": "video_pause",
            "student_id": "student_001",
            "content_id": "video_001",
            "timestamp": (base_time + timedelta(minutes=2)).isoformat(),
            "duration_ms": 120000,
            "session_id": "session_001",
            "device_type": "desktop",
        },
        {
            "event_type": "video_resume",
            "student_id": "student_001",
            "content_id": "video_001",
            "timestamp": (base_time + timedelta(minutes=3)).isoformat(),
            "duration_ms": 0,
            "session_id": "session_001",
            "device_type": "desktop",
        },
        {
            "event_type": "video_complete",
            "student_id": "student_001",
            "content_id": "video_001",
            "timestamp": (base_time + timedelta(minutes=10)).isoformat(),
            "duration_ms": 600000,
            "session_id": "session_001",
            "device_type": "desktop",
        },
    ]


@pytest.fixture
def sample_document_events():
    """Sample document learning events."""
    base_time = datetime.utcnow()
    return [
        {
            "event_type": "document_open",
            "student_id": "student_001",
            "content_id": "doc_001",
            "timestamp": base_time.isoformat(),
            "session_id": "session_001",
            "device_type": "desktop",
            "metadata": {"total_pages": 10},
        },
        {
            "event_type": "document_scroll",
            "student_id": "student_001",
            "content_id": "doc_001",
            "timestamp": (base_time + timedelta(seconds=30)).isoformat(),
            "session_id": "session_001",
            "device_type": "desktop",
            "metadata": {"position": 0.1, "page": 1},
        },
        {
            "event_type": "document_highlight",
            "student_id": "student_001",
            "content_id": "doc_001",
            "timestamp": (base_time + timedelta(minutes=1)).isoformat(),
            "session_id": "session_001",
            "device_type": "desktop",
            "metadata": {"page": 2, "text_length": 50},
        },
        {
            "event_type": "document_close",
            "student_id": "student_001",
            "content_id": "doc_001",
            "timestamp": (base_time + timedelta(minutes=5)).isoformat(),
            "duration_ms": 300000,
            "session_id": "session_001",
            "device_type": "desktop",
            "metadata": {"final_page": 5, "total_pages": 10},
        },
    ]


@pytest.fixture
def sample_assessment_events():
    """Sample assessment learning events."""
    base_time = datetime.utcnow()
    return [
        {
            "event_type": "assessment_start",
            "student_id": "student_001",
            "content_id": "quiz_001",
            "timestamp": base_time.isoformat(),
            "session_id": "session_001",
            "device_type": "desktop",
            "metadata": {"total_questions": 10},
        },
        {
            "event_type": "assessment_answer",
            "student_id": "student_001",
            "content_id": "quiz_001",
            "timestamp": (base_time + timedelta(seconds=30)).isoformat(),
            "duration_ms": 30000,
            "session_id": "session_001",
            "device_type": "desktop",
            "metadata": {"question": 1, "correct": True},
        },
        {
            "event_type": "assessment_answer",
            "student_id": "student_001",
            "content_id": "quiz_001",
            "timestamp": (base_time + timedelta(minutes=1)).isoformat(),
            "duration_ms": 25000,
            "session_id": "session_001",
            "device_type": "desktop",
            "metadata": {"question": 2, "correct": False},
        },
        {
            "event_type": "assessment_complete",
            "student_id": "student_001",
            "content_id": "quiz_001",
            "timestamp": (base_time + timedelta(minutes=5)).isoformat(),
            "duration_ms": 300000,
            "session_id": "session_001",
            "device_type": "desktop",
            "metadata": {"score": 0.8, "correct": 8, "total": 10},
        },
    ]


@pytest.fixture
def sample_audio_events():
    """Sample audio learning events."""
    base_time = datetime.utcnow()
    return [
        {
            "event_type": "audio_play",
            "student_id": "student_001",
            "content_id": "audio_001",
            "timestamp": base_time.isoformat(),
            "session_id": "session_001",
            "device_type": "mobile",
            "metadata": {"audio_duration_ms": 300000},
        },
        {
            "event_type": "audio_pause",
            "student_id": "student_001",
            "content_id": "audio_001",
            "timestamp": (base_time + timedelta(minutes=2)).isoformat(),
            "duration_ms": 120000,
            "session_id": "session_001",
            "device_type": "mobile",
        },
        {
            "event_type": "audio_complete",
            "student_id": "student_001",
            "content_id": "audio_001",
            "timestamp": (base_time + timedelta(minutes=5)).isoformat(),
            "duration_ms": 300000,
            "session_id": "session_001",
            "device_type": "mobile",
        },
    ]


@pytest.fixture
def sample_mixed_events(
    sample_video_events,
    sample_document_events,
    sample_assessment_events,
    sample_audio_events,
):
    """Combined sample of all event types."""
    return (
        sample_video_events + 
        sample_document_events + 
        sample_assessment_events +
        sample_audio_events
    )


@pytest.fixture
def sample_student_profile():
    """Sample student engagement profile."""
    return {
        "student_id": "student_001",
        "engagement_by_content_type": {
            "video": 0.75,
            "document": 0.60,
            "assessment": 0.85,
            "audio": 0.70,
        },
        "engagement_trend": "improving",
        "skill_level": 0.65,
        "peak_engagement_hours": [10, 11, 14, 15],
        "preferred_devices": ["desktop"],
        "learning_style": "visual",
    }


@pytest.fixture
def sample_content_catalog():
    """Sample content items for recommendations."""
    return [
        {
            "id": "video_001",
            "type": "video",
            "title": "Introduction to Algebra",
            "topics": ["math", "algebra"],
            "difficulty": 0.4,
            "duration_ms": 600000,
        },
        {
            "id": "video_002",
            "type": "video",
            "title": "Advanced Calculus",
            "topics": ["math", "calculus"],
            "difficulty": 0.8,
            "duration_ms": 900000,
        },
        {
            "id": "doc_001",
            "type": "document",
            "title": "Math Formulas Reference",
            "topics": ["math", "reference"],
            "difficulty": 0.3,
            "pages": 20,
        },
        {
            "id": "quiz_001",
            "type": "assessment",
            "title": "Algebra Quiz",
            "topics": ["math", "algebra"],
            "difficulty": 0.5,
            "questions": 10,
        },
        {
            "id": "audio_001",
            "type": "audio",
            "title": "Math Podcast Episode 1",
            "topics": ["math", "general"],
            "difficulty": 0.3,
            "duration_ms": 300000,
        },
    ]


@pytest.fixture
def minor_user_consent_setup():
    """Setup for testing minor user consent flows."""
    return {
        "user_id": "minor_student_001",
        "is_minor": True,
        "age": 10,
        "parent_guardian_id": "parent_001",
        "consent_types": ["analytics", "personalization"],
        "privacy_config": {
            "strict_coppa": True,
            "data_retention": "90d",
            "anonymize_by_default": True,
        },
    }


@pytest.fixture
def adult_user_consent_setup():
    """Setup for testing adult user consent flows."""
    return {
        "user_id": "adult_student_001",
        "is_minor": False,
        "consent_types": ["analytics", "personalization", "marketing"],
        "privacy_config": {
            "strict_coppa": False,
            "data_retention": "365d",
            "anonymize_by_default": False,
        },
    }


# Async test support
@pytest.fixture
def anyio_backend():
    """Backend for anyio tests."""
    return 'asyncio'
