"""Tests for SSO dataclasses, enums, and data structures."""

import pytest
from datetime import datetime
from dataclasses import asdict

from sso_manager import (
    SSOProtocol,
    UserRole,
    SAMLConfig,
    OIDCConfig,
    ClaimsMapping,
    IdPConfig,
    SSOUser,
    SSOResult,
)


# ── Enum Tests ───────────────────────────────────────────────────────────────

class TestSSOProtocol:
    def test_saml_value(self):
        assert SSOProtocol.SAML.value == "saml"

    def test_oidc_value(self):
        assert SSOProtocol.OIDC.value == "oidc"

    def test_is_string_enum(self):
        assert isinstance(SSOProtocol.SAML, str)
        assert SSOProtocol.SAML == "saml"

    def test_invalid_protocol_raises(self):
        with pytest.raises(ValueError):
            SSOProtocol("ldap")

    def test_all_members(self):
        members = list(SSOProtocol)
        assert len(members) == 2


class TestUserRole:
    def test_all_roles_exist(self):
        expected = [
            "STUDENT", "LEARNER", "TEACHER", "PARENT",
            "THERAPIST", "DISTRICT_ADMIN", "PLATFORM_ADMIN",
        ]
        for role in expected:
            assert UserRole(role) is not None

    def test_role_values(self):
        assert UserRole.STUDENT.value == "STUDENT"
        assert UserRole.TEACHER.value == "TEACHER"
        assert UserRole.PLATFORM_ADMIN.value == "PLATFORM_ADMIN"

    def test_is_string_enum(self):
        assert isinstance(UserRole.TEACHER, str)
        assert UserRole.TEACHER == "TEACHER"

    def test_invalid_role_raises(self):
        with pytest.raises(ValueError):
            UserRole("SUPERADMIN")

    def test_member_count(self):
        assert len(list(UserRole)) == 7


# ── SAMLConfig Tests ─────────────────────────────────────────────────────────

class TestSAMLConfig:
    def test_minimal_creation(self):
        cfg = SAMLConfig(issuer="https://idp.example.com", sso_url="https://idp.example.com/sso")
        assert cfg.issuer == "https://idp.example.com"
        assert cfg.sso_url == "https://idp.example.com/sso"

    def test_defaults(self):
        cfg = SAMLConfig(issuer="test", sso_url="test")
        assert cfg.slo_url is None
        assert cfg.x509_certificate == ""
        assert cfg.metadata_xml is None
        assert cfg.name_id_format == "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
        assert cfg.sign_requests is False
        assert cfg.want_assertions_signed is True

    def test_full_creation(self):
        cfg = SAMLConfig(
            issuer="https://idp.example.com",
            sso_url="https://idp.example.com/sso",
            slo_url="https://idp.example.com/slo",
            x509_certificate="MIIC...",
            metadata_xml="<xml>...</xml>",
            sign_requests=True,
            want_assertions_signed=False,
        )
        assert cfg.slo_url == "https://idp.example.com/slo"
        assert cfg.sign_requests is True
        assert cfg.want_assertions_signed is False

    def test_serializable(self):
        cfg = SAMLConfig(issuer="test", sso_url="test")
        d = asdict(cfg)
        assert isinstance(d, dict)
        assert d["issuer"] == "test"


# ── OIDCConfig Tests ─────────────────────────────────────────────────────────

class TestOIDCConfig:
    def test_creation(self):
        cfg = OIDCConfig(
            issuer="https://accounts.google.com",
            client_id="abc",
            client_secret="secret",
            authorization_endpoint="https://accounts.google.com/o/oauth2/auth",
            token_endpoint="https://oauth2.googleapis.com/token",
        )
        assert cfg.issuer == "https://accounts.google.com"
        assert cfg.client_id == "abc"

    def test_defaults(self):
        cfg = OIDCConfig(
            issuer="x", client_id="y", client_secret="z",
            authorization_endpoint="a", token_endpoint="b",
        )
        assert cfg.userinfo_endpoint is None
        assert cfg.jwks_uri is None
        assert cfg.scopes == ["openid", "email", "profile"]

    def test_custom_scopes(self):
        cfg = OIDCConfig(
            issuer="x", client_id="y", client_secret="z",
            authorization_endpoint="a", token_endpoint="b",
            scopes=["openid", "groups"],
        )
        assert cfg.scopes == ["openid", "groups"]


# ── ClaimsMapping Tests ──────────────────────────────────────────────────────

class TestClaimsMapping:
    def test_defaults(self):
        cm = ClaimsMapping()
        assert cm.email_claim == "email"
        assert cm.name_claim == "name"
        assert cm.first_name_claim == "given_name"
        assert cm.last_name_claim == "family_name"
        assert cm.role_claim == "role"
        assert cm.groups_claim == "groups"

    def test_custom_claims(self):
        cm = ClaimsMapping(
            email_claim="mail",
            role_claim="memberOf",
        )
        assert cm.email_claim == "mail"
        assert cm.role_claim == "memberOf"


# ── IdPConfig Tests ──────────────────────────────────────────────────────────

class TestIdPConfig:
    def test_minimal_creation(self):
        cfg = IdPConfig(
            id="idp-1",
            district_id="district-001",
            protocol=SSOProtocol.SAML,
            name="Test IdP",
        )
        assert cfg.id == "idp-1"
        assert cfg.district_id == "district-001"
        assert cfg.protocol == SSOProtocol.SAML
        assert cfg.name == "Test IdP"

    def test_defaults(self):
        cfg = IdPConfig(id="x", district_id="y", protocol=SSOProtocol.SAML, name="z")
        assert cfg.enabled is False
        assert cfg.saml_config is None
        assert cfg.oidc_config is None
        assert isinstance(cfg.claims_mapping, ClaimsMapping)
        assert cfg.role_mapping == {}
        assert cfg.auto_provision_users is False
        assert cfg.default_role == UserRole.TEACHER
        assert UserRole.TEACHER in cfg.allowed_user_types
        assert cfg.created_at is None
        assert cfg.updated_at is None

    def test_with_saml_config(self):
        saml = SAMLConfig(issuer="test", sso_url="test")
        cfg = IdPConfig(
            id="x", district_id="y", protocol=SSOProtocol.SAML,
            name="z", saml_config=saml,
        )
        assert cfg.saml_config is not None
        assert cfg.saml_config.issuer == "test"


# ── SSOUser Tests ────────────────────────────────────────────────────────────

class TestSSOUser:
    def test_minimal_creation(self):
        user = SSOUser(external_id="ext-1", email="user@example.com")
        assert user.external_id == "ext-1"
        assert user.email == "user@example.com"

    def test_defaults(self):
        user = SSOUser(external_id="ext-1", email="user@example.com")
        assert user.first_name is None
        assert user.last_name is None
        assert user.name is None
        assert user.roles == []
        assert user.groups == []
        assert user.additional_claims == {}

    def test_full_creation(self):
        user = SSOUser(
            external_id="ext-1",
            email="user@example.com",
            first_name="Jane",
            last_name="Doe",
            name="Jane Doe",
            roles=[UserRole.TEACHER, UserRole.DISTRICT_ADMIN],
            groups=["staff", "admins"],
            additional_claims={"department": "Math"},
        )
        assert len(user.roles) == 2
        assert user.groups == ["staff", "admins"]


# ── SSOResult Tests ──────────────────────────────────────────────────────────

class TestSSOResult:
    def test_success_result(self):
        user = SSOUser(external_id="ext-1", email="user@example.com")
        result = SSOResult(success=True, user=user, session_index="idx-1")
        assert result.success is True
        assert result.user is not None
        assert result.error is None

    def test_failure_result(self):
        result = SSOResult(
            success=False,
            error="INVALID_SIGNATURE",
            message="Signature validation failed",
        )
        assert result.success is False
        assert result.user is None
        assert result.error == "INVALID_SIGNATURE"

    def test_defaults(self):
        result = SSOResult(success=True)
        assert result.user is None
        assert result.idp_config_id is None
        assert result.tenant_id is None
        assert result.session_index is None
        assert result.error is None
        assert result.message is None
