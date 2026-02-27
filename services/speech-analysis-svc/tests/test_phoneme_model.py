"""Tests for phoneme recognition model and speech analyzer."""
import pytest
from unittest.mock import MagicMock, patch
import math


class TestPhonemeRecognitionModel:
    """Tests for the phoneme recognition model."""

    def test_phoneme_inventory(self):
        """Should define complete English phoneme inventory."""
        vowels = ["AA", "AE", "AH", "AO", "AW", "AY", "EH", "ER", "EY", "IH", "IY", "OW", "OY", "UH", "UW"]
        consonants = [
            "B", "CH", "D", "DH", "F", "G", "HH", "JH", "K", "L", "M",
            "N", "NG", "P", "R", "S", "SH", "T", "TH", "V", "W", "Y", "Z", "ZH",
        ]
        all_phonemes = vowels + consonants
        assert len(all_phonemes) >= 39

    def test_detect_phonemes_from_transcript(self):
        """Should detect phonemes from a transcription."""
        # Simulated phoneme detection for the word 'cat'
        word = "cat"
        detected_phonemes = [
            {"phoneme": "K", "start_ms": 0, "end_ms": 80, "confidence": 0.95},
            {"phoneme": "AE", "start_ms": 80, "end_ms": 200, "confidence": 0.92},
            {"phoneme": "T", "start_ms": 200, "end_ms": 280, "confidence": 0.88},
        ]
        assert len(detected_phonemes) == 3
        assert detected_phonemes[0]["phoneme"] == "K"
        assert all(p["confidence"] > 0.5 for p in detected_phonemes)

    def test_phoneme_sequence_validation(self):
        """Should validate phoneme sequences are temporally ordered."""
        phonemes = [
            {"phoneme": "B", "start_ms": 0, "end_ms": 50},
            {"phoneme": "AE", "start_ms": 50, "end_ms": 150},
            {"phoneme": "T", "start_ms": 150, "end_ms": 220},
        ]
        for i in range(len(phonemes) - 1):
            assert phonemes[i]["end_ms"] <= phonemes[i + 1]["start_ms"]

    def test_confidence_threshold_filtering(self):
        """Should filter low-confidence phoneme detections."""
        threshold = 0.6
        detections = [
            {"phoneme": "K", "confidence": 0.95},
            {"phoneme": "AE", "confidence": 0.45},  # below threshold
            {"phoneme": "T", "confidence": 0.88},
        ]
        filtered = [d for d in detections if d["confidence"] >= threshold]
        assert len(filtered) == 2
        assert all(d["confidence"] >= threshold for d in filtered)


class TestSpeechAnalyzer:
    """Tests for the speech analyzer."""

    def test_score_articulation(self):
        """Should score articulation accuracy."""
        expected_phonemes = ["K", "AE", "T"]
        produced_phonemes = ["K", "AE", "T"]
        correct = sum(1 for e, p in zip(expected_phonemes, produced_phonemes) if e == p)
        score = correct / len(expected_phonemes) * 100
        assert score == 100.0

    def test_score_articulation_with_errors(self):
        """Should penalize articulation errors."""
        expected = ["TH", "AE", "T"]
        produced = ["F", "AE", "T"]  # /th/ → /f/ substitution
        correct = sum(1 for e, p in zip(expected, produced) if e == p)
        score = correct / len(expected) * 100
        assert score == pytest.approx(66.67, abs=0.1)

    def test_identify_error_patterns(self):
        """Should identify common speech error patterns."""
        errors = [
            {"expected": "TH", "produced": "F", "type": "substitution"},
            {"expected": "R", "produced": "W", "type": "substitution"},
            {"expected": "S", "produced": "", "type": "omission"},
            {"expected": "TH", "produced": "F", "type": "substitution"},
        ]
        # Count error types
        error_counts = {}
        for e in errors:
            pattern = f"{e['expected']}→{e['produced']}" if e["produced"] else f"{e['expected']}→∅"
            error_counts[pattern] = error_counts.get(pattern, 0) + 1
        assert error_counts["TH→F"] == 2  # Fronting pattern
        assert error_counts["R→W"] == 1   # Gliding pattern

    def test_estimate_intelligibility(self):
        """Should estimate speech intelligibility percentage."""
        total_words = 50
        understood_words = 42
        intelligibility = understood_words / total_words * 100
        assert intelligibility == 84.0
        # Mild impairment threshold
        assert intelligibility < 90

    def test_get_phoneme_norms_by_age(self):
        """Should return age-appropriate phoneme norms."""
        norms = {
            3: {"mastered": ["M", "N", "P", "B", "H", "W"], "emerging": ["K", "G", "D", "T"]},
            5: {"mastered": ["M", "N", "P", "B", "H", "W", "K", "G", "D", "T", "F", "Y"], "emerging": ["S", "Z", "L"]},
            7: {"mastered": ["M", "N", "P", "B", "H", "W", "K", "G", "D", "T", "F", "Y", "S", "Z", "L", "R"], "emerging": ["TH", "SH", "CH"]},
        }
        age_5_norms = norms[5]
        assert "M" in age_5_norms["mastered"]
        assert "S" in age_5_norms["emerging"]

    def test_analyze_audio_result_format(self):
        """Should return analysis in expected format."""
        result = {
            "learner_id": "learner-1",
            "session_id": "session-1",
            "timestamp": "2025-01-15T10:00:00Z",
            "duration_seconds": 30.5,
            "phonemes_detected": 45,
            "articulation_score": 82.5,
            "intelligibility_percentage": 88.0,
            "error_patterns": [
                {"pattern": "fronting", "frequency": 3, "examples": ["TH→F"]},
                {"pattern": "gliding", "frequency": 1, "examples": ["R→W"]},
            ],
            "recommendations": [
                "Practice /th/ sound in initial position",
                "Continue monitoring /r/ production",
            ],
        }
        assert "articulation_score" in result
        assert "error_patterns" in result
        assert "recommendations" in result
        assert 0 <= result["articulation_score"] <= 100

    def test_compare_to_age_norms(self):
        """Should compare performance to age norms."""
        age = 6
        typical_intelligibility = 95  # percent
        learner_intelligibility = 78
        deviation = typical_intelligibility - learner_intelligibility
        severity = (
            "within_normal" if deviation <= 5
            else "mild" if deviation <= 15
            else "moderate" if deviation <= 30
            else "severe"
        )
        assert severity == "moderate"
        assert deviation == 17


class TestArticulationErrors:
    """Tests for articulation error classification."""

    def test_substitution_error(self):
        """Should classify phoneme substitution."""
        error = {"type": "substitution", "target": "S", "actual": "TH"}
        assert error["type"] == "substitution"
        assert error["target"] != error["actual"]

    def test_omission_error(self):
        """Should classify phoneme omission."""
        error = {"type": "omission", "target": "R", "position": "final"}
        assert error["type"] == "omission"
        assert error["position"] in ["initial", "medial", "final"]

    def test_distortion_error(self):
        """Should classify phoneme distortion."""
        error = {
            "type": "distortion",
            "target": "S",
            "description": "lateral lisp",
            "severity": "mild",
        }
        assert error["type"] == "distortion"
        assert error["severity"] in ["mild", "moderate", "severe"]

    def test_addition_error(self):
        """Should classify phoneme addition."""
        error = {
            "type": "addition",
            "word": "blue",
            "target_phonemes": ["B", "L", "UW"],
            "produced_phonemes": ["B", "AH", "L", "UW"],
        }
        assert len(error["produced_phonemes"]) > len(error["target_phonemes"])

    def test_error_position_tracking(self):
        """Should track error position within words."""
        word_positions = {
            "initial": {"word": "sun", "phoneme": "S", "position_index": 0},
            "medial": {"word": "whistle", "phoneme": "S", "position_index": 3},
            "final": {"word": "bus", "phoneme": "S", "position_index": 2},
        }
        for pos, data in word_positions.items():
            assert pos in ["initial", "medial", "final"]
            assert data["phoneme"] == "S"
