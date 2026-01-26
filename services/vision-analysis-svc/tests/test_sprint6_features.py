"""
Tests for Sprint 6 Advanced Vision Features.

Tests cover:
- Drawing assessment
- Attention tracking
- Work comparison
- Multimodal fusion
- Integration adapters
- Performance utilities
"""

import asyncio
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import numpy as np
import pytest


# =============================================================================
# Test Fixtures
# =============================================================================


@pytest.fixture
def sample_image():
    """Create a sample test image."""
    # Create a simple 100x100 BGR image with some content
    image = np.ones((100, 100, 3), dtype=np.uint8) * 255
    # Add some shapes
    image[20:40, 20:40] = [0, 0, 255]  # Red square
    image[50:70, 50:70] = [0, 255, 0]  # Green square
    return image


@pytest.fixture
def sample_grayscale_image():
    """Create a sample grayscale test image."""
    image = np.ones((100, 100), dtype=np.uint8) * 255
    image[20:40, 20:40] = 0  # Black square
    return image


@pytest.fixture
def sample_drawing():
    """Create a sample drawing image for assessment."""
    image = np.ones((200, 200, 3), dtype=np.uint8) * 255
    # Draw some shapes to simulate a student drawing
    import cv2
    cv2.circle(image, (100, 100), 50, (0, 0, 0), 2)
    cv2.rectangle(image, (30, 30), (70, 70), (0, 0, 255), 2)
    cv2.line(image, (150, 50), (180, 150), (0, 255, 0), 2)
    return image


# =============================================================================
# Drawing Assessment Tests
# =============================================================================


class TestDrawingAssessor:
    """Tests for DrawingAssessor model."""

    def test_init(self):
        """Test DrawingAssessor initialization."""
        from app.models.drawing_assessment import (
            DrawingAssessor,
            DrawingAssessorConfig,
        )

        config = DrawingAssessorConfig(device="cpu", enable_ocr=False)
        assessor = DrawingAssessor(config)

        assert assessor is not None
        assert assessor.config.device == "cpu"
        assert assessor.config.enable_ocr is False

    def test_assess_drawing_basic(self, sample_drawing):
        """Test basic drawing assessment."""
        from app.models.drawing_assessment import DrawingAssessor

        assessor = DrawingAssessor()
        result = assessor.assess_drawing(sample_drawing)

        assert result is not None
        assert 0 <= result.overall_score <= 1
        assert isinstance(result.dimension_scores, dict)
        assert isinstance(result.detected_elements, list)
        assert isinstance(result.feedback, str)
        assert result.processing_time_ms >= 0

    def test_assess_drawing_with_rubric(self, sample_drawing):
        """Test drawing assessment with custom rubric."""
        from app.models.drawing_assessment import (
            DrawingAssessor,
            DrawingRubric,
            DrawingCategory,
        )

        rubric = DrawingRubric(
            rubric_id="test_rubric",
            name="Test Rubric",
            category=DrawingCategory.ART,
            dimensions=["composition", "creativity"],
            required_elements=["circle", "square"],
        )

        assessor = DrawingAssessor()
        result = assessor.assess_drawing(sample_drawing, rubric=rubric)

        assert result is not None
        assert result.overall_score >= 0
        # Should detect missing elements if they're not found
        assert isinstance(result.missing_elements, list)

    def test_assess_science_diagram(self, sample_image):
        """Test science diagram assessment."""
        from app.models.drawing_assessment import DrawingAssessor

        assessor = DrawingAssessor()
        result = assessor.assess_drawing(
            sample_image,
            assignment_type="science_diagram"
        )

        assert result is not None
        assert result.overall_score >= 0

    def test_compare_to_reference(self, sample_drawing, sample_image):
        """Test drawing comparison to reference."""
        from app.models.drawing_assessment import DrawingAssessor

        assessor = DrawingAssessor()
        result = assessor.assess_drawing(
            sample_drawing,
            reference=sample_image
        )

        assert result is not None
        assert result.comparison_to_reference is not None
        assert 0 <= result.comparison_to_reference <= 1

    def test_detect_diagram_labels(self, sample_image):
        """Test label detection in diagrams."""
        from app.models.drawing_assessment import DrawingAssessor

        assessor = DrawingAssessor()
        # This test just checks the method exists and runs
        labels = assessor.detect_diagram_labels(sample_image)
        assert isinstance(labels, list)


# =============================================================================
# Attention Tracker Tests
# =============================================================================


class TestAttentionTracker:
    """Tests for AttentionTracker model."""

    def test_init(self):
        """Test AttentionTracker initialization."""
        from app.models.attention_tracker import (
            AttentionTracker,
            AttentionTrackerConfig,
        )

        config = AttentionTrackerConfig(
            privacy_mode="strict",
            local_only=True,
        )
        tracker = AttentionTracker(config)

        assert tracker is not None
        assert tracker.config.privacy_mode == "strict"
        assert tracker.config.local_only is True

    def test_start_session(self):
        """Test starting an attention tracking session."""
        from app.models.attention_tracker import AttentionTracker

        tracker = AttentionTracker()
        session = tracker.start_session("test_session_123")

        assert session is not None
        assert session.session_id == "test_session_123"
        assert session.start_time is not None
        assert session.total_frames == 0

    def test_process_frame(self, sample_image):
        """Test processing a single frame."""
        from app.models.attention_tracker import AttentionTracker

        tracker = AttentionTracker()
        tracker.start_session("test_session")

        metrics = tracker.process_frame(sample_image)

        assert metrics is not None
        assert 0 <= metrics.attention_score <= 1
        assert isinstance(metrics.gaze_on_screen, bool)
        assert isinstance(metrics.face_detected, bool)
        assert metrics.processing_time_ms >= 0

    def test_end_session(self, sample_image):
        """Test ending a session."""
        from app.models.attention_tracker import AttentionTracker

        tracker = AttentionTracker()
        tracker.start_session("test_session")

        # Process some frames
        for _ in range(5):
            tracker.process_frame(sample_image)

        session = tracker.end_session()

        assert session is not None
        assert session.end_time is not None
        assert session.total_frames == 5

    def test_aggregate_session(self):
        """Test aggregating metrics into session summary."""
        from app.models.attention_tracker import (
            AttentionTracker,
            AttentionMetrics,
        )

        tracker = AttentionTracker()

        # Create mock metrics
        metrics = [
            AttentionMetrics(
                timestamp=datetime.now(timezone.utc),
                attention_score=0.8,
                gaze_on_screen=True,
                face_detected=True,
                engagement_state="engaged",
            )
            for _ in range(10)
        ]

        summary = tracker.aggregate_session(metrics)

        assert summary is not None
        assert summary.total_duration_seconds >= 0
        assert 0 <= summary.attention_percentage <= 100
        assert isinstance(summary.recommendations, list)


# =============================================================================
# Work Comparator Tests
# =============================================================================


class TestWorkComparator:
    """Tests for WorkComparator model."""

    def test_init(self):
        """Test WorkComparator initialization."""
        from app.models.work_comparator import (
            WorkComparator,
            WorkComparatorConfig,
        )

        config = WorkComparatorConfig(
            plagiarism_threshold=0.9,
            enable_feature_matching=True,
        )
        comparator = WorkComparator(config)

        assert comparator is not None
        assert comparator.config.plagiarism_threshold == 0.9

    def test_compare_submissions_similarity(self, sample_image, sample_drawing):
        """Test comparing two submissions for similarity."""
        from app.models.work_comparator import WorkComparator

        comparator = WorkComparator()
        result = comparator.compare_submissions(
            sample_image,
            sample_drawing,
            comparison_type="similarity"
        )

        assert result is not None
        assert 0 <= result.similarity_score <= 1
        assert 0 <= result.structural_similarity <= 1
        assert isinstance(result.differences, list)
        assert isinstance(result.is_potential_copy, bool)
        assert result.processing_time_ms >= 0

    def test_compare_identical_images(self, sample_image):
        """Test comparing identical images."""
        from app.models.work_comparator import WorkComparator

        comparator = WorkComparator()
        result = comparator.compare_submissions(
            sample_image,
            sample_image.copy(),
            comparison_type="similarity"
        )

        assert result.similarity_score > 0.9
        assert result.structural_similarity > 0.9

    def test_plagiarism_detection(self, sample_image):
        """Test plagiarism detection."""
        from app.models.work_comparator import WorkComparator

        comparator = WorkComparator()

        # Same image should trigger plagiarism detection
        result = comparator.compare_submissions(
            sample_image,
            sample_image.copy(),
            comparison_type="plagiarism"
        )

        assert result.is_potential_copy is True
        assert result.copy_confidence > 0.9

    def test_track_progress(self, sample_image, sample_drawing):
        """Test progress tracking across submissions."""
        from app.models.work_comparator import WorkComparator

        comparator = WorkComparator()

        # Create a sequence of submissions
        submissions = [sample_image, sample_drawing, sample_image]
        timestamps = [
            datetime.now(timezone.utc),
            datetime.now(timezone.utc),
            datetime.now(timezone.utc),
        ]

        report = comparator.track_progress(submissions, timestamps)

        assert report is not None
        assert report.submissions_count == 3
        assert 0 <= report.improvement_score <= 1
        assert isinstance(report.metrics_over_time, dict)
        assert isinstance(report.notable_improvements, list)

    def test_compare_to_exemplar(self, sample_image, sample_drawing):
        """Test comparison to exemplar."""
        from app.models.work_comparator import WorkComparator

        comparator = WorkComparator()
        result = comparator.compare_to_exemplar(
            submission=sample_image,
            exemplar=sample_drawing
        )

        assert result is not None
        assert 0 <= result.similarity_to_exemplar <= 1
        assert isinstance(result.matching_elements, list)
        assert isinstance(result.missing_elements, list)
        assert isinstance(result.feedback, str)


# =============================================================================
# Multimodal Fusion Tests
# =============================================================================


class TestMultimodalFuser:
    """Tests for MultimodalFuser service."""

    def test_init(self):
        """Test MultimodalFuser initialization."""
        from app.services.multimodal_fusion import (
            MultimodalFuser,
            MultimodalFusionConfig,
        )

        config = MultimodalFusionConfig(
            fusion_strategy="attention",
            embedding_dim=256,
        )
        fuser = MultimodalFuser(config)

        assert fuser is not None
        assert fuser.config.fusion_strategy == "attention"
        assert fuser.config.embedding_dim == 256

    def test_fuse_image_only(self, sample_image):
        """Test fusion with image only."""
        from app.services.multimodal_fusion import (
            MultimodalFuser,
            MultimodalInput,
        )

        fuser = MultimodalFuser()
        inputs = MultimodalInput(image=sample_image)
        result = fuser.fuse(inputs)

        assert result is not None
        assert result.embedding is not None
        assert len(result.embedding) == fuser.config.embedding_dim
        assert "vision" in result.modality_weights
        assert result.confidence > 0

    def test_fuse_image_and_text(self, sample_image):
        """Test fusion with image and text."""
        from app.services.multimodal_fusion import (
            MultimodalFuser,
            MultimodalInput,
        )

        fuser = MultimodalFuser()
        inputs = MultimodalInput(
            image=sample_image,
            text="This is a test image with shapes."
        )
        result = fuser.fuse(inputs)

        assert result is not None
        assert "vision" in result.modality_weights
        assert "text" in result.modality_weights
        assert result.confidence > 0

    def test_fuse_document(self, sample_image):
        """Test document fusion."""
        from app.services.multimodal_fusion import MultimodalFuser

        fuser = MultimodalFuser()
        result = fuser.fuse_document(
            image=sample_image,
            ocr_result=None,
            math_result=None,
            diagram_result=None,
        )

        assert result is not None
        assert isinstance(result.content_blocks, list)
        assert isinstance(result.reading_order, list)
        assert isinstance(result.relationships, list)
        assert isinstance(result.unified_text, str)
        assert result.structure is not None

    def test_compute_similarity(self):
        """Test similarity computation."""
        from app.services.multimodal_fusion import MultimodalFuser

        fuser = MultimodalFuser()

        features1 = np.array([1.0, 0.0, 0.0])
        features2 = np.array([1.0, 0.0, 0.0])

        similarity = fuser.compute_similarity(features1, features2, metric="cosine")
        assert similarity == pytest.approx(1.0)

        features3 = np.array([0.0, 1.0, 0.0])
        similarity = fuser.compute_similarity(features1, features3, metric="cosine")
        assert similarity == pytest.approx(0.0)


# =============================================================================
# Integration Adapter Tests
# =============================================================================


class TestIntegrationAdapters:
    """Tests for integration adapters."""

    @pytest.mark.asyncio
    async def test_document_intelligence_adapter(self, sample_image):
        """Test document intelligence adapter."""
        from app.services.integration_adapters import DocumentIntelligenceAdapter

        # Create adapter without real models
        adapter = DocumentIntelligenceAdapter()

        result = await adapter.enhance_iep_processing(
            sample_image,
            document_id="test_doc"
        )

        assert result is not None
        assert result.document_id == "test_doc"
        assert result.original_image_hash is not None
        assert isinstance(result.structured_fields, dict)

    @pytest.mark.asyncio
    async def test_grading_engine_adapter(self, sample_image):
        """Test grading engine adapter."""
        from app.services.integration_adapters import GradingEngineAdapter

        adapter = GradingEngineAdapter()

        result = await adapter.process_handwritten_submission(
            sample_image,
            assignment_id="hw_123",
            student_id="student_456"
        )

        assert result is not None
        assert result.assignment_id == "hw_123"
        assert result.student_id == "student_456"
        assert isinstance(result.content_regions, list)

    @pytest.mark.asyncio
    async def test_training_service_adapter(self, sample_image):
        """Test training service adapter."""
        from app.services.integration_adapters import TrainingServiceAdapter

        adapter = TrainingServiceAdapter()

        labels = {
            "type": "ocr",
            "text_regions": [{"text": "test"}],
        }

        result = await adapter.generate_training_data(
            sample_image,
            labels,
            task_type="ocr"
        )

        assert result is not None
        assert result.task_type == "ocr"
        assert result.source_image_hash is not None
        assert isinstance(result.input_features, dict)

    def test_create_adapters_factory(self):
        """Test adapter factory function."""
        from app.services.integration_adapters import create_adapters

        adapters = create_adapters()

        assert "document_intelligence" in adapters
        assert "grading_engine" in adapters
        assert "training_service" in adapters


# =============================================================================
# Performance Utils Tests
# =============================================================================


class TestPerformanceUtils:
    """Tests for performance utilities."""

    def test_lru_cache(self):
        """Test LRU cache."""
        from app.services.performance_utils import LRUCache

        cache = LRUCache(max_size=3, ttl_seconds=60)

        # Test async operations
        async def test_cache():
            await cache.set("key1", "value1")
            result = await cache.get("key1")
            assert result == "value1"

            # Test miss
            result = await cache.get("missing", default="default")
            assert result == "default"

        asyncio.run(test_cache())

    def test_image_chunker(self, sample_image):
        """Test image chunker."""
        from app.services.performance_utils import ImageChunker

        chunker = ImageChunker(chunk_size=50, overlap=10)
        chunks = chunker.split_into_chunks(sample_image)

        assert len(chunks) > 1
        for chunk, offset in chunks:
            assert chunk.shape[0] <= 50
            assert chunk.shape[1] <= 50

    def test_batch_config(self):
        """Test batch configuration."""
        from app.services.performance_utils import BatchConfig

        config = BatchConfig(
            max_batch_size=16,
            max_wait_time_ms=200,
        )

        assert config.max_batch_size == 16
        assert config.max_wait_time_ms == 200

    def test_quantization_config(self):
        """Test quantization configuration."""
        from app.services.performance_utils import QuantizationConfig

        config = QuantizationConfig(
            quantization_type="int8",
            target_device="cpu",
        )

        assert config.quantization_type == "int8"
        assert config.target_device == "cpu"

    def test_factory_functions(self):
        """Test factory functions."""
        from app.services.performance_utils import (
            create_batch_processor,
            create_cache,
            create_chunker,
        )

        def dummy_process(batch, op):
            return [None] * len(batch)

        processor = create_batch_processor(dummy_process, max_batch_size=4)
        assert processor is not None
        assert processor.config.max_batch_size == 4

        cache = create_cache(max_size=50)
        assert cache is not None
        assert cache.max_size == 50

        chunker = create_chunker(chunk_size=256)
        assert chunker is not None
        assert chunker.chunk_size == 256


# =============================================================================
# API Schema Tests
# =============================================================================


class TestSchemas:
    """Tests for API request/response schemas."""

    def test_drawing_assess_request(self):
        """Test DrawingAssessRequest schema."""
        from app.schemas.requests import DrawingAssessRequest

        request = DrawingAssessRequest(
            image_base64="dGVzdA==",
            assignment_type="art",
        )

        assert request.image_base64 == "dGVzdA=="
        assert request.assignment_type == "art"
        assert request.rubric is None
        assert request.reference_image_base64 is None

    def test_attention_metrics_schema(self):
        """Test AttentionMetricsSchema."""
        from app.schemas.requests import AttentionMetricsSchema

        metrics = AttentionMetricsSchema(
            timestamp="2024-01-01T00:00:00Z",
            attention_score=0.8,
            gaze_on_screen=True,
            face_detected=True,
            engagement_state="engaged",
        )

        assert metrics.attention_score == 0.8
        assert metrics.gaze_on_screen is True
        assert metrics.engagement_state == "engaged"

    def test_compare_submissions_request(self):
        """Test CompareSubmissionsRequest schema."""
        from app.schemas.requests import CompareSubmissionsRequest

        request = CompareSubmissionsRequest(
            submission1_base64="dGVzdDE=",
            submission2_base64="dGVzdDI=",
            comparison_type="similarity",
        )

        assert request.submission1_base64 == "dGVzdDE="
        assert request.comparison_type == "similarity"

    def test_multimodal_analyze_request(self):
        """Test MultimodalAnalyzeRequest schema."""
        from app.schemas.requests import MultimodalAnalyzeRequest

        request = MultimodalAnalyzeRequest(
            image_base64="dGVzdA==",
            analysis_depth="standard",
            expected_content_types=["text", "math"],
        )

        assert request.analysis_depth == "standard"
        assert "text" in request.expected_content_types
        assert "math" in request.expected_content_types


# =============================================================================
# Run Tests
# =============================================================================


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
