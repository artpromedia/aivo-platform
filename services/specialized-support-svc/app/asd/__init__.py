"""
ASD (Autism Spectrum Disorder) Support Module.

Provides AI-powered support for learners on the autism spectrum,
including sensory accommodations, social skill scaffolding,
routine management, and communication support.
"""

from .models import (
    ASDProfile,
    SensoryProfile,
    RoutineSchedule,
    SocialScript,
    CommunicationStyle,
    TransitionPlan,
)
from .service import (
    ASDSupportService,
    InMemoryASDProfileRepository,
)
from .sensory_support import SensorySupportService
from .routine_manager import RoutineManagerService
from .social_scaffolding import SocialScaffoldingService

__all__ = [
    # Main service
    "ASDSupportService",
    "InMemoryASDProfileRepository",
    # Component services
    "SensorySupportService",
    "RoutineManagerService",
    "SocialScaffoldingService",
    # Models
    "ASDProfile",
    "SensoryProfile",
    "RoutineSchedule",
    "SocialScript",
    "CommunicationStyle",
    "TransitionPlan",
]
