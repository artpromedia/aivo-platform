"""
Prerequisite Predictor

Predict prerequisite relationships between educational concepts
using graph traversal, embeddings, and ML models.
"""
import logging
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Set, Tuple, Any
from collections import deque

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class PrerequisitePrediction:
    """Represents a prerequisite prediction result."""
    concept: str
    prerequisites: List[str]
    confidence_scores: Dict[str, float]
    depth: int  # How many levels of prerequisites
    total_learning_units: int = 0
    difficulty_progression: List[float] = field(default_factory=list)


@dataclass
class PrerequisiteChain:
    """A chain of prerequisites from basic to advanced."""
    target_concept: str
    chain: List[List[str]]  # Each level contains concepts at that depth
    total_depth: int
    estimated_learning_time: float  # in hours


@dataclass
class PrerequisitePredictorConfig:
    """Configuration for prerequisite prediction."""
    # Graph-based settings
    max_depth: int = 5
    confidence_threshold: float = 0.5

    # Embedding-based settings
    use_embeddings: bool = True
    embedding_dim: int = 128

    # Curriculum knowledge
    use_curriculum_data: bool = True

    # Time estimates (hours per concept)
    default_concept_time: float = 2.0
    time_per_difficulty: Dict[str, float] = field(default_factory=lambda: {
        "beginner": 1.0,
        "intermediate": 2.0,
        "advanced": 4.0,
    })


# Curriculum-based prerequisite knowledge
PREREQUISITE_KNOWLEDGE = {
    # Mathematics
    "calculus": ["algebra", "trigonometry", "functions"],
    "differential equations": ["calculus", "linear algebra"],
    "linear algebra": ["algebra", "matrices"],
    "trigonometry": ["geometry", "algebra"],
    "algebra": ["arithmetic", "fractions"],
    "geometry": ["arithmetic", "measurement"],
    "statistics": ["algebra", "probability"],
    "probability": ["fractions", "percentages"],

    # Physics
    "mechanics": ["calculus", "vectors", "algebra"],
    "electromagnetism": ["calculus", "mechanics", "vectors"],
    "thermodynamics": ["calculus", "chemistry basics"],
    "quantum mechanics": ["linear algebra", "differential equations", "mechanics"],

    # Computer Science
    "data structures": ["programming", "algorithms basics"],
    "algorithms": ["data structures", "discrete math"],
    "machine learning": ["linear algebra", "statistics", "programming"],
    "deep learning": ["machine learning", "calculus"],
    "programming": ["logic", "arithmetic"],
    "databases": ["data structures", "programming"],

    # Chemistry
    "organic chemistry": ["general chemistry", "molecular structure"],
    "general chemistry": ["algebra", "atoms", "periodic table"],
    "biochemistry": ["organic chemistry", "biology basics"],

    # Biology
    "genetics": ["cell biology", "chemistry basics"],
    "cell biology": ["biology basics", "chemistry basics"],
    "evolution": ["genetics", "biology basics"],
    "ecology": ["biology basics", "statistics"],
}

# Concept difficulty levels
CONCEPT_DIFFICULTY = {
    "arithmetic": 1, "fractions": 1, "measurement": 1,
    "algebra": 2, "geometry": 2, "logic": 2,
    "trigonometry": 3, "statistics": 3, "probability": 3,
    "calculus": 4, "linear algebra": 4, "programming": 3,
    "differential equations": 5, "data structures": 4,
    "machine learning": 5, "quantum mechanics": 6,
}


class PrerequisitePredictor:
    """
    Predict prerequisite relationships between concepts.

    Features:
    - Direct prerequisite prediction
    - Transitive prerequisite chain
    - Prerequisite strength scoring
    - Learning sequence validation

    Usage:
        predictor = PrerequisitePredictor()
        prereqs = predictor.predict("calculus")
        print(prereqs.prerequisites)  # ["algebra", "trigonometry"]
    """

    def __init__(
        self,
        config: Optional[PrerequisitePredictorConfig] = None,
        graph_path: Optional[str] = None,
    ):
        self.config = config or PrerequisitePredictorConfig()
        self.graph_path = graph_path

        # Internal graph representation
        self._prerequisite_graph: Dict[str, Set[str]] = {}
        self._reverse_graph: Dict[str, Set[str]] = {}  # What concepts require this?
        self._concept_metadata: Dict[str, Dict[str, Any]] = {}

        # Load default knowledge
        self._load_default_knowledge()

        logger.info("PrerequisitePredictor initialized")

    def _load_default_knowledge(self):
        """Load default curriculum-based prerequisite knowledge."""
        if self.config.use_curriculum_data:
            for concept, prereqs in PREREQUISITE_KNOWLEDGE.items():
                self._prerequisite_graph[concept.lower()] = {p.lower() for p in prereqs}

                # Build reverse graph
                for prereq in prereqs:
                    prereq_lower = prereq.lower()
                    if prereq_lower not in self._reverse_graph:
                        self._reverse_graph[prereq_lower] = set()
                    self._reverse_graph[prereq_lower].add(concept.lower())

    def add_prerequisite(
        self,
        concept: str,
        prerequisite: str,
        confidence: float = 1.0,
    ):
        """Add a prerequisite relationship."""
        concept_lower = concept.lower()
        prereq_lower = prerequisite.lower()

        if concept_lower not in self._prerequisite_graph:
            self._prerequisite_graph[concept_lower] = set()
        self._prerequisite_graph[concept_lower].add(prereq_lower)

        if prereq_lower not in self._reverse_graph:
            self._reverse_graph[prereq_lower] = set()
        self._reverse_graph[prereq_lower].add(concept_lower)

    def predict(
        self,
        concept: str,
        max_depth: int = 3,
        include_indirect: bool = True,
    ) -> PrerequisitePrediction:
        """
        Predict prerequisites for a concept.

        Args:
            concept: Target concept
            max_depth: Maximum depth of prerequisite chain
            include_indirect: Include transitive prerequisites

        Returns:
            PrerequisitePrediction with prerequisites and confidence scores
        """
        concept_lower = concept.lower()
        all_prereqs: Dict[str, Tuple[int, float]] = {}  # prereq -> (depth, confidence)

        # BFS to find prerequisites
        queue = deque([(concept_lower, 0, 1.0)])  # (concept, depth, confidence)
        visited = {concept_lower}

        while queue:
            current, depth, conf = queue.popleft()

            if depth >= max_depth:
                continue

            # Get direct prerequisites
            direct_prereqs = self._prerequisite_graph.get(current, set())

            for prereq in direct_prereqs:
                if prereq not in visited:
                    visited.add(prereq)
                    # Confidence decreases with depth
                    prereq_conf = conf * 0.9

                    if prereq not in all_prereqs or all_prereqs[prereq][1] < prereq_conf:
                        all_prereqs[prereq] = (depth + 1, prereq_conf)

                    if include_indirect:
                        queue.append((prereq, depth + 1, prereq_conf))

        # Sort by depth (closer prerequisites first)
        sorted_prereqs = sorted(all_prereqs.items(), key=lambda x: (x[1][0], -x[1][1]))
        prerequisites = [p[0] for p in sorted_prereqs]
        confidence_scores = {p: conf for p, (_, conf) in all_prereqs.items()}

        # Calculate difficulty progression
        difficulty_progression = []
        for prereq in prerequisites:
            diff = CONCEPT_DIFFICULTY.get(prereq, 3)
            difficulty_progression.append(float(diff))

        return PrerequisitePrediction(
            concept=concept,
            prerequisites=prerequisites,
            confidence_scores=confidence_scores,
            depth=max(d for _, (d, _) in all_prereqs.items()) if all_prereqs else 0,
            total_learning_units=len(prerequisites),
            difficulty_progression=difficulty_progression,
        )

    def get_prerequisite_chain(
        self,
        concept: str,
        max_depth: int = 5,
    ) -> PrerequisiteChain:
        """
        Get full prerequisite chain organized by levels.

        Args:
            concept: Target concept
            max_depth: Maximum depth to traverse

        Returns:
            PrerequisiteChain with concepts organized by level
        """
        concept_lower = concept.lower()
        levels: List[List[str]] = []
        visited = {concept_lower}
        current_level = [concept_lower]

        for depth in range(max_depth):
            next_level = []

            for current in current_level:
                prereqs = self._prerequisite_graph.get(current, set())
                for prereq in prereqs:
                    if prereq not in visited:
                        visited.add(prereq)
                        next_level.append(prereq)

            if next_level:
                levels.append(next_level)
                current_level = next_level
            else:
                break

        # Reverse so basic concepts come first
        levels.reverse()

        # Calculate estimated learning time
        total_time = 0.0
        for level in levels:
            for concept_name in level:
                diff = CONCEPT_DIFFICULTY.get(concept_name, 3)
                if diff <= 2:
                    time = self.config.time_per_difficulty["beginner"]
                elif diff <= 4:
                    time = self.config.time_per_difficulty["intermediate"]
                else:
                    time = self.config.time_per_difficulty["advanced"]
                total_time += time

        return PrerequisiteChain(
            target_concept=concept,
            chain=levels,
            total_depth=len(levels),
            estimated_learning_time=total_time,
        )

    def validate_ordering(
        self,
        concept_sequence: List[str],
    ) -> Dict[str, Any]:
        """
        Validate if a sequence of concepts respects prerequisite relationships.

        Args:
            concept_sequence: Ordered list of concepts

        Returns:
            Validation result with violations and suggestions
        """
        sequence_lower = [c.lower() for c in concept_sequence]
        learned = set()
        violations = []
        suggestions = []

        for i, concept in enumerate(sequence_lower):
            prereqs = self._prerequisite_graph.get(concept, set())
            missing = prereqs - learned

            if missing:
                violations.append({
                    "concept": concept,
                    "position": i,
                    "missing_prerequisites": list(missing),
                })

                # Suggest where missing concepts should be inserted
                for miss in missing:
                    # Find first concept that requires this as prereq
                    first_dependent = None
                    for j, c in enumerate(sequence_lower[:i]):
                        if miss in self._prerequisite_graph.get(c, set()):
                            first_dependent = j
                            break

                    suggestions.append({
                        "concept": miss,
                        "suggested_position": first_dependent if first_dependent else 0,
                        "reason": f"Required before learning {concept}",
                    })

            learned.add(concept)

        # Calculate validity score
        total_prereq_checks = sum(
            len(self._prerequisite_graph.get(c, set()))
            for c in sequence_lower
        )
        violations_count = sum(len(v["missing_prerequisites"]) for v in violations)
        validity_score = 1.0 - (violations_count / max(total_prereq_checks, 1))

        return {
            "is_valid": len(violations) == 0,
            "validity_score": validity_score,
            "violations": violations,
            "suggestions": suggestions,
            "total_concepts": len(concept_sequence),
        }

    def get_unlocked_concepts(
        self,
        known_concepts: List[str],
    ) -> List[str]:
        """
        Get concepts that can be learned given current knowledge.

        Args:
            known_concepts: List of already known concepts

        Returns:
            List of concepts whose prerequisites are satisfied
        """
        known_set = {c.lower() for c in known_concepts}
        unlocked = []

        for concept, prereqs in self._prerequisite_graph.items():
            if concept not in known_set:
                if prereqs.issubset(known_set):
                    unlocked.append(concept)

        # Sort by difficulty
        unlocked.sort(key=lambda c: CONCEPT_DIFFICULTY.get(c, 3))
        return unlocked

    def get_dependents(
        self,
        concept: str,
    ) -> List[str]:
        """
        Get concepts that require this concept as a prerequisite.

        Args:
            concept: Source concept

        Returns:
            List of dependent concepts
        """
        return list(self._reverse_graph.get(concept.lower(), set()))

    def estimate_learning_path(
        self,
        target_concept: str,
        known_concepts: List[str],
    ) -> Dict[str, Any]:
        """
        Estimate the learning path from current knowledge to target.

        Args:
            target_concept: Goal concept
            known_concepts: Already known concepts

        Returns:
            Learning path estimation with time and concepts
        """
        target_lower = target_concept.lower()
        known_set = {c.lower() for c in known_concepts}

        if target_lower in known_set:
            return {
                "target_achieved": True,
                "concepts_to_learn": [],
                "estimated_time": 0.0,
            }

        # Get all prerequisites
        prediction = self.predict(target_lower, max_depth=self.config.max_depth)

        # Filter out known concepts
        to_learn = [p for p in prediction.prerequisites if p not in known_set]

        # Add target if not in prerequisites
        if target_lower not in to_learn:
            to_learn.append(target_lower)

        # Calculate time
        total_time = 0.0
        for concept in to_learn:
            diff = CONCEPT_DIFFICULTY.get(concept, 3)
            if diff <= 2:
                time = self.config.time_per_difficulty["beginner"]
            elif diff <= 4:
                time = self.config.time_per_difficulty["intermediate"]
            else:
                time = self.config.time_per_difficulty["advanced"]
            total_time += time

        return {
            "target_achieved": False,
            "concepts_to_learn": to_learn,
            "estimated_time": total_time,
            "num_concepts": len(to_learn),
        }

    def find_common_prerequisites(
        self,
        concepts: List[str],
    ) -> List[str]:
        """
        Find prerequisites common to multiple concepts.

        Args:
            concepts: List of concepts

        Returns:
            List of common prerequisites
        """
        if not concepts:
            return []

        # Get prerequisites for each concept
        prereq_sets = []
        for concept in concepts:
            prediction = self.predict(concept, max_depth=self.config.max_depth)
            prereq_sets.append(set(prediction.prerequisites))

        # Find intersection
        common = prereq_sets[0]
        for prereqs in prereq_sets[1:]:
            common = common.intersection(prereqs)

        return list(common)

    def suggest_prerequisite(
        self,
        concept: str,
        candidate_prereqs: List[str],
    ) -> List[Tuple[str, float]]:
        """
        Score candidate prerequisites for a concept.

        Args:
            concept: Target concept
            candidate_prereqs: Potential prerequisites

        Returns:
            Sorted list of (candidate, score) tuples
        """
        scores = []

        # Get existing prerequisites
        existing = self._prerequisite_graph.get(concept.lower(), set())

        for candidate in candidate_prereqs:
            candidate_lower = candidate.lower()
            score = 0.0

            # Check if already a prerequisite
            if candidate_lower in existing:
                score = 1.0
            else:
                # Check difficulty progression
                concept_diff = CONCEPT_DIFFICULTY.get(concept.lower(), 3)
                candidate_diff = CONCEPT_DIFFICULTY.get(candidate_lower, 3)

                if candidate_diff < concept_diff:
                    # Good: prerequisite is easier
                    score += 0.5 * (1 - (candidate_diff / max(concept_diff, 1)))

                # Check if candidate is prereq of existing prereqs
                for existing_prereq in existing:
                    existing_prereqs = self._prerequisite_graph.get(existing_prereq, set())
                    if candidate_lower in existing_prereqs:
                        score += 0.3

            scores.append((candidate, score))

        scores.sort(key=lambda x: x[1], reverse=True)
        return scores

    def get_concept_info(self, concept: str) -> Dict[str, Any]:
        """Get information about a concept."""
        concept_lower = concept.lower()
        prereqs = list(self._prerequisite_graph.get(concept_lower, set()))
        dependents = list(self._reverse_graph.get(concept_lower, set()))
        difficulty = CONCEPT_DIFFICULTY.get(concept_lower, 3)

        return {
            "concept": concept,
            "difficulty": difficulty,
            "direct_prerequisites": prereqs,
            "direct_dependents": dependents,
            "num_prerequisites": len(prereqs),
            "num_dependents": len(dependents),
        }
