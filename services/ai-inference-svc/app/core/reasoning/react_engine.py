"""
ReAct (Reasoning + Acting) Reasoning Engine.

This module implements the ReAct pattern for transparent multi-step reasoning
with intervention decision making for AI-driven learning support.

The ReAct pattern follows a Thought -> Action -> Observation loop that enables:
1. Transparent reasoning traces for audit and explanation
2. Multi-step analysis of learner state
3. Evidence-based intervention decisions
"""

import asyncio
import json
import logging
import time
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Dict, List, Optional, Protocol

from .models import (
    Interaction,
    InterventionDecision,
    InterventionOutcome,
    InterventionType,
    LearnerContext,
    LearnerProfile,
    PerformanceMetrics,
    ReasoningConfig,
    ReasoningStep,
    ReasoningTrace,
    SessionReflection,
    UrgencyLevel,
)
from .strategies import TeachingStrategy, get_strategy_selector

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


class ReActReasoningEngine:
    """
    ReAct (Reasoning + Acting) pattern reasoning engine.

    Implements multi-step reasoning with intervention decision making
    for AI-driven learning support. Uses the ReAct pattern:

    Thought -> Action -> Observation -> Thought -> ...

    This enables transparent, auditable reasoning traces that can be
    reviewed and used to explain decisions.
    """

    def __init__(
        self,
        llm_client: LLMClient,
        config: Optional[ReasoningConfig] = None,
    ) -> None:
        """
        Initialize the ReAct reasoning engine.

        Args:
            llm_client: Client for LLM inference
            config: Configuration for reasoning behavior
        """
        self.llm_client = llm_client
        self.config = config or ReasoningConfig()
        self._strategy_selector = get_strategy_selector()
        self._intervention_history: Dict[str, List[InterventionDecision]] = {}
        self._session_start_times: Dict[str, datetime] = {}

    async def reason_about_learner_state(
        self,
        learner_context: LearnerContext,
        recent_interactions: List[Interaction],
        performance_metrics: PerformanceMetrics,
    ) -> ReasoningTrace:
        """
        Perform multi-step reasoning about current learner state.

        Uses the ReAct pattern to analyze the learner's current context,
        recent interactions, and performance metrics to understand
        their learning state and needs.

        Args:
            learner_context: Current context about the learner
            recent_interactions: Recent learning interactions
            performance_metrics: Aggregated performance metrics

        Returns:
            ReasoningTrace containing all reasoning steps and final analysis
        """
        start_time = time.time()
        steps: List[ReasoningStep] = []

        # Prepare context summary for reasoning
        context_summary = self._prepare_context_summary(
            learner_context, recent_interactions, performance_metrics
        )

        # Step 1: Initial assessment
        step1 = await self._reasoning_step(
            step_number=1,
            context=context_summary,
            previous_steps=steps,
            focus="Assess the learner's current engagement and emotional state based on recent interactions.",
        )
        steps.append(step1)

        # Check if we should continue reasoning
        if step1.confidence < self.config.min_confidence_threshold:
            # Step 2: Deeper analysis of performance patterns
            step2 = await self._reasoning_step(
                step_number=2,
                context=context_summary,
                previous_steps=steps,
                focus="Analyze performance patterns to identify struggling areas or misconceptions.",
            )
            steps.append(step2)

        # Step 3: Identify intervention need (if not already confident)
        if (
            len(steps) < self.config.max_reasoning_steps
            and steps[-1].confidence < 0.8
        ):
            step3 = await self._reasoning_step(
                step_number=3,
                context=context_summary,
                previous_steps=steps,
                focus="Determine if intervention is needed and what type would be most effective.",
            )
            steps.append(step3)

        # Step 4: Consider learner preferences and history
        if len(steps) < self.config.max_reasoning_steps:
            step4 = await self._reasoning_step(
                step_number=4,
                context=context_summary,
                previous_steps=steps,
                focus="Consider the learner's preferences, IEP accommodations, and past intervention responses.",
            )
            steps.append(step4)

        # Generate final decision
        final_decision = await self._generate_final_decision(
            context_summary, steps
        )

        # Calculate total confidence (weighted average with recency bias)
        total_confidence = self._calculate_total_confidence(steps)

        elapsed_ms = int((time.time() - start_time) * 1000)

        return ReasoningTrace(
            steps=steps,
            final_decision=final_decision,
            total_confidence=total_confidence,
            reasoning_duration_ms=elapsed_ms,
            metadata={
                "learner_id": learner_context.learner_id,
                "session_id": learner_context.session_id,
                "num_interactions_analyzed": len(recent_interactions),
            },
        )

    async def decide_intervention(
        self,
        reasoning_trace: ReasoningTrace,
        available_interventions: List[InterventionType],
    ) -> InterventionDecision:
        """
        Based on reasoning, decide on appropriate intervention.

        Considers urgency, learner preferences, and intervention history
        to select the most appropriate intervention.

        Args:
            reasoning_trace: The reasoning trace from state analysis
            available_interventions: List of available intervention types

        Returns:
            InterventionDecision with the selected intervention
        """
        learner_id = reasoning_trace.metadata.get("learner_id", "unknown")
        session_id = reasoning_trace.metadata.get("session_id", "unknown")

        # Prepare intervention context
        intervention_context = self._prepare_intervention_context(
            reasoning_trace, available_interventions, learner_id
        )

        # Use LLM to select intervention
        prompt = self._build_intervention_selection_prompt(
            intervention_context, reasoning_trace
        )

        response = await self.llm_client.generate(
            prompt=prompt,
            temperature=self.config.llm_temperature,
            max_tokens=500,
        )

        # Parse the response
        intervention_type, parameters, urgency = self._parse_intervention_response(
            response, available_interventions
        )

        decision = InterventionDecision(
            intervention_type=intervention_type,
            parameters=parameters,
            reasoning_trace=reasoning_trace,
            urgency=urgency,
            learner_id=learner_id,
            session_id=session_id,
        )

        # Record intervention in history
        if learner_id not in self._intervention_history:
            self._intervention_history[learner_id] = []
        self._intervention_history[learner_id].append(decision)

        logger.info(
            f"Intervention decision for {learner_id}: {intervention_type.value} "
            f"(urgency: {urgency.value}, confidence: {reasoning_trace.total_confidence:.2f})"
        )

        return decision

    async def reflect_on_session(
        self,
        session_id: str,
        interventions_used: List[InterventionDecision],
        outcomes: List[InterventionOutcome],
    ) -> SessionReflection:
        """
        Reflect on session effectiveness to improve future decisions.

        Analyzes the interventions used and their outcomes to generate
        insights and recommendations for future sessions.

        Args:
            session_id: The session identifier
            interventions_used: List of interventions applied during session
            outcomes: List of outcomes for each intervention

        Returns:
            SessionReflection with insights and recommendations
        """
        if not self.config.enable_reflection:
            # Return minimal reflection if disabled
            return SessionReflection(
                session_id=session_id,
                learner_id=interventions_used[0].learner_id if interventions_used else "unknown",
                total_interventions=len(interventions_used),
                effective_interventions=0,
                overall_effectiveness=0.0,
                key_insights=["Reflection disabled"],
                recommendations=[],
            )

        learner_id = (
            interventions_used[0].learner_id if interventions_used else "unknown"
        )

        # Calculate effectiveness metrics
        effective_count = sum(
            1 for o in outcomes if o.effectiveness_score >= 0.6
        )
        overall_effectiveness = (
            sum(o.effectiveness_score for o in outcomes) / len(outcomes)
            if outcomes
            else 0.0
        )

        # Analyze patterns by intervention type
        intervention_patterns: Dict[str, float] = {}
        for intervention, outcome in zip(interventions_used, outcomes):
            itype = intervention.intervention_type.value
            if itype not in intervention_patterns:
                intervention_patterns[itype] = []
            intervention_patterns[itype].append(outcome.effectiveness_score)

        # Average effectiveness per type
        for itype in intervention_patterns:
            scores = intervention_patterns[itype]
            intervention_patterns[itype] = sum(scores) / len(scores)

        # Use LLM to generate insights
        insights_prompt = self._build_reflection_prompt(
            session_id,
            interventions_used,
            outcomes,
            intervention_patterns,
        )

        insights_response = await self.llm_client.generate(
            prompt=insights_prompt,
            temperature=0.5,
            max_tokens=800,
        )

        key_insights, recommendations, preferences = self._parse_reflection_response(
            insights_response
        )

        return SessionReflection(
            session_id=session_id,
            learner_id=learner_id,
            total_interventions=len(interventions_used),
            effective_interventions=effective_count,
            overall_effectiveness=overall_effectiveness,
            key_insights=key_insights,
            recommendations=recommendations,
            intervention_patterns=intervention_patterns,
            learner_preferences_learned=preferences,
        )

    def select_teaching_strategy(
        self,
        learner_profile: LearnerProfile,
        content_type: str,
        difficulty_level: float,
    ) -> TeachingStrategy:
        """
        Select optimal teaching strategy based on learner characteristics.

        Uses the strategy selector to find the best match for the given
        learner profile, content type, and difficulty level.

        Args:
            learner_profile: The learner's profile
            content_type: Type of content being taught
            difficulty_level: Difficulty level (0-1)

        Returns:
            The selected TeachingStrategy
        """
        strategy = self._strategy_selector.select_strategy(
            learner_profile, content_type, difficulty_level
        )

        logger.info(
            f"Selected strategy '{strategy.name}' for learner {learner_profile.learner_id} "
            f"(content: {content_type}, difficulty: {difficulty_level:.2f})"
        )

        return strategy

    def _prepare_context_summary(
        self,
        learner_context: LearnerContext,
        recent_interactions: List[Interaction],
        performance_metrics: PerformanceMetrics,
    ) -> Dict[str, Any]:
        """Prepare a summary of the context for reasoning prompts."""
        # Calculate interaction statistics
        if recent_interactions:
            recent_correct = sum(1 for i in recent_interactions if i.correct)
            recent_accuracy = recent_correct / len(recent_interactions)
            avg_response_time = sum(
                i.response_time_ms for i in recent_interactions
            ) / len(recent_interactions)
            total_hints = sum(i.hints_used for i in recent_interactions)
        else:
            recent_accuracy = 0.5
            avg_response_time = 5000
            total_hints = 0

        return {
            "learner": {
                "id": learner_context.learner_id,
                "grade_level": learner_context.grade_level,
                "learning_pace": learner_context.learning_pace,
                "preferred_modality": learner_context.preferred_modality,
                "attention_span_minutes": learner_context.attention_span_minutes,
                "cognitive_load_capacity": learner_context.cognitive_load_capacity,
                "current_mastery": learner_context.current_mastery_estimate,
                "session_duration_minutes": learner_context.session_duration_minutes,
                "frustration_signals": learner_context.frustration_signals,
                "iep_accommodations": learner_context.iep_accommodations,
            },
            "recent_interactions": {
                "count": len(recent_interactions),
                "accuracy": recent_accuracy,
                "avg_response_time_ms": avg_response_time,
                "total_hints_used": total_hints,
            },
            "performance": {
                "overall_accuracy": performance_metrics.overall_accuracy,
                "recent_accuracy": performance_metrics.recent_accuracy,
                "engagement_trend": performance_metrics.engagement_trend,
                "time_on_task_ratio": performance_metrics.time_on_task_ratio,
                "hint_dependency": performance_metrics.hint_dependency_score,
                "struggle_patterns": performance_metrics.struggle_patterns,
                "strength_areas": performance_metrics.strength_areas,
            },
        }

    async def _reasoning_step(
        self,
        step_number: int,
        context: Dict[str, Any],
        previous_steps: List[ReasoningStep],
        focus: str,
    ) -> ReasoningStep:
        """Execute a single reasoning step using the ReAct pattern."""
        # Build the prompt for this step
        prompt = self._build_reasoning_step_prompt(
            step_number, context, previous_steps, focus
        )

        # Generate reasoning
        response = await self.llm_client.generate(
            prompt=prompt,
            temperature=self.config.llm_temperature,
            max_tokens=600,
        )

        # Parse the response into thought, action, observation
        thought, action, observation, confidence = self._parse_reasoning_response(
            response
        )

        return ReasoningStep(
            thought=thought,
            action=action,
            observation=observation,
            confidence=confidence,
        )

    def _build_reasoning_step_prompt(
        self,
        step_number: int,
        context: Dict[str, Any],
        previous_steps: List[ReasoningStep],
        focus: str,
    ) -> str:
        """Build the prompt for a reasoning step."""
        context_str = json.dumps(context, indent=2)

        previous_reasoning = ""
        if previous_steps:
            previous_reasoning = "\n\nPrevious reasoning steps:\n"
            for i, step in enumerate(previous_steps, 1):
                previous_reasoning += f"""
Step {i}:
Thought: {step.thought}
Action: {step.action}
Observation: {step.observation}
Confidence: {step.confidence}
"""

        return f"""You are an AI tutor reasoning about a learner's state to determine if intervention is needed.

Use the ReAct (Reasoning + Acting) pattern:
1. THOUGHT: Your internal reasoning about the situation
2. ACTION: What you will check or analyze next
3. OBSERVATION: What you learned from that action
4. CONFIDENCE: How confident you are in your assessment (0.0 to 1.0)

Current learner context:
{context_str}
{previous_reasoning}

Step {step_number} Focus: {focus}

Respond in this exact format:
THOUGHT: [Your reasoning about the learner's current state]
ACTION: [What you are checking or analyzing]
OBSERVATION: [What you observed/concluded from this analysis]
CONFIDENCE: [A number between 0.0 and 1.0]"""

    def _parse_reasoning_response(
        self, response: str
    ) -> tuple[str, str, str, float]:
        """Parse LLM response into ReAct components."""
        thought = "Unable to parse thought"
        action = "Unable to parse action"
        observation = "Unable to parse observation"
        confidence = 0.5

        # Dictionary to store parsed sections
        sections: Dict[str, List[str]] = {
            "thought": [],
            "action": [],
            "observation": [],
        }

        lines = response.strip().split("\n")
        current_section: Optional[str] = None

        for line in lines:
            line_upper = line.upper().strip()

            if line_upper.startswith("THOUGHT:"):
                current_section = "thought"
                content = line.split(":", 1)[1].strip() if ":" in line else ""
                if content:
                    sections["thought"].append(content)
            elif line_upper.startswith("ACTION:"):
                current_section = "action"
                content = line.split(":", 1)[1].strip() if ":" in line else ""
                if content:
                    sections["action"].append(content)
            elif line_upper.startswith("OBSERVATION:"):
                current_section = "observation"
                content = line.split(":", 1)[1].strip() if ":" in line else ""
                if content:
                    sections["observation"].append(content)
            elif line_upper.startswith("CONFIDENCE:"):
                try:
                    conf_str = line.split(":", 1)[1].strip()
                    confidence = float(conf_str.split()[0])
                    confidence = max(0.0, min(1.0, confidence))
                except (ValueError, IndexError):
                    confidence = 0.5
                current_section = None
            elif current_section and line.strip():
                sections[current_section].append(line.strip())

        # Assemble final values from collected content
        if sections["thought"]:
            thought = " ".join(sections["thought"])
        if sections["action"]:
            action = " ".join(sections["action"])
        if sections["observation"]:
            observation = " ".join(sections["observation"])

        return thought, action, observation, confidence

    async def _generate_final_decision(
        self,
        context: Dict[str, Any],
        steps: List[ReasoningStep],
    ) -> str:
        """Generate the final decision summary from reasoning steps."""
        steps_summary = "\n".join(
            f"- {step.thought} (confidence: {step.confidence:.2f})"
            for step in steps
        )

        prompt = f"""Based on the following reasoning steps about a learner's state:

{steps_summary}

Learner context summary:
- Grade level: {context['learner']['grade_level']}
- Current mastery: {context['learner']['current_mastery']:.2f}
- Session duration: {context['learner']['session_duration_minutes']} minutes
- Frustration signals: {context['learner']['frustration_signals']}
- Recent accuracy: {context['recent_interactions']['accuracy']:.2f}

Provide a concise final assessment (2-3 sentences) of the learner's current state and whether intervention is needed."""

        response = await self.llm_client.generate(
            prompt=prompt,
            temperature=0.3,
            max_tokens=200,
        )

        return response.strip()

    def _calculate_total_confidence(self, steps: List[ReasoningStep]) -> float:
        """Calculate weighted confidence with recency bias."""
        if not steps:
            return 0.5

        # More recent steps get higher weight
        weights = [1.0 + (i * 0.2) for i in range(len(steps))]
        total_weight = sum(weights)

        weighted_sum = sum(
            step.confidence * weight
            for step, weight in zip(steps, weights)
        )

        return weighted_sum / total_weight

    def _prepare_intervention_context(
        self,
        reasoning_trace: ReasoningTrace,
        available_interventions: List[InterventionType],
        learner_id: str,
    ) -> Dict[str, Any]:
        """Prepare context for intervention selection."""
        # Get recent interventions for this learner
        recent = self._intervention_history.get(learner_id, [])[-5:]
        recent_types = [i.intervention_type.value for i in recent]

        return {
            "available_interventions": [i.value for i in available_interventions],
            "recent_interventions": recent_types,
            "reasoning_confidence": reasoning_trace.total_confidence,
            "final_decision": reasoning_trace.final_decision,
        }

    def _build_intervention_selection_prompt(
        self,
        context: Dict[str, Any],
        reasoning_trace: ReasoningTrace,
    ) -> str:
        """Build prompt for intervention selection."""
        steps_summary = "\n".join(
            f"- Thought: {step.thought}\n  Observation: {step.observation}"
            for step in reasoning_trace.steps[-3:]  # Last 3 steps
        )

        return f"""Based on the following analysis of a learner's state:

{steps_summary}

Final Assessment: {reasoning_trace.final_decision}

Available interventions: {context['available_interventions']}
Recently used interventions: {context['recent_interventions']}

Select the most appropriate intervention. Consider:
1. Avoid repeating the same intervention type consecutively unless clearly needed
2. Match intervention to the identified need
3. Consider urgency based on frustration/struggle signals

Respond in this exact format:
INTERVENTION: [intervention type from available list]
URGENCY: [low/medium/high/critical]
PARAMETERS: [JSON object with relevant parameters]
REASONING: [Brief explanation of why this intervention]"""

    def _parse_intervention_response(
        self,
        response: str,
        available: List[InterventionType],
    ) -> tuple[InterventionType, Dict[str, Any], UrgencyLevel]:
        """Parse LLM response for intervention selection."""
        intervention_type = InterventionType.NONE
        parameters: Dict[str, Any] = {}
        urgency = UrgencyLevel.MEDIUM

        for line in response.strip().split("\n"):
            line_upper = line.upper().strip()

            if line_upper.startswith("INTERVENTION:"):
                itype_str = line.split(":", 1)[1].strip().lower()
                for itype in available:
                    if itype.value == itype_str:
                        intervention_type = itype
                        break

            elif line_upper.startswith("URGENCY:"):
                urgency_str = line.split(":", 1)[1].strip().lower()
                try:
                    urgency = UrgencyLevel(urgency_str)
                except ValueError:
                    urgency = UrgencyLevel.MEDIUM

            elif line_upper.startswith("PARAMETERS:"):
                params_str = line.split(":", 1)[1].strip()
                try:
                    parameters = json.loads(params_str)
                except json.JSONDecodeError:
                    parameters = {"raw": params_str}

        return intervention_type, parameters, urgency

    def _build_reflection_prompt(
        self,
        session_id: str,
        interventions: List[InterventionDecision],
        outcomes: List[InterventionOutcome],
        patterns: Dict[str, float],
    ) -> str:
        """Build prompt for session reflection."""
        intervention_summary = "\n".join(
            f"- {i.intervention_type.value} (urgency: {i.urgency.value})"
            for i in interventions
        )

        outcome_summary = "\n".join(
            f"- {o.intervention_type.value}: effectiveness={o.effectiveness_score:.2f}, "
            f"response={o.learner_response}, performance_delta={o.performance_delta:+.2f}"
            for o in outcomes
        )

        patterns_str = "\n".join(
            f"- {itype}: {score:.2f} avg effectiveness"
            for itype, score in patterns.items()
        )

        return f"""Reflect on this learning session to improve future interventions.

Session: {session_id}

Interventions applied:
{intervention_summary}

Outcomes:
{outcome_summary}

Effectiveness by intervention type:
{patterns_str}

Provide:
1. KEY_INSIGHTS: 3-5 bullet points of key learnings about this learner
2. RECOMMENDATIONS: 2-3 specific recommendations for future sessions
3. PREFERENCES: JSON object describing learned learner preferences

Format your response clearly with these three sections."""

    def _parse_reflection_response(
        self, response: str
    ) -> tuple[List[str], List[str], Dict[str, Any]]:
        """Parse reflection response into components."""
        key_insights: List[str] = []
        recommendations: List[str] = []
        preferences: Dict[str, Any] = {}

        current_section = None
        current_items: List[str] = []

        for line in response.strip().split("\n"):
            line_stripped = line.strip()
            line_upper = line_stripped.upper()

            if "KEY_INSIGHTS" in line_upper or "KEY INSIGHTS" in line_upper:
                if current_section and current_items:
                    if current_section == "insights":
                        key_insights = current_items
                    elif current_section == "recommendations":
                        recommendations = current_items
                current_section = "insights"
                current_items = []
            elif "RECOMMENDATIONS" in line_upper:
                if current_section and current_items:
                    if current_section == "insights":
                        key_insights = current_items
                current_section = "recommendations"
                current_items = []
            elif "PREFERENCES" in line_upper:
                if current_section and current_items:
                    if current_section == "insights":
                        key_insights = current_items
                    elif current_section == "recommendations":
                        recommendations = current_items
                current_section = "preferences"
                current_items = []
            elif line_stripped.startswith("-") or line_stripped.startswith("*"):
                item = line_stripped.lstrip("-*").strip()
                if item and current_section in ("insights", "recommendations"):
                    current_items.append(item)
            elif line_stripped.startswith("{") and current_section == "preferences":
                try:
                    preferences = json.loads(line_stripped)
                except json.JSONDecodeError:
                    pass

        # Assign last section
        if current_section == "insights" and current_items:
            key_insights = current_items
        elif current_section == "recommendations" and current_items:
            recommendations = current_items

        # Default values if parsing failed
        if not key_insights:
            key_insights = ["Session completed"]
        if not recommendations:
            recommendations = ["Continue monitoring learner progress"]

        return key_insights, recommendations, preferences

    def get_intervention_history(
        self, learner_id: str
    ) -> List[InterventionDecision]:
        """Get intervention history for a learner."""
        return self._intervention_history.get(learner_id, [])

    def clear_intervention_history(self, learner_id: str) -> None:
        """Clear intervention history for a learner."""
        if learner_id in self._intervention_history:
            del self._intervention_history[learner_id]


class MockLLMClient:
    """
    Mock LLM client for testing purposes.

    Provides deterministic responses for testing the reasoning engine
    without requiring actual LLM API calls.
    """

    def __init__(self, responses: Optional[Dict[str, str]] = None) -> None:
        """
        Initialize mock client.

        Args:
            responses: Optional mapping of prompt patterns to responses
        """
        self.responses = responses or {}
        self.call_count = 0
        self.last_prompt: Optional[str] = None

    async def generate(
        self,
        prompt: str,
        temperature: float = 0.3,
        max_tokens: int = 1000,
    ) -> str:
        """Generate mock response."""
        self.call_count += 1
        self.last_prompt = prompt

        # Check for pattern matches
        for pattern, response in self.responses.items():
            if pattern.lower() in prompt.lower():
                return response

        # Default responses based on prompt type
        if "ReAct" in prompt or "THOUGHT:" in prompt:
            return self._default_reasoning_response()
        elif "intervention" in prompt.lower():
            return self._default_intervention_response()
        elif "reflect" in prompt.lower():
            return self._default_reflection_response()
        else:
            return self._default_decision_response()

    def _default_reasoning_response(self) -> str:
        """Default response for reasoning steps."""
        return """THOUGHT: The learner shows moderate engagement with some signs of struggle in recent interactions. Response times are slightly elevated and hint usage has increased.
ACTION: Analyzing the pattern of recent responses to identify specific areas of difficulty.
OBSERVATION: The learner appears to be having difficulty with the current concept but is still persisting. No clear frustration signals, but support may be beneficial.
CONFIDENCE: 0.75"""

    def _default_intervention_response(self) -> str:
        """Default response for intervention selection."""
        return """INTERVENTION: hint
URGENCY: medium
PARAMETERS: {"hint_level": 1, "focus_area": "current_concept"}
REASONING: The learner is struggling but engaged, a gentle hint would help without disrupting their flow."""

    def _default_reflection_response(self) -> str:
        """Default response for session reflection."""
        return """KEY_INSIGHTS:
- Learner responds well to hints at level 1
- Engagement drops after 15 minutes without encouragement
- Performance improves with scaffolding on new concepts

RECOMMENDATIONS:
- Provide proactive encouragement every 10 minutes
- Use level 1 hints before escalating to higher levels

PREFERENCES: {"preferred_hint_level": 1, "responds_to_encouragement": true}"""

    def _default_decision_response(self) -> str:
        """Default response for final decision."""
        return "The learner is making steady progress with occasional struggles. Light support is recommended to maintain momentum without creating dependency."
