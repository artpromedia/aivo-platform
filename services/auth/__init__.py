"""
Auth Service Module

SSO/SAML management for district integrations.
"""

from .sso_manager import (
    SSOManager,
    OIDCManager,
    SSOProtocol,
    UserRole,
    SAMLConfig,
    OIDCConfig,
    ClaimsMapping,
    IdPConfig,
    SSOUser,
    SSOResult,
)

__all__ = [
    'SSOManager',
    'OIDCManager',
    'SSOProtocol',
    'UserRole',
    'SAMLConfig',
    'OIDCConfig',
    'ClaimsMapping',
    'IdPConfig',
    'SSOUser',
    'SSOResult',
]
