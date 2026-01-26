"""
SMART Goal Planner.

This module provides autonomous goal generation that creates personalized
SMART (Specific, Measurable, Achievable, Relevant, Time-bound) learning goals
adapted to individual learner needs and diagnoses.
"""

import logging
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional, Protocol
import uuid

from pydantic import BaseModel, Field

from .models import (
    GoalDomain,
    GoalStatus,
    LearnerContext,
    LearningGoal,
    MeasurementFrequency,
    Milestone,
    SMARTCriteria,
    WeeklyActionPlan,
    WeeklyActivity,
    generate_id,
)
from .adaptations import (
    AdaptedGoal,
    BaseGoal,
    DiagnosisAdaptationEngine,
    DiagnosisAdaptationConfig,
)

logger = logging.getLogger(__name__)


class LLMClient(Protocol):
    """Protocol for LLM client interface."""

    async def generate(self, prompt: str, **kwargs) -> str:
        """Generate text from prompt."""
        ...

    async def generate_json(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Generate structured JSON from prompt."""
        ...


@dataclass
class StateAnalysis:
    """Analysis of learner's current state in a domain."""

    learner_id: str
    domain: GoalDomain
    current_level: str
    current_level_numeric: float  # 0-1 scale
    recent_performance: float  # 0-1 scale
    trend: str  # "improving", "stable", "declining"
    strengths: List[str]
    gaps: List[str]
    recommended_focus: str
    confidence: float  # Confidence in this analysis 0-1


@dataclass
class GoalPlannerConfig:
    """Configuration for the goal planner."""

    default_goal_duration_weeks: int = 12
    milestones_per_goal: int = 4
    max_concurrent_goals: int = 3
    min_milestone_duration_weeks: int = 2
    max_milestone_duration_weeks: int = 4
    review_frequency_weeks: int = 2
    default_measurement_frequency: MeasurementFrequency = MeasurementFrequency.WEEKLY
    smart_score_threshold: float = 0.8
    enable_llm_generation: bool = True
    fallback_to_templates: bool = True


class GoalTemplates:
    """
    Template-based goal generation for when LLM is unavailable.

    Provides structured templates for common goal types that can be
    customized with learner-specific information.
    """

    DOMAIN_TEMPLATES: Dict[GoalDomain, Dict[str, Any]] = {
        GoalDomain.READING: {
            "goal_format": (
                "By {target_date}, {learner_name} will {target_skill} "
                "as measured by {measurement}, improving from {baseline} "
                "to {target}."
            ),
            "target_skills": [
                "read grade-level text with fluency",
                "demonstrate comprehension of informational text",
                "identify main idea and supporting details",
                "use context clues to determine word meaning",
                "make inferences based on textual evidence",
            ],
            "measurements": [
                "oral reading fluency assessment",
                "reading comprehension assessment",
                "curriculum-based measurement",
                "running records",
            ],
            "baseline_formats": [
                "{value} words correct per minute",
                "{value}% accuracy on comprehension questions",
                "reading at {grade} grade level",
            ],
        },
        GoalDomain.WRITING: {
            "goal_format": (
                "By {target_date}, {learner_name} will {target_skill} "
                "as measured by {measurement}, improving from {baseline} "
                "to {target}."
            ),
            "target_skills": [
                "write a coherent paragraph with topic sentence and supporting details",
                "use grade-appropriate spelling and grammar",
                "organize ideas using a planning strategy",
                "write complete sentences with correct punctuation",
                "revise and edit written work using a checklist",
            ],
            "measurements": [
                "writing rubric scoring",
                "curriculum-based writing assessment",
                "writing sample analysis",
            ],
        },
        GoalDomain.MATH: {
            "goal_format": (
                "By {target_date}, {learner_name} will {target_skill} "
                "as measured by {measurement}, improving from {baseline} "
                "to {target}."
            ),
            "target_skills": [
                "solve multi-step word problems",
                "demonstrate fluency with basic math facts",
                "apply fraction concepts to real-world situations",
                "use place value understanding for operations",
                "interpret and create graphs and charts",
            ],
            "measurements": [
                "curriculum-based math assessment",
                "timed fact fluency probe",
                "problem-solving assessment",
            ],
        },
        GoalDomain.SOCIAL_EMOTIONAL: {
            "goal_format": (
                "By {target_date}, {learner_name} will {target_skill} "
                "as measured by {measurement}, improving from {baseline} "
                "to {target}."
            ),
            "target_skills": [
                "identify and express emotions appropriately",
                "use calming strategies when frustrated",
                "engage in cooperative play with peers",
                "follow classroom routines independently",
                "accept feedback without negative behaviors",
            ],
            "measurements": [
                "behavioral observation",
                "self-regulation checklist",
                "social skills rating scale",
            ],
        },
        GoalDomain.EXECUTIVE_FUNCTION: {
            "goal_format": (
                "By {target_date}, {learner_name} will {target_skill} "
                "as measured by {measurement}, improving from {baseline} "
                "to {target}."
            ),
            "target_skills": [
                "initiate tasks independently",
                "organize materials and workspace",
                "manage time using visual supports",
                "plan and complete multi-step tasks",
                "transition between activities smoothly",
            ],
            "measurements": [
                "executive function observation checklist",
                "task completion data",
                "independence rating scale",
            ],
        },
    }

    @classmethod
    def get_template(cls, domain: GoalDomain) -> Dict[str, Any]:
        """Get template for a domain."""
        return cls.DOMAIN_TEMPLATES.get(
            domain,
            cls.DOMAIN_TEMPLATES[GoalDomain.READING],  # Default fallback
        )


class GoalPlanner:
    """
    Autonomous SMART goal generation and planning.

    Generates personalized learning goals by:
    1. Analyzing learner state and history
    2. Identifying appropriate target levels
    3. Generating goal text with SMART criteria
    4. Applying diagnosis-specific adaptations
    5. Creating milestones and weekly plans
    """

    def __init__(
        self,
        config: Optional[GoalPlannerConfig] = None,
        llm_client: Optional[LLMClient] = None,
        adaptation_engine: Optional[DiagnosisAdaptationEngine] = None,
    ):
        """
        Initialize the goal planner.

        Args:
            config: Planner configuration
            llm_client: Optional LLM client for AI-generated content
            adaptation_engine: Engine for diagnosis-specific adaptations
        """
        self.config = config or GoalPlannerConfig()
        self.llm = llm_client
        self.adaptations = adaptation_engine or DiagnosisAdaptationEngine()
        logger.info("Initialized GoalPlanner")

    async def generate_goal(
        self,
        learner_id: str,
        domain: GoalDomain,
        context: LearnerContext,
        custom_target: Optional[str] = None,
        duration_weeks: Optional[int] = None,
    ) -> LearningGoal:
        """
        Generate a complete SMART goal for a learner.

        Args:
            learner_id: Unique learner identifier
            domain: Learning domain for the goal
            context: Learner context with diagnoses and preferences
            custom_target: Optional custom target to use
            duration_weeks: Optional custom duration

        Returns:
            Complete LearningGoal with milestones and weekly plans
        """
        logger.info(f"Generating {domain.value} goal for learner {learner_id}")

        # Step 1: Analyze learner state
        state_analysis = await self._analyze_learner_state(
            learner_id, domain, context
        )

        # Step 2: Determine appropriate target
        target = custom_target or self._determine_target(state_analysis, context)

        # Step 3: Generate base goal
        base_goal = await self._generate_goal_text(domain, state_analysis, target)

        # Step 4: Apply adaptations for diagnoses
        adapted_goal = await self.adaptations.adapt_goal(
            base_goal, context.diagnoses, context.accommodations
        )

        # Step 5: Calculate dates
        goal_duration = duration_weeks or adapted_goal.duration_weeks
        start_date = date.today()
        target_date = start_date + timedelta(weeks=goal_duration)
        review_dates = self._generate_review_dates(start_date, target_date)

        # Step 6: Create milestones
        milestones = await self._create_milestones(
            adapted_goal, state_analysis, start_date, target_date
        )

        # Step 7: Generate weekly action plans
        weekly_plans = await self._generate_weekly_plans(
            adapted_goal, milestones, context, start_date, goal_duration
        )

        # Step 8: Build SMART criteria
        smart_criteria = self._build_smart_criteria(
            adapted_goal, state_analysis, target_date
        )

        # Create the learning goal
        goal = LearningGoal(
            goal_id=generate_id(),
            learner_id=learner_id,
            domain=domain,
            goal_text=adapted_goal.text,
            rationale=adapted_goal.rationale,
            smart_criteria=smart_criteria,
            baseline=state_analysis.current_level,
            target=target,
            measurement_method=adapted_goal.measurement_method,
            measurement_frequency=self.config.default_measurement_frequency,
            start_date=start_date,
            target_date=target_date,
            review_dates=review_dates,
            milestones=milestones,
            weekly_actions=weekly_plans,
            diagnosis_adaptations=adapted_goal.adaptations,
            accommodations=context.accommodations + adapted_goal.accommodations,
            status=GoalStatus.DRAFT,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        logger.info(
            f"Generated goal {goal.goal_id} with {len(milestones)} milestones, "
            f"SMART score: {smart_criteria.overall_score:.2f}"
        )

        return goal

    async def _analyze_learner_state(
        self,
        learner_id: str,
        domain: GoalDomain,
        context: LearnerContext,
    ) -> StateAnalysis:
        """
        Analyze learner's current state from multiple sources.

        Sources include:
        - Recent assessment results
        - Progress on existing goals
        - Teacher observations
        - IEP present levels
        - Cognitive state history
        """
        # Get present level from context if available
        present_level = context.present_levels.get(domain.value, "")

        # Determine numeric level based on grade and context
        if present_level:
            numeric_level = self._parse_level_to_numeric(present_level)
        else:
            # Default based on grade level
            numeric_level = min(0.5, context.grade_level / 12)

        # Analyze strengths and gaps
        domain_strengths = [
            s for s in context.strengths if domain.value.lower() in s.lower()
        ]
        domain_challenges = [
            c for c in context.challenges if domain.value.lower() in c.lower()
        ]

        # Determine trend (would be from actual data in production)
        trend = "stable"
        recent_performance = numeric_level

        # Recommend focus area
        if domain_challenges:
            recommended_focus = domain_challenges[0]
        else:
            recommended_focus = f"Grade {context.grade_level} {domain.value} skills"

        return StateAnalysis(
            learner_id=learner_id,
            domain=domain,
            current_level=present_level or f"Grade {context.grade_level} baseline",
            current_level_numeric=numeric_level,
            recent_performance=recent_performance,
            trend=trend,
            strengths=domain_strengths,
            gaps=domain_challenges,
            recommended_focus=recommended_focus,
            confidence=0.75 if present_level else 0.5,
        )

    def _parse_level_to_numeric(self, level_text: str) -> float:
        """Parse text level description to numeric 0-1 scale."""
        level_lower = level_text.lower()

        # Check for percentage
        if "%" in level_text:
            try:
                pct = int("".join(filter(str.isdigit, level_text.split("%")[0])))
                return pct / 100
            except ValueError:
                pass

        # Check for grade level
        if "grade" in level_lower:
            try:
                grade = int("".join(filter(str.isdigit, level_text)))
                return min(1.0, grade / 12)
            except ValueError:
                pass

        # Check for descriptive levels
        level_map = {
            "significantly below": 0.2,
            "below grade": 0.35,
            "approaching": 0.45,
            "at grade": 0.6,
            "meets": 0.7,
            "proficient": 0.75,
            "above grade": 0.85,
            "exceeds": 0.9,
            "advanced": 0.95,
        }

        for key, value in level_map.items():
            if key in level_lower:
                return value

        return 0.5  # Default middle value

    def _determine_target(
        self, state: StateAnalysis, context: LearnerContext
    ) -> str:
        """Determine appropriate target level based on state analysis."""
        current = state.current_level_numeric

        # Calculate target improvement
        # Consider diagnoses and learning pace
        base_improvement = 0.15  # 15% improvement target

        # Adjust based on context
        if context.diagnoses:
            # More conservative targets for learners with diagnoses
            base_improvement *= 0.8

        if state.trend == "improving":
            base_improvement *= 1.1
        elif state.trend == "declining":
            base_improvement *= 0.8

        target_numeric = min(1.0, current + base_improvement)

        # Convert to text
        if target_numeric >= 0.9:
            return "Advanced level proficiency"
        elif target_numeric >= 0.75:
            return "Proficient level"
        elif target_numeric >= 0.6:
            return "At grade level"
        elif target_numeric >= 0.45:
            return "Approaching grade level"
        else:
            return "Building foundational skills"

    async def _generate_goal_text(
        self,
        domain: GoalDomain,
        state: StateAnalysis,
        target: str,
    ) -> BaseGoal:
        """Generate goal text using templates or LLM."""
        template = GoalTemplates.get_template(domain)

        if (
            self.config.enable_llm_generation
            and self.llm
            and not self.config.fallback_to_templates
        ):
            # Use LLM for generation
            return await self._generate_goal_with_llm(domain, state, target)

        # Use template-based generation
        target_skill = template["target_skills"][0]  # Would be selected based on gaps
        measurement = template["measurements"][0]

        goal_text = (
            f"The learner will {target_skill} "
            f"as measured by {measurement}, "
            f"improving from current level ({state.current_level}) "
            f"to {target}."
        )

        return BaseGoal(
            text=goal_text,
            domain=domain.value,
            baseline=state.current_level,
            target=target,
            duration_weeks=self.config.default_goal_duration_weeks,
            measurement_method=measurement,
            measurement_frequency="weekly",
            milestones_count=self.config.milestones_per_goal,
        )

    async def _generate_goal_with_llm(
        self,
        domain: GoalDomain,
        state: StateAnalysis,
        target: str,
    ) -> BaseGoal:
        """Generate goal using LLM (when available)."""
        prompt = f"""Generate a SMART learning goal for:
Domain: {domain.value}
Current Level: {state.current_level}
Target Level: {target}
Gaps: {', '.join(state.gaps) if state.gaps else 'General skill development'}
Recommended Focus: {state.recommended_focus}

The goal should be:
- Specific: Clear and well-defined
- Measurable: Include how progress will be measured
- Achievable: Realistic for the learner
- Relevant: Connected to their needs
- Time-bound: Include timeline

Return as JSON with fields: text, measurement_method, measurement_frequency
"""
        try:
            result = await self.llm.generate_json(prompt)
            return BaseGoal(
                text=result.get("text", ""),
                domain=domain.value,
                baseline=state.current_level,
                target=target,
                duration_weeks=self.config.default_goal_duration_weeks,
                measurement_method=result.get("measurement_method", ""),
                measurement_frequency=result.get("measurement_frequency", "weekly"),
            )
        except Exception as e:
            logger.warning(f"LLM generation failed, using templates: {e}")
            return await self._generate_goal_text(domain, state, target)

    def _generate_review_dates(
        self, start_date: date, target_date: date
    ) -> List[date]:
        """Generate review dates at regular intervals."""
        reviews = []
        current = start_date + timedelta(weeks=self.config.review_frequency_weeks)
        while current < target_date:
            reviews.append(current)
            current += timedelta(weeks=self.config.review_frequency_weeks)
        return reviews

    async def _create_milestones(
        self,
        goal: AdaptedGoal,
        state: StateAnalysis,
        start_date: date,
        target_date: date,
    ) -> List[Milestone]:
        """
        Create progression milestones.

        Breaks goal into achievable chunks with:
        - Realistic timelines
        - Clear success criteria
        - Account for learning curve
        """
        total_days = (target_date - start_date).days
        num_milestones = self.config.milestones_per_goal
        days_per_milestone = total_days // num_milestones

        milestones = []
        progress_increment = 100 / num_milestones

        for i in range(num_milestones):
            sequence = i + 1
            milestone_start = start_date + timedelta(days=i * days_per_milestone)
            milestone_end = (
                start_date + timedelta(days=(i + 1) * days_per_milestone - 1)
                if i < num_milestones - 1
                else target_date
            )

            # Generate milestone description based on sequence
            title, description, criteria = self._generate_milestone_content(
                goal, sequence, num_milestones, state
            )

            milestone = Milestone(
                milestone_id=generate_id(),
                goal_id="",  # Will be set when goal is created
                sequence=sequence,
                title=title,
                description=description,
                success_criteria=criteria,
                target_date=milestone_end,
                status=GoalStatus.ACTIVE if i == 0 else GoalStatus.DRAFT,
            )

            milestones.append(milestone)

        return milestones

    def _generate_milestone_content(
        self,
        goal: AdaptedGoal,
        sequence: int,
        total: int,
        state: StateAnalysis,
    ) -> tuple[str, str, List[str]]:
        """Generate title, description, and criteria for a milestone."""
        # Phase descriptions
        phases = {
            1: ("Foundation", "Build foundational understanding", "demonstrates basic"),
            2: ("Development", "Develop core skills", "applies concepts"),
            3: ("Practice", "Practice and strengthen skills", "uses independently"),
            4: ("Mastery", "Achieve mastery", "consistently demonstrates"),
        }

        if sequence <= len(phases):
            phase = phases[sequence]
        else:
            phase = phases[min(sequence, 4)]

        title = f"Milestone {sequence}: {phase[0]}"
        description = (
            f"{phase[1]} in {goal.domain}. "
            f"Progress from previous milestone toward target: {goal.target}"
        )

        # Generate success criteria
        criteria = [
            f"Learner {phase[2]} understanding {int(sequence * 100 / total)}% of target skills",
            f"Completes {80 + (sequence * 5)}% of assigned activities",
            "Shows engagement in learning activities",
        ]

        if sequence == total:
            criteria.append(f"Achieves target: {goal.target}")

        return title, description, criteria

    async def _generate_weekly_plans(
        self,
        goal: AdaptedGoal,
        milestones: List[Milestone],
        context: LearnerContext,
        start_date: date,
        duration_weeks: int,
    ) -> List[WeeklyActionPlan]:
        """
        Generate weekly action plans with scaffolding.

        Creates structured weekly plans that:
        - Align with milestone progression
        - Include appropriate scaffolds
        - Incorporate parent involvement
        - Add check-in prompts
        """
        weekly_plans = []

        for week in range(1, duration_weeks + 1):
            week_start = start_date + timedelta(weeks=week - 1)

            # Determine which milestone this week falls under
            current_milestone = self._get_milestone_for_week(
                milestones, week, duration_weeks
            )

            # Generate focus area
            focus_area = self._get_weekly_focus(
                goal.domain, week, duration_weeks, current_milestone
            )

            # Generate activities
            activities = self._generate_weekly_activities(
                goal, context, week, focus_area
            )

            # Get scaffolds from adaptations
            scaffolds = goal.scaffolds[: min(5, len(goal.scaffolds))]

            # Generate success indicators
            success_indicators = [
                f"Complete {len(activities)} planned activities",
                f"Demonstrate progress toward {focus_area}",
                "Engage positively in learning sessions",
            ]

            # Parent involvement suggestions
            parent_involvement = self._get_parent_involvement(goal.domain, week)

            # Check-in prompts
            check_in_prompts = [
                "What did you learn this week?",
                "What was challenging?",
                "What are you proud of?",
                "What would you like to work on next?",
            ]

            plan = WeeklyActionPlan(
                plan_id=generate_id(),
                goal_id="",  # Will be set when goal is created
                week_number=week,
                week_start_date=week_start,
                focus_area=focus_area,
                theme=f"Week {week}: {focus_area}",
                activities=activities,
                scaffolds=scaffolds,
                success_indicators=success_indicators,
                parent_involvement=parent_involvement,
                check_in_prompts=check_in_prompts,
                adaptations_applied=list(goal.adaptations.keys()),
            )

            weekly_plans.append(plan)

        return weekly_plans

    def _get_milestone_for_week(
        self,
        milestones: List[Milestone],
        week: int,
        total_weeks: int,
    ) -> Optional[Milestone]:
        """Determine which milestone a week falls under."""
        if not milestones:
            return None

        weeks_per_milestone = total_weeks / len(milestones)
        milestone_index = min(
            int((week - 1) / weeks_per_milestone), len(milestones) - 1
        )
        return milestones[milestone_index]

    def _get_weekly_focus(
        self,
        domain: str,
        week: int,
        total_weeks: int,
        milestone: Optional[Milestone],
    ) -> str:
        """Determine focus area for a specific week."""
        progress_pct = (week / total_weeks) * 100

        if progress_pct <= 25:
            phase = "Building foundations"
        elif progress_pct <= 50:
            phase = "Developing skills"
        elif progress_pct <= 75:
            phase = "Practicing independently"
        else:
            phase = "Achieving mastery"

        if milestone:
            return f"{phase} - {milestone.title}"
        return f"{phase} in {domain}"

    def _generate_weekly_activities(
        self,
        goal: AdaptedGoal,
        context: LearnerContext,
        week: int,
        focus_area: str,
    ) -> List[WeeklyActivity]:
        """Generate activities for a week based on goal and context."""
        activities = []

        # Activity templates based on domain
        activity_templates = {
            "reading": [
                ("Guided Reading", "Practice reading with scaffolded support", 20),
                ("Vocabulary Building", "Learn new vocabulary in context", 15),
                ("Comprehension Practice", "Answer questions about text", 20),
            ],
            "writing": [
                ("Writing Workshop", "Work on writing skills with guidance", 25),
                ("Grammar Practice", "Practice grammar concepts", 15),
                ("Editing Skills", "Learn to revise and edit writing", 20),
            ],
            "math": [
                ("Concept Introduction", "Learn new math concepts", 20),
                ("Guided Practice", "Practice with support", 20),
                ("Problem Solving", "Apply skills to word problems", 20),
            ],
        }

        templates = activity_templates.get(
            goal.domain.lower(),
            [
                ("Skill Building", "Practice target skills", 20),
                ("Guided Practice", "Practice with support", 20),
                ("Independent Practice", "Practice independently", 15),
            ],
        )

        # Adjust duration based on attention span
        duration_multiplier = min(1.0, context.attention_span_minutes / 25)

        for title, description, base_duration in templates:
            adjusted_duration = max(10, int(base_duration * duration_multiplier))

            activity = WeeklyActivity(
                activity_id=generate_id(),
                title=title,
                description=f"{description} - Week {week}: {focus_area}",
                duration_minutes=adjusted_duration,
                skill_focus=[goal.domain, focus_area],
                modality=context.learning_style,
                difficulty_level=context.preferred_difficulty,
            )
            activities.append(activity)

        return activities

    def _get_parent_involvement(self, domain: str, week: int) -> List[str]:
        """Get parent involvement suggestions for a week."""
        base_suggestions = [
            "Review the week's activities with your child",
            "Celebrate progress and effort",
            "Provide a quiet space for learning activities",
        ]

        domain_suggestions = {
            "reading": [
                "Read together for 15-20 minutes daily",
                "Ask questions about what you read together",
                "Visit the library or find books on topics of interest",
            ],
            "writing": [
                "Encourage writing in daily life (lists, notes, journals)",
                "Model writing by writing together",
                "Praise effort and creativity, not just correctness",
            ],
            "math": [
                "Find math in everyday activities (cooking, shopping)",
                "Play math games together",
                "Talk about how you use math in your life",
            ],
        }

        return base_suggestions + domain_suggestions.get(domain.lower(), [])

    def _build_smart_criteria(
        self,
        goal: AdaptedGoal,
        state: StateAnalysis,
        target_date: date,
    ) -> SMARTCriteria:
        """Build SMART criteria from goal and analysis."""
        # Use pre-computed criteria from adaptation or generate new
        criteria_dict = goal.smart_criteria or {}

        return SMARTCriteria(
            specific_score=criteria_dict.get("specific_score", 0.85),
            specific_text=criteria_dict.get(
                "specific_text",
                f"Targets specific skills in {goal.domain}",
            ),
            measurable_score=criteria_dict.get("measurable_score", 0.9),
            measurable_text=criteria_dict.get(
                "measurable_text",
                f"Progress measured via {goal.measurement_method}",
            ),
            achievable_score=criteria_dict.get("achievable_score", 0.85),
            achievable_text=criteria_dict.get(
                "achievable_text",
                f"Based on current level: {state.current_level}",
            ),
            relevant_score=criteria_dict.get("relevant_score", 0.9),
            relevant_text=criteria_dict.get(
                "relevant_text",
                f"Addresses identified gaps in {goal.domain}",
            ),
            timebound_score=criteria_dict.get("timebound_score", 0.95),
            timebound_text=criteria_dict.get(
                "timebound_text",
                f"Target date: {target_date.isoformat()}",
            ),
        )

    async def generate_multiple_goals(
        self,
        learner_id: str,
        domains: List[GoalDomain],
        context: LearnerContext,
    ) -> List[LearningGoal]:
        """Generate goals for multiple domains."""
        if len(domains) > self.config.max_concurrent_goals:
            logger.warning(
                f"Requested {len(domains)} goals, limiting to {self.config.max_concurrent_goals}"
            )
            domains = domains[: self.config.max_concurrent_goals]

        goals = []
        for domain in domains:
            goal = await self.generate_goal(learner_id, domain, context)
            goals.append(goal)

        return goals

    async def suggest_domains(
        self, context: LearnerContext
    ) -> List[tuple[GoalDomain, float]]:
        """
        Suggest goal domains based on learner context.

        Returns list of (domain, priority_score) tuples sorted by priority.
        """
        suggestions = []

        for domain in GoalDomain:
            score = 0.5  # Base score

            # Boost if domain is in challenges
            if any(domain.value.lower() in c.lower() for c in context.challenges):
                score += 0.3

            # Boost if present level indicates need
            if domain.value in context.present_levels:
                level = context.present_levels[domain.value]
                if "below" in level.lower():
                    score += 0.2

            # Boost based on diagnoses
            if context.has_dyslexia and domain == GoalDomain.READING:
                score += 0.2
            if context.has_adhd and domain == GoalDomain.EXECUTIVE_FUNCTION:
                score += 0.2
            if context.has_asd and domain == GoalDomain.SOCIAL_EMOTIONAL:
                score += 0.2

            suggestions.append((domain, min(1.0, score)))

        return sorted(suggestions, key=lambda x: x[1], reverse=True)

    def validate_goal(self, goal: LearningGoal) -> Dict[str, Any]:
        """
        Validate a goal meets SMART criteria requirements.

        Returns validation results with any issues found.
        """
        issues = []

        # Check SMART score
        if goal.smart_criteria.overall_score < self.config.smart_score_threshold:
            weakest, score = goal.smart_criteria.get_weakest_criterion()
            issues.append(
                f"SMART score ({goal.smart_criteria.overall_score:.2f}) "
                f"below threshold. Weakest: {weakest} ({score:.2f})"
            )

        # Check milestones
        if len(goal.milestones) < 2:
            issues.append("Goal should have at least 2 milestones")

        # Check timeline
        if goal.duration_weeks < 4:
            issues.append("Goal duration should be at least 4 weeks")

        # Check measurement
        if not goal.measurement_method:
            issues.append("Goal must have a measurement method")

        return {
            "is_valid": len(issues) == 0,
            "smart_score": goal.smart_criteria.overall_score,
            "issues": issues,
            "goal_id": goal.goal_id,
        }


def create_goal_planner(
    config: Optional[GoalPlannerConfig] = None,
    llm_client: Optional[LLMClient] = None,
    adaptation_config: Optional[DiagnosisAdaptationConfig] = None,
) -> GoalPlanner:
    """Factory function to create a goal planner."""
    adaptation_engine = DiagnosisAdaptationEngine(adaptation_config)
    return GoalPlanner(config, llm_client, adaptation_engine)
