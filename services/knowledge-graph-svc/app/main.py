"""Knowledge Graph Service - FastAPI Application"""
import logging
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import models and services
from .models.concept_extractor import ConceptExtractor, ConceptExtractorConfig
from .models.relation_classifier import RelationClassifier, RelationClassifierConfig
from .models.graph_embeddings import GraphEmbeddings, GraphEmbeddingsConfig
from .models.prerequisite_predictor import PrerequisitePredictor
from .models.learning_path_optimizer import LearningPathOptimizer

from .services.graph_builder import GraphBuilder
from .services.gap_detector import GapDetector
from .services.reasoning_engine import ReasoningEngine

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
    """,
    version="0.1.0",
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
