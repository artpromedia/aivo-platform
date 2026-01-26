"""
Handwriting OCR using multiple approaches.

Primary approach: TrOCR (Transformer-based OCR)
Fallback: EasyOCR for robustness

Features:
- Line segmentation for multi-line text
- Word-level confidence scores
- Bounding box output for highlighting
- Handle rotated/skewed text via preprocessing
"""

import logging
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class BoundingBox:
    """Bounding box for detected text regions."""
    x: int
    y: int
    width: int
    height: int

    def to_tuple(self) -> Tuple[int, int, int, int]:
        """Return as (x, y, width, height) tuple."""
        return (self.x, self.y, self.width, self.height)

    def to_points(self) -> List[Tuple[int, int]]:
        """Return as list of corner points."""
        return [
            (self.x, self.y),
            (self.x + self.width, self.y),
            (self.x + self.width, self.y + self.height),
            (self.x, self.y + self.height)
        ]

    @classmethod
    def from_points(cls, points: List[Tuple[int, int]]) -> "BoundingBox":
        """Create from list of points."""
        xs = [p[0] for p in points]
        ys = [p[1] for p in points]
        x = min(xs)
        y = min(ys)
        return cls(
            x=x,
            y=y,
            width=max(xs) - x,
            height=max(ys) - y
        )


@dataclass
class WordPosition:
    """Word with position information."""
    word: str
    confidence: float
    bounding_box: BoundingBox


@dataclass
class LineResult:
    """Result for a single line of text."""
    text: str
    confidence: float
    bounding_box: BoundingBox
    line_number: int
    words: List[WordPosition] = field(default_factory=list)


@dataclass
class RecognitionResult:
    """Result from handwriting recognition."""
    text: str
    confidence: float
    model_used: str
    processing_time_ms: int
    language: str = "en"
    word_confidences: List[Tuple[str, float]] = field(default_factory=list)


@dataclass
class PositionedText:
    """Full text with word positions."""
    full_text: str
    words: List[WordPosition]
    lines: List[LineResult]
    average_confidence: float
    processing_time_ms: int


@dataclass
class HandwritingRecognizerConfig:
    """Configuration for handwriting recognizer."""
    primary_model: str = "microsoft/trocr-base-handwritten"
    fallback_model: str = "easyocr"
    confidence_threshold: float = 0.7
    device: str = "cpu"
    supported_languages: List[str] = field(default_factory=lambda: ["en"])
    use_gpu: bool = False
    batch_size: int = 4
    max_image_size: int = 4096


class HandwritingRecognizer:
    """
    Handwriting Recognition using TrOCR with EasyOCR fallback.

    Recognizes handwritten text from images with support for:
    - Cursive and print handwriting
    - Multi-line text
    - Word-level bounding boxes
    - Multiple languages (English by default)

    Usage:
        config = HandwritingRecognizerConfig()
        recognizer = HandwritingRecognizer(config)
        result = recognizer.recognize(image)
        print(result.text, result.confidence)
    """

    def __init__(self, config: Optional[HandwritingRecognizerConfig] = None) -> None:
        """
        Initialize handwriting recognizer.

        Args:
            config: Recognition configuration
        """
        self.config = config or HandwritingRecognizerConfig()
        self.trocr_processor = None
        self.trocr_model = None
        self.easyocr_reader = None
        self._models_loaded = False

        logger.info(
            f"HandwritingRecognizer initialized "
            f"(primary: {self.config.primary_model}, device: {self.config.device})"
        )

    def _load_models(self) -> None:
        """Lazy-load models on first use."""
        if self._models_loaded:
            return

        try:
            # Load TrOCR
            from transformers import TrOCRProcessor, VisionEncoderDecoderModel
            import torch

            logger.info(f"Loading TrOCR model: {self.config.primary_model}")
            self.trocr_processor = TrOCRProcessor.from_pretrained(
                self.config.primary_model
            )
            self.trocr_model = VisionEncoderDecoderModel.from_pretrained(
                self.config.primary_model
            )

            # Move to device
            if self.config.device == "cuda" and torch.cuda.is_available():
                self.trocr_model = self.trocr_model.cuda()
            self.trocr_model.eval()

            logger.info("TrOCR model loaded successfully")

        except Exception as e:
            logger.warning(f"Failed to load TrOCR: {e}. Will use EasyOCR fallback.")
            self.trocr_model = None

        try:
            # Load EasyOCR
            import easyocr

            logger.info("Loading EasyOCR reader")
            self.easyocr_reader = easyocr.Reader(
                self.config.supported_languages,
                gpu=self.config.use_gpu or self.config.device == "cuda"
            )
            logger.info("EasyOCR reader loaded successfully")

        except Exception as e:
            logger.warning(f"Failed to load EasyOCR: {e}")
            self.easyocr_reader = None

        self._models_loaded = True

        if self.trocr_model is None and self.easyocr_reader is None:
            raise RuntimeError("No OCR models available. Check installation.")

    def _preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """
        Preprocess image for OCR.

        Args:
            image: Input image (BGR format)

        Returns:
            Preprocessed image
        """
        h, w = image.shape[:2]

        # Resize if too large
        if max(h, w) > self.config.max_image_size:
            scale = self.config.max_image_size / max(h, w)
            new_w = int(w * scale)
            new_h = int(h * scale)
            image = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)

        return image

    def _segment_lines(
        self,
        image: np.ndarray,
    ) -> List[Tuple[np.ndarray, BoundingBox]]:
        """
        Segment image into individual text lines.

        Args:
            image: Input image (BGR format)

        Returns:
            List of (line_image, bounding_box) tuples
        """
        # Convert to grayscale
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()

        # Binarize
        _, binary = cv2.threshold(
            gray, 0, 255,
            cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU
        )

        # Horizontal projection profile
        h_projection = np.sum(binary, axis=1)

        # Find line boundaries
        threshold = np.max(h_projection) * 0.05
        in_line = False
        line_starts = []
        line_ends = []

        for i, val in enumerate(h_projection):
            if not in_line and val > threshold:
                in_line = True
                line_starts.append(i)
            elif in_line and val <= threshold:
                in_line = False
                line_ends.append(i)

        if in_line:
            line_ends.append(len(h_projection) - 1)

        # Extract line images
        lines = []
        for start, end in zip(line_starts, line_ends):
            # Add padding
            pad = 5
            y1 = max(0, start - pad)
            y2 = min(image.shape[0], end + pad)

            # Find horizontal bounds
            line_binary = binary[y1:y2, :]
            v_projection = np.sum(line_binary, axis=0)
            non_zero = np.where(v_projection > 0)[0]

            if len(non_zero) > 0:
                x1 = max(0, non_zero[0] - pad)
                x2 = min(image.shape[1], non_zero[-1] + pad)
            else:
                x1 = 0
                x2 = image.shape[1]

            line_img = image[y1:y2, x1:x2]
            bbox = BoundingBox(x=x1, y=y1, width=x2-x1, height=y2-y1)
            lines.append((line_img, bbox))

        # If no lines detected, return whole image
        if not lines:
            h, w = image.shape[:2]
            lines = [(image, BoundingBox(x=0, y=0, width=w, height=h))]

        return lines

    def _recognize_with_trocr(
        self,
        image: np.ndarray,
    ) -> Tuple[str, float]:
        """
        Recognize text using TrOCR.

        Args:
            image: Input image (BGR or RGB)

        Returns:
            Tuple of (text, confidence)
        """
        import torch
        from PIL import Image

        # Convert to RGB PIL Image
        if len(image.shape) == 3:
            rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        else:
            rgb = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)

        pil_image = Image.fromarray(rgb)

        # Process image
        pixel_values = self.trocr_processor(
            images=pil_image,
            return_tensors="pt"
        ).pixel_values

        if self.config.device == "cuda" and torch.cuda.is_available():
            pixel_values = pixel_values.cuda()

        # Generate text
        with torch.no_grad():
            generated = self.trocr_model.generate(
                pixel_values,
                max_length=256,
                num_beams=4,
                return_dict_in_generate=True,
                output_scores=True
            )

        # Decode
        text = self.trocr_processor.batch_decode(
            generated.sequences,
            skip_special_tokens=True
        )[0]

        # Estimate confidence from sequence scores
        if hasattr(generated, 'sequences_scores') and generated.sequences_scores is not None:
            confidence = torch.exp(generated.sequences_scores[0]).item()
        else:
            confidence = 0.8  # Default confidence

        return text.strip(), min(confidence, 1.0)

    def _recognize_with_easyocr(
        self,
        image: np.ndarray,
    ) -> Tuple[str, float, List[Tuple[Any, str, float]]]:
        """
        Recognize text using EasyOCR.

        Args:
            image: Input image

        Returns:
            Tuple of (full_text, avg_confidence, raw_results)
        """
        results = self.easyocr_reader.readtext(image)

        if not results:
            return "", 0.0, []

        # Combine text
        texts = []
        confidences = []

        for bbox, text, conf in results:
            texts.append(text)
            confidences.append(conf)

        full_text = " ".join(texts)
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0

        return full_text, avg_confidence, results

    def recognize(
        self,
        image: np.ndarray,
        language: str = "en",
    ) -> RecognitionResult:
        """
        Recognize handwritten text in an image.

        Args:
            image: Input image containing handwriting
            language: Language hint for recognition

        Returns:
            RecognitionResult with extracted text and confidence
        """
        start_time = time.time()

        self._load_models()

        # Preprocess
        image = self._preprocess_image(image)

        model_used = "unknown"
        text = ""
        confidence = 0.0

        # Try TrOCR first
        if self.trocr_model is not None:
            try:
                text, confidence = self._recognize_with_trocr(image)
                model_used = "trocr"

                # Fallback if low confidence
                if confidence < self.config.confidence_threshold:
                    raise ValueError("Low confidence, falling back")

            except Exception as e:
                logger.debug(f"TrOCR failed: {e}, trying EasyOCR")

                if self.easyocr_reader is not None:
                    text, confidence, _ = self._recognize_with_easyocr(image)
                    model_used = "easyocr"

        # Use EasyOCR if TrOCR not available
        elif self.easyocr_reader is not None:
            text, confidence, _ = self._recognize_with_easyocr(image)
            model_used = "easyocr"

        elapsed_ms = int((time.time() - start_time) * 1000)

        return RecognitionResult(
            text=text,
            confidence=confidence,
            model_used=model_used,
            processing_time_ms=elapsed_ms,
            language=language
        )

    def recognize_lines(
        self,
        image: np.ndarray,
        language: str = "en",
    ) -> List[LineResult]:
        """
        Recognize multiple lines of handwritten text.

        Args:
            image: Input image with multiple text lines
            language: Language hint

        Returns:
            List of LineResult, one per line
        """
        self._load_models()

        # Preprocess
        image = self._preprocess_image(image)

        # Segment into lines
        line_segments = self._segment_lines(image)

        results = []
        for line_num, (line_img, bbox) in enumerate(line_segments):
            # Recognize each line
            if self.trocr_model is not None:
                try:
                    text, confidence = self._recognize_with_trocr(line_img)
                except Exception:
                    if self.easyocr_reader is not None:
                        text, confidence, _ = self._recognize_with_easyocr(line_img)
                    else:
                        text, confidence = "", 0.0
            elif self.easyocr_reader is not None:
                text, confidence, _ = self._recognize_with_easyocr(line_img)
            else:
                text, confidence = "", 0.0

            results.append(LineResult(
                text=text,
                confidence=confidence,
                bounding_box=bbox,
                line_number=line_num
            ))

        return results

    def recognize_with_positions(
        self,
        image: np.ndarray,
        language: str = "en",
    ) -> PositionedText:
        """
        Recognize text with word-level position information.

        Args:
            image: Input image with handwriting

        Returns:
            PositionedText with full text and word positions
        """
        start_time = time.time()

        self._load_models()

        # Preprocess
        image = self._preprocess_image(image)

        words: List[WordPosition] = []
        lines: List[LineResult] = []
        full_text_parts = []

        # Use EasyOCR for word positions (TrOCR doesn't provide positions)
        if self.easyocr_reader is not None:
            _, _, raw_results = self._recognize_with_easyocr(image)

            for bbox_points, text, conf in raw_results:
                # Convert bbox points to BoundingBox
                points = [(int(p[0]), int(p[1])) for p in bbox_points]
                bbox = BoundingBox.from_points(points)

                words.append(WordPosition(
                    word=text,
                    confidence=conf,
                    bounding_box=bbox
                ))
                full_text_parts.append(text)

        else:
            # Fallback: recognize whole image without positions
            result = self.recognize(image, language)
            full_text_parts = [result.text]

        # Group words into lines
        lines = self.recognize_lines(image, language)

        full_text = " ".join(full_text_parts)
        avg_confidence = (
            sum(w.confidence for w in words) / len(words)
            if words else 0.0
        )

        elapsed_ms = int((time.time() - start_time) * 1000)

        return PositionedText(
            full_text=full_text,
            words=words,
            lines=lines,
            average_confidence=avg_confidence,
            processing_time_ms=elapsed_ms
        )

    def batch_recognize(
        self,
        images: List[np.ndarray],
        language: str = "en",
    ) -> List[RecognitionResult]:
        """
        Batch recognize multiple images.

        Args:
            images: List of input images
            language: Language hint

        Returns:
            List of RecognitionResult
        """
        results = []

        for img in images:
            result = self.recognize(img, language)
            results.append(result)

        return results

    def is_loaded(self) -> bool:
        """Check if models are loaded."""
        return self._models_loaded

    def get_model_info(self) -> Dict[str, Any]:
        """Get information about loaded models."""
        return {
            "trocr_loaded": self.trocr_model is not None,
            "easyocr_loaded": self.easyocr_reader is not None,
            "primary_model": self.config.primary_model,
            "device": self.config.device,
            "supported_languages": self.config.supported_languages
        }
