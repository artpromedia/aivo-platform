"""
Cross-Modal Analyzer

Analyze correlations and patterns across different modalities.
"""
import logging
from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Optional, Any
import numpy as np
from scipy import stats
from scipy.signal import correlate

logger = logging.getLogger(__name__)


@dataclass
class ModalCorrelation:
    """Represents correlation between two modalities."""
    modality_a: str
    modality_b: str
    correlation: float
    lag: float  # time lag in seconds
    significance: float
    correlation_type: str = "pearson"


@dataclass
class CrossModalPattern:
    """Detected pattern across modalities."""
    pattern_type: str
    modalities_involved: List[str]
    description: str
    confidence: float
    temporal_span: Optional[Tuple[float, float]] = None
    evidence: List[str] = field(default_factory=list)


@dataclass
class ConsistencyResult:
    """Result of modality consistency analysis."""
    overall_consistency: float
    pairwise_consistency: Dict[str, float]
    inconsistent_modalities: List[str]
    recommendations: List[str]


class CrossModalAnalyzer:
    """
    Analyze cross-modal correlations and patterns.

    Finds patterns like:
    - Speech hesitation -> typing slowdown
    - Eye movement -> comprehension
    - Interaction patterns -> engagement

    Usage:
        analyzer = CrossModalAnalyzer()
        correlations = analyzer.analyze_correlations(multimodal_data)
        patterns = analyzer.detect_patterns(multimodal_data)
    """

    # Known cross-modal patterns for detection
    KNOWN_PATTERNS = {
        "engagement_drop": {
            "indicators": ["decreased_interaction", "increased_pause_time", "reduced_eye_contact"],
            "description": "Learner engagement appears to be declining",
        },
        "cognitive_overload": {
            "indicators": ["high_hesitation", "repeated_content_access", "long_response_times"],
            "description": "Learner may be experiencing cognitive overload",
        },
        "flow_state": {
            "indicators": ["consistent_pace", "low_error_rate", "high_interaction_frequency"],
            "description": "Learner appears to be in a productive flow state",
        },
        "confusion": {
            "indicators": ["erratic_navigation", "repeated_backtracking", "inconsistent_responses"],
            "description": "Learner may be confused about the content",
        },
    }

    def __init__(
        self,
        correlation_threshold: float = 0.3,
        significance_level: float = 0.05,
        max_lag_seconds: float = 10.0,
    ):
        """
        Initialize the CrossModalAnalyzer.

        Args:
            correlation_threshold: Minimum correlation to consider significant
            significance_level: P-value threshold for statistical significance
            max_lag_seconds: Maximum time lag to consider for lagged correlations
        """
        self.correlation_threshold = correlation_threshold
        self.significance_level = significance_level
        self.max_lag_seconds = max_lag_seconds
        logger.info("CrossModalAnalyzer initialized")

    def analyze_correlations(
        self,
        modality_data: Dict[str, Any],
        sample_rate: float = 1.0,
    ) -> List[ModalCorrelation]:
        """
        Analyze correlations across modalities.

        Args:
            modality_data: Dictionary mapping modality names to time series data.
                          Each value can be a list of floats or a dict with 'values' key.
            sample_rate: Sample rate in Hz (samples per second)

        Returns:
            List of ModalCorrelation objects for significant correlations.
        """
        correlations = []

        # Extract and validate time series
        time_series = self._extract_time_series(modality_data)

        if len(time_series) < 2:
            logger.warning("Need at least 2 modalities for correlation analysis")
            return correlations

        modalities = list(time_series.keys())

        # Compute pairwise correlations
        for i, mod_a in enumerate(modalities):
            for mod_b in modalities[i + 1:]:
                series_a = time_series[mod_a]
                series_b = time_series[mod_b]

                # Find the best correlation (with possible lag)
                corr, lag, significance = self._compute_lagged_correlation(
                    series_a, series_b, sample_rate
                )

                if abs(corr) >= self.correlation_threshold and significance <= self.significance_level:
                    correlations.append(ModalCorrelation(
                        modality_a=mod_a,
                        modality_b=mod_b,
                        correlation=float(corr),
                        lag=float(lag),
                        significance=float(significance),
                        correlation_type="pearson" if lag == 0 else "lagged_pearson",
                    ))

        # Sort by absolute correlation strength
        correlations.sort(key=lambda c: abs(c.correlation), reverse=True)

        logger.info(f"Found {len(correlations)} significant cross-modal correlations")
        return correlations

    def detect_patterns(
        self,
        modality_data: Dict[str, Any],
        window_size: int = 10,
    ) -> List[CrossModalPattern]:
        """
        Detect cross-modal patterns in the data.

        Args:
            modality_data: Dictionary mapping modality names to feature data.
            window_size: Size of sliding window for pattern detection.

        Returns:
            List of detected CrossModalPattern objects.
        """
        patterns = []

        # Extract features for pattern detection
        features = self._extract_pattern_features(modality_data)

        if not features:
            return patterns

        # Check for each known pattern type
        for pattern_name, pattern_def in self.KNOWN_PATTERNS.items():
            confidence, evidence = self._check_pattern(features, pattern_def["indicators"])

            if confidence > 0.5:  # Pattern detected
                patterns.append(CrossModalPattern(
                    pattern_type=pattern_name,
                    modalities_involved=list(features.keys()),
                    description=pattern_def["description"],
                    confidence=confidence,
                    evidence=evidence,
                ))

        # Detect temporal patterns
        temporal_patterns = self._detect_temporal_patterns(modality_data, window_size)
        patterns.extend(temporal_patterns)

        # Sort by confidence
        patterns.sort(key=lambda p: p.confidence, reverse=True)

        logger.info(f"Detected {len(patterns)} cross-modal patterns")
        return patterns

    def compute_consistency(
        self,
        modality_data: Dict[str, Any],
    ) -> ConsistencyResult:
        """
        Compute consistency across modalities.

        Measures how well different modalities agree with each other,
        which can indicate data quality or learner behavioral coherence.

        Args:
            modality_data: Dictionary mapping modality names to data.

        Returns:
            ConsistencyResult with consistency scores and recommendations.
        """
        # Extract normalized features
        features = self._extract_normalized_features(modality_data)

        if len(features) < 2:
            return ConsistencyResult(
                overall_consistency=1.0,
                pairwise_consistency={},
                inconsistent_modalities=[],
                recommendations=["Need at least 2 modalities for consistency analysis"],
            )

        modalities = list(features.keys())
        pairwise_consistency = {}
        consistency_scores = []

        # Compute pairwise consistency
        for i, mod_a in enumerate(modalities):
            for mod_b in modalities[i + 1:]:
                key = f"{mod_a}__{mod_b}"
                consistency = self._compute_pairwise_consistency(
                    features[mod_a], features[mod_b]
                )
                pairwise_consistency[key] = consistency
                consistency_scores.append(consistency)

        # Overall consistency is the mean of pairwise consistencies
        overall_consistency = float(np.mean(consistency_scores)) if consistency_scores else 1.0

        # Identify inconsistent modalities
        inconsistent = self._identify_inconsistent_modalities(features, pairwise_consistency)

        # Generate recommendations
        recommendations = self._generate_consistency_recommendations(
            overall_consistency, inconsistent, pairwise_consistency
        )

        return ConsistencyResult(
            overall_consistency=overall_consistency,
            pairwise_consistency=pairwise_consistency,
            inconsistent_modalities=inconsistent,
            recommendations=recommendations,
        )

    def analyze(
        self,
        modality_data: Dict[str, List],
    ) -> List[ModalCorrelation]:
        """
        Find cross-modal correlations (alias for analyze_correlations).

        Args:
            modality_data: Dictionary mapping modality names to time series.

        Returns:
            List of ModalCorrelation objects.
        """
        return self.analyze_correlations(modality_data)

    def find_lag_correlation(
        self,
        series_a: List[float],
        series_b: List[float],
        max_lag: int = 10,
    ) -> Tuple[float, int]:
        """
        Find lagged correlation between time series.

        Args:
            series_a: First time series
            series_b: Second time series
            max_lag: Maximum lag to consider (in samples)

        Returns:
            Tuple of (best_correlation, best_lag)
        """
        arr_a = np.asarray(series_a, dtype=np.float64)
        arr_b = np.asarray(series_b, dtype=np.float64)

        # Normalize arrays
        arr_a = (arr_a - np.mean(arr_a)) / (np.std(arr_a) + 1e-10)
        arr_b = (arr_b - np.mean(arr_b)) / (np.std(arr_b) + 1e-10)

        # Compute cross-correlation
        n = len(arr_a)
        cross_corr = correlate(arr_a, arr_b, mode='full') / n

        # Find the best lag within bounds
        center = len(cross_corr) // 2
        start_idx = max(0, center - max_lag)
        end_idx = min(len(cross_corr), center + max_lag + 1)

        windowed_corr = cross_corr[start_idx:end_idx]
        best_idx = np.argmax(np.abs(windowed_corr))
        best_lag = best_idx - (center - start_idx)

        return float(windowed_corr[best_idx]), int(best_lag)

    def detect_synchrony(
        self,
        modality_data: Dict[str, List],
    ) -> float:
        """
        Detect multimodal synchrony.

        Measures how synchronized different modalities are in terms
        of their temporal dynamics.

        Args:
            modality_data: Dictionary mapping modality names to time series.

        Returns:
            Synchrony score between 0 and 1.
        """
        time_series = self._extract_time_series(modality_data)

        if len(time_series) < 2:
            return 1.0

        modalities = list(time_series.keys())
        synchrony_scores = []

        for i, mod_a in enumerate(modalities):
            for mod_b in modalities[i + 1:]:
                # Compute instantaneous phase synchrony
                sync = self._compute_phase_synchrony(
                    time_series[mod_a], time_series[mod_b]
                )
                synchrony_scores.append(sync)

        return float(np.mean(synchrony_scores)) if synchrony_scores else 1.0

    def _extract_time_series(
        self,
        modality_data: Dict[str, Any],
    ) -> Dict[str, np.ndarray]:
        """Extract time series arrays from modality data."""
        time_series = {}

        for modality, data in modality_data.items():
            if isinstance(data, (list, np.ndarray)):
                arr = np.asarray(data, dtype=np.float64).flatten()
            elif isinstance(data, dict):
                if "values" in data:
                    arr = np.asarray(data["values"], dtype=np.float64).flatten()
                elif "time_series" in data:
                    arr = np.asarray(data["time_series"], dtype=np.float64).flatten()
                else:
                    # Try to extract numeric values
                    numeric_values = [v for v in data.values() if isinstance(v, (int, float))]
                    if numeric_values:
                        arr = np.asarray(numeric_values, dtype=np.float64)
                    else:
                        continue
            else:
                continue

            if len(arr) > 1:
                # Handle NaN values
                arr = np.nan_to_num(arr, nan=np.nanmean(arr) if not np.all(np.isnan(arr)) else 0.0)
                time_series[modality] = arr

        return time_series

    def _compute_lagged_correlation(
        self,
        series_a: np.ndarray,
        series_b: np.ndarray,
        sample_rate: float,
    ) -> Tuple[float, float, float]:
        """
        Compute correlation with optimal lag.

        Returns:
            Tuple of (correlation, lag_seconds, p_value)
        """
        # Align series lengths
        min_len = min(len(series_a), len(series_b))
        series_a = series_a[:min_len]
        series_b = series_b[:min_len]

        if min_len < 3:
            return 0.0, 0.0, 1.0

        # Try zero-lag correlation first
        try:
            corr_0, p_value_0 = stats.pearsonr(series_a, series_b)
        except Exception:
            corr_0, p_value_0 = 0.0, 1.0

        # Find best lagged correlation
        max_lag_samples = int(self.max_lag_seconds * sample_rate)
        max_lag_samples = min(max_lag_samples, min_len // 3)  # Don't exceed 1/3 of series

        if max_lag_samples < 1:
            return float(corr_0), 0.0, float(p_value_0)

        best_corr, best_lag = self.find_lag_correlation(
            series_a.tolist(), series_b.tolist(), max_lag_samples
        )

        # Choose between zero-lag and lagged correlation
        if abs(best_corr) > abs(corr_0) + 0.1:  # Require meaningful improvement
            lag_seconds = best_lag / sample_rate
            # Estimate p-value for lagged correlation (approximation)
            n = min_len - abs(best_lag)
            if n > 2:
                t_stat = best_corr * np.sqrt(n - 2) / np.sqrt(1 - best_corr**2 + 1e-10)
                p_value = 2 * (1 - stats.t.cdf(abs(t_stat), n - 2))
            else:
                p_value = 1.0
            return float(best_corr), float(lag_seconds), float(p_value)

        return float(corr_0), 0.0, float(p_value_0)

    def _extract_pattern_features(
        self,
        modality_data: Dict[str, Any],
    ) -> Dict[str, Dict[str, float]]:
        """Extract high-level features for pattern detection."""
        features = {}

        for modality, data in modality_data.items():
            mod_features = {}

            if isinstance(data, dict):
                # Use provided features directly
                for key, value in data.items():
                    if isinstance(value, (int, float)):
                        mod_features[key] = float(value)
                    elif isinstance(value, (list, np.ndarray)) and len(value) > 0:
                        arr = np.asarray(value, dtype=np.float64)
                        mod_features[f"{key}_mean"] = float(np.nanmean(arr))
                        mod_features[f"{key}_std"] = float(np.nanstd(arr))
            elif isinstance(data, (list, np.ndarray)):
                arr = np.asarray(data, dtype=np.float64)
                if len(arr) > 0:
                    mod_features["mean"] = float(np.nanmean(arr))
                    mod_features["std"] = float(np.nanstd(arr))
                    mod_features["trend"] = float(self._compute_trend(arr))
                    mod_features["variability"] = float(np.nanstd(np.diff(arr)) if len(arr) > 1 else 0)

            if mod_features:
                features[modality] = mod_features

        return features

    def _check_pattern(
        self,
        features: Dict[str, Dict[str, float]],
        indicators: List[str],
    ) -> Tuple[float, List[str]]:
        """Check if pattern indicators are present in features."""
        evidence = []
        matches = 0

        # Flatten all features
        all_features = {}
        for modality, mod_features in features.items():
            for key, value in mod_features.items():
                all_features[f"{modality}_{key}"] = value
                all_features[key] = value  # Also add without modality prefix

        for indicator in indicators:
            # Check for indicator presence (fuzzy matching)
            for feature_name, feature_value in all_features.items():
                if self._indicator_matches(indicator, feature_name, feature_value):
                    matches += 1
                    evidence.append(f"{indicator}: {feature_name}={feature_value:.2f}")
                    break

        confidence = matches / len(indicators) if indicators else 0.0
        return confidence, evidence

    def _indicator_matches(
        self,
        indicator: str,
        feature_name: str,
        feature_value: float,
    ) -> bool:
        """Check if a feature matches an indicator."""
        indicator_lower = indicator.lower().replace("_", " ")
        feature_lower = feature_name.lower().replace("_", " ")

        # Check for keyword matches
        indicator_words = set(indicator_lower.split())
        feature_words = set(feature_lower.split())

        if indicator_words & feature_words:  # Some overlap
            # Check value thresholds based on indicator type
            if "high" in indicator_lower or "increased" in indicator_lower:
                return feature_value > 0.6
            elif "low" in indicator_lower or "decreased" in indicator_lower or "reduced" in indicator_lower:
                return feature_value < 0.4
            elif "consistent" in indicator_lower:
                return 0.4 <= feature_value <= 0.6
            else:
                return True  # Just presence is enough

        return False

    def _detect_temporal_patterns(
        self,
        modality_data: Dict[str, Any],
        window_size: int,
    ) -> List[CrossModalPattern]:
        """Detect temporal patterns using sliding window analysis."""
        patterns = []
        time_series = self._extract_time_series(modality_data)

        if len(time_series) < 2:
            return patterns

        modalities = list(time_series.keys())

        # Look for synchronized changes across modalities
        for i, mod_a in enumerate(modalities):
            for mod_b in modalities[i + 1:]:
                sync_regions = self._find_synchronized_changes(
                    time_series[mod_a], time_series[mod_b], window_size
                )

                if sync_regions:
                    patterns.append(CrossModalPattern(
                        pattern_type="synchronized_change",
                        modalities_involved=[mod_a, mod_b],
                        description=f"Synchronized changes detected between {mod_a} and {mod_b}",
                        confidence=0.7,
                        evidence=[f"Found {len(sync_regions)} synchronized change regions"],
                    ))

        return patterns

    def _find_synchronized_changes(
        self,
        series_a: np.ndarray,
        series_b: np.ndarray,
        window_size: int,
    ) -> List[Tuple[int, int]]:
        """Find regions where both series change together."""
        min_len = min(len(series_a), len(series_b))
        series_a = series_a[:min_len]
        series_b = series_b[:min_len]

        if min_len < window_size * 2:
            return []

        sync_regions = []

        # Compute windowed derivatives
        diff_a = np.diff(series_a)
        diff_b = np.diff(series_b)

        # Normalize
        diff_a = diff_a / (np.std(diff_a) + 1e-10)
        diff_b = diff_b / (np.std(diff_b) + 1e-10)

        # Find synchronized regions
        for start in range(0, len(diff_a) - window_size, window_size // 2):
            end = start + window_size
            window_a = diff_a[start:end]
            window_b = diff_b[start:end]

            # Check if changes are correlated
            if len(window_a) > 2:
                try:
                    corr, _ = stats.pearsonr(window_a, window_b)
                    if abs(corr) > 0.6:
                        sync_regions.append((start, end))
                except Exception:
                    pass

        return sync_regions

    def _extract_normalized_features(
        self,
        modality_data: Dict[str, Any],
    ) -> Dict[str, np.ndarray]:
        """Extract and normalize features for consistency analysis."""
        features = {}

        for modality, data in modality_data.items():
            if isinstance(data, (list, np.ndarray)):
                arr = np.asarray(data, dtype=np.float64).flatten()
            elif isinstance(data, dict):
                # Extract numeric values
                numeric_values = []
                for v in data.values():
                    if isinstance(v, (int, float)):
                        numeric_values.append(v)
                    elif isinstance(v, (list, np.ndarray)):
                        numeric_values.extend(np.asarray(v).flatten().tolist())
                arr = np.asarray(numeric_values, dtype=np.float64)
            else:
                continue

            if len(arr) > 0:
                # Z-score normalization
                arr = np.nan_to_num(arr)
                mean, std = np.mean(arr), np.std(arr)
                if std > 1e-10:
                    arr = (arr - mean) / std
                features[modality] = arr

        return features

    def _compute_pairwise_consistency(
        self,
        features_a: np.ndarray,
        features_b: np.ndarray,
    ) -> float:
        """Compute consistency between two feature sets."""
        # Use multiple consistency measures

        # 1. Correlation-based consistency
        min_len = min(len(features_a), len(features_b))
        if min_len >= 3:
            try:
                corr, _ = stats.pearsonr(features_a[:min_len], features_b[:min_len])
                corr_consistency = (corr + 1) / 2  # Map [-1, 1] to [0, 1]
            except Exception:
                corr_consistency = 0.5
        else:
            corr_consistency = 0.5

        # 2. Distribution similarity (using KL divergence approximation)
        try:
            # Simple distribution comparison using histogram
            bins = min(10, min_len // 2)
            if bins >= 2:
                hist_a, _ = np.histogram(features_a, bins=bins, density=True)
                hist_b, _ = np.histogram(features_b, bins=bins, density=True)

                # Add small constant to avoid log(0)
                hist_a = hist_a + 1e-10
                hist_b = hist_b + 1e-10

                # Symmetric KL divergence
                kl_ab = np.sum(hist_a * np.log(hist_a / hist_b))
                kl_ba = np.sum(hist_b * np.log(hist_b / hist_a))
                kl_sym = (kl_ab + kl_ba) / 2

                # Convert to consistency score
                dist_consistency = np.exp(-kl_sym)
            else:
                dist_consistency = 0.5
        except Exception:
            dist_consistency = 0.5

        # 3. Statistical similarity (mean and variance)
        mean_diff = abs(np.mean(features_a) - np.mean(features_b))
        var_ratio = min(np.var(features_a), np.var(features_b)) / (max(np.var(features_a), np.var(features_b)) + 1e-10)
        stat_consistency = (1 - min(1, mean_diff)) * var_ratio

        # Weighted average
        consistency = 0.4 * corr_consistency + 0.3 * dist_consistency + 0.3 * stat_consistency

        return float(np.clip(consistency, 0, 1))

    def _identify_inconsistent_modalities(
        self,
        features: Dict[str, np.ndarray],
        pairwise_consistency: Dict[str, float],
    ) -> List[str]:
        """Identify modalities that are inconsistent with others."""
        modalities = list(features.keys())
        inconsistency_scores = {m: 0.0 for m in modalities}
        counts = {m: 0 for m in modalities}

        for pair_key, consistency in pairwise_consistency.items():
            mod_a, mod_b = pair_key.split("__")
            inconsistency = 1 - consistency

            inconsistency_scores[mod_a] += inconsistency
            inconsistency_scores[mod_b] += inconsistency
            counts[mod_a] += 1
            counts[mod_b] += 1

        # Average inconsistency per modality
        avg_inconsistency = {
            m: inconsistency_scores[m] / counts[m] if counts[m] > 0 else 0
            for m in modalities
        }

        # Flag modalities with above-average inconsistency
        threshold = np.mean(list(avg_inconsistency.values())) + np.std(list(avg_inconsistency.values()))
        inconsistent = [m for m, score in avg_inconsistency.items() if score > threshold]

        return inconsistent

    def _generate_consistency_recommendations(
        self,
        overall_consistency: float,
        inconsistent_modalities: List[str],
        pairwise_consistency: Dict[str, float],
    ) -> List[str]:
        """Generate recommendations based on consistency analysis."""
        recommendations = []

        if overall_consistency < 0.4:
            recommendations.append(
                "Overall modality consistency is low. Consider reviewing data quality "
                "or investigating potential behavioral inconsistencies."
            )
        elif overall_consistency < 0.7:
            recommendations.append(
                "Moderate modality consistency detected. Some modalities may benefit "
                "from additional validation."
            )
        else:
            recommendations.append(
                "Good modality consistency. Data appears reliable for multimodal analysis."
            )

        if inconsistent_modalities:
            recommendations.append(
                f"The following modalities show unusual patterns: {', '.join(inconsistent_modalities)}. "
                "Consider investigating data collection for these modalities."
            )

        # Find the least consistent pair
        if pairwise_consistency:
            min_pair = min(pairwise_consistency.items(), key=lambda x: x[1])
            if min_pair[1] < 0.5:
                mod_a, mod_b = min_pair[0].split("__")
                recommendations.append(
                    f"Low consistency between {mod_a} and {mod_b} (score: {min_pair[1]:.2f}). "
                    "These modalities may capture different aspects of learner behavior."
                )

        return recommendations

    def _compute_trend(self, series: np.ndarray) -> float:
        """Compute linear trend of a time series."""
        if len(series) < 2:
            return 0.0

        x = np.arange(len(series))
        try:
            slope, _, _, _, _ = stats.linregress(x, series)
            return float(slope)
        except Exception:
            return 0.0

    def _compute_phase_synchrony(
        self,
        series_a: np.ndarray,
        series_b: np.ndarray,
    ) -> float:
        """Compute phase synchrony between two time series."""
        min_len = min(len(series_a), len(series_b))
        if min_len < 4:
            return 1.0

        series_a = series_a[:min_len]
        series_b = series_b[:min_len]

        # Use Hilbert transform for instantaneous phase (simplified)
        # For production, consider using scipy.signal.hilbert

        # Compute derivative as proxy for phase
        diff_a = np.diff(series_a)
        diff_b = np.diff(series_b)

        # Normalize
        diff_a = diff_a / (np.linalg.norm(diff_a) + 1e-10)
        diff_b = diff_b / (np.linalg.norm(diff_b) + 1e-10)

        # Phase synchrony as cosine similarity
        synchrony = np.dot(diff_a, diff_b)

        return float(np.clip((synchrony + 1) / 2, 0, 1))
