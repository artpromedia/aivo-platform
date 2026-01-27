"""
Content Recommender

Recommend content based on learner context using collaborative filtering
and content-based approaches.
"""
import logging
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Set, Tuple
import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class Recommendation:
    content_id: str
    title: str
    relevance_score: float
    reason: str


@dataclass
class LearnerProfile:
    """Represents a learner's profile for personalization."""
    learner_id: str
    grade_level: int = 5
    interests: List[str] = field(default_factory=list)
    completed_content: List[str] = field(default_factory=list)
    performance_scores: Dict[str, float] = field(default_factory=dict)
    preferences: Dict[str, any] = field(default_factory=dict)


@dataclass
class ContentItem:
    """Represents a content item in the catalog."""
    content_id: str
    title: str
    subject: str = ""
    topics: List[str] = field(default_factory=list)
    grade_level_min: int = 1
    grade_level_max: int = 12
    difficulty: float = 0.5
    embedding: Optional[np.ndarray] = None


class ContentRecommender:
    """
    Recommend content based on learner context using hybrid recommendation.

    Factors:
    - Learning history (collaborative filtering)
    - Content similarity (content-based)
    - Knowledge gaps
    - Interests
    - Learning objectives

    Usage:
        recommender = ContentRecommender()
        recs = recommender.recommend(learner_id="123", num=5)
    """

    def __init__(self, embedding_dim: int = 256):
        """
        Initialize the ContentRecommender.

        Args:
            embedding_dim: Dimension of content embeddings
        """
        self.embedding_dim = embedding_dim

        # In-memory stores (in production, these would be databases)
        self._content_catalog: Dict[str, ContentItem] = {}
        self._learner_profiles: Dict[str, LearnerProfile] = {}
        self._interaction_matrix: Dict[str, Dict[str, float]] = {}  # learner -> content -> score

        # Precomputed similarities
        self._content_similarity_cache: Dict[Tuple[str, str], float] = {}

        logger.info("ContentRecommender initialized")

    def add_content(self, content: ContentItem) -> None:
        """
        Add content item to the catalog.

        Args:
            content: ContentItem to add
        """
        self._content_catalog[content.content_id] = content
        # Invalidate similarity cache
        self._content_similarity_cache.clear()

    def add_learner(self, profile: LearnerProfile) -> None:
        """
        Add or update learner profile.

        Args:
            profile: LearnerProfile to add
        """
        self._learner_profiles[profile.learner_id] = profile

    def record_interaction(
        self,
        learner_id: str,
        content_id: str,
        score: float
    ) -> None:
        """
        Record a learner-content interaction for collaborative filtering.

        Args:
            learner_id: Learner identifier
            content_id: Content identifier
            score: Interaction score (0-1, e.g., completion rate, rating)
        """
        if learner_id not in self._interaction_matrix:
            self._interaction_matrix[learner_id] = {}
        self._interaction_matrix[learner_id][content_id] = score

    def _compute_content_similarity(
        self,
        content_a: ContentItem,
        content_b: ContentItem
    ) -> float:
        """
        Compute similarity between two content items.

        Uses embedding similarity if available, otherwise falls back to
        metadata-based similarity.
        """
        # Check cache
        cache_key = (content_a.content_id, content_b.content_id)
        if cache_key in self._content_similarity_cache:
            return self._content_similarity_cache[cache_key]

        similarity = 0.0

        # Embedding similarity (if available)
        if content_a.embedding is not None and content_b.embedding is not None:
            # Cosine similarity
            dot = np.dot(content_a.embedding, content_b.embedding)
            norm_a = np.linalg.norm(content_a.embedding)
            norm_b = np.linalg.norm(content_b.embedding)
            if norm_a > 0 and norm_b > 0:
                similarity = dot / (norm_a * norm_b)
        else:
            # Metadata-based similarity
            sim_components = []

            # Subject similarity
            if content_a.subject == content_b.subject:
                sim_components.append(0.4)

            # Topic overlap
            topics_a = set(t.lower() for t in content_a.topics)
            topics_b = set(t.lower() for t in content_b.topics)
            if topics_a and topics_b:
                jaccard = len(topics_a & topics_b) / len(topics_a | topics_b)
                sim_components.append(0.3 * jaccard)

            # Grade level overlap
            grade_overlap = max(0, min(content_a.grade_level_max, content_b.grade_level_max) -
                               max(content_a.grade_level_min, content_b.grade_level_min))
            grade_range = max(content_a.grade_level_max - content_a.grade_level_min,
                             content_b.grade_level_max - content_b.grade_level_min, 1)
            sim_components.append(0.2 * (grade_overlap / grade_range))

            # Difficulty similarity
            diff_sim = 1 - abs(content_a.difficulty - content_b.difficulty)
            sim_components.append(0.1 * diff_sim)

            similarity = sum(sim_components)

        # Cache and return
        self._content_similarity_cache[cache_key] = similarity
        self._content_similarity_cache[(content_b.content_id, content_a.content_id)] = similarity
        return similarity

    def _compute_learner_similarity(
        self,
        learner_a: str,
        learner_b: str
    ) -> float:
        """
        Compute similarity between two learners based on interaction patterns.
        """
        interactions_a = self._interaction_matrix.get(learner_a, {})
        interactions_b = self._interaction_matrix.get(learner_b, {})

        if not interactions_a or not interactions_b:
            return 0.0

        # Find common content
        common = set(interactions_a.keys()) & set(interactions_b.keys())
        if not common:
            return 0.0

        # Pearson correlation on common items
        scores_a = [interactions_a[c] for c in common]
        scores_b = [interactions_b[c] for c in common]

        mean_a = sum(scores_a) / len(scores_a)
        mean_b = sum(scores_b) / len(scores_b)

        numerator = sum((a - mean_a) * (b - mean_b) for a, b in zip(scores_a, scores_b))
        denom_a = sum((a - mean_a) ** 2 for a in scores_a) ** 0.5
        denom_b = sum((b - mean_b) ** 2 for b in scores_b) ** 0.5

        if denom_a == 0 or denom_b == 0:
            return 0.0

        return numerator / (denom_a * denom_b)

    def _collaborative_filter_scores(
        self,
        learner_id: str,
        candidate_ids: List[str],
        k_neighbors: int = 10
    ) -> Dict[str, float]:
        """
        Compute collaborative filtering scores for candidates.

        Uses user-based collaborative filtering.
        """
        if learner_id not in self._interaction_matrix:
            return {}

        learner_interactions = self._interaction_matrix[learner_id]

        # Find similar learners
        other_learners = [l for l in self._interaction_matrix.keys() if l != learner_id]
        if not other_learners:
            return {}

        similarities = []
        for other_id in other_learners:
            sim = self._compute_learner_similarity(learner_id, other_id)
            if sim > 0:
                similarities.append((other_id, sim))

        # Take top K neighbors
        similarities.sort(key=lambda x: x[1], reverse=True)
        neighbors = similarities[:k_neighbors]

        if not neighbors:
            return {}

        # Predict scores for candidates
        scores: Dict[str, float] = {}
        for content_id in candidate_ids:
            if content_id in learner_interactions:
                continue  # Skip already interacted content

            weighted_sum = 0.0
            sim_sum = 0.0

            for neighbor_id, sim in neighbors:
                neighbor_interactions = self._interaction_matrix.get(neighbor_id, {})
                if content_id in neighbor_interactions:
                    weighted_sum += sim * neighbor_interactions[content_id]
                    sim_sum += abs(sim)

            if sim_sum > 0:
                scores[content_id] = weighted_sum / sim_sum

        return scores

    def _content_based_scores(
        self,
        learner_id: str,
        candidate_ids: List[str]
    ) -> Dict[str, float]:
        """
        Compute content-based scores based on learner's history.
        """
        profile = self._learner_profiles.get(learner_id)
        if not profile:
            return {}

        # Get content the learner has completed
        completed = set(profile.completed_content)
        if not completed:
            return {}

        completed_items = [self._content_catalog[c] for c in completed
                         if c in self._content_catalog]

        if not completed_items:
            return {}

        # Score candidates by similarity to completed content
        scores: Dict[str, float] = {}
        for content_id in candidate_ids:
            if content_id in completed:
                continue

            content = self._content_catalog.get(content_id)
            if not content:
                continue

            # Average similarity to completed items
            similarities = [self._compute_content_similarity(content, c)
                          for c in completed_items]
            if similarities:
                scores[content_id] = sum(similarities) / len(similarities)

        return scores

    def _interest_based_scores(
        self,
        learner_id: str,
        candidate_ids: List[str]
    ) -> Dict[str, float]:
        """
        Compute scores based on learner interests.
        """
        profile = self._learner_profiles.get(learner_id)
        if not profile or not profile.interests:
            return {}

        interests = {i.lower() for i in profile.interests}

        scores: Dict[str, float] = {}
        for content_id in candidate_ids:
            content = self._content_catalog.get(content_id)
            if not content:
                continue

            # Check topic overlap with interests
            topics = {t.lower() for t in content.topics}
            if content.subject:
                topics.add(content.subject.lower())

            overlap = len(topics & interests)
            if overlap > 0:
                scores[content_id] = overlap / len(interests)

        return scores

    def _grade_level_filter(
        self,
        learner_id: str,
        candidate_ids: List[str]
    ) -> List[str]:
        """
        Filter candidates by grade level appropriateness.
        """
        profile = self._learner_profiles.get(learner_id)
        if not profile:
            return candidate_ids

        grade = profile.grade_level
        filtered = []

        for content_id in candidate_ids:
            content = self._content_catalog.get(content_id)
            if not content:
                continue

            # Allow 1 grade above/below for stretch
            if content.grade_level_min <= grade + 1 and content.grade_level_max >= grade - 1:
                filtered.append(content_id)

        return filtered

    def _generate_recommendation_reason(
        self,
        content: ContentItem,
        scores: Dict[str, float],
        profile: Optional[LearnerProfile]
    ) -> str:
        """Generate a human-readable recommendation reason."""
        reasons = []

        if "collaborative" in scores and scores["collaborative"] > 0.3:
            reasons.append("popular with similar learners")

        if "content_based" in scores and scores["content_based"] > 0.3:
            reasons.append("similar to content you've enjoyed")

        if "interest" in scores and scores["interest"] > 0.3:
            reasons.append("matches your interests")

        if profile:
            if content.grade_level_min <= profile.grade_level <= content.grade_level_max:
                reasons.append("appropriate for your level")
            elif content.grade_level_min > profile.grade_level:
                reasons.append("a challenging next step")

        if content.topics:
            reasons.append(f"covers {', '.join(content.topics[:2])}")

        if reasons:
            return "Recommended because: " + "; ".join(reasons[:3])
        return "Recommended based on your learning profile"

    def recommend(
        self,
        learner_id: str,
        num_recommendations: int = 5,
        content_type: Optional[str] = None,
    ) -> List[Recommendation]:
        """
        Recommend content for a learner using hybrid approach.

        Args:
            learner_id: Learner identifier
            num_recommendations: Number of recommendations to return
            content_type: Optional filter by content type

        Returns:
            List of Recommendation objects
        """
        profile = self._learner_profiles.get(learner_id)

        # Get candidate content IDs
        candidates = list(self._content_catalog.keys())

        # Filter by grade level if profile exists
        if profile:
            candidates = self._grade_level_filter(learner_id, candidates)

            # Exclude already completed
            completed = set(profile.completed_content)
            candidates = [c for c in candidates if c not in completed]

        if not candidates:
            logger.warning(f"No candidate content for learner {learner_id}")
            return []

        # Compute scores from different sources
        cf_scores = self._collaborative_filter_scores(learner_id, candidates)
        cb_scores = self._content_based_scores(learner_id, candidates)
        interest_scores = self._interest_based_scores(learner_id, candidates)

        # Combine scores (hybrid approach)
        combined_scores: Dict[str, Dict[str, float]] = {}

        for content_id in candidates:
            scores = {
                "collaborative": cf_scores.get(content_id, 0.0),
                "content_based": cb_scores.get(content_id, 0.0),
                "interest": interest_scores.get(content_id, 0.0)
            }

            # Weighted combination
            combined = (
                0.4 * scores["collaborative"] +
                0.35 * scores["content_based"] +
                0.25 * scores["interest"]
            )

            combined_scores[content_id] = {"combined": combined, **scores}

        # Sort by combined score
        sorted_candidates = sorted(
            combined_scores.keys(),
            key=lambda c: combined_scores[c]["combined"],
            reverse=True
        )

        # Build recommendations
        recommendations = []
        for content_id in sorted_candidates[:num_recommendations]:
            content = self._content_catalog.get(content_id)
            if not content:
                continue

            scores = combined_scores[content_id]
            reason = self._generate_recommendation_reason(content, scores, profile)

            recommendations.append(Recommendation(
                content_id=content_id,
                title=content.title,
                relevance_score=round(scores["combined"], 3),
                reason=reason
            ))

        return recommendations

    def recommend_next(
        self,
        current_content_id: str,
        learner_id: str,
    ) -> Optional[Recommendation]:
        """
        Recommend the next content item to learn after completing current.

        Args:
            current_content_id: Currently completed content ID
            learner_id: Learner identifier

        Returns:
            Single Recommendation for next content
        """
        current = self._content_catalog.get(current_content_id)
        if not current:
            return None

        profile = self._learner_profiles.get(learner_id)

        # Find similar content at same or slightly higher level
        candidates = []
        for content_id, content in self._content_catalog.items():
            if content_id == current_content_id:
                continue

            # Same or related subject
            if content.subject != current.subject:
                continue

            # Progressive difficulty
            if content.difficulty < current.difficulty - 0.1:
                continue

            # Check if already completed
            if profile and content_id in profile.completed_content:
                continue

            similarity = self._compute_content_similarity(current, content)
            progression_bonus = 0.1 if content.difficulty > current.difficulty else 0.0

            candidates.append((content_id, similarity + progression_bonus))

        if not candidates:
            return None

        # Sort by score
        candidates.sort(key=lambda x: x[1], reverse=True)
        best_id, best_score = candidates[0]
        best_content = self._content_catalog[best_id]

        return Recommendation(
            content_id=best_id,
            title=best_content.title,
            relevance_score=round(best_score, 3),
            reason=f"Recommended as next step after '{current.title}'"
        )

    def find_similar(
        self,
        content_id: str,
        top_k: int = 10,
    ) -> List[Recommendation]:
        """
        Find content similar to a given item.

        Args:
            content_id: Content ID to find similar items for
            top_k: Number of similar items to return

        Returns:
            List of Recommendation objects for similar content
        """
        target = self._content_catalog.get(content_id)
        if not target:
            return []

        similarities = []
        for other_id, other in self._content_catalog.items():
            if other_id == content_id:
                continue

            sim = self._compute_content_similarity(target, other)
            similarities.append((other_id, other, sim))

        # Sort by similarity
        similarities.sort(key=lambda x: x[2], reverse=True)

        recommendations = []
        for other_id, other, sim in similarities[:top_k]:
            recommendations.append(Recommendation(
                content_id=other_id,
                title=other.title,
                relevance_score=round(sim, 3),
                reason=f"Similar to '{target.title}'"
            ))

        return recommendations

    def rank_recommendations(
        self,
        recommendations: List[Recommendation],
        learner_id: str,
        criteria: Dict[str, float] = None
    ) -> List[Recommendation]:
        """
        Re-rank recommendations based on additional criteria.

        Args:
            recommendations: List of recommendations to rank
            learner_id: Learner identifier for personalization
            criteria: Optional weighting criteria (e.g., {"recency": 0.3, "difficulty": 0.2})

        Returns:
            Re-ranked list of recommendations
        """
        if not recommendations:
            return []

        if criteria is None:
            criteria = {"relevance": 1.0}

        profile = self._learner_profiles.get(learner_id)

        ranked = []
        for rec in recommendations:
            content = self._content_catalog.get(rec.content_id)
            score = rec.relevance_score * criteria.get("relevance", 1.0)

            if content and profile:
                # Difficulty matching bonus
                if "difficulty" in criteria:
                    # Prefer content slightly above current ability
                    target_diff = 0.5 + 0.05 * (profile.grade_level - 5)
                    diff_match = 1 - abs(content.difficulty - target_diff)
                    score += criteria["difficulty"] * diff_match

                # Knowledge gap bonus
                if "knowledge_gap" in criteria and profile.performance_scores:
                    # Prioritize areas where learner scored lower
                    for topic in content.topics:
                        if topic in profile.performance_scores:
                            gap = 1 - profile.performance_scores[topic]
                            score += criteria["knowledge_gap"] * gap * 0.2

            ranked.append((rec, score))

        # Sort by new score
        ranked.sort(key=lambda x: x[1], reverse=True)

        return [rec for rec, _ in ranked]

    def personalize_recommendations(
        self,
        recommendations: List[Recommendation],
        profile: LearnerProfile,
    ) -> List[Recommendation]:
        """
        Personalize recommendations based on learner profile.

        Args:
            recommendations: Base recommendations to personalize
            profile: Learner profile for personalization

        Returns:
            Personalized list of recommendations
        """
        if not recommendations or not profile:
            return recommendations

        personalized = []

        for rec in recommendations:
            content = self._content_catalog.get(rec.content_id)
            if not content:
                personalized.append(rec)
                continue

            # Adjust score based on profile
            adjustment = 0.0

            # Interest match
            interests = {i.lower() for i in profile.interests}
            topics = {t.lower() for t in content.topics}
            if interests & topics:
                adjustment += 0.1

            # Learning style preferences
            if "preferred_difficulty" in profile.preferences:
                pref_diff = profile.preferences["preferred_difficulty"]
                if abs(content.difficulty - pref_diff) < 0.2:
                    adjustment += 0.05

            # Create personalized recommendation
            new_score = min(rec.relevance_score + adjustment, 1.0)
            personalized.append(Recommendation(
                content_id=rec.content_id,
                title=rec.title,
                relevance_score=round(new_score, 3),
                reason=rec.reason
            ))

        # Re-sort by adjusted scores
        personalized.sort(key=lambda r: r.relevance_score, reverse=True)

        return personalized

    def get_catalog_size(self) -> int:
        """Get number of items in content catalog."""
        return len(self._content_catalog)

    def get_learner_count(self) -> int:
        """Get number of learner profiles."""
        return len(self._learner_profiles)

    def get_content_coverage(self, learner_id: str) -> Dict:
        """
        Get statistics on content coverage for a learner.

        Args:
            learner_id: Learner identifier

        Returns:
            Dictionary with coverage statistics
        """
        profile = self._learner_profiles.get(learner_id)
        if not profile:
            return {"completed": 0, "total": len(self._content_catalog), "coverage": 0.0}

        completed = len(profile.completed_content)
        total = len(self._content_catalog)

        return {
            "completed": completed,
            "total": total,
            "coverage": round(completed / max(total, 1), 3)
        }
