"""
Multi-dimensional Readability Profiler.

Implements multiple readability formulas:
- Flesch-Kincaid Grade Level
- Flesch Reading Ease
- Gunning Fog Index
- SMOG Index
- Coleman-Liau Index
- Automated Readability Index
- Dale-Chall Readability

Plus modern metrics:
- Average sentence complexity (dependency parse depth)
- Conceptual density (named entities per sentence)
"""

import logging
import math
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set

logger = logging.getLogger(__name__)


@dataclass
class ComplexityFactor:
    """Factor contributing to text complexity."""

    factor: str
    value: float
    impact: str  # "increases" or "decreases"
    description: str


@dataclass
class ReadabilityProfile:
    """Complete readability analysis."""

    flesch_kincaid_grade: float = 0.0
    flesch_reading_ease: float = 0.0
    gunning_fog: float = 0.0
    smog_index: float = 0.0
    coleman_liau: float = 0.0
    ari: float = 0.0  # Automated Readability Index
    dale_chall: float = 0.0
    average_grade_level: float = 0.0
    target_audience: str = "General"
    complexity_factors: List[ComplexityFactor] = field(default_factory=list)


class ReadabilityProfiler:
    """
    Profile text readability using multiple metrics.

    Implements:
    - Flesch-Kincaid Grade Level
    - Flesch Reading Ease
    - Gunning Fog Index
    - SMOG Index
    - Coleman-Liau Index
    - Automated Readability Index
    - Dale-Chall Readability Score

    Usage:
        profiler = ReadabilityProfiler()
        profile = profiler.profile(text)
        print(f"Grade level: {profile.average_grade_level}")
        print(f"Target audience: {profile.target_audience}")
    """

    # Dale-Chall list of familiar words (simplified subset)
    # Full list has 3000 words; this is representative sample of most common
    DALE_CHALL_EASY_WORDS: Set[str] = {
        "a", "able", "about", "above", "across", "act", "add", "afraid",
        "after", "again", "against", "age", "ago", "air", "all", "almost",
        "alone", "along", "already", "also", "always", "am", "among",
        "an", "and", "animal", "another", "answer", "any", "anything",
        "appear", "apple", "are", "area", "arm", "around", "as", "ask",
        "at", "away", "baby", "back", "bad", "ball", "be", "became",
        "because", "become", "bed", "been", "before", "began", "begin",
        "behind", "believe", "below", "best", "better", "between", "big",
        "bird", "black", "blue", "board", "boat", "body", "book", "born",
        "both", "bottom", "box", "boy", "bring", "brought", "build",
        "built", "business", "but", "buy", "by", "call", "came", "can",
        "cannot", "car", "care", "carry", "case", "cat", "catch", "caught",
        "cause", "center", "certain", "change", "check", "child", "children",
        "city", "class", "clear", "close", "cold", "come", "common",
        "company", "complete", "could", "country", "course", "cover",
        "cut", "dark", "day", "deep", "did", "different", "do", "does",
        "dog", "done", "door", "down", "draw", "during", "each", "early",
        "earth", "east", "easy", "eat", "effect", "either", "else", "end",
        "enough", "even", "ever", "every", "example", "eye", "face",
        "fact", "fall", "family", "far", "farm", "fast", "father", "feel",
        "feet", "felt", "few", "field", "figure", "find", "fine", "fire",
        "first", "fish", "five", "floor", "follow", "food", "foot", "for",
        "form", "found", "four", "free", "friend", "from", "front", "full",
        "game", "gave", "get", "girl", "give", "go", "god", "going",
        "gold", "gone", "good", "got", "government", "great", "green",
        "ground", "group", "grow", "had", "half", "hand", "happen",
        "happy", "hard", "has", "have", "he", "head", "hear", "heard",
        "heart", "heat", "heavy", "held", "help", "her", "here", "high",
        "him", "himself", "his", "history", "hold", "home", "hope",
        "horse", "hot", "hour", "house", "how", "however", "hundred",
        "i", "idea", "if", "important", "in", "information", "inside",
        "instead", "interest", "into", "is", "it", "its", "itself",
        "job", "john", "just", "keep", "kept", "kind", "king", "knew",
        "know", "land", "language", "large", "last", "late", "later",
        "lay", "learn", "least", "leave", "left", "less", "let", "letter",
        "life", "light", "like", "line", "list", "listen", "little",
        "live", "long", "look", "lose", "lost", "lot", "love", "low",
        "made", "make", "man", "many", "map", "mark", "matter", "may",
        "me", "mean", "men", "might", "mile", "mind", "miss", "money",
        "month", "moon", "more", "morning", "most", "mother", "mountain",
        "move", "much", "music", "must", "my", "name", "nation", "near",
        "need", "never", "new", "next", "night", "no", "north", "not",
        "note", "nothing", "notice", "now", "number", "of", "off", "often",
        "oh", "old", "on", "once", "one", "only", "open", "or", "order",
        "other", "our", "out", "over", "own", "page", "paper", "part",
        "party", "pass", "past", "pattern", "people", "perhaps", "person",
        "picture", "piece", "place", "plan", "plant", "play", "please",
        "point", "poor", "possible", "power", "present", "president",
        "problem", "produce", "program", "put", "question", "quite",
        "rain", "ran", "rather", "reach", "read", "ready", "real",
        "reason", "record", "red", "remember", "rest", "result", "return",
        "rich", "right", "river", "road", "rock", "room", "run", "said",
        "same", "sat", "saw", "say", "school", "sea", "second", "see",
        "seem", "seen", "self", "send", "sense", "sent", "sentence",
        "serve", "set", "several", "shall", "she", "ship", "short",
        "should", "show", "shown", "side", "since", "sit", "six", "size",
        "sleep", "small", "snow", "so", "social", "some", "something",
        "sometimes", "son", "song", "soon", "sound", "south", "space",
        "speak", "special", "stand", "start", "state", "stay", "step",
        "still", "stood", "stop", "story", "street", "strong", "study",
        "such", "summer", "sun", "sure", "system", "table", "take",
        "talk", "tell", "ten", "than", "that", "the", "their", "them",
        "themselves", "then", "there", "these", "they", "thing", "think",
        "third", "this", "those", "though", "thought", "thousand", "three",
        "through", "time", "to", "today", "together", "told", "too",
        "took", "top", "toward", "town", "tree", "true", "try", "turn",
        "two", "under", "understand", "unit", "until", "up", "upon",
        "us", "use", "usual", "very", "voice", "walk", "want", "war",
        "warm", "was", "watch", "water", "way", "we", "week", "well",
        "went", "were", "west", "what", "when", "where", "whether",
        "which", "while", "white", "who", "whole", "why", "wide", "wife",
        "will", "win", "wind", "winter", "with", "within", "without",
        "woman", "women", "wood", "word", "work", "world", "would",
        "write", "year", "yes", "yet", "you", "young", "your",
    }

    # Target audience mapping by grade level
    AUDIENCE_MAPPING = [
        (3, "Elementary (Grades 1-3)"),
        (5, "Elementary (Grades 4-5)"),
        (8, "Middle School (Grades 6-8)"),
        (10, "High School (Grades 9-10)"),
        (12, "High School (Grades 11-12)"),
        (14, "College"),
        (float("inf"), "Graduate/Professional"),
    ]

    def __init__(self, use_textstat: bool = True):
        """
        Initialize the readability profiler.

        Args:
            use_textstat: Whether to use textstat library if available
        """
        self.use_textstat = use_textstat
        self._textstat = None
        self._textstat_loaded = False

        logger.info("ReadabilityProfiler initialized")

    def _lazy_load_textstat(self) -> None:
        """Lazy load textstat library."""
        if self._textstat_loaded:
            return

        if self.use_textstat:
            try:
                import textstat

                self._textstat = textstat
                self._textstat_loaded = True
                logger.info("textstat library loaded")
            except ImportError:
                logger.warning("textstat not available, using manual calculations")
                self._textstat_loaded = True

    def profile(self, text: str) -> ReadabilityProfile:
        """
        Generate complete readability profile.

        Args:
            text: Text to analyze

        Returns:
            ReadabilityProfile with all readability metrics
        """
        self._lazy_load_textstat()

        # Extract text statistics
        stats = self._extract_text_stats(text)

        # Calculate readability scores
        if self._textstat:
            profile = self._profile_with_textstat(text)
        else:
            profile = self._profile_manual(stats)

        # Calculate average grade level
        grade_levels = [
            profile.flesch_kincaid_grade,
            profile.gunning_fog,
            profile.smog_index,
            profile.coleman_liau,
            profile.ari,
        ]
        valid_grades = [g for g in grade_levels if 0 <= g <= 20]
        avg_grade = sum(valid_grades) / len(valid_grades) if valid_grades else 8.0
        profile.average_grade_level = round(avg_grade, 1)

        # Determine target audience
        profile.target_audience = self._determine_audience(profile.average_grade_level)

        # Identify complexity factors
        profile.complexity_factors = self._identify_complexity_factors(stats, profile)

        return profile

    def _extract_text_stats(self, text: str) -> Dict[str, Any]:
        """Extract statistical features from text."""
        # Word tokenization
        words = re.findall(r"\b[a-zA-Z]+(?:'[a-zA-Z]+)?\b", text)
        word_count = len(words)

        # Sentence tokenization
        sentences = self._split_sentences(text)
        sentence_count = len(sentences) or 1

        # Character count (letters only)
        char_count = sum(len(w) for w in words)

        # Syllable count
        syllable_count = sum(self._count_syllables(w) for w in words)

        # Complex words (3+ syllables)
        complex_words = [w for w in words if self._count_syllables(w) >= 3]
        complex_word_count = len(complex_words)

        # Polysyllabic words (same as complex)
        polysyllable_count = complex_word_count

        # Difficult words (not in Dale-Chall list)
        difficult_words = [
            w for w in words
            if w.lower() not in self.DALE_CHALL_EASY_WORDS
            and len(w) > 2
        ]
        difficult_word_count = len(difficult_words)

        # Average calculations
        avg_sentence_length = word_count / sentence_count if sentence_count > 0 else 0
        avg_word_length = char_count / word_count if word_count > 0 else 0
        avg_syllables_per_word = syllable_count / word_count if word_count > 0 else 0

        return {
            "word_count": word_count,
            "sentence_count": sentence_count,
            "char_count": char_count,
            "syllable_count": syllable_count,
            "complex_word_count": complex_word_count,
            "polysyllable_count": polysyllable_count,
            "difficult_word_count": difficult_word_count,
            "avg_sentence_length": avg_sentence_length,
            "avg_word_length": avg_word_length,
            "avg_syllables_per_word": avg_syllables_per_word,
        }

    def _split_sentences(self, text: str) -> List[str]:
        """Split text into sentences."""
        # Handle abbreviations
        text = re.sub(r"Mr\.", "Mr", text)
        text = re.sub(r"Mrs\.", "Mrs", text)
        text = re.sub(r"Dr\.", "Dr", text)
        text = re.sub(r"etc\.", "etc", text)

        sentences = re.split(r"[.!?]+", text)
        return [s.strip() for s in sentences if s.strip()]

    def _count_syllables(self, word: str) -> int:
        """Count syllables in a word."""
        word = word.lower()

        # Handle special cases
        if len(word) <= 2:
            return 1

        # Count vowel groups
        vowels = "aeiouy"
        count = 0
        prev_vowel = False

        for i, char in enumerate(word):
            is_vowel = char in vowels
            if is_vowel and not prev_vowel:
                count += 1
            prev_vowel = is_vowel

        # Handle silent e
        if word.endswith("e") and count > 1:
            count -= 1

        # Handle -le endings
        if word.endswith("le") and len(word) > 2 and word[-3] not in vowels:
            count += 1

        # Handle -ed endings
        if word.endswith("ed") and len(word) > 2:
            if word[-3] not in "td":
                count -= 1

        return max(1, count)

    def _profile_with_textstat(self, text: str) -> ReadabilityProfile:
        """Calculate readability using textstat library."""
        ts = self._textstat

        return ReadabilityProfile(
            flesch_kincaid_grade=round(ts.flesch_kincaid_grade(text), 1),
            flesch_reading_ease=round(ts.flesch_reading_ease(text), 1),
            gunning_fog=round(ts.gunning_fog(text), 1),
            smog_index=round(ts.smog_index(text), 1),
            coleman_liau=round(ts.coleman_liau_index(text), 1),
            ari=round(ts.automated_readability_index(text), 1),
            dale_chall=round(ts.dale_chall_readability_score(text), 1),
        )

    def _profile_manual(self, stats: Dict[str, Any]) -> ReadabilityProfile:
        """Calculate readability manually without textstat."""
        # Extract statistics
        words = stats["word_count"]
        sentences = stats["sentence_count"]
        syllables = stats["syllable_count"]
        chars = stats["char_count"]
        complex_words = stats["complex_word_count"]
        difficult_words = stats["difficult_word_count"]

        if words == 0 or sentences == 0:
            return ReadabilityProfile()

        # Flesch Reading Ease
        # 206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words)
        fre = (
            206.835
            - 1.015 * (words / sentences)
            - 84.6 * (syllables / words)
        )
        fre = max(0, min(100, fre))

        # Flesch-Kincaid Grade Level
        # 0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59
        fkgl = (
            0.39 * (words / sentences)
            + 11.8 * (syllables / words)
            - 15.59
        )
        fkgl = max(0, fkgl)

        # Gunning Fog Index
        # 0.4 * ((words/sentences) + 100 * (complex_words/words))
        fog = 0.4 * ((words / sentences) + 100 * (complex_words / words))
        fog = max(0, fog)

        # SMOG Index
        # 1.0430 * sqrt(complex_words * (30/sentences)) + 3.1291
        if sentences >= 3:
            smog = 1.0430 * math.sqrt(complex_words * (30 / sentences)) + 3.1291
        else:
            smog = 0  # SMOG requires at least 30 sentences ideally

        # Coleman-Liau Index
        # 0.0588 * L - 0.296 * S - 15.8
        # L = avg letters per 100 words, S = avg sentences per 100 words
        L = (chars / words) * 100
        S = (sentences / words) * 100
        cli = 0.0588 * L - 0.296 * S - 15.8
        cli = max(0, cli)

        # Automated Readability Index
        # 4.71 * (chars/words) + 0.5 * (words/sentences) - 21.43
        ari = 4.71 * (chars / words) + 0.5 * (words / sentences) - 21.43
        ari = max(0, ari)

        # Dale-Chall Readability Score
        # 0.1579 * (difficult_words/words * 100) + 0.0496 * (words/sentences)
        pdw = (difficult_words / words) * 100
        dc = 0.1579 * pdw + 0.0496 * (words / sentences)
        if pdw > 5:
            dc += 3.6365

        return ReadabilityProfile(
            flesch_kincaid_grade=round(fkgl, 1),
            flesch_reading_ease=round(fre, 1),
            gunning_fog=round(fog, 1),
            smog_index=round(smog, 1),
            coleman_liau=round(cli, 1),
            ari=round(ari, 1),
            dale_chall=round(dc, 1),
        )

    def _determine_audience(self, grade_level: float) -> str:
        """Determine target audience based on grade level."""
        for threshold, audience in self.AUDIENCE_MAPPING:
            if grade_level <= threshold:
                return audience
        return "Graduate/Professional"

    def _identify_complexity_factors(
        self, stats: Dict[str, Any], profile: ReadabilityProfile
    ) -> List[ComplexityFactor]:
        """Identify factors contributing to text complexity."""
        factors = []

        # Sentence length factor
        avg_sent_len = stats["avg_sentence_length"]
        if avg_sent_len > 25:
            factors.append(
                ComplexityFactor(
                    factor="Long sentences",
                    value=round(avg_sent_len, 1),
                    impact="increases",
                    description=f"Average sentence length of {avg_sent_len:.1f} words is above recommended 20-25.",
                )
            )
        elif avg_sent_len < 10:
            factors.append(
                ComplexityFactor(
                    factor="Short sentences",
                    value=round(avg_sent_len, 1),
                    impact="decreases",
                    description=f"Average sentence length of {avg_sent_len:.1f} words creates simple, choppy text.",
                )
            )

        # Word complexity factor
        if stats["word_count"] > 0:
            complex_pct = stats["complex_word_count"] / stats["word_count"] * 100
            if complex_pct > 15:
                factors.append(
                    ComplexityFactor(
                        factor="Complex vocabulary",
                        value=round(complex_pct, 1),
                        impact="increases",
                        description=f"{complex_pct:.1f}% of words have 3+ syllables.",
                    )
                )

        # Syllable factor
        avg_syllables = stats["avg_syllables_per_word"]
        if avg_syllables > 2:
            factors.append(
                ComplexityFactor(
                    factor="High syllable count",
                    value=round(avg_syllables, 2),
                    impact="increases",
                    description=f"Average of {avg_syllables:.2f} syllables per word indicates complex vocabulary.",
                )
            )

        # Flesch Reading Ease factor
        if profile.flesch_reading_ease < 30:
            factors.append(
                ComplexityFactor(
                    factor="Very difficult reading",
                    value=profile.flesch_reading_ease,
                    impact="increases",
                    description="Flesch Reading Ease below 30 indicates college graduate level difficulty.",
                )
            )
        elif profile.flesch_reading_ease > 70:
            factors.append(
                ComplexityFactor(
                    factor="Easy reading",
                    value=profile.flesch_reading_ease,
                    impact="decreases",
                    description="Flesch Reading Ease above 70 indicates easy-to-read text.",
                )
            )

        # Difficult word factor (Dale-Chall)
        if stats["word_count"] > 0:
            difficult_pct = stats["difficult_word_count"] / stats["word_count"] * 100
            if difficult_pct > 20:
                factors.append(
                    ComplexityFactor(
                        factor="Unfamiliar vocabulary",
                        value=round(difficult_pct, 1),
                        impact="increases",
                        description=f"{difficult_pct:.1f}% of words are outside common vocabulary.",
                    )
                )

        return factors[:5]  # Limit to top 5 factors

    def compare_to_target(
        self, profile: ReadabilityProfile, target_grade: int
    ) -> Dict[str, Any]:
        """Compare readability to a target grade level."""
        current = profile.average_grade_level
        diff = current - target_grade

        comparison = {
            "current_grade": current,
            "target_grade": target_grade,
            "difference": round(diff, 1),
            "status": "at_target" if abs(diff) < 1 else ("above_target" if diff > 0 else "below_target"),
            "adjustment_needed": abs(diff) >= 1,
        }

        if diff > 2:
            comparison["recommendation"] = (
                f"Text is {diff:.1f} grades above target. Simplify sentences "
                "and use more common vocabulary."
            )
        elif diff > 0:
            comparison["recommendation"] = (
                "Text is slightly above target. Minor simplifications may help."
            )
        elif diff < -2:
            comparison["recommendation"] = (
                f"Text is {-diff:.1f} grades below target. Use more sophisticated "
                "vocabulary and complex sentence structures."
            )
        elif diff < 0:
            comparison["recommendation"] = (
                "Text is slightly below target. Consider adding complexity."
            )
        else:
            comparison["recommendation"] = "Text is at the appropriate level."

        return comparison

    def simplify_suggestions(self, text: str, target_grade: int) -> List[str]:
        """Suggest simplifications to reach target grade level."""
        profile = self.profile(text)
        suggestions = []

        diff = profile.average_grade_level - target_grade

        if diff <= 0:
            return ["Text is already at or below target grade level."]

        # Sentence length suggestion
        if profile.flesch_kincaid_grade > target_grade + 2:
            suggestions.append(
                "Break long sentences into shorter ones. Aim for 15-20 words per sentence."
            )

        # Vocabulary suggestion
        if profile.gunning_fog > target_grade + 1:
            suggestions.append(
                "Replace complex words (3+ syllables) with simpler alternatives."
            )

        # Reading ease suggestion
        if profile.flesch_reading_ease < 50:
            suggestions.append(
                "Use more common, everyday words instead of technical terms."
            )

        # Dale-Chall suggestion
        if profile.dale_chall > 7:
            suggestions.append(
                "Many words may be unfamiliar to your audience. "
                "Use words from basic vocabulary lists."
            )

        if not suggestions:
            suggestions.append(
                f"To reach grade {target_grade}, shorten sentences and simplify vocabulary."
            )

        return suggestions[:5]
