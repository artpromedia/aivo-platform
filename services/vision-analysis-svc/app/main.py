"""
Vision Analysis Service - FastAPI Application

Provides REST endpoints for computer vision analysis in educational contexts.
"""
import logging
from contextlib import asynccontextmanager
from typing import Any, Dict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router as vision_router, init_components, get_components
from app.core.config import get_settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Settings instance
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    logger.info("Initializing Vision Analysis Service...")

    # Initialize all model components
    try:
        init_components(settings)
        logger.info("Vision Analysis Service initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize components: {e}")
        # Continue anyway - components will be initialized lazily on first use

    yield

    logger.info("Shutting down Vision Analysis Service...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="""
AI-powered computer vision for educational content analysis.

## Features

- **Handwriting Recognition**: OCR for handwritten text using TrOCR and EasyOCR
- **Math Equation Detection**: Parse equations to LaTeX using pix2tex
- **Diagram Analysis**: Understand charts, graphs, flowcharts, and diagrams
- **Document Scanning**: Enhance and correct document photos
- **Multimodal Fusion**: Combine vision and text analysis for comprehensive understanding

## API Endpoints

### OCR
- `POST /api/v1/ocr/handwriting` - Recognize handwritten text from base64 image
- `POST /api/v1/ocr/handwriting/upload` - Recognize handwritten text from uploaded file

### Math Recognition
- `POST /api/v1/math/recognize` - Convert math equation image to LaTeX

### Diagram Analysis
- `POST /api/v1/diagram/analyze` - Analyze charts, graphs, and diagrams

### Document Scanning
- `POST /api/v1/document/scan` - Enhance and correct document photos

### Combined Analysis
- `POST /api/v1/analyze/homework` - Analyze homework images (OCR + math + diagrams)
    """,
    version=settings.VERSION,
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include vision API routes
app.include_router(vision_router, prefix="/api/v1")


# =============================================================================
# Health Endpoints
# =============================================================================

@app.get("/health")
async def health() -> Dict[str, Any]:
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": settings.SERVICE_NAME,
        "version": settings.VERSION,
    }


@app.get("/health/ready")
async def readiness() -> Dict[str, Any]:
    """Readiness check endpoint."""
    components = get_components()

    models_loaded = {
        "handwriting": components.get("handwriting_recognizer") is not None,
        "math_equation": components.get("math_detector") is not None,
        "diagram": components.get("diagram_analyzer") is not None,
        "document_scanner": components.get("document_scanner") is not None,
        "image_preprocessor": components.get("image_preprocessor") is not None,
        "multimodal_fusion": components.get("multimodal_fusion") is not None,
    }

    all_loaded = all(models_loaded.values())

    return {
        "status": "ready" if all_loaded else "partial",
        "models_loaded": models_loaded,
    }


@app.get("/health/live")
async def liveness() -> Dict[str, str]:
    """Liveness check endpoint."""
    return {"status": "alive"}


@app.get("/metrics")
async def metrics() -> Dict[str, Any]:
    """Basic metrics endpoint."""
    components = get_components()

    return {
        "service": settings.SERVICE_NAME,
        "version": settings.VERSION,
        "device": settings.DEVICE,
        "components_initialized": len([c for c in components.values() if c is not None]),
        "total_components": 6,
        "settings": {
            "trocr_model": settings.TROCR_MODEL,
            "latex_ocr_model": settings.LATEX_OCR_MODEL,
            "max_image_size": settings.MAX_IMAGE_SIZE,
            "confidence_threshold": settings.CONFIDENCE_THRESHOLD,
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=settings.HOST,
        port=settings.PORT,
        log_level=settings.LOG_LEVEL.lower(),
    )
