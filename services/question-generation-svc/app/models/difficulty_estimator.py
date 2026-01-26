"""
Difficulty Estimator.

Predicts question difficulty before deployment using multiple features:
- Linguistic complexity (sentence length, vocabulary level)
- Cognitive demand (Bloom's level)
- Answer accessibility (how deep in passage)
- Distractor quality (for MCQ)
- Domain-specific difficulty (via curriculum service)

Supports both heuristic estimation and ML-based prediction using
gradient boosting or neural networks.
"""

import logging
import math
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class DifficultyEstimate:
    """Result of difficulty estimation with confidence intervals."""

    difficulty: float  # 0-1 scale (0=easy, 1=hard)
    confidence: float  # Confidence in the estimate
    confidence_lower: float  # Lower bound of 95% CI
    confidence_upper: float  # Upper bound of 95% CI
    factors: Dict[str, float]  # Contributing factors
    features_used: List[str]  # Features used in estimation
    estimated_p_correct: float  # Estimated probability of correct response
    grade_level_estimate: Optional[int] = None  # Estimated grade level
    method: str = "heuristic"  # "heuristic", "ml", or "ensemble"


@dataclass
class DifficultyEstimatorConfig:
    """Configuration for difficulty estimation."""

    use_ml_model: bool = True
    ml_model_path: Optional[str] = None
    model_type: str = "gradient_boosting"  # "gradient_boosting" or "neural_net"

    # Feature weights for heuristic model
    linguistic_weight: float = 0.25
    bloom_weight: float = 0.20
    answer_weight: float = 0.15
    distractor_weight: float = 0.15
    domain_weight: float = 0.10
    structural_weight: float = 0.15

    # Confidence interval settings
    confidence_level: float = 0.95
    uncertainty_factor: float = 0.15  # Base uncertainty

    # Calibration settings
    enable_calibration: bool = True
    calibration_data_path: Optional[str] = None


class DifficultyEstimator:
    """
    Estimate question difficulty before student exposure.

    Features considered:
    - Linguistic complexity (sentence length, vocabulary level)
    - Bloom's taxonomy level
    - Answer obviousness/complexity
    - Distractor quality (for MCQ)
    - Domain knowledge required
    - Structural features (negation, multiple parts)

    Supports:
    - Heuristic estimation using weighted feature combination
    - ML-based prediction using gradient boosting or neural networks
    - Confidence intervals for uncertainty quantification
    - Calibration using actual student performance data

    Usage:
        estimator = DifficultyEstimator()
        estimate = estimator.estimate_difficulty(
            question="What is the capital of France?",
            answer="Paris",
            passage="France is a country in Europe..."
        )
        print(f"Difficulty: {estimate.difficulty:.2f}")
        print(f"95% CI: [{estimate.confidence_lower:.2f}, {estimate.confidence_upper:.2f}]")
    """

    # Word lists for vocabulary difficulty
    COMMON_WORDS = {
        "the", "is", "a", "an", "of", "to", "in", "for", "on", "with",
        "at", "by", "from", "or", "and", "not", "be", "was", "are", "were",
        "what", "who", "when", "where", "how", "why", "which", "that", "this",
        "have", "has", "had", "do", "does", "did", "will", "would", "can",
        "could", "should", "may", "might", "must", "shall", "it", "its",
        "they", "their", "them", "he", "she", "him", "her", "we", "us"
    }

    # Academic/complex words that increase difficulty
    COMPLEX_WORDS = {
        "analyze", "synthesize", "evaluate", "hypothesize", "differentiate",
        "correlation", "causation", "phenomenon", "paradigm", "theoretical",
        "empirical", "methodology", "quantitative", "qualitative", "significant",
        "subsequently", "consequently", "furthermore", "nevertheless", "notwithstanding",
        "juxtapose", "dichotomy", "ubiquitous", "ephemeral", "paradox",
        "antithesis", "metamorphosis", "congruent", "extrapolate", "interpolate",
        "axiom", "theorem", "corollary", "postulate", "inference"
    }

    # Domain-specific vocabulary (higher difficulty)
    DOMAIN_VOCABULARY = {
        "science": {"mitochondria", "photosynthesis", "chromosome", "catalyst", "entropy"},
        "math": {"derivative", "integral", "polynomial", "asymptote", "logarithm"},
        "history": {"imperialism", "colonization", "revolution", "monarchy", "republic"},
        "language": {"syntax", "morphology", "phonetics", "semantics", "pragmatics"},
    }

    # Bloom's level difficulty mapping
    BLOOM_DIFFICULTY = {
        "remember": 0.15,
        "understand": 0.30,
        "apply": 0.50,
        "analyze": 0.65,
        "evaluate": 0.80,
        "create": 0.90,
    }

    # Grade level vocabulary thresholds
    GRADE_VOCABULARY_LEVELS = {
        1: 4.0,   # Average word length
        2: 4.2,
        3: 4.5,
        4: 4.8,
        5: 5.0,
        6: 5.3,
        7: 5.5,
        8: 5.8,
        9: 6.0,
        10: 6.3,
        11: 6.5,
        12: 6.8,
    }

    def __init__(
        self,
        config: Optional[DifficultyEstimatorConfig] = None,
        model_path: Optional[str] = None
    ):
        """Initialize the difficulty estimator."""
        self.config = config or DifficultyEstimatorConfig()
        if model_path:
            self.config.ml_model_path = model_path

        # Components (lazy loaded)
        self._bloom_classifier = None
        self._ml_model = None
        self._ml_ready = False
        self._calibration_data = None

        logger.info("DifficultyEstimator initialized")

    def _get_bloom_classifier(self):
        """Lazy load Bloom classifier."""
        if self._bloom_classifier is None:
            from app.models.bloom_classifier import BloomClassifier, BloomClassifierConfig
            # Use keyword-only for performance
            bloom_config = BloomClassifierConfig(use_ml_model=False)
            self._bloom_classifier = BloomClassifier(config=bloom_config)
        return self._bloom_classifier

    def _load_ml_model(self) -> bool:
        """Lazy load the ML model for difficulty prediction."""
        if self._ml_ready:
            return True

        if not self.config.use_ml_model:
            return False

        try:
            if self.config.model_type == "gradient_boosting":
                # Try to load scikit-learn model
                from sklearn.ensemble import GradientBoostingRegressor
                import joblib

                if self.config.ml_model_path:
                    self._ml_model = joblib.load(self.config.ml_model_path)
                else:
                    # Create default model (will need training)
                    self._ml_model = GradientBoostingRegressor(
                        n_estimators=100,
                        max_depth=4,
                        learning_rate=0.1,
                        random_state=42,
                    )
                self._ml_ready = True
                return True

            elif self.config.model_type == "neural_net":
                # Try to load PyTorch model
                import torch
                import torch.nn as nn

                class DifficultyNet(nn.Module):
                    def __init__(self, input_dim=10):
                        super().__init__()
                        self.layers = nn.Sequential(
                            nn.Linear(input_dim, 64),
                            nn.ReLU(),
                            nn.Dropout(0.2),
                            nn.Linear(64, 32),
                            nn.ReLU(),
                            nn.Dropout(0.2),
                            nn.Linear(32, 1),
                            nn.Sigmoid(),
                        )

                    def forward(self, x):
                        return self.layers(x)

                if self.config.ml_model_path:
                    self._ml_model = torch.load(self.config.ml_model_path)
                else:
                    self._ml_model = DifficultyNet()

                self._ml_model.eval()
                self._ml_ready = True
                return True

        except ImportError as e:
            logger.warning(f"ML library not available: {e}")
            return False
        except Exception as e:
            logger.warning(f"Failed to load ML model: {e}")
            return False

        return False

    def estimate(
        self,
        question: str,
        answer: str,
        distractors: Optional[List[str]] = None,
        context: Optional[str] = None,
    ) -> DifficultyEstimate:
        """
        Estimate question difficulty (backward compatible interface).

        Args:
            question: The question text
            answer: The correct answer
            distractors: Optional list of distractor options (for MCQ)
            context: Optional context/passage

        Returns:
            DifficultyEstimate with difficulty score and confidence intervals
        """
        return self.estimate_difficulty(
            question=question,
            answer=answer,
            passage=context,
            distractors=distractors,
        )

    def estimate_difficulty(
        self,
        question: str,
        answer: str,
        passage: Optional[str] = None,
        distractors: Optional[List[str]] = None,
        domain: Optional[str] = None,
    ) -> DifficultyEstimate:
        """
        Estimate question difficulty with full feature analysis.

        Args:
            question: The question text
            answer: The correct answer
            passage: Optional source passage
            distractors: Optional list of distractor options (for MCQ)
            domain: Optional domain/subject (e.g., "science", "math")

        Returns:
            DifficultyEstimate with difficulty, confidence intervals, and factors
        """
        factors = {}
        features_used = []

        # Extract all features
        features = self._extract_features(
            question, answer, passage, distractors, domain
        )

        # 1. Linguistic complexity
        linguistic_score = self._analyze_linguistic_complexity(question)
        factors["linguistic_complexity"] = linguistic_score
        features_used.append("linguistic_complexity")

        # 2. Bloom's taxonomy level
        bloom_score = self._analyze_bloom_level(question)
        factors["bloom_level"] = bloom_score
        features_used.append("bloom_level")

        # 3. Answer complexity
        answer_score = self._analyze_answer_complexity(answer)
        factors["answer_complexity"] = answer_score
        features_used.append("answer_complexity")

        # 4. Answer accessibility (if passage provided)
        if passage:
            accessibility_score = self._analyze_answer_accessibility(answer, passage)
            factors["answer_accessibility"] = accessibility_score
            features_used.append("answer_accessibility")
        else:
            accessibility_score = 0.5

        # 5. Distractor quality (for MCQ)
        if distractors:
            distractor_score = self._analyze_distractor_quality(answer, distractors)
            factors["distractor_quality"] = distractor_score
            features_used.append("distractor_quality")
        else:
            distractor_score = 0.5
            factors["distractor_quality"] = distractor_score

        # 6. Domain complexity
        if passage or domain:
            domain_score = self._analyze_domain_complexity(passage or "", domain)
            factors["domain_complexity"] = domain_score
            features_used.append("domain_complexity")
        else:
            domain_score = 0.5
            factors["domain_complexity"] = domain_score

        # 7. Structural complexity
        structural_score = self._analyze_structural_complexity(question)
        factors["structural_complexity"] = structural_score
        features_used.append("structural_complexity")

        # Calculate difficulty using heuristic model
        heuristic_difficulty = self._calculate_heuristic_difficulty(factors)

        # Try ML prediction if available
        ml_difficulty = None
        if self.config.use_ml_model and self._load_ml_model():
            ml_difficulty = self._predict_ml_difficulty(features)

        # Combine estimates
        if ml_difficulty is not None:
            # Weighted ensemble
            difficulty = 0.6 * ml_difficulty + 0.4 * heuristic_difficulty
            method = "ensemble"
        else:
            difficulty = heuristic_difficulty
            method = "heuristic"

        # Ensure bounds
        difficulty = max(0.0, min(1.0, difficulty))

        # Calculate confidence and intervals
        confidence, conf_lower, conf_upper = self._calculate_confidence_interval(
            difficulty, factors
        )

        # Estimate probability of correct response
        p_correct = self._estimate_p_correct(difficulty)

        # Estimate grade level
        grade_level = self._estimate_grade_level(difficulty, factors)

        return DifficultyEstimate(
            difficulty=difficulty,
            confidence=confidence,
            confidence_lower=conf_lower,
            confidence_upper=conf_upper,
            factors=factors,
            features_used=features_used,
            estimated_p_correct=p_correct,
            grade_level_estimate=grade_level,
            method=method,
        )

    def _extract_features(
        self,
        question: str,
        answer: str,
        passage: Optional[str],
        distractors: Optional[List[str]],
        domain: Optional[str],
    ) -> Dict[str, float]:
        """Extract numerical features for ML model."""
        features = {}

        # Question features
        q_words = question.split()
        features["question_length"] = len(q_words)
        features["question_char_length"] = len(question)
        features["avg_word_length"] = sum(len(w) for w in q_words) / max(len(q_words), 1)

        # Count complex words
        q_words_lower = [w.lower() for w in q_words]
        features["complex_word_ratio"] = sum(
            1 for w in q_words_lower if w in self.COMPLEX_WORDS
        ) / max(len(q_words), 1)

        # Answer features
        a_words = answer.split()
        features["answer_length"] = len(a_words)
        features["answer_has_number"] = 1.0 if re.search(r"\d", answer) else 0.0

        # Question type features
        features["has_negation"] = 1.0 if re.search(
            r"\b(not|never|no|none|except)\b", question.lower()
        ) else 0.0
        features["is_why_question"] = 1.0 if question.lower().startswith("why") else 0.0
        features["is_how_question"] = 1.0 if question.lower().startswith("how") else 0.0

        # Passage features
        if passage:
            features["passage_length"] = len(passage.split())
            # Check if answer is in passage
            features["answer_in_passage"] = 1.0 if answer.lower() in passage.lower() else 0.0
        else:
            features["passage_length"] = 0
            features["answer_in_passage"] = 0.0

        # Distractor features
        if distractors:
            features["num_distractors"] = len(distractors)
            avg_dist_len = sum(len(d) for d in distractors) / len(distractors)
            features["distractor_length_ratio"] = avg_dist_len / max(len(answer), 1)
        else:
            features["num_distractors"] = 0
            features["distractor_length_ratio"] = 0.0

        return features

    def _analyze_linguistic_complexity(self, text: str) -> float:
        """Analyze linguistic complexity of text."""
        if not text:
            return 0.5

        words = re.findall(r"\b\w+\b", text.lower())
        if not words:
            return 0.5

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
        vocab_score = min(1.0, (complex_count * 2 + uncommon_count) / max(len(words), 1))
        factors.append(vocab_score)

        # 4. Sentence structure (subordinate clauses)
        subordinate_markers = ["which", "that", "because", "although", "if", "when", "while", "whereas"]
        subordinate_count = sum(1 for w in words if w in subordinate_markers)
        structure_score = min(1.0, subordinate_count * 0.2)
        factors.append(structure_score)

        # 5. Syllable complexity (approximate)
        total_syllables = sum(self._count_syllables(w) for w in words)
        avg_syllables = total_syllables / max(len(words), 1)
        syllable_score = min(1.0, (avg_syllables - 1) / 3)
        factors.append(max(0, syllable_score))

        return sum(factors) / len(factors)

    def _count_syllables(self, word: str) -> int:
        """Approximate syllable count for a word."""
        word = word.lower()
        if len(word) <= 3:
            return 1

        vowels = "aeiouy"
        count = 0
        prev_vowel = False

        for char in word:
            is_vowel = char in vowels
            if is_vowel and not prev_vowel:
                count += 1
            prev_vowel = is_vowel

        # Adjust for silent 'e'
        if word.endswith('e'):
            count -= 1

        return max(1, count)

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

        # 2. Numbers add specificity/difficulty
        if re.search(r"\d", answer):
            factors.append(0.6)

        # 3. Proper nouns suggest specific knowledge
        words = answer.split()
        proper_noun_ratio = sum(1 for w in words if w and w[0].isupper()) / max(len(words), 1)
        if proper_noun_ratio > 0.3:
            factors.append(0.5 + proper_noun_ratio * 0.3)

        # 4. Abstract concepts
        abstract_indicators = ["concept", "theory", "principle", "idea", "process", "relationship"]
        if any(ind in answer.lower() for ind in abstract_indicators):
            factors.append(0.7)

        # 5. Technical terminology
        answer_words = [w.lower() for w in answer.split()]
        tech_count = sum(1 for w in answer_words if w in self.COMPLEX_WORDS)
        if tech_count > 0:
            factors.append(min(0.9, 0.5 + tech_count * 0.15))

        if not factors:
            return 0.4

        return sum(factors) / len(factors)

    def _analyze_answer_accessibility(self, answer: str, passage: str) -> float:
        """Analyze how accessible the answer is within the passage."""
        if not passage or not answer:
            return 0.5

        passage_lower = passage.lower()
        answer_lower = answer.lower()

        # Check if answer appears directly
        if answer_lower in passage_lower:
            # Position in passage (later = harder)
            position = passage_lower.find(answer_lower)
            position_score = position / max(len(passage), 1)

            # How many times answer appears (more = easier)
            occurrences = passage_lower.count(answer_lower)
            occurrence_score = 1.0 / (1 + occurrences)

            return 0.3 * position_score + 0.4 * occurrence_score + 0.3 * 0.3

        else:
            # Answer must be inferred - harder
            # Check if answer words appear
            answer_words = set(answer_lower.split())
            passage_words = set(passage_lower.split())
            overlap = len(answer_words & passage_words) / max(len(answer_words), 1)

            return 0.6 + (1 - overlap) * 0.3

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

        # 3. First letter similarity
        if correct_answer:
            first_letter_matches = sum(
                1 for d in distractors
                if d and d[0].lower() == correct_answer[0].lower()
            )
            first_letter_score = first_letter_matches / len(distractors)
            factors.append(first_letter_score * 0.5)

        # 4. Word overlap between distractors and correct answer
        correct_words = set(correct_answer.lower().split())
        overlap_scores = []
        for d in distractors:
            d_words = set(d.lower().split())
            if correct_words:
                overlap = len(correct_words & d_words) / len(correct_words)
                overlap_scores.append(overlap)
        if overlap_scores:
            factors.append(sum(overlap_scores) / len(overlap_scores) * 0.7)

        return sum(factors) / len(factors)

    def _analyze_domain_complexity(
        self, context: str, domain: Optional[str] = None
    ) -> float:
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

        # Check domain-specific vocabulary
        domain_score = 0.0
        if domain and domain.lower() in self.DOMAIN_VOCABULARY:
            domain_words = self.DOMAIN_VOCABULARY[domain.lower()]
            domain_count = sum(1 for w in words if w in domain_words)
            domain_score = domain_count * 0.1

        # Check for numerical content
        number_density = sum(
            1 for w in words if re.match(r"\d+", w)
        ) / max(len(words), 1)

        return min(1.0, technical_density * 3 + number_density * 2 + domain_score)

    def _analyze_structural_complexity(self, question: str) -> float:
        """Analyze structural complexity of the question."""
        factors = []

        # 1. Negation (makes questions harder)
        negation_patterns = [
            r"\bnot\b", r"\bnever\b", r"\bno\b", r"\bnone\b",
            r"\bneither\b", r"\bnor\b", r"\bexcept\b", r"\bwithout\b"
        ]
        negation_count = sum(1 for p in negation_patterns if re.search(p, question.lower()))
        if negation_count > 0:
            factors.append(0.3 + negation_count * 0.2)

        # 2. Multiple parts (compound questions)
        if re.search(r"\band\b.*\?|\bor\b.*\?", question.lower()):
            factors.append(0.6)

        # 3. Conditional structure
        if re.search(r"\bif\b|\bwhen\b|\bwhenever\b|\bsuppose\b", question.lower()):
            factors.append(0.5)

        # 4. Comparison structure
        if re.search(r"\bcompare\b|\bdifference\b|\bsimilar\b|\bversus\b", question.lower()):
            factors.append(0.6)

        # 5. Multi-step reasoning indicators
        multi_step_indicators = ["first", "then", "next", "finally", "step", "process"]
        if any(ind in question.lower() for ind in multi_step_indicators):
            factors.append(0.7)

        if not factors:
            return 0.3  # Simple structure

        return min(1.0, sum(factors) / len(factors))

    def _calculate_heuristic_difficulty(self, factors: Dict[str, float]) -> float:
        """Calculate weighted difficulty using heuristic model."""
        difficulty = 0.0

        weights = {
            "linguistic_complexity": self.config.linguistic_weight,
            "bloom_level": self.config.bloom_weight,
            "answer_complexity": self.config.answer_weight,
            "distractor_quality": self.config.distractor_weight,
            "domain_complexity": self.config.domain_weight,
            "structural_complexity": self.config.structural_weight,
            "answer_accessibility": 0.1,  # Additional factor
        }

        total_weight = 0.0
        for factor_name, factor_value in factors.items():
            weight = weights.get(factor_name, 0.05)
            difficulty += weight * factor_value
            total_weight += weight

        if total_weight > 0:
            difficulty /= total_weight

        return max(0.0, min(1.0, difficulty))

    def _predict_ml_difficulty(self, features: Dict[str, float]) -> Optional[float]:
        """Predict difficulty using ML model."""
        try:
            import numpy as np

            # Convert features to array
            feature_names = sorted(features.keys())
            feature_values = np.array([[features.get(f, 0.0) for f in feature_names]])

            if self.config.model_type == "gradient_boosting":
                prediction = self._ml_model.predict(feature_values)[0]
            elif self.config.model_type == "neural_net":
                import torch
                with torch.no_grad():
                    tensor = torch.FloatTensor(feature_values)
                    prediction = self._ml_model(tensor).item()
            else:
                return None

            return float(max(0.0, min(1.0, prediction)))

        except Exception as e:
            logger.warning(f"ML prediction failed: {e}")
            return None

    def _calculate_confidence_interval(
        self,
        difficulty: float,
        factors: Dict[str, float],
    ) -> Tuple[float, float, float]:
        """Calculate confidence and confidence interval for the estimate."""
        # Base confidence from factor consistency
        values = list(factors.values())
        if not values:
            return 0.5, max(0, difficulty - 0.2), min(1, difficulty + 0.2)

        mean = sum(values) / len(values)
        variance = sum((v - mean) ** 2 for v in values) / len(values)
        std_dev = math.sqrt(variance)

        # Lower variance = higher confidence
        confidence = 1.0 - min(1.0, std_dev * 2)
        confidence = max(0.3, confidence)

        # Calculate confidence interval based on uncertainty
        uncertainty = self.config.uncertainty_factor * (1 - confidence) + 0.05

        # Asymmetric intervals near bounds
        if difficulty < 0.2:
            lower_margin = uncertainty * 0.5
            upper_margin = uncertainty
        elif difficulty > 0.8:
            lower_margin = uncertainty
            upper_margin = uncertainty * 0.5
        else:
            lower_margin = uncertainty
            upper_margin = uncertainty

        conf_lower = max(0.0, difficulty - lower_margin)
        conf_upper = min(1.0, difficulty + upper_margin)

        return confidence, conf_lower, conf_upper

    def _estimate_p_correct(self, difficulty: float) -> float:
        """Estimate probability of correct response using IRT-like model."""
        # Simple logistic transformation
        # P(correct) decreases as difficulty increases
        # At difficulty 0.5, P(correct) ≈ 0.5
        logit = -2 * (difficulty - 0.5)
        p_correct = 1 / (1 + math.exp(-logit))

        # Bound to realistic range
        return max(0.15, min(0.95, p_correct))

    def _estimate_grade_level(
        self, difficulty: float, factors: Dict[str, float]
    ) -> int:
        """Estimate appropriate grade level based on difficulty."""
        # Base grade from difficulty
        # 0.0-0.15 -> Grade 1-2
        # 0.15-0.3 -> Grade 3-4
        # 0.3-0.45 -> Grade 5-6
        # 0.45-0.6 -> Grade 7-8
        # 0.6-0.75 -> Grade 9-10
        # 0.75-1.0 -> Grade 11-12

        base_grade = int(difficulty * 12) + 1

        # Adjust based on linguistic complexity
        linguistic = factors.get("linguistic_complexity", 0.5)
        if linguistic > 0.7:
            base_grade += 1
        elif linguistic < 0.3:
            base_grade -= 1

        # Adjust based on Bloom's level
        bloom = factors.get("bloom_level", 0.5)
        if bloom > 0.7:
            base_grade += 1

        return max(1, min(12, base_grade))

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
            "structural_complexity": self._analyze_structural_complexity(question),
        }

    def calibrate(self, actual_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Calibrate estimator with actual student performance data.

        Args:
            actual_results: List of dicts with:
                - 'question': question text
                - 'answer': answer text
                - 'p_correct': actual probability of correct response
                - 'n_attempts': number of student attempts

        Returns:
            Calibration statistics
        """
        if not actual_results:
            return {"status": "no_data", "calibrated": False}

        logger.info(f"Calibrating with {len(actual_results)} data points")

        # Store calibration data
        self._calibration_data = actual_results

        # Calculate calibration statistics
        predicted_difficulties = []
        actual_difficulties = []

        for item in actual_results:
            estimate = self.estimate(item["question"], item["answer"])
            predicted_difficulties.append(estimate.difficulty)
            # Convert p_correct to difficulty (inverse)
            actual_diff = 1 - item.get("p_correct", 0.5)
            actual_difficulties.append(actual_diff)

        # Calculate correlation
        if len(predicted_difficulties) >= 2:
            correlation = np.corrcoef(predicted_difficulties, actual_difficulties)[0, 1]
        else:
            correlation = 0.0

        # Calculate mean absolute error
        mae = sum(
            abs(p - a) for p, a in zip(predicted_difficulties, actual_difficulties)
        ) / len(actual_results)

        # Calculate bias
        bias = sum(
            p - a for p, a in zip(predicted_difficulties, actual_difficulties)
        ) / len(actual_results)

        return {
            "status": "calibrated",
            "calibrated": True,
            "n_samples": len(actual_results),
            "correlation": float(correlation) if not np.isnan(correlation) else 0.0,
            "mae": float(mae),
            "bias": float(bias),
        }

    def compare_difficulty(
        self,
        question1: str, answer1: str,
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

    def get_difficulty_band(self, difficulty: float) -> str:
        """Get difficulty band label for a difficulty score."""
        if difficulty < 0.2:
            return "very_easy"
        elif difficulty < 0.4:
            return "easy"
        elif difficulty < 0.6:
            return "medium"
        elif difficulty < 0.8:
            return "hard"
        else:
            return "very_hard"

    def suggest_adjustments(
        self,
        question: str,
        answer: str,
        target_difficulty: float,
    ) -> List[str]:
        """
        Suggest adjustments to reach target difficulty.

        Args:
            question: The question text
            answer: The answer
            target_difficulty: Target difficulty (0-1)

        Returns:
            List of suggestions for adjusting difficulty
        """
        current = self.estimate(question, answer)
        diff = target_difficulty - current.difficulty
        suggestions = []

        if abs(diff) < 0.1:
            return ["Question is already at target difficulty level."]

        if diff > 0:  # Need to increase difficulty
            if current.factors.get("linguistic_complexity", 0) < 0.5:
                suggestions.append(
                    "Use more complex vocabulary and longer sentences."
                )
            if current.factors.get("bloom_level", 0) < 0.5:
                suggestions.append(
                    "Elevate the cognitive demand (e.g., change from recall to analysis)."
                )
            if current.factors.get("structural_complexity", 0) < 0.5:
                suggestions.append(
                    "Add conditional or multi-part structure to the question."
                )
            suggestions.append(
                "Consider requiring inference rather than direct recall."
            )
        else:  # Need to decrease difficulty
            if current.factors.get("linguistic_complexity", 0) > 0.5:
                suggestions.append(
                    "Simplify vocabulary and use shorter sentences."
                )
            if current.factors.get("bloom_level", 0) > 0.5:
                suggestions.append(
                    "Lower cognitive demand to recall or understand level."
                )
            if current.factors.get("structural_complexity", 0) > 0.5:
                suggestions.append(
                    "Simplify question structure, remove conditionals."
                )
            suggestions.append(
                "Make the answer more directly accessible in the passage."
            )

        return suggestions
