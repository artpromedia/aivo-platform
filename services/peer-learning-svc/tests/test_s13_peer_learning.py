"""S13 – Peer Learning Service tests.

Covers:
 1. CollaborationScorer.score_with_outcomes (outcome_improvement dimension)
 2. DiscussionFacilitator.suggest_inclusive_actions (neurodivergent turn-taking)
 3. API endpoints: /peer-learning/score-collaboration,
    /peer-learning/facilitate, /peer-learning/match,
    /peer-learning/classrooms/:classId/form-groups,
    /peer-learning/classrooms/:classId/groups
 4. Match persistence helpers
 5. 12-student balanced-group integration test
"""
import pytest
from typing import Dict, List, Any
from unittest.mock import patch, AsyncMock

from fastapi.testclient import TestClient

from app.main import (
    app,
    active_matches,
    match_history,
    excluded_pairs,
    classroom_groups,
    _persist_match,
)
from app.models import CollaborationScorer, DiscussionFacilitator


# =====================================================================
# Fixtures
# =====================================================================

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c
    # Reset in-memory stores between tests
    active_matches.clear()
    match_history.clear()
    excluded_pairs.clear()
    classroom_groups.clear()


@pytest.fixture
def scorer() -> CollaborationScorer:
    return CollaborationScorer()


@pytest.fixture
def facilitator() -> DiscussionFacilitator:
    return DiscussionFacilitator()


@pytest.fixture
def sample_messages() -> List[Dict[str, Any]]:
    return [
        {"sender_id": "u1", "content": "I think derivatives are about the rate of change.", "timestamp": "2024-01-15T10:00:00Z"},
        {"sender_id": "u2", "content": "Exactly, good point! Can you elaborate?", "timestamp": "2024-01-15T10:01:00Z"},
        {"sender_id": "u3", "content": "I found a helpful resource on calculus.", "timestamp": "2024-01-15T10:02:00Z"},
        {"sender_id": "u1", "content": "The chain rule lets us differentiate compositions.", "timestamp": "2024-01-15T10:03:00Z"},
        {"sender_id": "u2", "content": "That helps, thanks!", "timestamp": "2024-01-15T10:04:00Z"},
        {"sender_id": "u3", "content": "Let's try an example with the chain rule.", "timestamp": "2024-01-15T10:05:00Z"},
    ]


@pytest.fixture
def twelve_profiles() -> List[Dict[str, Any]]:
    """12 learners with varied knowledge for group-formation tests."""
    profiles = []
    for i in range(12):
        profiles.append({
            "learner_id": f"learner_{i:03d}",
            "knowledge_state": {
                "math": round(0.3 + (i % 4) * 0.15, 2),
                "science": round(0.4 + ((i + 1) % 4) * 0.12, 2),
            },
            "learning_style": ["visual", "auditory", "kinesthetic", "reading"][i % 4],
            "availability": ["morning", "afternoon"],
            "preferences": {},
        })
    return profiles


# =====================================================================
# 1. CollaborationScorer.score_with_outcomes
# =====================================================================

class TestScoreWithOutcomes:
    def test_returns_outcome_dimension(self, scorer, sample_messages):
        interaction = {"messages": sample_messages, "topic": "calculus", "member_ids": ["u1", "u2", "u3"]}
        pre = {"u1": 0.4, "u2": 0.3, "u3": 0.35}
        post = {"u1": 0.55, "u2": 0.45, "u3": 0.5}

        result = scorer.score_with_outcomes(interaction, pre_mastery=pre, post_mastery=post)

        assert hasattr(result, "outcome_improvement")
        assert 0.0 <= result.outcome_improvement <= 1.0
        assert result.outcome_improvement > 0.5, "avg gain ~0.15 should score high"
        assert 0.0 <= result.overall <= 1.0

    def test_neutral_when_no_mastery(self, scorer, sample_messages):
        interaction = {"messages": sample_messages, "topic": "calculus", "member_ids": ["u1", "u2", "u3"]}
        result = scorer.score_with_outcomes(interaction)
        assert result.outcome_improvement == 0.5

    def test_zero_gain_gives_low_outcome(self, scorer, sample_messages):
        interaction = {"messages": sample_messages, "topic": "calculus", "member_ids": ["u1", "u2"]}
        pre = {"u1": 0.5, "u2": 0.6}
        post = {"u1": 0.5, "u2": 0.6}
        result = scorer.score_with_outcomes(interaction, pre, post)
        assert result.outcome_improvement == 0.0

    def test_recommendations_populated(self, scorer, sample_messages):
        interaction = {"messages": sample_messages, "topic": "calculus", "member_ids": ["u1", "u2", "u3"]}
        result = scorer.score_with_outcomes(interaction)
        assert isinstance(result.recommendations, list)
        assert len(result.recommendations) >= 1

    def test_high_gain_caps_at_one(self, scorer, sample_messages):
        interaction = {"messages": sample_messages, "topic": "calculus", "member_ids": ["u1"]}
        pre = {"u1": 0.1}
        post = {"u1": 0.9}
        result = scorer.score_with_outcomes(interaction, pre, post)
        assert result.outcome_improvement == 1.0


# =====================================================================
# 2. DiscussionFacilitator.suggest_inclusive_actions
# =====================================================================

class TestInclusiveActions:
    def test_no_profiles_returns_standard_actions(self, facilitator, sample_messages):
        actions = facilitator.suggest_inclusive_actions(sample_messages, "calculus")
        # Should still work without member_profiles
        assert isinstance(actions, list)

    def test_adhd_profile_returns_inclusive_turn(self, facilitator, sample_messages):
        profiles = {
            "u1": {"neurodivergent_needs": ["adhd"]},
            "u2": {},
            "u3": {},
        }
        # Need break_interval_messages msgs (ADHD = 8); pad messages
        msgs = sample_messages * 2  # 12 messages, but 8 is the interval
        padded = msgs[:8]
        actions = facilitator.suggest_inclusive_actions(padded, "calculus", member_profiles=profiles)
        action_types = [a.action_type for a in actions]
        assert "inclusive_turn" in action_types or "visual_timer" in action_types

    def test_asd_profile_triggers_round_robin(self, facilitator, sample_messages):
        profiles = {"u1": {"neurodivergent_needs": ["asd"]}}
        # 10 is the break interval for ASD
        msgs = sample_messages + sample_messages[:4]  # 10 messages
        actions = facilitator.suggest_inclusive_actions(msgs, "calculus", member_profiles=profiles)
        action_types = [a.action_type for a in actions]
        assert "inclusive_turn" in action_types or "visual_timer" in action_types

    def test_strategy_resolution_picks_most_accommodating(self, facilitator):
        profiles = {
            "u1": {"neurodivergent_needs": ["adhd"]},
            "u2": {"neurodivergent_needs": ["asd"]},
        }
        strategy = facilitator._resolve_inclusive_strategy(profiles)
        # ASD has priority; but duration should be max of both (120 from dyslexia not present; 90 from ASD)
        assert strategy["turn_style"] == "round_robin"
        assert strategy["visual_timer"] is True


# =====================================================================
# 3. API endpoint tests
# =====================================================================

class TestScoreCollaborationEndpoint:
    def test_score_collaboration_success(self, client, sample_messages):
        resp = client.post("/api/v1/peer-learning/score-collaboration", json={
            "group_id": "g1",
            "messages": sample_messages,
            "topic": "calculus",
            "member_ids": ["u1", "u2", "u3"],
            "pre_mastery": {"u1": 0.3, "u2": 0.3, "u3": 0.3},
            "post_mastery": {"u1": 0.5, "u2": 0.45, "u3": 0.4},
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "success"
        assert "outcome_improvement" in data["scores"]
        assert "recommendations" in data

    def test_score_collaboration_without_mastery(self, client, sample_messages):
        resp = client.post("/api/v1/peer-learning/score-collaboration", json={
            "group_id": "g1",
            "messages": sample_messages,
            "topic": "calculus",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["scores"]["outcome_improvement"] == 0.5


class TestFacilitateEndpoint:
    def test_inclusive_facilitation(self, client, sample_messages):
        resp = client.post("/api/v1/peer-learning/facilitate", json={
            "group_id": "g1",
            "topic": "calculus",
            "messages": sample_messages,
            "member_profiles": {
                "u1": {"neurodivergent_needs": ["adhd"]},
            },
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "success"
        assert isinstance(data["actions"], list)

    def test_facilitation_no_profiles(self, client, sample_messages):
        resp = client.post("/api/v1/peer-learning/facilitate", json={
            "group_id": "g1",
            "topic": "calculus",
            "messages": sample_messages,
        })
        assert resp.status_code == 200


class TestMatchEndpoint:
    def test_match_returns_no_match_on_empty_pool(self, client):
        resp = client.post(
            "/api/v1/peer-learning/match?learner_id=u1&match_type=study_partner"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "no_match"


class TestMatchPersistence:
    def test_persist_and_retrieve(self):
        active_matches.clear()
        match_history.clear()
        record = {"learner_id": "u1", "matched_peer_id": "u2", "compatibility_score": 0.85}
        mid = _persist_match(record)
        assert mid in active_matches
        assert len(match_history) == 1
        assert match_history[0]["learner_id"] == "u1"

    def test_match_history_endpoint(self, client):
        match_history.clear()
        _persist_match({"learner_id": "u1", "matched_peer_id": "u2", "compatibility_score": 0.8})
        _persist_match({"learner_id": "u3", "matched_peer_id": "u4", "compatibility_score": 0.7})
        resp = client.get("/api/v1/peer-learning/matches/u1")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["matches"]) == 1  # only u1's match


# =====================================================================
# 4. Teacher dashboard endpoints
# =====================================================================

class TestClassroomGroups:
    def test_form_groups(self, client, twelve_profiles):
        resp = client.post("/api/v1/peer-learning/classrooms/class_A/form-groups", json={
            "learner_ids": [p["learner_id"] for p in twelve_profiles],
            "topic": "algebra",
            "group_size": 4,
            "optimization_goal": "balanced",
            "learner_profiles": twelve_profiles,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "success"
        assert data["group_count"] >= 1
        # All learners assigned
        assigned = set()
        for g in data["groups"]:
            assigned.update(g["member_ids"])
        assert len(assigned) == 12

    def test_list_groups_empty(self, client):
        resp = client.get("/api/v1/peer-learning/classrooms/nonexistent/groups")
        assert resp.status_code == 200
        data = resp.json()
        assert data["group_count"] == 0

    def test_list_groups_after_creation(self, client, twelve_profiles):
        # Create first
        client.post("/api/v1/peer-learning/classrooms/class_B/form-groups", json={
            "learner_ids": [p["learner_id"] for p in twelve_profiles],
            "topic": "biology",
            "group_size": 3,
            "learner_profiles": twelve_profiles,
        })
        resp = client.get("/api/v1/peer-learning/classrooms/class_B/groups")
        assert resp.status_code == 200
        data = resp.json()
        assert data["class_id"] == "class_B"
        assert data["group_count"] >= 1


# =====================================================================
# 5. Integration: 12 students → balanced groups
# =====================================================================

class TestIntegration12Students:
    def test_balanced_groups_of_4(self, client, twelve_profiles):
        resp = client.post("/api/v1/peer-learning/classrooms/class_int/form-groups", json={
            "learner_ids": [p["learner_id"] for p in twelve_profiles],
            "topic": "math",
            "group_size": 4,
            "optimization_goal": "balanced",
            "learner_profiles": twelve_profiles,
        })
        assert resp.status_code == 200
        data = resp.json()
        groups = data["groups"]
        assert len(groups) == 3, "12 learners / 4 = 3 groups"
        for g in groups:
            assert len(g["member_ids"]) == 4

    def test_score_formed_group(self, client, sample_messages, twelve_profiles):
        # Form groups then score the first one
        form_resp = client.post("/api/v1/peer-learning/classrooms/class_sc/form-groups", json={
            "learner_ids": [p["learner_id"] for p in twelve_profiles],
            "topic": "science",
            "group_size": 4,
            "learner_profiles": twelve_profiles,
        })
        groups = form_resp.json()["groups"]
        first_group = groups[0]

        score_resp = client.post("/api/v1/peer-learning/score-collaboration", json={
            "group_id": first_group["group_id"],
            "messages": sample_messages,
            "topic": "science",
            "member_ids": first_group["member_ids"],
        })
        assert score_resp.status_code == 200
        scores = score_resp.json()["scores"]
        assert 0.0 <= scores["overall"] <= 1.0
        assert "outcome_improvement" in scores
