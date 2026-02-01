"""
Stub Service Feature Flags for AIVO Platform

This module manages feature flags for Python AI/ML services that are not yet
fully implemented. Services flagged as stubs will return HTTP 503 with a
graceful "coming soon" message instead of HTTP 501 errors.

Environment Variables:
    FEATURE_RL_TUTORING: Enable RL tutoring service (default: false)
    FEATURE_PEER_LEARNING: Enable peer learning service (default: false)
    FEATURE_MULTIMODAL_ANALYTICS: Enable multimodal analytics (default: false)
    FEATURE_GAMIFICATION_PYTHON: Enable Python gamification (default: false)
    FEATURE_CONTENT_INTELLIGENCE: Enable content intelligence (default: false)
    FEATURE_COGNITIVE_LOAD: Enable cognitive load service (default: false)
    FEATURE_ACCESSIBILITY_AI: Enable accessibility AI (default: false)
    FEATURE_SPECIALIZED_SUPPORT: Enable specialized support (default: false)

@see STUB_SERVICES.md for full documentation
"""

import os
import logging
from dataclasses import dataclass
from enum import Enum
from typing import Dict, Optional
from functools import lru_cache

logger = logging.getLogger(__name__)


class StubService(str, Enum):
    """Stub Python AI/ML services that return 501 and should be feature-flagged."""
    
    RL_TUTORING = "rl-tutoring-svc"
    PEER_LEARNING = "peer-learning-svc"
    MULTIMODAL_ANALYTICS = "multimodal-analytics-svc"
    GAMIFICATION_PYTHON = "gamification-svc"
    CONTENT_INTELLIGENCE = "content-intelligence-svc"
    COGNITIVE_LOAD = "cognitive-load-svc"
    ACCESSIBILITY_AI = "accessibility-ai-svc"
    SPECIALIZED_SUPPORT = "specialized-support-svc"


@dataclass
class StubServiceConfig:
    """Configuration for a stub service."""
    
    service_id: StubService
    env_var: str
    service_url: str
    display_name: str
    expected_date: str
    fallback_message: str
    api_prefix: str
    enabled: bool = False


# Stub service configurations
STUB_SERVICE_CONFIGS: Dict[StubService, StubServiceConfig] = {
    StubService.RL_TUTORING: StubServiceConfig(
        service_id=StubService.RL_TUTORING,
        env_var="FEATURE_RL_TUTORING",
        service_url="http://rl-tutoring-svc:8000",
        display_name="Reinforcement Learning Tutoring",
        expected_date="2026-Q2",
        fallback_message="AI-powered personalized tutoring is coming soon. Standard tutoring is available.",
        api_prefix="/api/v1/rl-tutoring",
    ),
    StubService.PEER_LEARNING: StubServiceConfig(
        service_id=StubService.PEER_LEARNING,
        env_var="FEATURE_PEER_LEARNING",
        service_url="http://peer-learning-svc:8000",
        display_name="Peer Learning & Collaboration",
        expected_date="2026-Q2",
        fallback_message="AI-matched peer learning groups coming soon. Manual group creation is available.",
        api_prefix="/api/v1/peer-learning",
    ),
    StubService.MULTIMODAL_ANALYTICS: StubServiceConfig(
        service_id=StubService.MULTIMODAL_ANALYTICS,
        env_var="FEATURE_MULTIMODAL_ANALYTICS",
        service_url="http://multimodal-analytics-svc:8000",
        display_name="Multimodal Learning Analytics",
        expected_date="2026-Q3",
        fallback_message="Advanced cross-modal analytics coming soon. Standard analytics are available.",
        api_prefix="/api/v1/multimodal",
    ),
    StubService.GAMIFICATION_PYTHON: StubServiceConfig(
        service_id=StubService.GAMIFICATION_PYTHON,
        env_var="FEATURE_GAMIFICATION_PYTHON",
        service_url="http://gamification-svc:8000",
        display_name="AI Gamification Optimization",
        expected_date="2026-Q1",
        fallback_message="AI-optimized rewards coming soon. Standard gamification is active.",
        api_prefix="/api/v1/gamification/ai",
    ),
    StubService.CONTENT_INTELLIGENCE: StubServiceConfig(
        service_id=StubService.CONTENT_INTELLIGENCE,
        env_var="FEATURE_CONTENT_INTELLIGENCE",
        service_url="http://content-intelligence-svc:8000",
        display_name="Content Intelligence",
        expected_date="2026-Q1",
        fallback_message="AI content analysis coming soon. Manual tagging is available.",
        api_prefix="/api/v1/content-intelligence",
    ),
    StubService.COGNITIVE_LOAD: StubServiceConfig(
        service_id=StubService.COGNITIVE_LOAD,
        env_var="FEATURE_COGNITIVE_LOAD",
        service_url="http://cognitive-load-svc:8000",
        display_name="Cognitive Load Assessment",
        expected_date="2026-Q2",
        fallback_message="Cognitive load optimization coming soon. Standard pacing is available.",
        api_prefix="/api/v1/cognitive-load",
    ),
    StubService.ACCESSIBILITY_AI: StubServiceConfig(
        service_id=StubService.ACCESSIBILITY_AI,
        env_var="FEATURE_ACCESSIBILITY_AI",
        service_url="http://accessibility-ai-svc:8000",
        display_name="AI Accessibility Adaptations",
        expected_date="2026-Q2",
        fallback_message="AI accessibility features coming soon. Manual accommodations are available.",
        api_prefix="/api/v1/accessibility-ai",
    ),
    StubService.SPECIALIZED_SUPPORT: StubServiceConfig(
        service_id=StubService.SPECIALIZED_SUPPORT,
        env_var="FEATURE_SPECIALIZED_SUPPORT",
        service_url="http://specialized-support-svc:8000",
        display_name="Specialized Learning Support",
        expected_date="2026-Q2",
        fallback_message="AI specialized support coming soon. Standard accommodations are available.",
        api_prefix="/api/v1/specialized-support",
    ),
}


@lru_cache(maxsize=1)
def _load_feature_flags() -> Dict[StubService, bool]:
    """Load feature flags from environment variables (cached)."""
    flags = {}
    for service, config in STUB_SERVICE_CONFIGS.items():
        env_value = os.environ.get(config.env_var, "false").lower()
        flags[service] = env_value in ("true", "1", "yes", "enabled")
        
        if flags[service]:
            logger.info(f"✅ Stub service ENABLED: {config.display_name}")
        else:
            logger.info(f"🚫 Stub service DISABLED: {config.display_name}")
    
    return flags


def is_stub_service_enabled(service: StubService) -> bool:
    """Check if a stub service is enabled via feature flag."""
    flags = _load_feature_flags()
    return flags.get(service, False)


def get_stub_service_config(service: StubService) -> Optional[StubServiceConfig]:
    """Get configuration for a stub service."""
    return STUB_SERVICE_CONFIGS.get(service)


def get_all_stub_services_status() -> Dict[str, Dict]:
    """Get status of all stub services."""
    flags = _load_feature_flags()
    
    return {
        service.value: {
            "enabled": flags.get(service, False),
            "display_name": config.display_name,
            "expected_date": config.expected_date,
            "api_prefix": config.api_prefix,
            "fallback_message": config.fallback_message,
        }
        for service, config in STUB_SERVICE_CONFIGS.items()
    }


def get_stub_service_by_path(path: str) -> Optional[StubServiceConfig]:
    """Find stub service config by API path prefix."""
    for config in STUB_SERVICE_CONFIGS.values():
        if path.startswith(config.api_prefix):
            return config
    return None


def clear_feature_flag_cache():
    """Clear the cached feature flags (useful for testing)."""
    _load_feature_flags.cache_clear()


# Export for easy access
__all__ = [
    "StubService",
    "StubServiceConfig",
    "STUB_SERVICE_CONFIGS",
    "is_stub_service_enabled",
    "get_stub_service_config",
    "get_all_stub_services_status",
    "get_stub_service_by_path",
    "clear_feature_flag_cache",
]
