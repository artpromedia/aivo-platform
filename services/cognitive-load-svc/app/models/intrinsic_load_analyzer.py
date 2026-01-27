"""
Intrinsic Load Analyzer

Analyzes the inherent complexity of educational content based on:
- Element interactivity (how many elements must be processed simultaneously)
- Vocabulary difficulty
- Syntactic complexity
- Conceptual density
"""

import logging
import re
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class ComplexityMetrics:
    """Metrics from complexity analysis."""
    element_interactivity: float  # 0-1: How many elements interact
    vocabulary_load: float  # 0-1: Difficulty of vocabulary
    syntactic_complexity: float  # 0-1: Sentence structure complexity
    conceptual_density: float  # 0-1: Concepts per unit
    overall_complexity: float  # 0-1: Weighted combination
    intrinsic_load_estimate: float  # 0-1: Estimated cognitive load
    complexity_factors: List[str] = field(default_factory=list)
    simplification_suggestions: List[str] = field(default_factory=list)
    grade_level_match: Optional[str] = None
    processing_time_ms: int = 0


@dataclass
class ElementAnalysis:
    """Analysis of interacting elements."""
    elements: List[Dict[str, Any]]
    interaction_count: int
    interaction_patterns: List[str]
    cognitive_operations: List[str]
    interactivity_score: float


@dataclass
class IntrinsicLoadAnalyzerConfig:
    """Configuration for the intrinsic load analyzer."""
    vocabulary_weight: float = 0.25
    syntactic_weight: float = 0.25
    conceptual_weight: float = 0.30
    interactivity_weight: float = 0.20

    # Vocabulary thresholds
    easy_word_syllables: int = 2
    difficult_word_syllables: int = 4
    academic_word_bonus: float = 0.1

    # Syntactic thresholds
    simple_sentence_words: int = 10
    complex_sentence_words: int = 25
    max_clause_depth: int = 3

    # Conceptual density thresholds
    high_density_concepts_per_sentence: float = 3.0
    low_density_concepts_per_sentence: float = 1.0

    # Element interactivity
    max_interacting_elements: int = 7  # Miller's number


# Common academic vocabulary (sample list)
ACADEMIC_VOCABULARY = {
    "analyze", "approach", "area", "assess", "assume", "authority",
    "available", "benefit", "concept", "consist", "constitute", "context",
    "contract", "create", "data", "define", "derive", "distribute",
    "economy", "environment", "establish", "estimate", "evident", "export",
    "factor", "finance", "formula", "function", "identify", "income",
    "indicate", "individual", "interpret", "involve", "issue", "labor",
    "legal", "legislate", "major", "method", "occur", "percent",
    "period", "policy", "principle", "proceed", "process", "require",
    "research", "respond", "role", "section", "sector", "significant",
    "similar", "source", "specific", "structure", "theory", "variable",
}

# Domain-specific terminology patterns
DOMAIN_PATTERNS = {
    "math": [
        r"\b(equation|variable|coefficient|polynomial|derivative|integral|function|theorem|proof)\b",
        r"\b(matrix|vector|scalar|linear|quadratic|exponential|logarithm)\b",
        r"\b(sum|product|quotient|difference|ratio|proportion)\b",
    ],
    "science": [
        r"\b(hypothesis|experiment|control|variable|observation|conclusion)\b",
        r"\b(molecule|atom|electron|proton|neutron|nucleus)\b",
        r"\b(cell|organism|ecosystem|evolution|species|gene)\b",
        r"\b(force|energy|mass|velocity|acceleration|momentum)\b",
    ],
    "reading": [
        r"\b(theme|plot|character|setting|conflict|resolution)\b",
        r"\b(metaphor|simile|alliteration|personification|imagery)\b",
        r"\b(protagonist|antagonist|narrator|perspective|tone)\b",
    ],
    "writing": [
        r"\b(thesis|argument|evidence|transition|conclusion)\b",
        r"\b(paragraph|introduction|body|claim|counterargument)\b",
    ],
}


class IntrinsicLoadAnalyzer:
    """
    Analyzes intrinsic cognitive load of educational content.

    Intrinsic load is determined by the inherent complexity of the material
    and cannot be reduced without changing the learning objectives.

    Key factors:
    - Element interactivity: How many elements must be held in working memory
    - Vocabulary difficulty: Complexity of words used
    - Syntactic complexity: Sentence structure complexity
    - Conceptual density: Number of concepts per unit of content

    Usage:
        analyzer = IntrinsicLoadAnalyzer()
        metrics = analyzer.analyze("The mitochondria is the powerhouse of the cell.")
        print(f"Intrinsic load: {metrics.intrinsic_load_estimate}")
    """

    def __init__(self, config: Optional[IntrinsicLoadAnalyzerConfig] = None):
        self.config = config or IntrinsicLoadAnalyzerConfig()
        self._nlp = None  # Lazy load spaCy
        logger.info("IntrinsicLoadAnalyzer initialized")

    def _get_nlp(self):
        """Lazy load spaCy model."""
        if self._nlp is None:
            try:
                import spacy
                self._nlp = spacy.load("en_core_web_sm")
            except Exception as e:
                logger.warning(f"Could not load spaCy model: {e}")
                self._nlp = None
        return self._nlp

    def analyze(
        self,
        content: str,
        content_type: str = "text",
        domain: Optional[str] = None,
        grade_level: Optional[int] = None,
        prior_knowledge: Optional[List[str]] = None,
    ) -> ComplexityMetrics:
        """
        Analyze content complexity.

        Args:
            content: The text content to analyze
            content_type: Type of content (text, problem, etc.)
            domain: Educational domain for context
            grade_level: Target grade level (1-12)
            prior_knowledge: Concepts assumed as prior knowledge

        Returns:
            ComplexityMetrics with detailed analysis
        """
        start_time = time.time()

        if not content or not content.strip():
            return ComplexityMetrics(
                element_interactivity=0.0,
                vocabulary_load=0.0,
                syntactic_complexity=0.0,
                conceptual_density=0.0,
                overall_complexity=0.0,
                intrinsic_load_estimate=0.0,
                processing_time_ms=0,
            )

        # Analyze each dimension
        vocab_score, vocab_factors = self._analyze_vocabulary(content, domain)
        syntactic_score, syntactic_factors = self._analyze_syntax(content)
        conceptual_score, concept_factors = self._analyze_conceptual_density(
            content, domain, prior_knowledge
        )
        interactivity_score, interactivity_factors = self._analyze_element_interactivity(
            content, domain
        )

        # Calculate overall complexity
        overall = (
            self.config.vocabulary_weight * vocab_score +
            self.config.syntactic_weight * syntactic_score +
            self.config.conceptual_weight * conceptual_score +
            self.config.interactivity_weight * interactivity_score
        )

        # Intrinsic load has a non-linear relationship with complexity
        intrinsic_load = self._complexity_to_load(overall, interactivity_score)

        # Collect all factors
        complexity_factors = vocab_factors + syntactic_factors + concept_factors + interactivity_factors

        # Generate simplification suggestions
        suggestions = self._generate_simplification_suggestions(
            vocab_score, syntactic_score, conceptual_score, interactivity_score
        )

        # Check grade level appropriateness
        grade_match = None
        if grade_level is not None:
            grade_match = self._assess_grade_level_match(overall, grade_level)

        processing_time = int((time.time() - start_time) * 1000)

        return ComplexityMetrics(
            element_interactivity=interactivity_score,
            vocabulary_load=vocab_score,
            syntactic_complexity=syntactic_score,
            conceptual_density=conceptual_score,
            overall_complexity=overall,
            intrinsic_load_estimate=intrinsic_load,
            complexity_factors=complexity_factors,
            simplification_suggestions=suggestions,
            grade_level_match=grade_match,
            processing_time_ms=processing_time,
        )

    def analyze_element_interactivity(
        self,
        content: str,
        domain: Optional[str] = None,
        identify_elements: bool = True,
    ) -> ElementAnalysis:
        """
        Analyze element interactivity in detail.

        Element interactivity refers to the number of information elements
        that must be processed simultaneously in working memory.

        Args:
            content: Content to analyze
            domain: Educational domain
            identify_elements: Whether to identify individual elements

        Returns:
            ElementAnalysis with detailed breakdown
        """
        elements = []
        interaction_patterns = []
        cognitive_operations = []

        nlp = self._get_nlp()

        if nlp:
            doc = nlp(content)

            # Extract key elements (nouns, verbs representing concepts)
            concepts = set()
            for token in doc:
                if token.pos_ in ("NOUN", "PROPN") and not token.is_stop:
                    concepts.add(token.lemma_.lower())

            # Extract relationships between concepts
            for sent in doc.sents:
                sent_concepts = []
                for token in sent:
                    if token.lemma_.lower() in concepts:
                        sent_concepts.append({
                            "text": token.text,
                            "lemma": token.lemma_,
                            "pos": token.pos_,
                            "dep": token.dep_,
                        })

                if len(sent_concepts) > 1:
                    interaction_patterns.append(
                        f"Multiple concepts in sentence: {', '.join(c['text'] for c in sent_concepts)}"
                    )

                if identify_elements:
                    elements.extend(sent_concepts)
        else:
            # Fallback: simple word-based analysis
            words = re.findall(r'\b\w+\b', content.lower())
            concepts = set(w for w in words if len(w) > 3 and w.isalpha())
            elements = [{"text": w, "type": "word"} for w in list(concepts)[:20]]

        # Identify cognitive operations required
        cognitive_operations = self._identify_cognitive_operations(content, domain)

        # Calculate interactivity score
        n_elements = len(set(e.get("lemma", e.get("text", "")) for e in elements))
        n_interactions = len(interaction_patterns)

        # Score based on element count relative to WM capacity
        max_elements = self.config.max_interacting_elements
        interactivity_score = min(1.0, (n_elements + n_interactions) / (2 * max_elements))

        return ElementAnalysis(
            elements=elements if identify_elements else [],
            interaction_count=n_interactions,
            interaction_patterns=interaction_patterns,
            cognitive_operations=cognitive_operations,
            interactivity_score=interactivity_score,
        )

    def compare_alternatives(
        self,
        contents: List[str],
        domain: Optional[str] = None,
    ) -> List[ComplexityMetrics]:
        """
        Compare complexity of alternative content versions.

        Useful for selecting the least complex version of content
        that still covers the learning objectives.

        Args:
            contents: List of content alternatives
            domain: Educational domain

        Returns:
            List of ComplexityMetrics, sorted by complexity
        """
        results = []
        for content in contents:
            metrics = self.analyze(content, domain=domain)
            results.append(metrics)

        # Sort by overall complexity
        results.sort(key=lambda m: m.overall_complexity)
        return results

    def estimate_load_for_sequence(
        self,
        content_sequence: List[str],
        domain: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Estimate cumulative intrinsic load for a content sequence.

        Args:
            content_sequence: List of content items in order
            domain: Educational domain

        Returns:
            Dictionary with sequence analysis
        """
        individual_loads = []
        cumulative_concepts = set()

        for content in content_sequence:
            metrics = self.analyze(content, domain=domain)
            individual_loads.append(metrics.intrinsic_load_estimate)

            # Track concept accumulation (simplified)
            words = re.findall(r'\b\w+\b', content.lower())
            cumulative_concepts.update(w for w in words if len(w) > 4)

        return {
            "individual_loads": individual_loads,
            "average_load": np.mean(individual_loads) if individual_loads else 0.0,
            "max_load": max(individual_loads) if individual_loads else 0.0,
            "load_variance": np.var(individual_loads) if individual_loads else 0.0,
            "total_unique_concepts": len(cumulative_concepts),
            "recommended_breaks": self._recommend_break_points(individual_loads),
        }

    def _analyze_vocabulary(
        self,
        content: str,
        domain: Optional[str] = None,
    ) -> Tuple[float, List[str]]:
        """Analyze vocabulary difficulty."""
        factors = []

        # Tokenize
        words = re.findall(r'\b\w+\b', content.lower())
        if not words:
            return 0.0, []

        # Calculate average word length (proxy for complexity)
        avg_length = np.mean([len(w) for w in words])
        length_score = min(1.0, (avg_length - 3) / 7)  # Normalize to 0-1

        # Count syllables (approximation)
        def count_syllables(word):
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

        # Difficult words (3+ syllables)
        difficult_words = [w for w, s in zip(words, syllable_counts)
                         if s >= self.config.difficult_word_syllables]
        difficult_ratio = len(difficult_words) / len(words)

        if difficult_ratio > 0.2:
            factors.append(f"High proportion of difficult words ({difficult_ratio:.1%})")

        # Academic vocabulary
        academic_count = sum(1 for w in words if w in ACADEMIC_VOCABULARY)
        academic_ratio = academic_count / len(words)

        if academic_ratio > 0.1:
            factors.append(f"Contains academic vocabulary ({academic_count} words)")

        # Domain-specific terms
        domain_term_count = 0
        if domain and domain in DOMAIN_PATTERNS:
            for pattern in DOMAIN_PATTERNS[domain]:
                matches = re.findall(pattern, content, re.IGNORECASE)
                domain_term_count += len(matches)

            if domain_term_count > 0:
                factors.append(f"Contains {domain_term_count} domain-specific terms")

        # Combine factors
        syllable_score = min(1.0, (avg_syllables - 1) / 3)
        academic_score = min(1.0, academic_ratio * 5)
        domain_score = min(1.0, domain_term_count / 10)

        vocab_score = (
            0.3 * length_score +
            0.3 * syllable_score +
            0.2 * difficult_ratio +
            0.1 * academic_score +
            0.1 * domain_score
        )

        return min(1.0, vocab_score), factors

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

        # Count complex structures
        complex_indicators = 0

        # Subordinate clauses
        subordinators = ["because", "although", "while", "when", "if", "unless",
                        "since", "after", "before", "until", "whereas", "whether"]
        for sent in sentences:
            sent_lower = sent.lower()
            for sub in subordinators:
                if f" {sub} " in f" {sent_lower} ":
                    complex_indicators += 1

        # Relative clauses
        relatives = ["which", "who", "whom", "whose", "that", "where"]
        for sent in sentences:
            sent_lower = sent.lower()
            for rel in relatives:
                if f", {rel} " in f" {sent_lower} " or f" {rel}, " in f" {sent_lower} ":
                    complex_indicators += 1

        # Passive voice (simplified detection)
        passive_patterns = [r'\b(was|were|been|being)\s+\w+ed\b', r'\bby\s+the\b']
        passive_count = 0
        for pattern in passive_patterns:
            passive_count += len(re.findall(pattern, content, re.IGNORECASE))

        if passive_count > 2:
            factors.append(f"Multiple passive constructions ({passive_count})")

        # Complex punctuation
        semicolons = content.count(";")
        colons = content.count(":")
        em_dashes = content.count("—") + content.count("--")

        if semicolons + colons + em_dashes > 3:
            factors.append("Complex punctuation usage")

        # Calculate score
        length_score = min(1.0, (avg_length - self.config.simple_sentence_words) /
                          (self.config.complex_sentence_words - self.config.simple_sentence_words))
        length_score = max(0.0, length_score)

        clause_score = min(1.0, complex_indicators / (len(sentences) * 2))
        passive_score = min(1.0, passive_count / (len(sentences) * 0.5))
        punct_score = min(1.0, (semicolons + colons + em_dashes) / (len(sentences) * 2))

        syntactic_score = (
            0.4 * length_score +
            0.3 * clause_score +
            0.2 * passive_score +
            0.1 * punct_score
        )

        return min(1.0, syntactic_score), factors

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

        nlp = self._get_nlp()

        if nlp:
            doc = nlp(content)

            # Extract noun phrases and named entities as concepts
            concepts = set()
            for chunk in doc.noun_chunks:
                concept = chunk.root.lemma_.lower()
                if len(concept) > 2 and concept not in prior_set:
                    concepts.add(concept)

            for ent in doc.ents:
                if ent.label_ in ("PERSON", "ORG", "GPE", "EVENT", "WORK_OF_ART"):
                    concept = ent.text.lower()
                    if concept not in prior_set:
                        concepts.add(concept)

            concept_count = len(concepts)
        else:
            # Fallback: identify potential concepts by capitalization and frequency
            words = re.findall(r'\b[A-Z][a-z]+\b|\b\w{6,}\b', content)
            concepts = set(w.lower() for w in words if w.lower() not in prior_set)
            concept_count = len(concepts)

        # Calculate density
        concepts_per_sentence = concept_count / len(sentences) if sentences else 0

        if concepts_per_sentence > self.config.high_density_concepts_per_sentence:
            factors.append(f"High concept density ({concepts_per_sentence:.1f} per sentence)")

        # Check for abstract concepts (simplified)
        abstract_indicators = ["theory", "concept", "principle", "framework",
                             "model", "system", "process", "relationship"]
        abstract_count = sum(1 for ind in abstract_indicators
                           if ind in content.lower())

        if abstract_count > 2:
            factors.append(f"Multiple abstract concepts ({abstract_count})")

        # New concept introduction rate
        word_count = len(content.split())
        concept_rate = concept_count / max(1, word_count / 100)  # per 100 words

        # Calculate score
        density_score = min(1.0, concepts_per_sentence / self.config.high_density_concepts_per_sentence)
        abstract_score = min(1.0, abstract_count / 5)
        rate_score = min(1.0, concept_rate / 10)

        conceptual_score = (
            0.5 * density_score +
            0.3 * abstract_score +
            0.2 * rate_score
        )

        return min(1.0, conceptual_score), factors

    def _analyze_element_interactivity(
        self,
        content: str,
        domain: Optional[str] = None,
    ) -> Tuple[float, List[str]]:
        """Analyze element interactivity."""
        analysis = self.analyze_element_interactivity(content, domain, identify_elements=False)

        factors = []
        if analysis.interaction_count > 3:
            factors.append(f"High element interactions ({analysis.interaction_count})")

        if len(analysis.cognitive_operations) > 2:
            factors.append(f"Multiple cognitive operations required: {', '.join(analysis.cognitive_operations[:3])}")

        return analysis.interactivity_score, factors

    def _identify_cognitive_operations(
        self,
        content: str,
        domain: Optional[str] = None,
    ) -> List[str]:
        """Identify cognitive operations required to process content."""
        operations = []
        content_lower = content.lower()

        # Compare/contrast
        if any(w in content_lower for w in ["compare", "contrast", "similar", "different", "whereas"]):
            operations.append("comparison")

        # Cause/effect
        if any(w in content_lower for w in ["because", "therefore", "cause", "effect", "result", "consequently"]):
            operations.append("causal reasoning")

        # Sequence/order
        if any(w in content_lower for w in ["first", "then", "next", "finally", "step", "sequence"]):
            operations.append("sequencing")

        # Classification
        if any(w in content_lower for w in ["type", "category", "classify", "group", "kind"]):
            operations.append("classification")

        # Mathematical operations
        if domain == "math" or any(c in content for c in ["+", "-", "*", "/", "=", "×", "÷"]):
            if any(w in content_lower for w in ["solve", "calculate", "compute", "find"]):
                operations.append("calculation")

        # Analysis
        if any(w in content_lower for w in ["analyze", "examine", "investigate", "evaluate"]):
            operations.append("analysis")

        # Synthesis
        if any(w in content_lower for w in ["combine", "integrate", "synthesize", "create"]):
            operations.append("synthesis")

        # Inference
        if any(w in content_lower for w in ["infer", "conclude", "deduce", "imply"]):
            operations.append("inference")

        return operations

    def _complexity_to_load(
        self,
        complexity: float,
        interactivity: float,
    ) -> float:
        """
        Convert complexity to cognitive load estimate.

        Uses a non-linear relationship where load increases more rapidly
        at higher complexity levels (reflecting WM limitations).
        """
        # Exponential relationship with interactivity as amplifier
        base_load = complexity ** 1.5
        interactivity_amplifier = 1 + (interactivity * 0.5)
        load = base_load * interactivity_amplifier

        return min(1.0, load)

    def _generate_simplification_suggestions(
        self,
        vocab_score: float,
        syntactic_score: float,
        conceptual_score: float,
        interactivity_score: float,
    ) -> List[str]:
        """Generate suggestions for reducing complexity."""
        suggestions = []

        if vocab_score > 0.7:
            suggestions.append("Consider replacing technical terms with simpler alternatives or providing definitions")
            suggestions.append("Break down complex vocabulary with examples")

        if syntactic_score > 0.7:
            suggestions.append("Break long sentences into shorter ones")
            suggestions.append("Use active voice instead of passive voice")
            suggestions.append("Reduce nested clauses")

        if conceptual_score > 0.7:
            suggestions.append("Introduce concepts one at a time rather than simultaneously")
            suggestions.append("Provide concrete examples for abstract concepts")
            suggestions.append("Add connecting explanations between concepts")

        if interactivity_score > 0.7:
            suggestions.append("Reduce the number of elements that must be held in working memory")
            suggestions.append("Provide intermediate steps or scaffolding")
            suggestions.append("Use visual aids to offload some cognitive processing")

        return suggestions

    def _assess_grade_level_match(
        self,
        complexity: float,
        target_grade: int,
    ) -> str:
        """Assess whether complexity matches target grade level."""
        # Simplified grade-complexity mapping
        expected_complexity = (target_grade - 1) / 11  # Linear mapping

        diff = complexity - expected_complexity

        if abs(diff) <= 0.1:
            return f"Appropriate for grade {target_grade}"
        elif diff > 0.2:
            return f"Too complex for grade {target_grade}; better suited for grade {min(12, target_grade + int(diff * 6))}"
        elif diff < -0.2:
            return f"Too simple for grade {target_grade}; better suited for grade {max(1, target_grade + int(diff * 6))}"
        elif diff > 0:
            return f"Slightly challenging for grade {target_grade}"
        else:
            return f"Slightly easy for grade {target_grade}"

    def _recommend_break_points(
        self,
        loads: List[float],
        threshold: float = 0.7,
    ) -> List[int]:
        """Recommend break points in a content sequence."""
        break_points = []
        cumulative = 0.0

        for i, load in enumerate(loads):
            cumulative += load * 0.7  # Partial decay
            if cumulative > threshold:
                break_points.append(i)
                cumulative = 0.0

        return break_points
