"""
Anxiety Support Service.

Main service orchestrating anxiety support features including
coping strategies, relaxation techniques, and anxiety management.
"""

import logging
from dataclasses import field
from datetime import datetime
from typing import Any, Dict, List, Optional, Protocol

from .coping_strategies import CopingStrategiesService
from .models import (
    AnxietyCheckIn,
    AnxietyLevel,
    AnxietyProfile,
    AnxietyTrigger,
    AnxietyType,
    CopingStrategy,
    RelaxationCategory,
    RelaxationTechnique,
    SupportRequest,
    SupportResponse,
)
from .relaxation import RelaxationService

logger = logging.getLogger(__name__)


class LLMClient(Protocol):
    """Protocol for LLM client."""
    
    async def generate(self, prompt: str, **kwargs) -> str:
        """Generate text from a prompt."""
        ...


class AnxietyProfileRepository(Protocol):
    """Protocol for anxiety profile persistence."""
    
    async def get(self, learner_id: str) -> Optional[AnxietyProfile]:
        """Get profile by learner ID."""
        ...
    
    async def save(self, profile: AnxietyProfile) -> None:
        """Save profile."""
        ...


class InMemoryAnxietyProfileRepository:
    """In-memory implementation for testing."""
    
    def __init__(self):
        self._profiles: Dict[str, AnxietyProfile] = {}
    
    async def get(self, learner_id: str) -> Optional[AnxietyProfile]:
        return self._profiles.get(learner_id)
    
    async def save(self, profile: AnxietyProfile) -> None:
        self._profiles[profile.learner_id] = profile


class AnxietySupportService:
    """
    Main service for anxiety support.
    
    Orchestrates:
    - Coping strategies
    - Relaxation techniques
    - Anxiety check-ins
    - Trigger management
    - Support plans
    """

    def __init__(
        self,
        repository: Optional[AnxietyProfileRepository] = None,
        llm_client: Optional[LLMClient] = None,
    ):
        """
        Initialize the anxiety support service.
        
        Args:
            repository: Profile repository (uses in-memory if not provided)
            llm_client: Optional LLM client for personalized support
        """
        self.repository = repository or InMemoryAnxietyProfileRepository()
        self.llm = llm_client
        
        # Initialize sub-services
        self.coping = CopingStrategiesService(llm_client)
        self.relaxation = RelaxationService(llm_client)
        
        logger.info("AnxietySupportService initialized")

    async def get_profile(self, learner_id: str) -> AnxietyProfile:
        """
        Get or create an anxiety profile.
        
        Args:
            learner_id: Learner identifier
            
        Returns:
            Anxiety profile
        """
        profile = await self.repository.get(learner_id)
        if not profile:
            profile = AnxietyProfile(learner_id=learner_id)
            await self.repository.save(profile)
        return profile

    async def update_profile(
        self,
        learner_id: str,
        updates: Dict[str, Any],
    ) -> AnxietyProfile:
        """
        Update an anxiety profile.
        
        Args:
            learner_id: Learner identifier
            updates: Fields to update
            
        Returns:
            Updated profile
        """
        profile = await self.get_profile(learner_id)
        
        # Update allowed fields
        updatable_fields = {
            "anxiety_types",
            "triggers",
            "effective_coping",
            "effective_techniques",
            "accommodations",
            "safe_person",
            "check_in_frequency",
        }
        
        for field_name, value in updates.items():
            if field_name in updatable_fields and hasattr(profile, field_name):
                setattr(profile, field_name, value)
        
        profile.updated_at = datetime.utcnow()
        await self.repository.save(profile)
        return profile

    async def get_support(
        self,
        request: SupportRequest,
    ) -> SupportResponse:
        """
        Get anxiety support based on request.
        
        Args:
            request: Support request with type and context
            
        Returns:
            Support response with strategies and resources
        """
        profile = await self.get_profile(request.learner_id)
        support_type = request.support_type
        context = request.context or {}
        current_level = request.current_level or AnxietyLevel.MODERATE
        
        response_content: Dict[str, Any] = {}
        
        if support_type == "immediate_help":
            # Get immediate help for acute anxiety
            immediate_steps = await self.coping.get_immediate_help(current_level)
            response_content = {
                "immediate_steps": immediate_steps,
                "safe_person": profile.safe_person,
            }
            
        elif support_type == "coping_strategies":
            # Get coping strategies
            strategies = await self.coping.get_strategies(
                profile, current_level, context
            )
            response_content = {
                "strategies": [
                    {
                        "name": s.name,
                        "category": s.category.value,
                        "steps": s.steps,
                        "duration_minutes": s.duration_minutes,
                    }
                    for s in strategies
                ]
            }
            
        elif support_type == "test_anxiety":
            # Get test anxiety support
            timing = context.get("timing", "before_test")
            support = await self.coping.get_test_anxiety_strategies(profile, timing)
            response_content = support
            
        elif support_type == "social_anxiety":
            # Get social anxiety support
            situation = context.get("situation", "before_social_event")
            support = await self.coping.get_social_anxiety_strategies(
                profile, situation
            )
            response_content = support
            
        elif support_type == "relaxation":
            # Get relaxation techniques
            category = context.get("category")
            if category:
                category = RelaxationCategory(category)
            techniques = await self.relaxation.get_techniques(
                profile, category, context
            )
            response_content = {
                "techniques": [
                    {
                        "name": t.name,
                        "category": t.category.value,
                        "instructions": t.instructions,
                        "duration_minutes": t.duration_minutes,
                    }
                    for t in techniques
                ]
            }
            
        elif support_type == "quick_calm":
            # Get quick calming techniques
            duration_limit = context.get("duration_limit", 3)
            techniques = await self.relaxation.get_quick_calm(profile, duration_limit)
            response_content = {
                "quick_techniques": [
                    {
                        "name": t.name,
                        "instructions": t.instructions,
                        "duration_minutes": t.duration_minutes,
                    }
                    for t in techniques
                ]
            }
            
        elif support_type == "classroom":
            # Get classroom-appropriate activities
            discreet = context.get("discreet_only", True)
            activities = await self.relaxation.get_classroom_activities(
                profile, discreet
            )
            response_content = {"activities": activities}
            
        elif support_type == "calm_down_plan":
            # Get personalized calm-down plan
            plan = await self.relaxation.create_calm_down_plan(profile, context)
            response_content = {"plan": plan}
            
        elif support_type == "reframe":
            # Reframe an anxious thought
            thought = context.get("thought", "")
            if thought:
                reframed = await self.coping.reframe_thought(profile, thought)
                response_content = {
                    "original": reframed.thought,
                    "reframed": reframed.reframed_thought,
                }
            
        elif support_type == "bedtime_routine":
            # Get bedtime routine
            routine = await self.relaxation.get_bedtime_routine(profile)
            response_content = {"routine": routine}
            
        elif support_type == "morning_routine":
            # Get morning routine
            routine = await self.relaxation.get_morning_routine(profile)
            response_content = {"routine": routine}
            
        elif support_type == "guided_relaxation":
            # Get guided relaxation
            technique_name = context.get("technique", "Safe Place Visualization")
            guided = await self.relaxation.guided_relaxation(technique_name, profile)
            response_content = guided
            
        else:
            # Default: return general strategies
            strategies = await self.coping.get_strategies(
                profile, current_level, context
            )
            response_content = {
                "strategies": [s.name for s in strategies],
                "message": "Use a coping strategy that works for you",
            }
        
        return SupportResponse(
            learner_id=request.learner_id,
            support_type=support_type,
            content=response_content,
        )

    async def record_check_in(
        self,
        learner_id: str,
        check_in: AnxietyCheckIn,
    ) -> Dict[str, Any]:
        """
        Record an anxiety check-in.
        
        Args:
            learner_id: Learner identifier
            check_in: Check-in data
            
        Returns:
            Check-in response with support if needed
        """
        profile = await self.get_profile(learner_id)
        
        # Add to check-in history (would typically persist)
        response = {
            "check_in_recorded": True,
            "level": check_in.level.value,
            "timestamp": check_in.timestamp.isoformat(),
        }
        
        # Provide support based on level
        if check_in.level in [AnxietyLevel.HIGH, AnxietyLevel.SEVERE]:
            immediate_help = await self.coping.get_immediate_help(check_in.level)
            response["immediate_support"] = immediate_help
            response["needs_attention"] = True
        elif check_in.level == AnxietyLevel.MODERATE:
            strategies = await self.coping.get_strategies(profile, check_in.level)
            response["suggested_strategies"] = [s.name for s in strategies[:3]]
        else:
            response["message"] = "Great! Keep using your coping tools."
        
        # Add safe person if severe
        if check_in.level == AnxietyLevel.SEVERE and profile.safe_person:
            response["safe_person"] = profile.safe_person
        
        return response

    async def add_trigger(
        self,
        learner_id: str,
        trigger: AnxietyTrigger,
    ) -> AnxietyProfile:
        """
        Add a known trigger to profile.
        
        Args:
            learner_id: Learner identifier
            trigger: Trigger to add
            
        Returns:
            Updated profile
        """
        profile = await self.get_profile(learner_id)
        
        # Check if trigger already exists
        existing_names = {t.name for t in profile.triggers}
        if trigger.name not in existing_names:
            profile.triggers.append(trigger)
            profile.updated_at = datetime.utcnow()
            await self.repository.save(profile)
        
        return profile

    async def add_effective_strategy(
        self,
        learner_id: str,
        strategy: CopingStrategy,
    ) -> AnxietyProfile:
        """
        Mark a coping strategy as effective for learner.
        
        Args:
            learner_id: Learner identifier
            strategy: Strategy that worked
            
        Returns:
            Updated profile
        """
        profile = await self.get_profile(learner_id)
        
        # Add if not already in effective strategies
        existing_names = {s.name for s in profile.effective_coping}
        if strategy.name not in existing_names:
            profile.effective_coping.append(strategy)
            profile.updated_at = datetime.utcnow()
            await self.repository.save(profile)
        
        return profile

    async def add_effective_technique(
        self,
        learner_id: str,
        technique: RelaxationTechnique,
    ) -> AnxietyProfile:
        """
        Mark a relaxation technique as effective for learner.
        
        Args:
            learner_id: Learner identifier
            technique: Technique that worked
            
        Returns:
            Updated profile
        """
        profile = await self.get_profile(learner_id)
        
        # Add if not already in effective techniques
        existing_names = {t.name for t in profile.effective_techniques}
        if technique.name not in existing_names:
            profile.effective_techniques.append(technique)
            profile.updated_at = datetime.utcnow()
            await self.repository.save(profile)
        
        return profile

    async def get_trigger_support(
        self,
        learner_id: str,
        trigger_name: str,
    ) -> Dict[str, Any]:
        """
        Get specific support for a known trigger.
        
        Args:
            learner_id: Learner identifier
            trigger_name: Name of the trigger
            
        Returns:
            Trigger-specific support
        """
        profile = await self.get_profile(learner_id)
        
        # Find the trigger
        trigger = None
        for t in profile.triggers:
            if t.name.lower() == trigger_name.lower():
                trigger = t
                break
        
        if not trigger:
            # General support if trigger not found
            strategies = await self.coping.get_strategies(
                profile, AnxietyLevel.MODERATE
            )
            return {
                "message": f"Support for handling {trigger_name}",
                "strategies": [s.name for s in strategies[:3]],
            }
        
        # Get strategies based on intensity
        strategies = await self.coping.get_strategies(profile, trigger.intensity)
        
        return {
            "trigger": trigger.name,
            "category": trigger.category.value,
            "intensity": trigger.intensity.value,
            "coping_strategies": trigger.coping_strategies or [s.name for s in strategies[:3]],
            "warning_signs": trigger.warning_signs,
            "recommended_strategies": [s.name for s in strategies],
        }

    async def get_support_plan(
        self,
        learner_id: str,
        context: Dict[str, Any] = None,
    ) -> Dict[str, Any]:
        """
        Get comprehensive anxiety support plan.
        
        Args:
            learner_id: Learner identifier
            context: Optional context
            
        Returns:
            Full support plan
        """
        profile = await self.get_profile(learner_id)
        
        # Build comprehensive plan
        plan = {
            "learner_id": learner_id,
            "anxiety_types": [t.value for t in profile.anxiety_types],
            "known_triggers": [
                {
                    "name": t.name,
                    "category": t.category.value,
                    "warning_signs": t.warning_signs,
                }
                for t in profile.triggers
            ],
            "effective_coping": [s.name for s in profile.effective_coping],
            "effective_techniques": [t.name for t in profile.effective_techniques],
            "accommodations": profile.accommodations,
            "safe_person": profile.safe_person,
            "check_in_frequency": profile.check_in_frequency,
        }
        
        # Add calm-down plan
        calm_down = await self.relaxation.create_calm_down_plan(profile)
        plan["calm_down_plan"] = calm_down
        
        return plan
