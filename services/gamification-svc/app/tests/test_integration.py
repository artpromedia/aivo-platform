"""
Integration tests for Gamification Service.

Tests cover end-to-end flows:
- Complete learner journey
- Points and badges interaction
- Level progression flow
- Streak and points integration
"""
import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def test_client():
    """Create a test client."""
    from app.main import app
    
    with TestClient(app) as client:
        yield client


class TestLearnerJourney:
    """Integration tests for a complete learner journey."""

    def test_new_learner_onboarding_flow(self, test_client):
        """Test a new learner's complete onboarding journey."""
        learner_id = "journey_learner_001"
        
        # 1. Check initial state
        response = test_client.get(f"/api/v1/users/{learner_id}/points")
        assert response.status_code == 200
        initial = response.json()
        assert initial["xp"] == 0
        assert initial["level"] == 1
        
        # 2. Complete first lesson
        response = test_client.post(
            f"/api/v1/users/{learner_id}/points/earn",
            json={"source": "lesson_complete", "point_type": "xp"}
        )
        assert response.status_code == 200
        assert response.json()["success"]
        
        # 3. Check badges for first lesson achievement
        response = test_client.post(
            f"/api/v1/users/{learner_id}/badges/check",
            json={"lessons_completed": 1}
        )
        assert response.status_code == 200
        
        # 4. Verify XP increased
        response = test_client.get(f"/api/v1/users/{learner_id}/points")
        assert response.json()["xp"] > 0

    def test_level_up_journey(self, test_client):
        """Test a learner leveling up through activities."""
        learner_id = "levelup_learner_001"
        
        # Earn enough XP to level up (need 100 for level 2)
        response = test_client.post(
            f"/api/v1/users/{learner_id}/points/earn",
            json={
                "source": "milestone_bonus",
                "point_type": "xp",
                "custom_amount": 100
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["level_up"] is True
        assert data["new_level"] == 2
        
        # Verify level via level endpoint
        response = test_client.get(f"/api/v1/users/{learner_id}/level")
        assert response.json()["current_level"] == 2
        assert response.json()["level_name"] == "Apprentice"

    def test_badge_unlocking_journey(self, test_client):
        """Test unlocking multiple badges through progression."""
        learner_id = "badge_journey_001"
        
        # Progress through activities and unlock badges
        stats_progression = [
            {"lessons_completed": 10},  # Unlock lessons_10
            {"lessons_completed": 50, "streak_days": 7},  # More badges
            {"lessons_completed": 100, "streak_days": 30, "total_xp": 10000},  # Even more
        ]
        
        all_unlocked = []
        
        for stats in stats_progression:
            response = test_client.post(
                f"/api/v1/users/{learner_id}/badges/check",
                json=stats
            )
            assert response.status_code == 200
            data = response.json()
            all_unlocked.extend([b["id"] for b in data["newly_unlocked"]])
        
        # Verify we unlocked multiple badges
        assert len(all_unlocked) > 0
        
        # Verify badges are in user's profile
        response = test_client.get(f"/api/v1/users/{learner_id}/badges")
        earned_ids = [b["id"] for b in response.json()["earned_badges"]]
        
        for badge_id in all_unlocked:
            assert badge_id in earned_ids


class TestPointsAndBadgesInteraction:
    """Tests for points and badges working together."""

    def test_xp_badge_sync(self, test_client):
        """Test XP badges unlock based on actual earned XP."""
        learner_id = "xp_sync_001"
        
        # Earn XP
        test_client.post(
            f"/api/v1/users/{learner_id}/points/earn",
            json={
                "source": "milestone_bonus",
                "point_type": "xp",
                "custom_amount": 1000
            }
        )
        
        # Check for XP badge
        response = test_client.post(
            f"/api/v1/users/{learner_id}/badges/check",
            json={"total_xp": 1000}
        )
        
        assert response.status_code == 200
        badge_ids = [b["id"] for b in response.json()["newly_unlocked"]]
        assert "xp_1000" in badge_ids

    def test_spending_coins_flow(self, test_client):
        """Test earning and spending coins flow."""
        learner_id = "spend_flow_001"
        
        # 1. Start with no coins
        response = test_client.get(f"/api/v1/users/{learner_id}/points")
        initial_coins = response.json()["coins"]
        
        # 2. Earn coins from multiple activities
        activities = ["lesson_complete", "quiz_complete", "perfect_score"]
        for activity in activities:
            test_client.post(
                f"/api/v1/users/{learner_id}/points/earn",
                json={"source": activity, "point_type": "coins"}
            )
        
        # 3. Check balance increased
        response = test_client.get(f"/api/v1/users/{learner_id}/points")
        mid_coins = response.json()["coins"]
        assert mid_coins > initial_coins
        
        # 4. Spend coins on streak freeze
        response = test_client.post(
            f"/api/v1/users/{learner_id}/points/spend",
            json={"category": "streak_freeze", "point_type": "coins"}
        )
        
        if response.json()["success"]:
            # 5. Verify balance decreased
            response = test_client.get(f"/api/v1/users/{learner_id}/points")
            final_coins = response.json()["coins"]
            assert final_coins < mid_coins


class TestStreakMultiplierFlow:
    """Tests for streak multiplier effects on earnings."""

    def test_streak_bonus_increases_xp(self, test_client):
        """Test streak multiplier increases XP earnings."""
        learner_id = "streak_mult_001"
        
        # Earn without streak bonus
        response = test_client.post(
            f"/api/v1/users/{learner_id}/points/earn",
            json={
                "source": "lesson_complete",
                "point_type": "xp",
                "streak_multiplier": 1.0
            }
        )
        base_amount = response.json()["total_amount"]
        
        # Earn with streak bonus
        response = test_client.post(
            f"/api/v1/users/streak_mult_002/points/earn",
            json={
                "source": "lesson_complete",
                "point_type": "xp",
                "streak_multiplier": 1.5
            }
        )
        boosted_amount = response.json()["total_amount"]
        
        # Boosted should be higher
        assert boosted_amount > base_amount

    def test_combined_multipliers(self, test_client):
        """Test multiple multipliers stack correctly."""
        learner_id = "multi_mult_001"
        
        response = test_client.post(
            f"/api/v1/users/{learner_id}/points/earn",
            json={
                "source": "lesson_complete",
                "point_type": "xp",
                "streak_multiplier": 1.5,
                "difficulty_multiplier": 2.0,
                "event_multiplier": 2.0
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Bonus should be significant
        assert data["bonus_amount"] > 0
        assert data["total_amount"] > data["amount_earned"] * 2


class TestTransactionTracking:
    """Tests for transaction history tracking."""

    def test_all_transactions_recorded(self, test_client):
        """Test all transactions are properly recorded."""
        learner_id = "txn_track_001"
        
        # Perform various transactions
        # Earn XP
        test_client.post(
            f"/api/v1/users/{learner_id}/points/earn",
            json={"source": "lesson_complete", "point_type": "xp"}
        )
        # Earn coins
        test_client.post(
            f"/api/v1/users/{learner_id}/points/earn",
            json={"source": "quiz_complete", "point_type": "coins"}
        )
        # Earn more coins
        test_client.post(
            f"/api/v1/users/{learner_id}/points/earn",
            json={
                "source": "milestone_bonus",
                "point_type": "coins",
                "custom_amount": 100
            }
        )
        # Spend coins
        test_client.post(
            f"/api/v1/users/{learner_id}/points/spend",
            json={"category": "hint", "point_type": "coins"}
        )
        
        # Get all history
        response = test_client.get(f"/api/v1/users/{learner_id}/points/history")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have 4 transactions
        assert data["total"] >= 4
        
        # Check transaction types
        types = [t["transaction_type"] for t in data["transactions"]]
        assert "earn" in types
        assert "spend" in types

    def test_history_filters_work(self, test_client):
        """Test history filtering works correctly."""
        learner_id = "txn_filter_001"
        
        # Create mixed transactions
        test_client.post(
            f"/api/v1/users/{learner_id}/points/earn",
            json={"source": "lesson_complete", "point_type": "xp"}
        )
        test_client.post(
            f"/api/v1/users/{learner_id}/points/earn",
            json={"source": "lesson_complete", "point_type": "coins"}
        )
        
        # Filter by XP only
        response = test_client.get(
            f"/api/v1/users/{learner_id}/points/history",
            params={"point_type": "xp"}
        )
        
        assert response.status_code == 200
        for txn in response.json()["transactions"]:
            assert txn["point_type"] == "xp"


class TestLeaderboardScoreCalculation:
    """Tests for leaderboard score tracking."""

    def test_xp_contributes_to_leaderboard(self, test_client):
        """Test XP earnings affect leaderboard score."""
        learner_id = "leaderboard_001"
        
        # Earn XP
        test_client.post(
            f"/api/v1/users/{learner_id}/points/earn",
            json={
                "source": "milestone_bonus",
                "point_type": "xp",
                "custom_amount": 1000
            }
        )
        
        # Get level info (includes XP)
        response = test_client.get(f"/api/v1/users/{learner_id}/level")
        
        assert response.status_code == 200
        assert response.json()["current_xp"] == 1000


class TestErrorRecovery:
    """Tests for error handling and recovery."""

    def test_invalid_request_doesnt_affect_balance(self, test_client):
        """Test invalid requests don't modify balance."""
        learner_id = "error_recovery_001"
        
        # Get initial balance
        response = test_client.get(f"/api/v1/users/{learner_id}/points")
        initial_balance = response.json()["xp"]
        
        # Try invalid earn request
        test_client.post(
            f"/api/v1/users/{learner_id}/points/earn",
            json={"source": "invalid_source", "point_type": "xp"}
        )
        
        # Balance should be unchanged
        response = test_client.get(f"/api/v1/users/{learner_id}/points")
        assert response.json()["xp"] == initial_balance

    def test_failed_spend_doesnt_deduct(self, test_client):
        """Test failed spend doesn't deduct from balance."""
        learner_id = "spend_fail_001"
        
        # Give some coins
        test_client.post(
            f"/api/v1/users/{learner_id}/points/earn",
            json={
                "source": "daily_login",
                "point_type": "coins",
                "custom_amount": 20
            }
        )
        
        # Try to spend more than available
        response = test_client.post(
            f"/api/v1/users/{learner_id}/points/spend",
            json={
                "category": "cosmetic",  # Costs 100
                "point_type": "coins"
            }
        )
        
        assert response.json()["success"] is False
        
        # Balance should still be 20
        response = test_client.get(f"/api/v1/users/{learner_id}/points")
        assert response.json()["coins"] == 20


class TestConcurrentOperations:
    """Tests for handling concurrent-like operations."""

    def test_multiple_earns_accumulate(self, test_client):
        """Test multiple rapid earnings accumulate correctly."""
        learner_id = "concurrent_001"
        
        # Rapidly earn points
        total_earned = 0
        for i in range(10):
            response = test_client.post(
                f"/api/v1/users/{learner_id}/points/earn",
                json={
                    "source": "daily_login",
                    "point_type": "xp",
                    "custom_amount": 10
                }
            )
            total_earned += response.json()["total_amount"]
        
        # Verify total
        response = test_client.get(f"/api/v1/users/{learner_id}/points")
        assert response.json()["xp"] == total_earned


class TestDataConsistency:
    """Tests for data consistency across operations."""

    def test_balance_matches_transactions(self, test_client):
        """Test balance equals sum of transactions."""
        learner_id = "consistency_001"
        
        # Perform multiple transactions
        amounts = [10, 20, 30, 40, 50]
        for amt in amounts:
            test_client.post(
                f"/api/v1/users/{learner_id}/points/earn",
                json={
                    "source": "daily_login",
                    "point_type": "xp",
                    "custom_amount": amt
                }
            )
        
        # Get balance
        response = test_client.get(f"/api/v1/users/{learner_id}/points")
        balance = response.json()["xp"]
        
        # Get transactions
        response = test_client.get(f"/api/v1/users/{learner_id}/points/history")
        txns = response.json()["transactions"]
        
        # Calculate sum
        txn_sum = sum(t["amount"] for t in txns if t["point_type"] == "xp")
        
        assert balance == txn_sum

    def test_level_matches_xp(self, test_client):
        """Test level is consistent with XP amount."""
        learner_id = "level_consistency_001"
        
        # Earn specific XP
        test_client.post(
            f"/api/v1/users/{learner_id}/points/earn",
            json={
                "source": "milestone_bonus",
                "point_type": "xp",
                "custom_amount": 500
            }
        )
        
        # Check points endpoint
        response = test_client.get(f"/api/v1/users/{learner_id}/points")
        points_data = response.json()
        
        # Check level endpoint
        response = test_client.get(f"/api/v1/users/{learner_id}/level")
        level_data = response.json()
        
        # Should match
        assert points_data["level"] == level_data["current_level"]
        assert points_data["xp"] == level_data["current_xp"]
