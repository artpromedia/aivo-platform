"""
Adaptation Strategy Implementations for Content Adaptation Engine.

This module defines the strategy pattern implementations for various
content adaptation approaches, including difficulty reduction, scaffolding,
language simplification, and more.
"""

import json
import logging
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Protocol, Tuple

from .models import (
    AdaptationContext,
    AdaptationStrategy,
    ContentFeatures,
    ContentFormat,
    ScaffoldType,
)

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


class BaseAdaptationStrategy(ABC):
    """
    Base class for all adaptation strategies.

    Defines the interface that all strategies must implement,
    ensuring consistent behavior across different adaptation types.
    """

    strategy_type: AdaptationStrategy

    def __init__(self, llm_client: Optional[LLMClient] = None) -> None:
        """
        Initialize the strategy.

        Args:
            llm_client: Optional LLM client for content transformation
        """
        self.llm_client = llm_client

    @abstractmethod
    async def apply(
        self,
        content: Dict[str, Any],
        features: ContentFeatures,
        context: AdaptationContext,
    ) -> Tuple[Dict[str, Any], ContentFeatures]:
        """
        Apply the adaptation strategy to content.

        Args:
            content: The content to adapt
            features: Current content features
            context: Adaptation context with learner info

        Returns:
            Tuple of (adapted_content, new_features)
        """
        pass

    @abstractmethod
    def can_apply(self, features: ContentFeatures) -> bool:
        """
        Check if strategy can be applied given current features.

        Args:
            features: Current content features

        Returns:
            True if strategy can be applied
        """
        pass

    def _build_adaptation_prompt(
        self,
        content: Dict[str, Any],
        instruction: str,
        constraints: List[str],
    ) -> str:
        """Build a prompt for LLM-based content adaptation."""
        content_str = json.dumps(content, indent=2)
        constraints_str = "\n".join(f"- {c}" for c in constraints)

        return f"""You are an expert educational content adapter. Your task is to modify learning content while preserving its educational value.

INSTRUCTION:
{instruction}

ORIGINAL CONTENT:
{content_str}

CONSTRAINTS:
{constraints_str}

IMPORTANT:
- Preserve all factual information and learning objectives
- Maintain educational accuracy
- Return the adapted content as valid JSON

ADAPTED CONTENT:"""

    async def _adapt_with_llm(
        self,
        content: Dict[str, Any],
        instruction: str,
        constraints: List[str],
    ) -> Dict[str, Any]:
        """Use LLM to adapt content."""
        if not self.llm_client:
            logger.warning(
                f"No LLM client available for {self.strategy_type.value}, "
                "returning original content"
            )
            return content

        prompt = self._build_adaptation_prompt(content, instruction, constraints)

        try:
            response = await self.llm_client.generate(
                prompt=prompt,
                temperature=0.3,
                max_tokens=2000,
            )

            # Extract JSON from response
            adapted = self._extract_json(response)
            if adapted:
                return adapted

            logger.warning("Failed to parse LLM response, returning original content")
            return content

        except Exception as e:
            logger.error(f"LLM adaptation failed: {e}")
            return content

    def _extract_json(self, response: str) -> Optional[Dict[str, Any]]:
        """Extract JSON from LLM response."""
        try:
            # Try parsing entire response as JSON
            return json.loads(response)
        except json.JSONDecodeError:
            pass

        # Try to find JSON block in response
        try:
            start = response.find("{")
            end = response.rfind("}") + 1
            if start >= 0 and end > start:
                return json.loads(response[start:end])
        except json.JSONDecodeError:
            pass

        return None


class ReduceDifficultyStrategy(BaseAdaptationStrategy):
    """
    Reduces content difficulty.

    Applies multiple simplification techniques to make content
    more accessible to struggling learners.
    """

    strategy_type = AdaptationStrategy.REDUCE_DIFFICULTY

    DIFFICULTY_REDUCTION = 0.1
    VOCABULARY_REDUCTION = 0.15

    async def apply(
        self,
        content: Dict[str, Any],
        features: ContentFeatures,
        context: AdaptationContext,
    ) -> Tuple[Dict[str, Any], ContentFeatures]:
        """
        Reduce difficulty by:
        - Simplifying vocabulary
        - Shortening sentences
        - Reducing concept load
        - Adding more examples
        """
        instruction = """Simplify this content to reduce difficulty:
1. Replace complex vocabulary with simpler alternatives
2. Break long sentences into shorter ones
3. Reduce the number of concepts presented at once
4. Add clarifying examples where helpful
5. Use more concrete rather than abstract language"""

        constraints = [
            "Maintain all core learning objectives",
            "Keep all factual information accurate",
            "Do not oversimplify to the point of losing meaning",
            "Preserve the educational intent",
        ]

        adapted_content = await self._adapt_with_llm(content, instruction, constraints)

        new_features = features.copy_with_changes(
            difficulty_level=max(0.0, features.difficulty_level - self.DIFFICULTY_REDUCTION),
            vocabulary_level=max(0.0, features.vocabulary_level - self.VOCABULARY_REDUCTION),
            sentence_complexity=max(0.0, features.sentence_complexity - 0.1),
        )

        logger.info(
            f"Reduced difficulty for learner {context.learner_id}: "
            f"{features.difficulty_level:.2f} -> {new_features.difficulty_level:.2f}"
        )

        return adapted_content, new_features

    def can_apply(self, features: ContentFeatures) -> bool:
        """Can reduce difficulty if not already at minimum."""
        return features.difficulty_level > 0.1


class IncreaseDifficultyStrategy(BaseAdaptationStrategy):
    """
    Increases content difficulty.

    Adds complexity for learners who are excelling and need
    more challenge to stay engaged.
    """

    strategy_type = AdaptationStrategy.INCREASE_DIFFICULTY

    DIFFICULTY_INCREASE = 0.1
    VOCABULARY_INCREASE = 0.1

    async def apply(
        self,
        content: Dict[str, Any],
        features: ContentFeatures,
        context: AdaptationContext,
    ) -> Tuple[Dict[str, Any], ContentFeatures]:
        """
        Increase difficulty by:
        - Using more sophisticated vocabulary
        - Introducing more complex concepts
        - Reducing explicit guidance
        - Adding challenging extension questions
        """
        instruction = """Increase the challenge level of this content:
1. Introduce more sophisticated vocabulary where appropriate
2. Add more nuanced or complex aspects of the concepts
3. Include challenging extension questions or problems
4. Reduce step-by-step guidance to encourage independent thinking
5. Add connections to related advanced topics"""

        constraints = [
            "Keep content appropriate for the subject matter",
            "Ensure increased difficulty is gradual, not overwhelming",
            "Maintain core learning objectives",
            "Add challenge through depth, not just complexity",
        ]

        adapted_content = await self._adapt_with_llm(content, instruction, constraints)

        new_features = features.copy_with_changes(
            difficulty_level=min(1.0, features.difficulty_level + self.DIFFICULTY_INCREASE),
            vocabulary_level=min(1.0, features.vocabulary_level + self.VOCABULARY_INCREASE),
            concept_density=min(1.0, features.concept_density + 0.1),
        )

        logger.info(
            f"Increased difficulty for learner {context.learner_id}: "
            f"{features.difficulty_level:.2f} -> {new_features.difficulty_level:.2f}"
        )

        return adapted_content, new_features

    def can_apply(self, features: ContentFeatures) -> bool:
        """Can increase difficulty if not already at maximum."""
        return features.difficulty_level < 0.9


class AddScaffoldingStrategy(BaseAdaptationStrategy):
    """
    Adds learning scaffolds to content.

    Provides structured support that can be gradually removed
    as learners gain competence.
    """

    strategy_type = AdaptationStrategy.ADD_SCAFFOLDING

    SCAFFOLD_TYPES = [
        ScaffoldType.WORKED_EXAMPLE,
        ScaffoldType.STEP_HINTS,
        ScaffoldType.VOCABULARY_SUPPORT,
        ScaffoldType.VISUAL_ORGANIZER,
        ScaffoldType.CHUNKED_PRESENTATION,
        ScaffoldType.PROGRESS_INDICATORS,
        ScaffoldType.SELF_CHECK_QUESTIONS,
    ]

    SCAFFOLDING_INCREASE = 0.2

    async def apply(
        self,
        content: Dict[str, Any],
        features: ContentFeatures,
        context: AdaptationContext,
    ) -> Tuple[Dict[str, Any], ContentFeatures]:
        """
        Add scaffolding based on learner needs:
        - Worked examples before practice
        - Hints at key decision points
        - Vocabulary definitions inline
        - Visual organizers for complex info
        """
        needed_scaffolds = self._identify_needed_scaffolds(content, context)
        scaffold_instruction = self._build_scaffold_instruction(needed_scaffolds)

        constraints = [
            "Scaffolds should support, not replace, learning",
            "Make scaffolds clearly distinguishable from main content",
            "Ensure scaffolds are age-appropriate",
            "Include clear markers for scaffold elements",
        ]

        adapted_content = await self._adapt_with_llm(
            content, scaffold_instruction, constraints
        )

        # Add scaffold metadata
        adapted_content["scaffolds"] = {
            "types": [s.value for s in needed_scaffolds],
            "active": True,
            "level": min(1.0, features.scaffolding_level + self.SCAFFOLDING_INCREASE),
        }

        new_features = features.copy_with_changes(
            scaffolding_level=min(1.0, features.scaffolding_level + self.SCAFFOLDING_INCREASE),
        )

        logger.info(
            f"Added scaffolding for learner {context.learner_id}: "
            f"types={[s.value for s in needed_scaffolds]}"
        )

        return adapted_content, new_features

    def can_apply(self, features: ContentFeatures) -> bool:
        """Can add scaffolding if not already at maximum."""
        return features.scaffolding_level < 0.9

    def _identify_needed_scaffolds(
        self,
        content: Dict[str, Any],
        context: AdaptationContext,
    ) -> List[ScaffoldType]:
        """Identify what scaffolds would help this learner."""
        scaffolds = []

        # Always add worked example for struggling learners
        if context.recent_accuracy < 0.6:
            scaffolds.append(ScaffoldType.WORKED_EXAMPLE)
            scaffolds.append(ScaffoldType.STEP_HINTS)

        # Add vocabulary support if language is complex
        if context.cognitive_state.cognitive_load > 0.6:
            scaffolds.append(ScaffoldType.VOCABULARY_SUPPORT)
            scaffolds.append(ScaffoldType.CHUNKED_PRESENTATION)

        # Add visual organizer for dense content
        if content.get("concept_count", 0) > 3:
            scaffolds.append(ScaffoldType.VISUAL_ORGANIZER)

        # Add progress indicators for long content
        if content.get("estimated_duration_minutes", 0) > 10:
            scaffolds.append(ScaffoldType.PROGRESS_INDICATORS)

        # Add self-check questions
        if context.cognitive_state.confidence < 0.5:
            scaffolds.append(ScaffoldType.SELF_CHECK_QUESTIONS)

        # Ensure at least some scaffolding
        if not scaffolds:
            scaffolds = [ScaffoldType.STEP_HINTS, ScaffoldType.PROGRESS_INDICATORS]

        return scaffolds

    def _build_scaffold_instruction(self, scaffolds: List[ScaffoldType]) -> str:
        """Build instruction for adding specific scaffolds."""
        scaffold_descriptions = {
            ScaffoldType.WORKED_EXAMPLE: "Add a fully worked example before practice problems",
            ScaffoldType.STEP_HINTS: "Add hints at key decision points",
            ScaffoldType.VOCABULARY_SUPPORT: "Add inline definitions for complex terms",
            ScaffoldType.VISUAL_ORGANIZER: "Add a visual organizer (diagram, flowchart, or outline)",
            ScaffoldType.CHUNKED_PRESENTATION: "Break content into smaller, numbered chunks",
            ScaffoldType.PROGRESS_INDICATORS: "Add progress markers (e.g., 'Step 1 of 4')",
            ScaffoldType.SELF_CHECK_QUESTIONS: "Add self-check questions after key concepts",
            ScaffoldType.CONCEPT_MAP: "Add a concept map showing relationships",
            ScaffoldType.GUIDED_PRACTICE: "Add guided practice with partial solutions",
        }

        instructions = [scaffold_descriptions.get(s, str(s)) for s in scaffolds]

        return f"""Add the following learning scaffolds to this content:
{chr(10).join(f'- {inst}' for inst in instructions)}

Ensure scaffolds are:
1. Clearly marked and distinguishable from main content
2. Supportive but not giving away answers
3. Appropriate for the content level"""


class RemoveScaffoldingStrategy(BaseAdaptationStrategy):
    """
    Removes scaffolding from content.

    Gradually fades scaffolds as learners demonstrate competence,
    promoting independence.
    """

    strategy_type = AdaptationStrategy.REMOVE_SCAFFOLDING

    SCAFFOLDING_DECREASE = 0.2

    async def apply(
        self,
        content: Dict[str, Any],
        features: ContentFeatures,
        context: AdaptationContext,
    ) -> Tuple[Dict[str, Any], ContentFeatures]:
        """Remove scaffolding to promote learner independence."""
        instruction = """Reduce scaffolding in this content:
1. Remove or simplify explicit hints
2. Remove step-by-step breakdowns where possible
3. Combine smaller chunks into larger sections
4. Remove excessive visual organizers
5. Keep only essential vocabulary support"""

        constraints = [
            "Remove scaffolds gradually, not all at once",
            "Keep critical support elements",
            "Maintain content clarity",
            "Ensure content remains accessible",
        ]

        adapted_content = await self._adapt_with_llm(content, instruction, constraints)

        # Update scaffold metadata
        if "scaffolds" in adapted_content:
            adapted_content["scaffolds"]["level"] = max(
                0.0, features.scaffolding_level - self.SCAFFOLDING_DECREASE
            )
            adapted_content["scaffolds"]["active"] = (
                adapted_content["scaffolds"]["level"] > 0.1
            )

        new_features = features.copy_with_changes(
            scaffolding_level=max(0.0, features.scaffolding_level - self.SCAFFOLDING_DECREASE),
        )

        logger.info(
            f"Removed scaffolding for learner {context.learner_id}: "
            f"{features.scaffolding_level:.2f} -> {new_features.scaffolding_level:.2f}"
        )

        return adapted_content, new_features

    def can_apply(self, features: ContentFeatures) -> bool:
        """Can remove scaffolding if some exists."""
        return features.scaffolding_level > 0.1


class SimplifyLanguageStrategy(BaseAdaptationStrategy):
    """
    Simplifies language complexity.

    Modifies text to use simpler vocabulary, shorter sentences,
    and clearer structure.
    """

    strategy_type = AdaptationStrategy.SIMPLIFY_LANGUAGE

    async def apply(
        self,
        content: Dict[str, Any],
        features: ContentFeatures,
        context: AdaptationContext,
    ) -> Tuple[Dict[str, Any], ContentFeatures]:
        """
        Simplify language by:
        - Reducing sentence length
        - Using common vocabulary
        - Using active voice
        - Ensuring clear pronoun references
        """
        instruction = """Simplify the language in this content:
1. Use shorter sentences (aim for 15-20 words maximum)
2. Replace complex words with simpler alternatives
3. Use active voice instead of passive voice
4. Make pronoun references clear and unambiguous
5. Use concrete rather than abstract language
6. Add transition words for clarity"""

        constraints = [
            "Preserve all factual information",
            "Maintain technical terms when necessary (but define them)",
            "Keep the educational meaning intact",
            "Ensure the content remains engaging",
        ]

        adapted_content = await self._adapt_with_llm(content, instruction, constraints)

        new_features = features.copy_with_changes(
            vocabulary_level=max(0.0, features.vocabulary_level - 0.2),
            sentence_complexity=max(0.0, features.sentence_complexity - 0.2),
        )

        logger.info(
            f"Simplified language for learner {context.learner_id}: "
            f"vocabulary {features.vocabulary_level:.2f} -> {new_features.vocabulary_level:.2f}"
        )

        return adapted_content, new_features

    def can_apply(self, features: ContentFeatures) -> bool:
        """Can simplify if vocabulary or sentence complexity is above minimum."""
        return features.vocabulary_level > 0.2 or features.sentence_complexity > 0.2


class AddVisualAidsStrategy(BaseAdaptationStrategy):
    """
    Adds visual supports to content.

    Enhances content with diagrams, charts, icons, and
    other visual elements to support understanding.
    """

    strategy_type = AdaptationStrategy.ADD_VISUAL_AIDS

    async def apply(
        self,
        content: Dict[str, Any],
        features: ContentFeatures,
        context: AdaptationContext,
    ) -> Tuple[Dict[str, Any], ContentFeatures]:
        """
        Add visual aids:
        - Diagrams for processes
        - Charts for data
        - Icons for navigation
        - Color coding for categories
        """
        instruction = """Add visual aids to enhance this content:
1. Suggest diagrams for processes or sequences
2. Add descriptions for charts or graphs where data is presented
3. Include suggestions for icons or visual markers
4. Add color-coding suggestions for categories or concepts
5. Describe any images or illustrations that would help

Format visual suggestions as:
[VISUAL: type - description]"""

        constraints = [
            "Visual aids should clarify, not distract",
            "Keep visuals simple and focused",
            "Ensure visuals are accessible (include alt text descriptions)",
            "Match visuals to the content's educational goals",
        ]

        adapted_content = await self._adapt_with_llm(content, instruction, constraints)

        # Add visual metadata
        adapted_content["visual_aids"] = {
            "enhanced": True,
            "level": min(1.0, features.visual_support_level + 0.25),
        }

        new_features = features.copy_with_changes(
            visual_support_level=min(1.0, features.visual_support_level + 0.25),
        )

        logger.info(
            f"Added visual aids for learner {context.learner_id}: "
            f"{features.visual_support_level:.2f} -> {new_features.visual_support_level:.2f}"
        )

        return adapted_content, new_features

    def can_apply(self, features: ContentFeatures) -> bool:
        """Can add visual aids if not already heavily visual."""
        return features.visual_support_level < 0.8


class StepByStepStrategy(BaseAdaptationStrategy):
    """
    Breaks content into explicit steps.

    Converts complex processes or explanations into
    numbered, sequential steps.
    """

    strategy_type = AdaptationStrategy.STEP_BY_STEP

    async def apply(
        self,
        content: Dict[str, Any],
        features: ContentFeatures,
        context: AdaptationContext,
    ) -> Tuple[Dict[str, Any], ContentFeatures]:
        """
        Convert to step-by-step format:
        - Number each step
        - One action per step
        - Clear transitions
        - Completion indicators
        """
        instruction = """Convert this content to step-by-step format:
1. Break down into numbered steps
2. Each step should have one clear action or concept
3. Add clear transitions between steps (e.g., "Next...", "Now...")
4. Include completion indicators (e.g., checkboxes, "Done!")
5. Add brief explanations for why each step matters

Format as:
Step 1: [action]
[brief explanation]

Step 2: [action]
..."""

        constraints = [
            "Keep steps atomic - one action each",
            "Maintain logical flow between steps",
            "Don't break natural groupings",
            "Include all necessary information",
        ]

        adapted_content = await self._adapt_with_llm(content, instruction, constraints)

        # Add step metadata
        adapted_content["step_format"] = {
            "enabled": True,
            "style": "numbered",
        }

        new_features = features.copy_with_changes(
            scaffolding_level=min(1.0, features.scaffolding_level + 0.15),
            concept_density=max(0.0, features.concept_density - 0.1),
        )

        logger.info(f"Converted to step-by-step for learner {context.learner_id}")

        return adapted_content, new_features

    def can_apply(self, features: ContentFeatures) -> bool:
        """Can apply step-by-step to any content."""
        return True


class AddExamplesStrategy(BaseAdaptationStrategy):
    """
    Adds examples to content.

    Provides concrete examples to illustrate abstract
    concepts and reinforce understanding.
    """

    strategy_type = AdaptationStrategy.ADD_EXAMPLES

    async def apply(
        self,
        content: Dict[str, Any],
        features: ContentFeatures,
        context: AdaptationContext,
    ) -> Tuple[Dict[str, Any], ContentFeatures]:
        """Add concrete examples to illustrate concepts."""
        instruction = """Add examples to clarify the concepts in this content:
1. Add at least 2-3 concrete examples for each main concept
2. Include both simple and more complex examples
3. Use relatable, real-world scenarios
4. Add non-examples where helpful (showing what something is NOT)
5. Include worked examples for any procedures

Format examples clearly:
Example: [concrete example]
Why this works: [brief explanation]"""

        constraints = [
            "Examples should be age-appropriate",
            "Use diverse and inclusive examples",
            "Ensure examples are accurate and relevant",
            "Don't overwhelm with too many examples",
        ]

        adapted_content = await self._adapt_with_llm(content, instruction, constraints)

        new_features = features.copy_with_changes(
            scaffolding_level=min(1.0, features.scaffolding_level + 0.1),
        )

        logger.info(f"Added examples for learner {context.learner_id}")

        return adapted_content, new_features

    def can_apply(self, features: ContentFeatures) -> bool:
        """Can always add examples."""
        return True


class ChangeFormatStrategy(BaseAdaptationStrategy):
    """
    Changes the format of content.

    Transforms content between different modalities or
    presentation formats.
    """

    strategy_type = AdaptationStrategy.CHANGE_FORMAT

    async def apply(
        self,
        content: Dict[str, Any],
        features: ContentFeatures,
        context: AdaptationContext,
    ) -> Tuple[Dict[str, Any], ContentFeatures]:
        """Change content format to suit learner preferences."""
        target_format = self._determine_target_format(content, context)

        instruction = f"""Reformat this content for {target_format.value} presentation:
1. Adapt the content structure for {target_format.value} format
2. Optimize for the strengths of {target_format.value} delivery
3. Maintain all educational content and objectives
4. Add format-specific enhancements"""

        constraints = [
            "Preserve all learning objectives",
            "Ensure format change improves accessibility",
            "Include necessary metadata for the new format",
        ]

        adapted_content = await self._adapt_with_llm(content, instruction, constraints)

        # Add format metadata
        adapted_content["format"] = {
            "type": target_format.value,
            "converted_from": features.format.value,
        }

        new_features = features.copy_with_changes(
            format=target_format,
        )

        logger.info(
            f"Changed format for learner {context.learner_id}: "
            f"{features.format.value} -> {target_format.value}"
        )

        return adapted_content, new_features

    def can_apply(self, features: ContentFeatures) -> bool:
        """Can change format for most content types."""
        return True

    def _determine_target_format(
        self,
        content: Dict[str, Any],
        context: AdaptationContext,
    ) -> ContentFormat:
        """Determine the best target format based on context."""
        preferences = context.learner_preferences

        # Check learner preferences
        if preferences.get("preferred_modality") == "visual":
            return ContentFormat.VISUAL
        elif preferences.get("preferred_modality") == "interactive":
            return ContentFormat.INTERACTIVE
        elif preferences.get("preferred_modality") == "audio":
            return ContentFormat.AUDIO

        # Default based on engagement
        if context.cognitive_state.engagement < 0.5:
            return ContentFormat.INTERACTIVE

        return ContentFormat.MIXED


class AddHintsStrategy(BaseAdaptationStrategy):
    """
    Adds hints to content.

    Provides progressive hints that guide learners toward
    understanding without giving away answers.
    """

    strategy_type = AdaptationStrategy.ADD_HINTS

    async def apply(
        self,
        content: Dict[str, Any],
        features: ContentFeatures,
        context: AdaptationContext,
    ) -> Tuple[Dict[str, Any], ContentFeatures]:
        """Add progressive hints to content."""
        instruction = """Add a hint system to this content:
1. Add 3 levels of hints for each question/problem:
   - Hint 1: General direction (doesn't give away answer)
   - Hint 2: More specific guidance
   - Hint 3: Nearly complete guidance
2. Make hints progressive (each reveals more)
3. Format hints to be revealed one at a time
4. Include encouraging language in hints

Format as:
[HINT-1]: [subtle hint]
[HINT-2]: [more direct hint]
[HINT-3]: [detailed guidance]"""

        constraints = [
            "Hints should guide, not give answers",
            "Each hint level should be genuinely more helpful",
            "Maintain learner agency and thinking",
            "Use encouraging, growth-mindset language",
        ]

        adapted_content = await self._adapt_with_llm(content, instruction, constraints)

        # Add hint metadata
        adapted_content["hints"] = {
            "enabled": True,
            "levels": 3,
            "progressive": True,
        }

        new_features = features.copy_with_changes(
            scaffolding_level=min(1.0, features.scaffolding_level + 0.1),
        )

        logger.info(f"Added hints for learner {context.learner_id}")

        return adapted_content, new_features

    def can_apply(self, features: ContentFeatures) -> bool:
        """Can add hints to any content."""
        return True


class ReduceCognitiveLoadStrategy(BaseAdaptationStrategy):
    """
    Reduces cognitive load of content.

    Streamlines content to reduce extraneous processing
    and focus on essential elements.
    """

    strategy_type = AdaptationStrategy.REDUCE_COGNITIVE_LOAD

    async def apply(
        self,
        content: Dict[str, Any],
        features: ContentFeatures,
        context: AdaptationContext,
    ) -> Tuple[Dict[str, Any], ContentFeatures]:
        """
        Reduce cognitive load by:
        - Removing extraneous information
        - Focusing on essential elements
        - Reducing split attention
        - Using consistent formatting
        """
        instruction = """Reduce the cognitive load of this content:
1. Remove non-essential information and distractions
2. Integrate text with related visuals (avoid split attention)
3. Use consistent formatting and structure throughout
4. Chunk information into manageable pieces
5. Remove redundant information
6. Simplify navigation and structure"""

        constraints = [
            "Preserve all essential learning content",
            "Don't oversimplify to the point of losing meaning",
            "Maintain engagement while reducing load",
            "Keep critical examples and explanations",
        ]

        adapted_content = await self._adapt_with_llm(content, instruction, constraints)

        new_features = features.copy_with_changes(
            concept_density=max(0.0, features.concept_density - 0.2),
            sentence_complexity=max(0.0, features.sentence_complexity - 0.1),
        )

        logger.info(
            f"Reduced cognitive load for learner {context.learner_id}: "
            f"concept_density {features.concept_density:.2f} -> {new_features.concept_density:.2f}"
        )

        return adapted_content, new_features

    def can_apply(self, features: ContentFeatures) -> bool:
        """Can reduce load if content has significant density or complexity."""
        return features.concept_density > 0.3 or features.sentence_complexity > 0.3


class IncreaseEngagementStrategy(BaseAdaptationStrategy):
    """
    Increases engagement of content.

    Adds elements that increase learner interest and
    motivation.
    """

    strategy_type = AdaptationStrategy.INCREASE_ENGAGEMENT

    async def apply(
        self,
        content: Dict[str, Any],
        features: ContentFeatures,
        context: AdaptationContext,
    ) -> Tuple[Dict[str, Any], ContentFeatures]:
        """Increase engagement through various techniques."""
        instruction = """Make this content more engaging:
1. Add interactive elements or suggestions for interactivity
2. Include relevant, interesting real-world connections
3. Add gamification elements where appropriate (points, challenges)
4. Include questions that provoke curiosity
5. Add variety in content presentation
6. Include optional extension activities"""

        constraints = [
            "Keep educational focus - engagement serves learning",
            "Age-appropriate engagement techniques",
            "Don't distract from core content",
            "Balance fun with educational value",
        ]

        adapted_content = await self._adapt_with_llm(content, instruction, constraints)

        # Add engagement metadata
        adapted_content["engagement"] = {
            "enhanced": True,
            "techniques": ["interactivity", "gamification", "real_world"],
        }

        new_features = features.copy_with_changes(
            interactivity_level=min(1.0, features.interactivity_level + 0.2),
        )

        logger.info(
            f"Increased engagement for learner {context.learner_id}: "
            f"interactivity {features.interactivity_level:.2f} -> {new_features.interactivity_level:.2f}"
        )

        return adapted_content, new_features

    def can_apply(self, features: ContentFeatures) -> bool:
        """Can increase engagement for any content."""
        return True


class ProvideReviewStrategy(BaseAdaptationStrategy):
    """
    Provides review content.

    Generates review materials based on the content and
    learner's performance history.
    """

    strategy_type = AdaptationStrategy.PROVIDE_REVIEW

    async def apply(
        self,
        content: Dict[str, Any],
        features: ContentFeatures,
        context: AdaptationContext,
    ) -> Tuple[Dict[str, Any], ContentFeatures]:
        """Add review materials to reinforce learning."""
        weak_areas = self._identify_weak_areas(context)

        instruction = f"""Add review materials to this content:
1. Add a summary section at the end
2. Include review questions covering key concepts
3. Add spaced repetition suggestions
4. Focus review on these identified weak areas: {weak_areas}
5. Include connections to previously learned material

Format review section clearly:
## Review
[summary]

### Review Questions
1. [question]
..."""

        constraints = [
            "Review should reinforce, not introduce new material",
            "Questions should be at appropriate difficulty",
            "Include both recognition and recall questions",
            "Provide answer keys separately",
        ]

        adapted_content = await self._adapt_with_llm(content, instruction, constraints)

        # Add review metadata
        adapted_content["review"] = {
            "included": True,
            "focus_areas": weak_areas,
        }

        new_features = features.copy_with_changes(
            scaffolding_level=min(1.0, features.scaffolding_level + 0.05),
        )

        logger.info(
            f"Added review for learner {context.learner_id}, "
            f"focus areas: {weak_areas}"
        )

        return adapted_content, new_features

    def can_apply(self, features: ContentFeatures) -> bool:
        """Can always add review."""
        return True

    def _identify_weak_areas(self, context: AdaptationContext) -> List[str]:
        """Identify areas where the learner needs review."""
        weak_areas = []

        # Analyze performance history
        for record in context.performance_history[-10:]:
            if not record.correct:
                weak_areas.append(record.content_id)

        return list(set(weak_areas))[:5]  # Top 5 unique weak areas


# Strategy registry
STRATEGY_REGISTRY: Dict[AdaptationStrategy, type] = {
    AdaptationStrategy.REDUCE_DIFFICULTY: ReduceDifficultyStrategy,
    AdaptationStrategy.INCREASE_DIFFICULTY: IncreaseDifficultyStrategy,
    AdaptationStrategy.ADD_SCAFFOLDING: AddScaffoldingStrategy,
    AdaptationStrategy.REMOVE_SCAFFOLDING: RemoveScaffoldingStrategy,
    AdaptationStrategy.SIMPLIFY_LANGUAGE: SimplifyLanguageStrategy,
    AdaptationStrategy.ADD_VISUAL_AIDS: AddVisualAidsStrategy,
    AdaptationStrategy.STEP_BY_STEP: StepByStepStrategy,
    AdaptationStrategy.ADD_EXAMPLES: AddExamplesStrategy,
    AdaptationStrategy.CHANGE_FORMAT: ChangeFormatStrategy,
    AdaptationStrategy.ADD_HINTS: AddHintsStrategy,
    AdaptationStrategy.REDUCE_COGNITIVE_LOAD: ReduceCognitiveLoadStrategy,
    AdaptationStrategy.INCREASE_ENGAGEMENT: IncreaseEngagementStrategy,
    AdaptationStrategy.PROVIDE_REVIEW: ProvideReviewStrategy,
}


def get_strategy(
    strategy_type: AdaptationStrategy,
    llm_client: Optional[LLMClient] = None,
) -> BaseAdaptationStrategy:
    """
    Get a strategy instance by type.

    Args:
        strategy_type: The type of strategy to get
        llm_client: Optional LLM client for the strategy

    Returns:
        An instance of the requested strategy
    """
    strategy_class = STRATEGY_REGISTRY.get(strategy_type)
    if not strategy_class:
        raise ValueError(f"Unknown strategy type: {strategy_type}")
    return strategy_class(llm_client=llm_client)


def get_all_strategies(
    llm_client: Optional[LLMClient] = None,
) -> Dict[AdaptationStrategy, BaseAdaptationStrategy]:
    """
    Get instances of all registered strategies.

    Args:
        llm_client: Optional LLM client for the strategies

    Returns:
        Dictionary mapping strategy types to instances
    """
    return {
        strategy_type: get_strategy(strategy_type, llm_client)
        for strategy_type in STRATEGY_REGISTRY
    }
