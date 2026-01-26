"""
Difficulty Estimator.

Predicts question difficulty before deployment using linguistic features,
Bloom's level, answer characteristics, and distractor quality.
"""

import logging
import math
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class DifficultyEstimate:
    """Result of difficulty estimation."""

    difficulty: float  # 0-1 scale (0=easy, 1=hard)
    confidence: float  # Confidence in the estimate
    factors: Dict[str, float]  # Contributing factors
    estimated_p_correct: float  # Estimated probability of correct response
    grade_level_estimate: Optional[int] = None  # Estimated grade level


@dataclass
class DifficultyEstimatorConfig:
    """Configuration for difficulty estimation."""

    use_ml_model: bool = False
    ml_model_path: Optional[str] = None
    # Feature weights
    linguistic_weight: float = 0.3
    bloom_weight: float = 0.25
    answer_weight: float = 0.2
    distractor_weight: float = 0.15
    domain_weight: float = 0.1


class DifficultyEstimator:
    """
    Estimate question difficulty before student exposure.

    Features considered:
    - Linguistic complexity (sentence length, vocabulary level)
    - Bloom's taxonomy level
    - Answer obviousness/complexity
    - Distractor quality (for MCQ)
    - Domain knowledge required

    Usage:
        estimator = DifficultyEstimator()
        estimate = estimator.estimate(
            question="What is the capital of France?",
            answer="Paris"
        )
        print(f"Difficulty: {estimate.difficulty:.2f}")
    """

    # Word lists for vocabulary difficulty
    COMMON_WORDS = {
        "the", "is", "a", "an", "of", "to", "in", "for", "on", "with",
        "at", "by", "from", "or", "and", "not", "be", "was", "are", "were",
        "what", "who", "when", "where", "how", "why", "which", "that", "this",
        "have", "has", "had", "do", "does", "did", "will", "would", "can",
        "could", "should", "may", "might", "must", "shall"
    }

    # Academic/complex words that increase difficulty
    COMPLEX_WORDS = {
        "analyze", "synthesize", "evaluate", "hypothesize", "differentiate",
        "correlation", "causation", "phenomenon", "paradigm", "theoretical",
        "empirical", "methodology", "quantitative", "qualitative", "significant",
        "subsequently", "consequently", "furthermore", "nevertheless", "notwithstanding",
        "juxtapose", "dichotomy", "ubiquitous", "ephemeral", "paradox"
    }

    # Bloom's level difficulty mapping
    BLOOM_DIFFICULTY = {
        "remember": 0.2,
        "understand": 0.35,
        "apply": 0.5,
        "analyze": 0.65,
        "evaluate": 0.8,
        "create": 0.9,
    }

    def __init__(self, config: Optional[DifficultyEstimatorConfig] = None, model_path: Optional[str] = None):
        """Initialize the difficulty estimator."""
        self.config = config or DifficultyEstimatorConfig()
        if model_path:
            self.config.ml_model_path = model_path
        self._bloom_classifier = None
        logger.info("DifficultyEstimator initialized")

    def _get_bloom_classifier(self):
        """Lazy load Bloom classifier."""
        if self._bloom_classifier is None:
            from app.models.bloom_classifier import BloomClassifier
            self._bloom_classifier = BloomClassifier()
        return self._bloom_classifier

    def estimate(
        self,
        question: str,
        answer: str,
        distractors: Optional[List[str]] = None,
        context: Optional[str] = None,
    ) -> DifficultyEstimate:
        """
        Estimate question difficulty.

        Args:
            question: The question text
            answer: The correct answer
            distractors: Optional list of distractor options (for MCQ)
            context: Optional context/passage

        Returns:
            DifficultyEstimate with difficulty score and contributing factors
        """
        factors = {}

        # 1. Linguistic complexity
        linguistic_score = self._analyze_linguistic_complexity(question)
        factors["linguistic_complexity"] = linguistic_score

        # 2. Bloom's taxonomy level
        bloom_score = self._analyze_bloom_level(question)
        factors["bloom_level"] = bloom_score

        # 3. Answer complexity
        answer_score = self._analyze_answer_complexity(answer)
        factors["answer_complexity"] = answer_score

        # 4. Distractor quality (for MCQ)
        if distractors:
            distractor_score = self._analyze_distractor_quality(
                answer, distractors
            )
            factors["distractor_quality"] = distractor_score
        else:
            distractor_score = 0.5  # Neutral for non-MCQ
            factors["distractor_quality"] = distractor_score

        # 5. Domain complexity (if context provided)
        if context:
            domain_score = self._analyze_domain_complexity(context)
            factors["domain_complexity"] = domain_score
        else:
            domain_score = 0.5  # Neutral
            factors["domain_complexity"] = domain_score

        # Calculate weighted difficulty
        difficulty = (
            self.config.linguistic_weight * linguistic_score
            + self.config.bloom_weight * bloom_score
            + self.config.answer_weight * answer_score
            + self.config.distractor_weight * distractor_score
            + self.config.domain_weight * domain_score
        )

        # Normalize to 0-1
        difficulty = max(0.0, min(1.0, difficulty))

        # Estimate probability of correct response (inverse of difficulty)
        # Using a logistic-like transformation
        p_correct = 1.0 - (difficulty * 0.7 + 0.1)  # Range: 0.2 to 0.9

        # Estimate grade level
        grade_level = self._estimate_grade_level(difficulty, factors)

        # Calculate confidence based on factor consistency
        confidence = self._calculate_confidence(factors)

        return DifficultyEstimate(
            difficulty=difficulty,
            confidence=confidence,
            factors=factors,
            estimated_p_correct=p_correct,
            grade_level_estimate=grade_level,
        )

    def _analyze_linguistic_complexity(self, text: str) -> float:
        """Analyze linguistic complexity of text."""
        if not text:
            return 0.5

        words = re.findall(r"\b\w+\b", text.lower())
        if not words:
            return 0.5

        # Factors
        factors = []

        # 1. Average word length (longer = harder)
        avg_word_length = sum(len(w) for w in words) / len(words)
        word_length_score = min(1.0, avg_word_length / 10)
        factors.append(word_length_score)

        # 2. Sentence length (more words = harder)
        sentence_length_score = min(1.0, len(words) / 30)
        factors.append(sentence_length_score)

        # 3. Vocabulary complexity
        complex_count = sum(1 for w in words if w in self.COMPLEX_WORDS)
        uncommon_count = sum(1 for w in words if w not in self.COMMON_WORDS and len(w) > 6)
        vocab_score = min(1.0, (complex_count * 2 + uncommon_count) / len(words))
        factors.append(vocab_score)

        # 4. Sentence structure (presence of subordinate clauses)
        subordinate_markers = ["which", "that", "because", "although", "if", "when", "while"]
        subordinate_count = sum(1 for w in words if w in subordinate_markers)
        structure_score = min(1.0, subordinate_count * 0.2)
        factors.append(structure_score)

        # 5. Negation (negatives make questions harder)
        negation_words = ["not", "never", "no", "none", "neither", "nor", "except"]
        negation_count = sum(1 for w in words if w in negation_words)
        negation_score = min(1.0, negation_count * 0.3)
        factors.append(negation_score)

        return sum(factors) / len(factors)

    def _analyze_bloom_level(self, question: str) -> float:
        """Analyze Bloom's taxonomy level of question."""
        try:
            classifier = self._get_bloom_classifier()
            result = classifier.classify(question)
            return self.BLOOM_DIFFICULTY.get(result.primary_level.value, 0.5)
        except Exception as e:
            logger.warning(f"Bloom classification failed: {e}")
            return 0.5

    def _analyze_answer_complexity(self, answer: str) -> float:
        """Analyze complexity of the answer."""
        if not answer:
            return 0.5

        factors = []

        # 1. Answer length (longer = harder)
        word_count = len(answer.split())
        length_score = min(1.0, word_count / 10)
        factors.append(length_score)

        # 2. Answer specificity
        # Numbers and specific values are often harder
        if re.search(r"\d", answer):
            factors.append(0.6)  # Numbers add difficulty

        # Proper nouns (capitalized) suggest specific knowledge
        if answer and answer[0].isupper() and not answer.isupper():
            factors.append(0.5)

        # 3. Abstract vs concrete
        abstract_indicators = ["concept", "theory", "principle", "idea", "process"]
        if any(ind in answer.lower() for ind in abstract_indicators):
            factors.append(0.7)

        if not factors:
            return 0.4

        return sum(factors) / len(factors)

    def _analyze_distractor_quality(
        self, correct_answer: str, distractors: List[str]
    ) -> float:
        """Analyze quality of distractors (higher quality = harder question)."""
        if not distractors:
            return 0.5

        factors = []

        # 1. Length similarity (similar lengths = harder)
        correct_len = len(correct_answer)
        len_similarities = []
        for d in distractors:
            d_len = len(d)
            similarity = 1.0 - abs(correct_len - d_len) / max(correct_len, d_len, 1)
            len_similarities.append(similarity)
        factors.append(sum(len_similarities) / len(len_similarities))

        # 2. Number of distractors (more = harder)
        num_distractors_score = min(1.0, len(distractors) / 4)
        factors.append(num_distractors_score)

        # 3. First letter similarity (same first letter = harder)
        if correct_answer:
            first_letter_matches = sum(
                1 for d in distractors
                if d and d[0].lower() == correct_answer[0].lower()
            )
            first_letter_score = first_letter_matches / len(distractors)
            factors.append(first_letter_score * 0.5)

        return sum(factors) / len(factors)

    def _analyze_domain_complexity(self, context: str) -> float:
        """Analyze domain/topic complexity from context."""
        if not context:
            return 0.5

        words = re.findall(r"\b\w+\b", context.lower())
        if not words:
            return 0.5

        # Check for technical vocabulary
        technical_density = sum(
            1 for w in words if w in self.COMPLEX_WORDS
        ) / max(len(words), 1)

        # Check for numbers (quantitative content)
        number_density = sum(
            1 for w in words if re.match(r"\d+", w)
        ) / max(len(words), 1)

        return min(1.0, technical_density * 3 + number_density * 2)

    def _estimate_grade_level(
        self, difficulty: float, factors: Dict[str, float]
    ) -> int:
        """Estimate appropriate grade level based on difficulty."""
        # Map difficulty to grade level
        # 0.0-0.2 -> Grade 1-3
        # 0.2-0.4 -> Grade 4-6
        # 0.4-0.6 -> Grade 7-9
        # 0.6-0.8 -> Grade 10-11
        # 0.8-1.0 -> Grade 12+

        base_grade = int(difficulty * 12) + 1

        # Adjust based on linguistic complexity
        if factors.get("linguistic_complexity", 0.5) > 0.7:
            base_grade += 1
        elif factors.get("linguistic_complexity", 0.5) < 0.3:
            base_grade -= 1

        return max(1, min(12, base_grade))

    def _calculate_confidence(self, factors: Dict[str, float]) -> float:
        """Calculate confidence in the difficulty estimate."""
        if not factors:
            return 0.5

        # Confidence is higher when factors are consistent
        values = list(factors.values())
        mean = sum(values) / len(values)
        variance = sum((v - mean) ** 2 for v in values) / len(values)

        # Lower variance = higher confidence
        confidence = 1.0 - min(1.0, math.sqrt(variance) * 2)
        return max(0.3, confidence)

    def analyze_factors(
        self, question: str, answer: str
    ) -> Dict[str, float]:
        """
        Analyze individual difficulty factors.

        Args:
            question: The question text
            answer: The answer

        Returns:
            Dictionary of factor scores
        """
        return {
            "linguistic_complexity": self._analyze_linguistic_complexity(question),
            "bloom_level": self._analyze_bloom_level(question),
            "answer_complexity": self._analyze_answer_complexity(answer),
        }

    def calibrate(self, actual_results: List[Dict[str, Any]]) -> None:
        """
        Calibrate estimator with actual student performance data.

        Args:
            actual_results: List of dicts with 'question', 'answer', 'p_correct'

        This would update internal weights based on actual data.
        Currently a placeholder for future ML-based calibration.
        """
        if not actual_results:
            return

        logger.info(f"Calibration received {len(actual_results)} data points")
        # Future: Implement actual calibration logic
        # This would train/update weights based on:
        # - Comparison of estimated vs actual difficulty
        # - Feature importance analysis
        # - Model fine-tuning

    def compare_difficulty(
        self, question1: str, answer1: str,
        question2: str, answer2: str
    ) -> int:
        """
        Compare difficulty of two questions.

        Returns:
            -1 if q1 is easier, 0 if equal, 1 if q1 is harder
        """
        est1 = self.estimate(question1, answer1)
        est2 = self.estimate(question2, answer2)

        diff = est1.difficulty - est2.difficulty
        if abs(diff) < 0.1:  # Within tolerance
            return 0
        return 1 if diff > 0 else -1
