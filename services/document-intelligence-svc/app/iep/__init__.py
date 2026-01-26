"""
IEP Extraction Module

AI-powered extraction of structured data from IEP (Individualized Education Program) documents.

This module provides:
- LLM-based extraction of goals, services, accommodations, and present levels
- SMART goal validation with actionable feedback
- Page reference tracking for source verification
- Confidence scoring for extraction quality assessment
"""

from .models import (
    IEPDomain,
    ServiceType,
    ExtractedGoal,
    ExtractedService,
    ExtractedAccommodation,
    PresentLevel,
    IEPExtractionResult,
    DocumentSection,
    SMARTValidationResult,
)
from .extractor import IEPExtractor
from .validators import SMARTValidator
from .service import IEPExtractionService

__all__ = [
    # Models
    "IEPDomain",
    "ServiceType",
    "ExtractedGoal",
    "ExtractedService",
    "ExtractedAccommodation",
    "PresentLevel",
    "IEPExtractionResult",
    "DocumentSection",
    "SMARTValidationResult",
    # Extractor
    "IEPExtractor",
    # Validator
    "SMARTValidator",
    # Service
    "IEPExtractionService",
]
