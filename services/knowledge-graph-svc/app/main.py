"""Knowledge Graph Service - FastAPI Application"""
import logging
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional, Tuple

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import models and services
from .models.concept_extractor import ConceptExtractor, ConceptExtractorConfig
from .models.relation_classifier import RelationClassifier, RelationClassifierConfig
from .models.graph_embeddings import GraphEmbeddings, GraphEmbeddingsConfig
from .models.prerequisite_predictor import PrerequisitePredictor
from .models.learning_path_optimizer import LearningPathOptimizer
from .models.curriculum_mapper import CurriculumMapper

from .services.graph_builder import GraphBuilder
from .services.gap_detector import GapDetector
from .services.reasoning_engine import ReasoningEngine
from .services.path_optimizer import PathOptimizer, PathConstraints, StudentProfile
from .services.advanced_reasoning import AdvancedReasoningEngine
from .services.graph_visualizer import GraphVisualizer, KnowledgeGraph, StudentProgress
from .services.training_integration import TrainingIntegration, MasteryUpdateEvent
from .services.graph_maintenance import GraphMaintenance

# Global component instances
_components: Dict[str, Any] = {}


def get_components() -> Dict[str, Any]:
    """Get or initialize components."""
    if not _components:
        _components["concept_extractor"] = ConceptExtractor()
        _components["relation_classifier"] = RelationClassifier()
        _components["graph_embeddings"] = GraphEmbeddings()
        _components["prerequisite_predictor"] = PrerequisitePredictor()
        _components["learning_path_optimizer"] = LearningPathOptimizer()
        _components["graph_builder"] = GraphBuilder()
        _components["gap_detector"] = GapDetector()
        _components["reasoning_engine"] = ReasoningEngine()
        # Sprint 8 components
        _components["path_optimizer"] = PathOptimizer()
        _components["advanced_reasoning"] = AdvancedReasoningEngine()
        _components["curriculum_mapper"] = CurriculumMapper()
        _components["graph_visualizer"] = GraphVisualizer()
        _components["training_integration"] = TrainingIntegration()
        _components["graph_maintenance"] = GraphMaintenance()
    return _components


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Knowledge Graph Service...")
    # Initialize components
    components = get_components()
    logger.info(f"Initialized {len(components)} components")
    yield
    logger.info("Shutting down Knowledge Graph Service...")
    # Cleanup
    if "graph_builder" in _components:
        _components["graph_builder"].close()


app = FastAPI(
    title="Knowledge Graph Service",
    description="""
Curriculum and concept knowledge graph for personalized learning.

## Features

- **Concept Extraction**: Extract concepts from educational content
- **Relation Discovery**: Identify relationships between concepts
- **Prerequisite Mapping**: Map prerequisite dependencies
- **Learning Path Optimization**: Find optimal learning sequences
- **Knowledge Gap Detection**: Identify learner knowledge gaps
- **Graph Reasoning**: Path finding and inference

## Sprint 8 Advanced Features

- **Path Optimization**: Advanced learning path optimization with constraints
- **Advanced Reasoning**: Transitive inference, analogy reasoning, skill composition
- **Curriculum Mapping**: Cross-curriculum standard mapping and comparison
- **Graph Visualization**: D3.js, DOT, Cypher, and interactive HTML output
- **Training Integration**: Enhanced knowledge tracing and remediation
- **Graph Maintenance**: Validation, pruning, and duplicate detection
    """,
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response Models
class ConceptNode(BaseModel):
    id: str
    name: str
    domain: str
    description: Optional[str] = None
    embeddings: Optional[List[float]] = None


class RelationEdge(BaseModel):
    source_id: str
    target_id: str
    relation_type: str  # prerequisite, related, part_of
    confidence: float


class LearnerKnowledgeState(BaseModel):
    learner_id: str
    known_concepts: List[str]
    mastery_levels: Dict[str, float]


class ExtractConceptsRequest(BaseModel):
    text: str
    domain: Optional[str] = None
    max_concepts: int = 20


class ClassifyRelationRequest(BaseModel):
    concept_a: str
    concept_b: str
    context: Optional[str] = None


class PredictPrerequisitesRequest(BaseModel):
    concept: str
    max_depth: int = 3
    include_indirect: bool = True


class OptimizeLearningPathRequest(BaseModel):
    target_concepts: List[str]
    known_concepts: List[str]
    optimization_goal: str = "balanced"  # balanced, fastest, easiest


class DetectGapsRequest(BaseModel):
    known_concepts: List[str]
    mastery_levels: Dict[str, float]
    target_concept: Optional[str] = None


class ComputeEmbeddingsRequest(BaseModel):
    concept_ids: List[str]
    method: str = "node2vec"  # node2vec, transe, text


class FindPathRequest(BaseModel):
    source: str
    target: str
    path_type: str = "shortest"  # shortest, prerequisite_chain, any


class SubgraphRequest(BaseModel):
    center_concept: str
    depth: int = 2
    relation_filter: Optional[List[str]] = None


class QueryRequest(BaseModel):
    query_text: str


# Health endpoint
@app.get("/health")
async def health() -> Dict[str, Any]:
    components = get_components()
    return {
        "status": "healthy",
        "service": "knowledge-graph-svc",
        "components": list(components.keys()),
    }


# Concept Extraction Endpoints
@app.post("/api/v1/concepts/extract")
async def extract_concepts(request: ExtractConceptsRequest) -> Dict[str, Any]:
    """Extract concepts from educational content."""
    try:
        extractor = get_components()["concept_extractor"]
        concepts = extractor.extract(
            request.text,
            max_concepts=request.max_concepts,
            domain=request.domain,
        )

        return {
            "concepts": [
                {
                    "name": c.name,
                    "domain": c.domain,
                    "importance": c.importance,
                    "confidence": c.confidence,
                    "concept_type": c.concept_type,
                    "span": c.span,
                }
                for c in concepts
            ],
            "total": len(concepts),
        }
    except Exception as e:
        logger.error(f"Concept extraction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/concepts/extract-definitions")
async def extract_definitions(request: ExtractConceptsRequest) -> Dict[str, Any]:
    """Extract concepts with their definitions from text."""
    try:
        extractor = get_components()["concept_extractor"]
        concepts = extractor.extract_definitions(request.text, domain=request.domain)

        return {
            "concepts": [
                {
                    "name": c.name,
                    "definition": c.definition,
                    "domain": c.domain,
                    "confidence": c.confidence,
                }
                for c in concepts
            ],
            "total": len(concepts),
        }
    except Exception as e:
        logger.error(f"Definition extraction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Relation Classification Endpoints
@app.post("/api/v1/relations/classify")
async def classify_relations(request: ClassifyRelationRequest) -> Dict[str, Any]:
    """Classify relationship between two concepts."""
    try:
        classifier = get_components()["relation_classifier"]
        relation = classifier.classify(
            request.concept_a,
            request.concept_b,
            request.context,
        )

        return {
            "source": relation.source,
            "target": relation.target,
            "relation_type": relation.relation_type.value,
            "confidence": relation.confidence,
            "evidence": relation.evidence,
            "bidirectional": relation.bidirectional,
        }
    except Exception as e:
        logger.error(f"Relation classification failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/relations/extract-from-text")
async def extract_relations_from_text(
    text: str, concepts: List[str]
) -> Dict[str, Any]:
    """Extract relations between concepts mentioned in text."""
    try:
        classifier = get_components()["relation_classifier"]
        relations = classifier.extract_from_text(text, concepts)

        return {
            "relations": [
                {
                    "source": r.source,
                    "target": r.target,
                    "relation_type": r.relation_type.value,
                    "confidence": r.confidence,
                    "evidence": r.evidence,
                }
                for r in relations
            ],
            "total": len(relations),
        }
    except Exception as e:
        logger.error(f"Relation extraction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Prerequisite Prediction Endpoints
@app.post("/api/v1/prerequisites/predict")
async def predict_prerequisites(request: PredictPrerequisitesRequest) -> Dict[str, Any]:
    """Predict prerequisites for a concept."""
    try:
        predictor = get_components()["prerequisite_predictor"]
        prediction = predictor.predict(
            request.concept,
            max_depth=request.max_depth,
            include_indirect=request.include_indirect,
        )

        return {
            "concept": prediction.concept,
            "prerequisites": prediction.prerequisites,
            "confidence_scores": prediction.confidence_scores,
            "depth": prediction.depth,
            "total_learning_units": prediction.total_learning_units,
            "difficulty_progression": prediction.difficulty_progression,
        }
    except Exception as e:
        logger.error(f"Prerequisite prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/prerequisites/chain")
async def get_prerequisite_chain(concept: str, max_depth: int = 5) -> Dict[str, Any]:
    """Get full prerequisite chain for a concept."""
    try:
        predictor = get_components()["prerequisite_predictor"]
        chain = predictor.get_prerequisite_chain(concept, max_depth)

        return {
            "target_concept": chain.target_concept,
            "chain": chain.chain,
            "total_depth": chain.total_depth,
            "estimated_learning_time": chain.estimated_learning_time,
        }
    except Exception as e:
        logger.error(f"Prerequisite chain failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/prerequisites/validate-ordering")
async def validate_concept_ordering(concepts: List[str]) -> Dict[str, Any]:
    """Validate if concept sequence respects prerequisites."""
    try:
        predictor = get_components()["prerequisite_predictor"]
        result = predictor.validate_ordering(concepts)
        return result
    except Exception as e:
        logger.error(f"Ordering validation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Learning Path Optimization Endpoints
@app.post("/api/v1/learning-path/optimize")
async def optimize_learning_path(request: OptimizeLearningPathRequest) -> Dict[str, Any]:
    """Find optimal learning path to target concepts."""
    try:
        optimizer = get_components()["learning_path_optimizer"]
        path = optimizer.optimize(
            request.target_concepts,
            request.known_concepts,
            optimization_goal=request.optimization_goal,
        )

        return {
            "concepts": path.concepts,
            "estimated_time": path.estimated_time,
            "difficulty_curve": path.difficulty_curve,
            "coherence_score": path.coherence_score,
            "total_concepts": path.total_concepts,
            "prerequisites_satisfied": path.prerequisites_satisfied,
        }
    except Exception as e:
        logger.error(f"Learning path optimization failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/learning-path/suggest-next")
async def suggest_next_concepts(
    known_concepts: List[str],
    goal: Optional[str] = None,
    num_suggestions: int = 3,
) -> Dict[str, Any]:
    """Suggest next concepts to learn."""
    try:
        optimizer = get_components()["learning_path_optimizer"]
        suggestions = optimizer.suggest_next(known_concepts, goal, num_suggestions)

        return {
            "suggestions": suggestions,
            "goal": goal,
        }
    except Exception as e:
        logger.error(f"Suggestion failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/learning-path/estimate-time")
async def estimate_time_to_goal(
    known_concepts: List[str],
    goal_concepts: List[str],
) -> Dict[str, Any]:
    """Estimate time to reach goal concepts."""
    try:
        optimizer = get_components()["learning_path_optimizer"]
        time = optimizer.estimate_time_to_goal(known_concepts, goal_concepts)

        return {
            "estimated_hours": time,
            "known_concepts": known_concepts,
            "goal_concepts": goal_concepts,
        }
    except Exception as e:
        logger.error(f"Time estimation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Knowledge Gap Detection Endpoints
@app.post("/api/v1/gaps/detect")
async def detect_knowledge_gaps(request: DetectGapsRequest) -> Dict[str, Any]:
    """Detect knowledge gaps for a learner."""
    try:
        detector = get_components()["gap_detector"]
        gaps = detector.detect(
            request.known_concepts,
            request.mastery_levels,
            request.target_concept,
        )

        return {
            "gaps": [
                {
                    "concept": g.concept,
                    "severity": g.severity,
                    "gap_type": g.gap_type,
                    "priority": g.priority,
                    "blocking_concepts": g.blocking_concepts,
                    "suggested_remediation": g.suggested_remediation,
                    "estimated_time_to_fill": g.estimated_time_to_fill,
                }
                for g in gaps
            ],
            "total_gaps": len(gaps),
        }
    except Exception as e:
        logger.error(f"Gap detection failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/gaps/analyze")
async def analyze_knowledge_gaps(request: DetectGapsRequest) -> Dict[str, Any]:
    """Perform comprehensive gap analysis."""
    try:
        detector = get_components()["gap_detector"]
        result = detector.analyze(
            request.known_concepts,
            request.mastery_levels,
            request.target_concept,
        )

        return {
            "gaps": [
                {
                    "concept": g.concept,
                    "severity": g.severity,
                    "gap_type": g.gap_type,
                    "priority": g.priority,
                }
                for g in result.gaps
            ],
            "total_gaps": result.total_gaps,
            "critical_gaps": result.critical_gaps,
            "blocking_gaps": result.blocking_gaps,
            "estimated_remediation_time": result.estimated_remediation_time,
            "coverage_score": result.coverage_score,
            "recommendations": result.recommendations,
        }
    except Exception as e:
        logger.error(f"Gap analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Graph Embeddings Endpoints
@app.post("/api/v1/embeddings/compute")
async def compute_embeddings(request: ComputeEmbeddingsRequest) -> Dict[str, Any]:
    """Compute graph embeddings for concepts."""
    try:
        embeddings_engine = get_components()["graph_embeddings"]

        # Update method if specified
        if request.method != embeddings_engine.method:
            embeddings_engine = GraphEmbeddings(method=request.method)
            _components["graph_embeddings"] = embeddings_engine

        embeddings = embeddings_engine.compute(request.concept_ids)

        return {
            "embeddings": {
                k: v.tolist() for k, v in embeddings.items()
            },
            "method": request.method,
            "dimension": embeddings_engine.embedding_dim,
        }
    except Exception as e:
        logger.error(f"Embedding computation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/embeddings/similarity")
async def compute_similarity(concept_a: str, concept_b: str) -> Dict[str, Any]:
    """Compute similarity between two concepts."""
    try:
        embeddings_engine = get_components()["graph_embeddings"]
        similarity = embeddings_engine.similarity(concept_a, concept_b)

        return {
            "concept_a": concept_a,
            "concept_b": concept_b,
            "similarity": similarity,
        }
    except Exception as e:
        logger.error(f"Similarity computation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/embeddings/find-similar")
async def find_similar_concepts(
    concept: str, top_k: int = 10, candidates: Optional[List[str]] = None
) -> Dict[str, Any]:
    """Find concepts most similar to given concept."""
    try:
        embeddings_engine = get_components()["graph_embeddings"]
        similar = embeddings_engine.find_similar(concept, top_k, candidates)

        return {
            "concept": concept,
            "similar": [{"concept": c, "similarity": s} for c, s in similar],
        }
    except Exception as e:
        logger.error(f"Find similar failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Graph Reasoning Endpoints
@app.post("/api/v1/graph/find-path")
async def find_path(request: FindPathRequest) -> Dict[str, Any]:
    """Find path between concepts."""
    try:
        engine = get_components()["reasoning_engine"]
        path = engine.find_path(request.source, request.target, request.path_type)

        if path is None:
            return {"found": False, "source": request.source, "target": request.target}

        return {
            "found": True,
            "path": path.path,
            "length": path.length,
            "relation_types": path.relation_types,
        }
    except Exception as e:
        logger.error(f"Path finding failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/graph/find-all-paths")
async def find_all_paths(
    source: str, target: str, max_paths: int = 5
) -> Dict[str, Any]:
    """Find all paths between concepts."""
    try:
        engine = get_components()["reasoning_engine"]
        paths = engine.find_all_paths(source, target, max_paths)

        return {
            "source": source,
            "target": target,
            "paths": [
                {"path": p.path, "length": p.length, "relations": p.relation_types}
                for p in paths
            ],
            "total": len(paths),
        }
    except Exception as e:
        logger.error(f"Find all paths failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/graph/subgraph")
async def extract_subgraph(request: SubgraphRequest) -> Dict[str, Any]:
    """Extract subgraph around a concept."""
    try:
        engine = get_components()["reasoning_engine"]
        result = engine.extract_subgraph(
            request.center_concept,
            request.depth,
            request.relation_filter,
        )

        return {
            "center": result.center,
            "nodes": result.nodes,
            "edges": [
                {"source": s, "target": t, "relation": r}
                for s, t, r in result.edges
            ],
            "depth": result.depth,
            "statistics": result.statistics,
        }
    except Exception as e:
        logger.error(f"Subgraph extraction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/graph/infer-relation")
async def infer_relation(concept_a: str, concept_b: str) -> Dict[str, Any]:
    """Infer relation between concepts through reasoning."""
    try:
        engine = get_components()["reasoning_engine"]
        result = engine.infer_relation(concept_a, concept_b)

        if result is None:
            return {
                "found": False,
                "concept_a": concept_a,
                "concept_b": concept_b,
            }

        return {
            "found": True,
            "source": result.source,
            "target": result.target,
            "inferred_relation": result.inferred_relation,
            "confidence": result.confidence,
            "reasoning_chain": result.reasoning_chain,
            "evidence": result.evidence,
        }
    except Exception as e:
        logger.error(f"Relation inference failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/graph/query")
async def query_graph(request: QueryRequest) -> Dict[str, Any]:
    """Answer natural language query over the graph."""
    try:
        engine = get_components()["reasoning_engine"]
        result = engine.query(request.query_text)

        return {
            "query": result.query,
            "answer": result.answer,
            "relevant_concepts": result.relevant_concepts,
            "confidence": result.confidence,
            "evidence": result.evidence,
        }
    except Exception as e:
        logger.error(f"Query failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/graph/neighbors/{concept_id}")
async def get_neighbors(
    concept_id: str,
    relation_type: Optional[str] = None,
    direction: str = "both",
) -> Dict[str, Any]:
    """Get neighboring concepts in the graph."""
    try:
        engine = get_components()["reasoning_engine"]
        neighbors = engine.get_neighbors(concept_id, relation_type, direction)

        return {
            "concept": concept_id,
            "neighbors": [
                {"concept": c, "relation": r} for c, r in neighbors
            ],
            "total": len(neighbors),
        }
    except Exception as e:
        logger.error(f"Get neighbors failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/graph/statistics")
async def get_graph_statistics() -> Dict[str, Any]:
    """Get knowledge graph statistics."""
    try:
        engine = get_components()["reasoning_engine"]
        stats = engine.get_statistics()

        return {
            "statistics": stats,
        }
    except Exception as e:
        logger.error(f"Get statistics failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/graph/concepts")
async def get_all_concepts() -> Dict[str, Any]:
    """Get all concepts in the knowledge graph."""
    try:
        engine = get_components()["reasoning_engine"]
        concepts = engine.get_all_concepts()

        return {
            "concepts": concepts,
            "total": len(concepts),
        }
    except Exception as e:
        logger.error(f"Get concepts failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Graph Builder Endpoints
@app.post("/api/v1/builder/add-concept")
async def add_concept(
    concept_id: str,
    name: str,
    domain: str,
    description: Optional[str] = None,
    difficulty: int = 3,
) -> Dict[str, Any]:
    """Add a concept to the graph."""
    try:
        builder = get_components()["graph_builder"]
        concept = builder.add_concept(concept_id, name, domain, description, difficulty)

        return {
            "success": True,
            "concept": {
                "id": concept.id,
                "name": concept.name,
                "domain": concept.domain,
            },
        }
    except Exception as e:
        logger.error(f"Add concept failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/builder/add-relation")
async def add_relation(
    source_id: str,
    target_id: str,
    relation_type: str,
    confidence: float = 1.0,
) -> Dict[str, Any]:
    """Add a relation between concepts."""
    try:
        builder = get_components()["graph_builder"]
        relation = builder.add_relation(source_id, target_id, relation_type, confidence)

        if relation is None:
            raise HTTPException(status_code=400, detail="Failed to add relation")

        return {
            "success": True,
            "relation": {
                "source": relation.source_id,
                "target": relation.target_id,
                "type": relation.relation_type,
            },
        }
    except Exception as e:
        logger.error(f"Add relation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/builder/import-curriculum")
async def import_curriculum(
    curriculum_data: Optional[Dict[str, Any]] = None,
    standard: str = "common_core",
) -> Dict[str, Any]:
    """Import curriculum data into the graph."""
    try:
        builder = get_components()["graph_builder"]
        stats = builder.import_curriculum(curriculum_data or {}, standard)

        return {
            "success": True,
            "standard": standard,
            "imported": stats,
        }
    except Exception as e:
        logger.error(f"Import curriculum failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/builder/export")
async def export_graph(format: str = "json") -> Dict[str, Any]:
    """Export the graph data."""
    try:
        builder = get_components()["graph_builder"]
        data = builder.export_graph(format)
        return data
    except Exception as e:
        logger.error(f"Export graph failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/builder/validate")
async def validate_graph() -> Dict[str, Any]:
    """Validate graph consistency."""
    try:
        builder = get_components()["graph_builder"]
        issues = builder.validate()

        return {
            "valid": all(len(v) == 0 for v in issues.values()),
            "issues": issues,
        }
    except Exception as e:
        logger.error(f"Validate graph failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# Sprint 8: Advanced Graph Features
# =============================================================================

# New Request/Response Models for Sprint 8

class PathConstraintsRequest(BaseModel):
    max_concepts: Optional[int] = None
    max_duration_hours: Optional[float] = None
    difficulty_range: Tuple[float, float] = (0.0, 1.0)
    include_concepts: List[str] = Field(default_factory=list)
    exclude_concepts: List[str] = Field(default_factory=list)
    learning_style: Optional[str] = None
    prefer_spaced_repetition: bool = False
    interleaving_enabled: bool = False
    zpd_factor: float = 0.7


class OptimizePathRequest(BaseModel):
    start_concepts: List[str]
    target_concepts: List[str]
    constraints: Optional[PathConstraintsRequest] = None


class StudentProfileRequest(BaseModel):
    student_id: str
    known_concepts: List[str] = Field(default_factory=list)
    mastery_levels: Dict[str, float] = Field(default_factory=dict)
    learning_style: Optional[str] = None
    learning_pace: float = 1.0
    difficulty_preference: str = "moderate"
    available_hours_per_week: float = 10.0
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)


class PersonalizedPathRequest(BaseModel):
    student_profile: StudentProfileRequest
    target_concepts: List[str]


class ReasoningQueryRequest(BaseModel):
    question: str
    graph_id: Optional[str] = None
    context_concepts: Optional[List[str]] = None


class CurriculumMapRequest(BaseModel):
    source_curriculum: str
    target_curriculum: str
    concepts: Optional[List[str]] = None


class VisualizeRequest(BaseModel):
    format: str = "d3"  # d3, dot, cypher, html, mermaid
    focus_concept: Optional[str] = None
    depth: int = 2
    include_progress: bool = False
    student_id: Optional[str] = None


class MasteryUpdateRequest(BaseModel):
    event_type: str
    student_id: str
    skill_id: str
    previous_mastery: float
    new_mastery: float
    timestamp: str
    assessment_score: Optional[float] = None
    time_spent_seconds: Optional[int] = None
    attempts: int = 1


class GraphStatsResponse(BaseModel):
    total_concepts: int
    total_relations: int
    concepts_by_domain: Dict[str, int]
    relations_by_type: Dict[str, int]
    average_prerequisites: float
    max_path_length: int
    density: float
    connected_components: int


class MergeGraphsRequest(BaseModel):
    graph_ids: List[str]
    merge_strategy: str = "union"  # union, intersection, priority
    resolve_conflicts: str = "latest"  # latest, confidence, manual


# =============================================================================
# Path Optimizer Endpoints
# =============================================================================

@app.post("/api/v1/path-optimizer/optimize")
async def optimize_path(request: OptimizePathRequest) -> Dict[str, Any]:
    """Optimize learning path with advanced algorithms and constraints."""
    try:
        optimizer = get_components()["path_optimizer"]

        constraints = None
        if request.constraints:
            constraints = PathConstraints(
                max_concepts=request.constraints.max_concepts,
                max_duration_hours=request.constraints.max_duration_hours,
                difficulty_range=request.constraints.difficulty_range,
                include_concepts=request.constraints.include_concepts,
                exclude_concepts=request.constraints.exclude_concepts,
                learning_style=request.constraints.learning_style,
                prefer_spaced_repetition=request.constraints.prefer_spaced_repetition,
                interleaving_enabled=request.constraints.interleaving_enabled,
                zpd_factor=request.constraints.zpd_factor,
            )

        result = optimizer.optimize_path(
            start_concepts=request.start_concepts,
            target_concepts=request.target_concepts,
            constraints=constraints,
        )

        return {
            "steps": [
                {
                    "concept_id": s.concept_id,
                    "concept_name": s.concept_name,
                    "estimated_duration_minutes": s.estimated_duration_minutes,
                    "difficulty": s.difficulty,
                    "assessment_available": s.assessment_available,
                    "rationale": s.rationale,
                    "resources": [{"id": r.id, "title": r.title, "type": r.resource_type} for r in s.resources],
                }
                for s in result.steps
            ],
            "total_duration_hours": result.total_duration_hours,
            "difficulty_curve": result.difficulty_curve,
            "rationale": result.rationale,
            "optimization_score": result.optimization_score,
            "constraints_satisfied": result.constraints_satisfied,
            "warnings": result.warnings,
        }
    except Exception as e:
        logger.error(f"Path optimization failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/path-optimizer/shortest-path")
async def find_shortest_path(source: str, target: str) -> Dict[str, Any]:
    """Find shortest path between two concepts."""
    try:
        optimizer = get_components()["path_optimizer"]
        path = optimizer.find_shortest_path(source, target)

        return {
            "source": source,
            "target": target,
            "path": path,
            "length": len(path) - 1 if path else 0,
            "found": len(path) > 0,
        }
    except Exception as e:
        logger.error(f"Shortest path failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/path-optimizer/personalized")
async def generate_personalized_path(request: PersonalizedPathRequest) -> Dict[str, Any]:
    """Generate personalized learning path based on student profile."""
    try:
        optimizer = get_components()["path_optimizer"]

        profile = StudentProfile(
            student_id=request.student_profile.student_id,
            known_concepts=request.student_profile.known_concepts,
            mastery_levels=request.student_profile.mastery_levels,
            learning_style=request.student_profile.learning_style,
            learning_pace=request.student_profile.learning_pace,
            difficulty_preference=request.student_profile.difficulty_preference,
            available_hours_per_week=request.student_profile.available_hours_per_week,
            strengths=request.student_profile.strengths,
            weaknesses=request.student_profile.weaknesses,
        )

        result = optimizer.generate_personalized_path(
            student_profile=profile,
            target_concepts=request.target_concepts,
        )

        return {
            "student_id": result.student_id,
            "path": {
                "steps": [
                    {
                        "concept_id": s.concept_id,
                        "concept_name": s.concept_name,
                        "estimated_duration_minutes": s.estimated_duration_minutes,
                        "difficulty": s.difficulty,
                    }
                    for s in result.path.steps
                ],
                "total_duration_hours": result.path.total_duration_hours,
                "difficulty_curve": result.path.difficulty_curve,
                "rationale": result.path.rationale,
            },
            "adaptation_notes": result.adaptation_notes,
            "difficulty_adjustments": result.difficulty_adjustments,
            "estimated_completion_date": result.estimated_completion_date,
            "confidence_score": result.confidence_score,
        }
    except Exception as e:
        logger.error(f"Personalized path generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/path-optimizer/pagerank")
async def compute_pagerank() -> Dict[str, Any]:
    """Compute PageRank scores for all concepts."""
    try:
        optimizer = get_components()["path_optimizer"]
        scores = optimizer.compute_pagerank()

        return {
            "scores": scores,
            "top_concepts": sorted(scores.items(), key=lambda x: x[1], reverse=True)[:10],
        }
    except Exception as e:
        logger.error(f"PageRank computation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# Advanced Reasoning Endpoints
# =============================================================================

@app.post("/api/v1/reasoning/query")
async def reasoning_query(request: ReasoningQueryRequest) -> Dict[str, Any]:
    """Answer questions using graph reasoning."""
    try:
        engine = get_components()["advanced_reasoning"]
        result = engine.answer_question(
            question=request.question,
            graph_context=request.context_concepts,
        )

        return {
            "answer": result.answer,
            "confidence": result.confidence,
            "reasoning_chain": [
                {
                    "step_type": step.step_type,
                    "input_concepts": step.input_concepts,
                    "output_concepts": step.output_concepts,
                    "rule_applied": step.rule_applied,
                    "explanation": step.explanation,
                }
                for step in result.reasoning_chain
            ],
            "supporting_facts": result.supporting_facts,
        }
    except Exception as e:
        logger.error(f"Reasoning query failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/reasoning/transitive-prerequisites/{concept_id}")
async def get_transitive_prerequisites(
    concept_id: str,
    max_depth: int = 5,
) -> Dict[str, Any]:
    """Get all transitive prerequisites for a concept."""
    try:
        engine = get_components()["advanced_reasoning"]
        prerequisites = engine.infer_transitive_prerequisites(concept_id, max_depth)

        return {
            "concept": concept_id,
            "prerequisites": prerequisites,
            "total": len(prerequisites),
        }
    except Exception as e:
        logger.error(f"Transitive prerequisites failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/reasoning/common-prerequisites")
async def find_common_prerequisites(concepts: List[str]) -> Dict[str, Any]:
    """Find prerequisites common to all given concepts."""
    try:
        engine = get_components()["advanced_reasoning"]
        common = engine.find_common_prerequisites(concepts)

        return {
            "concepts": concepts,
            "common_prerequisites": common,
            "total": len(common),
        }
    except Exception as e:
        logger.error(f"Common prerequisites failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/reasoning/analogy")
async def reason_by_analogy(
    source_a: str,
    source_b: str,
    target_start: str,
) -> Dict[str, Any]:
    """Reason by analogy: A:B :: C:?"""
    try:
        engine = get_components()["advanced_reasoning"]
        result = engine.reason_by_analogy((source_a, source_b), target_start)

        return {
            "source_pair": [source_a, source_b],
            "target_start": target_start,
            "inferred_target": result,
            "analogy": f"{source_a}:{source_b}::{target_start}:{result}" if result else None,
        }
    except Exception as e:
        logger.error(f"Analogy reasoning failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/reasoning/explain")
async def explain_relation(
    subject: str,
    predicate: str,
    object_: str,
) -> Dict[str, Any]:
    """Explain why a relationship holds."""
    try:
        engine = get_components()["advanced_reasoning"]
        result = engine.get_reasoning_explanation(subject, predicate, object_)

        return {
            "subject": subject,
            "predicate": predicate,
            "object": object_,
            "answer": result.answer,
            "confidence": result.confidence,
            "reasoning_chain": [
                {
                    "step_type": step.step_type,
                    "explanation": step.explanation,
                }
                for step in result.reasoning_chain
            ],
            "supporting_facts": result.supporting_facts,
        }
    except Exception as e:
        logger.error(f"Relation explanation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/reasoning/apply-rules")
async def apply_inference_rules(max_iterations: int = 10) -> Dict[str, Any]:
    """Apply inference rules to derive new facts."""
    try:
        engine = get_components()["advanced_reasoning"]
        derived = engine.apply_inference_rules(max_iterations)

        return {
            "derived_facts": [
                {
                    "subject": f.subject,
                    "predicate": f.predicate,
                    "object": f.object,
                    "confidence": f.confidence,
                    "rule_used": f.rule_used,
                    "provenance": f.provenance,
                }
                for f in derived
            ],
            "total_derived": len(derived),
        }
    except Exception as e:
        logger.error(f"Inference rule application failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# Curriculum Mapper Endpoints
# =============================================================================

@app.post("/api/v1/curriculum/map")
async def map_curriculum(request: CurriculumMapRequest) -> Dict[str, Any]:
    """Map standards between curricula."""
    try:
        mapper = get_components()["curriculum_mapper"]
        mappings = mapper.map_standards(
            source_standard=request.source_curriculum,
            target_curriculum=request.target_curriculum,
        )

        return {
            "source": request.source_curriculum,
            "target": request.target_curriculum,
            "mappings": [
                {
                    "source_id": m.source_standard_id,
                    "target_ids": m.target_standard_ids,
                    "confidence": m.mapping_confidence,
                    "type": m.mapping_type,
                }
                for m in mappings
            ],
            "total": len(mappings),
        }
    except Exception as e:
        logger.error(f"Curriculum mapping failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/curriculum/equivalents/{concept_id}")
async def find_equivalent_concepts(
    concept_id: str,
    target_curriculum: str,
) -> Dict[str, Any]:
    """Find equivalent concepts in another curriculum."""
    try:
        mapper = get_components()["curriculum_mapper"]
        equivalents = mapper.find_equivalents(concept_id, target_curriculum)

        return {
            "source_concept": concept_id,
            "target_curriculum": target_curriculum,
            "equivalents": [
                {
                    "target_id": e.target_concept_id,
                    "equivalence_score": e.equivalence_score,
                    "mapping_type": e.mapping_type,
                    "skills_overlap": e.skills_overlap,
                }
                for e in equivalents
            ],
        }
    except Exception as e:
        logger.error(f"Find equivalents failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/curriculum/compare")
async def compare_curricula(
    curriculum1: str,
    curriculum2: str,
) -> Dict[str, Any]:
    """Compare two curricula."""
    try:
        mapper = get_components()["curriculum_mapper"]
        comparison = mapper.compare_curricula(curriculum1, curriculum2)

        return {
            "curriculum1": comparison.curriculum1,
            "curriculum2": comparison.curriculum2,
            "shared_concepts": comparison.shared_concepts,
            "unique_to_first": comparison.unique_to_first,
            "unique_to_second": comparison.unique_to_second,
            "overlap_percentage": comparison.overlap_percentage,
            "alignment_suggestions": comparison.alignment_suggestions,
            "domain_comparison": comparison.domain_comparison,
            "difficulty_comparison": comparison.difficulty_comparison,
        }
    except Exception as e:
        logger.error(f"Curriculum comparison failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/curriculum/transfer-plan")
async def create_transfer_plan(
    source_curriculum: str,
    target_curriculum: str,
    completed_concepts: List[str],
    student_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Create a transfer plan between curricula."""
    try:
        mapper = get_components()["curriculum_mapper"]
        plan = mapper.create_transfer_plan(
            source_curriculum=source_curriculum,
            target_curriculum=target_curriculum,
            completed_concepts=completed_concepts,
            student_id=student_id,
        )

        return {
            "source": plan.source_curriculum,
            "target": plan.target_curriculum,
            "student_id": plan.student_id,
            "equivalent_credits": len(plan.equivalent_credits),
            "gaps_to_fill": plan.gaps_to_fill,
            "additional_requirements": plan.additional_requirements,
            "estimated_catch_up_hours": plan.estimated_catch_up_hours,
            "recommendations": plan.recommendations,
        }
    except Exception as e:
        logger.error(f"Transfer plan creation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/curriculum/list")
async def list_curricula() -> Dict[str, Any]:
    """List all available curricula."""
    try:
        mapper = get_components()["curriculum_mapper"]
        curricula = mapper.get_all_curricula()

        return {
            "curricula": [
                mapper.get_curriculum_info(c) for c in curricula
            ],
            "total": len(curricula),
        }
    except Exception as e:
        logger.error(f"List curricula failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# Graph Visualization Endpoints
# =============================================================================

@app.get("/api/v1/graph/{graph_id}/visualize")
async def visualize_graph(
    graph_id: str,
    format: str = "d3",
    focus_concept: Optional[str] = None,
    depth: int = 2,
) -> Any:
    """Generate graph visualization in specified format."""
    try:
        visualizer = get_components()["graph_visualizer"]
        graph = GraphVisualizer.get_sample_graph()

        if format == "html":
            html_content = visualizer.generate_interactive_html(
                graph=graph,
                title=f"Knowledge Graph: {graph_id}",
            )
            return HTMLResponse(content=html_content)

        result = visualizer.visualize(
            graph=graph,
            format=format,
            focus_concept=focus_concept,
            depth=depth,
        )

        return {
            "graph_id": graph_id,
            "format": format,
            "data": result,
        }
    except Exception as e:
        logger.error(f"Graph visualization failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/graph/{graph_id}/visualize-with-progress")
async def visualize_with_progress(
    graph_id: str,
    student_id: str,
    mastery_levels: Dict[str, float],
    current_concept: Optional[str] = None,
    format: str = "d3",
) -> Any:
    """Generate visualization with student progress overlay."""
    try:
        visualizer = get_components()["graph_visualizer"]
        graph = GraphVisualizer.get_sample_graph()

        progress = StudentProgress(
            student_id=student_id,
            mastery_levels=mastery_levels,
            current_concept=current_concept,
            completed_concepts=[c for c, m in mastery_levels.items() if m >= 0.8],
            in_progress_concepts=[c for c, m in mastery_levels.items() if 0.3 <= m < 0.8],
        )

        if format == "html":
            html_content = visualizer.generate_interactive_html(
                graph=graph,
                student_progress=progress,
                title=f"Progress: {student_id}",
            )
            return HTMLResponse(content=html_content)

        d3_data = visualizer.to_d3_json(graph)
        d3_data = visualizer._apply_progress_coloring(d3_data, progress)

        return {
            "graph_id": graph_id,
            "student_id": student_id,
            "format": format,
            "data": d3_data,
        }
    except Exception as e:
        logger.error(f"Visualization with progress failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/graph/{graph_id}/stats")
async def get_detailed_graph_stats(graph_id: str) -> Dict[str, Any]:
    """Get detailed graph statistics."""
    try:
        maintenance = get_components()["graph_maintenance"]
        health = await maintenance.get_graph_health(graph_id)

        return {
            "graph_id": graph_id,
            **health,
        }
    except Exception as e:
        logger.error(f"Graph stats failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# Training Integration Endpoints
# =============================================================================

@app.post("/api/v1/training/enhance-tracing")
async def enhance_knowledge_tracing(
    student_id: str,
    skill_id: str,
    performance: float,
) -> Dict[str, Any]:
    """Enhance knowledge tracing with graph-based predictions."""
    try:
        integration = get_components()["training_integration"]
        result = await integration.enhance_knowledge_tracing(
            student_id=student_id,
            skill_id=skill_id,
            performance=performance,
        )

        return {
            "student_id": result.student_id,
            "skill_id": result.skill_id,
            "original_probability": result.original_probability,
            "adjusted_probability": result.adjusted_probability,
            "prerequisite_factor": result.prerequisite_factor,
            "transfer_effects": result.transfer_effects,
            "confidence": result.confidence,
            "recommendations": result.recommendations,
        }
    except Exception as e:
        logger.error(f"Knowledge tracing enhancement failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/training/remediation")
async def get_remediation_plan(
    student_id: str,
    failed_skill: str,
) -> Dict[str, Any]:
    """Get remediation recommendations for a failed skill."""
    try:
        integration = get_components()["training_integration"]
        plan = await integration.get_remediation_recommendations(
            student_id=student_id,
            failed_skill=failed_skill,
        )

        return {
            "student_id": plan.student_id,
            "failed_skill": plan.failed_skill,
            "weak_prerequisites": plan.weak_prerequisites,
            "remediation_steps": [
                {
                    "concept_id": s.concept_id,
                    "concept_name": s.concept_name,
                    "step_type": s.step_type,
                    "priority": s.priority,
                    "estimated_duration_minutes": s.estimated_duration_minutes,
                    "rationale": s.rationale,
                    "expected_improvement": s.expected_improvement,
                }
                for s in plan.remediation_steps
            ],
            "estimated_total_time_minutes": plan.estimated_total_time_minutes,
            "predicted_time_to_mastery_hours": plan.predicted_time_to_mastery_hours,
            "success_probability": plan.success_probability,
        }
    except Exception as e:
        logger.error(f"Remediation plan generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/webhook/mastery-update")
async def on_mastery_update(request: MasteryUpdateRequest) -> Dict[str, Any]:
    """Handle mastery update webhook from training service."""
    try:
        integration = get_components()["training_integration"]
        event = MasteryUpdateEvent(
            event_type=request.event_type,
            student_id=request.student_id,
            skill_id=request.skill_id,
            previous_mastery=request.previous_mastery,
            new_mastery=request.new_mastery,
            timestamp=request.timestamp,
            assessment_score=request.assessment_score,
            time_spent_seconds=request.time_spent_seconds,
            attempts=request.attempts,
        )

        result = await integration.handle_mastery_update(event)

        return {
            "status": "processed",
            "source_skill": result.source_skill,
            "affected_skills": result.affected_skills,
            "propagation_type": result.propagation_type,
            "timestamp": result.timestamp,
        }
    except Exception as e:
        logger.error(f"Mastery update webhook failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/training/skill-state/{student_id}/{skill_id}")
async def get_skill_state(student_id: str, skill_id: str) -> Dict[str, Any]:
    """Get the current state of a skill for a student."""
    try:
        integration = get_components()["training_integration"]
        state = integration.get_skill_state(student_id, skill_id)

        return {
            "student_id": student_id,
            "skill_id": skill_id,
            "state": state.value,
        }
    except Exception as e:
        logger.error(f"Get skill state failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/training/prerequisite-readiness/{student_id}/{skill_id}")
async def check_prerequisite_readiness(
    student_id: str,
    skill_id: str,
) -> Dict[str, Any]:
    """Check if student is ready for a skill based on prerequisites."""
    try:
        integration = get_components()["training_integration"]
        readiness = integration.get_prerequisite_readiness(student_id, skill_id)

        return readiness
    except Exception as e:
        logger.error(f"Prerequisite readiness check failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# Graph Maintenance Endpoints
# =============================================================================

@app.get("/api/v1/maintenance/{graph_id}/validate")
async def validate_graph_maintenance(graph_id: str) -> Dict[str, Any]:
    """Validate graph for issues."""
    try:
        maintenance = get_components()["graph_maintenance"]
        report = await maintenance.validate_graph(graph_id)

        return {
            "graph_id": report.graph_id,
            "timestamp": report.timestamp,
            "is_valid": report.is_valid,
            "total_nodes": report.total_nodes,
            "total_edges": report.total_edges,
            "issues": [
                {
                    "type": i.issue_type,
                    "severity": i.severity,
                    "affected_nodes": i.affected_nodes,
                    "description": i.description,
                    "suggestion": i.suggestion,
                }
                for i in report.issues
            ],
            "statistics": report.statistics,
            "recommendations": report.recommendations,
        }
    except Exception as e:
        logger.error(f"Graph validation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/maintenance/{graph_id}/prune")
async def prune_weak_edges(
    graph_id: str,
    confidence_threshold: float = 0.5,
) -> Dict[str, Any]:
    """Remove low-confidence edges from the graph."""
    try:
        maintenance = get_components()["graph_maintenance"]
        result = await maintenance.prune_weak_edges(graph_id, confidence_threshold)

        return {
            "edges_removed": result.edges_removed,
            "edges_kept": result.edges_kept,
            "removed_edges": [
                {"source": e[0], "target": e[1], "type": e[2], "confidence": e[3]}
                for e in result.removed_edges
            ],
            "confidence_threshold": result.confidence_threshold,
            "timestamp": result.timestamp,
        }
    except Exception as e:
        logger.error(f"Edge pruning failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/maintenance/{graph_id}/merge-duplicates")
async def merge_duplicate_concepts(
    graph_id: str,
    similarity_threshold: float = 0.9,
) -> Dict[str, Any]:
    """Find and merge duplicate concepts."""
    try:
        maintenance = get_components()["graph_maintenance"]
        result = await maintenance.merge_duplicate_concepts(graph_id, similarity_threshold)

        return {
            "concepts_merged": result.concepts_merged,
            "merge_pairs": [
                {"concept1": p[0], "concept2": p[1], "similarity": p[2]}
                for p in result.merge_pairs
            ],
            "similarity_threshold": result.similarity_threshold,
            "timestamp": result.timestamp,
        }
    except Exception as e:
        logger.error(f"Duplicate merging failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/maintenance/{graph_id}/refresh-embeddings")
async def refresh_embeddings(
    graph_id: str,
    force: bool = False,
) -> Dict[str, Any]:
    """Refresh graph embeddings."""
    try:
        maintenance = get_components()["graph_maintenance"]
        result = await maintenance.refresh_embeddings(graph_id, force)

        return result
    except Exception as e:
        logger.error(f"Embedding refresh failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/maintenance/{graph_id}/repair")
async def repair_graph(
    graph_id: str,
    auto_fix: bool = False,
) -> Dict[str, Any]:
    """Attempt to repair common graph issues."""
    try:
        maintenance = get_components()["graph_maintenance"]
        result = await maintenance.repair_graph(graph_id, auto_fix)

        return result
    except Exception as e:
        logger.error(f"Graph repair failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/maintenance/{graph_id}/health")
async def get_graph_health(graph_id: str) -> Dict[str, Any]:
    """Get overall health score for a graph."""
    try:
        maintenance = get_components()["graph_maintenance"]
        health = await maintenance.get_graph_health(graph_id)

        return {
            "graph_id": graph_id,
            **health,
        }
    except Exception as e:
        logger.error(f"Graph health check failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
