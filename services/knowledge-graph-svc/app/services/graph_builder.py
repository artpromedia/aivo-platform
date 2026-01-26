"""
Graph Builder

Build and maintain the curriculum knowledge graph with Neo4j integration.
"""
import logging
import json
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Set, Tuple
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)


@dataclass
class ConceptNode:
    """Represents a concept node in the graph."""
    id: str
    name: str
    domain: str
    description: Optional[str] = None
    difficulty: int = 3
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class RelationEdge:
    """Represents a relation edge in the graph."""
    source_id: str
    target_id: str
    relation_type: str
    confidence: float = 1.0
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class GraphBuilderConfig:
    """Configuration for graph builder."""
    neo4j_uri: Optional[str] = None
    neo4j_user: Optional[str] = None
    neo4j_password: Optional[str] = None
    use_neo4j: bool = False
    auto_create_missing_nodes: bool = True


# Curriculum standards templates
CURRICULUM_TEMPLATES = {
    "common_core": {
        "math": {
            "K": ["counting", "numbers", "shapes"],
            "1": ["addition", "subtraction", "place value"],
            "2": ["measurement", "time", "money"],
            "3": ["multiplication", "division", "fractions"],
            "4": ["decimals", "factors", "patterns"],
            "5": ["operations", "fractions", "geometry"],
            "6": ["ratios", "expressions", "statistics"],
            "7": ["proportions", "algebra", "probability"],
            "8": ["linear equations", "functions", "geometry proofs"],
            "algebra": ["polynomials", "factoring", "quadratics"],
            "geometry": ["congruence", "similarity", "trigonometry"],
            "algebra2": ["complex numbers", "exponentials", "sequences"],
            "precalculus": ["trigonometry", "limits", "vectors"],
            "calculus": ["derivatives", "integrals", "series"],
        },
        "science": {
            "K-2": ["living things", "weather", "matter"],
            "3-5": ["ecosystems", "earth systems", "energy"],
            "6-8": ["cells", "forces", "chemistry"],
            "9-12": ["biology", "chemistry", "physics"],
        },
    },
    "ngss": {
        "physical_science": ["motion", "forces", "energy", "waves"],
        "life_science": ["cells", "genetics", "evolution", "ecosystems"],
        "earth_science": ["geology", "weather", "climate", "space"],
    },
}


class GraphBuilder:
    """
    Build and maintain the curriculum knowledge graph.

    Operations:
    - Add/remove concepts
    - Add/remove relations
    - Import from curriculum standards
    - Merge graphs
    - Neo4j integration (optional)

    Usage:
        builder = GraphBuilder()
        builder.add_concept("calc_101", "Calculus I", "math")
        builder.add_relation("calc_101", "algebra", "prerequisite")
    """

    def __init__(
        self,
        config: Optional[GraphBuilderConfig] = None,
        neo4j_uri: Optional[str] = None,
    ):
        self.config = config or GraphBuilderConfig(neo4j_uri=neo4j_uri)
        self.neo4j_uri = neo4j_uri or self.config.neo4j_uri

        # In-memory graph storage
        self._concepts: Dict[str, ConceptNode] = {}
        self._relations: List[RelationEdge] = []
        self._adjacency: Dict[str, Set[str]] = {}  # source -> targets
        self._reverse_adjacency: Dict[str, Set[str]] = {}  # target -> sources

        # Neo4j connection (lazy initialization)
        self._neo4j_driver = None

        logger.info("GraphBuilder initialized")

    def _ensure_neo4j(self):
        """Ensure Neo4j connection if configured."""
        if self.config.use_neo4j and self._neo4j_driver is None:
            try:
                from neo4j import GraphDatabase
                self._neo4j_driver = GraphDatabase.driver(
                    self.config.neo4j_uri,
                    auth=(self.config.neo4j_user, self.config.neo4j_password)
                )
            except ImportError:
                logger.warning("Neo4j driver not available")
            except Exception as e:
                logger.warning(f"Failed to connect to Neo4j: {e}")

    def add_concept(
        self,
        concept_id: str,
        name: str,
        domain: str,
        description: Optional[str] = None,
        difficulty: int = 3,
        metadata: Optional[Dict] = None,
    ) -> ConceptNode:
        """
        Add a concept to the graph.

        Args:
            concept_id: Unique identifier for the concept
            name: Display name
            domain: Subject domain (math, science, etc.)
            description: Optional description
            difficulty: Difficulty level (1-6)
            metadata: Additional metadata

        Returns:
            Created ConceptNode
        """
        concept = ConceptNode(
            id=concept_id,
            name=name,
            domain=domain,
            description=description,
            difficulty=difficulty,
            metadata=metadata or {},
        )

        self._concepts[concept_id] = concept

        # Initialize adjacency lists
        if concept_id not in self._adjacency:
            self._adjacency[concept_id] = set()
        if concept_id not in self._reverse_adjacency:
            self._reverse_adjacency[concept_id] = set()

        # Add to Neo4j if configured
        if self.config.use_neo4j:
            self._add_concept_neo4j(concept)

        logger.debug(f"Added concept: {concept_id}")
        return concept

    def _add_concept_neo4j(self, concept: ConceptNode):
        """Add concept to Neo4j."""
        self._ensure_neo4j()
        if self._neo4j_driver:
            with self._neo4j_driver.session() as session:
                session.run(
                    """
                    MERGE (c:Concept {id: $id})
                    SET c.name = $name, c.domain = $domain,
                        c.description = $description, c.difficulty = $difficulty
                    """,
                    id=concept.id,
                    name=concept.name,
                    domain=concept.domain,
                    description=concept.description,
                    difficulty=concept.difficulty,
                )

    def remove_concept(self, concept_id: str) -> bool:
        """Remove a concept and its relations."""
        if concept_id not in self._concepts:
            return False

        # Remove relations involving this concept
        self._relations = [
            r for r in self._relations
            if r.source_id != concept_id and r.target_id != concept_id
        ]

        # Update adjacency lists
        for targets in self._adjacency.values():
            targets.discard(concept_id)
        for sources in self._reverse_adjacency.values():
            sources.discard(concept_id)

        del self._concepts[concept_id]
        self._adjacency.pop(concept_id, None)
        self._reverse_adjacency.pop(concept_id, None)

        return True

    def add_relation(
        self,
        source_id: str,
        target_id: str,
        relation_type: str,
        confidence: float = 1.0,
        metadata: Optional[Dict] = None,
    ) -> Optional[RelationEdge]:
        """
        Add a relation between concepts.

        Args:
            source_id: Source concept ID
            target_id: Target concept ID
            relation_type: Type of relation (prerequisite, related, part_of, etc.)
            confidence: Confidence score (0-1)
            metadata: Additional metadata

        Returns:
            Created RelationEdge or None if concepts don't exist
        """
        # Auto-create missing nodes if configured
        if self.config.auto_create_missing_nodes:
            if source_id not in self._concepts:
                self.add_concept(source_id, source_id, "unknown")
            if target_id not in self._concepts:
                self.add_concept(target_id, target_id, "unknown")
        else:
            if source_id not in self._concepts or target_id not in self._concepts:
                logger.warning(f"Cannot add relation: missing concept(s)")
                return None

        relation = RelationEdge(
            source_id=source_id,
            target_id=target_id,
            relation_type=relation_type,
            confidence=confidence,
            metadata=metadata or {},
        )

        self._relations.append(relation)
        self._adjacency[source_id].add(target_id)
        self._reverse_adjacency[target_id].add(source_id)

        # Add to Neo4j if configured
        if self.config.use_neo4j:
            self._add_relation_neo4j(relation)

        logger.debug(f"Added relation: {source_id} -{relation_type}-> {target_id}")
        return relation

    def _add_relation_neo4j(self, relation: RelationEdge):
        """Add relation to Neo4j."""
        self._ensure_neo4j()
        if self._neo4j_driver:
            with self._neo4j_driver.session() as session:
                session.run(
                    f"""
                    MATCH (s:Concept {{id: $source_id}})
                    MATCH (t:Concept {{id: $target_id}})
                    MERGE (s)-[r:{relation.relation_type.upper()}]->(t)
                    SET r.confidence = $confidence
                    """,
                    source_id=relation.source_id,
                    target_id=relation.target_id,
                    confidence=relation.confidence,
                )

    def remove_relation(
        self,
        source_id: str,
        target_id: str,
        relation_type: Optional[str] = None,
    ) -> bool:
        """Remove relation(s) between concepts."""
        initial_count = len(self._relations)

        if relation_type:
            self._relations = [
                r for r in self._relations
                if not (r.source_id == source_id and
                        r.target_id == target_id and
                        r.relation_type == relation_type)
            ]
        else:
            self._relations = [
                r for r in self._relations
                if not (r.source_id == source_id and r.target_id == target_id)
            ]

        # Update adjacency
        remaining_targets = {r.target_id for r in self._relations if r.source_id == source_id}
        self._adjacency[source_id] = remaining_targets

        remaining_sources = {r.source_id for r in self._relations if r.target_id == target_id}
        self._reverse_adjacency[target_id] = remaining_sources

        return len(self._relations) < initial_count

    def import_curriculum(
        self,
        curriculum_data: Dict[str, Any],
        standard: str = "common_core",
    ) -> Dict[str, int]:
        """
        Import curriculum as graph structure.

        Args:
            curriculum_data: Curriculum data to import
            standard: Curriculum standard name

        Returns:
            Statistics about imported data
        """
        stats = {"concepts": 0, "relations": 0}

        # If no data provided, use template
        if not curriculum_data:
            curriculum_data = CURRICULUM_TEMPLATES.get(standard, {})

        def process_curriculum(data: Dict, parent_domain: str = "", parent_id: str = ""):
            nonlocal stats

            for key, value in data.items():
                concept_id = f"{parent_id}_{key}" if parent_id else key
                domain = parent_domain or key

                if isinstance(value, list):
                    # Leaf level: list of concepts
                    for concept_name in value:
                        cid = f"{concept_id}_{concept_name}".replace(" ", "_")
                        self.add_concept(cid, concept_name, domain)
                        stats["concepts"] += 1

                        # Add relation to parent
                        if parent_id:
                            self.add_relation(cid, parent_id, "part_of")
                            stats["relations"] += 1

                elif isinstance(value, dict):
                    # Intermediate level
                    self.add_concept(concept_id, key, domain)
                    stats["concepts"] += 1

                    if parent_id:
                        self.add_relation(concept_id, parent_id, "part_of")
                        stats["relations"] += 1

                    process_curriculum(value, domain, concept_id)

        process_curriculum(curriculum_data)
        logger.info(f"Imported curriculum: {stats}")
        return stats

    def get_concept(self, concept_id: str) -> Optional[ConceptNode]:
        """Get a concept by ID."""
        return self._concepts.get(concept_id)

    def get_concepts(
        self,
        domain: Optional[str] = None,
        difficulty_range: Optional[Tuple[int, int]] = None,
    ) -> List[ConceptNode]:
        """Get concepts with optional filtering."""
        concepts = list(self._concepts.values())

        if domain:
            concepts = [c for c in concepts if c.domain == domain]

        if difficulty_range:
            min_d, max_d = difficulty_range
            concepts = [c for c in concepts if min_d <= c.difficulty <= max_d]

        return concepts

    def get_relations(
        self,
        concept_id: Optional[str] = None,
        relation_type: Optional[str] = None,
    ) -> List[RelationEdge]:
        """Get relations with optional filtering."""
        relations = self._relations

        if concept_id:
            relations = [
                r for r in relations
                if r.source_id == concept_id or r.target_id == concept_id
            ]

        if relation_type:
            relations = [r for r in relations if r.relation_type == relation_type]

        return relations

    def get_neighbors(
        self,
        concept_id: str,
        direction: str = "both",  # outgoing, incoming, both
        relation_type: Optional[str] = None,
    ) -> List[str]:
        """Get neighboring concepts."""
        neighbors = set()

        if direction in ("outgoing", "both"):
            neighbors.update(self._adjacency.get(concept_id, set()))

        if direction in ("incoming", "both"):
            neighbors.update(self._reverse_adjacency.get(concept_id, set()))

        if relation_type:
            # Filter by relation type
            valid_neighbors = set()
            for r in self._relations:
                if r.relation_type == relation_type:
                    if r.source_id == concept_id and r.target_id in neighbors:
                        valid_neighbors.add(r.target_id)
                    if r.target_id == concept_id and r.source_id in neighbors:
                        valid_neighbors.add(r.source_id)
            neighbors = valid_neighbors

        return list(neighbors)

    def merge_graph(
        self,
        other_builder: "GraphBuilder",
        conflict_strategy: str = "keep_both",  # keep_both, prefer_self, prefer_other
    ) -> Dict[str, int]:
        """
        Merge another graph into this one.

        Args:
            other_builder: Graph to merge from
            conflict_strategy: How to handle conflicts

        Returns:
            Merge statistics
        """
        stats = {"concepts_added": 0, "relations_added": 0, "conflicts": 0}

        # Merge concepts
        for concept_id, concept in other_builder._concepts.items():
            if concept_id in self._concepts:
                stats["conflicts"] += 1
                if conflict_strategy == "prefer_other":
                    self._concepts[concept_id] = concept
            else:
                self._concepts[concept_id] = concept
                self._adjacency[concept_id] = set()
                self._reverse_adjacency[concept_id] = set()
                stats["concepts_added"] += 1

        # Merge relations
        existing_relations = {
            (r.source_id, r.target_id, r.relation_type)
            for r in self._relations
        }

        for relation in other_builder._relations:
            key = (relation.source_id, relation.target_id, relation.relation_type)
            if key not in existing_relations:
                self._relations.append(relation)
                self._adjacency[relation.source_id].add(relation.target_id)
                self._reverse_adjacency[relation.target_id].add(relation.source_id)
                stats["relations_added"] += 1

        return stats

    def export_graph(self, format: str = "json") -> Dict[str, Any]:
        """
        Export graph data.

        Args:
            format: Export format (json, cypher, graphml)

        Returns:
            Exported graph data
        """
        if format == "json":
            return {
                "concepts": [
                    {
                        "id": c.id,
                        "name": c.name,
                        "domain": c.domain,
                        "description": c.description,
                        "difficulty": c.difficulty,
                        "metadata": c.metadata,
                    }
                    for c in self._concepts.values()
                ],
                "relations": [
                    {
                        "source": r.source_id,
                        "target": r.target_id,
                        "type": r.relation_type,
                        "confidence": r.confidence,
                        "metadata": r.metadata,
                    }
                    for r in self._relations
                ],
                "stats": {
                    "num_concepts": len(self._concepts),
                    "num_relations": len(self._relations),
                },
            }

        elif format == "cypher":
            statements = []

            for c in self._concepts.values():
                stmt = f"CREATE (:{c.domain}:Concept {{id: '{c.id}', name: '{c.name}', difficulty: {c.difficulty}}})"
                statements.append(stmt)

            for r in self._relations:
                stmt = f"MATCH (a:Concept {{id: '{r.source_id}'}}), (b:Concept {{id: '{r.target_id}'}}) CREATE (a)-[:{r.relation_type.upper()}]->(b)"
                statements.append(stmt)

            return {"statements": statements}

        else:
            return self.export_graph("json")

    def import_graph(self, data: Dict[str, Any]):
        """Import graph from exported data."""
        concepts = data.get("concepts", [])
        relations = data.get("relations", [])

        for c in concepts:
            self.add_concept(
                c["id"],
                c["name"],
                c["domain"],
                c.get("description"),
                c.get("difficulty", 3),
                c.get("metadata"),
            )

        for r in relations:
            self.add_relation(
                r["source"],
                r["target"],
                r["type"],
                r.get("confidence", 1.0),
                r.get("metadata"),
            )

    def get_statistics(self) -> Dict[str, Any]:
        """Get graph statistics."""
        domains = {}
        for c in self._concepts.values():
            domains[c.domain] = domains.get(c.domain, 0) + 1

        relation_types = {}
        for r in self._relations:
            relation_types[r.relation_type] = relation_types.get(r.relation_type, 0) + 1

        return {
            "num_concepts": len(self._concepts),
            "num_relations": len(self._relations),
            "concepts_by_domain": domains,
            "relations_by_type": relation_types,
            "avg_out_degree": sum(len(t) for t in self._adjacency.values()) / max(len(self._adjacency), 1),
        }

    def validate(self) -> Dict[str, List[str]]:
        """Validate graph consistency."""
        issues = {
            "orphan_concepts": [],
            "missing_targets": [],
            "self_loops": [],
        }

        # Find orphan concepts (no relations)
        connected = set()
        for r in self._relations:
            connected.add(r.source_id)
            connected.add(r.target_id)

        for concept_id in self._concepts:
            if concept_id not in connected:
                issues["orphan_concepts"].append(concept_id)

        # Check for missing targets and self-loops
        for r in self._relations:
            if r.source_id == r.target_id:
                issues["self_loops"].append(f"{r.source_id} -{r.relation_type}-> {r.target_id}")
            if r.target_id not in self._concepts:
                issues["missing_targets"].append(r.target_id)

        return issues

    def close(self):
        """Close connections."""
        if self._neo4j_driver:
            self._neo4j_driver.close()
