"""
ASD Support Data Models.

Defines data structures for autism support including sensory profiles,
routines, social scripts, and communication preferences.
"""

from dataclasses import dataclass, field
from datetime import datetime, time
from enum import Enum
from typing import Any, Dict, List, Optional
import uuid


def generate_id() -> str:
    """Generate a unique identifier."""
    return str(uuid.uuid4())


class SensoryDomain(str, Enum):
    """Sensory domains for processing profiles."""
    VISUAL = "visual"
    AUDITORY = "auditory"
    TACTILE = "tactile"
    VESTIBULAR = "vestibular"
    PROPRIOCEPTIVE = "proprioceptive"
    OLFACTORY = "olfactory"
    GUSTATORY = "gustatory"


class SensoryResponse(str, Enum):
    """Sensory processing response types."""
    HYPERSENSITIVE = "hypersensitive"  # Over-responsive
    HYPOSENSITIVE = "hyposensitive"   # Under-responsive
    TYPICAL = "typical"
    VARIABLE = "variable"  # Varies by context


class CommunicationStyle(str, Enum):
    """Preferred communication styles."""
    VERBAL = "verbal"
    WRITTEN = "written"
    VISUAL_SUPPORTS = "visual_supports"
    AAC = "aac"  # Augmentative and alternative communication
    COMBINED = "combined"


class SocialSituation(str, Enum):
    """Types of social situations."""
    ONE_ON_ONE = "one_on_one"
    SMALL_GROUP = "small_group"
    LARGE_GROUP = "large_group"
    CLASSROOM = "classroom"
    ONLINE = "online"
    UNFAMILIAR = "unfamiliar"


class TransitionType(str, Enum):
    """Types of transitions."""
    ACTIVITY = "activity"
    LOCATION = "location"
    TOPIC = "topic"
    PERSON = "person"
    ROUTINE = "routine"


class InterestIntensity(str, Enum):
    """Intensity levels for special interests."""
    MILD = "mild"
    MODERATE = "moderate"
    INTENSE = "intense"
    FOCUSED = "focused"


@dataclass
class SensoryProfile:
    """Individual sensory processing profile."""
    domain: SensoryDomain
    response_type: SensoryResponse
    triggers: List[str] = field(default_factory=list)
    calming_strategies: List[str] = field(default_factory=list)
    accommodations: List[str] = field(default_factory=list)
    threshold_level: float = 0.5  # 0-1 scale


@dataclass
class SpecialInterest:
    """Model for special interests."""
    name: str
    intensity: InterestIntensity
    related_topics: List[str] = field(default_factory=list)
    learning_connections: List[str] = field(default_factory=list)
    can_use_for_motivation: bool = True


@dataclass
class SocialScript:
    """Structured script for social situations."""
    situation: SocialSituation
    id: str = field(default_factory=generate_id)
    title: str = ""
    steps: List[str] = field(default_factory=list)
    expected_responses: List[str] = field(default_factory=list)
    visual_supports: List[str] = field(default_factory=list)
    practice_scenarios: List[str] = field(default_factory=list)


@dataclass
class RoutineSchedule:
    """Structured routine schedule."""
    id: str = field(default_factory=generate_id)
    name: str = ""
    time_start: Optional[time] = None
    time_end: Optional[time] = None
    steps: List[str] = field(default_factory=list)
    visual_schedule: List[str] = field(default_factory=list)
    flexibility_notes: str = ""
    is_daily: bool = True


@dataclass
class TransitionPlan:
    """Plan for managing transitions."""
    transition_type: TransitionType
    id: str = field(default_factory=generate_id)
    from_activity: str = ""
    to_activity: str = ""
    warning_times: List[int] = field(default_factory=lambda: [5, 2, 1])  # minutes
    visual_timers: bool = True
    transition_object: Optional[str] = None
    social_story: Optional[str] = None
    steps: List[str] = field(default_factory=list)


@dataclass
class CommunicationPreference:
    """Communication preferences and supports."""
    preferred_style: CommunicationStyle
    processing_time_needed: int = 5  # seconds
    prefers_direct_language: bool = True
    visual_supports_helpful: bool = True
    needs_concrete_examples: bool = True
    preferred_response_format: str = "bullet_points"


@dataclass
class ASDProfile:
    """Complete ASD support profile for a learner."""
    learner_id: str
    sensory_profiles: List[SensoryProfile] = field(default_factory=list)
    special_interests: List[SpecialInterest] = field(default_factory=list)
    communication: Optional[CommunicationPreference] = None
    preferred_routines: List[RoutineSchedule] = field(default_factory=list)
    social_comfort_levels: Dict[SocialSituation, float] = field(default_factory=dict)
    transition_strategies: List[str] = field(default_factory=list)
    calming_strategies: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    
    def get_sensory_accommodations(self) -> List[str]:
        """Get all sensory accommodations."""
        accommodations = []
        for profile in self.sensory_profiles:
            accommodations.extend(profile.accommodations)
        return list(set(accommodations))
    
    def get_hypersensitive_domains(self) -> List[SensoryDomain]:
        """Get domains where learner is hypersensitive."""
        return [
            p.domain for p in self.sensory_profiles
            if p.response_type == SensoryResponse.HYPERSENSITIVE
        ]


@dataclass
class SupportRequest:
    """Request for ASD support."""
    learner_id: str
    support_type: str
    context: Dict[str, Any] = field(default_factory=dict)
    urgency: str = "normal"  # normal, high, low
    request_time: datetime = field(default_factory=datetime.now)


@dataclass
class SupportResponse:
    """Response containing ASD support."""
    request_id: str = field(default_factory=generate_id)
    strategies: List[str] = field(default_factory=list)
    accommodations: List[str] = field(default_factory=list)
    visual_supports: List[str] = field(default_factory=list)
    scripts: List[SocialScript] = field(default_factory=list)
    transitions: List[TransitionPlan] = field(default_factory=list)
    additional_notes: str = ""
