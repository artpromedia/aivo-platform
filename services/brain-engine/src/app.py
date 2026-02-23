"""
Brain Engine FastAPI Application

Main application setup and configuration for the brain engine service.
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import structlog

from src.config.settings import get_settings
from src.routes.brain_routes import router as brain_router
from src.routes.explain import router as explain_router
from src.lib.supabase_client import check_connection

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan handler for startup/shutdown."""
    settings = get_settings()

    logger.info(
        "brain_engine_starting",
        service=settings.service_name,
        version=settings.service_version,
        environment=settings.environment,
    )

    # Verify database connection on startup
    if settings.supabase_url:
        db_healthy = await check_connection()
        if db_healthy:
            logger.info("database_connection_healthy")
        else:
            logger.warning("database_connection_unhealthy")

    yield

    logger.info("brain_engine_shutting_down")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="Brain Engine Service",
        description="Personalized AI Brain Engine for AIVO learner platform. "
                    "Manages learning patterns, mastery tracking, and personalized recommendations.",
        version=settings.service_version,
        lifespan=lifespan,
        docs_url="/docs" if settings.debug else None,
        redoc_url="/redoc" if settings.debug else None,
    )

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"] if settings.debug else [
            "https://*.aivo.com",
            "https://*.vercel.app",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Global exception handler
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.error(
            "unhandled_exception",
            path=request.url.path,
            method=request.method,
            error=str(exc),
        )
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )

    # Health check endpoint
    @app.get("/health", tags=["health"])
    async def health_check() -> dict:
        """Health check endpoint."""
        return {
            "status": "healthy",
            "service": settings.service_name,
            "version": settings.service_version,
        }

    # Readiness check endpoint
    @app.get("/ready", tags=["health"])
    async def readiness_check() -> dict:
        """Readiness check with dependency verification."""
        db_healthy = await check_connection() if settings.supabase_url else True

        status = "ready" if db_healthy else "not_ready"

        return {
            "status": status,
            "service": settings.service_name,
            "checks": {
                "database": "healthy" if db_healthy else "unhealthy",
            },
        }

    # Register routes
    app.include_router(brain_router, prefix="/api/v1")
    app.include_router(explain_router, prefix="/api/v1")

    return app


# Application instance
app = create_app()
