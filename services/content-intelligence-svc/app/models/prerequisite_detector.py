"""
Prerequisite Detector

Detect prerequisites for educational content using concept analysis
and knowledge dependency mapping.
"""
import logging
import re
from dataclasses import dataclass
from typing import List, Dict, Optional, Set, Tuple

logger = logging.getLogger(__name__)


@dataclass
class Prerequisite:
    concept: str
    importance: str  # required, recommended, helpful
    confidence: float


@dataclass
class ContentNode:
    """Represents a content item in the prerequisite graph."""
    content_id: str
    title: str
    concepts: List[str]
    prerequisites: List[str]
    difficulty: float = 0.5


class PrerequisiteDetector:
    """
    Detect prerequisites for educational content.

    Uses concept extraction, knowledge dependency patterns, and
    explicit prerequisite markers in text.

    Usage:
        detector = PrerequisiteDetector()
        prereqs = detector.detect("To understand derivatives, you must first...")
    """

    # Prerequisite indicator phrases
    PREREQUISITE_PHRASES: List[Tuple[str, str]] = [
        (r"requires?\s+(?:knowledge\s+of\s+|understanding\s+of\s+)?(.+?)(?:\.|,|$)", "required"),
        (r"must\s+(?:first\s+)?(?:know|understand|learn)\s+(.+?)(?:\.|,|$)", "required"),
        (r"prerequisite[s]?\s*:?\s*(.+?)(?:\.|,|$)", "required"),
        (r"before\s+(?:learning|studying|understanding)\s+this,?\s+(.+?)(?:\.|,|$)", "required"),
        (r"assumes?\s+(?:knowledge\s+of\s+|familiarity\s+with\s+)?(.+?)(?:\.|,|$)", "required"),
        (r"builds?\s+(?:on|upon)\s+(.+?)(?:\.|,|$)", "required"),
        (r"should\s+(?:already\s+)?(?:know|understand)\s+(.+?)(?:\.|,|$)", "recommended"),
        (r"helpful\s+to\s+(?:know|understand)\s+(.+?)(?:\.|,|$)", "helpful"),
        (r"(?:it\s+helps|it\'s\s+helpful)\s+(?:to\s+)?(?:know|understand)\s+(.+?)(?:\.|,|$)", "helpful"),
        (r"prior\s+knowledge\s+(?:of\s+)?(.+?)(?:\.|,|$)", "recommended"),
        (r"background\s+in\s+(.+?)(?:\.|,|$)", "recommended"),
    ]

    # Knowledge domain hierarchy (concept -> prerequisites)
    DOMAIN_PREREQUISITES: Dict[str, Dict[str, List[str]]] = {
        "mathematics": {
            # Calculus chain
            "derivatives": ["limits", "functions", "algebra"],
            "integrals": ["derivatives", "functions", "algebra"],
            "differential equations": ["derivatives", "integrals", "algebra"],
            "limits": ["functions", "algebra"],
            # Algebra chain
            "quadratic equations": ["linear equations", "polynomials"],
            "polynomials": ["variables", "exponents", "algebra basics"],
            "linear equations": ["variables", "basic operations"],
            "systems of equations": ["linear equations", "graphing"],
            # Geometry
            "trigonometry": ["geometry basics", "ratios", "algebra"],
            "geometry proofs": ["geometry basics", "logic"],
            "area and perimeter": ["multiplication", "basic shapes"],
            # Statistics
            "statistics": ["mean median mode", "percentages", "graphing"],
            "probability": ["fractions", "percentages", "ratios"],
            "mean median mode": ["addition", "division", "ordering numbers"],
        },
        "science": {
            # Biology chain
            "genetics": ["DNA", "cells", "heredity basics"],
            "DNA": ["cells", "molecules", "proteins"],
            "evolution": ["genetics", "natural selection", "species"],
            "photosynthesis": ["cells", "energy", "plants"],
            "cells": ["molecules", "basic biology"],
            # Chemistry chain
            "chemical reactions": ["atoms", "molecules", "periodic table"],
            "bonding": ["atoms", "electrons", "periodic table"],
            "atoms": ["matter", "basic chemistry"],
            "periodic table": ["elements", "atoms"],
            # Physics chain
            "kinematics": ["motion", "velocity", "algebra"],
            "dynamics": ["kinematics", "forces", "Newton's laws"],
            "Newton's laws": ["forces", "motion", "mass"],
            "energy": ["work", "forces", "motion"],
            "waves": ["oscillations", "frequency", "energy"],
            "electricity": ["atoms", "electrons", "energy"],
        },
        "english": {
            # Writing chain
            "essay writing": ["paragraph structure", "thesis statements", "grammar"],
            "paragraph structure": ["sentence structure", "topic sentences"],
            "thesis statements": ["argument", "claims", "paragraph structure"],
            "research papers": ["essay writing", "citations", "research skills"],
            # Reading chain
            "literary analysis": ["reading comprehension", "themes", "character analysis"],
            "character analysis": ["reading comprehension", "inference"],
            "themes": ["plot", "symbolism", "inference"],
        },
        "social_studies": {
            # History
            "world war II": ["world war I", "20th century history", "geography"],
            "world war I": ["imperialism", "nationalism", "19th century history"],
            "civil war": ["antebellum period", "slavery", "US constitution"],
            # Civics
            "constitutional law": ["US constitution", "government branches", "civics basics"],
            "government branches": ["civics basics", "democracy"],
        }
    }

    # Concept indicators in text
    CONCEPT_PATTERNS: List[str] = [
        r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b",  # Capitalized phrases
        r"\"([^\"]+)\"",  # Quoted terms
        r"\'([^\']+)\'",  # Single quoted terms
    ]

    def __init__(self):
        """Initialize the PrerequisiteDetector."""
        self._build_concept_index()
        logger.info("PrerequisiteDetector initialized")

    def _build_concept_index(self) -> None:
        """Build reverse index from concepts to their prerequisites."""
        self._concept_prereqs: Dict[str, Tuple[str, List[str]]] = {}
        self._all_concepts: Set[str] = set()

        for domain, concepts in self.DOMAIN_PREREQUISITES.items():
            for concept, prereqs in concepts.items():
                self._concept_prereqs[concept.lower()] = (domain, prereqs)
                self._all_concepts.add(concept.lower())
                for prereq in prereqs:
                    self._all_concepts.add(prereq.lower())

    def _extract_concepts(self, text: str) -> List[str]:
        """
        Extract potential concepts from text.

        Args:
            text: Text to analyze

        Returns:
            List of extracted concept strings
        """
        concepts = []
        text_lower = text.lower()

        # Check against known concepts
        for concept in self._all_concepts:
            if concept in text_lower:
                concepts.append(concept)

        # Extract capitalized phrases
        for pattern in self.CONCEPT_PATTERNS:
            matches = re.findall(pattern, text)
            for match in matches:
                if len(match) > 2:  # Skip very short matches
                    concepts.append(match.lower())

        return list(set(concepts))

    def _extract_explicit_prerequisites(self, text: str) -> List[Tuple[str, str]]:
        """
        Extract explicitly mentioned prerequisites from text.

        Args:
            text: Text to analyze

        Returns:
            List of (prerequisite_text, importance) tuples
        """
        prerequisites = []

        for pattern, importance in self.PREREQUISITE_PHRASES:
            matches = re.findall(pattern, text.lower(), re.IGNORECASE)
            for match in matches:
                # Clean up the match
                prereq = match.strip()
                if prereq and len(prereq) > 2:
                    prerequisites.append((prereq, importance))

        return prerequisites

    def _infer_prerequisites_from_concepts(
        self, concepts: List[str]
    ) -> List[Tuple[str, str, float]]:
        """
        Infer prerequisites based on detected concepts.

        Args:
            concepts: List of concepts found in text

        Returns:
            List of (prerequisite, importance, confidence) tuples
        """
        prerequisites = []
        seen = set()

        for concept in concepts:
            concept_lower = concept.lower()
            if concept_lower in self._concept_prereqs:
                domain, prereqs = self._concept_prereqs[concept_lower]

                for prereq in prereqs:
                    if prereq not in seen:
                        seen.add(prereq)
                        # Higher confidence for direct prerequisites
                        prerequisites.append((prereq, "required", 0.7))

        return prerequisites

    def detect(
        self,
        text: str,
        subject: Optional[str] = None,
    ) -> List[Prerequisite]:
        """
        Detect prerequisites from content text.

        Args:
            text: Content text to analyze
            subject: Optional subject hint for better detection

        Returns:
            List of Prerequisite objects
        """
        if not text or not text.strip():
            return []

        prerequisites = []
        seen_concepts = set()

        # Extract explicit prerequisites from text
        explicit_prereqs = self._extract_explicit_prerequisites(text)
        for prereq_text, importance in explicit_prereqs:
            if prereq_text not in seen_concepts:
                seen_concepts.add(prereq_text)
                prerequisites.append(Prerequisite(
                    concept=prereq_text.title(),
                    importance=importance,
                    confidence=0.85
                ))

        # Extract concepts from text
        concepts = self._extract_concepts(text)

        # Infer prerequisites from concepts
        inferred = self._infer_prerequisites_from_concepts(concepts)
        for prereq, importance, confidence in inferred:
            if prereq not in seen_concepts:
                seen_concepts.add(prereq)
                prerequisites.append(Prerequisite(
                    concept=prereq.title(),
                    importance=importance,
                    confidence=confidence
                ))

        # If subject is provided, add domain-specific prerequisites
        if subject:
            subject_lower = subject.lower()
            if subject_lower in self.DOMAIN_PREREQUISITES:
                domain_concepts = self.DOMAIN_PREREQUISITES[subject_lower]
                for concept in concepts:
                    if concept in domain_concepts:
                        for prereq in domain_concepts[concept]:
                            if prereq not in seen_concepts:
                                seen_concepts.add(prereq)
                                prerequisites.append(Prerequisite(
                                    concept=prereq.title(),
                                    importance="recommended",
                                    confidence=0.6
                                ))

        # Sort by confidence and importance
        importance_order = {"required": 0, "recommended": 1, "helpful": 2}
        prerequisites.sort(
            key=lambda p: (importance_order.get(p.importance, 3), -p.confidence)
        )

        return prerequisites

    def validate_sequence(
        self,
        content_sequence: List[str],
    ) -> Dict:
        """
        Validate if a content sequence respects prerequisites.

        Args:
            content_sequence: List of content texts in order

        Returns:
            Dictionary with validation results
        """
        if not content_sequence:
            return {
                "valid": True,
                "issues": [],
                "coverage": {}
            }

        # Track concepts introduced
        concepts_introduced: Set[str] = set()
        issues = []

        for i, content in enumerate(content_sequence):
            # Detect prerequisites for current content
            prereqs = self.detect(content)

            # Check if prerequisites were introduced earlier
            for prereq in prereqs:
                prereq_lower = prereq.concept.lower()
                if prereq.importance == "required" and prereq_lower not in concepts_introduced:
                    issues.append({
                        "position": i,
                        "missing_prerequisite": prereq.concept,
                        "importance": prereq.importance,
                        "confidence": prereq.confidence
                    })

            # Add concepts from current content
            concepts = self._extract_concepts(content)
            concepts_introduced.update(c.lower() for c in concepts)

        # Calculate coverage
        all_prereqs = set()
        for content in content_sequence:
            prereqs = self.detect(content)
            all_prereqs.update(p.concept.lower() for p in prereqs)

        coverage = len(concepts_introduced & all_prereqs) / max(len(all_prereqs), 1)

        return {
            "valid": len(issues) == 0,
            "issues": issues,
            "coverage": round(coverage, 3),
            "concepts_introduced": list(concepts_introduced),
            "total_prerequisites": len(all_prereqs)
        }

    def suggest_ordering(
        self,
        content_items: List[str],
    ) -> List[str]:
        """
        Suggest optimal ordering based on prerequisites.

        Uses topological sort based on prerequisite dependencies.

        Args:
            content_items: List of content texts to order

        Returns:
            Reordered list of content texts
        """
        if len(content_items) <= 1:
            return content_items

        # Build dependency graph
        item_prereqs: Dict[int, Set[str]] = {}
        item_concepts: Dict[int, Set[str]] = {}

        for i, content in enumerate(content_items):
            prereqs = self.detect(content)
            concepts = self._extract_concepts(content)

            item_prereqs[i] = {p.concept.lower() for p in prereqs if p.importance == "required"}
            item_concepts[i] = set(c.lower() for c in concepts)

        # Build edges: item A should come before item B if B's prereqs overlap with A's concepts
        edges: Dict[int, List[int]] = {i: [] for i in range(len(content_items))}
        in_degree: Dict[int, int] = {i: 0 for i in range(len(content_items))}

        for i in range(len(content_items)):
            for j in range(len(content_items)):
                if i != j:
                    # If j has prerequisites that i introduces
                    if item_prereqs[j] & item_concepts[i]:
                        edges[i].append(j)
                        in_degree[j] += 1

        # Topological sort (Kahn's algorithm)
        queue = [i for i in range(len(content_items)) if in_degree[i] == 0]
        result = []

        while queue:
            # Among items with no remaining dependencies, prefer simpler ones
            queue.sort(key=lambda x: len(item_prereqs[x]))
            node = queue.pop(0)
            result.append(content_items[node])

            for neighbor in edges[node]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        # If not all items are in result, there's a cycle - return original order for remaining
        if len(result) < len(content_items):
            remaining = [content_items[i] for i in range(len(content_items))
                        if content_items[i] not in result]
            result.extend(remaining)

        return result

    def compute_prerequisite_graph(
        self,
        content_nodes: List[ContentNode],
    ) -> Dict:
        """
        Build prerequisite relationship graph from content nodes.

        Args:
            content_nodes: List of ContentNode objects

        Returns:
            Dictionary representing the prerequisite graph
        """
        if not content_nodes:
            return {"nodes": [], "edges": [], "levels": {}}

        # Build node index
        node_index = {node.content_id: node for node in content_nodes}

        # Compute edges based on concept overlap
        edges = []
        for node in content_nodes:
            node_concepts = set(c.lower() for c in node.concepts)

            for other in content_nodes:
                if node.content_id == other.content_id:
                    continue

                other_prereqs = set(p.lower() for p in other.prerequisites)

                # If this node's concepts satisfy other's prerequisites
                overlap = node_concepts & other_prereqs
                if overlap:
                    edges.append({
                        "from": node.content_id,
                        "to": other.content_id,
                        "concepts": list(overlap),
                        "strength": len(overlap) / max(len(other_prereqs), 1)
                    })

        # Compute levels (distance from root nodes)
        levels: Dict[str, int] = {}
        in_degree = {node.content_id: 0 for node in content_nodes}

        for edge in edges:
            in_degree[edge["to"]] += 1

        # BFS to assign levels
        current_level = 0
        current_nodes = [nid for nid, deg in in_degree.items() if deg == 0]

        while current_nodes:
            for nid in current_nodes:
                levels[nid] = current_level

            # Find next level
            next_nodes = []
            for edge in edges:
                if edge["from"] in current_nodes:
                    in_degree[edge["to"]] -= 1
                    if in_degree[edge["to"]] == 0 and edge["to"] not in levels:
                        next_nodes.append(edge["to"])

            current_nodes = list(set(next_nodes))
            current_level += 1

        # Handle any remaining nodes (cycles)
        for node in content_nodes:
            if node.content_id not in levels:
                levels[node.content_id] = current_level

        return {
            "nodes": [
                {
                    "id": node.content_id,
                    "title": node.title,
                    "concepts": node.concepts,
                    "prerequisites": node.prerequisites,
                    "difficulty": node.difficulty,
                    "level": levels.get(node.content_id, 0)
                }
                for node in content_nodes
            ],
            "edges": edges,
            "levels": levels,
            "max_level": max(levels.values()) if levels else 0
        }

    def validate_readiness(
        self,
        content_text: str,
        learner_knowledge: List[str],
        threshold: float = 0.7
    ) -> Dict:
        """
        Validate if a learner is ready for content based on their knowledge.

        Args:
            content_text: Content text to check readiness for
            learner_knowledge: List of concepts the learner knows
            threshold: Minimum coverage threshold (0-1)

        Returns:
            Dictionary with readiness assessment
        """
        # Detect prerequisites
        prereqs = self.detect(content_text)

        if not prereqs:
            return {
                "ready": True,
                "coverage": 1.0,
                "missing_required": [],
                "missing_recommended": [],
                "has_knowledge": learner_knowledge
            }

        learner_knowledge_lower = {k.lower() for k in learner_knowledge}

        # Check coverage
        required_prereqs = [p for p in prereqs if p.importance == "required"]
        recommended_prereqs = [p for p in prereqs if p.importance == "recommended"]

        missing_required = []
        missing_recommended = []

        for prereq in required_prereqs:
            if prereq.concept.lower() not in learner_knowledge_lower:
                missing_required.append(prereq.concept)

        for prereq in recommended_prereqs:
            if prereq.concept.lower() not in learner_knowledge_lower:
                missing_recommended.append(prereq.concept)

        # Calculate coverage
        total_required = len(required_prereqs)
        met_required = total_required - len(missing_required)
        coverage = met_required / max(total_required, 1)

        return {
            "ready": len(missing_required) == 0,
            "coverage": round(coverage, 3),
            "missing_required": missing_required,
            "missing_recommended": missing_recommended,
            "suggestions": [
                f"Learn '{prereq}' first" for prereq in missing_required[:3]
            ],
            "confidence": round(sum(p.confidence for p in required_prereqs) /
                               max(len(required_prereqs), 1), 3)
        }

    def get_learning_path(
        self,
        target_concept: str,
        max_depth: int = 5
    ) -> List[str]:
        """
        Get learning path to reach a target concept.

        Args:
            target_concept: Concept to learn
            max_depth: Maximum path depth

        Returns:
            Ordered list of concepts to learn
        """
        target_lower = target_concept.lower()

        if target_lower not in self._concept_prereqs:
            return [target_concept]

        # BFS to build path
        path = []
        visited = set()
        queue = [(target_lower, 0)]

        while queue and len(path) < 100:  # Safety limit
            concept, depth = queue.pop(0)

            if concept in visited or depth > max_depth:
                continue

            visited.add(concept)

            if concept in self._concept_prereqs:
                _, prereqs = self._concept_prereqs[concept]
                for prereq in prereqs:
                    if prereq not in visited:
                        queue.append((prereq, depth + 1))
                        path.insert(0, prereq.title())

        path.append(target_concept.title())
        return path
