"""
AIVO Platform – Shared Python Auth Module

RS256 JWT verification for FastAPI services.
Mirrors the TypeScript @aivo/ts-rbac library pattern:
  - RS256 asymmetric JWT verification via public key
  - Internal service-to-service auth via x-api-key header
  - Tenant isolation via tenant_id claim
  - Role-based access control

Usage:
    from aivo_py_common.auth import get_current_user, require_role, AuthContext, Role

    @app.get("/protected")
    async def protected_route(user: AuthContext = Depends(get_current_user)):
        return {"user_id": user.user_id, "tenant_id": user.tenant_id}

    @app.get("/admin-only")
    async def admin_route(user: AuthContext = Depends(require_role(Role.PLATFORM_ADMIN))):
        return {"admin": user.user_id}
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from enum import StrEnum
from functools import lru_cache
from typing import Annotated

from cryptography.hazmat.primitives.serialization import load_pem_public_key
from fastapi import Depends, HTTPException, Request, status
from jose import JWTError, jwt


# ── Roles ────────────────────────────────────────────────────────────────────

class Role(StrEnum):
    """Mirrors @aivo/ts-rbac Role enum."""
    PLATFORM_ADMIN = "PLATFORM_ADMIN"
    DISTRICT_ADMIN = "DISTRICT_ADMIN"
    SCHOOL_ADMIN = "SCHOOL_ADMIN"
    TEACHER = "TEACHER"
    PARENT = "PARENT"
    STUDENT = "STUDENT"
    SYSTEM = "SYSTEM"


# ── Auth Context ─────────────────────────────────────────────────────────────

@dataclass(frozen=True, slots=True)
class AuthContext:
    """Decoded JWT claims – attached to every authenticated request."""
    user_id: str
    tenant_id: str
    roles: list[str] = field(default_factory=list)


# ── Configuration ────────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def _get_public_key_pem() -> str:
    """Read JWT_PUBLIC_KEY from environment (PEM-encoded RS256 public key)."""
    key = os.environ.get("JWT_PUBLIC_KEY", "")
    if not key:
        raise RuntimeError(
            "JWT_PUBLIC_KEY environment variable is not set. "
            "Set it to the PEM-encoded RS256 public key from auth-svc."
        )
    return key


@lru_cache(maxsize=1)
def _get_internal_api_key() -> str | None:
    """Read optional INTERNAL_API_KEY for service-to-service calls."""
    return os.environ.get("INTERNAL_API_KEY")


# ── Token Extraction ─────────────────────────────────────────────────────────

def _extract_bearer_token(request: Request) -> str | None:
    """Extract JWT from Authorization: Bearer <token> header."""
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:]
    return None


def _verify_jwt(token: str) -> AuthContext:
    """Verify an RS256 JWT and return the decoded AuthContext."""
    public_key_pem = _get_public_key_pem()

    try:
        payload = jwt.decode(
            token,
            public_key_pem,
            algorithms=["RS256"],
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {exc}",
        ) from exc

    sub = payload.get("sub")
    tenant_id = payload.get("tenant_id")
    if not isinstance(sub, str) or not isinstance(tenant_id, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing required claims (sub, tenant_id)",
        )

    roles = payload.get("roles", [])
    if not isinstance(roles, list):
        roles = []
    roles = [r for r in roles if isinstance(r, str)]

    return AuthContext(user_id=sub, tenant_id=tenant_id, roles=roles)


# ── FastAPI Dependencies ─────────────────────────────────────────────────────

async def get_current_user(request: Request) -> AuthContext:
    """
    FastAPI dependency – extracts and verifies auth from incoming request.

    Supports:
      1. Bearer JWT (RS256)
      2. Internal API key (x-api-key header)
      3. Test bypass (x-test-user header, non-production only)
    """
    # 1. Check internal API key
    api_key = request.headers.get("x-api-key")
    internal_key = _get_internal_api_key()
    if api_key and internal_key and api_key == internal_key:
        tenant_id = request.headers.get("x-tenant-id", "internal")
        return AuthContext(
            user_id="internal-service",
            tenant_id=tenant_id,
            roles=[Role.SYSTEM],
        )

    # 2. Check test bypass (non-production only)
    env = os.environ.get("NODE_ENV", os.environ.get("ENVIRONMENT", "development"))
    if env != "production":
        test_user = request.headers.get("x-test-user")
        if test_user:
            return AuthContext(
                user_id=test_user,
                tenant_id=request.headers.get("x-tenant-id", "test-tenant"),
                roles=request.headers.get("x-test-roles", "TEACHER").split(","),
            )

    # 3. Standard JWT verification
    token = _extract_bearer_token(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
        )

    return _verify_jwt(token)


def require_role(*required_roles: Role | str):
    """
    FastAPI dependency factory – requires at least one of the specified roles.

    Usage:
        @app.get("/admin")
        async def admin(user: AuthContext = Depends(require_role(Role.PLATFORM_ADMIN))):
            ...
    """
    async def _dependency(
        user: Annotated[AuthContext, Depends(get_current_user)],
    ) -> AuthContext:
        user_roles = set(user.roles)
        allowed = {str(r) for r in required_roles}
        if not user_roles & allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return user

    return _dependency


def has_role(user: AuthContext, *roles: Role | str) -> bool:
    """Check if user has at least one of the specified roles."""
    user_roles = set(user.roles)
    return bool(user_roles & {str(r) for r in roles})
