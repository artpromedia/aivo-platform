"""
Content Recommender

Intelligent content recommendation using RL policy with safety constraints.
"""
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from uuid import uuid4

from app.models.student_model import (
    ContentRecommendation,
    ContentType,
    LearningPath,
    LearningPathNode,
    StudentProfile,
)

logger = logging.getLogger(__name__)


@dataclass
class ContentItem:
    """Represents a piece of learning content."""
    content_id: str
    content_type: ContentType
    topic: str
    subtopics: List[str] = field(default_factory=list)
    difficulty: float = 0.5  # 0.0 to 1.0
    estimated_duration: int = 300  # seconds
    prerequisites: List[str] = field(default_factory=list)
    learning_objectives: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "content_id": self.content_id,
            "content_type": self.content_type.value,
            "topic": self.topic,
            "subtopics": self.subtopics,
            "difficulty": self.difficulty,
            "estimated_duration": self.estimated_duration,
            "prerequisites": self.prerequisites,
            "learning_objectives": self.learning_objectives,
        }


class ContentRecommender:
    """
    Recommend learning content using RL policy with safety constraints.
    
    Integrates:
    - Policy-based recommendations
    - Difficulty adjustment
    - Content diversity
    - Safety constraints
    """
    
    # Default content library (would be loaded from database in production)
    DEFAULT_TOPICS = ["math", "reading", "science", "history", "art"]
    
    def __init__(
        self,
        policy_learner=None,
        action_selector=None,
        safety_monitor=None,
    ):
        self._policy_learner = policy_learner
        self._action_selector = action_selector
        self._safety_monitor = safety_monitor
        
        # Content library (in-memory for demo)
        self._content_library: Dict[str, ContentItem] = {}
        self._content_by_topic: Dict[str, List[str]] = {}
        self._content_by_difficulty: Dict[str, List[str]] = {}
        
        # Performance tracking
        self._recommendation_count = 0
        self._average_latency_ms = 0.0
        
        logger.info("ContentRecommender initialized")
    
    def set_policy_learner(self, policy_learner) -> None:
        """Set the policy learner."""
        self._policy_learner = policy_learner
    
    def set_action_selector(self, action_selector) -> None:
        """Set the action selector."""
        self._action_selector = action_selector
    
    def set_safety_monitor(self, safety_monitor) -> None:
        """Set the safety monitor."""
        self._safety_monitor = safety_monitor
    
    def add_content(self, content: ContentItem) -> None:
        """Add content to the library."""
        self._content_library[content.content_id] = content
        
        # Index by topic
        if content.topic not in self._content_by_topic:
            self._content_by_topic[content.topic] = []
        self._content_by_topic[content.topic].append(content.content_id)
        
        # Index by difficulty bucket
        bucket = self._get_difficulty_bucket(content.difficulty)
        if bucket not in self._content_by_difficulty:
            self._content_by_difficulty[bucket] = []
        self._content_by_difficulty[bucket].append(content.content_id)
    
    def _get_difficulty_bucket(self, difficulty: float) -> str:
        """Get difficulty bucket for indexing."""
        if difficulty < 0.3:
            return "easy"
        elif difficulty < 0.7:
            return "medium"
        else:
            return "hard"
    
    def recommend_next_content(
        self,
        student: StudentProfile,
        available_content_ids: Optional[List[str]] = None,
        target_topic: Optional[str] = None,
        use_policy: bool = True,
    ) -> Tuple[ContentRecommendation, Dict[str, Any]]:
        """
        Recommend the next content for a student.
        
        Args:
            student: Student profile
            available_content_ids: Optional list of content IDs to choose from
            target_topic: Optional target topic to focus on
            use_policy: Whether to use RL policy (False = rule-based only)
        
        Returns:
            Tuple of (recommendation, metadata)
        """
        start_time = time.time()
        
        # Get learning context
        context = student.get_learning_context()
        session = student.current_session
        
        # Determine available content
        if available_content_ids:
            candidates = [
                self._content_library.get(cid)
                for cid in available_content_ids
                if cid in self._content_library
            ]
            candidates = [c for c in candidates if c is not None]
        else:
            candidates = list(self._content_library.values())
        
        # Filter by target topic if specified
        if target_topic and candidates:
            topic_candidates = [c for c in candidates if c.topic == target_topic]
            if topic_candidates:
                candidates = topic_candidates
        
        # Filter out completed content
        if session:
            completed = set(session.completed_content_ids)
            candidates = [c for c in candidates if c.content_id not in completed]
        
        # If no candidates, generate synthetic
        if not candidates:
            candidates = self._generate_synthetic_content(target_topic or "general")
        
        # Get policy recommendation
        is_exploration = False
        action_idx = 0
        confidence = 0.5
        
        if use_policy and self._policy_learner:
            # Prepare state for policy
            state_dict = self._prepare_state_dict(student, context)
            action_idx, confidence = self._policy_learner.predict_with_confidence(state_dict)
            
            # Check if this is exploration
            is_exploration = confidence < 0.3  # Low confidence = likely exploration
        
        # Get tutoring action from policy output
        tutoring_action = None
        if self._action_selector:
            tutoring_action = self._action_selector.select(action_idx, context)
        
        # Apply safety check
        proposed_action = {
            "action_idx": action_idx,
            "action_type": tutoring_action.action_type if tutoring_action else "explanation",
            "difficulty_modifier": tutoring_action.parameters.get("difficulty_modifier", 0) if tutoring_action else 0,
        }
        
        use_fallback = False
        safety_assessment = None
        
        if self._safety_monitor:
            safety_assessment = self._safety_monitor.assess_action(
                student, proposed_action, is_exploration
            )
            use_fallback = safety_assessment.use_fallback or not safety_assessment.is_safe
        
        # Select content based on action
        if use_fallback and self._safety_monitor:
            # Use rule-based fallback
            fallback = self._safety_monitor.get_fallback_action(student, context)
            selected_content = self._select_content_by_rules(
                student, candidates, fallback["action_type"]
            )
            reason = f"Fallback: {fallback['fallback_reason']}"
        else:
            # Use policy-based selection
            selected_content = self._select_content_by_policy(
                student, candidates, tutoring_action, context
            )
            reason = f"Policy action: {tutoring_action.action_type if tutoring_action else 'default'}"
        
        # Calculate adjusted difficulty
        base_difficulty = selected_content.difficulty if selected_content else 0.5
        difficulty_modifier = proposed_action.get("difficulty_modifier", 0)
        adjusted_difficulty = max(0.0, min(1.0, base_difficulty + difficulty_modifier))
        
        # Create recommendation
        recommendation = ContentRecommendation(
            content_id=selected_content.content_id if selected_content else f"synthetic_{uuid4().hex[:8]}",
            content_type=selected_content.content_type if selected_content else ContentType.LESSON,
            topic=selected_content.topic if selected_content else target_topic or "general",
            difficulty=adjusted_difficulty,
            estimated_duration=selected_content.estimated_duration if selected_content else 300,
            reason=reason,
            confidence=confidence,
            is_exploration=is_exploration and not use_fallback,
        )
        
        # Record in audit log
        if self._safety_monitor and safety_assessment:
            self._safety_monitor.record_action(
                student_id=student.student_id,
                session_id=session.session_id if session else None,
                action_type=proposed_action["action_type"],
                action_details={
                    "content_id": recommendation.content_id,
                    "difficulty": recommendation.difficulty,
                    "topic": recommendation.topic,
                },
                assessment=safety_assessment,
                is_exploration=is_exploration,
            )
        
        # Track performance
        latency_ms = (time.time() - start_time) * 1000
        self._update_latency_stats(latency_ms)
        
        metadata = {
            "latency_ms": latency_ms,
            "policy_confidence": confidence,
            "is_exploration": is_exploration and not use_fallback,
            "used_fallback": use_fallback,
            "safety_warnings": safety_assessment.warnings if safety_assessment else [],
            "candidates_count": len(candidates),
            "action_type": proposed_action["action_type"],
        }
        
        return recommendation, metadata
    
    def _prepare_state_dict(
        self,
        student: StudentProfile,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Prepare state dictionary for policy learner."""
        session = student.current_session
        
        return {
            "knowledge_state": student.knowledge_state.topic_mastery,
            "recent_performance": context.get("recent_performance", []),
            "engagement_level": context.get("current_engagement", 0.7),
            "time_in_session": session.get_duration_seconds() if session else 0,
            "items_completed": session.items_completed if session else 0,
            "hints_given": session.hints_used if session else 0,
            "help_requests": session.help_requests if session else 0,
            "attention_score": context.get("current_engagement", 0.7),
            "participation_rate": context.get("session_accuracy", 0.7),
            "session_progress": context.get("items_completed", 0) / 20.0 if context.get("items_completed", 0) > 0 else 0,
        }
    
    def _select_content_by_policy(
        self,
        student: StudentProfile,
        candidates: List[ContentItem],
        tutoring_action,
        context: Dict[str, Any],
    ) -> Optional[ContentItem]:
        """Select content based on policy action."""
        if not candidates:
            return None
        
        action_type = tutoring_action.action_type if tutoring_action else "explanation"
        current_mastery = student.knowledge_state.get_average_mastery()
        
        # Filter based on action type
        if action_type == "review":
            # Prefer easier content for review
            candidates = sorted(candidates, key=lambda c: c.difficulty)
            candidates = [c for c in candidates if c.difficulty <= current_mastery + 0.1]
        elif action_type == "challenge":
            # Prefer harder content
            candidates = sorted(candidates, key=lambda c: c.difficulty, reverse=True)
            candidates = [c for c in candidates if c.difficulty >= current_mastery]
        elif action_type == "practice":
            # Prefer content at current level
            candidates = sorted(
                candidates,
                key=lambda c: abs(c.difficulty - current_mastery)
            )
        elif action_type in ("simplify", "hint", "explanation"):
            # Prefer easier content
            candidates = sorted(candidates, key=lambda c: c.difficulty)
        
        # Apply weak topics preference
        weak_topics = student.knowledge_state.get_weak_topics()
        if weak_topics:
            weak_topic_content = [c for c in candidates if c.topic in weak_topics]
            if weak_topic_content:
                return weak_topic_content[0]
        
        return candidates[0] if candidates else None
    
    def _select_content_by_rules(
        self,
        student: StudentProfile,
        candidates: List[ContentItem],
        fallback_action: str,
    ) -> Optional[ContentItem]:
        """Select content using rule-based fallback."""
        if not candidates:
            return None
        
        current_mastery = student.knowledge_state.get_average_mastery()
        
        # Sort by difficulty (easier first for fallback)
        candidates = sorted(candidates, key=lambda c: c.difficulty)
        
        # For struggling students, pick easiest
        if fallback_action in ("simplify", "encourage"):
            return candidates[0]
        
        # Otherwise, pick content near current level
        for content in candidates:
            if abs(content.difficulty - current_mastery) < 0.2:
                return content
        
        return candidates[0]
    
    def _generate_synthetic_content(self, topic: str) -> List[ContentItem]:
        """Generate synthetic content when library is empty."""
        return [
            ContentItem(
                content_id=f"synthetic_{topic}_{i}",
                content_type=ContentType.LESSON,
                topic=topic,
                difficulty=0.3 + (i * 0.2),
                estimated_duration=300,
            )
            for i in range(3)
        ]
    
    def _update_latency_stats(self, latency_ms: float) -> None:
        """Update latency statistics."""
        self._recommendation_count += 1
        # Exponential moving average
        alpha = 0.1
        self._average_latency_ms = (
            alpha * latency_ms + (1 - alpha) * self._average_latency_ms
        )
    
    def generate_learning_path(
        self,
        student: StudentProfile,
        target_topic: str,
        target_mastery: float = 0.8,
        max_nodes: int = 10,
    ) -> LearningPath:
        """
        Generate a personalized learning path.
        
        Uses student's current knowledge state to create an optimal
        sequence of content to reach the target mastery level.
        """
        current_mastery = student.knowledge_state.get_mastery(target_topic)
        mastery_gap = target_mastery - current_mastery
        
        nodes = []
        total_duration = 0
        
        # Calculate number of steps needed
        estimated_steps = max(1, int(mastery_gap / 0.1))  # ~0.1 mastery per step
        steps = min(estimated_steps, max_nodes)
        
        # Get content for the topic
        topic_content = [
            self._content_library[cid]
            for cid in self._content_by_topic.get(target_topic, [])
        ]
        
        # If no content, generate synthetic
        if not topic_content:
            topic_content = self._generate_synthetic_content(target_topic)
        
        # Sort by difficulty
        topic_content = sorted(topic_content, key=lambda c: c.difficulty)
        
        # Build path
        for i in range(steps):
            # Select content based on position in path
            progress = i / max(1, steps - 1)
            target_difficulty = current_mastery + (mastery_gap * progress)
            
            # Find content closest to target difficulty
            best_content = min(
                topic_content,
                key=lambda c: abs(c.difficulty - target_difficulty),
                default=None,
            )
            
            if best_content:
                node = LearningPathNode(
                    content_id=best_content.content_id,
                    content_type=best_content.content_type,
                    topic=best_content.topic,
                    prerequisites=[nodes[-1].content_id] if nodes else [],
                    estimated_duration=best_content.estimated_duration,
                    target_mastery=min(1.0, current_mastery + (mastery_gap * (i + 1) / steps)),
                    order=i,
                    status="in_progress" if i == 0 else "not_started",
                )
                nodes.append(node)
                total_duration += node.estimated_duration
        
        path = LearningPath(
            student_id=student.student_id,
            target_topic=target_topic,
            nodes=nodes,
            estimated_total_duration=total_duration,
        )
        
        return path
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get recommender statistics."""
        return {
            "content_library_size": len(self._content_library),
            "topics": list(self._content_by_topic.keys()),
            "recommendation_count": self._recommendation_count,
            "average_latency_ms": round(self._average_latency_ms, 2),
            "performance_target_ms": 200,
            "meets_latency_target": self._average_latency_ms < 200,
        }
