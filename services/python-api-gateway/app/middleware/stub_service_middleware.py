"""
Stub Service Middleware for AIVO API Gateway

This middleware intercepts requests to stub services and returns graceful
HTTP 503 "Service Unavailable" responses with "coming soon" messages instead
of allowing HTTP 501 errors to propagate.

Usage:
    from app.middleware.stub_service_middleware import StubServiceMiddleware
    
    app.add_middleware(StubServiceMiddleware)
"""

import logging
import time
from typing import Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.stub_services import (
    StubService,
    STUB_SERVICE_CONFIGS,
    is_stub_service_enabled,
    get_stub_service_by_path,
)

logger = logging.getLogger(__name__)

# Metrics counters (for monitoring)
_stub_service_requests = {}
_501_intercepts = {}


class StubServiceMiddleware(BaseHTTPMiddleware):
    """
    Middleware to handle requests to stub services gracefully.
    
    When a request is made to a disabled stub service:
    1. Returns HTTP 503 (Service Unavailable) instead of 501
    2. Provides a user-friendly "coming soon" message
    3. Logs the request for monitoring
    4. Includes retry-after header
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self._log_startup_status()
    
    def _log_startup_status(self):
        """Log stub service status on startup."""
        logger.info("=" * 60)
        logger.info("STUB SERVICE FEATURE FLAGS STATUS")
        logger.info("=" * 60)
        
        for service, config in STUB_SERVICE_CONFIGS.items():
            enabled = is_stub_service_enabled(service)
            status = "✅ ENABLED" if enabled else "🚫 DISABLED (returning 503)"
            logger.info(f"  {config.display_name}: {status}")
        
        logger.info("=" * 60)
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process the request, intercepting stub service calls."""
        path = request.url.path
        
        # Check if this request is for a stub service
        stub_config = get_stub_service_by_path(path)
        
        if stub_config is not None:
            service = stub_config.service_id
            
            # Track request metrics
            _stub_service_requests[service.value] = _stub_service_requests.get(service.value, 0) + 1
            
            # Check if service is enabled
            if not is_stub_service_enabled(service):
                logger.warning(
                    f"🚫 Stub service request blocked: {stub_config.display_name} "
                    f"(path: {path}, method: {request.method})"
                )
                
                return JSONResponse(
                    status_code=503,
                    content={
                        "error": "SERVICE_NOT_AVAILABLE",
                        "error_code": "FEATURE_COMING_SOON",
                        "message": stub_config.fallback_message,
                        "service": stub_config.display_name,
                        "expected_availability": stub_config.expected_date,
                        "documentation": "https://docs.aivo.ai/features/coming-soon",
                        "support": "support@aivo.ai",
                    },
                    headers={
                        "Retry-After": "86400",  # 1 day
                        "X-Feature-Status": "coming-soon",
                        "X-Service-Name": stub_config.service_id.value,
                    },
                )
        
        # Call the next middleware/handler
        response = await call_next(request)
        
        # Monitor for 501 responses that slip through
        if response.status_code == 501:
            _501_intercepts[path] = _501_intercepts.get(path, 0) + 1
            logger.error(
                f"⚠️ HTTP 501 DETECTED: {path} - This indicates an unhandled stub service! "
                f"Consider adding to STUB_SERVICE_CONFIGS."
            )
        
        return response


def get_stub_service_metrics() -> dict:
    """Get metrics for stub service requests and 501 intercepts."""
    return {
        "stub_service_requests": dict(_stub_service_requests),
        "unhandled_501_responses": dict(_501_intercepts),
        "timestamp": time.time(),
    }


def reset_stub_service_metrics():
    """Reset metrics (useful for testing)."""
    global _stub_service_requests, _501_intercepts
    _stub_service_requests = {}
    _501_intercepts = {}


# FastAPI router for stub service status endpoint
from fastapi import APIRouter

stub_router = APIRouter(prefix="/stub-services", tags=["Stub Services"])


@stub_router.get("/status")
async def get_stub_services_status():
    """Get the status of all stub services."""
    from app.core.stub_services import get_all_stub_services_status
    
    return {
        "stub_services": get_all_stub_services_status(),
        "metrics": get_stub_service_metrics(),
        "documentation": "https://docs.aivo.ai/features/coming-soon",
    }


@stub_router.get("/health")
async def stub_services_health():
    """
    Health check endpoint for stub services.
    Returns healthy even when services are disabled (by design).
    """
    return {
        "status": "healthy",
        "message": "Stub service middleware is operational",
        "disabled_services_count": sum(
            1 for service in StubService if not is_stub_service_enabled(service)
        ),
        "enabled_services_count": sum(
            1 for service in StubService if is_stub_service_enabled(service)
        ),
    }
