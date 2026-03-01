"""
Reading Level Adapter

Adapts content to the learner's Lexile reading level, ensuring text is
within a ±50L comfort zone.  Provides grade-band presets aligned with
Common Core Text Complexity Bands.

Grade-band  │  Lexile range
K–2         │  BR–300L
3–5         │  300–700L
6–8         │  700–1000L
9–12        │  1000–1300L
"""
import logging
import re
import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)


# ── Grade-band presets ──────────────────────────────────────────────────
GRADE_BANDS: Dict[str, Tuple[int, int]] = {
    "K-2": (0, 300),
    "3-5": (300, 700),
    "6-8": (700, 1000),
    "9-12": (1000, 1300),
}

# Midpoints used as default targets when only a band label is given
GRADE_BAND_MIDPOINTS: Dict[str, int] = {
    "K-2": 150,
    "3-5": 500,
    "6-8": 850,
    "9-12": 1150,
}


# ── Word substitution tiers ────────────────────────────────────────────
# Maps academic words → simpler alternatives organised by approximate
# Lexile tier they suit.
TIER_SUBSTITUTIONS: Dict[str, Dict[str, str]] = {
    "elementary": {
        "utilize": "use",
        "demonstrate": "show",
        "approximately": "about",
        "commence": "start",
        "terminate": "end",
        "facilitate": "help",
        "subsequent": "next",
        "sufficient": "enough",
        "acquire": "get",
        "endeavor": "try",
        "accomplish": "do",
        "additional": "more",
        "assistance": "help",
        "comprehend": "understand",
        "numerous": "many",
        "objective": "goal",
        "perceive": "see",
        "possess": "have",
        "previous": "past",
        "require": "need",
        "significant": "big",
        "manufacture": "make",
        "modification": "change",
        "frequently": "often",
        "immediately": "now",
        "investigate": "look at",
        "eliminate": "remove",
        "establish": "set up",
        "evaluate": "check",
        "indicate": "show",
        "initial": "first",
        "magnitude": "size",
        "participate": "join",
        "permit": "let",
        "observe": "watch",
    },
    "intermediate": {
        "utilize": "use",
        "demonstrate": "show",
        "approximately": "about",
        "commence": "begin",
        "facilitate": "make easier",
        "subsequent": "following",
        "accomplish": "achieve",
        "manufacture": "produce",
        "comprehend": "understand",
        "perceive": "notice",
        "investigate": "look into",
        "magnitude": "size",
    },
}


@dataclass
class LexileEstimate:
    """Estimated Lexile measure for a text."""
    lexile: int
    grade_band: str
    avg_sentence_length: float
    avg_word_length: float
    complex_word_ratio: float
    word_count: int


@dataclass
class AdaptedContent:
    """Result of reading-level adaptation."""
    text: str
    original_lexile: int
    adapted_lexile: int
    target_lexile: int
    grade_band: str
    changes_made: List[str] = field(default_factory=list)
    word_count_original: int = 0
    word_count_adapted: int = 0
    sentences_split: int = 0
    words_replaced: int = 0
    within_comfort_zone: bool = True


class ReadingLevelAdapter:
    """
    Adapt content to a target Lexile reading level.

    The adapter keeps content within a ±50L comfort zone of the learner's
    measured Lexile level, applying progressive simplification:

    1. Vocabulary substitution (tier-appropriate word replacement)
    2. Sentence shortening (split long compound/complex sentences)
    3. Paragraph chunking (break dense text into scannable paragraphs)
    4. Passive → active voice (where heuristics apply)

    Usage::

        adapter = ReadingLevelAdapter()
        result = adapter.adapt(text, target_lexile=600)
        # or by grade band:
        result = adapter.adapt_to_grade_band(text, "3-5")
    """

    COMFORT_ZONE = 50  # ±50L

    def __init__(self) -> None:
        logger.info("ReadingLevelAdapter initialised")

    # ── Public API ──────────────────────────────────────────────────────

    def estimate_lexile(self, text: str) -> LexileEstimate:
        """
        Estimate the Lexile measure of *text* using a lightweight
        heuristic (sentence length × word difficulty proxy).

        This is an approximation — production deployments should calibrate
        against a validated Lexile SDK.
        """
        if not text or not text.strip():
            raise ValueError("Text cannot be empty")

        sentences = self._split_sentences(text)
        words = text.split()
        word_count = len(words)
        avg_sentence_length = word_count / max(len(sentences), 1)

        avg_word_length = np.mean([len(w) for w in words]) if words else 0.0
        complex_words = sum(1 for w in words if len(w) > 7)
        complex_ratio = complex_words / max(word_count, 1)

        # Heuristic Lexile ≈ f(avg_sentence_len, avg_word_len)
        raw = (avg_sentence_length * 30) + (avg_word_length * 80) - 200
        lexile = int(max(0, min(1600, raw)))

        grade_band = self._lexile_to_grade_band(lexile)

        return LexileEstimate(
            lexile=lexile,
            grade_band=grade_band,
            avg_sentence_length=round(avg_sentence_length, 1),
            avg_word_length=round(float(avg_word_length), 1),
            complex_word_ratio=round(complex_ratio, 3),
            word_count=word_count,
        )

    def adapt(
        self,
        text: str,
        target_lexile: int,
        *,
        max_iterations: int = 5,
        preserve_meaning: bool = True,
    ) -> AdaptedContent:
        """
        Adapt *text* so its estimated Lexile is within ±COMFORT_ZONE of
        *target_lexile*.
        """
        if not text or not text.strip():
            raise ValueError("Text cannot be empty")
        if target_lexile < 0 or target_lexile > 1600:
            raise ValueError("target_lexile must be 0–1600")

        original_estimate = self.estimate_lexile(text)
        original_lexile = original_estimate.lexile
        grade_band = self._lexile_to_grade_band(target_lexile)
        original_word_count = len(text.split())

        adapted = text
        all_changes: List[str] = []
        total_words_replaced = 0
        total_sentences_split = 0

        for iteration in range(max_iterations):
            current = self.estimate_lexile(adapted)
            diff = current.lexile - target_lexile

            if abs(diff) <= self.COMFORT_ZONE:
                break  # within comfort zone

            if diff > 0:
                # Text is too hard — simplify
                adapted, changes = self._simplify_pass(
                    adapted, target_lexile, preserve_meaning
                )
            else:
                # Text is too easy — enrich (light touch)
                adapted, changes = self._enrich_pass(adapted, target_lexile)

            if not changes:
                break  # no further changes possible
            all_changes.extend(changes)
            total_words_replaced += sum(
                1 for c in changes if c.startswith("Replaced")
            )
            total_sentences_split += sum(
                1 for c in changes if c.startswith("Split")
            )

        adapted_estimate = self.estimate_lexile(adapted)
        within = abs(adapted_estimate.lexile - target_lexile) <= self.COMFORT_ZONE

        return AdaptedContent(
            text=adapted,
            original_lexile=original_lexile,
            adapted_lexile=adapted_estimate.lexile,
            target_lexile=target_lexile,
            grade_band=grade_band,
            changes_made=all_changes,
            word_count_original=original_word_count,
            word_count_adapted=len(adapted.split()),
            sentences_split=total_sentences_split,
            words_replaced=total_words_replaced,
            within_comfort_zone=within,
        )

    def adapt_to_grade_band(
        self,
        text: str,
        band: str,
        *,
        preserve_meaning: bool = True,
    ) -> AdaptedContent:
        """
        Convenience wrapper — adapt content to the midpoint Lexile of a
        named grade band (``"K-2"``, ``"3-5"``, ``"6-8"``, ``"9-12"``).
        """
        band = band.upper().replace(" ", "")
        # normalise common alternate notations
        band_map = {"K2": "K-2", "35": "3-5", "68": "6-8", "912": "9-12"}
        band = band_map.get(band, band)

        if band not in GRADE_BAND_MIDPOINTS:
            raise ValueError(
                f"Unknown grade band '{band}'. "
                f"Expected one of: {list(GRADE_BANDS.keys())}"
            )

        target = GRADE_BAND_MIDPOINTS[band]
        return self.adapt(text, target, preserve_meaning=preserve_meaning)

    def get_grade_bands(self) -> List[Dict[str, object]]:
        """Return all grade-band presets for API consumers."""
        return [
            {
                "band": band,
                "lexile_min": lo,
                "lexile_max": hi,
                "midpoint": GRADE_BAND_MIDPOINTS[band],
            }
            for band, (lo, hi) in GRADE_BANDS.items()
        ]

    # ── Internal helpers ────────────────────────────────────────────────

    def _split_sentences(self, text: str) -> List[str]:
        """Split text into sentences."""
        parts = re.split(r'(?<=[.!?])\s+', text)
        return [s.strip() for s in parts if s.strip()]

    @staticmethod
    def _lexile_to_grade_band(lexile: int) -> str:
        for band, (lo, hi) in GRADE_BANDS.items():
            if lo <= lexile <= hi:
                return band
        if lexile > 1300:
            return "9-12"
        return "K-2"

    def _simplify_pass(
        self,
        text: str,
        target_lexile: int,
        preserve_meaning: bool,
    ) -> Tuple[str, List[str]]:
        """One round of simplification."""
        changes: List[str] = []

        # 1. Vocabulary substitution
        tier = "elementary" if target_lexile < 500 else "intermediate"
        subs = TIER_SUBSTITUTIONS.get(tier, {})
        for hard, easy in subs.items():
            pattern = re.compile(r'\b' + re.escape(hard) + r'\b', re.IGNORECASE)
            if pattern.search(text):
                text = pattern.sub(easy, text)
                changes.append(f"Replaced '{hard}' → '{easy}'")

        # 2. Split long sentences (>25 words)
        sentences = self._split_sentences(text)
        new_sentences: List[str] = []
        for sent in sentences:
            words = sent.split()
            if len(words) > 25:
                mid = len(words) // 2
                # Find a conjunction or comma near the middle
                split_at = self._find_split_point(words, mid)
                first = " ".join(words[:split_at]).rstrip(",;")
                if not first.endswith((".", "!", "?")):
                    first += "."
                second = " ".join(words[split_at:]).lstrip(",; ")
                if second:
                    second = second[0].upper() + second[1:]
                new_sentences.extend([first, second])
                changes.append(f"Split long sentence ({len(words)} words)")
            else:
                new_sentences.append(sent)
        text = " ".join(new_sentences)

        # 3. Simplify passive voice heuristic (was/were + past participle)
        passive_pattern = re.compile(
            r'\b(was|were)\s+(\w+ed)\b', re.IGNORECASE
        )
        if passive_pattern.search(text) and not preserve_meaning:
            text = passive_pattern.sub(r'\2', text)
            changes.append("Simplified passive constructions")

        return text, changes

    def _enrich_pass(
        self,
        text: str,
        target_lexile: int,
    ) -> Tuple[str, List[str]]:
        """One round of light enrichment (make text slightly harder)."""
        changes: List[str] = []

        # Reverse some elementary substitutions
        reverse_subs = {
            "use": "utilize",
            "show": "demonstrate",
            "about": "approximately",
            "start": "commence",
            "end": "conclude",
        }

        for simple, academic in reverse_subs.items():
            pattern = re.compile(r'\b' + re.escape(simple) + r'\b', re.IGNORECASE)
            match = pattern.search(text)
            if match:
                text = pattern.sub(academic, text, count=1)
                changes.append(f"Enriched '{simple}' → '{academic}'")
                break  # only one swap per pass to control drift

        return text, changes

    @staticmethod
    def _find_split_point(words: List[str], mid: int) -> int:
        """Find the best place near *mid* to split a sentence."""
        conjunctions = {"and", "but", "or", "so", "yet", "because", "although",
                        "however", "therefore", "while", "which", "that"}
        # Search within ±5 words of the midpoint
        for offset in range(6):
            for idx in (mid + offset, mid - offset):
                if 0 < idx < len(words):
                    word_clean = words[idx].strip(",.;:").lower()
                    if word_clean in conjunctions:
                        return idx
            # Also check for commas/semicolons
            for idx in (mid + offset, mid - offset):
                if 0 < idx < len(words):
                    if words[idx].endswith((",", ";")):
                        return idx + 1
        return mid
