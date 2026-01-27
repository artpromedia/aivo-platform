"""
Feature Fusioner

Fuse features from multiple modalities using various fusion strategies.
"""
import logging
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
import numpy as np
from scipy.special import softmax

logger = logging.getLogger(__name__)


@dataclass
class FusedFeatures:
    """Result of feature fusion."""
    embedding: np.ndarray
    modality_weights: Dict[str, float]
    confidence: float
    fusion_method: str
    modalities_used: List[str]


class FeatureFusioner:
    """
    Fuse features from multiple modalities.

    Methods:
    - Early fusion (concatenation)
    - Late fusion (decision-level)
    - Attention-based fusion

    Usage:
        fusioner = FeatureFusioner()
        fused = fusioner.fuse({"text": text_features, "audio": audio_features})
    """

    def __init__(
        self,
        fusion_method: str = "attention",
        output_dim: Optional[int] = None,
        attention_heads: int = 4,
        dropout_rate: float = 0.1,
    ):
        """
        Initialize the FeatureFusioner.

        Args:
            fusion_method: Fusion method ("attention", "early", "weighted_average")
            output_dim: Output dimension for fused features (None = sum of input dims)
            attention_heads: Number of attention heads for attention fusion
            dropout_rate: Dropout rate for regularization
        """
        self.fusion_method = fusion_method
        self.output_dim = output_dim
        self.attention_heads = attention_heads
        self.dropout_rate = dropout_rate

        # Learned attention weights (initialized lazily)
        self._attention_weights: Optional[Dict[str, np.ndarray]] = None
        self._projection_matrices: Dict[str, np.ndarray] = {}

        logger.info(f"FeatureFusioner initialized with method={fusion_method}")

    def fuse(
        self,
        features: Dict[str, np.ndarray],
        method: Optional[str] = None,
    ) -> FusedFeatures:
        """
        Fuse features from multiple modalities.

        Args:
            features: Dictionary mapping modality names to feature arrays.
                     Each array should be 1D (single sample) or 2D (batch).
            method: Override the default fusion method for this call.

        Returns:
            FusedFeatures containing the fused embedding and metadata.

        Raises:
            ValueError: If no features are provided or features are invalid.
        """
        if not features:
            raise ValueError("No features provided for fusion")

        # Validate and normalize features
        normalized_features = self._normalize_features(features)

        fusion_method = method or self.fusion_method

        if fusion_method == "early":
            embedding = self.early_fusion(normalized_features)
            weights = {k: 1.0 / len(normalized_features) for k in normalized_features}
            confidence = self._compute_confidence(normalized_features, weights)
        elif fusion_method == "attention":
            result = self.attention_fusion(normalized_features)
            return result
        elif fusion_method == "weighted_average":
            embedding, weights = self._weighted_average_fusion(normalized_features)
            confidence = self._compute_confidence(normalized_features, weights)
        else:
            raise ValueError(f"Unknown fusion method: {fusion_method}")

        return FusedFeatures(
            embedding=embedding,
            modality_weights=weights,
            confidence=confidence,
            fusion_method=fusion_method,
            modalities_used=list(normalized_features.keys()),
        )

    def early_fusion(
        self,
        features: Dict[str, np.ndarray],
    ) -> np.ndarray:
        """
        Concatenate features from all modalities (early fusion).

        This is the simplest fusion approach - features are directly concatenated.
        Works well when modalities have similar scales and importance.

        Args:
            features: Dictionary mapping modality names to feature arrays.

        Returns:
            Concatenated feature array.
        """
        if not features:
            raise ValueError("No features provided for early fusion")

        # Ensure consistent ordering
        modalities = sorted(features.keys())
        feature_list = []

        for modality in modalities:
            feat = features[modality]
            # Handle both 1D and 2D arrays
            if feat.ndim == 1:
                feature_list.append(feat)
            else:
                # Flatten if 2D
                feature_list.append(feat.flatten())

        concatenated = np.concatenate(feature_list)

        # Apply optional dimensionality reduction via random projection
        if self.output_dim is not None and len(concatenated) > self.output_dim:
            concatenated = self._random_projection(concatenated, self.output_dim)

        return concatenated

    def attention_fusion(
        self,
        features: Dict[str, np.ndarray],
    ) -> FusedFeatures:
        """
        Attention-weighted fusion with learned weights.

        Uses multi-head self-attention mechanism to learn optimal
        weights for combining features from different modalities.

        Args:
            features: Dictionary mapping modality names to feature arrays.

        Returns:
            FusedFeatures with attention-weighted embedding and weights.
        """
        if not features:
            raise ValueError("No features provided for attention fusion")

        modalities = sorted(features.keys())

        # Project all features to same dimension for attention computation
        target_dim = self._get_common_dim(features)
        projected_features = {}

        for modality in modalities:
            feat = features[modality].flatten()
            if len(feat) != target_dim:
                projected_features[modality] = self._project_features(
                    feat, target_dim, modality
                )
            else:
                projected_features[modality] = feat

        # Stack features for attention computation: (num_modalities, dim)
        stacked = np.stack([projected_features[m] for m in modalities])

        # Compute attention scores using scaled dot-product attention
        attention_scores = self._compute_attention_scores(stacked)

        # Apply softmax to get attention weights
        attention_weights = softmax(attention_scores)

        # Weighted combination of features
        fused_embedding = np.zeros(target_dim)
        modality_weights = {}

        for i, modality in enumerate(modalities):
            weight = float(attention_weights[i])
            modality_weights[modality] = weight
            fused_embedding += weight * projected_features[modality]

        # Compute confidence based on attention distribution
        confidence = self._compute_attention_confidence(attention_weights)

        # Optional output projection
        if self.output_dim is not None and target_dim != self.output_dim:
            fused_embedding = self._random_projection(fused_embedding, self.output_dim)

        return FusedFeatures(
            embedding=fused_embedding,
            modality_weights=modality_weights,
            confidence=confidence,
            fusion_method="attention",
            modalities_used=modalities,
        )

    def _normalize_features(
        self,
        features: Dict[str, np.ndarray],
    ) -> Dict[str, np.ndarray]:
        """Normalize features to have zero mean and unit variance."""
        normalized = {}

        for modality, feat in features.items():
            feat_array = np.asarray(feat, dtype=np.float64)

            # Handle NaN values
            if np.any(np.isnan(feat_array)):
                logger.warning(f"NaN values found in {modality} features, replacing with 0")
                feat_array = np.nan_to_num(feat_array, nan=0.0)

            # Z-score normalization
            mean = np.mean(feat_array)
            std = np.std(feat_array)

            if std > 1e-8:
                normalized[modality] = (feat_array - mean) / std
            else:
                # Avoid division by zero
                normalized[modality] = feat_array - mean

        return normalized

    def _get_common_dim(self, features: Dict[str, np.ndarray]) -> int:
        """Get common dimension for projection (max of all feature dims)."""
        dims = [np.asarray(f).flatten().shape[0] for f in features.values()]
        return max(dims)

    def _project_features(
        self,
        features: np.ndarray,
        target_dim: int,
        modality: str,
    ) -> np.ndarray:
        """Project features to target dimension using random projection."""
        input_dim = len(features)

        # Create or retrieve projection matrix
        key = f"{modality}_{input_dim}_{target_dim}"
        if key not in self._projection_matrices:
            # Use random projection matrix (preserves distances approximately)
            rng = np.random.RandomState(hash(key) % 2**32)
            self._projection_matrices[key] = rng.randn(input_dim, target_dim) / np.sqrt(target_dim)

        projection = self._projection_matrices[key]
        return features @ projection

    def _random_projection(
        self,
        features: np.ndarray,
        target_dim: int,
    ) -> np.ndarray:
        """Apply random projection for dimensionality reduction."""
        input_dim = len(features)
        rng = np.random.RandomState(42)  # Fixed seed for reproducibility
        projection_matrix = rng.randn(input_dim, target_dim) / np.sqrt(target_dim)
        return features @ projection_matrix

    def _compute_attention_scores(self, stacked_features: np.ndarray) -> np.ndarray:
        """
        Compute attention scores using simplified self-attention.

        Args:
            stacked_features: (num_modalities, dim) array

        Returns:
            Attention scores for each modality
        """
        num_modalities, dim = stacked_features.shape

        # Compute query, key representations (simplified: use features directly)
        # Scale factor for stable softmax
        scale = np.sqrt(dim)

        # Self-attention: each modality attends to all modalities
        # Compute pairwise similarities
        similarity_matrix = stacked_features @ stacked_features.T / scale

        # Global attention: average attention received by each modality
        attention_scores = np.mean(similarity_matrix, axis=0)

        # Add feature magnitude as a signal (more informative features get higher weight)
        magnitudes = np.linalg.norm(stacked_features, axis=1)
        if np.sum(magnitudes) > 1e-8:
            magnitude_scores = magnitudes / np.sum(magnitudes)
            attention_scores = 0.7 * attention_scores + 0.3 * magnitude_scores

        return attention_scores

    def _compute_attention_confidence(self, weights: np.ndarray) -> float:
        """
        Compute confidence based on attention weight distribution.

        Higher confidence when attention is more focused (less uniform).
        """
        n = len(weights)
        if n <= 1:
            return 1.0

        # Compute entropy of attention distribution
        entropy = -np.sum(weights * np.log(weights + 1e-10))
        max_entropy = np.log(n)  # Uniform distribution

        # Confidence is inverse of normalized entropy
        # 1.0 = fully focused, 0.0 = uniform
        confidence = 1.0 - (entropy / max_entropy) if max_entropy > 0 else 1.0

        return float(np.clip(confidence, 0.0, 1.0))

    def _compute_confidence(
        self,
        features: Dict[str, np.ndarray],
        weights: Dict[str, float],
    ) -> float:
        """Compute overall fusion confidence based on feature quality."""
        confidences = []

        for modality, feat in features.items():
            feat_array = np.asarray(feat).flatten()

            # Feature quality indicators
            # 1. Non-zero ratio
            non_zero_ratio = np.mean(np.abs(feat_array) > 1e-8)

            # 2. Variance (information content)
            variance = np.var(feat_array)
            variance_score = min(1.0, variance / (variance + 0.1))

            # 3. No extreme values
            has_inf = np.any(np.isinf(feat_array))
            inf_penalty = 0.0 if has_inf else 1.0

            modality_confidence = (non_zero_ratio + variance_score + inf_penalty) / 3
            confidences.append(modality_confidence * weights.get(modality, 1.0))

        return float(np.mean(confidences)) if confidences else 0.5

    def _weighted_average_fusion(
        self,
        features: Dict[str, np.ndarray],
    ) -> Tuple[np.ndarray, Dict[str, float]]:
        """
        Weighted average fusion based on feature quality.

        Returns:
            Tuple of (fused embedding, weights dict)
        """
        modalities = sorted(features.keys())

        # Project to common dimension
        target_dim = self._get_common_dim(features)
        projected = {}
        quality_scores = {}

        for modality in modalities:
            feat = features[modality].flatten()

            # Project if needed
            if len(feat) != target_dim:
                projected[modality] = self._project_features(feat, target_dim, modality)
            else:
                projected[modality] = feat

            # Compute quality score based on variance and non-zero elements
            variance = np.var(feat)
            non_zero = np.mean(np.abs(feat) > 1e-8)
            quality_scores[modality] = variance * non_zero + 0.1  # Add small constant

        # Normalize quality scores to weights
        total_quality = sum(quality_scores.values())
        weights = {m: q / total_quality for m, q in quality_scores.items()}

        # Weighted combination
        fused = np.zeros(target_dim)
        for modality in modalities:
            fused += weights[modality] * projected[modality]

        return fused, weights
