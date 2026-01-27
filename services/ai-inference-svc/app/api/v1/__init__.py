"""
API v1 Routes for AI Inference Service.

This module exports the API routers for all AI inference endpoints:
- Generate: Text generation and completion endpoints
- Brain: Virtual brain and knowledge tracing endpoints
- Adapt: Content adaptation and personalization endpoints
"""

from fastapi import APIRouter

from .generate import router as generate_router
from .brain import router as brain_router
from .adapt import router as adapt_router

api_router = APIRouter()
api_router.include_router(generate_router, prefix="/generate", tags=["Generate"])
api_router.include_router(brain_router, prefix="/brain", tags=["Brain"])
api_router.include_router(adapt_router, prefix="/adapt", tags=["Adapt"])

__all__ = ["api_router", "generate_router", "brain_router", "adapt_router"]
