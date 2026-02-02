"""
Anxiety Coping Strategies Service.

Provides coping strategies, cognitive reframing, and
anxiety management techniques.
"""

import logging
from typing import Any, Dict, List, Optional

from .models import (
    AnxietyLevel,
    AnxietyProfile,
    AnxietyTrigger,
    CopingCategory,
    CopingStrategy,
    TriggerCategory,
    WorryThought,
)

logger = logging.getLogger(__name__)


class CopingStrategiesService:
    """
    Service for coping strategies and anxiety management.
    
    Provides:
    - Coping strategy recommendations
    - Cognitive reframing support
    - Test anxiety strategies
    - Social anxiety strategies
    """

    # Library of coping strategies
    COPING_STRATEGIES = {
        CopingCategory.BREATHING: [
            CopingStrategy(
                name="4-7-8 Breathing",
                category=CopingCategory.BREATHING,
                steps=[
                    "Breathe in through your nose for 4 seconds",
                    "Hold your breath for 7 seconds",
                    "Exhale slowly through your mouth for 8 seconds",
                    "Repeat 3-4 times",
                ],
                duration_minutes=3,
                best_for=[AnxietyLevel.MILD, AnxietyLevel.MODERATE],
            ),
            CopingStrategy(
                name="Box Breathing",
                category=CopingCategory.BREATHING,
                steps=[
                    "Breathe in for 4 seconds",
                    "Hold for 4 seconds",
                    "Breathe out for 4 seconds",
                    "Hold for 4 seconds",
                    "Repeat 4 times",
                ],
                duration_minutes=2,
                best_for=[AnxietyLevel.MILD, AnxietyLevel.MODERATE, AnxietyLevel.HIGH],
            ),
            CopingStrategy(
                name="Belly Breathing",
                category=CopingCategory.BREATHING,
                steps=[
                    "Place one hand on your belly",
                    "Breathe in slowly, feel your belly rise",
                    "Breathe out slowly, feel your belly fall",
                    "Focus on the movement",
                    "Continue for 1-2 minutes",
                ],
                duration_minutes=2,
                best_for=[AnxietyLevel.MILD, AnxietyLevel.MODERATE],
            ),
        ],
        CopingCategory.GROUNDING: [
            CopingStrategy(
                name="5-4-3-2-1 Grounding",
                category=CopingCategory.GROUNDING,
                steps=[
                    "Name 5 things you can SEE",
                    "Name 4 things you can TOUCH",
                    "Name 3 things you can HEAR",
                    "Name 2 things you can SMELL",
                    "Name 1 thing you can TASTE",
                ],
                duration_minutes=3,
                best_for=[AnxietyLevel.MODERATE, AnxietyLevel.HIGH],
            ),
            CopingStrategy(
                name="Physical Grounding",
                category=CopingCategory.GROUNDING,
                steps=[
                    "Press your feet firmly into the floor",
                    "Feel the chair supporting you",
                    "Notice your hands - are they warm or cool?",
                    "Take a slow, deep breath",
                    "You are here. You are safe.",
                ],
                duration_minutes=2,
                best_for=[AnxietyLevel.HIGH, AnxietyLevel.SEVERE],
            ),
            CopingStrategy(
                name="Cold Water Reset",
                category=CopingCategory.GROUNDING,
                steps=[
                    "Get cold water (or hold something cold)",
                    "Splash cold water on your face or hold ice",
                    "Focus on the cold sensation",
                    "Take slow breaths",
                    "Notice as your body calms",
                ],
                duration_minutes=2,
                best_for=[AnxietyLevel.HIGH, AnxietyLevel.SEVERE],
            ),
        ],
        CopingCategory.COGNITIVE: [
            CopingStrategy(
                name="Thought Challenge",
                category=CopingCategory.COGNITIVE,
                steps=[
                    "Notice the anxious thought",
                    "Ask: Is this thought definitely true?",
                    "Ask: What's the evidence for and against?",
                    "Ask: What would I tell a friend?",
                    "Create a more balanced thought",
                ],
                duration_minutes=5,
                best_for=[AnxietyLevel.MILD, AnxietyLevel.MODERATE],
            ),
            CopingStrategy(
                name="Worst Case/Best Case/Most Likely",
                category=CopingCategory.COGNITIVE,
                steps=[
                    "What's the WORST that could happen?",
                    "What's the BEST that could happen?",
                    "What's MOST LIKELY to happen?",
                    "Focus on the most likely outcome",
                    "Make a plan for handling it",
                ],
                duration_minutes=5,
                best_for=[AnxietyLevel.MILD, AnxietyLevel.MODERATE],
            ),
            CopingStrategy(
                name="Coping Statements",
                category=CopingCategory.COGNITIVE,
                steps=[
                    "Choose a coping statement that helps you:",
                    "- 'I can handle this'",
                    "- 'This feeling will pass'",
                    "- 'I've gotten through hard things before'",
                    "- 'I am safe right now'",
                    "Repeat it to yourself slowly",
                ],
                duration_minutes=2,
                best_for=[AnxietyLevel.MODERATE, AnxietyLevel.HIGH],
            ),
        ],
        CopingCategory.PHYSICAL: [
            CopingStrategy(
                name="Progressive Muscle Relaxation (Quick)",
                category=CopingCategory.PHYSICAL,
                steps=[
                    "Tense your shoulders up to your ears for 5 seconds",
                    "Release and notice the difference",
                    "Clench your fists tight for 5 seconds",
                    "Release and notice the difference",
                    "Scrunch your face for 5 seconds",
                    "Release and relax",
                ],
                duration_minutes=3,
                best_for=[AnxietyLevel.MODERATE, AnxietyLevel.HIGH],
            ),
            CopingStrategy(
                name="Movement Break",
                category=CopingCategory.PHYSICAL,
                steps=[
                    "Stand up if possible",
                    "Shake out your hands and arms",
                    "Roll your shoulders",
                    "Take a short walk (even just to the door and back)",
                    "Return and take 3 deep breaths",
                ],
                duration_minutes=2,
                best_for=[AnxietyLevel.MILD, AnxietyLevel.MODERATE],
            ),
        ],
    }

    # Test anxiety specific strategies
    TEST_ANXIETY_STRATEGIES = [
        {
            "timing": "before_test",
            "strategies": [
                "Review material in small chunks, not all at once",
                "Get good sleep the night before",
                "Eat a balanced breakfast",
                "Arrive with time to spare",
                "Use calming techniques before entering",
            ],
        },
        {
            "timing": "during_test",
            "strategies": [
                "Read instructions carefully",
                "Start with questions you know",
                "Skip and return to hard questions",
                "Use deep breathing if feeling anxious",
                "Focus on one question at a time",
                "Use positive self-talk",
            ],
        },
        {
            "timing": "if_stuck",
            "strategies": [
                "Take 3 deep breaths",
                "Move to another question",
                "Close your eyes briefly and reset",
                "Remember: it's okay not to know everything",
                "Do your best and move on",
            ],
        },
    ]

    # Social anxiety specific strategies
    SOCIAL_ANXIETY_STRATEGIES = [
        {
            "situation": "before_social_event",
            "strategies": [
                "Prepare conversation topics in advance",
                "Set a realistic goal (e.g., talk to 2 people)",
                "Plan your exit strategy",
                "Remind yourself of past successes",
                "Practice deep breathing",
            ],
        },
        {
            "situation": "during_social_event",
            "strategies": [
                "Focus on listening, not performing",
                "Ask questions - people like talking about themselves",
                "Take breaks if needed",
                "Remember: most people are focused on themselves",
                "Use grounding if overwhelmed",
            ],
        },
        {
            "situation": "speaking_in_class",
            "strategies": [
                "Prepare what you'll say in advance",
                "Write notes to reference",
                "Take a breath before speaking",
                "Speak to one friendly face",
                "Remember: it's okay to be brief",
            ],
        },
    ]

    def __init__(self, llm_client: Optional[Any] = None):
        """Initialize the coping strategies service."""
        self.llm = llm_client
        logger.info("CopingStrategiesService initialized")

    async def get_strategies(
        self,
        profile: AnxietyProfile,
        current_level: AnxietyLevel,
        context: Dict[str, Any] = None,
    ) -> List[CopingStrategy]:
        """
        Get coping strategies based on current anxiety level.
        
        Args:
            profile: Anxiety profile
            current_level: Current anxiety level
            context: Optional context
            
        Returns:
            List of recommended coping strategies
        """
        context = context or {}
        strategies = []
        
        # Get strategies appropriate for the level
        for category, cat_strategies in self.COPING_STRATEGIES.items():
            for strategy in cat_strategies:
                if current_level in strategy.best_for:
                    strategies.append(strategy)
        
        # Prioritize effective strategies from profile
        effective_ids = {s.id for s in profile.effective_coping}
        strategies.sort(key=lambda s: s.id in effective_ids, reverse=True)
        
        # For severe anxiety, prioritize grounding
        if current_level == AnxietyLevel.SEVERE:
            grounding = [s for s in strategies if s.category == CopingCategory.GROUNDING]
            others = [s for s in strategies if s.category != CopingCategory.GROUNDING]
            strategies = grounding + others
        
        return strategies[:5]  # Return top 5

    async def get_test_anxiety_strategies(
        self,
        profile: AnxietyProfile,
        timing: str = "before_test",
    ) -> Dict[str, Any]:
        """
        Get test anxiety specific strategies.
        
        Args:
            profile: Anxiety profile
            timing: When the support is needed (before_test, during_test, if_stuck)
            
        Returns:
            Dictionary with strategies and accommodations
        """
        # Find timing-specific strategies
        timing_strategies = None
        for item in self.TEST_ANXIETY_STRATEGIES:
            if item["timing"] == timing:
                timing_strategies = item
                break
        
        strategies = timing_strategies["strategies"] if timing_strategies else []
        
        # Add profile-specific effective coping
        effective = [s.name for s in profile.effective_coping[:3]]
        
        # Get accommodations for tests
        accommodations = self._get_test_accommodations(profile)
        
        return {
            "timing": timing,
            "strategies": strategies,
            "effective_coping": effective,
            "accommodations": accommodations,
            "reminder": "Remember: You've prepared. You can do this.",
        }

    async def get_social_anxiety_strategies(
        self,
        profile: AnxietyProfile,
        situation: str = "before_social_event",
    ) -> Dict[str, Any]:
        """
        Get social anxiety specific strategies.
        
        Args:
            profile: Anxiety profile
            situation: Type of social situation
            
        Returns:
            Dictionary with strategies and tips
        """
        # Find situation-specific strategies
        situation_strategies = None
        for item in self.SOCIAL_ANXIETY_STRATEGIES:
            if item["situation"] == situation:
                situation_strategies = item
                break
        
        strategies = situation_strategies["strategies"] if situation_strategies else []
        
        # Add effective coping from profile
        effective = [s.name for s in profile.effective_coping[:3]]
        
        return {
            "situation": situation,
            "strategies": strategies,
            "effective_coping": effective,
            "safe_person": profile.safe_person,
            "exit_plan": "It's always okay to step out if you need a break",
        }

    async def reframe_thought(
        self,
        profile: AnxietyProfile,
        anxious_thought: str,
    ) -> WorryThought:
        """
        Help reframe an anxious thought.
        
        Args:
            profile: Anxiety profile
            anxious_thought: The worry thought to reframe
            
        Returns:
            WorryThought with reframed version
        """
        # Simple reframing patterns
        reframe_patterns = {
            "fail": "Not knowing everything doesn't mean failing. Focus on what you DO know.",
            "everyone": "Not everyone is focused on you. Most people are thinking about themselves.",
            "can't": "You've handled hard things before. You can try your best.",
            "never": "Change the 'never' to 'not yet' - you're still learning.",
            "always": "Think of times when this wasn't true. Things can change.",
            "worst": "Think about what's most LIKELY, not just the worst case.",
            "stupid": "Making mistakes doesn't make you stupid - it makes you human and learning.",
        }
        
        reframed = None
        thought_lower = anxious_thought.lower()
        
        for keyword, reframe in reframe_patterns.items():
            if keyword in thought_lower:
                reframed = reframe
                break
        
        if not reframed:
            reframed = (
                "Ask yourself: Is this thought 100% true? "
                "What would a friend say? "
                "What's a more balanced way to think about this?"
            )
        
        return WorryThought(
            thought=anxious_thought,
            reframed_thought=reframed,
        )

    async def get_immediate_help(
        self,
        current_level: AnxietyLevel,
    ) -> List[str]:
        """
        Get immediate help steps for acute anxiety.
        
        Args:
            current_level: Current anxiety level
            
        Returns:
            List of immediate help steps
        """
        if current_level == AnxietyLevel.SEVERE:
            return [
                "🛑 PAUSE - You are safe right now",
                "👃 Breathe slowly - in for 4, out for 4",
                "👀 Look around - name 5 things you see",
                "🤲 Press your feet into the floor - feel grounded",
                "💧 Get cold water if possible",
                "🗣️ Tell a safe person how you're feeling",
                "⏰ This feeling WILL pass",
            ]
        elif current_level == AnxietyLevel.HIGH:
            return [
                "Take a slow deep breath",
                "Use 5-4-3-2-1 grounding",
                "Remind yourself: 'I am safe'",
                "Move to a calmer space if possible",
                "Use a coping skill that works for you",
            ]
        else:
            return [
                "Notice the feeling without judgment",
                "Take 3 deep breaths",
                "Use a coping strategy",
                "Continue with what you were doing",
            ]

    def _get_test_accommodations(self, profile: AnxietyProfile) -> List[str]:
        """Get test-specific accommodations."""
        accommodations = [
            "Extended time if available",
            "Quiet testing location",
            "Breaks as needed",
            "Access to calming strategies",
        ]
        
        # Add profile-specific accommodations
        accommodations.extend(profile.accommodations)
        
        return list(set(accommodations))
