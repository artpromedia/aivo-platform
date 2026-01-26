"""
Answer Extraction Module.

Extracts key answers/entities from passages that make good question targets.
Uses spaCy for NER and noun phrase extraction, with TF-IDF for importance ranking.
"""

import logging
import re
from collections import Counter
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple

import spacy
from spacy.tokens import Doc, Span

logger = logging.getLogger(__name__)

# Entity type importance weights for ranking
ENTITY_TYPE_WEIGHTS: Dict[str, float] = {
    "PERSON": 1.0,
    "ORG": 0.95,
    "GPE": 0.9,  # Geopolitical entities
    "DATE": 0.85,
    "EVENT": 0.85,
    "WORK_OF_ART": 0.8,
    "LAW": 0.8,
    "NORP": 0.75,  # Nationalities, religious/political groups
    "FAC": 0.7,  # Facilities
    "LOC": 0.7,  # Non-GPE locations
    "PRODUCT": 0.65,
    "MONEY": 0.6,
    "QUANTITY": 0.6,
    "PERCENT": 0.55,
    "TIME": 0.5,
    "ORDINAL": 0.45,
    "CARDINAL": 0.4,
    "LANGUAGE": 0.7,
}


@dataclass
class ExtractedAnswer:
    """Represents an extracted answer candidate from text."""

    text: str
    entity_type: str  # entity, concept, date, number, definition, noun_phrase
    importance_score: float
    char_start: int
    char_end: int
    sentence_context: str
    ner_label: Optional[str] = None
    frequency: int = 1
    position_score: float = 0.0

    def __hash__(self) -> int:
        return hash((self.text.lower(), self.char_start))

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, ExtractedAnswer):
            return False
        return self.text.lower() == other.text.lower() and self.char_start == other.char_start


@dataclass
class AnswerExtractorConfig:
    """Configuration for answer extraction."""

    spacy_model: str = "en_core_web_sm"
    max_answers: int = 10
    min_answer_length: int = 2
    max_answer_length: int = 50
    include_noun_phrases: bool = True
    include_numbers: bool = True
    include_definitions: bool = True
    position_weight: float = 0.3
    frequency_weight: float = 0.2
    type_weight: float = 0.5


class AnswerExtractor:
    """
    Extract potential answers from text for question generation.

    Extracts:
    - Named entities (people, places, organizations, dates, etc.)
    - Key concepts and noun phrases
    - Numbers and quantities
    - Definitions (detected via patterns)

    Ranks by:
    - Entity type importance
    - TF-IDF importance
    - Position in text (earlier = more important)
    - Frequency of mention
    """

    # Patterns for detecting definitions
    DEFINITION_PATTERNS = [
        r"(?P<term>\w+(?:\s+\w+)?)\s+is\s+(?:a|an|the)\s+(?P<def>.+?)(?:\.|,|;)",
        r"(?P<term>\w+(?:\s+\w+)?)\s+refers\s+to\s+(?P<def>.+?)(?:\.|,|;)",
        r"(?P<term>\w+(?:\s+\w+)?)\s+means\s+(?P<def>.+?)(?:\.|,|;)",
        r"(?P<term>\w+(?:\s+\w+)?),\s+defined\s+as\s+(?P<def>.+?)(?:\.|,|;)",
        r"(?P<term>\w+(?:\s+\w+)?)\s+can\s+be\s+defined\s+as\s+(?P<def>.+?)(?:\.|,|;)",
    ]

    def __init__(self, config: Optional[AnswerExtractorConfig] = None):
        """Initialize the answer extractor with spaCy model."""
        self.config = config or AnswerExtractorConfig()
        self._nlp: Optional[spacy.Language] = None
        self._loaded = False
        logger.info(
            f"AnswerExtractor initialized with model: {self.config.spacy_model}"
        )

    def _load_model(self) -> None:
        """Lazy load the spaCy model."""
        if not self._loaded:
            try:
                self._nlp = spacy.load(self.config.spacy_model)
                self._loaded = True
                logger.info(f"Loaded spaCy model: {self.config.spacy_model}")
            except OSError:
                logger.warning(
                    f"Model {self.config.spacy_model} not found, downloading..."
                )
                spacy.cli.download(self.config.spacy_model)
                self._nlp = spacy.load(self.config.spacy_model)
                self._loaded = True

    @property
    def nlp(self) -> spacy.Language:
        """Get the spaCy NLP pipeline."""
        self._load_model()
        return self._nlp

    def extract(
        self,
        text: str,
        max_answers: Optional[int] = None,
    ) -> List[ExtractedAnswer]:
        """
        Extract potential answers from text.

        Args:
            text: Input text to extract answers from
            max_answers: Maximum number of answers to return

        Returns:
            List of ExtractedAnswer objects sorted by importance
        """
        max_answers = max_answers or self.config.max_answers

        # Process text with spaCy
        doc = self.nlp(text)

        # Extract different types of answers
        entities = self._extract_entities(doc)
        noun_phrases = (
            self._extract_noun_phrases(doc)
            if self.config.include_noun_phrases
            else []
        )
        numbers = (
            self._extract_numbers(doc) if self.config.include_numbers else []
        )
        definitions = (
            self._extract_definitions(text, doc)
            if self.config.include_definitions
            else []
        )

        # Combine all answers
        all_answers = entities + noun_phrases + numbers + definitions

        # Remove duplicates and very similar answers
        unique_answers = self._deduplicate_answers(all_answers)

        # Calculate final scores and rank
        ranked_answers = self._rank_answers(unique_answers, doc)

        return ranked_answers[:max_answers]

    def _extract_entities(self, doc: Doc) -> List[ExtractedAnswer]:
        """Extract named entities from the document."""
        answers = []
        seen_texts: Set[str] = set()

        for ent in doc.ents:
            text = ent.text.strip()
            text_lower = text.lower()

            # Skip if already seen or too short/long
            if text_lower in seen_texts:
                continue
            if len(text) < self.config.min_answer_length:
                continue
            if len(text) > self.config.max_answer_length:
                continue

            # Get the sentence containing this entity
            sentence = self._get_sentence_for_span(ent)

            # Calculate type-based importance
            type_importance = ENTITY_TYPE_WEIGHTS.get(ent.label_, 0.5)

            answer = ExtractedAnswer(
                text=text,
                entity_type="entity",
                importance_score=type_importance,
                char_start=ent.start_char,
                char_end=ent.end_char,
                sentence_context=sentence,
                ner_label=ent.label_,
            )
            answers.append(answer)
            seen_texts.add(text_lower)

        return answers

    def _extract_noun_phrases(self, doc: Doc) -> List[ExtractedAnswer]:
        """Extract key noun phrases from the document."""
        answers = []
        seen_texts: Set[str] = set()

        for chunk in doc.noun_chunks:
            # Clean the noun phrase
            text = chunk.text.strip()
            text_lower = text.lower()

            # Skip stopword-only phrases, pronouns, and duplicates
            if text_lower in seen_texts:
                continue
            if chunk.root.pos_ in ("PRON", "DET"):
                continue
            if all(token.is_stop for token in chunk):
                continue
            if len(text) < self.config.min_answer_length:
                continue
            if len(text) > self.config.max_answer_length:
                continue

            # Skip if this is already captured as an entity
            is_entity = any(
                ent.start <= chunk.start and ent.end >= chunk.end
                for ent in doc.ents
            )
            if is_entity:
                continue

            sentence = self._get_sentence_for_span(chunk)

            # Lower importance for generic noun phrases
            importance = 0.5 if chunk.root.pos_ == "PROPN" else 0.35

            answer = ExtractedAnswer(
                text=text,
                entity_type="noun_phrase",
                importance_score=importance,
                char_start=chunk.start_char,
                char_end=chunk.end_char,
                sentence_context=sentence,
            )
            answers.append(answer)
            seen_texts.add(text_lower)

        return answers

    def _extract_numbers(self, doc: Doc) -> List[ExtractedAnswer]:
        """Extract significant numbers and quantities."""
        answers = []
        seen_texts: Set[str] = set()

        for token in doc:
            if token.like_num or token.pos_ == "NUM":
                # Get the full number expression (e.g., "100 million")
                text = self._get_number_expression(token, doc)
                text_lower = text.lower()

                if text_lower in seen_texts:
                    continue
                if len(text) < self.config.min_answer_length:
                    continue

                sentence = self._get_sentence_for_token(token)

                answer = ExtractedAnswer(
                    text=text,
                    entity_type="number",
                    importance_score=0.4,
                    char_start=token.idx,
                    char_end=token.idx + len(text),
                    sentence_context=sentence,
                )
                answers.append(answer)
                seen_texts.add(text_lower)

        return answers

    def _extract_definitions(
        self, text: str, doc: Doc
    ) -> List[ExtractedAnswer]:
        """Extract terms with their definitions."""
        answers = []
        seen_terms: Set[str] = set()

        for pattern in self.DEFINITION_PATTERNS:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                term = match.group("term").strip()
                term_lower = term.lower()

                if term_lower in seen_terms:
                    continue
                if len(term) < self.config.min_answer_length:
                    continue

                # Get the full sentence as context
                start_idx = match.start()
                sentence_start = text.rfind(".", 0, start_idx) + 1
                sentence_end = text.find(".", start_idx)
                if sentence_end == -1:
                    sentence_end = len(text)
                sentence = text[sentence_start:sentence_end].strip()

                answer = ExtractedAnswer(
                    text=term,
                    entity_type="definition",
                    importance_score=0.9,  # Definitions are high-value answers
                    char_start=match.start("term"),
                    char_end=match.end("term"),
                    sentence_context=sentence,
                )
                answers.append(answer)
                seen_terms.add(term_lower)

        return answers

    def _get_sentence_for_span(self, span: Span) -> str:
        """Get the sentence containing a span."""
        for sent in span.doc.sents:
            if sent.start <= span.start and sent.end >= span.end:
                return sent.text.strip()
        return span.sent.text.strip() if hasattr(span, "sent") else ""

    def _get_sentence_for_token(self, token) -> str:
        """Get the sentence containing a token."""
        return token.sent.text.strip()

    def _get_number_expression(self, token, doc: Doc) -> str:
        """Get the full number expression including units."""
        text = token.text
        # Look ahead for units (e.g., "100 million dollars")
        if token.i + 1 < len(doc):
            next_token = doc[token.i + 1]
            if next_token.text.lower() in (
                "million",
                "billion",
                "trillion",
                "thousand",
                "hundred",
                "percent",
                "%",
            ):
                text += " " + next_token.text
                # Check for currency/unit after that
                if token.i + 2 < len(doc):
                    unit_token = doc[token.i + 2]
                    if unit_token.pos_ in ("NOUN",) or unit_token.text in (
                        "dollars",
                        "euros",
                        "pounds",
                        "years",
                        "days",
                        "hours",
                    ):
                        text += " " + unit_token.text
        return text

    def _deduplicate_answers(
        self, answers: List[ExtractedAnswer]
    ) -> List[ExtractedAnswer]:
        """Remove duplicate and highly overlapping answers."""
        if not answers:
            return []

        # Group by normalized text
        text_to_answers: Dict[str, List[ExtractedAnswer]] = {}
        for answer in answers:
            key = answer.text.lower().strip()
            if key not in text_to_answers:
                text_to_answers[key] = []
            text_to_answers[key].append(answer)

        # Keep the best representative of each group
        unique = []
        for text, group in text_to_answers.items():
            # Sort by importance and take the first
            group.sort(key=lambda a: a.importance_score, reverse=True)
            best = group[0]
            best.frequency = len(group)
            unique.append(best)

        return unique

    def _rank_answers(
        self, answers: List[ExtractedAnswer], doc: Doc
    ) -> List[ExtractedAnswer]:
        """Rank answers by combined importance score."""
        if not answers:
            return []

        total_length = len(doc.text)
        max_frequency = max(a.frequency for a in answers) if answers else 1

        for answer in answers:
            # Position score: earlier = higher (normalized 0-1)
            position_score = 1.0 - (answer.char_start / total_length)
            answer.position_score = position_score

            # Frequency score (normalized)
            freq_score = answer.frequency / max_frequency

            # Combined score
            answer.importance_score = (
                self.config.type_weight * answer.importance_score
                + self.config.position_weight * position_score
                + self.config.frequency_weight * freq_score
            )

        # Sort by final score
        answers.sort(key=lambda a: a.importance_score, reverse=True)
        return answers

    def extract_entities(self, text: str) -> List[ExtractedAnswer]:
        """Extract only named entities from text."""
        doc = self.nlp(text)
        return self._extract_entities(doc)

    def extract_key_terms(self, text: str) -> List[ExtractedAnswer]:
        """Extract key terms and concepts from text."""
        doc = self.nlp(text)
        noun_phrases = self._extract_noun_phrases(doc)
        definitions = self._extract_definitions(text, doc)
        combined = noun_phrases + definitions
        return self._rank_answers(self._deduplicate_answers(combined), doc)

    def rank_answers(
        self,
        answers: List[ExtractedAnswer],
        criterion: str = "importance",
    ) -> List[ExtractedAnswer]:
        """
        Rank answers by specified criterion.

        Args:
            answers: List of answers to rank
            criterion: Ranking criterion (importance, position, frequency)

        Returns:
            Sorted list of answers
        """
        if criterion == "importance":
            return sorted(answers, key=lambda a: a.importance_score, reverse=True)
        elif criterion == "position":
            return sorted(answers, key=lambda a: a.char_start)
        elif criterion == "frequency":
            return sorted(answers, key=lambda a: a.frequency, reverse=True)
        else:
            return answers

    def get_answer_spans(
        self, text: str, answers: List[ExtractedAnswer]
    ) -> List[Tuple[int, int, str]]:
        """Get character spans for highlighting answers in text."""
        return [
            (a.char_start, a.char_end, a.entity_type)
            for a in answers
        ]
