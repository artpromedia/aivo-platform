"""
Document Intelligence Service - FastAPI Application

Provides REST API for document extraction and processing:
- IEP extraction from PDFs
- Curriculum parsing
- Document classification
- Text embeddings
"""

import os
import logging
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
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
    logger.info("Starting Document Intelligence Service")
    
    # Initialize extractors (pre-load models)
    try:
        from .extractors.iep_extractor import IEPExtractor
        app.state.iep_extractor = IEPExtractor()
        logger.info("IEP Extractor initialized")
    except Exception as e:
        logger.warning(f"IEP Extractor initialization failed: {e}")
        app.state.iep_extractor = None
    
    yield
    
    # Shutdown
    logger.info("Shutting down Document Intelligence Service")


# Create FastAPI application
app = FastAPI(
    title="Document Intelligence Service",
    description="Extract structured data from educational documents using OCR and NLP",
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
    return {"status": "healthy", "service": "document-intelligence-svc"}


@app.get("/ready")
async def readiness_check():
    """Readiness check endpoint"""
    ready = True
    details = {}
    
    # Check if extractors are available
    if hasattr(app.state, 'iep_extractor'):
        details["iep_extractor"] = app.state.iep_extractor is not None
        if not app.state.iep_extractor:
            ready = False
    
    return {
        "status": "ready" if ready else "not_ready",
        "details": details
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Document Intelligence Service",
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
