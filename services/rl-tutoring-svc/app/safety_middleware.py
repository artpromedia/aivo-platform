"""
AIVO Content Safety Middleware for FastAPI services.

Starlette middleware that intercepts JSON responses on AI-generation routes,
running critical pattern checks (PII, crisis keywords, profanity) before
responses reach students. Designed for drop-in use across Python AI services.
"""

import hashlib
import json
import logging
import re
import time
from typing import Any, Dict, List, Optional, Set

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

logger = logging.getLogger("aivo.safety")

# ── Pattern Lists (mirror ai-orchestrator content-safety.service) ───────────

PII_PATTERNS = [
    ("ssn", re.compile(r"\b\d{3}-\d{2}-\d{4}\b")),
    ("credit_card", re.compile(r"\b(?:\d[ \-]*?){13,19}\b")),
    ("phone", re.compile(r"\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b")),
    ("email", re.compile(r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Z|a-z]{2,}\b")),
]

CRISIS_KEYWORDS: List[str] = [
    "suicide", "kill myself", "want to die", "self-harm", "cut myself",
    "end my life", "not worth living", "overdose", "hang myself",
    "jump off", "no reason to live", "better off dead", "hurting myself",
]

_CRISIS_RE = re.compile(
    "|".join(re.escape(k) for k in CRISIS_KEYWORDS),
    re.IGNORECASE,
)

PROFANITY_TERMS: List[str] = [
    "fuck", "shit", "ass", "bitch", "damn", "crap", "bastard", "dick",
    "cock", "pussy", "nigger", "nigga", "faggot", "retard", "slut", "whore",
]

_PROFANITY_RE = re.compile(
    r"\b(?:" + "|".join(re.escape(t) for t in PROFANITY_TERMS) + r")\b",
    re.IGNORECASE,
)

# ── Content field extraction ────────────────────────────────────────────────

_CONTENT_KEYS: Set[str] = {
    "content", "response", "answer", "text", "explanation",
    "hint", "feedback", "generated_text", "passage", "question",
    "questions", "assessment", "result", "output",
}


def _extract_text_fields(obj: Any, depth: int = 0) -> List[str]:
    """Recursively extract string fields from a JSON-like structure."""
    if depth > 4:
        return []
    texts: List[str] = []
    if isinstance(obj, str) and len(obj) > 10:
        texts.append(obj)
    elif isinstance(obj, dict):
        for key, val in obj.items():
            if isinstance(val, str) and len(val) > 10:
                texts.append(val)
            elif isinstance(val, (dict, list)):
                texts.extend(_extract_text_fields(val, depth + 1))
    elif isinstance(obj, list):
        for item in obj:
            texts.extend(_extract_text_fields(item, depth + 1))
    return texts


# ── Safety Check ────────────────────────────────────────────────────────────

class SafetyCheckResult:
    __slots__ = ("safe", "blocked", "reason", "sanitized")

    def __init__(
        self,
        safe: bool = True,
        blocked: bool = False,
        reason: Optional[str] = None,
        sanitized: Optional[str] = None,
    ):
        self.safe = safe
        self.blocked = blocked
        self.reason = reason
        self.sanitized = sanitized


def check_text(text: str) -> SafetyCheckResult:
    """Run critical safety checks on a single text string."""
    # 1. PII
    for name, pat in PII_PATTERNS:
        if pat.search(text):
            critical = name in ("ssn", "credit_card")
            return SafetyCheckResult(
                safe=False,
                blocked=critical,
                reason=f"PII detected: {name}",
                sanitized=None if critical else pat.sub("[REDACTED]", text),
            )

    # 2. Crisis / self-harm
    if _CRISIS_RE.search(text):
        return SafetyCheckResult(
            safe=False,
            blocked=True,
            reason="Crisis / self-harm content detected",
        )

    # 3. Profanity
    if _PROFANITY_RE.search(text):
        return SafetyCheckResult(
            safe=False,
            blocked=False,
            reason="Profanity detected",
            sanitized=_PROFANITY_RE.sub("[REMOVED]", text),
        )

    return SafetyCheckResult(safe=True)


# ── FastAPI / Starlette Middleware ──────────────────────────────────────────

# Routes whose responses should be safety-checked
_DEFAULT_INTERCEPT_PREFIXES = (
    "/api/v1/generate",
    "/api/v1/assess",
    "/api/v1/feedback",
    "/api/v1/bloom",
    "/api/v1/difficulty",
    "/api/v1/curriculum",
    "/api/v1/session",
    "/api/v1/recommend",
    "/api/v1/action",
)


class ContentSafetyMiddleware(BaseHTTPMiddleware):
    """
    Starlette middleware that intercepts outgoing JSON responses on AI routes,
    running PII / crisis / profanity checks before content reaches students.
    """

    def __init__(
        self,
        app: Any,
        intercept_prefixes: tuple = _DEFAULT_INTERCEPT_PREFIXES,
        enabled: bool = True,
    ):
        super().__init__(app)
        self.intercept_prefixes = intercept_prefixes
        self.enabled = enabled

    async def dispatch(self, request: Request, call_next) -> Response:
        if not self.enabled:
            return await call_next(request)

        # Skip health / metrics / docs endpoints
        path = request.url.path
        if not any(path.startswith(p) for p in self.intercept_prefixes):
            return await call_next(request)

        response = await call_next(request)

        # Only intercept successful JSON responses
        ct = response.headers.get("content-type", "")
        if "application/json" not in ct or response.status_code >= 400:
            return response

        # Read the response body
        body_bytes = b""
        async for chunk in response.body_iterator:  # type: ignore[attr-defined]
            if isinstance(chunk, str):
                body_bytes += chunk.encode("utf-8")
            else:
                body_bytes += chunk

        start = time.monotonic()

        try:
            body = json.loads(body_bytes)
        except (json.JSONDecodeError, UnicodeDecodeError):
            return Response(
                content=body_bytes,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.media_type,
            )

        texts = _extract_text_fields(body)
        worst_result = SafetyCheckResult(safe=True)
        blocked = False
        modified = False

        for text in texts:
            result = check_text(text)
            if result.blocked:
                blocked = True
                worst_result = result
                break
            if not result.safe:
                worst_result = result
                if result.sanitized:
                    # Replace the text in the body
                    body_bytes_str = body_bytes.decode("utf-8")
                    body_bytes_str = body_bytes_str.replace(text, result.sanitized)
                    body_bytes = body_bytes_str.encode("utf-8")
                    modified = True

        processing_ms = round((time.monotonic() - start) * 1000)

        headers = dict(response.headers)
        headers["X-Safety-Processing-Ms"] = str(processing_ms)

        if blocked:
            logger.warning(
                "Safety: blocked response on %s — %s",
                path,
                worst_result.reason,
            )
            return JSONResponse(
                status_code=200,
                content={
                    "blocked": True,
                    "message": (
                        "This response was blocked by our content safety system. "
                        "If you need help, please reach out to a trusted adult or "
                        "contact the Crisis Text Line by texting HOME to 741741."
                    ),
                    "support_contact": "support@aivo.ai",
                },
                headers={"X-Safety-Blocked": "true", "X-Safety-Processing-Ms": str(processing_ms)},
            )

        if modified:
            logger.info(
                "Safety: sanitized response on %s — %s",
                path,
                worst_result.reason,
            )
            # Re-parse to ensure valid JSON
            try:
                body = json.loads(body_bytes)
            except Exception:
                pass

        return Response(
            content=body_bytes if modified else body_bytes,
            status_code=response.status_code,
            headers=headers,
            media_type=response.media_type,
        )
