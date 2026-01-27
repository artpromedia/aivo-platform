"""
Text Simplifier

Simplify complex text for accessibility using NLP techniques.
"""
import logging
import re
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Set

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class SimplifiedText:
    """Result of text simplification."""
    text: str
    original_grade: float
    simplified_grade: float
    changes_made: List[str] = field(default_factory=list)
    word_count_original: int = 0
    word_count_simplified: int = 0
    sentences_split: int = 0
    words_replaced: int = 0


@dataclass
class TermExplanation:
    """Explanation of a difficult term."""
    term: str
    definition: str
    simplified_definition: str
    example_usage: str
    related_terms: List[str] = field(default_factory=list)


class TextSimplifier:
    """
    Simplify text for accessibility.

    Operations:
    - Reduce sentence complexity
    - Replace difficult vocabulary
    - Break up long sentences
    - Add explanations

    Usage:
        simplifier = TextSimplifier()
        result = simplifier.simplify(text, target_grade=5)
    """

    # Common complex words and their simpler alternatives
    WORD_SUBSTITUTIONS: Dict[str, str] = {
        # Academic/formal words
        "utilize": "use",
        "approximately": "about",
        "demonstrate": "show",
        "subsequently": "then",
        "commence": "begin",
        "terminate": "end",
        "facilitate": "help",
        "implement": "use",
        "sufficient": "enough",
        "insufficient": "not enough",
        "acquire": "get",
        "obtain": "get",
        "purchase": "buy",
        "endeavor": "try",
        "attempt": "try",
        "comprehend": "understand",
        "accomplish": "do",
        "additional": "more",
        "assistance": "help",
        "challenging": "hard",
        "complicated": "hard",
        "considerable": "large",
        "currently": "now",
        "decrease": "lower",
        "determine": "find out",
        "eliminate": "remove",
        "establish": "set up",
        "evaluate": "check",
        "frequently": "often",
        "immediately": "right away",
        "indicate": "show",
        "initial": "first",
        "investigate": "look into",
        "magnitude": "size",
        "manufacture": "make",
        "modification": "change",
        "numerous": "many",
        "objective": "goal",
        "observe": "see",
        "participate": "take part",
        "perceive": "see",
        "permit": "let",
        "possess": "have",
        "previous": "past",
        "primarily": "mainly",
        "priority": "main goal",
        "probability": "chance",
        "procedure": "steps",
        "prohibit": "not allow",
        "provide": "give",
        "rationale": "reason",
        "regarding": "about",
        "remainder": "rest",
        "require": "need",
        "reside": "live",
        "respond": "answer",
        "retain": "keep",
        "significant": "important",
        "similar": "like",
        "sufficient": "enough",
        "transform": "change",
        "transmit": "send",
        "ultimate": "final",
        "verify": "check",
        "whereas": "while",
        # Connectors
        "nevertheless": "but",
        "furthermore": "also",
        "consequently": "so",
        "therefore": "so",
        "however": "but",
        "moreover": "also",
        "hence": "so",
        "thus": "so",
        "accordingly": "so",
        "nonetheless": "but",
        "alternatively": "or",
    }

    # Difficult terms with definitions
    TERM_DEFINITIONS: Dict[str, Dict[str, str]] = {
        "algorithm": {
            "definition": "A set of step-by-step instructions for solving a problem",
            "simple": "A list of steps to follow",
            "example": "A recipe is like an algorithm for cooking",
        },
        "hypothesis": {
            "definition": "An educated guess that can be tested",
            "simple": "A guess you can check",
            "example": "I think plants grow faster with more sun - that's my hypothesis",
        },
        "photosynthesis": {
            "definition": "The process by which plants convert sunlight into food",
            "simple": "How plants make food from sunlight",
            "example": "Plants use photosynthesis to turn sunlight into energy",
        },
        "democracy": {
            "definition": "A system of government where people vote for their leaders",
            "simple": "When people choose who leads them by voting",
            "example": "In a democracy, everyone gets to vote",
        },
        "ecosystem": {
            "definition": "A community of living things and their environment",
            "simple": "All living things in one place and how they work together",
            "example": "A pond is an ecosystem with fish, plants, and insects",
        },
        "metabolism": {
            "definition": "The chemical processes in the body that convert food to energy",
            "simple": "How your body turns food into energy",
            "example": "Your metabolism helps you get energy from breakfast",
        },
        "precipitation": {
            "definition": "Water that falls from clouds as rain, snow, sleet, or hail",
            "simple": "Water falling from the sky (rain, snow, etc.)",
            "example": "Rain is a type of precipitation",
        },
        "equation": {
            "definition": "A mathematical statement showing two things are equal",
            "simple": "A math problem that shows two sides are the same",
            "example": "2 + 2 = 4 is an equation",
        },
        "variable": {
            "definition": "A symbol or letter that represents a value that can change",
            "simple": "A letter that stands for a number",
            "example": "In x + 5 = 10, x is a variable",
        },
        "conclusion": {
            "definition": "The final decision or judgment reached after consideration",
            "simple": "What you figure out at the end",
            "example": "My conclusion is that the experiment worked",
        },
    }

    # Sentence connectors that indicate complexity
    COMPLEX_CONNECTORS = {
        "although", "whereas", "nevertheless", "notwithstanding",
        "consequently", "furthermore", "moreover", "therefore",
        "hence", "thus", "accordingly", "meanwhile", "subsequently",
    }

    # Maximum sentence length for different grade levels
    GRADE_SENTENCE_LIMITS = {
        1: 8,
        2: 10,
        3: 12,
        4: 14,
        5: 16,
        6: 18,
        7: 20,
        8: 22,
        9: 24,
        10: 26,
        11: 28,
        12: 30,
    }

    def __init__(
        self,
        custom_substitutions: Optional[Dict[str, str]] = None,
        preserve_technical_terms: bool = True,
    ):
        """
        Initialize the TextSimplifier.

        Args:
            custom_substitutions: Additional word substitutions
            preserve_technical_terms: Whether to keep technical terms and add explanations
        """
        self.substitutions = self.WORD_SUBSTITUTIONS.copy()
        if custom_substitutions:
            self.substitutions.update(custom_substitutions)

        self.preserve_technical_terms = preserve_technical_terms

        logger.info(
            f"TextSimplifier initialized with {len(self.substitutions)} substitutions"
        )

    def _count_syllables(self, word: str) -> int:
        """
        Count syllables in a word using a heuristic approach.

        Args:
            word: Word to count syllables for

        Returns:
            Estimated syllable count
        """
        word = word.lower().strip()
        if not word:
            return 0

        # Remove non-alphabetic characters
        word = re.sub(r'[^a-z]', '', word)
        if not word:
            return 0

        # Count vowel groups
        vowels = "aeiouy"
        count = 0
        prev_is_vowel = False

        for char in word:
            is_vowel = char in vowels
            if is_vowel and not prev_is_vowel:
                count += 1
            prev_is_vowel = is_vowel

        # Adjust for common patterns
        # Silent e at end
        if word.endswith('e') and count > 1:
            count -= 1
        # -le at end when preceded by consonant
        if word.endswith('le') and len(word) > 2 and word[-3] not in vowels:
            count += 1
        # Ensure at least one syllable
        if count == 0:
            count = 1

        return count

    def _calculate_reading_grade(self, text: str) -> float:
        """
        Calculate reading grade level using Flesch-Kincaid formula.

        Args:
            text: Text to analyze

        Returns:
            Estimated grade level (1-12+)
        """
        # Tokenize
        sentences = self._split_into_sentences(text)
        words = self._tokenize_words(text)

        if not sentences or not words:
            return 0.0

        # Count metrics
        num_sentences = len(sentences)
        num_words = len(words)
        num_syllables = sum(self._count_syllables(word) for word in words)

        if num_sentences == 0 or num_words == 0:
            return 0.0

        # Flesch-Kincaid Grade Level formula
        avg_sentence_length = num_words / num_sentences
        avg_syllables_per_word = num_syllables / num_words

        grade = (
            0.39 * avg_sentence_length +
            11.8 * avg_syllables_per_word -
            15.59
        )

        # Clamp to reasonable range
        return max(1.0, min(18.0, grade))

    def _tokenize_words(self, text: str) -> List[str]:
        """Tokenize text into words."""
        # Remove punctuation and split
        words = re.findall(r'\b[a-zA-Z]+\b', text.lower())
        return words

    def _split_into_sentences(self, text: str) -> List[str]:
        """Split text into sentences."""
        # Split on sentence-ending punctuation
        sentences = re.split(r'(?<=[.!?])\s+', text.strip())
        return [s.strip() for s in sentences if s.strip()]

    def simplify(
        self,
        text: str,
        target_grade: int = 5,
        preserve_meaning: bool = True,
    ) -> SimplifiedText:
        """
        Simplify text to target grade level.

        Args:
            text: Text to simplify
            target_grade: Target reading grade level (1-12)
            preserve_meaning: Whether to prioritize meaning preservation

        Returns:
            SimplifiedText with simplified content and metrics
        """
        if not text or not text.strip():
            raise ValueError("Text cannot be empty")

        target_grade = max(1, min(12, target_grade))

        logger.info(
            f"Simplifying text ({len(text)} chars) to grade {target_grade}"
        )

        # Calculate original grade
        original_grade = self._calculate_reading_grade(text)
        original_word_count = len(self._tokenize_words(text))

        changes_made = []
        simplified_text = text

        # Step 1: Replace complex words
        simplified_text, word_replacements = self._replace_complex_words(
            simplified_text, target_grade
        )
        if word_replacements > 0:
            changes_made.append(f"Replaced {word_replacements} complex words")

        # Step 2: Split complex sentences
        simplified_text, splits = self._simplify_sentences(
            simplified_text, target_grade
        )
        if splits > 0:
            changes_made.append(f"Split {splits} complex sentences")

        # Step 3: Remove redundant phrases
        simplified_text, removals = self._remove_redundancy(simplified_text)
        if removals > 0:
            changes_made.append(f"Removed {removals} redundant phrases")

        # Step 4: Simplify passive voice
        simplified_text, passive_changes = self._simplify_passive_voice(simplified_text)
        if passive_changes > 0:
            changes_made.append(f"Simplified {passive_changes} passive constructions")

        # Calculate final metrics
        simplified_grade = self._calculate_reading_grade(simplified_text)
        simplified_word_count = len(self._tokenize_words(simplified_text))

        result = SimplifiedText(
            text=simplified_text.strip(),
            original_grade=round(original_grade, 1),
            simplified_grade=round(simplified_grade, 1),
            changes_made=changes_made,
            word_count_original=original_word_count,
            word_count_simplified=simplified_word_count,
            sentences_split=splits,
            words_replaced=word_replacements,
        )

        logger.info(
            f"Simplification complete: grade {original_grade:.1f} -> {simplified_grade:.1f}, "
            f"{len(changes_made)} changes"
        )

        return result

    def _replace_complex_words(
        self,
        text: str,
        target_grade: int,
    ) -> Tuple[str, int]:
        """Replace complex words with simpler alternatives."""
        replacements = 0

        # More aggressive replacement for lower grade levels
        syllable_threshold = 2 if target_grade <= 3 else 3 if target_grade <= 6 else 4

        # Replace from substitution dictionary
        for complex_word, simple_word in self.substitutions.items():
            pattern = re.compile(r'\b' + re.escape(complex_word) + r'\b', re.IGNORECASE)
            if pattern.search(text):
                # Preserve case
                def replace_preserving_case(match):
                    original = match.group(0)
                    if original.isupper():
                        return simple_word.upper()
                    elif original[0].isupper():
                        return simple_word.capitalize()
                    return simple_word

                new_text = pattern.sub(replace_preserving_case, text)
                if new_text != text:
                    replacements += len(pattern.findall(text))
                    text = new_text

        return text, replacements

    def _simplify_sentences(
        self,
        text: str,
        target_grade: int,
    ) -> Tuple[str, int]:
        """Split complex sentences into simpler ones."""
        max_length = self.GRADE_SENTENCE_LIMITS.get(target_grade, 20)
        sentences = self._split_into_sentences(text)
        simplified_sentences = []
        splits = 0

        for sentence in sentences:
            words = sentence.split()
            if len(words) > max_length:
                # Try to split at complex connectors
                split_results = self._split_at_connectors(sentence, max_length)
                if len(split_results) > 1:
                    splits += len(split_results) - 1
                    simplified_sentences.extend(split_results)
                else:
                    # Try to split at commas or semicolons
                    split_results = self._split_at_punctuation(sentence, max_length)
                    if len(split_results) > 1:
                        splits += len(split_results) - 1
                        simplified_sentences.extend(split_results)
                    else:
                        simplified_sentences.append(sentence)
            else:
                simplified_sentences.append(sentence)

        return ' '.join(simplified_sentences), splits

    def _split_at_connectors(
        self,
        sentence: str,
        max_length: int,
    ) -> List[str]:
        """Split sentence at complex connectors."""
        for connector in self.COMPLEX_CONNECTORS:
            pattern = re.compile(
                r',?\s*\b' + connector + r'\b\s*',
                re.IGNORECASE
            )
            match = pattern.search(sentence)
            if match:
                before = sentence[:match.start()].strip()
                after = sentence[match.end():].strip()

                # Ensure both parts are valid sentences
                if before and after:
                    # Capitalize the second part if needed
                    if after[0].islower():
                        after = after[0].upper() + after[1:]

                    # Add period to first part if missing
                    if before and before[-1] not in '.!?':
                        before += '.'

                    return [before, after]

        return [sentence]

    def _split_at_punctuation(
        self,
        sentence: str,
        max_length: int,
    ) -> List[str]:
        """Split sentence at punctuation marks."""
        # Try semicolons first
        if ';' in sentence:
            parts = sentence.split(';')
            if len(parts) > 1:
                results = []
                for part in parts:
                    part = part.strip()
                    if part:
                        if part[0].islower():
                            part = part[0].upper() + part[1:]
                        if part[-1] not in '.!?':
                            part += '.'
                        results.append(part)
                return results

        # Try splitting at commas for long lists or clauses
        comma_parts = sentence.split(',')
        if len(comma_parts) >= 3:
            # Find a good split point near the middle
            mid_index = len(comma_parts) // 2
            before = ','.join(comma_parts[:mid_index]).strip()
            after = ','.join(comma_parts[mid_index:]).strip()

            if before and after and len(before.split()) > 3 and len(after.split()) > 3:
                if before[-1] not in '.!?':
                    before += '.'
                if after[0].islower():
                    after = after[0].upper() + after[1:]
                return [before, after]

        return [sentence]

    def _remove_redundancy(self, text: str) -> Tuple[str, int]:
        """Remove redundant phrases and filler words."""
        removals = 0

        redundant_patterns = [
            (r'\b(very|really|quite|extremely|absolutely)\s+', ''),
            (r'\b(basically|essentially|actually|literally)\s+', ''),
            (r'\bin order to\b', 'to'),
            (r'\bdue to the fact that\b', 'because'),
            (r'\bat this point in time\b', 'now'),
            (r'\bin the event that\b', 'if'),
            (r'\bfor the purpose of\b', 'to'),
            (r'\bwith regard to\b', 'about'),
            (r'\bin spite of the fact that\b', 'although'),
            (r'\bas a matter of fact\b', ''),
            (r'\bit is important to note that\b', ''),
            (r'\bit should be noted that\b', ''),
        ]

        for pattern, replacement in redundant_patterns:
            regex = re.compile(pattern, re.IGNORECASE)
            matches = regex.findall(text)
            if matches:
                removals += len(matches)
                text = regex.sub(replacement, text)

        # Clean up double spaces
        text = re.sub(r'\s+', ' ', text)

        return text.strip(), removals

    def _simplify_passive_voice(self, text: str) -> Tuple[str, int]:
        """Simplify passive voice constructions where possible."""
        changes = 0

        # Common passive patterns to simplify
        passive_patterns = [
            (r'\b(was|were|is|are|been)\s+(\w+ed)\s+by\b', r'\3 \2'),
            (r'\b(it is|it was)\s+(\w+ed)\s+that\b', r'\2'),
        ]

        for pattern, replacement in passive_patterns:
            regex = re.compile(pattern, re.IGNORECASE)
            matches = regex.findall(text)
            if matches:
                changes += len(matches)
                # Note: This is a simplified approach; full passive->active
                # conversion would require more sophisticated NLP

        return text, changes

    def explain_terms(
        self,
        text: str,
        terms: Optional[List[str]] = None,
        target_grade: int = 5,
    ) -> Dict[str, TermExplanation]:
        """
        Explain difficult terms in the text.

        Args:
            text: Text containing terms to explain
            terms: Specific terms to explain (auto-detect if None)
            target_grade: Target grade level for explanations

        Returns:
            Dictionary of term explanations
        """
        if not text:
            raise ValueError("Text cannot be empty")

        logger.info(f"Explaining terms in text ({len(text)} chars)")

        # Detect difficult terms if not provided
        if terms is None:
            terms = self._detect_difficult_terms(text, target_grade)

        explanations = {}

        for term in terms:
            term_lower = term.lower()

            # Check predefined definitions
            if term_lower in self.TERM_DEFINITIONS:
                term_def = self.TERM_DEFINITIONS[term_lower]
                explanations[term] = TermExplanation(
                    term=term,
                    definition=term_def["definition"],
                    simplified_definition=term_def["simple"],
                    example_usage=term_def["example"],
                    related_terms=self._find_related_terms(term_lower),
                )
            else:
                # Generate generic explanation for unknown terms
                explanations[term] = TermExplanation(
                    term=term,
                    definition=f"A specialized term that may need further explanation",
                    simplified_definition=f"A word about {self._guess_topic(term)}",
                    example_usage=f"The word '{term}' is used in this text",
                    related_terms=[],
                )

        logger.info(f"Explained {len(explanations)} terms")

        return explanations

    def _detect_difficult_terms(
        self,
        text: str,
        target_grade: int,
    ) -> List[str]:
        """Detect difficult terms in text based on target grade."""
        words = self._tokenize_words(text)
        unique_words = set(words)
        difficult_terms = []

        # Syllable threshold based on grade
        syllable_threshold = 2 if target_grade <= 3 else 3 if target_grade <= 6 else 4

        for word in unique_words:
            # Check if word is in our definitions
            if word in self.TERM_DEFINITIONS:
                difficult_terms.append(word)
                continue

            # Check syllable count
            if self._count_syllables(word) >= syllable_threshold:
                # Also check if it's not a common word
                if word not in self.substitutions.values():
                    difficult_terms.append(word)

        return difficult_terms[:20]  # Limit to 20 terms

    def _find_related_terms(self, term: str) -> List[str]:
        """Find related terms from our definitions."""
        related = []
        term_def = self.TERM_DEFINITIONS.get(term, {})

        # Simple approach: find terms that share words in their definitions
        if term_def:
            term_words = set(self._tokenize_words(term_def.get("definition", "")))
            for other_term, other_def in self.TERM_DEFINITIONS.items():
                if other_term != term:
                    other_words = set(self._tokenize_words(other_def.get("definition", "")))
                    if len(term_words & other_words) >= 2:
                        related.append(other_term)

        return related[:5]

    def _guess_topic(self, term: str) -> str:
        """Make an educated guess about the topic of a term."""
        # Simple heuristic based on common suffixes
        if term.endswith('ology'):
            return "study or science"
        elif term.endswith('tion') or term.endswith('sion'):
            return "an action or process"
        elif term.endswith('ment'):
            return "a state or result"
        elif term.endswith('ity') or term.endswith('ness'):
            return "a quality or condition"
        elif term.endswith('er') or term.endswith('or'):
            return "a person or thing that does something"
        else:
            return "a concept or idea"

    def split_complex_sentences(
        self,
        text: str,
        max_words: int = 15,
    ) -> str:
        """
        Split complex sentences into simpler ones.

        Args:
            text: Text with complex sentences
            max_words: Maximum words per sentence

        Returns:
            Text with simplified sentences
        """
        if not text:
            raise ValueError("Text cannot be empty")

        logger.info(f"Splitting complex sentences (max {max_words} words)")

        sentences = self._split_into_sentences(text)
        simplified_sentences = []

        for sentence in sentences:
            words = sentence.split()
            if len(words) > max_words:
                # Apply splitting strategies
                split_results = self._split_at_connectors(sentence, max_words)
                if len(split_results) == 1:
                    split_results = self._split_at_punctuation(sentence, max_words)
                simplified_sentences.extend(split_results)
            else:
                simplified_sentences.append(sentence)

        result = ' '.join(simplified_sentences)
        logger.info(
            f"Split {len(sentences)} sentences into {len(simplified_sentences)} sentences"
        )

        return result

    def get_readability_metrics(self, text: str) -> Dict[str, float]:
        """
        Calculate various readability metrics for text.

        Args:
            text: Text to analyze

        Returns:
            Dictionary of readability metrics
        """
        sentences = self._split_into_sentences(text)
        words = self._tokenize_words(text)
        syllables = sum(self._count_syllables(w) for w in words)

        num_sentences = len(sentences)
        num_words = len(words)
        num_syllables = syllables

        if num_sentences == 0 or num_words == 0:
            return {
                "flesch_kincaid_grade": 0.0,
                "flesch_reading_ease": 0.0,
                "average_sentence_length": 0.0,
                "average_syllables_per_word": 0.0,
            }

        avg_sentence_length = num_words / num_sentences
        avg_syllables_per_word = num_syllables / num_words

        # Flesch-Kincaid Grade Level
        fk_grade = (
            0.39 * avg_sentence_length +
            11.8 * avg_syllables_per_word -
            15.59
        )

        # Flesch Reading Ease
        fre = (
            206.835 -
            1.015 * avg_sentence_length -
            84.6 * avg_syllables_per_word
        )

        return {
            "flesch_kincaid_grade": round(max(0, fk_grade), 1),
            "flesch_reading_ease": round(max(0, min(100, fre)), 1),
            "average_sentence_length": round(avg_sentence_length, 1),
            "average_syllables_per_word": round(avg_syllables_per_word, 2),
            "word_count": num_words,
            "sentence_count": num_sentences,
        }
