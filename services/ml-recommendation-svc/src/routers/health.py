"""
Health check router.
"""

from fastapi import APIRouter, Response

router = APIRouter()


@router.get("/health")
async def health_check() -> dict[str, str]:
    """Basic health check endpoint."""
    return {"status": "healthy", "service": "ml-recommendation-svc"}


@router.get("/ready")
async def readiness_check() -> dict[str, str]:
    """Readiness check for Kubernetes."""
    # TODO: Add checks for Redis, RabbitMQ, etc.
    return {"status": "ready"}


@router.get("/live")
async def liveness_check(response: Response) -> dict[str, str]:
    """Liveness check for Kubernetes."""
    return {"status": "alive"}
