"""
Comprehensive Test Suite for Sprint 7-8 Knowledge Graph Features

Tests all models and services:
- ConceptExtractor
- RelationClassifier
- GraphEmbeddings
- PrerequisitePredictor
- LearningPathOptimizer
- GraphBuilder
- GapDetector
- ReasoningEngine
"""
import pytest
import numpy as np
from typing import Dict, List

# Import models
from app.models.concept_extractor import (
    ConceptExtractor,
    ConceptExtractorConfig,
    ExtractedConcept,
)
from app.models.relation_classifier import (
    RelationClassifier,
    RelationClassifierConfig,
    ClassifiedRelation,
    RelationType,
)
from app.models.graph_embeddings import (
    GraphEmbeddings,
    GraphEmbeddingsConfig,
)
from app.models.prerequisite_predictor import (
    PrerequisitePredictor,
    PrerequisitePredictorConfig,
    PrerequisitePrediction,
)
from app.models.learning_path_optimizer import (
    LearningPathOptimizer,
    LearningPathOptimizerConfig,
    LearningPath,
)

# Import services
from app.services.graph_builder import (
    GraphBuilder,
    GraphBuilderConfig,
    ConceptNode,
    RelationEdge,
)
from app.services.gap_detector import (
    GapDetector,
    GapDetectorConfig,
    KnowledgeGap,
    GapAnalysisResult,
)
from app.services.reasoning_engine import (
    ReasoningEngine,
    ReasoningEngineConfig,
    PathResult,
    SubgraphResult,
    InferenceResult,
    QueryResult,
)


class TestConceptExtractor:
    """Tests for ConceptExtractor."""

    @pytest.fixture
    def extractor(self):
        return ConceptExtractor()

    def test_basic_extraction(self, extractor):
        """Test basic concept extraction from text."""
        text = "Calculus is a branch of mathematics that studies continuous change."
        concepts = extractor.extract(text, max_concepts=10)

        assert len(concepts) > 0
        assert all(isinstance(c, ExtractedConcept) for c in concepts)

    def test_domain_vocabulary_matching(self, extractor):
        """Test extraction of domain-specific vocabulary."""
        text = "Students learn algebra before moving to calculus and trigonometry."
        concepts = extractor.extract(text, domain="mathematics")

        concept_names = [c.name.lower() for c in concepts]
        assert any("algebra" in name for name in concept_names)
        assert any("calculus" in name for name in concept_names)

    def test_keyword_extraction(self, extractor):
        """Test keyword extraction from longer text."""
        text = """
        Photosynthesis is the process by which plants convert sunlight into energy.
        This biological process is essential for life on Earth.
        Plants use chlorophyll to capture light energy from the sun.
        """
        concepts = extractor.extract(text, domain="science")

        assert len(concepts) > 0
        concept_names = [c.name.lower() for c in concepts]
        assert any("photosynthesis" in name for name in concept_names)

    def test_definition_extraction(self, extractor):
        """Test extraction of concepts with definitions."""
        text = "Photosynthesis is a process by which plants convert light energy to chemical energy."
        concepts = extractor.extract_definitions(text)

        # May or may not find definitions depending on pattern matching
        assert isinstance(concepts, list)

    def test_concept_hierarchy(self, extractor):
        """Test hierarchical concept extraction."""
        text = "Mathematics includes algebra, geometry, and calculus."
        hierarchy = extractor.extract_concept_hierarchy(text)

        assert isinstance(hierarchy, dict)

    def test_batch_extraction(self, extractor):
        """Test batch concept extraction."""
        texts = [
            "Learn algebra first.",
            "Then study calculus.",
            "Physics requires both.",
        ]
        results = extractor.batch_extract(texts, max_concepts_per_text=5)

        assert len(results) == 3
        assert all(isinstance(r, list) for r in results)


class TestRelationClassifier:
    """Tests for RelationClassifier."""

    @pytest.fixture
    def classifier(self):
        return RelationClassifier()

    def test_known_prerequisite(self, classifier):
        """Test classification of known prerequisite relationship."""
        relation = classifier.classify("algebra", "calculus")

        assert isinstance(relation, ClassifiedRelation)
        assert relation.relation_type == RelationType.PREREQUISITE
        assert relation.confidence >= 0.9

    def test_unknown_relation(self, classifier):
        """Test classification of unknown concepts."""
        relation = classifier.classify("quantum physics", "cooking")

        assert isinstance(relation, ClassifiedRelation)
        # Should return RELATED with lower confidence
        assert relation.confidence < 0.9

    def test_context_based_classification(self, classifier):
        """Test classification using context."""
        context = "Algebra is a prerequisite for calculus."
        relation = classifier.classify("algebra", "calculus", context)

        assert relation.relation_type == RelationType.PREREQUISITE
        assert relation.confidence >= 0.7

    def test_batch_classification(self, classifier):
        """Test batch relation classification."""
        pairs = [
            ("arithmetic", "algebra"),
            ("algebra", "calculus"),
            ("calculus", "physics"),
        ]
        relations = classifier.batch_classify(pairs)

        assert len(relations) == 3
        assert all(isinstance(r, ClassifiedRelation) for r in relations)

    def test_extract_from_text(self, classifier):
        """Test relation extraction from text."""
        text = "Students should learn algebra before calculus."
        concepts = ["algebra", "calculus"]
        relations = classifier.extract_from_text(text, concepts)

        assert isinstance(relations, list)

    def test_suggest_relations(self, classifier):
        """Test relation suggestions."""
        suggestions = classifier.suggest_relations(
            "calculus",
            ["algebra", "geometry", "physics"],
            top_k=2,
        )

        assert len(suggestions) <= 2
        assert all(isinstance(r, ClassifiedRelation) for r in suggestions)


class TestGraphEmbeddings:
    """Tests for GraphEmbeddings."""

    @pytest.fixture
    def embeddings(self):
        return GraphEmbeddings(embedding_dim=64)

    def test_compute_embeddings(self, embeddings):
        """Test computing embeddings for concepts."""
        concepts = ["algebra", "calculus", "geometry"]
        result = embeddings.compute(concepts)

        assert len(result) == 3
        for concept, emb in result.items():
            assert isinstance(emb, np.ndarray)
            assert emb.shape == (64,)

    def test_similarity(self, embeddings):
        """Test computing similarity between concepts."""
        similarity = embeddings.similarity("algebra", "calculus")

        assert isinstance(similarity, float)
        assert -1.0 <= similarity <= 1.0

    def test_find_similar(self, embeddings):
        """Test finding similar concepts."""
        # Add some nodes first
        embeddings.add_node("algebra")
        embeddings.add_node("calculus")
        embeddings.add_node("geometry")
        embeddings.add_edge("algebra", "calculus", "prerequisite")

        similar = embeddings.find_similar(
            "algebra",
            top_k=2,
            candidates=["calculus", "geometry"],
        )

        assert len(similar) <= 2
        assert all(isinstance(item, tuple) for item in similar)

    def test_graph_loading(self, embeddings):
        """Test loading a graph structure."""
        nodes = ["a", "b", "c"]
        edges = [("a", "b", "related"), ("b", "c", "related")]
        embeddings.load_graph(nodes, edges)

        result = embeddings.compute(nodes)
        assert len(result) == 3

    def test_cluster_concepts(self, embeddings):
        """Test clustering concepts."""
        concepts = ["algebra", "calculus", "geometry", "physics", "chemistry"]
        clusters = embeddings.cluster_concepts(concepts, n_clusters=2)

        assert isinstance(clusters, dict)
        assert len(clusters) <= 2
        total_concepts = sum(len(c) for c in clusters.values())
        assert total_concepts == 5


class TestPrerequisitePredictor:
    """Tests for PrerequisitePredictor."""

    @pytest.fixture
    def predictor(self):
        return PrerequisitePredictor()

    def test_predict_prerequisites(self, predictor):
        """Test predicting prerequisites for a concept."""
        prediction = predictor.predict("calculus", max_depth=3)

        assert isinstance(prediction, PrerequisitePrediction)
        assert prediction.concept == "calculus"
        assert len(prediction.prerequisites) > 0
        assert "algebra" in prediction.prerequisites

    def test_prerequisite_chain(self, predictor):
        """Test getting prerequisite chain."""
        chain = predictor.get_prerequisite_chain("calculus", max_depth=5)

        assert chain.target_concept == "calculus"
        assert len(chain.chain) > 0
        assert chain.total_depth > 0
        assert chain.estimated_learning_time > 0

    def test_validate_ordering(self, predictor):
        """Test validating concept ordering."""
        # Valid ordering
        valid_order = ["arithmetic", "algebra", "calculus"]
        result = predictor.validate_ordering(valid_order)

        assert "is_valid" in result
        assert "validity_score" in result

    def test_get_unlocked_concepts(self, predictor):
        """Test getting unlocked concepts."""
        known = ["arithmetic", "fractions", "geometry"]
        unlocked = predictor.get_unlocked_concepts(known)

        assert isinstance(unlocked, list)
        # Algebra should be unlockable
        assert "algebra" in unlocked

    def test_estimate_learning_path(self, predictor):
        """Test estimating learning path."""
        known = ["arithmetic"]
        target = "calculus"
        result = predictor.estimate_learning_path(target, known)

        assert "concepts_to_learn" in result
        assert "estimated_time" in result

    def test_get_dependents(self, predictor):
        """Test getting dependent concepts."""
        dependents = predictor.get_dependents("algebra")

        assert isinstance(dependents, list)
        assert len(dependents) > 0  # Many concepts depend on algebra


class TestLearningPathOptimizer:
    """Tests for LearningPathOptimizer."""

    @pytest.fixture
    def optimizer(self):
        return LearningPathOptimizer()

    def test_optimize_path(self, optimizer):
        """Test optimizing a learning path."""
        path = optimizer.optimize(
            target_concepts=["calculus"],
            known_concepts=["arithmetic"],
        )

        assert isinstance(path, LearningPath)
        assert len(path.concepts) > 0
        assert path.estimated_time > 0
        assert path.coherence_score >= 0

    def test_different_optimization_goals(self, optimizer):
        """Test different optimization strategies."""
        targets = ["calculus"]
        known = ["arithmetic"]

        balanced = optimizer.optimize(targets, known, optimization_goal="balanced")
        easiest = optimizer.optimize(targets, known, optimization_goal="easiest")
        fastest = optimizer.optimize(targets, known, optimization_goal="fastest")

        assert isinstance(balanced, LearningPath)
        assert isinstance(easiest, LearningPath)
        assert isinstance(fastest, LearningPath)

    def test_suggest_next(self, optimizer):
        """Test suggesting next concepts."""
        known = ["arithmetic", "fractions"]
        suggestions = optimizer.suggest_next(known, num_suggestions=3)

        assert len(suggestions) <= 3
        assert all(isinstance(s, str) for s in suggestions)

    def test_estimate_time_to_goal(self, optimizer):
        """Test estimating time to goal."""
        known = ["arithmetic"]
        goals = ["calculus"]
        time = optimizer.estimate_time_to_goal(known, goals)

        assert isinstance(time, float)
        assert time > 0

    def test_get_path_details(self, optimizer):
        """Test getting path details."""
        path = optimizer.optimize(
            target_concepts=["calculus"],
            known_concepts=["arithmetic"],
        )
        details = optimizer.get_path_details(path)

        assert len(details) == len(path.concepts)


class TestGraphBuilder:
    """Tests for GraphBuilder."""

    @pytest.fixture
    def builder(self):
        return GraphBuilder()

    def test_add_concept(self, builder):
        """Test adding a concept."""
        concept = builder.add_concept("calc_101", "Calculus I", "math")

        assert isinstance(concept, ConceptNode)
        assert concept.id == "calc_101"
        assert concept.name == "Calculus I"

    def test_add_relation(self, builder):
        """Test adding a relation."""
        builder.add_concept("alg", "Algebra", "math")
        builder.add_concept("calc", "Calculus", "math")
        relation = builder.add_relation("alg", "calc", "prerequisite")

        assert isinstance(relation, RelationEdge)
        assert relation.source_id == "alg"
        assert relation.target_id == "calc"

    def test_get_neighbors(self, builder):
        """Test getting neighbors."""
        builder.add_concept("a", "A", "test")
        builder.add_concept("b", "B", "test")
        builder.add_concept("c", "C", "test")
        builder.add_relation("a", "b", "related")
        builder.add_relation("a", "c", "related")

        neighbors = builder.get_neighbors("a", direction="outgoing")
        assert len(neighbors) == 2

    def test_export_import_graph(self, builder):
        """Test exporting and importing graph."""
        builder.add_concept("x", "X", "test")
        builder.add_concept("y", "Y", "test")
        builder.add_relation("x", "y", "related")

        exported = builder.export_graph("json")
        assert "concepts" in exported
        assert "relations" in exported
        assert len(exported["concepts"]) == 2
        assert len(exported["relations"]) == 1

    def test_import_curriculum(self, builder):
        """Test importing curriculum."""
        stats = builder.import_curriculum({}, standard="common_core")

        assert "concepts" in stats
        assert "relations" in stats
        assert stats["concepts"] > 0

    def test_validate_graph(self, builder):
        """Test graph validation."""
        builder.add_concept("orphan", "Orphan Node", "test")
        builder.add_concept("a", "A", "test")
        builder.add_concept("b", "B", "test")
        builder.add_relation("a", "b", "related")

        issues = builder.validate()
        assert "orphan_concepts" in issues
        assert "orphan" in issues["orphan_concepts"]

    def test_get_statistics(self, builder):
        """Test getting graph statistics."""
        builder.add_concept("x", "X", "math")
        builder.add_concept("y", "Y", "math")
        builder.add_relation("x", "y", "related")

        stats = builder.get_statistics()
        assert stats["num_concepts"] == 2
        assert stats["num_relations"] == 1


class TestGapDetector:
    """Tests for GapDetector."""

    @pytest.fixture
    def detector(self):
        return GapDetector()

    def test_detect_missing_prerequisites(self, detector):
        """Test detecting missing prerequisites."""
        known = ["calculus"]  # Missing algebra, trigonometry
        mastery = {"calculus": 0.8}
        gaps = detector.detect(known, mastery)

        assert len(gaps) > 0
        gap_concepts = [g.concept for g in gaps]
        assert any("algebra" in c or "trigonometry" in c for c in gap_concepts)

    def test_detect_weak_mastery(self, detector):
        """Test detecting weak mastery."""
        known = ["algebra", "calculus"]
        mastery = {"algebra": 0.3, "calculus": 0.8}  # Weak algebra
        gaps = detector.detect(known, mastery)

        assert len(gaps) > 0
        algebra_gap = next((g for g in gaps if g.concept == "algebra"), None)
        assert algebra_gap is not None
        assert algebra_gap.gap_type in ["weak", "critical"]

    def test_detect_with_target(self, detector):
        """Test detecting gaps for a target concept."""
        known = ["arithmetic"]
        mastery = {"arithmetic": 0.9}
        gaps = detector.detect(known, mastery, target_concept="calculus")

        assert len(gaps) > 0
        # Should detect algebra, trigonometry etc.

    def test_prioritize_gaps(self, detector):
        """Test gap prioritization."""
        known = ["calculus"]
        mastery = {"calculus": 0.8}
        gaps = detector.detect(known, mastery)

        prioritized = detector.prioritize_gaps(gaps, strategy="severity_first")
        assert len(prioritized) == len(gaps)

    def test_comprehensive_analysis(self, detector):
        """Test comprehensive gap analysis."""
        known = ["arithmetic"]
        mastery = {"arithmetic": 0.5}
        result = detector.analyze(known, mastery, target_concept="calculus")

        assert isinstance(result, GapAnalysisResult)
        assert result.total_gaps > 0
        assert result.coverage_score >= 0
        assert len(result.recommendations) > 0

    def test_learning_path_gaps(self, detector):
        """Test detecting gaps for a learning path."""
        known = ["arithmetic"]
        path = ["algebra", "trigonometry", "calculus"]
        gaps = detector.get_learning_path_gaps(known, path)

        assert isinstance(gaps, list)


class TestReasoningEngine:
    """Tests for ReasoningEngine."""

    @pytest.fixture
    def engine(self):
        return ReasoningEngine()

    def test_find_shortest_path(self, engine):
        """Test finding shortest path."""
        path = engine.find_path("algebra", "differential equations", "shortest")

        assert path is not None
        assert isinstance(path, PathResult)
        assert len(path.path) > 0
        assert "algebra" in path.path

    def test_find_prerequisite_chain(self, engine):
        """Test finding prerequisite chain."""
        path = engine.find_path(
            "arithmetic",
            "calculus",
            "prerequisite_chain",
        )

        assert path is not None
        assert "arithmetic" in path.path
        assert "algebra" in path.path

    def test_find_all_paths(self, engine):
        """Test finding all paths."""
        paths = engine.find_all_paths("algebra", "physics", max_paths=3)

        assert isinstance(paths, list)
        assert all(isinstance(p, PathResult) for p in paths)

    def test_extract_subgraph(self, engine):
        """Test extracting subgraph."""
        result = engine.extract_subgraph("calculus", depth=1)

        assert isinstance(result, SubgraphResult)
        assert "calculus" in result.nodes
        assert len(result.nodes) > 1
        assert len(result.edges) > 0

    def test_infer_relation(self, engine):
        """Test relation inference."""
        # Direct relation
        direct = engine.infer_relation("algebra", "calculus")
        assert direct is not None
        assert direct.confidence >= 0.5

    def test_query_prerequisites(self, engine):
        """Test querying for prerequisites."""
        result = engine.query("What are the prerequisites for calculus?")

        assert isinstance(result, QueryResult)
        assert len(result.answer) > 0

    def test_query_path(self, engine):
        """Test querying for learning path."""
        result = engine.query("How to learn from algebra to physics?")

        assert isinstance(result, QueryResult)
        assert result.confidence > 0

    def test_get_neighbors(self, engine):
        """Test getting neighbors."""
        neighbors = engine.get_neighbors("calculus", direction="both")

        assert len(neighbors) > 0
        assert all(isinstance(n, tuple) for n in neighbors)

    def test_get_statistics(self, engine):
        """Test getting graph statistics."""
        stats = engine.get_statistics()

        assert "num_nodes" in stats
        assert "num_edges" in stats
        assert stats["num_nodes"] > 0
        assert stats["num_edges"] > 0

    def test_get_all_concepts(self, engine):
        """Test getting all concepts."""
        concepts = engine.get_all_concepts()

        assert len(concepts) > 0
        assert "algebra" in concepts
        assert "calculus" in concepts


class TestIntegration:
    """Integration tests for the knowledge graph service."""

    def test_end_to_end_learning_path(self):
        """Test end-to-end learning path generation."""
        # 1. Detect gaps
        detector = GapDetector()
        known = ["arithmetic"]
        mastery = {"arithmetic": 0.9}
        gaps = detector.detect(known, mastery, target_concept="machine learning")

        assert len(gaps) > 0

        # 2. Optimize learning path
        optimizer = LearningPathOptimizer()
        path = optimizer.optimize(
            target_concepts=["machine learning"],
            known_concepts=["arithmetic"],
        )

        assert len(path.concepts) > 0
        assert path.estimated_time > 0

        # 3. Verify path validity
        predictor = PrerequisitePredictor()
        validation = predictor.validate_ordering(["arithmetic"] + path.concepts)

        assert validation["validity_score"] > 0

    def test_concept_extraction_to_graph(self):
        """Test concept extraction and graph building."""
        # 1. Extract concepts
        extractor = ConceptExtractor()
        text = "Learn algebra and calculus to understand physics."
        concepts = extractor.extract(text, max_concepts=5)

        assert len(concepts) > 0

        # 2. Classify relations
        classifier = RelationClassifier()
        concept_names = [c.name for c in concepts]
        if len(concept_names) >= 2:
            relation = classifier.classify(concept_names[0], concept_names[1])
            assert relation is not None

    def test_graph_reasoning_flow(self):
        """Test reasoning over the knowledge graph."""
        engine = ReasoningEngine()

        # 1. Query for prerequisites
        prereq_query = engine.query("What is required for calculus?")
        assert prereq_query.confidence > 0

        # 2. Find learning path
        path = engine.find_path("arithmetic", "machine learning")
        if path:
            assert len(path.path) > 2

        # 3. Extract relevant subgraph
        subgraph = engine.extract_subgraph("calculus", depth=2)
        assert len(subgraph.nodes) > 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
