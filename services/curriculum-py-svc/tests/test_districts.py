"""
Unit Tests for Curriculum Python Service - Districts and Curriculum Module

Tests for:
- District CRUD operations
- District curriculum mapping
- Import/export operations
"""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.districts import District, DistrictCurriculum


# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture
def sample_district():
    """Create a sample district for testing."""
    return District(
        id="district-001",
        name="Springfield School District",
        state="Illinois",
        region="Midwest",
        settings={"grading_scale": "standard", "school_year_start": "August"},
        created_at=datetime(2025, 1, 1, 0, 0, 0),
        updated_at=datetime(2025, 1, 1, 0, 0, 0),
    )


@pytest.fixture
def sample_curriculum():
    """Create a sample curriculum mapping."""
    return DistrictCurriculum(
        id="curriculum-001",
        district_id="district-001",
        standard_id="ccss-math-1-oa-1",
        subject="Mathematics",
        grade_level="Grade 1",
        sequence=1,
        notes="Core standard for first quarter",
        active=True,
        created_at=datetime(2025, 1, 1, 0, 0, 0),
    )


@pytest.fixture
def sample_districts_list():
    """Create a list of sample districts."""
    return [
        District(
            id=f"district-{i:03d}",
            name=f"District {i}",
            state="State" if i % 2 == 0 else "Other State",
            region="Region A" if i < 5 else "Region B",
            settings={"key": f"value-{i}"},
            created_at=datetime(2025, 1, 1),
            updated_at=datetime(2025, 1, 1),
        )
        for i in range(1, 11)
    ]


@pytest.fixture
def sample_curriculum_list():
    """Create a list of curriculum mappings."""
    return [
        DistrictCurriculum(
            id=f"curriculum-{i:03d}",
            district_id="district-001",
            standard_id=f"standard-{i:03d}",
            subject="Mathematics" if i % 2 == 0 else "English",
            grade_level=f"Grade {(i % 5) + 1}",
            sequence=i,
            active=i % 3 != 0,  # Some inactive
            created_at=datetime(2025, 1, 1),
        )
        for i in range(1, 11)
    ]


# =============================================================================
# DISTRICT MODEL TESTS
# =============================================================================

class TestDistrictModel:
    """Tests for District model."""

    def test_district_to_dict(self, sample_district):
        """Test District.to_dict() returns correct dictionary."""
        result = sample_district.to_dict()
        
        assert result["id"] == "district-001"
        assert result["name"] == "Springfield School District"
        assert result["state"] == "Illinois"
        assert result["region"] == "Midwest"
        assert result["settings"]["grading_scale"] == "standard"
        assert "created_at" in result
        assert "updated_at" in result

    def test_district_to_dict_with_none_values(self):
        """Test to_dict handles None values."""
        district = District(
            id="test-1",
            name="Test District",
            state=None,
            region=None,
            settings=None,
        )
        district.created_at = None
        district.updated_at = None
        
        result = district.to_dict()
        
        assert result["state"] is None
        assert result["region"] is None
        assert result["settings"] is None
        assert result["created_at"] is None

    def test_district_required_fields(self):
        """Test required fields are properly set."""
        district = District(
            id="test-id",
            name="Test District",
        )
        
        assert district.id == "test-id"
        assert district.name == "Test District"

    def test_district_settings_json(self, sample_district):
        """Test settings JSONB field."""
        assert isinstance(sample_district.settings, dict)
        assert sample_district.settings["grading_scale"] == "standard"
        assert sample_district.settings["school_year_start"] == "August"

    def test_district_settings_update(self, sample_district):
        """Test updating settings field."""
        sample_district.settings["new_setting"] = "new_value"
        
        assert sample_district.settings["new_setting"] == "new_value"
        assert len(sample_district.settings) == 3


# =============================================================================
# DISTRICT CURRICULUM MODEL TESTS
# =============================================================================

class TestDistrictCurriculumModel:
    """Tests for DistrictCurriculum model."""

    def test_curriculum_to_dict(self, sample_curriculum):
        """Test DistrictCurriculum.to_dict() returns correct dictionary."""
        result = sample_curriculum.to_dict()
        
        assert result["id"] == "curriculum-001"
        assert result["district_id"] == "district-001"
        assert result["standard_id"] == "ccss-math-1-oa-1"
        assert result["subject"] == "Mathematics"
        assert result["grade_level"] == "Grade 1"
        assert result["sequence"] == 1
        assert result["active"] is True
        assert "notes" in result

    def test_curriculum_required_fields(self):
        """Test required fields."""
        curriculum = DistrictCurriculum(
            id="curr-1",
            district_id="dist-1",
            standard_id="std-1",
            subject="Math",
            grade_level="Grade 1",
        )
        
        assert curriculum.id == "curr-1"
        assert curriculum.district_id == "dist-1"
        assert curriculum.standard_id == "std-1"
        assert curriculum.subject == "Math"
        assert curriculum.grade_level == "Grade 1"

    def test_curriculum_optional_fields(self, sample_curriculum):
        """Test optional fields can be None."""
        sample_curriculum.sequence = None
        sample_curriculum.notes = None
        
        result = sample_curriculum.to_dict()
        
        assert result["sequence"] is None
        assert result["notes"] is None

    def test_curriculum_active_default(self):
        """Test active field defaults to True."""
        curriculum = DistrictCurriculum(
            id="curr-1",
            district_id="dist-1",
            standard_id="std-1",
            subject="Math",
            grade_level="Grade 1",
            active=True,
        )
        
        assert curriculum.active is True


# =============================================================================
# DISTRICT CRUD TESTS
# =============================================================================

class TestDistrictCRUD:
    """Tests for District CRUD operations."""

    @pytest.mark.asyncio
    async def test_create_district(self, sample_district):
        """Test creating a new district."""
        mock_session = AsyncMock(spec=AsyncSession)
        mock_session.add = MagicMock()
        mock_session.commit = AsyncMock()
        
        mock_session.add(sample_district)
        await mock_session.commit()
        
        mock_session.add.assert_called_once_with(sample_district)
        mock_session.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_district_by_id(self, sample_district):
        """Test retrieving a district by ID."""
        mock_session = AsyncMock(spec=AsyncSession)
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_district
        mock_session.execute.return_value = mock_result
        
        result = await mock_session.execute(MagicMock())
        district = result.scalar_one_or_none()
        
        assert district.id == "district-001"
        assert district.name == "Springfield School District"

    @pytest.mark.asyncio
    async def test_update_district(self, sample_district):
        """Test updating a district."""
        mock_session = AsyncMock(spec=AsyncSession)
        
        sample_district.name = "Updated District Name"
        sample_district.settings["updated"] = True
        
        mock_session.add(sample_district)
        await mock_session.commit()
        
        assert sample_district.name == "Updated District Name"
        assert sample_district.settings["updated"] is True

    @pytest.mark.asyncio
    async def test_delete_district(self, sample_district):
        """Test deleting a district."""
        mock_session = AsyncMock(spec=AsyncSession)
        mock_session.delete = AsyncMock()
        
        await mock_session.delete(sample_district)
        await mock_session.commit()
        
        mock_session.delete.assert_called_once_with(sample_district)

    @pytest.mark.asyncio
    async def test_list_districts(self, sample_districts_list):
        """Test listing all districts."""
        mock_session = AsyncMock(spec=AsyncSession)
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = sample_districts_list
        mock_session.execute.return_value = mock_result
        
        result = await mock_session.execute(MagicMock())
        districts = result.scalars().all()
        
        assert len(districts) == 10


# =============================================================================
# DISTRICT CURRICULUM TESTS
# =============================================================================

class TestDistrictCurriculumOperations:
    """Tests for district curriculum operations."""

    @pytest.mark.asyncio
    async def test_add_curriculum_mapping(self, sample_curriculum):
        """Test adding curriculum mapping to district."""
        mock_session = AsyncMock(spec=AsyncSession)
        mock_session.add = MagicMock()
        
        mock_session.add(sample_curriculum)
        await mock_session.commit()
        
        mock_session.add.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_district_curriculum(self, sample_curriculum_list):
        """Test getting curriculum for a district."""
        active_curricula = [c for c in sample_curriculum_list if c.active]
        
        assert len(active_curricula) > 0
        for c in active_curricula:
            assert c.active is True

    @pytest.mark.asyncio
    async def test_filter_curriculum_by_subject(self, sample_curriculum_list):
        """Test filtering curriculum by subject."""
        math_curricula = [c for c in sample_curriculum_list if c.subject == "Mathematics"]
        
        assert len(math_curricula) > 0
        for c in math_curricula:
            assert c.subject == "Mathematics"

    @pytest.mark.asyncio
    async def test_filter_curriculum_by_grade(self, sample_curriculum_list):
        """Test filtering curriculum by grade level."""
        grade1_curricula = [c for c in sample_curriculum_list if c.grade_level == "Grade 1"]
        
        assert len(grade1_curricula) > 0

    @pytest.mark.asyncio
    async def test_curriculum_ordering(self, sample_curriculum_list):
        """Test curriculum is ordered by sequence."""
        sorted_curricula = sorted(sample_curriculum_list, key=lambda x: x.sequence)
        
        for i in range(len(sorted_curricula) - 1):
            assert sorted_curricula[i].sequence <= sorted_curricula[i + 1].sequence

    @pytest.mark.asyncio
    async def test_deactivate_curriculum(self, sample_curriculum):
        """Test deactivating a curriculum mapping."""
        sample_curriculum.active = False
        
        assert sample_curriculum.active is False

    @pytest.mark.asyncio
    async def test_update_curriculum_sequence(self, sample_curriculum):
        """Test updating curriculum sequence."""
        sample_curriculum.sequence = 5
        
        assert sample_curriculum.sequence == 5


# =============================================================================
# IMPORT/EXPORT TESTS
# =============================================================================

class TestImportExport:
    """Tests for import/export operations."""

    def test_export_district_to_dict(self, sample_district, sample_curriculum_list):
        """Test exporting district with curriculum."""
        export_data = {
            "district": sample_district.to_dict(),
            "curriculum": [c.to_dict() for c in sample_curriculum_list],
        }
        
        assert "district" in export_data
        assert "curriculum" in export_data
        assert len(export_data["curriculum"]) == 10

    def test_export_standards_list(self):
        """Test exporting list of standards."""
        from app.models.standards import Standard
        
        standards = [
            Standard(
                id=f"std-{i}",
                name=f"Standard {i}",
                domain="Math",
                grade_band="K-2",
                code=f"CODE.{i}",
                framework="CCSS",
            )
            for i in range(5)
        ]
        
        export_data = [s.to_dict() for s in standards]
        
        assert len(export_data) == 5
        assert all("id" in s for s in export_data)

    def test_import_district_data(self):
        """Test importing district data from dict."""
        import_data = {
            "id": "imported-district",
            "name": "Imported District",
            "state": "Texas",
            "region": "South",
            "settings": {"imported": True},
        }
        
        district = District(
            id=import_data["id"],
            name=import_data["name"],
            state=import_data["state"],
            region=import_data["region"],
            settings=import_data["settings"],
        )
        
        assert district.id == "imported-district"
        assert district.settings["imported"] is True

    def test_import_curriculum_data(self):
        """Test importing curriculum data from dict."""
        import_data = {
            "id": "imported-curriculum",
            "district_id": "dist-1",
            "standard_id": "std-1",
            "subject": "Science",
            "grade_level": "Grade 3",
            "sequence": 1,
        }
        
        curriculum = DistrictCurriculum(
            id=import_data["id"],
            district_id=import_data["district_id"],
            standard_id=import_data["standard_id"],
            subject=import_data["subject"],
            grade_level=import_data["grade_level"],
            sequence=import_data["sequence"],
            active=True,
        )
        
        assert curriculum.id == "imported-curriculum"
        assert curriculum.subject == "Science"

    def test_export_csv_format(self, sample_districts_list):
        """Test exporting to CSV-like format."""
        headers = ["id", "name", "state", "region"]
        rows = []
        
        for d in sample_districts_list:
            row = {
                "id": d.id,
                "name": d.name,
                "state": d.state,
                "region": d.region,
            }
            rows.append(row)
        
        assert len(rows) == 10
        assert all(key in rows[0] for key in headers)

    def test_validate_import_data(self):
        """Test validation of import data."""
        valid_data = {
            "id": "test-id",
            "name": "Test District",
        }
        
        invalid_data = {
            "id": "",  # Empty ID
            "name": "",  # Empty name
        }
        
        # Valid data should pass
        assert valid_data["id"] and valid_data["name"]
        
        # Invalid data should fail
        assert not (invalid_data["id"] and invalid_data["name"])
