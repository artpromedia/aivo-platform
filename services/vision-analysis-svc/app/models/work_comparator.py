"""
Work Comparator

Compare student work submissions over time or against exemplars.

Use cases:
1. Progress tracking (compare drafts)
2. Plagiarism detection (visual similarity)
3. Peer comparison (anonymized)
4. Exemplar matching

Features:
- Structural similarity analysis (SSIM)
- Content-based similarity
- Visual difference highlighting
- Progress tracking over time
"""

import logging
import time
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np

logger = logging.getLogger(__name__)


class ComparisonType(Enum):
    """Types of comparison operations."""
    SIMILARITY = "similarity"  # General similarity check
    PROGRESS = "progress"  # Track improvement over time
    PLAGIARISM = "plagiarism"  # Check for potential copying
    EXEMPLAR = "exemplar"  # Compare against model work


@dataclass
class BoundingBox:
    """Bounding box for difference regions."""
    x: int
    y: int
    width: int
    height: int


@dataclass
class DifferenceRegion:
    """A region of difference between two images."""
    region_id: str
    bounding_box: BoundingBox
    difference_type: str  # added, removed, modified
    intensity: float  # 0-1, how significant the difference is
    area_percentage: float  # Percentage of total image


@dataclass
class ComparisonResult:
    """Result of comparing two submissions."""
    similarity_score: float  # 0-1, overall similarity
    structural_similarity: float  # SSIM score
    content_similarity: float  # Based on extracted content
    differences: List[DifferenceRegion]
    is_potential_copy: bool
    copy_confidence: float = 0.0
    matching_regions: int = 0
    total_regions: int = 0
    processing_time_ms: int = 0


@dataclass
class ProgressMetric:
    """A single metric tracked over time."""
    name: str
    values: List[float]
    timestamps: List[datetime]
    trend: str  # improving, declining, stable
    improvement_percentage: float


@dataclass
class ProgressReport:
    """Report on progress across multiple submissions."""
    submissions_count: int
    improvement_score: float  # Overall improvement 0-1
    metrics_over_time: Dict[str, List[float]]
    notable_improvements: List[str]
    areas_unchanged: List[str]
    timeline: List[datetime]
    first_submission_score: float
    latest_submission_score: float
    processing_time_ms: int = 0


@dataclass
class ExemplarComparison:
    """Result of comparing submission to exemplar."""
    similarity_to_exemplar: float
    matching_elements: List[str]
    missing_elements: List[str]
    extra_elements: List[str]
    quality_ratio: float  # Submission quality / Exemplar quality
    feedback: str
    processing_time_ms: int = 0


@dataclass
class WorkComparatorConfig:
    """Configuration for work comparator."""
    ssim_window_size: int = 7
    plagiarism_threshold: float = 0.85
    progress_min_samples: int = 2
    enable_feature_matching: bool = True
    enable_content_extraction: bool = True
    device: str = "cpu"


class WorkComparator:
    """
    Compare student work submissions.

    Capabilities:
    - Compare two submissions for similarity
    - Track progress across multiple submissions
    - Detect potential plagiarism
    - Compare against exemplar works

    Usage:
        config = WorkComparatorConfig()
        comparator = WorkComparator(config)

        # Compare two submissions
        result = comparator.compare_submissions(image1, image2)
        print(f"Similarity: {result.similarity_score}")

        # Track progress
        report = comparator.track_progress(submissions, timestamps)
        print(f"Improvement: {report.improvement_score}")
    """

    def __init__(
        self,
        config: Optional[WorkComparatorConfig] = None,
    ) -> None:
        """
        Initialize work comparator.

        Args:
            config: Comparator configuration
        """
        self.config = config or WorkComparatorConfig()
        self._feature_matcher = None
        self._models_loaded = False

        logger.info(
            f"WorkComparator initialized "
            f"(plagiarism_threshold: {self.config.plagiarism_threshold})"
        )

    def _load_models(self) -> None:
        """Load feature matching models."""
        if self._models_loaded:
            return

        if self.config.enable_feature_matching:
            try:
                # Use ORB for feature detection (free alternative to SIFT)
                self._orb = cv2.ORB_create(nfeatures=500)
                self._bf_matcher = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
                logger.info("ORB feature matcher loaded")
            except Exception as e:
                logger.warning(f"Failed to load ORB: {e}")
                self._orb = None
                self._bf_matcher = None

        self._models_loaded = True

    def compare_submissions(
        self,
        submission1: np.ndarray,
        submission2: np.ndarray,
        comparison_type: str = "similarity",
    ) -> ComparisonResult:
        """
        Compare two submissions for similarity.

        Args:
            submission1: First submission image (BGR)
            submission2: Second submission image (BGR)
            comparison_type: Type of comparison (similarity, plagiarism)

        Returns:
            ComparisonResult with similarity scores and differences
        """
        start_time = time.time()
        self._load_models()

        # Resize to same dimensions for comparison
        submission1, submission2 = self._normalize_sizes(submission1, submission2)

        # Calculate structural similarity (SSIM)
        structural_similarity = self._calculate_ssim(submission1, submission2)

        # Calculate content similarity using features
        content_similarity = self._calculate_content_similarity(submission1, submission2)

        # Find difference regions
        differences = self._find_differences(submission1, submission2)

        # Calculate overall similarity
        similarity_score = (
            structural_similarity * 0.4 +
            content_similarity * 0.6
        )

        # Check for plagiarism
        is_potential_copy = False
        copy_confidence = 0.0
        if comparison_type == "plagiarism" or similarity_score > self.config.plagiarism_threshold:
            is_potential_copy, copy_confidence = self._check_plagiarism(
                submission1, submission2, structural_similarity, content_similarity
            )

        elapsed_ms = int((time.time() - start_time) * 1000)

        return ComparisonResult(
            similarity_score=float(similarity_score),
            structural_similarity=float(structural_similarity),
            content_similarity=float(content_similarity),
            differences=differences,
            is_potential_copy=is_potential_copy,
            copy_confidence=copy_confidence,
            matching_regions=len([d for d in differences if d.difference_type == "matching"]),
            total_regions=len(differences),
            processing_time_ms=elapsed_ms,
        )

    def track_progress(
        self,
        submissions: List[np.ndarray],
        timestamps: List[datetime],
    ) -> ProgressReport:
        """
        Track progress across multiple submissions.

        Args:
            submissions: List of submission images in chronological order
            timestamps: Timestamps for each submission

        Returns:
            ProgressReport with improvement metrics
        """
        start_time = time.time()
        self._load_models()

        if len(submissions) < self.config.progress_min_samples:
            return ProgressReport(
                submissions_count=len(submissions),
                improvement_score=0.0,
                metrics_over_time={},
                notable_improvements=[],
                areas_unchanged=[],
                timeline=timestamps,
                first_submission_score=0.0,
                latest_submission_score=0.0,
            )

        # Calculate metrics for each submission
        metrics_over_time: Dict[str, List[float]] = {
            "quality_score": [],
            "detail_level": [],
            "line_quality": [],
            "composition_balance": [],
            "content_coverage": [],
        }

        for submission in submissions:
            metrics = self._extract_quality_metrics(submission)
            for key in metrics_over_time:
                metrics_over_time[key].append(metrics.get(key, 0.5))

        # Calculate improvement for each metric
        notable_improvements = []
        areas_unchanged = []

        for metric_name, values in metrics_over_time.items():
            if len(values) >= 2:
                improvement = values[-1] - values[0]
                if improvement > 0.15:
                    notable_improvements.append(
                        f"{metric_name.replace('_', ' ').title()}: "
                        f"+{improvement*100:.1f}%"
                    )
                elif abs(improvement) < 0.05:
                    areas_unchanged.append(metric_name.replace('_', ' ').title())

        # Calculate overall improvement score
        first_score = np.mean([v[0] for v in metrics_over_time.values()])
        latest_score = np.mean([v[-1] for v in metrics_over_time.values()])
        improvement_score = (latest_score - first_score + 1) / 2  # Normalize to 0-1

        elapsed_ms = int((time.time() - start_time) * 1000)

        return ProgressReport(
            submissions_count=len(submissions),
            improvement_score=float(improvement_score),
            metrics_over_time=metrics_over_time,
            notable_improvements=notable_improvements,
            areas_unchanged=areas_unchanged,
            timeline=timestamps,
            first_submission_score=float(first_score),
            latest_submission_score=float(latest_score),
            processing_time_ms=elapsed_ms,
        )

    def compare_to_exemplar(
        self,
        submission: np.ndarray,
        exemplar: np.ndarray,
    ) -> ExemplarComparison:
        """
        Compare submission to an exemplar work.

        Args:
            submission: Student submission image
            exemplar: Exemplar/model image

        Returns:
            ExemplarComparison with matching and feedback
        """
        start_time = time.time()
        self._load_models()

        # Normalize sizes
        submission, exemplar = self._normalize_sizes(submission, exemplar)

        # Calculate similarity
        similarity = self._calculate_ssim(submission, exemplar)

        # Extract elements from both
        submission_elements = self._extract_elements(submission)
        exemplar_elements = self._extract_elements(exemplar)

        # Compare elements
        matching = set(submission_elements) & set(exemplar_elements)
        missing = set(exemplar_elements) - set(submission_elements)
        extra = set(submission_elements) - set(exemplar_elements)

        # Calculate quality ratio
        submission_quality = self._calculate_quality_score(submission)
        exemplar_quality = self._calculate_quality_score(exemplar)
        quality_ratio = submission_quality / exemplar_quality if exemplar_quality > 0 else 0

        # Generate feedback
        feedback = self._generate_exemplar_feedback(
            similarity=similarity,
            matching=list(matching),
            missing=list(missing),
            quality_ratio=quality_ratio,
        )

        elapsed_ms = int((time.time() - start_time) * 1000)

        return ExemplarComparison(
            similarity_to_exemplar=float(similarity),
            matching_elements=list(matching),
            missing_elements=list(missing),
            extra_elements=list(extra),
            quality_ratio=float(quality_ratio),
            feedback=feedback,
            processing_time_ms=elapsed_ms,
        )

    def _normalize_sizes(
        self,
        img1: np.ndarray,
        img2: np.ndarray,
    ) -> Tuple[np.ndarray, np.ndarray]:
        """Resize images to same dimensions for comparison."""
        h1, w1 = img1.shape[:2]
        h2, w2 = img2.shape[:2]

        # Use smaller dimensions
        target_h = min(h1, h2)
        target_w = min(w1, w2)

        img1_resized = cv2.resize(img1, (target_w, target_h))
        img2_resized = cv2.resize(img2, (target_w, target_h))

        return img1_resized, img2_resized

    def _calculate_ssim(
        self,
        img1: np.ndarray,
        img2: np.ndarray,
    ) -> float:
        """Calculate Structural Similarity Index (SSIM)."""
        # Convert to grayscale
        if len(img1.shape) == 3:
            gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
        else:
            gray1 = img1

        if len(img2.shape) == 3:
            gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)
        else:
            gray2 = img2

        try:
            from skimage.metrics import structural_similarity as ssim
            score, _ = ssim(gray1, gray2, full=True)
            return float(score)
        except ImportError:
            # Fallback SSIM implementation
            return self._fallback_ssim(gray1, gray2)

    def _fallback_ssim(
        self,
        img1: np.ndarray,
        img2: np.ndarray,
    ) -> float:
        """Fallback SSIM calculation without skimage."""
        C1 = (0.01 * 255) ** 2
        C2 = (0.03 * 255) ** 2

        img1 = img1.astype(np.float64)
        img2 = img2.astype(np.float64)

        mu1 = cv2.GaussianBlur(img1, (11, 11), 1.5)
        mu2 = cv2.GaussianBlur(img2, (11, 11), 1.5)

        mu1_sq = mu1 ** 2
        mu2_sq = mu2 ** 2
        mu1_mu2 = mu1 * mu2

        sigma1_sq = cv2.GaussianBlur(img1 ** 2, (11, 11), 1.5) - mu1_sq
        sigma2_sq = cv2.GaussianBlur(img2 ** 2, (11, 11), 1.5) - mu2_sq
        sigma12 = cv2.GaussianBlur(img1 * img2, (11, 11), 1.5) - mu1_mu2

        ssim_map = ((2 * mu1_mu2 + C1) * (2 * sigma12 + C2)) / \
                   ((mu1_sq + mu2_sq + C1) * (sigma1_sq + sigma2_sq + C2))

        return float(np.mean(ssim_map))

    def _calculate_content_similarity(
        self,
        img1: np.ndarray,
        img2: np.ndarray,
    ) -> float:
        """Calculate content-based similarity using feature matching."""
        if not self.config.enable_feature_matching or self._orb is None:
            # Fallback to histogram comparison
            return self._histogram_similarity(img1, img2)

        # Convert to grayscale
        if len(img1.shape) == 3:
            gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
        else:
            gray1 = img1

        if len(img2.shape) == 3:
            gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)
        else:
            gray2 = img2

        # Detect features
        kp1, desc1 = self._orb.detectAndCompute(gray1, None)
        kp2, desc2 = self._orb.detectAndCompute(gray2, None)

        if desc1 is None or desc2 is None or len(desc1) == 0 or len(desc2) == 0:
            return self._histogram_similarity(img1, img2)

        # Match features
        try:
            matches = self._bf_matcher.match(desc1, desc2)
            matches = sorted(matches, key=lambda x: x.distance)

            # Calculate similarity based on good matches
            good_matches = [m for m in matches if m.distance < 50]
            max_matches = max(len(kp1), len(kp2))

            if max_matches > 0:
                return len(good_matches) / max_matches
            else:
                return 0.0

        except Exception as e:
            logger.debug(f"Feature matching failed: {e}")
            return self._histogram_similarity(img1, img2)

    def _histogram_similarity(
        self,
        img1: np.ndarray,
        img2: np.ndarray,
    ) -> float:
        """Calculate histogram-based similarity."""
        # Convert to HSV for better color comparison
        if len(img1.shape) == 3:
            hsv1 = cv2.cvtColor(img1, cv2.COLOR_BGR2HSV)
            hsv2 = cv2.cvtColor(img2, cv2.COLOR_BGR2HSV)

            hist1 = cv2.calcHist([hsv1], [0, 1], None, [50, 60], [0, 180, 0, 256])
            hist2 = cv2.calcHist([hsv2], [0, 1], None, [50, 60], [0, 180, 0, 256])
        else:
            hist1 = cv2.calcHist([img1], [0], None, [256], [0, 256])
            hist2 = cv2.calcHist([img2], [0], None, [256], [0, 256])

        cv2.normalize(hist1, hist1, 0, 1, cv2.NORM_MINMAX)
        cv2.normalize(hist2, hist2, 0, 1, cv2.NORM_MINMAX)

        return float(cv2.compareHist(hist1, hist2, cv2.HISTCMP_CORREL))

    def _find_differences(
        self,
        img1: np.ndarray,
        img2: np.ndarray,
    ) -> List[DifferenceRegion]:
        """Find regions of difference between two images."""
        differences = []

        # Convert to grayscale
        if len(img1.shape) == 3:
            gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
        else:
            gray1 = img1

        if len(img2.shape) == 3:
            gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)
        else:
            gray2 = img2

        # Calculate absolute difference
        diff = cv2.absdiff(gray1, gray2)

        # Threshold the difference
        _, thresh = cv2.threshold(diff, 30, 255, cv2.THRESH_BINARY)

        # Find contours of difference regions
        contours, _ = cv2.findContours(
            thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        total_area = img1.shape[0] * img1.shape[1]
        region_id = 0

        for contour in contours:
            area = cv2.contourArea(contour)
            if area < 100:  # Skip tiny differences
                continue

            x, y, w, h = cv2.boundingRect(contour)

            # Determine difference type by checking content in each image
            region1 = gray1[y:y+h, x:x+w]
            region2 = gray2[y:y+h, x:x+w]

            content1 = np.mean(region1) < 200  # Has content if not mostly white
            content2 = np.mean(region2) < 200

            if content1 and not content2:
                diff_type = "removed"
            elif not content1 and content2:
                diff_type = "added"
            else:
                diff_type = "modified"

            # Calculate intensity (how different the regions are)
            region_diff = cv2.absdiff(region1, region2)
            intensity = np.mean(region_diff) / 255

            differences.append(DifferenceRegion(
                region_id=f"diff_{region_id}",
                bounding_box=BoundingBox(x=x, y=y, width=w, height=h),
                difference_type=diff_type,
                intensity=float(intensity),
                area_percentage=float(area / total_area * 100),
            ))
            region_id += 1

        return differences

    def _check_plagiarism(
        self,
        img1: np.ndarray,
        img2: np.ndarray,
        ssim: float,
        content_sim: float,
    ) -> Tuple[bool, float]:
        """Check for potential plagiarism."""
        # High structural similarity indicates potential copy
        if ssim > 0.95:
            return True, ssim

        # High content similarity with high structural similarity
        combined = (ssim * 0.5 + content_sim * 0.5)
        if combined > self.config.plagiarism_threshold:
            return True, combined

        # Check for identical regions using template matching
        if len(img1.shape) == 3:
            gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
            gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)
        else:
            gray1, gray2 = img1, img2

        # Template match for identical regions
        result = cv2.matchTemplate(gray1, gray2, cv2.TM_CCOEFF_NORMED)
        _, max_val, _, _ = cv2.minMaxLoc(result)

        if max_val > 0.95:
            return True, max_val

        return False, combined

    def _extract_quality_metrics(
        self,
        image: np.ndarray,
    ) -> Dict[str, float]:
        """Extract quality metrics from an image."""
        metrics = {}

        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image

        # Edge density (detail level)
        edges = cv2.Canny(gray, 50, 150)
        metrics["detail_level"] = float(np.sum(edges > 0) / edges.size)

        # Line quality (using Hough lines)
        lines = cv2.HoughLinesP(
            edges, 1, np.pi/180, 50, minLineLength=30, maxLineGap=10
        )
        if lines is not None:
            metrics["line_quality"] = min(len(lines) / 100, 1.0)
        else:
            metrics["line_quality"] = 0.3

        # Composition balance
        h, w = gray.shape
        left_half = gray[:, :w//2]
        right_half = gray[:, w//2:]
        balance = 1 - abs(np.mean(left_half) - np.mean(right_half)) / 255
        metrics["composition_balance"] = float(balance)

        # Content coverage
        _, binary = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY_INV)
        metrics["content_coverage"] = float(np.sum(binary > 0) / binary.size)

        # Overall quality score
        metrics["quality_score"] = float(np.mean(list(metrics.values())))

        return metrics

    def _extract_elements(
        self,
        image: np.ndarray,
    ) -> List[str]:
        """Extract element descriptions from image."""
        elements = []

        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image

        edges = cv2.Canny(gray, 50, 150)
        contours, _ = cv2.findContours(
            edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        for contour in contours:
            area = cv2.contourArea(contour)
            if area < 100:
                continue

            perimeter = cv2.arcLength(contour, True)
            if perimeter == 0:
                continue

            approx = cv2.approxPolyDP(contour, 0.04 * perimeter, True)
            circularity = 4 * np.pi * area / (perimeter * perimeter)

            # Classify shape
            if circularity > 0.85:
                elements.append("circle")
            elif len(approx) == 3:
                elements.append("triangle")
            elif len(approx) == 4:
                elements.append("rectangle")
            elif len(approx) > 4:
                elements.append("polygon")
            else:
                elements.append("line")

        return elements

    def _calculate_quality_score(
        self,
        image: np.ndarray,
    ) -> float:
        """Calculate overall quality score for an image."""
        metrics = self._extract_quality_metrics(image)
        return metrics.get("quality_score", 0.5)

    def _generate_exemplar_feedback(
        self,
        similarity: float,
        matching: List[str],
        missing: List[str],
        quality_ratio: float,
    ) -> str:
        """Generate feedback comparing to exemplar."""
        feedback_parts = []

        # Overall similarity assessment
        if similarity >= 0.8:
            feedback_parts.append("Excellent! Your work closely matches the exemplar.")
        elif similarity >= 0.6:
            feedback_parts.append("Good work! Your submission shows many similarities to the exemplar.")
        elif similarity >= 0.4:
            feedback_parts.append("Your work shows some alignment with the exemplar.")
        else:
            feedback_parts.append("Your work differs significantly from the exemplar.")

        # Matching elements
        if matching:
            match_summary = list(set(matching))[:3]
            feedback_parts.append(f"You've successfully included: {', '.join(match_summary)}.")

        # Missing elements
        if missing:
            missing_summary = list(set(missing))[:3]
            feedback_parts.append(f"Consider adding: {', '.join(missing_summary)}.")

        # Quality feedback
        if quality_ratio >= 1.0:
            feedback_parts.append("The quality of your work meets or exceeds the exemplar.")
        elif quality_ratio >= 0.8:
            feedback_parts.append("Your work quality is close to the exemplar level.")
        else:
            feedback_parts.append("There's room to improve the overall quality.")

        return " ".join(feedback_parts)

    def generate_difference_visualization(
        self,
        img1: np.ndarray,
        img2: np.ndarray,
        differences: List[DifferenceRegion],
    ) -> np.ndarray:
        """
        Generate a visualization showing differences between images.

        Args:
            img1: First image
            img2: Second image
            differences: List of difference regions

        Returns:
            Visualization image with differences highlighted
        """
        # Resize to same dimensions
        img1, img2 = self._normalize_sizes(img1, img2)

        # Create side-by-side comparison
        h, w = img1.shape[:2]
        if len(img1.shape) == 3:
            viz = np.zeros((h, w * 2 + 10, 3), dtype=np.uint8)
            viz[:, :w] = img1
            viz[:, w+10:] = img2
        else:
            viz = np.zeros((h, w * 2 + 10), dtype=np.uint8)
            viz[:, :w] = img1
            viz[:, w+10:] = img2

        # Draw difference rectangles
        for diff in differences:
            bbox = diff.bounding_box

            # Color based on type
            if diff.difference_type == "added":
                color = (0, 255, 0)  # Green
            elif diff.difference_type == "removed":
                color = (0, 0, 255)  # Red
            else:
                color = (0, 165, 255)  # Orange

            # Draw on first image
            cv2.rectangle(
                viz,
                (bbox.x, bbox.y),
                (bbox.x + bbox.width, bbox.y + bbox.height),
                color, 2
            )

            # Draw on second image
            cv2.rectangle(
                viz,
                (bbox.x + w + 10, bbox.y),
                (bbox.x + bbox.width + w + 10, bbox.y + bbox.height),
                color, 2
            )

        return viz

    def is_loaded(self) -> bool:
        """Check if models are loaded."""
        return self._models_loaded

    def get_model_info(self) -> Dict[str, Any]:
        """Get information about loaded models."""
        return {
            "models_loaded": self._models_loaded,
            "feature_matching_enabled": self.config.enable_feature_matching,
            "orb_available": self._orb is not None,
            "plagiarism_threshold": self.config.plagiarism_threshold,
        }
