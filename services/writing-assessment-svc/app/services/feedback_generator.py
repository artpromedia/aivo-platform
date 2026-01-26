"""
Feedback Generator for constructive writing feedback.

Synthesizes assessment results into actionable, encouraging feedback
appropriate for the student's grade level and learning context.
"""

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class FeedbackPoint:
    """Single feedback point."""

    area: str
    description: str
    example_from_text: Optional[str] = None


@dataclass
class Suggestion:
    """Specific improvement suggestion."""

    category: str
    original_text: str
    suggestion: str
    explanation: str


@dataclass
class WritingFeedback:
    """Complete writing feedback."""

    summary: str
    strengths: List[FeedbackPoint] = field(default_factory=list)
    areas_for_improvement: List[FeedbackPoint] = field(default_factory=list)
    specific_suggestions: List[Suggestion] = field(default_factory=list)
    next_steps: List[str] = field(default_factory=list)


class FeedbackGenerator:
    """
    Generate constructive writing feedback.

    Features:
    - Tone-appropriate feedback (encouraging, balanced, direct)
    - Grade-level appropriate language
    - Specific, actionable suggestions
    - Strength highlighting
    - Prioritized improvements

    Usage:
        generator = FeedbackGenerator()
        feedback = generator.generate(assessment_results, tone="encouraging")
    """

    # Feedback templates by style
    TEMPLATES = {
        "encouraging": {
            "summary_intro": "Great effort on your writing! ",
            "strength_prefix": "You did a nice job with ",
            "improvement_prefix": "You could strengthen your writing by ",
            "next_step_prefix": "Try focusing on ",
        },
        "direct": {
            "summary_intro": "Here is your feedback: ",
            "strength_prefix": "Strengths include ",
            "improvement_prefix": "Areas needing work: ",
            "next_step_prefix": "Next, work on ",
        },
        "detailed": {
            "summary_intro": "Assessment Summary: ",
            "strength_prefix": "Notable strengths: ",
            "improvement_prefix": "Areas for improvement: ",
            "next_step_prefix": "Recommended next steps: ",
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
        },
    }

    def __init__(self):
        """Initialize the feedback generator."""
        logger.info("FeedbackGenerator initialized")

    def generate(
        self,
        assessment_results: Dict[str, Any],
        feedback_style: str = "encouraging",
        focus_areas: Optional[List[str]] = None,
        max_suggestions: int = 5,
        grade_level: Optional[int] = None,
    ) -> WritingFeedback:
        """
        Generate comprehensive feedback from assessment results.

        Args:
            assessment_results: Dictionary containing analysis results
            feedback_style: Tone of feedback (encouraging, direct, detailed)
            focus_areas: Specific areas to focus feedback on
            max_suggestions: Maximum number of specific suggestions
            grade_level: Student's grade level for vocabulary adjustment

        Returns:
            WritingFeedback with summary, strengths, improvements, and suggestions
        """
        # Determine vocabulary level
        vocab_level = self._get_vocabulary_level(grade_level)
        templates = self.TEMPLATES.get(feedback_style, self.TEMPLATES["encouraging"])

        # Extract assessment components
        scores = assessment_results.get("scores", {})
        grammar_report = assessment_results.get("grammar_report", {})
        coherence_analysis = assessment_results.get("coherence_analysis", {})
        style_report = assessment_results.get("style_report", {})
        readability_profile = assessment_results.get("readability_profile", {})

        # Generate components
        summary = self._generate_summary(scores, templates, vocab_level)
        strengths = self._identify_strengths(assessment_results, vocab_level)
        improvements = self._identify_improvements(
            assessment_results, vocab_level, focus_areas
        )
        suggestions = self._generate_suggestions(
            assessment_results, max_suggestions, vocab_level
        )
        next_steps = self._generate_next_steps(improvements, vocab_level)

        return WritingFeedback(
            summary=summary,
            strengths=strengths[:5],
            areas_for_improvement=improvements[:5],
            specific_suggestions=suggestions[:max_suggestions],
            next_steps=next_steps[:3],
        )

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

    def _generate_summary(
        self,
        scores: Dict[str, Any],
        templates: Dict[str, str],
        vocab_level: str,
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

        # Add specific observation
        traits = scores.get("traits", {})
        if traits:
            highest_trait = max(traits.items(), key=lambda x: x[1].get("score", 0) if isinstance(x[1], dict) else 0)
            vocab = self.GRADE_VOCABULARY[vocab_level]
            trait_name = vocab.get(highest_trait[0], highest_trait[0].replace("_", " "))
            parts.append(f" Your {trait_name} is particularly strong.")

        return "".join(parts)

    def _identify_strengths(
        self,
        assessment_results: Dict[str, Any],
        vocab_level: str,
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
                )
            )

        return strengths

    def _identify_improvements(
        self,
        assessment_results: Dict[str, Any],
        vocab_level: str,
        focus_areas: Optional[List[str]] = None,
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
                        )
                    )

        # Check coherence issues
        coherence = assessment_results.get("coherence_analysis", {})
        global_coh = coherence.get("global_coherence", {})

        if not global_coh.get("has_clear_intro", True):
            improvements.append(
                FeedbackPoint(
                    area="Introduction",
                    description=f"Add a clear opening that introduces your {vocab.get('thesis', 'main idea')}.",
                    example_from_text=None,
                )
            )

        if not global_coh.get("has_clear_conclusion", True):
            improvements.append(
                FeedbackPoint(
                    area="Conclusion",
                    description="End with a strong conclusion that wraps up your ideas.",
                    example_from_text=None,
                )
            )

        # Check grammar issues
        grammar = assessment_results.get("grammar_report", {})
        by_category = grammar.get("by_category", {})

        if by_category.get("spelling", 0) > 3:
            improvements.append(
                FeedbackPoint(
                    area="Spelling",
                    description="Check your spelling carefully. Try reading backwards to catch errors.",
                    example_from_text=None,
                )
            )

        if by_category.get("punctuation", 0) > 3:
            improvements.append(
                FeedbackPoint(
                    area="Punctuation",
                    description="Review your punctuation, especially at the end of sentences.",
                    example_from_text=None,
                )
            )

        # Filter by focus areas if specified
        if focus_areas:
            improvements = [
                imp for imp in improvements
                if any(area.lower() in imp.area.lower() for area in focus_areas)
            ]

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
                        )
                    )

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
            "vocabulary",
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
            else:
                next_steps.append(f"Focus on improving your {improvement.area.lower()}.")

        return next_steps

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
