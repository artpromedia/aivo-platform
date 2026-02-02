"""
Comprehensive API tests for Speech Analysis Service.

Tests all endpoints with mocked analyzers.
"""

import sys
import pytest
import json
from unittest.mock import MagicMock, patch
from io import BytesIO

# Pre-patch modules before any imports
mock_modules = {
    "torch": MagicMock(),
    "torchaudio": MagicMock(),
    "whisper": MagicMock(),
    "librosa": MagicMock(),
    "soundfile": MagicMock(),
    "scipy": MagicMock(),
    "scipy.signal": MagicMock(),
    "scipy.io": MagicMock(),
    "scipy.io.wavfile": MagicMock(),
}

# Apply module patches
for mod_name, mock_mod in mock_modules.items():
    if mod_name not in sys.modules:
        sys.modules[mod_name] = mock_mod

from fastapi.testclient import TestClient


# =============================================================================
# Fixtures
# =============================================================================


@pytest.fixture
def mock_speech_assessment():
    """Create mock speech assessment result."""
    # Mock phoneme
    phoneme = MagicMock()
    phoneme.symbol = "s"
    phoneme.start_time = 0.1
    phoneme.end_time = 0.2
    phoneme.confidence = 0.95
    phoneme.accuracy_score = 0.92
    
    # Mock assessment
    assessment = MagicMock()
    assessment.phonemes_detected = [phoneme]
    assessment.overall_intelligibility = 0.88
    assessment.phoneme_accuracy = {"s": 0.92, "t": 0.98}
    assessment.error_patterns = ["fronting"]
    assessment.age_appropriate = True
    assessment.recommendations = ["Practice /s/ sound"]
    assessment.duration_seconds = 5.5
    assessment.words_per_minute = 120.0
    
    return assessment


@pytest.fixture
def mock_fluency_assessment():
    """Create mock fluency assessment result."""
    # Mock prosody features
    prosody = MagicMock()
    prosody.pitch_mean = 220.0
    prosody.pitch_std = 45.0
    prosody.pitch_range = 180.0
    prosody.energy_mean = 0.65
    prosody.energy_std = 0.12
    prosody.speech_rate = 4.5
    prosody.pause_rate = 8.0
    prosody.mean_pause_duration = 0.35
    prosody.intonation_contour = [200.0, 210.0, 220.0, 215.0, 205.0]
    
    # Mock error analysis
    errors = MagicMock()
    errors.substitutions = [{"expected": "cat", "actual": "hat"}]
    errors.omissions = ["the"]
    errors.insertions = []
    errors.repetitions = ["and"]
    errors.self_corrections = []
    
    # Mock segment
    segment = MagicMock()
    segment.start_time = 0.0
    segment.end_time = 5.0
    segment.words = ["The", "cat", "sat"]
    segment.wpm = 110.0
    segment.accuracy = 0.95
    segment.prosody_score = 3.2
    segment.pauses = [{"start": 1.5, "end": 1.7}]
    
    # Mock assessment
    assessment = MagicMock()
    assessment.words_per_minute = 95.0
    assessment.words_correct_per_minute = 90.0
    assessment.accuracy_rate = 0.95
    assessment.prosody_score = 3.0
    assessment.expression_score = 3.0
    assessment.phrasing_score = 3.0
    assessment.smoothness_score = 3.0
    assessment.pace_score = 3.0
    assessment.naep_level = 3
    assessment.naep_description = "Phrase reading with some expression"
    assessment.grade_level = 3
    assessment.percentile = 75
    assessment.benchmark_status = "at_benchmark"
    assessment.prosody_features = prosody
    assessment.error_analysis = errors
    assessment.segments = [segment]
    assessment.duration_seconds = 60.0
    assessment.total_words = 95
    assessment.words_correct = 90
    assessment.recommendations = ["Continue practicing expression"]
    
    return assessment


@pytest.fixture
def mock_speech_analyzer(mock_speech_assessment):
    """Create mock speech analyzer."""
    analyzer = MagicMock()
    analyzer.analyze_bytes.return_value = mock_speech_assessment
    analyzer.phonemes = ["p", "b", "t", "d", "k", "g", "s", "z", "m", "n"]
    analyzer.get_phoneme_norms.return_value = {
        "expected_mastered": ["p", "b", "m", "n"],
        "currently_developing": ["s", "z"],
        "later_developing": ["r", "th"],
    }
    return analyzer


@pytest.fixture
def mock_fluency_analyzer(mock_fluency_assessment):
    """Create mock fluency analyzer."""
    analyzer = MagicMock()
    analyzer.analyze_fluency.return_value = mock_fluency_assessment
    analyzer.get_grade_norms.return_value = {
        "10th": 50,
        "25th": 65,
        "50th": 80,
        "75th": 100,
        "90th": 120,
        "benchmark_below": 60,
        "benchmark_at": 80,
    }
    analyzer.compare_to_norms.return_value = {
        "percentile": 75,
        "benchmark_status": "at_benchmark",
        "norms": {"50th": 80},
    }
    return analyzer


@pytest.fixture
def sample_audio_content():
    """Create sample audio file bytes (WAV header)."""
    # Minimal WAV file header
    wav_header = b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00"
    wav_header += b"\x01\x00\x01\x00\x44\xac\x00\x00\x88\x58\x01\x00"
    wav_header += b"\x02\x00\x10\x00data\x00\x00\x00\x00"
    return wav_header


@pytest.fixture(scope="module")
def app_module():
    """Import app module once for all tests."""
    from app.main import app
    return app


@pytest.fixture
def client(app_module, mock_speech_analyzer, mock_fluency_analyzer):
    """Create test client with mocked services."""
    app_module.state.speech_analyzer = mock_speech_analyzer
    app_module.state.fluency_analyzer = mock_fluency_analyzer
    return TestClient(app_module)


# =============================================================================
# Test Classes
# =============================================================================


class TestHealthEndpoints:
    """Tests for health check endpoints."""
    
    def test_health_check(self, client):
        """Test basic health check."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "speech-analysis-svc"
    
    def test_readiness_check(self, client):
        """Test readiness endpoint."""
        response = client.get("/ready")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "details" in data
    
    def test_root_endpoint(self, client):
        """Test root endpoint info."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "Speech Analysis Service"
        assert "endpoints" in data


class TestSpeechAnalysis:
    """Tests for speech analysis endpoints."""
    
    def test_analyze_speech_success(self, client, sample_audio_content):
        """Test successful speech analysis."""
        files = {"file": ("test.wav", BytesIO(sample_audio_content), "audio/wav")}
        data = {"target_words": "cat,dog,ball", "learner_age": 6}
        
        response = client.post("/api/v1/analyze/speech", files=files, data=data)
        
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert "phonemes_detected" in result
        assert "overall_intelligibility" in result
        assert "error_patterns" in result
        assert "recommendations" in result
    
    def test_analyze_speech_invalid_file_type(self, client):
        """Test speech analysis with invalid file type."""
        files = {"file": ("test.txt", BytesIO(b"Not audio"), "text/plain")}
        data = {"learner_age": 6}
        
        response = client.post("/api/v1/analyze/speech", files=files, data=data)
        
        assert response.status_code == 400
    
    def test_analyze_speech_with_mp3(self, client, sample_audio_content):
        """Test speech analysis with MP3 file."""
        files = {"file": ("test.mp3", BytesIO(sample_audio_content), "audio/mpeg")}
        data = {"learner_age": 8}
        
        response = client.post("/api/v1/analyze/speech", files=files, data=data)
        
        assert response.status_code == 200
    
    def test_detect_phonemes(self, client, sample_audio_content):
        """Test phoneme detection endpoint."""
        files = {"file": ("test.wav", BytesIO(sample_audio_content), "audio/wav")}
        
        response = client.post("/api/v1/analyze/phonemes", files=files)
        
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert "phonemes" in result
        assert "duration_seconds" in result


class TestFluencyAnalysis:
    """Tests for fluency analysis endpoints."""
    
    def test_analyze_fluency_success(self, client, sample_audio_content):
        """Test successful fluency analysis."""
        files = {"file": ("reading.wav", BytesIO(sample_audio_content), "audio/wav")}
        data = {
            "reference_text": "The cat sat on the mat.",
            "grade_level": 3,
            "season": "spring",
        }
        
        response = client.post("/api/v1/fluency/analyze", files=files, data=data)
        
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert "words_per_minute" in result
        assert "words_correct_per_minute" in result
        assert "prosody_score" in result
        assert "naep_level" in result
    
    def test_analyze_fluency_invalid_file(self, client):
        """Test fluency analysis with invalid file type."""
        files = {"file": ("doc.pdf", BytesIO(b"%PDF-1.4"), "application/pdf")}
        data = {"reference_text": "Test text"}
        
        response = client.post("/api/v1/fluency/analyze", files=files, data=data)
        
        assert response.status_code == 400
    
    def test_analyze_fluency_invalid_grade(self, client, sample_audio_content):
        """Test fluency analysis with invalid grade level."""
        files = {"file": ("test.wav", BytesIO(sample_audio_content), "audio/wav")}
        data = {
            "reference_text": "Test text",
            "grade_level": 15,  # Invalid: should be 1-8
        }
        
        response = client.post("/api/v1/fluency/analyze", files=files, data=data)
        
        assert response.status_code == 400
        assert "1 and 8" in response.json()["detail"]
    
    def test_analyze_fluency_invalid_season(self, client, sample_audio_content):
        """Test fluency analysis with invalid season."""
        files = {"file": ("test.wav", BytesIO(sample_audio_content), "audio/wav")}
        data = {
            "reference_text": "Test text",
            "season": "summer",  # Invalid
        }
        
        response = client.post("/api/v1/fluency/analyze", files=files, data=data)
        
        assert response.status_code == 400


class TestFluencyNorms:
    """Tests for fluency norms endpoints."""
    
    def test_get_fluency_norms(self, client):
        """Test getting fluency norms for a grade."""
        response = client.get("/api/v1/fluency/norms/3?season=spring")
        
        assert response.status_code == 200
        result = response.json()
        assert result["grade"] == 3
        assert result["season"] == "spring"
        assert "wcpm_50th" in result
        assert "benchmark_at" in result
    
    def test_get_fluency_norms_invalid_grade(self, client):
        """Test fluency norms with invalid grade."""
        response = client.get("/api/v1/fluency/norms/0")
        
        assert response.status_code == 400
    
    def test_compare_to_norms(self, client):
        """Test norm comparison endpoint."""
        data = {"wcpm": 85.0, "grade": 3, "season": "spring"}
        
        response = client.post("/api/v1/fluency/compare", data=data)
        
        assert response.status_code == 200
        result = response.json()
        assert result["wcpm"] == 85.0
        assert "percentile" in result
        assert "benchmark_status" in result


class TestPhonemeNorms:
    """Tests for phoneme norms endpoints."""
    
    def test_get_phoneme_norms(self, client):
        """Test getting phoneme norms for an age."""
        response = client.get("/api/v1/norms/6")
        
        assert response.status_code == 200
        result = response.json()
        assert result["age"] == 6
        assert "expected_mastered" in result
        assert "currently_developing" in result
        assert "later_developing" in result
    
    def test_get_phoneme_norms_invalid_age(self, client):
        """Test phoneme norms with invalid age."""
        response = client.get("/api/v1/norms/1")  # Age must be 2-12
        
        assert response.status_code == 400
    
    def test_get_phoneme_norms_max_age(self, client):
        """Test phoneme norms at max age."""
        response = client.get("/api/v1/norms/12")
        
        assert response.status_code == 200


class TestPhonemeEndpoints:
    """Tests for phoneme information endpoints."""
    
    def test_list_phonemes(self, client):
        """Test listing all phonemes."""
        response = client.get("/api/v1/phonemes")
        
        assert response.status_code == 200
        result = response.json()
        assert "total" in result
        assert "phonemes" in result
        assert "categories" in result
        assert "plosives" in result["categories"]
    
    def test_list_error_patterns(self, client):
        """Test listing error patterns."""
        response = client.get("/api/v1/error-patterns")
        
        assert response.status_code == 200
        result = response.json()
        assert "patterns" in result
        patterns = result["patterns"]
        assert "fronting" in patterns
        assert "stopping" in patterns
        assert "gliding" in patterns


class TestNAEPScale:
    """Tests for NAEP scale endpoint."""
    
    def test_get_naep_scale(self, client):
        """Test getting NAEP scale descriptions."""
        response = client.get("/api/v1/fluency/naep-scale")
        
        assert response.status_code == 200
        result = response.json()
        assert result["scale"] == "NAEP Oral Reading Fluency Scale"
        assert "levels" in result
        levels = result["levels"]
        assert "1" in levels
        assert "4" in levels
        assert levels["4"]["name"] == "Level 4 - Fluent Reading"


class TestBatchProcessing:
    """Tests for batch processing endpoints."""
    
    def test_batch_speech_analysis(self, client, sample_audio_content):
        """Test batch speech analysis."""
        files = [
            ("files", ("test1.wav", BytesIO(sample_audio_content), "audio/wav")),
            ("files", ("test2.wav", BytesIO(sample_audio_content), "audio/wav")),
        ]
        data = {"learner_age": 6}
        
        response = client.post("/api/v1/analyze/batch", files=files, data=data)
        
        assert response.status_code == 200
        result = response.json()
        assert result["total"] == 2
        assert "successful" in result
        assert "results" in result
    
    def test_batch_speech_too_many_files(self, client, sample_audio_content):
        """Test batch speech analysis with too many files."""
        files = [
            ("files", (f"test{i}.wav", BytesIO(sample_audio_content), "audio/wav"))
            for i in range(12)  # Over the 10 file limit
        ]
        data = {"learner_age": 6}
        
        response = client.post("/api/v1/analyze/batch", files=files, data=data)
        
        assert response.status_code == 400
        assert "10 files" in response.json()["detail"]
    
    def test_batch_fluency_analysis(self, client, sample_audio_content):
        """Test batch fluency analysis."""
        files = [
            ("files", ("read1.wav", BytesIO(sample_audio_content), "audio/wav")),
            ("files", ("read2.wav", BytesIO(sample_audio_content), "audio/wav")),
        ]
        reference_texts = json.dumps(["Text one.", "Text two."])
        data = {"reference_texts": reference_texts, "grade_level": 3}
        
        response = client.post("/api/v1/fluency/batch", files=files, data=data)
        
        assert response.status_code == 200
        result = response.json()
        assert result["total"] == 2
        assert "aggregate" in result
    
    def test_batch_fluency_mismatched_texts(self, client, sample_audio_content):
        """Test batch fluency with mismatched text count."""
        files = [
            ("files", ("read1.wav", BytesIO(sample_audio_content), "audio/wav")),
            ("files", ("read2.wav", BytesIO(sample_audio_content), "audio/wav")),
        ]
        reference_texts = json.dumps(["Only one text."])  # 1 text, 2 files
        data = {"reference_texts": reference_texts}
        
        response = client.post("/api/v1/fluency/batch", files=files, data=data)
        
        assert response.status_code == 400
        assert "must match" in response.json()["detail"]


class TestErrorHandling:
    """Tests for error handling."""
    
    def test_large_file_rejection_speech(self, client):
        """Test file size limit for speech analysis."""
        # Create content larger than 50MB
        large_content = b"X" * (51 * 1024 * 1024)
        files = {"file": ("large.wav", BytesIO(large_content), "audio/wav")}
        data = {"learner_age": 6}
        
        response = client.post("/api/v1/analyze/speech", files=files, data=data)
        
        assert response.status_code == 400
        assert "50MB" in response.json()["detail"]
    
    def test_large_file_rejection_fluency(self, client):
        """Test file size limit for fluency analysis."""
        # Create content larger than 100MB
        large_content = b"X" * (101 * 1024 * 1024)
        files = {"file": ("large.wav", BytesIO(large_content), "audio/wav")}
        data = {"reference_text": "Test"}
        
        response = client.post("/api/v1/fluency/analyze", files=files, data=data)
        
        assert response.status_code == 400
        assert "100MB" in response.json()["detail"]


class TestIntegration:
    """Integration tests for end-to-end workflows."""
    
    def test_speech_analysis_workflow(self, client, sample_audio_content):
        """Test complete speech analysis workflow."""
        # 1. Get phoneme norms for child's age
        norms_response = client.get("/api/v1/norms/6")
        assert norms_response.status_code == 200
        norms = norms_response.json()
        
        # 2. Analyze speech sample
        files = {"file": ("speech.wav", BytesIO(sample_audio_content), "audio/wav")}
        data = {"target_words": "sun,sit,sock", "learner_age": 6}
        
        analysis_response = client.post("/api/v1/analyze/speech", files=files, data=data)
        assert analysis_response.status_code == 200
        
        analysis = analysis_response.json()
        assert analysis["success"] is True
        
        # 3. Get error patterns for context
        patterns_response = client.get("/api/v1/error-patterns")
        assert patterns_response.status_code == 200
    
    def test_fluency_assessment_workflow(self, client, sample_audio_content):
        """Test complete fluency assessment workflow."""
        # 1. Get grade norms first
        norms_response = client.get("/api/v1/fluency/norms/3?season=spring")
        assert norms_response.status_code == 200
        
        # 2. Analyze fluency
        files = {"file": ("reading.wav", BytesIO(sample_audio_content), "audio/wav")}
        data = {
            "reference_text": "The cat sat on the mat. It was a good cat.",
            "grade_level": 3,
            "season": "spring",
        }
        
        fluency_response = client.post("/api/v1/fluency/analyze", files=files, data=data)
        assert fluency_response.status_code == 200
        
        result = fluency_response.json()
        assert result["success"] is True
        assert result["naep_level"] >= 1
        assert result["naep_level"] <= 4
        
        # 3. Verify WCPM can be compared to norms
        compare_data = {
            "wcpm": result["words_correct_per_minute"],
            "grade": 3,
            "season": "spring",
        }
        compare_response = client.post("/api/v1/fluency/compare", data=compare_data)
        assert compare_response.status_code == 200
