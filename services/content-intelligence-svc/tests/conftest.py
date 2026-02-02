"""
Pytest configuration and fixtures for content-intelligence-svc tests.
"""

import pytest
from dataclasses import dataclass
from typing import List, Dict, Any, Optional
from unittest.mock import MagicMock
import numpy as np
from fastapi.testclient import TestClient


# ============================================================================
# Mock Data Classes (matching the real service models)
# ============================================================================

@dataclass
class TagResult:
    """Mock tag result."""
    tag: str
    confidence: float
    category: str = "general"


@dataclass
class ClassificationResult:
    """Mock classification result."""
    subject: str
    topic: str
    subtopic: str
    grade_level_min: int
    grade_level_max: int
    confidence: float


@dataclass
class PrerequisiteResult:
    """Mock prerequisite result."""
    concept: str
    importance: str  # required, recommended, helpful
    confidence: float


@dataclass
class RecommendationResult:
    """Mock recommendation result."""
    content_id: str
    title: str
    relevance_score: float
    reason: str


@dataclass
class ReadabilityResult:
    """Mock readability analysis result."""
    flesch_kincaid_grade: float
    flesch_reading_ease: float
    gunning_fog: float
    smog_index: float
    dale_chall: float
    average_grade_level: float
    vocabulary_difficulty: str


@dataclass
class LearnerProfile:
    """Mock learner profile."""
    learner_id: str
    grade_level: int
    interests: List[str]
    completed_content: List[str]


@dataclass
class ContentItem:
    """Mock content item for recommendations."""
    content_id: str
    title: str
    subject: str
    topics: List[str]
    grade_level_min: int
    grade_level_max: int
    difficulty: float


# ============================================================================
# Mock Components
# ============================================================================

@pytest.fixture
def mock_auto_tagger():
    """Create a mock auto tagger."""
    tagger = MagicMock()
    tagger.tag.return_value = [
        TagResult(tag="mathematics", confidence=0.92, category="subject"),
        TagResult(tag="algebra", confidence=0.87, category="topic"),
        TagResult(tag="equations", confidence=0.78, category="subtopic"),
    ]
    tagger.tag_with_context.return_value = [
        TagResult(tag="math-context", confidence=0.9, category="contextual"),
    ]
    return tagger


@pytest.fixture
def mock_topic_classifier():
    """Create a mock topic classifier."""
    classifier = MagicMock()
    classifier.classify.return_value = ClassificationResult(
        subject="Mathematics",
        topic="Algebra",
        subtopic="Linear Equations",
        grade_level_min=7,
        grade_level_max=9,
        confidence=0.85
    )
    classifier.classify_multi_label.return_value = [
        ClassificationResult(
            subject="Mathematics",
            topic="Algebra",
            subtopic="Linear Equations",
            grade_level_min=7,
            grade_level_max=9,
            confidence=0.85
        ),
        ClassificationResult(
            subject="Mathematics",
            topic="Arithmetic",
            subtopic="Basic Operations",
            grade_level_min=5,
            grade_level_max=7,
            confidence=0.65
        )
    ]
    classifier.estimate_grade_range.return_value = (7, 9)
    return classifier


@pytest.fixture
def mock_prerequisite_detector():
    """Create a mock prerequisite detector."""
    detector = MagicMock()
    detector.detect.return_value = [
        PrerequisiteResult(concept="Basic arithmetic", importance="required", confidence=0.95),
        PrerequisiteResult(concept="Variables", importance="required", confidence=0.90),
        PrerequisiteResult(concept="Order of operations", importance="recommended", confidence=0.80),
        PrerequisiteResult(concept="Number line", importance="helpful", confidence=0.60),
    ]
    detector.validate_readiness.return_value = {
        "ready": True,
        "missing_required": [],
        "missing_recommended": ["Order of operations"],
        "readiness_score": 0.85
    }
    return detector


@pytest.fixture
def mock_content_recommender():
    """Create a mock content recommender."""
    recommender = MagicMock()
    recommender.recommend.return_value = [
        RecommendationResult(
            content_id="content-001",
            title="Introduction to Algebra",
            relevance_score=0.92,
            reason="Matches interest in mathematics"
        ),
        RecommendationResult(
            content_id="content-002",
            title="Solving Linear Equations",
            relevance_score=0.88,
            reason="Appropriate grade level"
        ),
    ]
    recommender.find_similar.return_value = [
        RecommendationResult(
            content_id="similar-001",
            title="Similar Content",
            relevance_score=0.75,
            reason="Topic similarity"
        )
    ]
    recommender.get_content_coverage.return_value = {
        "subjects_covered": ["Mathematics", "Science"],
        "grade_levels_covered": [7, 8, 9]
    }
    recommender.get_catalog_size.return_value = 150
    recommender.add_content.return_value = None
    recommender.add_learner.return_value = None
    return recommender


@pytest.fixture
def mock_readability_analyzer():
    """Create a mock readability analyzer."""
    analyzer = MagicMock()
    analyzer.analyze.return_value = ReadabilityResult(
        flesch_kincaid_grade=8.5,
        flesch_reading_ease=60.0,
        gunning_fog=10.2,
        smog_index=9.1,
        dale_chall=7.8,
        average_grade_level=8.9,
        vocabulary_difficulty="intermediate"
    )
    analyzer.estimate_grade_level.return_value = 8
    analyzer.get_reading_time.return_value = {"minutes": 5, "seconds": 30}
    analyzer.suggest_simplifications.return_value = {
        "suggestions": [
            {"original": "utilize", "simplified": "use"},
            {"original": "subsequently", "simplified": "then"}
        ],
        "current_grade": 10,
        "target_grade": 5
    }
    analyzer.identify_difficult_words.return_value = [
        {"word": "subsequently", "difficulty": 0.8},
        {"word": "utilize", "difficulty": 0.7},
        {"word": "comprehensive", "difficulty": 0.65}
    ]
    return analyzer


@pytest.fixture
def mock_content_indexer():
    """Create a mock content indexer."""
    indexer = MagicMock()
    indexer.index.return_value = None
    indexer.search.return_value = [
        {
            "content_id": "indexed-001",
            "text": "Sample indexed content",
            "score": 0.89,
            "metadata": {"subject": "Math"}
        }
    ]
    indexer.search_similar.return_value = [
        {
            "content_id": "similar-001",
            "text": "Similar content text",
            "score": 0.82,
            "metadata": {"topic": "Algebra"}
        }
    ]
    indexer.count.return_value = 500
    indexer.get_statistics.return_value = {
        "total_documents": 500,
        "index_size_mb": 25.5,
        "average_embedding_dim": 384
    }
    return indexer


@pytest.fixture
def mock_embedding_service():
    """Create a mock embedding service."""
    service = MagicMock()
    service.embedding_dim = 384
    service.embed.return_value = np.random.rand(2, 384).astype(np.float32)
    service.similarity.return_value = 0.75
    return service


# ============================================================================
# Test Client Fixture
# ============================================================================

@pytest.fixture
def client(
    mock_auto_tagger,
    mock_topic_classifier,
    mock_prerequisite_detector,
    mock_content_recommender,
    mock_readability_analyzer,
    mock_content_indexer,
    mock_embedding_service
):
    """
    Create a test client with mocked dependencies.
    """
    # Import the app module
    from app import main as app_module
    
    # Store original values
    original_auto_tagger = getattr(app_module, 'auto_tagger', None)
    original_topic_classifier = getattr(app_module, 'topic_classifier', None)
    original_prerequisite_detector = getattr(app_module, 'prerequisite_detector', None)
    original_content_recommender = getattr(app_module, 'content_recommender', None)
    original_readability_analyzer = getattr(app_module, 'readability_analyzer', None)
    original_content_indexer = getattr(app_module, 'content_indexer', None)
    original_embedding_service = getattr(app_module, 'embedding_service', None)
    
    try:
        # Inject mocks
        app_module.auto_tagger = mock_auto_tagger
        app_module.topic_classifier = mock_topic_classifier
        app_module.prerequisite_detector = mock_prerequisite_detector
        app_module.content_recommender = mock_content_recommender
        app_module.readability_analyzer = mock_readability_analyzer
        app_module.content_indexer = mock_content_indexer
        app_module.embedding_service = mock_embedding_service
        
        # Create and yield client
        with TestClient(app_module.app) as test_client:
            yield test_client
    finally:
        # Restore originals
        app_module.auto_tagger = original_auto_tagger
        app_module.topic_classifier = original_topic_classifier
        app_module.prerequisite_detector = original_prerequisite_detector
        app_module.content_recommender = original_content_recommender
        app_module.readability_analyzer = original_readability_analyzer
        app_module.content_indexer = original_content_indexer
        app_module.embedding_service = original_embedding_service


@pytest.fixture
def uninitialized_client():
    """
    Create a test client with uninitialized (None) dependencies.
    Used for testing 503 Service Unavailable responses.
    """
    from app import main as app_module
    
    # Store original values
    original_auto_tagger = getattr(app_module, 'auto_tagger', None)
    original_topic_classifier = getattr(app_module, 'topic_classifier', None)
    original_prerequisite_detector = getattr(app_module, 'prerequisite_detector', None)
    original_content_recommender = getattr(app_module, 'content_recommender', None)
    original_readability_analyzer = getattr(app_module, 'readability_analyzer', None)
    original_content_indexer = getattr(app_module, 'content_indexer', None)
    original_embedding_service = getattr(app_module, 'embedding_service', None)
    
    try:
        # Set all to None
        app_module.auto_tagger = None
        app_module.topic_classifier = None
        app_module.prerequisite_detector = None
        app_module.content_recommender = None
        app_module.readability_analyzer = None
        app_module.content_indexer = None
        app_module.embedding_service = None
        
        # Create and yield client
        with TestClient(app_module.app) as test_client:
            yield test_client
    finally:
        # Restore originals
        app_module.auto_tagger = original_auto_tagger
        app_module.topic_classifier = original_topic_classifier
        app_module.prerequisite_detector = original_prerequisite_detector
        app_module.content_recommender = original_content_recommender
        app_module.readability_analyzer = original_readability_analyzer
        app_module.content_indexer = original_content_indexer
        app_module.embedding_service = original_embedding_service
