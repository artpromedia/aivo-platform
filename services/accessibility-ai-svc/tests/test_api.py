"""
Tests for Accessibility AI Service API endpoints.

Comprehensive test suite covering:
- Health endpoints
- Speech-to-Text endpoints
- Text-to-Speech endpoints
- Alt-text generation endpoints
- Text simplification endpoints
- Reading assistance endpoints
- Profile management endpoints
"""
import pytest
from io import BytesIO
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient


# ============================================================================
# Health Endpoint Tests
# ============================================================================

class TestHealthEndpoints:
    """Tests for health check endpoints."""

    def test_health_returns_healthy(self, client):
        """Test health endpoint returns healthy status."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "accessibility-ai-svc"
        assert "models_loaded" in data

    def test_health_shows_models_loaded(self, client):
        """Test health shows model loading status."""
        response = client.get("/health")
        data = response.json()
        assert data["models_loaded"]["stt"] is True
        assert data["models_loaded"]["tts"] is True
        assert data["models_loaded"]["alt_text"] is True
        assert data["models_loaded"]["simplifier"] is True
        assert data["models_loaded"]["reading_assistant"] is True
        assert data["models_loaded"]["profile_manager"] is True

    def test_provider_health(self, client):
        """Test provider health endpoint."""
        response = client.get("/health/providers")
        assert response.status_code == 200
        data = response.json()
        assert "multi_provider_enabled" in data
        assert "providers" in data


# ============================================================================
# Speech-to-Text Endpoint Tests
# ============================================================================

class TestSTTEndpoints:
    """Tests for Speech-to-Text endpoints."""

    def test_transcribe_audio(self, client, sample_audio_file):
        """Test basic audio transcription."""
        response = client.post(
            "/api/v1/stt/transcribe",
            files={"audio": ("test.wav", BytesIO(sample_audio_file), "audio/wav")},
        )
        assert response.status_code == 200
        data = response.json()
        assert "text" in data
        assert "confidence" in data
        assert "language" in data
        assert "duration" in data
        assert "words" in data

    def test_transcribe_with_language(self, client, sample_audio_file):
        """Test transcription with specified language."""
        response = client.post(
            "/api/v1/stt/transcribe?language=es",
            files={"audio": ("test.wav", BytesIO(sample_audio_file), "audio/wav")},
        )
        assert response.status_code == 200

    def test_transcribe_empty_audio(self, client):
        """Test transcription with empty audio file."""
        response = client.post(
            "/api/v1/stt/transcribe",
            files={"audio": ("test.wav", BytesIO(b""), "audio/wav")},
        )
        # Empty file triggers error (may be 400 or 500 depending on where caught)
        assert response.status_code in [400, 500]

    def test_detect_language(self, client, sample_audio_file):
        """Test language detection."""
        response = client.post(
            "/api/v1/stt/detect-language",
            files={"audio": ("test.wav", BytesIO(sample_audio_file), "audio/wav")},
        )
        assert response.status_code == 200
        data = response.json()
        assert "language" in data
        assert "confidence" in data
        assert "alternatives" in data

    def test_detect_language_empty_audio(self, client):
        """Test language detection with empty audio."""
        response = client.post(
            "/api/v1/stt/detect-language",
            files={"audio": ("test.wav", BytesIO(b""), "audio/wav")},
        )
        # Empty file triggers error (may be 400 or 500 depending on where caught)
        assert response.status_code in [400, 500]

    def test_list_stt_languages(self, client):
        """Test listing supported languages."""
        response = client.get("/api/v1/stt/languages")
        assert response.status_code == 200
        data = response.json()
        assert "languages" in data
        assert isinstance(data["languages"], list)
        assert "en" in data["languages"]


# ============================================================================
# Text-to-Speech Endpoint Tests
# ============================================================================

class TestTTSEndpoints:
    """Tests for Text-to-Speech endpoints."""

    def test_synthesize_speech(self, client):
        """Test basic speech synthesis."""
        response = client.post(
            "/api/v1/tts/synthesize",
            json={"text": "Hello world", "voice": "default", "speed": 1.0},
        )
        assert response.status_code == 200
        assert response.headers["content-type"] == "audio/wav"
        assert "X-Duration" in response.headers
        assert "X-Sample-Rate" in response.headers

    def test_synthesize_with_speed(self, client):
        """Test synthesis with custom speed."""
        response = client.post(
            "/api/v1/tts/synthesize",
            json={"text": "Hello world", "speed": 1.5},
        )
        assert response.status_code == 200

    def test_synthesize_invalid_speed(self, client):
        """Test synthesis with invalid speed."""
        response = client.post(
            "/api/v1/tts/synthesize",
            json={"text": "Hello world", "speed": 5.0},  # Max is 4.0
        )
        assert response.status_code == 422

    def test_synthesize_metadata(self, client):
        """Test synthesis metadata endpoint."""
        response = client.post(
            "/api/v1/tts/synthesize-metadata",
            json={"text": "Hello world", "voice": "default", "speed": 1.0},
        )
        assert response.status_code == 200
        data = response.json()
        assert "format" in data
        assert "duration" in data
        assert "sample_rate" in data
        assert "audio_size_bytes" in data

    def test_list_voices(self, client):
        """Test listing available voices."""
        response = client.get("/api/v1/tts/voices")
        assert response.status_code == 200
        data = response.json()
        assert "voices" in data
        assert isinstance(data["voices"], list)

    def test_list_voices_by_language(self, client):
        """Test listing voices filtered by language."""
        response = client.get("/api/v1/tts/voices?language=en")
        assert response.status_code == 200
        data = response.json()
        assert "voices" in data


# ============================================================================
# Alt-Text Generation Endpoint Tests
# ============================================================================

class TestAltTextEndpoints:
    """Tests for Alt-Text generation endpoints."""

    def test_generate_alt_text(self, client, sample_image_file):
        """Test basic alt-text generation."""
        response = client.post(
            "/api/v1/alt-text/generate",
            files={"image": ("test.png", BytesIO(sample_image_file), "image/png")},
        )
        assert response.status_code == 200
        data = response.json()
        assert "short_description" in data
        assert "long_description" in data
        assert "educational_context" in data
        assert "image_type" in data
        assert "confidence" in data

    def test_generate_alt_text_with_context(self, client, sample_image_file):
        """Test alt-text generation with context."""
        response = client.post(
            "/api/v1/alt-text/generate?context=This%20is%20for%20a%20biology%20lesson",
            files={"image": ("test.png", BytesIO(sample_image_file), "image/png")},
        )
        assert response.status_code == 200

    def test_generate_alt_text_empty_image(self, client):
        """Test alt-text generation with empty image."""
        response = client.post(
            "/api/v1/alt-text/generate",
            files={"image": ("test.png", BytesIO(b""), "image/png")},
        )
        # Empty file triggers error (may be 400 or 500 depending on where caught)
        assert response.status_code in [400, 500]

    def test_describe_image(self, client, sample_image_file):
        """Test detailed image description."""
        response = client.post(
            "/api/v1/alt-text/describe?detail_level=high",
            files={"image": ("test.png", BytesIO(sample_image_file), "image/png")},
        )
        assert response.status_code == 200

    def test_extract_text_from_image(self, client, sample_image_file):
        """Test OCR text extraction."""
        response = client.post(
            "/api/v1/alt-text/extract-text?language=en",
            files={"image": ("test.png", BytesIO(sample_image_file), "image/png")},
        )
        assert response.status_code == 200
        data = response.json()
        assert "text" in data


# ============================================================================
# Text Simplification Endpoint Tests
# ============================================================================

class TestSimplificationEndpoints:
    """Tests for Text Simplification endpoints."""

    def test_simplify_text(self, client):
        """Test basic text simplification."""
        response = client.post(
            "/api/v1/simplify",
            json={
                "text": "The cat exhibited locomotion across the carpet.",
                "target_grade": 5,
                "preserve_meaning": True,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "text" in data
        assert "original_grade" in data
        assert "simplified_grade" in data
        assert "changes_made" in data

    def test_simplify_with_different_grades(self, client):
        """Test simplification for different grade levels."""
        for grade in [1, 5, 8, 12]:
            response = client.post(
                "/api/v1/simplify",
                json={"text": "Complex text here.", "target_grade": grade},
            )
            assert response.status_code == 200

    def test_simplify_invalid_grade(self, client):
        """Test simplification with invalid grade level."""
        response = client.post(
            "/api/v1/simplify",
            json={"text": "Some text.", "target_grade": 15},  # Max is 12
        )
        assert response.status_code == 422

    def test_explain_terms(self, client):
        """Test term explanation."""
        response = client.post(
            "/api/v1/simplify/explain-terms",
            json={
                "text": "Photosynthesis is important for plants.",
                "terms": ["photosynthesis"],
                "target_grade": 5,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "explanations" in data

    def test_get_readability_metrics(self, client):
        """Test readability metrics."""
        response = client.post(
            "/api/v1/simplify/readability",
            json={"text": "This is a sample text to analyze for readability metrics."},
        )
        assert response.status_code == 200
        data = response.json()
        assert "metrics" in data


# ============================================================================
# Reading Assistance Endpoint Tests
# ============================================================================

class TestReadingAssistanceEndpoints:
    """Tests for Reading Assistance endpoints."""

    def test_reading_assist(self, client):
        """Test basic reading assistance."""
        response = client.post(
            "/api/v1/reading/assist",
            json={"text": "The quick brown fox jumps over the lazy dog.", "profile": "dyslexia"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "html" in data
        assert "styles" in data
        assert "word_count" in data
        assert "estimated_reading_time" in data
        assert "chunks" in data

    def test_reading_assist_default_profile(self, client):
        """Test reading assistance with default profile."""
        response = client.post(
            "/api/v1/reading/assist",
            json={"text": "Some text to format."},
        )
        assert response.status_code == 200

    def test_highlight_important(self, client):
        """Test highlighting important words."""
        response = client.post(
            "/api/v1/reading/highlight",
            json={"text": "The cat and the mat are important."},
        )
        assert response.status_code == 200
        data = response.json()
        assert "html" in data
        assert "important_words" in data
        assert "highlight_count" in data

    def test_highlight_with_custom_words(self, client):
        """Test highlighting with custom words."""
        response = client.post(
            "/api/v1/reading/highlight",
            json={"text": "The cat sat on the mat.", "custom_words": ["cat", "mat"]},
        )
        assert response.status_code == 200

    def test_suggest_pace(self, client):
        """Test reading pace suggestions."""
        response = client.post(
            "/api/v1/reading/pace",
            json={"text": "A long text to analyze for reading pace."},
        )
        assert response.status_code == 200
        data = response.json()
        assert "words_per_minute" in data
        assert "suggested_breaks" in data
        assert "chunk_size" in data
        assert "estimated_total_time" in data

    def test_suggest_pace_with_profile(self, client):
        """Test reading pace with profile."""
        response = client.post(
            "/api/v1/reading/pace",
            json={"text": "Some text.", "profile": "dyslexia"},
        )
        assert response.status_code == 200

    def test_list_reading_profiles(self, client):
        """Test listing reading profiles."""
        response = client.get("/api/v1/reading/profiles")
        assert response.status_code == 200
        data = response.json()
        assert "profiles" in data
        assert isinstance(data["profiles"], list)


# ============================================================================
# Profile Management Endpoint Tests
# ============================================================================

class TestProfileEndpoints:
    """Tests for Profile Management endpoints."""

    def test_create_profile(self, client):
        """Test creating accessibility profile."""
        response = client.post(
            "/api/v1/profiles",
            json={
                "learner_id": "learner_001",
                "needs": [{"type": "dyslexia", "severity": "moderate"}],
                "visual_preferences": {"font_size": "large", "high_contrast": True},
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "learner_id" in data

    def test_create_profile_minimal(self, client):
        """Test creating profile with minimal data."""
        response = client.post(
            "/api/v1/profiles",
            json={"learner_id": "learner_002"},
        )
        assert response.status_code == 200

    def test_get_profile(self, client):
        """Test getting profile."""
        response = client.get("/api/v1/profiles/test_learner")
        assert response.status_code == 200
        data = response.json()
        assert "learner_id" in data

    def test_get_profile_not_found(self, client, mock_profile_manager):
        """Test getting non-existent profile."""
        mock_profile_manager.get_profile.return_value = None
        
        with patch('app.main.profile_manager', mock_profile_manager):
            from app.main import app
            test_client = TestClient(app)
            response = test_client.get("/api/v1/profiles/unknown_learner")
            assert response.status_code == 404

    def test_update_profile(self, client):
        """Test updating profile."""
        response = client.put(
            "/api/v1/profiles/test_learner",
            json={
                "visual_preferences": {"font_size": "extra_large"},
                "audio_preferences": {"speed": 0.8},
            },
        )
        assert response.status_code == 200

    def test_delete_profile(self, client):
        """Test deleting profile."""
        response = client.delete("/api/v1/profiles/test_learner")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "deleted"

    def test_delete_profile_not_found(self, client, mock_profile_manager):
        """Test deleting non-existent profile."""
        mock_profile_manager.delete_profile.return_value = False
        
        with patch('app.main.profile_manager', mock_profile_manager):
            from app.main import app
            test_client = TestClient(app)
            response = test_client.delete("/api/v1/profiles/unknown_learner")
            assert response.status_code == 404

    def test_get_recommendations(self, client):
        """Test getting recommendations."""
        response = client.get("/api/v1/profiles/test_learner/recommendations")
        assert response.status_code == 200
        data = response.json()
        assert "recommendations" in data

    def test_get_recommendations_with_needs(self, client):
        """Test getting recommendations with additional needs."""
        response = client.get("/api/v1/profiles/test_learner/recommendations?needs=dyslexia&needs=adhd")
        assert response.status_code == 200

    def test_list_available_needs(self, client):
        """Test listing available needs."""
        response = client.get("/api/v1/profiles/needs/available")
        assert response.status_code == 200
        data = response.json()
        assert "needs" in data
        assert isinstance(data["needs"], list)


# ============================================================================
# Multi-Provider (v2) Endpoint Tests
# ============================================================================

class TestMultiProviderEndpoints:
    """Tests for Multi-Provider resilient endpoints."""

    def test_v2_stt_transcribe_no_provider(self, client, sample_audio_file):
        """Test v2 transcription when multi-provider not available."""
        response = client.post(
            "/api/v2/stt/transcribe",
            files={"audio": ("test.wav", BytesIO(sample_audio_file), "audio/wav")},
        )
        assert response.status_code == 503
        assert "not available" in response.json()["detail"]

    def test_v2_tts_synthesize_no_provider(self, client):
        """Test v2 synthesis when multi-provider not available."""
        response = client.post(
            "/api/v2/tts/synthesize",
            json={"text": "Hello world"},
        )
        assert response.status_code == 503
        assert "not available" in response.json()["detail"]

    def test_v2_alt_text_no_provider(self, client, sample_image_file):
        """Test v2 alt-text when multi-provider not available."""
        response = client.post(
            "/api/v2/alt-text/generate",
            files={"image": ("test.png", BytesIO(sample_image_file), "image/png")},
        )
        assert response.status_code == 503

    def test_v2_extract_text_no_provider(self, client, sample_image_file):
        """Test v2 OCR when multi-provider not available."""
        response = client.post(
            "/api/v2/alt-text/extract-text",
            files={"image": ("test.png", BytesIO(sample_image_file), "image/png")},
        )
        assert response.status_code == 503


# ============================================================================
# Error Handling Tests
# ============================================================================

class TestErrorHandling:
    """Tests for error handling."""

    def test_missing_required_field(self, client):
        """Test missing required field in request."""
        response = client.post(
            "/api/v1/simplify",
            json={"target_grade": 5},  # Missing 'text' field
        )
        assert response.status_code == 422

    def test_invalid_json(self, client):
        """Test invalid JSON in request."""
        response = client.post(
            "/api/v1/simplify",
            content="invalid json",
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 422

    def test_engine_exception_handling(self, client, mock_stt_engine, sample_audio_file):
        """Test engine exception handling."""
        mock_stt_engine.transcribe.side_effect = Exception("Engine error")
        
        with patch('app.main.stt_engine', mock_stt_engine):
            from app.main import app
            test_client = TestClient(app)
            response = test_client.post(
                "/api/v1/stt/transcribe",
                files={"audio": ("test.wav", BytesIO(sample_audio_file), "audio/wav")},
            )
            assert response.status_code == 500
            assert "failed" in response.json()["detail"].lower()

    def test_validation_error_handling(self, client, mock_stt_engine, sample_audio_file):
        """Test validation error handling."""
        mock_stt_engine.transcribe.side_effect = ValueError("Invalid audio format")
        
        with patch('app.main.stt_engine', mock_stt_engine):
            from app.main import app
            test_client = TestClient(app)
            response = test_client.post(
                "/api/v1/stt/transcribe",
                files={"audio": ("test.wav", BytesIO(sample_audio_file), "audio/wav")},
            )
            assert response.status_code == 400


# ============================================================================
# Integration Tests
# ============================================================================

class TestIntegration:
    """Integration tests for complete workflows."""

    def test_accessibility_workflow(self, client, sample_audio_file, sample_image_file):
        """Test complete accessibility workflow."""
        # 1. Create profile
        profile_response = client.post(
            "/api/v1/profiles",
            json={
                "learner_id": "integration_learner",
                "needs": [{"type": "dyslexia"}],
                "visual_preferences": {"font_size": "large"},
            },
        )
        assert profile_response.status_code == 200
        
        # 2. Get reading assistance
        assist_response = client.post(
            "/api/v1/reading/assist",
            json={"text": "Complex text for reading.", "profile": "dyslexia"},
        )
        assert assist_response.status_code == 200
        
        # 3. Simplify text
        simplify_response = client.post(
            "/api/v1/simplify",
            json={"text": "Complex educational content.", "target_grade": 5},
        )
        assert simplify_response.status_code == 200
        
        # 4. Get recommendations
        rec_response = client.get("/api/v1/profiles/integration_learner/recommendations")
        assert rec_response.status_code == 200

    def test_multimodal_content_workflow(self, client, sample_audio_file, sample_image_file):
        """Test multimodal content processing workflow."""
        # 1. Transcribe audio
        transcribe_response = client.post(
            "/api/v1/stt/transcribe",
            files={"audio": ("test.wav", BytesIO(sample_audio_file), "audio/wav")},
        )
        assert transcribe_response.status_code == 200
        
        # 2. Generate alt-text for image
        alt_text_response = client.post(
            "/api/v1/alt-text/generate",
            files={"image": ("test.png", BytesIO(sample_image_file), "image/png")},
        )
        assert alt_text_response.status_code == 200
        
        # 3. Synthesize speech from text
        tts_response = client.post(
            "/api/v1/tts/synthesize",
            json={"text": "Synthesize this text to speech."},
        )
        assert tts_response.status_code == 200
