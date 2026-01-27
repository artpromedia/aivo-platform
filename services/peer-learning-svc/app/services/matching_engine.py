"""
Matching Engine

Core matching engine for peer learning optimization using various algorithms.
"""
import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field

import numpy as np
from scipy.optimize import linear_sum_assignment

logger = logging.getLogger(__name__)


@dataclass
class MatchResult:
    """Result of a matching operation."""
    learner_id: str
    matched_peer_id: str
    score: float
    match_type: str
    reasons: List[str] = field(default_factory=list)


@dataclass
class MatchingConstraints:
    """Constraints for matching operations."""
    min_compatibility: float = 0.3
    max_skill_gap: float = 0.5
    require_availability_overlap: bool = True
    min_availability_slots: int = 1
    excluded_pairs: List[Tuple[str, str]] = field(default_factory=list)


class MatchingEngine:
    """
    Core engine for peer matching optimization.

    Algorithms:
    - Hungarian algorithm for 1:1 matching
    - Constraint satisfaction for groups
    - Online matching for real-time
    """

    def __init__(self, default_constraints: Optional[MatchingConstraints] = None):
        """
        Initialize MatchingEngine.

        Args:
            default_constraints: Default matching constraints
        """
        self.default_constraints = default_constraints or MatchingConstraints()
        self.waiting_pool: List[Dict] = []
        logger.info("MatchingEngine initialized")

    def match_pairs(
        self,
        profiles: List[Dict],
        similarity_matrix: Optional[List[List[float]]] = None,
        constraints: Optional[MatchingConstraints] = None,
    ) -> List[Tuple[str, str, float]]:
        """
        Match pairs using Hungarian algorithm for optimal assignment.

        Args:
            profiles: List of learner profiles
            similarity_matrix: Optional pre-computed similarity matrix
            constraints: Optional matching constraints

        Returns:
            List of tuples (learner_id_1, learner_id_2, score)
        """
        if len(profiles) < 2:
            return []

        constraints = constraints or self.default_constraints

        # Get learner IDs
        learner_ids = [p.get("learner_id", str(i)) for i, p in enumerate(profiles)]
        n = len(profiles)

        # Compute or use provided similarity matrix
        if similarity_matrix is None:
            similarity_matrix = self._compute_similarity_matrix(profiles)

        sim_array = np.array(similarity_matrix)

        # Apply constraints to create cost matrix
        cost_matrix = self._create_cost_matrix(
            sim_array, profiles, learner_ids, constraints
        )

        # Handle odd number of learners
        if n % 2 == 1:
            # Add a dummy learner
            dummy_row = np.full((1, n), 1.0)  # High cost for dummy matches
            dummy_col = np.full((n + 1, 1), 1.0)
            cost_matrix = np.vstack([cost_matrix, dummy_row])
            cost_matrix = np.hstack([cost_matrix, dummy_col])
            learner_ids.append("__DUMMY__")

        # For pairing, we need to convert to a bipartite matching problem
        # Create a doubled matrix for self-matching avoidance
        n_extended = len(learner_ids)
        bipartite_cost = np.zeros((n_extended, n_extended))

        for i in range(n_extended):
            for j in range(n_extended):
                if i == j:
                    bipartite_cost[i, j] = 1e10  # Cannot match with self
                else:
                    bipartite_cost[i, j] = cost_matrix[i, j]

        # Apply Hungarian algorithm
        row_ind, col_ind = linear_sum_assignment(bipartite_cost)

        # Extract pairs (avoiding duplicates since matching is symmetric)
        pairs = []
        matched = set()

        for i, j in zip(row_ind, col_ind):
            if i >= n or j >= n:  # Skip dummy matches
                continue
            if learner_ids[i] == "__DUMMY__" or learner_ids[j] == "__DUMMY__":
                continue

            pair_key = tuple(sorted([i, j]))
            if pair_key not in matched:
                matched.add(pair_key)
                score = sim_array[i, j] if i < len(sim_array) and j < len(sim_array[0]) else 0.0
                pairs.append((learner_ids[i], learner_ids[j], float(score)))

        logger.info("Matched %d pairs from %d learners", len(pairs), n)
        return pairs

    def form_groups_csp(
        self,
        profiles: List[Dict],
        constraints: Dict[str, Any],
    ) -> List[List[str]]:
        """
        Form groups using constraint satisfaction approach.

        Args:
            profiles: List of learner profiles
            constraints: Dictionary with constraint specifications:
                - group_size: Target group size
                - min_size: Minimum group size
                - max_size: Maximum group size
                - balance_skills: Whether to balance skill levels
                - diverse_styles: Whether to diversify learning styles

        Returns:
            List of groups (each group is a list of learner IDs)
        """
        if not profiles:
            return []

        group_size = constraints.get("group_size", 4)
        min_size = constraints.get("min_size", 2)
        max_size = constraints.get("max_size", 6)
        balance_skills = constraints.get("balance_skills", True)
        diverse_styles = constraints.get("diverse_styles", False)

        learner_ids = [p.get("learner_id", str(i)) for i, p in enumerate(profiles)]
        n = len(profiles)
        n_groups = max(1, n // group_size)

        # Extract features for constraint checking
        skill_levels = []
        learning_styles = []

        for profile in profiles:
            ks = profile.get("knowledge_state", {})
            skill_levels.append(np.mean(list(ks.values())) if ks else 0.5)
            learning_styles.append(profile.get("learning_style", "unknown"))

        # Sort by skill level for balanced distribution
        sorted_indices = np.argsort(skill_levels)

        # Initialize groups
        groups: List[List[int]] = [[] for _ in range(n_groups)]

        if balance_skills:
            # Snake draft distribution for skill balance
            direction = 1
            group_idx = 0

            for idx in sorted_indices:
                groups[group_idx].append(idx)

                group_idx += direction
                if group_idx >= n_groups:
                    group_idx = n_groups - 1
                    direction = -1
                elif group_idx < 0:
                    group_idx = 0
                    direction = 1
        else:
            # Round-robin distribution
            for i, idx in enumerate(sorted_indices):
                groups[i % n_groups].append(idx)

        # Post-process for diversity if requested
        if diverse_styles:
            groups = self._diversify_styles(groups, learning_styles)

        # Ensure size constraints
        groups = self._enforce_size_constraints(groups, min_size, max_size)

        # Convert indices to IDs
        result = [[learner_ids[idx] for idx in group] for group in groups if group]

        logger.info(
            "Formed %d groups with CSP (size: %d-%d, balance: %s, diverse: %s)",
            len(result), min_size, max_size, balance_skills, diverse_styles
        )

        return result

    def online_match(
        self,
        new_learner: Dict,
        waiting_pool: Optional[List[Dict]] = None,
        constraints: Optional[MatchingConstraints] = None,
    ) -> Optional[MatchResult]:
        """
        Match a newly arriving learner with someone from the waiting pool.

        This implements an online matching algorithm for real-time matching.

        Args:
            new_learner: Profile of the new learner
            waiting_pool: Optional pool to use (uses internal pool if not provided)
            constraints: Optional matching constraints

        Returns:
            MatchResult if a match is found, None otherwise
        """
        pool = waiting_pool if waiting_pool is not None else self.waiting_pool
        constraints = constraints or self.default_constraints

        if not pool:
            # No one to match with, add to waiting pool
            if waiting_pool is None:
                self.waiting_pool.append(new_learner)
            logger.debug("No peers in pool, learner added to waiting list")
            return None

        new_id = new_learner.get("learner_id", "new_learner")

        # Score all candidates
        candidates = []
        for candidate in pool:
            candidate_id = candidate.get("learner_id", "unknown")

            # Check if pair is excluded
            if (new_id, candidate_id) in constraints.excluded_pairs or \
               (candidate_id, new_id) in constraints.excluded_pairs:
                continue

            score, reasons = self._compute_match_score(new_learner, candidate, constraints)

            if score >= constraints.min_compatibility:
                candidates.append((candidate, score, reasons))

        if not candidates:
            # No suitable match, add to waiting pool
            if waiting_pool is None:
                self.waiting_pool.append(new_learner)
            logger.debug("No suitable match found, learner added to waiting list")
            return None

        # Select best match
        candidates.sort(key=lambda x: x[1], reverse=True)
        best_candidate, best_score, reasons = candidates[0]

        # Remove matched candidate from pool
        matched_id = best_candidate.get("learner_id", "unknown")
        if waiting_pool is None:
            self.waiting_pool = [p for p in self.waiting_pool if p.get("learner_id") != matched_id]
        else:
            waiting_pool[:] = [p for p in waiting_pool if p.get("learner_id") != matched_id]

        logger.info("Online match found: %s <-> %s (score: %.3f)", new_id, matched_id, best_score)

        return MatchResult(
            learner_id=new_id,
            matched_peer_id=matched_id,
            score=best_score,
            match_type="online",
            reasons=reasons,
        )

    def match_learner(
        self,
        learner: Dict,
        available_peers: List[Dict],
        match_type: str = "study_partner",
        constraints: Optional[MatchingConstraints] = None,
    ) -> Optional[MatchResult]:
        """
        Match a single learner with the best peer from available pool.

        Args:
            learner: The learner's profile
            available_peers: List of available peer profiles
            match_type: Type of match (study_partner, tutor, discussion)
            constraints: Optional matching constraints

        Returns:
            MatchResult if a match is found, None otherwise
        """
        if not available_peers:
            return None

        constraints = constraints or self.default_constraints
        learner_id = learner.get("learner_id", "learner")

        best_match = None
        best_score = -1.0
        best_reasons = []

        for peer in available_peers:
            peer_id = peer.get("learner_id", "unknown")

            # Skip self
            if peer_id == learner_id:
                continue

            # Check exclusions
            if (learner_id, peer_id) in constraints.excluded_pairs or \
               (peer_id, learner_id) in constraints.excluded_pairs:
                continue

            score, reasons = self._compute_match_score(learner, peer, constraints, match_type)

            if score > best_score and score >= constraints.min_compatibility:
                best_score = score
                best_match = peer
                best_reasons = reasons

        if best_match is None:
            return None

        return MatchResult(
            learner_id=learner_id,
            matched_peer_id=best_match.get("learner_id", "unknown"),
            score=best_score,
            match_type=match_type,
            reasons=best_reasons,
        )

    def get_available_peers(
        self,
        learner: Dict,
        all_peers: List[Dict],
        criteria: Optional[Dict[str, Any]] = None,
    ) -> List[Dict]:
        """
        Get available peers based on criteria.

        Args:
            learner: The learner seeking peers
            all_peers: All potential peers
            criteria: Optional filtering criteria:
                - min_knowledge: Minimum knowledge level
                - max_knowledge: Maximum knowledge level
                - learning_style: Required learning style
                - availability: Required availability slots

        Returns:
            List of peers matching criteria
        """
        criteria = criteria or {}
        learner_id = learner.get("learner_id")

        available = []

        for peer in all_peers:
            # Skip self
            if peer.get("learner_id") == learner_id:
                continue

            # Check knowledge level
            peer_ks = peer.get("knowledge_state", {})
            avg_knowledge = np.mean(list(peer_ks.values())) if peer_ks else 0.5

            min_knowledge = criteria.get("min_knowledge", 0.0)
            max_knowledge = criteria.get("max_knowledge", 1.0)

            if avg_knowledge < min_knowledge or avg_knowledge > max_knowledge:
                continue

            # Check learning style
            required_style = criteria.get("learning_style")
            if required_style:
                peer_style = peer.get("learning_style", "").lower()
                if peer_style != required_style.lower():
                    continue

            # Check availability
            required_availability = criteria.get("availability", [])
            if required_availability:
                peer_availability = set(peer.get("availability", []))
                if not (set(required_availability) & peer_availability):
                    continue

            available.append(peer)

        return available

    def score_match(
        self,
        learner_a: Dict,
        learner_b: Dict,
        match_type: str = "study_partner",
    ) -> float:
        """
        Score the quality of a potential match.

        Args:
            learner_a: First learner's profile
            learner_b: Second learner's profile
            match_type: Type of match

        Returns:
            Match quality score between 0.0 and 1.0
        """
        score, _ = self._compute_match_score(
            learner_a, learner_b,
            self.default_constraints,
            match_type
        )
        return score

    def add_to_waiting_pool(self, learner: Dict) -> None:
        """Add a learner to the waiting pool."""
        self.waiting_pool.append(learner)
        logger.debug("Added learner %s to waiting pool", learner.get("learner_id"))

    def remove_from_waiting_pool(self, learner_id: str) -> bool:
        """Remove a learner from the waiting pool."""
        initial_len = len(self.waiting_pool)
        self.waiting_pool = [p for p in self.waiting_pool if p.get("learner_id") != learner_id]
        return len(self.waiting_pool) < initial_len

    def get_waiting_pool_size(self) -> int:
        """Get the current size of the waiting pool."""
        return len(self.waiting_pool)

    def _compute_similarity_matrix(self, profiles: List[Dict]) -> np.ndarray:
        """Compute pairwise similarity matrix for profiles."""
        n = len(profiles)
        similarity = np.zeros((n, n))

        for i in range(n):
            for j in range(i + 1, n):
                score, _ = self._compute_match_score(
                    profiles[i], profiles[j],
                    self.default_constraints
                )
                similarity[i, j] = score
                similarity[j, i] = score

        # Self-similarity = 0 (shouldn't match with self)
        np.fill_diagonal(similarity, 0)

        return similarity

    def _create_cost_matrix(
        self,
        similarity: np.ndarray,
        profiles: List[Dict],
        learner_ids: List[str],
        constraints: MatchingConstraints,
    ) -> np.ndarray:
        """Create cost matrix from similarity matrix with constraints."""
        # Convert similarity to cost (Hungarian minimizes)
        cost = 1.0 - similarity

        n = len(profiles)

        # Apply constraint penalties
        for i in range(n):
            for j in range(i + 1, n):
                # Check excluded pairs
                pair = (learner_ids[i], learner_ids[j])
                pair_rev = (learner_ids[j], learner_ids[i])
                if pair in constraints.excluded_pairs or pair_rev in constraints.excluded_pairs:
                    cost[i, j] = 1e10
                    cost[j, i] = 1e10
                    continue

                # Check availability overlap if required
                if constraints.require_availability_overlap:
                    avail_i = set(profiles[i].get("availability", []))
                    avail_j = set(profiles[j].get("availability", []))
                    overlap = len(avail_i & avail_j)

                    if overlap < constraints.min_availability_slots:
                        cost[i, j] += 0.5  # Penalty but not impossible
                        cost[j, i] += 0.5

        return cost

    def _compute_match_score(
        self,
        learner_a: Dict,
        learner_b: Dict,
        constraints: MatchingConstraints,
        match_type: str = "study_partner",
    ) -> Tuple[float, List[str]]:
        """Compute match score between two learners."""
        reasons = []

        # Knowledge similarity/complementarity
        ks_a = learner_a.get("knowledge_state", {})
        ks_b = learner_b.get("knowledge_state", {})

        if ks_a and ks_b:
            all_topics = set(ks_a.keys()) | set(ks_b.keys())
            vec_a = np.array([ks_a.get(t, 0.0) for t in all_topics])
            vec_b = np.array([ks_b.get(t, 0.0) for t in all_topics])

            # Compute based on match type
            if match_type == "tutor":
                # For tutoring, look for appropriate gap
                diff = np.mean(vec_b) - np.mean(vec_a)
                if 0.1 < diff < 0.4:
                    knowledge_score = 0.9
                    reasons.append("Good knowledge differential for tutoring")
                elif diff > 0:
                    knowledge_score = 0.6
                else:
                    knowledge_score = 0.3
            else:
                # For study partners, look for similarity
                if np.linalg.norm(vec_a) > 0 and np.linalg.norm(vec_b) > 0:
                    cosine_sim = np.dot(vec_a, vec_b) / (np.linalg.norm(vec_a) * np.linalg.norm(vec_b))
                    knowledge_score = (cosine_sim + 1) / 2  # Normalize to [0, 1]
                else:
                    knowledge_score = 0.5

                if knowledge_score > 0.7:
                    reasons.append("Similar knowledge levels")
        else:
            knowledge_score = 0.5

        # Learning style compatibility
        style_a = learner_a.get("learning_style", "").lower()
        style_b = learner_b.get("learning_style", "").lower()

        if style_a and style_b:
            if style_a == style_b:
                style_score = 1.0
                reasons.append("Same learning style")
            else:
                # Some styles work better together
                compatible_pairs = {
                    ("visual", "reading"): 0.8,
                    ("auditory", "kinesthetic"): 0.7,
                }
                pair = tuple(sorted([style_a, style_b]))
                style_score = compatible_pairs.get(pair, 0.6)
        else:
            style_score = 0.5

        # Availability overlap
        avail_a = set(learner_a.get("availability", []))
        avail_b = set(learner_b.get("availability", []))

        if avail_a and avail_b:
            overlap = len(avail_a & avail_b)
            total = len(avail_a | avail_b)
            availability_score = overlap / total if total > 0 else 0
            if availability_score > 0.5:
                reasons.append("Good schedule overlap")
        else:
            availability_score = 0.5

        # Weighted combination
        if match_type == "tutor":
            weights = {"knowledge": 0.5, "style": 0.2, "availability": 0.3}
        elif match_type == "discussion":
            weights = {"knowledge": 0.3, "style": 0.2, "availability": 0.5}
        else:
            weights = {"knowledge": 0.4, "style": 0.25, "availability": 0.35}

        total_score = (
            weights["knowledge"] * knowledge_score +
            weights["style"] * style_score +
            weights["availability"] * availability_score
        )

        return total_score, reasons

    def _diversify_styles(
        self,
        groups: List[List[int]],
        learning_styles: List[str],
    ) -> List[List[int]]:
        """Attempt to diversify learning styles within groups."""
        # Simple swap-based diversification
        for _ in range(50):  # Max iterations
            improved = False

            for i, group_a in enumerate(groups):
                for j, group_b in enumerate(groups[i + 1:], i + 1):
                    # Check if swap would improve diversity
                    for idx_a in group_a:
                        for idx_b in group_b:
                            # Current diversity
                            styles_a = [learning_styles[idx] for idx in group_a]
                            styles_b = [learning_styles[idx] for idx in group_b]
                            current_diversity = len(set(styles_a)) + len(set(styles_b))

                            # After swap
                            new_styles_a = [learning_styles[idx] if idx != idx_a else learning_styles[idx_b] for idx in group_a]
                            new_styles_b = [learning_styles[idx] if idx != idx_b else learning_styles[idx_a] for idx in group_b]
                            new_diversity = len(set(new_styles_a)) + len(set(new_styles_b))

                            if new_diversity > current_diversity:
                                # Perform swap
                                group_a[group_a.index(idx_a)] = idx_b
                                group_b[group_b.index(idx_b)] = idx_a
                                improved = True
                                break
                        if improved:
                            break
                    if improved:
                        break
                if improved:
                    break

            if not improved:
                break

        return groups

    def _enforce_size_constraints(
        self,
        groups: List[List[int]],
        min_size: int,
        max_size: int,
    ) -> List[List[int]]:
        """Enforce size constraints on groups."""
        # Remove empty groups
        groups = [g for g in groups if g]

        if not groups:
            return groups

        # Move members from oversized groups
        for i, group in enumerate(groups):
            while len(group) > max_size:
                # Find smallest group to receive member
                smallest_idx = min(range(len(groups)), key=lambda x: len(groups[x]) if x != i else float('inf'))
                if smallest_idx != i and len(groups[smallest_idx]) < max_size:
                    member = group.pop()
                    groups[smallest_idx].append(member)
                else:
                    # Create new group
                    groups.append([group.pop()])

        # Merge undersized groups
        i = 0
        while i < len(groups):
            if len(groups[i]) < min_size:
                # Find another small group to merge with
                for j in range(i + 1, len(groups)):
                    if len(groups[i]) + len(groups[j]) <= max_size:
                        groups[i].extend(groups[j])
                        groups.pop(j)
                        break
                else:
                    # If can't merge, redistribute members
                    for member in groups[i]:
                        # Add to smallest valid group
                        valid_groups = [g for g in groups if g != groups[i] and len(g) < max_size]
                        if valid_groups:
                            min(valid_groups, key=len).append(member)
                    groups.pop(i)
                    continue
            i += 1

        return groups
