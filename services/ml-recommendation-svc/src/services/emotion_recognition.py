"""
Emotion Recognition Service

Social-Emotional Learning (SEL) service for:
- Emotion vocabulary building (20+ emotions)
- Mastery tracking per emotion
- Adaptive difficulty (5 levels)
- Scenario generation with distractors
- Emotion recommendations

Aligned with CASEL framework.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

import structlog
from pydantic import BaseModel, Field

logger = structlog.get_logger()


class EmotionCategory(str, Enum):
    """Categories of emotions based on research."""

    BASIC = "basic"  # Ekman's basic emotions
    SOCIAL = "social"  # Social emotions
    SELF_CONSCIOUS = "self_conscious"
    COGNITIVE = "cognitive"


class Emotion(BaseModel):
    """Individual emotion definition."""

    id: str
    name: str
    category: EmotionCategory
    description: str
    facial_cues: List[str]
    body_cues: List[str]
    situations: List[str]
    difficulty_level: int  # 1-5


# Emotion Library based on research
EMOTION_LIBRARY: Dict[str, Emotion] = {
    # Basic Emotions (Ekman)
    "happy": Emotion(
        id="happy",
        name="Happy",
        category=EmotionCategory.BASIC,
        description="Feeling pleased or content",
        facial_cues=["smiling", "eyes crinkling", "raised cheeks"],
        body_cues=["relaxed posture", "open arms", "bouncing"],
        situations=["getting a gift", "playing with friends", "succeeding"],
        difficulty_level=1,
    ),
    "sad": Emotion(
        id="sad",
        name="Sad",
        category=EmotionCategory.BASIC,
        description="Feeling unhappy or sorrowful",
        facial_cues=["frown", "droopy eyes", "trembling lip"],
        body_cues=["slumped shoulders", "slow movements", "head down"],
        situations=["losing something", "saying goodbye", "being left out"],
        difficulty_level=1,
    ),
    "angry": Emotion(
        id="angry",
        name="Angry",
        category=EmotionCategory.BASIC,
        description="Feeling mad or frustrated",
        facial_cues=["furrowed brows", "tight lips", "flared nostrils"],
        body_cues=["tense muscles", "clenched fists", "stomping"],
        situations=["unfair treatment", "broken rules", "interrupted"],
        difficulty_level=1,
    ),
    "scared": Emotion(
        id="scared",
        name="Scared",
        category=EmotionCategory.BASIC,
        description="Feeling afraid or frightened",
        facial_cues=["wide eyes", "raised eyebrows", "open mouth"],
        body_cues=["frozen", "backing away", "shaking"],
        situations=["dark places", "loud noises", "new situations"],
        difficulty_level=1,
    ),
    "surprised": Emotion(
        id="surprised",
        name="Surprised",
        category=EmotionCategory.BASIC,
        description="Feeling astonished or startled",
        facial_cues=["raised eyebrows", "wide eyes", "open mouth"],
        body_cues=["jumping back", "gasping", "frozen"],
        situations=["unexpected gifts", "sudden sounds", "plot twists"],
        difficulty_level=2,
    ),
    "disgusted": Emotion(
        id="disgusted",
        name="Disgusted",
        category=EmotionCategory.BASIC,
        description="Feeling repulsed or grossed out",
        facial_cues=["wrinkled nose", "raised upper lip", "squinting"],
        body_cues=["pulling away", "covering nose", "gagging"],
        situations=["bad smells", "gross foods", "icky things"],
        difficulty_level=2,
    ),
    # Social Emotions
    "embarrassed": Emotion(
        id="embarrassed",
        name="Embarrassed",
        category=EmotionCategory.SOCIAL,
        description="Feeling self-conscious or awkward",
        facial_cues=["blushing", "avoiding eye contact", "nervous smile"],
        body_cues=["fidgeting", "covering face", "looking down"],
        situations=["making mistakes", "being center of attention", "tripping"],
        difficulty_level=3,
    ),
    "jealous": Emotion(
        id="jealous",
        name="Jealous",
        category=EmotionCategory.SOCIAL,
        description="Wanting what someone else has",
        facial_cues=["narrowed eyes", "frown", "pursed lips"],
        body_cues=["crossed arms", "watching others", "tense"],
        situations=["someone gets praise", "seeing others' toys", "left out"],
        difficulty_level=3,
    ),
    "proud": Emotion(
        id="proud",
        name="Proud",
        category=EmotionCategory.SELF_CONSCIOUS,
        description="Feeling accomplished or satisfied with yourself",
        facial_cues=["big smile", "head held high", "bright eyes"],
        body_cues=["standing tall", "puffed chest", "showing off work"],
        situations=["completing hard task", "helping others", "learning new skill"],
        difficulty_level=3,
    ),
    "grateful": Emotion(
        id="grateful",
        name="Grateful",
        category=EmotionCategory.COGNITIVE,
        description="Feeling thankful and appreciative",
        facial_cues=["warm smile", "soft eyes", "nodding"],
        body_cues=["hugging", "saying thank you", "giving back"],
        situations=["receiving help", "getting gifts", "acts of kindness"],
        difficulty_level=3,
    ),
    "anxious": Emotion(
        id="anxious",
        name="Anxious",
        category=EmotionCategory.COGNITIVE,
        description="Feeling worried or nervous about something",
        facial_cues=["worried brow", "biting lip", "darting eyes"],
        body_cues=["restless", "nail biting", "pacing"],
        situations=["before tests", "meeting new people", "waiting"],
        difficulty_level=4,
    ),
    "frustrated": Emotion(
        id="frustrated",
        name="Frustrated",
        category=EmotionCategory.COGNITIVE,
        description="Feeling upset when things don't work out",
        facial_cues=["furrowed brow", "tight jaw", "sighing"],
        body_cues=["throwing hands up", "groaning", "trying again"],
        situations=["hard problems", "things breaking", "not understanding"],
        difficulty_level=4,
    ),
    "confused": Emotion(
        id="confused",
        name="Confused",
        category=EmotionCategory.COGNITIVE,
        description="Feeling uncertain or puzzled",
        facial_cues=["tilted head", "squinting", "scratching head"],
        body_cues=["shrugging", "looking around", "asking questions"],
        situations=["complex instructions", "mixed messages", "new topics"],
        difficulty_level=4,
    ),
    "lonely": Emotion(
        id="lonely",
        name="Lonely",
        category=EmotionCategory.SOCIAL,
        description="Feeling alone or isolated",
        facial_cues=["sad eyes", "neutral expression", "distant gaze"],
        body_cues=["sitting alone", "withdrawn", "quiet"],
        situations=["no one to play with", "being excluded", "new school"],
        difficulty_level=4,
    ),
    "excited": Emotion(
        id="excited",
        name="Excited",
        category=EmotionCategory.BASIC,
        description="Feeling enthusiastic and eager",
        facial_cues=["wide smile", "sparkling eyes", "animated face"],
        body_cues=["jumping", "clapping", "talking fast"],
        situations=["upcoming event", "good news", "favorite activity"],
        difficulty_level=2,
    ),
    "hopeful": Emotion(
        id="hopeful",
        name="Hopeful",
        category=EmotionCategory.COGNITIVE,
        description="Feeling optimistic about the future",
        facial_cues=["soft smile", "bright eyes", "relaxed face"],
        body_cues=["open posture", "looking forward", "planning"],
        situations=["new opportunities", "trying again", "possibilities"],
        difficulty_level=5,
    ),
    "disappointed": Emotion(
        id="disappointed",
        name="Disappointed",
        category=EmotionCategory.COGNITIVE,
        description="Feeling let down when expectations aren't met",
        facial_cues=["downturned mouth", "droopy eyes", "sighing"],
        body_cues=["slumped shoulders", "slow movements", "looking down"],
        situations=["canceled plans", "losing game", "unmet goals"],
        difficulty_level=4,
    ),
    "curious": Emotion(
        id="curious",
        name="Curious",
        category=EmotionCategory.COGNITIVE,
        description="Wanting to learn or know more",
        facial_cues=["raised eyebrows", "wide eyes", "leaning forward"],
        body_cues=["asking questions", "exploring", "observing"],
        situations=["new topics", "mysteries", "interesting things"],
        difficulty_level=3,
    ),
    "calm": Emotion(
        id="calm",
        name="Calm",
        category=EmotionCategory.COGNITIVE,
        description="Feeling peaceful and relaxed",
        facial_cues=["neutral expression", "relaxed face", "steady gaze"],
        body_cues=["slow breathing", "relaxed muscles", "still"],
        situations=["after relaxation", "quiet time", "feeling safe"],
        difficulty_level=3,
    ),
    "empathetic": Emotion(
        id="empathetic",
        name="Empathetic",
        category=EmotionCategory.SOCIAL,
        description="Understanding and sharing others' feelings",
        facial_cues=["mirroring expression", "concerned look", "nodding"],
        body_cues=["leaning in", "comforting touch", "listening"],
        situations=["friend is sad", "seeing someone hurt", "understanding"],
        difficulty_level=5,
    ),
}


class EmotionMastery(BaseModel):
    """Track mastery of individual emotions."""

    emotion_id: str
    student_id: UUID
    attempts: int = 0
    correct: int = 0
    is_mastered: bool = False
    last_practiced: Optional[datetime] = None

    @property
    def accuracy(self) -> float:
        """Calculate accuracy percentage."""
        if self.attempts == 0:
            return 0.0
        return (self.correct / self.attempts) * 100


class EmotionScenario(BaseModel):
    """Scenario for emotion recognition practice."""

    id: UUID = Field(default_factory=uuid4)
    emotion_id: str
    difficulty_level: int
    scenario_text: str
    visual_cues: List[str]
    correct_answer: str
    distractors: List[str]
    explanation: str


class EmotionRecognitionService:
    """
    Service for emotion recognition and SEL activities.

    Features:
    - 20+ emotions with categories
    - Mastery tracking per student
    - Adaptive difficulty
    - Scenario generation
    - Recommendations for next emotions to learn
    """

    def __init__(self):
        self.emotions = EMOTION_LIBRARY
        # In-memory storage for demo
        self._mastery: Dict[str, Dict[str, EmotionMastery]] = {}

    async def get_emotion(self, emotion_id: str) -> Optional[Emotion]:
        """Get emotion by ID."""
        return self.emotions.get(emotion_id)

    async def get_all_emotions(self) -> List[Emotion]:
        """Get all emotions in the library."""
        return list(self.emotions.values())

    async def get_emotions_by_category(
        self, category: EmotionCategory
    ) -> List[Emotion]:
        """Get emotions by category."""
        return [e for e in self.emotions.values() if e.category == category]

    async def get_emotions_by_difficulty(
        self, max_difficulty: int
    ) -> List[Emotion]:
        """Get emotions up to a certain difficulty level."""
        return [
            e for e in self.emotions.values()
            if e.difficulty_level <= max_difficulty
        ]

    async def get_student_mastery(
        self,
        student_id: UUID,
    ) -> Dict[str, EmotionMastery]:
        """Get all emotion mastery records for a student."""
        student_key = str(student_id)
        if student_key not in self._mastery:
            self._mastery[student_key] = {}
        return self._mastery[student_key]

    async def record_attempt(
        self,
        student_id: UUID,
        emotion_id: str,
        is_correct: bool,
    ) -> EmotionMastery:
        """Record an attempt at recognizing an emotion."""
        student_mastery = await self.get_student_mastery(student_id)

        if emotion_id not in student_mastery:
            student_mastery[emotion_id] = EmotionMastery(
                emotion_id=emotion_id,
                student_id=student_id,
            )

        mastery = student_mastery[emotion_id]
        mastery.attempts += 1
        if is_correct:
            mastery.correct += 1
        mastery.last_practiced = datetime.utcnow()

        # Check for mastery (80% accuracy with at least 5 attempts)
        if mastery.attempts >= 5 and mastery.accuracy >= 80:
            mastery.is_mastered = True

        logger.info(
            "emotion_attempt_recorded",
            student_id=str(student_id),
            emotion_id=emotion_id,
            is_correct=is_correct,
            accuracy=mastery.accuracy,
        )

        return mastery

    async def get_recommended_emotions(
        self,
        student_id: UUID,
        count: int = 5,
    ) -> List[Dict[str, Any]]:
        """
        Get recommended emotions for a student to practice.

        Priority:
        1. Basic unmastered emotions
        2. Low accuracy emotions (<60%)
        3. New emotions to introduce
        """
        student_mastery = await self.get_student_mastery(student_id)
        recommendations = []

        # Priority 1: Basic unmastered emotions
        for emotion_id, emotion in self.emotions.items():
            if emotion.category == EmotionCategory.BASIC:
                if emotion_id not in student_mastery or not student_mastery[emotion_id].is_mastered:
                    recommendations.append({
                        "emotion_id": emotion_id,
                        "emotion_name": emotion.name,
                        "reason": "Basic emotion to master",
                        "priority": 1,
                    })

        # Priority 2: Low accuracy emotions
        for emotion_id, mastery in student_mastery.items():
            if mastery.attempts >= 3 and mastery.accuracy < 60:
                emotion = self.emotions.get(emotion_id)
                if emotion:
                    recommendations.append({
                        "emotion_id": emotion_id,
                        "emotion_name": emotion.name,
                        "reason": f"Needs practice ({mastery.accuracy:.0f}% accuracy)",
                        "priority": 2,
                    })

        # Priority 3: New emotions to introduce
        practiced_count = len(student_mastery)
        if practiced_count < len(self.emotions):
            for emotion_id, emotion in self.emotions.items():
                if emotion_id not in student_mastery:
                    recommendations.append({
                        "emotion_id": emotion_id,
                        "emotion_name": emotion.name,
                        "reason": "New emotion to learn",
                        "priority": 3,
                    })

        # Sort by priority and return top N
        recommendations.sort(key=lambda x: x["priority"])
        return recommendations[:count]

    async def generate_scenario(
        self,
        emotion_id: str,
        difficulty_level: int = 1,
    ) -> EmotionScenario:
        """Generate a scenario for emotion recognition practice."""
        emotion = self.emotions.get(emotion_id)
        if not emotion:
            raise ValueError(f"Unknown emotion: {emotion_id}")

        # Get random situation
        import random
        situation = random.choice(emotion.situations)

        # Generate scenario text
        scenario_text = self._generate_scenario_text(emotion, situation, difficulty_level)

        # Get distractors (other emotions)
        distractors = self._get_distractors(emotion_id, difficulty_level)

        return EmotionScenario(
            emotion_id=emotion_id,
            difficulty_level=difficulty_level,
            scenario_text=scenario_text,
            visual_cues=emotion.facial_cues[:2] + emotion.body_cues[:1],
            correct_answer=emotion.name,
            distractors=distractors,
            explanation=f"This shows {emotion.name.lower()} because: {emotion.description}",
        )

    def _generate_scenario_text(
        self,
        emotion: Emotion,
        situation: str,
        difficulty_level: int,
    ) -> str:
        """Generate scenario text based on difficulty."""
        character_names = ["Alex", "Sam", "Jordan", "Riley", "Morgan"]
        import random
        name = random.choice(character_names)

        if difficulty_level == 1:
            # Easy: Direct statement
            return f"{name} is {situation}. {name} feels {emotion.name.lower()}."
        elif difficulty_level == 2:
            # Medium: Include facial cue
            cue = random.choice(emotion.facial_cues)
            return f"{name} is {situation}. You can see {cue} on {name}'s face."
        elif difficulty_level == 3:
            # Harder: Include body cue only
            cue = random.choice(emotion.body_cues)
            return f"{name} is {situation}. {name} is {cue}. How does {name} feel?"
        elif difficulty_level == 4:
            # Hard: Situation only
            return f"{name} is {situation}. How might {name} be feeling?"
        else:
            # Very hard: Complex scenario
            return f"Imagine {name} is {situation}. Think about what {name} might be feeling and why."

    def _get_distractors(
        self,
        correct_emotion_id: str,
        difficulty_level: int,
    ) -> List[str]:
        """Get distractor emotions based on difficulty."""
        correct_emotion = self.emotions[correct_emotion_id]
        all_emotions = list(self.emotions.values())
        import random

        if difficulty_level <= 2:
            # Easy: Very different emotions
            distractors = [
                e.name for e in all_emotions
                if e.id != correct_emotion_id
                and e.category != correct_emotion.category
            ]
        else:
            # Harder: Similar emotions
            distractors = [
                e.name for e in all_emotions
                if e.id != correct_emotion_id
                and abs(e.difficulty_level - correct_emotion.difficulty_level) <= 1
            ]

        random.shuffle(distractors)
        return distractors[:3]

    async def get_mastery_summary(
        self,
        student_id: UUID,
    ) -> Dict[str, Any]:
        """Get summary of student's emotion recognition mastery."""
        student_mastery = await self.get_student_mastery(student_id)

        total_emotions = len(self.emotions)
        mastered_count = sum(
            1 for m in student_mastery.values() if m.is_mastered
        )
        attempted_count = len(student_mastery)

        total_attempts = sum(m.attempts for m in student_mastery.values())
        total_correct = sum(m.correct for m in student_mastery.values())
        overall_accuracy = (
            (total_correct / total_attempts * 100) if total_attempts > 0 else 0
        )

        return {
            "total_emotions": total_emotions,
            "mastered_count": mastered_count,
            "attempted_count": attempted_count,
            "total_attempts": total_attempts,
            "overall_accuracy": round(overall_accuracy, 1),
            "mastery_percentage": round(mastered_count / total_emotions * 100, 1),
            "by_category": await self._get_mastery_by_category(student_mastery),
        }

    async def _get_mastery_by_category(
        self,
        student_mastery: Dict[str, EmotionMastery],
    ) -> Dict[str, Dict[str, Any]]:
        """Get mastery breakdown by emotion category."""
        by_category = {}

        for category in EmotionCategory:
            category_emotions = [
                e for e in self.emotions.values()
                if e.category == category
            ]
            mastered = sum(
                1 for e in category_emotions
                if e.id in student_mastery and student_mastery[e.id].is_mastered
            )
            by_category[category.value] = {
                "total": len(category_emotions),
                "mastered": mastered,
                "percentage": round(mastered / len(category_emotions) * 100, 1) if category_emotions else 0,
            }

        return by_category


# Global service instance
_emotion_service: Optional[EmotionRecognitionService] = None


def get_emotion_recognition_service() -> EmotionRecognitionService:
    """Get global Emotion Recognition service instance."""
    global _emotion_service
    if _emotion_service is None:
        _emotion_service = EmotionRecognitionService()
    return _emotion_service
