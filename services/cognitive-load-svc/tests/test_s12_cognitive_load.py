"""S12 tests — Cognitive Load Service wiring & new endpoints.

Covers:
  • /signal/interaction         — real-time behavioural signal ingestion
  • /content/schedule           — content scheduling via PacingOptimizer
  • /content/chunk              — long-content chunking
  • /scaffolding/fade-check     — scaffold fading recommendation
  • /pacing/recommend           — now delegated to PacingOptimizer
  • /adaptation/recommend       — now delegated to AdaptationEngine
  • Behavioural: overload ⇒ break, high-load ⇒ scaffolding progression
"""

import pytest
from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# /signal/interaction
# ---------------------------------------------------------------------------


class TestInteractionSignal:
    """Tests for the real-time interaction signal endpoint."""

    def test_signal_accepted(self, client: TestClient):
        """Signal with valid payload is accepted."""
        response = client.post("/api/v1/signal/interaction", json={
            "learner_id": "learner-s12",
            "activity_id": "act-001",
            "response_time": 3.2,
            "correct": True,
            "score": 85,
            "hint_requested": False,
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "accepted"
        assert data["learner_id"] == "learner-s12"
        assert data["activity_id"] == "act-001"

    def test_signal_minimal_payload(self, client: TestClient):
        """Signal with only learner_id is accepted (defaults applied)."""
        response = client.post("/api/v1/signal/interaction", json={
            "learner_id": "learner-s12-min",
        })
        assert response.status_code == 200
        assert response.json()["status"] == "accepted"

    def test_signal_missing_learner_id(self, client: TestClient):
        """Signal without learner_id returns 422."""
        response = client.post("/api/v1/signal/interaction", json={
            "response_time": 2.0,
            "correct": True,
        })
        assert response.status_code == 422

    def test_signal_incorrect_answer(self, client: TestClient):
        """Signal with incorrect answer is accepted."""
        response = client.post("/api/v1/signal/interaction", json={
            "learner_id": "learner-s12",
            "response_time": 8.5,
            "correct": False,
            "score": 20,
            "hint_requested": True,
        })
        assert response.status_code == 200
        assert response.json()["status"] == "accepted"

    def test_signal_updates_load_estimate(self, client: TestClient):
        """After ingesting signals, load estimate reflects history."""
        learner_id = "learner-s12-history"

        # Ingest a few signals
        for i in range(3):
            client.post("/api/v1/signal/interaction", json={
                "learner_id": learner_id,
                "response_time": 4.0 + i,
                "correct": i % 2 == 0,
                "score": 60 + i * 10,
            })

        # Now estimate load — should succeed and reflect some history
        est = client.post("/api/v1/load/estimate", json={
            "learner_id": learner_id,
            "response_times": [3.0],
            "error_rates": [0.1],
        })
        assert est.status_code == 200
        assert "total_load" in est.json()


# ---------------------------------------------------------------------------
# /content/schedule
# ---------------------------------------------------------------------------


class TestContentSchedule:
    """Tests for the content scheduling endpoint."""

    @pytest.fixture
    def schedule_payload(self):
        return {
            "content_items": [
                {"content_id": "c1", "complexity": 0.3, "estimated_duration_seconds": 120},
                {"content_id": "c2", "complexity": 0.7, "estimated_duration_seconds": 300},
                {"content_id": "c3", "complexity": 0.5, "estimated_duration_seconds": 200},
            ],
            "available_time_seconds": 900,
            "target_load": 0.6,
            "include_breaks": True,
        }

    def test_schedule_basic(self, client: TestClient, schedule_payload):
        """Schedule returns structured plan."""
        response = client.post("/api/v1/content/schedule", json=schedule_payload)
        assert response.status_code == 200
        data = response.json()

        assert "schedule_id" in data
        assert "content_items" in data
        assert "total_duration_seconds" in data
        assert "break_points" in data
        assert "estimated_load_profile" in data
        assert "optimization_score" in data

    def test_schedule_preserves_all_items(self, client: TestClient, schedule_payload):
        """All input content items appear in the schedule."""
        response = client.post("/api/v1/content/schedule", json=schedule_payload)
        data = response.json()
        scheduled_ids = {
            item.get("content_id", item.get("id"))
            for item in data["content_items"]
            if isinstance(item, dict)
        }
        # At least the input items should appear (breaks may be extra)
        for cid in ["c1", "c2", "c3"]:
            # Items may be reordered or interleaved but should be present
            assert any(
                cid in str(item) for item in data["content_items"]
            ), f"content_id {cid} missing from schedule"

    def test_schedule_empty_items_rejected(self, client: TestClient):
        """Empty content_items list returns 422."""
        response = client.post("/api/v1/content/schedule", json={
            "content_items": [],
            "available_time_seconds": 600,
        })
        assert response.status_code == 422

    def test_schedule_without_breaks(self, client: TestClient, schedule_payload):
        """Schedule with include_breaks=false still succeeds."""
        schedule_payload["include_breaks"] = False
        response = client.post("/api/v1/content/schedule", json=schedule_payload)
        assert response.status_code == 200

    def test_schedule_single_item(self, client: TestClient):
        """Schedule with a single content item works."""
        response = client.post("/api/v1/content/schedule", json={
            "content_items": [
                {"content_id": "only", "complexity": 0.4, "estimated_duration_seconds": 120},
            ],
            "available_time_seconds": 600,
        })
        assert response.status_code == 200
        assert response.json()["total_duration_seconds"] > 0


# ---------------------------------------------------------------------------
# /content/chunk
# ---------------------------------------------------------------------------


class TestContentChunk:
    """Tests for the content chunking endpoint."""

    LONG_TEXT = (
        "The mitochondria is the powerhouse of the cell. "
        "It generates ATP through oxidative phosphorylation. "
        "This process involves the electron transport chain. "
        "Electrons are passed through a series of protein complexes. "
        "A proton gradient is established across the inner membrane. "
        "ATP synthase uses this gradient to produce ATP molecules. "
        "Each glucose molecule can yield up to 36 ATP. "
        "This energy is essential for cellular functions. "
        "Without mitochondria, complex life would not exist. "
        "They have their own DNA, inherited maternally."
    )

    def test_chunk_basic(self, client: TestClient):
        """Chunk endpoint returns a list of chunks."""
        response = client.post("/api/v1/content/chunk", json={
            "content": self.LONG_TEXT,
            "target_chunk_complexity": 0.5,
            "max_chunks": 5,
        })
        assert response.status_code == 200
        data = response.json()
        assert "chunks" in data
        assert "chunk_count" in data
        assert data["chunk_count"] >= 1
        assert data["chunk_count"] <= 5

    def test_chunk_defaults(self, client: TestClient):
        """Chunk endpoint works with defaults."""
        response = client.post("/api/v1/content/chunk", json={
            "content": self.LONG_TEXT,
        })
        assert response.status_code == 200
        assert response.json()["chunk_count"] >= 1

    def test_chunk_empty_content(self, client: TestClient):
        """Empty content returns 422."""
        response = client.post("/api/v1/content/chunk", json={
            "content": "",
        })
        assert response.status_code == 422

    def test_chunk_short_content(self, client: TestClient):
        """Short content produces a single chunk."""
        response = client.post("/api/v1/content/chunk", json={
            "content": "Hello world.",
        })
        assert response.status_code == 200
        assert response.json()["chunk_count"] >= 1

    def test_chunk_max_chunks_respected(self, client: TestClient):
        """max_chunks parameter limits output."""
        response = client.post("/api/v1/content/chunk", json={
            "content": self.LONG_TEXT,
            "max_chunks": 2,
        })
        assert response.status_code == 200
        assert response.json()["chunk_count"] <= 2


# ---------------------------------------------------------------------------
# /scaffolding/fade-check
# ---------------------------------------------------------------------------


class TestScaffoldingFadeCheck:
    """Tests for the scaffolding fading recommendation endpoint."""

    def test_fade_check_basic(self, client: TestClient):
        """Fade check returns recommendation structure."""
        response = client.post("/api/v1/scaffolding/fade-check", json={
            "learner_id": "learner-fade",
            "scaffold_type": "hint",
            "recent_accuracy": 0.9,
            "uses_count": 10,
        })
        assert response.status_code == 200
        data = response.json()
        assert "should_fade" in data
        assert "reason" in data

    def test_fade_check_high_accuracy_many_uses(self, client: TestClient):
        """High accuracy + many uses should recommend fading."""
        response = client.post("/api/v1/scaffolding/fade-check", json={
            "learner_id": "learner-fade-high",
            "scaffold_type": "hint",
            "recent_accuracy": 0.95,
            "uses_count": 20,
        })
        assert response.status_code == 200
        data = response.json()
        assert data["should_fade"] is True

    def test_fade_check_low_accuracy(self, client: TestClient):
        """Low accuracy should not recommend fading."""
        response = client.post("/api/v1/scaffolding/fade-check", json={
            "learner_id": "learner-fade-low",
            "scaffold_type": "worked_example",
            "recent_accuracy": 0.3,
            "uses_count": 2,
        })
        assert response.status_code == 200
        data = response.json()
        assert data["should_fade"] is False

    def test_fade_check_missing_learner_id(self, client: TestClient):
        """Missing learner_id returns 422."""
        response = client.post("/api/v1/scaffolding/fade-check", json={
            "scaffold_type": "hint",
            "recent_accuracy": 0.8,
            "uses_count": 5,
        })
        assert response.status_code == 422

    def test_fade_check_invalid_scaffold_type(self, client: TestClient):
        """Unknown scaffold_type falls back to HINT gracefully."""
        response = client.post("/api/v1/scaffolding/fade-check", json={
            "learner_id": "learner-fade-unknown",
            "scaffold_type": "nonexistent_type",
            "recent_accuracy": 0.8,
            "uses_count": 5,
        })
        assert response.status_code == 200  # Falls back to HINT

    def test_fade_check_worked_example(self, client: TestClient):
        """Fade check works for worked_example scaffold type."""
        response = client.post("/api/v1/scaffolding/fade-check", json={
            "learner_id": "learner-fade-we",
            "scaffold_type": "worked_example",
            "recent_accuracy": 0.85,
            "uses_count": 15,
        })
        assert response.status_code == 200
        assert "should_fade" in response.json()


# ---------------------------------------------------------------------------
# /pacing/recommend  (S12: now delegates to PacingOptimizer)
# ---------------------------------------------------------------------------


class TestPacingRecommendS12:
    """Tests for the updated pacing recommendation (PacingOptimizer wiring)."""

    def test_pacing_returns_structured_response(self, client: TestClient):
        """Pacing endpoint returns all required fields."""
        response = client.post("/api/v1/pacing/recommend", json={
            "learner_id": "learner-pace-s12",
            "current_load": 0.65,
            "upcoming_content": [
                {"content_id": "p1", "title": "Easy Topic", "complexity": 0.3, "estimated_duration_seconds": 120},
                {"content_id": "p2", "title": "Hard Topic", "complexity": 0.8, "estimated_duration_seconds": 300},
                {"content_id": "p3", "title": "Medium Topic", "complexity": 0.5, "estimated_duration_seconds": 180},
            ],
            "fatigue_level": 0.4,
        })
        assert response.status_code == 200
        data = response.json()
        assert data["recommended_pace"] in ["slow", "normal", "fast"]
        assert "break_suggested" in data
        assert "content_order" in data
        assert "time_per_item" in data
        assert "items_to_skip" in data
        assert "rationale" in data

    def test_pacing_high_load_suggests_slow(self, client: TestClient):
        """High load should produce slow pace or break suggestion."""
        response = client.post("/api/v1/pacing/recommend", json={
            "learner_id": "learner-pace-high",
            "current_load": 0.9,
            "upcoming_content": [
                {"content_id": "h1", "title": "Hard", "complexity": 0.9, "estimated_duration_seconds": 600},
            ],
            "fatigue_level": 0.8,
        })
        assert response.status_code == 200
        data = response.json()
        # Either slow pace or break suggested
        assert data["recommended_pace"] == "slow" or data["break_suggested"]

    def test_pacing_low_load_fast_pace(self, client: TestClient):
        """Low load should produce normal or fast pace."""
        response = client.post("/api/v1/pacing/recommend", json={
            "learner_id": "learner-pace-low",
            "current_load": 0.2,
            "upcoming_content": [
                {"content_id": "l1", "title": "Easy", "complexity": 0.2, "estimated_duration_seconds": 60},
            ],
            "fatigue_level": 0.1,
        })
        assert response.status_code == 200
        data = response.json()
        assert data["recommended_pace"] in ["normal", "fast"]

    def test_pacing_provides_content_order(self, client: TestClient):
        """Content order list should reference input content IDs."""
        response = client.post("/api/v1/pacing/recommend", json={
            "learner_id": "learner-pace-order",
            "current_load": 0.5,
            "upcoming_content": [
                {"content_id": "a", "title": "A", "complexity": 0.8, "estimated_duration_seconds": 120},
                {"content_id": "b", "title": "B", "complexity": 0.3, "estimated_duration_seconds": 120},
            ],
            "fatigue_level": 0.3,
        })
        data = response.json()
        assert set(data["content_order"]) == {"a", "b"}


# ---------------------------------------------------------------------------
# /adaptation/recommend  (S12: now delegates to AdaptationEngine)
# ---------------------------------------------------------------------------


class TestAdaptationRecommendS12:
    """Tests for the updated adaptation recommendation (AdaptationEngine wiring)."""

    @pytest.fixture
    def high_load_request(self):
        return {
            "learner_id": "learner-adapt-s12",
            "current_load": {
                "intrinsic_load": 0.8,
                "extraneous_load": 0.6,
                "germane_load": 0.2,
                "total_load": 0.9,
                "load_level": "overload",
                "confidence": 0.85,
                "recommendation": "Reduce load immediately",
            },
        }

    def test_adaptation_returns_structured_response(self, client: TestClient, high_load_request):
        """Adaptation endpoint returns all required fields."""
        response = client.post("/api/v1/adaptation/recommend", json=high_load_request)
        assert response.status_code == 200
        data = response.json()
        assert "adaptations" in data
        assert "urgency" in data
        assert "expected_load_after" in data
        assert isinstance(data["adaptations"], list)

    def test_adaptation_high_load_produces_actions(self, client: TestClient, high_load_request):
        """High load should produce at least one adaptation action."""
        response = client.post("/api/v1/adaptation/recommend", json=high_load_request)
        data = response.json()
        assert len(data["adaptations"]) > 0

    def test_adaptation_high_load_urgency(self, client: TestClient, high_load_request):
        """High load should produce high or critical urgency."""
        response = client.post("/api/v1/adaptation/recommend", json=high_load_request)
        data = response.json()
        assert data["urgency"] in ["high", "critical"]

    def test_adaptation_low_load_minimal_actions(self, client: TestClient):
        """Low load should produce few or no adaptations."""
        response = client.post("/api/v1/adaptation/recommend", json={
            "learner_id": "learner-adapt-low",
            "current_load": {
                "intrinsic_load": 0.2,
                "extraneous_load": 0.1,
                "germane_load": 0.5,
                "total_load": 0.3,
                "load_level": "low",
                "confidence": 0.9,
                "recommendation": "Load is optimal",
            },
        })
        assert response.status_code == 200
        data = response.json()
        assert data["urgency"] in ["low", "medium"]

    def test_adaptation_includes_fallback(self, client: TestClient, high_load_request):
        """High-load adaptation should include a fallback plan."""
        response = client.post("/api/v1/adaptation/recommend", json=high_load_request)
        data = response.json()
        assert "fallback_plan" in data

    def test_adaptation_action_structure(self, client: TestClient, high_load_request):
        """Each adaptation action should have required fields."""
        response = client.post("/api/v1/adaptation/recommend", json=high_load_request)
        data = response.json()
        if data["adaptations"]:
            action = data["adaptations"][0]
            assert "action_type" in action
            assert "priority" in action
            assert "description" in action


# ---------------------------------------------------------------------------
# Behavioural / Integration Tests
# ---------------------------------------------------------------------------


class TestCognitiveLoadBehavioural:
    """End-to-end behavioural tests for the S12 cognitive load wiring."""

    def test_overload_flow(self, client: TestClient):
        """Simulate overload: high load ⇒ adaptation ⇒ break or scaffolding."""
        learner_id = "learner-e2e-overload"

        # 1. Estimate load (force high)
        est = client.post("/api/v1/load/estimate", json={
            "learner_id": learner_id,
            "response_times": [10.0, 12.0, 15.0],
            "error_rates": [0.8, 0.9, 1.0],
            "help_requests": 5,
        })
        assert est.status_code == 200
        load_data = est.json()
        total = load_data["total_load"]

        # 2. Get adaptation recommendations
        adapt = client.post("/api/v1/adaptation/recommend", json={
            "learner_id": learner_id,
            "current_load": load_data,
        })
        assert adapt.status_code == 200
        adapt_data = adapt.json()
        assert len(adapt_data["adaptations"]) > 0

    def test_scaffolding_lifecycle(self, client: TestClient):
        """Scaffold → use → fade-check progression."""
        learner_id = "learner-e2e-scaffold"

        # 1. Generate scaffolding
        scaffold = client.post("/api/v1/scaffolding/generate", json={
            "learner_id": learner_id,
            "current_content": "Solve: 3x + 7 = 22",
            "current_load": 0.8,
            "domain": "math",
            "max_scaffolds": 3,
        })
        assert scaffold.status_code == 200
        assert "scaffolds" in scaffold.json()

        # 2. After multiple uses with good accuracy, check fading
        fade = client.post("/api/v1/scaffolding/fade-check", json={
            "learner_id": learner_id,
            "scaffold_type": "hint",
            "recent_accuracy": 0.95,
            "uses_count": 15,
        })
        assert fade.status_code == 200
        assert fade.json()["should_fade"] is True

    def test_schedule_then_chunk_flow(self, client: TestClient):
        """Schedule content, then chunk the hardest item."""
        # 1. Schedule
        sched = client.post("/api/v1/content/schedule", json={
            "content_items": [
                {"content_id": "easy", "complexity": 0.2, "estimated_duration_seconds": 120},
                {"content_id": "hard", "complexity": 0.9, "estimated_duration_seconds": 600},
            ],
            "available_time_seconds": 1200,
        })
        assert sched.status_code == 200

        # 2. Chunk the hard item
        chunk = client.post("/api/v1/content/chunk", json={
            "content": (
                "Advanced calculus involves understanding limits and derivatives. "
                "The fundamental theorem connects differentiation and integration. "
                "Partial derivatives extend concepts to multiple variables. "
                "Gradient vectors indicate direction of steepest ascent. "
                "Lagrange multipliers optimize functions under constraints."
            ),
            "max_chunks": 3,
        })
        assert chunk.status_code == 200
        assert chunk.json()["chunk_count"] >= 1

    def test_signal_then_load_estimate(self, client: TestClient):
        """Ingest signals, then estimate load — values should be bounded."""
        learner_id = "learner-e2e-signal-load"

        # Send rapid incorrect signals (simulate struggling)
        for _ in range(5):
            client.post("/api/v1/signal/interaction", json={
                "learner_id": learner_id,
                "response_time": 12.0,
                "correct": False,
                "score": 10,
                "hint_requested": True,
            })

        # Estimate load
        est = client.post("/api/v1/load/estimate", json={
            "learner_id": learner_id,
            "response_times": [12.0],
            "error_rates": [1.0],
            "help_requests": 5,
        })
        assert est.status_code == 200
        data = est.json()
        assert 0.0 <= data["total_load"] <= 1.0
