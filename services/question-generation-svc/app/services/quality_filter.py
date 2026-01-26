"""
Quality Filter Service.

Filters and scores generated questions for quality assurance.
Evaluates clarity, answerability, relevance, and grammatical correctness.
"""

import logging
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


@dataclass
class QualityScore:
    """Quality assessment scores for a question."""

    overall: float  # 0-1 overall quality
    clarity: float  # 0-1 how clear is the question
    answerability: float  # 0-1 can it be answered from context
    relevance: float  # 0-1 relevance to main content
    grammaticality: float  # 0-1 grammatical correctness
    specificity: float = 0.5  # 0-1 how specific is the question
    is_acceptable: bool = True  # Meets minimum threshold
    issues: List[str] = field(default_factory=list)


@dataclass
class QualityFilterConfig:
    """Configuration for quality filtering."""

    min_quality_score: float = 0.6
    min_clarity: float = 0.5
    min_answerability: float = 0.5
    min_relevance: float = 0.4
    min_grammaticality: float = 0.6
    # Weight for each dimension in overall score
    clarity_weight: float = 0.25
    answerability_weight: float = 0.30
    relevance_weight: float = 0.25
    grammaticality_weight: float = 0.20


class QualityFilter:
    """
    Score and filter generated question quality.

    Evaluates multiple dimensions:
    - Clarity: Is the question clear and unambiguous?
    - Answerability: Can it be answered from the given context?
    - Relevance: Is it relevant to the main content?
    - Grammaticality: Is it grammatically correct?
    - Specificity: Is it specific rather than vague?

    Usage:
        quality_filter = QualityFilter()
        score = quality_filter.score(question, answer, context)
        if score.is_acceptable:
            # Use the question
    """

    # Common grammar issues to check
    GRAMMAR_PATTERNS = [
        (r"\s+\?", "Space before question mark"),
        (r"\?\s*\?", "Multiple question marks"),
        (r"^\s*[a-z]", "Starts with lowercase"),
        (r"\s+,", "Space before comma"),
        (r",,", "Double comma"),
        (r"\s\s+", "Multiple spaces"),
    ]

    # Vague/unclear question patterns
    UNCLEAR_PATTERNS = [
        r"^(what|how|why)\s*\?$",  # Too short
        r"^(it|this|that)\s+(is|was|were)",  # Ambiguous reference
        r"(something|anything|nothing)\s",  # Vague terms
        r"(etc\.|and so on|and stuff)",  # Incomplete
    ]

    # Question word patterns for classification
    QUESTION_WORDS = {"what", "who", "when", "where", "which", "why", "how"}

    def __init__(self, config: Optional[QualityFilterConfig] = None):
        """Initialize the quality filter."""
        self.config = config or QualityFilterConfig()
        self._spacy_nlp = None
        logger.info(
            f"QualityFilter initialized with min_quality={self.config.min_quality_score}"
        )

    def _load_spacy(self):
        """Lazy load spaCy for NLP analysis."""
        if self._spacy_nlp is None:
            try:
                import spacy
                self._spacy_nlp = spacy.load("en_core_web_sm")
            except Exception as e:
                logger.warning(f"spaCy not available: {e}")
        return self._spacy_nlp

    def score(
        self,
        question: str,
        answer: str,
        context: str,
    ) -> QualityScore:
        """
        Score question quality across multiple dimensions.

        Args:
            question: The generated question
            answer: The expected answer
            context: The source passage/context

        Returns:
            QualityScore with dimension scores and overall quality
        """
        issues = []

        # 1. Assess clarity
        clarity, clarity_issues = self._assess_clarity(question)
        issues.extend(clarity_issues)

        # 2. Assess answerability
        answerability, answer_issues = self._assess_answerability(
            question, answer, context
        )
        issues.extend(answer_issues)

        # 3. Assess relevance
        relevance, relevance_issues = self._assess_relevance(question, context)
        issues.extend(relevance_issues)

        # 4. Assess grammaticality
        grammaticality, grammar_issues = self._assess_grammaticality(question)
        issues.extend(grammar_issues)

        # 5. Assess specificity
        specificity = self._assess_specificity(question, answer)

        # Calculate overall score
        overall = (
            self.config.clarity_weight * clarity
            + self.config.answerability_weight * answerability
            + self.config.relevance_weight * relevance
            + self.config.grammaticality_weight * grammaticality
        )

        # Determine if acceptable
        is_acceptable = (
            overall >= self.config.min_quality_score
            and clarity >= self.config.min_clarity
            and answerability >= self.config.min_answerability
            and relevance >= self.config.min_relevance
            and grammaticality >= self.config.min_grammaticality
        )

        return QualityScore(
            overall=overall,
            clarity=clarity,
            answerability=answerability,
            relevance=relevance,
            grammaticality=grammaticality,
            specificity=specificity,
            is_acceptable=is_acceptable,
            issues=issues,
        )

    def _assess_clarity(self, question: str) -> Tuple[float, List[str]]:
        """Assess how clear and unambiguous the question is."""
        score = 1.0
        issues = []

        # Check for unclear patterns
        question_lower = question.lower()
        for pattern in self.UNCLEAR_PATTERNS:
            if re.search(pattern, question_lower):
                score -= 0.2
                issues.append(f"Unclear pattern: {pattern}")

        # Check question length (too short = unclear)
        word_count = len(question.split())
        if word_count < 4:
            score -= 0.3
            issues.append("Question too short")
        elif word_count > 30:
            score -= 0.1
            issues.append("Question too long")

        # Check for question mark
        if not question.strip().endswith("?"):
            score -= 0.2
            issues.append("Missing question mark")

        # Check for proper question structure
        has_question_word = any(
            question_lower.startswith(qw) for qw in self.QUESTION_WORDS
        )
        if not has_question_word:
            # Could be a command or statement, slight penalty
            score -= 0.1

        return max(0.0, min(1.0, score)), issues

    def _assess_answerability(
        self, question: str, answer: str, context: str
    ) -> Tuple[float, List[str]]:
        """Assess if the question can be answered from the context."""
        score = 1.0
        issues = []

        if not context:
            return 0.5, ["No context provided"]

        context_lower = context.lower()
        answer_lower = answer.lower()
        question_lower = question.lower()

        # Check if answer is in context
        if answer_lower not in context_lower:
            score -= 0.5
            issues.append("Answer not found in context")

        # Check for answer overlap with question (avoid giving away answer)
        if answer_lower in question_lower:
            score -= 0.3
            issues.append("Answer appears in question")

        # Check question words relate to context
        question_words = set(re.findall(r"\b\w+\b", question_lower))
        context_words = set(re.findall(r"\b\w+\b", context_lower))

        # Remove stopwords
        stopwords = {"the", "a", "an", "is", "are", "was", "were", "what", "who", "when", "where", "which", "how", "why"}
        question_content_words = question_words - stopwords
        context_content_words = context_words - stopwords

        if question_content_words:
            overlap = len(question_content_words & context_content_words)
            overlap_ratio = overlap / len(question_content_words)
            if overlap_ratio < 0.3:
                score -= 0.2
                issues.append("Low word overlap with context")

        return max(0.0, min(1.0, score)), issues

    def _assess_relevance(
        self, question: str, context: str
    ) -> Tuple[float, List[str]]:
        """Assess relevance of question to the context."""
        score = 1.0
        issues = []

        if not context:
            return 0.5, ["No context for relevance check"]

        # Simple keyword overlap approach
        question_words = set(re.findall(r"\b\w{4,}\b", question.lower()))
        context_words = set(re.findall(r"\b\w{4,}\b", context.lower()))

        if not question_words:
            return 0.5, ["No content words in question"]

        overlap = len(question_words & context_words)
        total_question_words = len(question_words)

        relevance_ratio = overlap / total_question_words if total_question_words > 0 else 0

        if relevance_ratio < 0.2:
            score = 0.3
            issues.append("Very low relevance to context")
        elif relevance_ratio < 0.4:
            score = 0.6
            issues.append("Moderate relevance to context")
        else:
            score = 0.8 + (relevance_ratio * 0.2)

        return max(0.0, min(1.0, score)), issues

    def _assess_grammaticality(self, question: str) -> Tuple[float, List[str]]:
        """Assess grammatical correctness of the question."""
        score = 1.0
        issues = []

        # Check common grammar patterns
        for pattern, issue_name in self.GRAMMAR_PATTERNS:
            if re.search(pattern, question):
                score -= 0.15
                issues.append(issue_name)

        # Check capitalization
        if question and question[0].islower():
            score -= 0.1
            issues.append("Should start with capital")

        # Check for balanced quotes/parentheses
        if question.count('"') % 2 != 0:
            score -= 0.1
            issues.append("Unbalanced quotes")
        if question.count('(') != question.count(')'):
            score -= 0.1
            issues.append("Unbalanced parentheses")

        # Use spaCy for more advanced checks if available
        nlp = self._load_spacy()
        if nlp:
            try:
                doc = nlp(question)
                # Check for verb presence
                has_verb = any(token.pos_ == "VERB" for token in doc)
                if not has_verb:
                    score -= 0.1
                    # This might be okay for some questions, so small penalty
            except Exception:
                pass

        return max(0.0, min(1.0, score)), issues

    def _assess_specificity(self, question: str, answer: str) -> float:
        """Assess how specific the question is."""
        score = 0.5  # Base score

        # Longer answers often indicate more specific questions
        if len(answer) > 20:
            score += 0.2
        elif len(answer) < 5:
            score += 0.1  # Very short answers can still be specific

        # Check for specific question types
        question_lower = question.lower()

        # "How many" and "When" questions are often specific
        if re.match(r"^(how many|how much|when|what year|what date)", question_lower):
            score += 0.2

        # "Why" and "How" questions can be broad or specific
        if re.match(r"^(why|how)\s", question_lower):
            score += 0.1

        # Questions with named entities are more specific
        if re.search(r"[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*", question):
            score += 0.1

        return max(0.0, min(1.0, score))

    def filter_batch(
        self, questions: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Filter a batch of questions by quality.

        Args:
            questions: List of dicts with 'question', 'answer', 'context' keys

        Returns:
            Filtered list of questions that meet quality threshold
        """
        filtered = []

        for q in questions:
            question_text = q.get("question", "")
            answer = q.get("answer", "")
            context = q.get("context", "")

            score = self.score(question_text, answer, context)

            if score.is_acceptable:
                # Add quality score to the question dict
                q["quality_score"] = score.overall
                q["quality_details"] = {
                    "clarity": score.clarity,
                    "answerability": score.answerability,
                    "relevance": score.relevance,
                    "grammaticality": score.grammaticality,
                    "specificity": score.specificity,
                }
                filtered.append(q)
            else:
                logger.debug(
                    f"Filtered out question: {question_text[:50]}... "
                    f"(score={score.overall:.2f}, issues={score.issues})"
                )

        logger.info(
            f"Quality filter: {len(filtered)}/{len(questions)} questions passed"
        )
        return filtered

    def get_improvement_suggestions(
        self, score: QualityScore
    ) -> List[str]:
        """Get suggestions for improving question quality."""
        suggestions = []

        if score.clarity < 0.6:
            suggestions.append(
                "Improve clarity: Make the question more specific and unambiguous"
            )

        if score.answerability < 0.6:
            suggestions.append(
                "Improve answerability: Ensure the answer can be found in the context"
            )

        if score.relevance < 0.6:
            suggestions.append(
                "Improve relevance: Focus on the main topics from the context"
            )

        if score.grammaticality < 0.6:
            suggestions.append(
                "Fix grammar: Check punctuation, capitalization, and sentence structure"
            )

        if score.specificity < 0.5:
            suggestions.append(
                "Be more specific: Avoid vague terms, target specific facts"
            )

        return suggestions

    def validate_question(
        self, question: str, answer: str, context: str
    ) -> Tuple[bool, QualityScore, List[str]]:
        """
        Validate a question and return detailed feedback.

        Returns:
            Tuple of (is_valid, score, suggestions)
        """
        score = self.score(question, answer, context)
        suggestions = self.get_improvement_suggestions(score)

        return score.is_acceptable, score, suggestions
