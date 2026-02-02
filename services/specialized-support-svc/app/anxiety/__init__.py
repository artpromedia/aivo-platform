"""
Anxiety Support Module.

Provides AI-powered support for learners with anxiety,
including coping strategies, test anxiety management,
and emotional regulation tools.
"""

from .models import (
    AnxietyProfile,
    AnxietyTrigger,
    CopingStrategy,
    AnxietyLevel,
    RelaxationTechnique,
)
from .service import (
    AnxietySupportService,
    InMemoryAnxietyProfileRepository,
)
from .coping_strategies import CopingStrategiesService
from .relaxation import RelaxationService

__all__ = [
    # Main service
    "AnxietySupportService",
    "InMemoryAnxietyProfileRepository",
    # Component services
    "CopingStrategiesService",
    "RelaxationService",
    # Models
    "AnxietyProfile",
    "AnxietyTrigger",
    "CopingStrategy",
    "AnxietyLevel",
    "RelaxationTechnique",
]
