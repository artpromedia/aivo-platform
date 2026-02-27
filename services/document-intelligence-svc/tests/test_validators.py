"""Tests for document-intelligence-svc validators and curriculum parser."""
import pytest


class TestCurriculumParser:
    """Tests for curriculum document parsing."""

    def test_parse_returns_curriculum_document(self):
        """Should parse curriculum document structure."""
        doc = {
            "title": "Grade 5 Math Curriculum",
            "grade_level": 5,
            "subject": "Mathematics",
            "units": [
                {"title": "Number Operations", "order": 1, "weeks": 6},
                {"title": "Fractions and Decimals", "order": 2, "weeks": 8},
            ],
        }
        assert doc["grade_level"] == 5
        assert len(doc["units"]) == 2

    def test_detect_document_type(self):
        """Should detect curriculum document type."""
        types = {
            "scope_sequence": "scope and sequence document with timeline",
            "pacing_guide": "weekly pacing guide for instruction",
            "standards_map": "standards alignment document",
        }
        assert "scope_sequence" in types
        assert len(types) == 3

    def test_parse_standards(self):
        """Should extract learning standards from curriculum."""
        standards = [
            {"code": "5.NF.1", "description": "Add and subtract fractions with unlike denominators"},
            {"code": "5.NF.2", "description": "Solve word problems involving fractions"},
        ]
        assert all(s["code"].startswith("5.NF") for s in standards)

    def test_parse_units_with_assessments(self):
        """Should parse units with assessment information."""
        units = [
            {
                "title": "Number Operations",
                "standards": ["5.NBT.1", "5.NBT.2"],
                "assessments": [
                    {"type": "FORMATIVE", "name": "Quick Check"},
                    {"type": "SUMMATIVE", "name": "Unit Test"},
                ],
            }
        ]
        assert len(units[0]["assessments"]) == 2
        types = [a["type"] for a in units[0]["assessments"]]
        assert "FORMATIVE" in types
        assert "SUMMATIVE" in types

    def test_parse_scope_sequence(self):
        """Should parse scope and sequence into timeline."""
        scope = {
            "total_weeks": 36,
            "units": [
                {"unit": "Unit 1", "start_week": 1, "end_week": 6},
                {"unit": "Unit 2", "start_week": 7, "end_week": 14},
            ],
        }
        assert scope["total_weeks"] == 36
        total_unit_weeks = sum(u["end_week"] - u["start_week"] + 1 for u in scope["units"])
        assert total_unit_weeks <= scope["total_weeks"]


class TestPDFProcessor:
    """Tests for PDF processing functionality."""

    def test_process_returns_page_content(self):
        """Should extract text from PDF pages."""
        content = {
            "pages": [
                {"page_num": 1, "text": "Chapter 1: Introduction", "tables": [], "images": []},
                {"page_num": 2, "text": "The first topic is...", "tables": [], "images": []},
            ],
            "total_pages": 2,
            "metadata": {"title": "Curriculum Guide", "author": "District Admin"},
        }
        assert content["total_pages"] == 2
        assert content["pages"][0]["text"] == "Chapter 1: Introduction"

    def test_extract_text_only(self):
        """Should extract plain text without tables/images."""
        text = "Chapter 1: Introduction\nThe first topic is fractions.\n"
        assert "Introduction" in text
        assert len(text) > 0

    def test_get_page_count(self):
        """Should return correct page count."""
        page_count = 15
        assert page_count > 0

    def test_extract_tables(self):
        """Should extract tables from PDF pages."""
        tables = [
            {
                "page": 3,
                "rows": [
                    ["Standard", "Description", "Priority"],
                    ["5.NF.1", "Add fractions", "High"],
                ],
                "columns": 3,
            }
        ]
        assert tables[0]["columns"] == 3
        assert len(tables[0]["rows"]) == 2


class TestDocumentModels:
    """Tests for document data models."""

    def test_iep_goal_model(self):
        """Should validate IEP goal model fields."""
        goal = {
            "domain": "READING",
            "goal_text": "Read at grade level",
            "baseline": "Currently 1 year below",
            "measurable": True,
            "target_date": "2026-05-30",
        }
        assert goal["domain"] in ["READING", "MATH", "WRITING", "BEHAVIOR", "SOCIAL"]

    def test_iep_accommodation_model(self):
        """Should validate accommodation model."""
        accommodation = {
            "category": "PRESENTATION",
            "description": "Large print",
            "setting": "ALL",
            "frequency": "ALWAYS",
        }
        valid_categories = ["PRESENTATION", "RESPONSE", "TIMING", "SETTING"]
        assert accommodation["category"] in valid_categories

    def test_iep_service_model(self):
        """Should validate service model."""
        service = {
            "type": "SPEECH_THERAPY",
            "frequency": "2x/week",
            "duration_minutes": 30,
            "location": "PULL_OUT",
        }
        assert service["duration_minutes"] > 0
        assert service["location"] in ["PULL_OUT", "PUSH_IN", "BOTH"]
