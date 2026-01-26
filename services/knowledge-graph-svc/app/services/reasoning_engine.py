"""
Reasoning Engine

Graph-based reasoning for educational queries including
path finding, subgraph extraction, and inference.
"""
import logging
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Set, Tuple
from collections import deque
import heapq
import re

logger = logging.getLogger(__name__)


@dataclass
class PathResult:
    """Result of a path query."""
    path: List[str]
    length: int
    total_weight: float
    relation_types: List[str]


@dataclass
class SubgraphResult:
    """Result of subgraph extraction."""
    center: str
    nodes: List[str]
    edges: List[Tuple[str, str, str]]  # (source, target, relation_type)
    depth: int
    statistics: Dict[str, Any]


@dataclass
class InferenceResult:
    """Result of relation inference."""
    source: str
    target: str
    inferred_relation: str
    confidence: float
    reasoning_chain: List[str]
    evidence: List[str]


@dataclass
class QueryResult:
    """Result of a natural language query."""
    query: str
    answer: str
    relevant_concepts: List[str]
    confidence: float
    evidence: List[str]


@dataclass
class ReasoningEngineConfig:
    """Configuration for reasoning engine."""
    max_path_length: int = 10
    max_paths: int = 5
    inference_confidence_threshold: float = 0.5
    max_subgraph_nodes: int = 50


# Knowledge graph for reasoning
KNOWLEDGE_GRAPH = {
    # Mathematics relationships
    ("arithmetic", "algebra", "prerequisite"),
    ("algebra", "calculus", "prerequisite"),
    ("algebra", "linear algebra", "prerequisite"),
    ("geometry", "trigonometry", "prerequisite"),
    ("trigonometry", "calculus", "prerequisite"),
    ("calculus", "differential equations", "prerequisite"),
    ("linear algebra", "differential equations", "prerequisite"),
    ("fractions", "algebra", "prerequisite"),
    ("fractions", "probability", "prerequisite"),
    ("algebra", "statistics", "prerequisite"),
    ("probability", "statistics", "related"),

    # Computer Science relationships
    ("programming", "data structures", "prerequisite"),
    ("data structures", "algorithms", "prerequisite"),
    ("linear algebra", "machine learning", "prerequisite"),
    ("statistics", "machine learning", "prerequisite"),
    ("programming", "machine learning", "prerequisite"),
    ("machine learning", "deep learning", "prerequisite"),
    ("calculus", "deep learning", "prerequisite"),

    # Science relationships
    ("calculus", "physics", "prerequisite"),
    ("algebra", "chemistry", "prerequisite"),
    ("chemistry", "biology", "related"),
    ("biology", "genetics", "prerequisite"),
    ("probability", "genetics", "prerequisite"),

    # Part-of relationships
    ("addition", "arithmetic", "part_of"),
    ("subtraction", "arithmetic", "part_of"),
    ("multiplication", "arithmetic", "part_of"),
    ("division", "arithmetic", "part_of"),
    ("derivatives", "calculus", "part_of"),
    ("integrals", "calculus", "part_of"),
    ("limits", "calculus", "part_of"),
}

# Relation type properties for inference
RELATION_PROPERTIES = {
    "prerequisite": {"transitive": True, "inverse": "enables"},
    "related": {"transitive": False, "symmetric": True},
    "part_of": {"transitive": True, "inverse": "contains"},
    "enables": {"transitive": True, "inverse": "prerequisite"},
}


class ReasoningEngine:
    """
    Graph reasoning for educational queries.

    Capabilities:
    - Path finding (shortest, all paths)
    - Subgraph extraction
    - Inference (transitive relations)
    - Query answering

    Usage:
        engine = ReasoningEngine()
        path = engine.find_path("algebra", "differential_equations")
    """

    def __init__(
        self,
        config: Optional[ReasoningEngineConfig] = None,
    ):
        self.config = config or ReasoningEngineConfig()

        # Build graph structures
        self._adjacency: Dict[str, Dict[str, Set[str]]] = {}  # node -> {relation -> targets}
        self._reverse_adjacency: Dict[str, Dict[str, Set[str]]] = {}
        self._all_nodes: Set[str] = set()

        self._load_knowledge_graph()
        logger.info("ReasoningEngine initialized")

    def _load_knowledge_graph(self):
        """Load the knowledge graph."""
        for source, target, relation in KNOWLEDGE_GRAPH:
            source = source.lower()
            target = target.lower()

            self._all_nodes.add(source)
            self._all_nodes.add(target)

            # Forward adjacency
            if source not in self._adjacency:
                self._adjacency[source] = {}
            if relation not in self._adjacency[source]:
                self._adjacency[source][relation] = set()
            self._adjacency[source][relation].add(target)

            # Reverse adjacency
            if target not in self._reverse_adjacency:
                self._reverse_adjacency[target] = {}
            if relation not in self._reverse_adjacency[target]:
                self._reverse_adjacency[target][relation] = set()
            self._reverse_adjacency[target][relation].add(source)

    def find_path(
        self,
        source: str,
        target: str,
        path_type: str = "shortest",
        relation_filter: Optional[List[str]] = None,
    ) -> Optional[PathResult]:
        """
        Find path between concepts.

        Args:
            source: Source concept
            target: Target concept
            path_type: Type of path (shortest, prerequisite_chain, any)
            relation_filter: Only use these relation types

        Returns:
            PathResult or None if no path exists
        """
        source = source.lower()
        target = target.lower()

        if source not in self._all_nodes or target not in self._all_nodes:
            return None

        if path_type == "shortest":
            return self._find_shortest_path(source, target, relation_filter)
        elif path_type == "prerequisite_chain":
            return self._find_prerequisite_chain(source, target)
        else:
            return self._find_any_path(source, target, relation_filter)

    def _find_shortest_path(
        self,
        source: str,
        target: str,
        relation_filter: Optional[List[str]] = None,
    ) -> Optional[PathResult]:
        """Find shortest path using BFS."""
        if source == target:
            return PathResult(path=[source], length=0, total_weight=0, relation_types=[])

        # BFS
        queue = deque([(source, [source], [])])  # (current, path, relations)
        visited = {source}

        while queue:
            current, path, relations = queue.popleft()

            if len(path) > self.config.max_path_length:
                continue

            # Get neighbors
            for rel_type, targets in self._adjacency.get(current, {}).items():
                if relation_filter and rel_type not in relation_filter:
                    continue

                for next_node in targets:
                    if next_node == target:
                        return PathResult(
                            path=path + [next_node],
                            length=len(path),
                            total_weight=float(len(path)),
                            relation_types=relations + [rel_type],
                        )

                    if next_node not in visited:
                        visited.add(next_node)
                        queue.append((next_node, path + [next_node], relations + [rel_type]))

        return None

    def _find_prerequisite_chain(
        self,
        source: str,
        target: str,
    ) -> Optional[PathResult]:
        """Find path using only prerequisite relations."""
        return self._find_shortest_path(source, target, ["prerequisite"])

    def _find_any_path(
        self,
        source: str,
        target: str,
        relation_filter: Optional[List[str]] = None,
    ) -> Optional[PathResult]:
        """Find any path (uses DFS)."""
        if source == target:
            return PathResult(path=[source], length=0, total_weight=0, relation_types=[])

        visited = set()

        def dfs(current: str, path: List[str], relations: List[str]) -> Optional[PathResult]:
            if len(path) > self.config.max_path_length:
                return None

            visited.add(current)

            for rel_type, targets in self._adjacency.get(current, {}).items():
                if relation_filter and rel_type not in relation_filter:
                    continue

                for next_node in targets:
                    if next_node == target:
                        return PathResult(
                            path=path + [next_node],
                            length=len(path),
                            total_weight=float(len(path)),
                            relation_types=relations + [rel_type],
                        )

                    if next_node not in visited:
                        result = dfs(next_node, path + [next_node], relations + [rel_type])
                        if result:
                            return result

            return None

        return dfs(source, [source], [])

    def find_all_paths(
        self,
        source: str,
        target: str,
        max_paths: Optional[int] = None,
    ) -> List[PathResult]:
        """Find all paths between source and target."""
        source = source.lower()
        target = target.lower()
        max_paths = max_paths or self.config.max_paths
        paths = []

        def dfs(current: str, path: List[str], relations: List[str], visited: Set[str]):
            if len(paths) >= max_paths:
                return

            if len(path) > self.config.max_path_length:
                return

            if current == target:
                paths.append(PathResult(
                    path=path.copy(),
                    length=len(path) - 1,
                    total_weight=float(len(path) - 1),
                    relation_types=relations.copy(),
                ))
                return

            for rel_type, targets in self._adjacency.get(current, {}).items():
                for next_node in targets:
                    if next_node not in visited:
                        visited.add(next_node)
                        path.append(next_node)
                        relations.append(rel_type)

                        dfs(next_node, path, relations, visited)

                        path.pop()
                        relations.pop()
                        visited.remove(next_node)

        dfs(source, [source], [], {source})
        return sorted(paths, key=lambda p: p.length)

    def extract_subgraph(
        self,
        center_concept: str,
        depth: int = 2,
        relation_filter: Optional[List[str]] = None,
    ) -> SubgraphResult:
        """
        Extract subgraph around a concept.

        Args:
            center_concept: Center of the subgraph
            depth: How many hops from center to include
            relation_filter: Only include these relation types

        Returns:
            SubgraphResult with nodes and edges
        """
        center = center_concept.lower()
        nodes = {center}
        edges = []
        current_level = {center}

        for d in range(depth):
            next_level = set()

            for node in current_level:
                # Outgoing edges
                for rel_type, targets in self._adjacency.get(node, {}).items():
                    if relation_filter and rel_type not in relation_filter:
                        continue

                    for target in targets:
                        if len(nodes) < self.config.max_subgraph_nodes:
                            edges.append((node, target, rel_type))
                            if target not in nodes:
                                nodes.add(target)
                                next_level.add(target)

                # Incoming edges
                for rel_type, sources in self._reverse_adjacency.get(node, {}).items():
                    if relation_filter and rel_type not in relation_filter:
                        continue

                    for source in sources:
                        if len(nodes) < self.config.max_subgraph_nodes:
                            edges.append((source, node, rel_type))
                            if source not in nodes:
                                nodes.add(source)
                                next_level.add(source)

            current_level = next_level

        # Calculate statistics
        relation_counts = {}
        for _, _, rel in edges:
            relation_counts[rel] = relation_counts.get(rel, 0) + 1

        return SubgraphResult(
            center=center,
            nodes=list(nodes),
            edges=edges,
            depth=depth,
            statistics={
                "num_nodes": len(nodes),
                "num_edges": len(edges),
                "relation_counts": relation_counts,
            },
        )

    def infer_relation(
        self,
        concept_a: str,
        concept_b: str,
    ) -> Optional[InferenceResult]:
        """
        Infer relation through transitive reasoning.

        Args:
            concept_a: First concept
            concept_b: Second concept

        Returns:
            InferenceResult or None if no relation can be inferred
        """
        concept_a = concept_a.lower()
        concept_b = concept_b.lower()

        # Check direct relation first
        for rel_type, targets in self._adjacency.get(concept_a, {}).items():
            if concept_b in targets:
                return InferenceResult(
                    source=concept_a,
                    target=concept_b,
                    inferred_relation=rel_type,
                    confidence=1.0,
                    reasoning_chain=[f"{concept_a} -{rel_type}-> {concept_b}"],
                    evidence=["Direct relation"],
                )

        # Try transitive inference
        path = self.find_path(concept_a, concept_b, "prerequisite_chain")
        if path and path.length > 0:
            # Check if relation is transitive
            chain = []
            for i in range(len(path.path) - 1):
                chain.append(f"{path.path[i]} -{path.relation_types[i]}-> {path.path[i+1]}")

            # Confidence decreases with path length
            confidence = 1.0 / (path.length + 1)

            if confidence >= self.config.inference_confidence_threshold:
                return InferenceResult(
                    source=concept_a,
                    target=concept_b,
                    inferred_relation="transitive_prerequisite",
                    confidence=confidence,
                    reasoning_chain=chain,
                    evidence=[f"Transitive chain of length {path.length}"],
                )

        # Try symmetric relations
        for rel_type, targets in self._adjacency.get(concept_b, {}).items():
            if concept_a in targets:
                props = RELATION_PROPERTIES.get(rel_type, {})
                if props.get("symmetric"):
                    return InferenceResult(
                        source=concept_a,
                        target=concept_b,
                        inferred_relation=rel_type,
                        confidence=0.9,
                        reasoning_chain=[f"{concept_b} -{rel_type}-> {concept_a} (symmetric)"],
                        evidence=["Symmetric relation"],
                    )
                if props.get("inverse"):
                    inverse = props["inverse"]
                    return InferenceResult(
                        source=concept_a,
                        target=concept_b,
                        inferred_relation=inverse,
                        confidence=0.9,
                        reasoning_chain=[f"{concept_b} -{rel_type}-> {concept_a} => {concept_a} -{inverse}-> {concept_b}"],
                        evidence=["Inverse relation"],
                    )

        return None

    def query(
        self,
        query_text: str,
    ) -> QueryResult:
        """
        Answer natural language query over graph.

        Args:
            query_text: Natural language query

        Returns:
            QueryResult with answer and evidence
        """
        query_lower = query_text.lower()

        # Extract concepts from query
        concepts = self._extract_concepts(query_lower)

        # Pattern matching for query types
        if "prerequisite" in query_lower or "required for" in query_lower:
            return self._answer_prerequisite_query(query_lower, concepts)
        elif "path" in query_lower or "how to learn" in query_lower:
            return self._answer_path_query(query_lower, concepts)
        elif "related" in query_lower:
            return self._answer_related_query(query_lower, concepts)
        elif "what is" in query_lower or "define" in query_lower:
            return self._answer_definition_query(query_lower, concepts)
        else:
            return self._answer_general_query(query_lower, concepts)

    def _extract_concepts(self, text: str) -> List[str]:
        """Extract concept mentions from text."""
        found = []
        for concept in self._all_nodes:
            if concept in text:
                found.append(concept)
        return found

    def _answer_prerequisite_query(
        self,
        query: str,
        concepts: List[str],
    ) -> QueryResult:
        """Answer prerequisite-related queries."""
        if len(concepts) >= 1:
            concept = concepts[0]
            prereqs = []

            for rel_type, sources in self._reverse_adjacency.get(concept, {}).items():
                if rel_type == "prerequisite":
                    prereqs.extend(sources)

            if prereqs:
                answer = f"Prerequisites for {concept}: {', '.join(prereqs)}"
            else:
                answer = f"No prerequisites found for {concept}"

            return QueryResult(
                query=query,
                answer=answer,
                relevant_concepts=[concept] + prereqs,
                confidence=0.9,
                evidence=[f"Direct prerequisite relations for {concept}"],
            )

        return QueryResult(
            query=query,
            answer="Could not identify concept in query",
            relevant_concepts=[],
            confidence=0.3,
            evidence=[],
        )

    def _answer_path_query(
        self,
        query: str,
        concepts: List[str],
    ) -> QueryResult:
        """Answer path-related queries."""
        if len(concepts) >= 2:
            source, target = concepts[0], concepts[1]
            path = self.find_path(source, target)

            if path:
                answer = f"Learning path from {source} to {target}: {' -> '.join(path.path)}"
                return QueryResult(
                    query=query,
                    answer=answer,
                    relevant_concepts=path.path,
                    confidence=0.9,
                    evidence=[f"Path length: {path.length}"],
                )
            else:
                answer = f"No direct learning path found from {source} to {target}"
                return QueryResult(
                    query=query,
                    answer=answer,
                    relevant_concepts=concepts,
                    confidence=0.5,
                    evidence=["No path exists in knowledge graph"],
                )

        return QueryResult(
            query=query,
            answer="Please specify two concepts to find a path between",
            relevant_concepts=concepts,
            confidence=0.3,
            evidence=[],
        )

    def _answer_related_query(
        self,
        query: str,
        concepts: List[str],
    ) -> QueryResult:
        """Answer related-concepts queries."""
        if concepts:
            concept = concepts[0]
            related = set()

            for rel_type, targets in self._adjacency.get(concept, {}).items():
                related.update(targets)
            for rel_type, sources in self._reverse_adjacency.get(concept, {}).items():
                related.update(sources)

            related.discard(concept)

            if related:
                answer = f"Concepts related to {concept}: {', '.join(list(related)[:10])}"
            else:
                answer = f"No related concepts found for {concept}"

            return QueryResult(
                query=query,
                answer=answer,
                relevant_concepts=[concept] + list(related)[:10],
                confidence=0.8,
                evidence=[f"Found {len(related)} related concepts"],
            )

        return QueryResult(
            query=query,
            answer="Please specify a concept to find related topics",
            relevant_concepts=[],
            confidence=0.3,
            evidence=[],
        )

    def _answer_definition_query(
        self,
        query: str,
        concepts: List[str],
    ) -> QueryResult:
        """Answer definition queries."""
        if concepts:
            concept = concepts[0]
            subgraph = self.extract_subgraph(concept, depth=1)

            parts = [t for s, t, r in subgraph.edges if s == concept and r == "part_of"]
            prereqs = [s for s, t, r in subgraph.edges if t == concept and r == "prerequisite"]

            answer_parts = [f"{concept.title()} is a concept"]
            if parts:
                answer_parts.append(f"that includes {', '.join(parts[:5])}")
            if prereqs:
                answer_parts.append(f"which requires knowledge of {', '.join(prereqs[:5])}")

            return QueryResult(
                query=query,
                answer=". ".join(answer_parts) + ".",
                relevant_concepts=[concept] + parts + prereqs,
                confidence=0.7,
                evidence=[f"Based on {len(subgraph.edges)} relations"],
            )

        return QueryResult(
            query=query,
            answer="Please specify a concept to define",
            relevant_concepts=[],
            confidence=0.3,
            evidence=[],
        )

    def _answer_general_query(
        self,
        query: str,
        concepts: List[str],
    ) -> QueryResult:
        """Answer general queries."""
        if concepts:
            # Provide information about first concept
            concept = concepts[0]
            subgraph = self.extract_subgraph(concept, depth=1)

            answer = f"Information about {concept}: connected to {len(subgraph.nodes) - 1} concepts through {len(subgraph.edges)} relations."

            return QueryResult(
                query=query,
                answer=answer,
                relevant_concepts=subgraph.nodes[:10],
                confidence=0.6,
                evidence=[f"Subgraph analysis"],
            )

        return QueryResult(
            query=query,
            answer="Could not understand the query. Try asking about prerequisites, learning paths, or related concepts.",
            relevant_concepts=[],
            confidence=0.2,
            evidence=[],
        )

    def get_neighbors(
        self,
        concept: str,
        relation_type: Optional[str] = None,
        direction: str = "both",
    ) -> List[Tuple[str, str]]:
        """
        Get neighboring concepts.

        Args:
            concept: Center concept
            relation_type: Filter by relation type
            direction: outgoing, incoming, or both

        Returns:
            List of (neighbor, relation_type) tuples
        """
        concept = concept.lower()
        neighbors = []

        if direction in ("outgoing", "both"):
            for rel_type, targets in self._adjacency.get(concept, {}).items():
                if relation_type is None or rel_type == relation_type:
                    for target in targets:
                        neighbors.append((target, rel_type))

        if direction in ("incoming", "both"):
            for rel_type, sources in self._reverse_adjacency.get(concept, {}).items():
                if relation_type is None or rel_type == relation_type:
                    for source in sources:
                        neighbors.append((source, f"inverse_{rel_type}"))

        return neighbors

    def get_all_concepts(self) -> List[str]:
        """Get all concepts in the knowledge graph."""
        return list(self._all_nodes)

    def get_statistics(self) -> Dict[str, Any]:
        """Get graph statistics."""
        relation_counts = {}
        for node in self._adjacency:
            for rel_type, targets in self._adjacency[node].items():
                relation_counts[rel_type] = relation_counts.get(rel_type, 0) + len(targets)

        return {
            "num_nodes": len(self._all_nodes),
            "num_edges": sum(relation_counts.values()),
            "relation_counts": relation_counts,
            "avg_out_degree": sum(
                sum(len(t) for t in rels.values())
                for rels in self._adjacency.values()
            ) / max(len(self._adjacency), 1),
        }
