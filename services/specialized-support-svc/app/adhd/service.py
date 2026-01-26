"""
Main ADHD AI Support Service.

Orchestrates all ADHD support features including project breakdown,
daily planning, executive function strategies, and focus/stuck help.
"""

import logging
from datetime import date, datetime, time
from typing import Any, Dict, List, Optional, Protocol, Union

from .daily_planner import DailyPlannerService
from .ef_strategies import EFStrategyLibrary
from .models import (
    ADHDProfile,
    DailySchedule,
    EFStrategy,
    EnergyLevel,
    ExecutiveFunctionDomain,
    FocusTime,
    MovementBreak,
    MovementBreakPreference,
    ProjectChunk,
    RegulationActivity,
    SupportRequest,
    Task,
    TimeBlock,
    generate_id,
)
from .project_breakdown import ProjectBreakdownConfig, ProjectBreakdownService

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


class ProfileRepository(Protocol):
    """Protocol for profile storage interface."""

    async def get_profile(self, learner_id: str) -> Optional[ADHDProfile]:
        """Get ADHD profile for a learner."""
        ...

    async def save_profile(self, profile: ADHDProfile) -> None:
        """Save ADHD profile for a learner."""
        ...


class InMemoryProfileRepository:
    """In-memory implementation of profile repository for testing/development."""

    def __init__(self) -> None:
        self._profiles: Dict[str, ADHDProfile] = {}

    async def get_profile(self, learner_id: str) -> Optional[ADHDProfile]:
        """Get ADHD profile for a learner."""
        return self._profiles.get(learner_id)

    async def save_profile(self, profile: ADHDProfile) -> None:
        """Save ADHD profile for a learner."""
        self._profiles[profile.learner_id] = profile


class ADHDAIService:
    """
    Main ADHD AI support service.

    Provides a unified interface for all ADHD support features:
    - Project breakdown into manageable chunks
    - Daily schedule generation with proper breaks
    - Executive function strategy recommendations
    - Focus help during work sessions
    - Stuck help when blocked on tasks
    """

    def __init__(
        self,
        llm_client: Optional[LLMClient] = None,
        profile_repository: Optional[ProfileRepository] = None,
        project_breakdown_config: Optional[ProjectBreakdownConfig] = None,
    ):
        """
        Initialize the ADHD AI service.

        Args:
            llm_client: Optional LLM client for AI-powered features.
                       Service gracefully degrades when unavailable.
            profile_repository: Repository for storing/retrieving ADHD profiles.
            project_breakdown_config: Configuration for project breakdown.
        """
        self.llm = llm_client
        self.profile_repo = profile_repository or InMemoryProfileRepository()

        # Initialize component services
        self.project_breakdown = ProjectBreakdownService(
            llm_client=llm_client,
            config=project_breakdown_config,
        )
        self.daily_planner = DailyPlannerService(llm_client=llm_client)
        self.ef_library = EFStrategyLibrary()

        # Default profile for learners without custom profiles
        self._default_profile = ADHDProfile(
            learner_id="default",
            optimal_focus_duration_minutes=25,
            break_duration_minutes=5,
            sessions_before_long_break=4,
            primary_ef_challenges=[
                ExecutiveFunctionDomain.TASK_INITIATION,
                ExecutiveFunctionDomain.TIME_MANAGEMENT,
            ],
        )

    async def get_support(
        self,
        learner_id: str,
        support_type: str,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Main entry point for ADHD support.

        Support types:
        - project_breakdown: Break a project into chunks
        - daily_planning: Generate a daily schedule
        - ef_strategies: Get executive function strategies
        - focus_help: Get help maintaining focus
        - stuck_help: Get help when stuck on a task

        Args:
            learner_id: ID of the learner
            support_type: Type of support requested
            context: Context-specific data for the request

        Returns:
            Dictionary containing the support response

        Raises:
            ValueError: If support_type is not recognized
        """
        profile = await self._get_profile(learner_id)

        if support_type == "project_breakdown":
            return await self._handle_project_breakdown(profile, context)

        elif support_type == "daily_planning":
            return await self._handle_daily_planning(learner_id, profile, context)

        elif support_type == "ef_strategies":
            return self._handle_ef_strategies(profile, context)

        elif support_type == "focus_help":
            return await self._handle_focus_help(profile, context)

        elif support_type == "stuck_help":
            return await self._handle_stuck_help(profile, context)

        else:
            raise ValueError(f"Unknown support type: {support_type}")

    async def _get_profile(self, learner_id: str) -> ADHDProfile:
        """Get profile for learner, creating default if needed."""
        profile = await self.profile_repo.get_profile(learner_id)

        if profile is None:
            # Create default profile for this learner
            profile = ADHDProfile(
                learner_id=learner_id,
                optimal_focus_duration_minutes=self._default_profile.optimal_focus_duration_minutes,
                break_duration_minutes=self._default_profile.break_duration_minutes,
                sessions_before_long_break=self._default_profile.sessions_before_long_break,
                primary_ef_challenges=list(self._default_profile.primary_ef_challenges),
            )
            await self.profile_repo.save_profile(profile)

        return profile

    async def _handle_project_breakdown(
        self,
        profile: ADHDProfile,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Handle project breakdown request."""
        project_description = context.get("project", "")
        deadline_str = context.get("deadline")
        subject_area = context.get("subject", "general")

        if not project_description:
            raise ValueError("Project description is required")

        # Parse deadline
        if isinstance(deadline_str, datetime):
            deadline = deadline_str
        elif isinstance(deadline_str, str):
            deadline = datetime.fromisoformat(deadline_str)
        else:
            # Default to 1 week from now
            deadline = datetime.now() + datetime.timedelta(days=7)

        chunks = await self.project_breakdown.breakdown_project(
            project_description=project_description,
            deadline=deadline,
            profile=profile,
            subject_area=subject_area,
        )

        time_estimate = self.project_breakdown.estimate_total_time(chunks, profile)

        return {
            "chunks": [chunk.model_dump() for chunk in chunks],
            "time_estimate": time_estimate,
            "profile_used": {
                "optimal_focus_minutes": profile.optimal_focus_duration_minutes,
                "break_minutes": profile.break_duration_minutes,
            },
        }

    async def _handle_daily_planning(
        self,
        learner_id: str,
        profile: ADHDProfile,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Handle daily planning request."""
        # Parse tasks
        tasks_data = context.get("tasks", [])
        tasks = []

        for task_data in tasks_data:
            if isinstance(task_data, Task):
                tasks.append(task_data)
            elif isinstance(task_data, dict):
                tasks.append(Task(**task_data))

        # Parse fixed commitments
        fixed_data = context.get("fixed_commitments", [])
        fixed_commitments = []

        for block_data in fixed_data:
            if isinstance(block_data, TimeBlock):
                fixed_commitments.append(block_data)
            elif isinstance(block_data, dict):
                fixed_commitments.append(TimeBlock(**block_data))

        # Parse date
        schedule_date = context.get("date")
        if isinstance(schedule_date, str):
            schedule_date = date.fromisoformat(schedule_date)
        elif schedule_date is None:
            schedule_date = date.today()

        schedule = await self.daily_planner.generate_schedule(
            learner_id=learner_id,
            profile=profile,
            tasks=tasks,
            fixed_commitments=fixed_commitments,
            schedule_date=schedule_date,
        )

        return {
            "schedule": schedule.model_dump(),
            "summary": self.daily_planner.get_schedule_summary(schedule),
        }

    def _handle_ef_strategies(
        self,
        profile: ADHDProfile,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Handle executive function strategies request."""
        challenge = context.get("challenge", "")
        domain_str = context.get("domain")
        max_strategies = context.get("max_strategies", 5)

        strategies = []

        if domain_str:
            # Get strategies for specific domain
            try:
                domain = ExecutiveFunctionDomain(domain_str)
                strategies = self.ef_library.get_strategies_for_domain(domain)
            except ValueError:
                logger.warning(f"Invalid domain: {domain_str}")

        if challenge and not strategies:
            # Get personalized strategies based on challenge
            strategies = self.ef_library.get_personalized_strategies(
                profile=profile,
                current_challenge=challenge,
                max_strategies=max_strategies,
            )

        if not strategies:
            # Return strategies for primary challenges
            for domain in profile.primary_ef_challenges:
                domain_strategies = self.ef_library.get_strategies_for_domain(domain)
                strategies.extend(domain_strategies)

        return {
            "strategies": [s.model_dump() for s in strategies[:max_strategies]],
            "challenge_addressed": challenge,
            "profile_challenges": [d.value for d in profile.primary_ef_challenges],
        }

    async def _handle_focus_help(
        self,
        profile: ADHDProfile,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Handle focus help request during a work session.

        Provides real-time support for maintaining focus.
        """
        current_task = context.get("current_task", "your task")
        minutes_elapsed = context.get("minutes_elapsed", 0)
        focus_quality = context.get("focus_quality", "unknown")
        distraction_type = context.get("distraction_type")

        response = {
            "suggestions": [],
            "movement_break": None,
            "regulation_activity": None,
            "encouragement": "",
        }

        # Check if it's time for a break
        if minutes_elapsed >= profile.optimal_focus_duration_minutes:
            response["suggestions"].append(
                f"You've been focused for {minutes_elapsed} minutes - great work! "
                f"Take a {profile.break_duration_minutes}-minute break."
            )
            response["movement_break"] = self._get_recommended_break(profile).model_dump()

        # Handle low focus quality
        elif focus_quality == "low" or focus_quality == "struggling":
            response["suggestions"].extend([
                "Take a 2-minute movement break to reset",
                "Change your position or location if possible",
                "Put on focus music or white noise",
            ])

            # Offer regulation activity
            response["regulation_activity"] = self.ef_library.get_regulation_activities(
                emotional_state="stuck",
                max_duration=3,
            )[0].model_dump() if self.ef_library.get_regulation_activities(
                emotional_state="stuck",
                max_duration=3,
            ) else None

        # Handle specific distraction types
        if distraction_type:
            distraction_strategies = self._get_distraction_strategies(distraction_type)
            response["suggestions"].extend(distraction_strategies)

        # Add encouragement
        response["encouragement"] = await self._generate_encouragement(
            profile, current_task, minutes_elapsed
        )

        return response

    async def _handle_stuck_help(
        self,
        profile: ADHDProfile,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Handle request for help when stuck on a task.

        Provides strategies to get unstuck and re-engage with work.
        """
        task = context.get("task", "your task")
        stuck_reason = context.get("reason", "unknown")
        minutes_stuck = context.get("minutes_stuck", 0)

        response = {
            "immediate_action": "",
            "strategies": [],
            "alternative_approaches": [],
            "should_take_break": False,
            "break_activity": None,
        }

        # If stuck for too long, suggest a break first
        if minutes_stuck > 10:
            response["should_take_break"] = True
            response["break_activity"] = self._get_recommended_break(profile).model_dump()
            response["immediate_action"] = (
                "You've been stuck for a while. Step away for 5 minutes - "
                "your brain needs a reset. When you come back, start with "
                "the smallest possible action."
            )
        else:
            # Get task initiation strategies
            init_strategies = self.ef_library.get_strategies_for_domain(
                ExecutiveFunctionDomain.TASK_INITIATION
            )
            response["strategies"] = [s.model_dump() for s in init_strategies[:3]]

        # Provide specific help based on reason
        if "don't know" in stuck_reason.lower() or "where to start" in stuck_reason.lower():
            response["immediate_action"] = (
                f"For '{task}': What is the FIRST tiny physical action? "
                f"Not 'work on it' but something like 'open the document' or "
                f"'write the title'. Do ONLY that one tiny thing right now."
            )
            response["alternative_approaches"] = [
                "Start in the middle - you don't have to begin at the beginning",
                "Set a 2-minute timer and write anything, even if it's bad",
                "Talk out loud about what you're trying to do",
            ]

        elif "boring" in stuck_reason.lower():
            response["immediate_action"] = (
                "Make it a game: Set a timer for 10 minutes and see how much "
                "you can get done. Or pair it with something you enjoy (music, "
                "favorite drink)."
            )
            response["alternative_approaches"] = [
                "Break it into even smaller pieces - make each piece a tiny win",
                "Reward yourself after each chunk (not before!)",
                "Do the boring parts during your peak energy time",
            ]

        elif "hard" in stuck_reason.lower() or "difficult" in stuck_reason.lower():
            response["immediate_action"] = (
                "Complex tasks need more support. Try explaining the problem "
                "out loud or write down what's confusing you. Sometimes seeing "
                "the confusion helps clarify it."
            )
            response["alternative_approaches"] = [
                "Break the hard part into 3 smaller questions",
                "Start with the part you DO understand",
                "Ask for help or look up just ONE thing you need to know",
            ]

        elif "distracted" in stuck_reason.lower():
            response["immediate_action"] = (
                "Distraction defense: 1) Phone in another room, 2) Close all "
                "unnecessary tabs, 3) Tell yourself 'Just 10 more minutes'"
            )
            parking_lot_strategy = self.ef_library.get_strategy_by_id("imp_002")
            if parking_lot_strategy:
                response["strategies"].insert(0, parking_lot_strategy.model_dump())

        # Add LLM-generated advice if available
        if self.llm:
            try:
                llm_advice = await self._generate_stuck_advice(task, stuck_reason, profile)
                if llm_advice:
                    response["alternative_approaches"].append(llm_advice)
            except Exception as e:
                logger.warning(f"Failed to generate LLM stuck advice: {e}")

        return response

    def _get_recommended_break(self, profile: ADHDProfile) -> MovementBreak:
        """Get a movement break based on profile preferences."""
        breaks = self.ef_library.get_movement_breaks(
            preference=profile.movement_break_preference,
        )

        if breaks:
            # Return a break appropriate for the preference
            return breaks[0]

        # Fallback to any break
        all_breaks = self.ef_library.get_movement_breaks()
        return all_breaks[0] if all_breaks else MovementBreak(
            name="Quick Stretch",
            category=MovementBreakPreference.STRETCHING,
            duration_minutes=3,
            instructions=["Stand up", "Stretch arms overhead", "Roll shoulders"],
            energy_level=EnergyLevel.LOW,
        )

    def _get_distraction_strategies(self, distraction_type: str) -> List[str]:
        """Get strategies for specific distraction types."""
        strategies = {
            "phone": [
                "Put your phone in another room - not just face down",
                "Use an app blocker like Forest or Freedom",
                "Turn on Do Not Disturb mode",
            ],
            "internet": [
                "Use a website blocker for your top distraction sites",
                "Disconnect from WiFi if you don't need it",
                "Use the 'Parking Lot' technique - write down what you want to look up and check it during break",
            ],
            "thoughts": [
                "Write the distracting thought on a sticky note to address later",
                "Say 'not now' out loud and return to task",
                "Take 3 deep breaths to refocus",
            ],
            "noise": [
                "Use noise-canceling headphones",
                "Try brown noise or lo-fi study music",
                "Move to a quieter location if possible",
            ],
            "people": [
                "Use a 'Do Not Disturb' sign",
                "Communicate your focus time to others",
                "Find a private study space",
            ],
        }

        return strategies.get(distraction_type.lower(), [
            "Identify your distraction and remove it from your environment",
            "Set a specific end time for your focus session",
            "Use the Pomodoro technique - focused work with scheduled breaks",
        ])

    async def _generate_encouragement(
        self,
        profile: ADHDProfile,
        task: str,
        minutes_elapsed: int,
    ) -> str:
        """Generate personalized encouragement."""
        if self.llm:
            try:
                prompt = f"""Generate a brief (1 sentence), encouraging message for a student with ADHD
who has been working on "{task}" for {minutes_elapsed} minutes.
Be specific, warm, and acknowledge their effort. Don't be cheesy or over-the-top."""

                return await self.llm.generate(prompt, temperature=0.7, max_tokens=50)
            except Exception:
                pass

        # Fallback encouragement
        if minutes_elapsed >= 20:
            return f"Amazing focus for {minutes_elapsed} minutes! You're doing great."
        elif minutes_elapsed >= 10:
            return "Good progress! Keep going - you're building momentum."
        else:
            return "Great start! Remember: done is better than perfect."

    async def _generate_stuck_advice(
        self,
        task: str,
        reason: str,
        profile: ADHDProfile,
    ) -> Optional[str]:
        """Generate LLM-powered advice for being stuck."""
        challenges = ", ".join([d.value for d in profile.primary_ef_challenges])

        prompt = f"""A student with ADHD is stuck on: "{task}"
Reason they're stuck: {reason}
Their EF challenges: {challenges}

Give ONE specific, actionable suggestion to help them get unstuck.
Keep it to 1-2 sentences. Be concrete and practical."""

        try:
            return await self.llm.generate(prompt, temperature=0.5, max_tokens=100)
        except Exception as e:
            logger.warning(f"Failed to generate stuck advice: {e}")
            return None

    # Profile management methods

    async def create_profile(
        self,
        learner_id: str,
        profile_data: Dict[str, Any],
    ) -> ADHDProfile:
        """Create or update an ADHD profile for a learner."""
        profile = ADHDProfile(learner_id=learner_id, **profile_data)
        await self.profile_repo.save_profile(profile)
        return profile

    async def update_profile(
        self,
        learner_id: str,
        updates: Dict[str, Any],
    ) -> ADHDProfile:
        """Update specific fields in a learner's profile."""
        profile = await self._get_profile(learner_id)

        # Update fields
        for key, value in updates.items():
            if hasattr(profile, key):
                setattr(profile, key, value)

        await self.profile_repo.save_profile(profile)
        return profile

    async def get_profile(self, learner_id: str) -> ADHDProfile:
        """Get a learner's ADHD profile."""
        return await self._get_profile(learner_id)

    # Convenience methods for direct access

    async def breakdown_project(
        self,
        learner_id: str,
        project: str,
        deadline: datetime,
        subject: str = "general",
    ) -> List[ProjectChunk]:
        """Convenience method for project breakdown."""
        result = await self.get_support(
            learner_id=learner_id,
            support_type="project_breakdown",
            context={
                "project": project,
                "deadline": deadline,
                "subject": subject,
            },
        )
        return [ProjectChunk(**chunk) for chunk in result["chunks"]]

    async def generate_daily_schedule(
        self,
        learner_id: str,
        tasks: List[Task],
        schedule_date: Optional[date] = None,
    ) -> DailySchedule:
        """Convenience method for daily schedule generation."""
        result = await self.get_support(
            learner_id=learner_id,
            support_type="daily_planning",
            context={
                "tasks": [t.model_dump() for t in tasks],
                "date": schedule_date,
            },
        )
        return DailySchedule(**result["schedule"])

    def get_strategies(
        self,
        learner_id: str,
        challenge: str,
    ) -> List[EFStrategy]:
        """Synchronous convenience method for getting strategies."""
        # This is synchronous since ef_library doesn't need async
        profile = ADHDProfile(learner_id=learner_id)  # Use default
        return self.ef_library.get_personalized_strategies(
            profile=profile,
            current_challenge=challenge,
        )
