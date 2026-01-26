"""
Multimodal Fusion Service.

Combines vision analysis with other modalities (text, speech, interaction).

Features:
- Early fusion (concatenate features)
- Late fusion (combine predictions)
- Attention-based fusion
- Cross-modal alignment
"""

import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)


class FusionStrategy(Enum):
    """Fusion strategies for combining modalities."""
    EARLY = "early"
    LATE = "late"
    ATTENTION = "attention"
    CROSS_MODAL = "cross_modal"


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


class MultimodalFusion:
    """
    Fuse multiple modalities for comprehensive analysis.

    Capabilities:
    - Early fusion (concatenate features)
    - Late fusion (combine predictions)
    - Attention-based fusion
    - Cross-modal alignment

    Usage:
        fusion = MultimodalFusion()
        inputs = MultimodalInput(image=img, text="description")
        result = fusion.fuse(inputs)
        print(result.embedding.shape)
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

        self.modality_encoders: Dict[str, Any] = {}
        self._initialized = False

        logger.info(
            f"MultimodalFusion initialized with {self.config.fusion_strategy} strategy"
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
