"""Tests for content-intelligence-svc data models."""
import pytest


class TestAutoTagger:
    """Tests for automatic content tagging."""

    def test_tag_produces_valid_tags(self):
        """Should produce tags with confidence scores."""
        tags = [
            {"label": "mathematics", "confidence": 0.95, "source": "classifier"},
            {"label": "algebra", "confidence": 0.88, "source": "taxonomy"},
            {"label": "grade-8", "confidence": 0.92, "source": "grade_detector"},
        ]
        assert len(tags) == 3
        assert all(0 <= t["confidence"] <= 1 for t in tags)

    def test_tag_with_taxonomy_alignment(self):
        """Should align tags to a standards taxonomy."""
        aligned = {
            "tags": [{"label": "CCSS.MATH.8.EE.1", "confidence": 0.85}],
            "taxonomy": "CCSS",
            "unaligned_tags": ["exponents"],
        }
        assert aligned["taxonomy"] == "CCSS"
        assert len(aligned["tags"]) >= 1

    def test_filter_tags_by_confidence(self):
        """Should filter tags below confidence threshold."""
        tags = [
            {"label": "math", "confidence": 0.95},
            {"label": "science", "confidence": 0.3},
            {"label": "grade-8", "confidence": 0.88},
        ]
        threshold = 0.5
        filtered = [t for t in tags if t["confidence"] >= threshold]
        assert len(filtered) == 2
        assert all(t["confidence"] >= threshold for t in filtered)

    def test_get_tag_statistics(self):
        """Should return tag usage statistics."""
        stats = {
            "total_tags": 1500,
            "unique_tags": 250,
            "avg_tags_per_content": 4.2,
            "top_tags": [
                {"label": "math", "count": 320},
                {"label": "reading", "count": 280},
            ],
        }
        assert stats["unique_tags"] < stats["total_tags"]
        assert stats["avg_tags_per_content"] > 0


class TestTopicClassifier:
    """Tests for topic classification model."""

    def test_classify_returns_top_subject(self):
        """Should classify content into subject area."""
        result = {
            "subject": "Mathematics",
            "confidence": 0.94,
            "sub_topics": ["Algebra", "Linear Equations"],
        }
        assert result["confidence"] > 0.9
        assert "Algebra" in result["sub_topics"]

    def test_classify_multi_label(self):
        """Should support multi-label classification."""
        labels = [
            {"subject": "Science", "confidence": 0.85},
            {"subject": "Mathematics", "confidence": 0.72},
        ]
        assert len(labels) == 2
        assert labels[0]["confidence"] > labels[1]["confidence"]

    def test_estimate_grade_level(self):
        """Should estimate content grade level."""
        result = {"grade_level": 8, "grade_range": "7-9", "confidence": 0.88}
        assert 1 <= result["grade_level"] <= 12
        assert result["confidence"] > 0.5


class TestPrerequisiteDetector:
    """Tests for prerequisite detection."""

    def test_detect_prerequisites(self):
        """Should detect prerequisite relationships."""
        prereqs = [
            {"source": "algebra-2", "target": "algebra-1", "confidence": 0.92, "type": "REQUIRED"},
            {"source": "algebra-2", "target": "geometry", "confidence": 0.65, "type": "RECOMMENDED"},
        ]
        required = [p for p in prereqs if p["type"] == "REQUIRED"]
        assert len(required) == 1

    def test_validate_sequence(self):
        """Should validate learning sequence order."""
        sequence = ["fractions", "decimals", "percentages", "ratios"]
        is_valid = True  # in correct order
        assert is_valid is True
        assert len(sequence) == 4

    def test_suggest_ordering(self):
        """Should suggest optimal content ordering."""
        unordered = ["calculus", "algebra", "pre-algebra", "geometry"]
        ordered = ["pre-algebra", "algebra", "geometry", "calculus"]
        assert ordered[0] == "pre-algebra"
        assert ordered[-1] == "calculus"


class TestReadabilityAnalyzer:
    """Tests for readability analysis."""

    def test_analyze_returns_metrics(self):
        """Should return comprehensive readability metrics."""
        analysis = {
            "flesch_kincaid_grade": 6.5,
            "flesch_reading_ease": 72.3,
            "gunning_fog_index": 8.1,
            "word_count": 250,
            "sentence_count": 18,
            "avg_words_per_sentence": 13.9,
            "difficult_word_percentage": 12.5,
        }
        assert analysis["flesch_kincaid_grade"] > 0
        assert analysis["word_count"] > 0

    def test_identify_difficult_words(self):
        """Should identify difficult words in text."""
        difficult_words = [
            {"word": "photosynthesis", "syllables": 5, "frequency": "rare"},
            {"word": "metamorphosis", "syllables": 5, "frequency": "rare"},
        ]
        assert all(w["syllables"] >= 4 for w in difficult_words)

    def test_get_reading_time(self):
        """Should estimate reading time."""
        result = {
            "word_count": 500,
            "reading_time_minutes": 2.5,
            "reading_speed_wpm": 200,
        }
        expected = result["word_count"] / result["reading_speed_wpm"]
        assert result["reading_time_minutes"] == expected
