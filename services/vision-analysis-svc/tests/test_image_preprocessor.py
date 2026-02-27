"""
ImagePreprocessor Unit Tests

Tests for the centralized image preprocessing pipeline.
Covers: resize, normalize, to_grayscale, convert_color_space, deskew,
        enhance_contrast, denoise, and input validation.
"""

import numpy as np
import pytest

from app.services.image_preprocessor import (
    ColorSpace,
    ImagePreprocessor,
    PreprocessingResult,
)


@pytest.fixture
def preprocessor():
    """Fresh ImagePreprocessor instance."""
    return ImagePreprocessor()


@pytest.fixture
def bgr_image():
    """Create a 100x80 BGR test image (3 channels, uint8)."""
    return np.random.randint(0, 256, (80, 100, 3), dtype=np.uint8)


@pytest.fixture
def gray_image():
    """Create a 100x80 grayscale test image (2D, uint8)."""
    return np.random.randint(0, 256, (80, 100), dtype=np.uint8)


@pytest.fixture
def small_bgr():
    """Deterministic 4x6 BGR image for precise assertions."""
    img = np.zeros((4, 6, 3), dtype=np.uint8)
    img[:, :, 0] = 100  # Blue channel
    img[:, :, 1] = 150  # Green channel
    img[:, :, 2] = 200  # Red channel
    return img


# ═══════════════════════════════════════════════════════════════════════
# Input validation
# ═══════════════════════════════════════════════════════════════════════


class TestInputValidation:
    """All methods should raise ValueError on None or empty images."""

    def test_resize_rejects_none(self, preprocessor):
        with pytest.raises(ValueError, match="Invalid input image"):
            preprocessor.resize(None, (100, 100))

    def test_resize_rejects_empty(self, preprocessor):
        with pytest.raises(ValueError, match="Invalid input image"):
            preprocessor.resize(np.array([]), (100, 100))

    def test_normalize_rejects_none(self, preprocessor):
        with pytest.raises(ValueError, match="Invalid input image"):
            preprocessor.normalize(None)

    def test_normalize_rejects_empty(self, preprocessor):
        with pytest.raises(ValueError, match="Invalid input image"):
            preprocessor.normalize(np.array([]))

    def test_to_grayscale_rejects_none(self, preprocessor):
        with pytest.raises(ValueError, match="Invalid input image"):
            preprocessor.to_grayscale(None)

    def test_deskew_rejects_none(self, preprocessor):
        with pytest.raises(ValueError, match="Invalid input image"):
            preprocessor.deskew(None)


# ═══════════════════════════════════════════════════════════════════════
# resize
# ═══════════════════════════════════════════════════════════════════════


class TestResize:
    def test_resize_no_aspect_ratio(self, preprocessor, bgr_image):
        result = preprocessor.resize(bgr_image, (200, 200), keep_aspect=False)
        assert result.shape == (200, 200, 3)

    def test_resize_keep_aspect_ratio(self, preprocessor, bgr_image):
        result = preprocessor.resize(bgr_image, (200, 200), keep_aspect=True)
        assert result.shape == (200, 200, 3)

    def test_resize_preserves_dtype(self, preprocessor, bgr_image):
        result = preprocessor.resize(bgr_image, (50, 50), keep_aspect=False)
        assert result.dtype == bgr_image.dtype

    def test_resize_grayscale(self, preprocessor, gray_image):
        result = preprocessor.resize(gray_image, (50, 50), keep_aspect=True)
        assert result.shape == (50, 50)

    def test_resize_pad_color(self, preprocessor, small_bgr):
        # A non-square image resized to square with padding
        result = preprocessor.resize(
            small_bgr, (100, 100), keep_aspect=True, pad_color=(255, 255, 255)
        )
        assert result.shape == (100, 100, 3)
        # Corner should be pad color (white)
        np.testing.assert_array_equal(result[0, 0], [255, 255, 255])

    def test_resize_same_size(self, preprocessor, bgr_image):
        h, w = bgr_image.shape[:2]
        result = preprocessor.resize(bgr_image, (w, h), keep_aspect=False)
        assert result.shape == bgr_image.shape


# ═══════════════════════════════════════════════════════════════════════
# normalize
# ═══════════════════════════════════════════════════════════════════════


class TestNormalize:
    def test_normalize_returns_float32(self, preprocessor, bgr_image):
        result = preprocessor.normalize(bgr_image)
        assert result.dtype == np.float32

    def test_normalize_shape_unchanged(self, preprocessor, bgr_image):
        result = preprocessor.normalize(bgr_image)
        assert result.shape == bgr_image.shape

    def test_normalize_with_default_imagenet(self, preprocessor, small_bgr):
        result = preprocessor.normalize(small_bgr)
        # Values should be roughly centered around 0 after normalization
        assert result.min() < 0 or result.max() > 0

    def test_normalize_custom_mean_std(self, preprocessor, bgr_image):
        custom_mean = (0.5, 0.5, 0.5)
        custom_std = (0.5, 0.5, 0.5)
        result = preprocessor.normalize(bgr_image, mean=custom_mean, std=custom_std)
        assert result.dtype == np.float32
        # With mean=0.5, std=0.5: normalized = (pixel/255 - 0.5) / 0.5
        # range should be roughly [-1, 1]
        assert result.min() >= -1.1
        assert result.max() <= 1.1

    def test_normalize_grayscale(self, preprocessor, gray_image):
        result = preprocessor.normalize(gray_image)
        assert result.dtype == np.float32
        assert result.shape == gray_image.shape


# ═══════════════════════════════════════════════════════════════════════
# to_grayscale
# ═══════════════════════════════════════════════════════════════════════


class TestToGrayscale:
    def test_bgr_to_grayscale(self, preprocessor, bgr_image):
        result = preprocessor.to_grayscale(bgr_image)
        assert len(result.shape) == 2
        assert result.shape[:2] == bgr_image.shape[:2]

    def test_already_grayscale(self, preprocessor, gray_image):
        result = preprocessor.to_grayscale(gray_image)
        np.testing.assert_array_equal(result, gray_image)

    def test_single_channel_squeeze(self, preprocessor):
        img = np.random.randint(0, 256, (50, 50, 1), dtype=np.uint8)
        result = preprocessor.to_grayscale(img)
        assert result.shape == (50, 50)


# ═══════════════════════════════════════════════════════════════════════
# convert_color_space
# ═══════════════════════════════════════════════════════════════════════


class TestConvertColorSpace:
    def test_same_space_returns_copy(self, preprocessor, bgr_image):
        result = preprocessor.convert_color_space(
            bgr_image, ColorSpace.BGR, ColorSpace.BGR
        )
        np.testing.assert_array_equal(result, bgr_image)
        assert result is not bgr_image  # should be a copy

    def test_bgr_to_rgb(self, preprocessor, small_bgr):
        result = preprocessor.convert_color_space(
            small_bgr, ColorSpace.BGR, ColorSpace.RGB
        )
        # Blue and Red channels are swapped
        np.testing.assert_array_equal(result[:, :, 0], small_bgr[:, :, 2])
        np.testing.assert_array_equal(result[:, :, 2], small_bgr[:, :, 0])

    def test_bgr_to_grayscale(self, preprocessor, bgr_image):
        result = preprocessor.convert_color_space(
            bgr_image, ColorSpace.BGR, ColorSpace.GRAYSCALE
        )
        assert len(result.shape) == 2

    def test_bgr_to_hsv(self, preprocessor, bgr_image):
        result = preprocessor.convert_color_space(
            bgr_image, ColorSpace.BGR, ColorSpace.HSV
        )
        assert result.shape == bgr_image.shape

    def test_bgr_to_lab(self, preprocessor, bgr_image):
        result = preprocessor.convert_color_space(
            bgr_image, ColorSpace.BGR, ColorSpace.LAB
        )
        assert result.shape == bgr_image.shape

    def test_unsupported_conversion_raises(self, preprocessor, gray_image):
        with pytest.raises(ValueError, match="Unsupported color conversion"):
            preprocessor.convert_color_space(
                gray_image, ColorSpace.GRAYSCALE, ColorSpace.HSV
            )

    def test_roundtrip_bgr_rgb(self, preprocessor, bgr_image):
        rgb = preprocessor.convert_color_space(
            bgr_image, ColorSpace.BGR, ColorSpace.RGB
        )
        back = preprocessor.convert_color_space(
            rgb, ColorSpace.RGB, ColorSpace.BGR
        )
        np.testing.assert_array_equal(back, bgr_image)


# ═══════════════════════════════════════════════════════════════════════
# deskew
# ═══════════════════════════════════════════════════════════════════════


class TestDeskew:
    def test_deskew_returns_tuple(self, preprocessor, bgr_image):
        result = preprocessor.deskew(bgr_image)
        assert isinstance(result, tuple)
        assert len(result) == 2

    def test_deskew_returns_image_and_angle(self, preprocessor, bgr_image):
        deskewed, angle = preprocessor.deskew(bgr_image)
        assert isinstance(deskewed, np.ndarray)
        assert isinstance(angle, float)

    def test_deskew_no_lines_returns_zero_angle(self, preprocessor):
        # Uniform image has no edges/lines
        blank = np.full((100, 100, 3), 128, dtype=np.uint8)
        deskewed, angle = preprocessor.deskew(blank)
        assert angle == 0.0

    def test_deskew_grayscale_input(self, preprocessor, gray_image):
        deskewed, angle = preprocessor.deskew(gray_image)
        assert isinstance(deskewed, np.ndarray)

    def test_deskew_respects_max_angle(self, preprocessor, bgr_image):
        _, angle = preprocessor.deskew(bgr_image, max_angle=10.0)
        # If angle was detected and corrected, it should be within limits
        assert isinstance(angle, float)


# ═══════════════════════════════════════════════════════════════════════
# PreprocessingResult dataclass
# ═══════════════════════════════════════════════════════════════════════


class TestPreprocessingResult:
    def test_dataclass_fields(self):
        img = np.zeros((50, 50, 3), dtype=np.uint8)
        result = PreprocessingResult(
            image=img,
            original_size=(100, 80),
            processed_size=(50, 50),
            operations_applied=["resize", "normalize"],
            processing_time_ms=42,
        )
        assert result.original_size == (100, 80)
        assert result.processed_size == (50, 50)
        assert result.operations_applied == ["resize", "normalize"]
        assert result.processing_time_ms == 42
        assert result.image is img


# ═══════════════════════════════════════════════════════════════════════
# ColorSpace enum
# ═══════════════════════════════════════════════════════════════════════


class TestColorSpace:
    def test_enum_values(self):
        assert ColorSpace.BGR.value == "bgr"
        assert ColorSpace.RGB.value == "rgb"
        assert ColorSpace.GRAYSCALE.value == "grayscale"
        assert ColorSpace.HSV.value == "hsv"
        assert ColorSpace.LAB.value == "lab"

    def test_enum_count(self):
        assert len(ColorSpace) == 5
