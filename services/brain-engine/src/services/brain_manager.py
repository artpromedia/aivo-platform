"""
Learner Brain Manager

Manages personalized AI "brain" for each learner.
Stores: learning patterns, strengths, weaknesses, preferences.

This module provides comprehensive brain state management including:
- Knowledge graph construction and updates
- Mastery level tracking with spaced repetition
- Learning pattern recognition
- Engagement profiling
- Personalized recommendations
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4
import structlog
from pydantic import BaseModel, Field

logger = structlog.get_logger()


class KnowledgeNode(BaseModel):
    """Node in the knowledge graph representing a concept."""

    id: str
    type: str = "concept"  # concept, subject, skill, topic
    mastery: float = Field(default=0.0, ge=0.0, le=1.0)
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: Dict[str, Any] = Field(default_factory=dict)


class KnowledgeEdge(BaseModel):
    """Edge in the knowledge graph representing concept relationships."""

    source: str
    target: str
    relationship: str = "prerequisite"  # prerequisite, related, builds_on
    weight: float = Field(default=1.0, ge=0.0, le=1.0)


class KnowledgeGraph(BaseModel):
    """Knowledge graph structure for learner understanding."""

    nodes: List[KnowledgeNode] = Field(default_factory=list)
    edges: List[KnowledgeEdge] = Field(default_factory=list)

    def add_node(self, node: KnowledgeNode) -> None:
        """Add a node to the graph, updating if exists."""
        existing = next((n for n in self.nodes if n.id == node.id), None)
        if existing:
            existing.mastery = node.mastery
            existing.last_updated = node.last_updated
            existing.metadata.update(node.metadata)
        else:
            self.nodes.append(node)

    def add_edge(self, edge: KnowledgeEdge) -> None:
        """Add an edge to the graph."""
        existing = next(
            (e for e in self.edges if e.source == edge.source and e.target == edge.target),
            None
        )
        if not existing:
            self.edges.append(edge)

    def get_node(self, node_id: str) -> Optional[KnowledgeNode]:
        """Get a node by ID."""
        return next((n for n in self.nodes if n.id == node_id), None)

    def get_prerequisites(self, node_id: str) -> List[str]:
        """Get prerequisite node IDs for a given node."""
        return [
            e.source for e in self.edges
            if e.target == node_id and e.relationship == "prerequisite"
        ]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "nodes": [n.model_dump() for n in self.nodes],
            "edges": [e.model_dump() for e in self.edges],
        }


class LearningPatterns(BaseModel):
    """Learning pattern profile for a learner."""

    preferred_modality: str = Field(default="visual")  # visual, auditory, kinesthetic, reading
    optimal_session_length: int = Field(default=25)  # minutes
    best_time_of_day: Optional[str] = None  # morning, afternoon, evening, night
    difficulty_preference: str = Field(default="adaptive")  # easy, moderate, challenging, adaptive
    response_time_profile: Dict[str, float] = Field(default_factory=dict)  # subject -> avg seconds
    retention_rate: float = Field(default=0.7, ge=0.0, le=1.0)


class MasteryLevel(BaseModel):
    """Mastery tracking for a concept or subject."""

    current_level: float = Field(default=0.0, ge=0.0, le=1.0)
    target_level: float = Field(default=0.8, ge=0.0, le=1.0)
    progress_rate: float = Field(default=0.0)  # level change per session
    last_practiced: Optional[datetime] = None
    practice_count: int = Field(default=0)
    correct_count: int = Field(default=0)
    streak: int = Field(default=0)
    best_streak: int = Field(default=0)
    spaced_repetition_interval: int = Field(default=1)  # days


class EngagementProfile(BaseModel):
    """Engagement profile for tracking learner preferences."""

    favorite_subjects: List[str] = Field(default_factory=list)
    struggle_subjects: List[str] = Field(default_factory=list)
    game_preferences: List[str] = Field(default_factory=list)
    activity_completions: Dict[str, int] = Field(default_factory=dict)  # activity_type -> count
    average_engagement_score: float = Field(default=0.5, ge=0.0, le=1.0)
    total_time_spent: int = Field(default=0)  # seconds


class AdaptiveParameters(BaseModel):
    """Adaptive learning parameters."""

    difficulty_adjustment_rate: float = Field(default=0.1, ge=0.0, le=1.0)
    hint_threshold: float = Field(default=0.3, ge=0.0, le=1.0)  # Show hint if struggle > threshold
    review_frequency: str = Field(default="smart")  # daily, smart (spaced repetition), weekly
    scaffolding_level: int = Field(default=2, ge=0, le=5)  # Amount of support
    challenge_factor: float = Field(default=1.0, ge=0.5, le=2.0)


class CurriculumAlignment(BaseModel):
    """Curriculum standards and location-based alignment for the learner."""

    state_code: Optional[str] = None  # 2-letter state code (e.g., "TX", "CA")
    zip_code: Optional[str] = None  # 5-digit ZIP code
    nces_district_id: Optional[str] = None  # NCES district identifier
    district_name: Optional[str] = None  # Human-readable district name
    curriculum_standards: List[str] = Field(default_factory=list)  # ["TEKS", "CCSS", "NGSS"]
    curriculum_version: str = Field(default="1.0")  # Version for tracking updates
    aligned_skills: List[str] = Field(default_factory=list)  # Skills aligned to curriculum
    last_synced: Optional[datetime] = None  # Last curriculum sync


class BrainState(BaseModel):
    """Complete brain state for a learner."""

    learner_id: str
    version: str = "1.0"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    knowledge_graph: KnowledgeGraph = Field(default_factory=KnowledgeGraph)
    learning_patterns: LearningPatterns = Field(default_factory=LearningPatterns)
    mastery_levels: Dict[str, MasteryLevel] = Field(default_factory=dict)
    engagement_profile: EngagementProfile = Field(default_factory=EngagementProfile)
    adaptive_parameters: AdaptiveParameters = Field(default_factory=AdaptiveParameters)
    curriculum_alignment: CurriculumAlignment = Field(default_factory=CurriculumAlignment)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for database storage."""
        return {
            "learner_id": self.learner_id,
            "version": self.version,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "knowledge_graph": self.knowledge_graph.to_dict(),
            "learning_patterns": self.learning_patterns.model_dump(),
            "mastery_levels": {k: v.model_dump() for k, v in self.mastery_levels.items()},
            "engagement_profile": self.engagement_profile.model_dump(),
            "adaptive_parameters": self.adaptive_parameters.model_dump(),
            "curriculum_alignment": self.curriculum_alignment.model_dump(),
        }


class LearnerBrainManager:
    """
    Manages personalized AI "brain" for each learner.
    Stores: learning patterns, strengths, weaknesses, preferences
    """

    def __init__(self, supabase_client):
        self.supabase = supabase_client
        self._cache: Dict[str, BrainState] = {}  # In-memory cache

    async def initialize_brain(
        self,
        learner_id: str,
        baseline_assessment: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create initial brain model from baseline assessment.

        Args:
            learner_id: Unique identifier for the learner
            baseline_assessment: Results from baseline assessment containing
                strengths, weaknesses, learning_style, and subject_scores

        Returns:
            Initial brain state dictionary
        """
        # Extract key metrics
        strengths = baseline_assessment.get('strengths', [])
        weaknesses = baseline_assessment.get('weaknesses', [])
        learning_style = baseline_assessment.get('learning_style', 'visual')

        # Build knowledge graph from assessment
        knowledge_graph = self._build_knowledge_graph(baseline_assessment)

        # Initialize mastery levels
        mastery_levels = self._init_mastery_levels(baseline_assessment)

        # Create brain state
        brain_state = BrainState(
            learner_id=learner_id,
            knowledge_graph=knowledge_graph,
            learning_patterns=LearningPatterns(
                preferred_modality=learning_style,
                optimal_session_length=25,  # minutes
                best_time_of_day=None,  # Will learn over time
                difficulty_preference='adaptive',
            ),
            mastery_levels=mastery_levels,
            engagement_profile=EngagementProfile(
                favorite_subjects=strengths[:3] if strengths else [],
                struggle_subjects=weaknesses,
                game_preferences=[],
            ),
            adaptive_parameters=AdaptiveParameters(
                difficulty_adjustment_rate=0.1,
                hint_threshold=0.3,  # Show hint if struggle > 30%
                review_frequency='smart',  # Spaced repetition
            ),
        )

        # Cache the brain state
        self._cache[learner_id] = brain_state

        # Save to database
        brain_dict = brain_state.to_dict()
        await self.supabase.table('learner_brain_states').insert({
            'learner_id': learner_id,
            'model_state': brain_dict,
            'created_at': brain_dict['created_at'],
            'updated_at': brain_dict['updated_at'],
        }).execute()

        logger.info(
            "brain_initialized",
            learner_id=learner_id,
            strengths_count=len(strengths),
            weaknesses_count=len(weaknesses),
        )

        return brain_dict

    def _build_knowledge_graph(self, assessment: Dict[str, Any]) -> KnowledgeGraph:
        """
        Build knowledge graph from assessment results.

        Args:
            assessment: Assessment data with subject_scores and concept results

        Returns:
            Initialized KnowledgeGraph
        """
        knowledge_graph = KnowledgeGraph()

        # Add subject nodes
        for subject, score in assessment.get('subject_scores', {}).items():
            node = KnowledgeNode(
                id=subject,
                type='subject',
                mastery=score / 100,
                last_updated=datetime.now(timezone.utc),
                metadata={'source': 'baseline_assessment'},
            )
            knowledge_graph.add_node(node)

        # Add concept nodes from detailed assessment
        for concept_data in assessment.get('concept_results', []):
            concept_id = concept_data.get('concept_id', concept_data.get('name', ''))
            if concept_id:
                node = KnowledgeNode(
                    id=concept_id,
                    type='concept',
                    mastery=concept_data.get('score', 0) / 100,
                    last_updated=datetime.now(timezone.utc),
                    metadata={
                        'subject': concept_data.get('subject'),
                        'grade_level': concept_data.get('grade_level'),
                    },
                )
                knowledge_graph.add_node(node)

                # Add edge to parent subject
                if concept_data.get('subject'):
                    edge = KnowledgeEdge(
                        source=concept_data['subject'],
                        target=concept_id,
                        relationship='contains',
                    )
                    knowledge_graph.add_edge(edge)

        # Add prerequisite relationships
        for prereq in assessment.get('prerequisites', []):
            edge = KnowledgeEdge(
                source=prereq.get('from'),
                target=prereq.get('to'),
                relationship='prerequisite',
                weight=prereq.get('strength', 1.0),
            )
            knowledge_graph.add_edge(edge)

        return knowledge_graph

    def _init_mastery_levels(self, assessment: Dict[str, Any]) -> Dict[str, MasteryLevel]:
        """
        Initialize mastery tracking for all concepts.

        Args:
            assessment: Assessment data with subject_scores

        Returns:
            Dictionary mapping subject/concept to MasteryLevel
        """
        mastery = {}

        for subject, score in assessment.get('subject_scores', {}).items():
            mastery[subject] = MasteryLevel(
                current_level=score / 100,
                target_level=0.8,  # 80% mastery target
                progress_rate=0.0,
                last_practiced=None,
            )

        # Initialize concepts at lower mastery target
        for concept_data in assessment.get('concept_results', []):
            concept_id = concept_data.get('concept_id', concept_data.get('name', ''))
            if concept_id:
                mastery[concept_id] = MasteryLevel(
                    current_level=concept_data.get('score', 0) / 100,
                    target_level=0.85,  # Slightly higher target for specific concepts
                    progress_rate=0.0,
                    last_practiced=None,
                )

        return mastery

    async def get_brain(self, learner_id: str) -> Optional[BrainState]:
        """
        Get brain state for a learner.

        Args:
            learner_id: Unique identifier for the learner

        Returns:
            BrainState if found, None otherwise
        """
        # Check cache first
        if learner_id in self._cache:
            return self._cache[learner_id]

        # Load from database
        result = await self.supabase.table('learner_brain_states') \
            .select('model_state') \
            .eq('learner_id', learner_id) \
            .single() \
            .execute()

        if result.data:
            brain_dict = result.data['model_state']
            brain_state = self._dict_to_brain_state(brain_dict)
            self._cache[learner_id] = brain_state
            return brain_state

        return None

    def _dict_to_brain_state(self, data: Dict[str, Any]) -> BrainState:
        """Convert dictionary to BrainState object."""
        # Reconstruct knowledge graph
        kg_data = data.get('knowledge_graph', {})
        knowledge_graph = KnowledgeGraph(
            nodes=[KnowledgeNode(**n) for n in kg_data.get('nodes', [])],
            edges=[KnowledgeEdge(**e) for e in kg_data.get('edges', [])],
        )

        # Reconstruct mastery levels
        mastery_levels = {
            k: MasteryLevel(**v)
            for k, v in data.get('mastery_levels', {}).items()
        }

        return BrainState(
            learner_id=data['learner_id'],
            version=data.get('version', '1.0'),
            created_at=datetime.fromisoformat(data['created_at']) if isinstance(data['created_at'], str) else data['created_at'],
            updated_at=datetime.fromisoformat(data['updated_at']) if isinstance(data['updated_at'], str) else data['updated_at'],
            knowledge_graph=knowledge_graph,
            learning_patterns=LearningPatterns(**data.get('learning_patterns', {})),
            mastery_levels=mastery_levels,
            engagement_profile=EngagementProfile(**data.get('engagement_profile', {})),
            adaptive_parameters=AdaptiveParameters(**data.get('adaptive_parameters', {})),
        )

    async def update_brain(
        self,
        learner_id: str,
        activity_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update brain based on learning activity.

        Args:
            learner_id: Unique identifier for the learner
            activity_data: Activity results containing subject, accuracy,
                time_spent, engagement, and completion status

        Returns:
            Updated brain state dictionary
        """
        # Get current brain state
        brain_state = await self.get_brain(learner_id)

        if not brain_state:
            logger.warning("brain_not_found", learner_id=learner_id)
            raise ValueError(f"Brain not found for learner: {learner_id}")

        # Extract learning signals
        subject = activity_data.get('subject')
        accuracy = activity_data.get('accuracy', 0)
        _time_spent = activity_data.get('time_spent', 0)  # Reserved for future use
        _engagement = activity_data.get('engagement', 0)  # Reserved for future use  
        _completed = activity_data.get('completed', False)  # Reserved for future use

        # Update mastery level and knowledge graph
        if subject:
            self._update_mastery_and_graph(brain_state, subject, accuracy)

        # Update learning patterns
        self._update_learning_patterns(brain_state, activity_data)

        # Update engagement profile
        self._update_engagement(brain_state, activity_data)

        # Update timestamp
        brain_state.updated_at = datetime.now(timezone.utc)

        # Update cache
        self._cache[learner_id] = brain_state

        # Save updated state to database
        brain_dict = brain_state.to_dict()
        await self.supabase.table('learner_brain_states') \
            .update({
                'model_state': brain_dict,
                'updated_at': brain_dict['updated_at'],
            }) \
            .eq('learner_id', learner_id) \
            .execute()

        logger.info(
            "brain_updated",
            learner_id=learner_id,
            subject=subject,
            accuracy=accuracy,
            new_mastery=brain_state.mastery_levels.get(subject, {}).current_level if subject else None,
        )

        return brain_dict

    def _update_mastery_and_graph(
        self, brain_state: BrainState, subject: str, accuracy: float
    ) -> None:
        """Update mastery level and knowledge graph for a subject."""
        if subject not in brain_state.mastery_levels:
            return

        mastery = brain_state.mastery_levels[subject]
        current = mastery.current_level

        # Calculate new mastery level
        alpha = brain_state.adaptive_parameters.difficulty_adjustment_rate
        new_level = alpha * accuracy + (1 - alpha) * current

        # Update streak and apply bonus
        new_level = self._update_streak_and_bonus(mastery, accuracy, new_level)

        # Track progress rate
        self._update_progress_rate(mastery, current, new_level)

        # Update mastery metadata
        mastery.current_level = new_level
        mastery.last_practiced = datetime.now(timezone.utc)
        mastery.practice_count += 1
        if accuracy >= 0.5:
            mastery.correct_count += 1

        # Update spaced repetition interval
        self._update_spaced_repetition(mastery, accuracy)

        # Update knowledge graph node
        node = brain_state.knowledge_graph.get_node(subject)
        if node:
            node.mastery = new_level
            node.last_updated = datetime.now(timezone.utc)

    def _update_streak_and_bonus(
        self, mastery: MasteryLevel, accuracy: float, new_level: float
    ) -> float:
        """Update streak counter and apply bonus to mastery level."""
        if accuracy >= 0.8:
            mastery.streak += 1
            mastery.best_streak = max(mastery.best_streak, mastery.streak)
            # Boost mastery gain for streaks
            streak_bonus = min(mastery.streak * 0.01, 0.1)
            return min(1.0, new_level + streak_bonus)
        else:
            mastery.streak = 0
            return new_level

    def _update_progress_rate(
        self, mastery: MasteryLevel, old_level: float, new_level: float
    ) -> None:
        """Calculate and update progress rate (change per hour)."""
        if mastery.last_practiced:
            time_since = (datetime.now(timezone.utc) - mastery.last_practiced).total_seconds()
            if time_since > 0:
                mastery.progress_rate = (new_level - old_level) / (time_since / 3600)

    def _update_spaced_repetition(self, mastery: MasteryLevel, accuracy: float) -> None:
        """Update spaced repetition interval based on performance."""
        if accuracy >= 0.9:
            # Excellent performance - increase interval
            mastery.spaced_repetition_interval = min(
                mastery.spaced_repetition_interval * 2,
                30  # Max 30 days
            )
        elif accuracy >= 0.7:
            # Good performance - slight increase
            mastery.spaced_repetition_interval = min(
                mastery.spaced_repetition_interval + 1,
                14
            )
        elif accuracy < 0.5:
            # Poor performance - reset interval
            mastery.spaced_repetition_interval = 1
        # Medium performance keeps current interval

    def _update_learning_patterns(self, brain_state: BrainState, activity: Dict[str, Any]) -> None:
        """Update learning pattern recognition."""
        patterns = brain_state.learning_patterns

        # Track optimal session length
        self._update_session_length(patterns, activity)

        # Track response time profile
        self._update_response_time(patterns, activity)

        # Detect best time of day
        self._update_best_time_of_day(patterns, activity)

    def _update_session_length(
        self, patterns: LearningPatterns, activity: Dict[str, Any]
    ) -> None:
        """Update optimal session length based on completed activities."""
        if not activity.get('completed', False):
            return

        current_length = patterns.optimal_session_length
        actual_length = activity.get('time_spent', 0) / 60  # Convert to minutes

        # If high engagement and completion, session length was good
        if activity.get('engagement', 0) > 0.7 and actual_length > 0:
            # Slight adjustment toward this length
            patterns.optimal_session_length = int(
                0.9 * current_length + 0.1 * actual_length
            )

    def _update_response_time(
        self, patterns: LearningPatterns, activity: Dict[str, Any]
    ) -> None:
        """Update response time profile by subject."""
        subject = activity.get('subject')
        if not subject or activity.get('time_spent', 0) <= 0:
            return

        questions = activity.get('questions_answered', 1)
        avg_time = activity.get('time_spent', 0) / max(questions, 1)

        if subject in patterns.response_time_profile:
            # Moving average
            current = patterns.response_time_profile[subject]
            patterns.response_time_profile[subject] = 0.8 * current + 0.2 * avg_time
        else:
            patterns.response_time_profile[subject] = avg_time

    def _update_best_time_of_day(
        self, patterns: LearningPatterns, activity: Dict[str, Any]
    ) -> None:
        """Detect and update best time of day for learning."""
        activity_time = activity.get('timestamp')
        if not activity_time or activity.get('engagement', 0) <= 0.8:
            return

        if isinstance(activity_time, str):
            activity_time = datetime.fromisoformat(activity_time)
        hour = activity_time.hour

        if 5 <= hour < 12:
            time_of_day = 'morning'
        elif 12 <= hour < 17:
            time_of_day = 'afternoon'
        elif 17 <= hour < 21:
            time_of_day = 'evening'
        else:
            time_of_day = 'night'

        # Simple majority rule (would use more sophisticated tracking in production)
        patterns.best_time_of_day = time_of_day

    def _update_engagement(self, brain_state: BrainState, activity: Dict[str, Any]) -> None:
        """Update engagement profile."""
        profile = brain_state.engagement_profile
        subject = activity.get('subject')
        engagement = activity.get('engagement', 0)
        accuracy = activity.get('accuracy', 0)
        time_spent = activity.get('time_spent', 0)

        # Update total time
        profile.total_time_spent += time_spent

        # Track activity completions
        self._track_activity_completion(profile, activity)

        # Track favorite and struggle subjects
        self._update_subject_preferences(profile, subject, engagement, accuracy)

        # Update average engagement (exponential moving average)
        profile.average_engagement_score = (
            0.95 * profile.average_engagement_score + 0.05 * engagement
        )

        # Update game preferences
        self._update_game_preferences(profile, activity)

    def _track_activity_completion(
        self, profile: EngagementProfile, activity: Dict[str, Any]
    ) -> None:
        """Track activity completion counts by type."""
        activity_type = activity.get('activity_type', 'unknown')
        profile.activity_completions[activity_type] = \
            profile.activity_completions.get(activity_type, 0) + 1

    def _update_subject_preferences(
        self,
        profile: EngagementProfile,
        subject: Optional[str],
        engagement: float,
        accuracy: float
    ) -> None:
        """Update favorite and struggle subject lists."""
        if not subject:
            return

        # Track favorite subjects (high engagement)
        if engagement > 0.8:
            if subject not in profile.favorite_subjects:
                profile.favorite_subjects.append(subject)
            # Remove from struggle if performing well
            if accuracy > 0.8 and subject in profile.struggle_subjects:
                profile.struggle_subjects.remove(subject)

        # Track struggle subjects
        if engagement < 0.3 or accuracy < 0.5:
            if subject not in profile.struggle_subjects:
                profile.struggle_subjects.append(subject)

    def _update_game_preferences(
        self, profile: EngagementProfile, activity: Dict[str, Any]
    ) -> None:
        """Update game preference list based on completions."""
        activity_type = activity.get('activity_type', 'unknown')
        if activity.get('completed', False) and activity_type.endswith('_game'):
            if activity_type not in profile.game_preferences:
                profile.game_preferences.append(activity_type)

    async def get_personalized_recommendations(
        self,
        learner_id: str
    ) -> List[Dict[str, Any]]:
        """
        Generate personalized learning recommendations.

        Args:
            learner_id: Unique identifier for the learner

        Returns:
            List of recommendation dictionaries sorted by priority
        """
        brain_state = await self.get_brain(learner_id)

        if not brain_state:
            return []

        recommendations = []

        # Generate different types of recommendations
        self._add_practice_recommendations(recommendations, brain_state)
        self._add_review_recommendations(recommendations, brain_state)
        self._add_challenge_recommendations(recommendations, brain_state)
        self._add_explore_recommendations(recommendations, brain_state)

        # Sort by priority
        recommendations.sort(key=lambda x: x['priority'], reverse=True)

        logger.info(
            "recommendations_generated",
            learner_id=learner_id,
            count=len(recommendations),
        )

        return recommendations[:5]  # Top 5 recommendations

    def _add_practice_recommendations(
        self, recommendations: List[Dict[str, Any]], brain_state: BrainState
    ) -> None:
        """Add practice recommendations for weak areas."""
        for subject, mastery in brain_state.mastery_levels.items():
            if mastery.current_level < mastery.target_level:
                gap = mastery.target_level - mastery.current_level
                priority_boost = 0.1 if subject in brain_state.engagement_profile.struggle_subjects else 0

                recommendations.append({
                    'type': 'practice',
                    'subject': subject,
                    'priority': gap + priority_boost,
                    'reason': f'Improve {subject} mastery (currently {mastery.current_level:.0%})',
                    'estimated_time': int(gap * 30),
                    'current_mastery': mastery.current_level,
                    'target_mastery': mastery.target_level,
                    'suggested_difficulty': self._calculate_suggested_difficulty(
                        mastery, brain_state.adaptive_parameters
                    ),
                })

    def _add_review_recommendations(
        self, recommendations: List[Dict[str, Any]], brain_state: BrainState
    ) -> None:
        """Add spaced repetition review recommendations."""
        now = datetime.now(timezone.utc)

        for subject, mastery in brain_state.mastery_levels.items():
            if not mastery.last_practiced:
                continue

            last_practiced = mastery.last_practiced
            if isinstance(last_practiced, str):
                last_practiced = datetime.fromisoformat(last_practiced)

            days_since = (now - last_practiced).days

            # Check if due for review based on spaced repetition interval
            if days_since >= mastery.spaced_repetition_interval:
                overdue_factor = min(days_since / mastery.spaced_repetition_interval, 2.0)

                recommendations.append({
                    'type': 'review',
                    'subject': subject,
                    'priority': 0.5 * overdue_factor,
                    'reason': f'Spaced repetition review ({days_since} days since practice)',
                    'estimated_time': 10,
                    'days_since_practice': days_since,
                    'current_mastery': mastery.current_level,
                })

    def _add_challenge_recommendations(
        self, recommendations: List[Dict[str, Any]], brain_state: BrainState
    ) -> None:
        """Add challenge recommendations for mastered favorite subjects."""
        for subject in brain_state.engagement_profile.favorite_subjects:
            if subject not in brain_state.mastery_levels:
                continue

            mastery = brain_state.mastery_levels[subject]
            if mastery.current_level >= mastery.target_level:
                recommendations.append({
                    'type': 'challenge',
                    'subject': subject,
                    'priority': 0.3,
                    'reason': f'Advanced challenge in favorite subject: {subject}',
                    'estimated_time': 15,
                    'current_mastery': mastery.current_level,
                })

    def _add_explore_recommendations(
        self, recommendations: List[Dict[str, Any]], brain_state: BrainState
    ) -> None:
        """Add recommendations to explore new concepts."""
        explored_subjects = set(brain_state.mastery_levels.keys())

        for node in brain_state.knowledge_graph.nodes:
            if node.id in explored_subjects or node.type != 'concept':
                continue

            # Check if prerequisites are met
            prereqs = brain_state.knowledge_graph.get_prerequisites(node.id)
            prereqs_met = all(
                brain_state.mastery_levels.get(p, MasteryLevel()).current_level >= 0.6
                for p in prereqs
            )

            if prereqs_met or not prereqs:
                recommendations.append({
                    'type': 'explore',
                    'subject': node.id,
                    'priority': 0.2,
                    'reason': f'Ready to explore new concept: {node.id}',
                    'estimated_time': 20,
                    'prerequisites_met': prereqs_met,
                })

    def _calculate_suggested_difficulty(
        self,
        mastery: MasteryLevel,
        _params: AdaptiveParameters
    ) -> str:
        """Calculate suggested difficulty based on mastery and parameters."""
        level = mastery.current_level
        streak = mastery.streak

        if level < 0.3:
            return 'easy'
        elif level < 0.6:
            return 'moderate' if streak >= 2 else 'easy'
        elif level < 0.8:
            return 'challenging' if streak >= 3 else 'moderate'
        else:
            return 'advanced' if streak >= 5 else 'challenging'

    async def get_brain_insights(self, learner_id: str) -> Dict[str, Any]:
        """
        Get comprehensive insights about a learner's brain state.

        Args:
            learner_id: Unique identifier for the learner

        Returns:
            Dictionary containing various insights and analytics
        """
        brain_state = await self.get_brain(learner_id)

        if not brain_state:
            return {}

        # Calculate overall mastery
        mastery_values = [m.current_level for m in brain_state.mastery_levels.values()]
        overall_mastery = sum(mastery_values) / len(mastery_values) if mastery_values else 0

        # Find strongest and weakest subjects
        sorted_subjects = sorted(
            brain_state.mastery_levels.items(),
            key=lambda x: x[1].current_level,
            reverse=True
        )

        strongest = sorted_subjects[:3] if sorted_subjects else []
        weakest = sorted_subjects[-3:] if len(sorted_subjects) > 3 else sorted_subjects

        # Calculate learning velocity
        recent_progress = [
            m.progress_rate for m in brain_state.mastery_levels.values()
            if m.progress_rate > 0
        ]
        avg_velocity = sum(recent_progress) / len(recent_progress) if recent_progress else 0

        return {
            'learner_id': learner_id,
            'overall_mastery': overall_mastery,
            'strongest_subjects': [
                {'subject': s, 'mastery': m.current_level}
                for s, m in strongest
            ],
            'weakest_subjects': [
                {'subject': s, 'mastery': m.current_level}
                for s, m in weakest
            ],
            'learning_velocity': avg_velocity,
            'preferred_learning_style': brain_state.learning_patterns.preferred_modality,
            'optimal_session_length': brain_state.learning_patterns.optimal_session_length,
            'best_time_of_day': brain_state.learning_patterns.best_time_of_day,
            'total_time_spent_hours': brain_state.engagement_profile.total_time_spent / 3600,
            'engagement_score': brain_state.engagement_profile.average_engagement_score,
            'subjects_at_target': sum(
                1 for m in brain_state.mastery_levels.values()
                if m.current_level >= m.target_level
            ),
            'total_subjects': len(brain_state.mastery_levels),
            'current_streak': max(
                (m.streak for m in brain_state.mastery_levels.values()),
                default=0
            ),
            'best_streak_ever': max(
                (m.best_streak for m in brain_state.mastery_levels.values()),
                default=0
            ),
        }

    async def reset_brain(self, learner_id: str) -> bool:
        """
        Reset a learner's brain state (for re-assessment).

        Args:
            learner_id: Unique identifier for the learner

        Returns:
            True if reset successful, False otherwise
        """
        # Remove from cache
        if learner_id in self._cache:
            del self._cache[learner_id]

        # Delete from database
        await self.supabase.table('learner_brain_states') \
            .delete() \
            .eq('learner_id', learner_id) \
            .execute()

        logger.info("brain_reset", learner_id=learner_id)

        return True


# Global service instance
_brain_manager: Optional[LearnerBrainManager] = None


def get_brain_manager(supabase_client=None) -> LearnerBrainManager:
    """Get global Brain Manager instance."""
    global _brain_manager
    if _brain_manager is None:
        if supabase_client is None:
            raise ValueError("Supabase client required for first initialization")
        _brain_manager = LearnerBrainManager(supabase_client)
    return _brain_manager
