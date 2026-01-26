"""Pydantic schemas for request/response validation."""

from app.schemas.requests import (
    # Enums
    QuestionType,
    BloomLevel,
    # Question Generation
    GenerateQuestionsRequest,
    GeneratedQuestion,
    GenerateQuestionsResponse,
    # MCQ Generation
    GenerateMCQRequest,
    MCQItem,
    GenerateMCQResponse,
    # Cloze Generation
    GenerateClozeRequest,
    ClozeItem,
    GenerateClozeResponse,
    # Quality Scoring
    QualityScoreRequest,
    QualityScoreResponse,
    # Distractor Generation
    GenerateDistractorsRequest,
    Distractor,
    GenerateDistractorsResponse,
    # Bloom's Classification
    BloomClassifyRequest,
    BloomClassifyResponse,
    # Difficulty Estimation
    DifficultyEstimateRequest,
    DifficultyEstimateResponse,
    # Health Check
    HealthResponse,
    ReadinessResponse,
)

__all__ = [
    # Enums
    "QuestionType",
    "BloomLevel",
    # Question Generation
    "GenerateQuestionsRequest",
    "GeneratedQuestion",
    "GenerateQuestionsResponse",
    # MCQ Generation
    "GenerateMCQRequest",
    "MCQItem",
    "GenerateMCQResponse",
    # Cloze Generation
    "GenerateClozeRequest",
    "ClozeItem",
    "GenerateClozeResponse",
    # Quality Scoring
    "QualityScoreRequest",
    "QualityScoreResponse",
    # Distractor Generation
    "GenerateDistractorsRequest",
    "Distractor",
    "GenerateDistractorsResponse",
    # Bloom's Classification
    "BloomClassifyRequest",
    "BloomClassifyResponse",
    # Difficulty Estimation
    "DifficultyEstimateRequest",
    "DifficultyEstimateResponse",
    # Health Check
    "HealthResponse",
    "ReadinessResponse",
]
