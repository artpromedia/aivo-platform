"""
ML Recommendation Service - Main Application
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator
import os

import numpy as np
import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import get_settings
from src.routers import health, recommendations, student_brain, special_needs, emotion_recognition, analytics, hybrid, at_risk
from src.services.feature_store import FeatureStore
from src.services.message_consumer import MessageConsumer
from src.services.recommendation_engine import RecommendationEngine
from src.models.hybrid_recommender import HybridRecommender
from src.models.risk_predictor import AtRiskPredictor

logger = structlog.get_logger()
settings = get_settings()


def create_default_skill_embeddings() -> dict:
    """Create default skill embeddings for common educational skills."""
    np.random.seed(42)
    embedding_dim = 64
    
    # Math skills cluster
    math_base = np.random.randn(embedding_dim)
    skills = {
        'addition': math_base + np.random.randn(embedding_dim) * 0.2,
        'subtraction': math_base + np.random.randn(embedding_dim) * 0.2,
        'multiplication': math_base + np.random.randn(embedding_dim) * 0.3,
        'division': math_base + np.random.randn(embedding_dim) * 0.3,
        'fractions': math_base + np.random.randn(embedding_dim) * 0.4,
        'decimals': math_base + np.random.randn(embedding_dim) * 0.4,
        'algebra': math_base + np.random.randn(embedding_dim) * 0.5,
        'geometry': math_base + np.random.randn(embedding_dim) * 0.5,
        'measurement': math_base + np.random.randn(embedding_dim) * 0.4,
        'statistics': math_base + np.random.randn(embedding_dim) * 0.5,
    }
    
    # Reading skills cluster
    reading_base = np.random.randn(embedding_dim)
    skills.update({
        'phonics': reading_base + np.random.randn(embedding_dim) * 0.2,
        'fluency': reading_base + np.random.randn(embedding_dim) * 0.2,
        'vocabulary': reading_base + np.random.randn(embedding_dim) * 0.3,
        'comprehension': reading_base + np.random.randn(embedding_dim) * 0.3,
        'inference': reading_base + np.random.randn(embedding_dim) * 0.4,
        'main_idea': reading_base + np.random.randn(embedding_dim) * 0.3,
        'summarization': reading_base + np.random.randn(embedding_dim) * 0.4,
    })
    
    # Writing skills cluster
    writing_base = np.random.randn(embedding_dim)
    skills.update({
        'spelling': writing_base + np.random.randn(embedding_dim) * 0.2,
        'grammar': writing_base + np.random.randn(embedding_dim) * 0.3,
        'punctuation': writing_base + np.random.randn(embedding_dim) * 0.2,
        'sentence_structure': writing_base + np.random.randn(embedding_dim) * 0.3,
        'paragraph_writing': writing_base + np.random.randn(embedding_dim) * 0.4,
        'essay_writing': writing_base + np.random.randn(embedding_dim) * 0.5,
    })
    
    # Science skills cluster
    science_base = np.random.randn(embedding_dim)
    skills.update({
        'scientific_method': science_base + np.random.randn(embedding_dim) * 0.2,
        'biology': science_base + np.random.randn(embedding_dim) * 0.4,
        'chemistry': science_base + np.random.randn(embedding_dim) * 0.4,
        'physics': science_base + np.random.randn(embedding_dim) * 0.4,
        'earth_science': science_base + np.random.randn(embedding_dim) * 0.4,
    })
    
    return skills


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager."""
    logger.info("Starting ML Recommendation Service", port=settings.port)

    # Initialize feature store
    feature_store = FeatureStore(str(settings.redis_url))
    await feature_store.connect()
    app.state.feature_store = feature_store

    # Initialize recommendation engine
    engine = RecommendationEngine(feature_store, settings)
    app.state.recommendation_engine = engine
    
    # Initialize hybrid recommender
    try:
        skill_embeddings = create_default_skill_embeddings()
        
        weights = {
            'collaborative': float(os.getenv('HYBRID_COLLAB_WEIGHT', 0.3)),
            'content': float(os.getenv('HYBRID_CONTENT_WEIGHT', 0.4)),
            'knowledge': float(os.getenv('HYBRID_KNOWLEDGE_WEIGHT', 0.3)),
        }
        exploration_rate = float(os.getenv('HYBRID_EXPLORATION_RATE', 0.2))
        
        hybrid_recommender = HybridRecommender(
            skill_embeddings=skill_embeddings,
            weights=weights,
            exploration_rate=exploration_rate,
        )
        
        # Load saved state if exists
        model_path = os.getenv('HYBRID_MODEL_PATH', '/app/models/hybrid')
        if os.path.exists(model_path):
            try:
                hybrid_recommender.load(model_path)
                logger.info("Loaded hybrid recommender state", path=model_path)
            except Exception as e:
                logger.warning("Could not load hybrid recommender state", error=str(e))
        
        app.state.hybrid_recommender = hybrid_recommender
        logger.info("Hybrid recommender initialized", weights=weights)
    except Exception as e:
        logger.warning("Hybrid recommender initialization failed", error=str(e))
        app.state.hybrid_recommender = None

    # Initialize at-risk predictor
    try:
        model_type = os.getenv('RISK_MODEL_TYPE', 'gradient_boosting')
        risk_predictor = AtRiskPredictor(model_type=model_type)
        
        # Load saved model if exists
        risk_model_path = os.getenv('RISK_MODEL_PATH', '/app/models/risk_predictor.pkl')
        if os.path.exists(risk_model_path):
            try:
                risk_predictor.load_model(risk_model_path)
                logger.info("Loaded risk predictor model", path=risk_model_path)
            except Exception as e:
                logger.warning("Could not load risk predictor model", error=str(e))
        
        app.state.risk_predictor = risk_predictor
        logger.info("Risk predictor initialized", model_type=model_type)
    except Exception as e:
        logger.warning("Risk predictor initialization failed", error=str(e))
        app.state.risk_predictor = None

    # Initialize message consumer
    consumer = MessageConsumer(
        rabbitmq_url=settings.rabbitmq_url,
        exchange=settings.rabbitmq_exchange,
        queue=settings.rabbitmq_queue,
        engine=engine,
    )
    await consumer.start()
    app.state.message_consumer = consumer

    logger.info("ML Recommendation Service started successfully")

    yield

    # Cleanup
    logger.info("Shutting down ML Recommendation Service")
    
    # Save risk predictor state
    if hasattr(app.state, 'risk_predictor') and app.state.risk_predictor and app.state.risk_predictor.is_trained:
        try:
            risk_model_path = os.getenv('RISK_MODEL_PATH', '/app/models/risk_predictor.pkl')
            app.state.risk_predictor.save_model(risk_model_path)
            logger.info("Saved risk predictor model", path=risk_model_path)
        except Exception as e:
            logger.warning("Could not save risk predictor model", error=str(e))
    
    # Save hybrid recommender state
    if hasattr(app.state, 'hybrid_recommender') and app.state.hybrid_recommender:
        try:
            model_path = os.getenv('HYBRID_MODEL_PATH', '/app/models/hybrid')
            app.state.hybrid_recommender.save(model_path)
            logger.info("Saved hybrid recommender state", path=model_path)
        except Exception as e:
            logger.warning("Could not save hybrid recommender state", error=str(e))
    
    await consumer.stop()
    await feature_store.disconnect()
    logger.info("ML Recommendation Service stopped")


app = FastAPI(
    title="AIVO ML & AI Services",
    description="""
Machine learning and AI services for the AIVO learning platform.

## Features

- **Student Brain AI**: Personalized AI model per student
- **Adaptive Learning**: Real-time difficulty adjustment
- **Special Needs Support**: Autism, ADHD, Dyslexia accommodations
- **Emotion Recognition**: SEL with 20+ emotions
- **Analytics & ROI**: K-anonymity protected metrics
- **At-Risk Prediction**: ML-based early intervention
- **Hybrid Recommendations**: Collaborative + Content-based + Knowledge tracing
    """,
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(recommendations.router, prefix="/recommendations", tags=["Recommendations"])
app.include_router(hybrid.router, prefix="/recommendations", tags=["Hybrid Recommendations"])
app.include_router(at_risk.router, prefix="/interventions", tags=["At-Risk Prediction"])
app.include_router(student_brain.router, prefix="/student-brain", tags=["Student Brain AI"])
app.include_router(special_needs.router, prefix="/special-needs", tags=["Special Needs Support"])
app.include_router(emotion_recognition.router, prefix="/emotions", tags=["Emotion Recognition"])
app.include_router(analytics.router, prefix="/analytics", tags=["Analytics & ROI"])


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=settings.environment == "development",
    )
