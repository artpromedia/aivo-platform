"""
Anxiety Support Data Models.

Defines data structures for anxiety support including triggers,
coping strategies, and relaxation techniques.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
import uuid


def generate_id() -> str:
    """Generate a unique identifier."""
    return str(uuid.uuid4())


class AnxietyType(str, Enum):
    """Types of anxiety."""
    GENERALIZED = "generalized"
    SOCIAL = "social"
    TEST = "test"
    SEPARATION = "separation"
    PERFORMANCE = "performance"
    SPECIFIC = "specific"


class AnxietyLevel(str, Enum):
    """Levels of anxiety intensity."""
    NONE = "none"
    MILD = "mild"
    MODERATE = "moderate"
    HIGH = "high"
    SEVERE = "severe"


class TriggerCategory(str, Enum):
    """Categories of anxiety triggers."""
    ACADEMIC = "academic"  # Tests, assignments, grades
    SOCIAL = "social"  # Interactions, presentations
    ENVIRONMENTAL = "environmental"  # Noise, crowds, changes
    PERFORMANCE = "performance"  # Being watched, competitions
    UNCERTAINTY = "uncertainty"  # New situations, lack of info
    TIME_PRESSURE = "time_pressure"  # Deadlines, timed activities


class CopingCategory(str, Enum):
    """Categories of coping strategies."""
    BREATHING = "breathing"
    GROUNDING = "grounding"
    COGNITIVE = "cognitive"
    PHYSICAL = "physical"
    SOCIAL = "social"
    AVOIDANCE_REDUCTION = "avoidance_reduction"


class RelaxationCategory(str, Enum):
    """Categories of relaxation techniques."""
    BREATHING = "breathing"
    MUSCLE_RELAXATION = "muscle_relaxation"
    PROGRESSIVE_MUSCLE = "progressive_muscle"  # Alias for backward compatibility
    VISUALIZATION = "visualization"
    MINDFULNESS = "mindfulness"
    MOVEMENT = "movement"
    SENSORY = "sensory"


@dataclass
class AnxietyTrigger:
    """Model for an anxiety trigger."""
    id: str = field(default_factory=generate_id)
    name: str = ""
    category: TriggerCategory = TriggerCategory.ACADEMIC
    intensity: AnxietyLevel = AnxietyLevel.MODERATE
    frequency: str = "sometimes"  # rarely, sometimes, often, always
    known_coping: List[str] = field(default_factory=list)
    notes: str = ""


@dataclass
class CopingStrategy:
    """Model for a coping strategy."""
    id: str = field(default_factory=generate_id)
    name: str = ""
    category: CopingCategory = CopingCategory.BREATHING
    steps: List[str] = field(default_factory=list)
    duration_minutes: int = 5
    effectiveness_rating: float = 0.0  # 0-1 scale
    best_for: List[AnxietyLevel] = field(default_factory=list)
    notes: str = ""


@dataclass
class RelaxationTechnique:
    """Model for a relaxation technique."""
    id: str = field(default_factory=generate_id)
    name: str = ""
    category: RelaxationCategory = RelaxationCategory.BREATHING
    instructions: List[str] = field(default_factory=list)
    duration_minutes: int = 5
    guided_script: Optional[str] = None
    visual_aids: List[str] = field(default_factory=list)
    age_appropriate_min: int = 5  # Minimum age for technique
    required_materials: List[str] = field(default_factory=list)


@dataclass
class WorryThought:
    """Model for tracking worry thoughts."""
    thought: str
    trigger: Optional[str] = None
    intensity: AnxietyLevel = AnxietyLevel.MODERATE
    reframed_thought: Optional[str] = None
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class SafetyBehavior:
    """Model for safety behaviors to gradually reduce."""
    behavior: str
    trigger: str
    function: str  # What does it help with?
    gradual_reduction_steps: List[str] = field(default_factory=list)


@dataclass
class AnxietyProfile:
    """Complete anxiety support profile for a learner."""
    learner_id: str
    anxiety_types: List[AnxietyType] = field(default_factory=list)
    triggers: List[AnxietyTrigger] = field(default_factory=list)
    effective_coping: List[CopingStrategy] = field(default_factory=list)
    preferred_relaxation: List[RelaxationTechnique] = field(default_factory=list)
    safety_behaviors: List[SafetyBehavior] = field(default_factory=list)
    safe_person: Optional[str] = None
    safe_place: Optional[str] = None
    warning_signs: List[str] = field(default_factory=list)
    accommodations: List[str] = field(default_factory=list)
    current_baseline: AnxietyLevel = AnxietyLevel.MILD
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    
    def get_triggers_by_category(self, category: TriggerCategory) -> List[AnxietyTrigger]:
        """Get triggers filtered by category."""
        return [t for t in self.triggers if t.category == category]
    
    def get_high_intensity_triggers(self) -> List[AnxietyTrigger]:
        """Get triggers with high or severe intensity."""
        high_levels = [AnxietyLevel.HIGH, AnxietyLevel.SEVERE]
        return [t for t in self.triggers if t.intensity in high_levels]


@dataclass
class AnxietyCheckIn:
    """Model for anxiety check-in."""
    id: str = field(default_factory=generate_id)
    learner_id: str = ""
    current_level: AnxietyLevel = AnxietyLevel.NONE
    physical_symptoms: List[str] = field(default_factory=list)
    emotional_state: str = ""
    recent_triggers: List[str] = field(default_factory=list)
    coping_used: List[str] = field(default_factory=list)
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class SupportRequest:
    """Request for anxiety support."""
    learner_id: str
    support_type: str
    current_level: AnxietyLevel = AnxietyLevel.MODERATE
    context: Dict[str, Any] = field(default_factory=dict)
    urgent: bool = False
    request_time: datetime = field(default_factory=datetime.now)


@dataclass
class SupportResponse:
    """Response containing anxiety support."""
    request_id: str = field(default_factory=generate_id)
    strategies: List[CopingStrategy] = field(default_factory=list)
    relaxation: List[RelaxationTechnique] = field(default_factory=list)
    accommodations: List[str] = field(default_factory=list)
    immediate_help: List[str] = field(default_factory=list)
    follow_up: List[str] = field(default_factory=list)
