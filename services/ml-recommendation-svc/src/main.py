"""
ML Recommendation Service - Main Application
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import get_settings
from src.routers import health, recommendations, student_brain, special_needs, emotion_recognition, analytics
from src.services.feature_store import FeatureStore
from src.services.message_consumer import MessageConsumer
from src.services.recommendation_engine import RecommendationEngine

logger = structlog.get_logger()
settings = get_settings()


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
