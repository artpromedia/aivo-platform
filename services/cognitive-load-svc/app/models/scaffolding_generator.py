"""
Scaffolding Generator

Generates adaptive scaffolding support based on cognitive load.
Implements scaffolding strategies to:
- Reduce intrinsic load (hints, worked examples)
- Reduce extraneous load (simplification, chunking)
- Increase germane load (analogies, connections)
"""

import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional

import numpy as np

logger = logging.getLogger(__name__)


class ScaffoldType(str, Enum):
    """Types of scaffolding support."""
    HINT = "hint"
    WORKED_EXAMPLE = "worked_example"
    DECOMPOSITION = "decomposition"
    VISUAL_AID = "visual_aid"
    ANALOGY = "analogy"
    SIMPLIFICATION = "simplification"
    CHUNKING = "chunking"
    PRIOR_KNOWLEDGE = "prior_knowledge"
    COMPLETION = "completion"  # Partial solution
    MODELING = "modeling"  # Expert demonstration
    QUESTIONING = "questioning"  # Guiding questions
    FEEDBACK = "feedback"  # Immediate feedback


class Domain(str, Enum):
    """Educational domains."""
    MATH = "math"
    SCIENCE = "science"
    READING = "reading"
    WRITING = "writing"
    LANGUAGE = "language"
    HISTORY = "history"
    GENERAL = "general"


@dataclass
class ScaffoldRecommendation:
    """A single scaffolding recommendation."""
    scaffold_type: ScaffoldType
    priority: int  # 1-5, lower is higher priority
    content: str  # The actual scaffold content
    rationale: str  # Why this scaffold is recommended
    expected_load_reduction: float  # 0-0.5
    target_concept: Optional[str] = None
    dependencies: List[str] = field(default_factory=list)
    fade_after: int = 3  # Number of successful uses before fading


@dataclass
class ScaffoldingPlan:
    """Complete scaffolding plan."""
    scaffolds: List[ScaffoldRecommendation]
    total_expected_load_reduction: float
    scaffolding_level: int  # 1-5
    fade_recommendation: Optional[str]
    processing_time_ms: int


@dataclass
class ScaffoldingGeneratorConfig:
    """Configuration for scaffolding generation."""
    # Load thresholds
    min_load_for_scaffolding: float = 0.5
    max_load_for_scaffolding: float = 0.95
    target_load_after_scaffolding: float = 0.6

    # Scaffold limits
    max_scaffolds_per_request: int = 5
    max_hint_length: int = 200
    max_example_length: int = 500

    # Fading parameters
    fade_threshold_success: int = 3
    fade_threshold_accuracy: float = 0.8

    # Priority weights
    load_reduction_weight: float = 0.4
    appropriateness_weight: float = 0.3
    novelty_weight: float = 0.3


# Scaffold templates by domain
SCAFFOLD_TEMPLATES = {
    Domain.MATH: {
        ScaffoldType.HINT: [
            "Try breaking this problem into smaller steps.",
            "What operation should you use here?",
            "Look at the pattern in the numbers.",
            "Can you simplify this expression first?",
            "Draw a diagram to visualize the problem.",
        ],
        ScaffoldType.WORKED_EXAMPLE: [
            "Let's work through a similar problem: {example}",
            "Here's how to approach this type of problem: {steps}",
        ],
        ScaffoldType.ANALOGY: [
            "Think of {concept} like {analogy}.",
            "This is similar to {familiar_concept}.",
        ],
        ScaffoldType.DECOMPOSITION: [
            "Step 1: {step1}\nStep 2: {step2}\nStep 3: {step3}",
            "First, find {part1}. Then, calculate {part2}.",
        ],
    },
    Domain.SCIENCE: {
        ScaffoldType.HINT: [
            "Think about cause and effect.",
            "What variables are involved?",
            "Consider what you already know about {concept}.",
            "What would happen if you changed {variable}?",
        ],
        ScaffoldType.VISUAL_AID: [
            "Look at the diagram showing {concept}.",
            "The illustration demonstrates {process}.",
        ],
        ScaffoldType.ANALOGY: [
            "Think of {concept} like {everyday_analogy}.",
            "{scientific_concept} works similar to {common_example}.",
        ],
    },
    Domain.READING: {
        ScaffoldType.HINT: [
            "Look for clues in the surrounding sentences.",
            "What is the main idea of this paragraph?",
            "Who are the main characters and what are they doing?",
            "What does the author want you to understand?",
        ],
        ScaffoldType.QUESTIONING: [
            "Why do you think the character did that?",
            "What might happen next?",
            "How does this connect to what you read earlier?",
        ],
        ScaffoldType.PRIOR_KNOWLEDGE: [
            "Remember when we learned about {related_topic}?",
            "This connects to {previous_concept}.",
        ],
    },
    Domain.WRITING: {
        ScaffoldType.HINT: [
            "Start with your main idea.",
            "What evidence supports your point?",
            "How can you connect these two ideas?",
        ],
        ScaffoldType.COMPLETION: [
            "Complete this sentence: The main reason is...",
            "Fill in: First, ___. Then, ___. Finally, ___.",
        ],
        ScaffoldType.MODELING: [
            "Here's an example of a strong topic sentence: {example}",
            "Notice how this paragraph transitions: {example}",
        ],
    },
    Domain.GENERAL: {
        ScaffoldType.HINT: [
            "Take a moment to think about what you already know.",
            "What's the first step you should take?",
            "Can you break this into smaller parts?",
        ],
        ScaffoldType.DECOMPOSITION: [
            "Let's tackle this one piece at a time.",
            "Focus on {first_part} first.",
        ],
        ScaffoldType.CHUNKING: [
            "Let's group these ideas: {group1}, {group2}.",
            "Think of these as belonging to {category}.",
        ],
    },
}


class ScaffoldingGenerator:
    """
    Generates adaptive scaffolding based on cognitive load.

    Scaffolding temporarily supports learners until they can perform
    independently. This generator creates appropriate scaffolds based on:
    - Current cognitive load level
    - Learner's knowledge state
    - Content domain
    - Previously used scaffolds

    Key principles:
    - Just-in-time support (when needed)
    - Graduated scaffolding (appropriate level)
    - Fading (reduce support as competence grows)

    Usage:
        generator = ScaffoldingGenerator()
        plan = generator.generate(
            learner_id="learner123",
            current_content="Solve: 2x + 5 = 13",
            current_load=0.8,
            domain=Domain.MATH
        )
        for scaffold in plan.scaffolds:
            print(f"{scaffold.scaffold_type}: {scaffold.content}")
    """

    def __init__(self, config: Optional[ScaffoldingGeneratorConfig] = None):
        self.config = config or ScaffoldingGeneratorConfig()

        # Track scaffold usage per learner
        self._scaffold_history: Dict[str, Dict[str, Any]] = {}

        logger.info("ScaffoldingGenerator initialized")

    def generate(
        self,
        learner_id: str,
        content_id: Optional[str] = None,
        current_content: str = "",
        current_load: float = 0.5,
        learner_knowledge_state: Optional[Dict[str, float]] = None,
        previous_scaffolds_used: Optional[List[ScaffoldType]] = None,
        learning_objective: Optional[str] = None,
        domain: Domain = Domain.GENERAL,
        max_scaffolds: int = 3,
    ) -> ScaffoldingPlan:
        """
        Generate scaffolding recommendations.

        Args:
            learner_id: Learner identifier
            content_id: Content identifier
            current_content: The content/problem needing scaffolding
            current_load: Current cognitive load (0-1)
            learner_knowledge_state: Knowledge by concept (0-1)
            previous_scaffolds_used: Scaffolds already applied
            learning_objective: What the learner should learn
            domain: Educational domain
            max_scaffolds: Maximum scaffolds to generate

        Returns:
            ScaffoldingPlan with recommendations
        """
        start_time = time.time()

        previous_scaffolds_used = previous_scaffolds_used or []
        learner_knowledge_state = learner_knowledge_state or {}

        # Determine scaffolding level based on load
        scaffolding_level = self._determine_scaffolding_level(current_load)

        # Check if scaffolding is needed
        if current_load < self.config.min_load_for_scaffolding:
            return ScaffoldingPlan(
                scaffolds=[],
                total_expected_load_reduction=0.0,
                scaffolding_level=0,
                fade_recommendation="Load is low; scaffolding not needed",
                processing_time_ms=int((time.time() - start_time) * 1000),
            )

        # Get learner history
        history = self._get_learner_history(learner_id)

        # Select appropriate scaffold types
        scaffold_types = self._select_scaffold_types(
            current_load=current_load,
            domain=domain,
            previous_used=previous_scaffolds_used,
            history=history,
            knowledge_state=learner_knowledge_state,
        )

        # Generate scaffolds
        scaffolds = []
        for i, scaffold_type in enumerate(scaffold_types[:max_scaffolds]):
            scaffold = self._generate_scaffold(
                scaffold_type=scaffold_type,
                content=current_content,
                domain=domain,
                priority=i + 1,
                knowledge_state=learner_knowledge_state,
                learning_objective=learning_objective,
            )
            if scaffold:
                scaffolds.append(scaffold)

        # Calculate total expected load reduction
        total_reduction = sum(s.expected_load_reduction for s in scaffolds)
        total_reduction = min(total_reduction, current_load - self.config.target_load_after_scaffolding)

        # Generate fade recommendation
        fade_recommendation = self._generate_fade_recommendation(history, scaffolds)

        # Update history
        self._update_history(learner_id, scaffolds)

        processing_time = int((time.time() - start_time) * 1000)

        return ScaffoldingPlan(
            scaffolds=scaffolds,
            total_expected_load_reduction=total_reduction,
            scaffolding_level=scaffolding_level,
            fade_recommendation=fade_recommendation,
            processing_time_ms=processing_time,
        )

    def generate_hint(
        self,
        content: str,
        domain: Domain,
        hint_level: int = 1,
        previous_hints: Optional[List[str]] = None,
    ) -> str:
        """
        Generate a progressive hint.

        Args:
            content: The problem/content
            domain: Educational domain
            hint_level: Level of specificity (1=vague, 5=explicit)
            previous_hints: Previously given hints

        Returns:
            Hint string
        """
        previous_hints = previous_hints or []

        templates = SCAFFOLD_TEMPLATES.get(domain, SCAFFOLD_TEMPLATES[Domain.GENERAL])
        hints = templates.get(ScaffoldType.HINT, [])

        if not hints:
            return "Think carefully about the problem."

        # Select hint based on level and previous hints
        available_hints = [h for h in hints if h not in previous_hints]

        if not available_hints:
            available_hints = hints

        # Progressive hints get more specific
        if hint_level >= 4 and len(available_hints) > 1:
            # More specific hints
            return available_hints[-1]
        elif hint_level == 1:
            # General hints
            return available_hints[0]
        else:
            # Middle ground
            idx = min(hint_level - 1, len(available_hints) - 1)
            return available_hints[idx]

    def generate_worked_example(
        self,
        content: str,
        domain: Domain,
        difficulty_level: float = 0.5,
    ) -> Dict[str, Any]:
        """
        Generate a worked example.

        Args:
            content: The target problem
            domain: Educational domain
            difficulty_level: How difficult (0-1)

        Returns:
            Worked example with steps
        """
        # This would ideally use LLM or template system
        # For now, provide structured template

        if domain == Domain.MATH:
            return {
                "type": "worked_example",
                "problem": content,
                "steps": [
                    {
                        "step_number": 1,
                        "action": "Identify what you're solving for",
                        "explanation": "Read the problem and find the unknown",
                    },
                    {
                        "step_number": 2,
                        "action": "Set up the equation",
                        "explanation": "Translate the problem into mathematical form",
                    },
                    {
                        "step_number": 3,
                        "action": "Solve step by step",
                        "explanation": "Apply operations to isolate the unknown",
                    },
                    {
                        "step_number": 4,
                        "action": "Check your answer",
                        "explanation": "Substitute back to verify",
                    },
                ],
                "similar_problem": "Try this similar problem to practice",
            }

        return {
            "type": "worked_example",
            "problem": content,
            "steps": [
                {
                    "step_number": 1,
                    "action": "Understand the problem",
                    "explanation": "Identify what you need to find or do",
                },
                {
                    "step_number": 2,
                    "action": "Break it down",
                    "explanation": "Divide into smaller parts",
                },
                {
                    "step_number": 3,
                    "action": "Work through each part",
                    "explanation": "Solve one piece at a time",
                },
            ],
        }

    def generate_decomposition(
        self,
        content: str,
        domain: Domain,
        target_chunks: int = 3,
    ) -> List[Dict[str, Any]]:
        """
        Decompose complex content into manageable chunks.

        Args:
            content: Complex content to decompose
            domain: Educational domain
            target_chunks: Number of chunks to create

        Returns:
            List of content chunks with metadata
        """
        # Simple sentence-based decomposition
        sentences = content.replace(".", ".|").replace("?", "?|").replace("!", "!|").split("|")
        sentences = [s.strip() for s in sentences if s.strip()]

        if len(sentences) <= target_chunks:
            return [
                {
                    "chunk_id": i,
                    "content": s,
                    "estimated_complexity": 0.5,
                    "focus_concept": None,
                }
                for i, s in enumerate(sentences)
            ]

        # Group sentences into chunks
        chunk_size = max(1, len(sentences) // target_chunks)
        chunks = []

        for i in range(0, len(sentences), chunk_size):
            chunk_content = " ".join(sentences[i:i + chunk_size])
            chunks.append({
                "chunk_id": len(chunks),
                "content": chunk_content,
                "estimated_complexity": 0.5 + (len(chunk_content) / 500),  # Simple heuristic
                "focus_concept": None,
            })

        return chunks[:target_chunks]

    def recommend_fading(
        self,
        learner_id: str,
        scaffold_type: ScaffoldType,
        recent_accuracy: float,
        uses_count: int,
    ) -> Dict[str, Any]:
        """
        Recommend whether to fade a scaffold.

        Args:
            learner_id: Learner identifier
            scaffold_type: Type of scaffold
            recent_accuracy: Recent performance accuracy
            uses_count: Number of times scaffold was used

        Returns:
            Fading recommendation
        """
        should_fade = False
        reason = ""
        next_level = None

        if uses_count >= self.config.fade_threshold_success:
            if recent_accuracy >= self.config.fade_threshold_accuracy:
                should_fade = True
                reason = f"Learner has used this scaffold {uses_count} times with {recent_accuracy:.0%} accuracy"
            else:
                reason = f"Continue scaffolding - accuracy ({recent_accuracy:.0%}) below threshold"

        # Determine next scaffolding level
        if should_fade:
            if scaffold_type == ScaffoldType.WORKED_EXAMPLE:
                next_level = ScaffoldType.COMPLETION
            elif scaffold_type == ScaffoldType.COMPLETION:
                next_level = ScaffoldType.HINT
            elif scaffold_type == ScaffoldType.HINT:
                next_level = None  # No scaffolding needed
            else:
                next_level = ScaffoldType.HINT

        return {
            "should_fade": should_fade,
            "reason": reason,
            "current_scaffold": scaffold_type.value,
            "recommended_next": next_level.value if next_level else None,
            "uses_count": uses_count,
            "accuracy": recent_accuracy,
        }

    def _get_learner_history(self, learner_id: str) -> Dict[str, Any]:
        """Get or create learner scaffold history."""
        if learner_id not in self._scaffold_history:
            self._scaffold_history[learner_id] = {
                "scaffold_counts": {},
                "recent_scaffolds": [],
                "effectiveness": {},
            }
        return self._scaffold_history[learner_id]

    def _update_history(
        self,
        learner_id: str,
        scaffolds: List[ScaffoldRecommendation],
    ) -> None:
        """Update scaffold history."""
        history = self._get_learner_history(learner_id)

        for scaffold in scaffolds:
            scaffold_type = scaffold.scaffold_type.value
            history["scaffold_counts"][scaffold_type] = (
                history["scaffold_counts"].get(scaffold_type, 0) + 1
            )

            history["recent_scaffolds"].append({
                "type": scaffold_type,
                "content_preview": scaffold.content[:50],
            })

        # Keep recent history bounded
        history["recent_scaffolds"] = history["recent_scaffolds"][-20:]

    def _determine_scaffolding_level(self, load: float) -> int:
        """Determine appropriate scaffolding level from load."""
        if load < 0.5:
            return 1
        elif load < 0.65:
            return 2
        elif load < 0.75:
            return 3
        elif load < 0.85:
            return 4
        else:
            return 5

    def _select_scaffold_types(
        self,
        current_load: float,
        domain: Domain,
        previous_used: List[ScaffoldType],
        history: Dict[str, Any],
        knowledge_state: Dict[str, float],
    ) -> List[ScaffoldType]:
        """Select appropriate scaffold types."""
        all_types = list(ScaffoldType)
        scored_types: List[tuple[ScaffoldType, float]] = []

        for scaffold_type in all_types:
            score = self._score_scaffold_type(
                scaffold_type=scaffold_type,
                current_load=current_load,
                domain=domain,
                previous_used=previous_used,
                history=history,
                knowledge_state=knowledge_state,
            )
            scored_types.append((scaffold_type, score))

        # Sort by score (descending)
        scored_types.sort(key=lambda x: x[1], reverse=True)

        return [t for t, s in scored_types if s > 0.3]

    def _score_scaffold_type(
        self,
        scaffold_type: ScaffoldType,
        current_load: float,
        domain: Domain,
        previous_used: List[ScaffoldType],
        history: Dict[str, Any],
        knowledge_state: Dict[str, float],
    ) -> float:
        """Score a scaffold type for appropriateness."""
        score = 0.5  # Base score

        # Load-based scoring
        if current_load > 0.8:
            # High load - prefer simplification and decomposition
            if scaffold_type in (ScaffoldType.SIMPLIFICATION, ScaffoldType.DECOMPOSITION, ScaffoldType.CHUNKING):
                score += 0.3
        elif current_load > 0.6:
            # Medium load - hints and worked examples
            if scaffold_type in (ScaffoldType.HINT, ScaffoldType.WORKED_EXAMPLE, ScaffoldType.COMPLETION):
                score += 0.2

        # Domain appropriateness
        domain_templates = SCAFFOLD_TEMPLATES.get(domain, {})
        if scaffold_type in domain_templates:
            score += 0.2

        # Novelty - penalize recently used scaffolds
        if scaffold_type in previous_used:
            score -= 0.3

        # History-based adjustment
        scaffold_count = history.get("scaffold_counts", {}).get(scaffold_type.value, 0)
        if scaffold_count > 5:
            score -= 0.1  # Slightly penalize overused scaffolds

        # Effectiveness-based adjustment
        effectiveness = history.get("effectiveness", {}).get(scaffold_type.value, 0.5)
        score += (effectiveness - 0.5) * 0.3

        return max(0.0, min(1.0, score))

    def _generate_scaffold(
        self,
        scaffold_type: ScaffoldType,
        content: str,
        domain: Domain,
        priority: int,
        knowledge_state: Dict[str, float],
        learning_objective: Optional[str],
    ) -> Optional[ScaffoldRecommendation]:
        """Generate a specific scaffold."""
        # Get template
        templates = SCAFFOLD_TEMPLATES.get(domain, SCAFFOLD_TEMPLATES[Domain.GENERAL])
        type_templates = templates.get(scaffold_type, [])

        if not type_templates:
            # Fall back to general templates
            type_templates = SCAFFOLD_TEMPLATES[Domain.GENERAL].get(scaffold_type, [])

        if not type_templates:
            return None

        # Select template (could be randomized or based on context)
        template = type_templates[0]

        # Generate content
        scaffold_content = self._fill_template(template, content, knowledge_state)

        # Calculate expected load reduction
        load_reduction = self._estimate_load_reduction(scaffold_type)

        # Generate rationale
        rationale = self._generate_rationale(scaffold_type, domain)

        return ScaffoldRecommendation(
            scaffold_type=scaffold_type,
            priority=priority,
            content=scaffold_content,
            rationale=rationale,
            expected_load_reduction=load_reduction,
            target_concept=learning_objective,
        )

    def _fill_template(
        self,
        template: str,
        content: str,
        knowledge_state: Dict[str, float],
    ) -> str:
        """Fill in template placeholders."""
        # Simple placeholder replacement
        result = template

        # Extract potential concepts from content
        words = content.split()
        concept_word = words[0] if words else "this concept"

        result = result.replace("{concept}", concept_word)
        result = result.replace("{example}", "a similar problem")
        result = result.replace("{steps}", "1. Read carefully, 2. Identify key information, 3. Apply what you know")
        result = result.replace("{analogy}", "something familiar")

        return result

    def _estimate_load_reduction(self, scaffold_type: ScaffoldType) -> float:
        """Estimate cognitive load reduction from scaffold."""
        reductions = {
            ScaffoldType.HINT: 0.1,
            ScaffoldType.WORKED_EXAMPLE: 0.25,
            ScaffoldType.DECOMPOSITION: 0.2,
            ScaffoldType.VISUAL_AID: 0.15,
            ScaffoldType.ANALOGY: 0.15,
            ScaffoldType.SIMPLIFICATION: 0.2,
            ScaffoldType.CHUNKING: 0.15,
            ScaffoldType.PRIOR_KNOWLEDGE: 0.1,
            ScaffoldType.COMPLETION: 0.15,
            ScaffoldType.MODELING: 0.2,
            ScaffoldType.QUESTIONING: 0.05,
            ScaffoldType.FEEDBACK: 0.1,
        }
        return reductions.get(scaffold_type, 0.1)

    def _generate_rationale(self, scaffold_type: ScaffoldType, domain: Domain) -> str:
        """Generate rationale for scaffold recommendation."""
        rationales = {
            ScaffoldType.HINT: "A hint provides guidance without giving away the answer, promoting active thinking.",
            ScaffoldType.WORKED_EXAMPLE: "Worked examples reduce cognitive load by demonstrating the problem-solving process.",
            ScaffoldType.DECOMPOSITION: "Breaking down the problem reduces working memory demands.",
            ScaffoldType.VISUAL_AID: "Visual representations can make abstract concepts more concrete.",
            ScaffoldType.ANALOGY: "Connecting new information to familiar concepts aids understanding.",
            ScaffoldType.SIMPLIFICATION: "Simplifying reduces extraneous load while preserving learning objectives.",
            ScaffoldType.CHUNKING: "Grouping related information makes it easier to process and remember.",
            ScaffoldType.PRIOR_KNOWLEDGE: "Activating prior knowledge provides a foundation for new learning.",
            ScaffoldType.COMPLETION: "Partial solutions reduce load while maintaining active engagement.",
            ScaffoldType.MODELING: "Expert modeling shows the desired approach and thought process.",
            ScaffoldType.QUESTIONING: "Questions guide thinking without providing direct answers.",
            ScaffoldType.FEEDBACK: "Immediate feedback helps correct misconceptions early.",
        }
        return rationales.get(scaffold_type, "This scaffold supports learning.")

    def _generate_fade_recommendation(
        self,
        history: Dict[str, Any],
        scaffolds: List[ScaffoldRecommendation],
    ) -> Optional[str]:
        """Generate recommendation for fading scaffolds."""
        scaffold_counts = history.get("scaffold_counts", {})

        heavily_used = [
            (k, v) for k, v in scaffold_counts.items()
            if v >= self.config.fade_threshold_success
        ]

        if not heavily_used:
            return None

        most_used = max(heavily_used, key=lambda x: x[1])
        return f"Consider fading {most_used[0]} - used {most_used[1]} times. " \
               f"Gradually reduce support as learner demonstrates competence."
