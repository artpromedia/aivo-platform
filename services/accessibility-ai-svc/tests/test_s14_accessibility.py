"""
Tests for S14 – Accessibility AI Service enhancements.

Covers:
- Reading-level adaptation endpoints
- Lexile estimation endpoints
- Grade-band listing endpoint
- Sensory accommodation endpoints
- Alt-text batch processing endpoint
- Unit tests for ReadingLevelAdapter
- Unit tests for SensoryAccommodator
"""
import pytest
from unittest.mock import MagicMock, patch
from dataclasses import asdict


# ============================================================================
# Reading-Level Adapter – Unit Tests
# ============================================================================

class TestReadingLevelAdapterUnit:
    """Direct unit tests for ReadingLevelAdapter model."""

    def test_instantiation(self):
        """ReadingLevelAdapter can be instantiated."""
        from app.models.reading_level_adapter import ReadingLevelAdapter
        adapter = ReadingLevelAdapter()
        assert adapter is not None

    def test_estimate_lexile_returns_dataclass(self):
        """estimate_lexile returns a LexileEstimate with expected fields."""
        from app.models.reading_level_adapter import ReadingLevelAdapter, LexileEstimate
        adapter = ReadingLevelAdapter()
        result = adapter.estimate_lexile(
            "The cat sat on the mat. It was a sunny day."
        )
        assert isinstance(result, LexileEstimate)
        assert isinstance(result.lexile, int)
        assert result.lexile >= 0
        assert result.grade_band in ("K-2", "3-5", "6-8", "9-12")
        assert result.word_count > 0
        assert result.avg_sentence_length > 0

    def test_estimate_lexile_empty_text_raises(self):
        """estimate_lexile raises ValueError on empty text."""
        from app.models.reading_level_adapter import ReadingLevelAdapter
        adapter = ReadingLevelAdapter()
        with pytest.raises(ValueError):
            adapter.estimate_lexile("")

    def test_adapt_returns_adapted_content(self):
        """adapt returns AdaptedContent within comfort zone."""
        from app.models.reading_level_adapter import ReadingLevelAdapter, AdaptedContent
        adapter = ReadingLevelAdapter()
        text = (
            "The students were required to demonstrate their comprehension "
            "of the subsequent material by utilizing approximately fifteen "
            "additional resources to accomplish the objective."
        )
        result = adapter.adapt(text, target_lexile=400)
        assert isinstance(result, AdaptedContent)
        assert result.text  # non-empty
        assert result.target_lexile == 400
        assert result.original_lexile >= 0
        assert result.adapted_lexile >= 0

    def test_adapt_to_grade_band(self):
        """adapt_to_grade_band uses midpoint of given band."""
        from app.models.reading_level_adapter import ReadingLevelAdapter
        adapter = ReadingLevelAdapter()
        result = adapter.adapt_to_grade_band(
            "The professor facilitated a subsequent investigation "
            "to evaluate the magnitude of the modification.",
            band="3-5",
        )
        assert result.grade_band == "3-5"
        assert result.target_lexile == 500  # midpoint of 3-5

    def test_adapt_to_grade_band_invalid_raises(self):
        """adapt_to_grade_band raises ValueError for unknown band."""
        from app.models.reading_level_adapter import ReadingLevelAdapter
        adapter = ReadingLevelAdapter()
        with pytest.raises(ValueError):
            adapter.adapt_to_grade_band("Hello world", band="13-16")

    def test_get_grade_bands_returns_dict(self):
        """get_grade_bands returns all four bands."""
        from app.models.reading_level_adapter import ReadingLevelAdapter
        adapter = ReadingLevelAdapter()
        bands = adapter.get_grade_bands()
        assert "K-2" in bands
        assert "3-5" in bands
        assert "6-8" in bands
        assert "9-12" in bands
        for info in bands.values():
            assert "min" in info
            assert "max" in info
            assert "midpoint" in info

    def test_comfort_zone_constant(self):
        """COMFORT_ZONE is ±50L."""
        from app.models.reading_level_adapter import ReadingLevelAdapter
        assert ReadingLevelAdapter.COMFORT_ZONE == 50

    def test_grade_bands_constant(self):
        """GRADE_BANDS has four entries with correct ranges."""
        from app.models.reading_level_adapter import GRADE_BANDS
        assert GRADE_BANDS["K-2"] == (0, 300)
        assert GRADE_BANDS["3-5"] == (300, 700)
        assert GRADE_BANDS["6-8"] == (700, 1000)
        assert GRADE_BANDS["9-12"] == (1000, 1300)

    def test_tier_substitutions_keys(self):
        """TIER_SUBSTITUTIONS has elementary and intermediate tiers."""
        from app.models.reading_level_adapter import TIER_SUBSTITUTIONS
        assert "elementary" in TIER_SUBSTITUTIONS
        assert "intermediate" in TIER_SUBSTITUTIONS
        assert len(TIER_SUBSTITUTIONS["elementary"]) > 0
        assert len(TIER_SUBSTITUTIONS["intermediate"]) > 0


# ============================================================================
# Sensory Accommodator – Unit Tests
# ============================================================================

class TestSensoryAccommodatorUnit:
    """Direct unit tests for SensoryAccommodator model."""

    def test_instantiation(self):
        """SensoryAccommodator can be instantiated."""
        from app.models.sensory_accommodator import SensoryAccommodator
        acc = SensoryAccommodator()
        assert acc is not None

    def test_apply_visual_default(self):
        """apply_visual_accommodations with defaults returns valid result."""
        from app.models.sensory_accommodator import (
            SensoryAccommodator, VisualAccommodation, ContrastLevel,
        )
        acc = SensoryAccommodator()
        result = acc.apply_visual_accommodations("<p>Hello</p>")
        assert isinstance(result, VisualAccommodation)
        assert result.html == "<p>Hello</p>"
        assert "font-size" in result.css
        assert result.contrast_level == "normal"
        assert result.font_scale == 1.0

    def test_apply_visual_high_contrast(self):
        """High contrast mode sets correct CSS entries."""
        from app.models.sensory_accommodator import (
            SensoryAccommodator, ContrastLevel,
        )
        acc = SensoryAccommodator()
        result = acc.apply_visual_accommodations(
            "<p>Test</p>", contrast=ContrastLevel.HIGH
        )
        assert result.contrast_level == "high"
        assert "High contrast" in " ".join(result.changes_applied)

    def test_apply_visual_font_scaling(self):
        """Font scaling multiplies base size."""
        from app.models.sensory_accommodator import SensoryAccommodator
        acc = SensoryAccommodator()
        result = acc.apply_visual_accommodations("<p>Scaled</p>", font_scale=2.0)
        assert result.font_scale == 2.0
        assert "32px" in result.css.get("font-size", "")

    def test_apply_visual_dyslexia_font(self):
        """Dyslexia font family is set when requested."""
        from app.models.sensory_accommodator import SensoryAccommodator
        acc = SensoryAccommodator()
        result = acc.apply_visual_accommodations(
            "<p>Dyslexia</p>", dyslexia_font=True
        )
        assert "OpenDyslexic" in result.css.get("font-family", "")

    def test_apply_visual_color_blind_mode(self):
        """Colour-blind mode is recorded."""
        from app.models.sensory_accommodator import (
            SensoryAccommodator, ColorBlindMode,
        )
        acc = SensoryAccommodator()
        result = acc.apply_visual_accommodations(
            "<p>CB</p>", color_blind_mode=ColorBlindMode.PROTANOPIA
        )
        assert result.color_blind_mode == "protanopia"

    def test_apply_visual_empty_raises(self):
        """apply_visual_accommodations raises ValueError on empty content."""
        from app.models.sensory_accommodator import SensoryAccommodator
        acc = SensoryAccommodator()
        with pytest.raises(ValueError):
            acc.apply_visual_accommodations("")

    def test_apply_auditory_defaults(self):
        """apply_auditory_accommodations returns AuditoryAccommodation."""
        from app.models.sensory_accommodator import (
            SensoryAccommodator, AuditoryAccommodation,
        )
        acc = SensoryAccommodator()
        result = acc.apply_auditory_accommodations(
            transcript="Hello world this is a test"
        )
        assert isinstance(result, AuditoryAccommodation)
        assert len(result.captions) > 0
        assert result.captions[0]["text"]

    def test_apply_auditory_visual_bell(self):
        """Visual bell adds indicator to changes."""
        from app.models.sensory_accommodator import SensoryAccommodator
        acc = SensoryAccommodator()
        result = acc.apply_auditory_accommodations(visual_bell=True)
        changes_text = " ".join(result.changes_applied)
        assert "visual" in changes_text.lower() or "bell" in changes_text.lower()

    def test_apply_motor_defaults(self):
        """apply_motor_accommodations with defaults enables targets + keyboard."""
        from app.models.sensory_accommodator import (
            SensoryAccommodator, MotorAccommodation,
        )
        acc = SensoryAccommodator()
        result = acc.apply_motor_accommodations()
        assert isinstance(result, MotorAccommodation)
        assert "--min-target-size" in result.css
        assert len(result.keyboard_shortcuts) > 0
        assert result.interaction_overrides.get("keyboard_nav_enabled") is True

    def test_apply_motor_dwell_click(self):
        """Dwell-click enables with given ms value."""
        from app.models.sensory_accommodator import SensoryAccommodator
        acc = SensoryAccommodator()
        result = acc.apply_motor_accommodations(dwell_click_ms=800)
        assert result.interaction_overrides["dwell_click_enabled"] is True
        assert result.interaction_overrides["dwell_click_duration_ms"] == 800

    def test_apply_motor_simplified_gestures(self):
        """Simplified gestures replaces multi-touch gestures."""
        from app.models.sensory_accommodator import SensoryAccommodator
        acc = SensoryAccommodator()
        result = acc.apply_motor_accommodations(simplified_gestures=True)
        assert result.interaction_overrides["simplified_gestures"] is True
        replacements = result.interaction_overrides.get("gesture_replacements", {})
        assert "pinch_zoom" in replacements

    def test_apply_all_combined(self):
        """apply_all combines visual + auditory + motor from profile."""
        from app.models.sensory_accommodator import (
            SensoryAccommodator, SensoryAccommodationResult,
        )
        acc = SensoryAccommodator()
        result = acc.apply_all(
            content="<p>Test content</p>",
            profile={
                "visual": {"contrast": "high", "font_scale": 1.5},
                "auditory": {"transcript": "Test transcript"},
                "motor": {"enlarged_targets": True},
            },
        )
        assert isinstance(result, SensoryAccommodationResult)
        assert result.visual is not None
        assert result.auditory is not None
        assert result.motor is not None
        assert len(result.accommodations_applied) > 0

    def test_apply_all_partial_profile(self):
        """apply_all with only visual section returns only visual."""
        from app.models.sensory_accommodator import SensoryAccommodator
        acc = SensoryAccommodator()
        result = acc.apply_all(
            content="<p>Visual only</p>",
            profile={"visual": {"contrast": "high"}},
        )
        assert result.visual is not None
        assert result.auditory is None
        assert result.motor is None

    def test_list_accommodations_catalogue(self):
        """list_accommodations returns the full catalogue."""
        from app.models.sensory_accommodator import SensoryAccommodator
        result = SensoryAccommodator.list_accommodations()
        assert "visual" in result
        assert "auditory" in result
        assert "motor" in result
        assert len(result["visual"]) >= 8
        assert len(result["auditory"]) >= 3
        assert len(result["motor"]) >= 4

    def test_generate_captions_timing(self):
        """_generate_captions produces timed blocks."""
        from app.models.sensory_accommodator import SensoryAccommodator
        captions = SensoryAccommodator._generate_captions(
            "one two three four five six seven eight nine ten",
            words_per_block=5,
        )
        assert len(captions) == 2
        assert captions[0]["start"] == 0.0
        assert captions[0]["end"] > 0
        assert captions[1]["start"] >= captions[0]["end"]

    def test_color_blind_palettes_have_all_modes(self):
        """COLOR_BLIND_PALETTES has entries for all four modes."""
        from app.models.sensory_accommodator import COLOR_BLIND_PALETTES
        assert "protanopia" in COLOR_BLIND_PALETTES
        assert "deuteranopia" in COLOR_BLIND_PALETTES
        assert "tritanopia" in COLOR_BLIND_PALETTES
        assert "achromatopsia" in COLOR_BLIND_PALETTES

    def test_default_keyboard_shortcuts_count(self):
        """DEFAULT_KEYBOARD_SHORTCUTS has at least 8 entries."""
        from app.models.sensory_accommodator import DEFAULT_KEYBOARD_SHORTCUTS
        assert len(DEFAULT_KEYBOARD_SHORTCUTS) >= 8


# ============================================================================
# API Endpoint Tests – Reading-Level Adaptation
# ============================================================================

class TestReadingLevelEndpoints:
    """Tests for /api/v1/adapt-reading-level and related endpoints."""

    def test_adapt_reading_level_with_lexile(self, client):
        """POST /adapt-reading-level with target_lexile returns adapted text."""
        response = client.post(
            "/api/v1/adapt-reading-level",
            json={
                "text": "The students demonstrated their comprehension.",
                "target_lexile": 500,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "text" in data
        assert "original_lexile" in data
        assert "adapted_lexile" in data
        assert "target_lexile" in data
        assert data["target_lexile"] == 500
        assert "within_comfort_zone" in data

    def test_adapt_reading_level_with_grade_band(self, client):
        """POST /adapt-reading-level with grade_band uses band midpoint."""
        response = client.post(
            "/api/v1/adapt-reading-level",
            json={
                "text": "Complex academic text needing adaptation.",
                "grade_band": "3-5",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["grade_band"] == "3-5"

    def test_adapt_reading_level_missing_target_returns_400(self, client):
        """POST /adapt-reading-level without target_lexile or grade_band returns 400."""
        response = client.post(
            "/api/v1/adapt-reading-level",
            json={"text": "Some text with no target."},
        )
        assert response.status_code == 400
        assert "required" in response.json()["detail"].lower()

    def test_adapt_reading_level_response_fields(self, client):
        """Response includes all expected fields."""
        response = client.post(
            "/api/v1/adapt-reading-level",
            json={"text": "Test", "target_lexile": 600},
        )
        assert response.status_code == 200
        data = response.json()
        expected_fields = [
            "text", "original_lexile", "adapted_lexile", "target_lexile",
            "grade_band", "changes_made", "word_count_original",
            "word_count_adapted", "sentences_split", "words_replaced",
            "within_comfort_zone",
        ]
        for f in expected_fields:
            assert f in data, f"Missing field: {f}"

    def test_estimate_lexile(self, client):
        """POST /estimate-lexile returns Lexile estimation."""
        response = client.post(
            "/api/v1/estimate-lexile",
            json={"text": "The cat sat on the mat."},
        )
        assert response.status_code == 200
        data = response.json()
        assert "lexile" in data
        assert "grade_band" in data
        assert "word_count" in data

    def test_estimate_lexile_response_fields(self, client):
        """Lexile estimation includes all expected fields."""
        response = client.post(
            "/api/v1/estimate-lexile",
            json={"text": "Some text to estimate."},
        )
        assert response.status_code == 200
        data = response.json()
        for f in ["lexile", "grade_band", "avg_sentence_length",
                   "avg_word_length", "complex_word_ratio", "word_count"]:
            assert f in data

    def test_grade_bands_listing(self, client):
        """GET /grade-bands returns all grade-band presets."""
        response = client.get("/api/v1/grade-bands")
        assert response.status_code == 200
        data = response.json()
        assert "grade_bands" in data
        bands = data["grade_bands"]
        assert "K-2" in bands
        assert "3-5" in bands
        assert "6-8" in bands
        assert "9-12" in bands


# ============================================================================
# API Endpoint Tests – Sensory Accommodations
# ============================================================================

class TestSensoryAccommodationEndpoints:
    """Tests for /api/v1/apply-sensory and /api/v1/accommodations."""

    def test_apply_sensory_full_profile(self, client):
        """POST /apply-sensory with full profile returns all accommodation types."""
        response = client.post(
            "/api/v1/apply-sensory",
            json={
                "content": "<p>Test content for accommodation</p>",
                "profile": {
                    "visual": {"contrast": "high", "font_scale": 1.5},
                    "auditory": {"transcript": "Audio transcript"},
                    "motor": {"enlarged_targets": True},
                },
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "accommodations_applied" in data
        assert "wcag_level" in data
        assert "visual" in data
        assert "auditory" in data
        assert "motor" in data

    def test_apply_sensory_visual_fields(self, client):
        """Visual accommodation response includes expected fields."""
        response = client.post(
            "/api/v1/apply-sensory",
            json={
                "content": "<p>Visual test</p>",
                "profile": {"visual": {"contrast": "high"}},
            },
        )
        assert response.status_code == 200
        data = response.json()
        if "visual" in data:
            visual = data["visual"]
            assert "html" in visual
            assert "css" in visual
            assert "contrast_level" in visual
            assert "font_scale" in visual

    def test_apply_sensory_auditory_fields(self, client):
        """Auditory accommodation response includes expected fields."""
        response = client.post(
            "/api/v1/apply-sensory",
            json={
                "content": "",
                "profile": {"auditory": {"transcript": "Test audio"}},
            },
        )
        assert response.status_code == 200
        data = response.json()
        if "auditory" in data:
            auditory = data["auditory"]
            assert "captions" in auditory
            assert "visual_indicators" in auditory
            assert "text_alternative" in auditory

    def test_apply_sensory_motor_fields(self, client):
        """Motor accommodation response includes expected fields."""
        response = client.post(
            "/api/v1/apply-sensory",
            json={
                "content": "",
                "profile": {"motor": {"enlarged_targets": True}},
            },
        )
        assert response.status_code == 200
        data = response.json()
        if "motor" in data:
            motor = data["motor"]
            assert "css" in motor
            assert "interaction_overrides" in motor
            assert "keyboard_shortcuts" in motor

    def test_list_accommodations(self, client):
        """GET /accommodations lists available accommodation types."""
        response = client.get("/api/v1/accommodations")
        assert response.status_code == 200
        data = response.json()
        assert "accommodations" in data
        acc = data["accommodations"]
        assert "visual" in acc
        assert "auditory" in acc
        assert "motor" in acc


# ============================================================================
# API Endpoint Tests – Alt-Text Batch
# ============================================================================

class TestAltTextBatchEndpoints:
    """Tests for /api/v1/alt-text/batch."""

    def test_batch_alt_text_success(self, client):
        """POST /alt-text/batch returns results for each URL."""
        response = client.post(
            "/api/v1/alt-text/batch",
            json={
                "image_urls": [
                    "https://example.com/photo1.png",
                    "https://example.com/photo2.jpg",
                ],
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        assert data["successful"] == 2
        assert len(data["results"]) == 2
        for r in data["results"]:
            assert "url" in r
            assert "short_description" in r
            assert "confidence" in r
            assert "needs_review" in r

    def test_batch_alt_text_with_confidence_threshold(self, client):
        """min_confidence filters results needing review."""
        response = client.post(
            "/api/v1/alt-text/batch",
            json={
                "image_urls": ["https://example.com/photo.png"],
                "min_confidence": 0.9,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "needs_review" in data

    def test_batch_alt_text_empty_list(self, client):
        """POST /alt-text/batch with empty list returns zero results."""
        response = client.post(
            "/api/v1/alt-text/batch",
            json={"image_urls": []},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0

    def test_batch_alt_text_response_fields(self, client):
        """Batch response includes total, successful, needs_review, results."""
        response = client.post(
            "/api/v1/alt-text/batch",
            json={"image_urls": ["https://example.com/img.jpg"]},
        )
        assert response.status_code == 200
        data = response.json()
        for f in ["total", "successful", "needs_review", "results"]:
            assert f in data


# ============================================================================
# Health Check – S14 Model Visibility
# ============================================================================

class TestHealthCheckS14:
    """Verify new models appear in health check."""

    def test_health_includes_reading_level_adapter(self, client):
        """Health check reports reading_level_adapter status."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["models_loaded"]["reading_level_adapter"] is True

    def test_health_includes_sensory_accommodator(self, client):
        """Health check reports sensory_accommodator status."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["models_loaded"]["sensory_accommodator"] is True


# ============================================================================
# Integration – End-to-End Pipeline
# ============================================================================

class TestIntegrationPipeline:
    """Integration tests for the full adaptation pipeline."""

    def test_estimate_then_adapt(self, client):
        """Pipeline: estimate Lexile → adapt to target."""
        # Step 1: estimate
        est_response = client.post(
            "/api/v1/estimate-lexile",
            json={"text": "Academic text to evaluate."},
        )
        assert est_response.status_code == 200

        # Step 2: adapt to a different level
        adapt_response = client.post(
            "/api/v1/adapt-reading-level",
            json={
                "text": "Academic text to evaluate.",
                "target_lexile": 300,
            },
        )
        assert adapt_response.status_code == 200
        assert "adapted_lexile" in adapt_response.json()

    def test_adapt_then_accommodate(self, client):
        """Pipeline: adapt reading level → apply sensory accommodations."""
        # Step 1: adapt
        adapt_response = client.post(
            "/api/v1/adapt-reading-level",
            json={"text": "Complex text.", "grade_band": "3-5"},
        )
        assert adapt_response.status_code == 200

        # Step 2: apply sensory to the adapted text
        adapted_text = adapt_response.json().get("text", "Adapted text")
        sensory_response = client.post(
            "/api/v1/apply-sensory",
            json={
                "content": f"<p>{adapted_text}</p>",
                "profile": {
                    "visual": {"contrast": "high", "dyslexia_font": True},
                },
            },
        )
        assert sensory_response.status_code == 200
        assert "visual" in sensory_response.json()
