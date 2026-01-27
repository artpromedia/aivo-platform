"""
Graph Maintenance Service

Tools for maintaining knowledge graph quality over time including:
- Graph validation
- Weak edge pruning
- Duplicate concept merging
- Embedding refresh
"""
import logging
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Set, Tuple, Any
from datetime import datetime
from collections import deque
from enum import Enum

import numpy as np

logger = logging.getLogger(__name__)


class IssueType(str, Enum):
    """Types of graph issues."""
    ORPHAN_NODE = "orphan_node"
    CYCLE_DETECTED = "cycle_detected"
    MISSING_ATTRIBUTE = "missing_attribute"
    LOW_CONFIDENCE = "low_confidence"
    DUPLICATE_CONCEPT = "duplicate_concept"
    INCONSISTENT_RELATION = "inconsistent_relation"
    DEAD_END = "dead_end"
    UNREACHABLE = "unreachable"


class IssueSeverity(str, Enum):
    """Severity of graph issues."""
    CRITICAL = "critical"
    WARNING = "warning"
    INFO = "info"


@dataclass
class GraphIssue:
    """An issue found in the graph."""
    issue_type: str
    severity: str
    affected_nodes: List[str]
    affected_edges: List[Tuple[str, str, str]] = field(default_factory=list)
    description: str = ""
    suggestion: str = ""


@dataclass
class ValidationReport:
    """Report from graph validation."""
    graph_id: str
    timestamp: str
    is_valid: bool
    total_nodes: int
    total_edges: int
    issues: List[GraphIssue]
    statistics: Dict[str, Any]
    recommendations: List[str]


@dataclass
class PruneResult:
    """Result of edge pruning."""
    edges_removed: int
    edges_kept: int
    removed_edges: List[Tuple[str, str, str, float]]
    confidence_threshold: float
    timestamp: str


@dataclass
class MergeResult:
    """Result of duplicate merging."""
    concepts_merged: int
    merge_pairs: List[Tuple[str, str, float]]
    similarity_threshold: float
    timestamp: str


@dataclass
class GraphMaintenanceConfig:
    """Configuration for graph maintenance."""
    # Validation settings
    required_attributes: List[str] = field(default_factory=lambda: ["name", "domain"])
    min_confidence_threshold: float = 0.3
    max_cycle_length: int = 10

    # Pruning settings
    default_prune_threshold: float = 0.5

    # Merging settings
    default_similarity_threshold: float = 0.9
    embedding_dimension: int = 128

    # Refresh settings
    embedding_staleness_days: int = 30


# Sample graph data for maintenance
SAMPLE_GRAPH_DATA = {
    "nodes": {
        "arithmetic": {"name": "Arithmetic", "domain": "math", "difficulty": 0.1, "created_at": "2024-01-01"},
        "algebra": {"name": "Algebra", "domain": "math", "difficulty": 0.4, "created_at": "2024-01-01"},
        "calculus": {"name": "Calculus", "domain": "math", "difficulty": 0.7, "created_at": "2024-01-01"},
        "geometry": {"name": "Geometry", "domain": "math", "difficulty": 0.35, "created_at": "2024-01-01"},
        "trigonometry": {"name": "Trigonometry", "domain": "math", "difficulty": 0.5, "created_at": "2024-01-01"},
        "programming": {"name": "Programming", "domain": "cs", "difficulty": 0.3, "created_at": "2024-01-01"},
        "data_structures": {"name": "Data Structures", "domain": "cs", "difficulty": 0.55, "created_at": "2024-01-01"},
        "orphan_concept": {"name": "Orphan", "domain": "misc"},  # No connections
        "basic_math": {"name": "Basic Math", "domain": "math", "difficulty": 0.1},  # Potential duplicate
    },
    "edges": [
        ("arithmetic", "algebra", "prerequisite", 1.0),
        ("algebra", "calculus", "prerequisite", 1.0),
        ("geometry", "trigonometry", "prerequisite", 1.0),
        ("algebra", "trigonometry", "prerequisite", 0.8),
        ("trigonometry", "calculus", "prerequisite", 0.9),
        ("programming", "data_structures", "prerequisite", 1.0),
        ("arithmetic", "programming", "related", 0.3),  # Low confidence
        ("calculus", "arithmetic", "related", 0.2),  # Potential cycle issue
    ],
}


class GraphMaintenance:
    """
    Tools for maintaining knowledge graph quality over time.

    Capabilities:
    - Validate graph for issues
    - Prune weak edges
    - Merge duplicate concepts
    - Refresh embeddings

    Usage:
        maintenance = GraphMaintenance()
        report = await maintenance.validate_graph("graph_123")
        prune_result = await maintenance.prune_weak_edges("graph_123", threshold=0.5)
    """

    def __init__(
        self,
        config: Optional[GraphMaintenanceConfig] = None,
    ):
        self.config = config or GraphMaintenanceConfig()

        # In-memory graph storage (would be replaced with database in production)
        self._graphs: Dict[str, Dict[str, Any]] = {}
        self._embeddings: Dict[str, Dict[str, np.ndarray]] = {}
        self._embedding_timestamps: Dict[str, str] = {}

        # Load sample data
        self._graphs["default"] = SAMPLE_GRAPH_DATA

        logger.info("GraphMaintenance initialized")

    async def validate_graph(
        self,
        graph_id: str,
    ) -> ValidationReport:
        """
        Validate graph for various issues.

        Checks for:
        - Orphan nodes (no connections)
        - Cycles in prerequisite relations
        - Missing required attributes
        - Low-confidence relations

        Args:
            graph_id: Graph identifier

        Returns:
            ValidationReport with findings
        """
        graph = self._get_graph(graph_id)
        if not graph:
            return ValidationReport(
                graph_id=graph_id,
                timestamp=datetime.now().isoformat(),
                is_valid=False,
                total_nodes=0,
                total_edges=0,
                issues=[GraphIssue(
                    issue_type=IssueType.MISSING_ATTRIBUTE.value,
                    severity=IssueSeverity.CRITICAL.value,
                    affected_nodes=[],
                    description=f"Graph {graph_id} not found",
                )],
                statistics={},
                recommendations=["Create or import the graph first"],
            )

        issues = []
        nodes = graph.get("nodes", {})
        edges = graph.get("edges", [])

        # Check for orphan nodes
        orphan_issues = self._check_orphan_nodes(nodes, edges)
        issues.extend(orphan_issues)

        # Check for cycles in prerequisites
        cycle_issues = self._check_cycles(nodes, edges)
        issues.extend(cycle_issues)

        # Check for missing attributes
        attribute_issues = self._check_missing_attributes(nodes)
        issues.extend(attribute_issues)

        # Check for low-confidence relations
        confidence_issues = self._check_low_confidence(edges)
        issues.extend(confidence_issues)

        # Check for potential duplicates
        duplicate_issues = self._check_duplicates(nodes)
        issues.extend(duplicate_issues)

        # Check for dead ends and unreachable nodes
        structure_issues = self._check_graph_structure(nodes, edges)
        issues.extend(structure_issues)

        # Calculate statistics
        statistics = self._calculate_statistics(nodes, edges)

        # Generate recommendations
        recommendations = self._generate_recommendations(issues, statistics)

        # Determine if valid
        critical_issues = [i for i in issues if i.severity == IssueSeverity.CRITICAL.value]
        is_valid = len(critical_issues) == 0

        return ValidationReport(
            graph_id=graph_id,
            timestamp=datetime.now().isoformat(),
            is_valid=is_valid,
            total_nodes=len(nodes),
            total_edges=len(edges),
            issues=issues,
            statistics=statistics,
            recommendations=recommendations,
        )

    async def prune_weak_edges(
        self,
        graph_id: str,
        confidence_threshold: Optional[float] = None,
    ) -> PruneResult:
        """
        Remove low-confidence relationships from the graph.

        Args:
            graph_id: Graph identifier
            confidence_threshold: Minimum confidence to keep (default from config)

        Returns:
            PruneResult with removed edges
        """
        threshold = confidence_threshold or self.config.default_prune_threshold
        graph = self._get_graph(graph_id)

        if not graph:
            return PruneResult(
                edges_removed=0,
                edges_kept=0,
                removed_edges=[],
                confidence_threshold=threshold,
                timestamp=datetime.now().isoformat(),
            )

        edges = graph.get("edges", [])
        removed = []
        kept = []

        for edge in edges:
            source, target, rel_type, confidence = edge
            if confidence < threshold:
                removed.append(edge)
            else:
                kept.append(edge)

        # Update graph
        graph["edges"] = kept

        return PruneResult(
            edges_removed=len(removed),
            edges_kept=len(kept),
            removed_edges=removed,
            confidence_threshold=threshold,
            timestamp=datetime.now().isoformat(),
        )

    async def merge_duplicate_concepts(
        self,
        graph_id: str,
        similarity_threshold: Optional[float] = None,
    ) -> MergeResult:
        """
        Find and merge duplicate or near-duplicate concepts.

        Args:
            graph_id: Graph identifier
            similarity_threshold: Minimum similarity to merge (default from config)

        Returns:
            MergeResult with merged pairs
        """
        threshold = similarity_threshold or self.config.default_similarity_threshold
        graph = self._get_graph(graph_id)

        if not graph:
            return MergeResult(
                concepts_merged=0,
                merge_pairs=[],
                similarity_threshold=threshold,
                timestamp=datetime.now().isoformat(),
            )

        nodes = graph.get("nodes", {})
        edges = graph.get("edges", [])

        # Find similar pairs
        similar_pairs = self._find_similar_pairs(nodes, threshold)

        # Merge pairs
        merged_count = 0
        for node1, node2, similarity in similar_pairs:
            # Keep the node with more connections
            conn1 = self._count_connections(node1, edges)
            conn2 = self._count_connections(node2, edges)

            keep, remove = (node1, node2) if conn1 >= conn2 else (node2, node1)

            # Merge attributes
            self._merge_node_attributes(nodes, keep, remove)

            # Redirect edges
            self._redirect_edges(edges, remove, keep)

            # Remove duplicate
            if remove in nodes:
                del nodes[remove]
                merged_count += 1

        return MergeResult(
            concepts_merged=merged_count,
            merge_pairs=similar_pairs,
            similarity_threshold=threshold,
            timestamp=datetime.now().isoformat(),
        )

    async def refresh_embeddings(
        self,
        graph_id: str,
        force: bool = False,
    ) -> Dict[str, Any]:
        """
        Refresh embeddings when graph changes significantly.

        Args:
            graph_id: Graph identifier
            force: Force refresh even if not stale

        Returns:
            Refresh status
        """
        graph = self._get_graph(graph_id)
        if not graph:
            return {"status": "error", "message": f"Graph {graph_id} not found"}

        # Check if refresh needed
        last_refresh = self._embedding_timestamps.get(graph_id)
        needs_refresh = force

        if last_refresh and not force:
            last_date = datetime.fromisoformat(last_refresh)
            days_since = (datetime.now() - last_date).days
            needs_refresh = days_since >= self.config.embedding_staleness_days

        if not needs_refresh:
            return {
                "status": "skipped",
                "message": "Embeddings are up to date",
                "last_refresh": last_refresh,
            }

        # Generate new embeddings
        nodes = graph.get("nodes", {})
        edges = graph.get("edges", [])

        embeddings = self._compute_embeddings(nodes, edges)
        self._embeddings[graph_id] = embeddings
        self._embedding_timestamps[graph_id] = datetime.now().isoformat()

        return {
            "status": "success",
            "message": f"Refreshed embeddings for {len(embeddings)} concepts",
            "timestamp": self._embedding_timestamps[graph_id],
        }

    async def repair_graph(
        self,
        graph_id: str,
        auto_fix: bool = False,
    ) -> Dict[str, Any]:
        """
        Attempt to repair common graph issues.

        Args:
            graph_id: Graph identifier
            auto_fix: Automatically apply fixes

        Returns:
            Repair results
        """
        # First validate
        report = await self.validate_graph(graph_id)

        if report.is_valid:
            return {
                "status": "no_repairs_needed",
                "message": "Graph is valid",
            }

        repairs = []
        graph = self._get_graph(graph_id)

        for issue in report.issues:
            if issue.issue_type == IssueType.ORPHAN_NODE.value and auto_fix:
                # Remove orphan nodes
                for node in issue.affected_nodes:
                    if node in graph["nodes"]:
                        del graph["nodes"][node]
                        repairs.append(f"Removed orphan node: {node}")

            elif issue.issue_type == IssueType.LOW_CONFIDENCE.value and auto_fix:
                # Remove low confidence edges
                graph["edges"] = [
                    e for e in graph["edges"]
                    if e[3] >= self.config.min_confidence_threshold
                ]
                repairs.append("Removed low-confidence edges")

            elif issue.issue_type == IssueType.MISSING_ATTRIBUTE.value and auto_fix:
                # Add default attributes
                for node in issue.affected_nodes:
                    if node in graph["nodes"]:
                        for attr in self.config.required_attributes:
                            if attr not in graph["nodes"][node]:
                                if attr == "name":
                                    graph["nodes"][node][attr] = node.replace("_", " ").title()
                                elif attr == "domain":
                                    graph["nodes"][node][attr] = "general"
                        repairs.append(f"Added missing attributes to: {node}")

        return {
            "status": "repaired" if repairs else "pending",
            "repairs_made": repairs,
            "issues_remaining": len(report.issues) - len(repairs),
            "auto_fix_enabled": auto_fix,
        }

    async def get_graph_health(
        self,
        graph_id: str,
    ) -> Dict[str, Any]:
        """
        Get overall health score for a graph.

        Args:
            graph_id: Graph identifier

        Returns:
            Health metrics
        """
        report = await self.validate_graph(graph_id)

        # Calculate health score
        if report.total_nodes == 0:
            return {"health_score": 0, "status": "empty"}

        # Deductions for issues
        score = 100.0
        for issue in report.issues:
            if issue.severity == IssueSeverity.CRITICAL.value:
                score -= 20
            elif issue.severity == IssueSeverity.WARNING.value:
                score -= 10
            else:
                score -= 2

        score = max(0, score)

        # Determine status
        if score >= 90:
            status = "excellent"
        elif score >= 70:
            status = "good"
        elif score >= 50:
            status = "fair"
        else:
            status = "poor"

        return {
            "health_score": score,
            "status": status,
            "total_issues": len(report.issues),
            "critical_issues": len([i for i in report.issues if i.severity == IssueSeverity.CRITICAL.value]),
            "statistics": report.statistics,
        }

    def _get_graph(self, graph_id: str) -> Optional[Dict[str, Any]]:
        """Get graph by ID."""
        return self._graphs.get(graph_id)

    def _check_orphan_nodes(
        self,
        nodes: Dict[str, Dict],
        edges: List[Tuple],
    ) -> List[GraphIssue]:
        """Check for nodes with no connections."""
        connected = set()
        for edge in edges:
            connected.add(edge[0])
            connected.add(edge[1])

        orphans = [n for n in nodes if n not in connected]

        if orphans:
            return [GraphIssue(
                issue_type=IssueType.ORPHAN_NODE.value,
                severity=IssueSeverity.WARNING.value,
                affected_nodes=orphans,
                description=f"Found {len(orphans)} orphan nodes with no connections",
                suggestion="Remove or connect these nodes to the graph",
            )]
        return []

    def _check_cycles(
        self,
        nodes: Dict[str, Dict],
        edges: List[Tuple],
    ) -> List[GraphIssue]:
        """Check for cycles in prerequisite relations."""
        # Build adjacency for prerequisites only
        prereq_adj: Dict[str, List[str]] = {n: [] for n in nodes}
        for source, target, rel_type, _ in edges:
            if rel_type == "prerequisite" and source in prereq_adj:
                prereq_adj[source].append(target)

        # DFS for cycle detection
        cycles = []
        visited = set()
        rec_stack = set()

        def dfs(node: str, path: List[str]) -> bool:
            visited.add(node)
            rec_stack.add(node)

            for neighbor in prereq_adj.get(node, []):
                if neighbor not in visited:
                    if dfs(neighbor, path + [neighbor]):
                        return True
                elif neighbor in rec_stack:
                    cycles.append(path + [neighbor])
                    return True

            rec_stack.remove(node)
            return False

        for node in nodes:
            if node not in visited:
                dfs(node, [node])

        issues = []
        for cycle in cycles:
            if len(cycle) <= self.config.max_cycle_length:
                issues.append(GraphIssue(
                    issue_type=IssueType.CYCLE_DETECTED.value,
                    severity=IssueSeverity.CRITICAL.value,
                    affected_nodes=cycle,
                    description=f"Cycle detected in prerequisites: {' -> '.join(cycle)}",
                    suggestion="Remove one edge to break the cycle",
                ))

        return issues

    def _check_missing_attributes(
        self,
        nodes: Dict[str, Dict],
    ) -> List[GraphIssue]:
        """Check for missing required attributes."""
        missing = []

        for node_id, node_data in nodes.items():
            for attr in self.config.required_attributes:
                if attr not in node_data:
                    missing.append(node_id)
                    break

        if missing:
            return [GraphIssue(
                issue_type=IssueType.MISSING_ATTRIBUTE.value,
                severity=IssueSeverity.WARNING.value,
                affected_nodes=missing,
                description=f"Found {len(missing)} nodes missing required attributes",
                suggestion=f"Add required attributes: {', '.join(self.config.required_attributes)}",
            )]
        return []

    def _check_low_confidence(
        self,
        edges: List[Tuple],
    ) -> List[GraphIssue]:
        """Check for low-confidence relations."""
        low_conf = [e for e in edges if e[3] < self.config.min_confidence_threshold]

        if low_conf:
            affected_edges = [(e[0], e[1], e[2]) for e in low_conf]
            return [GraphIssue(
                issue_type=IssueType.LOW_CONFIDENCE.value,
                severity=IssueSeverity.INFO.value,
                affected_nodes=[],
                affected_edges=affected_edges,
                description=f"Found {len(low_conf)} edges with confidence below {self.config.min_confidence_threshold}",
                suggestion="Review or remove low-confidence edges",
            )]
        return []

    def _check_duplicates(
        self,
        nodes: Dict[str, Dict],
    ) -> List[GraphIssue]:
        """Check for potential duplicate concepts."""
        # Simple name similarity check
        issues = []
        node_names = [(nid, n.get("name", nid).lower()) for nid, n in nodes.items()]

        for i, (id1, name1) in enumerate(node_names):
            for id2, name2 in node_names[i+1:]:
                similarity = self._string_similarity(name1, name2)
                if similarity > 0.8 and id1 != id2:
                    issues.append(GraphIssue(
                        issue_type=IssueType.DUPLICATE_CONCEPT.value,
                        severity=IssueSeverity.WARNING.value,
                        affected_nodes=[id1, id2],
                        description=f"Potential duplicates: '{id1}' and '{id2}' (similarity: {similarity:.2f})",
                        suggestion="Consider merging these concepts",
                    ))

        return issues

    def _check_graph_structure(
        self,
        nodes: Dict[str, Dict],
        edges: List[Tuple],
    ) -> List[GraphIssue]:
        """Check for structural issues like dead ends."""
        issues = []

        # Build adjacency
        outgoing: Dict[str, Set[str]] = {n: set() for n in nodes}
        incoming: Dict[str, Set[str]] = {n: set() for n in nodes}

        for source, target, _, _ in edges:
            if source in outgoing:
                outgoing[source].add(target)
            if target in incoming:
                incoming[target].add(source)

        # Find dead ends (nodes with no outgoing prerequisite edges that aren't terminal)
        # and roots (nodes with no incoming edges)
        dead_ends = [n for n in nodes if not outgoing[n] and incoming[n]]
        roots = [n for n in nodes if not incoming[n] and outgoing[n]]

        # These aren't necessarily issues, but worth noting
        if len(roots) == 0 and len(nodes) > 0:
            issues.append(GraphIssue(
                issue_type=IssueType.UNREACHABLE.value,
                severity=IssueSeverity.INFO.value,
                affected_nodes=[],
                description="No root concepts found (concepts with no prerequisites)",
                suggestion="Ensure there are foundational concepts",
            ))

        return issues

    def _calculate_statistics(
        self,
        nodes: Dict[str, Dict],
        edges: List[Tuple],
    ) -> Dict[str, Any]:
        """Calculate graph statistics."""
        if not nodes:
            return {"density": 0, "avg_degree": 0}

        # Degree statistics
        degrees = {n: 0 for n in nodes}
        for source, target, _, _ in edges:
            if source in degrees:
                degrees[source] += 1
            if target in degrees:
                degrees[target] += 1

        # Concepts by domain
        by_domain: Dict[str, int] = {}
        for node in nodes.values():
            domain = node.get("domain", "unknown")
            by_domain[domain] = by_domain.get(domain, 0) + 1

        # Relations by type
        by_type: Dict[str, int] = {}
        for _, _, rel_type, _ in edges:
            by_type[rel_type] = by_type.get(rel_type, 0) + 1

        # Max path length (simplified - would need full BFS in production)
        max_path = min(len(nodes), 10)

        # Density
        max_edges = len(nodes) * (len(nodes) - 1)
        density = len(edges) / max_edges if max_edges > 0 else 0

        return {
            "total_concepts": len(nodes),
            "total_relations": len(edges),
            "concepts_by_domain": by_domain,
            "relations_by_type": by_type,
            "average_prerequisites": sum(degrees.values()) / len(nodes) / 2 if nodes else 0,
            "max_path_length": max_path,
            "density": density,
            "connected_components": 1,  # Simplified
        }

    def _generate_recommendations(
        self,
        issues: List[GraphIssue],
        statistics: Dict[str, Any],
    ) -> List[str]:
        """Generate recommendations based on validation results."""
        recommendations = []

        if any(i.issue_type == IssueType.CYCLE_DETECTED.value for i in issues):
            recommendations.append("Critical: Remove cycles in prerequisite relationships")

        if any(i.issue_type == IssueType.ORPHAN_NODE.value for i in issues):
            recommendations.append("Connect or remove orphan nodes")

        if any(i.issue_type == IssueType.DUPLICATE_CONCEPT.value for i in issues):
            recommendations.append("Review and merge duplicate concepts")

        density = statistics.get("density", 0)
        if density < 0.1:
            recommendations.append("Graph is sparse - consider adding more relationships")
        elif density > 0.5:
            recommendations.append("Graph is dense - review for redundant relationships")

        avg_prereqs = statistics.get("average_prerequisites", 0)
        if avg_prereqs > 5:
            recommendations.append("Average prerequisites is high - consider simplifying")

        return recommendations

    def _find_similar_pairs(
        self,
        nodes: Dict[str, Dict],
        threshold: float,
    ) -> List[Tuple[str, str, float]]:
        """Find pairs of similar nodes."""
        pairs = []
        node_list = list(nodes.items())

        for i, (id1, data1) in enumerate(node_list):
            for id2, data2 in node_list[i+1:]:
                similarity = self._calculate_node_similarity(data1, data2)
                if similarity >= threshold:
                    pairs.append((id1, id2, similarity))

        return pairs

    def _calculate_node_similarity(
        self,
        node1: Dict,
        node2: Dict,
    ) -> float:
        """Calculate similarity between two nodes."""
        score = 0.0
        weights = 0.0

        # Name similarity
        name1 = node1.get("name", "").lower()
        name2 = node2.get("name", "").lower()
        if name1 and name2:
            name_sim = self._string_similarity(name1, name2)
            score += name_sim * 0.5
            weights += 0.5

        # Domain match
        if node1.get("domain") == node2.get("domain"):
            score += 0.3
        weights += 0.3

        # Difficulty similarity
        diff1 = node1.get("difficulty", 0.5)
        diff2 = node2.get("difficulty", 0.5)
        diff_sim = 1 - abs(diff1 - diff2)
        score += diff_sim * 0.2
        weights += 0.2

        return score / weights if weights > 0 else 0.0

    def _string_similarity(self, s1: str, s2: str) -> float:
        """Calculate string similarity using Jaccard on character n-grams."""
        if not s1 or not s2:
            return 0.0

        # Character 2-grams
        def ngrams(s, n=2):
            return set(s[i:i+n] for i in range(len(s)-n+1))

        ng1 = ngrams(s1)
        ng2 = ngrams(s2)

        if not ng1 or not ng2:
            return 1.0 if s1 == s2 else 0.0

        intersection = len(ng1 & ng2)
        union = len(ng1 | ng2)

        return intersection / union if union > 0 else 0.0

    def _count_connections(self, node_id: str, edges: List[Tuple]) -> int:
        """Count connections for a node."""
        count = 0
        for source, target, _, _ in edges:
            if source == node_id or target == node_id:
                count += 1
        return count

    def _merge_node_attributes(
        self,
        nodes: Dict[str, Dict],
        keep: str,
        remove: str,
    ):
        """Merge attributes from removed node into kept node."""
        if remove not in nodes or keep not in nodes:
            return

        remove_data = nodes[remove]
        keep_data = nodes[keep]

        # Merge missing attributes
        for key, value in remove_data.items():
            if key not in keep_data:
                keep_data[key] = value

    def _redirect_edges(
        self,
        edges: List[Tuple],
        from_node: str,
        to_node: str,
    ):
        """Redirect edges from one node to another."""
        for i, edge in enumerate(edges):
            source, target, rel_type, conf = edge
            if source == from_node:
                edges[i] = (to_node, target, rel_type, conf)
            if target == from_node:
                edges[i] = (source, to_node, rel_type, conf)

    def _compute_embeddings(
        self,
        nodes: Dict[str, Dict],
        edges: List[Tuple],
    ) -> Dict[str, np.ndarray]:
        """Compute embeddings for nodes (simplified)."""
        embeddings = {}
        dim = self.config.embedding_dimension

        for node_id, node_data in nodes.items():
            # Simple embedding based on attributes
            embedding = np.random.randn(dim)

            # Adjust based on difficulty
            difficulty = node_data.get("difficulty", 0.5)
            embedding[0] = difficulty

            # Normalize
            embedding = embedding / np.linalg.norm(embedding)
            embeddings[node_id] = embedding

        return embeddings

    def add_graph(
        self,
        graph_id: str,
        nodes: Dict[str, Dict],
        edges: List[Tuple[str, str, str, float]],
    ):
        """Add or update a graph."""
        self._graphs[graph_id] = {
            "nodes": nodes,
            "edges": edges,
        }

    def get_graph_ids(self) -> List[str]:
        """Get all graph IDs."""
        return list(self._graphs.keys())
