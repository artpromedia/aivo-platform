"""
Developmental Norms Model

Compares student writing against grade-appropriate developmental norms.

Based on research:
- 6+1 Writing Traits developmental continuums
- Common Core writing standards progressions
- NAEP writing achievement levels
"""

import logging
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


class WritingTrait(Enum):
    """Six core writing traits plus presentation."""

    IDEAS = "ideas"
    ORGANIZATION = "organization"
    VOICE = "voice"
    WORD_CHOICE = "word_choice"
    SENTENCE_FLUENCY = "sentence_fluency"
    CONVENTIONS = "conventions"
    PRESENTATION = "presentation"


class DevelopmentLevel(Enum):
    """Developmental levels for each trait."""

    EMERGING = "emerging"
    DEVELOPING = "developing"
    SECURE = "secure"
    EXTENDING = "extending"


@dataclass
class TraitExpectation:
    """Grade-level expectation for a writing trait."""

    trait: WritingTrait
    grade: int
    level_name: str
    description: str
    indicators: List[str]
    benchmark_features: Dict[str, Any]


@dataclass
class TraitDevelopment:
    """Assessment of a trait against developmental norms."""

    trait: str
    current_level: str
    expected_level: str
    on_track: bool
    grade_level_gap: int  # Positive = above, negative = below
    evidence: List[str]
    strengths: List[str]
    growth_areas: List[str]
    confidence: float


@dataclass
class DevelopmentalReport:
    """Complete developmental norms assessment."""

    target_grade: int
    assessed_grade_level: int
    grade_level_gap: int  # Difference from target
    by_trait: Dict[str, TraitDevelopment] = field(default_factory=dict)
    strengths_for_grade: List[str] = field(default_factory=list)
    growth_areas: List[str] = field(default_factory=list)
    next_milestone: str = ""
    overall_development_level: str = ""
    percentile_estimate: int = 50
    recommendations: List[str] = field(default_factory=list)


class DevelopmentalNorms:
    """
    Compare writing against grade-appropriate developmental norms.

    Uses research-based developmental continuums to assess
    where student writing falls relative to grade-level expectations.

    Usage:
        norms = DevelopmentalNorms()
        report = norms.assess_against_norms(text, grade=6)
        print(f"Writing level: Grade {report.assessed_grade_level}")
    """

    # Developmental expectations by grade for each trait
    # Based on 6+1 Writing Traits research and Common Core standards
    GRADE_EXPECTATIONS = {
        # Grade 3 expectations
        3: {
            WritingTrait.IDEAS: TraitExpectation(
                trait=WritingTrait.IDEAS,
                grade=3,
                level_name="Single Focus",
                description="Writing has a single, clear focus with some supporting details",
                indicators=[
                    "Has a main idea or topic",
                    "Includes at least 2-3 supporting details",
                    "Details relate to the main idea",
                    "May include personal experiences as support",
                ],
                benchmark_features={
                    "min_sentences": 5,
                    "detail_count": 2,
                    "topic_consistency": 0.5,
                },
            ),
            WritingTrait.ORGANIZATION: TraitExpectation(
                trait=WritingTrait.ORGANIZATION,
                grade=3,
                level_name="Basic Sequence",
                description="Writing shows basic beginning, middle, and end structure",
                indicators=[
                    "Has an opening sentence",
                    "Events/ideas in logical order",
                    "Has a closing sentence",
                    "May use simple transitions (first, then, finally)",
                ],
                benchmark_features={
                    "has_intro": True,
                    "has_conclusion": True,
                    "min_transitions": 2,
                },
            ),
            WritingTrait.VOICE: TraitExpectation(
                trait=WritingTrait.VOICE,
                grade=3,
                level_name="Emerging Voice",
                description="Shows some awareness of audience; personality beginning to emerge",
                indicators=[
                    "Shows interest in topic",
                    "Some personality in word choices",
                    "Occasional engaging moments",
                ],
                benchmark_features={
                    "personal_pronouns": True,
                    "expressive_words": 1,
                },
            ),
            WritingTrait.WORD_CHOICE: TraitExpectation(
                trait=WritingTrait.WORD_CHOICE,
                grade=3,
                level_name="Functional Vocabulary",
                description="Uses everyday words correctly; attempts some descriptive words",
                indicators=[
                    "Words used correctly",
                    "Some descriptive words (adjectives)",
                    "Attempts new vocabulary",
                ],
                benchmark_features={
                    "avg_word_length": 4.0,
                    "unique_word_ratio": 0.4,
                    "descriptive_words": 3,
                },
            ),
            WritingTrait.SENTENCE_FLUENCY: TraitExpectation(
                trait=WritingTrait.SENTENCE_FLUENCY,
                grade=3,
                level_name="Simple Sentences",
                description="Uses mostly simple sentences; beginning to vary length",
                indicators=[
                    "Complete sentences",
                    "Some variety in sentence beginnings",
                    "Attempts at compound sentences",
                ],
                benchmark_features={
                    "avg_sentence_length": 8,
                    "sentence_variety": 0.3,
                },
            ),
            WritingTrait.CONVENTIONS: TraitExpectation(
                trait=WritingTrait.CONVENTIONS,
                grade=3,
                level_name="Basic Mechanics",
                description="Uses basic punctuation and capitalization; common words spelled correctly",
                indicators=[
                    "End punctuation mostly correct",
                    "Capital letters at sentence beginnings",
                    "Common words spelled correctly",
                ],
                benchmark_features={
                    "error_density_max": 8.0,
                    "spelling_accuracy": 0.85,
                },
            ),
        },
        # Grade 5 expectations
        5: {
            WritingTrait.IDEAS: TraitExpectation(
                trait=WritingTrait.IDEAS,
                grade=5,
                level_name="Developed Focus",
                description="Clear focus with relevant, developed supporting details",
                indicators=[
                    "Clear thesis or main idea",
                    "Multiple supporting details",
                    "Details are specific and relevant",
                    "Some original thinking shown",
                ],
                benchmark_features={
                    "min_sentences": 10,
                    "detail_count": 4,
                    "topic_consistency": 0.65,
                },
            ),
            WritingTrait.ORGANIZATION: TraitExpectation(
                trait=WritingTrait.ORGANIZATION,
                grade=5,
                level_name="Clear Structure",
                description="Clear introduction, body paragraphs, and conclusion",
                indicators=[
                    "Introduction engages reader",
                    "Logical paragraph organization",
                    "Transitions connect ideas",
                    "Conclusion summarizes or reflects",
                ],
                benchmark_features={
                    "has_intro": True,
                    "has_conclusion": True,
                    "min_paragraphs": 3,
                    "min_transitions": 4,
                },
            ),
            WritingTrait.VOICE: TraitExpectation(
                trait=WritingTrait.VOICE,
                grade=5,
                level_name="Developing Voice",
                description="Shows awareness of audience; voice appropriate to purpose",
                indicators=[
                    "Appropriate tone for audience",
                    "Writer's personality evident",
                    "Commitment to topic shown",
                ],
                benchmark_features={
                    "tone_consistency": 0.7,
                    "engagement_markers": 2,
                },
            ),
            WritingTrait.WORD_CHOICE: TraitExpectation(
                trait=WritingTrait.WORD_CHOICE,
                grade=5,
                level_name="Varied Vocabulary",
                description="Uses varied and precise words; some figurative language",
                indicators=[
                    "Precise word choices",
                    "Varied vocabulary",
                    "Attempts figurative language",
                    "Domain-specific words when appropriate",
                ],
                benchmark_features={
                    "avg_word_length": 4.5,
                    "unique_word_ratio": 0.5,
                    "descriptive_words": 6,
                },
            ),
            WritingTrait.SENTENCE_FLUENCY: TraitExpectation(
                trait=WritingTrait.SENTENCE_FLUENCY,
                grade=5,
                level_name="Varied Sentences",
                description="Variety in sentence structure and length; flows smoothly",
                indicators=[
                    "Mix of simple and compound sentences",
                    "Varied sentence beginnings",
                    "Some complex sentences",
                    "Writing flows when read aloud",
                ],
                benchmark_features={
                    "avg_sentence_length": 12,
                    "sentence_variety": 0.5,
                },
            ),
            WritingTrait.CONVENTIONS: TraitExpectation(
                trait=WritingTrait.CONVENTIONS,
                grade=5,
                level_name="Developing Control",
                description="Good control of basic conventions; errors don't impede meaning",
                indicators=[
                    "Correct punctuation variety",
                    "Subject-verb agreement",
                    "Proper paragraph indentation",
                    "Accurate spelling",
                ],
                benchmark_features={
                    "error_density_max": 5.0,
                    "spelling_accuracy": 0.9,
                },
            ),
        },
        # Grade 8 expectations
        8: {
            WritingTrait.IDEAS: TraitExpectation(
                trait=WritingTrait.IDEAS,
                grade=8,
                level_name="Insightful Focus",
                description="Insightful thesis with well-developed, relevant support",
                indicators=[
                    "Strong, arguable thesis",
                    "Thorough development of ideas",
                    "Relevant and specific evidence",
                    "Original thinking and analysis",
                ],
                benchmark_features={
                    "min_sentences": 20,
                    "detail_count": 8,
                    "topic_consistency": 0.75,
                },
            ),
            WritingTrait.ORGANIZATION: TraitExpectation(
                trait=WritingTrait.ORGANIZATION,
                grade=8,
                level_name="Strategic Structure",
                description="Strategic organization with smooth transitions",
                indicators=[
                    "Compelling introduction with hook",
                    "Logical progression of ideas",
                    "Effective transitions within and between paragraphs",
                    "Satisfying, purposeful conclusion",
                ],
                benchmark_features={
                    "has_intro": True,
                    "has_conclusion": True,
                    "min_paragraphs": 4,
                    "min_transitions": 8,
                },
            ),
            WritingTrait.VOICE: TraitExpectation(
                trait=WritingTrait.VOICE,
                grade=8,
                level_name="Authentic Voice",
                description="Authentic voice that engages and connects with audience",
                indicators=[
                    "Distinctive personal voice",
                    "Appropriate tone maintained",
                    "Engages reader throughout",
                    "Risk-taking in expression",
                ],
                benchmark_features={
                    "tone_consistency": 0.8,
                    "engagement_markers": 4,
                },
            ),
            WritingTrait.WORD_CHOICE: TraitExpectation(
                trait=WritingTrait.WORD_CHOICE,
                grade=8,
                level_name="Precise Vocabulary",
                description="Precise, powerful word choices; effective figurative language",
                indicators=[
                    "Strong verbs and specific nouns",
                    "Effective figurative language",
                    "Domain-specific vocabulary",
                    "Words create mood/imagery",
                ],
                benchmark_features={
                    "avg_word_length": 5.0,
                    "unique_word_ratio": 0.55,
                    "descriptive_words": 10,
                },
            ),
            WritingTrait.SENTENCE_FLUENCY: TraitExpectation(
                trait=WritingTrait.SENTENCE_FLUENCY,
                grade=8,
                level_name="Sophisticated Flow",
                description="Sophisticated sentence variety; purposeful rhythm",
                indicators=[
                    "Variety of sentence types",
                    "Effective use of complex sentences",
                    "Purposeful fragments for effect",
                    "Rhythmic, flowing prose",
                ],
                benchmark_features={
                    "avg_sentence_length": 16,
                    "sentence_variety": 0.65,
                },
            ),
            WritingTrait.CONVENTIONS: TraitExpectation(
                trait=WritingTrait.CONVENTIONS,
                grade=8,
                level_name="Strong Control",
                description="Strong control of conventions; few errors",
                indicators=[
                    "Accurate punctuation including complex usage",
                    "Correct grammar and usage",
                    "Effective paragraphing",
                    "Near-perfect spelling",
                ],
                benchmark_features={
                    "error_density_max": 3.0,
                    "spelling_accuracy": 0.95,
                },
            ),
        },
        # Grade 11 expectations
        11: {
            WritingTrait.IDEAS: TraitExpectation(
                trait=WritingTrait.IDEAS,
                grade=11,
                level_name="Sophisticated Ideas",
                description="Sophisticated thesis with compelling, nuanced development",
                indicators=[
                    "Nuanced, debatable thesis",
                    "Multi-layered development",
                    "Integration of sources/evidence",
                    "Original analysis and synthesis",
                ],
                benchmark_features={
                    "min_sentences": 30,
                    "detail_count": 12,
                    "topic_consistency": 0.85,
                },
            ),
            WritingTrait.ORGANIZATION: TraitExpectation(
                trait=WritingTrait.ORGANIZATION,
                grade=11,
                level_name="Masterful Structure",
                description="Masterful organization that enhances meaning",
                indicators=[
                    "Strategic, engaging opening",
                    "Sophisticated structure serves purpose",
                    "Seamless transitions",
                    "Resonant, thought-provoking conclusion",
                ],
                benchmark_features={
                    "has_intro": True,
                    "has_conclusion": True,
                    "min_paragraphs": 5,
                    "min_transitions": 12,
                },
            ),
            WritingTrait.VOICE: TraitExpectation(
                trait=WritingTrait.VOICE,
                grade=11,
                level_name="Compelling Voice",
                description="Compelling, mature voice with clear stance",
                indicators=[
                    "Strong, consistent voice",
                    "Sophisticated awareness of audience",
                    "Compelling engagement",
                    "Confident expression",
                ],
                benchmark_features={
                    "tone_consistency": 0.9,
                    "engagement_markers": 6,
                },
            ),
            WritingTrait.WORD_CHOICE: TraitExpectation(
                trait=WritingTrait.WORD_CHOICE,
                grade=11,
                level_name="Masterful Word Choice",
                description="Masterful word choice creates vivid, precise meaning",
                indicators=[
                    "Sophisticated vocabulary",
                    "Powerful, evocative language",
                    "Precise technical/academic terms",
                    "Deliberate word choices for effect",
                ],
                benchmark_features={
                    "avg_word_length": 5.5,
                    "unique_word_ratio": 0.6,
                    "descriptive_words": 15,
                },
            ),
            WritingTrait.SENTENCE_FLUENCY: TraitExpectation(
                trait=WritingTrait.SENTENCE_FLUENCY,
                grade=11,
                level_name="Artful Fluency",
                description="Artful sentence construction with purposeful variety",
                indicators=[
                    "Sophisticated sentence structures",
                    "Purposeful variation for effect",
                    "Natural, expressive rhythm",
                    "Control of pacing",
                ],
                benchmark_features={
                    "avg_sentence_length": 20,
                    "sentence_variety": 0.75,
                },
            ),
            WritingTrait.CONVENTIONS: TraitExpectation(
                trait=WritingTrait.CONVENTIONS,
                grade=11,
                level_name="Mastery",
                description="Mastery of conventions; minimal errors",
                indicators=[
                    "Sophisticated punctuation usage",
                    "Flawless grammar and usage",
                    "Strategic paragraphing",
                    "Perfect spelling",
                ],
                benchmark_features={
                    "error_density_max": 1.5,
                    "spelling_accuracy": 0.98,
                },
            ),
        },
    }

    # Interpolate for grades not explicitly defined
    GRADE_MAPPING = {
        1: 3, 2: 3, 3: 3, 4: 3,
        5: 5, 6: 5, 7: 8,
        8: 8, 9: 8, 10: 11,
        11: 11, 12: 11,
    }

    def __init__(self):
        """Initialize the DevelopmentalNorms analyzer."""
        logger.info("DevelopmentalNorms initialized")

    def _get_expectations_for_grade(self, grade: int) -> Dict[WritingTrait, TraitExpectation]:
        """Get trait expectations for a specific grade."""
        # Map to closest defined grade level
        mapped_grade = self.GRADE_MAPPING.get(grade, 8)
        return self.GRADE_EXPECTATIONS.get(mapped_grade, self.GRADE_EXPECTATIONS[8])

    def _count_sentences(self, text: str) -> int:
        """Count sentences in text."""
        sentences = re.split(r'[.!?]+', text)
        return len([s for s in sentences if s.strip()])

    def _count_words(self, text: str) -> int:
        """Count words in text."""
        words = re.findall(r'\b\w+\b', text)
        return len(words)

    def _calculate_avg_sentence_length(self, text: str) -> float:
        """Calculate average sentence length."""
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]

        if not sentences:
            return 0.0

        total_words = sum(len(s.split()) for s in sentences)
        return total_words / len(sentences)

    def _calculate_avg_word_length(self, text: str) -> float:
        """Calculate average word length."""
        words = re.findall(r'\b\w+\b', text.lower())
        if not words:
            return 0.0
        return sum(len(w) for w in words) / len(words)

    def _calculate_unique_word_ratio(self, text: str) -> float:
        """Calculate type-token ratio (vocabulary richness)."""
        words = re.findall(r'\b\w+\b', text.lower())
        if not words:
            return 0.0
        return len(set(words)) / len(words)

    def _count_transitions(self, text: str) -> int:
        """Count transition words/phrases."""
        transitions = [
            r'\bfirst\b', r'\bsecond\b', r'\bthird\b', r'\bthen\b', r'\bnext\b',
            r'\bfinally\b', r'\bin addition\b', r'\bfurthermore\b', r'\bmoreover\b',
            r'\bhowever\b', r'\balthough\b', r'\bnevertheless\b', r'\btherefore\b',
            r'\bconsequently\b', r'\bas a result\b', r'\bfor example\b',
            r'\bfor instance\b', r'\bin contrast\b', r'\bon the other hand\b',
            r'\bin conclusion\b', r'\bto summarize\b', r'\bin summary\b',
            r'\bbecause\b', r'\bsince\b', r'\bwhile\b', r'\balso\b',
        ]

        count = 0
        text_lower = text.lower()
        for pattern in transitions:
            count += len(re.findall(pattern, text_lower))

        return count

    def _count_paragraphs(self, text: str) -> int:
        """Count paragraphs in text."""
        paragraphs = re.split(r'\n\s*\n', text)
        return len([p for p in paragraphs if p.strip()])

    def _has_intro_conclusion(self, text: str) -> Tuple[bool, bool]:
        """Check for introduction and conclusion markers."""
        paragraphs = re.split(r'\n\s*\n', text)
        paragraphs = [p.strip() for p in paragraphs if p.strip()]

        if not paragraphs:
            return False, False

        # Check first paragraph for intro markers
        first_para = paragraphs[0].lower()
        intro_markers = ['this essay', 'in this', 'i will', 'the purpose', 'i believe', 'i think']
        has_intro = any(marker in first_para for marker in intro_markers) or len(first_para.split()) > 20

        # Check last paragraph for conclusion markers
        last_para = paragraphs[-1].lower()
        conclusion_markers = ['in conclusion', 'to conclude', 'in summary', 'finally', 'therefore', 'thus']
        has_conclusion = any(marker in last_para for marker in conclusion_markers) or (
            len(paragraphs) > 2 and len(last_para.split()) > 15
        )

        return has_intro, has_conclusion

    def _count_descriptive_words(self, text: str) -> int:
        """Count descriptive words (adjectives and adverbs)."""
        # Simple heuristic: words ending in -ly (adverbs) and common adjectives
        words = re.findall(r'\b\w+\b', text.lower())

        adverbs = [w for w in words if w.endswith('ly') and len(w) > 3]

        descriptive_patterns = [
            r'\b(?:beautiful|amazing|wonderful|terrible|horrible|excellent|perfect)',
            r'\b(?:big|small|large|tiny|huge|great|little|long|short)',
            r'\b(?:happy|sad|angry|excited|scared|brave|kind|mean)',
            r'\b(?:fast|slow|quick|careful|bright|dark|loud|quiet)',
            r'\b(?:important|interesting|different|special|amazing)',
        ]

        adjective_count = 0
        for pattern in descriptive_patterns:
            adjective_count += len(re.findall(pattern, text.lower()))

        return len(adverbs) + adjective_count

    def _estimate_error_density(self, text: str) -> float:
        """
        Estimate grammar/spelling error density.

        This is a rough heuristic; actual error checking uses GrammarChecker.
        """
        words = re.findall(r'\b\w+\b', text)
        word_count = len(words)

        if word_count == 0:
            return 0.0

        # Simple heuristics for common errors
        error_indicators = 0

        # Check for repeated words
        for i in range(len(words) - 1):
            if words[i].lower() == words[i + 1].lower():
                error_indicators += 1

        # Check for missing capitalization after periods
        sentences = re.split(r'[.!?]\s+', text)
        for sent in sentences[1:]:  # Skip first sentence
            if sent and sent[0].islower():
                error_indicators += 1

        # Check for common misspellings (subset)
        common_errors = ['teh', 'recieve', 'occured', 'seperate', 'definately']
        text_lower = text.lower()
        for error in common_errors:
            if error in text_lower:
                error_indicators += 1

        # Calculate per 100 words
        return (error_indicators / word_count) * 100

    def _calculate_sentence_variety(self, text: str) -> float:
        """Calculate sentence variety score."""
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]

        if len(sentences) < 2:
            return 0.0

        # Check variety in sentence lengths
        lengths = [len(s.split()) for s in sentences]
        if not lengths:
            return 0.0

        avg_length = sum(lengths) / len(lengths)
        variance = sum((l - avg_length) ** 2 for l in lengths) / len(lengths)
        std_dev = variance ** 0.5

        # Normalize: higher std_dev = more variety
        length_variety = min(1.0, std_dev / 10)

        # Check variety in sentence beginnings
        beginnings = [s.split()[0].lower() if s.split() else '' for s in sentences]
        unique_beginnings = len(set(beginnings))
        beginning_variety = unique_beginnings / len(sentences) if sentences else 0

        return (length_variety + beginning_variety) / 2

    def _extract_evidence(self, text: str, trait: WritingTrait) -> List[str]:
        """Extract evidence examples for a trait assessment."""
        evidence = []
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()][:10]  # First 10 sentences

        if trait == WritingTrait.IDEAS:
            # Look for main ideas and details
            for sent in sentences[:3]:
                if len(sent.split()) > 10:
                    evidence.append(f"Topic introduction: '{sent[:80]}...'")
                    break

        elif trait == WritingTrait.ORGANIZATION:
            # Look for transitions
            for sent in sentences:
                if re.search(r'\b(first|second|however|therefore|in conclusion)\b', sent.lower()):
                    evidence.append(f"Transition used: '{sent[:60]}...'")
                    if len(evidence) >= 2:
                        break

        elif trait == WritingTrait.VOICE:
            # Look for personal expressions
            for sent in sentences:
                if re.search(r'\b(i believe|i think|in my opinion|we should)\b', sent.lower()):
                    evidence.append(f"Personal voice: '{sent[:60]}...'")
                    if len(evidence) >= 2:
                        break

        elif trait == WritingTrait.WORD_CHOICE:
            # Look for descriptive language
            words = re.findall(r'\b\w+\b', text.lower())
            unique_long_words = [w for w in set(words) if len(w) > 7][:5]
            if unique_long_words:
                evidence.append(f"Vocabulary examples: {', '.join(unique_long_words)}")

        elif trait == WritingTrait.SENTENCE_FLUENCY:
            # Show sentence variety
            lengths = [len(s.split()) for s in sentences[:5]]
            if lengths:
                evidence.append(f"Sentence lengths: {lengths}")

        elif trait == WritingTrait.CONVENTIONS:
            # Note any obvious errors
            error_count = int(self._estimate_error_density(text))
            evidence.append(f"Estimated error density: ~{error_count} per 100 words")

        return evidence[:3]

    def _assess_trait(
        self,
        text: str,
        trait: WritingTrait,
        expectation: TraitExpectation,
    ) -> TraitDevelopment:
        """Assess a single trait against grade-level expectations."""
        benchmarks = expectation.benchmark_features
        strengths = []
        growth_areas = []

        # Calculate relevant metrics based on trait
        if trait == WritingTrait.IDEAS:
            sentence_count = self._count_sentences(text)
            word_count = self._count_words(text)
            unique_ratio = self._calculate_unique_word_ratio(text)

            min_sentences = benchmarks.get("min_sentences", 5)

            if sentence_count >= min_sentences:
                strengths.append("Sufficient content development")
            else:
                growth_areas.append(f"Expand with more detail ({sentence_count} sentences, aim for {min_sentences}+)")

            if unique_ratio >= benchmarks.get("topic_consistency", 0.5):
                strengths.append("Varied vocabulary in content")
            else:
                growth_areas.append("Develop ideas with more specific details")

            # Determine level
            score = min(1.0, sentence_count / min_sentences) * 0.5 + unique_ratio * 0.5

        elif trait == WritingTrait.ORGANIZATION:
            has_intro, has_conclusion = self._has_intro_conclusion(text)
            transition_count = self._count_transitions(text)
            paragraph_count = self._count_paragraphs(text)

            min_transitions = benchmarks.get("min_transitions", 2)
            min_paragraphs = benchmarks.get("min_paragraphs", 2)

            if has_intro:
                strengths.append("Clear introduction present")
            else:
                growth_areas.append("Add a clear introduction")

            if has_conclusion:
                strengths.append("Clear conclusion present")
            else:
                growth_areas.append("Add a clear conclusion")

            if transition_count >= min_transitions:
                strengths.append(f"Good use of transitions ({transition_count})")
            else:
                growth_areas.append(f"Use more transition words ({transition_count}, aim for {min_transitions}+)")

            score = (
                (0.3 if has_intro else 0) +
                (0.3 if has_conclusion else 0) +
                min(0.4, transition_count / max(1, min_transitions) * 0.4)
            )

        elif trait == WritingTrait.VOICE:
            # Check for personal pronouns and expressive language
            text_lower = text.lower()
            personal_count = len(re.findall(r'\b(i|we|my|our)\b', text_lower))
            expressive_count = len(re.findall(r'\b(believe|think|feel|love|hate|amazing|terrible)\b', text_lower))

            if personal_count > 0:
                strengths.append("Personal voice present")
            else:
                growth_areas.append("Develop personal voice with opinions/feelings")

            if expressive_count >= benchmarks.get("expressive_words", 1):
                strengths.append("Expressive language used")
            else:
                growth_areas.append("Add more expressive, engaging language")

            word_count = self._count_words(text)
            score = min(1.0, (personal_count + expressive_count) / max(1, word_count / 20))

        elif trait == WritingTrait.WORD_CHOICE:
            avg_word_len = self._calculate_avg_word_length(text)
            unique_ratio = self._calculate_unique_word_ratio(text)
            descriptive_count = self._count_descriptive_words(text)

            target_word_len = benchmarks.get("avg_word_length", 4.5)
            target_unique = benchmarks.get("unique_word_ratio", 0.5)
            target_descriptive = benchmarks.get("descriptive_words", 5)

            if avg_word_len >= target_word_len:
                strengths.append(f"Good vocabulary sophistication (avg {avg_word_len:.1f} chars)")
            else:
                growth_areas.append("Try using more sophisticated vocabulary")

            if unique_ratio >= target_unique:
                strengths.append("Good word variety")
            else:
                growth_areas.append("Avoid repeating the same words")

            if descriptive_count >= target_descriptive:
                strengths.append(f"Good use of descriptive language ({descriptive_count})")
            else:
                growth_areas.append("Add more descriptive words (adjectives, adverbs)")

            score = (
                min(0.33, avg_word_len / target_word_len * 0.33) +
                min(0.33, unique_ratio / target_unique * 0.33) +
                min(0.34, descriptive_count / target_descriptive * 0.34)
            )

        elif trait == WritingTrait.SENTENCE_FLUENCY:
            avg_sent_len = self._calculate_avg_sentence_length(text)
            variety = self._calculate_sentence_variety(text)

            target_length = benchmarks.get("avg_sentence_length", 12)
            target_variety = benchmarks.get("sentence_variety", 0.5)

            if avg_sent_len >= target_length * 0.8:
                strengths.append(f"Good sentence length (avg {avg_sent_len:.1f} words)")
            else:
                growth_areas.append("Develop longer, more complex sentences")

            if variety >= target_variety:
                strengths.append("Good sentence variety")
            else:
                growth_areas.append("Vary sentence beginnings and structures")

            score = (
                min(0.5, avg_sent_len / target_length * 0.5) +
                min(0.5, variety / target_variety * 0.5)
            )

        else:  # CONVENTIONS
            error_density = self._estimate_error_density(text)
            max_errors = benchmarks.get("error_density_max", 5.0)

            if error_density <= max_errors:
                strengths.append("Good control of conventions")
            else:
                growth_areas.append("Review spelling, punctuation, and grammar")

            score = max(0, 1.0 - (error_density / (max_errors * 2)))

        # Determine developmental level based on score
        if score >= 0.85:
            current_level = DevelopmentLevel.EXTENDING.value
            grade_gap = 1
        elif score >= 0.65:
            current_level = DevelopmentLevel.SECURE.value
            grade_gap = 0
        elif score >= 0.4:
            current_level = DevelopmentLevel.DEVELOPING.value
            grade_gap = -1
        else:
            current_level = DevelopmentLevel.EMERGING.value
            grade_gap = -2

        return TraitDevelopment(
            trait=trait.value,
            current_level=current_level,
            expected_level=expectation.level_name,
            on_track=grade_gap >= 0,
            grade_level_gap=grade_gap,
            evidence=self._extract_evidence(text, trait),
            strengths=strengths,
            growth_areas=growth_areas,
            confidence=min(1.0, score + 0.2),
        )

    def _estimate_grade_level(
        self,
        trait_assessments: Dict[str, TraitDevelopment],
        target_grade: int,
    ) -> int:
        """Estimate overall writing grade level from trait assessments."""
        # Calculate weighted average of grade gaps
        total_gap = 0
        count = 0

        weights = {
            WritingTrait.IDEAS.value: 1.5,
            WritingTrait.ORGANIZATION.value: 1.2,
            WritingTrait.CONVENTIONS.value: 1.0,
            WritingTrait.WORD_CHOICE.value: 1.0,
            WritingTrait.SENTENCE_FLUENCY.value: 1.0,
            WritingTrait.VOICE.value: 0.8,
        }

        for trait, assessment in trait_assessments.items():
            weight = weights.get(trait, 1.0)
            total_gap += assessment.grade_level_gap * weight
            count += weight

        avg_gap = total_gap / count if count > 0 else 0

        # Convert gap to estimated grade
        estimated_grade = max(1, min(12, target_grade + round(avg_gap)))

        return estimated_grade

    def assess_against_norms(
        self,
        text: str,
        grade: int,
        prompt: Optional[str] = None,
    ) -> DevelopmentalReport:
        """
        Assess writing against grade-appropriate developmental norms.

        Args:
            text: Student writing to assess
            grade: Target grade level (1-12)
            prompt: Optional writing prompt

        Returns:
            DevelopmentalReport with comprehensive assessment
        """
        # Validate grade
        grade = max(1, min(12, grade))

        # Get expectations for grade
        expectations = self._get_expectations_for_grade(grade)

        # Assess each trait
        trait_assessments = {}
        all_strengths = []
        all_growth_areas = []

        for trait, expectation in expectations.items():
            assessment = self._assess_trait(text, trait, expectation)
            trait_assessments[trait.value] = assessment

            # Collect overall strengths and growth areas
            if assessment.on_track:
                all_strengths.extend(assessment.strengths[:1])
            all_growth_areas.extend(assessment.growth_areas[:1])

        # Estimate overall grade level
        estimated_grade = self._estimate_grade_level(trait_assessments, grade)
        grade_gap = estimated_grade - grade

        # Determine overall development level
        on_track_count = sum(1 for a in trait_assessments.values() if a.on_track)
        total_traits = len(trait_assessments)

        if on_track_count >= total_traits * 0.8:
            overall_level = "Above Grade Level"
            percentile = 75
        elif on_track_count >= total_traits * 0.6:
            overall_level = "At Grade Level"
            percentile = 50
        elif on_track_count >= total_traits * 0.4:
            overall_level = "Approaching Grade Level"
            percentile = 35
        else:
            overall_level = "Below Grade Level"
            percentile = 20

        # Generate next milestone
        weakest_trait = min(
            trait_assessments.values(),
            key=lambda a: a.grade_level_gap
        )
        next_milestone = f"Focus on {weakest_trait.trait.replace('_', ' ')}: {weakest_trait.growth_areas[0] if weakest_trait.growth_areas else 'Continue developing'}"

        # Generate recommendations
        recommendations = self._generate_recommendations(trait_assessments, grade)

        return DevelopmentalReport(
            target_grade=grade,
            assessed_grade_level=estimated_grade,
            grade_level_gap=grade_gap,
            by_trait=trait_assessments,
            strengths_for_grade=all_strengths[:5],
            growth_areas=all_growth_areas[:5],
            next_milestone=next_milestone,
            overall_development_level=overall_level,
            percentile_estimate=percentile,
            recommendations=recommendations,
        )

    def _generate_recommendations(
        self,
        trait_assessments: Dict[str, TraitDevelopment],
        grade: int,
    ) -> List[str]:
        """Generate actionable recommendations based on assessment."""
        recommendations = []

        # Sort traits by gap (lowest first = needs most work)
        sorted_traits = sorted(
            trait_assessments.items(),
            key=lambda x: x[1].grade_level_gap
        )

        for trait, assessment in sorted_traits[:3]:
            if not assessment.on_track:
                if trait == WritingTrait.IDEAS.value:
                    recommendations.append(
                        "Practice brainstorming multiple ideas before writing, "
                        "then choose the strongest one to develop fully."
                    )
                elif trait == WritingTrait.ORGANIZATION.value:
                    recommendations.append(
                        "Try using a graphic organizer or outline before writing "
                        "to plan your introduction, body, and conclusion."
                    )
                elif trait == WritingTrait.VOICE.value:
                    recommendations.append(
                        "Read your writing aloud to hear if it sounds like YOU. "
                        "Add your opinions and feelings to make it more personal."
                    )
                elif trait == WritingTrait.WORD_CHOICE.value:
                    recommendations.append(
                        "Keep a vocabulary journal of interesting words you find "
                        "while reading, then try using them in your writing."
                    )
                elif trait == WritingTrait.SENTENCE_FLUENCY.value:
                    recommendations.append(
                        "Practice combining short sentences and varying how you "
                        "start sentences to make your writing flow better."
                    )
                elif trait == WritingTrait.CONVENTIONS.value:
                    recommendations.append(
                        "After writing, take time to proofread carefully. "
                        "Read backward sentence-by-sentence to catch errors."
                    )

        # Add grade-appropriate recommendation
        if grade <= 5:
            recommendations.append(
                "Read books at your level every day - this helps you learn "
                "new words and see how good writers organize their ideas."
            )
        elif grade <= 8:
            recommendations.append(
                "Try writing in different genres (stories, essays, poems) "
                "to become a more versatile writer."
            )
        else:
            recommendations.append(
                "Analyze writing you admire to understand what makes it effective, "
                "then practice those techniques in your own writing."
            )

        return recommendations[:5]

    def get_grade_level_description(self, grade: int) -> Dict[str, str]:
        """Get descriptions of expectations for a grade level."""
        expectations = self._get_expectations_for_grade(grade)

        return {
            trait.value: {
                "level_name": exp.level_name,
                "description": exp.description,
                "indicators": exp.indicators,
            }
            for trait, exp in expectations.items()
        }

    def compare_to_benchmark(
        self,
        text: str,
        benchmark_texts: List[str],
        grade: int,
    ) -> Dict[str, Any]:
        """
        Compare student text to benchmark texts at the same grade level.

        Args:
            text: Student text to compare
            benchmark_texts: Sample texts at grade level
            grade: Target grade

        Returns:
            Comparison analysis
        """
        # Assess student text
        student_report = self.assess_against_norms(text, grade)

        # Assess benchmark texts and compute averages
        benchmark_reports = [
            self.assess_against_norms(bt, grade) for bt in benchmark_texts
        ]

        comparison = {
            "student_level": student_report.assessed_grade_level,
            "benchmark_average_level": sum(r.assessed_grade_level for r in benchmark_reports) / len(benchmark_reports) if benchmark_reports else grade,
            "traits_above_benchmark": [],
            "traits_below_benchmark": [],
        }

        for trait in student_report.by_trait:
            student_gap = student_report.by_trait[trait].grade_level_gap
            benchmark_gap = sum(
                r.by_trait.get(trait, TraitDevelopment(trait, "", "", True, 0, [], [], [], 0.5)).grade_level_gap
                for r in benchmark_reports
            ) / len(benchmark_reports) if benchmark_reports else 0

            if student_gap > benchmark_gap:
                comparison["traits_above_benchmark"].append(trait)
            elif student_gap < benchmark_gap:
                comparison["traits_below_benchmark"].append(trait)

        return comparison
