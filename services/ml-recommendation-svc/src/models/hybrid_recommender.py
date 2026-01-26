"""
Hybrid Recommendation Engine
Combines collaborative filtering, content-based, and knowledge tracing

This module implements a state-of-the-art hybrid recommendation system
designed specifically for educational content:

1. Collaborative Filtering - Learns from similar learners' preferences
2. Content-Based Filtering - Uses skill embeddings and difficulty matching
3. Knowledge Tracing - Incorporates mastery levels for optimal challenge
4. Multi-Armed Bandits - Balances exploration vs. exploitation

The system targets the Zone of Proximal Development (ZPD) to provide
activities that are appropriately challenging for each learner.
"""

import numpy as np
from scipy.sparse import csr_matrix, lil_matrix
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import normalize
from typing import List, Dict, Tuple, Optional, Any, Set
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
import json
import logging
import pickle

logger = logging.getLogger(__name__)


@dataclass
class RecommendationContext:
    """
    Context for personalized recommendations
    
    Captures the learner's current state and preferences
    to enable context-aware recommendations.
    """
    learner_id: str
    current_skill_id: Optional[str] = None
    mastery_levels: Dict[str, float] = field(default_factory=dict)  # skill_id -> mastery (0-1)
    recent_activities: List[str] = field(default_factory=list)  # activity IDs
    session_duration_minutes: int = 30
    time_of_day: str = "afternoon"  # morning, afternoon, evening
    focus_score: float = 0.8  # 0-1
    learning_style: str = "visual"  # visual, auditory, kinesthetic
    device_type: str = "tablet"  # mobile, tablet, desktop
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "learner_id": self.learner_id,
            "current_skill_id": self.current_skill_id,
            "mastery_levels": self.mastery_levels,
            "recent_activities": self.recent_activities,
            "session_duration_minutes": self.session_duration_minutes,
            "time_of_day": self.time_of_day,
            "focus_score": self.focus_score,
            "learning_style": self.learning_style,
            "device_type": self.device_type,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "RecommendationContext":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class RecommendedActivity:
    """A recommended learning activity"""
    activity_id: str
    score: float  # 0-1
    confidence: float
    reason: str
    skill_id: str
    difficulty: float
    estimated_duration_minutes: int
    prerequisites_met: bool = True
    engagement_prediction: float = 0.8
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "activity_id": self.activity_id,
            "score": self.score,
            "confidence": self.confidence,
            "reason": self.reason,
            "skill_id": self.skill_id,
            "difficulty": self.difficulty,
            "estimated_duration_minutes": self.estimated_duration_minutes,
            "prerequisites_met": self.prerequisites_met,
            "engagement_prediction": self.engagement_prediction,
        }


@dataclass
class ActivityMetadata:
    """Metadata for a learning activity"""
    activity_id: str
    skill_id: str
    difficulty: float
    duration_minutes: int = 10
    modality: str = "interactive"  # interactive, video, reading, game
    prerequisites: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "activity_id": self.activity_id,
            "skill_id": self.skill_id,
            "difficulty": self.difficulty,
            "duration_minutes": self.duration_minutes,
            "modality": self.modality,
            "prerequisites": self.prerequisites,
            "tags": self.tags,
        }


class CollaborativeFilter:
    """
    User-based collaborative filtering
    Recommends activities based on similar learners' preferences
    
    Uses cosine similarity to find similar learners and aggregates
    their ratings/interactions to generate recommendations.
    """
    
    def __init__(self, min_common_activities: int = 3):
        self.interaction_matrix: Optional[csr_matrix] = None
        self.learner_ids: List[str] = []
        self.activity_ids: List[str] = []
        self.similarity_matrix: Optional[np.ndarray] = None
        self.learner_to_idx: Dict[str, int] = {}
        self.activity_to_idx: Dict[str, int] = {}
        self.min_common_activities = min_common_activities
    
    def fit(self, interactions: List[Tuple[str, str, float]]):
        """
        Build collaborative filtering model
        
        Args:
            interactions: List of (learner_id, activity_id, rating) tuples
                         Rating should be 0-1 (0 = poor, 1 = excellent)
        """
        if not interactions:
            logger.warning("No interactions provided for collaborative filtering")
            return
        
        # Build learner-activity matrix
        learner_set = sorted(set(learner for learner, _, _ in interactions))
        activity_set = sorted(set(activity for _, activity, _ in interactions))
        
        self.learner_ids = learner_set
        self.activity_ids = activity_set
        
        self.learner_to_idx = {lid: i for i, lid in enumerate(learner_set)}
        self.activity_to_idx = {aid: i for i, aid in enumerate(activity_set)}
        
        # Create sparse matrix using lil_matrix for efficient construction
        n_learners = len(learner_set)
        n_activities = len(activity_set)
        
        matrix = lil_matrix((n_learners, n_activities), dtype=np.float32)
        
        for learner_id, activity_id, rating in interactions:
            row = self.learner_to_idx[learner_id]
            col = self.activity_to_idx[activity_id]
            matrix[row, col] = rating
        
        # Convert to CSR for efficient row operations
        self.interaction_matrix = matrix.tocsr()
        
        # Compute learner-learner similarity
        # Normalize rows before computing similarity
        normalized = normalize(self.interaction_matrix, norm='l2', axis=1)
        self.similarity_matrix = cosine_similarity(normalized)
        
        # Zero out self-similarity
        np.fill_diagonal(self.similarity_matrix, 0)
        
        logger.info(f"Collaborative filter trained: {n_learners} learners, {n_activities} activities")
    
    def add_interaction(self, learner_id: str, activity_id: str, rating: float):
        """Add a single interaction (for online updates)"""
        # For production, implement incremental updates
        # This is a simplified version that requires refit
        pass
    
    def recommend(
        self,
        learner_id: str,
        n: int = 10,
        exclude_completed: Optional[List[str]] = None,
        min_similarity: float = 0.1
    ) -> List[Tuple[str, float]]:
        """
        Recommend activities based on similar learners
        
        Args:
            learner_id: Target learner
            n: Number of recommendations
            exclude_completed: Activities to exclude
            min_similarity: Minimum similarity threshold
        
        Returns:
            List of (activity_id, score) tuples
        """
        if self.interaction_matrix is None or learner_id not in self.learner_to_idx:
            return []
        
        learner_idx = self.learner_to_idx[learner_id]
        
        # Get similar learners
        similarities = self.similarity_matrix[learner_idx]
        
        # Filter by minimum similarity
        similar_mask = similarities >= min_similarity
        similar_indices = np.where(similar_mask)[0]
        similar_weights = similarities[similar_mask]
        
        if len(similar_indices) == 0:
            return []
        
        # Sort by similarity and take top K
        top_k = min(20, len(similar_indices))
        top_indices = np.argsort(similar_weights)[::-1][:top_k]
        similar_indices = similar_indices[top_indices]
        similar_weights = similar_weights[top_indices]
        
        # Aggregate ratings from similar learners (weighted average)
        scores = np.zeros(len(self.activity_ids), dtype=np.float32)
        weight_sums = np.zeros(len(self.activity_ids), dtype=np.float32)
        
        for idx, weight in zip(similar_indices, similar_weights):
            ratings = self.interaction_matrix[idx].toarray().flatten()
            mask = ratings > 0
            scores[mask] += weight * ratings[mask]
            weight_sums[mask] += weight
        
        # Normalize by weight sums
        nonzero = weight_sums > 0
        scores[nonzero] /= weight_sums[nonzero]
        
        # Exclude already completed
        exclude_set = set(exclude_completed or [])
        learner_activities = set(
            self.activity_ids[i] 
            for i in self.interaction_matrix[learner_idx].indices
        )
        exclude_set.update(learner_activities)
        
        for activity_id in exclude_set:
            if activity_id in self.activity_to_idx:
                idx = self.activity_to_idx[activity_id]
                scores[idx] = -1
        
        # Get top N
        top_indices = np.argsort(scores)[::-1][:n]
        recommendations = [
            (self.activity_ids[idx], float(scores[idx]))
            for idx in top_indices
            if scores[idx] > 0
        ]
        
        return recommendations
    
    def get_similar_learners(
        self, 
        learner_id: str, 
        n: int = 10
    ) -> List[Tuple[str, float]]:
        """Get most similar learners"""
        if learner_id not in self.learner_to_idx:
            return []
        
        idx = self.learner_to_idx[learner_id]
        similarities = self.similarity_matrix[idx]
        
        top_indices = np.argsort(similarities)[::-1][:n]
        
        return [
            (self.learner_ids[i], float(similarities[i]))
            for i in top_indices
            if similarities[i] > 0
        ]
    
    def save(self, path: str):
        """Save model to disk"""
        data = {
            'learner_ids': self.learner_ids,
            'activity_ids': self.activity_ids,
            'interaction_matrix': self.interaction_matrix,
            'similarity_matrix': self.similarity_matrix,
        }
        with open(path, 'wb') as f:
            pickle.dump(data, f)
    
    def load(self, path: str):
        """Load model from disk"""
        with open(path, 'rb') as f:
            data = pickle.load(f)
        
        self.learner_ids = data['learner_ids']
        self.activity_ids = data['activity_ids']
        self.interaction_matrix = data['interaction_matrix']
        self.similarity_matrix = data['similarity_matrix']
        
        self.learner_to_idx = {lid: i for i, lid in enumerate(self.learner_ids)}
        self.activity_to_idx = {aid: i for i, aid in enumerate(self.activity_ids)}


class ContentBasedFilter:
    """
    Content-based filtering using skill embeddings
    Recommends activities similar to those the learner succeeded with
    
    Uses skill embeddings to find semantically similar skills and
    matches difficulty to the learner's current mastery level.
    """
    
    def __init__(self, skill_embeddings: Optional[Dict[str, np.ndarray]] = None):
        self.skill_embeddings = skill_embeddings or {}
        self.activities: Dict[str, ActivityMetadata] = {}
        self.skill_similarity: Optional[np.ndarray] = None
        self.skill_ids: List[str] = []
    
    def set_skill_embeddings(self, embeddings: Dict[str, np.ndarray]):
        """Set skill embeddings and compute similarity matrix"""
        self.skill_embeddings = embeddings
        self.skill_ids = list(embeddings.keys())
        
        if self.skill_ids:
            # Stack embeddings and compute similarity
            embedding_matrix = np.stack([embeddings[s] for s in self.skill_ids])
            self.skill_similarity = cosine_similarity(embedding_matrix)
    
    def add_activity(
        self, 
        activity_id: str, 
        skill_id: str, 
        difficulty: float,
        duration_minutes: int = 10,
        modality: str = "interactive",
        prerequisites: List[str] = None,
        tags: List[str] = None
    ):
        """Register activity with metadata"""
        self.activities[activity_id] = ActivityMetadata(
            activity_id=activity_id,
            skill_id=skill_id,
            difficulty=difficulty,
            duration_minutes=duration_minutes,
            modality=modality,
            prerequisites=prerequisites or [],
            tags=tags or [],
        )
    
    def add_activities_bulk(self, activities: List[Dict[str, Any]]):
        """Add multiple activities at once"""
        for act in activities:
            self.add_activity(**act)
    
    def get_skill_similarity(self, skill1: str, skill2: str) -> float:
        """Get similarity between two skills"""
        if skill1 not in self.skill_embeddings or skill2 not in self.skill_embeddings:
            return 0.0
        
        if self.skill_similarity is not None:
            idx1 = self.skill_ids.index(skill1)
            idx2 = self.skill_ids.index(skill2)
            return float(self.skill_similarity[idx1, idx2])
        
        # Fallback to direct computation
        emb1 = self.skill_embeddings[skill1]
        emb2 = self.skill_embeddings[skill2]
        norm1 = np.linalg.norm(emb1)
        norm2 = np.linalg.norm(emb2)
        if norm1 == 0 or norm2 == 0:
            return 0.0
        return float(np.dot(emb1, emb2) / (norm1 * norm2))
    
    def recommend(
        self,
        context: RecommendationContext,
        n: int = 10,
        modality_preference: Optional[str] = None
    ) -> List[Tuple[str, float]]:
        """
        Recommend activities based on skill similarity and mastery
        
        Args:
            context: Learner context with mastery levels
            n: Number of recommendations
            modality_preference: Preferred activity type
        
        Returns:
            List of (activity_id, score) tuples
        """
        if not self.activities:
            return []
        
        # Identify skills to practice (low mastery)
        target_skills = [
            skill_id for skill_id, mastery in context.mastery_levels.items()
            if mastery < 0.8
        ]
        
        if not target_skills:
            target_skills = list(context.mastery_levels.keys())
        
        # Get skills similar to current focus
        related_skills: Set[str] = set(target_skills)
        if context.current_skill_id:
            related_skills.add(context.current_skill_id)
            # Add similar skills
            for skill_id in self.skill_ids:
                if self.get_skill_similarity(context.current_skill_id, skill_id) > 0.5:
                    related_skills.add(skill_id)
        
        # Score activities
        scored_activities = []
        recent_set = set(context.recent_activities)
        
        for activity_id, metadata in self.activities.items():
            # Skip if already done
            if activity_id in recent_set:
                continue
            
            skill_id = metadata.skill_id
            
            # 1. Skill relevance score
            relevance = 0.0
            if skill_id in target_skills:
                relevance = 1.0
            elif skill_id in related_skills:
                relevance = 0.7
            elif context.current_skill_id:
                relevance = self.get_skill_similarity(context.current_skill_id, skill_id)
            
            # 2. Difficulty appropriateness (Zone of Proximal Development)
            mastery = context.mastery_levels.get(skill_id, 0.5)
            difficulty = metadata.difficulty
            difficulty_gap = difficulty - mastery
            
            # Optimal gap is 0.1-0.25 (slightly challenging)
            if 0.05 <= difficulty_gap <= 0.30:
                difficulty_score = 1.0
            elif -0.1 <= difficulty_gap <= 0.4:
                difficulty_score = 0.7
            else:
                difficulty_score = max(0.0, 1.0 - abs(difficulty_gap - 0.15) * 2)
            
            # 3. Duration appropriateness
            duration_score = 1.0
            if metadata.duration_minutes > context.session_duration_minutes:
                duration_score = 0.5
            
            # 4. Modality preference
            modality_score = 1.0
            if modality_preference and metadata.modality != modality_preference:
                modality_score = 0.7
            
            # 5. Prerequisites check
            prerequisites_met = all(
                context.mastery_levels.get(prereq, 0) >= 0.7
                for prereq in metadata.prerequisites
            )
            prereq_score = 1.0 if prerequisites_met else 0.3
            
            # Combined score
            score = (
                0.35 * relevance +
                0.30 * difficulty_score +
                0.15 * duration_score +
                0.10 * modality_score +
                0.10 * prereq_score
            )
            
            scored_activities.append((activity_id, score, prerequisites_met))
        
        # Sort by score
        scored_activities.sort(key=lambda x: x[1], reverse=True)
        
        return [(aid, score) for aid, score, _ in scored_activities[:n]]
    
    def get_activity_metadata(self, activity_id: str) -> Optional[ActivityMetadata]:
        """Get metadata for an activity"""
        return self.activities.get(activity_id)


class MultiArmedBandit:
    """
    Upper Confidence Bound (UCB) for exploration/exploitation
    Balances trying new activities vs. recommending known good ones
    
    Uses the UCB1 algorithm which provides theoretical guarantees
    for regret minimization.
    """
    
    def __init__(
        self, 
        exploration_constant: float = 2.0,
        decay_factor: float = 0.99
    ):
        self.c = exploration_constant
        self.decay_factor = decay_factor
        self.activity_pulls: Dict[str, int] = {}  # times recommended
        self.activity_rewards: Dict[str, List[float]] = {}  # completion/success rates
        self.activity_timestamps: Dict[str, List[datetime]] = {}
    
    def select_activity(
        self,
        candidate_activities: List[str],
        total_pulls: int
    ) -> str:
        """
        Select activity using UCB algorithm
        
        UCB formula: mean_reward + c * sqrt(ln(total_pulls) / pulls_for_activity)
        
        Args:
            candidate_activities: List of candidate activity IDs
            total_pulls: Total recommendations made
        
        Returns:
            Selected activity ID
        """
        if not candidate_activities:
            raise ValueError("No candidate activities provided")
        
        best_activity = None
        best_ucb = -float('inf')
        
        for activity_id in candidate_activities:
            pulls = self.activity_pulls.get(activity_id, 0)
            
            if pulls == 0:
                # Always try activities we haven't seen (infinite UCB)
                return activity_id
            
            # Calculate mean reward with recency weighting
            rewards = self.activity_rewards[activity_id]
            if len(rewards) > 10:
                # Apply decay to older rewards
                weights = [self.decay_factor ** i for i in range(len(rewards) - 1, -1, -1)]
                mean_reward = np.average(rewards, weights=weights)
            else:
                mean_reward = np.mean(rewards)
            
            # UCB exploration bonus
            exploration_bonus = self.c * np.sqrt(np.log(max(total_pulls, 1)) / pulls)
            ucb = mean_reward + exploration_bonus
            
            if ucb > best_ucb:
                best_ucb = ucb
                best_activity = activity_id
        
        return best_activity or candidate_activities[0]
    
    def update(self, activity_id: str, reward: float, timestamp: Optional[datetime] = None):
        """
        Update statistics after activity completion
        
        Args:
            activity_id: Completed activity
            reward: Reward signal (0-1, based on completion and accuracy)
            timestamp: When the activity was completed
        """
        if activity_id not in self.activity_pulls:
            self.activity_pulls[activity_id] = 0
            self.activity_rewards[activity_id] = []
            self.activity_timestamps[activity_id] = []
        
        self.activity_pulls[activity_id] += 1
        self.activity_rewards[activity_id].append(reward)
        self.activity_timestamps[activity_id].append(timestamp or datetime.utcnow())
        
        # Keep only recent history
        max_history = 100
        if len(self.activity_rewards[activity_id]) > max_history:
            self.activity_rewards[activity_id] = self.activity_rewards[activity_id][-max_history:]
            self.activity_timestamps[activity_id] = self.activity_timestamps[activity_id][-max_history:]
    
    def get_activity_stats(self, activity_id: str) -> Dict[str, Any]:
        """Get statistics for an activity"""
        if activity_id not in self.activity_pulls:
            return {"pulls": 0, "mean_reward": 0.0, "std_reward": 0.0}
        
        rewards = self.activity_rewards[activity_id]
        return {
            "pulls": self.activity_pulls[activity_id],
            "mean_reward": float(np.mean(rewards)) if rewards else 0.0,
            "std_reward": float(np.std(rewards)) if len(rewards) > 1 else 0.0,
            "recent_reward": rewards[-1] if rewards else 0.0,
        }
    
    def get_exploration_candidates(
        self,
        activities: List[str],
        exploration_threshold: int = 5
    ) -> List[str]:
        """Get activities that need more exploration"""
        return [
            aid for aid in activities
            if self.activity_pulls.get(aid, 0) < exploration_threshold
        ]


class HybridRecommender:
    """
    Hybrid recommendation system combining:
    - Collaborative filtering (similar learners)
    - Content-based filtering (skill similarity)
    - Knowledge tracing (mastery-based)
    - Multi-armed bandits (exploration)
    
    The weights of each component can be tuned based on
    available data and learner characteristics.
    """
    
    def __init__(
        self,
        skill_embeddings: Optional[Dict[str, np.ndarray]] = None,
        weights: Optional[Dict[str, float]] = None,
        exploration_rate: float = 0.2
    ):
        self.collaborative = CollaborativeFilter()
        self.content_based = ContentBasedFilter(skill_embeddings)
        self.bandit = MultiArmedBandit()
        
        # Component weights
        self.weights = weights or {
            'collaborative': 0.3,
            'content': 0.4,
            'knowledge': 0.3
        }
        
        self.exploration_rate = exploration_rate
        self.total_recommendations = 0
        
        # Track recommendation history for analysis
        self.recommendation_history: List[Dict[str, Any]] = []
    
    def set_skill_embeddings(self, embeddings: Dict[str, np.ndarray]):
        """Update skill embeddings"""
        self.content_based.set_skill_embeddings(embeddings)
    
    def fit_collaborative(self, interactions: List[Tuple[str, str, float]]):
        """Train collaborative filtering component"""
        self.collaborative.fit(interactions)
    
    def add_activity(
        self, 
        activity_id: str, 
        skill_id: str, 
        difficulty: float,
        **kwargs
    ):
        """Add activity to content-based filter"""
        self.content_based.add_activity(activity_id, skill_id, difficulty, **kwargs)
    
    def add_activities_bulk(self, activities: List[Dict[str, Any]]):
        """Add multiple activities"""
        self.content_based.add_activities_bulk(activities)
    
    def recommend(
        self,
        context: RecommendationContext,
        n: int = 10,
        use_exploration: bool = True,
        explain: bool = False
    ) -> List[RecommendedActivity]:
        """
        Generate hybrid recommendations
        
        Args:
            context: Learner context
            n: Number of recommendations
            use_exploration: Use MAB for exploration
            explain: Include detailed explanations
        
        Returns:
            Ranked list of recommended activities
        """
        # Get candidates from each component
        collab_recs = self.collaborative.recommend(
            context.learner_id,
            n=30,
            exclude_completed=context.recent_activities
        )
        
        content_recs = self.content_based.recommend(context, n=30)
        
        # Combine scores
        combined_scores: Dict[str, Dict[str, Any]] = {}
        
        # Collaborative filtering scores
        for activity_id, score in collab_recs:
            combined_scores[activity_id] = {
                'collaborative': score,
                'content': 0.0,
                'knowledge': 0.0,
            }
        
        # Content-based scores
        for activity_id, score in content_recs:
            if activity_id not in combined_scores:
                combined_scores[activity_id] = {
                    'collaborative': 0.0,
                    'content': 0.0,
                    'knowledge': 0.0,
                }
            combined_scores[activity_id]['content'] = score
        
        # Knowledge tracing component (mastery-based)
        for activity_id in combined_scores:
            metadata = self.content_based.get_activity_metadata(activity_id)
            if metadata:
                skill_id = metadata.skill_id
                mastery = context.mastery_levels.get(skill_id, 0.5)
                
                # Prefer skills with 40-70% mastery (optimal challenge)
                # This targets the Zone of Proximal Development
                if 0.4 <= mastery <= 0.7:
                    knowledge_score = 1.0
                elif 0.2 <= mastery <= 0.85:
                    knowledge_score = 0.7
                else:
                    knowledge_score = max(0.0, 1.0 - abs(mastery - 0.55) * 2)
                
                combined_scores[activity_id]['knowledge'] = knowledge_score
        
        # Calculate final scores
        final_scores = []
        for activity_id, scores in combined_scores.items():
            total = (
                self.weights['collaborative'] * scores['collaborative'] +
                self.weights['content'] * scores['content'] +
                self.weights['knowledge'] * scores['knowledge']
            )
            final_scores.append((activity_id, total, scores))
        
        # Sort by combined score
        final_scores.sort(key=lambda x: x[1], reverse=True)
        
        # Apply exploration with MAB
        if use_exploration and len(final_scores) > 5:
            exploration_count = max(1, int(n * self.exploration_rate))
            candidates = [aid for aid, _, _ in final_scores[:n * 2]]
            
            # Get exploration candidates (under-explored activities)
            exploration_candidates = self.bandit.get_exploration_candidates(candidates)
            
            explored = set()
            for _ in range(exploration_count):
                self.total_recommendations += 1
                
                if exploration_candidates:
                    # Prioritize truly unexplored
                    explore_id = exploration_candidates.pop(0) if exploration_candidates else None
                else:
                    explore_id = self.bandit.select_activity(candidates, self.total_recommendations)
                
                if explore_id and explore_id not in explored:
                    explored.add(explore_id)
                    # Insert exploration item
                    final_scores.insert(len(explored), (explore_id, 0.75, {'exploration': True}))
        
        # Create recommendation objects
        recommendations = []
        seen_activities = set()
        
        for activity_id, score, component_scores in final_scores:
            if activity_id in seen_activities:
                continue
            if len(recommendations) >= n:
                break
            
            seen_activities.add(activity_id)
            
            metadata = self.content_based.get_activity_metadata(activity_id)
            skill_id = metadata.skill_id if metadata else "unknown"
            difficulty = metadata.difficulty if metadata else 0.5
            duration = metadata.duration_minutes if metadata else 10
            
            # Check prerequisites
            prerequisites_met = True
            if metadata and metadata.prerequisites:
                prerequisites_met = all(
                    context.mastery_levels.get(prereq, 0) >= 0.7
                    for prereq in metadata.prerequisites
                )
            
            # Generate explanation
            reason = self._generate_reason(activity_id, context, component_scores, explain)
            
            # Predict engagement
            engagement = self._predict_engagement(activity_id, context)
            
            recommendations.append(RecommendedActivity(
                activity_id=activity_id,
                score=min(1.0, score),
                confidence=self._calculate_confidence(component_scores),
                reason=reason,
                skill_id=skill_id,
                difficulty=difficulty,
                estimated_duration_minutes=duration,
                prerequisites_met=prerequisites_met,
                engagement_prediction=engagement,
            ))
        
        # Log recommendation
        self._log_recommendation(context, recommendations)
        
        return recommendations
    
    def _generate_reason(
        self,
        activity_id: str,
        context: RecommendationContext,
        component_scores: Dict[str, Any],
        detailed: bool = False
    ) -> str:
        """Generate human-readable explanation"""
        metadata = self.content_based.get_activity_metadata(activity_id)
        skill_id = metadata.skill_id if metadata else "this skill"
        mastery = context.mastery_levels.get(skill_id, 0.5)
        
        # Check if this is an exploration recommendation
        if component_scores.get('exploration'):
            return f"Trying something new in {skill_id}"
        
        # Base reason on mastery level
        if mastery < 0.3:
            base_reason = f"Building foundation in {skill_id}"
        elif mastery < 0.5:
            base_reason = f"Developing skills in {skill_id}"
        elif mastery < 0.7:
            base_reason = f"Practicing {skill_id} at your level"
        elif mastery < 0.9:
            base_reason = f"Advancing in {skill_id}"
        else:
            base_reason = f"Mastering advanced {skill_id}"
        
        if detailed:
            # Add component contribution
            parts = [base_reason]
            if component_scores.get('collaborative', 0) > 0.5:
                parts.append("Similar learners enjoyed this")
            if component_scores.get('content', 0) > 0.7:
                parts.append("Matches your learning path")
            return " • ".join(parts)
        
        return base_reason
    
    def _calculate_confidence(self, component_scores: Dict[str, Any]) -> float:
        """Calculate recommendation confidence"""
        if component_scores.get('exploration'):
            return 0.6  # Lower confidence for exploration
        
        # Confidence based on agreement between components
        scores = [
            component_scores.get('collaborative', 0),
            component_scores.get('content', 0),
            component_scores.get('knowledge', 0),
        ]
        
        # High confidence if all components agree
        mean_score = np.mean(scores)
        variance = np.var(scores)
        
        confidence = mean_score * (1 - variance)
        return min(1.0, max(0.3, confidence * 1.2))
    
    def _predict_engagement(
        self,
        activity_id: str,
        context: RecommendationContext
    ) -> float:
        """Predict learner engagement with activity"""
        stats = self.bandit.get_activity_stats(activity_id)
        
        # Base engagement on historical performance
        base_engagement = stats.get('mean_reward', 0.7)
        
        # Adjust for context
        time_factor = 1.0
        if context.time_of_day == "morning":
            time_factor = 1.1
        elif context.time_of_day == "evening":
            time_factor = 0.9
        
        focus_factor = 0.5 + 0.5 * context.focus_score
        
        return min(1.0, base_engagement * time_factor * focus_factor)
    
    def _log_recommendation(
        self,
        context: RecommendationContext,
        recommendations: List[RecommendedActivity]
    ):
        """Log recommendation for analysis"""
        self.recommendation_history.append({
            "timestamp": datetime.utcnow().isoformat(),
            "learner_id": context.learner_id,
            "recommendations": [r.activity_id for r in recommendations],
            "scores": [r.score for r in recommendations],
        })
        
        # Keep only recent history
        if len(self.recommendation_history) > 10000:
            self.recommendation_history = self.recommendation_history[-10000:]
    
    def update_feedback(
        self, 
        activity_id: str, 
        completed: bool, 
        accuracy: float,
        duration_minutes: Optional[int] = None
    ):
        """
        Update models with feedback
        
        Args:
            activity_id: Completed activity
            completed: Whether activity was completed
            accuracy: Accuracy on activity (0-1)
            duration_minutes: Time spent
        """
        # Calculate reward for bandit
        completion_score = 1.0 if completed else 0.3
        
        # Bonus for appropriate difficulty (neither too easy nor too hard)
        difficulty_bonus = 1.0 if 0.4 <= accuracy <= 0.9 else 0.7
        
        reward = 0.4 * completion_score + 0.4 * accuracy + 0.2 * difficulty_bonus
        
        self.bandit.update(activity_id, reward)
        
        logger.debug(f"Updated feedback for {activity_id}: reward={reward:.3f}")
    
    def get_similar_learners(self, learner_id: str, n: int = 10) -> List[Tuple[str, float]]:
        """Get similar learners for a given learner"""
        return self.collaborative.get_similar_learners(learner_id, n)
    
    def save(self, directory: str):
        """Save all models to directory"""
        path = Path(directory)
        path.mkdir(parents=True, exist_ok=True)
        
        # Save collaborative filter
        self.collaborative.save(str(path / "collaborative.pkl"))
        
        # Save content-based activities
        with open(path / "activities.json", 'w') as f:
            activities = {
                aid: meta.to_dict() 
                for aid, meta in self.content_based.activities.items()
            }
            json.dump(activities, f)
        
        # Save bandit state
        with open(path / "bandit.pkl", 'wb') as f:
            pickle.dump({
                'pulls': self.bandit.activity_pulls,
                'rewards': self.bandit.activity_rewards,
            }, f)
        
        # Save config
        with open(path / "config.json", 'w') as f:
            json.dump({
                'weights': self.weights,
                'exploration_rate': self.exploration_rate,
                'total_recommendations': self.total_recommendations,
            }, f)
        
        logger.info(f"Saved hybrid recommender to {directory}")
    
    def load(self, directory: str):
        """Load all models from directory"""
        path = Path(directory)
        
        # Load collaborative filter
        collab_path = path / "collaborative.pkl"
        if collab_path.exists():
            self.collaborative.load(str(collab_path))
        
        # Load activities
        activities_path = path / "activities.json"
        if activities_path.exists():
            with open(activities_path) as f:
                activities = json.load(f)
            for aid, meta in activities.items():
                self.content_based.activities[aid] = ActivityMetadata(**meta)
        
        # Load bandit state
        bandit_path = path / "bandit.pkl"
        if bandit_path.exists():
            with open(bandit_path, 'rb') as f:
                data = pickle.load(f)
            self.bandit.activity_pulls = data['pulls']
            self.bandit.activity_rewards = data['rewards']
        
        # Load config
        config_path = path / "config.json"
        if config_path.exists():
            with open(config_path) as f:
                config = json.load(f)
            self.weights = config.get('weights', self.weights)
            self.exploration_rate = config.get('exploration_rate', self.exploration_rate)
            self.total_recommendations = config.get('total_recommendations', 0)
        
        logger.info(f"Loaded hybrid recommender from {directory}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get recommender statistics"""
        return {
            "total_recommendations": self.total_recommendations,
            "activities_count": len(self.content_based.activities),
            "learners_count": len(self.collaborative.learner_ids),
            "collaborative_activities": len(self.collaborative.activity_ids),
            "bandit_activities": len(self.bandit.activity_pulls),
            "weights": self.weights,
            "exploration_rate": self.exploration_rate,
        }


# Example usage
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    # Initialize with skill embeddings
    np.random.seed(42)
    skill_embeddings = {
        'addition': np.random.randn(64),
        'subtraction': np.random.randn(64),
        'multiplication': np.random.randn(64),
        'division': np.random.randn(64),
        'fractions': np.random.randn(64),
    }
    
    # Make related skills more similar
    skill_embeddings['subtraction'] = skill_embeddings['addition'] + np.random.randn(64) * 0.3
    skill_embeddings['division'] = skill_embeddings['multiplication'] + np.random.randn(64) * 0.3
    
    recommender = HybridRecommender(skill_embeddings)
    
    # Add activities
    activities = [
        {'activity_id': 'act_1', 'skill_id': 'addition', 'difficulty': 0.3, 'duration_minutes': 5},
        {'activity_id': 'act_2', 'skill_id': 'addition', 'difficulty': 0.5, 'duration_minutes': 8},
        {'activity_id': 'act_3', 'skill_id': 'addition', 'difficulty': 0.7, 'duration_minutes': 10},
        {'activity_id': 'act_4', 'skill_id': 'subtraction', 'difficulty': 0.3, 'duration_minutes': 5},
        {'activity_id': 'act_5', 'skill_id': 'subtraction', 'difficulty': 0.5, 'duration_minutes': 8},
        {'activity_id': 'act_6', 'skill_id': 'multiplication', 'difficulty': 0.4, 'duration_minutes': 10},
        {'activity_id': 'act_7', 'skill_id': 'multiplication', 'difficulty': 0.6, 'duration_minutes': 12},
        {'activity_id': 'act_8', 'skill_id': 'division', 'difficulty': 0.5, 'duration_minutes': 10},
        {'activity_id': 'act_9', 'skill_id': 'fractions', 'difficulty': 0.4, 'duration_minutes': 15},
        {'activity_id': 'act_10', 'skill_id': 'fractions', 'difficulty': 0.7, 'duration_minutes': 20},
    ]
    recommender.add_activities_bulk(activities)
    
    # Train collaborative filter with mock data
    interactions = []
    learners = ['student_1', 'student_2', 'student_3', 'student_4', 'student_5']
    for learner in learners:
        for act in activities[:7]:
            rating = np.random.uniform(0.5, 1.0)
            interactions.append((learner, act['activity_id'], rating))
    
    recommender.fit_collaborative(interactions)
    
    # Create context
    context = RecommendationContext(
        learner_id='student_1',
        current_skill_id='addition',
        mastery_levels={
            'addition': 0.6,
            'subtraction': 0.4,
            'multiplication': 0.3,
            'division': 0.2,
            'fractions': 0.1,
        },
        recent_activities=['act_1'],
        session_duration_minutes=20,
        time_of_day='afternoon',
        focus_score=0.8
    )
    
    # Get recommendations
    print("=" * 60)
    print("Recommendations for student_1:")
    print("=" * 60)
    
    recs = recommender.recommend(context, n=5, explain=True)
    
    for i, rec in enumerate(recs, 1):
        print(f"\n{i}. {rec.activity_id}")
        print(f"   Score: {rec.score:.3f} (confidence: {rec.confidence:.2f})")
        print(f"   Skill: {rec.skill_id} (difficulty: {rec.difficulty})")
        print(f"   Duration: {rec.estimated_duration_minutes} min")
        print(f"   Reason: {rec.reason}")
        print(f"   Engagement prediction: {rec.engagement_prediction:.2f}")
    
    # Show stats
    print("\n" + "=" * 60)
    print("Recommender Stats:")
    print(json.dumps(recommender.get_stats(), indent=2))
