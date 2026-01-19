"""
Curriculum Python Service - Main Application
Part of AIVO Platform Migration - Educational Standards & Brain Training Data
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Application lifespan manager."""
    print(f"Starting {settings.PROJECT_NAME} {settings.VERSION}")
    yield
    print("Shutting down Curriculum Service")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Educational Standards & Brain Training Data Management",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "running",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
    }


# Standards endpoints
@app.get("/api/v1/standards")
async def list_standards(
    domain: str | None = None,
    grade_band: str | None = None,
    limit: int = 50,
    offset: int = 0,
):
    """List educational standards."""
    # TODO: Implement database query
    return {
        "items": [],
        "total": 0,
        "limit": limit,
        "offset": offset,
    }


@app.get("/api/v1/standards/{standard_id}")
async def get_standard(standard_id: str):
    """Get a specific standard."""
    # TODO: Implement database query
    return {"id": standard_id, "name": "Placeholder", "domain": "math"}


# District endpoints
@app.get("/api/v1/districts")
async def list_districts():
    """List districts."""
    # TODO: Implement database query
    return {"items": [], "total": 0}


@app.get("/api/v1/districts/{district_id}/curriculum")
async def get_district_curriculum(district_id: str):
    """Get district curriculum."""
    # TODO: Implement database query
    return {"district_id": district_id, "curriculum": []}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
