"""
Recommendation Engine - Core ML recommendation logic.
"""

import math
import random
from datetime import datetime
from typing import Any

import numpy as np
import structlog
from scipy.spatial.distance import cosine

from src.config import Settings
from src.models import (
    FeedbackType,
    RecommendationFeedback,
    RecommendationRequest,
    RecommendationResponse,
    RecommendationType,
    RecommendedItem,
    SkillMastery,
)
from src.services.feature_store import FeatureStore

logger = structlog.get_logger()


class RecommendationEngine:
    """
    Hybrid recommendation engine combining multiple strategies:
    
    1. Collaborative Filtering - User-based and item-based
    2. Content-Based Filtering - Skill/topic similarity
    3. Knowledge Tracing - BKT-enhanced recommendations
    4. Multi-Armed Bandit - Exploration vs exploitation
    """

    def __init__(self, feature_store: FeatureStore, settings: Settings) -> None:
        self.feature_store = feature_store
        self.settings = settings
        
        # Model weights
        self.collaborative_weight = settings.collaborative_weight
        self.content_weight = settings.content_based_weight
        self.kt_weight = settings.knowledge_tracing_weight
        
        # Bandit settings
        self.epsilon = settings.epsilon
        self.ucb_c = settings.ucb_c

    async def get_recommendations(
        self, request: RecommendationRequest
    ) -> RecommendationResponse:
        """
        Generate recommendations using hybrid approach.
        """
        learner_id = request.learner.learner_id
        
        # Get candidate items
        candidates = await self._get_candidates(request)
        
        if not candidates:
            return RecommendationResponse(
                learner_id=learner_id,
                recommendation_type=request.recommendation_type,
                items=[],
                processing_time_ms=0,
            )
        
        # Score each candidate using hybrid approach
        scored_items: list[RecommendedItem] = []
        
        for candidate in candidates:
            if candidate["id"] in request.exclude_ids:
                continue
                
            scores = await self._compute_scores(
                request, candidate, request.skill_masteries
            )
            
            # Combine scores with weights
            final_score = (
                self.collaborative_weight * scores["collaborative"]
                + self.content_weight * scores["content"]
                + self.kt_weight * scores["knowledge_tracing"]
            )
            
            # Apply exploration bonus using UCB
            exploration_bonus = await self._compute_exploration_bonus(candidate["id"])
            final_score += exploration_bonus
            
            # Apply diversity penalty for similar items
            final_score = self._apply_diversity(final_score, scored_items, candidate)
            
            scored_items.append(
                RecommendedItem(
                    item_id=candidate["id"],
                    item_type=candidate.get("type", "activity"),
                    score=min(1.0, max(0.0, final_score)),
                    confidence=scores.get("confidence", 0.5),
                    reason=self._generate_reason(scores, candidate),
                    metadata=candidate.get("metadata", {}),
                    collaborative_score=scores["collaborative"],
                    content_score=scores["content"],
                    knowledge_tracing_score=scores["knowledge_tracing"],
                    exploration_bonus=exploration_bonus,
                )
            )
        
        # Sort by score and take top N
        scored_items.sort(key=lambda x: x.score, reverse=True)
        top_items = scored_items[: request.limit]
        
        # Epsilon-greedy exploration
        if random.random() < self.epsilon and len(scored_items) > request.limit:
            # Replace one item with a random unexplored item
            explore_idx = random.randint(0, len(top_items) - 1)
            random_item = random.choice(scored_items[request.limit:])
            top_items[explore_idx] = random_item
        
        return RecommendationResponse(
            learner_id=learner_id,
            recommendation_type=request.recommendation_type,
            items=top_items,
            processing_time_ms=0,  # Set by caller
        )

    async def _get_candidates(
        self, request: RecommendationRequest
    ) -> list[dict[str, Any]]:
        """
        Get candidate items for recommendation.
        
        In production, this would query from database/search index.
        For now, returns mock candidates.
        """
        # TODO: Implement actual candidate retrieval from database
        # This would typically:
        # 1. Query content service for available activities
        # 2. Filter by domain, difficulty, prerequisites
        # 3. Apply business rules (e.g., not recently seen)
        
        candidates: list[dict[str, Any]] = []
        
        # Generate mock candidates for demonstration
        domains = ["MATH", "ELA", "SCIENCE"]
        domain_filter = request.domain_filter
        
        for i in range(50):
            domain = domains[i % len(domains)]
            if domain_filter and domain != domain_filter:
                continue
                
            difficulty = 0.3 + (i % 10) * 0.07
            
            candidates.append({
                "id": f"activity_{i:03d}",
                "type": "activity",
                "domain": domain,
                "difficulty": difficulty,
                "skill_ids": [f"skill_{(i % 20):03d}"],
                "metadata": {
                    "title": f"Activity {i}",
                    "estimated_duration": 10 + (i % 20),
                },
            })
        
        return candidates

    async def _compute_scores(
        self,
        request: RecommendationRequest,
        candidate: dict[str, Any],
        skill_masteries: list[SkillMastery],
    ) -> dict[str, float]:
        """
        Compute component scores for a candidate item.
        """
        scores: dict[str, float] = {
            "collaborative": 0.5,
            "content": 0.5,
            "knowledge_tracing": 0.5,
            "confidence": 0.5,
        }
        
        # Collaborative filtering score
        scores["collaborative"] = await self._collaborative_score(
            request.learner.learner_id, candidate["id"]
        )
        
        # Content-based score
        scores["content"] = self._content_score(
            request, candidate, skill_masteries
        )
        
        # Knowledge tracing score
        scores["knowledge_tracing"] = self._knowledge_tracing_score(
            candidate, skill_masteries
        )
        
        # Compute confidence based on data availability
        scores["confidence"] = self._compute_confidence(
            request.learner.learner_id, candidate, skill_masteries
        )
        
        return scores

    async def _collaborative_score(
        self, learner_id: str, item_id: str
    ) -> float:
        """
        Compute collaborative filtering score.
        
        Uses user-based CF: find similar learners and predict rating
        based on their interactions with the item.
        """
        # Get similar learners
        similar_learners = await self.feature_store.get_similar_learners(learner_id)
        
        if not similar_learners:
            return 0.5  # Neutral score when no data
        
        # Get learner embedding
        learner_embedding = await self.feature_store.get_learner_embedding(learner_id)
        item_embedding = await self.feature_store.get_item_embedding(item_id)
        
        if learner_embedding and item_embedding:
            # Compute cosine similarity
            try:
                similarity = 1 - cosine(learner_embedding, item_embedding)
                return float(np.clip(similarity, 0, 1))
            except (ValueError, ZeroDivisionError):
                return 0.5
        
        return 0.5

    def _content_score(
        self,
        request: RecommendationRequest,
        candidate: dict[str, Any],
        skill_masteries: list[SkillMastery],
    ) -> float:
        """
        Compute content-based filtering score.
        
        Considers:
        - Difficulty appropriateness for learner level
        - Skill relevance
        - Neurodiverse accommodations
        """
        score = 0.5
        
        # Difficulty matching
        difficulty = candidate.get("difficulty", 0.5)
        
        # Compute average mastery
        if skill_masteries:
            avg_mastery = sum(s.mastery_level for s in skill_masteries) / len(skill_masteries)
        else:
            avg_mastery = 0.5
        
        # Ideal difficulty is slightly above current mastery (zone of proximal development)
        ideal_difficulty = avg_mastery + 0.1
        difficulty_match = 1 - abs(difficulty - ideal_difficulty)
        score = 0.3 + 0.7 * difficulty_match
        
        # Skill relevance
        candidate_skills = set(candidate.get("skill_ids", []))
        if skill_masteries:
            # Boost items targeting low-mastery skills
            low_mastery_skills = {
                s.skill_id for s in skill_masteries if s.mastery_level < 0.7
            }
            overlap = candidate_skills & low_mastery_skills
            if overlap:
                score += 0.2 * len(overlap) / max(len(candidate_skills), 1)
        
        # Neurodiverse accommodations
        if request.learner.neurodiverse_profile:
            # Boost items with appropriate accommodations
            # This is simplified - real implementation would check item metadata
            score += 0.1
        
        return min(1.0, max(0.0, score))

    def _knowledge_tracing_score(
        self,
        candidate: dict[str, Any],
        skill_masteries: list[SkillMastery],
    ) -> float:
        """
        Compute knowledge tracing-based score.
        
        Prioritizes items that:
        - Target skills with low but non-zero mastery (learning zone)
        - Have appropriate prerequisite mastery
        - Maximize expected learning gain
        """
        if not skill_masteries:
            return 0.5
        
        candidate_skills = set(candidate.get("skill_ids", []))
        mastery_map = {s.skill_id: s for s in skill_masteries}
        
        total_score = 0.0
        skill_count = 0
        
        for skill_id in candidate_skills:
            mastery = mastery_map.get(skill_id)
            
            if mastery:
                # Score based on learning potential
                # Highest score for skills with mastery 0.3-0.7 (learning zone)
                m = mastery.mastery_level
                if m < 0.3:
                    skill_score = 0.3 + m  # Low but increasing
                elif m < 0.7:
                    skill_score = 0.8 + 0.2 * (1 - abs(0.5 - m) / 0.2)  # Peak at 0.5
                else:
                    skill_score = 0.6 - (m - 0.7) * 2  # Decreasing for mastered skills
                
                # Boost based on BKT p_know if available
                if mastery.bkt_p_know is not None:
                    learning_rate = mastery.bkt_p_know
                    skill_score *= (0.5 + 0.5 * learning_rate)
                
                total_score += max(0, skill_score)
                skill_count += 1
            else:
                # New skill - moderate priority
                total_score += 0.5
                skill_count += 1
        
        if skill_count == 0:
            return 0.5
        
        return min(1.0, total_score / skill_count)

    async def _compute_exploration_bonus(self, item_id: str) -> float:
        """
        Compute UCB exploration bonus for an item.
        
        Uses Upper Confidence Bound to balance exploration/exploitation.
        """
        stats = await self.feature_store.get_bandit_stats(item_id)
        
        if not stats or stats["pulls"] == 0:
            # Never shown - high exploration bonus
            return self.ucb_c
        
        pulls = stats["pulls"]
        mean_reward = stats["mean_reward"]
        
        # UCB formula: mean + c * sqrt(ln(total) / pulls)
        # Approximate total with pulls * 10 for now
        total = pulls * 10
        bonus = self.ucb_c * math.sqrt(math.log(total + 1) / (pulls + 1))
        
        return min(0.3, bonus)  # Cap exploration bonus

    def _apply_diversity(
        self,
        score: float,
        already_selected: list[RecommendedItem],
        candidate: dict[str, Any],
    ) -> float:
        """
        Apply diversity penalty to avoid recommending too similar items.
        """
        if not already_selected:
            return score
        
        candidate_skills = set(candidate.get("skill_ids", []))
        
        max_overlap = 0.0
        for item in already_selected[-5:]:  # Check last 5 items
            item_skills = set(item.metadata.get("skill_ids", []))
            if candidate_skills and item_skills:
                overlap = len(candidate_skills & item_skills) / len(candidate_skills | item_skills)
                max_overlap = max(max_overlap, overlap)
        
        # Apply penalty for high overlap
        diversity_penalty = max_overlap * self.settings.diversity_factor
        return score - diversity_penalty

    def _compute_confidence(
        self,
        learner_id: str,
        candidate: dict[str, Any],
        skill_masteries: list[SkillMastery],
    ) -> float:
        """
        Compute confidence in the recommendation.
        """
        confidence = 0.5
        
        # Higher confidence with more skill mastery data
        if skill_masteries:
            data_points = sum(s.practice_count for s in skill_masteries)
            confidence += min(0.3, data_points / 100)
        
        return min(1.0, confidence)

    def _generate_reason(
        self,
        scores: dict[str, float],
        candidate: dict[str, Any],
    ) -> str:
        """
        Generate human-readable reason for recommendation.
        """
        reasons = []
        
        if scores["knowledge_tracing"] > 0.7:
            reasons.append("targets skills you're currently learning")
        
        if scores["collaborative"] > 0.7:
            reasons.append("popular with similar learners")
        
        if scores["content"] > 0.7:
            reasons.append("matches your current level")
        
        if not reasons:
            reasons.append("recommended for your learning goals")
        
        return "; ".join(reasons).capitalize()

    async def process_feedback(
        self, feedback: RecommendationFeedback
    ) -> None:
        """
        Process recommendation feedback to improve future recommendations.
        """
        # Convert feedback to reward signal
        reward = self._feedback_to_reward(feedback)
        
        # Update bandit statistics
        await self.feature_store.update_bandit_stats(feedback.item_id, reward)
        
        # Record interaction
        await self.feature_store.add_interaction(
            learner_id=feedback.learner_id,
            item_id=feedback.item_id,
            interaction_type=feedback.feedback_type.value,
            score=reward,
        )
        
        logger.info(
            "Processed feedback",
            learner_id=feedback.learner_id,
            item_id=feedback.item_id,
            reward=reward,
        )

    def _feedback_to_reward(self, feedback: RecommendationFeedback) -> float:
        """
        Convert feedback to a reward signal for bandit learning.
        """
        rewards = {
            FeedbackType.COMPLETED: 1.0,
            FeedbackType.CLICKED: 0.3,
            FeedbackType.RATED: feedback.rating / 5.0 if feedback.rating else 0.5,
            FeedbackType.SKIPPED: 0.0,
        }
        
        base_reward = rewards.get(feedback.feedback_type, 0.5)
        
        # Adjust based on time spent
        if feedback.time_spent_seconds:
            # Longer engagement is better (up to a point)
            time_bonus = min(0.2, feedback.time_spent_seconds / 600)
            base_reward += time_bonus
        
        return min(1.0, base_reward)
