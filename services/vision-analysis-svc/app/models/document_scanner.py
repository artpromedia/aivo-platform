"""
Document Scanner for cleaning up photos of documents.

Features:
- Perspective correction
- Contrast enhancement
- Shadow removal
- Background removal
- Noise reduction
- Rotation correction

Uses OpenCV for all image processing operations.
"""

import logging
import time
from dataclasses import dataclass, field
from typing import List, Optional, Tuple

import cv2
import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class Point:
    """2D point representation."""
    x: int
    y: int

    def to_tuple(self) -> Tuple[int, int]:
        """Convert to tuple."""
        return (self.x, self.y)

    @classmethod
    def from_tuple(cls, t: Tuple[int, int]) -> "Point":
        """Create from tuple."""
        return cls(x=t[0], y=t[1])


@dataclass
class DocumentScannerConfig:
    """Configuration for document scanner."""
    auto_detect_bounds: bool = True
    auto_enhance: bool = True
    auto_deskew: bool = True
    denoise_strength: float = 10.0
    contrast_method: str = "clahe"
    output_dpi: int = 300
    min_area_ratio: float = 0.1  # Min document area relative to image
    max_aspect_ratio: float = 4.0  # Max document aspect ratio


@dataclass
class ScannedDocument:
    """Result from document scanning."""
    original_image: np.ndarray
    processed_image: np.ndarray
    detected_bounds: Optional[List[Point]] = None
    rotation_applied: float = 0.0
    quality_score: float = 0.0
    enhancements_applied: List[str] = field(default_factory=list)
    processing_time_ms: int = 0


class DocumentScanner:
    """
    Clean up photos of documents for better processing.

    Provides automatic document detection, perspective correction,
    and image enhancement for photos of documents taken with
    mobile devices or cameras.

    Usage:
        scanner = DocumentScanner()
        result = scanner.scan(image)
        processed = result.processed_image
    """

    def __init__(self, config: Optional[DocumentScannerConfig] = None) -> None:
        """
        Initialize document scanner.

        Args:
            config: Scanner configuration options
        """
        self.config = config or DocumentScannerConfig()
        logger.info("DocumentScanner initialized")

    def scan(
        self,
        image: np.ndarray,
        auto_enhance: Optional[bool] = None,
    ) -> ScannedDocument:
        """
        Scan and enhance a document image.

        Full pipeline: detect bounds -> perspective correct -> enhance

        Args:
            image: Input image (BGR format)
            auto_enhance: Override config auto_enhance setting

        Returns:
            ScannedDocument with processed image and metadata
        """
        start_time = time.time()
        enhancements = []

        if image is None or image.size == 0:
            raise ValueError("Invalid input image")

        original = image.copy()
        processed = image.copy()
        detected_bounds = None
        rotation = 0.0

        # Step 1: Detect document bounds
        if self.config.auto_detect_bounds:
            bounds = self.detect_document_bounds(processed)
            if bounds is not None:
                detected_bounds = bounds
                processed = self.correct_perspective(processed, bounds)
                enhancements.append("perspective_correction")

        # Step 2: Auto-deskew
        if self.config.auto_deskew:
            processed, rotation = self._deskew(processed)
            if abs(rotation) > 0.1:
                enhancements.append(f"rotation_{rotation:.1f}deg")

        # Step 3: Enhancement
        should_enhance = auto_enhance if auto_enhance is not None else self.config.auto_enhance
        if should_enhance:
            processed = self.enhance_quality(processed)
            enhancements.extend(["denoise", "contrast", "sharpen"])

        # Calculate quality score
        quality_score = self._estimate_quality(processed)

        elapsed_ms = int((time.time() - start_time) * 1000)

        return ScannedDocument(
            original_image=original,
            processed_image=processed,
            detected_bounds=detected_bounds,
            rotation_applied=rotation,
            quality_score=quality_score,
            enhancements_applied=enhancements,
            processing_time_ms=elapsed_ms
        )

    def detect_document_bounds(
        self,
        image: np.ndarray,
    ) -> Optional[List[Point]]:
        """
        Detect document boundaries in an image.

        Uses edge detection and contour analysis to find
        a rectangular document region.

        Args:
            image: Input image (BGR format)

        Returns:
            List of 4 corner points [top-left, top-right, bottom-right, bottom-left]
            or None if no document detected
        """
        if image is None or image.size == 0:
            return None

        h, w = image.shape[:2]
        min_area = h * w * self.config.min_area_ratio

        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Apply Gaussian blur
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)

        # Edge detection
        edges = cv2.Canny(blurred, 50, 150)

        # Dilate edges to close gaps
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        dilated = cv2.dilate(edges, kernel, iterations=2)

        # Find contours
        contours, _ = cv2.findContours(
            dilated,
            cv2.RETR_EXTERNAL,
            cv2.CHAIN_APPROX_SIMPLE
        )

        if not contours:
            return None

        # Find the largest quadrilateral contour
        best_contour = None
        best_area = 0

        for contour in contours:
            area = cv2.contourArea(contour)
            if area < min_area:
                continue

            # Approximate contour
            peri = cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, 0.02 * peri, True)

            # Check if it's a quadrilateral
            if len(approx) == 4 and area > best_area:
                # Check aspect ratio
                rect = cv2.minAreaRect(approx)
                rect_w, rect_h = rect[1]
                if rect_w > 0 and rect_h > 0:
                    aspect = max(rect_w, rect_h) / min(rect_w, rect_h)
                    if aspect <= self.config.max_aspect_ratio:
                        best_contour = approx
                        best_area = area

        if best_contour is None:
            return None

        # Order points: top-left, top-right, bottom-right, bottom-left
        points = best_contour.reshape(4, 2)
        ordered = self._order_points(points)

        return [Point(int(p[0]), int(p[1])) for p in ordered]

    def _order_points(self, pts: np.ndarray) -> np.ndarray:
        """
        Order points in clockwise order starting from top-left.

        Args:
            pts: Array of 4 points

        Returns:
            Ordered points array
        """
        rect = np.zeros((4, 2), dtype=np.float32)

        # Sum of coordinates: top-left has smallest, bottom-right has largest
        s = pts.sum(axis=1)
        rect[0] = pts[np.argmin(s)]  # top-left
        rect[2] = pts[np.argmax(s)]  # bottom-right

        # Difference: top-right has smallest, bottom-left has largest
        diff = np.diff(pts, axis=1)
        rect[1] = pts[np.argmin(diff)]  # top-right
        rect[3] = pts[np.argmax(diff)]  # bottom-left

        return rect

    def correct_perspective(
        self,
        image: np.ndarray,
        bounds: List[Point],
    ) -> np.ndarray:
        """
        Apply perspective correction to straighten document.

        Args:
            image: Input image
            bounds: Four corner points of the document

        Returns:
            Perspective-corrected image
        """
        if len(bounds) != 4:
            raise ValueError("Bounds must contain exactly 4 points")

        # Convert bounds to numpy array
        src_pts = np.array([p.to_tuple() for p in bounds], dtype=np.float32)

        # Calculate output dimensions
        width_top = np.linalg.norm(src_pts[1] - src_pts[0])
        width_bottom = np.linalg.norm(src_pts[2] - src_pts[3])
        width = int(max(width_top, width_bottom))

        height_left = np.linalg.norm(src_pts[3] - src_pts[0])
        height_right = np.linalg.norm(src_pts[2] - src_pts[1])
        height = int(max(height_left, height_right))

        # Destination points
        dst_pts = np.array([
            [0, 0],
            [width - 1, 0],
            [width - 1, height - 1],
            [0, height - 1]
        ], dtype=np.float32)

        # Compute perspective transform
        matrix = cv2.getPerspectiveTransform(src_pts, dst_pts)

        # Apply transform
        warped = cv2.warpPerspective(
            image,
            matrix,
            (width, height),
            flags=cv2.INTER_LINEAR,
            borderMode=cv2.BORDER_REPLICATE
        )

        return warped

    def _deskew(self, image: np.ndarray) -> Tuple[np.ndarray, float]:
        """
        Correct slight rotation in the document.

        Args:
            image: Input image

        Returns:
            Tuple of (deskewed image, rotation angle in degrees)
        """
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Detect edges
        edges = cv2.Canny(gray, 50, 150, apertureSize=3)

        # Detect lines
        lines = cv2.HoughLinesP(
            edges,
            rho=1,
            theta=np.pi / 180,
            threshold=100,
            minLineLength=100,
            maxLineGap=10
        )

        if lines is None or len(lines) == 0:
            return image.copy(), 0.0

        # Calculate angles of lines
        angles = []
        for line in lines:
            x1, y1, x2, y2 = line[0]
            angle = np.degrees(np.arctan2(y2 - y1, x2 - x1))
            # Only consider nearly horizontal lines
            if abs(angle) < 45:
                angles.append(angle)

        if not angles:
            return image.copy(), 0.0

        # Use median angle for robustness
        median_angle = np.median(angles)

        # Skip very small rotations
        if abs(median_angle) < 0.5:
            return image.copy(), 0.0

        # Rotate image
        h, w = image.shape[:2]
        center = (w // 2, h // 2)
        matrix = cv2.getRotationMatrix2D(center, median_angle, 1.0)

        rotated = cv2.warpAffine(
            image,
            matrix,
            (w, h),
            flags=cv2.INTER_LINEAR,
            borderMode=cv2.BORDER_REPLICATE
        )

        return rotated, median_angle

    def enhance_quality(self, image: np.ndarray) -> np.ndarray:
        """
        Apply quality enhancement to document image.

        Includes:
        - Noise reduction
        - Contrast enhancement
        - Sharpening

        Args:
            image: Input image

        Returns:
            Enhanced image
        """
        if image is None or image.size == 0:
            raise ValueError("Invalid input image")

        enhanced = image.copy()

        # Step 1: Denoise
        enhanced = self._denoise(enhanced)

        # Step 2: Remove shadows
        enhanced = self._remove_shadows(enhanced)

        # Step 3: Enhance contrast
        enhanced = self._enhance_contrast(enhanced)

        # Step 4: Sharpen
        enhanced = self._sharpen(enhanced)

        return enhanced

    def _denoise(self, image: np.ndarray) -> np.ndarray:
        """Apply denoising."""
        return cv2.fastNlMeansDenoisingColored(
            image,
            None,
            h=self.config.denoise_strength,
            hForColorComponents=self.config.denoise_strength,
            templateWindowSize=7,
            searchWindowSize=21
        )

    def _remove_shadows(self, image: np.ndarray) -> np.ndarray:
        """Remove shadows from document."""
        # Convert to LAB color space
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        l_channel, a_channel, b_channel = cv2.split(lab)

        # Estimate background using morphological operations
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (51, 51))
        bg = cv2.morphologyEx(l_channel, cv2.MORPH_CLOSE, kernel)

        # Calculate the difference
        diff = cv2.absdiff(l_channel, bg)

        # Normalize
        normalized = cv2.normalize(
            255 - diff, None, 0, 255, cv2.NORM_MINMAX
        ).astype(np.uint8)

        # Reconstruct the image
        enhanced_lab = cv2.merge([normalized, a_channel, b_channel])
        return cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)

    def _enhance_contrast(self, image: np.ndarray) -> np.ndarray:
        """Enhance contrast using CLAHE or histogram equalization."""
        if self.config.contrast_method == "clahe":
            lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
            l_channel, a_channel, b_channel = cv2.split(lab)

            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            enhanced_l = clahe.apply(l_channel)

            enhanced_lab = cv2.merge([enhanced_l, a_channel, b_channel])
            return cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)

        elif self.config.contrast_method == "histogram":
            ycrcb = cv2.cvtColor(image, cv2.COLOR_BGR2YCrCb)
            ycrcb[:, :, 0] = cv2.equalizeHist(ycrcb[:, :, 0])
            return cv2.cvtColor(ycrcb, cv2.COLOR_YCrCb2BGR)

        return image

    def _sharpen(self, image: np.ndarray) -> np.ndarray:
        """Apply mild sharpening filter."""
        # Unsharp mask
        gaussian = cv2.GaussianBlur(image, (0, 0), 2.0)
        sharpened = cv2.addWeighted(image, 1.5, gaussian, -0.5, 0)
        return sharpened

    def _estimate_quality(self, image: np.ndarray) -> float:
        """
        Estimate document readability quality.

        Uses multiple metrics to estimate how readable the document is.

        Args:
            image: Input image

        Returns:
            Quality score between 0 and 1
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Metric 1: Contrast (using standard deviation)
        contrast = gray.std() / 128.0  # Normalize to ~1

        # Metric 2: Sharpness (using Laplacian variance)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        sharpness = min(laplacian_var / 500.0, 1.0)  # Normalize to ~1

        # Metric 3: Noise level (estimated using difference of Gaussians)
        blur1 = cv2.GaussianBlur(gray, (3, 3), 0)
        blur2 = cv2.GaussianBlur(gray, (5, 5), 0)
        noise = np.abs(blur1.astype(float) - blur2.astype(float)).mean()
        noise_score = max(0, 1 - noise / 20.0)  # Lower noise is better

        # Combine metrics
        quality = (contrast * 0.3 + sharpness * 0.4 + noise_score * 0.3)
        return min(max(quality, 0.0), 1.0)

    def crop_to_content(
        self,
        image: np.ndarray,
        margin: int = 10,
    ) -> np.ndarray:
        """
        Crop image to content area, removing excess background.

        Args:
            image: Input image
            margin: Margin to add around content

        Returns:
            Cropped image
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Threshold
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

        # Find bounding box of content
        coords = cv2.findNonZero(binary)
        if coords is None:
            return image.copy()

        x, y, w, h = cv2.boundingRect(coords)

        # Add margin
        h_img, w_img = image.shape[:2]
        x = max(0, x - margin)
        y = max(0, y - margin)
        w = min(w_img - x, w + 2 * margin)
        h = min(h_img - y, h + 2 * margin)

        return image[y:y+h, x:x+w]

    def convert_to_binary(
        self,
        image: np.ndarray,
        method: str = "adaptive",
    ) -> np.ndarray:
        """
        Convert document to black and white binary image.

        Args:
            image: Input image
            method: Binarization method ('otsu', 'adaptive', 'sauvola')

        Returns:
            Binary image
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        if method == "otsu":
            _, binary = cv2.threshold(
                gray, 0, 255,
                cv2.THRESH_BINARY + cv2.THRESH_OTSU
            )

        elif method == "adaptive":
            binary = cv2.adaptiveThreshold(
                gray, 255,
                cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY,
                21, 10
            )

        elif method == "sauvola":
            # Sauvola's method for uneven illumination
            block_size = 51
            k = 0.2

            mean = cv2.blur(gray.astype(np.float64), (block_size, block_size))
            mean_sq = cv2.blur(gray.astype(np.float64) ** 2, (block_size, block_size))
            std = np.sqrt(np.maximum(mean_sq - mean ** 2, 0))

            threshold = mean * (1 + k * (std / 128 - 1))
            binary = (gray > threshold).astype(np.uint8) * 255

        else:
            raise ValueError(f"Unknown binarization method: {method}")

        return binary

    def resize_for_output(
        self,
        image: np.ndarray,
        target_width: Optional[int] = None,
        target_height: Optional[int] = None,
        max_dimension: Optional[int] = None,
    ) -> np.ndarray:
        """
        Resize image for output with various constraints.

        Args:
            image: Input image
            target_width: Exact target width (optional)
            target_height: Exact target height (optional)
            max_dimension: Maximum width or height (optional)

        Returns:
            Resized image
        """
        h, w = image.shape[:2]

        if target_width and target_height:
            return cv2.resize(image, (target_width, target_height))

        if target_width:
            scale = target_width / w
            new_h = int(h * scale)
            return cv2.resize(image, (target_width, new_h))

        if target_height:
            scale = target_height / h
            new_w = int(w * scale)
            return cv2.resize(image, (new_w, target_height))

        if max_dimension:
            if max(h, w) > max_dimension:
                scale = max_dimension / max(h, w)
                new_w = int(w * scale)
                new_h = int(h * scale)
                return cv2.resize(image, (new_w, new_h))

        return image.copy()
