"""
Learning Path Optimizer

Find optimal learning paths through the knowledge graph
considering prerequisites, difficulty, and learner preferences.
"""
import logging
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Set, Tuple, Any
from collections import deque
import heapq

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class LearningPath:
    """Represents an optimized learning path."""
    concepts: List[str]
    estimated_time: float  # hours
    difficulty_curve: List[float]
    coherence_score: float
    total_concepts: int = 0
    prerequisites_satisfied: bool = True


@dataclass
class PathStep:
    """A single step in a learning path."""
    concept: str
    difficulty: float
    estimated_time: float
    prerequisites_covered: List[str]
    skills_gained: List[str]


@dataclass
class LearningPathOptimizerConfig:
    """Configuration for learning path optimization."""
    # Optimization settings
    max_path_length: int = 50
    prefer_gradual_difficulty: bool = True
    difficulty_jump_penalty: float = 0.5

    # Time settings (hours per difficulty level)
    time_per_difficulty: Dict[int, float] = field(default_factory=lambda: {
        1: 1.0,  # Basic concepts
        2: 1.5,
        3: 2.0,
        4: 3.0,
        5: 4.0,
        6: 5.0,  # Advanced concepts
    })

    # Coherence settings
    domain_switch_penalty: float = 0.3
    topic_continuity_bonus: float = 0.2


# Concept metadata for optimization
CONCEPT_METADATA = {
    # Mathematics
    "arithmetic": {"domain": "math", "difficulty": 1, "topics": ["numbers", "operations"]},
    "fractions": {"domain": "math", "difficulty": 1, "topics": ["numbers", "ratios"]},
    "algebra": {"domain": "math", "difficulty": 2, "topics": ["equations", "variables"]},
    "geometry": {"domain": "math", "difficulty": 2, "topics": ["shapes", "space"]},
    "trigonometry": {"domain": "math", "difficulty": 3, "topics": ["angles", "triangles"]},
    "calculus": {"domain": "math", "difficulty": 4, "topics": ["limits", "derivatives", "integrals"]},
    "linear algebra": {"domain": "math", "difficulty": 4, "topics": ["matrices", "vectors"]},
    "differential equations": {"domain": "math", "difficulty": 5, "topics": ["equations", "derivatives"]},
    "statistics": {"domain": "math", "difficulty": 3, "topics": ["data", "probability"]},
    "probability": {"domain": "math", "difficulty": 3, "topics": ["chance", "distributions"]},

    # Computer Science
    "programming": {"domain": "cs", "difficulty": 3, "topics": ["code", "logic"]},
    "data structures": {"domain": "cs", "difficulty": 4, "topics": ["arrays", "trees", "graphs"]},
    "algorithms": {"domain": "cs", "difficulty": 4, "topics": ["sorting", "searching", "optimization"]},
    "machine learning": {"domain": "cs", "difficulty": 5, "topics": ["models", "training", "prediction"]},
    "deep learning": {"domain": "cs", "difficulty": 6, "topics": ["neural networks", "backpropagation"]},

    # Science
    "physics": {"domain": "science", "difficulty": 3, "topics": ["forces", "energy", "motion"]},
    "chemistry": {"domain": "science", "difficulty": 3, "topics": ["elements", "reactions", "bonds"]},
    "biology": {"domain": "science", "difficulty": 2, "topics": ["cells", "organisms", "ecosystems"]},
    "mechanics": {"domain": "science", "difficulty": 4, "topics": ["forces", "motion", "energy"]},
    "genetics": {"domain": "science", "difficulty": 4, "topics": ["dna", "inheritance", "evolution"]},
}

# Prerequisite relationships
PREREQUISITES = {
    "algebra": ["arithmetic", "fractions"],
    "geometry": ["arithmetic"],
    "trigonometry": ["geometry", "algebra"],
    "calculus": ["algebra", "trigonometry"],
    "linear algebra": ["algebra"],
    "differential equations": ["calculus", "linear algebra"],
    "statistics": ["algebra", "probability"],
    "probability": ["fractions"],
    "programming": ["logic", "arithmetic"],
    "data structures": ["programming"],
    "algorithms": ["data structures"],
    "machine learning": ["linear algebra", "statistics", "programming"],
    "deep learning": ["machine learning", "calculus"],
    "mechanics": ["calculus", "algebra"],
    "genetics": ["biology", "chemistry"],
}


class LearningPathOptimizer:
    """
    Find optimal learning paths through knowledge graph.

    Considers:
    - Prerequisite ordering
    - Learner's current knowledge
    - Concept difficulty
    - Learning time estimates
    - Path coherence (thematic flow)

    Usage:
        optimizer = LearningPathOptimizer()
        path = optimizer.optimize(
            target=["differential_equations"],
            known=["algebra", "calculus"]
        )
    """

    def __init__(
        self,
        config: Optional[LearningPathOptimizerConfig] = None,
    ):
        self.config = config or LearningPathOptimizerConfig()

        # Build prerequisite graph
        self._prerequisites: Dict[str, Set[str]] = {}
        self._dependents: Dict[str, Set[str]] = {}
        self._concept_metadata: Dict[str, Dict] = {**CONCEPT_METADATA}

        self._load_prerequisites()
        logger.info("LearningPathOptimizer initialized")

    def _load_prerequisites(self):
        """Load prerequisite relationships."""
        for concept, prereqs in PREREQUISITES.items():
            self._prerequisites[concept.lower()] = {p.lower() for p in prereqs}

            for prereq in prereqs:
                prereq_lower = prereq.lower()
                if prereq_lower not in self._dependents:
                    self._dependents[prereq_lower] = set()
                self._dependents[prereq_lower].add(concept.lower())

    def _get_difficulty(self, concept: str) -> float:
        """Get difficulty level for a concept."""
        metadata = self._concept_metadata.get(concept.lower(), {})
        return float(metadata.get("difficulty", 3))

    def _get_domain(self, concept: str) -> str:
        """Get domain for a concept."""
        metadata = self._concept_metadata.get(concept.lower(), {})
        return metadata.get("domain", "general")

    def _get_topics(self, concept: str) -> List[str]:
        """Get topics for a concept."""
        metadata = self._concept_metadata.get(concept.lower(), {})
        return metadata.get("topics", [])

    def _get_time(self, concept: str) -> float:
        """Get estimated learning time for a concept."""
        diff = int(self._get_difficulty(concept))
        return self.config.time_per_difficulty.get(diff, 2.0)

    def optimize(
        self,
        target_concepts: List[str],
        known_concepts: List[str],
        max_path_length: int = 20,
        optimization_goal: str = "balanced",  # balanced, fastest, easiest
    ) -> LearningPath:
        """
        Find optimal path to learn target concepts.

        Args:
            target_concepts: Concepts to learn
            known_concepts: Already known concepts
            max_path_length: Maximum concepts in path
            optimization_goal: Optimization strategy

        Returns:
            Optimized LearningPath
        """
        targets = {t.lower() for t in target_concepts}
        known = {k.lower() for k in known_concepts}

        # Find all required concepts
        required = self._find_required_concepts(targets, known)

        # Order concepts respecting prerequisites
        ordered = self._topological_sort(required, known)

        # Optimize ordering based on goal
        if optimization_goal == "easiest":
            ordered = self._optimize_for_easiest(ordered)
        elif optimization_goal == "fastest":
            ordered = self._optimize_for_fastest(ordered)
        else:  # balanced
            ordered = self._optimize_for_coherence(ordered)

        # Limit path length
        ordered = ordered[:max_path_length]

        # Calculate metrics
        difficulty_curve = [self._get_difficulty(c) for c in ordered]
        total_time = sum(self._get_time(c) for c in ordered)
        coherence = self._calculate_coherence(ordered)

        return LearningPath(
            concepts=ordered,
            estimated_time=total_time,
            difficulty_curve=difficulty_curve,
            coherence_score=coherence,
            total_concepts=len(ordered),
            prerequisites_satisfied=True,
        )

    def _find_required_concepts(
        self,
        targets: Set[str],
        known: Set[str],
    ) -> Set[str]:
        """Find all concepts required to learn targets."""
        required = set()
        queue = deque(targets)

        while queue:
            concept = queue.popleft()

            if concept in known:
                continue

            if concept in required:
                continue

            required.add(concept)

            # Add prerequisites
            prereqs = self._prerequisites.get(concept, set())
            for prereq in prereqs:
                if prereq not in known and prereq not in required:
                    queue.append(prereq)

        return required

    def _topological_sort(
        self,
        concepts: Set[str],
        known: Set[str],
    ) -> List[str]:
        """Sort concepts respecting prerequisite order."""
        # Build in-degree map
        in_degree = {c: 0 for c in concepts}
        for concept in concepts:
            prereqs = self._prerequisites.get(concept, set())
            relevant_prereqs = prereqs.intersection(concepts)
            in_degree[concept] = len(relevant_prereqs)

        # Kahn's algorithm
        queue = [c for c, d in in_degree.items() if d == 0]
        heapq.heapify(queue)  # Use heap for deterministic ordering
        result = []

        while queue:
            current = heapq.heappop(queue)
            result.append(current)

            # Update in-degrees
            for dependent in self._dependents.get(current, set()):
                if dependent in in_degree:
                    in_degree[dependent] -= 1
                    if in_degree[dependent] == 0:
                        heapq.heappush(queue, dependent)

        return result

    def _optimize_for_easiest(self, concepts: List[str]) -> List[str]:
        """Reorder to minimize difficulty jumps."""
        if len(concepts) <= 1:
            return concepts

        # Group by difficulty
        by_difficulty: Dict[int, List[str]] = {}
        for c in concepts:
            diff = int(self._get_difficulty(c))
            if diff not in by_difficulty:
                by_difficulty[diff] = []
            by_difficulty[diff].append(c)

        # Order by increasing difficulty
        result = []
        for diff in sorted(by_difficulty.keys()):
            result.extend(by_difficulty[diff])

        # Verify prerequisites are still satisfied
        return self._fix_prerequisite_order(result)

    def _optimize_for_fastest(self, concepts: List[str]) -> List[str]:
        """Reorder to minimize total time (prefer easier concepts)."""
        # Sort by time estimate
        return sorted(concepts, key=lambda c: self._get_time(c))

    def _optimize_for_coherence(self, concepts: List[str]) -> List[str]:
        """Reorder to maximize thematic coherence."""
        if len(concepts) <= 1:
            return concepts

        result = [concepts[0]]
        remaining = set(concepts[1:])

        while remaining:
            current = result[-1]
            current_domain = self._get_domain(current)
            current_topics = set(self._get_topics(current))

            # Score remaining concepts
            best_score = -float("inf")
            best_concept = None

            for concept in remaining:
                # Check if prerequisites are satisfied
                prereqs = self._prerequisites.get(concept, set())
                if not prereqs.issubset(set(result)):
                    continue

                score = 0.0

                # Domain continuity
                if self._get_domain(concept) == current_domain:
                    score += 1.0 - self.config.domain_switch_penalty

                # Topic overlap
                concept_topics = set(self._get_topics(concept))
                overlap = len(current_topics & concept_topics)
                score += overlap * self.config.topic_continuity_bonus

                # Difficulty progression
                diff_diff = self._get_difficulty(concept) - self._get_difficulty(current)
                if self.config.prefer_gradual_difficulty:
                    if 0 <= diff_diff <= 1:
                        score += 0.3  # Gradual increase is good
                    elif diff_diff > 1:
                        score -= self.config.difficulty_jump_penalty * diff_diff

                if score > best_score:
                    best_score = score
                    best_concept = concept

            if best_concept:
                result.append(best_concept)
                remaining.remove(best_concept)
            else:
                # No valid concept found, add any remaining
                next_concept = remaining.pop()
                result.append(next_concept)

        return result

    def _fix_prerequisite_order(self, concepts: List[str]) -> List[str]:
        """Ensure prerequisites come before dependents."""
        result = []
        added = set()

        def add_with_prereqs(concept: str):
            if concept in added:
                return
            prereqs = self._prerequisites.get(concept, set())
            for prereq in prereqs:
                if prereq in concepts and prereq not in added:
                    add_with_prereqs(prereq)
            result.append(concept)
            added.add(concept)

        for concept in concepts:
            add_with_prereqs(concept)

        return result

    def _calculate_coherence(self, concepts: List[str]) -> float:
        """Calculate coherence score for a path."""
        if len(concepts) <= 1:
            return 1.0

        scores = []
        for i in range(len(concepts) - 1):
            current = concepts[i]
            next_c = concepts[i + 1]

            score = 1.0

            # Domain continuity
            if self._get_domain(current) != self._get_domain(next_c):
                score -= self.config.domain_switch_penalty

            # Topic overlap
            current_topics = set(self._get_topics(current))
            next_topics = set(self._get_topics(next_c))
            if current_topics and next_topics:
                overlap = len(current_topics & next_topics) / len(current_topics | next_topics)
                score += overlap * self.config.topic_continuity_bonus

            # Difficulty progression
            diff_jump = abs(self._get_difficulty(next_c) - self._get_difficulty(current))
            if diff_jump > 1:
                score -= self.config.difficulty_jump_penalty * (diff_jump - 1)

            scores.append(max(0, score))

        return sum(scores) / len(scores) if scores else 1.0

    def suggest_next(
        self,
        known_concepts: List[str],
        goal: Optional[str] = None,
        num_suggestions: int = 3,
    ) -> List[str]:
        """
        Suggest next concepts to learn.

        Args:
            known_concepts: Already known concepts
            goal: Optional goal concept
            num_suggestions: Number of suggestions

        Returns:
            List of suggested next concepts
        """
        known = {k.lower() for k in known_concepts}

        # Find unlocked concepts (all prerequisites satisfied)
        unlocked = []
        for concept, prereqs in self._prerequisites.items():
            if concept not in known and prereqs.issubset(known):
                unlocked.append(concept)

        if not unlocked:
            # Suggest foundation concepts
            all_concepts = set(self._concept_metadata.keys())
            foundation = [c for c in all_concepts if c not in known and not self._prerequisites.get(c)]
            unlocked = foundation[:num_suggestions]

        # Score suggestions
        scored = []
        for concept in unlocked:
            score = 0.0

            # Prefer lower difficulty if no goal
            diff = self._get_difficulty(concept)
            score -= diff * 0.1

            # Boost if leads to goal
            if goal:
                goal_lower = goal.lower()
                if concept in self._get_path_to(goal_lower, known):
                    score += 2.0

            # Boost if unlocks many new concepts
            unlocks = len(self._dependents.get(concept, set()))
            score += unlocks * 0.2

            scored.append((concept, score))

        # Sort by score
        scored.sort(key=lambda x: x[1], reverse=True)
        return [c for c, _ in scored[:num_suggestions]]

    def _get_path_to(self, target: str, known: Set[str]) -> Set[str]:
        """Get all concepts on path to target."""
        path = set()
        queue = deque([target])

        while queue:
            concept = queue.popleft()
            if concept in known:
                continue
            if concept in path:
                continue
            path.add(concept)

            prereqs = self._prerequisites.get(concept, set())
            for prereq in prereqs:
                if prereq not in known:
                    queue.append(prereq)

        return path

    def estimate_time_to_goal(
        self,
        known_concepts: List[str],
        goal_concepts: List[str],
    ) -> float:
        """
        Estimate time to reach goal concepts.

        Args:
            known_concepts: Already known concepts
            goal_concepts: Target concepts

        Returns:
            Estimated hours to learn all required concepts
        """
        path = self.optimize(goal_concepts, known_concepts)
        return path.estimated_time

    def get_path_details(
        self,
        path: LearningPath,
    ) -> List[PathStep]:
        """
        Get detailed information for each step in a path.

        Args:
            path: Learning path to detail

        Returns:
            List of PathStep objects
        """
        steps = []
        learned = set()

        for concept in path.concepts:
            prereqs = self._prerequisites.get(concept, set())
            covered_prereqs = list(prereqs.intersection(learned))

            # Skills gained are concepts this unlocks
            skills = [d for d in self._dependents.get(concept, set())]

            steps.append(PathStep(
                concept=concept,
                difficulty=self._get_difficulty(concept),
                estimated_time=self._get_time(concept),
                prerequisites_covered=covered_prereqs,
                skills_gained=skills,
            ))

            learned.add(concept)

        return steps

    def compare_paths(
        self,
        path1: LearningPath,
        path2: LearningPath,
    ) -> Dict[str, Any]:
        """Compare two learning paths."""
        return {
            "time_difference": path1.estimated_time - path2.estimated_time,
            "coherence_difference": path1.coherence_score - path2.coherence_score,
            "length_difference": len(path1.concepts) - len(path2.concepts),
            "avg_difficulty_1": np.mean(path1.difficulty_curve) if path1.difficulty_curve else 0,
            "avg_difficulty_2": np.mean(path2.difficulty_curve) if path2.difficulty_curve else 0,
            "common_concepts": len(set(path1.concepts) & set(path2.concepts)),
        }

    def add_concept(
        self,
        concept: str,
        domain: str,
        difficulty: int,
        topics: List[str],
        prerequisites: Optional[List[str]] = None,
    ):
        """Add a new concept to the optimizer."""
        concept_lower = concept.lower()

        self._concept_metadata[concept_lower] = {
            "domain": domain,
            "difficulty": difficulty,
            "topics": topics,
        }

        if prerequisites:
            self._prerequisites[concept_lower] = {p.lower() for p in prerequisites}
            for prereq in prerequisites:
                prereq_lower = prereq.lower()
                if prereq_lower not in self._dependents:
                    self._dependents[prereq_lower] = set()
                self._dependents[prereq_lower].add(concept_lower)
