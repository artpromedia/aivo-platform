"""
API v1 Routes for Python API Gateway.

This module aggregates all API routers for the gateway:
- AI routes: Proxy to AI inference service
- Training routes: Proxy to training service
- Curriculum routes: Proxy to curriculum service
"""

from fastapi import APIRouter

from .ai import router as ai_router
from .training import router as training_router
from .curriculum import router as curriculum_router

api_router = APIRouter()
api_router.include_router(ai_router, prefix="/ai", tags=["AI"])
api_router.include_router(training_router, prefix="/training", tags=["Training"])
api_router.include_router(curriculum_router, prefix="/curriculum", tags=["Curriculum"])

__all__ = ["api_router"]
