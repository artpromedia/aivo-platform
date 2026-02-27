"""
Curriculum API Endpoint Tests

Tests for the FastAPI endpoints defined in app/main.py.
Covers: root, health, list_standards, get_standard, list_districts,
        get_district_curriculum (including 404 cases and query filters).
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient


# ═══════════════════════════════════════════════════════════════════════
# Mock models before importing app
# ═══════════════════════════════════════════════════════════════════════


class FakeStandard:
    """Minimal Standard model stub."""

    def __init__(self, id: str, domain: str = "MATH", grade_band: str = "K_2", **kwargs):
        self.id = id
        self.domain = domain
        self.grade_band = grade_band
        self.code = kwargs.get("code", f"STD-{id}")
        self.description = kwargs.get("description", f"Standard {id}")

    def to_dict(self):
        return {
            "id": self.id,
            "domain": self.domain,
            "grade_band": self.grade_band,
            "code": self.code,
            "description": self.description,
        }


class FakeDistrict:
    """Minimal District model stub."""

    def __init__(self, id: str, name: str = "Test District", **kwargs):
        self.id = id
        self.name = name
        self.state = kwargs.get("state", "TX")

    def to_dict(self):
        return {"id": self.id, "name": self.name, "state": self.state}


class FakeCurriculum:
    """Minimal DistrictCurriculum model stub."""

    def __init__(self, id: str, district_id: str, sequence: int = 1, active: bool = True):
        self.id = id
        self.district_id = district_id
        self.sequence = sequence
        self.active = active

    def to_dict(self):
        return {
            "id": self.id,
            "district_id": self.district_id,
            "sequence": self.sequence,
            "active": self.active,
        }


# ═══════════════════════════════════════════════════════════════════════
# Helpers to mock SQLAlchemy async session
# ═══════════════════════════════════════════════════════════════════════


def _make_scalars_result(items):
    """Create a mock result whose .scalars().all() returns items."""
    scalars_mock = MagicMock()
    scalars_mock.all.return_value = items
    result = MagicMock()
    result.scalars.return_value = scalars_mock
    return result


def _make_scalar_result(value):
    """Create a mock result whose .scalar_one_or_none() returns value."""
    result = MagicMock()
    result.scalar_one_or_none.return_value = value
    return result


def _make_count_result(count: int):
    """Create a mock result whose .scalar() returns count."""
    result = MagicMock()
    result.scalar.return_value = count
    return result


# ═══════════════════════════════════════════════════════════════════════
# Fixtures
# ═══════════════════════════════════════════════════════════════════════


@pytest.fixture
def mock_db():
    """Async mock for the database session."""
    db = AsyncMock()
    return db


@pytest.fixture
def client(mock_db):
    """FastAPI TestClient with the database dependency overridden."""
    from app.core.database import get_db
    from app.main import app

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ═══════════════════════════════════════════════════════════════════════
# Root / Health
# ═══════════════════════════════════════════════════════════════════════


class TestRootAndHealth:
    def test_root_returns_service_info(self, client):
        resp = client.get("/")
        assert resp.status_code == 200
        body = resp.json()
        assert "service" in body
        assert "version" in body
        assert body["status"] == "running"

    def test_health_returns_healthy(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "healthy"


# ═══════════════════════════════════════════════════════════════════════
# GET /api/v1/standards
# ═══════════════════════════════════════════════════════════════════════


class TestListStandards:
    def test_list_standards_empty(self, client, mock_db):
        mock_db.execute = AsyncMock(
            side_effect=[_make_count_result(0), _make_scalars_result([])]
        )

        resp = client.get("/api/v1/standards")
        assert resp.status_code == 200
        body = resp.json()
        assert body["items"] == []
        assert body["total"] == 0

    def test_list_standards_with_items(self, client, mock_db):
        standards = [FakeStandard("s1"), FakeStandard("s2")]
        mock_db.execute = AsyncMock(
            side_effect=[_make_count_result(2), _make_scalars_result(standards)]
        )

        resp = client.get("/api/v1/standards")
        assert resp.status_code == 200
        body = resp.json()
        assert len(body["items"]) == 2
        assert body["total"] == 2

    def test_list_standards_pagination(self, client, mock_db):
        mock_db.execute = AsyncMock(
            side_effect=[_make_count_result(50), _make_scalars_result([])]
        )

        resp = client.get("/api/v1/standards?limit=10&offset=20")
        assert resp.status_code == 200
        body = resp.json()
        assert body["limit"] == 10
        assert body["offset"] == 20

    def test_list_standards_domain_filter(self, client, mock_db):
        mock_db.execute = AsyncMock(
            side_effect=[_make_count_result(1), _make_scalars_result([FakeStandard("s1", domain="ELA")])]
        )

        resp = client.get("/api/v1/standards?domain=ELA")
        assert resp.status_code == 200
        body = resp.json()
        assert body["items"][0]["domain"] == "ELA"

    def test_list_standards_grade_band_filter(self, client, mock_db):
        mock_db.execute = AsyncMock(
            side_effect=[
                _make_count_result(1),
                _make_scalars_result([FakeStandard("s1", grade_band="G3_5")]),
            ]
        )

        resp = client.get("/api/v1/standards?grade_band=G3_5")
        assert resp.status_code == 200


# ═══════════════════════════════════════════════════════════════════════
# GET /api/v1/standards/{id}
# ═══════════════════════════════════════════════════════════════════════


class TestGetStandard:
    def test_get_existing_standard(self, client, mock_db):
        mock_db.execute = AsyncMock(return_value=_make_scalar_result(FakeStandard("s1")))

        resp = client.get("/api/v1/standards/s1")
        assert resp.status_code == 200
        body = resp.json()
        assert body["id"] == "s1"

    def test_get_missing_standard_404(self, client, mock_db):
        mock_db.execute = AsyncMock(return_value=_make_scalar_result(None))

        resp = client.get("/api/v1/standards/missing")
        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()


# ═══════════════════════════════════════════════════════════════════════
# GET /api/v1/districts
# ═══════════════════════════════════════════════════════════════════════


class TestListDistricts:
    def test_list_districts(self, client, mock_db):
        districts = [FakeDistrict("d1", "Springfield"), FakeDistrict("d2", "Shelbyville")]
        mock_db.execute = AsyncMock(return_value=_make_scalars_result(districts))

        resp = client.get("/api/v1/districts")
        assert resp.status_code == 200
        body = resp.json()
        assert len(body["items"]) == 2
        assert body["total"] == 2

    def test_list_districts_empty(self, client, mock_db):
        mock_db.execute = AsyncMock(return_value=_make_scalars_result([]))

        resp = client.get("/api/v1/districts")
        assert resp.status_code == 200
        body = resp.json()
        assert body["items"] == []
        assert body["total"] == 0


# ═══════════════════════════════════════════════════════════════════════
# GET /api/v1/districts/{id}/curriculum
# ═══════════════════════════════════════════════════════════════════════


class TestGetDistrictCurriculum:
    def test_get_curriculum(self, client, mock_db):
        district = FakeDistrict("d1", "Springfield")
        curricula = [
            FakeCurriculum("c1", "d1", sequence=1),
            FakeCurriculum("c2", "d1", sequence=2),
        ]
        mock_db.execute = AsyncMock(
            side_effect=[
                _make_scalar_result(district),
                _make_scalars_result(curricula),
            ]
        )

        resp = client.get("/api/v1/districts/d1/curriculum")
        assert resp.status_code == 200
        body = resp.json()
        assert body["district_id"] == "d1"
        assert body["district_name"] == "Springfield"
        assert len(body["curriculum"]) == 2

    def test_missing_district_404(self, client, mock_db):
        mock_db.execute = AsyncMock(return_value=_make_scalar_result(None))

        resp = client.get("/api/v1/districts/unknown/curriculum")
        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()

    def test_district_with_no_curriculum(self, client, mock_db):
        district = FakeDistrict("d1", "Springfield")
        mock_db.execute = AsyncMock(
            side_effect=[
                _make_scalar_result(district),
                _make_scalars_result([]),
            ]
        )

        resp = client.get("/api/v1/districts/d1/curriculum")
        assert resp.status_code == 200
        body = resp.json()
        assert body["curriculum"] == []
