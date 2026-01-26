"""
Health Check Router

Provides health, readiness, and liveness endpoints for Kubernetes probes
and service discovery.
"""

from datetime import datetime
from typing import Any, Dict

import structlog
from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel

from app.config import Settings, get_settings

logger = structlog.get_logger()

router = APIRouter()


class HealthResponse(BaseModel):
    """Health check response model."""

    status: str
    service: str
    version: str
    timestamp: str
    checks: Dict[str, Any] = {}


class ReadinessResponse(BaseModel):
    """Readiness check response model."""

    ready: bool
    checks: Dict[str, bool] = {}


class LivenessResponse(BaseModel):
    """Liveness check response model."""

    alive: bool
    uptime_seconds: float


# Track service start time
_start_time = datetime.utcnow()


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check",
    description="Returns the overall health status of the service",
)
async def health_check(
    request: Request,
    settings: Settings = Depends(get_settings),
) -> HealthResponse:
    """
    Health check endpoint.

    Returns service health status including component checks.
    """
    checks = {}

    # Check Redis connection
    try:
        redis_client = request.app.state.redis
        if redis_client:
            await redis_client.ping()
            checks["redis"] = {"status": "healthy", "latency_ms": 0}
        else:
            checks["redis"] = {"status": "not_initialized"}
    except Exception as e:
        checks["redis"] = {"status": "unhealthy", "error": str(e)}

    # Check connection manager
    try:
        manager = request.app.state.connection_manager
        if manager:
            checks["connections"] = {
                "status": "healthy",
                "active_count": manager.get_active_connection_count(),
            }
        else:
            checks["connections"] = {"status": "not_initialized"}
    except Exception as e:
        checks["connections"] = {"status": "unhealthy", "error": str(e)}

    # Determine overall status
    all_healthy = all(
        c.get("status") == "healthy"
        for c in checks.values()
        if isinstance(c, dict) and "status" in c
    )

    return HealthResponse(
        status="healthy" if all_healthy else "degraded",
        service=settings.service_name,
        version=settings.service_version,
        timestamp=datetime.utcnow().isoformat(),
        checks=checks,
    )


@router.get(
    "/health/ready",
    response_model=ReadinessResponse,
    summary="Readiness check",
    description="Returns whether the service is ready to accept traffic",
)
async def readiness_check(
    request: Request,
    response: Response,
) -> ReadinessResponse:
    """
    Readiness probe endpoint for Kubernetes.

    Returns 200 if ready to serve traffic, 503 otherwise.
    """
    checks = {}

    # Check Redis
    try:
        redis_client = request.app.state.redis
        if redis_client:
            await redis_client.ping()
            checks["redis"] = True
        else:
            checks["redis"] = False
    except Exception:
        checks["redis"] = False

    # Check connection manager is running
    try:
        manager = request.app.state.connection_manager
        checks["connection_manager"] = manager is not None and manager._running
    except Exception:
        checks["connection_manager"] = False

    ready = all(checks.values())

    if not ready:
        response.status_code = 503

    return ReadinessResponse(ready=ready, checks=checks)


@router.get(
    "/health/live",
    response_model=LivenessResponse,
    summary="Liveness check",
    description="Returns whether the service is alive",
)
async def liveness_check() -> LivenessResponse:
    """
    Liveness probe endpoint for Kubernetes.

    Returns 200 if the service is alive.
    """
    uptime = (datetime.utcnow() - _start_time).total_seconds()

    return LivenessResponse(alive=True, uptime_seconds=uptime)


@router.get(
    "/health/stats",
    summary="Service statistics",
    description="Returns detailed service statistics",
)
async def stats(request: Request) -> Dict[str, Any]:
    """
    Get detailed service statistics.

    Returns connection counts, room counts, and other metrics.
    """
    stats = {
        "timestamp": datetime.utcnow().isoformat(),
        "uptime_seconds": (datetime.utcnow() - _start_time).total_seconds(),
    }

    # Connection stats
    try:
        manager = request.app.state.connection_manager
        if manager:
            stats["connections"] = {
                "active": manager.get_active_connection_count(),
                "connection_ids": len(manager.get_all_connection_ids()),
            }
    except Exception as e:
        stats["connections"] = {"error": str(e)}

    # Room stats
    try:
        room_manager = request.app.state.room_manager
        if room_manager:
            active_rooms = await room_manager.get_active_rooms()
            stats["rooms"] = {
                "active": len(active_rooms),
                "by_type": {},
            }
            for room in active_rooms:
                room_type = room.room_type.value
                if room_type not in stats["rooms"]["by_type"]:
                    stats["rooms"]["by_type"][room_type] = 0
                stats["rooms"]["by_type"][room_type] += 1
    except Exception as e:
        stats["rooms"] = {"error": str(e)}

    return stats
