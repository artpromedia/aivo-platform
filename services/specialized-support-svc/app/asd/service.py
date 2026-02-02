"""
Main ASD Support Service.

Orchestrates all ASD support features including sensory support,
routine management, social scaffolding, and communication support.
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Protocol

from .models import (
    ASDProfile,
    CommunicationPreference,
    CommunicationStyle,
    RoutineSchedule,
    SensoryDomain,
    SensoryProfile,
    SensoryResponse,
    SocialScript,
    SocialSituation,
    SpecialInterest,
    InterestIntensity,
    SupportRequest,
    SupportResponse,
    TransitionPlan,
)
from .sensory_support import SensorySupportService
from .routine_manager import RoutineManagerService
from .social_scaffolding import SocialScaffoldingService

logger = logging.getLogger(__name__)


class LLMClient(Protocol):
    """Protocol for LLM client interface."""

    async def generate(
        self,
        prompt: str,
        temperature: float = 0.3,
        max_tokens: int = 1000,
    ) -> str:
        """Generate text from a prompt."""
        ...


class ASDProfileRepository(Protocol):
    """Protocol for ASD profile storage interface."""

    async def get_profile(self, learner_id: str) -> Optional[ASDProfile]:
        """Get ASD profile for a learner."""
        ...

    async def save_profile(self, profile: ASDProfile) -> None:
        """Save ASD profile for a learner."""
        ...


class InMemoryASDProfileRepository:
    """In-memory implementation of profile repository for testing/development."""

    def __init__(self) -> None:
        self._profiles: Dict[str, ASDProfile] = {}

    async def get_profile(self, learner_id: str) -> Optional[ASDProfile]:
        """Get ASD profile for a learner."""
        return self._profiles.get(learner_id)

    async def save_profile(self, profile: ASDProfile) -> None:
        """Save ASD profile for a learner."""
        self._profiles[profile.learner_id] = profile


class ASDSupportService:
    """
    Main ASD AI support service.

    Provides a unified interface for all ASD support features:
    - Sensory accommodations and regulation strategies
    - Routine management and visual schedules
    - Social skill scaffolding and scripts
    - Communication supports and adaptations
    - Transition planning and change preparation
    """

    def __init__(
        self,
        llm_client: Optional[LLMClient] = None,
        profile_repository: Optional[ASDProfileRepository] = None,
    ):
        """
        Initialize the ASD AI service.

        Args:
            llm_client: Optional LLM client for AI-powered features.
                       Service gracefully degrades when unavailable.
            profile_repository: Repository for storing/retrieving ASD profiles.
        """
        self.llm = llm_client
        self.profile_repo = profile_repository or InMemoryASDProfileRepository()

        # Initialize component services
        self.sensory_support = SensorySupportService(llm_client=llm_client)
        self.routine_manager = RoutineManagerService(llm_client=llm_client)
        self.social_scaffolding = SocialScaffoldingService(llm_client=llm_client)

        # Default profile for learners without custom profiles
        self._default_profile = ASDProfile(
            learner_id="default",
            sensory_profiles=[
                SensoryProfile(
                    domain=SensoryDomain.AUDITORY,
                    response_type=SensoryResponse.TYPICAL,
                ),
            ],
            communication=CommunicationPreference(
                preferred_style=CommunicationStyle.COMBINED,
                processing_time_needed=5,
                prefers_direct_language=True,
                visual_supports_helpful=True,
            ),
        )

        logger.info("ASDSupportService initialized")

    async def get_support(
        self,
        learner_id: str,
        support_type: str,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Main entry point for ASD support.

        Support types:
        - sensory_accommodations: Get sensory accommodations
        - sensory_regulation: Get regulation strategies
        - routine_planning: Create visual schedules
        - transition_support: Get transition planning help
        - social_script: Get social scripts
        - communication_support: Get communication adaptations
        - change_preparation: Prepare for routine changes

        Args:
            learner_id: ID of the learner
            support_type: Type of support requested
            context: Context-specific data for the request

        Returns:
            Dictionary containing the support response

        Raises:
            ValueError: If support_type is not recognized
        """
        # Get or create profile
        profile = await self.profile_repo.get_profile(learner_id)
        if not profile:
            profile = ASDProfile(
                learner_id=learner_id,
                sensory_profiles=self._default_profile.sensory_profiles.copy(),
                communication=self._default_profile.communication,
            )
            await self.profile_repo.save_profile(profile)

        # Route to appropriate handler
        handlers = {
            "sensory_accommodations": self._handle_sensory_accommodations,
            "sensory_regulation": self._handle_sensory_regulation,
            "routine_planning": self._handle_routine_planning,
            "transition_support": self._handle_transition_support,
            "social_script": self._handle_social_script,
            "communication_support": self._handle_communication_support,
            "change_preparation": self._handle_change_preparation,
            "environment_assessment": self._handle_environment_assessment,
            "social_preparation": self._handle_social_preparation,
        }

        handler = handlers.get(support_type)
        if not handler:
            raise ValueError(
                f"Unknown support type: {support_type}. "
                f"Valid types: {list(handlers.keys())}"
            )

        return await handler(profile, context)

    async def _handle_sensory_accommodations(
        self,
        profile: ASDProfile,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Handle sensory accommodations request."""
        accommodations = await self.sensory_support.get_accommodations(
            profile=profile,
            context=context,
        )
        
        return {
            "support_type": "sensory_accommodations",
            "accommodations": accommodations,
            "profile_domains": [
                p.domain.value for p in profile.sensory_profiles
            ],
        }

    async def _handle_sensory_regulation(
        self,
        profile: ASDProfile,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Handle sensory regulation request."""
        current_state = context.get("current_state", "neutral")
        
        strategies = await self.sensory_support.get_regulation_strategies(
            profile=profile,
            current_state=current_state,
        )
        
        # Also plan sensory breaks if duration provided
        breaks = []
        if "session_duration" in context:
            breaks = await self.sensory_support.plan_sensory_breaks(
                profile=profile,
                session_duration_minutes=context["session_duration"],
            )
        
        return {
            "support_type": "sensory_regulation",
            "current_state": current_state,
            "strategies": strategies,
            "planned_breaks": breaks,
        }

    async def _handle_routine_planning(
        self,
        profile: ASDProfile,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Handle routine planning request."""
        activities = context.get("activities", [])
        include_transitions = context.get("include_transitions", True)
        
        schedule = await self.routine_manager.create_visual_schedule(
            profile=profile,
            activities=activities,
            include_transitions=include_transitions,
        )
        
        return {
            "support_type": "routine_planning",
            **schedule,
        }

    async def _handle_transition_support(
        self,
        profile: ASDProfile,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Handle transition support request."""
        from_activity = context.get("from_activity", "current")
        to_activity = context.get("to_activity", "next")
        transition_type = context.get("transition_type", "activity")
        
        plan = await self.routine_manager.create_transition_plan(
            profile=profile,
            from_activity=from_activity,
            to_activity=to_activity,
            transition_type=transition_type,
        )
        
        return {
            "support_type": "transition_support",
            "plan": {
                "from": plan.from_activity,
                "to": plan.to_activity,
                "type": plan.transition_type.value,
                "warning_times": plan.warning_times,
                "steps": plan.steps,
                "visual_timers": plan.visual_timers,
            },
        }

    async def _handle_social_script(
        self,
        profile: ASDProfile,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Handle social script request."""
        situation = context.get("situation", "one_on_one")
        script_type = context.get("script_type", "greeting")
        
        # Convert string to enum if needed
        if isinstance(situation, str):
            situation = SocialSituation(situation)
        
        script = await self.social_scaffolding.get_social_script(
            profile=profile,
            situation=situation,
            script_type=script_type,
        )
        
        return {
            "support_type": "social_script",
            "script": {
                "title": script.title,
                "situation": script.situation.value,
                "steps": script.steps,
                "expected_responses": script.expected_responses,
                "visual_supports": script.visual_supports,
                "practice_scenarios": script.practice_scenarios,
            },
        }

    async def _handle_communication_support(
        self,
        profile: ASDProfile,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Handle communication support request."""
        supports = await self.social_scaffolding.get_communication_supports(
            profile=profile,
            context=context,
        )
        
        return {
            "support_type": "communication_support",
            **supports,
        }

    async def _handle_change_preparation(
        self,
        profile: ASDProfile,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Handle change preparation request."""
        change_description = context.get("change", "upcoming change")
        timing = context.get("timing", "soon")
        severity = context.get("severity", "moderate")
        
        preparation = await self.routine_manager.prepare_for_change(
            profile=profile,
            change_description=change_description,
            change_timing=timing,
            severity=severity,
        )
        
        return {
            "support_type": "change_preparation",
            **preparation,
        }

    async def _handle_environment_assessment(
        self,
        profile: ASDProfile,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Handle environment assessment request."""
        environment = context.get("environment", {})
        
        assessment = await self.sensory_support.assess_environment(
            profile=profile,
            environment=environment,
        )
        
        return {
            "support_type": "environment_assessment",
            **assessment,
        }

    async def _handle_social_preparation(
        self,
        profile: ASDProfile,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Handle social situation preparation request."""
        situation = context.get("situation", "one_on_one")
        specific_context = context.get("description", "")
        
        # Convert string to enum if needed
        if isinstance(situation, str):
            situation = SocialSituation(situation)
        
        preparation = await self.social_scaffolding.prepare_for_social_situation(
            profile=profile,
            situation=situation,
            specific_context=specific_context,
        )
        
        return {
            "support_type": "social_preparation",
            **preparation,
        }

    async def update_profile(
        self,
        learner_id: str,
        updates: Dict[str, Any],
    ) -> ASDProfile:
        """
        Update a learner's ASD profile.

        Args:
            learner_id: ID of the learner
            updates: Dictionary of profile updates

        Returns:
            Updated ASDProfile
        """
        profile = await self.profile_repo.get_profile(learner_id)
        if not profile:
            profile = ASDProfile(learner_id=learner_id)

        # Apply updates
        if "sensory_profiles" in updates:
            profile.sensory_profiles = [
                SensoryProfile(**sp) if isinstance(sp, dict) else sp
                for sp in updates["sensory_profiles"]
            ]
        
        if "special_interests" in updates:
            profile.special_interests = [
                SpecialInterest(**si) if isinstance(si, dict) else si
                for si in updates["special_interests"]
            ]
        
        if "communication" in updates:
            comm_data = updates["communication"]
            profile.communication = CommunicationPreference(
                **comm_data
            ) if isinstance(comm_data, dict) else comm_data
        
        if "calming_strategies" in updates:
            profile.calming_strategies = updates["calming_strategies"]
        
        if "transition_strategies" in updates:
            profile.transition_strategies = updates["transition_strategies"]
        
        if "social_comfort_levels" in updates:
            profile.social_comfort_levels = {
                SocialSituation(k) if isinstance(k, str) else k: v
                for k, v in updates["social_comfort_levels"].items()
            }

        profile.updated_at = datetime.now()
        await self.profile_repo.save_profile(profile)
        
        return profile

    async def get_profile(self, learner_id: str) -> Optional[ASDProfile]:
        """Get a learner's ASD profile."""
        return await self.profile_repo.get_profile(learner_id)

    async def leverage_special_interest(
        self,
        learner_id: str,
        learning_topic: str,
    ) -> Dict[str, Any]:
        """
        Find ways to connect learning to a learner's special interests.

        Args:
            learner_id: ID of the learner
            learning_topic: The topic being learned

        Returns:
            Suggestions for connecting to special interests
        """
        profile = await self.profile_repo.get_profile(learner_id)
        if not profile or not profile.special_interests:
            return {
                "has_interests": False,
                "suggestions": [
                    "Identify special interests to help with engagement",
                    "Ask the learner what topics they enjoy most",
                ],
            }

        suggestions = []
        relevant_interests = []

        for interest in profile.special_interests:
            if not interest.can_use_for_motivation:
                continue
                
            # Check for topic connections
            topic_lower = learning_topic.lower()
            interest_lower = interest.name.lower()
            
            # Direct connection
            if interest_lower in topic_lower or topic_lower in interest_lower:
                relevant_interests.append(interest)
                suggestions.append(
                    f"Direct connection: {interest.name} relates to {learning_topic}"
                )
            
            # Connection through related topics
            for related in interest.related_topics:
                if related.lower() in topic_lower:
                    relevant_interests.append(interest)
                    suggestions.append(
                        f"Connect through {related}: "
                        f"Use {interest.name} as a bridge to {learning_topic}"
                    )
                    break
            
            # Learning connections
            for connection in interest.learning_connections:
                if connection.lower() in topic_lower:
                    relevant_interests.append(interest)
                    suggestions.append(
                        f"Learning connection: {interest.name} can help with {connection}"
                    )
                    break

        # If no specific connections, suggest general approaches
        if not suggestions and profile.special_interests:
            top_interest = max(
                profile.special_interests,
                key=lambda i: {"intense": 3, "focused": 2, "moderate": 1, "mild": 0}.get(
                    i.intensity.value, 0
                ),
            )
            suggestions.append(
                f"Use {top_interest.name} as a reward for completing {learning_topic}"
            )
            suggestions.append(
                f"Create examples using {top_interest.name} themes"
            )

        return {
            "has_interests": True,
            "learning_topic": learning_topic,
            "relevant_interests": [i.name for i in relevant_interests],
            "suggestions": suggestions,
            "all_interests": [i.name for i in profile.special_interests],
        }
