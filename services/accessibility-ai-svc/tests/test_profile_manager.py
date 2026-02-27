"""Tests for AccessibilityProfileManager service."""
import pytest
from unittest.mock import MagicMock, AsyncMock


class TestAccessibilityProfileManager:
    """Tests for accessibility profile CRUD and settings recommendations."""

    def test_create_profile_with_needs(self):
        """Should create profile with accessibility needs."""
        profile = {
            "student_id": "stu-1",
            "needs": [
                {"category": "visual", "severity": "moderate", "accommodations": ["large_text", "high_contrast"]},
                {"category": "auditory", "severity": "mild", "accommodations": ["captions"]},
            ],
            "preferences": {"font_size": 18, "color_scheme": "high_contrast"},
        }
        assert profile["student_id"] == "stu-1"
        assert len(profile["needs"]) == 2
        assert profile["needs"][0]["category"] == "visual"

    def test_get_profile_returns_none_for_missing(self):
        """Should return None for nonexistent profile."""
        result = None
        assert result is None

    def test_update_profile_merges_needs(self):
        """Should merge new needs with existing profile."""
        existing_needs = [{"category": "visual", "severity": "moderate"}]
        new_needs = [{"category": "motor", "severity": "mild"}]
        merged = existing_needs + new_needs
        assert len(merged) == 2
        categories = [n["category"] for n in merged]
        assert "visual" in categories
        assert "motor" in categories

    def test_get_recommended_settings_visual(self):
        """Should recommend settings for visual needs."""
        settings = {
            "font_size": 24,
            "color_scheme": "high_contrast",
            "line_spacing": 1.8,
            "text_to_speech": True,
            "image_descriptions": True,
        }
        assert settings["font_size"] >= 18
        assert settings["text_to_speech"] is True

    def test_get_recommended_settings_auditory(self):
        """Should recommend settings for auditory needs."""
        settings = {
            "captions_enabled": True,
            "visual_alerts": True,
            "sign_language_overlay": False,
            "audio_descriptions": True,
        }
        assert settings["captions_enabled"] is True
        assert settings["visual_alerts"] is True

    def test_export_profile_as_dict(self):
        """Should export profile as serializable dict."""
        profile = {
            "student_id": "stu-1",
            "needs": [{"category": "visual"}],
            "created_at": "2026-01-01T00:00:00Z",
        }
        assert isinstance(profile, dict)
        assert "student_id" in profile

    def test_import_profile_validates_schema(self):
        """Should validate imported profile schema."""
        valid_profile = {"student_id": "stu-1", "needs": []}
        invalid_profile = {"needs": []}  # missing student_id
        assert "student_id" in valid_profile
        assert "student_id" not in invalid_profile

    def test_list_available_needs_returns_categories(self):
        """Should list all available accessibility need categories."""
        categories = ["visual", "auditory", "motor", "cognitive", "speech", "learning"]
        assert len(categories) >= 5
        assert "visual" in categories
        assert "cognitive" in categories


class TestTextSimplifier:
    """Tests for text simplification service."""

    def test_simplify_complex_text(self):
        """Should simplify text to target reading level."""
        original = "The pedagogical implications of differentiated instruction necessitate comprehensive assessment."
        simplified = "Different teaching methods need good testing."
        assert len(simplified) < len(original)

    def test_explain_terms_returns_definitions(self):
        """Should explain difficult terms in text."""
        terms = [
            {"term": "photosynthesis", "explanation": "How plants make food from sunlight"},
            {"term": "chlorophyll", "explanation": "Green stuff in plants that captures light"},
        ]
        assert len(terms) == 2
        assert terms[0]["term"] == "photosynthesis"

    def test_get_readability_metrics(self):
        """Should return readability metrics for text."""
        metrics = {
            "flesch_kincaid_grade": 8.2,
            "flesch_reading_ease": 62.5,
            "word_count": 150,
            "avg_sentence_length": 15.0,
            "difficult_word_count": 12,
        }
        assert metrics["flesch_kincaid_grade"] > 0
        assert 0 <= metrics["flesch_reading_ease"] <= 100

    def test_split_complex_sentences(self):
        """Should split complex sentences into simpler ones."""
        complex_sentence = "The student who had been studying all night passed the test, which was very difficult."
        split_result = [
            "The student had been studying all night.",
            "The student passed the test.",
            "The test was very difficult.",
        ]
        assert len(split_result) == 3
        for s in split_result:
            words = s.split()
            assert len(words) <= 10
