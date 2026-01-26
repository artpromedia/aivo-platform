"""
Concept Extractor

Extract educational concepts from text.
"""
import logging
from dataclasses import dataclass
from typing import List, Optional

logger = logging.getLogger(__name__)


@dataclass
class ExtractedConcept:
    name: str
    domain: str
    importance: float
    span: tuple  # (start, end) in text
    definition: Optional[str] = None


class ConceptExtractor:
    """
    Extract concepts from educational content.
    
    Methods:
    - NER-based extraction
    - Keyword extraction (TF-IDF, TextRank)
    - Domain-specific extraction
    
    Usage:
        extractor = ConceptExtractor()
        concepts = extractor.extract("Photosynthesis converts light energy...")
    """
    
    def __init__(self, domain: Optional[str] = None):
        self.domain = domain
        logger.info("ConceptExtractor initialized")
    
    def extract(
        self,
        text: str,
        max_concepts: int = 20,
    ) -> List[ExtractedConcept]:
        """Extract concepts from text."""
        raise NotImplementedError()
    
    def extract_definitions(
        self,
        text: str,
    ) -> List[ExtractedConcept]:
        """Extract concepts with their definitions."""
        raise NotImplementedError()
    
    def link_to_ontology(
        self,
        concept: ExtractedConcept,
        ontology_name: str = "wikidata",
    ) -> Optional[str]:
        """Link concept to external ontology."""
        raise NotImplementedError()
