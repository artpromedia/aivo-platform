"""
Multimodal Fusion Service.

Combines vision analysis with text understanding for comprehensive document analysis.

Features:
- Early fusion (concatenate features)
- Late fusion (combine predictions)
- Attention-based fusion
- Cross-modal alignment
- Document content fusion (OCR + math + diagrams)

Use cases:
1. Annotated diagrams - combine OCR + diagram analysis
2. Math problems - combine equation detection + text
3. Homework pages - unified understanding
"""

import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np

logger = logging.getLogger(__name__)


class FusionStrategy(Enum):
    """Fusion strategies for combining modalities."""
    EARLY = "early"
    LATE = "late"
    ATTENTION = "attention"
    CROSS_MODAL = "cross_modal"


class BlockType(Enum):
    """Types of content blocks in a document."""
    TEXT = "text"
    MATH = "math"
    DIAGRAM = "diagram"
    IMAGE = "image"
    TABLE = "table"
    HANDWRITING = "handwriting"


@dataclass
class BoundingBox:
    """Bounding box coordinates."""
    x: int
    y: int
    width: int
    height: int

    def area(self) -> int:
        """Calculate bounding box area."""
        return self.width * self.height

    def center(self) -> Tuple[int, int]:
        """Get center point."""
        return (self.x + self.width // 2, self.y + self.height // 2)

    def overlaps(self, other: "BoundingBox") -> bool:
        """Check if this box overlaps with another."""
        return not (
            self.x + self.width < other.x or
            other.x + other.width < self.x or
            self.y + self.height < other.y or
            other.y + other.height < self.y
        )

    def iou(self, other: "BoundingBox") -> float:
        """Calculate Intersection over Union with another box."""
        x1 = max(self.x, other.x)
        y1 = max(self.y, other.y)
        x2 = min(self.x + self.width, other.x + other.width)
        y2 = min(self.y + self.height, other.y + other.height)

        if x2 <= x1 or y2 <= y1:
            return 0.0

        intersection = (x2 - x1) * (y2 - y1)
        union = self.area() + other.area() - intersection

        return intersection / union if union > 0 else 0.0


@dataclass
class ContentBlock:
    """A block of content in a fused document."""
    block_id: str
    block_type: str  # text, math, diagram, image
    content: Any  # The actual content (str for text, EquationResult for math, etc.)
    bounding_box: BoundingBox
    confidence: float
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Relationship:
    """Relationship between content blocks."""
    source_id: str
    target_id: str
    relationship_type: str  # references, explains, contains, follows
    confidence: float = 1.0


@dataclass
class DocumentStructure:
    """Structural analysis of a document."""
    page_width: int
    page_height: int
    num_columns: int
    has_header: bool
    has_footer: bool
    margins: Dict[str, int]  # top, bottom, left, right
    primary_reading_direction: str  # ltr, rtl, ttb


@dataclass
class FusedDocument:
    """Complete fused document representation."""
    content_blocks: List[ContentBlock]
    reading_order: List[int]  # Indices into content_blocks
    relationships: List[Relationship]
    unified_text: str  # Linearized content
    structure: DocumentStructure
    processing_time_ms: int = 0


@dataclass
class MultimodalInput:
    """Container for multimodal inputs."""
    image: Optional[np.ndarray] = None
    text: Optional[str] = None
    audio: Optional[np.ndarray] = None
    interaction_features: Optional[Dict[str, Any]] = None
    image_features: Optional[np.ndarray] = None
    text_features: Optional[np.ndarray] = None
    audio_features: Optional[np.ndarray] = None


@dataclass
class FusedRepresentation:
    """Fused multimodal representation."""
    embedding: np.ndarray
    modality_weights: Dict[str, float]
    confidence: float
    fusion_method: str
    processing_time_ms: int = 0


@dataclass
class CrossModalAlignment:
    """Cross-modal alignment result."""
    vision_to_text_scores: np.ndarray
    text_to_vision_scores: np.ndarray
    alignment_matrix: np.ndarray
    best_matches: List[Tuple[int, int, float]]


@dataclass
class MultimodalFusionConfig:
    """Configuration for multimodal fusion."""
    fusion_strategy: str = "attention"
    embedding_dim: int = 512
    attention_heads: int = 8
    dropout_rate: float = 0.1
    normalize_features: bool = True
    use_learned_weights: bool = True


@dataclass
class DocumentFuserConfig:
    """Configuration for document fusion."""
    merge_overlapping_blocks: bool = True
    overlap_threshold: float = 0.3
    reading_order_method: str = "geometric"  # geometric, ml
    include_confidence_threshold: float = 0.5


class MultimodalFuser:
    """
    Fuse multiple modalities for comprehensive analysis.

    Capabilities:
    - Early fusion (concatenate features)
    - Late fusion (combine predictions)
    - Attention-based fusion
    - Cross-modal alignment
    - Document content fusion

    Usage:
        fuser = MultimodalFuser()
        inputs = MultimodalInput(image=img, text="description")
        result = fuser.fuse(inputs)
        print(result.embedding.shape)

        # Document fusion
        doc = fuser.fuse_document(
            image=homework_image,
            ocr_result=text_result,
            math_result=equations,
            diagram_result=diagrams
        )
        print(doc.unified_text)
    """

    def __init__(
        self,
        config: Optional[MultimodalFusionConfig] = None,
        fusion_strategy: str = "attention",
        embedding_dim: int = 512,
    ) -> None:
        """
        Initialize multimodal fusion.

        Args:
            config: Fusion configuration
            fusion_strategy: Strategy type (legacy)
            embedding_dim: Output embedding dimension (legacy)
        """
        if config:
            self.config = config
        else:
            self.config = MultimodalFusionConfig(
                fusion_strategy=fusion_strategy,
                embedding_dim=embedding_dim
            )

        self.document_config = DocumentFuserConfig()
        self.modality_encoders: Dict[str, Any] = {}
        self._initialized = False

        logger.info(
            f"MultimodalFuser initialized with {self.config.fusion_strategy} strategy"
        )

    def _initialize_encoders(self) -> None:
        """Initialize modality-specific encoders."""
        if self._initialized:
            return

        # For now, we use simple projection layers
        # In production, these would be trained encoders
        self._initialized = True
        logger.info("Modality encoders initialized")

    def _extract_image_features(
        self,
        image: np.ndarray,
    ) -> np.ndarray:
        """
        Extract features from image.

        Args:
            image: Input image

        Returns:
            Feature vector
        """
        # Simple feature extraction using image statistics
        # In production, would use CNN/ViT encoder

        if len(image.shape) == 2:
            # Grayscale
            features = [
                np.mean(image),
                np.std(image),
                np.median(image),
                np.percentile(image, 25),
                np.percentile(image, 75),
            ]
        else:
            # Color image - extract per-channel statistics
            features = []
            for c in range(image.shape[2]):
                channel = image[:, :, c]
                features.extend([
                    np.mean(channel),
                    np.std(channel),
                    np.median(channel),
                ])

        # Pad to embedding dimension
        feature_array = np.array(features, dtype=np.float32)
        padded = np.zeros(self.config.embedding_dim, dtype=np.float32)
        padded[:len(feature_array)] = feature_array

        if self.config.normalize_features:
            norm = np.linalg.norm(padded)
            if norm > 0:
                padded = padded / norm

        return padded

    def _extract_text_features(
        self,
        text: str,
    ) -> np.ndarray:
        """
        Extract features from text.

        Args:
            text: Input text

        Returns:
            Feature vector
        """
        # Simple text feature extraction
        # In production, would use transformer encoder

        # Basic text statistics
        features = [
            len(text),
            len(text.split()),
            text.count('.'),
            text.count(','),
            text.count('?'),
            text.count('!'),
            sum(1 for c in text if c.isupper()),
            sum(1 for c in text if c.isdigit()),
        ]

        # Character-level features (simplified bag of characters)
        char_features = np.zeros(26, dtype=np.float32)
        for c in text.lower():
            if 'a' <= c <= 'z':
                char_features[ord(c) - ord('a')] += 1

        all_features = np.concatenate([
            np.array(features, dtype=np.float32),
            char_features
        ])

        # Pad to embedding dimension
        padded = np.zeros(self.config.embedding_dim, dtype=np.float32)
        padded[:len(all_features)] = all_features

        if self.config.normalize_features:
            norm = np.linalg.norm(padded)
            if norm > 0:
                padded = padded / norm

        return padded

    def _extract_audio_features(
        self,
        audio: np.ndarray,
    ) -> np.ndarray:
        """
        Extract features from audio.

        Args:
            audio: Input audio waveform

        Returns:
            Feature vector
        """
        # Simple audio feature extraction
        features = [
            np.mean(audio),
            np.std(audio),
            np.max(np.abs(audio)),
            np.sum(audio ** 2) / len(audio),  # Energy
        ]

        # Pad to embedding dimension
        feature_array = np.array(features, dtype=np.float32)
        padded = np.zeros(self.config.embedding_dim, dtype=np.float32)
        padded[:len(feature_array)] = feature_array

        if self.config.normalize_features:
            norm = np.linalg.norm(padded)
            if norm > 0:
                padded = padded / norm

        return padded

    def _early_fusion(
        self,
        features: Dict[str, np.ndarray],
    ) -> Tuple[np.ndarray, Dict[str, float]]:
        """
        Perform early fusion by concatenating features.

        Args:
            features: Dictionary of modality features

        Returns:
            Tuple of (fused_embedding, modality_weights)
        """
        if not features:
            return np.zeros(self.config.embedding_dim), {}

        # Concatenate all features
        all_features = []
        modality_weights = {}

        for modality, feat in features.items():
            all_features.append(feat)
            modality_weights[modality] = 1.0 / len(features)

        concatenated = np.concatenate(all_features)

        # Project to output dimension
        if len(concatenated) > self.config.embedding_dim:
            # Simple dimensionality reduction via averaging
            chunk_size = len(concatenated) // self.config.embedding_dim
            fused = np.array([
                np.mean(concatenated[i*chunk_size:(i+1)*chunk_size])
                for i in range(self.config.embedding_dim)
            ])
        else:
            fused = np.zeros(self.config.embedding_dim)
            fused[:len(concatenated)] = concatenated

        return fused, modality_weights

    def _late_fusion(
        self,
        features: Dict[str, np.ndarray],
    ) -> Tuple[np.ndarray, Dict[str, float]]:
        """
        Perform late fusion by averaging features.

        Args:
            features: Dictionary of modality features

        Returns:
            Tuple of (fused_embedding, modality_weights)
        """
        if not features:
            return np.zeros(self.config.embedding_dim), {}

        # Average all features
        modality_weights = {m: 1.0 / len(features) for m in features}

        fused = np.zeros(self.config.embedding_dim)
        for modality, feat in features.items():
            fused += modality_weights[modality] * feat

        return fused, modality_weights

    def _attention_fusion(
        self,
        features: Dict[str, np.ndarray],
    ) -> Tuple[np.ndarray, Dict[str, float]]:
        """
        Perform attention-based fusion.

        Args:
            features: Dictionary of modality features

        Returns:
            Tuple of (fused_embedding, modality_weights)
        """
        if not features:
            return np.zeros(self.config.embedding_dim), {}

        # Compute attention weights based on feature norms
        norms = {m: np.linalg.norm(f) for m, f in features.items()}
        total_norm = sum(norms.values()) + 1e-8

        modality_weights = {m: n / total_norm for m, n in norms.items()}

        # Weighted combination
        fused = np.zeros(self.config.embedding_dim)
        for modality, feat in features.items():
            fused += modality_weights[modality] * feat

        return fused, modality_weights

    def fuse(
        self,
        inputs: MultimodalInput,
    ) -> FusedRepresentation:
        """
        Fuse multimodal inputs into unified representation.

        Args:
            inputs: MultimodalInput with available modalities

        Returns:
            FusedRepresentation
        """
        start_time = time.time()

        self._initialize_encoders()

        # Extract features from available modalities
        features: Dict[str, np.ndarray] = {}

        if inputs.image is not None:
            features["vision"] = self._extract_image_features(inputs.image)
        elif inputs.image_features is not None:
            features["vision"] = inputs.image_features

        if inputs.text is not None:
            features["text"] = self._extract_text_features(inputs.text)
        elif inputs.text_features is not None:
            features["text"] = inputs.text_features

        if inputs.audio is not None:
            features["audio"] = self._extract_audio_features(inputs.audio)
        elif inputs.audio_features is not None:
            features["audio"] = inputs.audio_features

        # Perform fusion based on strategy
        strategy = FusionStrategy(self.config.fusion_strategy)

        if strategy == FusionStrategy.EARLY:
            fused, weights = self._early_fusion(features)
        elif strategy == FusionStrategy.LATE:
            fused, weights = self._late_fusion(features)
        elif strategy == FusionStrategy.ATTENTION:
            fused, weights = self._attention_fusion(features)
        else:
            fused, weights = self._attention_fusion(features)

        # Calculate confidence based on number of modalities
        confidence = min(len(features) / 3.0, 1.0)

        elapsed_ms = int((time.time() - start_time) * 1000)

        return FusedRepresentation(
            embedding=fused,
            modality_weights=weights,
            confidence=confidence,
            fusion_method=self.config.fusion_strategy,
            processing_time_ms=elapsed_ms
        )

    def fuse_document(
        self,
        image: np.ndarray,
        ocr_result: Optional[Any] = None,
        math_result: Optional[List[Any]] = None,
        diagram_result: Optional[Any] = None,
    ) -> FusedDocument:
        """
        Fuse document analysis results into unified representation.

        Args:
            image: Original document image
            ocr_result: OCR/handwriting recognition result
            math_result: List of detected equations
            diagram_result: Diagram analysis result

        Returns:
            FusedDocument with unified content
        """
        start_time = time.time()

        h, w = image.shape[:2]
        content_blocks: List[ContentBlock] = []
        block_id = 0

        # Extract text blocks from OCR result
        if ocr_result is not None:
            text_blocks = self._extract_text_blocks(ocr_result, block_id)
            content_blocks.extend(text_blocks)
            block_id += len(text_blocks)

        # Extract math blocks
        if math_result is not None:
            math_blocks = self._extract_math_blocks(math_result, block_id)
            content_blocks.extend(math_blocks)
            block_id += len(math_blocks)

        # Extract diagram blocks
        if diagram_result is not None:
            diagram_blocks = self._extract_diagram_blocks(diagram_result, block_id)
            content_blocks.extend(diagram_blocks)
            block_id += len(diagram_blocks)

        # Merge overlapping blocks if configured
        if self.document_config.merge_overlapping_blocks:
            content_blocks = self._merge_overlapping_blocks(content_blocks)

        # Determine reading order
        reading_order = self._determine_reading_order(content_blocks, w, h)

        # Find relationships between blocks
        relationships = self._find_relationships(content_blocks)

        # Generate unified text
        unified_text = self._generate_unified_text(content_blocks, reading_order)

        # Analyze document structure
        structure = self._analyze_structure(content_blocks, w, h)

        elapsed_ms = int((time.time() - start_time) * 1000)

        return FusedDocument(
            content_blocks=content_blocks,
            reading_order=reading_order,
            relationships=relationships,
            unified_text=unified_text,
            structure=structure,
            processing_time_ms=elapsed_ms,
        )

    def _extract_text_blocks(
        self,
        ocr_result: Any,
        start_id: int,
    ) -> List[ContentBlock]:
        """Extract content blocks from OCR result."""
        blocks = []

        # Handle different OCR result formats
        if hasattr(ocr_result, 'lines'):
            # RecognitionResult with lines
            for i, line in enumerate(ocr_result.lines):
                if hasattr(line, 'bounding_box'):
                    bbox = BoundingBox(
                        x=line.bounding_box.x,
                        y=line.bounding_box.y,
                        width=line.bounding_box.width,
                        height=line.bounding_box.height,
                    )
                else:
                    # Skip lines without bounding boxes
                    continue

                blocks.append(ContentBlock(
                    block_id=f"text_{start_id + i}",
                    block_type=BlockType.TEXT.value,
                    content=line.text if hasattr(line, 'text') else str(line),
                    bounding_box=bbox,
                    confidence=line.confidence if hasattr(line, 'confidence') else 0.8,
                ))

        elif hasattr(ocr_result, 'text'):
            # Simple text result
            blocks.append(ContentBlock(
                block_id=f"text_{start_id}",
                block_type=BlockType.TEXT.value,
                content=ocr_result.text,
                bounding_box=BoundingBox(x=0, y=0, width=100, height=20),
                confidence=ocr_result.confidence if hasattr(ocr_result, 'confidence') else 0.8,
            ))

        elif isinstance(ocr_result, dict):
            # Dictionary format
            if 'lines' in ocr_result:
                for i, line in enumerate(ocr_result['lines']):
                    if 'bbox' in line or 'bounding_box' in line:
                        bbox_data = line.get('bbox') or line.get('bounding_box')
                        if isinstance(bbox_data, dict):
                            bbox = BoundingBox(**bbox_data)
                        else:
                            bbox = BoundingBox(
                                x=bbox_data[0], y=bbox_data[1],
                                width=bbox_data[2], height=bbox_data[3]
                            )
                    else:
                        continue

                    blocks.append(ContentBlock(
                        block_id=f"text_{start_id + i}",
                        block_type=BlockType.TEXT.value,
                        content=line.get('text', ''),
                        bounding_box=bbox,
                        confidence=line.get('confidence', 0.8),
                    ))

        return blocks

    def _extract_math_blocks(
        self,
        math_results: List[Any],
        start_id: int,
    ) -> List[ContentBlock]:
        """Extract content blocks from math detection results."""
        blocks = []

        for i, eq in enumerate(math_results):
            if hasattr(eq, 'bounding_box') and eq.bounding_box:
                bbox = BoundingBox(
                    x=eq.bounding_box.x,
                    y=eq.bounding_box.y,
                    width=eq.bounding_box.width,
                    height=eq.bounding_box.height,
                )
            else:
                # Create placeholder bbox
                bbox = BoundingBox(x=0, y=i*30, width=200, height=25)

            content = eq.latex if hasattr(eq, 'latex') else str(eq)

            blocks.append(ContentBlock(
                block_id=f"math_{start_id + i}",
                block_type=BlockType.MATH.value,
                content=content,
                bounding_box=bbox,
                confidence=eq.confidence if hasattr(eq, 'confidence') else 0.8,
                metadata={
                    "equation_type": eq.equation_type if hasattr(eq, 'equation_type') else "unknown",
                    "symbols": eq.symbols_detected if hasattr(eq, 'symbols_detected') else [],
                }
            ))

        return blocks

    def _extract_diagram_blocks(
        self,
        diagram_result: Any,
        start_id: int,
    ) -> List[ContentBlock]:
        """Extract content blocks from diagram analysis result."""
        blocks = []

        if hasattr(diagram_result, 'structural_elements'):
            for i, elem in enumerate(diagram_result.structural_elements):
                if hasattr(elem, 'bbox'):
                    bbox = BoundingBox(
                        x=elem.bbox[0],
                        y=elem.bbox[1],
                        width=elem.bbox[2],
                        height=elem.bbox[3],
                    )
                else:
                    continue

                blocks.append(ContentBlock(
                    block_id=f"diagram_{start_id + i}",
                    block_type=BlockType.DIAGRAM.value,
                    content=elem.element_type if hasattr(elem, 'element_type') else "element",
                    bounding_box=bbox,
                    confidence=0.8,
                    metadata=elem.properties if hasattr(elem, 'properties') else {},
                ))

        elif hasattr(diagram_result, 'diagram_type'):
            # Single diagram result
            h = diagram_result.processing_time_ms if hasattr(diagram_result, 'processing_time_ms') else 100
            blocks.append(ContentBlock(
                block_id=f"diagram_{start_id}",
                block_type=BlockType.DIAGRAM.value,
                content=diagram_result.description if hasattr(diagram_result, 'description') else "",
                bounding_box=BoundingBox(x=0, y=0, width=200, height=200),
                confidence=diagram_result.confidence if hasattr(diagram_result, 'confidence') else 0.8,
                metadata={
                    "type": diagram_result.diagram_type.value if hasattr(diagram_result.diagram_type, 'value') else str(diagram_result.diagram_type),
                }
            ))

        return blocks

    def _merge_overlapping_blocks(
        self,
        blocks: List[ContentBlock],
    ) -> List[ContentBlock]:
        """Merge blocks that overlap significantly."""
        if len(blocks) <= 1:
            return blocks

        merged = []
        used = set()

        for i, block1 in enumerate(blocks):
            if i in used:
                continue

            current_block = block1
            for j, block2 in enumerate(blocks[i+1:], i+1):
                if j in used:
                    continue

                iou = current_block.bounding_box.iou(block2.bounding_box)
                if iou > self.document_config.overlap_threshold:
                    # Merge blocks - keep the one with higher confidence
                    if block2.confidence > current_block.confidence:
                        current_block = block2
                    used.add(j)

            merged.append(current_block)
            used.add(i)

        return merged

    def _determine_reading_order(
        self,
        blocks: List[ContentBlock],
        page_width: int,
        page_height: int,
    ) -> List[int]:
        """Determine reading order for content blocks."""
        if not blocks:
            return []

        # Simple top-to-bottom, left-to-right ordering
        block_positions = []
        for i, block in enumerate(blocks):
            center = block.bounding_box.center()
            # Weight y more heavily (reading goes top to bottom first)
            score = center[1] * page_width + center[0]
            block_positions.append((i, score))

        # Sort by score
        block_positions.sort(key=lambda x: x[1])

        return [idx for idx, _ in block_positions]

    def _find_relationships(
        self,
        blocks: List[ContentBlock],
    ) -> List[Relationship]:
        """Find relationships between content blocks."""
        relationships = []

        for i, block1 in enumerate(blocks):
            for j, block2 in enumerate(blocks[i+1:], i+1):
                # Check for spatial proximity
                center1 = block1.bounding_box.center()
                center2 = block2.bounding_box.center()

                distance = np.sqrt(
                    (center1[0] - center2[0])**2 +
                    (center1[1] - center2[1])**2
                )

                # Close blocks might be related
                if distance < 100:
                    rel_type = "follows"

                    # Text near math might explain it
                    if block1.block_type == BlockType.TEXT.value and \
                       block2.block_type == BlockType.MATH.value:
                        rel_type = "explains"

                    # Diagram with nearby text
                    if block1.block_type == BlockType.DIAGRAM.value and \
                       block2.block_type == BlockType.TEXT.value:
                        rel_type = "references"

                    relationships.append(Relationship(
                        source_id=block1.block_id,
                        target_id=block2.block_id,
                        relationship_type=rel_type,
                        confidence=max(0, 1 - distance/200),
                    ))

        return relationships

    def _generate_unified_text(
        self,
        blocks: List[ContentBlock],
        reading_order: List[int],
    ) -> str:
        """Generate unified text representation of document."""
        text_parts = []

        for idx in reading_order:
            block = blocks[idx]

            if block.block_type == BlockType.TEXT.value:
                text_parts.append(str(block.content))
            elif block.block_type == BlockType.MATH.value:
                # Format math content
                text_parts.append(f"[MATH: {block.content}]")
            elif block.block_type == BlockType.DIAGRAM.value:
                # Format diagram content
                desc = block.content or "diagram"
                text_parts.append(f"[DIAGRAM: {desc}]")

        return " ".join(text_parts)

    def _analyze_structure(
        self,
        blocks: List[ContentBlock],
        page_width: int,
        page_height: int,
    ) -> DocumentStructure:
        """Analyze document structure."""
        if not blocks:
            return DocumentStructure(
                page_width=page_width,
                page_height=page_height,
                num_columns=1,
                has_header=False,
                has_footer=False,
                margins={"top": 0, "bottom": 0, "left": 0, "right": 0},
                primary_reading_direction="ltr",
            )

        # Analyze column structure
        x_positions = [b.bounding_box.x for b in blocks]
        x_clusters = self._cluster_positions(x_positions)
        num_columns = len(x_clusters)

        # Check for header (content in top 10%)
        top_threshold = page_height * 0.1
        has_header = any(b.bounding_box.y < top_threshold for b in blocks)

        # Check for footer (content in bottom 10%)
        bottom_threshold = page_height * 0.9
        has_footer = any(
            b.bounding_box.y + b.bounding_box.height > bottom_threshold
            for b in blocks
        )

        # Estimate margins
        min_x = min(b.bounding_box.x for b in blocks)
        max_x = max(b.bounding_box.x + b.bounding_box.width for b in blocks)
        min_y = min(b.bounding_box.y for b in blocks)
        max_y = max(b.bounding_box.y + b.bounding_box.height for b in blocks)

        margins = {
            "left": min_x,
            "right": page_width - max_x,
            "top": min_y,
            "bottom": page_height - max_y,
        }

        return DocumentStructure(
            page_width=page_width,
            page_height=page_height,
            num_columns=num_columns,
            has_header=has_header,
            has_footer=has_footer,
            margins=margins,
            primary_reading_direction="ltr",
        )

    def _cluster_positions(
        self,
        positions: List[int],
        threshold: int = 50,
    ) -> List[List[int]]:
        """Cluster positions into groups."""
        if not positions:
            return []

        sorted_pos = sorted(positions)
        clusters = [[sorted_pos[0]]]

        for pos in sorted_pos[1:]:
            if pos - clusters[-1][-1] < threshold:
                clusters[-1].append(pos)
            else:
                clusters.append([pos])

        return clusters

    def align_modalities(
        self,
        vision_features: np.ndarray,
        text_features: np.ndarray,
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Align vision and text features to common space.

        Args:
            vision_features: Vision feature matrix (N x D)
            text_features: Text feature matrix (M x D)

        Returns:
            Tuple of aligned (vision_features, text_features)
        """
        # Ensure 2D arrays
        if vision_features.ndim == 1:
            vision_features = vision_features.reshape(1, -1)
        if text_features.ndim == 1:
            text_features = text_features.reshape(1, -1)

        # Simple alignment via normalization to same space
        if self.config.normalize_features:
            v_norm = np.linalg.norm(vision_features, axis=1, keepdims=True)
            t_norm = np.linalg.norm(text_features, axis=1, keepdims=True)

            vision_features = vision_features / (v_norm + 1e-8)
            text_features = text_features / (t_norm + 1e-8)

        return vision_features, text_features

    def compute_cross_attention(
        self,
        query_features: np.ndarray,
        key_features: np.ndarray,
    ) -> np.ndarray:
        """
        Compute cross-modal attention.

        Args:
            query_features: Query modality features (N x D)
            key_features: Key modality features (M x D)

        Returns:
            Attended features (N x D)
        """
        # Ensure 2D arrays
        if query_features.ndim == 1:
            query_features = query_features.reshape(1, -1)
        if key_features.ndim == 1:
            key_features = key_features.reshape(1, -1)

        # Compute attention scores
        scores = np.dot(query_features, key_features.T)

        # Softmax normalization
        scores = scores - np.max(scores, axis=1, keepdims=True)
        attention_weights = np.exp(scores)
        attention_weights = attention_weights / (
            np.sum(attention_weights, axis=1, keepdims=True) + 1e-8
        )

        # Apply attention
        attended = np.dot(attention_weights, key_features)

        return attended

    def compute_similarity(
        self,
        features1: np.ndarray,
        features2: np.ndarray,
        metric: str = "cosine",
    ) -> float:
        """
        Compute similarity between two feature vectors.

        Args:
            features1: First feature vector
            features2: Second feature vector
            metric: Similarity metric ('cosine', 'euclidean', 'dot')

        Returns:
            Similarity score
        """
        if metric == "cosine":
            norm1 = np.linalg.norm(features1)
            norm2 = np.linalg.norm(features2)
            if norm1 == 0 or norm2 == 0:
                return 0.0
            return float(np.dot(features1, features2) / (norm1 * norm2))

        elif metric == "euclidean":
            distance = np.linalg.norm(features1 - features2)
            return float(1.0 / (1.0 + distance))

        elif metric == "dot":
            return float(np.dot(features1, features2))

        else:
            raise ValueError(f"Unknown similarity metric: {metric}")

    def cross_modal_retrieval(
        self,
        query_features: np.ndarray,
        gallery_features: np.ndarray,
        top_k: int = 5,
    ) -> List[Tuple[int, float]]:
        """
        Retrieve most similar items from gallery using query.

        Args:
            query_features: Query feature vector
            gallery_features: Gallery feature matrix (N x D)
            top_k: Number of results to return

        Returns:
            List of (index, similarity_score) tuples
        """
        if gallery_features.ndim == 1:
            gallery_features = gallery_features.reshape(1, -1)

        # Compute similarities
        similarities = []
        for i, gallery_feat in enumerate(gallery_features):
            sim = self.compute_similarity(query_features, gallery_feat)
            similarities.append((i, sim))

        # Sort by similarity (descending)
        similarities.sort(key=lambda x: x[1], reverse=True)

        return similarities[:top_k]

    def get_modality_importance(
        self,
        inputs: MultimodalInput,
    ) -> Dict[str, float]:
        """
        Compute importance scores for each modality.

        Args:
            inputs: MultimodalInput with available modalities

        Returns:
            Dictionary mapping modality names to importance scores
        """
        result = self.fuse(inputs)
        return result.modality_weights

    def is_initialized(self) -> bool:
        """Check if fusion module is initialized."""
        return self._initialized

    def get_config(self) -> Dict[str, Any]:
        """Get current configuration."""
        return {
            "fusion_strategy": self.config.fusion_strategy,
            "embedding_dim": self.config.embedding_dim,
            "attention_heads": self.config.attention_heads,
            "normalize_features": self.config.normalize_features,
            "use_learned_weights": self.config.use_learned_weights
        }
