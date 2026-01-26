"""
SMART Goal Validators

Validates IEP goals against SMART criteria and provides actionable feedback.
"""

import re
import json
import logging
from typing import List, Optional, Dict, Any, Protocol

from .models import ExtractedGoal, SMARTValidationResult

logger = logging.getLogger(__name__)


class LLMClient(Protocol):
    """Protocol for LLM client interface."""

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.1,
        max_tokens: int = 4096,
    ) -> str:
        """Generate text from prompt."""
        ...


class SMARTValidator:
    """
    Validates IEP goals against SMART criteria.

    SMART Criteria:
    - Specific: Clear, well-defined target behavior or skill
    - Measurable: Quantifiable criteria for measuring progress
    - Achievable: Realistic given baseline and timeframe
    - Relevant: Addresses identified needs from present levels
    - Time-bound: Has clear deadline or timeframe
    """

    # Keywords and patterns for rule-based validation

    SPECIFIC_INDICATORS = [
        r"will\s+\w+",  # "will read", "will write"
        r"student\s+will",
        r"(?:increase|decrease|improve|demonstrate|use|apply)\s+\w+",
        r"in\s+the\s+area\s+of",
        r"when\s+(?:given|presented|asked)",
    ]

    MEASURABLE_INDICATORS = [
        r"\d+\s*%",  # Percentage
        r"\d+\s+(?:out\s+of|/)\s+\d+",  # Ratio
        r"\d+\s+(?:trials?|attempts?|opportunities)",  # Trials
        r"(?:rubric|checklist|assessment|probe|CBM)",  # Assessment tools
        r"(?:accuracy|correct(?:ly)?|independent(?:ly)?)",  # Quality measures
        r"(?:grade\s+level|percentile|standard\s+score)",  # Standardized measures
    ]

    ACHIEVABLE_INDICATORS = [
        r"from\s+.+\s+to",  # Progress from baseline to target
        r"(?:current(?:ly)?|baseline|present(?:ly)?).+(?:will|to)\s+\d+",  # Baseline mentioned
        r"(?:increase|improve)\s+(?:by|from)",  # Incremental improvement
    ]

    RELEVANT_INDICATORS = [
        r"(?:need|deficit|weakness|struggle|difficulty)",  # Addresses need
        r"(?:standard|curriculum|grade.level)",  # Aligned to standards
        r"(?:IEP|evaluation|assessment).+(?:shows?|indicates?)",  # Based on evaluation
    ]

    TIMEBOUND_INDICATORS = [
        r"by\s+(?:the\s+end\s+of|June|May|December)",  # Deadline
        r"(?:within|over)\s+\d+\s+(?:weeks?|months?|days?)",  # Duration
        r"annual(?:ly)?|quarterly|(?:marking\s+)?period",  # Review period
        r"\d{1,2}[/-]\d{1,2}[/-]\d{2,4}",  # Specific date
        r"(?:school\s+)?year",  # School year
    ]

    def __init__(self, llm_client: Optional[LLMClient] = None):
        """
        Initialize SMART Validator.

        Args:
            llm_client: Optional LLM client for AI-based validation.
                        If not provided, uses rule-based validation only.
        """
        self.llm = llm_client

    async def validate_goal(
        self,
        goal: ExtractedGoal,
        use_llm: bool = True,
    ) -> SMARTValidationResult:
        """
        Validate a goal against SMART criteria.

        Args:
            goal: The goal to validate
            use_llm: Whether to use LLM for enhanced validation

        Returns:
            SMARTValidationResult with scores and recommendations
        """
        if use_llm and self.llm:
            return await self._llm_validate_goal(goal)
        else:
            return self._rule_based_validate_goal(goal)

    async def validate_goals(
        self,
        goals: List[ExtractedGoal],
        use_llm: bool = True,
    ) -> List[SMARTValidationResult]:
        """
        Validate multiple goals.

        Args:
            goals: List of goals to validate
            use_llm: Whether to use LLM for enhanced validation

        Returns:
            List of SMARTValidationResult for each goal
        """
        results = []
        for goal in goals:
            result = await self.validate_goal(goal, use_llm)
            results.append(result)
        return results

    async def _llm_validate_goal(self, goal: ExtractedGoal) -> SMARTValidationResult:
        """Validate goal using LLM for nuanced assessment."""
        prompt = f"""Evaluate this IEP goal against SMART criteria. Be thorough but constructive.

GOAL: {goal.goal_text}
BASELINE: {goal.baseline or 'Not specified'}
TARGET: {goal.target or 'Not specified'}
MEASUREMENT METHOD: {goal.measurement_method or 'Not specified'}
MEASUREMENT FREQUENCY: {goal.measurement_frequency or 'Not specified'}

For each criterion, provide:
1. Score (0.0 to 1.0, where 1.0 is fully meets criterion)
2. Brief explanation (1-2 sentences)
3. Specific improvement suggestion if score < 0.8

Criteria to evaluate:

SPECIFIC: Does it clearly state what skill/behavior the student will demonstrate?
- Look for: specific action verb, defined skill area, conditions for performance
- Score lower if vague or too broad

MEASURABLE: Can progress be measured objectively?
- Look for: percentage, frequency, duration, accuracy rate, rubric criteria
- Score lower if no quantifiable measure specified

ACHIEVABLE: Is it realistic given the baseline and timeframe?
- Look for: reasonable gap between baseline and target, appropriate timeframe
- Score lower if target seems unrealistic or no baseline provided

RELEVANT: Does it address an identified need and align with grade-level expectations?
- Look for: connection to present levels, academic or functional relevance
- Score lower if unclear why this goal matters

TIME-BOUND: Does it have a clear deadline or timeframe?
- Look for: specific date, "by end of school year", "within X weeks"
- Score lower if no timeline specified

Return as JSON:
{{
    "specific_score": float,
    "specific_explanation": "string",
    "specific_suggestion": "string or null",
    "measurable_score": float,
    "measurable_explanation": "string",
    "measurable_suggestion": "string or null",
    "achievable_score": float,
    "achievable_explanation": "string",
    "achievable_suggestion": "string or null",
    "relevant_score": float,
    "relevant_explanation": "string",
    "relevant_suggestion": "string or null",
    "timebound_score": float,
    "timebound_explanation": "string",
    "timebound_suggestion": "string or null"
}}

Return ONLY the JSON object."""

        try:
            response = await self.llm.generate(prompt, temperature=0.2)
            result_data = self._parse_json_object(response)

            # Calculate overall score
            scores = {
                "specific": result_data.get("specific_score", 0.5),
                "measurable": result_data.get("measurable_score", 0.5),
                "achievable": result_data.get("achievable_score", 0.5),
                "relevant": result_data.get("relevant_score", 0.5),
                "timebound": result_data.get("timebound_score", 0.5),
            }
            overall_score = sum(scores.values()) / len(scores)

            # Compile recommendations
            recommendations = self._compile_recommendations(result_data, goal)

            return SMARTValidationResult(
                goal_number=goal.goal_number,
                goal_text=goal.goal_text,
                specific_score=scores["specific"],
                specific_explanation=result_data.get("specific_explanation", ""),
                specific_suggestion=result_data.get("specific_suggestion"),
                measurable_score=scores["measurable"],
                measurable_explanation=result_data.get("measurable_explanation", ""),
                measurable_suggestion=result_data.get("measurable_suggestion"),
                achievable_score=scores["achievable"],
                achievable_explanation=result_data.get("achievable_explanation", ""),
                achievable_suggestion=result_data.get("achievable_suggestion"),
                relevant_score=scores["relevant"],
                relevant_explanation=result_data.get("relevant_explanation", ""),
                relevant_suggestion=result_data.get("relevant_suggestion"),
                timebound_score=scores["timebound"],
                timebound_explanation=result_data.get("timebound_explanation", ""),
                timebound_suggestion=result_data.get("timebound_suggestion"),
                overall_score=overall_score,
                is_smart=overall_score >= 0.7,
                recommendations=recommendations,
            )

        except Exception as e:
            logger.warning(f"LLM validation failed: {e}, falling back to rule-based")
            return self._rule_based_validate_goal(goal)

    def _rule_based_validate_goal(self, goal: ExtractedGoal) -> SMARTValidationResult:
        """Validate goal using rule-based pattern matching."""
        goal_text = goal.goal_text
        full_text = f"{goal_text} {goal.baseline or ''} {goal.target or ''} {goal.measurement_method or ''}"

        # Evaluate each criterion
        specific_score, specific_explanation = self._evaluate_specific(goal_text)
        measurable_score, measurable_explanation = self._evaluate_measurable(full_text, goal)
        achievable_score, achievable_explanation = self._evaluate_achievable(full_text, goal)
        relevant_score, relevant_explanation = self._evaluate_relevant(goal_text, goal)
        timebound_score, timebound_explanation = self._evaluate_timebound(full_text)

        # Calculate overall
        scores = {
            "specific": specific_score,
            "measurable": measurable_score,
            "achievable": achievable_score,
            "relevant": relevant_score,
            "timebound": timebound_score,
        }
        overall_score = sum(scores.values()) / len(scores)

        # Generate suggestions
        specific_suggestion = self._suggest_specific_improvement(goal) if specific_score < 0.8 else None
        measurable_suggestion = self._suggest_measurable_improvement(goal) if measurable_score < 0.8 else None
        achievable_suggestion = self._suggest_achievable_improvement(goal) if achievable_score < 0.8 else None
        relevant_suggestion = self._suggest_relevant_improvement(goal) if relevant_score < 0.8 else None
        timebound_suggestion = self._suggest_timebound_improvement(goal) if timebound_score < 0.8 else None

        # Compile recommendations
        recommendations = self.suggest_improvements(goal, scores)

        return SMARTValidationResult(
            goal_number=goal.goal_number,
            goal_text=goal.goal_text,
            specific_score=specific_score,
            specific_explanation=specific_explanation,
            specific_suggestion=specific_suggestion,
            measurable_score=measurable_score,
            measurable_explanation=measurable_explanation,
            measurable_suggestion=measurable_suggestion,
            achievable_score=achievable_score,
            achievable_explanation=achievable_explanation,
            achievable_suggestion=achievable_suggestion,
            relevant_score=relevant_score,
            relevant_explanation=relevant_explanation,
            relevant_suggestion=relevant_suggestion,
            timebound_score=timebound_score,
            timebound_explanation=timebound_explanation,
            timebound_suggestion=timebound_suggestion,
            overall_score=overall_score,
            is_smart=overall_score >= 0.7,
            recommendations=recommendations,
        )

    def _evaluate_specific(self, text: str) -> tuple[float, str]:
        """Evaluate how specific the goal is."""
        score = 0.3  # Base score
        matches = 0

        for pattern in self.SPECIFIC_INDICATORS:
            if re.search(pattern, text, re.IGNORECASE):
                matches += 1

        # Check for specific action verbs
        action_verbs = [
            "read", "write", "calculate", "identify", "demonstrate",
            "complete", "use", "apply", "solve", "answer", "respond",
            "follow", "produce", "create", "organize", "recall"
        ]
        verb_count = sum(1 for verb in action_verbs if verb in text.lower())

        if matches >= 2:
            score += 0.3
        elif matches >= 1:
            score += 0.2

        if verb_count >= 1:
            score += 0.2

        # Check for conditions
        if re.search(r"(?:when|given|during|in|with)", text, re.IGNORECASE):
            score += 0.2

        score = min(score, 1.0)

        if score >= 0.8:
            explanation = "Goal clearly specifies the target skill and conditions"
        elif score >= 0.6:
            explanation = "Goal is moderately specific but could be more detailed"
        else:
            explanation = "Goal lacks specificity about what the student will do"

        return score, explanation

    def _evaluate_measurable(self, text: str, goal: ExtractedGoal) -> tuple[float, str]:
        """Evaluate how measurable the goal is."""
        score = 0.2  # Base score
        matches = 0

        for pattern in self.MEASURABLE_INDICATORS:
            if re.search(pattern, text, re.IGNORECASE):
                matches += 1

        if matches >= 3:
            score += 0.6
        elif matches >= 2:
            score += 0.5
        elif matches >= 1:
            score += 0.3

        # Bonus for having explicit measurement method
        if goal.measurement_method:
            score += 0.2

        score = min(score, 1.0)

        if score >= 0.8:
            explanation = "Goal has clear, quantifiable measurement criteria"
        elif score >= 0.6:
            explanation = "Goal has some measurable elements but could be more precise"
        else:
            explanation = "Goal lacks clear criteria for measuring progress"

        return score, explanation

    def _evaluate_achievable(self, text: str, goal: ExtractedGoal) -> tuple[float, str]:
        """Evaluate if the goal is achievable."""
        score = 0.5  # Moderate base - hard to assess without context

        # Check for baseline
        if goal.baseline:
            score += 0.2

        # Check for progression language
        for pattern in self.ACHIEVABLE_INDICATORS:
            if re.search(pattern, text, re.IGNORECASE):
                score += 0.15

        # Check if target is stated
        if goal.target:
            score += 0.2

        score = min(score, 1.0)

        if score >= 0.8:
            explanation = "Goal appears achievable with clear baseline and target progression"
        elif score >= 0.6:
            explanation = "Goal may be achievable but baseline or progression is unclear"
        else:
            explanation = "Cannot determine if goal is achievable without baseline data"

        return score, explanation

    def _evaluate_relevant(self, text: str, goal: ExtractedGoal) -> tuple[float, str]:
        """Evaluate if the goal is relevant."""
        score = 0.5  # Moderate base - hard to assess without full IEP context

        # Check for domain classification
        if goal.domain and goal.domain.value != "other":
            score += 0.2

        # Check for relevance indicators
        for pattern in self.RELEVANT_INDICATORS:
            if re.search(pattern, text, re.IGNORECASE):
                score += 0.15

        # Check for educational/functional language
        educational_keywords = [
            "grade", "curriculum", "standard", "classroom",
            "academic", "functional", "independent", "skill"
        ]
        keyword_matches = sum(1 for kw in educational_keywords if kw in text.lower())
        if keyword_matches >= 2:
            score += 0.2
        elif keyword_matches >= 1:
            score += 0.1

        score = min(score, 1.0)

        if score >= 0.8:
            explanation = "Goal clearly addresses an identified educational need"
        elif score >= 0.6:
            explanation = "Goal appears relevant but connection to needs could be clearer"
        else:
            explanation = "Relevance to student's identified needs is unclear"

        return score, explanation

    def _evaluate_timebound(self, text: str) -> tuple[float, str]:
        """Evaluate if the goal is time-bound."""
        score = 0.2  # Base score
        matches = 0

        for pattern in self.TIMEBOUND_INDICATORS:
            if re.search(pattern, text, re.IGNORECASE):
                matches += 1

        if matches >= 2:
            score += 0.7
        elif matches >= 1:
            score += 0.5

        score = min(score, 1.0)

        if score >= 0.8:
            explanation = "Goal has clear timeline or deadline"
        elif score >= 0.6:
            explanation = "Goal has implied timeline but could be more explicit"
        else:
            explanation = "Goal lacks clear timeline for achievement"

        return score, explanation

    def suggest_improvements(
        self,
        goal: ExtractedGoal,
        scores: Dict[str, float],
    ) -> List[str]:
        """
        Generate improvement suggestions for low-scoring criteria.

        Args:
            goal: The goal being validated
            scores: Dictionary of criterion scores

        Returns:
            List of improvement suggestions
        """
        suggestions = []

        if scores.get("specific", 1.0) < 0.8:
            suggestion = self._suggest_specific_improvement(goal)
            if suggestion:
                suggestions.append(suggestion)

        if scores.get("measurable", 1.0) < 0.8:
            suggestion = self._suggest_measurable_improvement(goal)
            if suggestion:
                suggestions.append(suggestion)

        if scores.get("achievable", 1.0) < 0.8:
            suggestion = self._suggest_achievable_improvement(goal)
            if suggestion:
                suggestions.append(suggestion)

        if scores.get("relevant", 1.0) < 0.8:
            suggestion = self._suggest_relevant_improvement(goal)
            if suggestion:
                suggestions.append(suggestion)

        if scores.get("timebound", 1.0) < 0.8:
            suggestion = self._suggest_timebound_improvement(goal)
            if suggestion:
                suggestions.append(suggestion)

        return suggestions

    def _suggest_specific_improvement(self, goal: ExtractedGoal) -> str:
        """Generate suggestion for making goal more specific."""
        suggestions = [
            "State exactly what skill or behavior the student will demonstrate",
            "Include the conditions under which the skill will be performed (e.g., 'when given a grade-level text')",
            "Use a specific, observable action verb (e.g., 'read', 'write', 'calculate', 'identify')",
        ]

        # Customize based on domain
        domain_specific = {
            "reading": "Specify the type of reading task (e.g., decoding, fluency, comprehension) and text level",
            "writing": "Specify the type of writing (e.g., sentence, paragraph, essay) and genre",
            "math": "Specify the math operation or concept (e.g., addition with regrouping, fractions)",
            "behavior": "Describe the specific replacement behavior expected",
            "communication": "Specify the communication context and mode (e.g., verbal, AAC)",
        }

        if goal.domain and goal.domain.value in domain_specific:
            suggestions.append(domain_specific[goal.domain.value])

        return suggestions[0]

    def _suggest_measurable_improvement(self, goal: ExtractedGoal) -> str:
        """Generate suggestion for making goal more measurable."""
        if not goal.measurement_method:
            return (
                "Add measurable criteria such as: percentage accuracy (e.g., '80% accuracy'), "
                "frequency count (e.g., '4 out of 5 trials'), or standardized measure "
                "(e.g., 'as measured by curriculum-based assessment')"
            )

        return (
            "Make measurement criteria more specific with exact numbers "
            "(e.g., '80% accuracy on 3 consecutive probes' instead of 'improved accuracy')"
        )

    def _suggest_achievable_improvement(self, goal: ExtractedGoal) -> str:
        """Generate suggestion for making goal more achievable."""
        if not goal.baseline:
            return (
                "Include baseline data showing current performance level "
                "(e.g., 'Currently reading at 2nd grade level, will read at 3rd grade level')"
            )

        return (
            "Ensure the gap between baseline and target is realistic for the timeframe. "
            "Consider breaking into smaller incremental objectives if the target is ambitious."
        )

    def _suggest_relevant_improvement(self, goal: ExtractedGoal) -> str:
        """Generate suggestion for making goal more relevant."""
        return (
            "Connect the goal explicitly to the student's identified needs from present levels "
            "and/or grade-level standards (e.g., 'To address identified need in reading comprehension...')"
        )

    def _suggest_timebound_improvement(self, goal: ExtractedGoal) -> str:
        """Generate suggestion for making goal more time-bound."""
        return (
            "Specify when the goal should be achieved "
            "(e.g., 'by the end of the IEP year', 'within 36 instructional weeks', "
            "'by June 2026')"
        )

    def _parse_json_object(self, response: str) -> Dict[str, Any]:
        """Parse JSON object from LLM response."""
        response = response.strip()

        # Remove markdown code blocks
        if response.startswith("```"):
            lines = response.split("\n")
            response = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])

        # Find JSON object
        start = response.find("{")
        end = response.rfind("}") + 1

        if start != -1 and end > start:
            json_str = response[start:end]
            return json.loads(json_str)

        return {}

    def _compile_recommendations(
        self,
        result_data: Dict[str, Any],
        goal: ExtractedGoal,
    ) -> List[str]:
        """Compile recommendations from LLM validation results."""
        recommendations = []

        criteria = ["specific", "measurable", "achievable", "relevant", "timebound"]

        for criterion in criteria:
            score = result_data.get(f"{criterion}_score", 0.5)
            suggestion = result_data.get(f"{criterion}_suggestion")

            if score < 0.8 and suggestion:
                recommendations.append(f"{criterion.capitalize()}: {suggestion}")

        return recommendations


class GoalQualityAnalyzer:
    """
    Analyzes overall quality of IEP goals and provides summary recommendations.
    """

    def __init__(self, validator: SMARTValidator):
        """Initialize with a SMART validator."""
        self.validator = validator

    async def analyze_goals(
        self,
        goals: List[ExtractedGoal],
        use_llm: bool = True,
    ) -> Dict[str, Any]:
        """
        Analyze the quality of all goals in an IEP.

        Returns:
            Dictionary with overall analysis and per-goal validations
        """
        validations = await self.validator.validate_goals(goals, use_llm)

        # Calculate aggregate scores
        if validations:
            avg_specific = sum(v.specific_score for v in validations) / len(validations)
            avg_measurable = sum(v.measurable_score for v in validations) / len(validations)
            avg_achievable = sum(v.achievable_score for v in validations) / len(validations)
            avg_relevant = sum(v.relevant_score for v in validations) / len(validations)
            avg_timebound = sum(v.timebound_score for v in validations) / len(validations)
            avg_overall = sum(v.overall_score for v in validations) / len(validations)
            smart_count = sum(1 for v in validations if v.is_smart)
        else:
            avg_specific = avg_measurable = avg_achievable = avg_relevant = avg_timebound = avg_overall = 0
            smart_count = 0

        # Identify weakest criterion across all goals
        criterion_scores = {
            "specific": avg_specific,
            "measurable": avg_measurable,
            "achievable": avg_achievable,
            "relevant": avg_relevant,
            "timebound": avg_timebound,
        }
        weakest = min(criterion_scores, key=criterion_scores.get) if criterion_scores else None

        # Generate summary recommendations
        summary_recommendations = self._generate_summary_recommendations(
            criterion_scores, validations
        )

        return {
            "total_goals": len(goals),
            "smart_goals": smart_count,
            "non_smart_goals": len(goals) - smart_count,
            "average_scores": {
                "specific": round(avg_specific, 2),
                "measurable": round(avg_measurable, 2),
                "achievable": round(avg_achievable, 2),
                "relevant": round(avg_relevant, 2),
                "timebound": round(avg_timebound, 2),
                "overall": round(avg_overall, 2),
            },
            "weakest_criterion": weakest,
            "summary_recommendations": summary_recommendations,
            "goal_validations": validations,
        }

    def _generate_summary_recommendations(
        self,
        criterion_scores: Dict[str, float],
        validations: List[SMARTValidationResult],
    ) -> List[str]:
        """Generate summary recommendations based on aggregate analysis."""
        recommendations = []

        # Check for common weaknesses
        if criterion_scores.get("measurable", 1.0) < 0.7:
            recommendations.append(
                "Multiple goals lack clear measurement criteria. "
                "Consider adding specific percentages, frequencies, or assessment methods to each goal."
            )

        if criterion_scores.get("timebound", 1.0) < 0.7:
            recommendations.append(
                "Several goals do not specify timelines. "
                "Ensure each goal includes a clear deadline (e.g., 'by the end of the IEP year')."
            )

        if criterion_scores.get("specific", 1.0) < 0.7:
            recommendations.append(
                "Goals could be more specific. "
                "Use clear action verbs and specify the exact skill or behavior to be demonstrated."
            )

        if criterion_scores.get("achievable", 1.0) < 0.7:
            recommendations.append(
                "Some goals may lack clear baseline data. "
                "Include current performance levels to show the expected progress trajectory."
            )

        # Check for domain coverage
        domains = set(g.goal.domain if hasattr(g, 'goal') else None for g in validations)
        if len(domains) == 1 and len(validations) > 2:
            recommendations.append(
                "All goals appear to be in the same domain. "
                "Consider whether goals in other areas are needed based on the student's needs."
            )

        return recommendations
