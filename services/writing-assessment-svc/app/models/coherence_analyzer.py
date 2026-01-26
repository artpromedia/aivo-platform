"""
Coherence Analyzer for discourse coherence and logical flow.

Analyzes:
1. Local coherence - Sentence-to-sentence transitions
2. Global coherence - Paragraph-level organization
3. Topic consistency - Staying on topic
4. Argument flow - Logical progression

Uses sentence-transformers for embeddings-based similarity analysis.
"""

import logging
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class WeakTransition:
    """Represents a weak transition between sentences."""

    sentence_index: int
    before_text: str
    after_text: str
    suggestion: str
    similarity_score: float = 0.0


@dataclass
class LocalCoherence:
    """Local coherence analysis within paragraphs."""

    coherence_score: float
    sentence_similarities: List[float] = field(default_factory=list)
    weak_transitions: List[WeakTransition] = field(default_factory=list)


@dataclass
class GlobalCoherence:
    """Global coherence analysis across paragraphs."""

    structure_score: float
    has_clear_intro: bool
    has_clear_conclusion: bool
    paragraph_topics: List[str] = field(default_factory=list)
    topic_drift_score: float = 0.0


@dataclass
class TransitionAnalysis:
    """Analysis of transitions in the text."""

    total_transitions: int = 0
    transition_types: Dict[str, int] = field(default_factory=dict)
    missing_transition_locations: List[int] = field(default_factory=list)
    suggested_transitions: List[Dict[str, str]] = field(default_factory=list)


@dataclass
class CoherenceResult:
    """Complete coherence analysis result."""

    overall_score: float
    local_coherence: LocalCoherence
    global_coherence: GlobalCoherence
    transition_analysis: TransitionAnalysis
    suggestions: List[str] = field(default_factory=list)


class CoherenceAnalyzer:
    """
    Analyze discourse coherence in writing.

    Measures:
    - Local coherence: Within-paragraph sentence-to-sentence consistency
    - Global coherence: Cross-paragraph flow and structure
    - Transition quality: How well sentences and paragraphs connect
    - Topic consistency: How well the text stays on topic

    Usage:
        analyzer = CoherenceAnalyzer()
        result = analyzer.analyze(text)
        print(f"Overall coherence: {result.overall_score}")
    """

    # Transition word categories
    TRANSITION_TYPES = {
        "additive": [
            "also",
            "furthermore",
            "moreover",
            "in addition",
            "additionally",
            "besides",
            "equally important",
            "further",
            "not only",
        ],
        "adversative": [
            "however",
            "but",
            "although",
            "despite",
            "nevertheless",
            "nonetheless",
            "on the contrary",
            "on the other hand",
            "yet",
            "still",
            "whereas",
            "while",
            "even though",
        ],
        "causal": [
            "because",
            "therefore",
            "thus",
            "consequently",
            "as a result",
            "hence",
            "so",
            "due to",
            "since",
            "accordingly",
            "for this reason",
        ],
        "temporal": [
            "then",
            "next",
            "finally",
            "meanwhile",
            "subsequently",
            "afterward",
            "before",
            "after",
            "during",
            "first",
            "second",
            "third",
            "lastly",
            "initially",
        ],
        "exemplifying": [
            "for example",
            "for instance",
            "such as",
            "specifically",
            "namely",
            "in particular",
            "to illustrate",
        ],
        "summarizing": [
            "in conclusion",
            "in summary",
            "to sum up",
            "overall",
            "in short",
            "to conclude",
            "in brief",
        ],
    }

    # Introduction indicators
    INTRO_INDICATORS = [
        "this essay",
        "i will",
        "i am going to",
        "in this",
        "the purpose of",
        "introduction",
        "this paper",
        "i believe",
        "today",
        "have you ever",
        "imagine",
    ]

    # Conclusion indicators
    CONCLUSION_INDICATORS = [
        "in conclusion",
        "to conclude",
        "in summary",
        "to sum up",
        "finally",
        "therefore",
        "thus",
        "overall",
        "in closing",
        "to summarize",
        "in the end",
    ]

    def __init__(self, model_name: str = "all-MiniLM-L6-v2", device: str = "cpu"):
        """
        Initialize the coherence analyzer.

        Args:
            model_name: Sentence transformer model name
            device: Device to run model on (cpu/cuda)
        """
        self.model_name = model_name
        self.device = device
        self._model = None
        self._model_loaded = False

        logger.info(f"CoherenceAnalyzer initialized with model={model_name}")

    def _lazy_load_model(self) -> None:
        """Lazy load the sentence transformer model."""
        if self._model_loaded:
            return

        try:
            from sentence_transformers import SentenceTransformer

            logger.info(f"Loading sentence transformer: {self.model_name}")
            self._model = SentenceTransformer(self.model_name, device=self.device)
            self._model_loaded = True
            logger.info("Sentence transformer loaded successfully")
        except Exception as e:
            logger.warning(f"Could not load sentence transformer: {e}. Using fallback.")
            self._model_loaded = False

    def analyze(self, text: str) -> CoherenceResult:
        """
        Perform complete coherence analysis.

        Args:
            text: The text to analyze

        Returns:
            CoherenceResult with all coherence metrics
        """
        # Parse text structure
        sentences = self._split_sentences(text)
        paragraphs = self._split_paragraphs(text)

        # Analyze local coherence
        local_coherence = self.analyze_local_coherence(sentences)

        # Analyze global coherence
        global_coherence = self.analyze_global_coherence(paragraphs)

        # Analyze transitions
        transition_analysis = self.analyze_transitions(text, sentences)

        # Calculate overall score
        overall_score = self._calculate_overall_score(
            local_coherence, global_coherence, transition_analysis
        )

        # Generate suggestions
        suggestions = self._generate_suggestions(
            local_coherence, global_coherence, transition_analysis
        )

        return CoherenceResult(
            overall_score=round(overall_score, 2),
            local_coherence=local_coherence,
            global_coherence=global_coherence,
            transition_analysis=transition_analysis,
            suggestions=suggestions,
        )

    def analyze_local_coherence(self, sentences: List[str]) -> LocalCoherence:
        """
        Analyze local coherence between adjacent sentences.

        Uses sentence embeddings to measure semantic similarity
        between consecutive sentences.

        Args:
            sentences: List of sentences

        Returns:
            LocalCoherence with similarity scores and weak transitions
        """
        if len(sentences) < 2:
            return LocalCoherence(
                coherence_score=1.0,
                sentence_similarities=[],
                weak_transitions=[],
            )

        # Get sentence embeddings
        embeddings = self._get_embeddings(sentences)

        # Calculate adjacent sentence similarities
        similarities = []
        for i in range(len(embeddings) - 1):
            sim = self._cosine_similarity(embeddings[i], embeddings[i + 1])
            similarities.append(float(sim))

        # Find weak transitions (low similarity pairs)
        weak_transitions = []
        threshold = 0.3  # Similarity below this is considered weak

        for i, sim in enumerate(similarities):
            if sim < threshold:
                suggestion = self._suggest_transition(
                    sentences[i], sentences[i + 1], i
                )
                weak_transitions.append(
                    WeakTransition(
                        sentence_index=i + 1,
                        before_text=sentences[i][:100] + "..."
                        if len(sentences[i]) > 100
                        else sentences[i],
                        after_text=sentences[i + 1][:100] + "..."
                        if len(sentences[i + 1]) > 100
                        else sentences[i + 1],
                        suggestion=suggestion,
                        similarity_score=sim,
                    )
                )

        # Calculate overall local coherence score
        coherence_score = np.mean(similarities) if similarities else 1.0

        return LocalCoherence(
            coherence_score=round(float(coherence_score), 3),
            sentence_similarities=[round(s, 3) for s in similarities],
            weak_transitions=weak_transitions[:5],  # Limit to top 5
        )

    def analyze_global_coherence(self, paragraphs: List[str]) -> GlobalCoherence:
        """
        Analyze global coherence across paragraphs.

        Checks:
        - Introduction presence
        - Conclusion presence
        - Paragraph topic consistency
        - Topic drift

        Args:
            paragraphs: List of paragraphs

        Returns:
            GlobalCoherence with structure analysis
        """
        if not paragraphs:
            return GlobalCoherence(
                structure_score=0.0,
                has_clear_intro=False,
                has_clear_conclusion=False,
                paragraph_topics=[],
                topic_drift_score=1.0,
            )

        # Check introduction
        has_intro = self._has_introduction(paragraphs)

        # Check conclusion
        has_conclusion = self._has_conclusion(paragraphs)

        # Extract paragraph topics
        topics = self._extract_paragraph_topics(paragraphs)

        # Calculate topic drift
        topic_drift = self._calculate_topic_drift(paragraphs)

        # Calculate structure score
        structure_score = self._calculate_structure_score(
            has_intro, has_conclusion, len(paragraphs), topic_drift
        )

        return GlobalCoherence(
            structure_score=round(structure_score, 2),
            has_clear_intro=has_intro,
            has_clear_conclusion=has_conclusion,
            paragraph_topics=topics,
            topic_drift_score=round(topic_drift, 2),
        )

    def analyze_transitions(
        self, text: str, sentences: Optional[List[str]] = None
    ) -> TransitionAnalysis:
        """
        Analyze transition words and phrases.

        Args:
            text: Full text
            sentences: Pre-split sentences (optional)

        Returns:
            TransitionAnalysis with transition counts and suggestions
        """
        if sentences is None:
            sentences = self._split_sentences(text)

        text_lower = text.lower()

        # Count transitions by type
        transition_counts: Dict[str, int] = {}
        total_transitions = 0

        for trans_type, words in self.TRANSITION_TYPES.items():
            count = sum(text_lower.count(word.lower()) for word in words)
            transition_counts[trans_type] = count
            total_transitions += count

        # Find sentences missing transitions
        missing_locations = self._find_missing_transitions(sentences)

        # Generate transition suggestions
        suggested = []
        for idx in missing_locations[:5]:  # Limit to 5 suggestions
            if idx < len(sentences) - 1:
                suggestion = self._suggest_transition_type(
                    sentences[idx], sentences[idx + 1]
                )
                suggested.append(
                    {
                        "location": f"Between sentence {idx + 1} and {idx + 2}",
                        "suggestion": suggestion,
                    }
                )

        return TransitionAnalysis(
            total_transitions=total_transitions,
            transition_types=transition_counts,
            missing_transition_locations=missing_locations,
            suggested_transitions=suggested,
        )

    def _get_embeddings(self, texts: List[str]) -> np.ndarray:
        """Get sentence embeddings using sentence-transformers or fallback."""
        self._lazy_load_model()

        if self._model is not None:
            return self._model.encode(texts)
        else:
            # Fallback: simple bag-of-words embedding
            return self._fallback_embeddings(texts)

    def _fallback_embeddings(self, texts: List[str]) -> np.ndarray:
        """Simple fallback embeddings using word overlap."""
        # Create vocabulary
        all_words: set = set()
        for text in texts:
            words = set(re.findall(r"\b\w+\b", text.lower()))
            all_words.update(words)

        vocab = sorted(all_words)
        word_to_idx = {w: i for i, w in enumerate(vocab)}

        # Create embeddings
        embeddings = np.zeros((len(texts), len(vocab)))
        for i, text in enumerate(texts):
            words = re.findall(r"\b\w+\b", text.lower())
            for word in words:
                if word in word_to_idx:
                    embeddings[i, word_to_idx[word]] += 1

            # Normalize
            norm = np.linalg.norm(embeddings[i])
            if norm > 0:
                embeddings[i] /= norm

        return embeddings

    def _cosine_similarity(self, vec1: np.ndarray, vec2: np.ndarray) -> float:
        """Calculate cosine similarity between two vectors."""
        dot = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)

        if norm1 == 0 or norm2 == 0:
            return 0.0

        return dot / (norm1 * norm2)

    def _split_sentences(self, text: str) -> List[str]:
        """Split text into sentences."""
        # Handle common abbreviations
        text = re.sub(r"Mr\.", "Mr", text)
        text = re.sub(r"Mrs\.", "Mrs", text)
        text = re.sub(r"Dr\.", "Dr", text)
        text = re.sub(r"etc\.", "etc", text)

        # Split on sentence boundaries
        sentence_pattern = re.compile(r"(?<=[.!?])\s+")
        sentences = sentence_pattern.split(text)

        return [s.strip() for s in sentences if s.strip() and len(s.strip()) > 5]

    def _split_paragraphs(self, text: str) -> List[str]:
        """Split text into paragraphs."""
        # Split on double newlines or multiple newlines
        paragraphs = re.split(r"\n\s*\n", text)
        return [p.strip() for p in paragraphs if p.strip()]

    def _has_introduction(self, paragraphs: List[str]) -> bool:
        """Check if first paragraph is an introduction."""
        if not paragraphs:
            return False

        first_para = paragraphs[0].lower()
        return any(indicator in first_para for indicator in self.INTRO_INDICATORS)

    def _has_conclusion(self, paragraphs: List[str]) -> bool:
        """Check if last paragraph is a conclusion."""
        if not paragraphs:
            return False

        last_para = paragraphs[-1].lower()
        return any(indicator in last_para for indicator in self.CONCLUSION_INDICATORS)

    def _extract_paragraph_topics(self, paragraphs: List[str]) -> List[str]:
        """Extract main topic of each paragraph."""
        topics = []

        for para in paragraphs:
            # Simple topic extraction: first sentence or key nouns
            sentences = self._split_sentences(para)
            if sentences:
                # Use first sentence as topic summary
                first_sent = sentences[0]
                # Truncate if too long
                topic = first_sent[:80] + "..." if len(first_sent) > 80 else first_sent
                topics.append(topic)
            else:
                topics.append("(empty paragraph)")

        return topics

    def _calculate_topic_drift(self, paragraphs: List[str]) -> float:
        """
        Calculate how much the topic drifts across paragraphs.

        Returns score from 0 (high drift) to 1 (consistent topic).
        """
        if len(paragraphs) < 2:
            return 1.0

        # Get paragraph embeddings
        embeddings = self._get_embeddings(paragraphs)

        # Calculate average similarity between all paragraph pairs
        similarities = []
        for i in range(len(embeddings)):
            for j in range(i + 1, len(embeddings)):
                sim = self._cosine_similarity(embeddings[i], embeddings[j])
                similarities.append(sim)

        if not similarities:
            return 1.0

        # Higher average similarity = lower drift
        avg_similarity = np.mean(similarities)
        return float(avg_similarity)

    def _calculate_structure_score(
        self,
        has_intro: bool,
        has_conclusion: bool,
        num_paragraphs: int,
        topic_drift: float,
    ) -> float:
        """Calculate global structure score."""
        score = 0.0

        # Introduction contribution
        if has_intro:
            score += 0.25

        # Conclusion contribution
        if has_conclusion:
            score += 0.25

        # Paragraph count contribution
        if num_paragraphs >= 3:
            score += 0.25
        elif num_paragraphs >= 2:
            score += 0.15

        # Topic consistency contribution (inverted drift)
        score += 0.25 * topic_drift

        return min(score, 1.0)

    def _find_missing_transitions(self, sentences: List[str]) -> List[int]:
        """Find sentence indices where transitions might be needed."""
        missing = []

        for i in range(1, len(sentences)):
            sentence = sentences[i].lower()

            # Check if sentence starts with a transition
            has_transition = any(
                sentence.startswith(word.lower())
                for words in self.TRANSITION_TYPES.values()
                for word in words
            )

            if not has_transition:
                # Check if there's any transition word in the sentence
                has_any_transition = any(
                    word.lower() in sentence
                    for words in self.TRANSITION_TYPES.values()
                    for word in words
                )
                if not has_any_transition:
                    missing.append(i - 1)  # Index of sentence before

        return missing

    def _suggest_transition(
        self, before: str, after: str, index: int
    ) -> str:
        """Suggest a transition between two sentences."""
        # Analyze the relationship between sentences
        after_lower = after.lower()

        # Check for contrast indicators
        contrast_words = ["not", "but", "however", "different", "unlike"]
        if any(word in after_lower for word in contrast_words):
            return "Consider adding a contrast transition like 'However,' or 'On the other hand,'"

        # Check for example indicators
        example_words = ["example", "instance", "such as", "like"]
        if any(word in after_lower for word in example_words):
            return "Consider adding 'For example,' or 'For instance,'"

        # Check for cause/effect
        cause_words = ["because", "result", "cause", "therefore", "lead"]
        if any(word in after_lower for word in cause_words):
            return "Consider adding 'As a result,' or 'Consequently,'"

        # Default suggestion
        return "Consider adding a transition word like 'Additionally,' 'Furthermore,' or 'Moreover,'"

    def _suggest_transition_type(self, before: str, after: str) -> str:
        """Suggest appropriate transition type based on content."""
        after_lower = after.lower()

        if any(word in after_lower for word in ["but", "however", "not", "different"]):
            return "Use a contrast transition: 'However,' 'Nevertheless,' or 'On the other hand,'"
        elif any(word in after_lower for word in ["because", "since", "result"]):
            return "Use a causal transition: 'Therefore,' 'As a result,' or 'Consequently,'"
        elif any(word in after_lower for word in ["then", "next", "after"]):
            return "Use a temporal transition: 'Then,' 'Subsequently,' or 'Afterward,'"
        else:
            return "Use an additive transition: 'Furthermore,' 'Moreover,' or 'Additionally,'"

    def _calculate_overall_score(
        self,
        local: LocalCoherence,
        global_coh: GlobalCoherence,
        transitions: TransitionAnalysis,
    ) -> float:
        """Calculate overall coherence score."""
        # Weighted combination
        local_weight = 0.4
        global_weight = 0.4
        transition_weight = 0.2

        # Normalize transition score
        # More transitions relative to text length is better, up to a point
        transition_score = min(transitions.total_transitions / 10, 1.0)

        overall = (
            local_weight * local.coherence_score
            + global_weight * global_coh.structure_score
            + transition_weight * transition_score
        )

        return overall

    def _generate_suggestions(
        self,
        local: LocalCoherence,
        global_coh: GlobalCoherence,
        transitions: TransitionAnalysis,
    ) -> List[str]:
        """Generate improvement suggestions based on analysis."""
        suggestions = []

        # Local coherence suggestions
        if local.coherence_score < 0.5:
            suggestions.append(
                "Improve sentence-to-sentence flow by ensuring each sentence "
                "connects logically to the previous one."
            )

        if len(local.weak_transitions) > 2:
            suggestions.append(
                "Several sentences have abrupt topic changes. Consider adding "
                "transition phrases to smooth the flow."
            )

        # Global coherence suggestions
        if not global_coh.has_clear_intro:
            suggestions.append(
                "Add a clear introduction that previews your main points."
            )

        if not global_coh.has_clear_conclusion:
            suggestions.append(
                "Add a conclusion that summarizes your key arguments."
            )

        if global_coh.topic_drift_score < 0.4:
            suggestions.append(
                "The paragraphs seem to drift between topics. Ensure each "
                "paragraph supports your main thesis."
            )

        # Transition suggestions
        if transitions.total_transitions < 3:
            suggestions.append(
                "Use more transition words (however, therefore, furthermore) "
                "to guide readers through your argument."
            )

        # Balance suggestion types
        if transitions.transition_types.get("additive", 0) > 5:
            if transitions.transition_types.get("adversative", 0) == 0:
                suggestions.append(
                    "Consider using contrast transitions (however, although) "
                    "to show different perspectives."
                )

        return suggestions[:5]  # Limit to top 5 suggestions
