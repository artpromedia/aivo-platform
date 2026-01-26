"""
Cloze Generator.

Generates fill-in-the-blank (cloze) items from educational text.
Selects appropriate words to blank based on various strategies.
"""

import logging
import random
import re
from dataclasses import dataclass, field
from typing import List, Optional, Set, Tuple

logger = logging.getLogger(__name__)


@dataclass
class ClozeItem:
    """A single cloze (fill-in-blank) item."""

    text_with_blank: str  # Text with _____ marking the blank
    answer: str  # The correct answer
    hint: Optional[str] = None  # Optional hint
    difficulty: float = 0.5  # Estimated difficulty 0-1
    blank_type: str = "key_term"  # Type: key_term, entity, definition, etc.
    context_sentence: str = ""  # Original sentence with answer
    char_start: int = 0  # Start position of blank in original text
    char_end: int = 0  # End position of blank in original text


@dataclass
class ClozeGeneratorConfig:
    """Configuration for cloze generation."""

    spacy_model: str = "en_core_web_sm"
    blank_marker: str = "_____"
    min_word_length: int = 3
    max_items: int = 10
    include_hints: bool = True
    difficulty_variation: bool = True


class ClozeGenerator:
    """
    Generate cloze (fill-in-blank) items from educational text.

    Strategies:
    - Key term deletion: Remove important concepts/terms
    - Named entity blanks: Remove names, dates, places
    - Definition completion: Remove defined terms
    - Vocabulary items: Target specific vocabulary words

    Usage:
        generator = ClozeGenerator()
        items = generator.generate(
            "The Eiffel Tower is located in Paris, France.",
            num_items=2
        )
    """

    # Word categories that should not be blanked
    STOPWORDS = {
        "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
        "have", "has", "had", "do", "does", "did", "will", "would", "could",
        "should", "may", "might", "must", "shall", "can", "of", "to", "in",
        "for", "on", "with", "at", "by", "from", "or", "and", "not", "but",
        "if", "then", "that", "this", "these", "those", "it", "its"
    }

    # POS tags for key content words
    CONTENT_POS = {"NOUN", "PROPN", "VERB", "ADJ", "NUM"}

    def __init__(self, config: Optional[ClozeGeneratorConfig] = None):
        """Initialize the cloze generator."""
        self.config = config or ClozeGeneratorConfig()
        self._nlp = None
        self._loaded = False
        logger.info("ClozeGenerator initialized")

    def _load_spacy(self):
        """Lazy load spaCy model."""
        if not self._loaded:
            try:
                import spacy
                self._nlp = spacy.load(self.config.spacy_model)
                self._loaded = True
            except Exception as e:
                logger.error(f"Failed to load spaCy: {e}")
                raise
        return self._nlp

    def generate(
        self,
        text: str,
        num_items: int = 5,
        blank_strategy: str = "key_terms",
    ) -> List[ClozeItem]:
        """
        Generate cloze items from text.

        Args:
            text: Source text
            num_items: Number of items to generate
            blank_strategy: Strategy for selecting blanks
                - "key_terms": Important concepts and terms
                - "entities": Named entities (names, dates, places)
                - "definitions": Terms that are defined in text
                - "vocabulary": Challenging vocabulary words
                - "mixed": Combination of strategies

        Returns:
            List of ClozeItem objects
        """
        nlp = self._load_spacy()
        doc = nlp(text)

        # Select blanks based on strategy
        if blank_strategy == "key_terms":
            candidates = self._select_key_terms(doc)
        elif blank_strategy == "entities":
            candidates = self._select_entities(doc)
        elif blank_strategy == "definitions":
            candidates = self._select_definitions(text, doc)
        elif blank_strategy == "vocabulary":
            candidates = self._select_vocabulary(doc)
        elif blank_strategy == "mixed":
            candidates = self._select_mixed(text, doc)
        else:
            candidates = self._select_key_terms(doc)

        # Limit and sort by importance
        candidates = sorted(
            candidates,
            key=lambda x: x[3],  # importance score
            reverse=True
        )[:num_items * 2]  # Get extra for filtering

        # Generate cloze items
        items = []
        used_positions: Set[Tuple[int, int]] = set()

        for answer_text, span_start, span_end, importance, blank_type in candidates:
            # Skip overlapping spans
            if any(
                not (span_end <= used_start or span_start >= used_end)
                for used_start, used_end in used_positions
            ):
                continue

            # Get the sentence containing this blank
            sentence = self._get_sentence_for_span(doc, span_start, span_end)

            # Create blank text
            text_with_blank = self._create_blank_text(
                sentence, answer_text, span_start, span_end
            )

            # Generate hint if configured
            hint = None
            if self.config.include_hints:
                hint = self._generate_hint(answer_text, doc)

            # Estimate difficulty
            difficulty = self._estimate_difficulty(
                answer_text, sentence, blank_type
            )

            item = ClozeItem(
                text_with_blank=text_with_blank,
                answer=answer_text,
                hint=hint,
                difficulty=difficulty,
                blank_type=blank_type,
                context_sentence=sentence,
                char_start=span_start,
                char_end=span_end,
            )
            items.append(item)
            used_positions.add((span_start, span_end))

            if len(items) >= num_items:
                break

        return items

    def _select_key_terms(self, doc) -> List[Tuple[str, int, int, float, str]]:
        """Select key terms (nouns, proper nouns) for blanking."""
        candidates = []

        for token in doc:
            if token.pos_ in ("NOUN", "PROPN"):
                if (
                    token.text.lower() not in self.STOPWORDS
                    and len(token.text) >= self.config.min_word_length
                ):
                    # Calculate importance based on position and frequency
                    position_score = 1.0 - (token.idx / max(len(doc.text), 1))
                    freq_score = 0.5  # Could be enhanced with TF-IDF

                    # Proper nouns are more important
                    type_score = 0.8 if token.pos_ == "PROPN" else 0.6

                    importance = (position_score + freq_score + type_score) / 3

                    candidates.append((
                        token.text,
                        token.idx,
                        token.idx + len(token.text),
                        importance,
                        "key_term"
                    ))

        # Also include noun phrases
        for chunk in doc.noun_chunks:
            text = chunk.text.strip()
            if (
                len(text) >= self.config.min_word_length
                and text.lower() not in self.STOPWORDS
            ):
                position_score = 1.0 - (chunk.start_char / max(len(doc.text), 1))
                importance = position_score * 0.7

                candidates.append((
                    text,
                    chunk.start_char,
                    chunk.end_char,
                    importance,
                    "key_term"
                ))

        return candidates

    def _select_entities(self, doc) -> List[Tuple[str, int, int, float, str]]:
        """Select named entities for blanking."""
        candidates = []

        entity_importance = {
            "PERSON": 0.9,
            "ORG": 0.85,
            "GPE": 0.85,  # Countries, cities
            "DATE": 0.8,
            "EVENT": 0.75,
            "MONEY": 0.7,
            "PERCENT": 0.7,
            "TIME": 0.65,
            "QUANTITY": 0.6,
        }

        for ent in doc.ents:
            importance = entity_importance.get(ent.label_, 0.5)

            candidates.append((
                ent.text,
                ent.start_char,
                ent.end_char,
                importance,
                f"entity_{ent.label_.lower()}"
            ))

        return candidates

    def _select_definitions(
        self, text: str, doc
    ) -> List[Tuple[str, int, int, float, str]]:
        """Select terms that are defined in the text."""
        candidates = []

        # Patterns for definitions
        definition_patterns = [
            r"(\w+(?:\s+\w+)?)\s+is\s+(?:a|an|the)\s+",
            r"(\w+(?:\s+\w+)?)\s+refers\s+to\s+",
            r"(\w+(?:\s+\w+)?)\s+means\s+",
            r"(\w+(?:\s+\w+)?),\s+defined\s+as\s+",
        ]

        for pattern in definition_patterns:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                term = match.group(1)
                if len(term) >= self.config.min_word_length:
                    candidates.append((
                        term,
                        match.start(1),
                        match.end(1),
                        0.9,  # Definitions are high-value blanks
                        "definition"
                    ))

        return candidates

    def _select_vocabulary(self, doc) -> List[Tuple[str, int, int, float, str]]:
        """Select challenging vocabulary words."""
        candidates = []

        # Look for longer, less common words
        for token in doc:
            if token.pos_ in self.CONTENT_POS:
                word = token.text.lower()
                if (
                    word not in self.STOPWORDS
                    and len(token.text) >= 6  # Longer words
                    and not token.is_stop
                ):
                    # Estimate vocabulary level based on word length and frequency
                    length_score = min(1.0, len(token.text) / 12)

                    candidates.append((
                        token.text,
                        token.idx,
                        token.idx + len(token.text),
                        length_score,
                        "vocabulary"
                    ))

        return candidates

    def _select_mixed(
        self, text: str, doc
    ) -> List[Tuple[str, int, int, float, str]]:
        """Use a mix of all strategies."""
        all_candidates = []

        # Get candidates from each strategy
        all_candidates.extend(self._select_key_terms(doc))
        all_candidates.extend(self._select_entities(doc))
        all_candidates.extend(self._select_definitions(text, doc))
        all_candidates.extend(self._select_vocabulary(doc))

        return all_candidates

    def _get_sentence_for_span(
        self, doc, span_start: int, span_end: int
    ) -> str:
        """Get the sentence containing a character span."""
        for sent in doc.sents:
            if sent.start_char <= span_start and sent.end_char >= span_end:
                return sent.text.strip()
        return doc.text[max(0, span_start-50):min(len(doc.text), span_end+50)]

    def _create_blank_text(
        self,
        sentence: str,
        answer: str,
        abs_start: int,
        abs_end: int,
    ) -> str:
        """Create sentence text with blank replacing the answer."""
        # Find answer position in sentence
        answer_pos = sentence.lower().find(answer.lower())
        if answer_pos == -1:
            # Fallback: try to find partial match
            for i in range(len(sentence) - len(answer) + 1):
                if sentence[i:i+len(answer)].lower() == answer.lower():
                    answer_pos = i
                    break

        if answer_pos == -1:
            # Last resort: just append blank
            return f"{sentence} [{self.config.blank_marker}]"

        return (
            sentence[:answer_pos]
            + self.config.blank_marker
            + sentence[answer_pos + len(answer):]
        )

    def _generate_hint(self, answer: str, doc) -> str:
        """Generate a hint for the blank."""
        # Strategy 1: First letter hint
        if len(answer) > 0:
            first_letter_hint = f"Starts with '{answer[0].upper()}'"
        else:
            first_letter_hint = ""

        # Strategy 2: Length hint
        length_hint = f"{len(answer)} letters"

        # Strategy 3: Part of speech hint (if we can find it)
        for token in doc:
            if token.text.lower() == answer.lower():
                pos_hints = {
                    "NOUN": "a noun",
                    "PROPN": "a proper noun (name)",
                    "VERB": "a verb",
                    "ADJ": "an adjective",
                    "NUM": "a number",
                }
                if token.pos_ in pos_hints:
                    return f"{first_letter_hint}; {pos_hints[token.pos_]}"

        # Default hint
        return first_letter_hint

    def _estimate_difficulty(
        self,
        answer: str,
        sentence: str,
        blank_type: str,
    ) -> float:
        """Estimate difficulty of a cloze item."""
        difficulty = 0.5  # Base difficulty

        # Longer answers are harder
        difficulty += min(0.2, len(answer) / 50)

        # Longer context sentences are harder
        difficulty += min(0.1, len(sentence) / 200)

        # Blank type affects difficulty
        type_difficulty = {
            "entity_person": 0.6,
            "entity_date": 0.5,
            "entity_gpe": 0.55,
            "definition": 0.7,
            "vocabulary": 0.75,
            "key_term": 0.5,
        }
        if blank_type in type_difficulty:
            difficulty = (difficulty + type_difficulty[blank_type]) / 2

        return max(0.1, min(0.95, difficulty))

    def select_blanks(
        self, text: str, strategy: str = "key_terms"
    ) -> List[str]:
        """
        Select words to blank out from text.

        Args:
            text: Source text
            strategy: Blank selection strategy

        Returns:
            List of words that could be blanked
        """
        nlp = self._load_spacy()
        doc = nlp(text)

        if strategy == "key_terms":
            candidates = self._select_key_terms(doc)
        elif strategy == "entities":
            candidates = self._select_entities(doc)
        else:
            candidates = self._select_key_terms(doc)

        return [c[0] for c in candidates]

    def generate_hints(self, answer: str, context: str) -> str:
        """
        Generate hints for a specific answer.

        Args:
            answer: The answer word
            context: The surrounding context

        Returns:
            A hint string
        """
        hints = []

        # First letter
        if answer:
            hints.append(f"Starts with '{answer[0].upper()}'")

        # Word length
        hints.append(f"{len(answer)} letters")

        # Last letter
        if answer:
            hints.append(f"Ends with '{answer[-1].lower()}'")

        return "; ".join(hints[:2])  # Return first two hints

    def validate_cloze_item(self, item: ClozeItem) -> Tuple[bool, List[str]]:
        """
        Validate a cloze item for quality.

        Returns:
            Tuple of (is_valid, list of issues)
        """
        issues = []

        # Check blank marker is present
        if self.config.blank_marker not in item.text_with_blank:
            issues.append("Missing blank marker in text")

        # Check answer is not empty
        if not item.answer or len(item.answer.strip()) == 0:
            issues.append("Empty answer")

        # Check answer is not a stopword
        if item.answer.lower() in self.STOPWORDS:
            issues.append("Answer is a stopword")

        # Check answer length
        if len(item.answer) < self.config.min_word_length:
            issues.append("Answer is too short")

        return len(issues) == 0, issues
