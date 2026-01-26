"""
Bloom's Taxonomy Classifier.

Classifies questions by their cognitive level according to Bloom's Taxonomy.
Supports both keyword-based classification and ML-based classification using DistilBERT.
"""

import logging
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Tuple

import numpy as np

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

# Reverse mapping from string to BloomLevel
BLOOM_LEVEL_MAP = {level.value: level for level in BloomLevel}


@dataclass
class BloomClassification:
    """Result of Bloom's taxonomy classification."""

    level: BloomLevel
    confidence: float
    reasoning: str
    level_probabilities: Dict[str, float] = field(default_factory=dict)
    matched_keywords: List[str] = field(default_factory=list)
    method: str = "keyword"  # "keyword", "ml", or "ensemble"

    # Aliases for backward compatibility
    @property
    def primary_level(self) -> BloomLevel:
        return self.level


@dataclass
class BloomClassifierConfig:
    """Configuration for Bloom's taxonomy classifier."""

    use_ml_model: bool = True
    ml_model_name: str = "distilbert-base-uncased"
    model_path: Optional[str] = None
    min_confidence: float = 0.3
    ensemble_weight_ml: float = 0.7  # Weight for ML model in ensemble
    ensemble_weight_keyword: float = 0.3  # Weight for keyword model
    device: str = "cpu"
    cache_embeddings: bool = True


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

    Supports two classification methods:
    - Keyword-based: Fast pattern matching using verb/question word detection
    - ML-based: DistilBERT fine-tuned for Bloom's classification

    Usage:
        classifier = BloomClassifier()
        result = classifier.classify("What year did WWII end?")
        print(result.level)  # BloomLevel.REMEMBER
        print(result.reasoning)  # "Question word 'what' and factual recall pattern"
    """

    # Bloom action verbs organized by level (Anderson & Krathwohl, 2001)
    BLOOM_VERBS: Dict[BloomLevel, List[str]] = {
        BloomLevel.REMEMBER: [
            "define", "list", "name", "identify", "recall", "recognize",
            "state", "describe", "label", "match", "select", "locate",
            "memorize", "repeat", "reproduce", "quote", "recite", "record",
            "retrieve", "duplicate", "enumerate", "outline", "tell"
        ],
        BloomLevel.UNDERSTAND: [
            "explain", "summarize", "paraphrase", "interpret", "classify",
            "compare", "contrast", "demonstrate", "discuss", "distinguish",
            "estimate", "extend", "generalize", "illustrate", "infer",
            "predict", "restate", "translate", "describe", "express",
            "locate", "report", "recognize", "review", "convert"
        ],
        BloomLevel.APPLY: [
            "apply", "demonstrate", "dramatize", "employ", "illustrate",
            "implement", "interpret", "operate", "practice", "schedule",
            "sketch", "solve", "use", "modify", "change", "compute",
            "calculate", "execute", "experiment", "manipulate", "produce",
            "show", "make", "complete", "construct", "develop"
        ],
        BloomLevel.ANALYZE: [
            "analyze", "break down", "categorize", "compare", "contrast",
            "correlate", "deconstruct", "diagram", "differentiate",
            "discriminate", "distinguish", "examine", "experiment", "focus",
            "infer", "inspect", "investigate", "organize", "probe",
            "question", "separate", "test", "attribute", "outline", "structure"
        ],
        BloomLevel.EVALUATE: [
            "appraise", "argue", "assess", "choose", "conclude", "convince",
            "criticize", "critique", "decide", "defend", "determine",
            "dispute", "evaluate", "grade", "judge", "justify", "measure",
            "prioritize", "rank", "rate", "recommend", "select", "support",
            "validate", "value", "verify", "check", "coordinate", "monitor"
        ],
        BloomLevel.CREATE: [
            "arrange", "assemble", "build", "collect", "combine", "compile",
            "compose", "construct", "design", "develop", "devise",
            "formulate", "generate", "hypothesize", "integrate", "invent",
            "make", "originate", "plan", "prepare", "produce", "propose",
            "set up", "synthesize", "write", "author", "animate", "negotiate"
        ],
    }

    # Question word patterns mapped to likely Bloom levels
    QUESTION_PATTERNS: Dict[BloomLevel, List[str]] = {
        BloomLevel.REMEMBER: [
            r"^what is\b", r"^what are\b", r"^what was\b", r"^what were\b",
            r"^who is\b", r"^who was\b", r"^who were\b", r"^when did\b",
            r"^when was\b", r"^where is\b", r"^where was\b", r"^which\b",
            r"^how many\b", r"^how much\b", r"^name the\b", r"^list the\b",
        ],
        BloomLevel.UNDERSTAND: [
            r"^explain\b", r"^describe\b", r"^summarize\b", r"^paraphrase\b",
            r"^what does .* mean\b", r"^in your own words\b",
            r"^give an example\b", r"^what is the meaning\b",
            r"^how would you describe\b", r"^what is the main idea\b",
        ],
        BloomLevel.APPLY: [
            r"^how would you use\b", r"^how can you apply\b",
            r"^what would happen if\b", r"^how would you solve\b",
            r"^calculate\b", r"^compute\b", r"^show how\b",
            r"^demonstrate\b", r"^using .* solve\b", r"^apply\b",
        ],
        BloomLevel.ANALYZE: [
            r"^why did\b", r"^why does\b", r"^why is\b", r"^why are\b",
            r"^what is the relationship\b", r"^what are the differences\b",
            r"^what are the similarities\b", r"^how does .* compare\b",
            r"^what is the cause\b", r"^what is the effect\b",
            r"^analyze\b", r"^examine\b", r"^what factors\b",
        ],
        BloomLevel.EVALUATE: [
            r"^do you agree\b", r"^what is your opinion\b", r"^is it better\b",
            r"^which is better\b", r"^should\b", r"^would you recommend\b",
            r"^what is the best\b", r"^what is the most important\b",
            r"^how would you rate\b", r"^how effective\b", r"^evaluate\b",
            r"^is .* justified\b", r"^critique\b", r"^judge\b",
        ],
        BloomLevel.CREATE: [
            r"^design\b", r"^create\b", r"^develop\b", r"^propose\b",
            r"^what would you create\b", r"^how would you design\b",
            r"^can you construct\b", r"^what if\b", r"^imagine\b",
            r"^invent\b", r"^compose\b", r"^formulate\b", r"^devise\b",
        ],
    }

    # Complexity indicators that suggest higher-order thinking
    COMPLEXITY_INDICATORS = {
        "higher_order": [
            "however", "although", "despite", "whereas", "consequently",
            "therefore", "furthermore", "moreover", "in contrast", "on the other hand",
            "multiple factors", "various perspectives", "critically",
        ],
        "synthesis": [
            "combine", "integrate", "synthesize", "merge", "blend",
            "incorporate", "unify", "assimilate", "fuse",
        ],
        "evaluation": [
            "justify", "defend", "argue", "critique", "assess",
            "validity", "effectiveness", "significance", "implications",
        ],
    }

    # Compiled regex patterns
    _verb_patterns: Dict[BloomLevel, List[re.Pattern]] = {}
    _question_patterns: Dict[BloomLevel, List[re.Pattern]] = {}

    def __init__(
        self,
        config: Optional[BloomClassifierConfig] = None,
        model_path: Optional[str] = None
    ):
        """Initialize the Bloom's taxonomy classifier."""
        self.config = config or BloomClassifierConfig()
        if model_path:
            self.config.model_path = model_path

        # ML model components (lazy loaded)
        self._tokenizer = None
        self._model = None
        self._ml_ready = False

        # Embedding cache for performance
        self._embedding_cache: Dict[str, np.ndarray] = {}

        # Compile regex patterns
        self._compile_patterns()

        logger.info(
            f"BloomClassifier initialized (use_ml={self.config.use_ml_model})"
        )

    def _compile_patterns(self) -> None:
        """Compile keyword and question patterns to regex for efficient matching."""
        # Compile verb patterns
        for level, verbs in self.BLOOM_VERBS.items():
            self._verb_patterns[level] = []
            for verb in verbs:
                pattern = rf"\b{re.escape(verb)}(s|ed|ing|e)?\b"
                try:
                    self._verb_patterns[level].append(
                        re.compile(pattern, re.IGNORECASE)
                    )
                except re.error:
                    logger.warning(f"Invalid verb pattern: {verb}")

        # Compile question patterns
        for level, patterns in self.QUESTION_PATTERNS.items():
            self._question_patterns[level] = []
            for pattern in patterns:
                try:
                    self._question_patterns[level].append(
                        re.compile(pattern, re.IGNORECASE)
                    )
                except re.error:
                    logger.warning(f"Invalid question pattern: {pattern}")

    def _load_ml_model(self) -> bool:
        """Lazy load the ML model for classification."""
        if self._ml_ready:
            return True

        if not self.config.use_ml_model:
            return False

        try:
            from transformers import AutoModelForSequenceClassification, AutoTokenizer
            import torch

            model_name = self.config.model_path or self.config.ml_model_name

            logger.info(f"Loading Bloom classifier ML model: {model_name}")

            self._tokenizer = AutoTokenizer.from_pretrained(model_name)

            # Check if we have a fine-tuned model, otherwise use base model
            # with custom classification head
            try:
                self._model = AutoModelForSequenceClassification.from_pretrained(
                    model_name,
                    num_labels=6,  # 6 Bloom levels
                    problem_type="single_label_classification",
                )
            except Exception:
                # Fallback: load base model and add classification head
                from transformers import DistilBertForSequenceClassification
                self._model = DistilBertForSequenceClassification.from_pretrained(
                    model_name,
                    num_labels=6,
                )

            # Move to appropriate device
            device = torch.device(self.config.device)
            self._model = self._model.to(device)
            self._model.eval()

            self._ml_ready = True
            logger.info("Bloom classifier ML model loaded successfully")
            return True

        except ImportError:
            logger.warning(
                "transformers library not available, falling back to keyword-based classification"
            )
            return False
        except Exception as e:
            logger.warning(f"Failed to load ML model: {e}, using keyword fallback")
            return False

    def classify(self, question: str) -> BloomClassification:
        """
        Classify a question's Bloom's taxonomy level.

        Args:
            question: The question text to classify

        Returns:
            BloomClassification with level, confidence, and reasoning
        """
        question = question.strip()
        if not question:
            return BloomClassification(
                level=BloomLevel.REMEMBER,
                confidence=0.0,
                reasoning="Empty question text",
                level_probabilities={level.value: 0.0 for level in BloomLevel},
                method="default",
            )

        # Get keyword-based classification
        keyword_result = self._classify_keyword(question)

        # Try ML classification if enabled
        if self.config.use_ml_model and self._load_ml_model():
            ml_result = self._classify_ml(question)

            # Ensemble the results
            return self._ensemble_results(keyword_result, ml_result)

        return keyword_result

    def _classify_keyword(self, question: str) -> BloomClassification:
        """Classify using keyword and pattern matching."""
        question_lower = question.lower().strip()

        # Score each level
        level_scores: Dict[BloomLevel, float] = {level: 0.0 for level in BloomLevel}
        matched_keywords: Dict[BloomLevel, List[str]] = {level: [] for level in BloomLevel}
        reasoning_parts: List[str] = []

        # 1. Check question patterns (highest weight for patterns at question start)
        for level, patterns in self._question_patterns.items():
            for pattern in patterns:
                match = pattern.search(question_lower)
                if match:
                    # Position-based weighting: patterns at start are more important
                    position_weight = 1.0 - (match.start() / max(len(question_lower), 1)) * 0.3
                    level_scores[level] += 1.5 * position_weight
                    matched_keywords[level].append(match.group())
                    if match.start() < 5:  # At beginning
                        reasoning_parts.append(f"Question pattern '{match.group()}'")

        # 2. Check for Bloom action verbs
        for level, patterns in self._verb_patterns.items():
            for pattern in patterns:
                match = pattern.search(question_lower)
                if match:
                    position_weight = 1.0 - (match.start() / max(len(question_lower), 1)) * 0.5
                    level_scores[level] += 1.0 * position_weight
                    matched_keywords[level].append(match.group())
                    reasoning_parts.append(f"Action verb '{match.group()}'")

        # 3. Check complexity indicators
        for indicator_type, indicators in self.COMPLEXITY_INDICATORS.items():
            for indicator in indicators:
                if indicator.lower() in question_lower:
                    if indicator_type == "higher_order":
                        level_scores[BloomLevel.ANALYZE] += 0.3
                        level_scores[BloomLevel.EVALUATE] += 0.2
                    elif indicator_type == "synthesis":
                        level_scores[BloomLevel.CREATE] += 0.4
                    elif indicator_type == "evaluation":
                        level_scores[BloomLevel.EVALUATE] += 0.4
                    reasoning_parts.append(f"Complexity indicator '{indicator}'")

        # 4. Apply structural analysis
        level_scores = self._apply_structural_analysis(question_lower, level_scores)

        # Calculate probabilities
        total_score = sum(level_scores.values())
        if total_score > 0:
            level_probabilities = {
                level.value: score / total_score
                for level, score in level_scores.items()
            }
        else:
            # Default to REMEMBER if no patterns match
            level_probabilities = {level.value: 0.0 for level in BloomLevel}
            level_probabilities["remember"] = 1.0
            level_scores[BloomLevel.REMEMBER] = 1.0

        # Find primary level
        primary_level = max(level_scores, key=level_scores.get)
        confidence = level_scores[primary_level] / max(total_score, 1)

        # Apply minimum confidence threshold
        if confidence < self.config.min_confidence:
            primary_level = BloomLevel.REMEMBER
            confidence = self.config.min_confidence
            reasoning_parts.append("Low confidence, defaulted to Remember")

        # Build reasoning
        if not reasoning_parts:
            reasoning_parts.append("No specific patterns matched, defaulted to Remember")

        return BloomClassification(
            level=primary_level,
            confidence=min(confidence, 1.0),
            reasoning="; ".join(reasoning_parts[:3]),  # Limit reasoning length
            level_probabilities=level_probabilities,
            matched_keywords=matched_keywords[primary_level],
            method="keyword",
        )

    def _classify_ml(self, question: str) -> BloomClassification:
        """Classify using the ML model."""
        import torch

        try:
            # Tokenize
            inputs = self._tokenizer(
                question,
                return_tensors="pt",
                truncation=True,
                max_length=128,
                padding=True,
            )

            # Move to device
            device = next(self._model.parameters()).device
            inputs = {k: v.to(device) for k, v in inputs.items()}

            # Get predictions
            with torch.no_grad():
                outputs = self._model(**inputs)
                logits = outputs.logits
                probabilities = torch.softmax(logits, dim=-1)[0]

            # Map to Bloom levels
            level_names = list(BLOOM_LEVEL_MAP.keys())
            level_probabilities = {
                level_names[i]: float(probabilities[i])
                for i in range(len(level_names))
            }

            # Get predicted level
            predicted_idx = torch.argmax(probabilities).item()
            predicted_level = BLOOM_LEVEL_MAP[level_names[predicted_idx]]
            confidence = float(probabilities[predicted_idx])

            return BloomClassification(
                level=predicted_level,
                confidence=confidence,
                reasoning=f"ML model prediction (confidence: {confidence:.2f})",
                level_probabilities=level_probabilities,
                matched_keywords=[],
                method="ml",
            )

        except Exception as e:
            logger.warning(f"ML classification failed: {e}")
            # Return neutral result that won't dominate ensemble
            return BloomClassification(
                level=BloomLevel.REMEMBER,
                confidence=0.0,
                reasoning="ML classification failed",
                level_probabilities={level.value: 1/6 for level in BloomLevel},
                method="ml_fallback",
            )

    def _ensemble_results(
        self,
        keyword_result: BloomClassification,
        ml_result: BloomClassification,
    ) -> BloomClassification:
        """Combine keyword and ML results using weighted ensemble."""
        # If ML failed, just use keyword result
        if ml_result.method == "ml_fallback":
            return keyword_result

        # Weighted combination of probabilities
        ensemble_probs: Dict[str, float] = {}
        for level in BloomLevel:
            level_name = level.value
            keyword_prob = keyword_result.level_probabilities.get(level_name, 0.0)
            ml_prob = ml_result.level_probabilities.get(level_name, 0.0)

            ensemble_probs[level_name] = (
                self.config.ensemble_weight_keyword * keyword_prob +
                self.config.ensemble_weight_ml * ml_prob
            )

        # Normalize
        total = sum(ensemble_probs.values())
        if total > 0:
            ensemble_probs = {k: v / total for k, v in ensemble_probs.items()}

        # Get final prediction
        predicted_level_name = max(ensemble_probs, key=ensemble_probs.get)
        predicted_level = BLOOM_LEVEL_MAP[predicted_level_name]
        confidence = ensemble_probs[predicted_level_name]

        # Combine reasoning
        reasoning_parts = []
        if keyword_result.matched_keywords:
            reasoning_parts.append(f"Keywords: {', '.join(keyword_result.matched_keywords[:2])}")
        reasoning_parts.append(f"ML confidence: {ml_result.confidence:.2f}")

        return BloomClassification(
            level=predicted_level,
            confidence=confidence,
            reasoning="; ".join(reasoning_parts),
            level_probabilities=ensemble_probs,
            matched_keywords=keyword_result.matched_keywords,
            method="ensemble",
        )

    def _apply_structural_analysis(
        self,
        question: str,
        scores: Dict[BloomLevel, float],
    ) -> Dict[BloomLevel, float]:
        """Apply additional structural analysis to refine scores."""
        # Questions ending with "?" are typical questions
        if question.endswith("?"):
            # Simple factual patterns
            if re.match(r"^(what|who|when|where|which)\s", question):
                scores[BloomLevel.REMEMBER] += 0.5

        # "Why" questions suggest analysis
        if re.match(r"^why\s", question):
            scores[BloomLevel.ANALYZE] += 0.5

        # "How" questions can be apply or understand
        if re.match(r"^how\s+(do|does|can|would|should)", question):
            scores[BloomLevel.APPLY] += 0.3

        # Comparative language
        if any(word in question for word in ["compare", "contrast", "difference", "similar", "versus", "vs"]):
            scores[BloomLevel.ANALYZE] += 0.4

        # Opinion/judgment language
        if any(word in question for word in ["opinion", "agree", "disagree", "better", "best", "worst", "most"]):
            scores[BloomLevel.EVALUATE] += 0.5

        # Creation language
        if any(word in question for word in ["design", "create", "build", "develop", "propose", "invent"]):
            scores[BloomLevel.CREATE] += 0.5

        # Question length as complexity indicator
        word_count = len(question.split())
        if word_count > 20:
            # Longer questions tend to be more complex
            scores[BloomLevel.ANALYZE] += 0.2
            scores[BloomLevel.EVALUATE] += 0.1

        return scores

    def batch_classify(self, questions: List[str]) -> List[BloomClassification]:
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
            distribution[result.level] += 1

        return distribution

    def get_level_order(self, level: BloomLevel) -> int:
        """Get the numerical order of a Bloom's level (1-6)."""
        return BLOOM_ORDER[level]

    def compare_levels(self, level1: BloomLevel, level2: BloomLevel) -> int:
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
        if BLOOM_ORDER[current.level] >= BLOOM_ORDER[target_level]:
            return f"Question is already at or above {target_level.value} level."

        # Level-specific transformations with examples
        transformations = {
            BloomLevel.UNDERSTAND: (
                "Transform to ask for explanation or meaning. "
                "Example: 'What is X?' -> 'Explain how X works in your own words.'"
            ),
            BloomLevel.APPLY: (
                "Ask students to use the concept in a new situation. "
                "Example: 'What is the formula?' -> 'Use the formula to solve this problem.'"
            ),
            BloomLevel.ANALYZE: (
                "Ask students to compare, contrast, or identify relationships. "
                "Example: 'What are the features?' -> 'Why do these features matter?'"
            ),
            BloomLevel.EVALUATE: (
                "Ask students to make judgments or justify decisions. "
                "Example: 'What happened?' -> 'Do you agree with the decision? Why?'"
            ),
            BloomLevel.CREATE: (
                "Ask students to design, propose, or create something new. "
                "Example: 'What is the process?' -> 'Design an improved process.'"
            ),
        }

        return transformations.get(
            target_level,
            "Consider rephrasing to require higher-order thinking."
        )

    def get_level_description(self, level: BloomLevel) -> str:
        """Get a description of a Bloom's level."""
        descriptions = {
            BloomLevel.REMEMBER: (
                "Recall facts and basic concepts. "
                "Verbs: define, list, name, identify, recall, recognize"
            ),
            BloomLevel.UNDERSTAND: (
                "Explain ideas or concepts. "
                "Verbs: describe, explain, summarize, interpret, classify"
            ),
            BloomLevel.APPLY: (
                "Use information in new situations. "
                "Verbs: apply, demonstrate, solve, use, implement"
            ),
            BloomLevel.ANALYZE: (
                "Draw connections among ideas. "
                "Verbs: analyze, compare, contrast, examine, differentiate"
            ),
            BloomLevel.EVALUATE: (
                "Justify a stand or decision. "
                "Verbs: evaluate, argue, defend, judge, critique, assess"
            ),
            BloomLevel.CREATE: (
                "Produce new or original work. "
                "Verbs: design, develop, propose, construct, formulate"
            ),
        }
        return descriptions.get(level, "Unknown level")

    def get_example_questions(self, level: BloomLevel) -> List[str]:
        """Get example questions for a Bloom's level."""
        examples = {
            BloomLevel.REMEMBER: [
                "What is the capital of France?",
                "Who wrote Romeo and Juliet?",
                "When did World War II end?",
                "List the planets in our solar system.",
            ],
            BloomLevel.UNDERSTAND: [
                "Explain how photosynthesis works.",
                "Summarize the main events of the story.",
                "In your own words, describe the water cycle.",
                "What is the main idea of this passage?",
            ],
            BloomLevel.APPLY: [
                "How would you solve this equation?",
                "Calculate the area of this triangle.",
                "Demonstrate how to balance this chemical equation.",
                "Use the Pythagorean theorem to find the missing side.",
            ],
            BloomLevel.ANALYZE: [
                "Why did the Roman Empire fall?",
                "Compare and contrast mitosis and meiosis.",
                "What factors contributed to the economic crisis?",
                "Analyze the relationship between the characters.",
            ],
            BloomLevel.EVALUATE: [
                "Do you agree with the author's argument? Why?",
                "Which solution is most effective and why?",
                "Critique the methodology used in this study.",
                "Is this policy justified? Defend your position.",
            ],
            BloomLevel.CREATE: [
                "Design an experiment to test this hypothesis.",
                "Propose a solution to reduce pollution in cities.",
                "Create a new ending for the story.",
                "Develop a plan to improve school attendance.",
            ],
        }
        return examples.get(level, [])

    def generate_questions_at_level(
        self,
        topic: str,
        level: BloomLevel,
        num_starters: int = 3,
    ) -> List[str]:
        """
        Generate question starters for a given topic at a specific Bloom level.

        Args:
            topic: The topic for questions
            level: Target Bloom's level
            num_starters: Number of question starters to generate

        Returns:
            List of question starters
        """
        starters = {
            BloomLevel.REMEMBER: [
                f"What is {topic}?",
                f"Define {topic}.",
                f"Who discovered/invented {topic}?",
                f"When was {topic} first documented?",
                f"List the main characteristics of {topic}.",
            ],
            BloomLevel.UNDERSTAND: [
                f"Explain {topic} in your own words.",
                f"What are the key features of {topic}?",
                f"Summarize the main points about {topic}.",
                f"Give an example of {topic}.",
                f"How would you describe {topic} to someone unfamiliar with it?",
            ],
            BloomLevel.APPLY: [
                f"How would you use {topic} to solve a real-world problem?",
                f"Demonstrate how {topic} works.",
                f"Apply {topic} to the following scenario...",
                f"Calculate/solve using {topic}...",
                f"What would happen if you applied {topic} to...?",
            ],
            BloomLevel.ANALYZE: [
                f"Why is {topic} important?",
                f"Compare {topic} with...",
                f"What are the causes and effects of {topic}?",
                f"Analyze the relationship between {topic} and...",
                f"What factors influence {topic}?",
            ],
            BloomLevel.EVALUATE: [
                f"Do you agree that {topic} is effective? Why or why not?",
                f"What are the strengths and weaknesses of {topic}?",
                f"Is {topic} the best approach? Justify your answer.",
                f"Critique the use of {topic} in...",
                f"How would you prioritize {topic} compared to alternatives?",
            ],
            BloomLevel.CREATE: [
                f"Design a new approach using {topic}.",
                f"Propose improvements to {topic}.",
                f"Create a plan that incorporates {topic}.",
                f"Develop a hypothesis about {topic}.",
                f"How would you combine {topic} with other concepts to...?",
            ],
        }

        available = starters.get(level, [])
        return available[:num_starters]
