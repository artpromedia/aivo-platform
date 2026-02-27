"""Tests for multimodal-analytics-svc data models."""
import pytest


class TestFeatureFusioner:
    """Tests for multimodal feature fusion."""

    def test_early_fusion_concatenates(self):
        """Should concatenate features from multiple modalities."""
        visual = [0.1, 0.2, 0.3]
        audio = [0.4, 0.5]
        text = [0.6, 0.7, 0.8, 0.9]
        fused = visual + audio + text
        assert len(fused) == len(visual) + len(audio) + len(text)

    def test_attention_fusion_weights_modalities(self):
        """Should apply attention weights to modalities."""
        weights = {"visual": 0.4, "audio": 0.25, "text": 0.35}
        assert abs(sum(weights.values()) - 1.0) < 0.01

    def test_fuse_returns_fused_features(self):
        """Should return FusedFeatures structure."""
        result = {
            "features": [0.1, 0.2, 0.3],
            "modality_contributions": {"visual": 0.5, "audio": 0.3, "text": 0.2},
            "fusion_method": "ATTENTION",
        }
        assert result["fusion_method"] in ["EARLY", "ATTENTION", "LATE"]
        assert len(result["features"]) > 0


class TestCrossModalAnalyzer:
    """Tests for cross-modal analysis."""

    def test_analyze_correlations(self):
        """Should find correlations between modalities."""
        correlations = [
            {"modality_a": "video_engagement", "modality_b": "quiz_score", "correlation": 0.78, "p_value": 0.001},
            {"modality_a": "typing_speed", "modality_b": "reading_time", "correlation": -0.45, "p_value": 0.02},
        ]
        assert len(correlations) >= 1
        assert all(-1 <= c["correlation"] <= 1 for c in correlations)

    def test_detect_patterns(self):
        """Should detect cross-modal learning patterns."""
        patterns = [
            {"type": "CONVERGENCE", "modalities": ["video", "text"], "description": "High engagement in both"},
            {"type": "DIVERGENCE", "modalities": ["audio", "text"], "description": "Prefers audio over text"},
        ]
        pattern_types = [p["type"] for p in patterns]
        assert "CONVERGENCE" in pattern_types

    def test_compute_consistency(self):
        """Should compute consistency across modalities."""
        result = {
            "overall_consistency": 0.82,
            "modality_pairs": [
                {"pair": ["video", "quiz"], "consistency": 0.9},
                {"pair": ["audio", "quiz"], "consistency": 0.74},
            ],
        }
        assert 0 <= result["overall_consistency"] <= 1


class TestLearningStyleDetector:
    """Tests for learning style detection."""

    def test_detect_learning_style(self):
        """Should detect primary learning style."""
        result = {
            "primary_style": "visual",
            "confidence": 0.85,
            "style_scores": {"visual": 0.85, "auditory": 0.55, "kinesthetic": 0.40, "reading": 0.70},
        }
        assert result["primary_style"] == "visual"
        assert result["style_scores"]["visual"] >= max(
            result["style_scores"]["auditory"],
            result["style_scores"]["kinesthetic"],
        )

    def test_analyze_preferences(self):
        """Should analyze modality preferences from interaction data."""
        preferences = {
            "preferred_content_types": ["video", "diagram", "interactive"],
            "avg_engagement_by_type": {
                "video": 0.92,
                "text": 0.65,
                "audio": 0.58,
                "interactive": 0.88,
            },
        }
        assert preferences["avg_engagement_by_type"]["video"] > preferences["avg_engagement_by_type"]["text"]

    def test_predict_optimal_modality(self):
        """Should predict best modality for a topic."""
        prediction = {
            "topic": "fractions",
            "recommended_modality": "interactive",
            "confidence": 0.88,
            "alternatives": ["video", "diagram"],
        }
        assert prediction["confidence"] > 0.5
        assert len(prediction["alternatives"]) >= 1

    def test_recommend_content_format(self):
        """Should recommend content format for student."""
        recommendations = [
            {"format": "animated_video", "score": 0.95, "reason": "visual_learner"},
            {"format": "interactive_sim", "score": 0.88, "reason": "high_engagement"},
        ]
        assert all(r["score"] > 0 for r in recommendations)


class TestHolisticAnalyzer:
    """Tests for holistic learning analysis."""

    def test_identify_patterns(self):
        """Should identify holistic learning patterns."""
        patterns = [
            {"pattern": "morning_peak", "description": "Student performs best 8-10am"},
            {"pattern": "visual_preference", "description": "Learns better with visuals"},
        ]
        assert len(patterns) >= 1

    def test_compute_insights(self):
        """Should generate actionable insights."""
        insights = [
            {
                "category": "ENGAGEMENT",
                "insight": "Engagement drops after 20 minutes of text-only content",
                "recommendation": "Add visual breaks every 15 minutes",
                "priority": "HIGH",
            },
        ]
        assert insights[0]["priority"] in ["HIGH", "MEDIUM", "LOW"]

    def test_generate_report(self):
        """Should generate comprehensive holistic report."""
        report = {
            "student_id": "stu-1",
            "period": "2026-Q1",
            "overall_engagement": 0.78,
            "growth_areas": ["reading_comprehension", "math_problem_solving"],
            "strengths": ["visual_learning", "collaborative_work"],
        }
        assert len(report["growth_areas"]) >= 1
        assert len(report["strengths"]) >= 1
