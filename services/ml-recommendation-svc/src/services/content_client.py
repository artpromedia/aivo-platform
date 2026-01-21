"""
Content Service Client - HTTP client for content service integration.
"""

from typing import Any
import httpx
import structlog

from src.config import Settings

logger = structlog.get_logger()


class ContentServiceClient:
    """
    HTTP client for fetching content/activities from the content service.
    """

    def __init__(self, settings: Settings) -> None:
        self.base_url = getattr(settings, 'content_service_url', 'http://localhost:4010')
        self.timeout = httpx.Timeout(30.0, connect=10.0)

    async def get_activities(
        self,
        domain: str | None = None,
        skill_ids: list[str] | None = None,
        difficulty_min: float | None = None,
        difficulty_max: float | None = None,
        limit: int = 100,
        exclude_ids: set[str] | None = None,
    ) -> list[dict[str, Any]]:
        """
        Fetch available activities from the content service.
        
        Args:
            domain: Filter by domain (MATH, ELA, SCIENCE, etc.)
            skill_ids: Filter by skill IDs
            difficulty_min: Minimum difficulty level (0-1)
            difficulty_max: Maximum difficulty level (0-1)
            limit: Maximum number of results
            exclude_ids: Set of IDs to exclude from results
        
        Returns:
            List of activity dictionaries
        """
        exclude_ids = exclude_ids or set()
        
        params: dict[str, Any] = {"limit": limit}
        if domain:
            params["domain"] = domain
        if skill_ids:
            params["skill_ids"] = ",".join(skill_ids)
        if difficulty_min is not None:
            params["difficulty_min"] = difficulty_min
        if difficulty_max is not None:
            params["difficulty_max"] = difficulty_max

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.base_url}/api/v1/activities",
                    params=params,
                )
                response.raise_for_status()
                data = response.json()
                
                # Filter out excluded IDs
                activities = data.get("items", data) if isinstance(data, dict) else data
                return [a for a in activities if a.get("id") not in exclude_ids]
                
        except httpx.HTTPStatusError as e:
            logger.error(
                "Content service HTTP error",
                status_code=e.response.status_code,
                url=str(e.request.url),
            )
            return []
        except httpx.RequestError as e:
            logger.warning(
                "Content service request error, returning empty results",
                error=str(e),
            )
            return []

    async def get_activity_by_id(self, activity_id: str) -> dict[str, Any] | None:
        """Fetch a single activity by ID."""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.base_url}/api/v1/activities/{activity_id}"
                )
                if response.status_code == 404:
                    return None
                response.raise_for_status()
                return response.json()
        except (httpx.HTTPStatusError, httpx.RequestError) as e:
            logger.warning("Failed to fetch activity", activity_id=activity_id, error=str(e))
            return None

    async def get_activities_by_skills(
        self,
        skill_ids: list[str],
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        """Fetch activities related to specific skills."""
        return await self.get_activities(skill_ids=skill_ids, limit=limit)
