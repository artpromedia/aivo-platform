"""
Message Handlers

Handles incoming WebSocket messages and routes them to appropriate processing logic.
Integrates with cognitive state detection and intervention engine.
"""

import asyncio
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional, Protocol

import structlog

from app.config import Settings, get_settings
from app.manager import ConnectionManager
from app.models import (
    ActionType,
    CognitiveState,
    CognitiveStateLevel,
    EngagementLevel,
    Intervention,
    InterventionType,
    LearnerAction,
    MessageType,
    SessionState,
    WebSocketMessage,
)
from app.rooms import RoomManager

logger = structlog.get_logger()


class CognitiveStateDetector(Protocol):
    """Protocol for cognitive state detection service."""

    async def process_action(
        self,
        learner_id: str,
        action_type: str,
        action_data: Dict[str, Any],
    ) -> CognitiveState:
        """Process a learner action and return updated cognitive state."""
        ...


class InterventionEngine(Protocol):
    """Protocol for intervention engine service."""

    async def check_triggers(
        self,
        learner_id: str,
        cognitive_state: CognitiveState,
    ) -> Optional[Intervention]:
        """Check if an intervention should be triggered."""
        ...


class SimpleCognitiveDetector:
    """
    Simple cognitive state detector for standalone operation.

    In production, this would be replaced with calls to the cognitive-svc.
    """

    def __init__(self):
        self._learner_states: Dict[str, CognitiveState] = {}
        self._action_history: Dict[str, List[LearnerAction]] = {}

    async def process_action(
        self,
        learner_id: str,
        action_type: str,
        action_data: Dict[str, Any],
    ) -> CognitiveState:
        """Process a learner action and return updated cognitive state."""
        # Get or create learner state
        state = self._learner_states.get(
            learner_id,
            CognitiveState(learner_id=learner_id),
        )

        # Track action
        action = LearnerAction(
            action_type=ActionType(action_type) if action_type in ActionType.__members__.values() else ActionType.INTERACTION,
            learner_id=learner_id,
            data=action_data,
        )

        if learner_id not in self._action_history:
            self._action_history[learner_id] = []
        self._action_history[learner_id].append(action)

        # Keep only recent actions (last 50)
        self._action_history[learner_id] = self._action_history[learner_id][-50:]

        # Update cognitive state based on action
        state = await self._update_state(learner_id, action, state)

        # Store updated state
        self._learner_states[learner_id] = state

        return state

    async def _update_state(
        self,
        learner_id: str,
        action: LearnerAction,
        current_state: CognitiveState,
    ) -> CognitiveState:
        """Update cognitive state based on action."""
        recent_actions = self._action_history.get(learner_id, [])[-10:]

        # Calculate metrics from recent actions
        correct_count = sum(
            1 for a in recent_actions
            if a.data.get("correct", False)
        )
        total_answers = sum(
            1 for a in recent_actions
            if a.action_type == ActionType.ANSWER_SUBMITTED
        )
        hint_count = sum(
            1 for a in recent_actions
            if a.action_type == ActionType.HINT_REQUESTED
        )

        # Calculate accuracy
        accuracy = correct_count / max(total_answers, 1)

        # Calculate frustration based on consecutive wrong answers
        consecutive_wrong = 0
        for a in reversed(recent_actions):
            if a.action_type == ActionType.ANSWER_SUBMITTED:
                if a.data.get("correct", False):
                    break
                consecutive_wrong += 1

        frustration = min(consecutive_wrong * 0.2, 1.0)

        # Calculate hint dependency
        hint_dependency = hint_count / max(len(recent_actions), 1)

        # Determine cognitive load level
        if frustration > 0.7 or (accuracy < 0.3 and total_answers >= 3):
            cognitive_load = CognitiveStateLevel.OVERLOAD
            cognitive_load_score = 0.9
        elif frustration > 0.4 or accuracy < 0.5:
            cognitive_load = CognitiveStateLevel.HIGH
            cognitive_load_score = 0.7
        elif accuracy > 0.8:
            cognitive_load = CognitiveStateLevel.LOW
            cognitive_load_score = 0.3
        else:
            cognitive_load = CognitiveStateLevel.OPTIMAL
            cognitive_load_score = 0.5

        # Determine engagement level
        time_between_actions = self._calculate_avg_time_between_actions(recent_actions)
        if time_between_actions > 120:  # More than 2 minutes between actions
            engagement_level = EngagementLevel.DISENGAGED
            engagement_score = 0.1
        elif time_between_actions > 60:
            engagement_level = EngagementLevel.LOW
            engagement_score = 0.3
        elif total_answers > 0 and accuracy > 0.7:
            engagement_level = EngagementLevel.FLOW
            engagement_score = 0.95
        else:
            engagement_level = EngagementLevel.MODERATE
            engagement_score = 0.6

        # Determine if intervention is needed
        needs_intervention = (
            cognitive_load in [CognitiveStateLevel.OVERLOAD, CognitiveStateLevel.HIGH]
            or engagement_level in [EngagementLevel.DISENGAGED, EngagementLevel.LOW]
            or frustration > 0.6
        )

        # Build intervention triggers
        triggers = []
        if cognitive_load == CognitiveStateLevel.OVERLOAD:
            triggers.append("cognitive_overload")
        if frustration > 0.6:
            triggers.append("high_frustration")
        if engagement_level == EngagementLevel.DISENGAGED:
            triggers.append("disengagement")
        if hint_dependency > 0.5:
            triggers.append("hint_dependency")

        # Suggested actions
        suggestions = []
        if cognitive_load == CognitiveStateLevel.OVERLOAD:
            suggestions.append("simplify_content")
            suggestions.append("suggest_break")
        if frustration > 0.6:
            suggestions.append("provide_encouragement")
            suggestions.append("offer_hint")
        if engagement_level == EngagementLevel.DISENGAGED:
            suggestions.append("re_engage")

        return CognitiveState(
            learner_id=learner_id,
            session_id=action.session_id,
            timestamp=datetime.utcnow(),
            cognitive_load=cognitive_load,
            cognitive_load_score=cognitive_load_score,
            engagement_level=engagement_level,
            engagement_score=engagement_score,
            frustration_index=frustration,
            confidence_score=accuracy,
            recent_accuracy=accuracy,
            hint_dependency=hint_dependency,
            needs_intervention=needs_intervention,
            intervention_triggers=triggers,
            suggested_actions=suggestions,
        )

    def _calculate_avg_time_between_actions(
        self,
        actions: List[LearnerAction],
    ) -> float:
        """Calculate average time between actions in seconds."""
        if len(actions) < 2:
            return 0.0

        total_time = 0.0
        for i in range(1, len(actions)):
            diff = (actions[i].timestamp - actions[i - 1].timestamp).total_seconds()
            total_time += diff

        return total_time / (len(actions) - 1)


class SimpleInterventionEngine:
    """
    Simple intervention engine for standalone operation.

    In production, this would be replaced with calls to the intervention-svc.
    """

    def __init__(self, settings: Optional[Settings] = None):
        self.settings = settings or get_settings()
        self._last_intervention: Dict[str, datetime] = {}
        self._intervention_count: Dict[str, int] = {}

    async def check_triggers(
        self,
        learner_id: str,
        cognitive_state: CognitiveState,
    ) -> Optional[Intervention]:
        """Check if an intervention should be triggered."""
        if not cognitive_state.needs_intervention:
            return None

        # Check rate limiting
        now = datetime.utcnow()
        last = self._last_intervention.get(learner_id)
        if last:
            elapsed = (now - last).total_seconds()
            if elapsed < self.settings.min_intervention_interval:
                return None

        # Check max interventions per session
        session_key = f"{learner_id}:{cognitive_state.session_id or 'default'}"
        count = self._intervention_count.get(session_key, 0)
        if count >= self.settings.max_interventions_per_session:
            return None

        # Select intervention type based on triggers
        intervention = await self._select_intervention(learner_id, cognitive_state)

        if intervention:
            # Update tracking
            self._last_intervention[learner_id] = now
            self._intervention_count[session_key] = count + 1

        return intervention

    async def _select_intervention(
        self,
        learner_id: str,
        state: CognitiveState,
    ) -> Optional[Intervention]:
        """Select the most appropriate intervention."""
        triggers = state.intervention_triggers

        if "cognitive_overload" in triggers:
            return Intervention(
                learner_id=learner_id,
                session_id=state.session_id,
                intervention_type=InterventionType.BREAK_SUGGESTION,
                title="Take a Quick Break",
                message="You've been working hard! Taking a short break can help you learn better. How about a 2-minute stretch?",
                action_button_text="Start Break Timer",
                trigger_reason="cognitive_overload",
                cognitive_state_snapshot=state,
                priority=8,
                auto_dismiss_seconds=30,
            )

        if "high_frustration" in triggers:
            return Intervention(
                learner_id=learner_id,
                session_id=state.session_id,
                intervention_type=InterventionType.ENCOURAGEMENT,
                title="Keep Going!",
                message="Learning new things can be challenging. Remember, mistakes help us learn. Would you like a hint?",
                action_button_text="Show Hint",
                trigger_reason="high_frustration",
                cognitive_state_snapshot=state,
                priority=7,
            )

        if "disengagement" in triggers:
            return Intervention(
                learner_id=learner_id,
                session_id=state.session_id,
                intervention_type=InterventionType.SCAFFOLDING,
                title="Need Some Help?",
                message="It looks like you might be stuck. Would you like me to break this down into smaller steps?",
                action_button_text="Yes, Help Me",
                trigger_reason="disengagement",
                cognitive_state_snapshot=state,
                priority=6,
            )

        if "hint_dependency" in triggers:
            return Intervention(
                learner_id=learner_id,
                session_id=state.session_id,
                intervention_type=InterventionType.SCAFFOLDING,
                title="Try It Yourself!",
                message="You're doing great! Try solving the next one without a hint. I believe in you!",
                trigger_reason="hint_dependency",
                cognitive_state_snapshot=state,
                priority=5,
            )

        return None


class MessageHandler:
    """
    Handles incoming WebSocket messages and routes them to appropriate handlers.

    Integrates with:
    - ConnectionManager for sending responses
    - RoomManager for room operations
    - CognitiveStateDetector for learning state tracking
    - InterventionEngine for adaptive interventions
    """

    def __init__(
        self,
        manager: ConnectionManager,
        room_manager: RoomManager,
        cognitive_detector: Optional[CognitiveStateDetector] = None,
        intervention_engine: Optional[InterventionEngine] = None,
        settings: Optional[Settings] = None,
    ):
        """
        Initialize the message handler.

        Args:
            manager: Connection manager for sending messages
            room_manager: Room manager for room operations
            cognitive_detector: Optional cognitive state detector
            intervention_engine: Optional intervention engine
            settings: Application settings
        """
        self.manager = manager
        self.room_manager = room_manager
        self.cognitive = cognitive_detector or SimpleCognitiveDetector()
        self.intervention = intervention_engine or SimpleInterventionEngine()
        self.settings = settings or get_settings()

        # Session state tracking
        self._session_states: Dict[str, SessionState] = {}

        # Message handlers mapping
        self._handlers: Dict[MessageType, Callable] = {
            MessageType.JOIN_SESSION: self._handle_join_session,
            MessageType.LEAVE_SESSION: self._handle_leave_session,
            MessageType.LEARNER_ACTION: self._handle_learner_action,
            MessageType.HEARTBEAT: self._handle_heartbeat,
            MessageType.SUBSCRIBE_ROOM: self._handle_subscribe_room,
            MessageType.UNSUBSCRIBE_ROOM: self._handle_unsubscribe_room,
            MessageType.CHAT: self._handle_chat,
            MessageType.PRESENCE_UPDATE: self._handle_presence_update,
        }

        logger.info("MessageHandler initialized")

    async def handle(
        self,
        connection_id: str,
        message: WebSocketMessage,
    ) -> None:
        """
        Route a message to the appropriate handler.

        Args:
            connection_id: ID of the sending connection
            message: The received message
        """
        handler = self._handlers.get(message.type)

        if handler:
            try:
                await handler(connection_id, message)
            except Exception as e:
                logger.error(
                    "Handler error",
                    connection_id=connection_id,
                    message_type=message.type.value,
                    error=str(e),
                )
                await self._send_error(
                    connection_id,
                    "HANDLER_ERROR",
                    f"Error processing {message.type.value}",
                )
        else:
            logger.warning(
                "Unknown message type",
                connection_id=connection_id,
                message_type=message.type.value,
            )
            await self._send_error(
                connection_id,
                "UNKNOWN_MESSAGE_TYPE",
                f"Unknown message type: {message.type.value}",
            )

    async def _handle_join_session(
        self,
        connection_id: str,
        message: WebSocketMessage,
    ) -> None:
        """Handle session join request."""
        session_id = message.payload.get("session_id")
        if not session_id:
            await self._send_error(connection_id, "MISSING_SESSION_ID", "session_id is required")
            return

        info = self.manager.get_connection(connection_id)
        if not info:
            return

        # Update connection with session ID
        info.session_id = session_id

        # Join session room
        room_id = f"session:{session_id}"
        await self.manager.join_room(connection_id, room_id)
        await self.room_manager.add_member(
            room_id,
            connection_id,
            info.learner_id,
        )

        # Get or create session state
        if session_id not in self._session_states:
            self._session_states[session_id] = SessionState(
                session_id=session_id,
                learner_id=info.learner_id,
                started_at=datetime.utcnow(),
            )

        state = self._session_states[session_id]

        # Send session state to client
        await self.manager.send_personal(
            connection_id,
            WebSocketMessage(
                type=MessageType.SESSION_STATE,
                payload=state.model_dump(mode="json"),
            ),
        )

        logger.info(
            "Learner joined session",
            connection_id=connection_id,
            learner_id=info.learner_id,
            session_id=session_id,
        )

    async def _handle_leave_session(
        self,
        connection_id: str,
        message: WebSocketMessage,
    ) -> None:
        """Handle session leave request."""
        session_id = message.payload.get("session_id")
        if not session_id:
            return

        info = self.manager.get_connection(connection_id)
        if not info:
            return

        # Leave session room
        room_id = f"session:{session_id}"
        await self.manager.leave_room(connection_id, room_id)
        await self.room_manager.remove_member(room_id, connection_id)

        # Clear session from connection
        if info.session_id == session_id:
            info.session_id = None

        logger.info(
            "Learner left session",
            connection_id=connection_id,
            learner_id=info.learner_id,
            session_id=session_id,
        )

    async def _handle_learner_action(
        self,
        connection_id: str,
        message: WebSocketMessage,
    ) -> None:
        """
        Handle learner action and potentially trigger intervention.

        Actions: answer_submitted, hint_requested, content_viewed, etc.
        """
        info = self.manager.get_connection(connection_id)
        if not info:
            return

        action_type = message.payload.get("type", "interaction")
        action_data = message.payload.get("data", {})

        # Process action through cognitive detector
        cognitive_state = await self.cognitive.process_action(
            learner_id=info.learner_id,
            action_type=action_type,
            action_data=action_data,
        )

        # Send cognitive state update to client
        await self.manager.send_personal(
            connection_id,
            WebSocketMessage(
                type=MessageType.COGNITIVE_UPDATE,
                payload=cognitive_state.model_dump(mode="json"),
            ),
        )

        # Update session state if in a session
        if info.session_id and info.session_id in self._session_states:
            state = self._session_states[info.session_id]
            state.last_activity = datetime.utcnow()
            state.cognitive_state = cognitive_state

            if action_type == "answer_submitted":
                state.questions_answered += 1
                if action_data.get("correct", False):
                    state.questions_correct += 1

            if action_type == "hint_requested":
                state.hints_used += 1

        # Check for intervention triggers
        intervention = await self.intervention.check_triggers(
            learner_id=info.learner_id,
            cognitive_state=cognitive_state,
        )

        if intervention:
            intervention.delivered_at = datetime.utcnow()
            await self.manager.send_personal(
                connection_id,
                WebSocketMessage(
                    type=MessageType.INTERVENTION,
                    payload=intervention.model_dump(mode="json"),
                ),
            )

            logger.info(
                "Intervention delivered",
                connection_id=connection_id,
                learner_id=info.learner_id,
                intervention_type=intervention.intervention_type.value,
                trigger=intervention.trigger_reason,
            )

    async def _handle_heartbeat(
        self,
        connection_id: str,
        message: WebSocketMessage,
    ) -> None:
        """Handle heartbeat message."""
        self.manager.update_heartbeat(connection_id)

        # Send pong response
        await self.manager.send_personal(
            connection_id,
            WebSocketMessage(
                type=MessageType.PONG,
                payload={
                    "server_time": datetime.utcnow().isoformat(),
                    "client_sequence": message.payload.get("sequence"),
                },
            ),
        )

    async def _handle_subscribe_room(
        self,
        connection_id: str,
        message: WebSocketMessage,
    ) -> None:
        """Handle room subscription request."""
        room_id = message.payload.get("room_id")
        if not room_id:
            await self._send_error(connection_id, "MISSING_ROOM_ID", "room_id is required")
            return

        info = self.manager.get_connection(connection_id)
        if not info:
            return

        await self.manager.join_room(connection_id, room_id)
        await self.room_manager.add_member(room_id, connection_id, info.learner_id)

        # Send room state
        room_info = await self.room_manager.get_room_info(room_id)
        if room_info:
            await self.manager.send_personal(
                connection_id,
                WebSocketMessage(
                    type=MessageType.ROOM_MESSAGE,
                    payload={
                        "action": "subscribed",
                        "room_id": room_id,
                        "room_info": room_info.model_dump(mode="json"),
                    },
                ),
            )

    async def _handle_unsubscribe_room(
        self,
        connection_id: str,
        message: WebSocketMessage,
    ) -> None:
        """Handle room unsubscription request."""
        room_id = message.payload.get("room_id")
        if not room_id:
            return

        await self.manager.leave_room(connection_id, room_id)
        await self.room_manager.remove_member(room_id, connection_id)

    async def _handle_chat(
        self,
        connection_id: str,
        message: WebSocketMessage,
    ) -> None:
        """Handle chat message."""
        room_id = message.payload.get("room_id")
        content = message.payload.get("content")

        if not room_id or not content:
            await self._send_error(connection_id, "INVALID_CHAT", "room_id and content required")
            return

        info = self.manager.get_connection(connection_id)
        if not info:
            return

        # Broadcast to room
        await self.manager.broadcast_to_room(
            room_id,
            WebSocketMessage(
                type=MessageType.CHAT,
                payload={
                    "room_id": room_id,
                    "sender_id": info.learner_id,
                    "content": content,
                    "timestamp": datetime.utcnow().isoformat(),
                },
            ),
        )

    async def _handle_presence_update(
        self,
        connection_id: str,
        message: WebSocketMessage,
    ) -> None:
        """Handle presence update."""
        info = self.manager.get_connection(connection_id)
        if not info:
            return

        status = message.payload.get("status")
        if status:
            from app.models import UserStatus
            try:
                info.status = UserStatus(status)
            except ValueError:
                pass

        # Broadcast presence to all rooms the user is in
        for room_id in info.rooms:
            await self.manager.broadcast_to_room(
                room_id,
                WebSocketMessage(
                    type=MessageType.PRESENCE_UPDATE,
                    payload={
                        "learner_id": info.learner_id,
                        "status": info.status.value,
                        "room_id": room_id,
                    },
                ),
                exclude=[connection_id],
            )

    async def _send_error(
        self,
        connection_id: str,
        code: str,
        message: str,
    ) -> None:
        """Send an error message to a connection."""
        await self.manager.send_personal(
            connection_id,
            WebSocketMessage(
                type=MessageType.ERROR,
                payload={
                    "code": code,
                    "message": message,
                },
            ),
        )
