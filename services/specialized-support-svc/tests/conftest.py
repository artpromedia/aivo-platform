"""
Pytest configuration and fixtures for Specialized Support Service tests.
"""

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Create a test client for the FastAPI application."""
    from app.main import app
    return TestClient(app)


@pytest.fixture
def sample_learner_profile():
    """Sample learner profile for testing."""
    return {
        "learner_id": "test-learner-123",
        "age": 12,
        "grade_level": 6,
        "diagnoses": ["ADHD-Combined"],
        "attention_span_minutes": 15,
        "peak_focus_times": ["morning", "early_afternoon"],
        "preferred_break_activities": ["movement", "drawing"],
        "executive_function_challenges": [
            "organization",
            "time_management",
            "task_initiation",
        ],
        "strengths": ["creativity", "verbal_expression", "problem_solving"],
        "interests": ["video_games", "animals", "building"],
    }


@pytest.fixture
def sample_project():
    """Sample project for testing project breakdown."""
    return {
        "title": "Science Fair Project",
        "description": "Research and present a science experiment",
        "due_date": "2026-02-15",
        "requirements": [
            "Choose a topic",
            "Write hypothesis",
            "Conduct experiment",
            "Collect data",
            "Create presentation board",
            "Prepare oral presentation",
        ],
        "estimated_hours": 10,
    }


@pytest.fixture
def sample_tasks():
    """Sample tasks for daily planning."""
    return [
        {
            "task_id": "task-1",
            "title": "Math homework",
            "subject": "math",
            "estimated_minutes": 30,
            "priority": "high",
            "energy_required": "medium",
        },
        {
            "task_id": "task-2",
            "title": "Read chapter 5",
            "subject": "reading",
            "estimated_minutes": 20,
            "priority": "medium",
            "energy_required": "low",
        },
        {
            "task_id": "task-3",
            "title": "Science worksheet",
            "subject": "science",
            "estimated_minutes": 25,
            "priority": "high",
            "energy_required": "high",
        },
    ]
