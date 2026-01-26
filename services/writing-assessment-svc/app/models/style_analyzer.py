"""
Style Analyzer for writing style characteristics.

Analyzes:
1. Sentence variety (lengths, structures)
2. Vocabulary sophistication (AWL, academic words)
3. Voice consistency (active vs passive ratio)
4. Tone analysis (formal, informal, persuasive)
5. Word repetition / variety
"""

import logging
import re
from collections import Counter
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set, Tuple

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class SentenceStats:
    """Sentence length statistics."""

    mean: float = 0.0
    std: float = 0.0
    min: int = 0
    max: int = 0


@dataclass
class VocabularyLevel:
    """Vocabulary sophistication analysis."""

    average_word_length: float = 0.0
    awl_coverage: float = 0.0  # Academic Word List coverage
    rare_word_percentage: float = 0.0
    grade_level_estimate: int = 5


@dataclass
class OverusedWord:
    """Information about an overused word."""

    word: str
    count: int
    percentage: float
    suggestions: List[str] = field(default_factory=list)


@dataclass
class StyleReport:
    """Complete style analysis report."""

    sentence_length_stats: SentenceStats
    sentence_type_distribution: Dict[str, float] = field(default_factory=dict)
    vocabulary_level: VocabularyLevel = field(default_factory=VocabularyLevel)
    voice_ratio: float = 0.0  # active sentences / total
    tone: str = "neutral"
    word_variety_score: float = 0.0  # type-token ratio
    overused_words: List[OverusedWord] = field(default_factory=list)
    sophisticated_words_used: List[str] = field(default_factory=list)


class StyleAnalyzer:
    """
    Analyze writing style characteristics.

    Measures:
    - Sentence structure variety (simple, compound, complex)
    - Vocabulary richness and sophistication
    - Voice (active vs passive)
    - Tone (formal, informal, academic, conversational)
    - Word variety and repetition

    Usage:
        analyzer = StyleAnalyzer()
        report = analyzer.analyze_style(text)
        print(f"Tone: {report.tone}")
        print(f"Vocabulary diversity: {report.word_variety_score}")
    """

    # Academic Word List (AWL) - subset of common academic words
    # Full list has 570 word families; this is a representative sample
    ACADEMIC_WORDS: Set[str] = {
        "analyze", "analysis", "approach", "area", "assess", "assume",
        "authority", "available", "benefit", "concept", "consistent",
        "constitutional", "context", "contract", "create", "data",
        "define", "derive", "distribute", "economy", "environment",
        "establish", "estimate", "evident", "export", "factor",
        "finance", "formula", "function", "identify", "income",
        "indicate", "individual", "interpret", "involve", "issue",
        "labor", "legal", "legislate", "major", "method", "occur",
        "percent", "period", "policy", "principle", "proceed",
        "process", "require", "research", "respond", "role",
        "section", "sector", "significant", "similar", "source",
        "specific", "structure", "theory", "vary", "achieve",
        "acquire", "administrate", "affect", "appropriate", "aspect",
        "assist", "category", "chapter", "commission", "community",
        "complex", "compute", "conclude", "conduct", "consequent",
        "construct", "consume", "contribute", "core", "corporate",
        "correspond", "criteria", "cultural", "demonstrate", "design",
        "distinct", "element", "emerge", "emphasis", "ensure",
        "entity", "equivalent", "evaluate", "evolve", "exclude",
        "expand", "expert", "explicit", "focus", "framework",
        "fundamental", "generate", "hypothesis", "illustrate", "impact",
        "implement", "implicate", "imply", "impose", "initial",
        "instance", "institute", "integrate", "internal", "investigate",
        "journal", "justify", "layer", "maintain", "mature",
        "maximum", "mechanism", "minor", "modify", "monitor",
        "negative", "notion", "objective", "obtain", "obvious",
        "option", "outcome", "output", "overall", "parallel",
        "parameter", "participate", "perceive", "perspective", "phase",
        "phenomenon", "philosophy", "physical", "plus", "positive",
        "potential", "practitioner", "predominant", "previous", "primary",
        "prior", "professional", "project", "promote", "proportion",
        "publish", "pursue", "range", "recover", "refine",
        "regime", "region", "regulate", "relevant", "rely",
        "remove", "resource", "restrict", "retain", "revenue",
        "reverse", "rigid", "schedule", "scheme", "scope",
        "seek", "select", "sequence", "series", "shift",
        "simulate", "sole", "somewhat", "strategy", "stress",
        "submit", "subsequent", "summary", "supplement", "survey",
        "sustain", "symbol", "target", "technique", "technology",
        "thesis", "topic", "trace", "tradition", "transfer",
        "transform", "transition", "transport", "trend", "ultimate",
        "undergo", "utilize", "valid", "variable", "vehicle",
        "version", "virtual", "vision", "visible", "volume",
    }

    # Common words that don't indicate sophistication
    COMMON_WORDS: Set[str] = {
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to",
        "for", "of", "with", "by", "from", "as", "is", "was", "are",
        "were", "been", "be", "have", "has", "had", "do", "does", "did",
        "will", "would", "could", "should", "may", "might", "must", "can",
        "this", "that", "these", "those", "it", "its", "they", "them",
        "their", "he", "she", "him", "her", "his", "hers", "we", "us",
        "our", "you", "your", "i", "me", "my", "who", "what", "which",
        "when", "where", "why", "how", "all", "each", "every", "both",
        "few", "more", "most", "other", "some", "such", "no", "not",
        "only", "same", "so", "than", "too", "very", "just", "also",
        "about", "after", "again", "before", "between", "into", "over",
        "under", "through", "during", "without", "within", "along",
        "because", "if", "then", "else", "while", "although", "though",
        "since", "until", "unless", "whether", "however", "therefore",
        "said", "says", "say", "get", "got", "make", "made", "go",
        "went", "gone", "come", "came", "take", "took", "see", "saw",
        "know", "knew", "think", "thought", "want", "need", "use",
        "find", "give", "tell", "call", "try", "leave", "put",
    }

    # Word synonyms for overused word suggestions
    SYNONYMS: Dict[str, List[str]] = {
        "good": ["excellent", "outstanding", "effective", "beneficial", "favorable"],
        "bad": ["poor", "inadequate", "detrimental", "unfavorable", "problematic"],
        "big": ["large", "substantial", "significant", "considerable", "extensive"],
        "small": ["minor", "limited", "modest", "minimal", "slight"],
        "important": ["significant", "crucial", "essential", "vital", "critical"],
        "interesting": ["compelling", "engaging", "intriguing", "fascinating", "notable"],
        "very": ["highly", "extremely", "remarkably", "considerably", "particularly"],
        "really": ["truly", "genuinely", "certainly", "indeed", "actually"],
        "thing": ["aspect", "element", "factor", "component", "feature"],
        "things": ["aspects", "elements", "factors", "components", "features"],
        "get": ["obtain", "acquire", "receive", "achieve", "gain"],
        "got": ["obtained", "acquired", "received", "achieved", "gained"],
        "make": ["create", "produce", "develop", "establish", "generate"],
        "show": ["demonstrate", "illustrate", "reveal", "indicate", "display"],
        "said": ["stated", "mentioned", "noted", "remarked", "explained"],
        "think": ["believe", "consider", "maintain", "argue", "suggest"],
        "use": ["utilize", "employ", "apply", "implement", "adopt"],
    }

    # Formal language indicators
    FORMAL_INDICATORS = [
        "furthermore", "moreover", "consequently", "therefore", "thus",
        "hence", "whereas", "nevertheless", "notwithstanding", "hereby",
        "accordingly", "henceforth", "pursuant", "whereby", "therein",
    ]

    # Informal language indicators
    INFORMAL_INDICATORS = [
        "gonna", "wanna", "gotta", "kinda", "sorta", "yeah", "yep",
        "nope", "ok", "okay", "hey", "wow", "cool", "awesome",
        "stuff", "things", "lots", "tons", "guy", "guys", "kids",
    ]

    # Passive voice patterns
    PASSIVE_PATTERNS = [
        r"\b(is|are|was|were|be|been|being)\s+\w+ed\b",
        r"\b(is|are|was|were|be|been|being)\s+\w+en\b",
    ]

    def __init__(self):
        """Initialize the style analyzer."""
        logger.info("StyleAnalyzer initialized")

    def analyze_style(self, text: str) -> StyleReport:
        """
        Perform complete style analysis.

        Args:
            text: Text to analyze

        Returns:
            StyleReport with all style metrics
        """
        # Parse text
        sentences = self._split_sentences(text)
        words = self._tokenize_words(text)

        # Analyze sentence structure
        sentence_stats = self._compute_sentence_stats(sentences)
        sentence_types = self._analyze_sentence_types(sentences)

        # Analyze vocabulary
        vocabulary_level = self._analyze_vocabulary(words)
        word_variety = self._compute_word_variety(words)
        overused = self._find_overused_words(words)
        sophisticated = self._find_sophisticated_words(words)

        # Analyze voice
        voice_ratio = self._compute_voice_ratio(text, sentences)

        # Analyze tone
        tone = self._detect_tone(text, words)

        return StyleReport(
            sentence_length_stats=sentence_stats,
            sentence_type_distribution=sentence_types,
            vocabulary_level=vocabulary_level,
            voice_ratio=round(voice_ratio, 2),
            tone=tone,
            word_variety_score=round(word_variety, 3),
            overused_words=overused,
            sophisticated_words_used=sophisticated,
        )

    def _split_sentences(self, text: str) -> List[str]:
        """Split text into sentences."""
        # Handle common abbreviations
        text = re.sub(r"Mr\.", "Mr", text)
        text = re.sub(r"Mrs\.", "Mrs", text)
        text = re.sub(r"Dr\.", "Dr", text)
        text = re.sub(r"etc\.", "etc", text)
        text = re.sub(r"e\.g\.", "eg", text)
        text = re.sub(r"i\.e\.", "ie", text)

        # Split on sentence boundaries
        sentence_pattern = re.compile(r"(?<=[.!?])\s+")
        sentences = sentence_pattern.split(text)

        return [s.strip() for s in sentences if s.strip() and len(s.strip()) > 2]

    def _tokenize_words(self, text: str) -> List[str]:
        """Tokenize text into words."""
        word_pattern = re.compile(r"\b[a-zA-Z]+(?:'[a-zA-Z]+)?\b")
        return word_pattern.findall(text.lower())

    def _compute_sentence_stats(self, sentences: List[str]) -> SentenceStats:
        """Compute sentence length statistics."""
        if not sentences:
            return SentenceStats()

        lengths = [len(self._tokenize_words(s)) for s in sentences]

        if not lengths:
            return SentenceStats()

        return SentenceStats(
            mean=round(float(np.mean(lengths)), 1),
            std=round(float(np.std(lengths)), 1),
            min=int(min(lengths)),
            max=int(max(lengths)),
        )

    def _analyze_sentence_types(self, sentences: List[str]) -> Dict[str, float]:
        """Analyze distribution of sentence types."""
        if not sentences:
            return {"simple": 0.0, "compound": 0.0, "complex": 0.0}

        simple = 0
        compound = 0
        complex_sent = 0

        # Coordinating conjunctions (compound)
        coord_conj = {"and", "but", "or", "nor", "for", "yet", "so"}

        # Subordinating conjunctions (complex)
        subord_conj = {
            "although", "because", "since", "unless", "while", "whereas",
            "when", "whenever", "where", "wherever", "if", "whether",
            "after", "before", "until", "as", "though", "even",
        }

        for sentence in sentences:
            words = set(self._tokenize_words(sentence))

            has_coord = bool(words & coord_conj)
            has_subord = bool(words & subord_conj)

            # Count clauses (simplified: count verbs)
            comma_count = sentence.count(",")

            if has_subord or comma_count >= 2:
                complex_sent += 1
            elif has_coord and comma_count >= 1:
                compound += 1
            else:
                simple += 1

        total = len(sentences)
        return {
            "simple": round(simple / total, 2),
            "compound": round(compound / total, 2),
            "complex": round(complex_sent / total, 2),
        }

    def _analyze_vocabulary(self, words: List[str]) -> VocabularyLevel:
        """Analyze vocabulary sophistication."""
        if not words:
            return VocabularyLevel()

        # Filter out common words for analysis
        content_words = [w for w in words if w.lower() not in self.COMMON_WORDS]

        # Average word length
        avg_length = np.mean([len(w) for w in words]) if words else 0

        # AWL coverage
        academic_count = sum(1 for w in words if w.lower() in self.ACADEMIC_WORDS)
        awl_coverage = academic_count / len(words) if words else 0

        # Rare word percentage (words > 8 characters and not common)
        rare_words = [
            w for w in words
            if len(w) > 8 and w.lower() not in self.COMMON_WORDS
        ]
        rare_percentage = len(rare_words) / len(words) if words else 0

        # Estimate grade level from vocabulary
        grade_level = self._estimate_vocab_grade(avg_length, awl_coverage, rare_percentage)

        return VocabularyLevel(
            average_word_length=round(float(avg_length), 2),
            awl_coverage=round(float(awl_coverage), 3),
            rare_word_percentage=round(float(rare_percentage), 3),
            grade_level_estimate=grade_level,
        )

    def _estimate_vocab_grade(
        self, avg_length: float, awl_coverage: float, rare_pct: float
    ) -> int:
        """Estimate grade level from vocabulary metrics."""
        # Simple heuristic based on vocabulary complexity
        score = 0

        # Average word length contribution
        if avg_length >= 6:
            score += 4
        elif avg_length >= 5:
            score += 2
        elif avg_length >= 4:
            score += 1

        # Academic word coverage contribution
        if awl_coverage >= 0.05:
            score += 4
        elif awl_coverage >= 0.02:
            score += 2
        elif awl_coverage >= 0.01:
            score += 1

        # Rare word contribution
        if rare_pct >= 0.1:
            score += 4
        elif rare_pct >= 0.05:
            score += 2
        elif rare_pct >= 0.02:
            score += 1

        # Map score to grade level (3-16)
        return min(max(score + 3, 3), 16)

    def _compute_word_variety(self, words: List[str]) -> float:
        """Compute type-token ratio (word variety)."""
        if not words:
            return 0.0

        # Filter to content words only
        content_words = [w.lower() for w in words if w.lower() not in self.COMMON_WORDS]

        if len(content_words) < 10:
            # Not enough words for meaningful TTR
            return len(set(words)) / len(words) if words else 0.0

        # Use moving average TTR for more stable measure
        unique = len(set(content_words))
        total = len(content_words)

        return unique / total

    def _find_overused_words(self, words: List[str]) -> List[OverusedWord]:
        """Find words that are overused."""
        if not words:
            return []

        # Count word frequencies
        word_counts = Counter(w.lower() for w in words)
        total_words = len(words)

        overused = []

        for word, count in word_counts.most_common(20):
            # Skip common function words
            if word in self.COMMON_WORDS:
                continue

            percentage = count / total_words

            # Consider overused if appears more than 2% of the time
            if count >= 3 and percentage > 0.02:
                suggestions = self.SYNONYMS.get(word, [])
                overused.append(
                    OverusedWord(
                        word=word,
                        count=count,
                        percentage=round(percentage * 100, 1),
                        suggestions=suggestions[:5],
                    )
                )

        return overused[:10]  # Limit to top 10

    def _find_sophisticated_words(self, words: List[str]) -> List[str]:
        """Find sophisticated vocabulary used in the text."""
        sophisticated = set()

        for word in words:
            word_lower = word.lower()

            # Academic words
            if word_lower in self.ACADEMIC_WORDS:
                sophisticated.add(word_lower)

            # Long words (likely sophisticated)
            elif len(word) >= 10 and word_lower not in self.COMMON_WORDS:
                sophisticated.add(word_lower)

        return sorted(list(sophisticated))[:20]  # Limit to top 20

    def _compute_voice_ratio(self, text: str, sentences: List[str]) -> float:
        """Compute ratio of active voice sentences."""
        if not sentences:
            return 1.0

        text_lower = text.lower()
        passive_count = 0

        for pattern in self.PASSIVE_PATTERNS:
            matches = re.findall(pattern, text_lower)
            passive_count += len(matches)

        # Estimate passive sentences (rough: passive constructions / sentences)
        # This is simplified; true passive detection requires parsing
        passive_ratio = min(passive_count / len(sentences), 1.0)
        active_ratio = 1.0 - passive_ratio

        return active_ratio

    def _detect_tone(self, text: str, words: List[str]) -> str:
        """Detect the writing tone."""
        text_lower = text.lower()
        word_set = set(w.lower() for w in words)

        # Count indicators
        formal_count = sum(1 for w in self.FORMAL_INDICATORS if w in text_lower)
        informal_count = sum(1 for w in self.INFORMAL_INDICATORS if w in word_set)

        # Check for personal pronouns (conversational)
        first_person = len(re.findall(r"\b(I|me|my|we|us|our)\b", text, re.IGNORECASE))
        word_count = len(words)
        first_person_ratio = first_person / word_count if word_count > 0 else 0

        # Check for rhetorical questions
        questions = text.count("?")

        # Check for exclamations
        exclamations = text.count("!")

        # Academic indicators
        academic_count = sum(1 for w in words if w.lower() in self.ACADEMIC_WORDS)
        academic_ratio = academic_count / word_count if word_count > 0 else 0

        # Determine tone
        if academic_ratio > 0.03 and formal_count >= 2:
            return "academic"
        elif informal_count >= 3 or exclamations >= 2:
            return "informal"
        elif formal_count >= 3 and first_person_ratio < 0.02:
            return "formal"
        elif first_person_ratio > 0.05 or questions >= 2:
            return "conversational"
        elif questions >= 1 and exclamations >= 1:
            return "persuasive"
        else:
            return "neutral"

    def suggest_improvements(
        self, report: StyleReport, target_style: str = "academic"
    ) -> List[str]:
        """Generate style improvement suggestions."""
        suggestions = []

        # Sentence variety suggestions
        if report.sentence_type_distribution.get("simple", 0) > 0.7:
            suggestions.append(
                "Vary your sentence structure by using more compound and "
                "complex sentences. Try combining related ideas."
            )

        if report.sentence_length_stats.std < 5:
            suggestions.append(
                "Your sentences are very similar in length. Try mixing "
                "short, punchy sentences with longer, more detailed ones."
            )

        # Vocabulary suggestions
        if report.vocabulary_level.awl_coverage < 0.01 and target_style == "academic":
            suggestions.append(
                "Consider using more academic vocabulary to strengthen "
                "your writing for scholarly contexts."
            )

        if report.word_variety_score < 0.4:
            suggestions.append(
                "Your writing shows some word repetition. Try using "
                "synonyms to add variety."
            )

        # Voice suggestions
        if report.voice_ratio < 0.5:
            suggestions.append(
                "Much of your writing uses passive voice. Consider using "
                "active voice for clearer, more direct sentences."
            )

        # Overused word suggestions
        if len(report.overused_words) > 3:
            words = [w.word for w in report.overused_words[:3]]
            suggestions.append(
                f"The words '{', '.join(words)}' appear frequently. "
                "Consider using alternatives for variety."
            )

        # Tone suggestions
        if target_style == "academic" and report.tone == "informal":
            suggestions.append(
                "The tone is informal. For academic writing, avoid "
                "contractions, slang, and casual expressions."
            )

        return suggestions[:5]
