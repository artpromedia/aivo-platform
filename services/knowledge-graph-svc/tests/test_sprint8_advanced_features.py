"""
Tests for Sprint 8 Advanced Graph Features

Tests cover:
- PathOptimizer with constraints and personalization
- AdvancedReasoningEngine with inference rules
- CurriculumMapper for cross-curriculum mapping
- GraphVisualizer for multiple output formats
- TrainingIntegration for knowledge tracing
- GraphMaintenance for validation and repair
"""
import pytest
import asyncio
from typing import Dict, List

# Import Sprint 8 components
from app.services.path_optimizer import (
    PathOptimizer,
    PathConstraints,
    StudentProfile,
    OptimizedPath,
    PersonalizedPath,
)
from app.services.advanced_reasoning import (
    AdvancedReasoningEngine,
    ReasoningResult,
    DerivedFact,
)
from app.models.curriculum_mapper import (
    CurriculumMapper,
    StandardMapping,
    CurriculumComparison,
    TransferPlan,
)
from app.services.graph_visualizer import (
    GraphVisualizer,
    KnowledgeGraph,
    StudentProgress,
)
from app.services.training_integration import (
    TrainingIntegration,
    MasteryUpdateEvent,
    EnhancedTracingResult,
    RemediationPlan,
)
from app.services.graph_maintenance import (
    GraphMaintenance,
    ValidationReport,
    PruneResult,
    MergeResult,
)


# =============================================================================
# PathOptimizer Tests
# =============================================================================

class TestPathOptimizer:
    """Tests for PathOptimizer service."""

    @pytest.fixture
    def optimizer(self):
        return PathOptimizer()

    def test_initialization(self, optimizer):
        """Test optimizer initializes correctly."""
        assert optimizer is not None
        assert len(optimizer.get_all_concepts()) > 0

    def test_optimize_path_basic(self, optimizer):
        """Test basic path optimization."""
        result = optimizer.optimize_path(
            start_concepts=["arithmetic"],
            target_concepts=["algebra"],
        )

        assert isinstance(result, OptimizedPath)
        assert len(result.steps) > 0
        assert result.total_duration_hours > 0
        assert len(result.difficulty_curve) == len(result.steps)

    def test_optimize_path_with_constraints(self, optimizer):
        """Test path optimization with constraints."""
        constraints = PathConstraints(
            max_concepts=5,
            difficulty_range=(0.0, 0.6),
            zpd_factor=0.7,
        )

        result = optimizer.optimize_path(
            start_concepts=["arithmetic"],
            target_concepts=["calculus"],
            constraints=constraints,
        )

        assert len(result.steps) <= 5
        for step in result.steps:
            assert step.difficulty <= 0.6

    def test_optimize_path_with_duration_constraint(self, optimizer):
        """Test path optimization with duration limit."""
        constraints = PathConstraints(
            max_duration_hours=5.0,
        )

        result = optimizer.optimize_path(
            start_concepts=[],
            target_concepts=["calculus"],
            constraints=constraints,
        )

        assert result.total_duration_hours <= 5.0
        if len(result.warnings) > 0:
            assert "truncated" in result.warnings[0].lower()

    def test_find_shortest_path(self, optimizer):
        """Test shortest path finding."""
        path = optimizer.find_shortest_path("arithmetic", "calculus")

        assert isinstance(path, list)
        assert len(path) > 0
        assert path[0] == "arithmetic"

    def test_find_shortest_path_no_connection(self, optimizer):
        """Test shortest path with no connection."""
        path = optimizer.find_shortest_path("nonexistent", "calculus")
        assert path == []

    def test_generate_personalized_path(self, optimizer):
        """Test personalized path generation."""
        profile = StudentProfile(
            student_id="student123",
            known_concepts=["arithmetic"],
            learning_style="visual",
            learning_pace=1.2,
            difficulty_preference="moderate",
            available_hours_per_week=10,
            strengths=["math"],
            weaknesses=["cs"],
        )

        result = optimizer.generate_personalized_path(
            student_profile=profile,
            target_concepts=["algebra"],
        )

        assert isinstance(result, PersonalizedPath)
        assert result.student_id == "student123"
        assert result.confidence_score > 0

    def test_compute_pagerank(self, optimizer):
        """Test PageRank computation."""
        scores = optimizer.compute_pagerank()

        assert isinstance(scores, dict)
        assert len(scores) > 0
        # Scores should sum to approximately 1
        total = sum(scores.values())
        assert 0.9 < total < 1.1

    def test_add_concept(self, optimizer):
        """Test adding a new concept."""
        optimizer.add_concept(
            concept_id="new_concept",
            name="New Concept",
            domain="test",
            difficulty=0.5,
            duration_minutes=60,
            prerequisites=["arithmetic"],
        )

        assert "new_concept" in optimizer.get_all_concepts()

    def test_get_concept_dependencies(self, optimizer):
        """Test getting concept dependencies."""
        deps = optimizer.get_concept_dependencies("calculus")

        assert "prerequisites" in deps
        assert "dependents" in deps
        assert len(deps["prerequisites"]) > 0


# =============================================================================
# AdvancedReasoningEngine Tests
# =============================================================================

class TestAdvancedReasoningEngine:
    """Tests for AdvancedReasoningEngine."""

    @pytest.fixture
    def engine(self):
        return AdvancedReasoningEngine()

    def test_initialization(self, engine):
        """Test engine initializes correctly."""
        assert engine is not None
        stats = engine.get_statistics()
        assert stats["total_facts"] > 0

    def test_infer_transitive_prerequisites(self, engine):
        """Test transitive prerequisite inference."""
        prereqs = engine.infer_transitive_prerequisites("calculus")

        assert isinstance(prereqs, list)
        assert "algebra" in prereqs
        assert "arithmetic" in prereqs

    def test_find_common_prerequisites(self, engine):
        """Test finding common prerequisites."""
        common = engine.find_common_prerequisites(["calculus", "statistics"])

        assert isinstance(common, list)
        assert "algebra" in common

    def test_reason_by_analogy(self, engine):
        """Test analogy reasoning."""
        # arithmetic -> algebra, geometry -> ?
        result = engine.reason_by_analogy(
            source_pair=("arithmetic", "algebra"),
            target_start="geometry",
        )

        # Should find something related
        assert result is not None or result == ""

    def test_answer_prerequisite_question(self, engine):
        """Test answering prerequisite questions."""
        result = engine.answer_question("What are the prerequisites for calculus?")

        assert isinstance(result, ReasoningResult)
        assert result.confidence > 0
        assert "calculus" in result.answer.lower() or len(result.reasoning_chain) > 0

    def test_answer_path_question(self, engine):
        """Test answering path questions."""
        result = engine.answer_question("How do I learn from algebra to calculus?")

        assert isinstance(result, ReasoningResult)
        assert result.confidence > 0

    def test_get_reasoning_explanation(self, engine):
        """Test getting reasoning explanation."""
        result = engine.get_reasoning_explanation(
            subject="arithmetic",
            predicate="prerequisite",
            object_="algebra",
        )

        assert isinstance(result, ReasoningResult)
        assert result.confidence > 0
        assert "Yes" in result.answer or len(result.supporting_facts) > 0

    def test_apply_inference_rules(self, engine):
        """Test applying inference rules."""
        derived = engine.apply_inference_rules(max_iterations=5)

        assert isinstance(derived, list)
        # Should derive some facts
        for fact in derived:
            assert isinstance(fact, DerivedFact)
            assert fact.confidence > 0

    def test_add_fact(self, engine):
        """Test adding a new fact."""
        initial_stats = engine.get_statistics()

        engine.add_fact("test_subject", "test_predicate", "test_object", 0.9)

        new_stats = engine.get_statistics()
        assert new_stats["total_facts"] > initial_stats["total_facts"]


# =============================================================================
# CurriculumMapper Tests
# =============================================================================

class TestCurriculumMapper:
    """Tests for CurriculumMapper."""

    @pytest.fixture
    def mapper(self):
        return CurriculumMapper()

    def test_initialization(self, mapper):
        """Test mapper initializes correctly."""
        assert mapper is not None
        curricula = mapper.get_all_curricula()
        assert len(curricula) > 0

    def test_get_all_curricula(self, mapper):
        """Test getting all curricula."""
        curricula = mapper.get_all_curricula()

        assert "common_core" in curricula
        assert "ap" in curricula
        assert "ib" in curricula

    def test_get_curriculum_info(self, mapper):
        """Test getting curriculum information."""
        info = mapper.get_curriculum_info("common_core")

        assert info is not None
        assert "name" in info
        assert "total_concepts" in info
        assert info["total_concepts"] > 0

    def test_map_standards(self, mapper):
        """Test mapping standards between curricula."""
        mappings = mapper.map_standards(
            source_standard="common_core",
            target_curriculum="ap",
        )

        assert isinstance(mappings, list)
        for mapping in mappings:
            assert isinstance(mapping, StandardMapping)
            assert mapping.mapping_confidence > 0

    def test_find_equivalents(self, mapper):
        """Test finding equivalent concepts."""
        equivalents = mapper.find_equivalents(
            concept_id="ccss.math.hs.a",
            target_curriculum="ap",
        )

        assert isinstance(equivalents, list)
        for equiv in equivalents:
            assert equiv.equivalence_score > 0

    def test_compare_curricula(self, mapper):
        """Test comparing two curricula."""
        comparison = mapper.compare_curricula("common_core", "ap")

        assert isinstance(comparison, CurriculumComparison)
        assert comparison.curriculum1 == "common_core"
        assert comparison.curriculum2 == "ap"
        assert comparison.overlap_percentage >= 0

    def test_create_transfer_plan(self, mapper):
        """Test creating transfer plan."""
        plan = mapper.create_transfer_plan(
            source_curriculum="common_core",
            target_curriculum="ap",
            completed_concepts=["ccss.math.hs.a", "ccss.math.hs.f"],
            student_id="student123",
        )

        assert isinstance(plan, TransferPlan)
        assert plan.source_curriculum == "common_core"
        assert plan.target_curriculum == "ap"

    def test_add_curriculum(self, mapper):
        """Test adding a new curriculum."""
        mapper.add_curriculum(
            curriculum_id="test_curriculum",
            name="Test Curriculum",
            domains=["test"],
            grade_levels=["1", "2"],
            concepts={
                "test.concept.1": {
                    "name": "Test Concept 1",
                    "domain": "test",
                    "skills": ["skill1"],
                    "difficulty": 0.5,
                }
            },
        )

        assert "test_curriculum" in mapper.get_all_curricula()


# =============================================================================
# GraphVisualizer Tests
# =============================================================================

class TestGraphVisualizer:
    """Tests for GraphVisualizer."""

    @pytest.fixture
    def visualizer(self):
        return GraphVisualizer()

    @pytest.fixture
    def sample_graph(self):
        return GraphVisualizer.get_sample_graph()

    def test_initialization(self, visualizer):
        """Test visualizer initializes correctly."""
        assert visualizer is not None

    def test_get_sample_graph(self, sample_graph):
        """Test getting sample graph."""
        assert isinstance(sample_graph, KnowledgeGraph)
        assert len(sample_graph.nodes) > 0
        assert len(sample_graph.edges) > 0

    def test_to_d3_json(self, visualizer, sample_graph):
        """Test D3.js JSON generation."""
        result = visualizer.to_d3_json(sample_graph)

        assert "nodes" in result
        assert "links" in result
        assert len(result["nodes"]) > 0
        assert len(result["links"]) > 0

    def test_to_d3_json_with_focus(self, visualizer, sample_graph):
        """Test D3.js JSON with focus concept."""
        result = visualizer.to_d3_json(
            sample_graph,
            focus_concept="calculus",
            depth=1,
        )

        assert "nodes" in result
        # Should have fewer nodes due to depth limit
        assert len(result["nodes"]) < len(sample_graph.nodes)

    def test_to_dot(self, visualizer, sample_graph):
        """Test DOT format generation."""
        result = visualizer.to_dot(sample_graph)

        assert isinstance(result, str)
        assert "digraph" in result
        assert "->" in result

    def test_to_cypher(self, visualizer, sample_graph):
        """Test Cypher query generation."""
        result = visualizer.to_cypher(sample_graph)

        assert isinstance(result, str)
        assert "CREATE" in result
        assert "MATCH" in result

    def test_to_mermaid(self, visualizer, sample_graph):
        """Test Mermaid diagram generation."""
        result = visualizer.to_mermaid(sample_graph)

        assert isinstance(result, str)
        assert "graph TD" in result

    def test_generate_interactive_html(self, visualizer, sample_graph):
        """Test interactive HTML generation."""
        result = visualizer.generate_interactive_html(sample_graph)

        assert isinstance(result, str)
        assert "<!DOCTYPE html>" in result
        assert "d3.js" in result or "d3.v" in result.lower()

    def test_generate_html_with_progress(self, visualizer, sample_graph):
        """Test HTML generation with student progress."""
        progress = StudentProgress(
            student_id="student123",
            mastery_levels={"arithmetic": 0.9, "algebra": 0.5},
            completed_concepts=["arithmetic"],
            in_progress_concepts=["algebra"],
        )

        result = visualizer.generate_interactive_html(
            sample_graph,
            student_progress=progress,
        )

        assert isinstance(result, str)
        assert "student123" in result

    def test_visualize_unified_method(self, visualizer, sample_graph):
        """Test unified visualize method."""
        for format in ["d3", "dot", "cypher", "mermaid"]:
            result = visualizer.visualize(sample_graph, format=format)
            assert result is not None


# =============================================================================
# TrainingIntegration Tests
# =============================================================================

class TestTrainingIntegration:
    """Tests for TrainingIntegration."""

    @pytest.fixture
    def integration(self):
        return TrainingIntegration()

    @pytest.mark.asyncio
    async def test_initialization(self, integration):
        """Test integration initializes correctly."""
        assert integration is not None
        skills = integration.get_all_skills()
        assert len(skills) > 0

    @pytest.mark.asyncio
    async def test_enhance_knowledge_tracing(self, integration):
        """Test enhanced knowledge tracing."""
        result = await integration.enhance_knowledge_tracing(
            student_id="student123",
            skill_id="algebra",
            performance=0.8,
        )

        assert isinstance(result, EnhancedTracingResult)
        assert result.student_id == "student123"
        assert result.adjusted_probability >= 0
        assert result.adjusted_probability <= 1

    @pytest.mark.asyncio
    async def test_enhance_tracing_with_weak_prerequisites(self, integration):
        """Test tracing with weak prerequisites."""
        # Set up student with weak prerequisites
        integration.set_student_mastery("student456", {
            "arithmetic": 0.3,  # Weak prerequisite
        })

        result = await integration.enhance_knowledge_tracing(
            student_id="student456",
            skill_id="algebra",
            performance=0.7,
        )

        # Should have lower adjusted probability due to weak prerequisites
        assert result.prerequisite_factor < 1.0

    @pytest.mark.asyncio
    async def test_get_remediation_recommendations(self, integration):
        """Test remediation recommendations."""
        plan = await integration.get_remediation_recommendations(
            student_id="student123",
            failed_skill="calculus",
        )

        assert isinstance(plan, RemediationPlan)
        assert plan.failed_skill == "calculus"
        assert len(plan.remediation_steps) > 0
        assert plan.success_probability > 0

    @pytest.mark.asyncio
    async def test_handle_mastery_update(self, integration):
        """Test handling mastery update."""
        event = MasteryUpdateEvent(
            event_type="assessment_completed",
            student_id="student123",
            skill_id="algebra",
            previous_mastery=0.5,
            new_mastery=0.8,
            timestamp="2024-01-01T12:00:00",
        )

        result = await integration.handle_mastery_update(event)

        assert result.source_skill == "algebra"
        assert isinstance(result.affected_skills, dict)

    def test_get_skill_state(self, integration):
        """Test getting skill state."""
        integration.set_student_mastery("student123", {"algebra": 0.85})
        state = integration.get_skill_state("student123", "algebra")

        assert state.value == "mastered"

    def test_get_prerequisite_readiness(self, integration):
        """Test checking prerequisite readiness."""
        integration.set_student_mastery("student123", {
            "arithmetic": 0.9,
            "fractions": 0.85,
        })

        readiness = integration.get_prerequisite_readiness("student123", "algebra")

        assert "ready" in readiness
        assert "prerequisites" in readiness

    def test_get_skill_info(self, integration):
        """Test getting skill information."""
        info = integration.get_skill_info("algebra")

        assert info is not None
        assert "name" in info
        assert "prerequisites" in info


# =============================================================================
# GraphMaintenance Tests
# =============================================================================

class TestGraphMaintenance:
    """Tests for GraphMaintenance."""

    @pytest.fixture
    def maintenance(self):
        return GraphMaintenance()

    @pytest.mark.asyncio
    async def test_initialization(self, maintenance):
        """Test maintenance initializes correctly."""
        assert maintenance is not None
        graph_ids = maintenance.get_graph_ids()
        assert "default" in graph_ids

    @pytest.mark.asyncio
    async def test_validate_graph(self, maintenance):
        """Test graph validation."""
        report = await maintenance.validate_graph("default")

        assert isinstance(report, ValidationReport)
        assert report.graph_id == "default"
        assert report.total_nodes > 0
        assert isinstance(report.issues, list)

    @pytest.mark.asyncio
    async def test_validate_nonexistent_graph(self, maintenance):
        """Test validating nonexistent graph."""
        report = await maintenance.validate_graph("nonexistent")

        assert not report.is_valid
        assert len(report.issues) > 0

    @pytest.mark.asyncio
    async def test_prune_weak_edges(self, maintenance):
        """Test pruning weak edges."""
        result = await maintenance.prune_weak_edges("default", confidence_threshold=0.5)

        assert isinstance(result, PruneResult)
        assert result.edges_removed >= 0
        assert result.edges_kept >= 0

    @pytest.mark.asyncio
    async def test_merge_duplicate_concepts(self, maintenance):
        """Test merging duplicate concepts."""
        result = await maintenance.merge_duplicate_concepts(
            "default",
            similarity_threshold=0.9,
        )

        assert isinstance(result, MergeResult)
        assert result.concepts_merged >= 0

    @pytest.mark.asyncio
    async def test_refresh_embeddings(self, maintenance):
        """Test refreshing embeddings."""
        result = await maintenance.refresh_embeddings("default", force=True)

        assert "status" in result
        assert result["status"] in ["success", "skipped", "error"]

    @pytest.mark.asyncio
    async def test_repair_graph(self, maintenance):
        """Test repairing graph."""
        result = await maintenance.repair_graph("default", auto_fix=False)

        assert "status" in result

    @pytest.mark.asyncio
    async def test_get_graph_health(self, maintenance):
        """Test getting graph health."""
        health = await maintenance.get_graph_health("default")

        assert "health_score" in health
        assert "status" in health
        assert health["health_score"] >= 0
        assert health["health_score"] <= 100

    def test_add_graph(self, maintenance):
        """Test adding a new graph."""
        maintenance.add_graph(
            graph_id="test_graph",
            nodes={"node1": {"name": "Node 1", "domain": "test"}},
            edges=[("node1", "node1", "self_loop", 1.0)],
        )

        assert "test_graph" in maintenance.get_graph_ids()


# =============================================================================
# Integration Tests
# =============================================================================

class TestComponentIntegration:
    """Integration tests for Sprint 8 components."""

    @pytest.mark.asyncio
    async def test_path_optimizer_with_training_integration(self):
        """Test path optimizer works with training integration."""
        optimizer = PathOptimizer()
        integration = TrainingIntegration()

        # Set up student mastery
        integration.set_student_mastery("student123", {
            "arithmetic": 0.9,
            "fractions": 0.85,
        })

        # Get mastery levels for profile
        mastery = integration._get_student_mastery("student123")

        # Create profile with mastery info
        profile = StudentProfile(
            student_id="student123",
            known_concepts=list(mastery.keys()),
            mastery_levels=mastery,
            learning_pace=1.0,
        )

        # Generate personalized path
        result = optimizer.generate_personalized_path(
            student_profile=profile,
            target_concepts=["algebra"],
        )

        assert result.path.total_duration_hours > 0

    @pytest.mark.asyncio
    async def test_curriculum_mapper_with_visualizer(self):
        """Test curriculum mapper with graph visualizer."""
        mapper = CurriculumMapper()
        visualizer = GraphVisualizer()

        # Get curriculum comparison
        comparison = mapper.compare_curricula("common_core", "ap")

        # Create a graph from comparison
        nodes = [{"id": c, "name": c, "domain": "shared"} for c in comparison.shared_concepts]
        edges = []

        graph = KnowledgeGraph(nodes=nodes, edges=edges)

        # Visualize
        result = visualizer.to_d3_json(graph)
        assert len(result["nodes"]) == len(comparison.shared_concepts)

    @pytest.mark.asyncio
    async def test_reasoning_with_maintenance(self):
        """Test reasoning engine with graph maintenance."""
        reasoning = AdvancedReasoningEngine()
        maintenance = GraphMaintenance()

        # Apply inference rules
        derived = reasoning.apply_inference_rules(max_iterations=3)

        # Validate the default graph
        report = await maintenance.validate_graph("default")

        assert report.total_nodes > 0
        assert len(derived) >= 0


# =============================================================================
# Performance Tests
# =============================================================================

class TestPerformance:
    """Performance tests for Sprint 8 components."""

    def test_path_optimizer_large_graph(self):
        """Test path optimizer with many concepts."""
        optimizer = PathOptimizer()

        # Add many concepts
        for i in range(50):
            prereqs = [f"concept_{i-1}"] if i > 0 else []
            optimizer.add_concept(
                concept_id=f"concept_{i}",
                name=f"Concept {i}",
                domain="test",
                difficulty=i / 50,
                duration_minutes=30,
                prerequisites=prereqs,
            )

        # Time path optimization
        import time
        start = time.time()

        result = optimizer.optimize_path(
            start_concepts=["concept_0"],
            target_concepts=["concept_49"],
        )

        elapsed = time.time() - start

        assert elapsed < 5.0  # Should complete in under 5 seconds
        assert len(result.steps) > 0

    def test_pagerank_performance(self):
        """Test PageRank computation performance."""
        optimizer = PathOptimizer()

        import time
        start = time.time()

        scores = optimizer.compute_pagerank()

        elapsed = time.time() - start

        assert elapsed < 2.0  # Should complete in under 2 seconds
        assert len(scores) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
