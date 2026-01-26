"""
Alt-text Generator

Generate alt-text descriptions for images.
"""
import logging
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class AltText:
    short_description: str
    long_description: str
    educational_context: Optional[str]


class AltTextGenerator:
    """
    Generate alt-text for images.
    
    Types:
    - Short (concise)
    - Long (detailed)
    - Educational (learning context)
    
    Usage:
        generator = AltTextGenerator()
        alt = generator.generate(image_bytes)
    """
    
    def __init__(self):
        logger.info("AltTextGenerator initialized")
    
    def generate(
        self,
        image: bytes,
        context: Optional[str] = None,
    ) -> AltText:
        """Generate alt-text for image."""
        raise NotImplementedError()
    
    def generate_for_chart(
        self,
        image: bytes,
    ) -> AltText:
        """Generate alt-text for chart/graph."""
        raise NotImplementedError()
    
    def generate_for_diagram(
        self,
        image: bytes,
    ) -> AltText:
        """Generate alt-text for diagram."""
        raise NotImplementedError()
