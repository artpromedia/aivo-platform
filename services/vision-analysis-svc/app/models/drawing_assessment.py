"""
Drawing Assessment Model

Evaluates student drawings and artwork for educational purposes.

Use cases:
1. Art class assignments
2. Science diagrams (labeled drawings)
3. Map drawings
4. Technical sketches

Assessment dimensions:
- Composition: Balance, focal point, use of space
- Technical skill: Line quality, proportions, detail
- Creativity: Originality, interpretation
- Completeness: All required elements present
- Accuracy: For technical/scientific drawings
"""

import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np

logger = logging.getLogger(__name__)


class DrawingCategory(Enum):
    """Categories of drawings for assessment."""
    ART = "art"  # Free-form artwork
    SCIENCE_DIAGRAM = "science_diagram"  # Labeled scientific drawings
    MAP = "map"  # Geographic/conceptual maps
    TECHNICAL = "technical"  # Technical/engineering sketches
    OBSERVATIONAL = "observational"  # Still life, portraits
    CREATIVE = "creative"  # Original compositions
    ILLUSTRATIVE = "illustrative"  # Story illustrations
    ABSTRACT = "abstract"  # Abstract art


class AssessmentDimension(Enum):
    """Standard assessment dimensions."""
    COMPOSITION = "composition"
    TECHNICAL_SKILL = "technical_skill"
    CREATIVITY = "creativity"
    COMPLETENESS = "completeness"
    ACCURACY = "accuracy"
    COLOR_USE = "color_use"
    LINE_QUALITY = "line_quality"
    PROPORTIONS = "proportions"


@dataclass
class BoundingBox:
    """Bounding box coordinates."""
    x: int
    y: int
    width: int
    height: int

    def contains_point(self, px: int, py: int) -> bool:
        """Check if point is inside bounding box."""
        return (self.x <= px <= self.x + self.width and
                self.y <= py <= self.y + self.height)

    def area(self) -> int:
        """Calculate area of bounding box."""
        return self.width * self.height

    def center(self) -> Tuple[int, int]:
        """Get center point of bounding box."""
        return (self.x + self.width // 2, self.y + self.height // 2)


@dataclass
class DetectedElement:
    """An element detected in the drawing."""
    element_id: str
    element_type: str  # shape, line, text, symbol, region
    name: str
    bounding_box: BoundingBox
    confidence: float
    attributes: Dict[str, Any] = field(default_factory=dict)
    label_text: Optional[str] = None  # For labeled diagrams


@dataclass
class LabelDetection:
    """A label detected in a diagram."""
    label_id: str
    text: str
    text_box: BoundingBox
    line_start: Optional[Tuple[int, int]] = None
    line_end: Optional[Tuple[int, int]] = None
    points_to_region: Optional[BoundingBox] = None
    confidence: float = 0.0
    spelling_correct: bool = True
    spelling_suggestions: List[str] = field(default_factory=list)


@dataclass
class DimensionScore:
    """Score for a single assessment dimension."""
    dimension: str
    score: float  # 0-1 scale
    max_points: float
    feedback: str
    strengths: List[str] = field(default_factory=list)
    areas_for_growth: List[str] = field(default_factory=list)


@dataclass
class DrawingRubric:
    """Rubric for assessing drawings."""
    rubric_id: str
    name: str
    category: DrawingCategory
    dimensions: List[str]  # Which dimensions to assess
    required_elements: List[str] = field(default_factory=list)
    max_total_points: float = 100.0
    dimension_weights: Dict[str, float] = field(default_factory=dict)
    grade_level: Optional[int] = None
    description: str = ""


@dataclass
class DrawingAssessment:
    """Complete assessment result for a drawing."""
    overall_score: float  # 0-1 scale
    dimension_scores: Dict[str, float]
    detected_elements: List[DetectedElement]
    missing_elements: List[str]  # If rubric provided
    feedback: str
    comparison_to_reference: Optional[float] = None  # If reference provided
    labels: List[LabelDetection] = field(default_factory=list)
    composition_analysis: Dict[str, Any] = field(default_factory=dict)
    color_analysis: Dict[str, Any] = field(default_factory=dict)
    technical_metrics: Dict[str, Any] = field(default_factory=dict)
    suggestions: List[str] = field(default_factory=list)
    processing_time_ms: int = 0


@dataclass
class DrawingAssessorConfig:
    """Configuration for the drawing assessor."""
    device: str = "cpu"
    enable_ocr: bool = True
    enable_color_analysis: bool = True
    enable_composition_analysis: bool = True
    min_element_confidence: float = 0.5
    spelling_check_language: str = "en"
    use_reference_comparison: bool = True
    feedback_detail_level: str = "medium"  # low, medium, high


class DrawingAssessor:
    """
    Evaluate student drawings and artwork.

    Capabilities:
    - Assess composition, technical skill, creativity
    - Detect and verify labeled elements in diagrams
    - Check spelling of labels
    - Compare against reference images
    - Provide constructive feedback

    Usage:
        config = DrawingAssessorConfig()
        assessor = DrawingAssessor(config)

        assessment = assessor.assess_drawing(
            image=student_drawing,
            rubric=science_diagram_rubric,
            reference=exemplar_image
        )
        print(f"Score: {assessment.overall_score}")
        print(f"Feedback: {assessment.feedback}")
    """

    # Default dimension weights
    DEFAULT_WEIGHTS = {
        AssessmentDimension.COMPOSITION.value: 0.2,
        AssessmentDimension.TECHNICAL_SKILL.value: 0.25,
        AssessmentDimension.CREATIVITY.value: 0.15,
        AssessmentDimension.COMPLETENESS.value: 0.2,
        AssessmentDimension.ACCURACY.value: 0.2,
    }

    # Common spelling dictionary for science terms
    SCIENCE_TERMS = {
        "cell", "nucleus", "mitochondria", "chloroplast", "ribosome",
        "membrane", "cytoplasm", "vacuole", "chromosome", "dna", "rna",
        "atom", "molecule", "electron", "proton", "neutron", "ion",
        "photosynthesis", "respiration", "osmosis", "diffusion",
        "ecosystem", "habitat", "predator", "prey", "producer", "consumer",
        "volcano", "earthquake", "erosion", "weathering", "sediment",
        "gravity", "friction", "acceleration", "velocity", "force",
    }

    def __init__(
        self,
        config: Optional[DrawingAssessorConfig] = None,
        model_path: Optional[str] = None,
        device: str = "cpu",
    ) -> None:
        """
        Initialize drawing assessor.

        Args:
            config: Assessor configuration
            model_path: Path to pretrained models (legacy)
            device: Inference device (legacy)
        """
        if config:
            self.config = config
        else:
            self.config = DrawingAssessorConfig(device=device)

        self.model_path = model_path
        self.ocr_reader = None
        self._models_loaded = False
        self._rubrics: Dict[str, DrawingRubric] = {}

        # Load default rubrics
        self._load_default_rubrics()

        logger.info(
            f"DrawingAssessor initialized "
            f"(device: {self.config.device}, ocr: {self.config.enable_ocr})"
        )

    def _load_models(self) -> None:
        """Lazy-load models on first use."""
        if self._models_loaded:
            return

        if self.config.enable_ocr:
            try:
                import easyocr
                self.ocr_reader = easyocr.Reader(
                    ['en'],
                    gpu=self.config.device == 'cuda'
                )
                logger.info("EasyOCR loaded for label detection")
            except Exception as e:
                logger.warning(f"Failed to load OCR: {e}")

        self._models_loaded = True

    def _load_default_rubrics(self) -> None:
        """Load built-in assessment rubrics."""
        # Science diagram rubric
        self._rubrics["science_diagram_basic"] = DrawingRubric(
            rubric_id="science_diagram_basic",
            name="Basic Science Diagram",
            category=DrawingCategory.SCIENCE_DIAGRAM,
            dimensions=[
                AssessmentDimension.ACCURACY.value,
                AssessmentDimension.COMPLETENESS.value,
                AssessmentDimension.TECHNICAL_SKILL.value,
            ],
            dimension_weights={
                AssessmentDimension.ACCURACY.value: 0.4,
                AssessmentDimension.COMPLETENESS.value: 0.35,
                AssessmentDimension.TECHNICAL_SKILL.value: 0.25,
            },
            description="Assessment rubric for basic science diagrams",
        )

        # Art class rubric
        self._rubrics["art_creative"] = DrawingRubric(
            rubric_id="art_creative",
            name="Creative Art Assessment",
            category=DrawingCategory.CREATIVE,
            dimensions=[
                AssessmentDimension.COMPOSITION.value,
                AssessmentDimension.CREATIVITY.value,
                AssessmentDimension.TECHNICAL_SKILL.value,
                AssessmentDimension.COLOR_USE.value,
            ],
            dimension_weights={
                AssessmentDimension.COMPOSITION.value: 0.25,
                AssessmentDimension.CREATIVITY.value: 0.30,
                AssessmentDimension.TECHNICAL_SKILL.value: 0.25,
                AssessmentDimension.COLOR_USE.value: 0.20,
            },
            description="Assessment rubric for creative art projects",
        )

        # Technical drawing rubric
        self._rubrics["technical_basic"] = DrawingRubric(
            rubric_id="technical_basic",
            name="Technical Drawing Assessment",
            category=DrawingCategory.TECHNICAL,
            dimensions=[
                AssessmentDimension.ACCURACY.value,
                AssessmentDimension.PROPORTIONS.value,
                AssessmentDimension.LINE_QUALITY.value,
                AssessmentDimension.COMPLETENESS.value,
            ],
            dimension_weights={
                AssessmentDimension.ACCURACY.value: 0.35,
                AssessmentDimension.PROPORTIONS.value: 0.25,
                AssessmentDimension.LINE_QUALITY.value: 0.20,
                AssessmentDimension.COMPLETENESS.value: 0.20,
            },
            description="Assessment rubric for technical drawings",
        )

    def register_rubric(self, rubric: DrawingRubric) -> None:
        """Register a custom assessment rubric."""
        self._rubrics[rubric.rubric_id] = rubric
        logger.info(f"Registered rubric: {rubric.rubric_id}")

    def get_rubric(self, rubric_id: str) -> Optional[DrawingRubric]:
        """Get a registered rubric by ID."""
        return self._rubrics.get(rubric_id)

    def assess_drawing(
        self,
        image: np.ndarray,
        rubric: Optional[DrawingRubric] = None,
        reference: Optional[np.ndarray] = None,
        assignment_type: str = "art",
    ) -> DrawingAssessment:
        """
        Assess a student drawing.

        Args:
            image: Input drawing image (BGR format)
            rubric: Optional rubric for assessment criteria
            reference: Optional reference image for comparison
            assignment_type: Type of assignment (art, science_diagram, map, technical)

        Returns:
            DrawingAssessment with scores, detected elements, and feedback
        """
        start_time = time.time()
        self._load_models()

        # Determine category and use appropriate rubric
        category = self._determine_category(assignment_type)
        if rubric is None:
            rubric = self._get_default_rubric(category)

        # Analyze the drawing
        detected_elements = self._detect_elements(image)
        labels = self._detect_labels(image) if assignment_type == "science_diagram" else []
        composition = self._analyze_composition(image) if self.config.enable_composition_analysis else {}
        color_analysis = self._analyze_colors(image) if self.config.enable_color_analysis else {}
        technical_metrics = self._analyze_technical_quality(image)

        # Calculate dimension scores
        dimension_scores = self._calculate_dimension_scores(
            image=image,
            elements=detected_elements,
            labels=labels,
            composition=composition,
            color_analysis=color_analysis,
            technical_metrics=technical_metrics,
            rubric=rubric,
        )

        # Check for missing elements if rubric specifies required elements
        missing_elements = []
        if rubric and rubric.required_elements:
            detected_names = {e.name.lower() for e in detected_elements}
            missing_elements = [
                elem for elem in rubric.required_elements
                if elem.lower() not in detected_names
            ]

        # Calculate overall score
        overall_score = self._calculate_overall_score(dimension_scores, rubric)

        # Compare to reference if provided
        comparison_score = None
        if reference is not None and self.config.use_reference_comparison:
            comparison_score = self._compare_to_reference(image, reference)

        # Generate feedback and suggestions
        feedback = self._generate_feedback(
            dimension_scores=dimension_scores,
            missing_elements=missing_elements,
            labels=labels,
            overall_score=overall_score,
            category=category,
        )
        suggestions = self._generate_suggestions(
            dimension_scores=dimension_scores,
            missing_elements=missing_elements,
            technical_metrics=technical_metrics,
        )

        elapsed_ms = int((time.time() - start_time) * 1000)

        return DrawingAssessment(
            overall_score=overall_score,
            dimension_scores=dimension_scores,
            detected_elements=detected_elements,
            missing_elements=missing_elements,
            feedback=feedback,
            comparison_to_reference=comparison_score,
            labels=labels,
            composition_analysis=composition,
            color_analysis=color_analysis,
            technical_metrics=technical_metrics,
            suggestions=suggestions,
            processing_time_ms=elapsed_ms,
        )

    def _determine_category(self, assignment_type: str) -> DrawingCategory:
        """Determine drawing category from assignment type."""
        type_mapping = {
            "art": DrawingCategory.ART,
            "science_diagram": DrawingCategory.SCIENCE_DIAGRAM,
            "map": DrawingCategory.MAP,
            "technical": DrawingCategory.TECHNICAL,
            "observational": DrawingCategory.OBSERVATIONAL,
            "creative": DrawingCategory.CREATIVE,
            "illustrative": DrawingCategory.ILLUSTRATIVE,
            "abstract": DrawingCategory.ABSTRACT,
        }
        return type_mapping.get(assignment_type.lower(), DrawingCategory.ART)

    def _get_default_rubric(self, category: DrawingCategory) -> DrawingRubric:
        """Get default rubric for a category."""
        rubric_mapping = {
            DrawingCategory.SCIENCE_DIAGRAM: "science_diagram_basic",
            DrawingCategory.TECHNICAL: "technical_basic",
            DrawingCategory.MAP: "technical_basic",
        }
        rubric_id = rubric_mapping.get(category, "art_creative")
        return self._rubrics.get(rubric_id, self._rubrics["art_creative"])

    def _detect_elements(self, image: np.ndarray) -> List[DetectedElement]:
        """Detect structural elements in the drawing."""
        elements = []

        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()

        # Edge detection
        edges = cv2.Canny(gray, 50, 150)

        # Find contours
        contours, _ = cv2.findContours(
            edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        element_id = 0
        for contour in contours:
            area = cv2.contourArea(contour)
            if area < 100:  # Skip tiny elements
                continue

            x, y, w, h = cv2.boundingRect(contour)
            perimeter = cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, 0.04 * perimeter, True)

            # Classify shape
            shape_type, shape_name = self._classify_shape(approx, area, perimeter)

            elements.append(DetectedElement(
                element_id=f"elem_{element_id}",
                element_type=shape_type,
                name=shape_name,
                bounding_box=BoundingBox(x=x, y=y, width=w, height=h),
                confidence=0.8,
                attributes={
                    "area": area,
                    "perimeter": perimeter,
                    "vertices": len(approx),
                }
            ))
            element_id += 1

        return elements

    def _classify_shape(
        self,
        approx: np.ndarray,
        area: float,
        perimeter: float,
    ) -> Tuple[str, str]:
        """Classify a shape based on its contour."""
        num_vertices = len(approx)
        circularity = 4 * np.pi * area / (perimeter * perimeter) if perimeter > 0 else 0

        if circularity > 0.85:
            return "shape", "circle"
        elif num_vertices == 3:
            return "shape", "triangle"
        elif num_vertices == 4:
            # Check if rectangle or square
            x, y, w, h = cv2.boundingRect(approx)
            aspect_ratio = float(w) / h if h > 0 else 0
            if 0.9 < aspect_ratio < 1.1:
                return "shape", "square"
            else:
                return "shape", "rectangle"
        elif num_vertices == 5:
            return "shape", "pentagon"
        elif num_vertices == 6:
            return "shape", "hexagon"
        elif num_vertices > 6:
            return "shape", f"polygon_{num_vertices}"
        else:
            return "line", "line_segment"

    def _detect_labels(self, image: np.ndarray) -> List[LabelDetection]:
        """Detect labels in a diagram."""
        labels = []

        if self.ocr_reader is None:
            return labels

        # OCR the image
        results = self.ocr_reader.readtext(image)

        label_id = 0
        for bbox, text, conf in results:
            if conf < self.config.min_element_confidence:
                continue

            # Convert bbox to our format
            points = np.array(bbox, dtype=np.int32)
            x, y, w, h = cv2.boundingRect(points)

            # Check spelling
            spelling_correct, suggestions = self._check_spelling(text)

            labels.append(LabelDetection(
                label_id=f"label_{label_id}",
                text=text,
                text_box=BoundingBox(x=x, y=y, width=w, height=h),
                confidence=conf,
                spelling_correct=spelling_correct,
                spelling_suggestions=suggestions,
            ))
            label_id += 1

        # Try to detect label lines (arrows/lines pointing from labels)
        labels = self._detect_label_connections(image, labels)

        return labels

    def _check_spelling(self, text: str) -> Tuple[bool, List[str]]:
        """Check spelling of label text."""
        text_lower = text.lower().strip()

        # Check against science terms
        if text_lower in self.SCIENCE_TERMS:
            return True, []

        # Simple edit distance check for common misspellings
        suggestions = []
        for term in self.SCIENCE_TERMS:
            if self._levenshtein_distance(text_lower, term) <= 2:
                suggestions.append(term)

        if not suggestions:
            # Could be a valid but unknown word
            return True, []

        return False, suggestions[:3]  # Return top 3 suggestions

    def _levenshtein_distance(self, s1: str, s2: str) -> int:
        """Calculate Levenshtein edit distance between two strings."""
        if len(s1) < len(s2):
            return self._levenshtein_distance(s2, s1)

        if len(s2) == 0:
            return len(s1)

        previous_row = range(len(s2) + 1)
        for i, c1 in enumerate(s1):
            current_row = [i + 1]
            for j, c2 in enumerate(s2):
                insertions = previous_row[j + 1] + 1
                deletions = current_row[j] + 1
                substitutions = previous_row[j] + (c1 != c2)
                current_row.append(min(insertions, deletions, substitutions))
            previous_row = current_row

        return previous_row[-1]

    def _detect_label_connections(
        self,
        image: np.ndarray,
        labels: List[LabelDetection],
    ) -> List[LabelDetection]:
        """Detect lines connecting labels to diagram elements."""
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()

        edges = cv2.Canny(gray, 50, 150)

        # Detect lines
        lines = cv2.HoughLinesP(
            edges,
            rho=1,
            theta=np.pi/180,
            threshold=30,
            minLineLength=20,
            maxLineGap=10
        )

        if lines is None:
            return labels

        # For each label, find lines that start near the label
        for label in labels:
            center = label.text_box.center()

            for line in lines:
                x1, y1, x2, y2 = line[0]

                # Check if line starts near label
                dist_to_start = np.sqrt((center[0] - x1)**2 + (center[1] - y1)**2)
                dist_to_end = np.sqrt((center[0] - x2)**2 + (center[1] - y2)**2)

                if dist_to_start < 50:
                    label.line_start = (x1, y1)
                    label.line_end = (x2, y2)
                    break
                elif dist_to_end < 50:
                    label.line_start = (x2, y2)
                    label.line_end = (x1, y1)
                    break

        return labels

    def _analyze_composition(self, image: np.ndarray) -> Dict[str, Any]:
        """Analyze composition of the drawing."""
        h, w = image.shape[:2]

        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()

        # Calculate content distribution (rule of thirds)
        thirds_h = h // 3
        thirds_w = w // 3

        regions = {
            "top_left": gray[0:thirds_h, 0:thirds_w],
            "top_center": gray[0:thirds_h, thirds_w:2*thirds_w],
            "top_right": gray[0:thirds_h, 2*thirds_w:w],
            "middle_left": gray[thirds_h:2*thirds_h, 0:thirds_w],
            "middle_center": gray[thirds_h:2*thirds_h, thirds_w:2*thirds_w],
            "middle_right": gray[thirds_h:2*thirds_h, 2*thirds_w:w],
            "bottom_left": gray[2*thirds_h:h, 0:thirds_w],
            "bottom_center": gray[2*thirds_h:h, thirds_w:2*thirds_w],
            "bottom_right": gray[2*thirds_h:h, 2*thirds_w:w],
        }

        # Calculate content density in each region
        region_density = {}
        for name, region in regions.items():
            # Calculate edge density as proxy for content
            edges = cv2.Canny(region, 50, 150)
            density = np.sum(edges > 0) / edges.size
            region_density[name] = float(density)

        # Analyze balance
        left_density = (region_density["top_left"] + region_density["middle_left"] +
                       region_density["bottom_left"]) / 3
        right_density = (region_density["top_right"] + region_density["middle_right"] +
                        region_density["bottom_right"]) / 3
        horizontal_balance = 1 - abs(left_density - right_density)

        top_density = (region_density["top_left"] + region_density["top_center"] +
                      region_density["top_right"]) / 3
        bottom_density = (region_density["bottom_left"] + region_density["bottom_center"] +
                         region_density["bottom_right"]) / 3
        vertical_balance = 1 - abs(top_density - bottom_density)

        # Calculate focal point (region with highest density)
        focal_region = max(region_density, key=region_density.get)

        # Calculate use of space (overall content coverage)
        total_density = np.mean(list(region_density.values()))
        use_of_space = min(total_density * 10, 1.0)  # Normalize

        return {
            "region_density": region_density,
            "horizontal_balance": float(horizontal_balance),
            "vertical_balance": float(vertical_balance),
            "overall_balance": float((horizontal_balance + vertical_balance) / 2),
            "focal_region": focal_region,
            "use_of_space": float(use_of_space),
            "follows_rule_of_thirds": self._check_rule_of_thirds(region_density),
        }

    def _check_rule_of_thirds(self, region_density: Dict[str, float]) -> bool:
        """Check if composition follows rule of thirds."""
        # Check if focal points are at intersection points
        intersection_regions = ["top_left", "top_right", "bottom_left", "bottom_right"]
        intersection_density = sum(region_density[r] for r in intersection_regions) / 4
        center_density = region_density["middle_center"]

        # Good composition has more content at intersections than center
        return intersection_density > center_density * 0.8

    def _analyze_colors(self, image: np.ndarray) -> Dict[str, Any]:
        """Analyze color usage in the drawing."""
        if len(image.shape) == 2:
            return {"is_grayscale": True, "color_count": 1}

        # Convert to HSV for better color analysis
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

        # Analyze hue distribution
        hues = hsv[:, :, 0].flatten()
        saturations = hsv[:, :, 1].flatten()

        # Filter out low saturation pixels (white/gray/black)
        color_mask = saturations > 30
        colored_hues = hues[color_mask]

        if len(colored_hues) == 0:
            return {
                "is_grayscale": True,
                "color_count": 1,
                "dominant_colors": [],
            }

        # Cluster hues to find dominant colors
        hue_hist, _ = np.histogram(colored_hues, bins=12, range=(0, 180))
        dominant_hue_indices = np.argsort(hue_hist)[-5:][::-1]

        # Map hue indices to color names
        color_names = [
            "red", "orange", "yellow", "yellow-green", "green", "cyan",
            "light-blue", "blue", "purple", "magenta", "pink", "red"
        ]
        dominant_colors = [color_names[i] for i in dominant_hue_indices if hue_hist[i] > 0]

        # Calculate color variety
        non_zero_bins = np.sum(hue_hist > (len(colored_hues) * 0.02))
        color_variety = min(non_zero_bins / 6, 1.0)

        # Calculate saturation stats
        mean_saturation = np.mean(saturations[color_mask]) / 255
        saturation_variety = np.std(saturations[color_mask]) / 255

        return {
            "is_grayscale": False,
            "color_count": int(non_zero_bins),
            "dominant_colors": dominant_colors[:5],
            "color_variety": float(color_variety),
            "mean_saturation": float(mean_saturation),
            "saturation_variety": float(saturation_variety),
            "uses_complementary": self._uses_complementary_colors(dominant_hue_indices),
        }

    def _uses_complementary_colors(self, hue_indices: np.ndarray) -> bool:
        """Check if drawing uses complementary colors."""
        for i in hue_indices:
            complement = (i + 6) % 12
            if complement in hue_indices:
                return True
        return False

    def _analyze_technical_quality(self, image: np.ndarray) -> Dict[str, Any]:
        """Analyze technical quality of the drawing."""
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()

        # Edge detection for line analysis
        edges = cv2.Canny(gray, 50, 150)

        # Line detection
        lines = cv2.HoughLinesP(
            edges,
            rho=1,
            theta=np.pi/180,
            threshold=30,
            minLineLength=20,
            maxLineGap=5
        )

        line_count = len(lines) if lines is not None else 0

        # Analyze line quality (straightness for detected lines)
        line_straightness = 0.0
        if lines is not None and len(lines) > 0:
            straightness_scores = []
            for line in lines:
                x1, y1, x2, y2 = line[0]
                length = np.sqrt((x2-x1)**2 + (y2-y1)**2)
                if length > 0:
                    straightness_scores.append(1.0)  # Detected lines are inherently straight
            line_straightness = np.mean(straightness_scores) if straightness_scores else 0.0

        # Analyze detail level (edge density)
        edge_density = np.sum(edges > 0) / edges.size
        detail_level = min(edge_density * 20, 1.0)

        # Analyze smoothness (inverse of noise)
        blur = cv2.GaussianBlur(gray, (5, 5), 0)
        noise_estimate = np.std(gray.astype(np.float32) - blur.astype(np.float32))
        smoothness = max(0, 1 - (noise_estimate / 50))

        # Check for clear boundaries
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        has_clear_boundaries = len(contours) > 0 and len(contours) < 100

        return {
            "line_count": line_count,
            "line_quality": float(line_straightness),
            "detail_level": float(detail_level),
            "smoothness": float(smoothness),
            "has_clear_boundaries": has_clear_boundaries,
            "edge_density": float(edge_density),
        }

    def _calculate_dimension_scores(
        self,
        image: np.ndarray,
        elements: List[DetectedElement],
        labels: List[LabelDetection],
        composition: Dict[str, Any],
        color_analysis: Dict[str, Any],
        technical_metrics: Dict[str, Any],
        rubric: Optional[DrawingRubric],
    ) -> Dict[str, float]:
        """Calculate scores for each assessment dimension."""
        scores = {}

        # Composition score
        if composition:
            comp_score = (
                composition.get("overall_balance", 0.5) * 0.4 +
                composition.get("use_of_space", 0.5) * 0.3 +
                (1.0 if composition.get("follows_rule_of_thirds", False) else 0.5) * 0.3
            )
            scores[AssessmentDimension.COMPOSITION.value] = float(comp_score)

        # Technical skill score
        tech_score = (
            technical_metrics.get("line_quality", 0.5) * 0.3 +
            technical_metrics.get("detail_level", 0.5) * 0.3 +
            technical_metrics.get("smoothness", 0.5) * 0.2 +
            (1.0 if technical_metrics.get("has_clear_boundaries", False) else 0.5) * 0.2
        )
        scores[AssessmentDimension.TECHNICAL_SKILL.value] = float(tech_score)

        # Line quality score
        scores[AssessmentDimension.LINE_QUALITY.value] = float(
            technical_metrics.get("line_quality", 0.5)
        )

        # Proportions score (based on element consistency)
        if elements:
            areas = [e.attributes.get("area", 0) for e in elements if e.attributes.get("area")]
            if areas:
                area_std = np.std(areas) / (np.mean(areas) + 1)
                proportion_score = max(0, 1 - area_std)
            else:
                proportion_score = 0.5
        else:
            proportion_score = 0.5
        scores[AssessmentDimension.PROPORTIONS.value] = float(proportion_score)

        # Creativity score (based on color variety and unique elements)
        if color_analysis and not color_analysis.get("is_grayscale", True):
            creativity_score = (
                color_analysis.get("color_variety", 0.5) * 0.5 +
                (1.0 if color_analysis.get("uses_complementary", False) else 0.5) * 0.5
            )
        else:
            creativity_score = 0.5
        scores[AssessmentDimension.CREATIVITY.value] = float(creativity_score)

        # Color use score
        if color_analysis and not color_analysis.get("is_grayscale", True):
            color_score = (
                color_analysis.get("color_variety", 0.5) * 0.4 +
                color_analysis.get("mean_saturation", 0.5) * 0.3 +
                color_analysis.get("saturation_variety", 0.5) * 0.3
            )
            scores[AssessmentDimension.COLOR_USE.value] = float(color_score)
        else:
            scores[AssessmentDimension.COLOR_USE.value] = 0.5

        # Completeness score
        completeness_base = min(len(elements) / 10, 1.0) if elements else 0.3
        if rubric and rubric.required_elements:
            found_count = sum(1 for e in rubric.required_elements
                            if any(el.name.lower() == e.lower() for el in elements))
            completeness_score = found_count / len(rubric.required_elements)
        else:
            completeness_score = completeness_base
        scores[AssessmentDimension.COMPLETENESS.value] = float(completeness_score)

        # Accuracy score (for diagrams with labels)
        if labels:
            correct_labels = sum(1 for l in labels if l.spelling_correct)
            accuracy_score = correct_labels / len(labels)
        else:
            accuracy_score = 0.5
        scores[AssessmentDimension.ACCURACY.value] = float(accuracy_score)

        return scores

    def _calculate_overall_score(
        self,
        dimension_scores: Dict[str, float],
        rubric: Optional[DrawingRubric],
    ) -> float:
        """Calculate overall weighted score."""
        if rubric and rubric.dimension_weights:
            weights = rubric.dimension_weights
        else:
            weights = self.DEFAULT_WEIGHTS

        total_weight = 0
        weighted_sum = 0

        for dim, score in dimension_scores.items():
            weight = weights.get(dim, 0.1)
            weighted_sum += score * weight
            total_weight += weight

        if total_weight > 0:
            return weighted_sum / total_weight
        else:
            return np.mean(list(dimension_scores.values()))

    def _compare_to_reference(
        self,
        image: np.ndarray,
        reference: np.ndarray,
    ) -> float:
        """Compare drawing to reference image."""
        # Resize to same dimensions
        h1, w1 = image.shape[:2]
        h2, w2 = reference.shape[:2]
        target_size = (min(w1, w2), min(h1, h2))

        img_resized = cv2.resize(image, target_size)
        ref_resized = cv2.resize(reference, target_size)

        # Convert to grayscale
        if len(img_resized.shape) == 3:
            img_gray = cv2.cvtColor(img_resized, cv2.COLOR_BGR2GRAY)
        else:
            img_gray = img_resized

        if len(ref_resized.shape) == 3:
            ref_gray = cv2.cvtColor(ref_resized, cv2.COLOR_BGR2GRAY)
        else:
            ref_gray = ref_resized

        # Calculate structural similarity
        try:
            from skimage.metrics import structural_similarity as ssim
            similarity, _ = ssim(img_gray, ref_gray, full=True)
        except ImportError:
            # Fallback to normalized correlation
            img_norm = img_gray.astype(np.float32) / 255
            ref_norm = ref_gray.astype(np.float32) / 255
            correlation = np.corrcoef(img_norm.flatten(), ref_norm.flatten())[0, 1]
            similarity = max(0, (correlation + 1) / 2)

        return float(similarity)

    def _generate_feedback(
        self,
        dimension_scores: Dict[str, float],
        missing_elements: List[str],
        labels: List[LabelDetection],
        overall_score: float,
        category: DrawingCategory,
    ) -> str:
        """Generate constructive feedback for the drawing."""
        feedback_parts = []

        # Overall assessment
        if overall_score >= 0.8:
            feedback_parts.append("Excellent work! This drawing demonstrates strong skills.")
        elif overall_score >= 0.6:
            feedback_parts.append("Good effort! There are some nice elements in this drawing.")
        elif overall_score >= 0.4:
            feedback_parts.append("This drawing shows potential with room for improvement.")
        else:
            feedback_parts.append("Keep practicing! Every drawing is a learning opportunity.")

        # Specific dimension feedback
        high_scores = [d for d, s in dimension_scores.items() if s >= 0.7]
        low_scores = [d for d, s in dimension_scores.items() if s < 0.5]

        if high_scores:
            strengths = ", ".join(h.replace("_", " ") for h in high_scores[:3])
            feedback_parts.append(f"Strengths: {strengths}.")

        if low_scores and self.config.feedback_detail_level != "low":
            areas = ", ".join(l.replace("_", " ") for l in low_scores[:2])
            feedback_parts.append(f"Areas to develop: {areas}.")

        # Missing elements
        if missing_elements:
            feedback_parts.append(
                f"Missing elements: {', '.join(missing_elements[:3])}."
            )

        # Label feedback for diagrams
        if labels and category == DrawingCategory.SCIENCE_DIAGRAM:
            incorrect_labels = [l for l in labels if not l.spelling_correct]
            if incorrect_labels:
                corrections = []
                for label in incorrect_labels[:3]:
                    if label.spelling_suggestions:
                        corrections.append(
                            f"'{label.text}' → '{label.spelling_suggestions[0]}'"
                        )
                if corrections:
                    feedback_parts.append(
                        f"Label spelling suggestions: {', '.join(corrections)}."
                    )

        return " ".join(feedback_parts)

    def _generate_suggestions(
        self,
        dimension_scores: Dict[str, float],
        missing_elements: List[str],
        technical_metrics: Dict[str, Any],
    ) -> List[str]:
        """Generate improvement suggestions."""
        suggestions = []

        # Based on low dimension scores
        if dimension_scores.get(AssessmentDimension.COMPOSITION.value, 1) < 0.5:
            suggestions.append(
                "Try using the rule of thirds - place important elements at the "
                "intersection points of imaginary lines dividing your drawing into thirds."
            )

        if dimension_scores.get(AssessmentDimension.LINE_QUALITY.value, 1) < 0.5:
            suggestions.append(
                "Practice drawing longer, more confident lines. Try drawing from "
                "your shoulder rather than your wrist."
            )

        if dimension_scores.get(AssessmentDimension.COLOR_USE.value, 1) < 0.5:
            suggestions.append(
                "Experiment with color variety. Try using complementary colors "
                "(opposite on the color wheel) for contrast."
            )

        if dimension_scores.get(AssessmentDimension.PROPORTIONS.value, 1) < 0.5:
            suggestions.append(
                "Work on proportions by measuring and comparing sizes of different "
                "elements before drawing."
            )

        # Based on technical metrics
        if technical_metrics.get("detail_level", 1) < 0.3:
            suggestions.append(
                "Add more detail to your drawing. Consider textures, patterns, "
                "or additional elements."
            )

        # Based on missing elements
        if missing_elements:
            suggestions.append(
                f"Don't forget to include these required elements: "
                f"{', '.join(missing_elements[:3])}."
            )

        return suggestions[:5]  # Return top 5 suggestions

    def detect_diagram_labels(
        self,
        image: np.ndarray,
        expected_labels: Optional[List[str]] = None,
    ) -> List[LabelDetection]:
        """
        Detect and verify labels in a science diagram.

        Args:
            image: Diagram image
            expected_labels: List of expected label texts

        Returns:
            List of detected labels with verification
        """
        self._load_models()
        labels = self._detect_labels(image)

        if expected_labels:
            # Check for missing expected labels
            detected_texts = {l.text.lower() for l in labels}
            for expected in expected_labels:
                if expected.lower() not in detected_texts:
                    # Check for partial matches
                    partial_match = False
                    for detected in detected_texts:
                        if expected.lower() in detected or detected in expected.lower():
                            partial_match = True
                            break
                    if not partial_match:
                        logger.info(f"Missing expected label: {expected}")

        return labels

    def verify_label_positions(
        self,
        labels: List[LabelDetection],
        target_regions: Dict[str, BoundingBox],
    ) -> Dict[str, bool]:
        """
        Verify that labels point to correct regions.

        Args:
            labels: Detected labels
            target_regions: Expected regions for each label

        Returns:
            Dict mapping label texts to whether they point to correct region
        """
        verification = {}

        for label in labels:
            label_text = label.text.lower()

            if label_text in target_regions:
                expected_region = target_regions[label_text]

                # Check if label's line end points to expected region
                if label.line_end:
                    points_to_correct = expected_region.contains_point(
                        label.line_end[0], label.line_end[1]
                    )
                    verification[label.text] = points_to_correct
                else:
                    verification[label.text] = False

        return verification

    def is_loaded(self) -> bool:
        """Check if models are loaded."""
        return self._models_loaded

    def get_model_info(self) -> Dict[str, Any]:
        """Get information about loaded models."""
        return {
            "models_loaded": self._models_loaded,
            "ocr_enabled": self.config.enable_ocr,
            "ocr_loaded": self.ocr_reader is not None,
            "registered_rubrics": list(self._rubrics.keys()),
            "device": self.config.device,
        }
