"""
Enhanced Feedback Generator for constructive writing feedback.

Features:
- Age-appropriate language
- Growth mindset framing
- Specific, actionable suggestions
- Balance praise and critique (2:1 ratio)
- LLM-powered personalized feedback
- Student profile integration
- Template bank + novel generation
"""

import logging
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class FeedbackTone(Enum):
    """Tone options for feedback generation."""

    ENCOURAGING = "encouraging"
    NEUTRAL = "neutral"
    CHALLENGING = "challenging"


class DetailLevel(Enum):
    """Detail level for feedback."""

    BRIEF = "brief"
    MODERATE = "moderate"
    DETAILED = "detailed"


@dataclass
class FeedbackPoint:
    """Single feedback point."""

    area: str
    description: str
    example_from_text: Optional[str] = None
    priority: int = 1  # 1 = highest priority


@dataclass
class Suggestion:
    """Specific improvement suggestion."""

    category: str
    original_text: str
    suggestion: str
    explanation: str
    impact: str = "medium"  # low, medium, high


@dataclass
class WritingFeedback:
    """Complete writing feedback."""

    summary: str
    strengths: List[FeedbackPoint] = field(default_factory=list)
    areas_for_improvement: List[FeedbackPoint] = field(default_factory=list)
    specific_suggestions: List[Suggestion] = field(default_factory=list)
    next_steps: List[str] = field(default_factory=list)
    encouragement: str = ""
    growth_mindset_message: str = ""


@dataclass
class StudentProfile:
    """Student profile for personalized feedback."""

    student_id: str
    grade_level: int
    previous_scores: List[float] = field(default_factory=list)
    known_strengths: List[str] = field(default_factory=list)
    known_weaknesses: List[str] = field(default_factory=list)
    learning_goals: List[str] = field(default_factory=list)
    feedback_preferences: Dict[str, Any] = field(default_factory=dict)
    writing_history: List[Dict[str, Any]] = field(default_factory=list)
    response_to_past_feedback: Dict[str, float] = field(default_factory=dict)


@dataclass
class FeedbackConfig:
    """Configuration for feedback generation."""

    tone: FeedbackTone = FeedbackTone.ENCOURAGING
    detail_level: DetailLevel = DetailLevel.MODERATE
    focus_traits: List[str] = field(default_factory=list)
    max_suggestions: int = 5
    grade_level: int = 6
    include_examples: bool = True
    praise_to_critique_ratio: float = 2.0
    include_growth_mindset: bool = True
    use_llm: bool = False


class FeedbackGenerator:
    """
    Generate constructive writing feedback.

    Features:
    - Tone-appropriate feedback (encouraging, neutral, challenging)
    - Grade-level appropriate language
    - Specific, actionable suggestions
    - Strength highlighting with 2:1 praise ratio
    - LLM integration for personalized feedback
    - Student profile tracking

    Usage:
        generator = FeedbackGenerator()
        feedback = generator.generate(assessment_results, config=config)
    """

    # Feedback templates by style
    TEMPLATES = {
        FeedbackTone.ENCOURAGING: {
            "summary_intro": "Great effort on your writing! ",
            "strength_prefix": "You did a nice job with ",
            "improvement_prefix": "You could strengthen your writing by ",
            "next_step_prefix": "Try focusing on ",
            "closing": "Keep up the good work!",
        },
        FeedbackTone.NEUTRAL: {
            "summary_intro": "Here is your feedback: ",
            "strength_prefix": "Strengths include ",
            "improvement_prefix": "Areas needing work: ",
            "next_step_prefix": "Next, work on ",
            "closing": "Continue practicing your writing skills.",
        },
        FeedbackTone.CHALLENGING: {
            "summary_intro": "Assessment Summary: ",
            "strength_prefix": "Notable strengths: ",
            "improvement_prefix": "Key areas for improvement: ",
            "next_step_prefix": "Priority focus areas: ",
            "closing": "Push yourself to reach the next level.",
        },
    }

    # Grade-level vocabulary mappings
    GRADE_VOCABULARY = {
        "elementary": {
            "coherence": "how your ideas connect",
            "organization": "how you put your ideas in order",
            "transitions": "words that connect your sentences",
            "vocabulary": "the words you use",
            "conventions": "spelling and punctuation",
            "voice": "your writing personality",
            "thesis": "main idea",
            "evidence": "examples and facts",
            "argument": "what you are trying to prove",
            "paragraph": "group of sentences",
            "introduction": "beginning",
            "conclusion": "ending",
        },
        "middle": {
            "coherence": "logical flow of ideas",
            "organization": "structure and organization",
            "transitions": "transition words and phrases",
            "vocabulary": "word choice",
            "conventions": "grammar and mechanics",
            "voice": "your writing voice",
            "thesis": "thesis statement",
            "evidence": "supporting evidence",
            "argument": "argument",
            "paragraph": "paragraph",
            "introduction": "introduction",
            "conclusion": "conclusion",
        },
        "high": {
            "coherence": "textual coherence",
            "organization": "organizational structure",
            "transitions": "transitional elements",
            "vocabulary": "lexical choices",
            "conventions": "writing conventions",
            "voice": "authorial voice",
            "thesis": "central thesis",
            "evidence": "evidentiary support",
            "argument": "argumentative framework",
            "paragraph": "body paragraph",
            "introduction": "introductory section",
            "conclusion": "concluding analysis",
        },
    }

    # Growth mindset messages by category
    GROWTH_MINDSET_MESSAGES = {
        "general": [
            "Writing is a skill that improves with practice. Every draft makes you better!",
            "The best writers aren't born - they develop through effort and revision.",
            "Mistakes are learning opportunities. Each one teaches you something new.",
            "Your writing brain grows stronger every time you challenge yourself.",
        ],
        "struggling": [
            "This is challenging, and that's okay! Challenge is how we grow.",
            "Even professional writers struggle with drafts. Keep pushing through!",
            "You're building new skills right now. Progress takes time and practice.",
        ],
        "improving": [
            "You're making real progress! Your effort is paying off.",
            "I can see improvement from your previous work. Keep building on this!",
            "Growth is happening! Each piece of writing is better than the last.",
        ],
        "excelling": [
            "Excellent work! Now challenge yourself to try new techniques.",
            "You've mastered the basics. Time to push into advanced territory.",
            "Strong foundation! Consider how you can make your writing truly distinctive.",
        ],
    }

    # Template bank for common feedback patterns
    FEEDBACK_TEMPLATES = {
        "weak_intro": {
            "elementary": "Try starting with an interesting sentence that makes the reader want to know more!",
            "middle": "Consider opening with a hook - a question, surprising fact, or vivid description.",
            "high": "Strengthen your introduction with a compelling hook that establishes context and engages the reader immediately.",
        },
        "missing_transitions": {
            "elementary": "Use words like 'first,' 'then,' 'next,' and 'finally' to help readers follow your ideas.",
            "middle": "Add transition words between sentences and paragraphs to show how your ideas connect.",
            "high": "Incorporate sophisticated transitions that signal the logical relationship between ideas (e.g., 'consequently,' 'nevertheless').",
        },
        "weak_evidence": {
            "elementary": "Add more examples to show what you mean. Tell the reader specific details!",
            "middle": "Support your points with specific evidence - facts, examples, or quotes that prove your ideas.",
            "high": "Strengthen your argument with concrete, well-integrated evidence from credible sources.",
        },
        "repetitive_vocab": {
            "elementary": "Try using different words instead of saying the same word over and over.",
            "middle": "Vary your word choice to avoid repetition and make your writing more interesting.",
            "high": "Diversify your lexicon to demonstrate vocabulary sophistication and maintain reader engagement.",
        },
        "sentence_variety": {
            "elementary": "Mix up your sentences! Try some short ones and some longer ones.",
            "middle": "Vary your sentence structure - combine some sentences and start others in different ways.",
            "high": "Employ deliberate sentence variety, alternating between simple, compound, and complex structures for rhythmic effect.",
        },
        "weak_conclusion": {
            "elementary": "End by reminding the reader of your main idea and why it matters.",
            "middle": "Write a conclusion that summarizes your main points and leaves the reader with something to think about.",
            "high": "Craft a conclusion that synthesizes your argument, addresses broader implications, and provides closure.",
        },
        "grammar_errors": {
            "elementary": "Check your spelling and make sure every sentence ends with a period, question mark, or exclamation point.",
            "middle": "Proofread carefully for grammar and punctuation errors that could distract your reader.",
            "high": "Review for mechanical precision, ensuring your prose is polished and error-free.",
        },
    }

    def __init__(self, openai_api_key: Optional[str] = None):
        """
        Initialize the feedback generator.

        Args:
            openai_api_key: Optional API key for LLM-powered feedback
        """
        self.openai_api_key = openai_api_key
        self._openai_client = None
        logger.info("FeedbackGenerator initialized")

    def _lazy_load_openai(self):
        """Lazy load OpenAI client."""
        if self._openai_client is not None:
            return

        if not self.openai_api_key:
            logger.warning("OpenAI API key not provided, LLM feedback disabled")
            return

        try:
            from openai import OpenAI
            self._openai_client = OpenAI(api_key=self.openai_api_key)
            logger.info("OpenAI client initialized")
        except ImportError:
            logger.warning("OpenAI package not installed")
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client: {e}")

    def _get_vocabulary_level(self, grade_level: Optional[int]) -> str:
        """Determine vocabulary level based on grade."""
        if grade_level is None:
            return "middle"
        elif grade_level <= 5:
            return "elementary"
        elif grade_level <= 8:
            return "middle"
        else:
            return "high"

    def _translate_term(self, term: str, vocab_level: str) -> str:
        """Translate technical term to grade-appropriate language."""
        vocab = self.GRADE_VOCABULARY.get(vocab_level, self.GRADE_VOCABULARY["middle"])
        return vocab.get(term.lower(), term.replace("_", " "))

    def _select_template(self, template_key: str, vocab_level: str) -> str:
        """Select appropriate template for vocabulary level."""
        templates = self.FEEDBACK_TEMPLATES.get(template_key, {})
        return templates.get(vocab_level, templates.get("middle", ""))

    def generate(
        self,
        assessment_results: Dict[str, Any],
        feedback_style: str = "encouraging",
        focus_areas: Optional[List[str]] = None,
        max_suggestions: int = 5,
        grade_level: Optional[int] = None,
        student_profile: Optional[StudentProfile] = None,
        config: Optional[FeedbackConfig] = None,
    ) -> WritingFeedback:
        """
        Generate comprehensive feedback from assessment results.

        Args:
            assessment_results: Dictionary containing analysis results
            feedback_style: Tone of feedback (encouraging, neutral, challenging)
            focus_areas: Specific areas to focus feedback on
            max_suggestions: Maximum number of specific suggestions
            grade_level: Student's grade level for vocabulary adjustment
            student_profile: Optional student profile for personalization
            config: Optional FeedbackConfig for detailed configuration

        Returns:
            WritingFeedback with summary, strengths, improvements, and suggestions
        """
        # Build config from parameters if not provided
        if config is None:
            tone = FeedbackTone(feedback_style) if feedback_style in [t.value for t in FeedbackTone] else FeedbackTone.ENCOURAGING
            config = FeedbackConfig(
                tone=tone,
                focus_traits=focus_areas or [],
                max_suggestions=max_suggestions,
                grade_level=grade_level or 6,
            )

        # Override with student profile if available
        if student_profile:
            config.grade_level = student_profile.grade_level
            if student_profile.feedback_preferences:
                pref_tone = student_profile.feedback_preferences.get("tone")
                if pref_tone:
                    config.tone = FeedbackTone(pref_tone)

        # Determine vocabulary level
        vocab_level = self._get_vocabulary_level(config.grade_level)
        templates = self.TEMPLATES.get(config.tone, self.TEMPLATES[FeedbackTone.ENCOURAGING])

        # Extract assessment components
        scores = assessment_results.get("scores", {})
        grammar_report = assessment_results.get("grammar_report", {})
        coherence_analysis = assessment_results.get("coherence_analysis", {})
        style_report = assessment_results.get("style_report", {})
        readability_profile = assessment_results.get("readability_profile", {})
        argumentation = assessment_results.get("argumentation", {})

        # Generate components with 2:1 praise ratio
        strengths = self._identify_strengths(assessment_results, vocab_level, student_profile)
        improvements = self._identify_improvements(
            assessment_results, vocab_level, config.focus_traits, student_profile
        )

        # Ensure 2:1 ratio
        target_strengths = max(len(improvements) * 2, 2)
        if len(strengths) < target_strengths:
            strengths = self._add_general_strengths(strengths, assessment_results, vocab_level)

        # Generate other components
        summary = self._generate_summary(scores, templates, vocab_level, student_profile)
        suggestions = self._generate_suggestions(
            assessment_results, config.max_suggestions, vocab_level
        )
        next_steps = self._generate_next_steps(improvements, vocab_level)

        # Add growth mindset message
        growth_message = self._select_growth_mindset_message(scores, student_profile)

        # Generate encouragement
        encouragement = self._generate_encouragement(
            scores, vocab_level, config.tone, student_profile
        )

        # Use LLM for enhancement if configured and available
        if config.use_llm and self.openai_api_key:
            try:
                enhanced = self._enhance_with_llm(
                    summary, strengths, improvements, suggestions,
                    vocab_level, config.tone, student_profile
                )
                if enhanced:
                    return enhanced
            except Exception as e:
                logger.warning(f"LLM enhancement failed, using template feedback: {e}")

        return WritingFeedback(
            summary=summary,
            strengths=strengths[:5],
            areas_for_improvement=improvements[:5],
            specific_suggestions=suggestions[:config.max_suggestions],
            next_steps=next_steps[:3],
            encouragement=encouragement,
            growth_mindset_message=growth_message,
        )

    def _generate_summary(
        self,
        scores: Dict[str, Any],
        templates: Dict[str, str],
        vocab_level: str,
        student_profile: Optional[StudentProfile] = None,
    ) -> str:
        """Generate 2-3 sentence summary of the writing."""
        parts = [templates["summary_intro"]]

        overall_score = scores.get("overall", 0)
        holistic_score = scores.get("holistic", {}).get("score", 0)

        # Add score interpretation
        if holistic_score >= 5:
            parts.append("This is excellent writing that demonstrates strong skills across all areas.")
        elif holistic_score >= 4:
            parts.append("This is good writing that shows solid understanding of the topic.")
        elif holistic_score >= 3:
            parts.append("This writing meets basic expectations with room for improvement.")
        else:
            parts.append("This writing shows developing skills that need more practice.")

        # Add personalized observation based on student profile
        if student_profile and student_profile.previous_scores:
            avg_previous = sum(student_profile.previous_scores) / len(student_profile.previous_scores)
            current = holistic_score or overall_score / 100 * 6

            if current > avg_previous * 1.1:
                parts.append(" I notice improvement from your previous work!")
            elif student_profile.known_strengths:
                parts.append(f" Your {student_profile.known_strengths[0]} continues to be a strength.")

        # Add specific observation
        traits = scores.get("traits", {})
        if traits:
            valid_traits = [(k, v) for k, v in traits.items()
                          if isinstance(v, dict) and v.get("score", 0) > 0]
            if valid_traits:
                highest_trait = max(valid_traits, key=lambda x: x[1].get("score", 0))
                vocab = self.GRADE_VOCABULARY[vocab_level]
                trait_name = vocab.get(highest_trait[0], highest_trait[0].replace("_", " "))
                parts.append(f" Your {trait_name} is particularly strong.")

        return "".join(parts)

    def _identify_strengths(
        self,
        assessment_results: Dict[str, Any],
        vocab_level: str,
        student_profile: Optional[StudentProfile] = None,
    ) -> List[FeedbackPoint]:
        """Identify strengths from assessment results."""
        strengths = []
        vocab = self.GRADE_VOCABULARY[vocab_level]

        # Check trait scores
        scores = assessment_results.get("scores", {})
        traits = scores.get("traits", {})

        for trait_name, trait_data in traits.items():
            if isinstance(trait_data, dict):
                score = trait_data.get("score", 0)
                max_score = trait_data.get("max_score", 4)
                if score >= max_score * 0.75:
                    readable_name = vocab.get(trait_name, trait_name.replace("_", " "))
                    strengths.append(
                        FeedbackPoint(
                            area=readable_name.title(),
                            description=f"Your {readable_name} is strong.",
                            example_from_text=None,
                            priority=1,
                        )
                    )

        # Check coherence
        coherence = assessment_results.get("coherence_analysis", {})
        if coherence.get("overall_score", 0) > 0.7:
            strengths.append(
                FeedbackPoint(
                    area="Flow",
                    description=f"Your ideas {vocab.get('coherence', 'connect')} well.",
                    example_from_text=None,
                    priority=2,
                )
            )

        # Check style
        style = assessment_results.get("style_report", {})
        if style.get("word_variety_score", 0) > 0.6:
            strengths.append(
                FeedbackPoint(
                    area="Vocabulary",
                    description=f"You use varied {vocab.get('vocabulary', 'words')}.",
                    example_from_text=None,
                    priority=2,
                )
            )

        # Check grammar
        grammar = assessment_results.get("grammar_report", {})
        error_density = grammar.get("error_density", 100)
        if error_density < 2:
            strengths.append(
                FeedbackPoint(
                    area="Mechanics",
                    description=f"Your {vocab.get('conventions', 'spelling and grammar')} are accurate.",
                    example_from_text=None,
                    priority=2,
                )
            )

        # Check argumentation if available
        arg_structure = assessment_results.get("argumentation", {})
        if arg_structure.get("argument_strength_score", 0) > 0.6:
            strengths.append(
                FeedbackPoint(
                    area="Argument",
                    description="You make a clear argument with good support.",
                    example_from_text=None,
                    priority=1,
                )
            )

        # Add known strengths from profile
        if student_profile and student_profile.known_strengths:
            for known_strength in student_profile.known_strengths[:2]:
                if not any(s.area.lower() == known_strength.lower() for s in strengths):
                    strengths.append(
                        FeedbackPoint(
                            area=known_strength.title(),
                            description=f"You continue to show strength in {known_strength}.",
                            example_from_text=None,
                            priority=3,
                        )
                    )

        # Sort by priority
        strengths.sort(key=lambda x: x.priority)
        return strengths

    def _add_general_strengths(
        self,
        existing_strengths: List[FeedbackPoint],
        assessment_results: Dict[str, Any],
        vocab_level: str,
    ) -> List[FeedbackPoint]:
        """Add general strengths to meet the 2:1 ratio."""
        strengths = existing_strengths.copy()

        general_strengths = [
            FeedbackPoint(
                area="Effort",
                description="You clearly put thought into this piece.",
                priority=4,
            ),
            FeedbackPoint(
                area="Completion",
                description="You completed a full piece of writing.",
                priority=4,
            ),
            FeedbackPoint(
                area="Topic",
                description="You addressed the writing topic.",
                priority=4,
            ),
        ]

        for gs in general_strengths:
            if len(strengths) >= 4:
                break
            if not any(s.area == gs.area for s in strengths):
                strengths.append(gs)

        return strengths

    def _identify_improvements(
        self,
        assessment_results: Dict[str, Any],
        vocab_level: str,
        focus_areas: Optional[List[str]] = None,
        student_profile: Optional[StudentProfile] = None,
    ) -> List[FeedbackPoint]:
        """Identify areas for improvement."""
        improvements = []
        vocab = self.GRADE_VOCABULARY[vocab_level]

        # Check trait scores for weaknesses
        scores = assessment_results.get("scores", {})
        traits = scores.get("traits", {})

        for trait_name, trait_data in traits.items():
            if isinstance(trait_data, dict):
                score = trait_data.get("score", 0)
                max_score = trait_data.get("max_score", 4)
                if score < max_score * 0.5:
                    readable_name = vocab.get(trait_name, trait_name.replace("_", " "))
                    feedback = trait_data.get("feedback", f"Work on your {readable_name}.")
                    improvements.append(
                        FeedbackPoint(
                            area=readable_name.title(),
                            description=feedback,
                            example_from_text=None,
                            priority=1,
                        )
                    )

        # Check coherence issues
        coherence = assessment_results.get("coherence_analysis", {})
        global_coh = coherence.get("global_coherence", {})

        if not global_coh.get("has_clear_intro", True):
            improvements.append(
                FeedbackPoint(
                    area="Introduction",
                    description=self._select_template("weak_intro", vocab_level) or
                               f"Add a clear opening that introduces your {vocab.get('thesis', 'main idea')}.",
                    example_from_text=None,
                    priority=1,
                )
            )

        if not global_coh.get("has_clear_conclusion", True):
            improvements.append(
                FeedbackPoint(
                    area="Conclusion",
                    description=self._select_template("weak_conclusion", vocab_level) or
                               "End with a strong conclusion that wraps up your ideas.",
                    example_from_text=None,
                    priority=1,
                )
            )

        # Check transitions
        transition_analysis = coherence.get("transition_analysis", {})
        if transition_analysis.get("total_transitions", 0) < 3:
            improvements.append(
                FeedbackPoint(
                    area="Transitions",
                    description=self._select_template("missing_transitions", vocab_level),
                    example_from_text=None,
                    priority=2,
                )
            )

        # Check grammar issues
        grammar = assessment_results.get("grammar_report", {})
        by_category = grammar.get("by_category", {})

        if by_category.get("spelling", 0) > 3:
            improvements.append(
                FeedbackPoint(
                    area="Spelling",
                    description="Check your spelling carefully. Try reading backward to catch errors.",
                    example_from_text=None,
                    priority=2,
                )
            )

        if by_category.get("punctuation", 0) > 3:
            improvements.append(
                FeedbackPoint(
                    area="Punctuation",
                    description="Review your punctuation, especially at the end of sentences.",
                    example_from_text=None,
                    priority=2,
                )
            )

        # Check argumentation
        arg_structure = assessment_results.get("argumentation", {})
        missing_components = arg_structure.get("missing_components", [])

        for component in missing_components[:2]:
            improvements.append(
                FeedbackPoint(
                    area="Argument",
                    description=f"Consider adding: {component}",
                    example_from_text=None,
                    priority=2,
                )
            )

        # Filter by focus areas if specified
        if focus_areas:
            improvements = [
                imp for imp in improvements
                if any(area.lower() in imp.area.lower() for area in focus_areas)
            ]

        # Prioritize known weaknesses from profile
        if student_profile and student_profile.known_weaknesses:
            for weakness in student_profile.known_weaknesses:
                matching = [i for i in improvements if weakness.lower() in i.area.lower()]
                for m in matching:
                    m.priority = 0  # Highest priority

        # Sort by priority
        improvements.sort(key=lambda x: x.priority)
        return improvements

    def _generate_suggestions(
        self,
        assessment_results: Dict[str, Any],
        max_suggestions: int,
        vocab_level: str,
    ) -> List[Suggestion]:
        """Generate specific, actionable suggestions."""
        suggestions = []

        # Grammar-based suggestions
        grammar = assessment_results.get("grammar_report", {})
        errors = grammar.get("errors", [])

        for error in errors[:max_suggestions]:
            if isinstance(error, dict):
                original = error.get("context", "")
                replacements = error.get("replacements", [])
                message = error.get("message", "")
                category = error.get("category", "grammar")

                if replacements and original:
                    suggestions.append(
                        Suggestion(
                            category=category,
                            original_text=original[:100],
                            suggestion=replacements[0] if replacements else "",
                            explanation=message,
                            impact="high" if category in ["grammar", "spelling"] else "medium",
                        )
                    )

        # Coherence-based suggestions
        coherence = assessment_results.get("coherence_analysis", {})
        weak_transitions = coherence.get("local_coherence", {}).get("weak_transitions", [])

        for transition in weak_transitions[:2]:
            if isinstance(transition, dict):
                suggestions.append(
                    Suggestion(
                        category="transitions",
                        original_text=transition.get("before_text", "")[:50],
                        suggestion=transition.get("suggestion", "Add a transition word"),
                        explanation="This will help connect your ideas more smoothly.",
                        impact="medium",
                    )
                )

        # Style-based suggestions
        style = assessment_results.get("style_report", {})
        overused = style.get("overused_words", [])

        for word_info in overused[:2]:
            if isinstance(word_info, dict):
                word = word_info.get("word", "")
                alternatives = word_info.get("suggestions", [])
                if word and alternatives:
                    suggestions.append(
                        Suggestion(
                            category="word_choice",
                            original_text=f"'{word}' (used {word_info.get('count', 'many')} times)",
                            suggestion=f"Try using: {', '.join(alternatives[:3])}",
                            explanation="Varying your word choice makes writing more interesting.",
                            impact="low",
                        )
                    )

        # Argumentation suggestions
        arg_structure = assessment_results.get("argumentation", {})
        arg_suggestions = arg_structure.get("suggestions", [])

        for arg_sug in arg_suggestions[:2]:
            if arg_sug:
                suggestions.append(
                    Suggestion(
                        category="argumentation",
                        original_text="",
                        suggestion=arg_sug,
                        explanation="This will strengthen your argument.",
                        impact="high",
                    )
                )

        # Sort by impact
        impact_order = {"high": 0, "medium": 1, "low": 2}
        suggestions.sort(key=lambda x: impact_order.get(x.impact, 1))

        return suggestions[:max_suggestions]

    def _generate_next_steps(
        self,
        improvements: List[FeedbackPoint],
        vocab_level: str,
    ) -> List[str]:
        """Generate prioritized next steps."""
        next_steps = []

        if not improvements:
            return ["Keep writing and practicing your skills!"]

        # Prioritize by importance
        priority_order = [
            "organization",
            "ideas",
            "introduction",
            "conclusion",
            "argument",
            "vocabulary",
            "transitions",
            "spelling",
            "punctuation",
        ]

        sorted_improvements = sorted(
            improvements,
            key=lambda x: next(
                (i for i, p in enumerate(priority_order) if p in x.area.lower()),
                len(priority_order),
            ),
        )

        for improvement in sorted_improvements[:3]:
            if vocab_level == "elementary":
                next_steps.append(f"Practice working on {improvement.area.lower()}.")
            elif vocab_level == "middle":
                next_steps.append(f"Focus on improving your {improvement.area.lower()}.")
            else:
                next_steps.append(f"Prioritize developing your {improvement.area.lower()}.")

        return next_steps

    def _select_growth_mindset_message(
        self,
        scores: Dict[str, Any],
        student_profile: Optional[StudentProfile] = None,
    ) -> str:
        """Select appropriate growth mindset message."""
        import random

        overall = scores.get("overall", 50)
        holistic = scores.get("holistic", {}).get("score", 3)

        # Determine category
        if student_profile and student_profile.previous_scores:
            avg_prev = sum(student_profile.previous_scores) / len(student_profile.previous_scores)
            if overall > avg_prev * 1.1:
                category = "improving"
            elif overall > avg_prev * 0.9:
                category = "general"
            else:
                category = "struggling"
        elif holistic >= 4:
            category = "excelling"
        elif holistic >= 3:
            category = "general"
        else:
            category = "struggling"

        messages = self.GROWTH_MINDSET_MESSAGES.get(category, self.GROWTH_MINDSET_MESSAGES["general"])
        return random.choice(messages)

    def _generate_encouragement(
        self,
        scores: Dict[str, Any],
        vocab_level: str,
        tone: FeedbackTone,
        student_profile: Optional[StudentProfile] = None,
    ) -> str:
        """Generate personalized encouragement."""
        overall = scores.get("overall", 50)
        holistic = scores.get("holistic", {}).get("score", 3)

        if tone == FeedbackTone.CHALLENGING:
            if holistic >= 4:
                return "You have strong skills. Challenge yourself to push even further."
            else:
                return "This is an opportunity to rise to the challenge and improve significantly."

        # Default encouraging tone
        if student_profile and student_profile.learning_goals:
            goal = student_profile.learning_goals[0]
            return f"You're making progress toward your goal of {goal}. Keep working at it!"

        if vocab_level == "elementary":
            return "You're becoming a better writer every day! Keep it up!"
        elif vocab_level == "middle":
            return "Every piece of writing helps you grow. Keep challenging yourself!"
        else:
            return "Your dedication to improving your craft will pay off. Stay focused on your goals."

    def _enhance_with_llm(
        self,
        summary: str,
        strengths: List[FeedbackPoint],
        improvements: List[FeedbackPoint],
        suggestions: List[Suggestion],
        vocab_level: str,
        tone: FeedbackTone,
        student_profile: Optional[StudentProfile] = None,
    ) -> Optional[WritingFeedback]:
        """Enhance feedback using LLM for more personalized, natural language."""
        self._lazy_load_openai()

        if self._openai_client is None:
            return None

        try:
            # Build prompt
            profile_context = ""
            if student_profile:
                profile_context = f"""
Student Profile:
- Grade Level: {student_profile.grade_level}
- Known Strengths: {', '.join(student_profile.known_strengths) or 'Not specified'}
- Growth Areas: {', '.join(student_profile.known_weaknesses) or 'Not specified'}
- Learning Goals: {', '.join(student_profile.learning_goals) or 'Not specified'}
"""

            prompt = f"""You are a supportive writing coach providing feedback to a student.
Generate natural, personalized feedback based on this assessment:

Summary: {summary}
Strengths: {[s.description for s in strengths[:3]]}
Areas to Improve: {[i.description for i in improvements[:3]]}

Vocabulary Level: {vocab_level} (adjust language complexity accordingly)
Tone: {tone.value}
{profile_context}

Generate:
1. A 2-3 sentence personalized summary that feels natural
2. 2-3 specific, encouraging comments about strengths
3. 2-3 constructive suggestions for improvement
4. A growth mindset closing message

Keep the feedback warm, specific, and actionable. Maintain a {tone.value} tone throughout."""

            response = self._openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are an encouraging writing coach."},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=500,
                temperature=0.7,
            )

            # Parse response and create enhanced feedback
            llm_text = response.choices[0].message.content

            # Return enhanced version with LLM summary
            return WritingFeedback(
                summary=llm_text[:500] if llm_text else summary,
                strengths=strengths[:5],
                areas_for_improvement=improvements[:5],
                specific_suggestions=suggestions,
                next_steps=[s.description for s in improvements[:3]],
                encouragement=self.GROWTH_MINDSET_MESSAGES["general"][0],
                growth_mindset_message=self._select_growth_mindset_message({}, student_profile),
            )

        except Exception as e:
            logger.warning(f"LLM enhancement failed: {e}")
            return None

    def generate_trait_feedback(
        self,
        trait: str,
        score: float,
        max_score: float,
        grade_level: Optional[int] = None,
    ) -> str:
        """Generate feedback for a specific trait."""
        vocab_level = self._get_vocabulary_level(grade_level)
        vocab = self.GRADE_VOCABULARY[vocab_level]
        trait_name = vocab.get(trait, trait.replace("_", " "))

        ratio = score / max_score if max_score > 0 else 0

        if ratio >= 0.9:
            return f"Excellent {trait_name}! You demonstrate strong mastery in this area."
        elif ratio >= 0.75:
            return f"Good {trait_name}. You show solid skills with room for refinement."
        elif ratio >= 0.5:
            return f"Developing {trait_name}. Continue practicing to strengthen this area."
        else:
            return f"Your {trait_name} needs attention. Focus on this as a priority area."

    def prioritize_suggestions(
        self,
        issues: List[Dict[str, Any]],
        max_suggestions: int = 3,
    ) -> List[str]:
        """Prioritize most impactful suggestions."""
        # Score issues by impact
        scored_issues = []
        for issue in issues:
            impact_score = 0

            # Higher impact for more severe issues
            severity = issue.get("severity", "warning")
            if severity == "error":
                impact_score += 3
            elif severity == "warning":
                impact_score += 2
            else:
                impact_score += 1

            # Higher impact for common categories
            category = issue.get("category", "")
            if category in ["grammar", "spelling"]:
                impact_score += 2
            elif category in ["organization", "coherence"]:
                impact_score += 3
            else:
                impact_score += 1

            scored_issues.append((impact_score, issue))

        # Sort by impact and return top suggestions
        scored_issues.sort(key=lambda x: x[0], reverse=True)

        suggestions = []
        for _, issue in scored_issues[:max_suggestions]:
            message = issue.get("message", issue.get("description", ""))
            if message:
                suggestions.append(message)

        return suggestions

    def generate_feedback_for_assessment(
        self,
        full_assessment: Any,
        student_profile: Optional[StudentProfile] = None,
        config: Optional[FeedbackConfig] = None,
    ) -> WritingFeedback:
        """
        Generate feedback from a FullAssessmentResponse object.

        Args:
            full_assessment: FullAssessmentResponse from the assessment API
            student_profile: Optional student profile
            config: Optional feedback configuration

        Returns:
            WritingFeedback with comprehensive feedback
        """
        # Convert assessment to dictionary format
        assessment_dict = {
            "scores": {
                "overall": getattr(full_assessment, "overall_score", 0),
                "holistic": {
                    "score": getattr(getattr(full_assessment, "holistic_score", None), "score", 0),
                    "confidence": getattr(getattr(full_assessment, "holistic_score", None), "confidence", 0.5),
                },
                "traits": {},
            },
            "grammar_report": {},
            "coherence_analysis": {},
            "style_report": {},
            "readability_profile": {},
        }

        # Extract trait scores if available
        trait_scores = getattr(full_assessment, "trait_scores", None)
        if trait_scores and hasattr(trait_scores, "traits"):
            for trait_name, trait_data in trait_scores.traits.items():
                assessment_dict["scores"]["traits"][trait_name] = {
                    "score": getattr(trait_data, "score", 0),
                    "max_score": getattr(trait_data, "max_score", 4),
                    "feedback": getattr(trait_data, "feedback", ""),
                }

        # Extract grammar report
        grammar = getattr(full_assessment, "grammar_report", None)
        if grammar:
            assessment_dict["grammar_report"] = {
                "errors": [],
                "error_density": getattr(grammar, "error_density", 0),
                "by_category": getattr(grammar, "by_category", {}),
            }

        # Extract coherence analysis
        coherence = getattr(full_assessment, "coherence_analysis", None)
        if coherence:
            assessment_dict["coherence_analysis"] = {
                "overall_score": getattr(coherence, "overall_score", 0),
                "local_coherence": {
                    "weak_transitions": [],
                },
                "global_coherence": {
                    "has_clear_intro": getattr(getattr(coherence, "global_coherence", None), "has_clear_intro", True),
                    "has_clear_conclusion": getattr(getattr(coherence, "global_coherence", None), "has_clear_conclusion", True),
                },
            }

        # Extract style report
        style = getattr(full_assessment, "style_report", None)
        if style:
            assessment_dict["style_report"] = {
                "word_variety_score": getattr(style, "word_variety_score", 0),
                "tone": getattr(style, "tone", "neutral"),
                "overused_words": [],
            }

        return self.generate(
            assessment_dict,
            student_profile=student_profile,
            config=config,
        )
