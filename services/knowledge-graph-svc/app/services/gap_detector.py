"""
Gap Detector

Detect knowledge gaps in learner understanding.
"""
import logging
from dataclasses import dataclass
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)


@dataclass
class KnowledgeGap:
    concept: str
    severity: float  # 0-1, how critical the gap is
    blocking_concepts: List[str]  # Concepts blocked by this gap
    suggested_remediation: List[str]


class GapDetector:
    """
    Detect gaps in learner's knowledge graph.
    
    Analysis:
    - Missing prerequisites
    - Incomplete concept mastery
    - Structural gaps (missing connections)
    
    Usage:
        detector = GapDetector()
        gaps = detector.detect(learner_knowledge, target_skill)
    """
    
    def __init__(self):
        logger.info("GapDetector initialized")
    
    def detect(
        self,
        known_concepts: List[str],
        mastery_levels: Dict[str, float],
        target_concept: Optional[str] = None,
    ) -> List[KnowledgeGap]:
        """Detect knowledge gaps."""
        raise NotImplementedError()
    
    def prioritize_gaps(
        self,
        gaps: List[KnowledgeGap],
    ) -> List[KnowledgeGap]:
        """Prioritize gaps by impact."""
        raise NotImplementedError()
    
    def suggest_remediation(
        self,
        gap: KnowledgeGap,
    ) -> List[str]:
        """Suggest remediation for a gap."""
        raise NotImplementedError()
