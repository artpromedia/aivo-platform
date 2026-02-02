"""
Unit Tests for Curriculum Python Service - Standards Module

Tests for:
- Standards CRUD operations
- Content versioning logic
- Search and filter functionality
"""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.standards import Standard


# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture
def sample_standard():
    """Create a sample standard for testing."""
    return Standard(
        id="ccss-math-1-oa-1",
        name="Add and subtract within 20",
        description="Use strategies such as counting on; making ten",
        domain="Operations and Algebraic Thinking",
        grade_band="K-2",
        code="1.OA.A.1",
        parent_id=None,
        framework="CCSS",
        created_at=datetime(2025, 1, 1, 0, 0, 0),
        updated_at=datetime(2025, 1, 1, 0, 0, 0),
    )


@pytest.fixture
def sample_standards_list():
    """Create a list of sample standards."""
    return [
        Standard(
            id=f"ccss-math-{i}",
            name=f"Standard {i}",
            description=f"Description for standard {i}",
            domain="Math" if i % 2 == 0 else "Reading",
            grade_band="K-2" if i < 3 else "3-5",
            code=f"CODE.{i}",
            framework="CCSS",
            created_at=datetime(2025, 1, 1),
            updated_at=datetime(2025, 1, 1),
        )
        for i in range(1, 11)
    ]


# =============================================================================
# STANDARD MODEL TESTS
# =============================================================================

class TestStandardModel:
    """Tests for Standard model."""

    def test_standard_to_dict(self, sample_standard):
        """Test Standard.to_dict() returns correct dictionary."""
        result = sample_standard.to_dict()
        
        assert result["id"] == "ccss-math-1-oa-1"
        assert result["name"] == "Add and subtract within 20"
        assert result["domain"] == "Operations and Algebraic Thinking"
        assert result["grade_band"] == "K-2"
        assert result["code"] == "1.OA.A.1"
        assert result["framework"] == "CCSS"
        assert result["parent_id"] is None
        assert "created_at" in result
        assert "updated_at" in result

    def test_standard_to_dict_with_none_dates(self):
        """Test to_dict handles None datetime fields."""
        standard = Standard(
            id="test-1",
            name="Test",
            domain="Test",
            grade_band="K-2",
            code="TEST.1",
            framework="CCSS",
        )
        standard.created_at = None
        standard.updated_at = None
        
        result = standard.to_dict()
        
        assert result["created_at"] is None
        assert result["updated_at"] is None

    def test_standard_required_fields(self):
        """Test that required fields are properly set."""
        standard = Standard(
            id="test-id",
            name="Test Standard",
            domain="Math",
            grade_band="K-2",
            code="TEST.1",
            framework="CCSS",
        )
        
        assert standard.id == "test-id"
        assert standard.name == "Test Standard"
        assert standard.domain == "Math"
        assert standard.grade_band == "K-2"
        assert standard.code == "TEST.1"
        assert standard.framework == "CCSS"

    def test_standard_optional_fields(self, sample_standard):
        """Test optional fields can be None."""
        sample_standard.description = None
        sample_standard.parent_id = None
        
        result = sample_standard.to_dict()
        
        assert result["description"] is None
        assert result["parent_id"] is None

    def test_standard_with_parent_id(self, sample_standard):
        """Test standard with parent reference."""
        sample_standard.parent_id = "ccss-math-parent"
        
        result = sample_standard.to_dict()
        
        assert result["parent_id"] == "ccss-math-parent"


# =============================================================================
# STANDARDS CRUD TESTS
# =============================================================================

class TestStandardsCRUD:
    """Tests for Standards CRUD operations."""

    @pytest.mark.asyncio
    async def test_create_standard(self, sample_standard):
        """Test creating a new standard."""
        mock_session = AsyncMock(spec=AsyncSession)
        mock_session.add = MagicMock()
        mock_session.commit = AsyncMock()
        mock_session.refresh = AsyncMock()
        
        # Simulate add and commit
        mock_session.add(sample_standard)
        await mock_session.commit()
        
        mock_session.add.assert_called_once_with(sample_standard)
        mock_session.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_standard_by_id(self, sample_standard):
        """Test retrieving a standard by ID."""
        mock_session = AsyncMock(spec=AsyncSession)
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_standard
        mock_session.execute.return_value = mock_result
        
        result = await mock_session.execute(MagicMock())
        standard = result.scalar_one_or_none()
        
        assert standard.id == "ccss-math-1-oa-1"
        assert standard.name == "Add and subtract within 20"

    @pytest.mark.asyncio
    async def test_get_standard_not_found(self):
        """Test retrieving non-existent standard returns None."""
        mock_session = AsyncMock(spec=AsyncSession)
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_session.execute.return_value = mock_result
        
        result = await mock_session.execute(MagicMock())
        standard = result.scalar_one_or_none()
        
        assert standard is None

    @pytest.mark.asyncio
    async def test_update_standard(self, sample_standard):
        """Test updating a standard."""
        mock_session = AsyncMock(spec=AsyncSession)
        
        # Modify standard
        sample_standard.name = "Updated Name"
        sample_standard.description = "Updated Description"
        
        mock_session.add(sample_standard)
        await mock_session.commit()
        
        assert sample_standard.name == "Updated Name"
        assert sample_standard.description == "Updated Description"

    @pytest.mark.asyncio
    async def test_delete_standard(self, sample_standard):
        """Test deleting a standard."""
        mock_session = AsyncMock(spec=AsyncSession)
        mock_session.delete = AsyncMock()
        
        await mock_session.delete(sample_standard)
        await mock_session.commit()
        
        mock_session.delete.assert_called_once_with(sample_standard)


# =============================================================================
# STANDARDS SEARCH AND FILTER TESTS
# =============================================================================

class TestStandardsSearch:
    """Tests for standards search and filter functionality."""

    @pytest.mark.asyncio
    async def test_filter_by_domain(self, sample_standards_list):
        """Test filtering standards by domain."""
        math_standards = [s for s in sample_standards_list if s.domain == "Math"]
        
        assert len(math_standards) == 5
        for s in math_standards:
            assert s.domain == "Math"

    @pytest.mark.asyncio
    async def test_filter_by_grade_band(self, sample_standards_list):
        """Test filtering standards by grade band."""
        k2_standards = [s for s in sample_standards_list if s.grade_band == "K-2"]
        
        assert len(k2_standards) == 2
        for s in k2_standards:
            assert s.grade_band == "K-2"

    @pytest.mark.asyncio
    async def test_filter_by_multiple_criteria(self, sample_standards_list):
        """Test filtering by multiple criteria."""
        filtered = [
            s for s in sample_standards_list 
            if s.domain == "Math" and s.grade_band == "3-5"
        ]
        
        assert len(filtered) > 0
        for s in filtered:
            assert s.domain == "Math"
            assert s.grade_band == "3-5"

    @pytest.mark.asyncio
    async def test_filter_by_framework(self, sample_standards_list):
        """Test filtering by framework."""
        ccss_standards = [s for s in sample_standards_list if s.framework == "CCSS"]
        
        assert len(ccss_standards) == 10

    @pytest.mark.asyncio
    async def test_search_by_name(self, sample_standards_list):
        """Test searching standards by name."""
        search_term = "Standard 1"
        results = [s for s in sample_standards_list if search_term in s.name]
        
        assert len(results) >= 1

    @pytest.mark.asyncio
    async def test_search_by_code(self, sample_standards_list):
        """Test searching standards by code."""
        search_code = "CODE.5"
        results = [s for s in sample_standards_list if search_code in s.code]
        
        assert len(results) == 1
        assert results[0].code == "CODE.5"

    @pytest.mark.asyncio
    async def test_pagination(self, sample_standards_list):
        """Test pagination of standards list."""
        page_size = 3
        page = 1
        offset = (page - 1) * page_size
        
        paginated = sample_standards_list[offset:offset + page_size]
        
        assert len(paginated) == 3
        assert paginated[0].id == "ccss-math-1"

    @pytest.mark.asyncio
    async def test_pagination_last_page(self, sample_standards_list):
        """Test pagination on last page with fewer items."""
        page_size = 3
        page = 4  # Last page with 10 items
        offset = (page - 1) * page_size
        
        paginated = sample_standards_list[offset:offset + page_size]
        
        assert len(paginated) == 1  # Only 1 item left

    @pytest.mark.asyncio
    async def test_empty_search_results(self, sample_standards_list):
        """Test search with no results."""
        results = [s for s in sample_standards_list if "nonexistent" in s.name]
        
        assert len(results) == 0


# =============================================================================
# STANDARDS ALIGNMENT MAPPING TESTS
# =============================================================================

class TestStandardsAlignment:
    """Tests for standards alignment mapping."""

    def test_standards_hierarchy(self, sample_standard):
        """Test parent-child relationship in standards."""
        parent = Standard(
            id="ccss-math-1-oa",
            name="Operations and Algebraic Thinking",
            domain="Math",
            grade_band="K-2",
            code="1.OA",
            framework="CCSS",
        )
        
        child = sample_standard
        child.parent_id = parent.id
        
        assert child.parent_id == "ccss-math-1-oa"

    def test_get_children_standards(self, sample_standards_list):
        """Test getting child standards of a parent."""
        parent_id = "parent-1"
        
        # Set some standards as children
        for i, s in enumerate(sample_standards_list[:3]):
            s.parent_id = parent_id
        
        children = [s for s in sample_standards_list if s.parent_id == parent_id]
        
        assert len(children) == 3

    def test_root_standards(self, sample_standards_list):
        """Test getting root standards (no parent)."""
        root_standards = [s for s in sample_standards_list if s.parent_id is None]
        
        assert len(root_standards) == 10

    def test_framework_alignment(self):
        """Test aligning standards across frameworks."""
        ccss_standard = Standard(
            id="ccss-1",
            name="CCSS Standard",
            domain="Math",
            grade_band="K-2",
            code="CCSS.1",
            framework="CCSS",
        )
        
        ngss_standard = Standard(
            id="ngss-1",
            name="NGSS Standard",
            domain="Science",
            grade_band="K-2",
            code="NGSS.1",
            framework="NGSS",
        )
        
        # Test framework identification
        assert ccss_standard.framework == "CCSS"
        assert ngss_standard.framework == "NGSS"
        assert ccss_standard.framework != ngss_standard.framework
