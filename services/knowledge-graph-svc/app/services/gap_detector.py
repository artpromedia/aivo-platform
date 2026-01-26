"""
Gap Detector

Detect knowledge gaps in learner understanding using
graph analysis and prerequisite tracking.
"""
import logging
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Set, Tuple, Any
from collections import deque

logger = logging.getLogger(__name__)


@dataclass
class KnowledgeGap:
    """Represents a gap in learner's knowledge."""
    concept: str
    severity: float  # 0-1, how critical the gap is
    blocking_concepts: List[str]  # Concepts blocked by this gap
    suggested_remediation: List[str]
    gap_type: str = "missing"  # missing, weak, structural
    priority: int = 1  # 1 (high) to 5 (low)
    estimated_time_to_fill: float = 2.0  # hours
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class GapAnalysisResult:
    """Complete gap analysis result."""
    gaps: List[KnowledgeGap]
    total_gaps: int
    critical_gaps: int
    blocking_gaps: int
    estimated_remediation_time: float
    coverage_score: float  # 0-1, what percentage of knowledge is covered
    recommendations: List[str]


@dataclass
class GapDetectorConfig:
    """Configuration for gap detection."""
    # Mastery thresholds
    mastery_threshold: float = 0.7  # Below this is considered weak
    critical_threshold: float = 0.3  # Below this is critical

    # Analysis settings
    max_depth: int = 5
    include_indirect_gaps: bool = True

    # Remediation settings
    max_remediation_suggestions: int = 5


# Prerequisite relationships for gap detection
PREREQUISITE_GRAPH = {
    # Mathematics
    "calculus": ["algebra", "trigonometry", "functions"],
    "differential equations": ["calculus", "linear algebra"],
    "linear algebra": ["algebra", "matrices"],
    "trigonometry": ["geometry", "algebra"],
    "algebra": ["arithmetic", "fractions"],
    "geometry": ["arithmetic", "measurement"],
    "statistics": ["algebra", "probability"],
    "probability": ["fractions", "percentages"],

    # Computer Science
    "data structures": ["programming", "algorithms basics"],
    "algorithms": ["data structures", "discrete math"],
    "machine learning": ["linear algebra", "statistics", "programming"],
    "deep learning": ["machine learning", "calculus"],
    "programming": ["logic", "arithmetic"],

    # Science
    "physics": ["calculus", "algebra"],
    "chemistry": ["algebra", "atomic theory"],
    "biology": ["chemistry basics", "cell theory"],
    "genetics": ["biology", "probability"],
}

# Concept difficulty for time estimation
CONCEPT_DIFFICULTY = {
    "arithmetic": 1, "fractions": 1, "measurement": 1, "percentages": 1,
    "algebra": 2, "geometry": 2, "logic": 2,
    "trigonometry": 3, "statistics": 3, "probability": 3, "programming": 3,
    "calculus": 4, "linear algebra": 4, "data structures": 4,
    "differential equations": 5, "algorithms": 5, "machine learning": 5,
    "deep learning": 6, "quantum mechanics": 6,
}

# Remediation resources mapping
REMEDIATION_RESOURCES = {
    "arithmetic": ["Basic Math Practice", "Number Sense Fundamentals"],
    "algebra": ["Algebra Foundations", "Variable Equations Course"],
    "geometry": ["Geometry Basics", "Shape and Space Tutorial"],
    "trigonometry": ["Trig Functions Course", "Unit Circle Practice"],
    "calculus": ["Calculus Fundamentals", "Limits and Derivatives"],
    "programming": ["Intro to Programming", "Logic Fundamentals"],
    "statistics": ["Statistics Basics", "Data Analysis Course"],
}


class GapDetector:
    """
    Detect gaps in learner's knowledge graph.

    Analysis:
    - Missing prerequisites
    - Incomplete concept mastery
    - Structural gaps (missing connections)

    Usage:
        detector = GapDetector()
        gaps = detector.detect(learner_knowledge, target_skill)
    """

    def __init__(
        self,
        config: Optional[GapDetectorConfig] = None,
    ):
        self.config = config or GapDetectorConfig()

        # Build prerequisite graph
        self._prerequisites: Dict[str, Set[str]] = {}
        self._dependents: Dict[str, Set[str]] = {}

        self._load_prerequisites()
        logger.info("GapDetector initialized")

    def _load_prerequisites(self):
        """Load prerequisite relationships."""
        for concept, prereqs in PREREQUISITE_GRAPH.items():
            self._prerequisites[concept.lower()] = {p.lower() for p in prereqs}

            for prereq in prereqs:
                prereq_lower = prereq.lower()
                if prereq_lower not in self._dependents:
                    self._dependents[prereq_lower] = set()
                self._dependents[prereq_lower].add(concept.lower())

    def detect(
        self,
        known_concepts: List[str],
        mastery_levels: Dict[str, float],
        target_concept: Optional[str] = None,
    ) -> List[KnowledgeGap]:
        """
        Detect knowledge gaps.

        Args:
            known_concepts: List of concepts the learner knows
            mastery_levels: Dictionary mapping concepts to mastery level (0-1)
            target_concept: Optional target concept to focus analysis on

        Returns:
            List of detected KnowledgeGaps
        """
        known_set = {c.lower() for c in known_concepts}
        mastery = {k.lower(): v for k, v in mastery_levels.items()}
        gaps = []

        # 1. Detect missing prerequisites
        if target_concept:
            missing_gaps = self._detect_missing_for_target(
                target_concept.lower(), known_set, mastery
            )
            gaps.extend(missing_gaps)
        else:
            # Check all known concepts for missing prerequisites
            missing_gaps = self._detect_missing_prerequisites(known_set, mastery)
            gaps.extend(missing_gaps)

        # 2. Detect weak mastery
        weak_gaps = self._detect_weak_mastery(mastery)
        gaps.extend(weak_gaps)

        # 3. Detect structural gaps
        structural_gaps = self._detect_structural_gaps(known_set, mastery)
        gaps.extend(structural_gaps)

        # Deduplicate and merge
        gaps = self._merge_gaps(gaps)

        # Calculate blocking information
        for gap in gaps:
            gap.blocking_concepts = self._get_blocked_concepts(gap.concept, known_set)
            gap.severity = self._calculate_severity(gap, mastery)
            gap.priority = self._calculate_priority(gap)

        # Sort by priority and severity
        gaps.sort(key=lambda g: (g.priority, -g.severity))

        return gaps

    def _detect_missing_for_target(
        self,
        target: str,
        known_set: Set[str],
        mastery: Dict[str, float],
    ) -> List[KnowledgeGap]:
        """Detect missing prerequisites for a specific target."""
        gaps = []
        missing = self._find_missing_prerequisites(target, known_set)

        for concept in missing:
            gap = KnowledgeGap(
                concept=concept,
                severity=0.8,  # High severity for direct prerequisites
                blocking_concepts=[],
                suggested_remediation=self._get_remediation(concept),
                gap_type="missing",
                estimated_time_to_fill=self._estimate_time(concept),
            )
            gaps.append(gap)

        return gaps

    def _detect_missing_prerequisites(
        self,
        known_set: Set[str],
        mastery: Dict[str, float],
    ) -> List[KnowledgeGap]:
        """Detect missing prerequisites for known concepts."""
        gaps = []

        for concept in known_set:
            prereqs = self._prerequisites.get(concept, set())
            missing = prereqs - known_set

            for prereq in missing:
                gap = KnowledgeGap(
                    concept=prereq,
                    severity=0.7,
                    blocking_concepts=[],
                    suggested_remediation=self._get_remediation(prereq),
                    gap_type="missing",
                    estimated_time_to_fill=self._estimate_time(prereq),
                    metadata={"required_for": concept},
                )
                gaps.append(gap)

        return gaps

    def _detect_weak_mastery(
        self,
        mastery: Dict[str, float],
    ) -> List[KnowledgeGap]:
        """Detect concepts with weak mastery."""
        gaps = []

        for concept, level in mastery.items():
            if level < self.config.mastery_threshold:
                is_critical = level < self.config.critical_threshold
                gap = KnowledgeGap(
                    concept=concept,
                    severity=1.0 - level,
                    blocking_concepts=[],
                    suggested_remediation=self._get_remediation(concept),
                    gap_type="critical" if is_critical else "weak",
                    estimated_time_to_fill=self._estimate_time(concept) * (1.0 - level),
                    metadata={"current_mastery": level},
                )
                gaps.append(gap)

        return gaps

    def _detect_structural_gaps(
        self,
        known_set: Set[str],
        mastery: Dict[str, float],
    ) -> List[KnowledgeGap]:
        """Detect structural gaps in knowledge graph."""
        gaps = []

        # Find concepts that would bridge known concepts
        for concept in known_set:
            prereqs = self._prerequisites.get(concept, set())

            for prereq in prereqs:
                # Check if prereq's prerequisites are known but prereq isn't
                prereq_prereqs = self._prerequisites.get(prereq, set())
                if prereq not in known_set and prereq_prereqs.issubset(known_set):
                    gap = KnowledgeGap(
                        concept=prereq,
                        severity=0.6,
                        blocking_concepts=[],
                        suggested_remediation=self._get_remediation(prereq),
                        gap_type="structural",
                        estimated_time_to_fill=self._estimate_time(prereq),
                        metadata={"bridges_to": concept},
                    )
                    gaps.append(gap)

        return gaps

    def _find_missing_prerequisites(
        self,
        target: str,
        known_set: Set[str],
    ) -> Set[str]:
        """Find all missing prerequisites for a target concept."""
        missing = set()
        queue = deque([target])
        visited = set()

        while queue:
            concept = queue.popleft()
            if concept in visited:
                continue
            visited.add(concept)

            prereqs = self._prerequisites.get(concept, set())
            for prereq in prereqs:
                if prereq not in known_set:
                    missing.add(prereq)
                    if self.config.include_indirect_gaps:
                        queue.append(prereq)

        return missing

    def _get_blocked_concepts(
        self,
        gap_concept: str,
        known_set: Set[str],
    ) -> List[str]:
        """Get concepts blocked by a gap."""
        blocked = []
        dependents = self._dependents.get(gap_concept, set())

        for dependent in dependents:
            # Check if all other prerequisites are known
            other_prereqs = self._prerequisites.get(dependent, set()) - {gap_concept}
            if other_prereqs.issubset(known_set):
                blocked.append(dependent)

        return blocked

    def _calculate_severity(
        self,
        gap: KnowledgeGap,
        mastery: Dict[str, float],
    ) -> float:
        """Calculate severity score for a gap."""
        base_severity = gap.severity

        # Increase severity if it blocks many concepts
        blocking_factor = min(1.0, len(gap.blocking_concepts) * 0.1)

        # Increase severity for critical gaps
        if gap.gap_type == "critical":
            base_severity = max(base_severity, 0.9)
        elif gap.gap_type == "missing":
            base_severity = max(base_severity, 0.7)

        return min(1.0, base_severity + blocking_factor)

    def _calculate_priority(self, gap: KnowledgeGap) -> int:
        """Calculate priority (1=highest, 5=lowest)."""
        if gap.gap_type == "critical":
            return 1
        elif gap.severity >= 0.8:
            return 1
        elif gap.gap_type == "missing" and len(gap.blocking_concepts) > 0:
            return 2
        elif gap.gap_type == "missing":
            return 3
        elif gap.gap_type == "weak":
            return 4
        else:
            return 5

    def _estimate_time(self, concept: str) -> float:
        """Estimate time to fill a gap (hours)."""
        difficulty = CONCEPT_DIFFICULTY.get(concept, 3)
        return difficulty * 1.0  # 1 hour per difficulty level

    def _get_remediation(self, concept: str) -> List[str]:
        """Get remediation suggestions for a concept."""
        suggestions = REMEDIATION_RESOURCES.get(concept, [])
        if not suggestions:
            suggestions = [f"Practice {concept}", f"Review {concept} fundamentals"]
        return suggestions[:self.config.max_remediation_suggestions]

    def _merge_gaps(self, gaps: List[KnowledgeGap]) -> List[KnowledgeGap]:
        """Merge duplicate gaps, keeping highest severity."""
        merged: Dict[str, KnowledgeGap] = {}

        for gap in gaps:
            if gap.concept in merged:
                existing = merged[gap.concept]
                if gap.severity > existing.severity:
                    merged[gap.concept] = gap
                # Merge blocking concepts
                existing.blocking_concepts = list(
                    set(existing.blocking_concepts) | set(gap.blocking_concepts)
                )
            else:
                merged[gap.concept] = gap

        return list(merged.values())

    def prioritize_gaps(
        self,
        gaps: List[KnowledgeGap],
        strategy: str = "blocking_first",  # blocking_first, severity_first, time_first
    ) -> List[KnowledgeGap]:
        """
        Prioritize gaps by specified strategy.

        Args:
            gaps: List of gaps to prioritize
            strategy: Prioritization strategy

        Returns:
            Sorted list of gaps
        """
        if strategy == "blocking_first":
            return sorted(gaps, key=lambda g: (-len(g.blocking_concepts), -g.severity))
        elif strategy == "severity_first":
            return sorted(gaps, key=lambda g: (-g.severity, -len(g.blocking_concepts)))
        elif strategy == "time_first":
            return sorted(gaps, key=lambda g: (g.estimated_time_to_fill, -g.severity))
        else:
            return sorted(gaps, key=lambda g: (g.priority, -g.severity))

    def suggest_remediation(
        self,
        gap: KnowledgeGap,
        available_resources: Optional[List[str]] = None,
    ) -> List[str]:
        """
        Suggest remediation for a specific gap.

        Args:
            gap: Knowledge gap to remediate
            available_resources: Optional list of available resources

        Returns:
            List of remediation suggestions
        """
        suggestions = gap.suggested_remediation.copy()

        # Add prerequisite suggestions
        prereqs = self._prerequisites.get(gap.concept, set())
        for prereq in prereqs:
            suggestions.append(f"Review {prereq} before {gap.concept}")

        # Filter by available resources if provided
        if available_resources:
            suggestions = [s for s in suggestions if s in available_resources]

        return suggestions[:self.config.max_remediation_suggestions]

    def analyze(
        self,
        known_concepts: List[str],
        mastery_levels: Dict[str, float],
        target_concept: Optional[str] = None,
    ) -> GapAnalysisResult:
        """
        Perform comprehensive gap analysis.

        Args:
            known_concepts: List of known concepts
            mastery_levels: Mastery levels for concepts
            target_concept: Optional target concept

        Returns:
            Complete GapAnalysisResult
        """
        gaps = self.detect(known_concepts, mastery_levels, target_concept)

        # Calculate statistics
        critical_gaps = sum(1 for g in gaps if g.gap_type == "critical" or g.severity >= 0.9)
        blocking_gaps = sum(1 for g in gaps if len(g.blocking_concepts) > 0)
        total_time = sum(g.estimated_time_to_fill for g in gaps)

        # Calculate coverage
        all_concepts = set(self._prerequisites.keys()) | set(self._dependents.keys())
        known_set = {c.lower() for c in known_concepts}
        coverage = len(known_set & all_concepts) / max(len(all_concepts), 1)

        # Generate recommendations
        recommendations = self._generate_recommendations(gaps, coverage)

        return GapAnalysisResult(
            gaps=gaps,
            total_gaps=len(gaps),
            critical_gaps=critical_gaps,
            blocking_gaps=blocking_gaps,
            estimated_remediation_time=total_time,
            coverage_score=coverage,
            recommendations=recommendations,
        )

    def _generate_recommendations(
        self,
        gaps: List[KnowledgeGap],
        coverage: float,
    ) -> List[str]:
        """Generate remediation recommendations."""
        recommendations = []

        if not gaps:
            recommendations.append("No significant knowledge gaps detected.")
            return recommendations

        # Critical gaps first
        critical = [g for g in gaps if g.gap_type == "critical"]
        if critical:
            recommendations.append(
                f"Address {len(critical)} critical gap(s) immediately: "
                + ", ".join(g.concept for g in critical[:3])
            )

        # Blocking gaps
        blocking = [g for g in gaps if len(g.blocking_concepts) > 0]
        if blocking:
            most_blocking = max(blocking, key=lambda g: len(g.blocking_concepts))
            recommendations.append(
                f"Focus on '{most_blocking.concept}' to unlock "
                f"{len(most_blocking.blocking_concepts)} concepts"
            )

        # Coverage recommendation
        if coverage < 0.5:
            recommendations.append(
                "Consider strengthening foundational concepts before advancing"
            )

        # Quick wins
        quick_fixes = [g for g in gaps if g.estimated_time_to_fill <= 2.0]
        if quick_fixes:
            recommendations.append(
                f"{len(quick_fixes)} gap(s) can be addressed quickly "
                f"(under 2 hours each)"
            )

        return recommendations

    def get_learning_path_gaps(
        self,
        current_knowledge: List[str],
        target_path: List[str],
        mastery_levels: Optional[Dict[str, float]] = None,
    ) -> List[KnowledgeGap]:
        """
        Find gaps that would block a learning path.

        Args:
            current_knowledge: Currently known concepts
            target_path: Desired learning path
            mastery_levels: Optional mastery levels

        Returns:
            List of gaps blocking the path
        """
        mastery = mastery_levels or {}
        known_set = {c.lower() for c in current_knowledge}
        gaps = []

        for concept in target_path:
            concept_lower = concept.lower()

            # Check prerequisites
            prereqs = self._prerequisites.get(concept_lower, set())
            missing = prereqs - known_set

            for prereq in missing:
                gap = KnowledgeGap(
                    concept=prereq,
                    severity=0.8,
                    blocking_concepts=[concept],
                    suggested_remediation=self._get_remediation(prereq),
                    gap_type="missing",
                    estimated_time_to_fill=self._estimate_time(prereq),
                    metadata={"blocks_path_to": concept},
                )
                gaps.append(gap)

            # Add to known for subsequent checks
            known_set.add(concept_lower)

        return self._merge_gaps(gaps)
