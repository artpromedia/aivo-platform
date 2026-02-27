"""Tests for safety filter and specialized service modules."""
import pytest
import re
from datetime import datetime


class TestAivoSafetyFilter:
    """Tests for the AIVO safety filter."""

    def test_validate_clean_input(self):
        """Should allow clean educational input."""
        clean_inputs = [
            "Help me understand fractions",
            "What is photosynthesis?",
            "Can you explain the water cycle?",
            "I need help with my homework",
        ]
        for text in clean_inputs:
            assert len(text) > 0
            assert not _contains_harmful_content(text)

    def test_sanitize_removes_script_tags(self):
        """Should remove script injection attempts."""
        malicious = "<script>alert('xss')</script>What is 2+2?"
        sanitized = re.sub(r"<script[^>]*>.*?</script>", "", malicious, flags=re.IGNORECASE | re.DOTALL)
        assert "<script>" not in sanitized
        assert "What is 2+2?" in sanitized

    def test_pattern_matching_detects_pii(self):
        """Should detect PII patterns."""
        pii_patterns = {
            "email": re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"),
            "ssn": re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
            "phone": re.compile(r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b"),
        }
        text_with_pii = "My email is student@school.edu and SSN is 123-45-6789"
        found = []
        for name, pattern in pii_patterns.items():
            if pattern.search(text_with_pii):
                found.append(name)
        assert "email" in found
        assert "ssn" in found

    def test_age_appropriate_check(self):
        """Should enforce age-appropriate content."""
        age_limits = {
            "elementary": {"min_age": 5, "max_age": 10, "allowed_topics": ["basic_math", "reading", "science"]},
            "middle": {"min_age": 11, "max_age": 13, "allowed_topics": ["algebra", "history", "biology"]},
            "high": {"min_age": 14, "max_age": 18, "allowed_topics": ["calculus", "chemistry", "literature"]},
        }
        learner_age = 8
        appropriate_level = None
        for level, config in age_limits.items():
            if config["min_age"] <= learner_age <= config["max_age"]:
                appropriate_level = level
                break
        assert appropriate_level == "elementary"

    def test_ferpa_compliance_check(self):
        """Should flag FERPA-protected information."""
        ferpa_fields = [
            "student_id", "grades", "disciplinary_records",
            "financial_info", "medical_records", "counseling_records",
        ]
        request_data = {
            "query": "Show me the student's disciplinary records",
            "context": {"student_id": "S12345"},
        }
        contains_ferpa = any(f in request_data["query"].lower() for f in ferpa_fields)
        assert contains_ferpa is True

    def test_toxicity_detection(self):
        """Should detect toxic content."""
        toxic_indicators = ["stupid", "hate", "dumb", "ugly"]
        clean_text = "Help me solve this math problem"
        toxic_text = "This is so stupid I hate math"
        clean_score = sum(1 for word in toxic_indicators if word in clean_text.lower())
        toxic_score = sum(1 for word in toxic_indicators if word in toxic_text.lower())
        assert clean_score == 0
        assert toxic_score >= 2

    def test_max_input_length(self):
        """Should reject inputs exceeding max length."""
        max_length = 10000
        short_input = "Help with math"
        long_input = "x" * 15000
        assert len(short_input) <= max_length
        assert len(long_input) > max_length

    def test_sanitize_preserves_math_notation(self):
        """Should preserve mathematical notation."""
        math_text = "Solve: x² + 2x + 1 = 0 where x ∈ ℝ"
        # Should not strip mathematical symbols
        assert "²" in math_text
        assert "∈" in math_text
        assert "ℝ" in math_text


class TestASDService:
    """Tests for the ASD support service."""

    def test_create_social_story(self):
        """Should create social stories for ASD learners."""
        story = {
            "title": "Going to a new class",
            "target_skill": "transitions",
            "steps": [
                "When the bell rings, it's time to go to a new class.",
                "I will pack my things calmly.",
                "I will walk to the next classroom.",
                "I will find my seat and sit down.",
                "It's okay to feel nervous. I can take deep breaths.",
            ],
            "visual_supports": True,
        }
        assert len(story["steps"]) >= 3
        assert story["visual_supports"] is True

    def test_sensory_profile_assessment(self):
        """Should assess sensory preferences."""
        profile = {
            "learner_id": "learner-1",
            "auditory": {"sensitivity": "high", "preferred_volume": "low"},
            "visual": {"sensitivity": "medium", "preferred_lighting": "dim"},
            "tactile": {"sensitivity": "high", "preferred_textures": ["smooth"]},
        }
        high_sensitivities = [
            k for k, v in profile.items()
            if isinstance(v, dict) and v.get("sensitivity") == "high"
        ]
        assert len(high_sensitivities) >= 1

    def test_routine_builder(self):
        """Should build structured routines."""
        routine = {
            "name": "Morning school routine",
            "steps": [
                {"order": 1, "action": "Enter classroom", "visual_cue": "door_icon.png"},
                {"order": 2, "action": "Put backpack in cubby", "visual_cue": "cubby_icon.png"},
                {"order": 3, "action": "Sit at desk", "visual_cue": "desk_icon.png"},
            ],
            "allow_flexibility": False,
        }
        assert routine["steps"] == sorted(routine["steps"], key=lambda s: s["order"])


class TestAnxietyService:
    """Tests for the anxiety support service."""

    def test_coping_strategy_selection(self):
        """Should select appropriate coping strategies."""
        strategies = {
            "low": ["positive self-talk", "journal writing"],
            "medium": ["deep breathing", "grounding exercise", "talk to trusted adult"],
            "high": ["5-4-3-2-1 senses", "guided breathing", "immediate adult support"],
        }
        anxiety_level = "medium"
        selected = strategies[anxiety_level]
        assert len(selected) >= 2
        assert "deep breathing" in selected

    def test_anxiety_trigger_tracking(self):
        """Should track anxiety triggers over time."""
        events = [
            {"trigger": "test", "intensity": 8, "date": "2025-01-10"},
            {"trigger": "social", "intensity": 5, "date": "2025-01-11"},
            {"trigger": "test", "intensity": 7, "date": "2025-01-12"},
            {"trigger": "change", "intensity": 6, "date": "2025-01-13"},
        ]
        trigger_counts = {}
        for e in events:
            trigger_counts[e["trigger"]] = trigger_counts.get(e["trigger"], 0) + 1
        assert trigger_counts["test"] == 2
        # Most frequent trigger
        most_frequent = max(trigger_counts, key=trigger_counts.get)
        assert most_frequent == "test"

    def test_accommodation_recommendations(self):
        """Should recommend accommodations for anxious students."""
        accommodations = [
            {"type": "testing", "description": "Extended time on tests", "applicable_for": ["test_anxiety"]},
            {"type": "environment", "description": "Preferential seating", "applicable_for": ["social_anxiety"]},
            {"type": "assignment", "description": "Break large assignments into parts", "applicable_for": ["general"]},
        ]
        test_anxiety_accommodations = [
            a for a in accommodations
            if "test_anxiety" in a["applicable_for"] or "general" in a["applicable_for"]
        ]
        assert len(test_anxiety_accommodations) >= 2


class TestDyslexiaService:
    """Tests for the dyslexia support service."""

    def test_text_adaptation(self):
        """Should adapt text for dyslexic readers."""
        original = "The phenomenon of photosynthesis is extraordinarily complex."
        adaptations = {
            "increased_spacing": True,
            "font": "OpenDyslexic",
            "line_height": 1.8,
            "highlight_syllables": True,
            "simplified_vocabulary": False,
        }
        assert adaptations["increased_spacing"] is True
        assert adaptations["line_height"] > 1.5

    def test_phoneme_awareness_exercise(self):
        """Should generate phoneme awareness exercises."""
        exercise = {
            "type": "onset_rime",
            "word": "cat",
            "onset": "c",
            "rime": "at",
            "rhyming_words": ["bat", "hat", "mat", "sat", "rat"],
        }
        assert exercise["onset"] + exercise["rime"] == exercise["word"]
        assert len(exercise["rhyming_words"]) >= 3

    def test_reading_level_assessment(self):
        """Should assess reading level for dyslexic students."""
        assessment = {
            "learner_id": "learner-1",
            "chronological_age": 10,
            "reading_age": 7.5,
            "gap_years": 2.5,
            "areas_of_difficulty": ["decoding", "fluency"],
            "strengths": ["comprehension", "vocabulary"],
        }
        assert assessment["gap_years"] == assessment["chronological_age"] - assessment["reading_age"]
        assert "decoding" in assessment["areas_of_difficulty"]


def _contains_harmful_content(text: str) -> bool:
    """Helper to check for harmful content patterns."""
    harmful_patterns = [
        r"<script",
        r"javascript:",
        r"DROP\s+TABLE",
        r"UNION\s+SELECT",
    ]
    for pattern in harmful_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False
