"""
CurriculumIntegrationService Unit Tests

Tests for curriculum detection, district lookup, standard fetching,
and brain alignment. All HTTP calls are mocked.
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.services.curriculum_integration import (
    COMMON_CORE_STATES,
    CurriculumIntegrationService,
    STATE_STANDARDS_MAP,
)


# ─── Helpers ─────────────────────────────────────────────────────────


def _mock_settings(**overrides):
    """Return a fake settings object."""
    s = MagicMock()
    s.curriculum_service_url = overrides.get("curriculum_service_url", "http://curriculum:8000")
    return s


def _make_http_response(status_code=200, json_data=None):
    """Build a mock httpx.Response."""
    resp = MagicMock()
    resp.status_code = status_code
    resp.json.return_value = json_data or {}
    return resp


def _make_brain_state():
    """Build a minimal BrainState-like object."""
    alignment = MagicMock()
    alignment.state_code = None
    alignment.zip_code = None
    alignment.curriculum_standards = []
    alignment.last_synced = None
    alignment.district_name = None
    alignment.nces_district_id = None

    brain = MagicMock()
    brain.curriculum_alignment = alignment
    brain.knowledge_nodes = {}
    brain.mastery_levels = {}
    brain.knowledge_edges = []
    brain.grade_level = 3
    return brain


# ═══════════════════════════════════════════════════════════════════════
# Fixture: patch get_settings so CurriculumIntegrationService can init
# ═══════════════════════════════════════════════════════════════════════


@pytest.fixture
def service():
    with patch("src.services.curriculum_integration.get_settings", return_value=_mock_settings()):
        svc = CurriculumIntegrationService()
        yield svc


@pytest.fixture
def mock_client():
    """AsyncMock for httpx.AsyncClient."""
    return AsyncMock()


# ═══════════════════════════════════════════════════════════════════════
# STATE_STANDARDS_MAP / COMMON_CORE_STATES constants
# ═══════════════════════════════════════════════════════════════════════


class TestConstants:
    def test_texas_has_teks(self):
        assert "TEKS" in STATE_STANDARDS_MAP["TX"]

    def test_virginia_has_sol(self):
        assert "SOL" in STATE_STANDARDS_MAP["VA"]

    def test_florida_has_best(self):
        assert "B.E.S.T" in STATE_STANDARDS_MAP["FL"]

    def test_default_has_common_core(self):
        standards = STATE_STANDARDS_MAP["DEFAULT"]
        assert "COMMON_CORE" in standards
        assert "NGSS" in standards
        assert "C3" in standards

    def test_common_core_states_count(self):
        assert len(COMMON_CORE_STATES) == 43

    def test_california_is_common_core(self):
        assert "CA" in COMMON_CORE_STATES

    def test_texas_not_common_core(self):
        assert "TX" not in COMMON_CORE_STATES


# ═══════════════════════════════════════════════════════════════════════
# detect_curriculum_standards
# ═══════════════════════════════════════════════════════════════════════


class TestDetectCurriculumStandards:
    def test_no_state_returns_default(self, service):
        result = service.detect_curriculum_standards()
        assert result == STATE_STANDARDS_MAP["DEFAULT"]

    def test_none_state_returns_default(self, service):
        result = service.detect_curriculum_standards(state_code=None)
        assert result == STATE_STANDARDS_MAP["DEFAULT"]

    def test_texas(self, service):
        result = service.detect_curriculum_standards(state_code="TX")
        assert result == ["TEKS"]

    def test_case_insensitive(self, service):
        result = service.detect_curriculum_standards(state_code="tx")
        assert result == ["TEKS"]

    def test_common_core_state(self, service):
        result = service.detect_curriculum_standards(state_code="CA")
        assert result == ["COMMON_CORE", "NGSS", "C3"]

    def test_unknown_state_returns_default(self, service):
        result = service.detect_curriculum_standards(state_code="ZZ")
        assert result == STATE_STANDARDS_MAP["DEFAULT"]

    def test_state_specific_virginia(self, service):
        result = service.detect_curriculum_standards(state_code="VA")
        assert "SOL" in result
        assert "STATE_SPECIFIC" in result


# ═══════════════════════════════════════════════════════════════════════
# _create_fallback_response
# ═══════════════════════════════════════════════════════════════════════


class TestCreateFallbackResponse:
    def test_fallback_structure(self, service):
        result = service._create_fallback_response("d-123", "Test District", "TX")
        assert result["district_id"] == "d-123"
        assert result["district_name"] == "Test District"
        assert result["state_code"] == "TX"
        assert result["curriculum"] == []
        assert "TEKS" in result["standards"]

    def test_fallback_with_none_state(self, service):
        result = service._create_fallback_response(None, None, None)
        assert result["standards"] == STATE_STANDARDS_MAP["DEFAULT"]
        assert result["curriculum"] == []


# ═══════════════════════════════════════════════════════════════════════
# lookup_district_curriculum
# ═══════════════════════════════════════════════════════════════════════


class TestLookupDistrictCurriculum:
    @pytest.mark.asyncio
    async def test_lookup_by_district_id(self, service, mock_client):
        mock_client.get.return_value = _make_http_response(200, {
            "state": "TX",
            "curriculum": [{"id": "c1", "name": "TEKS Math"}],
        })
        service.get_http_client = MagicMock(return_value=mock_client)

        result = await service.lookup_district_curriculum(district_id="d-42", district_name="Austin ISD")
        assert result["district_id"] == "d-42"
        assert result["district_name"] == "Austin ISD"
        assert len(result["curriculum"]) == 1
        assert "TEKS" in result["standards"]

    @pytest.mark.asyncio
    async def test_lookup_by_zip(self, service, mock_client):
        # First call: list districts by zip
        # Second call: get curriculum for matched district
        mock_client.get = AsyncMock(side_effect=[
            _make_http_response(200, {
                "items": [{"id": "d-99", "name": "Springfield ISD", "state": "IL"}]
            }),
            _make_http_response(200, {
                "curriculum": [{"id": "c1"}],
            }),
        ])
        service.get_http_client = MagicMock(return_value=mock_client)

        result = await service.lookup_district_curriculum(zip_code="62701")
        assert result["district_id"] == "d-99"
        assert result["district_name"] == "Springfield ISD"

    @pytest.mark.asyncio
    async def test_fallback_on_error(self, service, mock_client):
        mock_client.get.side_effect = Exception("network error")
        service.get_http_client = MagicMock(return_value=mock_client)

        result = await service.lookup_district_curriculum(
            zip_code="00000", state_code="TX"
        )
        # Should return fallback
        assert result["curriculum"] == []
        assert "TEKS" in result["standards"]

    @pytest.mark.asyncio
    async def test_fallback_when_no_ids(self, service):
        result = await service.lookup_district_curriculum(state_code="FL")
        assert result["curriculum"] == []
        assert "B.E.S.T" in result["standards"]


# ═══════════════════════════════════════════════════════════════════════
# fetch_standards
# ═══════════════════════════════════════════════════════════════════════


class TestFetchStandards:
    @pytest.mark.asyncio
    async def test_fetches_per_framework(self, service, mock_client):
        mock_client.get = AsyncMock(side_effect=[
            _make_http_response(200, {"items": [{"id": "s1", "code": "TEKS.M.1"}]}),
            _make_http_response(200, {"items": [{"id": "s2", "code": "NGSS.PS.1"}]}),
        ])
        service.get_http_client = MagicMock(return_value=mock_client)

        result = await service.fetch_standards(["TEKS", "NGSS"])
        assert len(result) == 2
        assert result[0]["code"] == "TEKS.M.1"
        assert result[1]["code"] == "NGSS.PS.1"

    @pytest.mark.asyncio
    async def test_passes_filters(self, service, mock_client):
        mock_client.get = AsyncMock(return_value=_make_http_response(200, {"items": []}))
        service.get_http_client = MagicMock(return_value=mock_client)

        await service.fetch_standards(["COMMON_CORE"], grade_band="K_2", domain="MATH")
        call_kwargs = mock_client.get.call_args
        params = call_kwargs.kwargs.get("params") or call_kwargs[1].get("params", {})
        assert params["grade_band"] == "K_2"
        assert params["domain"] == "MATH"

    @pytest.mark.asyncio
    async def test_returns_empty_on_failure(self, service, mock_client):
        mock_client.get.side_effect = Exception("timeout")
        service.get_http_client = MagicMock(return_value=mock_client)

        result = await service.fetch_standards(["TEKS"])
        assert result == []

    @pytest.mark.asyncio
    async def test_skips_non_200(self, service, mock_client):
        mock_client.get = AsyncMock(return_value=_make_http_response(500, {}))
        service.get_http_client = MagicMock(return_value=mock_client)

        result = await service.fetch_standards(["TEKS"])
        assert result == []


# ═══════════════════════════════════════════════════════════════════════
# align_brain_with_curriculum
# ═══════════════════════════════════════════════════════════════════════


class TestAlignBrainWithCurriculum:
    @pytest.mark.asyncio
    async def test_sets_curriculum_alignment(self, service, mock_client):
        mock_client.get = AsyncMock(return_value=_make_http_response(200, {"items": []}))
        service.get_http_client = MagicMock(return_value=mock_client)

        brain = _make_brain_state()
        result = await service.align_brain_with_curriculum(
            brain, state_code="TX",
            curriculum_standards=["TEKS"],
        )
        assert result.curriculum_alignment.state_code == "TX"
        assert result.curriculum_alignment.curriculum_standards == ["TEKS"]

    @pytest.mark.asyncio
    async def test_detects_curriculum_when_not_provided(self, service, mock_client):
        mock_client.get = AsyncMock(return_value=_make_http_response(200, {"items": []}))
        service.get_http_client = MagicMock(return_value=mock_client)

        brain = _make_brain_state()
        result = await service.align_brain_with_curriculum(brain, state_code="CA")
        assert result.curriculum_alignment.curriculum_standards == ["COMMON_CORE", "NGSS", "C3"]

    @pytest.mark.asyncio
    async def test_updates_last_synced(self, service, mock_client):
        mock_client.get = AsyncMock(return_value=_make_http_response(200, {"items": []}))
        service.get_http_client = MagicMock(return_value=mock_client)

        brain = _make_brain_state()
        await service.align_brain_with_curriculum(
            brain, state_code="TX", curriculum_standards=["TEKS"]
        )
        assert brain.curriculum_alignment.last_synced is not None
