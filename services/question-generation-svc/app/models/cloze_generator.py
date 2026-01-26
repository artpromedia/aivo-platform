"""
Cloze Generator.

Generates fill-in-the-blank (cloze) items from educational text.
Supports multiple cloze types:
1. Single blank - mask one key term
2. Multiple blanks - mask related terms
3. Rational cloze - blanks every nth word
4. Selective cloze - blanks specific POS (nouns, verbs)
5. MCQ cloze - blanks with distractor options
"""

import logging
import random
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional, Set, Tuple, Dict

logger = logging.getLogger(__name__)


class ClozeType(str, Enum):
    """Types of cloze questions."""
    SINGLE = "single"
    MULTIPLE = "multiple"
    RATIONAL = "rational"
    SELECTIVE = "selective"
    MCQ = "mcq"


class POSType(str, Enum):
    """Part-of-speech types for selective cloze."""
    NOUN = "noun"
    VERB = "verb"
    ADJECTIVE = "adjective"
    ADVERB = "adverb"
    ALL_CONTENT = "all_content"


@dataclass
class ClozeItem:
    """A single cloze (fill-in-blank) item."""

    text_with_blank: str  # Text with _____ marking the blank
    answer: str  # The correct answer
    original_sentence: str  # Original sentence with answer
    hint: Optional[str] = None  # Optional hint
    difficulty: float = 0.5  # Estimated difficulty 0-1
    blank_type: str = "key_term"  # Type: key_term, entity, definition, etc.
    context_sentence: str = ""  # For backward compatibility
    char_start: int = 0  # Start position of blank in original text
    char_end: int = 0  # End position of blank in original text
    distractors: List[str] = field(default_factory=list)  # For MCQ cloze
    blank_index: int = 0  # Index when multiple blanks
    total_blanks: int = 1  # Total blanks in this item


@dataclass
class ClozeQuestion:
    """A complete cloze question with potentially multiple blanks."""

    original_sentence: str  # Full original sentence
    blanked_sentence: str  # Sentence with all blanks
    answers: List[str]  # Answers in order
    hints: List[str]  # Hints for each blank
    distractors: List[List[str]]  # Distractors for each blank (for MCQ)
    difficulty: float = 0.5
    cloze_type: ClozeType = ClozeType.SINGLE
    blank_positions: List[Tuple[int, int]] = field(default_factory=list)


@dataclass
class ClozeGeneratorConfig:
    """Configuration for cloze generation."""

    spacy_model: str = "en_core_web_sm"
    blank_marker: str = "_____"
    numbered_blank_format: str = "___({n})___"  # For multiple blanks
    min_word_length: int = 3
    max_items: int = 10
    include_hints: bool = True
    difficulty_variation: bool = True
    # Rational cloze settings
    rational_nth_word: int = 5
    rational_skip_stopwords: bool = True
    # Selective cloze settings
    selective_pos_tags: List[str] = field(default_factory=lambda: ["NOUN", "VERB"])
    # Distractor settings
    num_distractors: int = 3
    distractor_methods: List[str] = field(
        default_factory=lambda: ["semantic", "wordnet", "same_pos"]
    )


class ClozeGenerator:
    """
    Generate cloze (fill-in-blank) items from educational text.

    Supports multiple types of cloze generation:
    - Single blank: Remove one important term
    - Multiple blanks: Remove multiple related terms from a passage
    - Rational cloze: Remove every nth word
    - Selective cloze: Remove specific parts of speech (nouns, verbs, etc.)
    - MCQ cloze: Provide distractor options for each blank

    Usage:
        generator = ClozeGenerator()

        # Single blank
        items = generator.generate(
            "The Eiffel Tower is located in Paris, France.",
            num_blanks=1,
            cloze_type="single"
        )

        # Multiple blanks with distractors
        questions = generator.generate_cloze(
            "The mitochondria is the powerhouse of the cell.",
            num_blanks=2,
            cloze_type="mcq"
        )
    """

    # Word categories that should not be blanked
    STOPWORDS = {
        "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
        "have", "has", "had", "do", "does", "did", "will", "would", "could",
        "should", "may", "might", "must", "shall", "can", "of", "to", "in",
        "for", "on", "with", "at", "by", "from", "or", "and", "not", "but",
        "if", "then", "that", "this", "these", "those", "it", "its", "as",
        "so", "than", "such", "very", "just", "also", "only", "even", "more",
        "most", "other", "some", "any", "all", "each", "every", "both", "few"
    }

    # POS tags for key content words
    CONTENT_POS = {"NOUN", "PROPN", "VERB", "ADJ", "NUM"}

    # POS mappings for selective cloze
    POS_MAPPING = {
        POSType.NOUN: {"NOUN", "PROPN"},
        POSType.VERB: {"VERB"},
        POSType.ADJECTIVE: {"ADJ"},
        POSType.ADVERB: {"ADV"},
        POSType.ALL_CONTENT: {"NOUN", "PROPN", "VERB", "ADJ", "ADV"},
    }

    def __init__(self, config: Optional[ClozeGeneratorConfig] = None):
        """Initialize the cloze generator."""
        self.config = config or ClozeGeneratorConfig()
        self._nlp = None
        self._loaded = False
        self._word_vectors = None
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
        Generate cloze items from text (backward compatible interface).

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
        )[:num_items * 2]

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
                original_sentence=sentence,
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

    def generate_cloze(
        self,
        passage: str,
        num_blanks: int = 1,
        cloze_type: str = "single",
        pos_filter: Optional[str] = None,
        include_distractors: bool = False,
    ) -> List[ClozeQuestion]:
        """
        Generate cloze questions with advanced options.

        Args:
            passage: Source text
            num_blanks: Number of blanks per question
            cloze_type: Type of cloze ("single", "multiple", "rational", "selective", "mcq")
            pos_filter: POS filter for selective cloze ("noun", "verb", "adjective", "adverb")
            include_distractors: Include distractor options for MCQ

        Returns:
            List of ClozeQuestion objects
        """
        nlp = self._load_spacy()
        doc = nlp(passage)

        questions = []

        if cloze_type == "single":
            questions = self._generate_single_blank(doc, include_distractors)
        elif cloze_type == "multiple":
            questions = self._generate_multiple_blanks(doc, num_blanks, include_distractors)
        elif cloze_type == "rational":
            questions = self._generate_rational_cloze(doc, include_distractors)
        elif cloze_type == "selective":
            pos_type = POSType(pos_filter) if pos_filter else POSType.NOUN
            questions = self._generate_selective_cloze(doc, pos_type, include_distractors)
        elif cloze_type == "mcq":
            questions = self._generate_mcq_cloze(doc, num_blanks)
        else:
            questions = self._generate_single_blank(doc, include_distractors)

        return questions

    def _generate_single_blank(
        self,
        doc,
        include_distractors: bool = False
    ) -> List[ClozeQuestion]:
        """Generate single-blank cloze questions for each sentence."""
        questions = []

        for sent in doc.sents:
            # Find best candidate for blanking in this sentence
            candidates = []
            for token in sent:
                if self._is_blankable(token):
                    importance = self._calculate_token_importance(token, doc)
                    candidates.append((token, importance))

            if not candidates:
                continue

            # Pick the most important term
            candidates.sort(key=lambda x: x[1], reverse=True)
            best_token = candidates[0][0]

            # Create the blanked sentence
            blanked = self._blank_token_in_sentence(sent.text, best_token)

            # Generate distractors if needed
            distractors = []
            if include_distractors:
                distractors = [self._generate_distractors_for_token(best_token, doc)]

            # Generate hint
            hint = self._generate_hint(best_token.text, doc)

            question = ClozeQuestion(
                original_sentence=sent.text,
                blanked_sentence=blanked,
                answers=[best_token.text],
                hints=[hint] if hint else [],
                distractors=distractors,
                difficulty=self._estimate_difficulty(best_token.text, sent.text, "key_term"),
                cloze_type=ClozeType.SINGLE,
            )
            questions.append(question)

        return questions

    def _generate_multiple_blanks(
        self,
        doc,
        num_blanks: int,
        include_distractors: bool = False
    ) -> List[ClozeQuestion]:
        """Generate cloze questions with multiple blanks in related terms."""
        questions = []

        for sent in doc.sents:
            # Find all blankable candidates
            candidates = []
            for token in sent:
                if self._is_blankable(token):
                    importance = self._calculate_token_importance(token, doc)
                    candidates.append((token, importance))

            if len(candidates) < num_blanks:
                continue

            # Pick top N candidates
            candidates.sort(key=lambda x: x[1], reverse=True)
            selected_tokens = [c[0] for c in candidates[:num_blanks]]

            # Sort by position for consistent blanking
            selected_tokens.sort(key=lambda t: t.idx)

            # Create blanked sentence with numbered blanks
            blanked = sent.text
            answers = []
            hints = []
            distractors = []

            # Process in reverse order to maintain positions
            for i, token in enumerate(reversed(selected_tokens)):
                actual_idx = num_blanks - 1 - i
                blank_marker = self.config.numbered_blank_format.format(n=actual_idx + 1)

                # Find token position in sentence
                token_start = token.idx - sent.start_char
                token_end = token_start + len(token.text)

                blanked = blanked[:token_start] + blank_marker + blanked[token_end:]

            # Collect answers and hints in order
            for token in selected_tokens:
                answers.append(token.text)
                hints.append(self._generate_hint(token.text, doc) or "")
                if include_distractors:
                    distractors.append(self._generate_distractors_for_token(token, doc))

            question = ClozeQuestion(
                original_sentence=sent.text,
                blanked_sentence=blanked,
                answers=answers,
                hints=hints,
                distractors=distractors,
                difficulty=self._estimate_difficulty(answers[0], sent.text, "multiple"),
                cloze_type=ClozeType.MULTIPLE,
            )
            questions.append(question)

        return questions

    def _generate_rational_cloze(
        self,
        doc,
        include_distractors: bool = False
    ) -> List[ClozeQuestion]:
        """Generate rational cloze - blanks every nth word."""
        questions = []
        n = self.config.rational_nth_word

        for sent in doc.sents:
            tokens = [t for t in sent]
            word_count = 0
            blanked_tokens = []
            answers = []
            hints = []
            distractors = []

            for token in tokens:
                # Skip punctuation and spaces
                if token.is_punct or token.is_space:
                    continue

                word_count += 1

                # Blank every nth word (skip stopwords if configured)
                if word_count % n == 0:
                    if self.config.rational_skip_stopwords and token.text.lower() in self.STOPWORDS:
                        continue
                    blanked_tokens.append(token)
                    answers.append(token.text)
                    hints.append(self._generate_hint(token.text, doc) or "")
                    if include_distractors:
                        distractors.append(self._generate_distractors_for_token(token, doc))

            if not blanked_tokens:
                continue

            # Create blanked sentence
            blanked = sent.text
            for i, token in enumerate(reversed(blanked_tokens)):
                actual_idx = len(blanked_tokens) - 1 - i
                blank_marker = self.config.numbered_blank_format.format(n=actual_idx + 1)
                token_start = token.idx - sent.start_char
                token_end = token_start + len(token.text)
                blanked = blanked[:token_start] + blank_marker + blanked[token_end:]

            question = ClozeQuestion(
                original_sentence=sent.text,
                blanked_sentence=blanked,
                answers=answers,
                hints=hints,
                distractors=distractors,
                difficulty=0.6,  # Rational cloze is generally harder
                cloze_type=ClozeType.RATIONAL,
            )
            questions.append(question)

        return questions

    def _generate_selective_cloze(
        self,
        doc,
        pos_type: POSType,
        include_distractors: bool = False
    ) -> List[ClozeQuestion]:
        """Generate selective cloze - blanks specific parts of speech."""
        questions = []
        target_pos = self.POS_MAPPING.get(pos_type, {"NOUN"})

        for sent in doc.sents:
            blanked_tokens = []
            answers = []
            hints = []
            distractors = []

            for token in sent:
                if token.pos_ in target_pos and not token.is_stop:
                    if len(token.text) >= self.config.min_word_length:
                        blanked_tokens.append(token)
                        answers.append(token.text)
                        hints.append(self._generate_hint(token.text, doc) or "")
                        if include_distractors:
                            distractors.append(self._generate_distractors_for_token(token, doc))

            if not blanked_tokens:
                continue

            # Create blanked sentence
            blanked = sent.text
            for i, token in enumerate(reversed(blanked_tokens)):
                actual_idx = len(blanked_tokens) - 1 - i
                blank_marker = self.config.numbered_blank_format.format(n=actual_idx + 1)
                token_start = token.idx - sent.start_char
                token_end = token_start + len(token.text)
                blanked = blanked[:token_start] + blank_marker + blanked[token_end:]

            question = ClozeQuestion(
                original_sentence=sent.text,
                blanked_sentence=blanked,
                answers=answers,
                hints=hints,
                distractors=distractors,
                difficulty=0.5,
                cloze_type=ClozeType.SELECTIVE,
            )
            questions.append(question)

        return questions

    def _generate_mcq_cloze(
        self,
        doc,
        num_blanks: int = 1
    ) -> List[ClozeQuestion]:
        """Generate MCQ cloze with multiple distractor options."""
        questions = []

        for sent in doc.sents:
            # Find blankable candidates
            candidates = []
            for token in sent:
                if self._is_blankable(token):
                    importance = self._calculate_token_importance(token, doc)
                    candidates.append((token, importance))

            if not candidates:
                continue

            # Select tokens to blank
            candidates.sort(key=lambda x: x[1], reverse=True)
            num_to_blank = min(num_blanks, len(candidates))
            selected_tokens = [c[0] for c in candidates[:num_to_blank]]
            selected_tokens.sort(key=lambda t: t.idx)

            # Generate blanked sentence and collect data
            blanked = sent.text
            answers = []
            hints = []
            distractors = []

            for i, token in enumerate(reversed(selected_tokens)):
                actual_idx = num_to_blank - 1 - i
                blank_marker = self.config.numbered_blank_format.format(n=actual_idx + 1)
                token_start = token.idx - sent.start_char
                token_end = token_start + len(token.text)
                blanked = blanked[:token_start] + blank_marker + blanked[token_end:]

            for token in selected_tokens:
                answers.append(token.text)
                hints.append(self._generate_hint(token.text, doc) or "")
                # Generate high-quality distractors for MCQ
                token_distractors = self._generate_distractors_for_token(token, doc)
                distractors.append(token_distractors)

            question = ClozeQuestion(
                original_sentence=sent.text,
                blanked_sentence=blanked,
                answers=answers,
                hints=hints,
                distractors=distractors,
                difficulty=self._calculate_mcq_difficulty(answers, distractors),
                cloze_type=ClozeType.MCQ,
            )
            questions.append(question)

        return questions

    def _is_blankable(self, token) -> bool:
        """Check if a token can be blanked."""
        return (
            token.pos_ in self.CONTENT_POS
            and not token.is_stop
            and len(token.text) >= self.config.min_word_length
            and token.text.lower() not in self.STOPWORDS
            and not token.is_punct
            and not token.is_space
        )

    def _calculate_token_importance(self, token, doc) -> float:
        """Calculate importance score for a token."""
        score = 0.5

        # Proper nouns are more important
        if token.pos_ == "PROPN":
            score += 0.3

        # Named entities are important
        if token.ent_type_:
            score += 0.2

        # Root of sentence is important
        if token.dep_ == "ROOT":
            score += 0.2

        # Subjects and objects are important
        if token.dep_ in ("nsubj", "dobj", "pobj"):
            score += 0.15

        # Longer words tend to be more specific
        if len(token.text) > 6:
            score += 0.1

        return min(1.0, score)

    def _blank_token_in_sentence(self, sentence: str, token) -> str:
        """Create a sentence with a single token blanked."""
        token_start = sentence.lower().find(token.text.lower())
        if token_start == -1:
            # Try exact match
            if token.text in sentence:
                token_start = sentence.find(token.text)
            else:
                return sentence + f" [{self.config.blank_marker}]"

        return (
            sentence[:token_start]
            + self.config.blank_marker
            + sentence[token_start + len(token.text):]
        )

    def _generate_distractors_for_token(
        self,
        token,
        doc,
        num_distractors: int = None
    ) -> List[str]:
        """Generate distractor options for a token."""
        if num_distractors is None:
            num_distractors = self.config.num_distractors

        distractors = set()

        # Method 1: Same POS from document
        for other_token in doc:
            if (
                other_token.pos_ == token.pos_
                and other_token.text.lower() != token.text.lower()
                and len(other_token.text) >= self.config.min_word_length
                and other_token.text.lower() not in self.STOPWORDS
            ):
                distractors.add(other_token.text)
                if len(distractors) >= num_distractors:
                    break

        # Method 2: WordNet synonyms/hypernyms (if available)
        if len(distractors) < num_distractors:
            try:
                from nltk.corpus import wordnet
                synsets = wordnet.synsets(token.text.lower())
                for synset in synsets[:3]:
                    # Get hypernyms (more general terms)
                    for hypernym in synset.hypernyms()[:2]:
                        for lemma in hypernym.lemmas():
                            name = lemma.name().replace("_", " ")
                            if name.lower() != token.text.lower():
                                distractors.add(name)

                    # Get similar words from same synset
                    for lemma in synset.lemmas():
                        name = lemma.name().replace("_", " ")
                        if name.lower() != token.text.lower():
                            distractors.add(name)
            except:
                pass

        # Method 3: Similar length words with same first letter
        if len(distractors) < num_distractors:
            target_len = len(token.text)
            first_letter = token.text[0].lower()
            for other_token in doc:
                if (
                    other_token.text[0].lower() == first_letter
                    and abs(len(other_token.text) - target_len) <= 2
                    and other_token.text.lower() != token.text.lower()
                    and other_token.text.lower() not in self.STOPWORDS
                ):
                    distractors.add(other_token.text)

        return list(distractors)[:num_distractors]

    def _calculate_mcq_difficulty(
        self,
        answers: List[str],
        distractors: List[List[str]]
    ) -> float:
        """Calculate difficulty for MCQ cloze based on distractor quality."""
        if not distractors or not distractors[0]:
            return 0.5

        # Base difficulty
        difficulty = 0.5

        # More blanks = harder
        difficulty += len(answers) * 0.05

        # Similar length distractors = harder
        for i, answer in enumerate(answers):
            if i < len(distractors) and distractors[i]:
                avg_len_diff = sum(
                    abs(len(d) - len(answer)) for d in distractors[i]
                ) / len(distractors[i])
                if avg_len_diff < 2:
                    difficulty += 0.1

        return min(0.95, difficulty)

    def _select_key_terms(self, doc) -> List[Tuple[str, int, int, float, str]]:
        """Select key terms (nouns, proper nouns) for blanking."""
        candidates = []

        for token in doc:
            if token.pos_ in ("NOUN", "PROPN"):
                if (
                    token.text.lower() not in self.STOPWORDS
                    and len(token.text) >= self.config.min_word_length
                ):
                    position_score = 1.0 - (token.idx / max(len(doc.text), 1))
                    freq_score = 0.5
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
            "GPE": 0.85,
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
                        0.9,
                        "definition"
                    ))

        return candidates

    def _select_vocabulary(self, doc) -> List[Tuple[str, int, int, float, str]]:
        """Select challenging vocabulary words."""
        candidates = []

        for token in doc:
            if token.pos_ in self.CONTENT_POS:
                word = token.text.lower()
                if (
                    word not in self.STOPWORDS
                    and len(token.text) >= 6
                    and not token.is_stop
                ):
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
        answer_pos = sentence.lower().find(answer.lower())
        if answer_pos == -1:
            for i in range(len(sentence) - len(answer) + 1):
                if sentence[i:i+len(answer)].lower() == answer.lower():
                    answer_pos = i
                    break

        if answer_pos == -1:
            return f"{sentence} [{self.config.blank_marker}]"

        return (
            sentence[:answer_pos]
            + self.config.blank_marker
            + sentence[answer_pos + len(answer):]
        )

    def _generate_hint(self, answer: str, doc) -> str:
        """Generate a hint for the blank."""
        if len(answer) == 0:
            return ""

        first_letter_hint = f"Starts with '{answer[0].upper()}'"
        length_hint = f"{len(answer)} letters"

        # Try to get POS hint
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

        return first_letter_hint

    def _estimate_difficulty(
        self,
        answer: str,
        sentence: str,
        blank_type: str,
    ) -> float:
        """Estimate difficulty of a cloze item."""
        difficulty = 0.5

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
            "multiple": 0.65,
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

        if answer:
            hints.append(f"Starts with '{answer[0].upper()}'")
        hints.append(f"{len(answer)} letters")
        if answer:
            hints.append(f"Ends with '{answer[-1].lower()}'")

        return "; ".join(hints[:2])

    def validate_cloze_item(self, item: ClozeItem) -> Tuple[bool, List[str]]:
        """
        Validate a cloze item for quality.

        Returns:
            Tuple of (is_valid, list of issues)
        """
        issues = []

        if self.config.blank_marker not in item.text_with_blank:
            issues.append("Missing blank marker in text")

        if not item.answer or len(item.answer.strip()) == 0:
            issues.append("Empty answer")

        if item.answer.lower() in self.STOPWORDS:
            issues.append("Answer is a stopword")

        if len(item.answer) < self.config.min_word_length:
            issues.append("Answer is too short")

        return len(issues) == 0, issues

    def convert_to_mcq(
        self,
        item: ClozeItem,
        num_distractors: int = 3
    ) -> ClozeItem:
        """
        Convert a regular cloze item to MCQ format with distractors.

        Args:
            item: Original cloze item
            num_distractors: Number of distractors to generate

        Returns:
            ClozeItem with distractors
        """
        nlp = self._load_spacy()
        doc = nlp(item.original_sentence)

        # Find the answer token
        for token in doc:
            if token.text.lower() == item.answer.lower():
                distractors = self._generate_distractors_for_token(
                    token, doc, num_distractors
                )
                return ClozeItem(
                    text_with_blank=item.text_with_blank,
                    answer=item.answer,
                    original_sentence=item.original_sentence,
                    hint=item.hint,
                    difficulty=item.difficulty + 0.1,  # MCQ slightly harder
                    blank_type="mcq",
                    context_sentence=item.context_sentence,
                    char_start=item.char_start,
                    char_end=item.char_end,
                    distractors=distractors,
                )

        # Fallback: return original item
        return item
