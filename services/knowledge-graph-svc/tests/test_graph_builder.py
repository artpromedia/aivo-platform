"""
GraphBuilder Unit Tests

Tests for the curriculum knowledge graph builder.
Covers: add_concept, remove_concept, add_relation, remove_relation,
        import_curriculum, get_concept, get_concepts, get_relations,
        get_neighbors, merge_graph, and export_graph.
"""

import pytest

from app.services.graph_builder import (
    ConceptNode,
    CURRICULUM_TEMPLATES,
    GraphBuilder,
    GraphBuilderConfig,
    RelationEdge,
)


@pytest.fixture
def builder():
    """Fresh GraphBuilder with default config (auto_create_missing_nodes=True)."""
    return GraphBuilder()


@pytest.fixture
def strict_builder():
    """GraphBuilder that does NOT auto-create missing nodes."""
    cfg = GraphBuilderConfig(auto_create_missing_nodes=False)
    return GraphBuilder(config=cfg)


@pytest.fixture
def populated_builder(builder):
    """Builder pre-loaded with a few math concepts and relations."""
    builder.add_concept("algebra", "Algebra", "math", difficulty=3)
    builder.add_concept("calc", "Calculus", "math", difficulty=5)
    builder.add_concept("stats", "Statistics", "math", difficulty=4)
    builder.add_concept("bio", "Biology", "science", difficulty=3)

    builder.add_relation("calc", "algebra", "prerequisite")
    builder.add_relation("stats", "algebra", "prerequisite")
    return builder


# ═══════════════════════════════════════════════════════════════════════
# add_concept
# ═══════════════════════════════════════════════════════════════════════


class TestAddConcept:
    def test_returns_concept_node(self, builder):
        node = builder.add_concept("c1", "Concept 1", "math")
        assert isinstance(node, ConceptNode)
        assert node.id == "c1"
        assert node.name == "Concept 1"
        assert node.domain == "math"

    def test_default_difficulty(self, builder):
        node = builder.add_concept("c1", "Concept 1", "math")
        assert node.difficulty == 3

    def test_custom_difficulty(self, builder):
        node = builder.add_concept("c1", "Hard", "math", difficulty=6)
        assert node.difficulty == 6

    def test_optional_description(self, builder):
        node = builder.add_concept("c1", "Name", "math", description="A description")
        assert node.description == "A description"

    def test_optional_metadata(self, builder):
        node = builder.add_concept("c1", "Name", "math", metadata={"key": "val"})
        assert node.metadata == {"key": "val"}

    def test_concept_retrievable(self, builder):
        builder.add_concept("c1", "Name", "math")
        retrieved = builder.get_concept("c1")
        assert retrieved is not None
        assert retrieved.id == "c1"

    def test_overwrite_existing_concept(self, builder):
        builder.add_concept("c1", "Old Name", "math")
        builder.add_concept("c1", "New Name", "science")
        node = builder.get_concept("c1")
        assert node.name == "New Name"
        assert node.domain == "science"


# ═══════════════════════════════════════════════════════════════════════
# remove_concept
# ═══════════════════════════════════════════════════════════════════════


class TestRemoveConcept:
    def test_remove_existing(self, builder):
        builder.add_concept("c1", "Name", "math")
        assert builder.remove_concept("c1") is True
        assert builder.get_concept("c1") is None

    def test_remove_nonexistent(self, builder):
        assert builder.remove_concept("missing") is False

    def test_remove_cleans_relations(self, populated_builder):
        populated_builder.remove_concept("algebra")
        # Relations involving algebra should be gone
        relations = populated_builder.get_relations(concept_id="algebra")
        assert len(relations) == 0

    def test_remove_cleans_adjacency(self, populated_builder):
        populated_builder.remove_concept("algebra")
        neighbors = populated_builder.get_neighbors("calc")
        assert "algebra" not in neighbors


# ═══════════════════════════════════════════════════════════════════════
# add_relation
# ═══════════════════════════════════════════════════════════════════════


class TestAddRelation:
    def test_relation_between_existing_nodes(self, populated_builder):
        rel = populated_builder.add_relation("calc", "stats", "related")
        assert isinstance(rel, RelationEdge)
        assert rel.source_id == "calc"
        assert rel.target_id == "stats"
        assert rel.relation_type == "related"

    def test_default_confidence(self, populated_builder):
        rel = populated_builder.add_relation("calc", "stats", "related")
        assert rel.confidence == 1.0

    def test_custom_confidence(self, populated_builder):
        rel = populated_builder.add_relation("calc", "stats", "related", confidence=0.7)
        assert rel.confidence == 0.7

    def test_auto_create_missing_nodes(self, builder):
        # Default config: auto_create_missing_nodes=True
        rel = builder.add_relation("new_src", "new_tgt", "prerequisite")
        assert rel is not None
        assert builder.get_concept("new_src") is not None
        assert builder.get_concept("new_tgt") is not None

    def test_strict_mode_rejects_missing(self, strict_builder):
        rel = strict_builder.add_relation("missing_a", "missing_b", "related")
        assert rel is None

    def test_relation_updates_adjacency(self, populated_builder):
        populated_builder.add_relation("bio", "stats", "related")
        neighbors = populated_builder.get_neighbors("bio", direction="outgoing")
        assert "stats" in neighbors


# ═══════════════════════════════════════════════════════════════════════
# remove_relation
# ═══════════════════════════════════════════════════════════════════════


class TestRemoveRelation:
    def test_remove_by_type(self, populated_builder):
        removed = populated_builder.remove_relation("calc", "algebra", "prerequisite")
        assert removed is True
        rels = populated_builder.get_relations(concept_id="calc")
        prereqs = [r for r in rels if r.relation_type == "prerequisite" and r.target_id == "algebra"]
        assert len(prereqs) == 0

    def test_remove_all_types(self, populated_builder):
        # Add a second relation type between same nodes
        populated_builder.add_relation("calc", "algebra", "related")
        removed = populated_builder.remove_relation("calc", "algebra")  # no type = remove all
        assert removed is True

    def test_remove_nonexistent(self, populated_builder):
        removed = populated_builder.remove_relation("bio", "calc", "prerequisite")
        assert removed is False


# ═══════════════════════════════════════════════════════════════════════
# import_curriculum
# ═══════════════════════════════════════════════════════════════════════


class TestImportCurriculum:
    def test_import_common_core_template(self, builder):
        stats = builder.import_curriculum({}, standard="common_core")
        assert stats["concepts"] > 0
        assert stats["relations"] > 0

    def test_import_ngss_template(self, builder):
        stats = builder.import_curriculum({}, standard="ngss")
        assert stats["concepts"] > 0

    def test_import_custom_data(self, builder):
        custom = {
            "reading": {
                "K": ["phonics", "sight words"],
                "1": ["fluency", "comprehension"],
            }
        }
        stats = builder.import_curriculum(custom)
        assert stats["concepts"] >= 4  # at least the leaf concepts

    def test_imported_concepts_retrievable(self, builder):
        builder.import_curriculum({}, standard="common_core")
        concepts = builder.get_concepts(domain="math")
        assert len(concepts) > 0


# ═══════════════════════════════════════════════════════════════════════
# get_concept / get_concepts / get_relations
# ═══════════════════════════════════════════════════════════════════════


class TestQueries:
    def test_get_concept_missing(self, builder):
        assert builder.get_concept("nonexistent") is None

    def test_get_concepts_all(self, populated_builder):
        all_concepts = populated_builder.get_concepts()
        assert len(all_concepts) == 4

    def test_get_concepts_by_domain(self, populated_builder):
        math = populated_builder.get_concepts(domain="math")
        science = populated_builder.get_concepts(domain="science")
        assert len(math) == 3
        assert len(science) == 1

    def test_get_concepts_by_difficulty(self, populated_builder):
        hard = populated_builder.get_concepts(difficulty_range=(4, 6))
        assert all(4 <= c.difficulty <= 6 for c in hard)

    def test_get_relations_by_concept(self, populated_builder):
        rels = populated_builder.get_relations(concept_id="algebra")
        # algebra is target of calc→algebra and stats→algebra
        assert len(rels) == 2

    def test_get_relations_by_type(self, populated_builder):
        populated_builder.add_relation("bio", "stats", "related")
        prereqs = populated_builder.get_relations(relation_type="prerequisite")
        related = populated_builder.get_relations(relation_type="related")
        assert len(prereqs) == 2
        assert len(related) == 1


# ═══════════════════════════════════════════════════════════════════════
# get_neighbors
# ═══════════════════════════════════════════════════════════════════════


class TestGetNeighbors:
    def test_outgoing(self, populated_builder):
        neighbors = populated_builder.get_neighbors("calc", direction="outgoing")
        assert "algebra" in neighbors

    def test_incoming(self, populated_builder):
        neighbors = populated_builder.get_neighbors("algebra", direction="incoming")
        assert "calc" in neighbors
        assert "stats" in neighbors

    def test_both(self, populated_builder):
        neighbors = populated_builder.get_neighbors("algebra", direction="both")
        assert "calc" in neighbors
        assert "stats" in neighbors

    def test_no_neighbors(self, populated_builder):
        neighbors = populated_builder.get_neighbors("bio", direction="outgoing")
        assert len(neighbors) == 0

    def test_filter_by_relation_type(self, populated_builder):
        populated_builder.add_relation("calc", "bio", "related")
        prereq_neighbors = populated_builder.get_neighbors(
            "calc", direction="outgoing", relation_type="prerequisite"
        )
        assert "algebra" in prereq_neighbors
        assert "bio" not in prereq_neighbors


# ═══════════════════════════════════════════════════════════════════════
# merge_graph
# ═══════════════════════════════════════════════════════════════════════


class TestMergeGraph:
    def test_merge_disjoint(self, populated_builder):
        other = GraphBuilder()
        other.add_concept("chem", "Chemistry", "science")
        other.add_concept("physics", "Physics", "science")
        other.add_relation("physics", "chem", "related")

        stats = populated_builder.merge_graph(other)
        assert stats["concepts_added"] == 2
        assert stats["relations_added"] == 1
        assert stats["conflicts"] == 0

    def test_merge_with_conflict_keep_both(self, populated_builder):
        other = GraphBuilder()
        other.add_concept("algebra", "Advanced Algebra", "math")

        stats = populated_builder.merge_graph(other, conflict_strategy="keep_both")
        assert stats["conflicts"] == 1
        # Original concept should remain
        assert populated_builder.get_concept("algebra").name == "Algebra"

    def test_merge_prefer_other(self, populated_builder):
        other = GraphBuilder()
        other.add_concept("algebra", "Advanced Algebra", "math")

        populated_builder.merge_graph(other, conflict_strategy="prefer_other")
        assert populated_builder.get_concept("algebra").name == "Advanced Algebra"


# ═══════════════════════════════════════════════════════════════════════
# CURRICULUM_TEMPLATES
# ═══════════════════════════════════════════════════════════════════════


class TestCurriculumTemplates:
    def test_common_core_has_math_and_science(self):
        assert "math" in CURRICULUM_TEMPLATES["common_core"]
        assert "science" in CURRICULUM_TEMPLATES["common_core"]

    def test_ngss_has_domains(self):
        assert "physical_science" in CURRICULUM_TEMPLATES["ngss"]
        assert "life_science" in CURRICULUM_TEMPLATES["ngss"]
        assert "earth_science" in CURRICULUM_TEMPLATES["ngss"]

    def test_common_core_math_has_grades(self):
        math = CURRICULUM_TEMPLATES["common_core"]["math"]
        assert "K" in math
        assert "1" in math
        assert "calculus" in math
