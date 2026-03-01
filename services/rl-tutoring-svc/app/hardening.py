"""
Production Hardening Middleware (S11.4)

Provides:
- Per-student rate limiting  (10 req / student / min default)
- Circuit breaker for downstream calls  (latency / error-rate trip)
- A/B test assignment  (RL policy vs rule-based)
- Prometheus metrics export  (request latency, buffer size, reward dist)
"""

import asyncio
import hashlib
import logging
import os
import time
from collections import defaultdict
from typing import Any, Callable, Dict, Optional

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

logger = logging.getLogger(__name__)

# ── Configuration ────────────────────────────────────────────────────────

RATE_LIMIT_PER_MIN = int(os.getenv("RL_RATE_LIMIT_PER_MIN", "10"))
CIRCUIT_BREAKER_LATENCY_MS = int(os.getenv("RL_CB_LATENCY_MS", "500"))
CIRCUIT_BREAKER_ERROR_THRESHOLD = int(os.getenv("RL_CB_ERROR_THRESHOLD", "5"))
CIRCUIT_BREAKER_RESET_SECONDS = int(os.getenv("RL_CB_RESET_SECONDS", "30"))
AB_TEST_RL_PERCENTAGE = int(os.getenv("RL_AB_TEST_PERCENTAGE", "50"))


# ── Rate Limiter ─────────────────────────────────────────────────────────

class _TokenBucket:
    """Simple per-key token-bucket rate limiter (in-memory)."""

    def __init__(self, rate_per_min: int = RATE_LIMIT_PER_MIN):
        self._rate = rate_per_min
        self._buckets: Dict[str, list] = defaultdict(lambda: [rate_per_min, time.monotonic()])

    def allow(self, key: str) -> bool:
        tokens, last = self._buckets[key]
        now = time.monotonic()
        elapsed = now - last
        refill = elapsed * (self._rate / 60.0)
        tokens = min(self._rate, tokens + refill)
        self._buckets[key] = [tokens, now]
        if tokens >= 1:
            self._buckets[key][0] = tokens - 1
            return True
        return False


_rate_limiter = _TokenBucket()


# ── Circuit Breaker ──────────────────────────────────────────────────────

class CircuitBreaker:
    """Lightweight circuit breaker for outbound calls.

    States: CLOSED (normal) → OPEN (tripped) → HALF_OPEN (probe).
    """

    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

    def __init__(
        self,
        name: str = "rl-tutoring",
        error_threshold: int = CIRCUIT_BREAKER_ERROR_THRESHOLD,
        reset_seconds: float = CIRCUIT_BREAKER_RESET_SECONDS,
        latency_threshold_ms: float = CIRCUIT_BREAKER_LATENCY_MS,
    ):
        self.name = name
        self._error_threshold = error_threshold
        self._reset_seconds = reset_seconds
        self._latency_threshold_ms = latency_threshold_ms

        self._state = self.CLOSED
        self._error_count = 0
        self._last_failure_time = 0.0
        self._success_count = 0

    @property
    def state(self) -> str:
        if self._state == self.OPEN:
            if time.monotonic() - self._last_failure_time >= self._reset_seconds:
                self._state = self.HALF_OPEN
        return self._state

    def allow_request(self) -> bool:
        s = self.state
        if s == self.CLOSED:
            return True
        if s == self.HALF_OPEN:
            return True
        return False  # OPEN

    def record_success(self, latency_ms: float = 0) -> None:
        if latency_ms > self._latency_threshold_ms:
            self.record_failure()
            return
        self._error_count = 0
        self._success_count += 1
        if self._state == self.HALF_OPEN:
            self._state = self.CLOSED
            logger.info("Circuit breaker '%s' closed (recovered)", self.name)

    def record_failure(self) -> None:
        self._error_count += 1
        self._last_failure_time = time.monotonic()
        if self._error_count >= self._error_threshold and self._state != self.OPEN:
            self._state = self.OPEN
            logger.warning(
                "Circuit breaker '%s' OPEN after %d errors", self.name, self._error_count
            )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "state": self.state,
            "error_count": self._error_count,
            "success_count": self._success_count,
        }


# Global circuit breaker instance for rl-tutoring-svc outbound calls
rl_circuit_breaker = CircuitBreaker(name="rl-tutoring")


# ── A/B Test Assignment ──────────────────────────────────────────────────

def assign_ab_group(learner_id: str, percentage: int = AB_TEST_RL_PERCENTAGE) -> str:
    """Deterministically assign learner to 'rl' or 'rule-based' group.

    Uses a hash so the same learner always gets the same group.
    """
    h = int(hashlib.sha256(learner_id.encode()).hexdigest(), 16)
    return "rl" if (h % 100) < percentage else "rule-based"


# ── Prometheus Metrics ───────────────────────────────────────────────────

try:
    from prometheus_client import Counter, Gauge, Histogram, generate_latest

    REQUEST_LATENCY = Histogram(
        "rl_tutoring_request_duration_seconds",
        "Request latency in seconds",
        ["method", "endpoint", "status"],
        buckets=(0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5),
    )
    BUFFER_SIZE = Gauge(
        "rl_tutoring_buffer_size",
        "Current experience buffer size",
    )
    POLICY_TRAINING_STEPS = Gauge(
        "rl_tutoring_policy_training_steps",
        "Total policy training steps",
    )
    REWARD_TOTAL = Histogram(
        "rl_tutoring_reward_total",
        "Distribution of total rewards recorded",
        buckets=(-1.0, -0.5, -0.2, 0.0, 0.2, 0.5, 0.8, 1.0),
    )
    RATE_LIMIT_REJECTED = Counter(
        "rl_tutoring_rate_limit_rejected_total",
        "Number of requests rejected by rate limiter",
    )
    CIRCUIT_BREAKER_STATE = Gauge(
        "rl_tutoring_circuit_breaker_open",
        "1 if circuit breaker is open, 0 otherwise",
    )
    _PROM_AVAILABLE = True
except ImportError:
    _PROM_AVAILABLE = False
    logger.info("prometheus_client not installed — metrics disabled")


def update_gauge_metrics(buffer_size: int, training_steps: int) -> None:
    """Call periodically to push gauge values into Prometheus."""
    if not _PROM_AVAILABLE:
        return
    BUFFER_SIZE.set(buffer_size)
    POLICY_TRAINING_STEPS.set(training_steps)
    CIRCUIT_BREAKER_STATE.set(1 if rl_circuit_breaker.state == CircuitBreaker.OPEN else 0)


def observe_reward(total: float) -> None:
    if _PROM_AVAILABLE:
        REWARD_TOTAL.observe(total)


# ── FastAPI Middleware ────────────────────────────────────────────────────

class ProductionHardeningMiddleware(BaseHTTPMiddleware):
    """Applies rate limiting and records Prometheus latency metrics."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Extract student/learner id from path for rate limiting
        path = request.url.path
        student_key = "global"
        parts = path.split("/")
        for i, p in enumerate(parts):
            if p in ("students", "learners") and i + 1 < len(parts):
                student_key = parts[i + 1]
                break

        # Rate limit on mutation endpoints only
        if request.method in ("POST", "PUT", "PATCH") and student_key != "global":
            if not _rate_limiter.allow(student_key):
                if _PROM_AVAILABLE:
                    RATE_LIMIT_REJECTED.inc()
                return Response(
                    content='{"detail":"Rate limit exceeded"}',
                    status_code=429,
                    media_type="application/json",
                )

        start = time.monotonic()
        response = await call_next(request)
        elapsed = time.monotonic() - start

        if _PROM_AVAILABLE:
            REQUEST_LATENCY.labels(
                method=request.method,
                endpoint=path,
                status=str(response.status_code),
            ).observe(elapsed)

        return response


# ── Prometheus /metrics endpoint helper ──────────────────────────────────

def get_metrics_response() -> Response:
    """Return a Prometheus-compatible metrics page."""
    if not _PROM_AVAILABLE:
        return Response(content="prometheus_client not installed", status_code=501)
    body = generate_latest()
    return Response(content=body, media_type="text/plain; version=0.0.4; charset=utf-8")
