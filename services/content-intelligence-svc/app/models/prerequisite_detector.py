"""
Prerequisite Detector

Detect prerequisites for content.
"""
import logging
from dataclasses import dataclass
from typing import List, Optional

logger = logging.getLogger(__name__)


@dataclass
class Prerequisite:
    concept: str
    importance: str  # required, recommended, helpful
    confidence: float


class PrerequisiteDetector:
    """
    Detect prerequisites for educational content.
    
    Usage:
        detector = PrerequisiteDetector()
        prereqs = detector.detect("To understand derivatives, you must first...")
    """
    
    def __init__(self):
        logger.info("PrerequisiteDetector initialized")
    
    def detect(
        self,
        text: str,
        subject: Optional[str] = None,
    ) -> List[Prerequisite]:
        """Detect prerequisites from content."""
        raise NotImplementedError()
    
    def validate_sequence(
        self,
        content_sequence: List[str],
    ) -> Dict:
        """Validate if a content sequence respects prerequisites."""
        raise NotImplementedError()
    
    def suggest_ordering(
        self,
        content_items: List[str],
    ) -> List[str]:
        """Suggest optimal ordering based on prerequisites."""
        raise NotImplementedError()
