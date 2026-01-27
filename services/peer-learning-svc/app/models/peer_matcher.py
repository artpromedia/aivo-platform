"""
Peer Matcher

Match learners for peer learning activities using compatibility scoring
and knowledge differential analysis.
"""
import logging
import uuid
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class PeerMatch:
    """Represents a peer match result."""
    learner_id: str
    matched_peer_id: str
    compatibility_score: float
    match_reasons: List[str]


@dataclass
class LearnerProfile:
    """Internal representation of a learner profile."""
    learner_id: str
    knowledge_state: Dict[str, float] = field(default_factory=dict)
    learning_style: Optional[str] = None
    availability: List[str] = field(default_factory=list)
    preferences: Dict[str, any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, data: Dict) -> "LearnerProfile":
        """Create LearnerProfile from dictionary."""
        return cls(
            learner_id=data.get("learner_id", str(uuid.uuid4())),
            knowledge_state=data.get("knowledge_state", {}),
            learning_style=data.get("learning_style"),
            availability=data.get("availability", []),
            preferences=data.get("preferences", {}),
        )


class PeerMatcher:
    """
    Match learners for peer learning.

    Match types:
    - Study partner (similar level)
    - Peer tutor (complementary knowledge)
    - Discussion partner (diverse perspectives)

    Usage:
        matcher = PeerMatcher()
        match = matcher.find_match(learner_profile, role="study_partner")
    """

    # Weight configurations for different match roles
    ROLE_WEIGHTS = {
        "study_partner": {
            "knowledge_similarity": 0.4,
            "learning_style_match": 0.2,
            "availability_overlap": 0.25,
            "preference_alignment": 0.15,
        },
        "peer_tutor": {
            "knowledge_differential": 0.5,
            "learning_style_match": 0.15,
            "availability_overlap": 0.25,
            "preference_alignment": 0.1,
        },
        "discussion_partner": {
            "knowledge_diversity": 0.35,
            "learning_style_match": 0.15,
            "availability_overlap": 0.3,
            "preference_alignment": 0.2,
        },
    }

    # Learning style compatibility matrix
    STYLE_COMPATIBILITY = {
        ("visual", "visual"): 1.0,
        ("visual", "auditory"): 0.6,
        ("visual", "kinesthetic"): 0.7,
        ("visual", "reading"): 0.8,
        ("auditory", "auditory"): 1.0,
        ("auditory", "kinesthetic"): 0.6,
        ("auditory", "reading"): 0.7,
        ("kinesthetic", "kinesthetic"): 1.0,
        ("kinesthetic", "reading"): 0.5,
        ("reading", "reading"): 1.0,
    }

    def __init__(self, candidate_pool: Optional[List[Dict]] = None):
        """
        Initialize PeerMatcher.

        Args:
            candidate_pool: Optional default pool of candidate learners
        """
        self.candidate_pool = candidate_pool or []
        logger.info("PeerMatcher initialized with %d candidates in pool", len(self.candidate_pool))

    def set_candidate_pool(self, candidates: List[Dict]) -> None:
        """Update the candidate pool."""
        self.candidate_pool = candidates
        logger.info("Updated candidate pool to %d candidates", len(candidates))

    def find_match(
        self,
        learner_profile: Dict,
        role: str = "study_partner",
        candidates: Optional[List[Dict]] = None,
    ) -> PeerMatch:
        """
        Find best peer match for a learner.

        Args:
            learner_profile: Profile of the learner seeking a match
            role: Type of match - "study_partner", "peer_tutor", or "discussion_partner"
            candidates: Optional list of candidate profiles (uses pool if not provided)

        Returns:
            PeerMatch with the best matching peer

        Raises:
            ValueError: If no candidates available or invalid role
        """
        if role not in self.ROLE_WEIGHTS:
            raise ValueError(f"Invalid role: {role}. Must be one of {list(self.ROLE_WEIGHTS.keys())}")

        candidate_list = candidates if candidates is not None else self.candidate_pool

        if not candidate_list:
            logger.warning("No candidates available for matching")
            raise ValueError("No candidates available for matching")

        learner = LearnerProfile.from_dict(learner_profile)

        # Filter out the learner themselves from candidates
        valid_candidates = [
            c for c in candidate_list
            if c.get("learner_id") != learner.learner_id
        ]

        if not valid_candidates:
            raise ValueError("No valid candidates available after filtering")

        best_match = None
        best_score = -1.0
        best_reasons = []

        for candidate_data in valid_candidates:
            candidate = LearnerProfile.from_dict(candidate_data)
            score, reasons = self._compute_match_score(learner, candidate, role)

            if score > best_score:
                best_score = score
                best_match = candidate
                best_reasons = reasons

        logger.info(
            "Found match for learner %s: peer %s with score %.3f",
            learner.learner_id, best_match.learner_id, best_score
        )

        return PeerMatch(
            learner_id=learner.learner_id,
            matched_peer_id=best_match.learner_id,
            compatibility_score=best_score,
            match_reasons=best_reasons,
        )

    def find_tutor(
        self,
        learner_profile: Dict,
        topic: str,
        candidates: Optional[List[Dict]] = None,
    ) -> PeerMatch:
        """
        Find peer tutor for a specific topic.

        The ideal tutor has higher knowledge in the topic but not so high
        that there's a large gap (zone of proximal development).

        Args:
            learner_profile: Profile of the learner seeking a tutor
            topic: The topic for which tutoring is needed
            candidates: Optional list of candidate tutors

        Returns:
            PeerMatch with the best tutoring peer
        """
        candidate_list = candidates if candidates is not None else self.candidate_pool

        if not candidate_list:
            raise ValueError("No candidates available for tutor matching")

        learner = LearnerProfile.from_dict(learner_profile)
        learner_knowledge = learner.knowledge_state.get(topic, 0.0)

        # Filter candidates who have higher knowledge in the topic
        valid_candidates = [
            c for c in candidate_list
            if c.get("learner_id") != learner.learner_id
            and c.get("knowledge_state", {}).get(topic, 0.0) > learner_knowledge
        ]

        if not valid_candidates:
            logger.warning("No candidates with higher knowledge in topic '%s'", topic)
            # Fall back to finding best general match
            return self.find_match(learner_profile, role="peer_tutor", candidates=candidates)

        best_tutor = None
        best_score = -1.0
        best_reasons = []

        for candidate_data in valid_candidates:
            candidate = LearnerProfile.from_dict(candidate_data)
            candidate_knowledge = candidate.knowledge_state.get(topic, 0.0)

            # Calculate knowledge differential score
            # Optimal differential is 0.2-0.4 (proximal development zone)
            differential = candidate_knowledge - learner_knowledge

            # Score peaks at differential of 0.3, decreases for larger gaps
            differential_score = self._compute_differential_score(differential)

            # Also consider availability and style compatibility
            availability_score = self._compute_availability_overlap(
                learner.availability, candidate.availability
            )
            style_score = self._compute_style_compatibility(
                learner.learning_style, candidate.learning_style
            )

            # Weighted combination
            total_score = (
                0.5 * differential_score +
                0.3 * availability_score +
                0.2 * style_score
            )

            reasons = []
            if differential_score > 0.7:
                reasons.append(f"Optimal knowledge gap in {topic}")
            if availability_score > 0.5:
                reasons.append("Good schedule overlap")
            if style_score > 0.7:
                reasons.append("Compatible learning styles")

            if total_score > best_score:
                best_score = total_score
                best_tutor = candidate
                best_reasons = reasons

        if not best_reasons:
            best_reasons = [f"Best available tutor for {topic}"]

        logger.info(
            "Found tutor for learner %s on topic '%s': peer %s with score %.3f",
            learner.learner_id, topic, best_tutor.learner_id, best_score
        )

        return PeerMatch(
            learner_id=learner.learner_id,
            matched_peer_id=best_tutor.learner_id,
            compatibility_score=best_score,
            match_reasons=best_reasons,
        )

    def compute_compatibility(
        self,
        profile_a: Dict,
        profile_b: Dict,
        role: str = "study_partner",
    ) -> float:
        """
        Compute compatibility score between two learners.

        Args:
            profile_a: First learner's profile
            profile_b: Second learner's profile
            role: Context for compatibility calculation

        Returns:
            Compatibility score between 0.0 and 1.0
        """
        if role not in self.ROLE_WEIGHTS:
            role = "study_partner"

        learner_a = LearnerProfile.from_dict(profile_a)
        learner_b = LearnerProfile.from_dict(profile_b)

        score, _ = self._compute_match_score(learner_a, learner_b, role)
        return score

    def _compute_match_score(
        self,
        learner: LearnerProfile,
        candidate: LearnerProfile,
        role: str,
    ) -> Tuple[float, List[str]]:
        """
        Compute detailed match score with reasons.

        Returns:
            Tuple of (score, list of match reasons)
        """
        weights = self.ROLE_WEIGHTS[role]
        reasons = []

        # Knowledge-based scoring
        if role == "study_partner":
            knowledge_score = self._compute_knowledge_similarity(
                learner.knowledge_state, candidate.knowledge_state
            )
            if knowledge_score > 0.7:
                reasons.append("Similar knowledge levels")
        elif role == "peer_tutor":
            knowledge_score = self._compute_knowledge_differential_score(
                learner.knowledge_state, candidate.knowledge_state
            )
            if knowledge_score > 0.7:
                reasons.append("Complementary knowledge for tutoring")
        else:  # discussion_partner
            knowledge_score = self._compute_knowledge_diversity(
                learner.knowledge_state, candidate.knowledge_state
            )
            if knowledge_score > 0.7:
                reasons.append("Diverse knowledge for rich discussions")

        # Learning style compatibility
        style_score = self._compute_style_compatibility(
            learner.learning_style, candidate.learning_style
        )
        if style_score > 0.7:
            reasons.append("Compatible learning styles")

        # Availability overlap
        availability_score = self._compute_availability_overlap(
            learner.availability, candidate.availability
        )
        if availability_score > 0.5:
            reasons.append("Good schedule overlap")

        # Preference alignment
        preference_score = self._compute_preference_alignment(
            learner.preferences, candidate.preferences
        )
        if preference_score > 0.6:
            reasons.append("Aligned study preferences")

        # Weighted combination based on role
        if role == "study_partner":
            total_score = (
                weights["knowledge_similarity"] * knowledge_score +
                weights["learning_style_match"] * style_score +
                weights["availability_overlap"] * availability_score +
                weights["preference_alignment"] * preference_score
            )
        elif role == "peer_tutor":
            total_score = (
                weights["knowledge_differential"] * knowledge_score +
                weights["learning_style_match"] * style_score +
                weights["availability_overlap"] * availability_score +
                weights["preference_alignment"] * preference_score
            )
        else:  # discussion_partner
            total_score = (
                weights["knowledge_diversity"] * knowledge_score +
                weights["learning_style_match"] * style_score +
                weights["availability_overlap"] * availability_score +
                weights["preference_alignment"] * preference_score
            )

        return total_score, reasons

    def _compute_knowledge_similarity(
        self,
        knowledge_a: Dict[str, float],
        knowledge_b: Dict[str, float],
    ) -> float:
        """Compute similarity between knowledge states using cosine similarity."""
        if not knowledge_a or not knowledge_b:
            return 0.5  # Default to neutral if no knowledge data

        # Get union of all topics
        all_topics = set(knowledge_a.keys()) | set(knowledge_b.keys())

        # Create vectors
        vec_a = np.array([knowledge_a.get(t, 0.0) for t in all_topics])
        vec_b = np.array([knowledge_b.get(t, 0.0) for t in all_topics])

        # Cosine similarity
        norm_a = np.linalg.norm(vec_a)
        norm_b = np.linalg.norm(vec_b)

        if norm_a == 0 or norm_b == 0:
            return 0.5

        similarity = np.dot(vec_a, vec_b) / (norm_a * norm_b)

        # Also consider level similarity (not just direction)
        level_diff = np.abs(np.mean(vec_a) - np.mean(vec_b))
        level_similarity = 1.0 - min(level_diff, 1.0)

        # Combine direction and level similarity
        return 0.6 * similarity + 0.4 * level_similarity

    def _compute_knowledge_differential_score(
        self,
        learner_knowledge: Dict[str, float],
        tutor_knowledge: Dict[str, float],
    ) -> float:
        """Compute score based on knowledge differential for tutoring."""
        if not learner_knowledge or not tutor_knowledge:
            return 0.5

        all_topics = set(learner_knowledge.keys()) | set(tutor_knowledge.keys())

        differentials = []
        for topic in all_topics:
            learner_level = learner_knowledge.get(topic, 0.0)
            tutor_level = tutor_knowledge.get(topic, 0.0)
            diff = tutor_level - learner_level
            # Positive differential is good (tutor knows more)
            differentials.append(max(0, diff))

        if not differentials:
            return 0.5

        avg_differential = np.mean(differentials)
        # Optimal differential is around 0.3 (proximal development zone)
        return self._compute_differential_score(avg_differential)

    def _compute_differential_score(self, differential: float) -> float:
        """Convert knowledge differential to score (optimal around 0.3)."""
        if differential <= 0:
            return 0.1  # Candidate not more knowledgeable
        elif differential <= 0.2:
            return 0.5 + (differential / 0.2) * 0.4  # Ramping up
        elif differential <= 0.4:
            return 0.9 + (0.4 - differential) / 0.2 * 0.1  # Peak zone
        elif differential <= 0.6:
            return 0.7 - (differential - 0.4) / 0.2 * 0.2  # Declining
        else:
            return max(0.3, 0.5 - (differential - 0.6))  # Too large a gap

    def _compute_knowledge_diversity(
        self,
        knowledge_a: Dict[str, float],
        knowledge_b: Dict[str, float],
    ) -> float:
        """Compute diversity score for discussion partners."""
        if not knowledge_a or not knowledge_b:
            return 0.5

        # High diversity = different topics or different levels
        topics_a = set(knowledge_a.keys())
        topics_b = set(knowledge_b.keys())

        # Topic diversity
        union = topics_a | topics_b
        intersection = topics_a & topics_b

        if not union:
            return 0.5

        jaccard_distance = 1.0 - len(intersection) / len(union)

        # Level diversity in shared topics
        level_diversity = 0.0
        if intersection:
            diffs = [abs(knowledge_a[t] - knowledge_b[t]) for t in intersection]
            level_diversity = np.mean(diffs)

        # Combine: some overlap but with diverse perspectives
        # Too much diversity (no overlap) is bad for discussion
        overlap_penalty = 0.0 if len(intersection) >= 2 else 0.2

        return 0.5 * (1 - jaccard_distance) + 0.5 * level_diversity - overlap_penalty

    def _compute_style_compatibility(
        self,
        style_a: Optional[str],
        style_b: Optional[str],
    ) -> float:
        """Compute learning style compatibility."""
        if not style_a or not style_b:
            return 0.5  # Unknown styles, neutral compatibility

        style_a = style_a.lower()
        style_b = style_b.lower()

        # Check direct match
        key = (style_a, style_b)
        if key in self.STYLE_COMPATIBILITY:
            return self.STYLE_COMPATIBILITY[key]

        # Check reverse
        key_rev = (style_b, style_a)
        if key_rev in self.STYLE_COMPATIBILITY:
            return self.STYLE_COMPATIBILITY[key_rev]

        # Same style
        if style_a == style_b:
            return 1.0

        return 0.5  # Default for unknown styles

    def _compute_availability_overlap(
        self,
        availability_a: List[str],
        availability_b: List[str],
    ) -> float:
        """Compute availability overlap score."""
        if not availability_a or not availability_b:
            return 0.3  # No availability info, assume low overlap

        set_a = set(availability_a)
        set_b = set(availability_b)

        intersection = set_a & set_b
        union = set_a | set_b

        if not union:
            return 0.3

        # Jaccard similarity
        jaccard = len(intersection) / len(union)

        # Minimum overlap requirement
        min_overlap = min(len(set_a), len(set_b))
        if min_overlap > 0:
            overlap_ratio = len(intersection) / min_overlap
        else:
            overlap_ratio = 0

        # Need at least some overlap
        return 0.5 * jaccard + 0.5 * overlap_ratio

    def _compute_preference_alignment(
        self,
        preferences_a: Dict,
        preferences_b: Dict,
    ) -> float:
        """Compute preference alignment score."""
        if not preferences_a or not preferences_b:
            return 0.5  # No preferences, neutral

        shared_prefs = set(preferences_a.keys()) & set(preferences_b.keys())

        if not shared_prefs:
            return 0.5

        matches = 0
        for pref in shared_prefs:
            if preferences_a[pref] == preferences_b[pref]:
                matches += 1
            elif isinstance(preferences_a[pref], (int, float)) and isinstance(preferences_b[pref], (int, float)):
                # Numeric preference - check closeness
                diff = abs(preferences_a[pref] - preferences_b[pref])
                max_val = max(abs(preferences_a[pref]), abs(preferences_b[pref]), 1)
                if diff / max_val < 0.2:
                    matches += 0.8
                elif diff / max_val < 0.5:
                    matches += 0.5

        return matches / len(shared_prefs)
