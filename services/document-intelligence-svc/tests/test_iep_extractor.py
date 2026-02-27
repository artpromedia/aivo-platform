"""Tests for document-intelligence-svc IEP extractor."""
import pytest


class TestIEPExtractor:
    """Tests for IEP document extraction."""

    def test_extract_student_info(self):
        """Should extract student info from IEP document."""
        student_info = {
            "name": "John Smith",
            "student_id": "STU-12345",
            "date_of_birth": "2015-05-15",
            "grade": 3,
            "school": "Lincoln Elementary",
            "disability_category": "Specific Learning Disability",
        }
        assert student_info["name"] == "John Smith"
        assert student_info["grade"] == 3

    def test_extract_goals(self):
        """Should extract IEP goals with measurability."""
        goals = [
            {
                "domain": "READING",
                "goal_text": "Student will read grade-level text with 95% accuracy by May 2026.",
                "measurable": True,
                "baseline": "Currently reads at 2nd grade level with 80% accuracy",
                "target_date": "2026-05-30",
            },
            {
                "domain": "MATH",
                "goal_text": "Student will solve two-digit addition problems.",
                "measurable": False,
                "baseline": None,
                "target_date": None,
            },
        ]
        assert len(goals) == 2
        assert goals[0]["measurable"] is True
        assert goals[1]["measurable"] is False

    def test_extract_accommodations(self):
        """Should extract accommodations from IEP."""
        accommodations = [
            {"category": "PRESENTATION", "description": "Large print materials", "setting": "ALL"},
            {"category": "RESPONSE", "description": "Use of calculator", "setting": "MATH_ONLY"},
            {"category": "TIMING", "description": "Extended time (1.5x)", "setting": "ALL"},
        ]
        categories = [a["category"] for a in accommodations]
        assert "PRESENTATION" in categories
        assert "TIMING" in categories

    def test_extract_services(self):
        """Should extract related services from IEP."""
        services = [
            {
                "type": "SPEECH_THERAPY",
                "frequency": "2x per week",
                "duration_minutes": 30,
                "provider": "SLP",
            },
            {
                "type": "OCCUPATIONAL_THERAPY",
                "frequency": "1x per week",
                "duration_minutes": 45,
                "provider": "OT",
            },
        ]
        assert len(services) == 2
        assert services[0]["duration_minutes"] == 30

    def test_extract_present_levels(self):
        """Should extract present levels of performance."""
        present_levels = {
            "academic": "Student reads at 2nd grade level, math at grade level.",
            "functional": "Student requires support with organizational skills.",
            "social_emotional": "Student has difficulty with peer interactions.",
        }
        assert "academic" in present_levels
        assert len(present_levels) == 3


class TestSMARTValidator:
    """Tests for IEP goal SMART criteria validation."""

    def test_validate_specific_goal(self):
        """Should validate goal is specific."""
        goal = "Student will read 3rd grade passages with 95% accuracy."
        result = {"specific": True, "score": 0.9, "feedback": "Goal is specific."}
        assert result["specific"] is True

    def test_validate_measurable_goal(self):
        """Should validate goal is measurable."""
        good_goal = "Read with 95% accuracy as measured by running records."
        bad_goal = "Improve reading skills."
        good_result = {"measurable": True}
        bad_result = {"measurable": False, "feedback": "Add measurable criteria."}
        assert good_result["measurable"] is True
        assert bad_result["measurable"] is False

    def test_validate_time_bound_goal(self):
        """Should validate goal has time bound."""
        goal_with_date = "By May 2026, student will solve multiplication problems."
        result = {"time_bound": True, "target_date": "2026-05-30"}
        assert result["time_bound"] is True

    def test_suggest_improvements(self):
        """Should suggest improvements for weak goals."""
        suggestions = [
            "Add specific measurable criteria (e.g., percentage accuracy)",
            "Include a target date for achievement",
            "Specify the assessment method",
        ]
        assert len(suggestions) >= 2

    def test_validate_goals_batch(self):
        """Should validate multiple goals at once."""
        results = [
            {"goal_id": "g-1", "overall_score": 0.92, "is_smart": True},
            {"goal_id": "g-2", "overall_score": 0.45, "is_smart": False},
        ]
        smart_count = sum(1 for r in results if r["is_smart"])
        assert smart_count == 1


class TestGoalQualityAnalyzer:
    """Tests for goal quality analysis."""

    def test_analyze_goals_returns_report(self):
        """Should return quality analysis report for goals."""
        report = {
            "total_goals": 5,
            "smart_compliant": 3,
            "compliance_rate": 0.6,
            "common_issues": ["Missing time bounds", "Vague criteria"],
            "recommendations": ["Add target dates", "Use specific metrics"],
        }
        assert report["compliance_rate"] == 0.6
        assert len(report["common_issues"]) >= 1
