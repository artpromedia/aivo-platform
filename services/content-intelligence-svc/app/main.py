"""Content Intelligence Service - FastAPI Application"""
import logging
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .models import (
    AutoTagger,
    TopicClassifier,
    PrerequisiteDetector,
    ContentRecommender,
    ReadabilityAnalyzer,
)
from .models.content_recommender import LearnerProfile, ContentItem
from .services import ContentIndexer, EmbeddingService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global instances
auto_tagger: Optional[AutoTagger] = None
topic_classifier: Optional[TopicClassifier] = None
prerequisite_detector: Optional[PrerequisiteDetector] = None
content_recommender: Optional[ContentRecommender] = None
readability_analyzer: Optional[ReadabilityAnalyzer] = None
content_indexer: Optional[ContentIndexer] = None
embedding_service: Optional[EmbeddingService] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global auto_tagger, topic_classifier, prerequisite_detector
    global content_recommender, readability_analyzer, content_indexer, embedding_service

    logger.info("Initializing Content Intelligence Service...")

    # Initialize all models and services
    auto_tagger = AutoTagger()
    topic_classifier = TopicClassifier()
    prerequisite_detector = PrerequisiteDetector()
    content_recommender = ContentRecommender()
    readability_analyzer = ReadabilityAnalyzer()
    content_indexer = ContentIndexer()
    embedding_service = EmbeddingService()

    logger.info("All models initialized successfully")

    yield

    logger.info("Shutting down Content Intelligence Service...")


app = FastAPI(
    title="Content Intelligence Service",
    description="""
Content analysis, tagging, and recommendation engine.

## Features

- **Auto-tagging**: Automatically tag content with topics and skills
- **Classification**: Classify content by subject, grade, and type
- **Prerequisites**: Detect content prerequisites
- **Recommendations**: Recommend related content
- **Readability**: Analyze content readability
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
class ContentAnalysisRequest(BaseModel):
    content_id: Optional[str] = None
    text: str
    title: Optional[str] = None
    content_type: str = "lesson"


class LearnerContext(BaseModel):
    learner_id: str
    grade_level: int
    interests: List[str] = []
    recent_content: List[str] = []


class TagResponse(BaseModel):
    name: str
    type: str
    confidence: float


class ClassificationResponse(BaseModel):
    subject: str
    topic: str
    subtopic: str
    grade_level_min: int
    grade_level_max: int
    confidence: float


class PrerequisiteResponse(BaseModel):
    concept: str
    importance: str
    confidence: float


class RecommendationResponse(BaseModel):
    content_id: str
    title: str
    relevance_score: float
    reason: str


class ReadabilityResponse(BaseModel):
    flesch_kincaid_grade: float
    flesch_reading_ease: float
    gunning_fog: float
    smog_index: float
    dale_chall: float
    average_grade_level: float
    vocabulary_difficulty: float


class SimilarContentResponse(BaseModel):
    content_id: str
    score: float
    text: str
    metadata: Dict[str, Any]


class IndexContentRequest(BaseModel):
    content_id: str
    text: str
    metadata: Dict[str, Any] = {}


@app.get("/health")
async def health() -> Dict[str, Any]:
    """Health check endpoint."""
    return {"status": "healthy", "service": "content-intelligence-svc"}


@app.post("/api/v1/tags/auto")
async def auto_tag(request: ContentAnalysisRequest) -> Dict[str, Any]:
    """
    Automatically generate tags for content.

    Returns topic, skill, and concept tags with confidence scores.
    """
    if not auto_tagger:
        raise HTTPException(status_code=503, detail="Service not initialized")

    tags = auto_tagger.tag(request.text)

    return {
        "content_id": request.content_id,
        "tags": [
            TagResponse(
                name=tag.name,
                type=tag.type,
                confidence=tag.confidence
            ).model_dump()
            for tag in tags
        ],
        "statistics": auto_tagger.get_tag_statistics(tags)
    }


@app.post("/api/v1/classify")
async def classify_content(request: ContentAnalysisRequest) -> Dict[str, Any]:
    """
    Classify content by subject, grade level, and type.

    Returns hierarchical classification with subject, topic, and subtopic.
    """
    if not topic_classifier:
        raise HTTPException(status_code=503, detail="Service not initialized")

    # Get primary classification
    classification = topic_classifier.classify(request.text)

    # Get multi-label classifications for interdisciplinary content
    multi_label = topic_classifier.classify_multi_label(request.text)

    # Get grade level estimate
    grade_range = topic_classifier.estimate_grade_level(request.text)

    return {
        "content_id": request.content_id,
        "primary_classification": ClassificationResponse(
            subject=classification.subject,
            topic=classification.topic,
            subtopic=classification.subtopic,
            grade_level_min=classification.grade_level_min,
            grade_level_max=classification.grade_level_max,
            confidence=classification.confidence
        ).model_dump(),
        "additional_classifications": [
            ClassificationResponse(
                subject=c.subject,
                topic=c.topic,
                subtopic=c.subtopic,
                grade_level_min=c.grade_level_min,
                grade_level_max=c.grade_level_max,
                confidence=c.confidence
            ).model_dump()
            for c in multi_label[1:]  # Skip primary
        ],
        "estimated_grade_range": {
            "min": grade_range[0],
            "max": grade_range[1]
        }
    }


@app.post("/api/v1/prerequisites/detect")
async def detect_prerequisites(request: ContentAnalysisRequest) -> Dict[str, Any]:
    """
    Detect prerequisite content/concepts.

    Identifies required, recommended, and helpful prerequisites.
    """
    if not prerequisite_detector:
        raise HTTPException(status_code=503, detail="Service not initialized")

    prereqs = prerequisite_detector.detect(request.text)

    # Group by importance
    required = [p for p in prereqs if p.importance == "required"]
    recommended = [p for p in prereqs if p.importance == "recommended"]
    helpful = [p for p in prereqs if p.importance == "helpful"]

    return {
        "content_id": request.content_id,
        "prerequisites": [
            PrerequisiteResponse(
                concept=p.concept,
                importance=p.importance,
                confidence=p.confidence
            ).model_dump()
            for p in prereqs
        ],
        "summary": {
            "required_count": len(required),
            "recommended_count": len(recommended),
            "helpful_count": len(helpful)
        }
    }


@app.post("/api/v1/prerequisites/validate")
async def validate_learner_readiness(
    content_text: str = Body(...),
    learner_knowledge: List[str] = Body(...)
) -> Dict[str, Any]:
    """
    Validate if a learner is ready for content based on their knowledge.
    """
    if not prerequisite_detector:
        raise HTTPException(status_code=503, detail="Service not initialized")

    readiness = prerequisite_detector.validate_readiness(content_text, learner_knowledge)
    return readiness


@app.post("/api/v1/recommend")
async def recommend_content(
    learner: LearnerContext,
    num_recommendations: int = 5,
) -> Dict[str, Any]:
    """
    Recommend content for a learner.

    Uses collaborative filtering, content-based filtering, and interest matching.
    """
    if not content_recommender:
        raise HTTPException(status_code=503, detail="Service not initialized")

    # Ensure learner profile exists
    profile = LearnerProfile(
        learner_id=learner.learner_id,
        grade_level=learner.grade_level,
        interests=learner.interests,
        completed_content=learner.recent_content
    )
    content_recommender.add_learner(profile)

    # Get recommendations
    recommendations = content_recommender.recommend(
        learner_id=learner.learner_id,
        num_recommendations=num_recommendations
    )

    return {
        "learner_id": learner.learner_id,
        "recommendations": [
            RecommendationResponse(
                content_id=rec.content_id,
                title=rec.title,
                relevance_score=rec.relevance_score,
                reason=rec.reason
            ).model_dump()
            for rec in recommendations
        ],
        "coverage": content_recommender.get_content_coverage(learner.learner_id)
    }


@app.post("/api/v1/recommend/content")
async def add_content_for_recommendations(
    content_id: str = Body(...),
    title: str = Body(...),
    subject: str = Body(""),
    topics: List[str] = Body([]),
    grade_level_min: int = Body(1),
    grade_level_max: int = Body(12),
    difficulty: float = Body(0.5)
) -> Dict[str, Any]:
    """
    Add content to the recommendation system catalog.
    """
    if not content_recommender:
        raise HTTPException(status_code=503, detail="Service not initialized")

    content = ContentItem(
        content_id=content_id,
        title=title,
        subject=subject,
        topics=topics,
        grade_level_min=grade_level_min,
        grade_level_max=grade_level_max,
        difficulty=difficulty
    )
    content_recommender.add_content(content)

    return {
        "status": "success",
        "content_id": content_id,
        "catalog_size": content_recommender.get_catalog_size()
    }


@app.post("/api/v1/readability/analyze")
async def analyze_readability(
    text: str = Body(..., embed=True)
) -> Dict[str, Any]:
    """
    Analyze text readability using multiple metrics.

    Returns Flesch-Kincaid, Gunning Fog, SMOG, and Dale-Chall scores.
    """
    if not readability_analyzer:
        raise HTTPException(status_code=503, detail="Service not initialized")

    analysis = readability_analyzer.analyze(text)
    grade_level = readability_analyzer.estimate_grade_level(text)
    reading_time = readability_analyzer.get_reading_time(text)

    return {
        "analysis": ReadabilityResponse(
            flesch_kincaid_grade=analysis.flesch_kincaid_grade,
            flesch_reading_ease=analysis.flesch_reading_ease,
            gunning_fog=analysis.gunning_fog,
            smog_index=analysis.smog_index,
            dale_chall=analysis.dale_chall,
            average_grade_level=analysis.average_grade_level,
            vocabulary_difficulty=analysis.vocabulary_difficulty
        ).model_dump(),
        "estimated_grade_level": grade_level,
        "reading_time": reading_time
    }


@app.post("/api/v1/readability/simplify")
async def suggest_simplifications(
    text: str = Body(...),
    target_grade: int = Body(5)
) -> Dict[str, Any]:
    """
    Suggest simplifications to make text suitable for a target grade level.
    """
    if not readability_analyzer:
        raise HTTPException(status_code=503, detail="Service not initialized")

    suggestions = readability_analyzer.suggest_simplifications(text, target_grade)
    difficult_words = readability_analyzer.identify_difficult_words(text, target_grade)

    return {
        **suggestions,
        "all_difficult_words": difficult_words[:30]  # Limit to 30
    }


@app.post("/api/v1/similar/find")
async def find_similar(
    content_id: str = Body(...),
    top_k: int = Body(10)
) -> Dict[str, Any]:
    """
    Find similar content using vector similarity.
    """
    if not content_indexer:
        raise HTTPException(status_code=503, detail="Service not initialized")

    similar = content_indexer.search_similar(content_id, top_k=top_k)

    if not similar:
        # Try with content recommender if available
        if content_recommender:
            recommendations = content_recommender.find_similar(content_id, top_k=top_k)
            return {
                "content_id": content_id,
                "similar_content": [
                    {
                        "content_id": rec.content_id,
                        "title": rec.title,
                        "score": rec.relevance_score,
                        "reason": rec.reason
                    }
                    for rec in recommendations
                ]
            }

    return {
        "content_id": content_id,
        "similar_content": [
            SimilarContentResponse(
                content_id=s["content_id"],
                score=s["score"],
                text=s["text"],
                metadata=s["metadata"]
            ).model_dump()
            for s in similar
        ]
    }


@app.post("/api/v1/index/content")
async def index_content(request: IndexContentRequest) -> Dict[str, Any]:
    """
    Index content for search and similarity matching.
    """
    if not content_indexer:
        raise HTTPException(status_code=503, detail="Service not initialized")

    content_indexer.index(
        content_id=request.content_id,
        text=request.text,
        metadata=request.metadata
    )

    return {
        "status": "success",
        "content_id": request.content_id,
        "index_size": content_indexer.count()
    }


@app.post("/api/v1/index/search")
async def search_content(
    query: str = Body(...),
    filters: Dict[str, Any] = Body(None),
    top_k: int = Body(10)
) -> Dict[str, Any]:
    """
    Search indexed content by query text.
    """
    if not content_indexer:
        raise HTTPException(status_code=503, detail="Service not initialized")

    results = content_indexer.search(query, filters=filters, top_k=top_k)

    return {
        "query": query,
        "results": results,
        "count": len(results)
    }


@app.get("/api/v1/index/stats")
async def get_index_stats() -> Dict[str, Any]:
    """
    Get content index statistics.
    """
    if not content_indexer:
        raise HTTPException(status_code=503, detail="Service not initialized")

    return content_indexer.get_statistics()


@app.post("/api/v1/embeddings/generate")
async def generate_embeddings(
    texts: List[str] = Body(...)
) -> Dict[str, Any]:
    """
    Generate embeddings for a list of texts.
    """
    if not embedding_service:
        raise HTTPException(status_code=503, detail="Service not initialized")

    embeddings = embedding_service.embed(texts)

    return {
        "count": len(texts),
        "embedding_dim": embedding_service.embedding_dim,
        "embeddings": embeddings.tolist()
    }


@app.post("/api/v1/embeddings/similarity")
async def compute_similarity(
    text_a: str = Body(...),
    text_b: str = Body(...)
) -> Dict[str, Any]:
    """
    Compute semantic similarity between two texts.
    """
    if not embedding_service:
        raise HTTPException(status_code=503, detail="Service not initialized")

    similarity = embedding_service.similarity(text_a, text_b)

    return {
        "similarity": similarity,
        "interpretation": _interpret_similarity(similarity)
    }


def _interpret_similarity(score: float) -> str:
    """Interpret similarity score."""
    if score >= 0.8:
        return "highly similar"
    elif score >= 0.6:
        return "similar"
    elif score >= 0.4:
        return "somewhat similar"
    elif score >= 0.2:
        return "loosely related"
    else:
        return "unrelated"


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
