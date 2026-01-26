"""
ADHD Executive Function AI Support System.

This module provides comprehensive support for learners with ADHD,
including project breakdown, daily planning, and executive function
strategy recommendations.

Main Components:
- ADHDAIService: Main service orchestrating all ADHD support features
- ProjectBreakdownService: Breaks projects into ADHD-friendly chunks
- DailyPlannerService: Generates optimized daily schedules
- EFStrategyLibrary: Library of executive function strategies

Usage:
    from app.adhd import ADHDAIService, ADHDProfile, Task

    # Create service (optionally with LLM client)
    service = ADHDAIService(llm_client=my_llm_client)

    # Get support
    result = await service.get_support(
        learner_id="learner_123",
        support_type="project_breakdown",
        context={
            "project": "Write a 5-page essay on climate change",
            "deadline": "2024-02-15",
            "subject": "science"
        }
    )
"""

# Models - Core data structures
from .models import (
    # Enums
    ExecutiveFunctionDomain,
    TimeBlockCategory,
    EnergyLevel,
    TimerStyle,
    MovementBreakPreference,
    FlexibilityLevel,
    FocusTime,
    # Profile and core models
    ADHDProfile,
    ProjectChunk,
    TimeBlock,
    DailySchedule,
    EFStrategy,
    Task,
    SupportRequest,
    # Activity models
    MovementBreak,
    RegulationActivity,
    FocusSession,
    # Utilities
    generate_id,
)

# Project Breakdown Service
from .project_breakdown import (
    ProjectBreakdownService,
    ProjectBreakdownConfig,
)

# Daily Planner Service
from .daily_planner import (
    DailyPlannerService,
)

# Executive Function Strategies
from .ef_strategies import (
    EFStrategyLibrary,
)

# Main Service
from .service import (
    ADHDAIService,
    InMemoryProfileRepository,
)

__all__ = [
    # Main service
    "ADHDAIService",
    "InMemoryProfileRepository",
    # Component services
    "ProjectBreakdownService",
    "ProjectBreakdownConfig",
    "DailyPlannerService",
    "EFStrategyLibrary",
    # Enums
    "ExecutiveFunctionDomain",
    "TimeBlockCategory",
    "EnergyLevel",
    "TimerStyle",
    "MovementBreakPreference",
    "FlexibilityLevel",
    "FocusTime",
    # Models
    "ADHDProfile",
    "ProjectChunk",
    "TimeBlock",
    "DailySchedule",
    "EFStrategy",
    "Task",
    "SupportRequest",
    "MovementBreak",
    "RegulationActivity",
    "FocusSession",
    # Utilities
    "generate_id",
]

__version__ = "1.0.0"
