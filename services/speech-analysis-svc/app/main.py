"""
Speech Analysis Service - FastAPI Application

Provides REST API for speech analysis and assessment:
- Phoneme recognition and segmentation
- Articulation scoring
- Error pattern detection
- Age-appropriate norm comparison
"""

import os
import logging
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import structlog

from .api.routes import router as api_router

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    # Startup
    logger.info("Starting Speech Analysis Service")
    
    # Initialize speech analyzer (pre-load models)
    try:
        from .models.phoneme_model import SpeechAnalyzer
        model_path = os.getenv("PHONEME_MODEL_PATH")
        device = os.getenv("DEVICE", "cpu")
        app.state.speech_analyzer = SpeechAnalyzer(
            model_path=model_path,
            device=device
        )
        logger.info("Speech Analyzer initialized", device=device)
    except Exception as e:
        logger.warning(f"Speech Analyzer initialization failed: {e}")
        app.state.speech_analyzer = None
    
    yield
    
    # Shutdown
    logger.info("Shutting down Speech Analysis Service")


# Create FastAPI application
app = FastAPI(
    title="Speech Analysis Service",
    description="AI-powered speech analysis for educational assessment",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api/v1")


# Health check endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "speech-analysis-svc"}


@app.get("/ready")
async def readiness_check():
    """Readiness check endpoint"""
    ready = True
    details = {}
    
    # Check if analyzer is available
    if hasattr(app.state, 'speech_analyzer'):
        details["speech_analyzer"] = app.state.speech_analyzer is not None
        if not app.state.speech_analyzer:
            ready = False
    
    return {
        "status": "ready" if ready else "not_ready",
        "details": details
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Speech Analysis Service",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "api": "/api/v1",
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8080)),
        reload=os.getenv("ENV", "development") == "development",
    )
