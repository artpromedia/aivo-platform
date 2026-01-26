"""
Tests for Message Handlers.
"""

import pytest

from app.handlers import MessageHandler, SimpleCognitiveDetector, SimpleInterventionEngine
from app.models import (
    ActionType,
    CognitiveState,
    CognitiveStateLevel,
    MessageType,
    WebSocketMessage,
)


class TestSimpleCognitiveDetector:
    """Tests for SimpleCognitiveDetector."""

    @pytest.mark.asyncio
    async def test_process_action_creates_state(self):
        """Test that processing an action creates cognitive state."""
        detector = SimpleCognitiveDetector()

        state = await detector.process_action(
            learner_id="learner_123",
            action_type="answer_submitted",
            action_data={"correct": True},
        )

        assert state.learner_id == "learner_123"
        assert isinstance(state, CognitiveState)

    @pytest.mark.asyncio
    async def test_frustration_increases_with_wrong_answers(self):
        """Test that frustration increases with consecutive wrong answers."""
        detector = SimpleCognitiveDetector()

        # Submit several wrong answers
        for _ in range(5):
            state = await detector.process_action(
                learner_id="learner_123",
                action_type="answer_submitted",
                action_data={"correct": False},
            )

        assert state.frustration_index > 0.5
        assert state.needs_intervention is True
        assert "high_frustration" in state.intervention_triggers

    @pytest.mark.asyncio
    async def test_accuracy_improves_with_correct_answers(self):
        """Test that accuracy improves with correct answers."""
        detector = SimpleCognitiveDetector()

        # Submit correct answers
        for _ in range(5):
            state = await detector.process_action(
                learner_id="learner_123",
                action_type="answer_submitted",
                action_data={"correct": True},
            )

        assert state.recent_accuracy > 0.8
        assert state.cognitive_load == CognitiveStateLevel.LOW

    @pytest.mark.asyncio
    async def test_hint_dependency_tracked(self):
        """Test that hint dependency is tracked."""
        detector = SimpleCognitiveDetector()

        # Request several hints
        for _ in range(5):
            state = await detector.process_action(
                learner_id="learner_123",
                action_type="hint_requested",
                action_data={},
            )

        assert state.hint_dependency > 0


class TestSimpleInterventionEngine:
    """Tests for SimpleInterventionEngine."""

    @pytest.mark.asyncio
    async def test_no_intervention_when_not_needed(self, test_settings):
        """Test that no intervention is triggered when not needed."""
        engine = SimpleInterventionEngine(test_settings)

        state = CognitiveState(
            learner_id="learner_123",
            needs_intervention=False,
        )

        intervention = await engine.check_triggers("learner_123", state)

        assert intervention is None

    @pytest.mark.asyncio
    async def test_intervention_for_cognitive_overload(self, test_settings):
        """Test intervention for cognitive overload."""
        engine = SimpleInterventionEngine(test_settings)

        state = CognitiveState(
            learner_id="learner_123",
            cognitive_load=CognitiveStateLevel.OVERLOAD,
            needs_intervention=True,
            intervention_triggers=["cognitive_overload"],
        )

        intervention = await engine.check_triggers("learner_123", state)

        assert intervention is not None
        assert "break" in intervention.title.lower()

    @pytest.mark.asyncio
    async def test_intervention_for_frustration(self, test_settings):
        """Test intervention for high frustration."""
        engine = SimpleInterventionEngine(test_settings)

        state = CognitiveState(
            learner_id="learner_123",
            frustration_index=0.8,
            needs_intervention=True,
            intervention_triggers=["high_frustration"],
        )

        intervention = await engine.check_triggers("learner_123", state)

        assert intervention is not None
        assert intervention.trigger_reason == "high_frustration"

    @pytest.mark.asyncio
    async def test_intervention_rate_limiting(self, test_settings):
        """Test that interventions are rate limited."""
        test_settings.min_intervention_interval = 1000  # 1000 seconds
        engine = SimpleInterventionEngine(test_settings)

        state = CognitiveState(
            learner_id="learner_123",
            needs_intervention=True,
            intervention_triggers=["high_frustration"],
        )

        # First intervention should succeed
        intervention1 = await engine.check_triggers("learner_123", state)
        assert intervention1 is not None

        # Second immediate intervention should be rate limited
        intervention2 = await engine.check_triggers("learner_123", state)
        assert intervention2 is None


class TestMessageHandler:
    """Tests for MessageHandler."""

    @pytest.mark.asyncio
    async def test_handle_heartbeat(self, message_handler, connection_manager, mock_websocket):
        """Test handling heartbeat message."""
        info = await connection_manager.connect(
            websocket=mock_websocket,
            learner_id="learner_123",
        )

        message = WebSocketMessage(
            type=MessageType.HEARTBEAT,
            payload={"sequence": 1},
        )

        await message_handler.handle(info.connection_id, message)

        # Should have sent a pong response
        mock_websocket.send_json.assert_called()
        call_args = mock_websocket.send_json.call_args[0][0]
        assert call_args["type"] == "pong"

    @pytest.mark.asyncio
    async def test_handle_join_session(self, message_handler, connection_manager, mock_websocket):
        """Test handling join session message."""
        info = await connection_manager.connect(
            websocket=mock_websocket,
            learner_id="learner_123",
        )

        message = WebSocketMessage(
            type=MessageType.JOIN_SESSION,
            payload={"session_id": "session_456"},
        )

        await message_handler.handle(info.connection_id, message)

        # Connection should have session ID
        updated_info = connection_manager.get_connection(info.connection_id)
        assert updated_info.session_id == "session_456"

        # Should be in session room
        assert "session:session_456" in updated_info.rooms

    @pytest.mark.asyncio
    async def test_handle_learner_action(self, message_handler, connection_manager, mock_websocket):
        """Test handling learner action message."""
        info = await connection_manager.connect(
            websocket=mock_websocket,
            learner_id="learner_123",
        )

        message = WebSocketMessage(
            type=MessageType.LEARNER_ACTION,
            payload={
                "type": "answer_submitted",
                "data": {"question_id": "q1", "correct": True},
            },
        )

        await message_handler.handle(info.connection_id, message)

        # Should have sent cognitive update
        mock_websocket.send_json.assert_called()

    @pytest.mark.asyncio
    async def test_handle_unknown_message_type(
        self, message_handler, connection_manager, mock_websocket
    ):
        """Test handling unknown message type."""
        info = await connection_manager.connect(
            websocket=mock_websocket,
            learner_id="learner_123",
        )

        # Create message with invalid type (would need to bypass pydantic validation)
        # For now, test that error handler works
        message = WebSocketMessage(
            type=MessageType.ERROR,  # Error type won't have a handler
            payload={},
        )

        # This should not raise an exception
        await message_handler.handle(info.connection_id, message)

    @pytest.mark.asyncio
    async def test_handle_leave_session(self, message_handler, connection_manager, mock_websocket):
        """Test handling leave session message."""
        info = await connection_manager.connect(
            websocket=mock_websocket,
            learner_id="learner_123",
        )

        # First join a session
        join_message = WebSocketMessage(
            type=MessageType.JOIN_SESSION,
            payload={"session_id": "session_456"},
        )
        await message_handler.handle(info.connection_id, join_message)

        # Then leave it
        leave_message = WebSocketMessage(
            type=MessageType.LEAVE_SESSION,
            payload={"session_id": "session_456"},
        )
        await message_handler.handle(info.connection_id, leave_message)

        # Should no longer be in session room
        updated_info = connection_manager.get_connection(info.connection_id)
        assert "session:session_456" not in updated_info.rooms
