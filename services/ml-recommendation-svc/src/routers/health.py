"""
Health check router.
"""

import aio_pika
from fastapi import APIRouter, Response
from redis import asyncio as aioredis

from src.config import get_settings

router = APIRouter()
settings = get_settings()


async def check_redis() -> tuple[bool, str]:
    """Check Redis connectivity."""
    try:
        client = aioredis.from_url(str(settings.redis_url), decode_responses=True)
        await client.ping()
        await client.close()
        return True, "connected"
    except Exception as e:
        return False, str(e)


async def check_rabbitmq() -> tuple[bool, str]:
    """Check RabbitMQ connectivity."""
    try:
        connection = await aio_pika.connect_robust(settings.rabbitmq_url)
        await connection.close()
        return True, "connected"
    except Exception as e:
        return False, str(e)


@router.get("/health")
async def health_check() -> dict[str, str]:
    """Basic health check endpoint."""
    return {"status": "healthy", "service": "ml-recommendation-svc"}


@router.get("/ready")
async def readiness_check(response: Response) -> dict:
    """Readiness check for Kubernetes."""
    # Check dependencies
    redis_ok, redis_msg = await check_redis()
    rabbitmq_ok, rabbitmq_msg = await check_rabbitmq()
    
    dependencies = {
        "redis": {"status": "healthy" if redis_ok else "unhealthy", "message": redis_msg},
        "rabbitmq": {"status": "healthy" if rabbitmq_ok else "unhealthy", "message": rabbitmq_msg},
    }
    
    all_healthy = redis_ok and rabbitmq_ok
    
    if not all_healthy:
        response.status_code = 503
    
    return {
        "status": "ready" if all_healthy else "not_ready",
        "dependencies": dependencies,
    }


@router.get("/live")
async def liveness_check(response: Response) -> dict[str, str]:
    """Liveness check for Kubernetes."""
    return {"status": "alive"}
