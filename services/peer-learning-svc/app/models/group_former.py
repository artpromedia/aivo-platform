"""
Group Former

Form optimal study groups using clustering and assignment algorithms.
"""
import logging
import uuid
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Any

import numpy as np
from scipy.optimize import linear_sum_assignment

logger = logging.getLogger(__name__)


@dataclass
class StudyGroup:
    """Represents a formed study group."""
    group_id: str
    member_ids: List[str]
    balance_score: float
    predicted_effectiveness: float
    member_roles: Dict[str, str] = field(default_factory=dict)


@dataclass
class GroupValidation:
    """Validation result for a group."""
    is_valid: bool
    issues: List[str]
    suggestions: List[str]
    compatibility_score: float


class GroupFormer:
    """
    Form optimal study groups.

    Optimization goals:
    - Balanced: Mix of skill levels
    - Diverse: Different perspectives
    - Similar: Homogeneous groups

    Usage:
        former = GroupFormer()
        groups = former.form(learner_profiles, group_size=4)
    """

    # Role definitions with required traits
    ROLES = {
        "leader": {"traits": ["high_knowledge", "communication"], "weight": 0.3},
        "contributor": {"traits": ["mid_knowledge", "collaborative"], "weight": 0.4},
        "learner": {"traits": ["low_knowledge", "receptive"], "weight": 0.2},
        "facilitator": {"traits": ["social", "organized"], "weight": 0.1},
    }

    def __init__(self):
        """Initialize GroupFormer."""
        logger.info("GroupFormer initialized")

    def form(
        self,
        learner_profiles: List[Dict],
        group_size: int = 4,
        optimization_goal: str = "balanced",
    ) -> List[StudyGroup]:
        """
        Form optimal groups from learner profiles.

        Args:
            learner_profiles: List of learner profile dictionaries
            group_size: Target size for each group (default 4)
            optimization_goal: "balanced", "diverse", or "similar"

        Returns:
            List of StudyGroup objects
        """
        if not learner_profiles:
            return []

        if len(learner_profiles) < group_size:
            # Single group with all learners
            return [self._create_single_group(learner_profiles, optimization_goal)]

        # Extract feature vectors for clustering
        features, learner_ids = self._extract_features(learner_profiles)

        # Form groups based on optimization goal
        if optimization_goal == "balanced":
            groups = self._form_balanced_groups(features, learner_ids, learner_profiles, group_size)
        elif optimization_goal == "diverse":
            groups = self._form_diverse_groups(features, learner_ids, learner_profiles, group_size)
        elif optimization_goal == "similar":
            groups = self._form_similar_groups(features, learner_ids, learner_profiles, group_size)
        else:
            logger.warning("Unknown optimization goal '%s', defaulting to balanced", optimization_goal)
            groups = self._form_balanced_groups(features, learner_ids, learner_profiles, group_size)

        logger.info(
            "Formed %d groups of target size %d with goal '%s'",
            len(groups), group_size, optimization_goal
        )

        return groups

    def rebalance(
        self,
        existing_groups: List[StudyGroup],
        learner_profiles: Optional[List[Dict]] = None,
    ) -> List[StudyGroup]:
        """
        Rebalance existing groups to improve effectiveness.

        Args:
            existing_groups: Current groups to rebalance
            learner_profiles: Optional updated profiles for learners

        Returns:
            Rebalanced groups
        """
        if not existing_groups:
            return []

        # Collect all members
        all_members = []
        for group in existing_groups:
            all_members.extend(group.member_ids)

        # If we have profiles, use them for better rebalancing
        if learner_profiles:
            profile_map = {p["learner_id"]: p for p in learner_profiles}
            profiles = [profile_map.get(m, {"learner_id": m}) for m in all_members]
        else:
            profiles = [{"learner_id": m} for m in all_members]

        # Determine average group size
        avg_size = len(all_members) // len(existing_groups)
        if avg_size < 2:
            avg_size = 2

        # Re-form with balanced goal
        return self.form(profiles, group_size=avg_size, optimization_goal="balanced")

    def suggest_role(
        self,
        group: StudyGroup,
        learner_id: str,
        learner_profile: Optional[Dict] = None,
    ) -> str:
        """
        Suggest role for a learner in their group.

        Args:
            group: The study group
            learner_id: ID of the learner
            learner_profile: Optional profile with traits

        Returns:
            Suggested role name
        """
        if learner_id not in group.member_ids:
            raise ValueError(f"Learner {learner_id} is not in group {group.group_id}")

        # If role already assigned, return it
        if learner_id in group.member_roles:
            return group.member_roles[learner_id]

        # Determine role based on profile traits
        if not learner_profile:
            # Default role assignment based on position
            idx = group.member_ids.index(learner_id)
            roles = ["leader", "contributor", "contributor", "learner"]
            return roles[idx % len(roles)]

        # Analyze profile for role fit
        knowledge_state = learner_profile.get("knowledge_state", {})
        avg_knowledge = np.mean(list(knowledge_state.values())) if knowledge_state else 0.5

        preferences = learner_profile.get("preferences", {})
        is_social = preferences.get("social", False) or preferences.get("collaborative", False)

        if avg_knowledge > 0.7:
            return "leader"
        elif avg_knowledge < 0.3:
            return "learner"
        elif is_social:
            return "facilitator"
        else:
            return "contributor"

    def optimize_groups(
        self,
        groups: List[StudyGroup],
        learner_profiles: List[Dict],
        optimization_goal: str = "balanced",
    ) -> List[StudyGroup]:
        """
        Optimize existing group composition.

        Args:
            groups: Current groups
            learner_profiles: Learner profiles for all members
            optimization_goal: "diversity" or "similarity"

        Returns:
            Optimized groups with swapped members
        """
        if len(groups) < 2:
            return groups

        profile_map = {p["learner_id"]: p for p in learner_profiles}

        # Try swaps to improve overall score
        improved = True
        max_iterations = 100
        iteration = 0

        current_score = self._compute_total_group_score(groups, profile_map, optimization_goal)

        while improved and iteration < max_iterations:
            improved = False
            iteration += 1

            for i, group_a in enumerate(groups):
                for j, group_b in enumerate(groups[i + 1:], i + 1):
                    # Try swapping each pair of members
                    for member_a in group_a.member_ids:
                        for member_b in group_b.member_ids:
                            # Create trial groups with swap
                            new_group_a_members = [
                                member_b if m == member_a else m
                                for m in group_a.member_ids
                            ]
                            new_group_b_members = [
                                member_a if m == member_b else m
                                for m in group_b.member_ids
                            ]

                            # Evaluate swap
                            trial_groups = groups.copy()
                            trial_groups[i] = StudyGroup(
                                group_id=group_a.group_id,
                                member_ids=new_group_a_members,
                                balance_score=0.0,
                                predicted_effectiveness=0.0,
                            )
                            trial_groups[j] = StudyGroup(
                                group_id=group_b.group_id,
                                member_ids=new_group_b_members,
                                balance_score=0.0,
                                predicted_effectiveness=0.0,
                            )

                            trial_score = self._compute_total_group_score(
                                trial_groups, profile_map, optimization_goal
                            )

                            if trial_score > current_score + 0.01:
                                # Accept swap
                                groups = trial_groups
                                current_score = trial_score
                                improved = True
                                logger.debug(
                                    "Swap improved score: %s <-> %s (%.3f)",
                                    member_a, member_b, trial_score
                                )

        # Recompute scores for final groups
        optimized_groups = []
        for group in groups:
            profiles = [profile_map.get(m, {"learner_id": m}) for m in group.member_ids]
            balance_score = self._compute_balance_score(profiles)
            effectiveness = self._predict_effectiveness(profiles, optimization_goal)

            optimized_groups.append(StudyGroup(
                group_id=group.group_id,
                member_ids=group.member_ids,
                balance_score=balance_score,
                predicted_effectiveness=effectiveness,
            ))

        logger.info("Optimized %d groups in %d iterations", len(groups), iteration)
        return optimized_groups

    def validate_groups(
        self,
        groups: List[StudyGroup],
        learner_profiles: List[Dict],
    ) -> List[GroupValidation]:
        """
        Validate group compatibility and identify issues.

        Args:
            groups: Groups to validate
            learner_profiles: Learner profiles

        Returns:
            List of GroupValidation results
        """
        profile_map = {p["learner_id"]: p for p in learner_profiles}
        validations = []

        for group in groups:
            issues = []
            suggestions = []

            # Check group size
            if len(group.member_ids) < 2:
                issues.append("Group too small (minimum 2 members)")
                suggestions.append("Merge with another group")
            elif len(group.member_ids) > 6:
                issues.append("Group too large (maximum 6 recommended)")
                suggestions.append("Split into smaller groups")

            # Check for missing profiles
            profiles = []
            for member_id in group.member_ids:
                if member_id not in profile_map:
                    issues.append(f"Missing profile for member {member_id}")
                else:
                    profiles.append(profile_map[member_id])

            if not profiles:
                validations.append(GroupValidation(
                    is_valid=False,
                    issues=issues,
                    suggestions=suggestions,
                    compatibility_score=0.0,
                ))
                continue

            # Check availability overlap
            availability_overlap = self._compute_availability_overlap(profiles)
            if availability_overlap < 0.3:
                issues.append("Low availability overlap among members")
                suggestions.append("Consider rescheduling or reassigning members")

            # Check knowledge balance
            knowledge_variance = self._compute_knowledge_variance(profiles)
            if knowledge_variance > 0.5:
                issues.append("High knowledge level variance")
                suggestions.append("Consider pairing advanced learners with beginners")

            # Compute overall compatibility
            compatibility_score = self._compute_group_compatibility(profiles)

            is_valid = len(issues) == 0 or (
                len(issues) == 1 and "variance" in issues[0].lower()
            )

            validations.append(GroupValidation(
                is_valid=is_valid,
                issues=issues,
                suggestions=suggestions,
                compatibility_score=compatibility_score,
            ))

        return validations

    def _create_single_group(
        self,
        learner_profiles: List[Dict],
        optimization_goal: str,
    ) -> StudyGroup:
        """Create a single group from all learners."""
        member_ids = [p.get("learner_id", str(uuid.uuid4())) for p in learner_profiles]
        balance_score = self._compute_balance_score(learner_profiles)
        effectiveness = self._predict_effectiveness(learner_profiles, optimization_goal)

        return StudyGroup(
            group_id=f"group_{uuid.uuid4().hex[:8]}",
            member_ids=member_ids,
            balance_score=balance_score,
            predicted_effectiveness=effectiveness,
        )

    def _extract_features(
        self,
        learner_profiles: List[Dict],
    ) -> Tuple[np.ndarray, List[str]]:
        """Extract feature vectors from learner profiles."""
        learner_ids = []
        features = []

        # Collect all topics across profiles
        all_topics = set()
        for profile in learner_profiles:
            all_topics.update(profile.get("knowledge_state", {}).keys())

        all_topics = sorted(all_topics)

        for profile in learner_profiles:
            learner_ids.append(profile.get("learner_id", str(uuid.uuid4())))

            knowledge_state = profile.get("knowledge_state", {})
            knowledge_vec = [knowledge_state.get(t, 0.0) for t in all_topics]

            # Add learning style as numeric
            style_map = {"visual": 0, "auditory": 1, "kinesthetic": 2, "reading": 3}
            style = profile.get("learning_style", "")
            style_num = style_map.get(style.lower() if style else "", 2) / 3.0

            # Combine features
            feature_vec = knowledge_vec + [style_num]
            features.append(feature_vec)

        return np.array(features), learner_ids

    def _form_balanced_groups(
        self,
        features: np.ndarray,
        learner_ids: List[str],
        learner_profiles: List[Dict],
        group_size: int,
    ) -> List[StudyGroup]:
        """Form groups with balanced skill levels."""
        n_learners = len(learner_ids)
        n_groups = max(1, n_learners // group_size)

        # Compute average knowledge level for each learner
        profile_map = {p["learner_id"]: p for p in learner_profiles}
        knowledge_levels = []
        for lid in learner_ids:
            profile = profile_map.get(lid, {})
            ks = profile.get("knowledge_state", {})
            avg_level = np.mean(list(ks.values())) if ks else 0.5
            knowledge_levels.append(avg_level)

        # Sort by knowledge level
        sorted_indices = np.argsort(knowledge_levels)

        # Distribute using snake draft (ensures balance)
        groups = [[] for _ in range(n_groups)]
        direction = 1
        group_idx = 0

        for idx in sorted_indices:
            groups[group_idx].append(learner_ids[idx])

            group_idx += direction
            if group_idx >= n_groups:
                group_idx = n_groups - 1
                direction = -1
            elif group_idx < 0:
                group_idx = 0
                direction = 1

        # Convert to StudyGroup objects
        study_groups = []
        for i, member_ids in enumerate(groups):
            if not member_ids:
                continue

            profiles = [profile_map.get(m, {"learner_id": m}) for m in member_ids]
            balance_score = self._compute_balance_score(profiles)
            effectiveness = self._predict_effectiveness(profiles, "balanced")

            study_groups.append(StudyGroup(
                group_id=f"group_{uuid.uuid4().hex[:8]}",
                member_ids=member_ids,
                balance_score=balance_score,
                predicted_effectiveness=effectiveness,
            ))

        return study_groups

    def _form_diverse_groups(
        self,
        features: np.ndarray,
        learner_ids: List[str],
        learner_profiles: List[Dict],
        group_size: int,
    ) -> List[StudyGroup]:
        """Form groups maximizing diversity."""
        n_learners = len(learner_ids)
        n_groups = max(1, n_learners // group_size)

        profile_map = {p["learner_id"]: p for p in learner_profiles}

        # Compute pairwise distances
        distances = np.zeros((n_learners, n_learners))
        for i in range(n_learners):
            for j in range(i + 1, n_learners):
                dist = np.linalg.norm(features[i] - features[j])
                distances[i, j] = dist
                distances[j, i] = dist

        # Greedy assignment maximizing within-group diversity
        assigned = set()
        groups = []

        for _ in range(n_groups):
            if len(assigned) >= n_learners:
                break

            group = []

            # Start with unassigned learner
            for i in range(n_learners):
                if i not in assigned:
                    group.append(i)
                    assigned.add(i)
                    break

            # Add diverse members
            while len(group) < group_size and len(assigned) < n_learners:
                best_idx = -1
                best_diversity = -1

                for i in range(n_learners):
                    if i in assigned:
                        continue

                    # Diversity = minimum distance to group members
                    min_dist = min(distances[i, j] for j in group)
                    if min_dist > best_diversity:
                        best_diversity = min_dist
                        best_idx = i

                if best_idx >= 0:
                    group.append(best_idx)
                    assigned.add(best_idx)

            groups.append(group)

        # Add remaining unassigned to smallest groups
        remaining = [i for i in range(n_learners) if i not in assigned]
        for idx in remaining:
            smallest_group = min(groups, key=len)
            smallest_group.append(idx)

        # Convert to StudyGroup objects
        study_groups = []
        for member_indices in groups:
            member_ids = [learner_ids[i] for i in member_indices]
            profiles = [profile_map.get(m, {"learner_id": m}) for m in member_ids]
            balance_score = self._compute_balance_score(profiles)
            effectiveness = self._predict_effectiveness(profiles, "diverse")

            study_groups.append(StudyGroup(
                group_id=f"group_{uuid.uuid4().hex[:8]}",
                member_ids=member_ids,
                balance_score=balance_score,
                predicted_effectiveness=effectiveness,
            ))

        return study_groups

    def _form_similar_groups(
        self,
        features: np.ndarray,
        learner_ids: List[str],
        learner_profiles: List[Dict],
        group_size: int,
    ) -> List[StudyGroup]:
        """Form groups of similar learners."""
        n_learners = len(learner_ids)
        n_groups = max(1, n_learners // group_size)

        profile_map = {p["learner_id"]: p for p in learner_profiles}

        # Simple k-means-like clustering
        # Initialize centroids
        centroid_indices = np.linspace(0, n_learners - 1, n_groups, dtype=int)
        centroids = features[centroid_indices].copy()

        # Iterate to refine clusters
        for _ in range(10):
            # Assign to nearest centroid
            assignments = []
            for i in range(n_learners):
                distances = [np.linalg.norm(features[i] - c) for c in centroids]
                assignments.append(np.argmin(distances))

            # Update centroids
            for k in range(n_groups):
                cluster_points = [features[i] for i, a in enumerate(assignments) if a == k]
                if cluster_points:
                    centroids[k] = np.mean(cluster_points, axis=0)

        # Build groups from final assignments
        groups = [[] for _ in range(n_groups)]
        for i, assignment in enumerate(assignments):
            groups[assignment].append(i)

        # Balance group sizes
        groups = self._balance_group_sizes(groups, group_size)

        # Convert to StudyGroup objects
        study_groups = []
        for member_indices in groups:
            if not member_indices:
                continue

            member_ids = [learner_ids[i] for i in member_indices]
            profiles = [profile_map.get(m, {"learner_id": m}) for m in member_ids]
            balance_score = self._compute_balance_score(profiles)
            effectiveness = self._predict_effectiveness(profiles, "similar")

            study_groups.append(StudyGroup(
                group_id=f"group_{uuid.uuid4().hex[:8]}",
                member_ids=member_ids,
                balance_score=balance_score,
                predicted_effectiveness=effectiveness,
            ))

        return study_groups

    def _balance_group_sizes(
        self,
        groups: List[List[int]],
        target_size: int,
    ) -> List[List[int]]:
        """Balance group sizes by moving members."""
        min_size = max(2, target_size - 1)
        max_size = target_size + 1

        # Move members from large to small groups
        for _ in range(100):  # Max iterations
            sizes = [len(g) for g in groups]
            max_idx = np.argmax(sizes)
            min_idx = np.argmin(sizes)

            if sizes[max_idx] <= max_size and sizes[min_idx] >= min_size:
                break

            if sizes[max_idx] > max_size and sizes[min_idx] < target_size:
                # Move one member from largest to smallest
                member = groups[max_idx].pop()
                groups[min_idx].append(member)

        return groups

    def _compute_balance_score(self, profiles: List[Dict]) -> float:
        """Compute balance score for a group."""
        if not profiles:
            return 0.0

        # Extract knowledge levels
        levels = []
        for profile in profiles:
            ks = profile.get("knowledge_state", {})
            if ks:
                levels.append(np.mean(list(ks.values())))
            else:
                levels.append(0.5)

        if not levels:
            return 0.5

        # Balance = low variance and good coverage of levels
        variance = np.var(levels)
        coverage = (max(levels) - min(levels)) if len(levels) > 1 else 0

        # Good balance: moderate coverage, low variance
        balance = 1.0 - variance  # Lower variance = better balance
        return max(0.0, min(1.0, balance))

    def _predict_effectiveness(
        self,
        profiles: List[Dict],
        optimization_goal: str,
    ) -> float:
        """Predict group effectiveness based on composition."""
        if not profiles:
            return 0.0

        # Base effectiveness factors
        size_score = self._size_effectiveness(len(profiles))

        # Knowledge distribution
        levels = []
        for profile in profiles:
            ks = profile.get("knowledge_state", {})
            if ks:
                levels.append(np.mean(list(ks.values())))

        if levels:
            level_variance = np.var(levels)
            avg_level = np.mean(levels)
        else:
            level_variance = 0.5
            avg_level = 0.5

        # Goal-specific scoring
        if optimization_goal == "balanced":
            # Moderate variance is good for balanced groups
            variance_score = 1.0 - abs(level_variance - 0.1) * 2
        elif optimization_goal == "diverse":
            # Higher variance preferred
            variance_score = min(1.0, level_variance * 3)
        else:  # similar
            # Low variance preferred
            variance_score = 1.0 - level_variance * 2

        variance_score = max(0.0, min(1.0, variance_score))

        # Combine factors
        effectiveness = (
            0.3 * size_score +
            0.3 * variance_score +
            0.2 * avg_level +
            0.2 * self._style_diversity_score(profiles)
        )

        return max(0.0, min(1.0, effectiveness))

    def _size_effectiveness(self, size: int) -> float:
        """Compute effectiveness based on group size."""
        # Optimal size is 4-5
        if size < 2:
            return 0.3
        elif size == 2:
            return 0.6
        elif size == 3:
            return 0.8
        elif size in [4, 5]:
            return 1.0
        elif size == 6:
            return 0.9
        else:
            return max(0.5, 1.0 - (size - 6) * 0.1)

    def _style_diversity_score(self, profiles: List[Dict]) -> float:
        """Compute learning style diversity score."""
        styles = set()
        for profile in profiles:
            style = profile.get("learning_style")
            if style:
                styles.add(style.lower())

        if not styles:
            return 0.5

        # More diverse styles = higher score (up to a point)
        return min(1.0, len(styles) / 3.0)

    def _compute_availability_overlap(self, profiles: List[Dict]) -> float:
        """Compute availability overlap among group members."""
        if not profiles:
            return 0.0

        availability_sets = []
        for profile in profiles:
            avail = profile.get("availability", [])
            if avail:
                availability_sets.append(set(avail))

        if not availability_sets:
            return 0.5  # Unknown availability

        # Compute intersection
        common = availability_sets[0]
        for avail_set in availability_sets[1:]:
            common = common & avail_set

        # Compute union
        all_slots = set()
        for avail_set in availability_sets:
            all_slots.update(avail_set)

        if not all_slots:
            return 0.5

        return len(common) / len(all_slots)

    def _compute_knowledge_variance(self, profiles: List[Dict]) -> float:
        """Compute variance in knowledge levels."""
        levels = []
        for profile in profiles:
            ks = profile.get("knowledge_state", {})
            if ks:
                levels.append(np.mean(list(ks.values())))

        if not levels:
            return 0.0

        return float(np.var(levels))

    def _compute_group_compatibility(self, profiles: List[Dict]) -> float:
        """Compute overall group compatibility score."""
        if len(profiles) < 2:
            return 1.0

        # Factors: availability overlap, style compatibility, knowledge balance
        availability_score = self._compute_availability_overlap(profiles)
        style_score = self._style_diversity_score(profiles)
        balance_score = self._compute_balance_score(profiles)

        return (availability_score + style_score + balance_score) / 3.0

    def _compute_total_group_score(
        self,
        groups: List[StudyGroup],
        profile_map: Dict[str, Dict],
        optimization_goal: str,
    ) -> float:
        """Compute total score for all groups."""
        if not groups:
            return 0.0

        total_score = 0.0
        for group in groups:
            profiles = [profile_map.get(m, {"learner_id": m}) for m in group.member_ids]
            total_score += self._predict_effectiveness(profiles, optimization_goal)

        return total_score / len(groups)
