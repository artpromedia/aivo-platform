"""
Complexity Analyzer

Analyze cognitive complexity of educational content.
Provides detailed analysis of element interactivity, vocabulary load,
syntactic complexity, and conceptual density.
"""
import logging
import re
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class ComplexityAnalysis:
    """Results from complexity analysis."""
    element_interactivity: float  # How many elements interact (0-1)
    vocabulary_load: float  # Difficulty of vocabulary (0-1)
    syntactic_complexity: float  # Sentence structure complexity (0-1)
    conceptual_density: float  # Concepts per unit (0-1)
    overall_complexity: float  # Weighted combination (0-1)
    intrinsic_load_estimate: float  # Estimated cognitive load (0-1)
    complexity_factors: List[str] = field(default_factory=list)
    simplification_suggestions: List[str] = field(default_factory=list)
    processing_time_ms: int = 0


@dataclass
class ElementInteractivityResult:
    """Results from element interactivity analysis."""
    interactivity_score: float
    element_count: int
    interaction_count: int
    elements: List[Dict[str, Any]]
    interaction_patterns: List[str]
    cognitive_operations: List[str]


@dataclass
class ComplexityAnalyzerConfig:
    """Configuration for the complexity analyzer."""
    # Weights for overall complexity calculation
    vocabulary_weight: float = 0.25
    syntactic_weight: float = 0.25
    conceptual_weight: float = 0.30
    interactivity_weight: float = 0.20

    # Vocabulary thresholds
    easy_syllable_threshold: int = 2
    difficult_syllable_threshold: int = 4
    max_avg_word_length: float = 10.0

    # Syntactic thresholds
    simple_sentence_words: int = 10
    complex_sentence_words: int = 25

    # Conceptual density
    high_density_threshold: float = 3.0  # concepts per sentence
    low_density_threshold: float = 1.0

    # Element interactivity (Miller's number)
    max_interacting_elements: int = 7


# Common difficult/academic vocabulary
ACADEMIC_VOCABULARY = {
    "analyze", "approach", "assess", "assume", "authority", "available",
    "benefit", "concept", "consist", "constitute", "context", "create",
    "data", "define", "derive", "distribute", "economy", "environment",
    "establish", "estimate", "evident", "factor", "function", "identify",
    "indicate", "interpret", "involve", "issue", "method", "occur",
    "percent", "period", "policy", "principle", "process", "require",
    "research", "respond", "role", "section", "significant", "similar",
    "source", "specific", "structure", "theory", "variable",
}

# Domain-specific cognitive operation triggers
COGNITIVE_OPERATION_PATTERNS = {
    "comparison": ["compare", "contrast", "similar", "different", "whereas", "unlike", "both"],
    "causal_reasoning": ["because", "therefore", "cause", "effect", "result", "consequently", "leads to"],
    "sequencing": ["first", "then", "next", "finally", "step", "sequence", "after", "before"],
    "classification": ["type", "category", "classify", "group", "kind", "sort", "class"],
    "calculation": ["solve", "calculate", "compute", "find", "determine", "evaluate"],
    "analysis": ["analyze", "examine", "investigate", "break down", "consider"],
    "synthesis": ["combine", "integrate", "synthesize", "create", "develop", "construct"],
    "inference": ["infer", "conclude", "deduce", "imply", "suggest", "predict"],
    "evaluation": ["evaluate", "judge", "assess", "critique", "rate", "rank"],
    "application": ["apply", "use", "implement", "demonstrate", "show"],
}


class ComplexityAnalyzer:
    """
    Analyze intrinsic cognitive complexity of content.

    This analyzer evaluates educational content across multiple dimensions:
    - Element interactivity: How many elements must be processed simultaneously
    - Vocabulary difficulty: Complexity of words used
    - Syntactic complexity: Sentence structure complexity
    - Conceptual density: Number of concepts per unit of content

    These factors combine to estimate the intrinsic cognitive load that
    content imposes on learners.

    Usage:
        analyzer = ComplexityAnalyzer()
        complexity = analyzer.analyze("The mitochondria is the powerhouse...")
        print(f"Overall complexity: {complexity.overall_complexity}")
    """

    def __init__(self, config: Optional[ComplexityAnalyzerConfig] = None):
        """Initialize the complexity analyzer.

        Args:
            config: Optional configuration overrides
        """
        self.config = config or ComplexityAnalyzerConfig()
        self._nlp = None  # Lazy load for spaCy
        logger.info("ComplexityAnalyzer initialized")

    def _get_nlp(self):
        """Lazy load spaCy model for NLP processing."""
        if self._nlp is None:
            try:
                import spacy
                self._nlp = spacy.load("en_core_web_sm")
                logger.debug("spaCy model loaded successfully")
            except Exception as e:
                logger.warning(f"Could not load spaCy model: {e}. Using fallback analysis.")
                self._nlp = None
        return self._nlp

    def analyze(
        self,
        content: str,
        content_type: str = "text",
        domain: Optional[str] = None,
        grade_level: Optional[int] = None,
        prior_knowledge: Optional[List[str]] = None,
    ) -> ComplexityAnalysis:
        """
        Analyze content complexity across multiple dimensions.

        Args:
            content: The text content to analyze
            content_type: Type of content (text, problem, quiz, etc.)
            domain: Educational domain for context (math, science, etc.)
            grade_level: Target grade level (1-12) for appropriateness check
            prior_knowledge: Concepts assumed as prior knowledge

        Returns:
            ComplexityAnalysis with detailed breakdown and suggestions
        """
        start_time = time.time()

        # Handle empty content
        if not content or not content.strip():
            logger.debug("Empty content provided, returning zero complexity")
            return ComplexityAnalysis(
                element_interactivity=0.0,
                vocabulary_load=0.0,
                syntactic_complexity=0.0,
                conceptual_density=0.0,
                overall_complexity=0.0,
                intrinsic_load_estimate=0.0,
                processing_time_ms=0,
            )

        prior_knowledge = prior_knowledge or []
        complexity_factors = []
        suggestions = []

        try:
            # Analyze each dimension
            vocab_score, vocab_factors = self._analyze_vocabulary(content, domain)
            syntactic_score, syntactic_factors = self._analyze_syntax(content)
            conceptual_score, concept_factors = self._analyze_conceptual_density(
                content, domain, prior_knowledge
            )
            interactivity_result = self.analyze_element_interactivity(content, domain)
            interactivity_score = interactivity_result.interactivity_score

            # Collect all contributing factors
            complexity_factors.extend(vocab_factors)
            complexity_factors.extend(syntactic_factors)
            complexity_factors.extend(concept_factors)

            if interactivity_result.interaction_count > 3:
                complexity_factors.append(
                    f"High element interactions ({interactivity_result.interaction_count})"
                )
            if len(interactivity_result.cognitive_operations) > 2:
                ops = ", ".join(interactivity_result.cognitive_operations[:3])
                complexity_factors.append(f"Multiple cognitive operations required: {ops}")

            # Calculate weighted overall complexity
            overall = (
                self.config.vocabulary_weight * vocab_score +
                self.config.syntactic_weight * syntactic_score +
                self.config.conceptual_weight * conceptual_score +
                self.config.interactivity_weight * interactivity_score
            )
            overall = np.clip(overall, 0.0, 1.0)

            # Estimate intrinsic cognitive load (non-linear relationship)
            intrinsic_load = self._estimate_cognitive_load(overall, interactivity_score)

            # Generate simplification suggestions
            suggestions = self._generate_suggestions(
                vocab_score, syntactic_score, conceptual_score, interactivity_score
            )

            processing_time = int((time.time() - start_time) * 1000)

            return ComplexityAnalysis(
                element_interactivity=float(interactivity_score),
                vocabulary_load=float(vocab_score),
                syntactic_complexity=float(syntactic_score),
                conceptual_density=float(conceptual_score),
                overall_complexity=float(overall),
                intrinsic_load_estimate=float(intrinsic_load),
                complexity_factors=complexity_factors,
                simplification_suggestions=suggestions,
                processing_time_ms=processing_time,
            )

        except Exception as e:
            logger.error(f"Error during complexity analysis: {e}", exc_info=True)
            processing_time = int((time.time() - start_time) * 1000)
            return ComplexityAnalysis(
                element_interactivity=0.5,
                vocabulary_load=0.5,
                syntactic_complexity=0.5,
                conceptual_density=0.5,
                overall_complexity=0.5,
                intrinsic_load_estimate=0.5,
                complexity_factors=["Analysis error - using default values"],
                simplification_suggestions=[],
                processing_time_ms=processing_time,
            )

    def analyze_element_interactivity(
        self,
        content: str,
        domain: Optional[str] = None,
        identify_elements: bool = True,
    ) -> ElementInteractivityResult:
        """
        Analyze how many elements must be processed together.

        Element interactivity is a key concept in Cognitive Load Theory.
        When multiple elements must be processed simultaneously (high interactivity),
        intrinsic cognitive load increases significantly.

        Args:
            content: Content to analyze
            domain: Educational domain for context
            identify_elements: Whether to return individual elements

        Returns:
            ElementInteractivityResult with detailed breakdown
        """
        if not content or not content.strip():
            return ElementInteractivityResult(
                interactivity_score=0.0,
                element_count=0,
                interaction_count=0,
                elements=[],
                interaction_patterns=[],
                cognitive_operations=[],
            )

        elements: List[Dict[str, Any]] = []
        interaction_patterns: List[str] = []
        concepts: set = set()

        nlp = self._get_nlp()

        try:
            if nlp:
                doc = nlp(content)

                # Extract key elements (nouns, verbs representing concepts)
                for token in doc:
                    if token.pos_ in ("NOUN", "PROPN") and not token.is_stop:
                        concepts.add(token.lemma_.lower())

                # Analyze each sentence for element interactions
                for sent in doc.sents:
                    sent_concepts = []
                    for token in sent:
                        if token.lemma_.lower() in concepts:
                            element_info = {
                                "text": token.text,
                                "lemma": token.lemma_,
                                "pos": token.pos_,
                                "dep": token.dep_,
                            }
                            sent_concepts.append(element_info)
                            if identify_elements:
                                elements.append(element_info)

                    # Multiple concepts in a sentence means interaction
                    if len(sent_concepts) > 1:
                        concept_texts = ", ".join(c["text"] for c in sent_concepts[:5])
                        interaction_patterns.append(f"Multiple concepts interact: {concept_texts}")
            else:
                # Fallback: simple word-based analysis
                words = re.findall(r'\b\w+\b', content.lower())
                # Filter to meaningful words (longer than 3 chars, alphabetic)
                concepts = set(w for w in words if len(w) > 3 and w.isalpha())

                if identify_elements:
                    elements = [{"text": w, "type": "word"} for w in list(concepts)[:20]]

                # Estimate interactions from sentence structure
                sentences = re.split(r'[.!?]+', content)
                for sent in sentences:
                    sent_words = re.findall(r'\b\w+\b', sent.lower())
                    sent_concepts = [w for w in sent_words if w in concepts]
                    if len(sent_concepts) > 2:
                        interaction_patterns.append(
                            f"Multiple elements in sentence ({len(sent_concepts)})"
                        )

        except Exception as e:
            logger.warning(f"Error in element analysis: {e}")
            words = re.findall(r'\b\w+\b', content.lower())
            concepts = set(w for w in words if len(w) > 3)

        # Identify cognitive operations required
        cognitive_operations = self._identify_cognitive_operations(content, domain)

        # Calculate interactivity score
        n_elements = len(concepts)
        n_interactions = len(interaction_patterns)
        n_operations = len(cognitive_operations)

        # Score based on element count relative to working memory capacity
        max_elements = self.config.max_interacting_elements
        element_factor = min(1.0, n_elements / (max_elements * 2))
        interaction_factor = min(1.0, n_interactions / 5)
        operation_factor = min(1.0, n_operations / 4)

        interactivity_score = (
            0.4 * element_factor +
            0.35 * interaction_factor +
            0.25 * operation_factor
        )
        interactivity_score = float(np.clip(interactivity_score, 0.0, 1.0))

        return ElementInteractivityResult(
            interactivity_score=interactivity_score,
            element_count=len(concepts),
            interaction_count=n_interactions,
            elements=elements if identify_elements else [],
            interaction_patterns=interaction_patterns[:10],  # Limit for response size
            cognitive_operations=cognitive_operations,
        )

    def compute_element_interactivity(
        self,
        content: str,
        domain: Optional[str] = None,
    ) -> float:
        """
        Compute element interactivity score.

        Convenience method that returns just the interactivity score.

        Args:
            content: Content to analyze
            domain: Educational domain

        Returns:
            Float interactivity score (0-1)
        """
        result = self.analyze_element_interactivity(content, domain, identify_elements=False)
        return result.interactivity_score

    def estimate_cognitive_load(
        self,
        content: str,
        content_type: str = "text",
        domain: Optional[str] = None,
        prior_knowledge: Optional[List[str]] = None,
    ) -> float:
        """
        Estimate intrinsic cognitive load of content.

        Convenience method that returns just the load estimate.

        Args:
            content: Content to analyze
            content_type: Type of content
            domain: Educational domain
            prior_knowledge: Concepts already known

        Returns:
            Float cognitive load estimate (0-1)
        """
        analysis = self.analyze(content, content_type, domain, prior_knowledge=prior_knowledge)
        return analysis.intrinsic_load_estimate

    def compare_alternatives(
        self,
        contents: List[str],
        domain: Optional[str] = None,
    ) -> List[ComplexityAnalysis]:
        """
        Compare complexity of alternative content versions.

        Useful for selecting the least complex version of content
        that still covers the learning objectives.

        Args:
            contents: List of content alternatives to compare
            domain: Educational domain

        Returns:
            List of ComplexityAnalysis, sorted by complexity (ascending)
        """
        if not contents:
            logger.warning("No content provided for comparison")
            return []

        results = []
        for content in contents:
            try:
                analysis = self.analyze(content, domain=domain)
                results.append(analysis)
            except Exception as e:
                logger.error(f"Error analyzing content alternative: {e}")
                # Add a default high-complexity result for failed analyses
                results.append(ComplexityAnalysis(
                    element_interactivity=1.0,
                    vocabulary_load=1.0,
                    syntactic_complexity=1.0,
                    conceptual_density=1.0,
                    overall_complexity=1.0,
                    intrinsic_load_estimate=1.0,
                    complexity_factors=["Analysis failed"],
                    simplification_suggestions=[],
                    processing_time_ms=0,
                ))

        # Sort by overall complexity (ascending - simplest first)
        results.sort(key=lambda x: x.overall_complexity)

        logger.debug(
            f"Compared {len(contents)} alternatives. "
            f"Complexity range: {results[0].overall_complexity:.2f} - {results[-1].overall_complexity:.2f}"
        )

        return results

    def _analyze_vocabulary(
        self,
        content: str,
        domain: Optional[str] = None,
    ) -> Tuple[float, List[str]]:
        """Analyze vocabulary difficulty."""
        factors = []

        words = re.findall(r'\b\w+\b', content.lower())
        if not words:
            return 0.0, []

        # Calculate average word length
        avg_length = np.mean([len(w) for w in words])
        length_score = min(1.0, (avg_length - 3) / (self.config.max_avg_word_length - 3))
        length_score = max(0.0, length_score)

        # Count syllables (approximation)
        def count_syllables(word: str) -> int:
            word = word.lower()
            count = 0
            vowels = "aeiouy"
            prev_vowel = False
            for char in word:
                is_vowel = char in vowels
                if is_vowel and not prev_vowel:
                    count += 1
                prev_vowel = is_vowel
            return max(1, count)

        syllable_counts = [count_syllables(w) for w in words]
        avg_syllables = np.mean(syllable_counts)

        # Identify difficult words (3+ syllables)
        difficult_words = [
            w for w, s in zip(words, syllable_counts)
            if s >= self.config.difficult_syllable_threshold
        ]
        difficult_ratio = len(difficult_words) / len(words) if words else 0

        if difficult_ratio > 0.15:
            factors.append(f"High proportion of difficult words ({difficult_ratio:.1%})")

        # Check for academic vocabulary
        academic_matches = [w for w in words if w in ACADEMIC_VOCABULARY]
        academic_ratio = len(academic_matches) / len(words) if words else 0

        if academic_ratio > 0.05:
            factors.append(f"Contains academic vocabulary ({len(academic_matches)} terms)")

        # Calculate final vocabulary score
        syllable_score = min(1.0, (avg_syllables - 1) / 3)
        academic_score = min(1.0, academic_ratio * 10)

        vocab_score = (
            0.35 * length_score +
            0.35 * syllable_score +
            0.15 * difficult_ratio +
            0.15 * academic_score
        )

        return float(np.clip(vocab_score, 0.0, 1.0)), factors

    def _analyze_syntax(self, content: str) -> Tuple[float, List[str]]:
        """Analyze syntactic complexity."""
        factors = []

        # Split into sentences
        sentences = re.split(r'[.!?]+', content)
        sentences = [s.strip() for s in sentences if s.strip()]

        if not sentences:
            return 0.0, []

        # Calculate sentence length statistics
        sentence_lengths = [len(s.split()) for s in sentences]
        avg_length = np.mean(sentence_lengths)
        max_length = max(sentence_lengths)

        if avg_length > self.config.complex_sentence_words:
            factors.append(f"Long sentences (avg {avg_length:.1f} words)")

        # Count subordinate clauses
        subordinators = [
            "because", "although", "while", "when", "if", "unless",
            "since", "after", "before", "until", "whereas", "whether",
            "that", "which", "who", "whom"
        ]
        clause_count = 0
        for sent in sentences:
            sent_lower = sent.lower()
            for sub in subordinators:
                if f" {sub} " in f" {sent_lower} ":
                    clause_count += 1

        clause_ratio = clause_count / len(sentences) if sentences else 0
        if clause_ratio > 1.5:
            factors.append(f"Complex clause structure ({clause_count} subordinate clauses)")

        # Detect passive voice (simplified)
        passive_patterns = [r'\b(was|were|been|being|is|are)\s+\w+ed\b']
        passive_count = 0
        for pattern in passive_patterns:
            passive_count += len(re.findall(pattern, content, re.IGNORECASE))

        if passive_count > 2:
            factors.append(f"Multiple passive constructions ({passive_count})")

        # Calculate final syntactic score
        length_score = min(1.0, max(0.0, (avg_length - self.config.simple_sentence_words) /
                                   (self.config.complex_sentence_words - self.config.simple_sentence_words)))
        clause_score = min(1.0, clause_ratio / 2)
        passive_score = min(1.0, passive_count / (len(sentences) * 0.5)) if sentences else 0

        syntactic_score = (
            0.5 * length_score +
            0.35 * clause_score +
            0.15 * passive_score
        )

        return float(np.clip(syntactic_score, 0.0, 1.0)), factors

    def _analyze_conceptual_density(
        self,
        content: str,
        domain: Optional[str] = None,
        prior_knowledge: Optional[List[str]] = None,
    ) -> Tuple[float, List[str]]:
        """Analyze conceptual density."""
        factors = []
        prior_knowledge = prior_knowledge or []
        prior_set = set(p.lower() for p in prior_knowledge)

        # Split into sentences
        sentences = re.split(r'[.!?]+', content)
        sentences = [s.strip() for s in sentences if s.strip()]

        if not sentences:
            return 0.0, []

        concepts: set = set()
        nlp = self._get_nlp()

        try:
            if nlp:
                doc = nlp(content)
                # Extract noun phrases as concepts
                for chunk in doc.noun_chunks:
                    concept = chunk.root.lemma_.lower()
                    if len(concept) > 2 and concept not in prior_set:
                        concepts.add(concept)

                # Extract named entities
                for ent in doc.ents:
                    concept = ent.text.lower()
                    if concept not in prior_set:
                        concepts.add(concept)
            else:
                # Fallback: identify potential concepts
                words = re.findall(r'\b[A-Z][a-z]+\b|\b\w{6,}\b', content)
                concepts = set(w.lower() for w in words if w.lower() not in prior_set)
        except Exception as e:
            logger.warning(f"Error in conceptual analysis: {e}")
            words = re.findall(r'\b\w{5,}\b', content)
            concepts = set(w.lower() for w in words if w.lower() not in prior_set)

        # Calculate density
        concepts_per_sentence = len(concepts) / len(sentences) if sentences else 0

        if concepts_per_sentence > self.config.high_density_threshold:
            factors.append(f"High concept density ({concepts_per_sentence:.1f} per sentence)")

        # Check for abstract concepts
        abstract_indicators = [
            "theory", "concept", "principle", "framework", "model",
            "system", "process", "relationship", "phenomenon", "paradigm"
        ]
        abstract_count = sum(1 for ind in abstract_indicators if ind in content.lower())

        if abstract_count > 2:
            factors.append(f"Multiple abstract concepts ({abstract_count})")

        # Calculate final conceptual score
        density_score = min(1.0, concepts_per_sentence / self.config.high_density_threshold)
        abstract_score = min(1.0, abstract_count / 5)

        conceptual_score = 0.7 * density_score + 0.3 * abstract_score

        return float(np.clip(conceptual_score, 0.0, 1.0)), factors

    def _identify_cognitive_operations(
        self,
        content: str,
        domain: Optional[str] = None,
    ) -> List[str]:
        """Identify cognitive operations required to process content."""
        operations = []
        content_lower = content.lower()

        for operation, trigger_words in COGNITIVE_OPERATION_PATTERNS.items():
            if any(word in content_lower for word in trigger_words):
                operations.append(operation)

        # Domain-specific operations
        if domain == "math":
            if any(c in content for c in ["+", "-", "*", "/", "=", "x", "y"]):
                if "calculation" not in operations:
                    operations.append("calculation")

        return operations

    def _estimate_cognitive_load(
        self,
        overall_complexity: float,
        interactivity_score: float,
    ) -> float:
        """
        Convert complexity to cognitive load estimate.

        Uses a non-linear relationship where load increases more rapidly
        at higher complexity levels (reflecting working memory limitations).
        """
        # Exponential relationship with interactivity as amplifier
        base_load = overall_complexity ** 1.4
        interactivity_amplifier = 1.0 + (interactivity_score * 0.4)
        load = base_load * interactivity_amplifier

        return float(np.clip(load, 0.0, 1.0))

    def _generate_suggestions(
        self,
        vocab_score: float,
        syntactic_score: float,
        conceptual_score: float,
        interactivity_score: float,
    ) -> List[str]:
        """Generate simplification suggestions based on scores."""
        suggestions = []

        if vocab_score > 0.6:
            suggestions.append(
                "Consider replacing technical terms with simpler alternatives or providing definitions"
            )
            suggestions.append("Break down complex vocabulary with examples")

        if syntactic_score > 0.6:
            suggestions.append("Break long sentences into shorter ones")
            suggestions.append("Use active voice instead of passive voice")
            suggestions.append("Reduce nested clauses for clearer structure")

        if conceptual_score > 0.6:
            suggestions.append("Introduce concepts one at a time rather than simultaneously")
            suggestions.append("Provide concrete examples for abstract concepts")
            suggestions.append("Add transitional explanations between concepts")

        if interactivity_score > 0.6:
            suggestions.append(
                "Reduce the number of elements that must be held in working memory"
            )
            suggestions.append("Provide intermediate steps or scaffolding")
            suggestions.append("Use visual aids to offload cognitive processing")

        return suggestions
