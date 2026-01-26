"""
Bloom's Taxonomy Classifier.

Classifies questions by their cognitive level according to Bloom's Taxonomy.
Uses keyword matching and pattern analysis for classification.
"""

import logging
import re
from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


class BloomLevel(Enum):
    """Bloom's Taxonomy cognitive levels (revised)."""

    REMEMBER = "remember"
    UNDERSTAND = "understand"
    APPLY = "apply"
    ANALYZE = "analyze"
    EVALUATE = "evaluate"
    CREATE = "create"


# Numerical ordering for comparison
BLOOM_ORDER = {
    BloomLevel.REMEMBER: 1,
    BloomLevel.UNDERSTAND: 2,
    BloomLevel.APPLY: 3,
    BloomLevel.ANALYZE: 4,
    BloomLevel.EVALUATE: 5,
    BloomLevel.CREATE: 6,
}


@dataclass
class BloomClassification:
    """Result of Bloom's taxonomy classification."""

    primary_level: BloomLevel
    confidence: float
    level_probabilities: Dict[str, float]
    matched_keywords: List[str] = None

    def __post_init__(self):
        if self.matched_keywords is None:
            self.matched_keywords = []


@dataclass
class BloomClassifierConfig:
    """Configuration for Bloom's taxonomy classifier."""

    use_ml_model: bool = False
    ml_model_path: Optional[str] = None
    min_confidence: float = 0.3


class BloomClassifier:
    """
    Classify questions by Bloom's Taxonomy cognitive level.

    Levels (from lowest to highest):
    1. Remember - Recall facts and basic concepts
    2. Understand - Explain ideas or concepts
    3. Apply - Use information in new situations
    4. Analyze - Draw connections among ideas
    5. Evaluate - Justify a stand or decision
    6. Create - Produce new or original work

    Uses keyword patterns and question structure analysis.

    Usage:
        classifier = BloomClassifier()
        result = classifier.classify("What year did WWII end?")
        print(result.primary_level)  # BloomLevel.REMEMBER
    """

    # Keywords and patterns for each Bloom level
    BLOOM_KEYWORDS: Dict[BloomLevel, List[str]] = {
        BloomLevel.REMEMBER: [
            # Question starters
            "what is",
            "what are",
            "what was",
            "what were",
            "who is",
            "who was",
            "who were",
            "when did",
            "when was",
            "where is",
            "where was",
            "which",
            "how many",
            "how much",
            # Action verbs
            "define",
            "list",
            "name",
            "identify",
            "recall",
            "recognize",
            "state",
            "describe",
            "label",
            "match",
            "select",
            "locate",
            "memorize",
            "repeat",
            "reproduce",
        ],
        BloomLevel.UNDERSTAND: [
            # Question starters
            "explain",
            "describe",
            "summarize",
            "paraphrase",
            "interpret",
            "what does .* mean",
            "in your own words",
            "give an example",
            # Action verbs
            "classify",
            "compare",
            "contrast",
            "demonstrate",
            "discuss",
            "distinguish",
            "estimate",
            "extend",
            "generalize",
            "illustrate",
            "infer",
            "outline",
            "predict",
            "restate",
            "translate",
        ],
        BloomLevel.APPLY: [
            # Question starters
            "how would you use",
            "how can you apply",
            "what would happen if",
            "how would you solve",
            "calculate",
            "compute",
            # Action verbs
            "apply",
            "demonstrate",
            "dramatize",
            "employ",
            "illustrate",
            "implement",
            "interpret",
            "operate",
            "practice",
            "schedule",
            "sketch",
            "solve",
            "use",
            "modify",
            "change",
        ],
        BloomLevel.ANALYZE: [
            # Question starters
            "why did",
            "why does",
            "why is",
            "why are",
            "what is the relationship",
            "what are the differences",
            "what are the similarities",
            "how does .* compare",
            "what is the cause",
            "what is the effect",
            # Action verbs
            "analyze",
            "break down",
            "categorize",
            "compare",
            "contrast",
            "correlate",
            "deconstruct",
            "diagram",
            "differentiate",
            "discriminate",
            "distinguish",
            "examine",
            "experiment",
            "focus",
            "infer",
            "inspect",
            "investigate",
            "organize",
            "probe",
            "question",
            "separate",
            "test",
        ],
        BloomLevel.EVALUATE: [
            # Question starters
            "do you agree",
            "what is your opinion",
            "is it better",
            "which is better",
            "should",
            "would you recommend",
            "what is the best",
            "what is the most important",
            "how would you rate",
            "how effective",
            # Action verbs
            "appraise",
            "argue",
            "assess",
            "choose",
            "conclude",
            "convince",
            "criticize",
            "critique",
            "decide",
            "defend",
            "determine",
            "dispute",
            "evaluate",
            "grade",
            "judge",
            "justify",
            "measure",
            "prioritize",
            "rank",
            "rate",
            "recommend",
            "select",
            "support",
            "validate",
            "value",
            "verify",
        ],
        BloomLevel.CREATE: [
            # Question starters
            "design",
            "create",
            "develop",
            "propose",
            "what would you create",
            "how would you design",
            "can you construct",
            "what if",
            "imagine",
            # Action verbs
            "arrange",
            "assemble",
            "build",
            "collect",
            "combine",
            "compile",
            "compose",
            "construct",
            "design",
            "develop",
            "devise",
            "formulate",
            "generate",
            "hypothesize",
            "integrate",
            "invent",
            "make",
            "originate",
            "plan",
            "prepare",
            "produce",
            "propose",
            "set up",
            "synthesize",
        ],
    }

    # Compiled regex patterns for efficiency
    _patterns: Dict[BloomLevel, List[re.Pattern]] = {}

    def __init__(self, config: Optional[BloomClassifierConfig] = None, model_path: str = None):
        """Initialize the Bloom's taxonomy classifier."""
        self.config = config or BloomClassifierConfig()
        if model_path:
            self.config.ml_model_path = model_path
        self._compile_patterns()
        logger.info("BloomClassifier initialized")

    def _compile_patterns(self) -> None:
        """Compile keyword patterns to regex for efficient matching."""
        for level, keywords in self.BLOOM_KEYWORDS.items():
            self._patterns[level] = []
            for keyword in keywords:
                # Convert keyword to regex pattern
                # Add word boundaries for single words
                if " " not in keyword and ".*" not in keyword:
                    pattern = rf"\b{re.escape(keyword)}\b"
                else:
                    pattern = keyword.replace(" ", r"\s+")
                try:
                    self._patterns[level].append(
                        re.compile(pattern, re.IGNORECASE)
                    )
                except re.error:
                    logger.warning(f"Invalid pattern: {keyword}")

    def classify(self, question: str) -> BloomClassification:
        """
        Classify a question's Bloom's taxonomy level.

        Args:
            question: The question text to classify

        Returns:
            BloomClassification with primary level and confidence
        """
        question_lower = question.lower().strip()

        # Count matches for each level
        level_scores: Dict[BloomLevel, float] = {
            level: 0.0 for level in BloomLevel
        }
        matched_keywords: Dict[BloomLevel, List[str]] = {
            level: [] for level in BloomLevel
        }

        for level, patterns in self._patterns.items():
            for pattern in patterns:
                if pattern.search(question_lower):
                    # Position-based weighting: matches at start are more important
                    match = pattern.search(question_lower)
                    if match:
                        position_weight = 1.0 - (match.start() / max(len(question_lower), 1)) * 0.3
                        level_scores[level] += position_weight
                        matched_keywords[level].append(pattern.pattern)

        # Apply structural analysis
        level_scores = self._apply_structural_analysis(
            question_lower, level_scores
        )

        # Normalize scores to probabilities
        total_score = sum(level_scores.values())
        if total_score > 0:
            level_probabilities = {
                level.value: score / total_score
                for level, score in level_scores.items()
            }
        else:
            # Default to REMEMBER if no matches
            level_probabilities = {level.value: 0.0 for level in BloomLevel}
            level_probabilities["remember"] = 1.0

        # Find primary level
        primary_level = max(level_scores, key=level_scores.get)
        confidence = level_scores[primary_level] / max(total_score, 1)

        # Apply minimum confidence threshold
        if confidence < self.config.min_confidence:
            primary_level = BloomLevel.REMEMBER
            confidence = self.config.min_confidence

        return BloomClassification(
            primary_level=primary_level,
            confidence=min(confidence, 1.0),
            level_probabilities=level_probabilities,
            matched_keywords=matched_keywords[primary_level],
        )

    def _apply_structural_analysis(
        self,
        question: str,
        scores: Dict[BloomLevel, float],
    ) -> Dict[BloomLevel, float]:
        """Apply additional structural analysis to refine scores."""
        # Questions ending with "?" are more likely factual
        if question.endswith("?"):
            # Check for simple factual patterns
            if re.match(r"^(what|who|when|where|which)\s", question):
                scores[BloomLevel.REMEMBER] += 0.5

        # Questions with "why" or "how" suggest higher-order thinking
        if re.match(r"^why\s", question):
            scores[BloomLevel.ANALYZE] += 0.5

        if re.match(r"^how\s+(do|does|can|would|should)", question):
            scores[BloomLevel.APPLY] += 0.3

        # Questions with comparative language
        if any(word in question for word in ["compare", "contrast", "difference", "similar"]):
            scores[BloomLevel.ANALYZE] += 0.4

        # Questions asking for opinions or judgments
        if any(word in question for word in ["opinion", "agree", "disagree", "better", "best"]):
            scores[BloomLevel.EVALUATE] += 0.5

        # Questions about creation or design
        if any(word in question for word in ["design", "create", "build", "develop", "propose"]):
            scores[BloomLevel.CREATE] += 0.5

        return scores

    def batch_classify(
        self, questions: List[str]
    ) -> List[BloomClassification]:
        """
        Classify multiple questions.

        Args:
            questions: List of question texts

        Returns:
            List of BloomClassification results
        """
        return [self.classify(q) for q in questions]

    def get_level_distribution(
        self, questions: List[str]
    ) -> Dict[BloomLevel, int]:
        """
        Get distribution of Bloom's levels in a question set.

        Args:
            questions: List of question texts

        Returns:
            Count of questions at each Bloom's level
        """
        distribution = {level: 0 for level in BloomLevel}

        for question in questions:
            result = self.classify(question)
            distribution[result.primary_level] += 1

        return distribution

    def get_level_order(self, level: BloomLevel) -> int:
        """Get the numerical order of a Bloom's level (1-6)."""
        return BLOOM_ORDER[level]

    def compare_levels(
        self, level1: BloomLevel, level2: BloomLevel
    ) -> int:
        """
        Compare two Bloom's levels.

        Returns:
            -1 if level1 < level2
             0 if level1 == level2
             1 if level1 > level2
        """
        order1 = BLOOM_ORDER[level1]
        order2 = BLOOM_ORDER[level2]

        if order1 < order2:
            return -1
        elif order1 > order2:
            return 1
        return 0

    def suggest_higher_order_question(
        self, question: str, target_level: BloomLevel
    ) -> str:
        """
        Suggest how to transform a question to a higher Bloom's level.

        Args:
            question: Original question
            target_level: Target Bloom's level

        Returns:
            Suggestion for transforming the question
        """
        current = self.classify(question)
        if BLOOM_ORDER[current.primary_level] >= BLOOM_ORDER[target_level]:
            return f"Question is already at or above {target_level.value} level."

        # Level-specific transformations
        transformations = {
            BloomLevel.UNDERSTAND: "Ask students to explain in their own words or give examples.",
            BloomLevel.APPLY: "Ask students to use the concept in a new situation or solve a problem.",
            BloomLevel.ANALYZE: "Ask students to compare, contrast, or identify relationships.",
            BloomLevel.EVALUATE: "Ask students to make judgments, justify decisions, or critique.",
            BloomLevel.CREATE: "Ask students to design, propose, or create something new.",
        }

        return transformations.get(
            target_level,
            "Consider rephrasing to require higher-order thinking."
        )

    def get_level_description(self, level: BloomLevel) -> str:
        """Get a description of a Bloom's level."""
        descriptions = {
            BloomLevel.REMEMBER: "Recall facts and basic concepts (define, list, name, identify)",
            BloomLevel.UNDERSTAND: "Explain ideas or concepts (describe, explain, summarize)",
            BloomLevel.APPLY: "Use information in new situations (apply, demonstrate, solve)",
            BloomLevel.ANALYZE: "Draw connections among ideas (analyze, compare, contrast)",
            BloomLevel.EVALUATE: "Justify a stand or decision (evaluate, argue, defend)",
            BloomLevel.CREATE: "Produce new or original work (design, develop, propose)",
        }
        return descriptions.get(level, "Unknown level")
