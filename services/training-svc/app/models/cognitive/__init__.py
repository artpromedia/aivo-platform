"""
Cognitive State Model for Real-time Learner Monitoring.

This module provides cognitive state tracking that monitors learner mental
state in real-time, enabling the AI to detect frustration, fatigue,
disengagement, and other states that affect learning.

Key Components:
- CognitiveState: Real-time cognitive state tracking
- CognitiveStateDetector: Detects state changes from interaction signals
- TriggerEngine: Fires intervention triggers based on state thresholds

Example Usage:
    from app.models.cognitive import (
        CognitiveState,
        CognitiveStateDetector,
        CognitiveStateUpdate,
        LearnerProfile,
        TriggerEngine,
        SignalType,
    )

    # Create initial state
    state = CognitiveState(
        learner_id="learner_123",
        session_id="session_456"
    )

    # Create detector and trigger engine
    detector = CognitiveStateDetector()
    engine = TriggerEngine()

    # Process signals
    signals = [
        CognitiveStateUpdate(
            signal_type=SignalType.ACCURACY,
            signal_value=0.0,  # Incorrect answer
        ),
        CognitiveStateUpdate(
            signal_type=SignalType.RESPONSE_TIME,
            signal_value=0.8,  # Slow response
            raw_value=12000,  # 12 seconds
        ),
    ]

    # Update state
    profile = LearnerProfile(learner_id="learner_123")
    state = await detector.update_state(state, signals, profile)

    # Check for triggers
    triggers = await engine.evaluate(state, profile)
    if triggers:
        priority_trigger = engine.get_priority_trigger(triggers)
        print(f"Intervention needed: {priority_trigger.trigger_type}")
        print(f"Recommended actions: {priority_trigger.recommended_actions}")
"""

# State models
from .state import (
    CognitiveLoadLevel,
    CognitiveState,
    CognitiveStateUpdate,
    DetectorConfig,
    EngagementLevel,
    LearnerProfile,
    LearningStyle,
    SignalType,
    StateSnapshot,
)

# Detector
from .detector import (
    CognitiveStateDetector,
    SignalBuffer,
    create_detector,
)

# Triggers
from .triggers import (
    InterventionTrigger,
    TriggerEngine,
    TriggerPriority,
    TriggerThresholds,
    TriggerType,
    create_trigger_engine,
)

__all__ = [
    # State models
    "CognitiveLoadLevel",
    "CognitiveState",
    "CognitiveStateUpdate",
    "DetectorConfig",
    "EngagementLevel",
    "LearnerProfile",
    "LearningStyle",
    "SignalType",
    "StateSnapshot",
    # Detector
    "CognitiveStateDetector",
    "SignalBuffer",
    "create_detector",
    # Triggers
    "InterventionTrigger",
    "TriggerEngine",
    "TriggerPriority",
    "TriggerThresholds",
    "TriggerType",
    "create_trigger_engine",
]

__version__ = "0.1.0"
