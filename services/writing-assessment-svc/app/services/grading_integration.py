"""
Grading Engine Integration Service

Integrates writing assessment with the grading engine service,
enhancing grading results with detailed writing analysis.
"""

import hashlib
import logging
from datetime import datetime
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


class GradingIntegrationService:
    """
    Service for integrating writing assessment with grading engine.

    Features:
    - Enhance grading results with writing analysis
    - Caching to avoid redundant analysis
    - Webhook support for grading events
    - Async notification to grading engine

    Usage:
        service = GradingIntegrationService(grading_engine_url)
        enhanced = await service.enhance_grading_response(grading_result, assessment)
    """

    def __init__(
        self,
        grading_engine_url: Optional[str] = None,
        redis_client: Optional[Any] = None,
        cache_ttl: int = 86400,  # 24 hours
    ):
        """
        Initialize the grading integration service.

        Args:
            grading_engine_url: URL of the grading engine service
            redis_client: Optional Redis client for caching
            cache_ttl: Cache time-to-live in seconds
        """
        self.grading_engine_url = grading_engine_url
        self.redis_client = redis_client
        self.cache_ttl = cache_ttl
        self._http_client = None
        logger.info("GradingIntegrationService initialized")

    async def _get_http_client(self):
        """Lazy load HTTP client."""
        if self._http_client is None:
            try:
                import httpx
                self._http_client = httpx.AsyncClient(timeout=30.0)
            except ImportError:
                logger.warning("httpx not installed, HTTP features disabled")
        return self._http_client

    def _compute_text_hash(self, text: str) -> str:
        """Compute SHA-256 hash of text for caching."""
        return hashlib.sha256(text.encode()).hexdigest()[:16]

    async def get_cached_assessment(self, text: str) -> Optional[Dict]:
        """
        Get cached assessment for text if available.

        Args:
            text: Text to look up

        Returns:
            Cached assessment or None
        """
        if not self.redis_client:
            return None

        try:
            text_hash = self._compute_text_hash(text)
            cache_key = f"assessment:{text_hash}"
            cached = await self.redis_client.get(cache_key)

            if cached:
                import json
                return json.loads(cached)
        except Exception as e:
            logger.warning(f"Cache lookup failed: {e}")

        return None

    async def cache_assessment(
        self,
        text: str,
        assessment: Dict,
    ) -> None:
        """
        Cache an assessment result.

        Args:
            text: Original text
            assessment: Assessment result to cache
        """
        if not self.redis_client:
            return

        try:
            import json
            text_hash = self._compute_text_hash(text)
            cache_key = f"assessment:{text_hash}"
            await self.redis_client.set(
                cache_key,
                json.dumps(assessment),
                ex=self.cache_ttl
            )
            logger.debug(f"Cached assessment: {cache_key}")
        except Exception as e:
            logger.warning(f"Cache write failed: {e}")

    async def enhance_grading_response(
        self,
        grading_result: Dict,
        writing_assessment: Dict,
    ) -> Dict:
        """
        Combine grading engine output with detailed writing analysis.

        Grading engine provides: score, basic feedback
        Writing assessment adds:
        - Detailed trait breakdown
        - Grammar specifics
        - Readability metrics
        - Coherence analysis
        - Actionable feedback

        Args:
            grading_result: Original grading engine result
            writing_assessment: Full writing assessment result

        Returns:
            Enhanced grading result with writing analysis
        """
        # Extract key metrics from writing assessment
        trait_breakdown = {}
        if "trait_scores" in writing_assessment and writing_assessment["trait_scores"]:
            traits = writing_assessment["trait_scores"].get("traits", {})
            for trait_name, trait_data in traits.items():
                if isinstance(trait_data, dict):
                    trait_breakdown[trait_name] = trait_data.get("score", 0)

        # Extract readability metrics
        readability_metrics = {}
        if "readability_profile" in writing_assessment:
            profile = writing_assessment["readability_profile"]
            if isinstance(profile, dict):
                readability_metrics = {
                    "flesch_kincaid_grade": profile.get("flesch_kincaid_grade", 0),
                    "flesch_reading_ease": profile.get("flesch_reading_ease", 0),
                    "average_grade_level": profile.get("average_grade_level", 0),
                }

        # Extract coherence score
        coherence_score = 0.0
        if "coherence_analysis" in writing_assessment:
            coherence = writing_assessment["coherence_analysis"]
            if isinstance(coherence, dict):
                coherence_score = coherence.get("overall_score", 0.0)

        # Extract grammar summary
        grammar_summary = {}
        if "grammar_report" in writing_assessment:
            grammar = writing_assessment["grammar_report"]
            if isinstance(grammar, dict):
                grammar_summary = {
                    "total_errors": grammar.get("total_errors", 0),
                    "error_density": grammar.get("error_density", 0),
                    "by_category": grammar.get("by_category", {}),
                }

        # Build enhanced result
        enhanced = {
            "submission_id": grading_result.get("submission_id", ""),
            "original_grade": grading_result,
            "writing_assessment": writing_assessment,
            "trait_breakdown": trait_breakdown,
            "readability_metrics": readability_metrics,
            "coherence_score": coherence_score,
            "grammar_summary": grammar_summary,
            "feedback": writing_assessment.get("feedback"),
            "enhancement_timestamp": datetime.utcnow().isoformat(),
        }

        return enhanced

    async def notify_grading_engine(
        self,
        submission_id: str,
        assessment: Dict,
    ) -> bool:
        """
        Notify grading engine of completed writing assessment.

        Args:
            submission_id: Submission identifier
            assessment: Completed assessment

        Returns:
            True if notification successful
        """
        if not self.grading_engine_url:
            logger.warning("Grading engine URL not configured")
            return False

        client = await self._get_http_client()
        if not client:
            return False

        try:
            url = f"{self.grading_engine_url}/api/v1/webhook/writing-assessment"
            payload = {
                "submission_id": submission_id,
                "assessment": assessment,
                "timestamp": datetime.utcnow().isoformat(),
            }

            response = await client.post(url, json=payload)
            response.raise_for_status()

            logger.info(f"Notified grading engine for submission: {submission_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to notify grading engine: {e}")
            return False

    async def handle_grading_complete_event(
        self,
        event: Dict,
        assess_func: Any,
    ) -> Dict:
        """
        Handle grading complete webhook event.

        Automatically enhances grading with writing analysis
        when grading engine completes scoring.

        Args:
            event: GradingCompleteEvent data
            assess_func: Function to perform assessment

        Returns:
            Enhanced grading result
        """
        submission_id = event.get("submission_id", "")
        submission_text = event.get("submission_text", "")
        grading_result = event.get("grading_result", {})

        if not submission_text:
            logger.error("No submission text in grading event")
            return {
                "error": "No submission text provided",
                "submission_id": submission_id,
            }

        # Check cache first
        cached = await self.get_cached_assessment(submission_text)
        if cached:
            logger.info(f"Using cached assessment for submission: {submission_id}")
            return await self.enhance_grading_response(grading_result, cached)

        # Perform new assessment
        try:
            assessment = await assess_func(submission_text)
            assessment_dict = (
                assessment.model_dump()
                if hasattr(assessment, "model_dump")
                else dict(assessment)
            )

            # Cache the result
            await self.cache_assessment(submission_text, assessment_dict)

            # Enhance and return
            enhanced = await self.enhance_grading_response(grading_result, assessment_dict)

            # Notify grading engine
            await self.notify_grading_engine(submission_id, assessment_dict)

            return enhanced

        except Exception as e:
            logger.error(f"Assessment failed for submission {submission_id}: {e}")
            return {
                "error": str(e),
                "submission_id": submission_id,
                "original_grade": grading_result,
            }

    async def get_or_compute_assessment(
        self,
        text: str,
        compute_func: Any,
    ) -> Dict:
        """
        Get assessment from cache or compute if not available.

        Args:
            text: Text to assess
            compute_func: Async function to compute assessment

        Returns:
            Assessment result (cached or fresh)
        """
        # Check cache
        cached = await self.get_cached_assessment(text)
        if cached:
            logger.debug("Returning cached assessment")
            return cached

        # Compute new assessment
        assessment = await compute_func(text)
        assessment_dict = (
            assessment.model_dump()
            if hasattr(assessment, "model_dump")
            else dict(assessment)
        )

        # Cache the result
        await self.cache_assessment(text, assessment_dict)

        return assessment_dict

    async def batch_enhance_grades(
        self,
        submissions: list[Dict],
        assess_func: Any,
    ) -> list[Dict]:
        """
        Enhance multiple grading results in batch.

        Args:
            submissions: List of {submission_id, text, grading_result}
            assess_func: Function to perform assessment

        Returns:
            List of enhanced grading results
        """
        results = []

        for submission in submissions:
            try:
                event = {
                    "submission_id": submission.get("submission_id", ""),
                    "submission_text": submission.get("text", ""),
                    "grading_result": submission.get("grading_result", {}),
                }
                enhanced = await self.handle_grading_complete_event(event, assess_func)
                results.append(enhanced)

            except Exception as e:
                logger.error(f"Batch enhancement failed: {e}")
                results.append({
                    "submission_id": submission.get("submission_id", ""),
                    "error": str(e),
                })

        return results

    async def close(self):
        """Close HTTP client and cleanup resources."""
        if self._http_client:
            await self._http_client.aclose()
            self._http_client = None


class CachingStrategy:
    """
    Caching strategy for writing assessments.

    Uses text hash as cache key and supports TTL-based expiration.
    """

    def __init__(
        self,
        redis_url: Optional[str] = None,
        cache_ttl: int = 86400,
        enable_cache: bool = True,
    ):
        """
        Initialize caching strategy.

        Args:
            redis_url: Redis connection URL
            cache_ttl: Cache TTL in seconds (default 24h)
            enable_cache: Whether caching is enabled
        """
        self.redis_url = redis_url
        self.cache_ttl = cache_ttl
        self.enable_cache = enable_cache
        self._redis_client = None
        self._connected = False

    async def connect(self) -> bool:
        """Connect to Redis."""
        if not self.enable_cache or not self.redis_url:
            return False

        try:
            import redis.asyncio as redis
            self._redis_client = redis.from_url(self.redis_url)
            await self._redis_client.ping()
            self._connected = True
            logger.info("Connected to Redis cache")
            return True
        except ImportError:
            logger.warning("redis package not installed, caching disabled")
            return False
        except Exception as e:
            logger.error(f"Redis connection failed: {e}")
            return False

    async def disconnect(self):
        """Disconnect from Redis."""
        if self._redis_client:
            await self._redis_client.close()
            self._redis_client = None
            self._connected = False

    def _compute_key(self, text: str, prefix: str = "assessment") -> str:
        """Compute cache key from text."""
        text_hash = hashlib.sha256(text.encode()).hexdigest()[:16]
        return f"{prefix}:{text_hash}"

    async def get(self, text: str, prefix: str = "assessment") -> Optional[Dict]:
        """
        Get cached value for text.

        Args:
            text: Original text
            prefix: Cache key prefix

        Returns:
            Cached value or None
        """
        if not self._connected:
            return None

        try:
            import json
            key = self._compute_key(text, prefix)
            value = await self._redis_client.get(key)

            if value:
                return json.loads(value)
        except Exception as e:
            logger.warning(f"Cache get failed: {e}")

        return None

    async def set(
        self,
        text: str,
        value: Dict,
        prefix: str = "assessment",
        ttl: Optional[int] = None,
    ) -> bool:
        """
        Set cached value for text.

        Args:
            text: Original text
            value: Value to cache
            prefix: Cache key prefix
            ttl: Optional TTL override

        Returns:
            True if successful
        """
        if not self._connected:
            return False

        try:
            import json
            key = self._compute_key(text, prefix)
            await self._redis_client.set(
                key,
                json.dumps(value),
                ex=ttl or self.cache_ttl
            )
            return True
        except Exception as e:
            logger.warning(f"Cache set failed: {e}")
            return False

    async def delete(self, text: str, prefix: str = "assessment") -> bool:
        """
        Delete cached value for text.

        Args:
            text: Original text
            prefix: Cache key prefix

        Returns:
            True if deleted
        """
        if not self._connected:
            return False

        try:
            key = self._compute_key(text, prefix)
            await self._redis_client.delete(key)
            return True
        except Exception as e:
            logger.warning(f"Cache delete failed: {e}")
            return False

    async def invalidate_pattern(self, pattern: str = "assessment:*") -> int:
        """
        Invalidate all keys matching pattern.

        Args:
            pattern: Key pattern to match

        Returns:
            Number of keys deleted
        """
        if not self._connected:
            return 0

        try:
            keys = []
            async for key in self._redis_client.scan_iter(pattern):
                keys.append(key)

            if keys:
                await self._redis_client.delete(*keys)

            logger.info(f"Invalidated {len(keys)} cache entries")
            return len(keys)
        except Exception as e:
            logger.error(f"Cache invalidation failed: {e}")
            return 0

    async def get_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics.

        Returns:
            Dictionary with cache stats
        """
        if not self._connected:
            return {"connected": False}

        try:
            info = await self._redis_client.info("memory")
            db_info = await self._redis_client.info("keyspace")

            return {
                "connected": True,
                "memory_used": info.get("used_memory_human", "unknown"),
                "keys": db_info,
            }
        except Exception as e:
            logger.error(f"Failed to get cache stats: {e}")
            return {"connected": True, "error": str(e)}
