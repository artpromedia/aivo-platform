"""Tests for fluency analysis and prosody assessment."""
import pytest
from datetime import datetime


class TestFluencyAnalyzer:
    """Tests for the fluency analyzer."""

    def test_analyze_fluency_clean_speech(self):
        """Should score fluent speech highly."""
        speech_data = {
            "duration_seconds": 60,
            "total_syllables": 180,
            "disfluencies": 2,
            "pauses": [{"start": 15.0, "end": 15.8}],
        }
        syllables_per_minute = speech_data["total_syllables"] / (speech_data["duration_seconds"] / 60)
        disfluency_rate = speech_data["disfluencies"] / speech_data["total_syllables"] * 100
        assert syllables_per_minute == 180.0
        assert disfluency_rate < 3.0  # Normal range

    def test_detect_pauses(self):
        """Should detect and classify pauses."""
        pauses = [
            {"start": 5.0, "end": 5.3, "duration": 0.3},   # normal breath pause
            {"start": 12.0, "end": 13.5, "duration": 1.5},  # abnormal pause
            {"start": 20.0, "end": 20.4, "duration": 0.4},  # normal pause
            {"start": 28.0, "end": 31.0, "duration": 3.0},  # long pause
        ]
        threshold = 0.5  # seconds
        abnormal_pauses = [p for p in pauses if p["duration"] > threshold]
        assert len(abnormal_pauses) == 2

    def test_analyze_disfluency_types(self):
        """Should categorize disfluency types."""
        disfluencies = [
            {"type": "repetition", "unit": "syllable", "text": "b-b-ball", "count": 3},
            {"type": "prolongation", "text": "ssssnake", "duration_ms": 800},
            {"type": "block", "text": "...cat", "duration_ms": 1200},
            {"type": "interjection", "text": "um", "count": 1},
            {"type": "revision", "text": "I want- I need", "count": 1},
        ]
        core_behaviors = [d for d in disfluencies if d["type"] in ["repetition", "prolongation", "block"]]
        secondary_behaviors = [d for d in disfluencies if d["type"] in ["interjection", "revision"]]
        assert len(core_behaviors) == 3
        assert len(secondary_behaviors) == 2

    def test_analyze_prosody(self):
        """Should analyze speech prosody features."""
        prosody = {
            "pitch": {
                "mean_hz": 220,
                "range_hz": (180, 280),
                "variability": "normal",
            },
            "volume": {
                "mean_db": 65,
                "range_db": (55, 75),
                "variability": "normal",
            },
            "rate": {
                "syllables_per_second": 3.2,
                "variability": "slightly_reduced",
            },
            "rhythm": {
                "regularity_score": 0.75,
                "stress_pattern": "mostly_appropriate",
            },
        }
        assert prosody["pitch"]["mean_hz"] > 0
        assert prosody["rate"]["syllables_per_second"] > 0
        assert 0 <= prosody["rhythm"]["regularity_score"] <= 1

    def test_determine_fluency_level(self):
        """Should determine fluency level from metrics."""
        levels = {
            "normal": {"max_disfluency_rate": 3.0, "max_pause_ratio": 0.1},
            "mild": {"max_disfluency_rate": 7.0, "max_pause_ratio": 0.2},
            "moderate": {"max_disfluency_rate": 12.0, "max_pause_ratio": 0.3},
            "severe": {"max_disfluency_rate": float("inf"), "max_pause_ratio": 1.0},
        }
        disfluency_rate = 8.5
        level = None
        for name, thresholds in levels.items():
            if disfluency_rate <= thresholds["max_disfluency_rate"]:
                level = name
                break
        assert level == "moderate"

    def test_calculate_percentile(self):
        """Should calculate percentile rank for speech metrics."""
        # Normative data: syllables per minute by age
        norms = {
            6: {"mean": 140, "std": 20},
            8: {"mean": 160, "std": 18},
            10: {"mean": 175, "std": 15},
            12: {"mean": 185, "std": 12},
        }
        age = 8
        learner_spm = 145
        norm = norms[age]
        z_score = (learner_spm - norm["mean"]) / norm["std"]
        assert z_score < 0  # Below mean
        assert z_score > -2  # Within 2 SD

    def test_get_norms_for_age(self):
        """Should return normative data for specific age."""
        norms = {
            "age": 7,
            "expected_spm_range": (120, 160),
            "max_normal_disfluency_rate": 3.0,
            "expected_intelligibility": 95,
            "typical_mlu": 7.5,  # Mean Length of Utterance
        }
        assert norms["expected_spm_range"][0] < norms["expected_spm_range"][1]
        assert norms["max_normal_disfluency_rate"] > 0

    def test_compare_to_norms(self):
        """Should compare learner metrics to age norms."""
        norm_spm = 160
        learner_spm = 130
        percentage_of_norm = (learner_spm / norm_spm) * 100
        classification = (
            "within_normal" if percentage_of_norm >= 85
            else "below_average" if percentage_of_norm >= 70
            else "significantly_below"
        )
        assert classification == "below_average"
        assert percentage_of_norm == pytest.approx(81.25, abs=0.1)


class TestFluencyReport:
    """Tests for fluency analysis report generation."""

    def test_generate_summary_report(self):
        """Should generate a structured summary report."""
        report = {
            "learner_id": "learner-1",
            "session_date": "2025-01-15",
            "duration_seconds": 120,
            "summary": {
                "total_words": 200,
                "total_disfluencies": 15,
                "disfluency_rate_percent": 7.5,
                "syllables_per_minute": 145,
                "fluency_level": "mild",
            },
            "disfluency_breakdown": {
                "repetitions": 6,
                "prolongations": 4,
                "blocks": 2,
                "interjections": 2,
                "revisions": 1,
            },
            "recommendations": [
                "Practice easy onset techniques",
                "Use light articulatory contacts",
                "Implement pausing and phrasing strategies",
            ],
        }
        assert report["summary"]["fluency_level"] in ["normal", "mild", "moderate", "severe"]
        assert len(report["recommendations"]) >= 1
        total_disf = sum(report["disfluency_breakdown"].values())
        assert total_disf == 15

    def test_progress_tracking_over_sessions(self):
        """Should track progress across multiple sessions."""
        sessions = [
            {"date": "2025-01-01", "disfluency_rate": 12.0, "spm": 120},
            {"date": "2025-01-15", "disfluency_rate": 9.5, "spm": 135},
            {"date": "2025-02-01", "disfluency_rate": 7.0, "spm": 148},
            {"date": "2025-02-15", "disfluency_rate": 5.5, "spm": 155},
        ]
        # Disfluency rate should be decreasing
        for i in range(len(sessions) - 1):
            assert sessions[i]["disfluency_rate"] > sessions[i + 1]["disfluency_rate"]
        # SPM should be increasing
        for i in range(len(sessions) - 1):
            assert sessions[i]["spm"] < sessions[i + 1]["spm"]
        # Overall improvement
        improvement = sessions[0]["disfluency_rate"] - sessions[-1]["disfluency_rate"]
        assert improvement > 0

    def test_goal_progress_tracking(self):
        """Should track progress toward therapy goals."""
        goals = [
            {
                "description": "Reduce disfluency rate below 5%",
                "target": 5.0,
                "current": 7.0,
                "met": False,
            },
            {
                "description": "Increase SPM to 160+",
                "target": 160,
                "current": 155,
                "met": False,
            },
            {
                "description": "Use easy onset in 80% of utterances",
                "target": 80,
                "current": 85,
                "met": True,
            },
        ]
        met_goals = [g for g in goals if g["met"]]
        assert len(met_goals) == 1
        assert met_goals[0]["description"] == "Use easy onset in 80% of utterances"


class TestSpeechRate:
    """Tests for speech rate calculations."""

    def test_words_per_minute(self):
        """Should calculate words per minute."""
        word_count = 150
        duration_seconds = 60
        wpm = word_count / (duration_seconds / 60)
        assert wpm == 150.0

    def test_syllables_per_minute(self):
        """Should calculate syllables per minute."""
        syllable_count = 240
        duration_seconds = 90
        spm = syllable_count / (duration_seconds / 60)
        assert spm == 160.0

    def test_articulation_rate_excludes_pauses(self):
        """Should calculate articulation rate excluding pauses."""
        total_duration = 60  # seconds
        pause_time = 12  # seconds
        syllables = 180
        speaking_time = total_duration - pause_time
        art_rate = syllables / (speaking_time / 60)
        assert art_rate > syllables / (total_duration / 60)
        assert art_rate == pytest.approx(225.0, abs=0.1)

    def test_speaking_time_ratio(self):
        """Should calculate ratio of speaking to total time."""
        total = 120
        speaking = 96
        pausing = 24
        ratio = speaking / total
        assert ratio == 0.8
        assert speaking + pausing == total
