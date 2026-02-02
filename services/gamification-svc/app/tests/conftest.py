"""
Pytest configuration and fixtures for gamification tests.
"""
import pytest
import sys
import os

# Add the app directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@pytest.fixture(autouse=True)
def reset_singletons():
    """Reset singleton instances before each test."""
    from app.services import points_manager, badge_manager
    
    # Reset the singleton instances
    points_manager._points_manager = None
    badge_manager._badge_manager = None
    
    yield
    
    # Cleanup after test
    points_manager._points_manager = None
    badge_manager._badge_manager = None


@pytest.fixture
def sample_learner_id():
    """Provide a sample learner ID."""
    return "test_learner_12345"


@pytest.fixture
def sample_stats():
    """Provide sample learner stats."""
    from app.services.badge_manager import LearnerStats
    
    return LearnerStats(
        lessons_completed=25,
        quizzes_completed=15,
        perfect_scores=5,
        streak_days=7,
        total_xp=2500,
        total_time_minutes=120,
        skills_mastered=3,
        challenges_won=2,
        help_given=5,
    )
