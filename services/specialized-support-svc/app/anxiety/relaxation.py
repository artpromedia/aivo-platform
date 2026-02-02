"""
Anxiety Relaxation Service.

Provides relaxation techniques, mindfulness exercises,
and calming activities.
"""

import logging
from typing import Any, Dict, List, Optional

from .models import (
    AnxietyLevel,
    AnxietyProfile,
    RelaxationCategory,
    RelaxationTechnique,
)

logger = logging.getLogger(__name__)


class RelaxationService:
    """
    Service for relaxation and mindfulness support.
    
    Provides:
    - Progressive muscle relaxation
    - Visualization exercises
    - Mindfulness activities
    - Calming sensory activities
    """

    # Library of relaxation techniques
    RELAXATION_TECHNIQUES = {
        RelaxationCategory.PROGRESSIVE_MUSCLE: [
            RelaxationTechnique(
                name="Full Body Progressive Relaxation",
                category=RelaxationCategory.PROGRESSIVE_MUSCLE,
                instructions=[
                    "Find a comfortable position",
                    "Start with your feet - tense for 5 seconds, then relax",
                    "Move to your calves - tense for 5 seconds, then relax",
                    "Continue up through legs, stomach, arms, shoulders",
                    "End with face muscles",
                    "Notice how relaxed your body feels",
                ],
                duration_minutes=10,
                age_appropriate_min=8,
                required_materials=[],
            ),
            RelaxationTechnique(
                name="Quick Tension Release",
                category=RelaxationCategory.PROGRESSIVE_MUSCLE,
                instructions=[
                    "Take a deep breath",
                    "Tense ALL your muscles at once (make your whole body tight)",
                    "Hold for 5 seconds",
                    "Release everything and breathe out",
                    "Notice the difference",
                    "Repeat 2-3 times",
                ],
                duration_minutes=2,
                age_appropriate_min=6,
                required_materials=[],
            ),
            RelaxationTechnique(
                name="Robot to Ragdoll",
                category=RelaxationCategory.PROGRESSIVE_MUSCLE,
                instructions=[
                    "Stand up like a stiff robot",
                    "Make your whole body tight and stiff",
                    "Walk like a robot for a few steps",
                    "Now become a floppy ragdoll",
                    "Let everything go loose and floppy",
                    "Shake out your arms and legs",
                ],
                duration_minutes=2,
                age_appropriate_min=5,
                required_materials=[],
            ),
        ],
        RelaxationCategory.VISUALIZATION: [
            RelaxationTechnique(
                name="Safe Place Visualization",
                category=RelaxationCategory.VISUALIZATION,
                instructions=[
                    "Close your eyes and take deep breaths",
                    "Imagine your safe, happy place (real or imaginary)",
                    "Notice what you SEE there",
                    "Notice what you HEAR there",
                    "Notice how it FEELS there",
                    "Stay in this place as long as you need",
                    "Know you can return anytime",
                ],
                duration_minutes=5,
                age_appropriate_min=7,
                required_materials=[],
            ),
            RelaxationTechnique(
                name="Cloud Watching",
                category=RelaxationCategory.VISUALIZATION,
                instructions=[
                    "Imagine you're lying on soft grass",
                    "Look up at a blue sky with fluffy clouds",
                    "Each cloud is a worry or thought",
                    "Watch the clouds drift by slowly",
                    "You don't need to hold onto them",
                    "Just watch them float away",
                ],
                duration_minutes=5,
                age_appropriate_min=6,
                required_materials=[],
            ),
            RelaxationTechnique(
                name="Color Breathing",
                category=RelaxationCategory.VISUALIZATION,
                instructions=[
                    "Think of a calm, peaceful color",
                    "Breathe in and imagine breathing in that color",
                    "See the calm color filling your body",
                    "Now think of a color for stress/worry",
                    "Breathe out and imagine that color leaving",
                    "Continue until you feel calmer",
                ],
                duration_minutes=3,
                age_appropriate_min=6,
                required_materials=[],
            ),
        ],
        RelaxationCategory.MINDFULNESS: [
            RelaxationTechnique(
                name="Mindful Breathing",
                category=RelaxationCategory.MINDFULNESS,
                instructions=[
                    "Sit comfortably",
                    "Focus on your breath",
                    "Notice the air going in... and out",
                    "If your mind wanders, gently bring it back",
                    "No need to change anything, just notice",
                    "Continue for a few minutes",
                ],
                duration_minutes=5,
                age_appropriate_min=7,
                required_materials=[],
            ),
            RelaxationTechnique(
                name="Body Scan",
                category=RelaxationCategory.MINDFULNESS,
                instructions=[
                    "Lie or sit comfortably",
                    "Start at your toes - notice how they feel",
                    "Move up to feet, legs, stomach",
                    "Continue to chest, arms, neck, face",
                    "Just notice each part without judgment",
                    "End by noticing your whole body",
                ],
                duration_minutes=8,
                age_appropriate_min=8,
                required_materials=[],
            ),
            RelaxationTechnique(
                name="Mindful Listening",
                category=RelaxationCategory.MINDFULNESS,
                instructions=[
                    "Sit quietly and close your eyes",
                    "Listen to the sounds around you",
                    "Notice sounds far away",
                    "Notice sounds nearby",
                    "Don't judge sounds as good or bad",
                    "Just notice and listen",
                ],
                duration_minutes=3,
                age_appropriate_min=6,
                required_materials=[],
            ),
        ],
        RelaxationCategory.SENSORY: [
            RelaxationTechnique(
                name="Calm Jar",
                category=RelaxationCategory.SENSORY,
                instructions=[
                    "Shake your calm jar (or imagine one)",
                    "Watch the glitter swirl around",
                    "Take deep breaths as you watch",
                    "Watch the glitter slowly settle",
                    "As it settles, your thoughts can settle too",
                    "Wait until all the glitter is at the bottom",
                ],
                duration_minutes=5,
                age_appropriate_min=5,
                required_materials=["calm jar or glitter bottle"],
            ),
            RelaxationTechnique(
                name="Stress Ball Squeeze",
                category=RelaxationCategory.SENSORY,
                instructions=[
                    "Hold a stress ball (or squeeze a soft object)",
                    "Squeeze as tight as you can for 5 seconds",
                    "Release and feel your hand relax",
                    "Squeeze again and release",
                    "Focus on the feeling of tension and release",
                ],
                duration_minutes=2,
                age_appropriate_min=5,
                required_materials=["stress ball or soft squeezable object"],
            ),
            RelaxationTechnique(
                name="Calming Texture Touch",
                category=RelaxationCategory.SENSORY,
                instructions=[
                    "Find something with a calming texture",
                    "Could be soft fabric, smooth stone, or fuzzy item",
                    "Close your eyes and focus on the texture",
                    "Notice every detail of how it feels",
                    "Take slow breaths while you touch",
                ],
                duration_minutes=3,
                age_appropriate_min=5,
                required_materials=["soft or textured comfort item"],
            ),
        ],
    }

    # Quick calming activities for classroom use
    CLASSROOM_ACTIVITIES = [
        {
            "name": "Desk Drumming",
            "description": "Quietly tap a calming rhythm on desk",
            "duration_seconds": 30,
            "discreet": True,
        },
        {
            "name": "Finger Countdown",
            "description": "Press each finger to desk while breathing",
            "duration_seconds": 20,
            "discreet": True,
        },
        {
            "name": "Foot Press",
            "description": "Press feet firmly into floor, hold, release",
            "duration_seconds": 15,
            "discreet": True,
        },
        {
            "name": "Hand Squeeze",
            "description": "Press palms together firmly, hold, release",
            "duration_seconds": 15,
            "discreet": True,
        },
        {
            "name": "Slow Shoulder Roll",
            "description": "Roll shoulders back slowly 5 times",
            "duration_seconds": 20,
            "discreet": True,
        },
    ]

    def __init__(self, llm_client: Optional[Any] = None):
        """Initialize the relaxation service."""
        self.llm = llm_client
        logger.info("RelaxationService initialized")

    async def get_techniques(
        self,
        profile: AnxietyProfile,
        category: Optional[RelaxationCategory] = None,
        context: Dict[str, Any] = None,
    ) -> List[RelaxationTechnique]:
        """
        Get relaxation techniques.
        
        Args:
            profile: Anxiety profile
            category: Optional specific category
            context: Optional context (includes age, location, etc.)
            
        Returns:
            List of appropriate relaxation techniques
        """
        context = context or {}
        age = context.get("age", 10)
        techniques = []
        
        if category:
            # Get techniques from specific category
            cat_techniques = self.RELAXATION_TECHNIQUES.get(category, [])
            techniques.extend(cat_techniques)
        else:
            # Get techniques from all categories
            for cat_techniques in self.RELAXATION_TECHNIQUES.values():
                techniques.extend(cat_techniques)
        
        # Filter by age appropriateness
        techniques = [t for t in techniques if t.age_appropriate_min <= age]
        
        return techniques

    async def get_quick_calm(
        self,
        profile: AnxietyProfile,
        duration_limit: int = 3,
    ) -> List[RelaxationTechnique]:
        """
        Get quick calming techniques (under specified minutes).
        
        Args:
            profile: Anxiety profile
            duration_limit: Maximum duration in minutes
            
        Returns:
            List of quick techniques
        """
        quick_techniques = []
        
        for cat_techniques in self.RELAXATION_TECHNIQUES.values():
            for technique in cat_techniques:
                if technique.duration_minutes <= duration_limit:
                    quick_techniques.append(technique)
        
        return quick_techniques

    async def get_classroom_activities(
        self,
        profile: AnxietyProfile,
        discreet_only: bool = True,
    ) -> List[Dict[str, Any]]:
        """
        Get calming activities suitable for classroom.
        
        Args:
            profile: Anxiety profile
            discreet_only: Only return discreet activities
            
        Returns:
            List of classroom-appropriate activities
        """
        activities = self.CLASSROOM_ACTIVITIES
        
        if discreet_only:
            activities = [a for a in activities if a.get("discreet", False)]
        
        return activities

    async def create_calm_down_plan(
        self,
        profile: AnxietyProfile,
        context: Dict[str, Any] = None,
    ) -> Dict[str, Any]:
        """
        Create a personalized calm-down plan.
        
        Args:
            profile: Anxiety profile
            context: Optional context
            
        Returns:
            Personalized calm-down plan
        """
        context = context or {}
        age = context.get("age", 10)
        
        # Build multi-step calm down plan
        plan = {
            "step_1_notice": {
                "title": "Notice",
                "instruction": "Notice the anxious feeling. Where do you feel it in your body?",
                "duration": "10 seconds",
            },
            "step_2_breathe": {
                "title": "Breathe",
                "instruction": "Take 3 slow deep breaths. In through nose, out through mouth.",
                "duration": "30 seconds",
            },
            "step_3_ground": {
                "title": "Ground",
                "instruction": "Press your feet into the floor. Feel the chair holding you.",
                "duration": "20 seconds",
            },
            "step_4_cope": {
                "title": "Use a Coping Tool",
                "options": [],
                "duration": "2-3 minutes",
            },
            "step_5_check": {
                "title": "Check In",
                "instruction": "How do you feel now? Do you need more time or help?",
                "duration": "10 seconds",
            },
        }
        
        # Add effective techniques from profile
        effective_names = [t.name for t in profile.effective_techniques[:3]]
        if effective_names:
            plan["step_4_cope"]["options"] = effective_names
        else:
            # Default options based on age
            if age < 8:
                plan["step_4_cope"]["options"] = [
                    "Robot to Ragdoll",
                    "Calm Jar",
                    "Color Breathing",
                ]
            else:
                plan["step_4_cope"]["options"] = [
                    "5-4-3-2-1 Grounding",
                    "Progressive Muscle Relaxation",
                    "Safe Place Visualization",
                ]
        
        # Add safe person
        if profile.safe_person:
            plan["if_need_help"] = f"Ask for help from: {profile.safe_person}"
        
        return plan

    async def get_bedtime_routine(
        self,
        profile: AnxietyProfile,
    ) -> Dict[str, Any]:
        """
        Get calming bedtime routine for anxiety.
        
        Args:
            profile: Anxiety profile
            
        Returns:
            Bedtime routine plan
        """
        return {
            "30_min_before": {
                "title": "Wind Down",
                "activities": [
                    "Turn off screens",
                    "Dim the lights",
                    "Quiet activities only (reading, drawing)",
                ],
            },
            "15_min_before": {
                "title": "Prepare",
                "activities": [
                    "Brush teeth and get ready",
                    "Put worries in a 'worry box' (real or imaginary)",
                    "Set out anything needed for tomorrow",
                ],
            },
            "at_bedtime": {
                "title": "Relax",
                "activities": [
                    "Get comfortable in bed",
                    "Do progressive muscle relaxation",
                    "Use safe place visualization",
                    "Focus on slow, calm breathing",
                ],
            },
            "if_worries_come": [
                "Write them down to deal with tomorrow",
                "Tell yourself: 'I can think about this tomorrow'",
                "Return to calm breathing",
                "Picture your safe place",
            ],
        }

    async def get_morning_routine(
        self,
        profile: AnxietyProfile,
    ) -> Dict[str, Any]:
        """
        Get calming morning routine for school anxiety.
        
        Args:
            profile: Anxiety profile
            
        Returns:
            Morning routine plan
        """
        return {
            "waking_up": {
                "title": "Start Calm",
                "activities": [
                    "Take 3 deep breaths before getting up",
                    "Think of one thing you're looking forward to",
                    "Stretch gently",
                ],
            },
            "getting_ready": {
                "title": "Prepare Peacefully",
                "activities": [
                    "Follow your usual routine (predictability helps!)",
                    "Eat a balanced breakfast",
                    "Check your bag is ready",
                ],
            },
            "before_leaving": {
                "title": "Set Yourself Up",
                "activities": [
                    "Use the bathroom",
                    "Do a quick calming exercise",
                    "Remind yourself of your coping tools",
                    "Say your coping statement",
                ],
            },
            "coping_reminders": profile.effective_coping[:3] if profile.effective_coping else [
                "I can handle today",
                "I have tools to help me",
                "I can ask for help if I need it",
            ],
        }

    async def guided_relaxation(
        self,
        technique_name: str,
        profile: AnxietyProfile,
    ) -> Dict[str, Any]:
        """
        Get step-by-step guided relaxation.
        
        Args:
            technique_name: Name of technique
            profile: Anxiety profile
            
        Returns:
            Guided relaxation with timing
        """
        # Find the technique
        technique = None
        for cat_techniques in self.RELAXATION_TECHNIQUES.values():
            for t in cat_techniques:
                if t.name.lower() == technique_name.lower():
                    technique = t
                    break
            if technique:
                break
        
        if not technique:
            # Return a default technique
            technique = self.RELAXATION_TECHNIQUES[RelaxationCategory.VISUALIZATION][0]
        
        # Build guided steps with timing
        guided_steps = []
        step_duration = (technique.duration_minutes * 60) // len(technique.instructions)
        
        for i, instruction in enumerate(technique.instructions, 1):
            guided_steps.append({
                "step": i,
                "instruction": instruction,
                "duration_seconds": step_duration,
            })
        
        return {
            "name": technique.name,
            "category": technique.category.value,
            "total_duration_minutes": technique.duration_minutes,
            "materials_needed": technique.required_materials,
            "guided_steps": guided_steps,
            "completion_message": "Great job! Notice how your body feels now.",
        }
