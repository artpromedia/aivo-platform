"""
Recognize mathematical equations and formulas.
Output: LaTeX representation.

Primary approach: pix2tex (LaTeX OCR)
Enhanced with: symbol detection for verification

Features:
- Handle both handwritten and printed math
- Detect equation regions in mixed documents
- Support matrices, fractions, integrals, etc.
- LaTeX validation and rendering
"""

import base64
import io
import logging
import re
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np

logger = logging.getLogger(__name__)


class EquationType(Enum):
    """Types of mathematical equations."""
    INLINE = "inline"
    DISPLAY = "display"
    MATRIX = "matrix"
    FRACTION = "fraction"
    INTEGRAL = "integral"
    SUMMATION = "summation"
    LIMIT = "limit"
    DERIVATIVE = "derivative"
    EXPRESSION = "expression"
    EQUATION = "equation"
    INEQUALITY = "inequality"


@dataclass
class BoundingBox:
    """Bounding box for detected regions."""
    x: int
    y: int
    width: int
    height: int

    def to_tuple(self) -> Tuple[int, int, int, int]:
        """Return as (x, y, width, height) tuple."""
        return (self.x, self.y, self.width, self.height)

    def area(self) -> int:
        """Calculate area."""
        return self.width * self.height


@dataclass
class EquationResult:
    """Result from equation detection."""
    latex: str
    confidence: float
    bounding_box: Optional[BoundingBox] = None
    equation_type: str = "expression"
    symbols_detected: List[str] = field(default_factory=list)
    rendered_preview: Optional[str] = None  # Base64 encoded image
    is_valid: bool = True
    validation_message: Optional[str] = None


@dataclass
class DocumentMathContent:
    """Mathematical content extracted from a document."""
    equations: List[EquationResult]
    equation_count: int
    has_matrices: bool
    has_fractions: bool
    has_integrals: bool
    has_summations: bool
    complexity_score: float
    processing_time_ms: int


@dataclass
class MathEquationDetectorConfig:
    """Configuration for math equation detector."""
    model_name: str = "OleehyO/latex-ocr"
    max_resolution: int = 1024
    device: str = "cpu"
    confidence_threshold: float = 0.5
    enable_validation: bool = True
    enable_rendering: bool = False
    batch_size: int = 4


@dataclass
class EquationAnalysis:
    """Detailed analysis of a mathematical equation."""
    latex: str
    variables: List[str] = field(default_factory=list)
    operators: List[str] = field(default_factory=list)
    functions: List[str] = field(default_factory=list)
    numbers: List[str] = field(default_factory=list)
    complexity_score: float = 0.0
    is_solvable: bool = False
    equation_type: str = "expression"


class MathEquationDetector:
    """
    Detect and parse mathematical equations from images.

    Capabilities:
    - Detect equation regions in documents
    - Convert handwritten/typed math to LaTeX
    - Analyze equation structure
    - Support for matrices, fractions, integrals, etc.

    Usage:
        config = MathEquationDetectorConfig()
        detector = MathEquationDetector(config)
        result = detector.detect_equation(image)
        print(result.latex)
    """

    # Common mathematical symbols
    MATH_OPERATORS = {
        '+', '-', '*', '/', '=', '<', '>', '\\leq', '\\geq', '\\neq',
        '\\pm', '\\mp', '\\times', '\\div', '\\cdot', '\\approx'
    }

    MATH_FUNCTIONS = {
        'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
        'arcsin', 'arccos', 'arctan',
        'sinh', 'cosh', 'tanh',
        'log', 'ln', 'exp', 'sqrt',
        'lim', 'sum', 'prod', 'int'
    }

    GREEK_LETTERS = {
        '\\alpha', '\\beta', '\\gamma', '\\delta', '\\epsilon', '\\zeta',
        '\\eta', '\\theta', '\\iota', '\\kappa', '\\lambda', '\\mu',
        '\\nu', '\\xi', '\\pi', '\\rho', '\\sigma', '\\tau',
        '\\upsilon', '\\phi', '\\chi', '\\psi', '\\omega',
        '\\Gamma', '\\Delta', '\\Theta', '\\Lambda', '\\Xi', '\\Pi',
        '\\Sigma', '\\Phi', '\\Psi', '\\Omega'
    }

    def __init__(self, config: Optional[MathEquationDetectorConfig] = None) -> None:
        """
        Initialize equation detector.

        Args:
            config: Detector configuration
        """
        self.config = config or MathEquationDetectorConfig()
        self.latex_model = None
        self._models_loaded = False

        logger.info(
            f"MathEquationDetector initialized "
            f"(model: {self.config.model_name}, device: {self.config.device})"
        )

    def _load_models(self) -> None:
        """Lazy-load models on first use."""
        if self._models_loaded:
            return

        try:
            # Try loading pix2tex
            from pix2tex.cli import LatexOCR

            logger.info("Loading pix2tex LaTeX OCR model")
            self.latex_model = LatexOCR()
            logger.info("pix2tex model loaded successfully")

        except ImportError:
            logger.warning("pix2tex not available, trying alternative models")

            try:
                # Fallback to transformers-based model
                from transformers import VisionEncoderDecoderModel, AutoProcessor
                import torch

                logger.info(f"Loading model: {self.config.model_name}")
                self.processor = AutoProcessor.from_pretrained(self.config.model_name)
                self.model = VisionEncoderDecoderModel.from_pretrained(self.config.model_name)

                if self.config.device == "cuda" and torch.cuda.is_available():
                    self.model = self.model.cuda()
                self.model.eval()

                self.latex_model = "transformers"
                logger.info("Transformers model loaded successfully")

            except Exception as e:
                logger.error(f"Failed to load LaTeX OCR models: {e}")
                self.latex_model = None

        self._models_loaded = True

    def _preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """
        Preprocess image for equation recognition.

        Args:
            image: Input image

        Returns:
            Preprocessed image
        """
        h, w = image.shape[:2]

        # Resize if too large
        if max(h, w) > self.config.max_resolution:
            scale = self.config.max_resolution / max(h, w)
            new_w = int(w * scale)
            new_h = int(h * scale)
            image = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)

        return image

    def _detect_equation_regions(
        self,
        image: np.ndarray,
    ) -> List[Tuple[np.ndarray, BoundingBox]]:
        """
        Detect equation regions in a document image.

        Args:
            image: Input document image

        Returns:
            List of (cropped_image, bounding_box) tuples
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

        # Morphological operations to connect equation components
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (30, 5))
        dilated = cv2.dilate(binary, kernel, iterations=2)

        # Find contours
        contours, _ = cv2.findContours(
            dilated,
            cv2.RETR_EXTERNAL,
            cv2.CHAIN_APPROX_SIMPLE
        )

        regions = []
        min_area = 500  # Minimum area for equation region

        for contour in contours:
            area = cv2.contourArea(contour)
            if area < min_area:
                continue

            x, y, w, h = cv2.boundingRect(contour)

            # Skip very wide or tall regions (likely not equations)
            aspect_ratio = w / h if h > 0 else 0
            if aspect_ratio > 20 or aspect_ratio < 0.05:
                continue

            # Add padding
            pad = 10
            x1 = max(0, x - pad)
            y1 = max(0, y - pad)
            x2 = min(image.shape[1], x + w + pad)
            y2 = min(image.shape[0], y + h + pad)

            cropped = image[y1:y2, x1:x2]
            bbox = BoundingBox(x=x1, y=y1, width=x2-x1, height=y2-y1)
            regions.append((cropped, bbox))

        # Sort by vertical position
        regions.sort(key=lambda r: r[1].y)

        return regions

    def _recognize_latex(self, image: np.ndarray) -> Tuple[str, float]:
        """
        Convert image to LaTeX using OCR model.

        Args:
            image: Cropped equation image

        Returns:
            Tuple of (latex_string, confidence)
        """
        from PIL import Image

        # Convert to PIL Image
        if len(image.shape) == 3:
            rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        else:
            rgb = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)

        pil_image = Image.fromarray(rgb)

        if self.latex_model == "transformers":
            # Use transformers model
            import torch

            pixel_values = self.processor(
                images=pil_image,
                return_tensors="pt"
            ).pixel_values

            if self.config.device == "cuda":
                pixel_values = pixel_values.cuda()

            with torch.no_grad():
                generated = self.model.generate(
                    pixel_values,
                    max_length=512,
                    num_beams=4
                )

            latex = self.processor.batch_decode(
                generated,
                skip_special_tokens=True
            )[0]

            confidence = 0.8  # Default confidence

        else:
            # Use pix2tex
            latex = self.latex_model(pil_image)
            confidence = 0.85  # pix2tex is generally reliable

        return latex.strip(), confidence

    def _analyze_latex(self, latex: str) -> EquationAnalysis:
        """
        Analyze LaTeX equation structure.

        Args:
            latex: LaTeX string

        Returns:
            EquationAnalysis with structural breakdown
        """
        variables = set()
        operators = set()
        functions = set()
        numbers = set()

        # Extract single-letter variables (excluding known functions and operators)
        var_pattern = r'\b([a-zA-Z])\b'
        for match in re.finditer(var_pattern, latex):
            var = match.group(1)
            if var not in {'d', 'e', 'i'}:  # Skip common constants
                variables.add(var)

        # Find operators
        for op in self.MATH_OPERATORS:
            if op in latex:
                operators.add(op)

        # Find functions
        for func in self.MATH_FUNCTIONS:
            if func in latex or f'\\{func}' in latex:
                functions.add(func)

        # Find numbers
        num_pattern = r'\b(\d+\.?\d*)\b'
        for match in re.finditer(num_pattern, latex):
            numbers.add(match.group(1))

        # Determine equation type
        eq_type = self._classify_equation_type(latex)

        # Calculate complexity
        complexity = self._calculate_complexity(latex)

        # Check if solvable (simplified heuristic)
        is_solvable = '=' in latex and len(variables) > 0

        return EquationAnalysis(
            latex=latex,
            variables=list(variables),
            operators=list(operators),
            functions=list(functions),
            numbers=list(numbers),
            complexity_score=complexity,
            is_solvable=is_solvable,
            equation_type=eq_type
        )

    def _classify_equation_type(self, latex: str) -> str:
        """
        Classify the type of equation.

        Args:
            latex: LaTeX string

        Returns:
            Equation type string
        """
        if '\\begin{matrix}' in latex or '\\begin{pmatrix}' in latex:
            return EquationType.MATRIX.value
        elif '\\int' in latex:
            return EquationType.INTEGRAL.value
        elif '\\sum' in latex:
            return EquationType.SUMMATION.value
        elif '\\lim' in latex:
            return EquationType.LIMIT.value
        elif '\\frac' in latex and '\\partial' in latex:
            return EquationType.DERIVATIVE.value
        elif '\\frac' in latex:
            return EquationType.FRACTION.value
        elif '<' in latex or '>' in latex or '\\leq' in latex or '\\geq' in latex:
            return EquationType.INEQUALITY.value
        elif '=' in latex:
            return EquationType.EQUATION.value
        else:
            return EquationType.EXPRESSION.value

    def _calculate_complexity(self, latex: str) -> float:
        """
        Calculate complexity score for an equation.

        Args:
            latex: LaTeX string

        Returns:
            Complexity score (0-1)
        """
        score = 0.0

        # Nesting depth (fractions, subscripts, superscripts)
        nesting_chars = ['{', '}', '^', '_']
        nesting_count = sum(latex.count(c) for c in nesting_chars)
        score += min(nesting_count * 0.02, 0.3)

        # Special structures
        if '\\frac' in latex:
            score += 0.1
        if '\\int' in latex:
            score += 0.15
        if '\\sum' in latex:
            score += 0.1
        if '\\prod' in latex:
            score += 0.1
        if 'matrix' in latex:
            score += 0.2
        if '\\sqrt' in latex:
            score += 0.05
        if '\\lim' in latex:
            score += 0.1

        # Length-based complexity
        score += min(len(latex) * 0.001, 0.2)

        return min(score, 1.0)

    def _extract_symbols(self, latex: str) -> List[str]:
        """
        Extract individual symbols from LaTeX.

        Args:
            latex: LaTeX string

        Returns:
            List of detected symbols
        """
        symbols = []

        # Find LaTeX commands (backslash followed by letters)
        command_pattern = r'\\([a-zA-Z]+)'
        for match in re.finditer(command_pattern, latex):
            symbols.append('\\' + match.group(1))

        # Find single characters (variables, numbers)
        for char in latex:
            if char.isalnum() and char not in symbols:
                symbols.append(char)

        # Find operators
        for op in ['+', '-', '=', '<', '>']:
            if op in latex:
                symbols.append(op)

        return list(set(symbols))

    def validate_latex(self, latex: str) -> Tuple[bool, Optional[str]]:
        """
        Validate if LaTeX is syntactically correct.

        Args:
            latex: LaTeX string to validate

        Returns:
            (is_valid, error_message)
        """
        # Check balanced braces
        brace_count = 0
        for char in latex:
            if char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
            if brace_count < 0:
                return False, "Unbalanced braces: extra closing brace"

        if brace_count != 0:
            return False, f"Unbalanced braces: {brace_count} unclosed"

        # Check for common errors
        error_patterns = [
            (r'\\frac\s*\{[^}]*$', "Incomplete \\frac"),
            (r'\^\s*$', "Trailing superscript without content"),
            (r'_\s*$', "Trailing subscript without content"),
            (r'\\begin\{([^}]+)\}(?!.*\\end\{\1\})', "Unclosed environment"),
        ]

        for pattern, message in error_patterns:
            if re.search(pattern, latex):
                return False, message

        return True, None

    def render_latex(
        self,
        latex: str,
        dpi: int = 150,
    ) -> Optional[str]:
        """
        Render LaTeX equation to image.

        Args:
            latex: LaTeX equation
            dpi: Output resolution

        Returns:
            Base64-encoded PNG image, or None if rendering fails
        """
        try:
            import matplotlib
            matplotlib.use('Agg')  # Non-GUI backend
            import matplotlib.pyplot as plt

            fig, ax = plt.subplots(figsize=(10, 2))
            ax.axis('off')

            # Render LaTeX
            ax.text(
                0.5, 0.5,
                f'${latex}$',
                fontsize=20,
                ha='center',
                va='center',
                transform=ax.transAxes
            )

            # Save to buffer
            buf = io.BytesIO()
            fig.savefig(buf, format='png', dpi=dpi, bbox_inches='tight', pad_inches=0.1)
            plt.close(fig)

            buf.seek(0)
            return base64.b64encode(buf.read()).decode('utf-8')

        except Exception as e:
            logger.warning(f"Failed to render LaTeX: {e}")
            return None

    def detect_equation(
        self,
        image: np.ndarray,
    ) -> EquationResult:
        """
        Detect and recognize a single equation from an image.

        Args:
            image: Input image containing equation

        Returns:
            EquationResult with LaTeX and metadata
        """
        start_time = time.time()

        self._load_models()

        if self.latex_model is None:
            return EquationResult(
                latex="",
                confidence=0.0,
                is_valid=False,
                validation_message="No LaTeX OCR model available"
            )

        # Preprocess
        image = self._preprocess_image(image)

        # Recognize
        latex, confidence = self._recognize_latex(image)

        # Validate
        is_valid, validation_msg = True, None
        if self.config.enable_validation:
            is_valid, validation_msg = self.validate_latex(latex)

        # Extract symbols
        symbols = self._extract_symbols(latex)

        # Classify type
        eq_type = self._classify_equation_type(latex)

        # Render preview
        rendered = None
        if self.config.enable_rendering:
            rendered = self.render_latex(latex)

        h, w = image.shape[:2]

        return EquationResult(
            latex=latex,
            confidence=confidence,
            bounding_box=BoundingBox(x=0, y=0, width=w, height=h),
            equation_type=eq_type,
            symbols_detected=symbols,
            rendered_preview=rendered,
            is_valid=is_valid,
            validation_message=validation_msg
        )

    def detect_all_equations(
        self,
        image: np.ndarray,
    ) -> List[EquationResult]:
        """
        Detect all equations in a document image.

        Args:
            image: Input document image

        Returns:
            List of EquationResult for each detected equation
        """
        self._load_models()

        if self.latex_model is None:
            return []

        # Preprocess
        image = self._preprocess_image(image)

        # Detect regions
        regions = self._detect_equation_regions(image)

        results = []
        for region_img, bbox in regions:
            # Recognize each region
            latex, confidence = self._recognize_latex(region_img)

            if confidence < self.config.confidence_threshold:
                continue

            # Validate
            is_valid, validation_msg = True, None
            if self.config.enable_validation:
                is_valid, validation_msg = self.validate_latex(latex)

            symbols = self._extract_symbols(latex)
            eq_type = self._classify_equation_type(latex)

            results.append(EquationResult(
                latex=latex,
                confidence=confidence,
                bounding_box=bbox,
                equation_type=eq_type,
                symbols_detected=symbols,
                is_valid=is_valid,
                validation_message=validation_msg
            ))

        return results

    def extract_from_document(
        self,
        image: np.ndarray,
    ) -> DocumentMathContent:
        """
        Extract all mathematical content from a document.

        Args:
            image: Input document image

        Returns:
            DocumentMathContent with all equations and analysis
        """
        start_time = time.time()

        equations = self.detect_all_equations(image)

        # Analyze content
        has_matrices = any('matrix' in eq.equation_type for eq in equations)
        has_fractions = any(eq.equation_type == 'fraction' for eq in equations)
        has_integrals = any(eq.equation_type == 'integral' for eq in equations)
        has_summations = any(eq.equation_type == 'summation' for eq in equations)

        # Calculate overall complexity
        if equations:
            complexity = sum(
                self._calculate_complexity(eq.latex) for eq in equations
            ) / len(equations)
        else:
            complexity = 0.0

        elapsed_ms = int((time.time() - start_time) * 1000)

        return DocumentMathContent(
            equations=equations,
            equation_count=len(equations),
            has_matrices=has_matrices,
            has_fractions=has_fractions,
            has_integrals=has_integrals,
            has_summations=has_summations,
            complexity_score=complexity,
            processing_time_ms=elapsed_ms
        )

    def analyze_equation(self, latex: str) -> EquationAnalysis:
        """
        Analyze structure of a LaTeX equation.

        Args:
            latex: LaTeX equation string

        Returns:
            EquationAnalysis with structural breakdown
        """
        return self._analyze_latex(latex)

    def is_loaded(self) -> bool:
        """Check if models are loaded."""
        return self._models_loaded

    def get_model_info(self) -> Dict[str, Any]:
        """Get information about loaded models."""
        return {
            "model_loaded": self.latex_model is not None,
            "model_name": self.config.model_name,
            "device": self.config.device,
            "validation_enabled": self.config.enable_validation,
            "rendering_enabled": self.config.enable_rendering
        }
