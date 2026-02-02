"""
ASD Routine Manager Service.

Provides routine management, visual schedules, and transition support
for learners who benefit from predictable structure.
"""

import logging
from datetime import datetime, time, timedelta
from typing import Any, Dict, List, Optional

from .models import (
    ASDProfile,
    RoutineSchedule,
    TransitionPlan,
    TransitionType,
)

logger = logging.getLogger(__name__)


class RoutineManagerService:
    """
    Service for managing routines and transitions.
    
    Provides:
    - Visual schedule creation
    - Transition planning
    - Routine modification support
    - Change preparation
    """

    # Standard transition warnings (in minutes)
    DEFAULT_WARNINGS = [10, 5, 2, 1]
    
    # Transition support templates
    TRANSITION_TEMPLATES = {
        TransitionType.ACTIVITY: [
            "Finish current task or find stopping point",
            "Save or put away materials",
            "Check what's coming next",
            "Move to next activity when ready",
        ],
        TransitionType.LOCATION: [
            "Get advance warning of move time",
            "Gather needed items",
            "Use transition object if helpful",
            "Follow familiar path to new location",
        ],
        TransitionType.TOPIC: [
            "Complete current topic section",
            "Review what was learned",
            "Preview what's coming next",
            "Make connection to new topic if possible",
        ],
        TransitionType.ROUTINE: [
            "Review the change in advance",
            "Note what stays the same",
            "Identify new elements",
            "Have backup plan if needed",
        ],
    }

    def __init__(self, llm_client: Optional[Any] = None):
        """Initialize the routine manager service."""
        self.llm = llm_client
        logger.info("RoutineManagerService initialized")

    async def create_visual_schedule(
        self,
        profile: ASDProfile,
        activities: List[Dict[str, Any]],
        include_transitions: bool = True,
    ) -> Dict[str, Any]:
        """
        Create a visual schedule for activities.
        
        Args:
            profile: ASD profile with routine preferences
            activities: List of activities with times and durations
            include_transitions: Whether to add transition buffers
            
        Returns:
            Visual schedule with timing and visual supports
        """
        schedule_items = []
        current_time = None
        
        for i, activity in enumerate(activities):
            # Add transition before activity (except first)
            if include_transitions and i > 0:
                transition = await self.create_transition_plan(
                    profile=profile,
                    from_activity=activities[i-1].get("name", "Previous"),
                    to_activity=activity.get("name", "Current"),
                    transition_type=TransitionType.ACTIVITY,
                )
                
                schedule_items.append({
                    "type": "transition",
                    "duration_minutes": 3,
                    "steps": transition.steps,
                    "visual_support": "⏰ Transition time",
                })
            
            # Add the activity
            activity_start = activity.get("start_time", current_time)
            activity_duration = activity.get("duration_minutes", 30)
            
            schedule_items.append({
                "type": "activity",
                "name": activity.get("name", "Activity"),
                "start_time": activity_start,
                "duration_minutes": activity_duration,
                "visual_support": self._get_activity_icon(activity.get("category", "general")),
                "notes": activity.get("notes", ""),
            })
            
            # Update current time
            if activity_start:
                current_time = activity_start
        
        return {
            "schedule": schedule_items,
            "total_items": len(schedule_items),
            "format": "visual_timeline",
            "tips": [
                "Review schedule at the start of each day",
                "Check off completed items",
                "Note any expected changes in advance",
            ],
        }

    async def create_transition_plan(
        self,
        profile: ASDProfile,
        from_activity: str,
        to_activity: str,
        transition_type: TransitionType = TransitionType.ACTIVITY,
        duration_minutes: int = 5,
    ) -> TransitionPlan:
        """
        Create a detailed transition plan.
        
        Args:
            profile: ASD profile with transition preferences
            from_activity: Current activity
            to_activity: Next activity
            transition_type: Type of transition
            duration_minutes: Time available for transition
            
        Returns:
            TransitionPlan with steps and supports
        """
        # Get base steps from templates
        base_steps = self.TRANSITION_TEMPLATES.get(
            transition_type,
            self.TRANSITION_TEMPLATES[TransitionType.ACTIVITY]
        )
        
        # Customize warning times based on profile
        warnings = self.DEFAULT_WARNINGS.copy()
        if profile.transition_strategies:
            # Adjust based on profile preferences
            if "extra_time" in " ".join(profile.transition_strategies).lower():
                warnings = [15, 10, 5, 2]
        
        # Build the transition plan
        plan = TransitionPlan(
            transition_type=transition_type,
            from_activity=from_activity,
            to_activity=to_activity,
            warning_times=warnings[:4],  # Max 4 warnings
            visual_timers=True,
            steps=list(base_steps),
        )
        
        # Add profile-specific strategies
        for strategy in profile.transition_strategies:
            if strategy not in plan.steps:
                plan.steps.append(strategy)
        
        return plan

    async def prepare_for_change(
        self,
        profile: ASDProfile,
        change_description: str,
        change_timing: str = "today",
        severity: str = "minor",
    ) -> Dict[str, Any]:
        """
        Prepare a learner for a routine change.
        
        Args:
            profile: ASD profile with preferences
            change_description: What is changing
            change_timing: When the change happens
            severity: How significant the change is (minor, moderate, major)
            
        Returns:
            Preparation plan with steps and supports
        """
        preparation_steps = []
        supports = []
        
        # Base preparation based on severity
        if severity == "major":
            preparation_steps.extend([
                "Discuss the change well in advance",
                "Create a social story about the change",
                "Practice or role-play the new situation if possible",
                "Identify what will stay the same",
                "Plan coping strategies for difficult moments",
            ])
            supports.extend([
                "Social story about the change",
                "Visual comparison of old vs new",
                "Comfort object or calming tool",
            ])
        elif severity == "moderate":
            preparation_steps.extend([
                "Discuss the change beforehand",
                "Review what will be different",
                "Note what stays the same",
                "Have a backup plan ready",
            ])
            supports.extend([
                "Visual schedule showing the change",
                "Written summary of what to expect",
            ])
        else:  # minor
            preparation_steps.extend([
                "Give advance notice of the change",
                "Briefly explain what will be different",
                "Confirm the change when it happens",
            ])
            supports.append("Updated schedule or visual")
        
        # Add timing-specific steps
        if change_timing == "today":
            preparation_steps.insert(0, "Review the change now")
        elif change_timing == "tomorrow":
            preparation_steps.insert(0, "Discuss the change today and review tomorrow")
        else:
            preparation_steps.insert(0, f"Introduce the change gradually before {change_timing}")
        
        # Add profile-specific calming strategies
        preparation_steps.append("Use calming strategies if feeling anxious about the change")
        supports.extend(profile.calming_strategies[:3])
        
        return {
            "change": change_description,
            "timing": change_timing,
            "severity": severity,
            "preparation_steps": preparation_steps,
            "visual_supports": supports,
            "calming_strategies": profile.calming_strategies,
            "check_in_points": self._get_check_in_points(change_timing),
        }

    async def adapt_routine(
        self,
        profile: ASDProfile,
        current_routine: RoutineSchedule,
        adaptation_reason: str,
    ) -> Dict[str, Any]:
        """
        Suggest adaptations to an existing routine.
        
        Args:
            profile: ASD profile
            current_routine: The routine to adapt
            adaptation_reason: Why adaptation is needed
            
        Returns:
            Adaptation suggestions with gradual steps
        """
        suggestions = []
        gradual_steps = []
        
        # Analyze adaptation reason
        reason_lower = adaptation_reason.lower()
        
        if "too long" in reason_lower or "attention" in reason_lower:
            suggestions.append("Break into smaller segments with breaks")
            suggestions.append("Add movement breaks between segments")
            gradual_steps = [
                "Week 1: Add one break in the middle",
                "Week 2: Add visual timer for each segment",
                "Week 3: Adjust segment lengths based on feedback",
            ]
        
        elif "anxiety" in reason_lower or "stress" in reason_lower:
            suggestions.append("Add more buffer time between activities")
            suggestions.append("Include calming activity at regular intervals")
            gradual_steps = [
                "Week 1: Add 2-minute calming breaks",
                "Week 2: Introduce visual countdown timers",
                "Week 3: Practice flexible timing gradually",
            ]
        
        elif "boring" in reason_lower or "interest" in reason_lower:
            suggestions.append("Incorporate special interests where possible")
            suggestions.append("Add choice points within the routine")
            for interest in profile.special_interests[:2]:
                suggestions.append(f"Connect activities to {interest.name}")
        
        else:
            suggestions.append("Maintain core structure while adjusting details")
            suggestions.append("Introduce changes one at a time")
            gradual_steps = [
                "Week 1: Make one small change",
                "Week 2: Evaluate and adjust",
                "Week 3: Add another change if ready",
            ]
        
        return {
            "current_routine": current_routine.name,
            "adaptation_reason": adaptation_reason,
            "suggestions": suggestions,
            "gradual_implementation": gradual_steps,
            "maintain": [
                "Keep consistent start and end points",
                "Preserve familiar elements",
                "Use existing visual supports",
            ],
        }

    def _get_activity_icon(self, category: str) -> str:
        """Get a visual icon for an activity category."""
        icons = {
            "learning": "📚",
            "break": "☕",
            "movement": "🏃",
            "creative": "🎨",
            "social": "👥",
            "quiet": "🤫",
            "meal": "🍽️",
            "transition": "⏰",
            "general": "📌",
        }
        return icons.get(category, "📌")

    def _get_check_in_points(self, timing: str) -> List[str]:
        """Get check-in points based on timing."""
        if timing == "today":
            return ["Before the change", "During (if applicable)", "After"]
        elif timing == "tomorrow":
            return ["Tonight", "Tomorrow morning", "Before the change", "After"]
        else:
            return ["When first discussed", "Day before", "Morning of", "After"]
