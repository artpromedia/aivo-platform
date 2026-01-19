"""
AI Inference Service - Main Application
Part of AIVO Platform Migration from aivo-agentic-ai-learning-app
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Application lifespan manager."""
    # Startup
    print(f"Starting {settings.PROJECT_NAME} {settings.VERSION}")
    yield
    # Shutdown
    print("Shutting down AI Inference Service")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="AI Inference Service for AIVO Learning Platform",
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


# Include routers - will be added during migration
# from app.api.v1 import generate, brain, adapt
# app.include_router(generate.router, prefix=f"{settings.API_V1_STR}/generate")
# app.include_router(brain.router, prefix=f"{settings.API_V1_STR}/brain")
# app.include_router(adapt.router, prefix=f"{settings.API_V1_STR}/adapt")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "running",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
