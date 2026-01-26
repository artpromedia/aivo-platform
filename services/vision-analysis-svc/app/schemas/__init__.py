"""Schema models for Vision Analysis Service API."""

from app.schemas.requests import (
    DiagramAnalyzeRequest,
    DiagramAnalyzeResponse,
    DocumentScanRequest,
    DocumentScanResponse,
    HandwritingOCRRequest,
    HandwritingOCRResponse,
    HomeworkAnalyzeRequest,
    HomeworkAnalyzeResponse,
    LineResultSchema,
    MathRecognizeRequest,
    MathRecognizeResponse,
    WordPositionSchema,
)

__all__ = [
    "HandwritingOCRRequest",
    "HandwritingOCRResponse",
    "LineResultSchema",
    "WordPositionSchema",
    "MathRecognizeRequest",
    "MathRecognizeResponse",
    "DiagramAnalyzeRequest",
    "DiagramAnalyzeResponse",
    "DocumentScanRequest",
    "DocumentScanResponse",
    "HomeworkAnalyzeRequest",
    "HomeworkAnalyzeResponse",
]
