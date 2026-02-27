"""Tests for SSOManager and OIDCManager service methods."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime

from sso_manager import SSOManager, OIDCManager, SSOUser, SSOResult, UserRole


# ── Supabase Mocking Helpers ────────────────────────────────────────────────

class FakeQueryBuilder:
    """Chainable mock for supabase query builder."""

    def __init__(self, data=None, error=None):
        self._data = data
        self._error = error

    def select(self, *args, **kwargs):
        return self

    def eq(self, *args, **kwargs):
        return self

    def single(self):
        return self

    def insert(self, data):
        return self

    def update(self, data):
        return self

    def upsert(self, data, **kwargs):
        return self

    async def execute(self):
        result = MagicMock()
        result.data = self._data
        result.error = self._error
        return result


class FakeSupabase:
    """Fake supabase client for testing."""

    def __init__(self, table_responses=None):
        self._table_responses = table_responses or {}

    def table(self, name):
        return self._table_responses.get(name, FakeQueryBuilder())


@pytest.fixture
def mock_supabase():
    return FakeSupabase()


@pytest.fixture
def manager(mock_supabase):
    return SSOManager(mock_supabase)


@pytest.fixture
def oidc_manager(mock_supabase):
    return OIDCManager(mock_supabase)


# ── SSOManager Tests ────────────────────────────────────────────────────────

class TestSSOManagerInit:
    def test_creates_manager(self, manager):
        assert manager is not None
        assert manager.SP_ENTITY_ID == "https://aivo.edu/saml/metadata"
        assert manager.SP_BASE_URL == "https://aivo.edu"
        assert manager.CLOCK_SKEW_SECONDS == 300

    def test_supabase_client_stored(self, mock_supabase):
        mgr = SSOManager(mock_supabase)
        assert mgr.supabase is mock_supabase


class TestConfigureSaml:
    @pytest.mark.asyncio
    async def test_validates_required_fields(self, manager):
        with pytest.raises(ValueError, match="Missing required field: issuer"):
            await manager.configure_saml("dist-1", {"sso_url": "x"})

    @pytest.mark.asyncio
    async def test_validates_certificate(self, manager):
        config = {
            'issuer': 'https://idp.example.com',
            'sso_url': 'https://idp.example.com/sso',
            'x509_certificate': 'invalid-cert-data',
        }
        with pytest.raises(ValueError, match="Invalid X.509 certificate"):
            await manager.configure_saml("dist-1", config)


class TestProcessSamlResponse:
    @pytest.mark.asyncio
    async def test_no_config_returns_error(self):
        supabase = FakeSupabase({
            'district_sso_configs': FakeQueryBuilder(data=None),
        })
        mgr = SSOManager(supabase)
        result = await mgr.process_saml_response("dist-1", "base64data")
        assert result.success is False
        assert result.error == "CONFIG_NOT_FOUND"


class TestGetDistrictSSOConfig:
    @pytest.mark.asyncio
    async def test_returns_config_when_exists(self):
        config_data = [{'id': 'sso-1', 'protocol': 'saml', 'enabled': True}]
        supabase = FakeSupabase({
            'district_sso_configs': FakeQueryBuilder(data=config_data),
        })
        mgr = SSOManager(supabase)
        result = await mgr.get_district_sso_config("dist-1")
        assert result is not None
        assert result['id'] == 'sso-1'

    @pytest.mark.asyncio
    async def test_returns_none_when_no_config(self):
        supabase = FakeSupabase({
            'district_sso_configs': FakeQueryBuilder(data=[]),
        })
        mgr = SSOManager(supabase)
        result = await mgr.get_district_sso_config("dist-1")
        assert result is None


class TestTestSSOConnection:
    @pytest.mark.asyncio
    async def test_no_config_returns_failure(self):
        supabase = FakeSupabase({
            'district_sso_configs': FakeQueryBuilder(data=[]),
        })
        mgr = SSOManager(supabase)
        result = await mgr.test_sso_connection("dist-1")
        assert result['success'] is False
        assert result['diagnostics']['config_found'] is False

    @pytest.mark.asyncio
    async def test_valid_config_passes_checks(self):
        import base64

        raw = bytes([0x30, 0x82, 0x01, 0x00]) + b'\x00' * 256
        valid_cert = base64.b64encode(raw).decode()

        config_data = [{
            'protocol': 'saml',
            'enabled': True,
            'config': {
                'x509_certificate': valid_cert,
                'sso_url': 'https://idp.example.com/sso',
                'issuer': 'https://idp.example.com',
            }
        }]
        supabase = FakeSupabase({
            'district_sso_configs': FakeQueryBuilder(data=config_data),
        })
        mgr = SSOManager(supabase)
        result = await mgr.test_sso_connection("dist-1")
        assert result['success'] is True
        assert result['diagnostics']['certificate_valid'] is True
        assert result['diagnostics']['sso_url_configured'] is True
        assert result['diagnostics']['issuer_configured'] is True


# ── OIDCManager Tests ───────────────────────────────────────────────────────

class TestOIDCManagerConfigureOIDC:
    @pytest.mark.asyncio
    async def test_validates_required_fields(self, oidc_manager):
        with pytest.raises(ValueError, match="Missing required field: issuer"):
            await oidc_manager.configure_oidc("dist-1", {"client_id": "x"})

    @pytest.mark.asyncio
    async def test_validates_client_secret(self, oidc_manager):
        with pytest.raises(ValueError, match="Missing required field: client_secret"):
            await oidc_manager.configure_oidc("dist-1", {
                "issuer": "x", "client_id": "y",
            })


class TestOIDCManagerGenerateAuthUrl:
    @pytest.mark.asyncio
    async def test_no_config_raises(self):
        supabase = FakeSupabase({
            'district_sso_configs': FakeQueryBuilder(data=None),
        })
        mgr = OIDCManager(supabase)
        with pytest.raises(ValueError, match="OIDC not configured"):
            await mgr.generate_auth_url("dist-1", "https://app/callback", "state-1", "nonce-1")

    @pytest.mark.asyncio
    async def test_generates_url(self):
        config_data = {
            'config': {
                'client_id': 'test-client',
                'authorization_endpoint': 'https://idp.example.com/authorize',
                'scopes': ['openid', 'email', 'profile'],
            }
        }
        supabase = FakeSupabase({
            'district_sso_configs': FakeQueryBuilder(data=config_data),
        })
        mgr = OIDCManager(supabase)
        url = await mgr.generate_auth_url("dist-1", "https://app/callback", "state-1", "nonce-1")
        assert url.startswith("https://idp.example.com/authorize?")
        assert "client_id=test-client" in url
        assert "state=state-1" in url
        assert "nonce=nonce-1" in url
        assert "response_type=code" in url
