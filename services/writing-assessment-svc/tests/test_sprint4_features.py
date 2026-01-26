"""
Comprehensive Test Suite for Sprint 4 Advanced Writing Features.

Tests:
- ArgumentationDetector
- PlagiarismDetector
- DevelopmentalNorms
- Enhanced FeedbackGenerator
- Grading Integration
- API Endpoints
"""

import pytest
from datetime import datetime


# =============================================================================
# Test Data Fixtures
# =============================================================================


@pytest.fixture
def sample_argumentative_essay():
    """Sample argumentative essay for testing."""
    return """
I believe that schools should require students to wear uniforms. This is an
important policy that can benefit students in many ways.

First, uniforms reduce socioeconomic differences among students. When everyone
wears the same clothes, it is harder to tell who comes from wealthy families
and who comes from poorer families. According to a study by the National
Association of Elementary School Principals, 86% of school leaders said
uniforms make a significant positive impact on peer pressure.

Second, uniforms help students focus on learning rather than fashion. Without
the distraction of choosing outfits and comparing clothes with peers, students
can concentrate on their academic work. Research from the University of Houston
shows that attendance rates improved by 3.5% after implementing uniform policies.

Some might argue that uniforms restrict students' freedom of expression.
However, this argument overlooks the fact that students can still express
themselves through their choices in extracurricular activities, hairstyles,
and accessories. Furthermore, learning to dress professionally prepares
students for future careers where dress codes are common.

In conclusion, school uniforms provide significant benefits including reduced
peer pressure, improved focus, and preparation for professional life. Schools
should seriously consider implementing uniform policies.
"""


@pytest.fixture
def sample_narrative_essay():
    """Sample narrative essay for developmental norms testing."""
    return """
Last summer, my family took a trip to the Grand Canyon. It was the most
amazing experience of my life.

We drove for many hours to get there. When we finally arrived, I couldn't
believe my eyes. The canyon was so big and so beautiful. The colors of the
rocks changed as the sun moved across the sky.

My dad wanted us to hike down into the canyon. At first I was scared because
the trail looked very steep. But my mom said we could do it together. So we
started walking down the trail.

The hike was really hard. My legs were tired and it was hot. But every time
I wanted to give up, I looked at the amazing views and kept going. We stopped
to drink water and eat snacks.

When we reached the bottom, there was a little stream. I put my feet in the
cold water and it felt so good. We ate lunch and took lots of pictures.

The hike back up was even harder than going down. It took us a long time.
But when we finally made it to the top, I felt so proud of myself.

This trip taught me that I can do hard things if I don't give up. I will
always remember the Grand Canyon and how beautiful it was.
"""


@pytest.fixture
def plagiarism_test_texts():
    """Texts for plagiarism detection testing."""
    return {
        "original": """
Climate change is one of the most pressing challenges facing humanity today.
Global temperatures have risen significantly over the past century, leading to
melting ice caps, rising sea levels, and more frequent extreme weather events.
Scientists agree that human activities, particularly the burning of fossil fuels,
are the primary cause of this warming trend.
""",
        "modified": """
Climate change is one of the most important challenges facing humanity today.
Global temperatures have increased significantly over the past century, causing
melting ice caps, rising sea levels, and more frequent extreme weather events.
Scientists concur that human activities, especially the burning of fossil fuels,
are the main cause of this warming pattern.
""",
        "unrelated": """
The history of jazz music begins in the early 20th century in New Orleans.
African American communities created this unique genre by blending blues,
ragtime, and European harmonies. Notable early jazz musicians include Louis
Armstrong and Duke Ellington, who helped popularize the genre worldwide.
""",
    }


# =============================================================================
# ArgumentationDetector Tests
# =============================================================================


class TestArgumentationDetector:
    """Tests for ArgumentationDetector."""

    def test_initialization(self):
        """Test detector initialization."""
        from app.models.argumentation_detector import ArgumentationDetector

        detector = ArgumentationDetector()
        assert detector is not None

    def test_detect_claims(self, sample_argumentative_essay):
        """Test claim detection."""
        from app.models.argumentation_detector import ArgumentationDetector

        detector = ArgumentationDetector()
        structure = detector.detect_arguments(sample_argumentative_essay)

        assert len(structure.claims) > 0
        assert structure.major_claim is not None

    def test_detect_evidence(self, sample_argumentative_essay):
        """Test evidence detection."""
        from app.models.argumentation_detector import ArgumentationDetector

        detector = ArgumentationDetector()
        structure = detector.detect_arguments(sample_argumentative_essay)

        # Should find evidence (stats, research references)
        assert len(structure.evidence) > 0

    def test_detect_counterarguments(self, sample_argumentative_essay):
        """Test counterargument detection."""
        from app.models.argumentation_detector import ArgumentationDetector

        detector = ArgumentationDetector()
        structure = detector.detect_arguments(sample_argumentative_essay)

        # Essay contains "Some might argue that..."
        assert len(structure.counterarguments) > 0

    def test_argument_strength_score(self, sample_argumentative_essay):
        """Test argument strength scoring."""
        from app.models.argumentation_detector import ArgumentationDetector

        detector = ArgumentationDetector()
        structure = detector.detect_arguments(sample_argumentative_essay)

        # Well-structured essay should have decent strength
        assert 0 <= structure.argument_strength_score <= 1
        assert structure.argument_strength_score > 0.3

    def test_completeness_score(self, sample_argumentative_essay):
        """Test completeness scoring."""
        from app.models.argumentation_detector import ArgumentationDetector

        detector = ArgumentationDetector()
        structure = detector.detect_arguments(sample_argumentative_essay)

        assert 0 <= structure.completeness_score <= 1

    def test_missing_components(self):
        """Test missing components detection."""
        from app.models.argumentation_detector import ArgumentationDetector

        weak_essay = "This is a short essay without much argument."
        detector = ArgumentationDetector()
        structure = detector.detect_arguments(weak_essay)

        assert len(structure.missing_components) > 0

    def test_argument_graph(self, sample_argumentative_essay):
        """Test argument graph building."""
        from app.models.argumentation_detector import ArgumentationDetector

        detector = ArgumentationDetector()
        structure = detector.detect_arguments(sample_argumentative_essay)

        assert "nodes" in structure.argument_graph
        assert "edges" in structure.argument_graph

    def test_bio_tagging(self, sample_argumentative_essay):
        """Test BIO tag generation."""
        from app.models.argumentation_detector import ArgumentationDetector

        detector = ArgumentationDetector()
        bio_tags = detector.get_bio_tags(sample_argumentative_essay)

        assert len(bio_tags) > 0
        # Should have some B- and I- tags
        tags_only = [tag for _, tag in bio_tags]
        assert any(tag.startswith("B-") for tag in tags_only)

    def test_evaluate_argument_quality(self, sample_argumentative_essay):
        """Test argument quality evaluation."""
        from app.models.argumentation_detector import ArgumentationDetector

        detector = ArgumentationDetector()
        structure = detector.detect_arguments(sample_argumentative_essay)
        quality = detector.evaluate_argument_quality(structure)

        assert "overall_strength" in quality
        assert "claim_clarity" in quality
        assert "evidence_quality" in quality
        assert "reasoning_soundness" in quality


# =============================================================================
# PlagiarismDetector Tests
# =============================================================================


class TestPlagiarismDetector:
    """Tests for PlagiarismDetector."""

    def test_initialization(self):
        """Test detector initialization."""
        from app.models.plagiarism_detector import PlagiarismDetector

        detector = PlagiarismDetector()
        assert detector is not None

    def test_compute_fingerprint(self, plagiarism_test_texts):
        """Test document fingerprinting."""
        from app.models.plagiarism_detector import PlagiarismDetector

        detector = PlagiarismDetector()
        fp = detector.compute_fingerprint(plagiarism_test_texts["original"])

        assert isinstance(fp, set)
        assert len(fp) > 0

    def test_fingerprint_string(self, plagiarism_test_texts):
        """Test fingerprint string generation."""
        from app.models.plagiarism_detector import PlagiarismDetector

        detector = PlagiarismDetector()
        fp_str = detector.compute_fingerprint_string(plagiarism_test_texts["original"])

        assert isinstance(fp_str, str)
        assert len(fp_str) == 32  # SHA-256 truncated

    def test_similar_texts_detected(self, plagiarism_test_texts):
        """Test that similar texts are detected."""
        from app.models.plagiarism_detector import PlagiarismDetector

        detector = PlagiarismDetector()
        similarity = detector.semantic_similarity(
            plagiarism_test_texts["original"],
            plagiarism_test_texts["modified"]
        )

        # Similar texts should have high similarity
        assert similarity > 0.5

    def test_different_texts_not_flagged(self, plagiarism_test_texts):
        """Test that unrelated texts are not flagged."""
        from app.models.plagiarism_detector import PlagiarismDetector

        detector = PlagiarismDetector()
        similarity = detector.semantic_similarity(
            plagiarism_test_texts["original"],
            plagiarism_test_texts["unrelated"]
        )

        # Different texts should have low similarity
        assert similarity < 0.5

    def test_originality_check(self, plagiarism_test_texts):
        """Test originality check."""
        from app.models.plagiarism_detector import PlagiarismDetector

        detector = PlagiarismDetector()
        report = detector.check_originality(
            plagiarism_test_texts["original"],
            check_internal_consistency=True
        )

        assert 0 <= report.originality_score <= 1
        assert report.total_words > 0

    def test_style_consistency_analysis(self, sample_argumentative_essay):
        """Test style consistency analysis."""
        from app.models.plagiarism_detector import PlagiarismDetector

        detector = PlagiarismDetector()
        report = detector.check_originality(
            sample_argumentative_essay,
            check_internal_consistency=True
        )

        assert 0 <= report.style_consistency_score <= 1

    def test_compare_texts(self, plagiarism_test_texts):
        """Test text comparison."""
        from app.models.plagiarism_detector import PlagiarismDetector

        detector = PlagiarismDetector()
        comparison = detector.compare_texts(
            plagiarism_test_texts["original"],
            plagiarism_test_texts["modified"]
        )

        assert 0 <= comparison.overall_similarity <= 1
        assert "text1_preview" in str(comparison)

    def test_add_to_corpus(self, plagiarism_test_texts):
        """Test adding documents to corpus."""
        from app.models.plagiarism_detector import PlagiarismDetector

        detector = PlagiarismDetector()
        detector.add_to_corpus(
            plagiarism_test_texts["original"],
            source_id="test_doc_1",
            title="Test Document"
        )

        # Corpus should now contain the document
        assert "test_doc_1" in detector._corpus_fingerprints


# =============================================================================
# DevelopmentalNorms Tests
# =============================================================================


class TestDevelopmentalNorms:
    """Tests for DevelopmentalNorms."""

    def test_initialization(self):
        """Test norms initialization."""
        from app.models.developmental_norms import DevelopmentalNorms

        norms = DevelopmentalNorms()
        assert norms is not None

    def test_assess_grade_3(self, sample_narrative_essay):
        """Test assessment against grade 3 norms."""
        from app.models.developmental_norms import DevelopmentalNorms

        norms = DevelopmentalNorms()
        report = norms.assess_against_norms(sample_narrative_essay, grade=3)

        assert report.target_grade == 3
        assert 1 <= report.assessed_grade_level <= 12
        assert len(report.by_trait) > 0

    def test_assess_grade_8(self, sample_argumentative_essay):
        """Test assessment against grade 8 norms."""
        from app.models.developmental_norms import DevelopmentalNorms

        norms = DevelopmentalNorms()
        report = norms.assess_against_norms(sample_argumentative_essay, grade=8)

        assert report.target_grade == 8
        assert len(report.by_trait) > 0
        assert report.overall_development_level in [
            "Above Grade Level", "At Grade Level",
            "Approaching Grade Level", "Below Grade Level"
        ]

    def test_trait_assessments(self, sample_narrative_essay):
        """Test individual trait assessments."""
        from app.models.developmental_norms import DevelopmentalNorms

        norms = DevelopmentalNorms()
        report = norms.assess_against_norms(sample_narrative_essay, grade=5)

        # Check all traits are assessed
        expected_traits = ["ideas", "organization", "voice", "word_choice",
                          "sentence_fluency", "conventions"]
        for trait in expected_traits:
            assert trait in report.by_trait

        # Check trait structure
        for trait_name, trait_dev in report.by_trait.items():
            assert hasattr(trait_dev, "current_level")
            assert hasattr(trait_dev, "expected_level")
            assert hasattr(trait_dev, "on_track")

    def test_recommendations(self, sample_narrative_essay):
        """Test recommendation generation."""
        from app.models.developmental_norms import DevelopmentalNorms

        norms = DevelopmentalNorms()
        report = norms.assess_against_norms(sample_narrative_essay, grade=5)

        assert len(report.recommendations) > 0

    def test_next_milestone(self, sample_narrative_essay):
        """Test next milestone identification."""
        from app.models.developmental_norms import DevelopmentalNorms

        norms = DevelopmentalNorms()
        report = norms.assess_against_norms(sample_narrative_essay, grade=5)

        assert report.next_milestone != ""

    def test_grade_level_descriptions(self):
        """Test getting grade level descriptions."""
        from app.models.developmental_norms import DevelopmentalNorms

        norms = DevelopmentalNorms()
        descriptions = norms.get_grade_level_description(6)

        assert len(descriptions) > 0


# =============================================================================
# FeedbackGenerator Tests
# =============================================================================


class TestEnhancedFeedbackGenerator:
    """Tests for enhanced FeedbackGenerator."""

    def test_initialization(self):
        """Test generator initialization."""
        from app.services.feedback_generator import FeedbackGenerator

        generator = FeedbackGenerator()
        assert generator is not None

    def test_generate_encouraging_feedback(self):
        """Test encouraging feedback generation."""
        from app.services.feedback_generator import FeedbackGenerator

        generator = FeedbackGenerator()
        assessment = {
            "scores": {
                "overall": 75,
                "holistic": {"score": 4},
                "traits": {
                    "ideas": {"score": 3, "max_score": 4},
                    "organization": {"score": 3, "max_score": 4},
                },
            },
            "grammar_report": {"error_density": 2, "by_category": {}},
            "coherence_analysis": {"overall_score": 0.7},
            "style_report": {"word_variety_score": 0.6},
        }

        feedback = generator.generate(assessment, feedback_style="encouraging")

        assert feedback.summary != ""
        assert len(feedback.strengths) > 0

    def test_generate_neutral_feedback(self):
        """Test neutral feedback generation."""
        from app.services.feedback_generator import FeedbackGenerator

        generator = FeedbackGenerator()
        assessment = {
            "scores": {"overall": 50, "holistic": {"score": 3}},
            "grammar_report": {},
            "coherence_analysis": {},
            "style_report": {},
        }

        feedback = generator.generate(assessment, feedback_style="neutral")

        assert feedback.summary != ""

    def test_feedback_config(self):
        """Test feedback configuration."""
        from app.services.feedback_generator import (
            FeedbackConfig,
            FeedbackGenerator,
            FeedbackTone,
        )

        generator = FeedbackGenerator()
        config = FeedbackConfig(
            tone=FeedbackTone.CHALLENGING,
            max_suggestions=3,
            grade_level=10,
        )

        assessment = {"scores": {"overall": 80, "holistic": {"score": 4}}}
        feedback = generator.generate(assessment, config=config)

        assert len(feedback.specific_suggestions) <= 3

    def test_student_profile_integration(self):
        """Test student profile integration."""
        from app.services.feedback_generator import (
            FeedbackGenerator,
            StudentProfile,
        )

        generator = FeedbackGenerator()
        profile = StudentProfile(
            student_id="test123",
            grade_level=7,
            previous_scores=[60, 65, 70],
            known_strengths=["vocabulary"],
            known_weaknesses=["organization"],
            learning_goals=["improve essay structure"],
        )

        assessment = {"scores": {"overall": 75, "holistic": {"score": 4}}}
        feedback = generator.generate(
            assessment,
            student_profile=profile,
        )

        assert feedback.summary != ""

    def test_growth_mindset_message(self):
        """Test growth mindset message inclusion."""
        from app.services.feedback_generator import FeedbackGenerator

        generator = FeedbackGenerator()
        assessment = {"scores": {"overall": 50, "holistic": {"score": 3}}}

        feedback = generator.generate(assessment)

        assert feedback.growth_mindset_message != ""

    def test_2_to_1_praise_ratio(self):
        """Test 2:1 praise to critique ratio."""
        from app.services.feedback_generator import FeedbackGenerator

        generator = FeedbackGenerator()
        assessment = {
            "scores": {
                "overall": 60,
                "holistic": {"score": 3},
                "traits": {
                    "ideas": {"score": 2, "max_score": 4},  # Weak
                    "organization": {"score": 1, "max_score": 4},  # Very weak
                },
            },
            "grammar_report": {"error_density": 5, "by_category": {"spelling": 5}},
            "coherence_analysis": {
                "overall_score": 0.4,
                "global_coherence": {"has_clear_intro": False, "has_clear_conclusion": False},
            },
            "style_report": {"word_variety_score": 0.3},
        }

        feedback = generator.generate(assessment)

        # Should have at least 2x strengths as improvements
        assert len(feedback.strengths) >= len(feedback.areas_for_improvement)


# =============================================================================
# GradingIntegration Tests
# =============================================================================


class TestGradingIntegration:
    """Tests for grading engine integration."""

    @pytest.mark.asyncio
    async def test_enhance_grading_response(self):
        """Test grading response enhancement."""
        from app.services.grading_integration import GradingIntegrationService

        service = GradingIntegrationService()

        grading_result = {
            "submission_id": "test123",
            "score": 85,
            "feedback": "Good work",
        }

        writing_assessment = {
            "holistic_score": {"score": 4},
            "trait_scores": {
                "traits": {
                    "ideas": {"score": 3.5},
                    "organization": {"score": 3.0},
                },
            },
            "readability_profile": {
                "flesch_kincaid_grade": 8.5,
                "flesch_reading_ease": 65,
                "average_grade_level": 8.0,
            },
            "coherence_analysis": {"overall_score": 0.75},
            "grammar_report": {
                "total_errors": 3,
                "error_density": 1.5,
                "by_category": {"spelling": 2, "grammar": 1},
            },
        }

        enhanced = await service.enhance_grading_response(
            grading_result,
            writing_assessment
        )

        assert "submission_id" in enhanced
        assert "trait_breakdown" in enhanced
        assert "readability_metrics" in enhanced
        assert "coherence_score" in enhanced

    def test_compute_text_hash(self):
        """Test text hash computation."""
        from app.services.grading_integration import GradingIntegrationService

        service = GradingIntegrationService()

        text = "This is a sample text for testing."
        hash1 = service._compute_text_hash(text)
        hash2 = service._compute_text_hash(text)

        assert hash1 == hash2
        assert len(hash1) == 16


# =============================================================================
# CachingStrategy Tests
# =============================================================================


class TestCachingStrategy:
    """Tests for caching strategy."""

    def test_compute_key(self):
        """Test cache key computation."""
        from app.services.grading_integration import CachingStrategy

        strategy = CachingStrategy(enable_cache=False)

        text = "Sample text"
        key = strategy._compute_key(text, "test")

        assert key.startswith("test:")
        assert len(key) > 5


# =============================================================================
# API Schema Tests
# =============================================================================


class TestAPISchemas:
    """Tests for API schemas."""

    def test_argumentative_request_validation(self):
        """Test argumentative assessment request validation."""
        from app.schemas.requests import ArgumentativeAssessmentRequest

        # Valid request
        request = ArgumentativeAssessmentRequest(
            text="A" * 100,  # Meets min length
            prompt="Write about uniforms",
        )
        assert request.text is not None

        # Test validation
        with pytest.raises(ValueError):
            ArgumentativeAssessmentRequest(
                text="   ",  # Only whitespace
                prompt="Test prompt",
            )

    def test_originality_request_validation(self):
        """Test originality check request validation."""
        from app.schemas.requests import OriginalityCheckRequest

        request = OriginalityCheckRequest(
            text="A" * 100,
            check_internal_consistency=True,
        )
        assert request.check_internal_consistency is True

    def test_developmental_request_validation(self):
        """Test developmental assessment request validation."""
        from app.schemas.requests import DevelopmentalAssessRequest

        request = DevelopmentalAssessRequest(
            text="A" * 100,
            stated_grade=5,
        )
        assert request.stated_grade == 5

    def test_rubric_schema(self):
        """Test rubric schema validation."""
        from app.schemas.requests import (
            RubricCriterionSchema,
            RubricSchema,
            RubricType,
        )

        rubric = RubricSchema(
            rubric_id="test_rubric",
            name="Test Rubric",
            rubric_type=RubricType.ANALYTIC,
            criteria=[
                RubricCriterionSchema(
                    name="content",
                    description="Content quality",
                    weight=1.0,
                ),
            ],
        )
        assert rubric.rubric_id == "test_rubric"

    def test_student_profile_schema(self):
        """Test student profile schema."""
        from app.schemas.requests import StudentProfileSchema

        profile = StudentProfileSchema(
            student_id="student123",
            grade_level=7,
            previous_scores=[75.0, 80.0],
            known_strengths=["vocabulary"],
            learning_goals=["improve organization"],
        )
        assert profile.grade_level == 7

    def test_feedback_config_schema(self):
        """Test feedback configuration schema."""
        from app.schemas.requests import FeedbackConfigSchema

        config = FeedbackConfigSchema(
            tone="encouraging",
            detail_level="moderate",
            max_suggestions=5,
        )
        assert config.max_suggestions == 5


# =============================================================================
# Integration Tests
# =============================================================================


class TestEndToEndIntegration:
    """End-to-end integration tests."""

    def test_full_argumentative_analysis(self, sample_argumentative_essay):
        """Test full argumentative analysis pipeline."""
        from app.models.argumentation_detector import ArgumentationDetector
        from app.services.feedback_generator import FeedbackGenerator

        # Detect arguments
        detector = ArgumentationDetector()
        structure = detector.detect_arguments(sample_argumentative_essay)
        quality = detector.evaluate_argument_quality(structure)

        # Generate feedback
        generator = FeedbackGenerator()
        assessment = {
            "scores": {"overall": quality["overall_strength"] * 100},
            "argumentation": {
                "argument_strength_score": quality["overall_strength"],
                "missing_components": structure.missing_components,
            },
        }
        feedback = generator.generate(assessment)

        assert structure.argument_strength_score > 0
        assert feedback.summary != ""

    def test_full_originality_analysis(self, plagiarism_test_texts):
        """Test full originality analysis pipeline."""
        from app.models.plagiarism_detector import PlagiarismDetector

        detector = PlagiarismDetector()

        # Add original to corpus
        detector.add_to_corpus(
            plagiarism_test_texts["original"],
            source_id="original",
            title="Original Essay"
        )

        # Check modified version
        report = detector.check_originality(
            plagiarism_test_texts["modified"],
            check_internal_consistency=True
        )

        # Check unrelated text
        unrelated_report = detector.check_originality(
            plagiarism_test_texts["unrelated"],
            check_internal_consistency=True
        )

        # Modified should have lower originality than unrelated
        assert report.originality_score < unrelated_report.originality_score

    def test_full_developmental_assessment(self, sample_narrative_essay):
        """Test full developmental assessment pipeline."""
        from app.models.developmental_norms import DevelopmentalNorms
        from app.services.feedback_generator import FeedbackGenerator

        # Assess against norms
        norms = DevelopmentalNorms()
        report = norms.assess_against_norms(sample_narrative_essay, grade=5)

        # Generate feedback based on norms
        generator = FeedbackGenerator()
        assessment = {
            "scores": {
                "overall": report.percentile_estimate,
                "traits": {
                    trait: {"score": dev.grade_level_gap + 2, "max_score": 4}
                    for trait, dev in report.by_trait.items()
                },
            },
        }
        feedback = generator.generate(assessment, grade_level=5)

        assert report.assessed_grade_level >= 1
        assert feedback.summary != ""


# =============================================================================
# Performance Tests
# =============================================================================


class TestPerformance:
    """Performance tests."""

    def test_argumentation_detection_speed(self, sample_argumentative_essay):
        """Test that argumentation detection completes in reasonable time."""
        import time

        from app.models.argumentation_detector import ArgumentationDetector

        detector = ArgumentationDetector()

        start = time.time()
        detector.detect_arguments(sample_argumentative_essay)
        elapsed = time.time() - start

        # Should complete in under 2 seconds
        assert elapsed < 2.0

    def test_plagiarism_check_speed(self, sample_argumentative_essay):
        """Test that plagiarism check completes in reasonable time."""
        import time

        from app.models.plagiarism_detector import PlagiarismDetector

        detector = PlagiarismDetector()

        start = time.time()
        detector.check_originality(sample_argumentative_essay)
        elapsed = time.time() - start

        # Should complete in under 3 seconds
        assert elapsed < 3.0

    def test_developmental_assessment_speed(self, sample_narrative_essay):
        """Test that developmental assessment completes in reasonable time."""
        import time

        from app.models.developmental_norms import DevelopmentalNorms

        norms = DevelopmentalNorms()

        start = time.time()
        norms.assess_against_norms(sample_narrative_essay, grade=5)
        elapsed = time.time() - start

        # Should complete in under 1 second
        assert elapsed < 1.0
