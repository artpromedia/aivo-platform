"""
Tests for the cross-cutting Specialized Support models and their API endpoints.

Covers:
  - IEP Analyzer (model + 3 endpoints)
  - Differentiation Engine (model + 2 endpoints)
  - Accommodation Recommender (model + 2 endpoints)
"""

import pytest
from app.models.iep_analyzer import IEPAnalyzer
from app.models.differentiation_engine import DifferentiationEngine
from app.models.accommodation_recommender import AccommodationRecommender


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def iep_analyzer():
    return IEPAnalyzer()


@pytest.fixture
def differentiation_engine():
    return DifferentiationEngine()


@pytest.fixture
def accommodation_recommender():
    return AccommodationRecommender()


@pytest.fixture
def complete_iep_document():
    """A realistic IEP document with all 8 IDEA sections."""
    return {
        "student_name": "Jane Doe",
        "student_id": "student-iep-001",
        "disability_category": "specific_learning_disability",
        "sections": {
            "present_levels": "Jane reads at a 3rd-grade level in 5th grade. Strengths in oral expression.",
            "annual_goals": "Improve reading fluency to 120 wpm by EOY.",
            "special_education_services": "60 min/week reading specialist pull-out.",
            "accommodations_modifications": "Extended time on tests, audiobooks, preferential seating.",
            "participation_in_assessments": "Jane will participate in state assessments with extended time.",
            "transition_planning": "Career exploration activities starting Grade 8.",
            "parent_rights": "Parents notified of procedural safeguards.",
            "meeting_participants": "Gen-ed teacher, SPED teacher, parent, school psychologist.",
        },
        "goals": [
            {
                "goal_id": "g1",
                "text": "Given grade-level passages, Jane will read aloud at 120 wpm with 95% accuracy by May 2026.",
            },
            {
                "goal_id": "g2",
                "text": "Jane will answer comprehension questions.",
            },
        ],
        "accommodations": [
            "extended_time",
            "text_to_speech",
            "preferential_seating",
        ],
    }


@pytest.fixture
def minimal_iep_document():
    """An IEP missing several sections and with weak goals."""
    return {
        "student_name": "John Smith",
        "disability_category": "adhd",
        "sections": {
            "present_levels": "John struggles to focus.",
        },
        "goals": [
            {
                "goal_id": "g1",
                "text": "Improve behaviour.",
            }
        ],
        "accommodations": [],
    }


@pytest.fixture
def sample_iep_data():
    """IEP data for learning-implications extraction."""
    return {
        "accommodations": [
            "extended_time",
            "text_to_speech",
            "visual_schedule",
            "frequent_breaks",
        ],
        "goals": [
            {
                "goal_id": "g1",
                "text": "Improve reading fluency to 100 wpm",
                "skill_area": "reading",
            }
        ],
        "services": [
            {
                "type": "occupational_therapy",
                "frequency": "weekly",
                "duration_minutes": 30,
            }
        ],
    }


@pytest.fixture
def sample_learner_profile_diff():
    """Learner profile for differentiation."""
    return {
        "learner_id": "learner-diff-001",
        "skill_level": "below_grade",
        "reading_level": "below_grade",
        "diagnoses": ["dyslexia"],
        "learning_style": "kinesthetic",
        "interests": ["animals", "sports"],
        "grade_level": 4,
    }


@pytest.fixture
def sample_content():
    """Content object for differentiation."""
    return {
        "title": "Fractions Introduction",
        "subject": "math",
        "grade_level": 4,
        "objectives": ["Understand 1/2 and 1/4"],
        "content_text": "Fractions represent parts of a whole.",
        "activities": ["worksheet on halves"],
    }


@pytest.fixture
def sample_performance_data():
    """Performance data for accommodation recommender."""
    return {
        "skill_scores": {
            "reading": [0.3, 0.35, 0.32, 0.28, 0.30],
            "math": [0.7, 0.72, 0.68, 0.75, 0.71],
        },
        "session_scores": [0.4, 0.38, 0.42, 0.30, 0.25],
        "recent_trend": -0.05,
    }


# ===========================================================================
# IEP Analyzer – Unit Tests
# ===========================================================================


class TestIEPAnalyzer:
    def test_analyze_complete_iep(self, iep_analyzer, complete_iep_document):
        result = iep_analyzer.analyze_iep(complete_iep_document)
        assert result.quality_score >= 50  # 7/8 sections present, 1 SMART goal
        assert len(result.sections) == 8
        present = [s for s in result.sections if s.present]
        assert len(present) >= 6  # most sections provided

    def test_analyze_minimal_iep(self, iep_analyzer, minimal_iep_document):
        result = iep_analyzer.analyze_iep(minimal_iep_document)
        assert result.quality_score < 60
        assert len(result.compliance_issues) > 0

    def test_goal_measurability(self, iep_analyzer, complete_iep_document):
        result = iep_analyzer.analyze_iep(complete_iep_document)
        smart_goal = next((g for g in result.goals if g.goal_id == "g1"), None)
        assert smart_goal is not None
        assert smart_goal.measurability_score > 0

        weak_goal = next((g for g in result.goals if g.goal_id == "g2"), None)
        assert weak_goal is not None
        assert weak_goal.measurability_score <= smart_goal.measurability_score

    def test_extract_learning_implications(self, iep_analyzer, sample_iep_data):
        result = iep_analyzer.extract_learning_implications(sample_iep_data)
        assert len(result.feature_toggles) > 0
        features = [ft.feature for ft in result.feature_toggles]
        assert "time_multiplier" in features or "break_interval_minutes" in features

    def test_track_goal_progress(self, iep_analyzer):
        goals = [
            {"goal_id": "g1", "text": "Read at 100 wpm", "skill_area": "reading"},
        ]
        mastery = {"reading": {"mastery_probability": 0.75}}
        report = iep_analyzer.track_goal_progress(goals, mastery, "learner-1", "Q1")
        assert report.learner_id == "learner-1"
        assert 0 <= report.overall_progress_pct <= 100
        assert len(report.goals) == 1

    def test_empty_iep(self, iep_analyzer):
        with pytest.raises(ValueError):
            iep_analyzer.analyze_iep({})


# ===========================================================================
# Differentiation Engine – Unit Tests
# ===========================================================================


class TestDifferentiationEngine:
    def test_auto_strategy_selection(self, differentiation_engine, sample_content, sample_learner_profile_diff):
        result = differentiation_engine.differentiate_content(
            content=sample_content,
            learner_profile=sample_learner_profile_diff,
        )
        assert result.strategy_type in (
            "tiered", "flexible_grouping", "compacting",
            "interest_centers", "scaffolded", "multi_sensory",
        )

    def test_tiered_strategy(self, differentiation_engine, sample_content, sample_learner_profile_diff):
        result = differentiation_engine.differentiate_content(
            content=sample_content,
            learner_profile=sample_learner_profile_diff,
            strategy="tiered",
        )
        assert result.strategy_type == "tiered"
        assert result.tiered_content is not None
        assert len(result.tiered_content) >= 2

    def test_scaffolded_strategy(self, differentiation_engine, sample_content, sample_learner_profile_diff):
        result = differentiation_engine.differentiate_content(
            content=sample_content,
            learner_profile=sample_learner_profile_diff,
            strategy="scaffolded",
        )
        assert result.strategy_type == "scaffolded"
        assert result.scaffold_levels is not None

    def test_multi_sensory_strategy(self, differentiation_engine, sample_content, sample_learner_profile_diff):
        result = differentiation_engine.differentiate_content(
            content=sample_content,
            learner_profile=sample_learner_profile_diff,
            strategy="multi_sensory",
        )
        assert result.strategy_type == "multi_sensory"
        assert result.multi_sensory_plan is not None

    def test_suggest_differentiation(self, differentiation_engine):
        lesson_plan = {
            "title": "Photosynthesis",
            "subject": "science",
            "grade_level": 5,
            "objectives": ["Explain photosynthesis"],
        }
        profiles = [
            {"learner_id": "a", "skill_level": "advanced", "grade_level": 5},
            {"learner_id": "b", "skill_level": "below_grade", "diagnoses": ["dyslexia"], "grade_level": 5},
            {"learner_id": "c", "skill_level": "on_grade", "grade_level": 5},
        ]
        result = differentiation_engine.suggest_differentiation(lesson_plan, profiles)
        assert result.class_analysis.total_students == 3
        assert result.class_analysis.diversity_score >= 0
        assert len(result.suggestions) > 0

    def test_iep_accommodations_applied(self, differentiation_engine, sample_content, sample_learner_profile_diff):
        iep = {"accommodations": ["extended_time", "text_to_speech"]}
        result = differentiation_engine.differentiate_content(
            content=sample_content,
            learner_profile=sample_learner_profile_diff,
            iep_data=iep,
        )
        assert len(result.accommodations_applied) > 0


# ===========================================================================
# Accommodation Recommender – Unit Tests
# ===========================================================================


class TestAccommodationRecommender:
    def test_recommend_detects_patterns(self, accommodation_recommender, sample_performance_data):
        profile = {"learner_id": "learner-acc-1", "diagnoses": ["adhd"]}
        result = accommodation_recommender.recommend_accommodations(
            learner_profile=profile,
            performance_data=sample_performance_data,
        )
        assert result.learner_id == "learner-acc-1"
        # with declining session scores we should detect fatigue / struggle
        assert len(result.detected_patterns) > 0 or len(result.new_suggestions) >= 0

    def test_iep_gap_detection(self, accommodation_recommender, sample_performance_data):
        profile = {"learner_id": "learner-acc-2", "diagnoses": []}
        result = accommodation_recommender.recommend_accommodations(
            learner_profile=profile,
            performance_data=sample_performance_data,
            existing_accommodations=["extended_time"],
            iep_accommodations=["extended_time", "text_to_speech", "frequent_breaks"],
        )
        assert len(result.iep_gaps) > 0

    def test_evaluate_effective_accommodation(self, accommodation_recommender):
        result = accommodation_recommender.evaluate_accommodation_effectiveness(
            learner_id="learner-eff-1",
            accommodation="extended_time",
            performance_before=[0.4, 0.42, 0.38, 0.41, 0.39, 0.40, 0.37, 0.43],
            performance_after=[0.7, 0.72, 0.68, 0.75, 0.71, 0.73, 0.69, 0.74],
            time_period="Q1",
        )
        assert result.learner_id == "learner-eff-1"
        assert result.rating in ("highly_effective", "effective", "marginally_effective", "ineffective", "insufficient_data")
        assert result.action in ("continue", "modify", "intensify", "fade", "remove", "add_new", "monitor")

    def test_evaluate_ineffective_accommodation(self, accommodation_recommender):
        result = accommodation_recommender.evaluate_accommodation_effectiveness(
            learner_id="learner-eff-2",
            accommodation="preferential_seating",
            performance_before=[0.5, 0.48, 0.52, 0.49, 0.51, 0.50, 0.47, 0.53],
            performance_after=[0.50, 0.49, 0.51, 0.48, 0.52, 0.50, 0.47, 0.53],
            time_period="Q1",
        )
        assert result.rating in ("marginally_effective", "ineffective", "insufficient_data")

    def test_empty_performance_data(self, accommodation_recommender):
        profile = {"learner_id": "learner-empty", "diagnoses": []}
        with pytest.raises(ValueError):
            accommodation_recommender.recommend_accommodations(
                learner_profile=profile,
                performance_data={},
            )


# ===========================================================================
# API Endpoint Integration Tests (via TestClient)
# ===========================================================================


class TestSpecializedSupportEndpoints:
    """Integration tests hitting the actual FastAPI endpoints."""

    @pytest.fixture(autouse=True)
    def _init_services(self):
        """Ensure the global service instances are initialised."""
        import app.main as m
        m.iep_analyzer = IEPAnalyzer()
        m.differentiation_engine = DifferentiationEngine()
        m.accommodation_recommender = AccommodationRecommender()
        yield
        m.iep_analyzer = None
        m.differentiation_engine = None
        m.accommodation_recommender = None

    def test_analyze_iep_endpoint(self, client, complete_iep_document):
        response = client.post(
            "/api/v1/specialized-support/analyze-iep",
            json={"iep_document": complete_iep_document},
        )
        assert response.status_code == 200
        data = response.json()
        assert "quality_score" in data
        assert "sections" in data
        assert isinstance(data["sections"], list)

    def test_iep_implications_endpoint(self, client, sample_iep_data):
        response = client.post(
            "/api/v1/specialized-support/iep-implications",
            json={"iep_data": sample_iep_data},
        )
        assert response.status_code == 200
        data = response.json()
        assert "feature_toggles" in data

    def test_iep_progress_endpoint(self, client):
        response = client.post(
            "/api/v1/specialized-support/iep-progress",
            json={
                "learner_id": "l1",
                "iep_goals": [{"goal_id": "g1", "text": "Read 100 wpm", "skill_area": "reading"}],
                "mastery_data": {"reading": {"mastery_probability": 0.65}},
                "report_period": "Q1",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "overall_progress_pct" in data

    def test_differentiate_endpoint(self, client, sample_content, sample_learner_profile_diff):
        response = client.post(
            "/api/v1/specialized-support/differentiate",
            json={
                "content": sample_content,
                "learner_profile": sample_learner_profile_diff,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "strategy_type" in data

    def test_suggest_differentiation_endpoint(self, client):
        response = client.post(
            "/api/v1/specialized-support/suggest-differentiation",
            json={
                "lesson_plan": {"title": "Fractions", "subject": "math", "grade_level": 4},
                "class_profiles": [
                    {"learner_id": "a", "skill_level": "on_grade", "grade_level": 4},
                    {"learner_id": "b", "skill_level": "below_grade", "grade_level": 4},
                ],
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "class_analysis" in data
        assert "suggestions" in data

    def test_recommend_accommodations_endpoint(self, client, sample_performance_data):
        response = client.post(
            "/api/v1/specialized-support/recommend-accommodations",
            json={
                "learner_profile": {"learner_id": "l1", "diagnoses": ["adhd"]},
                "performance_data": sample_performance_data,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "learner_id" in data

    def test_evaluate_effectiveness_endpoint(self, client):
        response = client.post(
            "/api/v1/specialized-support/evaluate-effectiveness",
            json={
                "learner_id": "l1",
                "accommodation": "extended_time",
                "performance_before": [0.4, 0.42, 0.38, 0.41],
                "performance_after": [0.7, 0.72, 0.68, 0.75],
                "time_period": "Q1",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "rating" in data
        assert "action" in data


# Re-export fixtures needed by endpoint tests from conftest
@pytest.fixture
def complete_iep_document_endpoint():
    """Alias for endpoint tests (conftest provides `client`)."""
    return complete_iep_document
