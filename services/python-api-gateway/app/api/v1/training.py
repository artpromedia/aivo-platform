"""
Training Routes for API Gateway.

Proxy endpoints for training service.
"""

from fastapi import APIRouter, HTTPException, Request
import httpx

from app.core.config import settings

router = APIRouter()


@router.post("/jobs")
async def create_training_job(request: Request):
    """Proxy to training service for job creation."""
    try:
        body = await request.json()
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{settings.TRAINING_URL}/api/v1/training/jobs",
                json=body,
            )
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Training service timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/jobs/{job_id}")
async def get_training_job(job_id: str):
    """Proxy to get training job status."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{settings.TRAINING_URL}/api/v1/training/jobs/{job_id}"
            )
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Training service timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bkt/update")
async def update_bkt(request: Request):
    """Proxy to update BKT model with learning interaction."""
    try:
        body = await request.json()
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{settings.TRAINING_URL}/api/v1/training/bkt/update",
                json=body,
            )
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Training service timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/bkt/mastery/{learner_id}/{skill_id}")
async def get_bkt_mastery(learner_id: str, skill_id: str):
    """Proxy to get BKT mastery probability."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{settings.TRAINING_URL}/api/v1/training/bkt/mastery/{learner_id}/{skill_id}"
            )
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Training service timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/brain/clone")
async def clone_brain(request: Request):
    """Proxy to clone base brain for a learner."""
    try:
        body = await request.json()
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{settings.TRAINING_URL}/api/v1/training/brain/clone",
                json=body,
            )
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Training service timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/brain/fine-tune")
async def fine_tune_brain(request: Request):
    """Proxy to fine-tune learner's brain model."""
    try:
        body = await request.json()
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{settings.TRAINING_URL}/api/v1/training/brain/fine-tune",
                json=body,
            )
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Training service timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/brain/predict-mastery")
async def predict_mastery(request: Request):
    """Proxy to predict mastery using neural network."""
    try:
        body = await request.json()
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{settings.TRAINING_URL}/api/v1/training/brain/predict-mastery",
                json=body,
            )
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Training service timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def training_health():
    """Health check for training service."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{settings.TRAINING_URL}/health")
            return response.json()
    except Exception as e:
        return {"status": "unavailable", "error": str(e)}
