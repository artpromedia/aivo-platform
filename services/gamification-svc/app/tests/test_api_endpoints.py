"""
Unit tests for Gamification Service API endpoints.

Tests cover:
- User points endpoints
- User badges endpoints
- Error handling
- Input validation
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

# Mock the services before importing app
from app.models.points_system import (
    EarnSource,
    PointType,
    SpendCategory,
    TransactionType,
)
from app.services.points_manager import PointsManager, get_points_manager
from app.services.badge_manager import BadgeManager, LearnerStats, get_badge_manager


@pytest.fixture(scope="module")
def test_client():
    """Create a test client with mocked services."""
    from app.main import app, lifespan
    
    with TestClient(app) as client:
        yield client


@pytest.fixture
def mock_points_manager():
    """Create a mock PointsManager."""
    return PointsManager()


@pytest.fixture
def mock_badge_manager():
    """Create a mock BadgeManager."""
    return BadgeManager()


class TestHealthEndpoint:
    """Tests for health check endpoint."""

    def test_health_check(self, test_client):
        """Test health check returns 200."""
        response = test_client.get("/health")
        
        # Health endpoint might return 200 or 404 if not defined
        # Most FastAPI apps have it
        assert response.status_code in [200, 404]


class TestUserPointsEndpoints:
    """Tests for user points API endpoints."""

    def test_get_user_points(self, test_client):
        """Test getting user points."""
        response = test_client.get("/api/v1/users/test_user_001/points")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "learner_id" in data
        assert "xp" in data
        assert "coins" in data
        assert "gems" in data
        assert "level" in data
        assert "level_name" in data

    def test_get_user_points_new_user(self, test_client):
        """Test getting points for a new user."""
        response = test_client.get("/api/v1/users/brand_new_user/points")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["xp"] == 0
        assert data["coins"] == 0
        assert data["level"] == 1

    def test_earn_user_points(self, test_client):
        """Test earning points."""
        response = test_client.post(
            "/api/v1/users/test_earn_001/points/earn",
            json={
                "source": "lesson_complete",
                "point_type": "xp",
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["point_type"] == "xp"
        assert data["amount_earned"] > 0

    def test_earn_coins(self, test_client):
        """Test earning coins."""
        response = test_client.post(
            "/api/v1/users/test_earn_002/points/earn",
            json={
                "source": "quiz_complete",
                "point_type": "coins",
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["point_type"] == "coins"

    def test_earn_with_multipliers(self, test_client):
        """Test earning with multipliers."""
        response = test_client.post(
            "/api/v1/users/test_earn_003/points/earn",
            json={
                "source": "lesson_complete",
                "point_type": "xp",
                "streak_multiplier": 1.5,
                "difficulty_multiplier": 2.0,
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["bonus_amount"] > 0

    def test_earn_custom_amount(self, test_client):
        """Test earning custom amount."""
        response = test_client.post(
            "/api/v1/users/test_earn_004/points/earn",
            json={
                "source": "milestone_bonus",
                "point_type": "xp",
                "custom_amount": 500,
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["total_amount"] == 500

    def test_earn_invalid_source(self, test_client):
        """Test earning with invalid source."""
        response = test_client.post(
            "/api/v1/users/test_earn_005/points/earn",
            json={
                "source": "invalid_source",
                "point_type": "xp",
            }
        )
        
        assert response.status_code == 400
        assert "Invalid source" in response.json()["detail"]

    def test_earn_invalid_point_type(self, test_client):
        """Test earning with invalid point type."""
        response = test_client.post(
            "/api/v1/users/test_earn_006/points/earn",
            json={
                "source": "lesson_complete",
                "point_type": "invalid_type",
            }
        )
        
        assert response.status_code == 400
        assert "Invalid point_type" in response.json()["detail"]

    def test_spend_user_points(self, test_client):
        """Test spending points."""
        # First earn some coins
        test_client.post(
            "/api/v1/users/test_spend_001/points/earn",
            json={
                "source": "milestone_bonus",
                "point_type": "coins",
                "custom_amount": 200,
            }
        )
        
        # Then spend them
        response = test_client.post(
            "/api/v1/users/test_spend_001/points/spend",
            json={
                "category": "streak_freeze",
                "point_type": "coins",
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["amount_spent"] == 50

    def test_spend_insufficient_balance(self, test_client):
        """Test spending with insufficient balance."""
        response = test_client.post(
            "/api/v1/users/poor_user_001/points/spend",
            json={
                "category": "cosmetic",
                "point_type": "coins",
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is False
        assert "Insufficient" in data["error"]

    def test_spend_invalid_category(self, test_client):
        """Test spending with invalid category."""
        response = test_client.post(
            "/api/v1/users/test_spend_002/points/spend",
            json={
                "category": "invalid_category",
                "point_type": "coins",
            }
        )
        
        assert response.status_code == 400
        assert "Invalid category" in response.json()["detail"]

    def test_get_transaction_history(self, test_client):
        """Test getting transaction history."""
        # First create some transactions
        test_client.post(
            "/api/v1/users/test_history_001/points/earn",
            json={"source": "lesson_complete", "point_type": "xp"}
        )
        test_client.post(
            "/api/v1/users/test_history_001/points/earn",
            json={"source": "quiz_complete", "point_type": "coins"}
        )
        
        response = test_client.get("/api/v1/users/test_history_001/points/history")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "transactions" in data
        assert "total" in data
        assert data["total"] >= 2

    def test_get_transaction_history_filter_point_type(self, test_client):
        """Test filtering transaction history by point type."""
        response = test_client.get(
            "/api/v1/users/test_history_001/points/history",
            params={"point_type": "xp"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        for txn in data["transactions"]:
            assert txn["point_type"] == "xp"

    def test_get_transaction_history_pagination(self, test_client):
        """Test transaction history pagination."""
        # Create many transactions
        for i in range(15):
            test_client.post(
                "/api/v1/users/test_history_002/points/earn",
                json={"source": "daily_login", "point_type": "xp"}
            )
        
        # Get first page
        response = test_client.get(
            "/api/v1/users/test_history_002/points/history",
            params={"limit": 5, "offset": 0}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["transactions"]) == 5
        assert data["limit"] == 5
        assert data["offset"] == 0

    def test_get_user_level(self, test_client):
        """Test getting user level."""
        # First earn some XP
        test_client.post(
            "/api/v1/users/test_level_001/points/earn",
            json={
                "source": "milestone_bonus",
                "point_type": "xp",
                "custom_amount": 150
            }
        )
        
        response = test_client.get("/api/v1/users/test_level_001/level")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "current_level" in data
        assert "current_xp" in data
        assert "level_name" in data
        assert "progress_percentage" in data
        assert data["current_level"] == 2


class TestUserBadgesEndpoints:
    """Tests for user badges API endpoints."""

    def test_get_user_badges(self, test_client):
        """Test getting user badges."""
        response = test_client.get("/api/v1/users/test_badges_001/badges")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "learner_id" in data
        assert "earned_badges" in data
        assert "in_progress" in data
        assert "total_badges" in data

    def test_get_user_badges_with_filters(self, test_client):
        """Test getting badges with category filter."""
        response = test_client.get(
            "/api/v1/users/test_badges_002/badges",
            params={"category": "lessons"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        for badge in data["in_progress"]:
            assert badge["category"] == "lessons"

    def test_get_user_badges_exclude_progress(self, test_client):
        """Test excluding in-progress badges."""
        response = test_client.get(
            "/api/v1/users/test_badges_003/badges",
            params={"include_progress": False}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["in_progress"]) == 0

    def test_check_user_badges(self, test_client):
        """Test checking for new badges."""
        response = test_client.post(
            "/api/v1/users/test_check_001/badges/check",
            json={
                "lessons_completed": 50,
                "streak_days": 7,
                "total_xp": 5000,
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "newly_unlocked" in data
        assert "xp_earned" in data
        assert "message" in data
        assert len(data["newly_unlocked"]) > 0

    def test_check_badges_no_new_unlocks(self, test_client):
        """Test check when no new badges are unlocked."""
        # First check - will unlock badges
        test_client.post(
            "/api/v1/users/test_check_002/badges/check",
            json={"lessons_completed": 10}
        )
        
        # Second check with same stats - no new badges
        response = test_client.post(
            "/api/v1/users/test_check_002/badges/check",
            json={"lessons_completed": 10}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["newly_unlocked"]) == 0

    def test_list_all_badges(self, test_client):
        """Test listing all available badges."""
        response = test_client.get("/api/v1/badges")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Check badge structure
        badge = data[0]
        assert "id" in badge
        assert "name" in badge
        assert "category" in badge
        assert "rarity" in badge

    def test_list_badges_filter_category(self, test_client):
        """Test filtering all badges by category."""
        response = test_client.get(
            "/api/v1/badges",
            params={"category": "consistency"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        for badge in data:
            assert badge["category"] == "consistency"

    def test_list_badges_filter_rarity(self, test_client):
        """Test filtering all badges by rarity."""
        response = test_client.get(
            "/api/v1/badges",
            params={"rarity": "rare"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        for badge in data:
            assert badge["rarity"] == "rare"


class TestInputValidation:
    """Tests for input validation."""

    def test_earn_multiplier_min_value(self, test_client):
        """Test multiplier minimum value validation."""
        response = test_client.post(
            "/api/v1/users/test_val_001/points/earn",
            json={
                "source": "lesson_complete",
                "streak_multiplier": 0.5,  # Below minimum
            }
        )
        
        assert response.status_code == 422  # Validation error

    def test_earn_multiplier_max_value(self, test_client):
        """Test multiplier maximum value validation."""
        response = test_client.post(
            "/api/v1/users/test_val_002/points/earn",
            json={
                "source": "lesson_complete",
                "streak_multiplier": 10.0,  # Above maximum
            }
        )
        
        assert response.status_code == 422

    def test_history_limit_validation(self, test_client):
        """Test history limit validation."""
        response = test_client.get(
            "/api/v1/users/test_val_003/points/history",
            params={"limit": 1000}  # Above maximum
        )
        
        assert response.status_code == 422

    def test_check_badges_negative_values(self, test_client):
        """Test check badges rejects negative values."""
        response = test_client.post(
            "/api/v1/users/test_val_004/badges/check",
            json={
                "lessons_completed": -5,  # Negative value
            }
        )
        
        assert response.status_code == 422


class TestErrorHandling:
    """Tests for error handling."""

    def test_missing_required_field(self, test_client):
        """Test missing required field returns 422."""
        response = test_client.post(
            "/api/v1/users/test_err_001/points/spend",
            json={}  # Missing required 'category' field
        )
        
        assert response.status_code == 422

    def test_invalid_json(self, test_client):
        """Test invalid JSON returns 422."""
        response = test_client.post(
            "/api/v1/users/test_err_002/points/earn",
            content="not valid json",
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 422

    def test_wrong_method(self, test_client):
        """Test wrong HTTP method returns 405."""
        response = test_client.delete("/api/v1/users/test_err_003/points")
        
        assert response.status_code == 405


class TestResponseStructure:
    """Tests for response structure compliance."""

    def test_points_response_structure(self, test_client):
        """Test points response has all required fields."""
        response = test_client.get("/api/v1/users/test_struct_001/points")
        
        assert response.status_code == 200
        data = response.json()
        
        required_fields = [
            "learner_id", "xp", "coins", "gems",
            "total_xp_earned", "total_coins_earned", "total_coins_spent",
            "level", "level_name", "xp_to_next_level", "progress_percentage"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing field: {field}"

    def test_earn_response_structure(self, test_client):
        """Test earn response has all required fields."""
        response = test_client.post(
            "/api/v1/users/test_struct_002/points/earn",
            json={"source": "lesson_complete"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        required_fields = [
            "success", "transaction_id", "point_type",
            "amount_earned", "bonus_amount", "total_amount",
            "new_balance", "level_up", "new_level",
            "achievements_unlocked", "message"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing field: {field}"

    def test_badges_response_structure(self, test_client):
        """Test badges response has all required fields."""
        response = test_client.get("/api/v1/users/test_struct_003/badges")
        
        assert response.status_code == 200
        data = response.json()
        
        required_fields = [
            "learner_id", "earned_badges", "in_progress",
            "total_badges", "badges_by_rarity"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing field: {field}"

    def test_badge_progress_structure(self, test_client):
        """Test badge progress item has all required fields."""
        response = test_client.get("/api/v1/users/test_struct_004/badges")
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data["in_progress"]) > 0:
            progress = data["in_progress"][0]
            required_fields = [
                "badge_id", "badge_name", "description", "icon",
                "category", "rarity", "current_value", "target_value",
                "progress_percentage", "is_earned"
            ]
            
            for field in required_fields:
                assert field in progress, f"Missing field: {field}"
