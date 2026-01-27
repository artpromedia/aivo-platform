"""Schemas module for Cognitive Load Service."""

from app.schemas.requests import (
    # Intrinsic Load
    ContentAnalysisRequest,
    ContentComplexityResponse,
    ElementInteractivityRequest,
    ElementInteractivityResponse,
    # Extraneous Load
    ExtraneousLoadRequest,
    ExtraneousLoadResponse,
    UIAnalysisRequest,
    UIAnalysisResponse,
    # Working Memory
    WorkingMemoryRequest,
    WorkingMemoryResponse,
    MemoryLoadUpdate,
    # Cognitive Load Estimation
    InteractionDataRequest,
    CognitiveLoadResponse,
    LoadEstimateRequest,
    LoadHistoryResponse,
    # Overload Prediction
    OverloadPredictionRequest,
    OverloadPredictionResponse,
    LoadTrendRequest,
    LoadTrendResponse,
    # Scaffolding
    ScaffoldingRequest,
    ScaffoldingResponse,
    ScaffoldRecommendation,
    # Pacing
    PacingRequest,
    PacingResponse,
    # Mental Model
    MentalModelRequest,
    MentalModelResponse,
    # Adaptation
    AdaptationRequest,
    AdaptationResponse,
    AdaptationAction,
    # Session Management
    SessionStartRequest,
    SessionUpdateRequest,
    SessionSummaryResponse,
)

__all__ = [
    # Intrinsic Load
    "ContentAnalysisRequest",
    "ContentComplexityResponse",
    "ElementInteractivityRequest",
    "ElementInteractivityResponse",
    # Extraneous Load
    "ExtraneousLoadRequest",
    "ExtraneousLoadResponse",
    "UIAnalysisRequest",
    "UIAnalysisResponse",
    # Working Memory
    "WorkingMemoryRequest",
    "WorkingMemoryResponse",
    "MemoryLoadUpdate",
    # Cognitive Load Estimation
    "InteractionDataRequest",
    "CognitiveLoadResponse",
    "LoadEstimateRequest",
    "LoadHistoryResponse",
    # Overload Prediction
    "OverloadPredictionRequest",
    "OverloadPredictionResponse",
    "LoadTrendRequest",
    "LoadTrendResponse",
    # Scaffolding
    "ScaffoldingRequest",
    "ScaffoldingResponse",
    "ScaffoldRecommendation",
    # Pacing
    "PacingRequest",
    "PacingResponse",
    # Mental Model
    "MentalModelRequest",
    "MentalModelResponse",
    # Adaptation
    "AdaptationRequest",
    "AdaptationResponse",
    "AdaptationAction",
    # Session Management
    "SessionStartRequest",
    "SessionUpdateRequest",
    "SessionSummaryResponse",
]
