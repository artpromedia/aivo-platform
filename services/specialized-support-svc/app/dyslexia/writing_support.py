"""
Dyslexia Writing Support Service.

Provides writing assistance, spelling support, and organizational tools
for learners with dyslexia.
"""

import logging
from typing import Any, Dict, List, Optional

from .models import (
    DyslexiaProfile,
    WritingAssistance,
    WritingChallenge,
    WritingSupport,
)

logger = logging.getLogger(__name__)


class WritingSupportService:
    """
    Service for writing support and assistance.
    
    Provides:
    - Graphic organizers
    - Sentence starters
    - Spelling support
    - Word suggestions
    - Writing templates
    """

    # Sentence starters by writing type
    SENTENCE_STARTERS = {
        "narrative": [
            "One day, ",
            "It all started when ",
            "I remember when ",
            "The first thing that happened was ",
            "Suddenly, ",
            "After that, ",
            "In the end, ",
            "Finally, ",
        ],
        "persuasive": [
            "I believe that ",
            "In my opinion, ",
            "One reason is ",
            "Another reason is ",
            "For example, ",
            "This shows that ",
            "In conclusion, ",
            "Therefore, ",
        ],
        "informative": [
            "This is about ",
            "First, ",
            "Next, ",
            "Also, ",
            "For instance, ",
            "In addition, ",
            "Most importantly, ",
            "To summarize, ",
        ],
        "descriptive": [
            "It looks like ",
            "It sounds like ",
            "It feels like ",
            "You can see ",
            "I noticed that ",
            "The most interesting part is ",
            "It reminds me of ",
        ],
    }

    # Graphic organizer templates
    GRAPHIC_ORGANIZERS = {
        "paragraph": {
            "name": "Paragraph Organizer",
            "sections": [
                {"label": "Topic Sentence", "prompt": "What is your main idea?"},
                {"label": "Detail 1", "prompt": "Give your first supporting detail"},
                {"label": "Detail 2", "prompt": "Give your second supporting detail"},
                {"label": "Detail 3", "prompt": "Give your third supporting detail"},
                {"label": "Conclusion", "prompt": "How will you end?"},
            ],
        },
        "essay": {
            "name": "Essay Organizer",
            "sections": [
                {"label": "Introduction", "prompt": "Hook + thesis statement"},
                {"label": "Body 1", "prompt": "First main point with evidence"},
                {"label": "Body 2", "prompt": "Second main point with evidence"},
                {"label": "Body 3", "prompt": "Third main point with evidence"},
                {"label": "Conclusion", "prompt": "Restate thesis + final thoughts"},
            ],
        },
        "story": {
            "name": "Story Map",
            "sections": [
                {"label": "Characters", "prompt": "Who is in your story?"},
                {"label": "Setting", "prompt": "Where and when does it happen?"},
                {"label": "Problem", "prompt": "What is the main problem?"},
                {"label": "Events", "prompt": "What happens? (1, 2, 3...)"},
                {"label": "Solution", "prompt": "How is the problem solved?"},
            ],
        },
        "compare_contrast": {
            "name": "Compare/Contrast",
            "sections": [
                {"label": "Topic 1", "prompt": "What is the first thing?"},
                {"label": "Topic 2", "prompt": "What is the second thing?"},
                {"label": "Similarities", "prompt": "How are they the same?"},
                {"label": "Differences", "prompt": "How are they different?"},
                {"label": "Conclusion", "prompt": "What did you learn?"},
            ],
        },
    }

    # Common spelling mistake patterns and corrections
    SPELLING_PATTERNS = {
        "there/their/they're": {
            "there": "for places (over there)",
            "their": "belongs to them (their book)",
            "they're": "they are (they're happy)",
        },
        "to/too/two": {
            "to": "direction or infinitive (go to, to run)",
            "too": "also or too much",
            "two": "the number 2",
        },
        "your/you're": {
            "your": "belongs to you (your book)",
            "you're": "you are (you're smart)",
        },
        "its/it's": {
            "its": "belongs to it (the dog wagged its tail)",
            "it's": "it is (it's raining)",
        },
    }

    def __init__(self, llm_client: Optional[Any] = None):
        """Initialize the writing support service."""
        self.llm = llm_client
        logger.info("WritingSupportService initialized")

    async def get_writing_assistance(
        self,
        task_type: str,
        profile: DyslexiaProfile,
        topic: Optional[str] = None,
    ) -> WritingAssistance:
        """
        Get comprehensive writing assistance for a task.
        
        Args:
            task_type: Type of writing (paragraph, essay, story)
            profile: Dyslexia profile
            topic: Optional topic for the writing
            
        Returns:
            WritingAssistance with organizers, starters, and suggestions
        """
        # Get graphic organizer
        organizer_type = self._map_task_to_organizer(task_type)
        organizer = self.GRAPHIC_ORGANIZERS.get(
            organizer_type,
            self.GRAPHIC_ORGANIZERS["paragraph"]
        )
        
        # Get sentence starters
        starters_type = self._map_task_to_starters(task_type)
        starters = self.SENTENCE_STARTERS.get(
            starters_type,
            self.SENTENCE_STARTERS["informative"]
        )
        
        # Get word suggestions if topic provided
        word_suggestions = []
        if topic:
            word_suggestions = await self._get_topic_words(topic)
        
        # Create structure template
        template = self._create_template(task_type, organizer)
        
        return WritingAssistance(
            task_type=task_type,
            graphic_organizer=organizer,
            sentence_starters=starters,
            word_suggestions=word_suggestions,
            structure_template=template,
        )

    async def get_spelling_support(
        self,
        word: str,
        profile: DyslexiaProfile,
    ) -> Dict[str, Any]:
        """
        Get spelling support for a word.
        
        Args:
            word: Word that needs spelling help
            profile: Dyslexia profile
            
        Returns:
            Dictionary with spelling suggestions and tips
        """
        word_lower = word.lower()
        
        result = {
            "original": word,
            "suggestions": [],
            "tips": [],
            "mnemonics": [],
        }
        
        # Check for common confusions
        for confusion_set, meanings in self.SPELLING_PATTERNS.items():
            words_in_set = confusion_set.split("/")
            if word_lower in words_in_set:
                result["confusion_set"] = confusion_set
                result["meanings"] = meanings
                result["tips"].append(
                    f"'{word}' is often confused with: {', '.join(w for w in words_in_set if w != word_lower)}"
                )
        
        # Generate spelling strategies
        result["strategies"] = self._get_spelling_strategies(word, profile)
        
        # Check profile difficult patterns
        for pattern in profile.difficult_patterns:
            if pattern in word_lower:
                result["tips"].append(
                    f"This word contains '{pattern}', which you find challenging. "
                    f"Practice words with this pattern."
                )
        
        # Add mnemonic if available
        mnemonic = self._get_mnemonic(word_lower)
        if mnemonic:
            result["mnemonics"].append(mnemonic)
        
        return result

    async def check_and_suggest(
        self,
        text: str,
        profile: DyslexiaProfile,
    ) -> Dict[str, Any]:
        """
        Check writing and provide suggestions.
        
        Args:
            text: Text to check
            profile: Dyslexia profile
            
        Returns:
            Dictionary with suggestions for improvement
        """
        suggestions = {
            "spelling_issues": [],
            "structure_suggestions": [],
            "clarity_suggestions": [],
            "encouragement": [],
        }
        
        # Check for common confusable words
        words = text.lower().split()
        for word in words:
            for confusion_set in self.SPELLING_PATTERNS.keys():
                if word in confusion_set.split("/"):
                    suggestions["spelling_issues"].append({
                        "word": word,
                        "note": f"Check if '{word}' is correct in this context",
                        "options": self.SPELLING_PATTERNS[confusion_set],
                    })
        
        # Check sentence structure
        sentences = text.split(".")
        for i, sentence in enumerate(sentences):
            sentence = sentence.strip()
            if sentence:
                # Very short sentence
                if len(sentence.split()) < 3:
                    suggestions["structure_suggestions"].append(
                        f"Sentence {i+1} is very short. Can you add more detail?"
                    )
                # Very long sentence
                elif len(sentence.split()) > 25:
                    suggestions["structure_suggestions"].append(
                        f"Sentence {i+1} is quite long. Can you break it up?"
                    )
        
        # Check based on profile challenges
        if WritingChallenge.ORGANIZATION in profile.writing_challenges:
            suggestions["clarity_suggestions"].append(
                "Try using a graphic organizer to plan your ideas before writing"
            )
        
        if WritingChallenge.SENTENCE_STRUCTURE in profile.writing_challenges:
            suggestions["clarity_suggestions"].append(
                "Review your sentence starters for variety"
            )
        
        # Always add encouragement
        suggestions["encouragement"] = [
            "Great job getting your ideas down!",
            "Remember: the first draft doesn't have to be perfect",
            "You can always revise and improve later",
        ]
        
        return suggestions

    async def get_word_bank(
        self,
        topic: str,
        word_type: Optional[str] = None,
    ) -> Dict[str, List[str]]:
        """
        Get a word bank for a topic.
        
        Args:
            topic: Topic for the word bank
            word_type: Optional specific type (verbs, adjectives, etc.)
            
        Returns:
            Dictionary organized by word type
        """
        # Base word bank structure
        word_bank = {
            "nouns": [],
            "verbs": [],
            "adjectives": [],
            "transition_words": [
                "first", "next", "then", "after", "finally",
                "also", "however", "therefore", "because", "although",
            ],
        }
        
        # Add topic-specific words (simplified - would use more sophisticated lookup)
        topic_lower = topic.lower()
        
        if "science" in topic_lower or "experiment" in topic_lower:
            word_bank["nouns"].extend(["experiment", "result", "observation", "hypothesis"])
            word_bank["verbs"].extend(["observe", "measure", "test", "discover"])
            word_bank["adjectives"].extend(["scientific", "accurate", "careful", "important"])
        
        elif "story" in topic_lower or "narrative" in topic_lower:
            word_bank["nouns"].extend(["character", "setting", "problem", "solution"])
            word_bank["verbs"].extend(["happened", "discovered", "decided", "felt"])
            word_bank["adjectives"].extend(["exciting", "surprising", "scary", "happy"])
        
        elif "opinion" in topic_lower or "persuasive" in topic_lower:
            word_bank["nouns"].extend(["reason", "example", "evidence", "opinion"])
            word_bank["verbs"].extend(["believe", "think", "agree", "disagree"])
            word_bank["adjectives"].extend(["important", "best", "right", "fair"])
        
        # Filter by word type if specified
        if word_type and word_type in word_bank:
            return {word_type: word_bank[word_type]}
        
        return word_bank

    async def get_writing_accommodations(
        self,
        profile: DyslexiaProfile,
        context: Dict[str, Any] = None,
    ) -> List[str]:
        """
        Get writing accommodations based on profile.
        
        Args:
            profile: Dyslexia profile
            context: Optional context
            
        Returns:
            List of recommended accommodations
        """
        context = context or {}
        accommodations = []
        
        # Base accommodations
        accommodations.extend([
            "Extended time for writing tasks",
            "Access to spell-check and grammar tools",
            "Use of speech-to-text technology",
            "Graphic organizers for planning",
        ])
        
        # Based on writing challenges
        for challenge in profile.writing_challenges:
            if challenge == WritingChallenge.SPELLING:
                accommodations.extend([
                    "Personal dictionary or word bank",
                    "No penalty for spelling in drafts",
                    "Focus evaluation on content, not spelling",
                ])
            elif challenge == WritingChallenge.ORGANIZATION:
                accommodations.extend([
                    "Structured templates for writing",
                    "Step-by-step writing guides",
                    "Checklists for writing process",
                ])
            elif challenge == WritingChallenge.LETTER_REVERSAL:
                accommodations.extend([
                    "Use of keyboard instead of handwriting",
                    "Letter formation guides available",
                    "Extra time for proofreading",
                ])
            elif challenge == WritingChallenge.WORD_RETRIEVAL:
                accommodations.extend([
                    "Word banks provided",
                    "Thesaurus access",
                    "Extra think time",
                ])
        
        # Context-specific
        situation = context.get("situation", "general")
        if situation == "test":
            accommodations.extend([
                "Oral response option if available",
                "Extra time (typically 1.5x)",
                "Use of computer/keyboard",
            ])
        
        return list(set(accommodations))

    def _map_task_to_organizer(self, task_type: str) -> str:
        """Map task type to graphic organizer."""
        mapping = {
            "paragraph": "paragraph",
            "essay": "essay",
            "story": "story",
            "narrative": "story",
            "compare": "compare_contrast",
            "comparison": "compare_contrast",
        }
        return mapping.get(task_type.lower(), "paragraph")

    def _map_task_to_starters(self, task_type: str) -> str:
        """Map task type to sentence starters."""
        mapping = {
            "paragraph": "informative",
            "essay": "persuasive",
            "story": "narrative",
            "narrative": "narrative",
            "persuasive": "persuasive",
            "opinion": "persuasive",
            "informative": "informative",
            "descriptive": "descriptive",
        }
        return mapping.get(task_type.lower(), "informative")

    async def _get_topic_words(self, topic: str) -> List[str]:
        """Get words related to a topic."""
        # Placeholder - would use more sophisticated lookup
        return [f"[words related to: {topic}]"]

    def _create_template(
        self,
        task_type: str,
        organizer: Dict[str, Any],
    ) -> str:
        """Create a writing template from an organizer."""
        lines = [f"# {organizer['name']}\n"]
        
        for section in organizer["sections"]:
            lines.append(f"## {section['label']}")
            lines.append(f"_{section['prompt']}_")
            lines.append("")  # Space for writing
            lines.append("---")
        
        return "\n".join(lines)

    def _get_spelling_strategies(
        self,
        word: str,
        profile: DyslexiaProfile,
    ) -> List[str]:
        """Get spelling strategies for a word."""
        strategies = [
            "Break the word into syllables",
            "Sound it out slowly",
            "Look for smaller words inside",
            "Use the 'look, cover, write, check' method",
        ]
        
        if len(word) > 6:
            strategies.append("Practice spelling it in chunks")
        
        return strategies

    def _get_mnemonic(self, word: str) -> Optional[str]:
        """Get a mnemonic for a word."""
        mnemonics = {
            "because": "Big Elephants Can Always Understand Small Elephants",
            "friend": "friEND - a friend to the END",
            "said": "Sally Ann Is Dancing",
            "does": "Dogs Only Eat Sausages",
            "necessary": "one Collar and two Sleeves",
            "separate": "there's A RAT in sepARATE",
        }
        return mnemonics.get(word)
