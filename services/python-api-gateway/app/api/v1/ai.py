"""
AI Routes for API Gateway.

Proxy endpoints for AI inference service.
"""

from fastapi import APIRouter, HTTPException, Request
import httpx

from app.core.config import settings

router = APIRouter()


@router.post("/inference")
async def ai_inference(request: Request):
    """Proxy to AI engine for inference."""
    try:
        body = await request.json()
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{settings.AI_INFERENCE_URL}/api/v1/generate/generate",
                json=body,
            )
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI service timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/hint")
async def ai_hint(request: Request):
    """Proxy to AI engine for hints."""
    try:
        body = await request.json()
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{settings.AI_INFERENCE_URL}/api/v1/generate/hint",
                json=body,
            )
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI service timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/explanation")
async def ai_explanation(request: Request):
    """Proxy to AI engine for explanations."""
    try:
        body = await request.json()
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{settings.AI_INFERENCE_URL}/api/v1/generate/explanation",
                json=body,
            )
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI service timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/feedback")
async def ai_feedback(request: Request):
    """Proxy to AI engine for feedback generation."""
    try:
        body = await request.json()
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{settings.AI_INFERENCE_URL}/api/v1/generate/feedback",
                json=body,
            )
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI service timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/adapt/content")
async def adapt_content(request: Request):
    """Proxy to AI engine for content adaptation."""
    try:
        body = await request.json()
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{settings.AI_INFERENCE_URL}/api/v1/adapt/content",
                json=body,
            )
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI service timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/adapt/personalize")
async def personalize_content(request: Request):
    """Proxy to AI engine for content personalization."""
    try:
        body = await request.json()
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{settings.AI_INFERENCE_URL}/api/v1/adapt/personalize",
                json=body,
            )
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI service timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/brain/mastery/predict")
async def predict_mastery(request: Request):
    """Proxy to AI engine for mastery prediction."""
    try:
        body = await request.json()
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{settings.AI_INFERENCE_URL}/api/v1/brain/mastery/predict",
                json=body,
            )
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI service timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/brain/knowledge/update")
async def update_knowledge(request: Request):
    """Proxy to AI engine for knowledge state update."""
    try:
        body = await request.json()
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{settings.AI_INFERENCE_URL}/api/v1/brain/knowledge/update",
                json=body,
            )
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI service timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def ai_health():
    """Health check for AI service."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{settings.AI_INFERENCE_URL}/health")
            return response.json()
    except Exception as e:
        return {"status": "unavailable", "error": str(e)}
