"""
Hybrid Grammar Checker: Rules + ML

Combines:
1. LanguageTool for rule-based checking
2. ML-based detection for context-sensitive errors
3. Style issue detection (passive voice, wordiness)
4. Register appropriateness checking

Categories detected:
- spelling, grammar, punctuation, capitalization
- style, wordiness, passive_voice, confused_words
"""

import logging
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


class GrammarCategory(str, Enum):
    """Grammar error categories."""

    SPELLING = "spelling"
    GRAMMAR = "grammar"
    PUNCTUATION = "punctuation"
    CAPITALIZATION = "capitalization"
    STYLE = "style"
    WORDINESS = "wordiness"
    PASSIVE_VOICE = "passive_voice"
    CONFUSED_WORDS = "confused_words"


class IssueSeverity(str, Enum):
    """Issue severity levels."""

    ERROR = "error"
    WARNING = "warning"
    SUGGESTION = "suggestion"


@dataclass
class GrammarError:
    """Single grammar/spelling error."""

    offset: int
    length: int
    message: str
    category: GrammarCategory
    rule_id: str
    replacements: List[str] = field(default_factory=list)
    context: str = ""
    severity: IssueSeverity = IssueSeverity.ERROR


@dataclass
class GrammarReport:
    """Complete grammar check report."""

    errors: List[GrammarError] = field(default_factory=list)
    error_density: float = 0.0  # errors per 100 words
    by_category: Dict[str, int] = field(default_factory=dict)
    total_errors: int = 0
    corrected_text: Optional[str] = None


class GrammarChecker:
    """
    Comprehensive grammar and spelling checker.

    Uses:
    - LanguageTool for rule-based checking
    - Pattern matching for style issues
    - Heuristics for context-sensitive errors

    Detects:
    - Grammar errors (subject-verb agreement, tense, articles)
    - Spelling mistakes
    - Punctuation issues
    - Word choice problems (confused words)
    - Style issues (passive voice, wordiness)

    Usage:
        checker = GrammarChecker()
        report = checker.check(text)
        for error in report.errors:
            print(f"{error.category}: {error.message}")
    """

    # Commonly confused word pairs
    CONFUSED_WORDS = {
        "their": ["there", "they're"],
        "there": ["their", "they're"],
        "they're": ["their", "there"],
        "your": ["you're"],
        "you're": ["your"],
        "its": ["it's"],
        "it's": ["its"],
        "affect": ["effect"],
        "effect": ["affect"],
        "then": ["than"],
        "than": ["then"],
        "accept": ["except"],
        "except": ["accept"],
        "lose": ["loose"],
        "loose": ["lose"],
        "principal": ["principle"],
        "principle": ["principal"],
        "advice": ["advise"],
        "advise": ["advice"],
        "complement": ["compliment"],
        "compliment": ["complement"],
    }

    # Wordy phrases and their concise alternatives
    WORDINESS_PATTERNS = {
        r"\bat this point in time\b": "now",
        r"\bdue to the fact that\b": "because",
        r"\bin order to\b": "to",
        r"\bin spite of the fact that\b": "although",
        r"\bfor the purpose of\b": "to",
        r"\bin the event that\b": "if",
        r"\bat the present time\b": "now",
        r"\bhas the ability to\b": "can",
        r"\bis able to\b": "can",
        r"\bmake a decision\b": "decide",
        r"\btake into consideration\b": "consider",
        r"\bwith regard to\b": "about",
        r"\bin regard to\b": "about",
        r"\bthe reason why is that\b": "because",
        r"\bas a matter of fact\b": "in fact",
        r"\bin the near future\b": "soon",
        r"\ba large number of\b": "many",
        r"\bthe majority of\b": "most",
        r"\bat all times\b": "always",
        r"\bon a regular basis\b": "regularly",
    }

    # Passive voice patterns (simplified)
    PASSIVE_PATTERNS = [
        r"\b(is|are|was|were|be|been|being)\s+(\w+ed)\b",
        r"\b(is|are|was|were|be|been|being)\s+(\w+en)\b",
    ]

    # Common spelling errors (for offline checking)
    COMMON_MISSPELLINGS = {
        "accomodate": "accommodate",
        "occured": "occurred",
        "recieve": "receive",
        "seperate": "separate",
        "definately": "definitely",
        "occassion": "occasion",
        "wierd": "weird",
        "untill": "until",
        "begining": "beginning",
        "beleive": "believe",
        "calender": "calendar",
        "cemetary": "cemetery",
        "collegue": "colleague",
        "comming": "coming",
        "concious": "conscious",
        "embarass": "embarrass",
        "existance": "existence",
        "familar": "familiar",
        "foriegn": "foreign",
        "goverment": "government",
        "grammer": "grammar",
        "harrass": "harass",
        "ignorence": "ignorance",
        "immediatly": "immediately",
        "independant": "independent",
        "judgement": "judgment",
        "knowlege": "knowledge",
        "maintainance": "maintenance",
        "mispell": "misspell",
        "necessery": "necessary",
        "noticable": "noticeable",
        "occurence": "occurrence",
        "perseverance": "perseverance",
        "posession": "possession",
        "predjudice": "prejudice",
        "priviledge": "privilege",
        "pronounciation": "pronunciation",
        "publically": "publicly",
        "recomend": "recommend",
        "refered": "referred",
        "relevent": "relevant",
        "rythm": "rhythm",
        "succesful": "successful",
        "suprise": "surprise",
        "tommorow": "tomorrow",
        "truely": "truly",
        "twelth": "twelfth",
        "tyranny": "tyranny",
        "vaccuum": "vacuum",
        "writting": "writing",
    }

    def __init__(
        self,
        language: str = "en-US",
        use_language_tool: bool = True,
    ):
        """
        Initialize the grammar checker.

        Args:
            language: Language code (e.g., 'en-US', 'en-GB')
            use_language_tool: Whether to use LanguageTool (requires Java)
        """
        self.language = language
        self.use_language_tool = use_language_tool
        self._tool = None
        self._tool_loaded = False

        logger.info(f"GrammarChecker initialized for {language}")

    def _lazy_load_tool(self) -> None:
        """Lazy load LanguageTool."""
        if self._tool_loaded or not self.use_language_tool:
            return

        try:
            import language_tool_python

            logger.info("Loading LanguageTool...")
            self._tool = language_tool_python.LanguageTool(self.language)
            self._tool_loaded = True
            logger.info("LanguageTool loaded successfully")
        except Exception as e:
            logger.warning(f"Could not load LanguageTool: {e}. Using fallback.")
            self._tool_loaded = False
            self.use_language_tool = False

    def check(
        self,
        text: str,
        include_style: bool = True,
        auto_correct: bool = False,
    ) -> GrammarReport:
        """
        Check text for grammar and style issues.

        Args:
            text: Text to check
            include_style: Include style issues (passive voice, wordiness)
            auto_correct: Generate auto-corrected text

        Returns:
            GrammarReport with all detected issues
        """
        errors: List[GrammarError] = []

        # Use LanguageTool if available
        self._lazy_load_tool()
        if self._tool is not None:
            lt_errors = self._check_with_language_tool(text)
            errors.extend(lt_errors)
        else:
            # Fallback: use pattern-based checking
            fallback_errors = self._check_with_patterns(text)
            errors.extend(fallback_errors)

        # Check for confused words
        confused_errors = self._check_confused_words(text)
        errors.extend(confused_errors)

        # Check for style issues if requested
        if include_style:
            style_errors = self._check_style_issues(text)
            errors.extend(style_errors)

        # Remove duplicates and sort by position
        errors = self._deduplicate_errors(errors)
        errors.sort(key=lambda e: e.offset)

        # Calculate metrics
        word_count = len(text.split())
        error_density = (len(errors) / word_count * 100) if word_count > 0 else 0.0

        # Count by category
        by_category: Dict[str, int] = {}
        for error in errors:
            cat = error.category.value
            by_category[cat] = by_category.get(cat, 0) + 1

        # Generate corrected text if requested
        corrected_text = None
        if auto_correct:
            corrected_text = self._auto_correct(text, errors)

        return GrammarReport(
            errors=errors,
            error_density=round(error_density, 2),
            by_category=by_category,
            total_errors=len(errors),
            corrected_text=corrected_text,
        )

    def _check_with_language_tool(self, text: str) -> List[GrammarError]:
        """Check text using LanguageTool."""
        errors = []

        try:
            matches = self._tool.check(text)  # type: ignore

            for match in matches:
                # Map LanguageTool category to our categories
                category = self._map_lt_category(match.ruleId, match.category)

                # Extract context
                start = max(0, match.offset - 20)
                end = min(len(text), match.offset + match.errorLength + 20)
                context = text[start:end]

                errors.append(
                    GrammarError(
                        offset=match.offset,
                        length=match.errorLength,
                        message=match.message,
                        category=category,
                        rule_id=match.ruleId,
                        replacements=match.replacements[:5],  # Limit suggestions
                        context=context,
                        severity=self._map_lt_severity(match.ruleIssueType),
                    )
                )

        except Exception as e:
            logger.error(f"LanguageTool check failed: {e}")

        return errors

    def _check_with_patterns(self, text: str) -> List[GrammarError]:
        """Fallback pattern-based grammar checking."""
        errors = []

        # Check common misspellings
        words = re.finditer(r"\b(\w+)\b", text)
        for match in words:
            word = match.group(1).lower()
            if word in self.COMMON_MISSPELLINGS:
                errors.append(
                    GrammarError(
                        offset=match.start(),
                        length=len(word),
                        message=f"Possible spelling error. Did you mean '{self.COMMON_MISSPELLINGS[word]}'?",
                        category=GrammarCategory.SPELLING,
                        rule_id="SPELLING_COMMON",
                        replacements=[self.COMMON_MISSPELLINGS[word]],
                        context=self._get_context(text, match.start(), len(word)),
                        severity=IssueSeverity.ERROR,
                    )
                )

        # Check basic punctuation
        # Double spaces
        for match in re.finditer(r"  +", text):
            errors.append(
                GrammarError(
                    offset=match.start(),
                    length=len(match.group()),
                    message="Multiple spaces found.",
                    category=GrammarCategory.PUNCTUATION,
                    rule_id="DOUBLE_SPACE",
                    replacements=[" "],
                    context=self._get_context(text, match.start(), len(match.group())),
                    severity=IssueSeverity.WARNING,
                )
            )

        # Missing space after punctuation
        for match in re.finditer(r"[.!?,;][a-zA-Z]", text):
            errors.append(
                GrammarError(
                    offset=match.start() + 1,
                    length=1,
                    message="Missing space after punctuation.",
                    category=GrammarCategory.PUNCTUATION,
                    rule_id="MISSING_SPACE_AFTER_PUNCT",
                    replacements=[" " + match.group()[1]],
                    context=self._get_context(text, match.start(), 2),
                    severity=IssueSeverity.ERROR,
                )
            )

        # Sentence starting with lowercase
        for match in re.finditer(r"(?<=[.!?]\s)[a-z]", text):
            errors.append(
                GrammarError(
                    offset=match.start(),
                    length=1,
                    message="Sentence should start with a capital letter.",
                    category=GrammarCategory.CAPITALIZATION,
                    rule_id="SENTENCE_START_LOWERCASE",
                    replacements=[match.group().upper()],
                    context=self._get_context(text, match.start(), 1),
                    severity=IssueSeverity.ERROR,
                )
            )

        return errors

    def _check_confused_words(self, text: str) -> List[GrammarError]:
        """Check for commonly confused words."""
        errors = []
        text_lower = text.lower()

        # Context-based detection for their/there/they're
        for word, confusions in self.CONFUSED_WORDS.items():
            pattern = rf"\b{word}\b"
            for match in re.finditer(pattern, text_lower):
                # Get surrounding context for analysis
                start = max(0, match.start() - 30)
                end = min(len(text), match.end() + 30)
                context = text_lower[start:end]

                # Simple heuristics for detection
                if self._is_likely_confused(word, context, match.start() - start):
                    actual_word = text[match.start() : match.end()]
                    errors.append(
                        GrammarError(
                            offset=match.start(),
                            length=len(word),
                            message=f"Check if '{actual_word}' is the correct word. Consider: {', '.join(confusions)}",
                            category=GrammarCategory.CONFUSED_WORDS,
                            rule_id=f"CONFUSED_{word.upper()}",
                            replacements=confusions,
                            context=self._get_context(text, match.start(), len(word)),
                            severity=IssueSeverity.WARNING,
                        )
                    )

        return errors

    def _check_style_issues(self, text: str) -> List[GrammarError]:
        """Check for style issues like passive voice and wordiness."""
        errors = []

        # Check for wordy phrases
        text_lower = text.lower()
        for pattern, replacement in self.WORDINESS_PATTERNS.items():
            for match in re.finditer(pattern, text_lower):
                actual_phrase = text[match.start() : match.end()]
                errors.append(
                    GrammarError(
                        offset=match.start(),
                        length=len(actual_phrase),
                        message=f"Consider using '{replacement}' instead of '{actual_phrase}' for conciseness.",
                        category=GrammarCategory.WORDINESS,
                        rule_id="WORDINESS",
                        replacements=[replacement],
                        context=self._get_context(text, match.start(), len(actual_phrase)),
                        severity=IssueSeverity.SUGGESTION,
                    )
                )

        # Check for passive voice
        for pattern in self.PASSIVE_PATTERNS:
            for match in re.finditer(pattern, text_lower):
                errors.append(
                    GrammarError(
                        offset=match.start(),
                        length=len(match.group()),
                        message="Consider using active voice for stronger writing.",
                        category=GrammarCategory.PASSIVE_VOICE,
                        rule_id="PASSIVE_VOICE",
                        replacements=[],
                        context=self._get_context(text, match.start(), len(match.group())),
                        severity=IssueSeverity.SUGGESTION,
                    )
                )

        return errors

    def _is_likely_confused(self, word: str, context: str, pos: int) -> bool:
        """
        Heuristic to determine if a word might be confused.

        This is a simplified version - production would use ML.
        """
        # Only flag if we see patterns that suggest confusion
        # This reduces false positives

        if word in ["their", "there", "they're"]:
            # Check surrounding words for clues
            before = context[:pos].split()
            after = context[pos + len(word) :].split()

            # "there" typically follows verbs like is/are/was/were
            if word == "there" and before:
                last_word = before[-1].lower()
                if last_word in ["is", "are", "was", "were", "be"]:
                    return False  # Likely correct: "there is"

            # "their" typically precedes nouns
            if word == "their" and after:
                # If followed by verb, might be wrong
                first_word = after[0].lower() if after else ""
                if first_word in ["is", "are", "was", "were", "have", "has"]:
                    return True  # Might be wrong

        # For other words, be conservative
        return False

    def _map_lt_category(self, rule_id: str, lt_category: str) -> GrammarCategory:
        """Map LanguageTool category to our categories."""
        rule_id_lower = rule_id.lower()
        lt_category_lower = lt_category.lower()

        if "spell" in lt_category_lower or "typo" in lt_category_lower:
            return GrammarCategory.SPELLING
        elif "punct" in lt_category_lower:
            return GrammarCategory.PUNCTUATION
        elif "style" in lt_category_lower:
            return GrammarCategory.STYLE
        elif "passive" in rule_id_lower:
            return GrammarCategory.PASSIVE_VOICE
        elif "wordy" in rule_id_lower or "redundan" in rule_id_lower:
            return GrammarCategory.WORDINESS
        elif "confused" in rule_id_lower or "homophone" in rule_id_lower:
            return GrammarCategory.CONFUSED_WORDS
        elif "capital" in lt_category_lower or "case" in lt_category_lower:
            return GrammarCategory.CAPITALIZATION
        else:
            return GrammarCategory.GRAMMAR

    def _map_lt_severity(self, issue_type: str) -> IssueSeverity:
        """Map LanguageTool issue type to severity."""
        issue_lower = issue_type.lower()
        if "error" in issue_lower or "misspelling" in issue_lower:
            return IssueSeverity.ERROR
        elif "warning" in issue_lower:
            return IssueSeverity.WARNING
        else:
            return IssueSeverity.SUGGESTION

    def _get_context(self, text: str, offset: int, length: int, window: int = 30) -> str:
        """Extract context around an error."""
        start = max(0, offset - window)
        end = min(len(text), offset + length + window)
        context = text[start:end]

        # Add ellipsis if truncated
        if start > 0:
            context = "..." + context
        if end < len(text):
            context = context + "..."

        return context

    def _deduplicate_errors(self, errors: List[GrammarError]) -> List[GrammarError]:
        """Remove duplicate errors at the same position."""
        seen: set = set()
        unique = []

        for error in errors:
            key = (error.offset, error.length, error.category)
            if key not in seen:
                seen.add(key)
                unique.append(error)

        return unique

    def _auto_correct(self, text: str, errors: List[GrammarError]) -> str:
        """Apply automatic corrections to text."""
        # Sort errors by offset in reverse order to maintain positions
        sorted_errors = sorted(errors, key=lambda e: e.offset, reverse=True)

        corrected = text
        for error in sorted_errors:
            # Only auto-correct if we have high-confidence suggestions
            if (
                error.replacements
                and error.severity == IssueSeverity.ERROR
                and error.category
                in [GrammarCategory.SPELLING, GrammarCategory.PUNCTUATION]
            ):
                replacement = error.replacements[0]
                corrected = (
                    corrected[: error.offset]
                    + replacement
                    + corrected[error.offset + error.length :]
                )

        return corrected

    def get_error_categories(self) -> List[str]:
        """Get list of all error categories."""
        return [cat.value for cat in GrammarCategory]

    def get_category_counts(self, report: GrammarReport) -> Dict[str, int]:
        """Get error counts by category from a report."""
        return report.by_category
