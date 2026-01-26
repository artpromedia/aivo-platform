"""
Centralized image preprocessing pipeline.

Provides fast, deterministic image processing operations for OCR,
classification, and math equation recognition.

Operations:
1. Resize to model input size
2. Normalize pixel values
3. Convert color spaces
4. Denoise
5. Binarize (for OCR)
6. Deskew
"""

import logging
import time
from dataclasses import dataclass
from enum import Enum
from typing import Optional, Tuple

import cv2
import numpy as np

logger = logging.getLogger(__name__)


class ColorSpace(Enum):
    """Supported color spaces."""
    BGR = "bgr"
    RGB = "rgb"
    GRAYSCALE = "grayscale"
    HSV = "hsv"
    LAB = "lab"


@dataclass
class PreprocessingResult:
    """Result from preprocessing pipeline."""
    image: np.ndarray
    original_size: Tuple[int, int]
    processed_size: Tuple[int, int]
    operations_applied: list
    processing_time_ms: int


class ImagePreprocessor:
    """
    Image preprocessing utilities for vision analysis.

    Provides fast (<100ms) and deterministic preprocessing operations
    for various vision tasks including OCR, classification, and
    mathematical equation recognition.

    All methods are thread-safe and can be used concurrently.

    Usage:
        preprocessor = ImagePreprocessor()
        ocr_image = preprocessor.preprocess_for_ocr(image)
        detection_image = preprocessor.preprocess_for_detection(image, (640, 640))
    """

    # Default normalization parameters (ImageNet)
    IMAGENET_MEAN = (0.485, 0.456, 0.406)
    IMAGENET_STD = (0.229, 0.224, 0.225)

    def __init__(self) -> None:
        """Initialize the image preprocessor."""
        logger.info("ImagePreprocessor initialized")

    def resize(
        self,
        image: np.ndarray,
        target_size: Tuple[int, int],
        keep_aspect: bool = True,
        interpolation: int = cv2.INTER_LINEAR,
        pad_color: Tuple[int, int, int] = (0, 0, 0),
    ) -> np.ndarray:
        """
        Resize image to target size.

        Args:
            image: Input image (BGR format)
            target_size: Target (width, height)
            keep_aspect: If True, preserve aspect ratio and pad
            interpolation: OpenCV interpolation method
            pad_color: Color to use for padding if keep_aspect=True

        Returns:
            Resized image
        """
        if image is None or image.size == 0:
            raise ValueError("Invalid input image")

        target_w, target_h = target_size
        h, w = image.shape[:2]

        if not keep_aspect:
            return cv2.resize(image, (target_w, target_h), interpolation=interpolation)

        # Calculate scaling factor preserving aspect ratio
        scale = min(target_w / w, target_h / h)
        new_w = int(w * scale)
        new_h = int(h * scale)

        # Resize
        resized = cv2.resize(image, (new_w, new_h), interpolation=interpolation)

        # Create padded output
        if len(image.shape) == 3:
            result = np.full((target_h, target_w, image.shape[2]), pad_color, dtype=image.dtype)
        else:
            result = np.full((target_h, target_w), pad_color[0], dtype=image.dtype)

        # Center the resized image
        x_offset = (target_w - new_w) // 2
        y_offset = (target_h - new_h) // 2

        if len(image.shape) == 3:
            result[y_offset:y_offset + new_h, x_offset:x_offset + new_w, :] = resized
        else:
            result[y_offset:y_offset + new_h, x_offset:x_offset + new_w] = resized

        return result

    def normalize(
        self,
        image: np.ndarray,
        mean: Tuple[float, ...] = IMAGENET_MEAN,
        std: Tuple[float, ...] = IMAGENET_STD,
    ) -> np.ndarray:
        """
        Normalize image for neural network input.

        Converts to float32 and applies mean/std normalization.

        Args:
            image: Input image (BGR or RGB, uint8)
            mean: Per-channel mean (R, G, B)
            std: Per-channel standard deviation (R, G, B)

        Returns:
            Normalized image as float32
        """
        if image is None or image.size == 0:
            raise ValueError("Invalid input image")

        # Convert to float32
        normalized = image.astype(np.float32) / 255.0

        # Apply normalization per channel
        if len(normalized.shape) == 3 and normalized.shape[2] == 3:
            for i, (m, s) in enumerate(zip(mean, std)):
                normalized[:, :, i] = (normalized[:, :, i] - m) / s
        elif len(normalized.shape) == 2:
            # Grayscale - use average of RGB values
            m = sum(mean) / len(mean)
            s = sum(std) / len(std)
            normalized = (normalized - m) / s

        return normalized

    def to_grayscale(self, image: np.ndarray) -> np.ndarray:
        """
        Convert image to grayscale.

        Args:
            image: Input image (BGR format)

        Returns:
            Grayscale image
        """
        if image is None or image.size == 0:
            raise ValueError("Invalid input image")

        if len(image.shape) == 2:
            return image  # Already grayscale

        if image.shape[2] == 1:
            return image.squeeze()

        return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    def convert_color_space(
        self,
        image: np.ndarray,
        from_space: ColorSpace,
        to_space: ColorSpace,
    ) -> np.ndarray:
        """
        Convert between color spaces.

        Args:
            image: Input image
            from_space: Source color space
            to_space: Target color space

        Returns:
            Converted image
        """
        if from_space == to_space:
            return image.copy()

        conversions = {
            (ColorSpace.BGR, ColorSpace.RGB): cv2.COLOR_BGR2RGB,
            (ColorSpace.RGB, ColorSpace.BGR): cv2.COLOR_RGB2BGR,
            (ColorSpace.BGR, ColorSpace.GRAYSCALE): cv2.COLOR_BGR2GRAY,
            (ColorSpace.RGB, ColorSpace.GRAYSCALE): cv2.COLOR_RGB2GRAY,
            (ColorSpace.BGR, ColorSpace.HSV): cv2.COLOR_BGR2HSV,
            (ColorSpace.RGB, ColorSpace.HSV): cv2.COLOR_RGB2HSV,
            (ColorSpace.HSV, ColorSpace.BGR): cv2.COLOR_HSV2BGR,
            (ColorSpace.HSV, ColorSpace.RGB): cv2.COLOR_HSV2RGB,
            (ColorSpace.BGR, ColorSpace.LAB): cv2.COLOR_BGR2LAB,
            (ColorSpace.RGB, ColorSpace.LAB): cv2.COLOR_RGB2LAB,
            (ColorSpace.LAB, ColorSpace.BGR): cv2.COLOR_LAB2BGR,
            (ColorSpace.LAB, ColorSpace.RGB): cv2.COLOR_LAB2RGB,
        }

        key = (from_space, to_space)
        if key not in conversions:
            raise ValueError(f"Unsupported color conversion: {from_space} -> {to_space}")

        return cv2.cvtColor(image, conversions[key])

    def deskew(
        self,
        image: np.ndarray,
        max_angle: float = 45.0,
    ) -> Tuple[np.ndarray, float]:
        """
        Deskew rotated document images.

        Uses line detection to find dominant angle and correct rotation.

        Args:
            image: Input image (grayscale or BGR)
            max_angle: Maximum rotation angle to correct

        Returns:
            Tuple of (deskewed image, rotation angle applied in degrees)
        """
        if image is None or image.size == 0:
            raise ValueError("Invalid input image")

        # Convert to grayscale if needed
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()

        # Edge detection
        edges = cv2.Canny(gray, 50, 150, apertureSize=3)

        # Detect lines using Hough transform
        lines = cv2.HoughLinesP(
            edges,
            rho=1,
            theta=np.pi / 180,
            threshold=100,
            minLineLength=50,
            maxLineGap=10
        )

        if lines is None or len(lines) == 0:
            return image.copy(), 0.0

        # Calculate angles of detected lines
        angles = []
        for line in lines:
            x1, y1, x2, y2 = line[0]
            angle = np.degrees(np.arctan2(y2 - y1, x2 - x1))
            # Only consider nearly horizontal or vertical lines
            if abs(angle) < max_angle or abs(abs(angle) - 90) < max_angle:
                angles.append(angle)

        if not angles:
            return image.copy(), 0.0

        # Use median angle
        median_angle = np.median(angles)

        # Snap to nearest multiple of 90 if close
        for snap_angle in [0, 90, -90, 180, -180]:
            if abs(median_angle - snap_angle) < 2:
                median_angle = snap_angle
                break

        # Apply rotation
        h, w = image.shape[:2]
        center = (w // 2, h // 2)

        rotation_matrix = cv2.getRotationMatrix2D(center, median_angle, 1.0)

        # Calculate new bounding box size
        cos_angle = abs(rotation_matrix[0, 0])
        sin_angle = abs(rotation_matrix[0, 1])
        new_w = int(h * sin_angle + w * cos_angle)
        new_h = int(h * cos_angle + w * sin_angle)

        # Adjust rotation matrix for new size
        rotation_matrix[0, 2] += (new_w - w) / 2
        rotation_matrix[1, 2] += (new_h - h) / 2

        rotated = cv2.warpAffine(
            image,
            rotation_matrix,
            (new_w, new_h),
            flags=cv2.INTER_LINEAR,
            borderMode=cv2.BORDER_REPLICATE
        )

        return rotated, median_angle

    def enhance_contrast(
        self,
        image: np.ndarray,
        method: str = "clahe",
        clip_limit: float = 2.0,
        tile_size: Tuple[int, int] = (8, 8),
    ) -> np.ndarray:
        """
        Enhance image contrast.

        Args:
            image: Input image
            method: Enhancement method ('clahe', 'histogram', 'adaptive')
            clip_limit: Clip limit for CLAHE
            tile_size: Tile grid size for CLAHE

        Returns:
            Contrast-enhanced image
        """
        if image is None or image.size == 0:
            raise ValueError("Invalid input image")

        if method == "clahe":
            # Contrast Limited Adaptive Histogram Equalization
            if len(image.shape) == 3:
                # Convert to LAB, enhance L channel
                lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
                l_channel, a_channel, b_channel = cv2.split(lab)

                clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_size)
                enhanced_l = clahe.apply(l_channel)

                enhanced_lab = cv2.merge([enhanced_l, a_channel, b_channel])
                return cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)
            else:
                clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_size)
                return clahe.apply(image)

        elif method == "histogram":
            # Standard histogram equalization
            if len(image.shape) == 3:
                ycrcb = cv2.cvtColor(image, cv2.COLOR_BGR2YCrCb)
                ycrcb[:, :, 0] = cv2.equalizeHist(ycrcb[:, :, 0])
                return cv2.cvtColor(ycrcb, cv2.COLOR_YCrCb2BGR)
            else:
                return cv2.equalizeHist(image)

        elif method == "adaptive":
            # Adaptive thresholding-based enhancement
            if len(image.shape) == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            else:
                gray = image

            enhanced = cv2.adaptiveThreshold(
                gray, 255,
                cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY,
                11, 2
            )

            if len(image.shape) == 3:
                return cv2.cvtColor(enhanced, cv2.COLOR_GRAY2BGR)
            return enhanced

        else:
            raise ValueError(f"Unknown contrast enhancement method: {method}")

    def denoise(
        self,
        image: np.ndarray,
        strength: float = 10.0,
        method: str = "fastNl",
    ) -> np.ndarray:
        """
        Remove noise from image.

        Args:
            image: Input image
            strength: Denoising strength (filter size for fastNl)
            method: Denoising method ('fastNl', 'bilateral', 'gaussian')

        Returns:
            Denoised image
        """
        if image is None or image.size == 0:
            raise ValueError("Invalid input image")

        if method == "fastNl":
            if len(image.shape) == 3:
                return cv2.fastNlMeansDenoisingColored(
                    image,
                    None,
                    h=strength,
                    hForColorComponents=strength,
                    templateWindowSize=7,
                    searchWindowSize=21
                )
            else:
                return cv2.fastNlMeansDenoising(
                    image,
                    None,
                    h=strength,
                    templateWindowSize=7,
                    searchWindowSize=21
                )

        elif method == "bilateral":
            return cv2.bilateralFilter(
                image,
                d=9,
                sigmaColor=strength * 7.5,
                sigmaSpace=strength * 7.5
            )

        elif method == "gaussian":
            kernel_size = int(strength) | 1  # Ensure odd number
            return cv2.GaussianBlur(image, (kernel_size, kernel_size), 0)

        else:
            raise ValueError(f"Unknown denoising method: {method}")

    def binarize(
        self,
        image: np.ndarray,
        method: str = "otsu",
        block_size: int = 11,
        c: int = 2,
    ) -> np.ndarray:
        """
        Binarize image for OCR.

        Args:
            image: Input image (grayscale or BGR)
            method: Binarization method ('otsu', 'adaptive', 'sauvola')
            block_size: Block size for adaptive methods
            c: Constant subtracted from mean for adaptive method

        Returns:
            Binary image (black text on white background)
        """
        if image is None or image.size == 0:
            raise ValueError("Invalid input image")

        # Convert to grayscale if needed
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()

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
                block_size, c
            )

        elif method == "sauvola":
            # Sauvola's local threshold method
            # More robust for documents with uneven illumination
            mean = cv2.blur(gray.astype(np.float64), (block_size, block_size))
            mean_sq = cv2.blur(gray.astype(np.float64) ** 2, (block_size, block_size))
            std = np.sqrt(np.maximum(mean_sq - mean ** 2, 0))

            k = 0.2  # Sauvola parameter
            r = 128  # Dynamic range

            threshold = mean * (1 + k * (std / r - 1))
            binary = (gray > threshold).astype(np.uint8) * 255

        else:
            raise ValueError(f"Unknown binarization method: {method}")

        return binary

    def remove_shadows(self, image: np.ndarray) -> np.ndarray:
        """
        Remove shadows from document images.

        Args:
            image: Input image (BGR)

        Returns:
            Shadow-removed image
        """
        if image is None or image.size == 0:
            raise ValueError("Invalid input image")

        if len(image.shape) != 3:
            return image.copy()

        # Split into planes
        planes = list(cv2.split(image))

        for i, plane in enumerate(planes):
            # Create a large kernel for morphological operations
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))

            # Dilate to get background
            dilated = cv2.dilate(plane, kernel, iterations=5)

            # Blur background
            bg = cv2.medianBlur(dilated, 21)

            # Compute difference and normalize
            diff = 255 - cv2.absdiff(plane, bg)

            # Normalize
            planes[i] = cv2.normalize(diff, None, 0, 255, cv2.NORM_MINMAX)

        return cv2.merge(planes)

    def preprocess_for_ocr(
        self,
        image: np.ndarray,
        target_height: Optional[int] = None,
    ) -> np.ndarray:
        """
        Full preprocessing pipeline for OCR.

        Applies: grayscale, denoise, contrast enhance, binarize, deskew

        Args:
            image: Input image
            target_height: Optional target height (preserves aspect ratio)

        Returns:
            Preprocessed image optimized for OCR
        """
        start_time = time.time()

        # Resize if target height specified
        if target_height is not None:
            h, w = image.shape[:2]
            scale = target_height / h
            new_w = int(w * scale)
            image = cv2.resize(image, (new_w, target_height), interpolation=cv2.INTER_CUBIC)

        # Convert to grayscale
        gray = self.to_grayscale(image)

        # Denoise
        denoised = self.denoise(gray, strength=7.0, method="fastNl")

        # Enhance contrast
        enhanced = self.enhance_contrast(denoised, method="clahe")

        # Binarize
        binary = self.binarize(enhanced, method="adaptive")

        # Deskew
        deskewed, _ = self.deskew(binary)

        elapsed_ms = int((time.time() - start_time) * 1000)
        logger.debug(f"OCR preprocessing completed in {elapsed_ms}ms")

        return deskewed

    def preprocess_for_detection(
        self,
        image: np.ndarray,
        target_size: Tuple[int, int] = (640, 640),
    ) -> np.ndarray:
        """
        Full preprocessing pipeline for object detection.

        Args:
            image: Input image
            target_size: Target (width, height) for model input

        Returns:
            Preprocessed image for detection models
        """
        start_time = time.time()

        # Resize with padding
        resized = self.resize(image, target_size, keep_aspect=True)

        # Normalize
        normalized = self.normalize(resized)

        elapsed_ms = int((time.time() - start_time) * 1000)
        logger.debug(f"Detection preprocessing completed in {elapsed_ms}ms")

        return normalized

    def preprocess_for_math(
        self,
        image: np.ndarray,
        max_resolution: int = 1024,
    ) -> np.ndarray:
        """
        Full preprocessing pipeline for math equation recognition.

        Optimized for handwritten and printed mathematical notation.

        Args:
            image: Input image
            max_resolution: Maximum dimension size

        Returns:
            Preprocessed image for math OCR
        """
        start_time = time.time()

        h, w = image.shape[:2]

        # Limit max resolution while preserving aspect ratio
        if max(h, w) > max_resolution:
            scale = max_resolution / max(h, w)
            new_w = int(w * scale)
            new_h = int(h * scale)
            image = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)

        # Convert to grayscale
        gray = self.to_grayscale(image)

        # Remove shadows if document photo
        if len(image.shape) == 3:
            shadow_removed = self.remove_shadows(image)
            gray = self.to_grayscale(shadow_removed)

        # Light denoise (preserve thin strokes)
        denoised = self.denoise(gray, strength=5.0, method="bilateral")

        # Enhance contrast
        enhanced = self.enhance_contrast(denoised, method="clahe", clip_limit=1.5)

        # Binarize with Sauvola for better handling of varying stroke thickness
        binary = self.binarize(enhanced, method="sauvola")

        # Invert if needed (most math OCR expects black on white)
        if np.mean(binary) < 127:
            binary = 255 - binary

        elapsed_ms = int((time.time() - start_time) * 1000)
        logger.debug(f"Math preprocessing completed in {elapsed_ms}ms")

        return binary

    def preprocess_for_classification(
        self,
        image: np.ndarray,
        target_size: Tuple[int, int] = (224, 224),
    ) -> np.ndarray:
        """
        Full preprocessing pipeline for image classification.

        Args:
            image: Input image
            target_size: Target (width, height) for model input

        Returns:
            Preprocessed image for classification models
        """
        start_time = time.time()

        # Resize to target size
        resized = self.resize(image, target_size, keep_aspect=True)

        # Convert BGR to RGB
        if len(resized.shape) == 3 and resized.shape[2] == 3:
            rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
        else:
            rgb = resized

        # Normalize with ImageNet stats
        normalized = self.normalize(rgb)

        elapsed_ms = int((time.time() - start_time) * 1000)
        logger.debug(f"Classification preprocessing completed in {elapsed_ms}ms")

        return normalized

    def auto_preprocess(
        self,
        image: np.ndarray,
        task: str = "ocr",
        **kwargs,
    ) -> PreprocessingResult:
        """
        Automatically select and apply preprocessing based on task.

        Args:
            image: Input image
            task: Task type ('ocr', 'detection', 'math', 'classification')
            **kwargs: Additional arguments for specific preprocessors

        Returns:
            PreprocessingResult with processed image and metadata
        """
        start_time = time.time()
        original_size = (image.shape[1], image.shape[0])
        operations = []

        if task == "ocr":
            processed = self.preprocess_for_ocr(image, **kwargs)
            operations = ["grayscale", "denoise", "contrast", "binarize", "deskew"]
        elif task == "detection":
            processed = self.preprocess_for_detection(image, **kwargs)
            operations = ["resize", "normalize"]
        elif task == "math":
            processed = self.preprocess_for_math(image, **kwargs)
            operations = ["resize", "grayscale", "shadow_remove", "denoise", "contrast", "binarize"]
        elif task == "classification":
            processed = self.preprocess_for_classification(image, **kwargs)
            operations = ["resize", "color_convert", "normalize"]
        else:
            raise ValueError(f"Unknown task type: {task}")

        processed_size = (processed.shape[1], processed.shape[0])
        elapsed_ms = int((time.time() - start_time) * 1000)

        return PreprocessingResult(
            image=processed,
            original_size=original_size,
            processed_size=processed_size,
            operations_applied=operations,
            processing_time_ms=elapsed_ms
        )
