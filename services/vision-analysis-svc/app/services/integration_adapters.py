"""
Integration Adapters for Vision Analysis Service.

Provides adapters for integrating with other AIVO platform services:
- document-intelligence-svc: IEP document processing
- grading-engine: Handwritten submission processing
- training-svc: Training data generation

These adapters enable seamless communication and data transformation
between the vision analysis service and other platform services.
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional

import numpy as np

logger = logging.getLogger(__name__)


# =============================================================================
# Data Models for Integration
# =============================================================================


@dataclass
class ProcessedSubmission:
    """Processed handwritten submission ready for grading."""
    submission_id: str
    assignment_id: str
    student_id: Optional[str]
    extracted_text: str
    equations: List[Dict[str, Any]]
    diagrams: List[Dict[str, Any]]
    content_regions: List[Dict[str, Any]]
    quality_score: float
    processing_time_ms: int
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class EnhancedIEP:
    """Enhanced IEP document with extracted data."""
    document_id: str
    original_image_hash: str
    cleaned_image_base64: Optional[str]
    extracted_text: str
    handwritten_notes: List[Dict[str, Any]]
    diagrams: List[Dict[str, Any]]
    structured_fields: Dict[str, Any]
    confidence_scores: Dict[str, float]
    processing_time_ms: int


@dataclass
class TrainingExample:
    """Training example generated from annotated images."""
    example_id: str
    source_image_hash: str
    task_type: str  # ocr, math_detection, diagram_classification, etc.
    input_features: Dict[str, Any]
    labels: Dict[str, Any]
    quality_score: float
    augmentations_applied: List[str]
    metadata: Dict[str, Any] = field(default_factory=dict)


# =============================================================================
# Document Intelligence Integration
# =============================================================================


class DocumentIntelligenceAdapter:
    """
    Adapter for integrating with document-intelligence-svc.

    Provides enhanced document processing capabilities:
    - Scan and clean IEP document images
    - Extract handwritten notes
    - Process embedded diagrams/charts
    - Prepare data for final document intelligence processing

    Usage:
        adapter = DocumentIntelligenceAdapter(
            document_scanner=scanner,
            handwriting_recognizer=recognizer,
            diagram_analyzer=analyzer,
        )
        enhanced = await adapter.enhance_iep_processing(image)
    """

    def __init__(
        self,
        document_scanner=None,
        handwriting_recognizer=None,
        diagram_analyzer=None,
        math_detector=None,
    ):
        """Initialize with vision analysis components."""
        self.document_scanner = document_scanner
        self.handwriting_recognizer = handwriting_recognizer
        self.diagram_analyzer = diagram_analyzer
        self.math_detector = math_detector

    async def enhance_iep_processing(
        self,
        iep_image: np.ndarray,
        document_id: Optional[str] = None,
    ) -> EnhancedIEP:
        """
        Use vision service to enhance IEP document processing.

        Steps:
        1. Scan and clean document image
        2. Extract handwritten notes
        3. Process any diagrams/charts
        4. Prepare structured data for document-intelligence-svc

        Args:
            iep_image: Raw IEP document image
            document_id: Optional document identifier

        Returns:
            EnhancedIEP with all extracted data
        """
        import time
        import hashlib

        start_time = time.time()
        doc_id = document_id or f"iep_{int(time.time())}"

        # Calculate image hash for tracking
        image_hash = hashlib.md5(iep_image.tobytes()).hexdigest()[:16]

        # Step 1: Clean/enhance the document image
        cleaned_image_b64 = None
        if self.document_scanner:
            try:
                scan_result = self.document_scanner.scan(iep_image, auto_enhance=True)
                cleaned_image = scan_result.processed_image
                # Convert to base64 for transmission
                import base64
                import cv2
                _, buffer = cv2.imencode('.png', cleaned_image)
                cleaned_image_b64 = base64.b64encode(buffer).decode('utf-8')
            except Exception as e:
                logger.warning(f"Document scanning failed: {e}")
                cleaned_image = iep_image
        else:
            cleaned_image = iep_image

        # Step 2: Extract handwritten notes
        handwritten_notes = []
        extracted_text = ""
        confidence_scores = {}

        if self.handwriting_recognizer:
            try:
                hw_result = self.handwriting_recognizer.recognize_with_positions(cleaned_image)
                extracted_text = hw_result.full_text
                confidence_scores["handwriting"] = hw_result.average_confidence

                for line in hw_result.lines:
                    handwritten_notes.append({
                        "text": line.text,
                        "confidence": line.confidence,
                        "position": {
                            "x": line.bounding_box.x,
                            "y": line.bounding_box.y,
                            "width": line.bounding_box.width,
                            "height": line.bounding_box.height,
                        }
                    })
            except Exception as e:
                logger.warning(f"Handwriting recognition failed: {e}")

        # Step 3: Process diagrams/charts
        diagrams = []
        if self.diagram_analyzer:
            try:
                diagram_result = self.diagram_analyzer.analyze(cleaned_image)
                if diagram_result.diagram_type.value != "unknown":
                    diagrams.append({
                        "type": diagram_result.diagram_type.value,
                        "description": diagram_result.description,
                        "confidence": diagram_result.confidence,
                        "data_points": [
                            {"label": dp.label, "value": dp.value}
                            for dp in diagram_result.data_points
                        ]
                    })
                    confidence_scores["diagram"] = diagram_result.confidence
            except Exception as e:
                logger.warning(f"Diagram analysis failed: {e}")

        # Step 4: Extract structured fields from text
        structured_fields = self._extract_iep_fields(extracted_text)

        elapsed_ms = int((time.time() - start_time) * 1000)

        return EnhancedIEP(
            document_id=doc_id,
            original_image_hash=image_hash,
            cleaned_image_base64=cleaned_image_b64,
            extracted_text=extracted_text,
            handwritten_notes=handwritten_notes,
            diagrams=diagrams,
            structured_fields=structured_fields,
            confidence_scores=confidence_scores,
            processing_time_ms=elapsed_ms,
        )

    def _extract_iep_fields(self, text: str) -> Dict[str, Any]:
        """Extract structured IEP fields from text."""
        fields = {}

        # Common IEP field patterns (simplified)
        patterns = {
            "student_name": r"(?:student|name)[:\s]+(.+?)(?:\n|$)",
            "date_of_birth": r"(?:dob|date of birth)[:\s]+(.+?)(?:\n|$)",
            "grade_level": r"(?:grade|grade level)[:\s]+(\d+)",
            "disability_category": r"(?:disability|category)[:\s]+(.+?)(?:\n|$)",
        }

        import re
        for field_name, pattern in patterns.items():
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                fields[field_name] = match.group(1).strip()

        return fields


# =============================================================================
# Grading Engine Integration
# =============================================================================


class GradingEngineAdapter:
    """
    Adapter for integrating with grading-engine service.

    Processes handwritten homework submissions:
    - OCR handwriting
    - Detect math equations
    - Identify diagrams
    - Package for grading-engine

    Usage:
        adapter = GradingEngineAdapter(
            handwriting_recognizer=recognizer,
            math_detector=detector,
            diagram_analyzer=analyzer,
        )
        submission = await adapter.process_handwritten_submission(image, "hw_123")
    """

    def __init__(
        self,
        handwriting_recognizer=None,
        math_detector=None,
        diagram_analyzer=None,
        drawing_assessor=None,
    ):
        """Initialize with vision analysis components."""
        self.handwriting_recognizer = handwriting_recognizer
        self.math_detector = math_detector
        self.diagram_analyzer = diagram_analyzer
        self.drawing_assessor = drawing_assessor

    async def process_handwritten_submission(
        self,
        image: np.ndarray,
        assignment_id: str,
        student_id: Optional[str] = None,
        assignment_type: str = "mixed",
    ) -> ProcessedSubmission:
        """
        Process handwritten homework for grading.

        Steps:
        1. OCR the handwriting
        2. Detect math equations
        3. Identify diagrams
        4. Package for grading-engine

        Args:
            image: Homework image
            assignment_id: Assignment identifier
            student_id: Optional student identifier
            assignment_type: Type of assignment (text, math, diagram, mixed)

        Returns:
            ProcessedSubmission ready for grading
        """
        import time

        start_time = time.time()
        submission_id = f"sub_{assignment_id}_{int(time.time())}"

        extracted_text = ""
        equations = []
        diagrams = []
        content_regions = []
        quality_score = 0.5

        # Extract text
        if self.handwriting_recognizer and assignment_type in ("text", "mixed"):
            try:
                hw_result = self.handwriting_recognizer.recognize_with_positions(image)
                extracted_text = hw_result.full_text
                quality_score = hw_result.average_confidence

                for line in hw_result.lines:
                    content_regions.append({
                        "type": "text",
                        "content": line.text,
                        "confidence": line.confidence,
                        "position": {
                            "x": line.bounding_box.x,
                            "y": line.bounding_box.y,
                            "width": line.bounding_box.width,
                            "height": line.bounding_box.height,
                        }
                    })
            except Exception as e:
                logger.warning(f"Text extraction failed: {e}")

        # Extract math equations
        if self.math_detector and assignment_type in ("math", "mixed"):
            try:
                math_content = self.math_detector.extract_from_document(image)
                for eq in math_content.equations:
                    equations.append({
                        "latex": eq.latex,
                        "confidence": eq.confidence,
                        "type": eq.equation_type,
                        "position": {
                            "x": eq.bounding_box.x if eq.bounding_box else 0,
                            "y": eq.bounding_box.y if eq.bounding_box else 0,
                            "width": eq.bounding_box.width if eq.bounding_box else 0,
                            "height": eq.bounding_box.height if eq.bounding_box else 0,
                        } if eq.bounding_box else None,
                    })

                    if eq.bounding_box:
                        content_regions.append({
                            "type": "math",
                            "content": eq.latex,
                            "confidence": eq.confidence,
                            "position": {
                                "x": eq.bounding_box.x,
                                "y": eq.bounding_box.y,
                                "width": eq.bounding_box.width,
                                "height": eq.bounding_box.height,
                            }
                        })
            except Exception as e:
                logger.warning(f"Math extraction failed: {e}")

        # Analyze diagrams
        if self.diagram_analyzer and assignment_type in ("diagram", "mixed"):
            try:
                diagram_result = self.diagram_analyzer.analyze(image)
                if diagram_result.diagram_type.value != "unknown":
                    diagrams.append({
                        "type": diagram_result.diagram_type.value,
                        "description": diagram_result.description,
                        "confidence": diagram_result.confidence,
                        "data_points": [
                            {"label": dp.label, "value": dp.value}
                            for dp in diagram_result.data_points
                        ]
                    })
            except Exception as e:
                logger.warning(f"Diagram analysis failed: {e}")

        # Assess drawing if applicable
        if self.drawing_assessor and assignment_type == "drawing":
            try:
                assessment = self.drawing_assessor.assess_drawing(image)
                diagrams.append({
                    "type": "drawing",
                    "overall_score": assessment.overall_score,
                    "dimension_scores": assessment.dimension_scores,
                    "feedback": assessment.feedback,
                })
                quality_score = assessment.overall_score
            except Exception as e:
                logger.warning(f"Drawing assessment failed: {e}")

        elapsed_ms = int((time.time() - start_time) * 1000)

        return ProcessedSubmission(
            submission_id=submission_id,
            assignment_id=assignment_id,
            student_id=student_id,
            extracted_text=extracted_text,
            equations=equations,
            diagrams=diagrams,
            content_regions=content_regions,
            quality_score=quality_score,
            processing_time_ms=elapsed_ms,
            metadata={
                "assignment_type": assignment_type,
                "content_counts": {
                    "text_regions": sum(1 for r in content_regions if r["type"] == "text"),
                    "math_regions": sum(1 for r in content_regions if r["type"] == "math"),
                    "diagrams": len(diagrams),
                }
            }
        )


# =============================================================================
# Training Service Integration
# =============================================================================


class TrainingServiceAdapter:
    """
    Adapter for integrating with training-svc.

    Creates training examples from annotated images:
    - Generate OCR training data
    - Create math detection examples
    - Build diagram classification datasets

    Usage:
        adapter = TrainingServiceAdapter()
        example = await adapter.generate_training_data(image, labels)
    """

    def __init__(
        self,
        image_preprocessor=None,
    ):
        """Initialize with preprocessing components."""
        self.image_preprocessor = image_preprocessor

    async def generate_training_data(
        self,
        image: np.ndarray,
        labels: Dict[str, Any],
        task_type: str = "ocr",
    ) -> TrainingExample:
        """
        Create training examples from annotated images.

        Args:
            image: Source image
            labels: Annotation labels
            task_type: Type of training task

        Returns:
            TrainingExample ready for training-svc
        """
        import time
        import hashlib

        start_time = time.time()
        example_id = f"train_{task_type}_{int(time.time())}"
        image_hash = hashlib.md5(image.tobytes()).hexdigest()[:16]

        # Extract input features based on task type
        input_features = {}
        augmentations = []
        quality_score = 1.0

        if task_type == "ocr":
            input_features = self._extract_ocr_features(image, labels)
        elif task_type == "math_detection":
            input_features = self._extract_math_features(image, labels)
        elif task_type == "diagram_classification":
            input_features = self._extract_diagram_features(image, labels)
        elif task_type == "drawing_assessment":
            input_features = self._extract_drawing_features(image, labels)
        else:
            input_features = {"raw_image_shape": image.shape}

        # Apply augmentations if preprocessor available
        if self.image_preprocessor:
            try:
                # Basic augmentations
                augmented_images = self._apply_augmentations(image)
                input_features["augmented_count"] = len(augmented_images)
                augmentations = ["rotation", "brightness", "contrast"]
            except Exception as e:
                logger.warning(f"Augmentation failed: {e}")

        # Calculate quality score based on labels completeness
        quality_score = self._calculate_label_quality(labels)

        return TrainingExample(
            example_id=example_id,
            source_image_hash=image_hash,
            task_type=task_type,
            input_features=input_features,
            labels=labels,
            quality_score=quality_score,
            augmentations_applied=augmentations,
            metadata={
                "image_size": {"height": image.shape[0], "width": image.shape[1]},
                "channels": image.shape[2] if len(image.shape) > 2 else 1,
                "created_at": datetime.utcnow().isoformat(),
            }
        )

    def _extract_ocr_features(
        self,
        image: np.ndarray,
        labels: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Extract features for OCR training."""
        import cv2

        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image

        return {
            "mean_intensity": float(np.mean(gray)),
            "std_intensity": float(np.std(gray)),
            "text_regions_count": len(labels.get("text_regions", [])),
            "word_count": len(labels.get("words", [])),
        }

    def _extract_math_features(
        self,
        image: np.ndarray,
        labels: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Extract features for math detection training."""
        return {
            "equation_count": len(labels.get("equations", [])),
            "equation_types": list(set(
                eq.get("type", "unknown")
                for eq in labels.get("equations", [])
            )),
            "has_matrices": any(
                eq.get("type") == "matrix"
                for eq in labels.get("equations", [])
            ),
        }

    def _extract_diagram_features(
        self,
        image: np.ndarray,
        labels: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Extract features for diagram classification training."""
        return {
            "diagram_type": labels.get("diagram_type", "unknown"),
            "shape_count": len(labels.get("shapes", [])),
            "has_text_labels": bool(labels.get("text_labels")),
            "has_data_series": bool(labels.get("data_series")),
        }

    def _extract_drawing_features(
        self,
        image: np.ndarray,
        labels: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Extract features for drawing assessment training."""
        return {
            "expected_score": labels.get("score", 0.5),
            "dimension_scores": labels.get("dimension_scores", {}),
            "required_elements": labels.get("required_elements", []),
            "category": labels.get("category", "unknown"),
        }

    def _apply_augmentations(
        self,
        image: np.ndarray,
    ) -> List[np.ndarray]:
        """Apply standard augmentations for training."""
        import cv2

        augmented = []

        # Rotation
        for angle in [-5, 5]:
            h, w = image.shape[:2]
            M = cv2.getRotationMatrix2D((w/2, h/2), angle, 1.0)
            rotated = cv2.warpAffine(image, M, (w, h))
            augmented.append(rotated)

        # Brightness
        for factor in [0.9, 1.1]:
            bright = cv2.convertScaleAbs(image, alpha=factor, beta=0)
            augmented.append(bright)

        return augmented

    def _calculate_label_quality(
        self,
        labels: Dict[str, Any],
    ) -> float:
        """Calculate quality score based on label completeness."""
        required_fields = ["type", "regions", "annotations"]
        present = sum(1 for f in required_fields if f in labels)
        return present / len(required_fields)


# =============================================================================
# Factory Function
# =============================================================================


def create_adapters(
    document_scanner=None,
    handwriting_recognizer=None,
    diagram_analyzer=None,
    math_detector=None,
    drawing_assessor=None,
    image_preprocessor=None,
) -> Dict[str, Any]:
    """
    Create all integration adapters with given components.

    Returns:
        Dictionary of adapter instances
    """
    return {
        "document_intelligence": DocumentIntelligenceAdapter(
            document_scanner=document_scanner,
            handwriting_recognizer=handwriting_recognizer,
            diagram_analyzer=diagram_analyzer,
            math_detector=math_detector,
        ),
        "grading_engine": GradingEngineAdapter(
            handwriting_recognizer=handwriting_recognizer,
            math_detector=math_detector,
            diagram_analyzer=diagram_analyzer,
            drawing_assessor=drawing_assessor,
        ),
        "training_service": TrainingServiceAdapter(
            image_preprocessor=image_preprocessor,
        ),
    }
