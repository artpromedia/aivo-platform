"""
Path Optimizer Service

Optimize learning paths using graph algorithms including:
- Topological sort for prerequisite ordering
- Shortest path for efficient learning
- Personalized PageRank for relevance
- Weighted paths for difficulty balancing
"""
import logging
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Set, Tuple, Any
from collections import deque
from enum import Enum
import heapq
import random

import numpy as np

logger = logging.getLogger(__name__)


class LearningStyle(str, Enum):
    """Learning style preferences."""
    VISUAL = "visual"
    AUDITORY = "auditory"
    KINESTHETIC = "kinesthetic"
    READING_WRITING = "reading_writing"
    SEQUENTIAL = "sequential"
    GLOBAL = "global"


@dataclass
class Resource:
    """Learning resource for a concept."""
    id: str
    title: str
    resource_type: str  # video, article, exercise, simulation
    url: Optional[str] = None
    duration_minutes: int = 30
    difficulty: float = 0.5
    learning_styles: List[str] = field(default_factory=list)


@dataclass
class PathStep:
    """A single step in an optimized learning path."""
    concept_id: str
    concept_name: str
    estimated_duration_minutes: int
    difficulty: float
    resources: List[Resource] = field(default_factory=list)
    assessment_available: bool = False
    rationale: str = ""
    prerequisites_met: List[str] = field(default_factory=list)
    skills_unlocked: List[str] = field(default_factory=list)


@dataclass
class PathConstraints:
    """Constraints for path optimization."""
    max_concepts: Optional[int] = None
    max_duration_hours: Optional[float] = None
    difficulty_range: Tuple[float, float] = (0.0, 1.0)
    include_concepts: List[str] = field(default_factory=list)
    exclude_concepts: List[str] = field(default_factory=list)
    learning_style: Optional[str] = None
    prefer_spaced_repetition: bool = False
    interleaving_enabled: bool = False
    zpd_factor: float = 0.7  # Zone of Proximal Development factor


@dataclass
class OptimizedPath:
    """Result of path optimization."""
    steps: List[PathStep]
    total_duration_hours: float
    difficulty_curve: List[float]
    rationale: str
    optimization_score: float = 0.0
    constraints_satisfied: bool = True
    warnings: List[str] = field(default_factory=list)


@dataclass
class PersonalizedPath:
    """Personalized learning path based on student profile."""
    path: OptimizedPath
    student_id: str
    adaptation_notes: List[str]
    difficulty_adjustments: Dict[str, float]
    estimated_completion_date: Optional[str] = None
    confidence_score: float = 0.0


@dataclass
class StudentProfile:
    """Student profile for personalization."""
    student_id: str
    known_concepts: List[str] = field(default_factory=list)
    mastery_levels: Dict[str, float] = field(default_factory=dict)
    learning_style: Optional[str] = None
    learning_pace: float = 1.0  # Multiplier for time estimates
    difficulty_preference: str = "moderate"  # easy, moderate, challenging
    available_hours_per_week: float = 10.0
    strengths: List[str] = field(default_factory=list)
    weaknesses: List[str] = field(default_factory=list)


@dataclass
class PathOptimizerConfig:
    """Configuration for path optimization."""
    max_path_length: int = 100
    default_concept_duration_minutes: int = 60
    difficulty_weight: float = 0.3
    coherence_weight: float = 0.3
    efficiency_weight: float = 0.4
    pagerank_damping: float = 0.85
    pagerank_iterations: int = 100
    zpd_lower_bound: float = 0.4
    zpd_upper_bound: float = 0.8
    spaced_repetition_interval: int = 5  # Concepts between revisits
    interleaving_window: int = 3  # Mix concepts within this window


# Concept knowledge base
CONCEPT_DATA = {
    # Mathematics
    "arithmetic": {
        "name": "Arithmetic",
        "domain": "math",
        "difficulty": 0.1,
        "duration_minutes": 120,
        "prerequisites": [],
        "assessment": True,
        "topics": ["numbers", "operations"],
    },
    "fractions": {
        "name": "Fractions",
        "domain": "math",
        "difficulty": 0.2,
        "duration_minutes": 90,
        "prerequisites": ["arithmetic"],
        "assessment": True,
        "topics": ["numbers", "ratios"],
    },
    "algebra": {
        "name": "Algebra",
        "domain": "math",
        "difficulty": 0.4,
        "duration_minutes": 180,
        "prerequisites": ["arithmetic", "fractions"],
        "assessment": True,
        "topics": ["equations", "variables"],
    },
    "geometry": {
        "name": "Geometry",
        "domain": "math",
        "difficulty": 0.35,
        "duration_minutes": 150,
        "prerequisites": ["arithmetic"],
        "assessment": True,
        "topics": ["shapes", "space"],
    },
    "trigonometry": {
        "name": "Trigonometry",
        "domain": "math",
        "difficulty": 0.5,
        "duration_minutes": 180,
        "prerequisites": ["algebra", "geometry"],
        "assessment": True,
        "topics": ["angles", "triangles"],
    },
    "calculus": {
        "name": "Calculus",
        "domain": "math",
        "difficulty": 0.7,
        "duration_minutes": 300,
        "prerequisites": ["algebra", "trigonometry"],
        "assessment": True,
        "topics": ["limits", "derivatives", "integrals"],
    },
    "linear_algebra": {
        "name": "Linear Algebra",
        "domain": "math",
        "difficulty": 0.65,
        "duration_minutes": 240,
        "prerequisites": ["algebra"],
        "assessment": True,
        "topics": ["matrices", "vectors"],
    },
    "differential_equations": {
        "name": "Differential Equations",
        "domain": "math",
        "difficulty": 0.8,
        "duration_minutes": 300,
        "prerequisites": ["calculus", "linear_algebra"],
        "assessment": True,
        "topics": ["equations", "derivatives"],
    },
    "statistics": {
        "name": "Statistics",
        "domain": "math",
        "difficulty": 0.5,
        "duration_minutes": 180,
        "prerequisites": ["algebra"],
        "assessment": True,
        "topics": ["data", "analysis"],
    },
    "probability": {
        "name": "Probability",
        "domain": "math",
        "difficulty": 0.5,
        "duration_minutes": 150,
        "prerequisites": ["fractions", "algebra"],
        "assessment": True,
        "topics": ["chance", "distributions"],
    },
    # Computer Science
    "programming_basics": {
        "name": "Programming Basics",
        "domain": "cs",
        "difficulty": 0.3,
        "duration_minutes": 180,
        "prerequisites": ["arithmetic"],
        "assessment": True,
        "topics": ["code", "logic"],
    },
    "data_structures": {
        "name": "Data Structures",
        "domain": "cs",
        "difficulty": 0.55,
        "duration_minutes": 240,
        "prerequisites": ["programming_basics"],
        "assessment": True,
        "topics": ["arrays", "trees", "graphs"],
    },
    "algorithms": {
        "name": "Algorithms",
        "domain": "cs",
        "difficulty": 0.65,
        "duration_minutes": 300,
        "prerequisites": ["data_structures"],
        "assessment": True,
        "topics": ["sorting", "searching", "optimization"],
    },
    "machine_learning": {
        "name": "Machine Learning",
        "domain": "cs",
        "difficulty": 0.75,
        "duration_minutes": 360,
        "prerequisites": ["linear_algebra", "statistics", "programming_basics"],
        "assessment": True,
        "topics": ["models", "training", "prediction"],
    },
    "deep_learning": {
        "name": "Deep Learning",
        "domain": "cs",
        "difficulty": 0.85,
        "duration_minutes": 420,
        "prerequisites": ["machine_learning", "calculus"],
        "assessment": True,
        "topics": ["neural_networks", "backpropagation"],
    },
    # Science
    "physics_mechanics": {
        "name": "Physics: Mechanics",
        "domain": "science",
        "difficulty": 0.55,
        "duration_minutes": 240,
        "prerequisites": ["calculus", "algebra"],
        "assessment": True,
        "topics": ["forces", "motion", "energy"],
    },
    "chemistry_basics": {
        "name": "Chemistry Basics",
        "domain": "science",
        "difficulty": 0.45,
        "duration_minutes": 180,
        "prerequisites": ["algebra"],
        "assessment": True,
        "topics": ["elements", "reactions", "bonds"],
    },
    "biology_basics": {
        "name": "Biology Basics",
        "domain": "science",
        "difficulty": 0.35,
        "duration_minutes": 150,
        "prerequisites": [],
        "assessment": True,
        "topics": ["cells", "organisms", "ecosystems"],
    },
    "genetics": {
        "name": "Genetics",
        "domain": "science",
        "difficulty": 0.6,
        "duration_minutes": 210,
        "prerequisites": ["biology_basics", "probability"],
        "assessment": True,
        "topics": ["dna", "inheritance", "evolution"],
    },
}


class PathOptimizer:
    """
    Optimize learning paths using graph algorithms.

    Algorithms:
    - Topological sort for prerequisite ordering
    - Shortest path for efficient learning
    - Personalized PageRank for relevance
    - Weighted paths for difficulty balancing

    Considerations:
    - Zone of Proximal Development (not too easy, not too hard)
    - Spaced repetition (revisit concepts)
    - Interleaving (mix related concepts)

    Usage:
        optimizer = PathOptimizer()
        path = optimizer.optimize_path(
            start_concepts=["arithmetic"],
            target_concepts=["calculus"],
            constraints=PathConstraints(max_duration_hours=20)
        )
    """

    def __init__(
        self,
        config: Optional[PathOptimizerConfig] = None,
        concept_data: Optional[Dict[str, Dict]] = None,
    ):
        self.config = config or PathOptimizerConfig()
        self._concept_data = concept_data or {**CONCEPT_DATA}

        # Build graph structures
        self._adjacency: Dict[str, Set[str]] = {}  # concept -> dependents
        self._reverse_adjacency: Dict[str, Set[str]] = {}  # concept -> prerequisites
        self._all_concepts: Set[str] = set()

        self._build_graph()
        logger.info(f"PathOptimizer initialized with {len(self._all_concepts)} concepts")

    def _build_graph(self):
        """Build prerequisite graph from concept data."""
        for concept_id, data in self._concept_data.items():
            self._all_concepts.add(concept_id)
            prerequisites = data.get("prerequisites", [])

            # Reverse adjacency (concept -> its prerequisites)
            self._reverse_adjacency[concept_id] = set(prerequisites)

            # Forward adjacency (prerequisite -> concepts that depend on it)
            for prereq in prerequisites:
                if prereq not in self._adjacency:
                    self._adjacency[prereq] = set()
                self._adjacency[prereq].add(concept_id)

    def _get_concept_info(self, concept_id: str) -> Dict[str, Any]:
        """Get concept information with defaults."""
        return self._concept_data.get(concept_id, {
            "name": concept_id.replace("_", " ").title(),
            "domain": "general",
            "difficulty": 0.5,
            "duration_minutes": self.config.default_concept_duration_minutes,
            "prerequisites": [],
            "assessment": False,
            "topics": [],
        })

    def optimize_path(
        self,
        start_concepts: List[str],
        target_concepts: List[str],
        constraints: Optional[PathConstraints] = None,
    ) -> OptimizedPath:
        """
        Optimize learning path from start to target concepts.

        Args:
            start_concepts: Concepts already known by the learner
            target_concepts: Concepts to learn
            constraints: Path constraints

        Returns:
            OptimizedPath with steps and metrics
        """
        constraints = constraints or PathConstraints()
        known = {c.lower() for c in start_concepts}
        targets = {c.lower() for c in target_concepts}

        # Find all required concepts
        required = self._find_required_concepts(targets, known)

        # Apply include/exclude constraints
        for concept in constraints.include_concepts:
            required.add(concept.lower())
        for concept in constraints.exclude_concepts:
            required.discard(concept.lower())

        # Topological sort respecting prerequisites
        ordered = self._topological_sort(required, known)

        # Filter by difficulty range
        ordered = [
            c for c in ordered
            if constraints.difficulty_range[0] <= self._get_concept_info(c).get("difficulty", 0.5) <= constraints.difficulty_range[1]
        ]

        # Apply max concepts constraint
        if constraints.max_concepts and len(ordered) > constraints.max_concepts:
            ordered = ordered[:constraints.max_concepts]

        # Apply ZPD optimization
        if constraints.zpd_factor > 0:
            ordered = self._apply_zpd_optimization(ordered, known, constraints.zpd_factor)

        # Apply interleaving if enabled
        if constraints.interleaving_enabled:
            ordered = self._apply_interleaving(ordered)

        # Apply spaced repetition if enabled
        if constraints.prefer_spaced_repetition:
            ordered = self._apply_spaced_repetition(ordered)

        # Build path steps
        steps = self._build_path_steps(ordered, known, constraints)

        # Apply duration constraint
        warnings = []
        if constraints.max_duration_hours:
            steps, truncated = self._truncate_by_duration(
                steps, constraints.max_duration_hours
            )
            if truncated:
                warnings.append(f"Path truncated to fit {constraints.max_duration_hours}h limit")

        # Calculate metrics
        total_duration = sum(s.estimated_duration_minutes for s in steps) / 60
        difficulty_curve = [s.difficulty for s in steps]
        optimization_score = self._calculate_optimization_score(steps, constraints)

        # Generate rationale
        rationale = self._generate_rationale(steps, targets, constraints)

        return OptimizedPath(
            steps=steps,
            total_duration_hours=total_duration,
            difficulty_curve=difficulty_curve,
            rationale=rationale,
            optimization_score=optimization_score,
            constraints_satisfied=len(warnings) == 0,
            warnings=warnings,
        )

    def find_shortest_path(
        self,
        source: str,
        target: str,
    ) -> List[str]:
        """
        Find shortest path between two concepts.

        Args:
            source: Source concept
            target: Target concept

        Returns:
            List of concepts in the shortest path
        """
        source = source.lower()
        target = target.lower()

        if source not in self._all_concepts or target not in self._all_concepts:
            return []

        if source == target:
            return [source]

        # BFS for shortest path
        queue = deque([(source, [source])])
        visited = {source}

        while queue:
            current, path = queue.popleft()

            # Check dependents (forward edges)
            for next_concept in self._adjacency.get(current, set()):
                if next_concept == target:
                    return path + [next_concept]

                if next_concept not in visited:
                    visited.add(next_concept)
                    queue.append((next_concept, path + [next_concept]))

            # Check prerequisites (backward edges) for bidirectional search
            for next_concept in self._reverse_adjacency.get(current, set()):
                if next_concept == target:
                    return path + [next_concept]

                if next_concept not in visited:
                    visited.add(next_concept)
                    queue.append((next_concept, path + [next_concept]))

        return []

    def generate_personalized_path(
        self,
        student_profile: StudentProfile,
        target_concepts: List[str],
    ) -> PersonalizedPath:
        """
        Generate personalized learning path for a student.

        Args:
            student_profile: Student's profile with learning preferences
            target_concepts: Concepts to learn

        Returns:
            PersonalizedPath adapted to student
        """
        # Create constraints based on profile
        constraints = PathConstraints(
            learning_style=student_profile.learning_style,
            zpd_factor=self._calculate_zpd_factor(student_profile),
            prefer_spaced_repetition=True,
            interleaving_enabled=student_profile.learning_style == LearningStyle.GLOBAL.value,
        )

        # Adjust difficulty based on preference
        if student_profile.difficulty_preference == "easy":
            constraints.difficulty_range = (0.0, 0.6)
        elif student_profile.difficulty_preference == "challenging":
            constraints.difficulty_range = (0.4, 1.0)
        else:
            constraints.difficulty_range = (0.2, 0.8)

        # Calculate max concepts based on available time
        if student_profile.available_hours_per_week > 0:
            avg_duration = self.config.default_concept_duration_minutes / 60
            max_concepts_per_week = int(student_profile.available_hours_per_week / avg_duration)
            constraints.max_concepts = max_concepts_per_week * 4  # 4 weeks planning window

        # Optimize path with constraints
        base_path = self.optimize_path(
            start_concepts=student_profile.known_concepts,
            target_concepts=target_concepts,
            constraints=constraints,
        )

        # Apply personalization adjustments
        adaptation_notes = []
        difficulty_adjustments = {}

        # Adjust for strengths and weaknesses
        for step in base_path.steps:
            concept_info = self._get_concept_info(step.concept_id)
            domain = concept_info.get("domain", "")

            if domain in student_profile.strengths:
                adjustment = -0.1  # Easier for strengths
                adaptation_notes.append(f"Reduced time for {step.concept_name} (strength area)")
            elif domain in student_profile.weaknesses:
                adjustment = 0.15  # More time for weaknesses
                adaptation_notes.append(f"Added time for {step.concept_name} (area to improve)")
            else:
                adjustment = 0.0

            difficulty_adjustments[step.concept_id] = adjustment
            step.estimated_duration_minutes = int(
                step.estimated_duration_minutes * (1 + adjustment) * student_profile.learning_pace
            )

        # Recalculate total duration
        base_path.total_duration_hours = sum(
            s.estimated_duration_minutes for s in base_path.steps
        ) / 60

        # Estimate completion date
        weeks_needed = base_path.total_duration_hours / student_profile.available_hours_per_week

        # Calculate confidence score
        confidence_score = self._calculate_personalization_confidence(
            student_profile, base_path
        )

        return PersonalizedPath(
            path=base_path,
            student_id=student_profile.student_id,
            adaptation_notes=adaptation_notes,
            difficulty_adjustments=difficulty_adjustments,
            estimated_completion_date=f"~{int(weeks_needed)} weeks",
            confidence_score=confidence_score,
        )

    def compute_pagerank(
        self,
        personalization: Optional[Dict[str, float]] = None,
    ) -> Dict[str, float]:
        """
        Compute PageRank scores for concepts.

        Args:
            personalization: Optional personalization vector for PPR

        Returns:
            Dict mapping concept IDs to PageRank scores
        """
        n = len(self._all_concepts)
        if n == 0:
            return {}

        concepts = list(self._all_concepts)
        concept_idx = {c: i for i, c in enumerate(concepts)}

        # Build transition matrix
        matrix = np.zeros((n, n))
        for concept in concepts:
            dependents = self._adjacency.get(concept, set())
            if dependents:
                for dep in dependents:
                    if dep in concept_idx:
                        matrix[concept_idx[dep], concept_idx[concept]] = 1.0 / len(dependents)
            else:
                # Dangling node - distribute evenly
                matrix[:, concept_idx[concept]] = 1.0 / n

        # Initialize personalization vector
        if personalization:
            p = np.zeros(n)
            for concept, score in personalization.items():
                if concept in concept_idx:
                    p[concept_idx[concept]] = score
            p = p / p.sum() if p.sum() > 0 else np.ones(n) / n
        else:
            p = np.ones(n) / n

        # Power iteration
        d = self.config.pagerank_damping
        scores = np.ones(n) / n

        for _ in range(self.config.pagerank_iterations):
            new_scores = d * matrix @ scores + (1 - d) * p
            if np.allclose(scores, new_scores):
                break
            scores = new_scores

        return {concepts[i]: float(scores[i]) for i in range(n)}

    def find_weighted_path(
        self,
        source: str,
        target: str,
        weight_fn: Optional[callable] = None,
    ) -> Tuple[List[str], float]:
        """
        Find minimum weight path using Dijkstra's algorithm.

        Args:
            source: Source concept
            target: Target concept
            weight_fn: Optional function to compute edge weights

        Returns:
            Tuple of (path, total_weight)
        """
        source = source.lower()
        target = target.lower()

        if weight_fn is None:
            # Default: weight by difficulty difference
            def weight_fn(from_c, to_c):
                from_diff = self._get_concept_info(from_c).get("difficulty", 0.5)
                to_diff = self._get_concept_info(to_c).get("difficulty", 0.5)
                return 1.0 + max(0, to_diff - from_diff)

        # Dijkstra's algorithm
        distances = {c: float("inf") for c in self._all_concepts}
        distances[source] = 0
        predecessors = {c: None for c in self._all_concepts}

        heap = [(0, source)]
        visited = set()

        while heap:
            dist, current = heapq.heappop(heap)

            if current in visited:
                continue
            visited.add(current)

            if current == target:
                break

            # Check all edges
            for next_concept in self._adjacency.get(current, set()):
                if next_concept not in visited:
                    weight = weight_fn(current, next_concept)
                    new_dist = dist + weight

                    if new_dist < distances[next_concept]:
                        distances[next_concept] = new_dist
                        predecessors[next_concept] = current
                        heapq.heappush(heap, (new_dist, next_concept))

        # Reconstruct path
        if distances[target] == float("inf"):
            return [], float("inf")

        path = []
        current = target
        while current is not None:
            path.append(current)
            current = predecessors[current]
        path.reverse()

        return path, distances[target]

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

            if concept in known or concept in required:
                continue

            if concept not in self._all_concepts:
                continue

            required.add(concept)

            # Add prerequisites
            for prereq in self._reverse_adjacency.get(concept, set()):
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
            prereqs = self._reverse_adjacency.get(concept, set())
            relevant_prereqs = prereqs.intersection(concepts) - known
            in_degree[concept] = len(relevant_prereqs)

        # Kahn's algorithm with priority queue (by difficulty)
        ready = []
        for c, d in in_degree.items():
            if d == 0:
                difficulty = self._get_concept_info(c).get("difficulty", 0.5)
                heapq.heappush(ready, (difficulty, c))

        result = []
        while ready:
            _, current = heapq.heappop(ready)
            result.append(current)

            # Update in-degrees
            for dependent in self._adjacency.get(current, set()):
                if dependent in in_degree:
                    in_degree[dependent] -= 1
                    if in_degree[dependent] == 0:
                        difficulty = self._get_concept_info(dependent).get("difficulty", 0.5)
                        heapq.heappush(ready, (difficulty, dependent))

        return result

    def _apply_zpd_optimization(
        self,
        concepts: List[str],
        known: Set[str],
        zpd_factor: float,
    ) -> List[str]:
        """
        Apply Zone of Proximal Development optimization.

        Ensures concepts are not too easy or too hard relative
        to what the learner knows.
        """
        if not concepts:
            return concepts

        # Calculate current mastery level
        known_difficulties = [
            self._get_concept_info(c).get("difficulty", 0.5)
            for c in known if c in self._all_concepts
        ]
        current_level = np.mean(known_difficulties) if known_difficulties else 0.0

        # Calculate ZPD bounds
        zpd_lower = current_level + (self.config.zpd_lower_bound - 0.5) * zpd_factor
        zpd_upper = current_level + (self.config.zpd_upper_bound - 0.5) * zpd_factor

        # Reorder concepts to prefer those in ZPD
        def zpd_score(concept):
            diff = self._get_concept_info(concept).get("difficulty", 0.5)
            if zpd_lower <= diff <= zpd_upper:
                return 0  # In ZPD - highest priority
            elif diff < zpd_lower:
                return zpd_lower - diff  # Below ZPD
            else:
                return (diff - zpd_upper) * 2  # Above ZPD (penalize more)

        # Sort by ZPD score while respecting prerequisites
        return self._stable_sort_with_constraints(concepts, zpd_score)

    def _apply_interleaving(
        self,
        concepts: List[str],
    ) -> List[str]:
        """
        Apply interleaving - mix related concepts rather than
        teaching them in blocks.
        """
        if len(concepts) <= self.config.interleaving_window:
            return concepts

        # Group by domain
        by_domain: Dict[str, List[str]] = {}
        for concept in concepts:
            domain = self._get_concept_info(concept).get("domain", "general")
            if domain not in by_domain:
                by_domain[domain] = []
            by_domain[domain].append(concept)

        # Interleave domains
        result = []
        domain_iters = {d: iter(cs) for d, cs in by_domain.items()}
        domains = list(by_domain.keys())

        while domain_iters:
            for domain in list(domains):
                try:
                    concept = next(domain_iters[domain])
                    result.append(concept)
                except StopIteration:
                    del domain_iters[domain]
                    domains.remove(domain)

        # Verify prerequisites are still satisfied
        return self._fix_prerequisite_order(result, set())

    def _apply_spaced_repetition(
        self,
        concepts: List[str],
    ) -> List[str]:
        """
        Apply spaced repetition by inserting review markers.

        Note: This adds review points rather than duplicating concepts.
        Actual review handling should be done by the caller.
        """
        # For now, we just return the concepts as-is
        # The caller can implement review scheduling
        return concepts

    def _build_path_steps(
        self,
        concepts: List[str],
        known: Set[str],
        constraints: PathConstraints,
    ) -> List[PathStep]:
        """Build detailed path steps from concept list."""
        steps = []
        learned = known.copy()

        for concept in concepts:
            info = self._get_concept_info(concept)
            prereqs = self._reverse_adjacency.get(concept, set())
            prereqs_met = list(prereqs.intersection(learned))

            # Get resources matching learning style
            resources = self._get_resources_for_concept(
                concept, constraints.learning_style
            )

            # Find skills this unlocks
            skills_unlocked = list(self._adjacency.get(concept, set()))

            step = PathStep(
                concept_id=concept,
                concept_name=info.get("name", concept.replace("_", " ").title()),
                estimated_duration_minutes=info.get(
                    "duration_minutes",
                    self.config.default_concept_duration_minutes
                ),
                difficulty=info.get("difficulty", 0.5),
                resources=resources,
                assessment_available=info.get("assessment", False),
                rationale=self._generate_step_rationale(concept, prereqs_met),
                prerequisites_met=prereqs_met,
                skills_unlocked=skills_unlocked,
            )

            steps.append(step)
            learned.add(concept)

        return steps

    def _get_resources_for_concept(
        self,
        concept: str,
        learning_style: Optional[str],
    ) -> List[Resource]:
        """Get learning resources for a concept."""
        # Simulated resource generation
        info = self._get_concept_info(concept)
        resources = []

        # Video resource
        resources.append(Resource(
            id=f"{concept}_video",
            title=f"Video: {info.get('name', concept)}",
            resource_type="video",
            duration_minutes=30,
            difficulty=info.get("difficulty", 0.5),
            learning_styles=["visual", "auditory"],
        ))

        # Reading resource
        resources.append(Resource(
            id=f"{concept}_article",
            title=f"Article: {info.get('name', concept)}",
            resource_type="article",
            duration_minutes=20,
            difficulty=info.get("difficulty", 0.5),
            learning_styles=["reading_writing"],
        ))

        # Practice resource
        resources.append(Resource(
            id=f"{concept}_exercise",
            title=f"Practice: {info.get('name', concept)}",
            resource_type="exercise",
            duration_minutes=30,
            difficulty=info.get("difficulty", 0.5) + 0.1,
            learning_styles=["kinesthetic"],
        ))

        # Filter by learning style if specified
        if learning_style:
            resources = [
                r for r in resources
                if learning_style in r.learning_styles or not r.learning_styles
            ] or resources  # Fall back to all if no matches

        return resources

    def _truncate_by_duration(
        self,
        steps: List[PathStep],
        max_hours: float,
    ) -> Tuple[List[PathStep], bool]:
        """Truncate path to fit within duration limit."""
        max_minutes = max_hours * 60
        total = 0
        truncated_steps = []

        for step in steps:
            if total + step.estimated_duration_minutes > max_minutes:
                return truncated_steps, True
            total += step.estimated_duration_minutes
            truncated_steps.append(step)

        return truncated_steps, False

    def _calculate_optimization_score(
        self,
        steps: List[PathStep],
        constraints: PathConstraints,
    ) -> float:
        """Calculate overall optimization score."""
        if not steps:
            return 0.0

        scores = []

        # Difficulty progression score (gradual is better)
        difficulties = [s.difficulty for s in steps]
        if len(difficulties) > 1:
            diffs = np.diff(difficulties)
            difficulty_score = 1.0 - np.std(diffs)
            scores.append(difficulty_score * self.config.difficulty_weight)

        # Coherence score (domain continuity)
        domains = [self._get_concept_info(s.concept_id).get("domain", "") for s in steps]
        if len(domains) > 1:
            switches = sum(1 for i in range(1, len(domains)) if domains[i] != domains[i-1])
            coherence_score = 1.0 - (switches / len(domains))
            scores.append(coherence_score * self.config.coherence_weight)

        # Efficiency score (lower total time is better)
        total_time = sum(s.estimated_duration_minutes for s in steps)
        efficiency_score = 1.0 / (1.0 + total_time / 60)  # Normalize by hours
        scores.append(efficiency_score * self.config.efficiency_weight)

        return sum(scores) / sum([
            self.config.difficulty_weight,
            self.config.coherence_weight,
            self.config.efficiency_weight,
        ]) if scores else 0.0

    def _generate_rationale(
        self,
        steps: List[PathStep],
        targets: Set[str],
        constraints: PathConstraints,
    ) -> str:
        """Generate human-readable rationale for the path."""
        if not steps:
            return "No path found with given constraints."

        parts = []

        # Overview
        parts.append(
            f"This learning path contains {len(steps)} concepts "
            f"leading to {', '.join(t.replace('_', ' ').title() for t in targets)}."
        )

        # Duration
        total_hours = sum(s.estimated_duration_minutes for s in steps) / 60
        parts.append(f"Estimated completion time: {total_hours:.1f} hours.")

        # Difficulty progression
        avg_difficulty = np.mean([s.difficulty for s in steps])
        parts.append(f"Average difficulty: {avg_difficulty:.2f}/1.0.")

        # Constraints applied
        if constraints.learning_style:
            parts.append(f"Optimized for {constraints.learning_style} learning style.")
        if constraints.zpd_factor > 0:
            parts.append("Concepts ordered by Zone of Proximal Development.")
        if constraints.interleaving_enabled:
            parts.append("Topics interleaved for better retention.")

        return " ".join(parts)

    def _generate_step_rationale(
        self,
        concept: str,
        prereqs_met: List[str],
    ) -> str:
        """Generate rationale for a single step."""
        info = self._get_concept_info(concept)
        name = info.get("name", concept.replace("_", " ").title())

        if prereqs_met:
            prereq_names = [
                self._get_concept_info(p).get("name", p.replace("_", " ").title())
                for p in prereqs_met
            ]
            return f"Learn {name} after mastering {', '.join(prereq_names)}."
        else:
            return f"Start with {name} as a foundation concept."

    def _calculate_zpd_factor(
        self,
        profile: StudentProfile,
    ) -> float:
        """Calculate ZPD factor based on student profile."""
        # Higher for students who prefer challenge
        if profile.difficulty_preference == "challenging":
            return 0.8
        elif profile.difficulty_preference == "easy":
            return 0.5
        else:
            return 0.7

    def _calculate_personalization_confidence(
        self,
        profile: StudentProfile,
        path: OptimizedPath,
    ) -> float:
        """Calculate confidence score for personalization."""
        score = 0.5  # Base score

        # Higher if we have more profile data
        if profile.learning_style:
            score += 0.1
        if profile.strengths:
            score += 0.1
        if profile.weaknesses:
            score += 0.1
        if profile.mastery_levels:
            score += 0.1

        # Adjust based on path quality
        score += path.optimization_score * 0.1

        return min(1.0, score)

    def _stable_sort_with_constraints(
        self,
        concepts: List[str],
        score_fn: callable,
    ) -> List[str]:
        """Sort concepts by score while respecting prerequisites."""
        # Simple approach: sort within valid windows
        result = []
        remaining = set(concepts)
        added = set()

        while remaining:
            # Find concepts whose prerequisites are satisfied
            available = [
                c for c in remaining
                if self._reverse_adjacency.get(c, set()).issubset(added)
            ]

            if not available:
                # Break cycle by taking any remaining
                available = list(remaining)

            # Sort available by score
            available.sort(key=score_fn)

            # Take the best one
            chosen = available[0]
            result.append(chosen)
            remaining.remove(chosen)
            added.add(chosen)

        return result

    def _fix_prerequisite_order(
        self,
        concepts: List[str],
        known: Set[str],
    ) -> List[str]:
        """Ensure prerequisites come before dependents."""
        result = []
        added = known.copy()

        def add_with_prereqs(concept: str):
            if concept in added:
                return
            prereqs = self._reverse_adjacency.get(concept, set())
            for prereq in prereqs:
                if prereq in concepts and prereq not in added:
                    add_with_prereqs(prereq)
            result.append(concept)
            added.add(concept)

        for concept in concepts:
            add_with_prereqs(concept)

        return result

    def add_concept(
        self,
        concept_id: str,
        name: str,
        domain: str,
        difficulty: float,
        duration_minutes: int,
        prerequisites: List[str],
        assessment: bool = True,
        topics: Optional[List[str]] = None,
    ):
        """Add a new concept to the optimizer."""
        concept_id = concept_id.lower()

        self._concept_data[concept_id] = {
            "name": name,
            "domain": domain,
            "difficulty": difficulty,
            "duration_minutes": duration_minutes,
            "prerequisites": prerequisites,
            "assessment": assessment,
            "topics": topics or [],
        }

        self._all_concepts.add(concept_id)
        self._reverse_adjacency[concept_id] = set(p.lower() for p in prerequisites)

        for prereq in prerequisites:
            prereq_lower = prereq.lower()
            if prereq_lower not in self._adjacency:
                self._adjacency[prereq_lower] = set()
            self._adjacency[prereq_lower].add(concept_id)

    def get_concept_dependencies(
        self,
        concept_id: str,
    ) -> Dict[str, List[str]]:
        """Get all dependencies for a concept."""
        concept_id = concept_id.lower()

        return {
            "prerequisites": list(self._reverse_adjacency.get(concept_id, set())),
            "dependents": list(self._adjacency.get(concept_id, set())),
        }

    def get_all_concepts(self) -> List[str]:
        """Get all concepts in the optimizer."""
        return list(self._all_concepts)

    def get_concept_info(self, concept_id: str) -> Dict[str, Any]:
        """Get detailed information about a concept."""
        return self._get_concept_info(concept_id.lower())
