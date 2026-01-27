"""
Curriculum Routes for API Gateway.

Proxy endpoints for curriculum service.
"""

from fastapi import APIRouter, HTTPException, Request
import httpx

from app.core.config import settings

router = APIRouter()


@router.get("/curricula")
async def list_curricula(request: Request):
    """Proxy to list curricula."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{settings.CURRICULUM_URL}/api/v1/curricula",
                params=dict(request.query_params),
            )
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Curriculum service timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/curricula/{curriculum_id}")
async def get_curriculum(curriculum_id: str):
    """Proxy to get a curriculum."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{settings.CURRICULUM_URL}/api/v1/curricula/{curriculum_id}"
            )
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Curriculum service timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/curricula")
async def create_curriculum(request: Request):
    """Proxy to create a curriculum."""
    try:
        body = await request.json()
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{settings.CURRICULUM_URL}/api/v1/curricula",
                json=body,
            )
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Curriculum service timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/curricula/{curriculum_id}")
async def update_curriculum(curriculum_id: str, request: Request):
    """Proxy to update a curriculum."""
    try:
        body = await request.json()
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.put(
                f"{settings.CURRICULUM_URL}/api/v1/curricula/{curriculum_id}",
                json=body,
            )
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Curriculum service timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/curricula/{curriculum_id}")
async def delete_curriculum(curriculum_id: str):
    """Proxy to delete a curriculum."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.delete(
                f"{settings.CURRICULUM_URL}/api/v1/curricula/{curriculum_id}"
            )
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Curriculum service timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/units/{unit_id}/lessons")
async def list_lessons(unit_id: str, request: Request):
    """Proxy to list lessons in a unit."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{settings.CURRICULUM_URL}/api/v1/units/{unit_id}/lessons",
                params=dict(request.query_params),
            )
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Curriculum service timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/lessons/{lesson_id}")
async def get_lesson(lesson_id: str):
    """Proxy to get a lesson."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{settings.CURRICULUM_URL}/api/v1/lessons/{lesson_id}"
            )
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Curriculum service timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pacing-guides")
async def list_pacing_guides(request: Request):
    """Proxy to list pacing guides."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{settings.CURRICULUM_URL}/api/v1/pacing-guides",
                params=dict(request.query_params),
            )
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Curriculum service timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def curriculum_health():
    """Health check for curriculum service."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{settings.CURRICULUM_URL}/health")
            return response.json()
    except Exception as e:
        return {"status": "unavailable", "error": str(e)}
