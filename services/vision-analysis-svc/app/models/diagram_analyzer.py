"""
Analyze diagrams, charts, and graphs.

Types supported:
1. Bar charts
2. Line graphs
3. Pie charts
4. Scatter plots
5. Flow diagrams
6. Venn diagrams
7. Geometric figures

Features:
- Classify diagram type
- Extract data points from charts
- Parse flowchart structure
- Generate natural language descriptions
- Extract quantitative insights
"""

import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np

logger = logging.getLogger(__name__)


class ChartType(Enum):
    """Types of charts and diagrams supported."""
    BAR_CHART = "bar_chart"
    LINE_GRAPH = "line_graph"
    PIE_CHART = "pie_chart"
    SCATTER_PLOT = "scatter_plot"
    HISTOGRAM = "histogram"
    AREA_CHART = "area_chart"
    FLOWCHART = "flowchart"
    VENN_DIAGRAM = "venn_diagram"
    TREE_DIAGRAM = "tree_diagram"
    NETWORK_DIAGRAM = "network_diagram"
    GEOMETRIC_FIGURE = "geometric"
    TABLE = "table"
    SCIENTIFIC = "scientific"
    MAP = "map"
    UNKNOWN = "unknown"


# Keep backward compatibility aliases
DiagramType = ChartType


@dataclass
class TextRegion:
    """Text region detected in diagram."""
    text: str
    x: int
    y: int
    width: int
    height: int
    confidence: float


@dataclass
class ChartDataPoint:
    """Data point extracted from a chart."""
    label: str
    value: float
    x: Optional[float] = None
    y: Optional[float] = None
    category: Optional[str] = None
    color: Optional[str] = None


# Alias for compatibility
DataPoint = ChartDataPoint


@dataclass
class DataSeries:
    """Series of data points."""
    name: str
    values: List[float]
    labels: List[str] = field(default_factory=list)
    color: Optional[str] = None


@dataclass
class ChartAxis:
    """Axis information from a chart."""
    label: str
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    unit: Optional[str] = None
    is_numeric: bool = True


@dataclass
class ChartData:
    """Extracted data from a chart."""
    chart_type: str
    title: Optional[str] = None
    x_axis_label: Optional[str] = None
    y_axis_label: Optional[str] = None
    legend: Optional[List[str]] = None
    data_series: List[DataSeries] = field(default_factory=list)
    data_points: List[ChartDataPoint] = field(default_factory=list)
    x_axis: Optional[ChartAxis] = None
    y_axis: Optional[ChartAxis] = None


@dataclass
class GeometricShape:
    """Detected geometric shape."""
    shape_type: str  # circle, triangle, rectangle, polygon, line
    vertices: List[Tuple[int, int]]
    center: Optional[Tuple[int, int]] = None
    area: Optional[float] = None
    perimeter: Optional[float] = None
    angles: Optional[List[float]] = None
    labels: Dict[str, str] = field(default_factory=dict)


@dataclass
class FlowchartNode:
    """Node in a flowchart."""
    node_id: str
    text: str
    node_type: str  # process, decision, start, end, io
    x: int
    y: int
    width: int
    height: int


@dataclass
class FlowchartEdge:
    """Edge connecting flowchart nodes."""
    source_id: str
    target_id: str
    label: Optional[str] = None


@dataclass
class Element:
    """Generic structural element in diagram."""
    element_type: str
    bbox: Tuple[int, int, int, int]  # x, y, w, h
    properties: Dict[str, Any] = field(default_factory=dict)


@dataclass
class DiagramAnalysisResult:
    """Complete analysis of a diagram."""
    diagram_type: ChartType
    confidence: float
    title: Optional[str] = None
    description: str = ""
    data_points: List[ChartDataPoint] = field(default_factory=list)
    x_axis: Optional[ChartAxis] = None
    y_axis: Optional[ChartAxis] = None
    legend_items: List[str] = field(default_factory=list)
    insights: List[str] = field(default_factory=list)
    raw_data: Dict[str, Any] = field(default_factory=dict)
    extracted_text: List[TextRegion] = field(default_factory=list)
    structural_elements: List[Element] = field(default_factory=list)
    chart_data: Optional[ChartData] = None
    geometric_shapes: Optional[List[GeometricShape]] = None
    flowchart_nodes: Optional[List[FlowchartNode]] = None
    flowchart_edges: Optional[List[FlowchartEdge]] = None
    processing_time_ms: int = 0


@dataclass
class DiagramAnalyzerConfig:
    """Configuration for diagram analyzer."""
    chart_detection_model: str = "microsoft/table-transformer-detection"
    enable_ocr: bool = True
    device: str = "cpu"
    min_confidence: float = 0.5
    detect_shapes: bool = True
    extract_data: bool = True


class DiagramAnalyzer:
    """
    Analyze diagrams, charts, and graphs for educational understanding.

    Capabilities:
    - Classify diagram type
    - Extract data points from charts
    - Parse flowchart structure
    - Detect geometric figures
    - Generate natural language descriptions
    - Extract quantitative insights

    Usage:
        config = DiagramAnalyzerConfig()
        analyzer = DiagramAnalyzer(config)
        result = analyzer.analyze(image)
        print(f"Type: {result.diagram_type}")
        print(f"Data: {result.data_points}")
    """

    # Shape detection parameters
    SHAPE_THRESHOLDS = {
        'circle': 0.85,
        'rectangle': 0.90,
        'triangle': 3,
    }

    def __init__(
        self,
        config: Optional[DiagramAnalyzerConfig] = None,
        model_path: Optional[str] = None,
        device: str = "cpu",
    ) -> None:
        """
        Initialize diagram analyzer.

        Args:
            config: Analyzer configuration
            model_path: Path to pretrained models (legacy)
            device: Inference device (legacy)
        """
        if config:
            self.config = config
        else:
            self.config = DiagramAnalyzerConfig(device=device)

        self.model_path = model_path
        self.classifier = None
        self.data_extractor = None
        self.ocr_reader = None
        self._models_loaded = False

        logger.info(
            f"DiagramAnalyzer initialized "
            f"(enable_ocr: {self.config.enable_ocr}, device: {self.config.device})"
        )

    def _load_models(self) -> None:
        """Lazy-load models on first use."""
        if self._models_loaded:
            return

        if self.config.enable_ocr:
            try:
                import easyocr
                self.ocr_reader = easyocr.Reader(['en'], gpu=self.config.device == 'cuda')
                logger.info("EasyOCR loaded for diagram text extraction")
            except Exception as e:
                logger.warning(f"Failed to load OCR: {e}")

        self._models_loaded = True

    def _extract_text_regions(self, image: np.ndarray) -> List[TextRegion]:
        """Extract text regions from diagram."""
        if self.ocr_reader is None:
            return []

        results = self.ocr_reader.readtext(image)
        regions = []

        for bbox, text, conf in results:
            if conf < self.config.min_confidence:
                continue

            points = np.array(bbox, dtype=np.int32)
            x, y, w, h = cv2.boundingRect(points)

            regions.append(TextRegion(
                text=text,
                x=x,
                y=y,
                width=w,
                height=h,
                confidence=conf
            ))

        return regions

    def _detect_chart_type(self, image: np.ndarray) -> Tuple[ChartType, float]:
        """Classify the type of chart/diagram using heuristics."""
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        else:
            gray = image.copy()
            hsv = None

        h, w = gray.shape[:2]

        # Detect circles (pie chart indicator)
        circles = cv2.HoughCircles(
            gray,
            cv2.HOUGH_GRADIENT,
            dp=1,
            minDist=min(h, w) // 4,
            param1=50,
            param2=30,
            minRadius=min(h, w) // 8,
            maxRadius=min(h, w) // 2
        )

        if circles is not None and len(circles[0]) > 0:
            for circle in circles[0]:
                cx, cy, r = circle
                if abs(cx - w/2) < w*0.2 and abs(cy - h/2) < h*0.2:
                    if r > min(h, w) * 0.2:
                        return ChartType.PIE_CHART, 0.8

        # Edge detection
        edges = cv2.Canny(gray, 50, 150)

        # Detect lines
        lines = cv2.HoughLinesP(
            edges,
            rho=1,
            theta=np.pi/180,
            threshold=50,
            minLineLength=30,
            maxLineGap=10
        )

        if lines is not None:
            horizontal_lines = 0
            vertical_lines = 0
            diagonal_lines = 0

            for line in lines:
                x1, y1, x2, y2 = line[0]
                angle = np.abs(np.degrees(np.arctan2(y2-y1, x2-x1)))

                if angle < 10 or angle > 170:
                    horizontal_lines += 1
                elif 80 < angle < 100:
                    vertical_lines += 1
                else:
                    diagonal_lines += 1

            if vertical_lines > horizontal_lines * 2 and vertical_lines > 5:
                return ChartType.BAR_CHART, 0.7

            if diagonal_lines > (horizontal_lines + vertical_lines) * 0.5:
                return ChartType.LINE_GRAPH, 0.6

        # Detect rectangles
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        rectangles = 0
        for contour in contours:
            peri = cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, 0.04 * peri, True)
            if len(approx) == 4:
                rectangles += 1

        if rectangles > 5:
            return ChartType.FLOWCHART, 0.5

        return ChartType.UNKNOWN, 0.3

    def _detect_geometric_shapes(self, image: np.ndarray) -> List[GeometricShape]:
        """Detect geometric shapes in the image."""
        shapes = []

        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()

        edges = cv2.Canny(gray, 50, 150)
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        for contour in contours:
            area = cv2.contourArea(contour)
            if area < 100:
                continue

            perimeter = cv2.arcLength(contour, True)
            if perimeter == 0:
                continue

            approx = cv2.approxPolyDP(contour, 0.04 * perimeter, True)
            vertices = [tuple(p[0]) for p in approx]

            circularity = 4 * np.pi * area / (perimeter * perimeter)

            if circularity > self.SHAPE_THRESHOLDS['circle']:
                (cx, cy), radius = cv2.minEnclosingCircle(contour)
                shapes.append(GeometricShape(
                    shape_type='circle',
                    vertices=vertices,
                    center=(int(cx), int(cy)),
                    area=area,
                    perimeter=perimeter
                ))

            elif len(approx) == 3:
                angles = self._calculate_triangle_angles(vertices)
                shapes.append(GeometricShape(
                    shape_type='triangle',
                    vertices=vertices,
                    area=area,
                    perimeter=perimeter,
                    angles=angles
                ))

            elif len(approx) == 4:
                x, y, rect_w, rect_h = cv2.boundingRect(approx)
                aspect_ratio = float(rect_w) / rect_h if rect_h > 0 else 0
                rect_area = rect_w * rect_h
                rectangularity = area / rect_area if rect_area > 0 else 0

                if rectangularity > self.SHAPE_THRESHOLDS['rectangle']:
                    shape_type = 'square' if 0.9 < aspect_ratio < 1.1 else 'rectangle'
                else:
                    shape_type = 'quadrilateral'

                shapes.append(GeometricShape(
                    shape_type=shape_type,
                    vertices=vertices,
                    area=area,
                    perimeter=perimeter
                ))

            elif len(approx) > 4:
                shapes.append(GeometricShape(
                    shape_type=f'polygon_{len(approx)}',
                    vertices=vertices,
                    area=area,
                    perimeter=perimeter
                ))

        return shapes

    def _calculate_triangle_angles(self, vertices: List[Tuple[int, int]]) -> List[float]:
        """Calculate angles of a triangle."""
        if len(vertices) != 3:
            return []

        def angle_at_vertex(p1, p2, p3):
            v1 = np.array([p1[0] - p2[0], p1[1] - p2[1]])
            v2 = np.array([p3[0] - p2[0], p3[1] - p2[1]])
            cos_angle = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-8)
            angle = np.arccos(np.clip(cos_angle, -1, 1))
            return np.degrees(angle)

        return [
            angle_at_vertex(vertices[2], vertices[0], vertices[1]),
            angle_at_vertex(vertices[0], vertices[1], vertices[2]),
            angle_at_vertex(vertices[1], vertices[2], vertices[0])
        ]

    def _extract_bar_chart_data(
        self,
        image: np.ndarray,
        text_regions: List[TextRegion],
    ) -> ChartData:
        """Extract data from bar chart."""
        h, w = image.shape[:2]

        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()

        _, binary = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)

        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 30))
        bars = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)

        contours, _ = cv2.findContours(bars, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        data_points = []
        for contour in contours:
            x, y, bar_w, bar_h = cv2.boundingRect(contour)

            if bar_h < h * 0.1 or bar_w > w * 0.3:
                continue

            value = (h - y - bar_h) / h * 100

            label = ""
            for text_region in text_regions:
                if (abs(text_region.x - x) < bar_w * 2 and
                    text_region.y > y + bar_h):
                    label = text_region.text
                    break

            data_points.append(ChartDataPoint(
                label=label or f"Bar_{len(data_points)+1}",
                value=value,
                x=x + bar_w / 2,
                y=y
            ))

        data_points.sort(key=lambda p: p.x or 0)

        title = None
        for text_region in text_regions:
            if text_region.y < h * 0.15:
                title = text_region.text
                break

        return ChartData(
            chart_type=ChartType.BAR_CHART.value,
            title=title,
            data_points=data_points,
            data_series=[DataSeries(
                name="Series 1",
                values=[p.value for p in data_points],
                labels=[p.label for p in data_points]
            )]
        )

    def _extract_pie_chart_data(
        self,
        image: np.ndarray,
        text_regions: List[TextRegion],
    ) -> ChartData:
        """Extract data from pie chart."""
        if len(image.shape) == 3:
            hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        else:
            return ChartData(chart_type=ChartType.PIE_CHART.value)

        h, w = image.shape[:2]

        unique_hues = set()
        for y in range(0, h, 10):
            for x in range(0, w, 10):
                hue = hsv[y, x, 0]
                sat = hsv[y, x, 1]
                if sat > 50:
                    unique_hues.add(hue // 10)

        num_segments = min(len(unique_hues), 10)

        data_points = []
        if num_segments > 0:
            default_value = 100 / num_segments
            for i, text_region in enumerate(text_regions[:num_segments]):
                data_points.append(ChartDataPoint(
                    label=text_region.text,
                    value=default_value
                ))

        title = None
        for text_region in text_regions:
            if text_region.y < h * 0.15:
                title = text_region.text
                break

        return ChartData(
            chart_type=ChartType.PIE_CHART.value,
            title=title,
            data_points=data_points,
            legend=[p.label for p in data_points]
        )

    def _parse_flowchart_internal(
        self,
        image: np.ndarray,
        text_regions: List[TextRegion],
    ) -> Tuple[List[FlowchartNode], List[FlowchartEdge]]:
        """Parse flowchart structure."""
        nodes = []
        edges = []

        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()

        _, binary = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        node_id = 0
        for contour in contours:
            area = cv2.contourArea(contour)
            if area < 500:
                continue

            x, y, w, h = cv2.boundingRect(contour)
            peri = cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, 0.04 * peri, True)

            if len(approx) == 4:
                node_type = "process"
            elif len(approx) >= 8:
                circularity = 4 * np.pi * area / (peri * peri)
                node_type = "start" if circularity > 0.7 else "process"
            else:
                node_type = "decision" if len(approx) == 4 else "process"

            node_text = ""
            for text_region in text_regions:
                if (x < text_region.x < x + w and
                    y < text_region.y < y + h):
                    node_text = text_region.text
                    break

            nodes.append(FlowchartNode(
                node_id=f"node_{node_id}",
                text=node_text,
                node_type=node_type,
                x=x,
                y=y,
                width=w,
                height=h
            ))
            node_id += 1

        lines = cv2.HoughLinesP(
            binary,
            rho=1,
            theta=np.pi/180,
            threshold=50,
            minLineLength=30,
            maxLineGap=10
        )

        if lines is not None:
            for line in lines:
                x1, y1, x2, y2 = line[0]
                source_node = None
                target_node = None

                for node in nodes:
                    if self._point_near_rect(x1, y1, node):
                        source_node = node.node_id
                    if self._point_near_rect(x2, y2, node):
                        target_node = node.node_id

                if source_node and target_node and source_node != target_node:
                    edges.append(FlowchartEdge(
                        source_id=source_node,
                        target_id=target_node
                    ))

        return nodes, edges

    def _point_near_rect(self, x: int, y: int, node: FlowchartNode, margin: int = 20) -> bool:
        """Check if point is near node rectangle."""
        return (node.x - margin <= x <= node.x + node.width + margin and
                node.y - margin <= y <= node.y + node.height + margin)

    def _generate_description(
        self,
        result: DiagramAnalysisResult,
        detail_level: str = "medium",
    ) -> str:
        """Generate natural language description of diagram."""
        parts = []

        type_descriptions = {
            ChartType.BAR_CHART: "a bar chart",
            ChartType.LINE_GRAPH: "a line graph",
            ChartType.PIE_CHART: "a pie chart",
            ChartType.SCATTER_PLOT: "a scatter plot",
            ChartType.FLOWCHART: "a flowchart",
            ChartType.VENN_DIAGRAM: "a Venn diagram",
            ChartType.GEOMETRIC_FIGURE: "a geometric figure",
            ChartType.UNKNOWN: "a diagram",
        }

        type_desc = type_descriptions.get(result.diagram_type, "a diagram")
        parts.append(f"This image shows {type_desc}")

        if result.title:
            parts.append(f"titled '{result.title}'")

        if result.data_points and detail_level in ("medium", "high"):
            num_points = len(result.data_points)
            parts.append(f"containing {num_points} data points")

            if detail_level == "high" and num_points <= 5:
                point_descs = [f"{p.label}: {p.value:.1f}" for p in result.data_points]
                parts.append(f"({', '.join(point_descs)})")

        if result.flowchart_nodes:
            num_nodes = len(result.flowchart_nodes)
            num_edges = len(result.flowchart_edges) if result.flowchart_edges else 0
            parts.append(f"with {num_nodes} steps and {num_edges} connections")

        if result.geometric_shapes and detail_level in ("medium", "high"):
            shape_counts: Dict[str, int] = {}
            for shape in result.geometric_shapes:
                shape_type = shape.shape_type
                shape_counts[shape_type] = shape_counts.get(shape_type, 0) + 1

            shape_descs = [f"{count} {shape}{'s' if count > 1 else ''}"
                         for shape, count in shape_counts.items()]
            parts.append(f"including {', '.join(shape_descs)}")

        return " ".join(parts) + "."

    def classify(self, image: np.ndarray) -> Tuple[ChartType, float]:
        """
        Classify the type of diagram.

        Args:
            image: Input diagram image

        Returns:
            (ChartType, confidence)
        """
        return self._detect_chart_type(image)

    def analyze(self, image: np.ndarray) -> DiagramAnalysisResult:
        """
        Fully analyze a diagram image.

        Args:
            image: Input diagram

        Returns:
            DiagramAnalysisResult with extracted information
        """
        start_time = time.time()

        self._load_models()

        diagram_type, confidence = self._detect_chart_type(image)
        text_regions = self._extract_text_regions(image)

        data_points: List[ChartDataPoint] = []
        chart_data = None
        geometric_shapes = None
        flowchart_nodes = None
        flowchart_edges = None
        structural_elements: List[Element] = []
        title = None

        if self.config.extract_data:
            if diagram_type == ChartType.BAR_CHART:
                chart_data = self._extract_bar_chart_data(image, text_regions)
                data_points = chart_data.data_points
                title = chart_data.title

            elif diagram_type == ChartType.PIE_CHART:
                chart_data = self._extract_pie_chart_data(image, text_regions)
                data_points = chart_data.data_points
                title = chart_data.title

            elif diagram_type == ChartType.FLOWCHART:
                flowchart_nodes, flowchart_edges = self._parse_flowchart_internal(image, text_regions)

        if self.config.detect_shapes:
            geometric_shapes = self._detect_geometric_shapes(image)

            if len(geometric_shapes) > 3 and diagram_type == ChartType.UNKNOWN:
                diagram_type = ChartType.GEOMETRIC_FIGURE
                confidence = 0.6

        for shape in (geometric_shapes or []):
            structural_elements.append(Element(
                element_type=shape.shape_type,
                bbox=(
                    min(v[0] for v in shape.vertices),
                    min(v[1] for v in shape.vertices),
                    max(v[0] for v in shape.vertices) - min(v[0] for v in shape.vertices),
                    max(v[1] for v in shape.vertices) - min(v[1] for v in shape.vertices)
                ),
                properties={"area": shape.area, "perimeter": shape.perimeter}
            ))

        elapsed_ms = int((time.time() - start_time) * 1000)

        result = DiagramAnalysisResult(
            diagram_type=diagram_type,
            confidence=confidence,
            title=title,
            description="",
            data_points=data_points,
            extracted_text=text_regions,
            structural_elements=structural_elements,
            chart_data=chart_data,
            geometric_shapes=geometric_shapes,
            flowchart_nodes=flowchart_nodes,
            flowchart_edges=flowchart_edges,
            processing_time_ms=elapsed_ms
        )

        result.description = self._generate_description(result)

        return result

    def extract_chart_data(
        self,
        image: np.ndarray,
        chart_type: Optional[ChartType] = None,
    ) -> List[ChartDataPoint]:
        """
        Extract data points from a chart.

        Args:
            image: Chart image
            chart_type: Known chart type (will auto-detect if None)

        Returns:
            List of extracted data points
        """
        self._load_models()

        if chart_type is None:
            chart_type, _ = self._detect_chart_type(image)

        text_regions = self._extract_text_regions(image)

        if chart_type == ChartType.BAR_CHART:
            chart_data = self._extract_bar_chart_data(image, text_regions)
            return chart_data.data_points
        elif chart_type == ChartType.PIE_CHART:
            chart_data = self._extract_pie_chart_data(image, text_regions)
            return chart_data.data_points
        else:
            return []

    def parse_flowchart(self, image: np.ndarray) -> Dict[str, Any]:
        """
        Parse flowchart structure.

        Args:
            image: Flowchart image

        Returns:
            Dict with nodes, edges, and structure
        """
        self._load_models()

        text_regions = self._extract_text_regions(image)
        nodes, edges = self._parse_flowchart_internal(image, text_regions)

        return {
            "nodes": [
                {
                    "id": n.node_id,
                    "text": n.text,
                    "type": n.node_type,
                    "position": {"x": n.x, "y": n.y},
                    "size": {"width": n.width, "height": n.height}
                }
                for n in nodes
            ],
            "edges": [
                {
                    "source": e.source_id,
                    "target": e.target_id,
                    "label": e.label
                }
                for e in edges
            ],
            "node_count": len(nodes),
            "edge_count": len(edges)
        }

    def generate_description(
        self,
        result: DiagramAnalysisResult,
        detail_level: str = "medium",
    ) -> str:
        """
        Generate natural language description of diagram.

        Args:
            result: Analysis result
            detail_level: low, medium, or high

        Returns:
            Human-readable description
        """
        return self._generate_description(result, detail_level)

    def compare_diagrams(
        self,
        image1: np.ndarray,
        image2: np.ndarray,
    ) -> Dict[str, Any]:
        """
        Compare two diagrams for similarity and differences.

        Args:
            image1: First diagram
            image2: Second diagram

        Returns:
            Comparison results
        """
        result1 = self.analyze(image1)
        result2 = self.analyze(image2)

        same_type = result1.diagram_type == result2.diagram_type

        # Calculate structural similarity
        shapes1 = set(s.shape_type for s in (result1.geometric_shapes or []))
        shapes2 = set(s.shape_type for s in (result2.geometric_shapes or []))
        shape_overlap = len(shapes1 & shapes2) / max(len(shapes1 | shapes2), 1)

        return {
            "same_type": same_type,
            "type1": result1.diagram_type.value,
            "type2": result2.diagram_type.value,
            "shape_similarity": shape_overlap,
            "data_points1": len(result1.data_points),
            "data_points2": len(result2.data_points),
        }

    def is_loaded(self) -> bool:
        """Check if models are loaded."""
        return self._models_loaded

    def get_model_info(self) -> Dict[str, Any]:
        """Get information about loaded models."""
        return {
            "ocr_loaded": self.ocr_reader is not None,
            "enable_ocr": self.config.enable_ocr,
            "device": self.config.device,
            "detect_shapes": self.config.detect_shapes,
            "extract_data": self.config.extract_data
        }
