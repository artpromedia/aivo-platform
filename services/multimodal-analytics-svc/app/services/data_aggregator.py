"""
Data Aggregator

Aggregate and preprocess multimodal data from various sources.
"""
import logging
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Tuple
from enum import Enum
import numpy as np
from scipy import interpolate

logger = logging.getLogger(__name__)


class ImputationStrategy(Enum):
    """Strategies for handling missing data."""
    MEAN = "mean"
    MEDIAN = "median"
    ZERO = "zero"
    FORWARD_FILL = "forward_fill"
    BACKWARD_FILL = "backward_fill"
    INTERPOLATE = "interpolate"
    DROP = "drop"


class NormalizationMethod(Enum):
    """Methods for data normalization."""
    MINMAX = "minmax"
    ZSCORE = "zscore"
    ROBUST = "robust"
    NONE = "none"


@dataclass
class AggregatedData:
    """Result of data aggregation."""
    learner_id: str
    modalities: List[str]
    data: Dict[str, Any]
    metadata: Dict[str, Any]
    quality_score: float
    missing_modalities: List[str]
    warnings: List[str] = field(default_factory=list)


@dataclass
class DataQualityReport:
    """Report on data quality."""
    completeness: float
    consistency: float
    timeliness: float
    overall_quality: float
    issues: List[str]
    recommendations: List[str]


class DataAggregator:
    """
    Aggregate multimodal data from various sources.

    Sources:
    - Learning management system
    - Assessment data
    - Interaction logs
    - External services

    Usage:
        aggregator = DataAggregator()
        data = aggregator.aggregate_data(learner_id, sources)
        normalized = aggregator.normalize_sources(data)
        imputed = aggregator.handle_missing_data(normalized)
    """

    # Default source configurations
    SOURCE_CONFIGS = {
        "lms": {
            "fields": ["progress", "grades", "completion", "time_spent"],
            "priority": 1,
        },
        "assessment": {
            "fields": ["scores", "attempts", "accuracy", "response_times"],
            "priority": 1,
        },
        "interaction": {
            "fields": ["clicks", "scrolls", "pauses", "navigation"],
            "priority": 2,
        },
        "video": {
            "fields": ["watch_time", "completion", "rewinds", "pauses"],
            "priority": 2,
        },
        "audio": {
            "fields": ["listen_time", "replays", "speed_changes"],
            "priority": 3,
        },
        "text": {
            "fields": ["read_time", "highlights", "notes", "searches"],
            "priority": 2,
        },
        "emotional": {
            "fields": ["sentiment", "frustration", "engagement", "confidence"],
            "priority": 2,
        },
    }

    def __init__(
        self,
        default_imputation: str = "interpolate",
        default_normalization: str = "zscore",
        min_data_points: int = 3,
    ):
        """
        Initialize the DataAggregator.

        Args:
            default_imputation: Default strategy for missing data
            default_normalization: Default normalization method
            min_data_points: Minimum data points required per modality
        """
        self.default_imputation = ImputationStrategy(default_imputation)
        self.default_normalization = NormalizationMethod(default_normalization)
        self.min_data_points = min_data_points
        logger.info("DataAggregator initialized")

    def aggregate_data(
        self,
        learner_id: str,
        sources: List[str],
        time_range: Optional[str] = None,
        raw_data: Optional[Dict[str, Any]] = None,
    ) -> AggregatedData:
        """
        Aggregate multimodal data from specified sources.

        Args:
            learner_id: Unique learner identifier.
            sources: List of data sources to aggregate.
            time_range: Optional time range filter (e.g., "7d", "30d").
            raw_data: Optional pre-fetched raw data to aggregate.

        Returns:
            AggregatedData with combined data from all sources.
        """
        aggregated = {}
        metadata = {
            "learner_id": learner_id,
            "sources_requested": sources,
            "time_range": time_range,
        }
        warnings = []
        missing_modalities = []
        sources_found = []

        # Use provided raw_data or simulate data fetching
        if raw_data is None:
            raw_data = self._fetch_data_from_sources(learner_id, sources, time_range)

        # Process each source
        for source in sources:
            source_config = self.SOURCE_CONFIGS.get(source, {"fields": [], "priority": 3})

            if source in raw_data and raw_data[source]:
                source_data = raw_data[source]
                processed = self._process_source_data(source, source_data, source_config)
                if processed:
                    aggregated[source] = processed
                    sources_found.append(source)
                else:
                    missing_modalities.append(source)
                    warnings.append(f"Source '{source}' data could not be processed")
            else:
                missing_modalities.append(source)
                warnings.append(f"No data available from source '{source}'")

        # Compute quality score
        quality_score = self._compute_quality_score(
            aggregated, sources, missing_modalities
        )

        metadata["sources_found"] = sources_found
        metadata["data_points"] = {
            source: self._count_data_points(data)
            for source, data in aggregated.items()
        }

        return AggregatedData(
            learner_id=learner_id,
            modalities=sources_found,
            data=aggregated,
            metadata=metadata,
            quality_score=quality_score,
            missing_modalities=missing_modalities,
            warnings=warnings,
        )

    def aggregate(
        self,
        learner_id: str,
        sources: List[str],
        time_range: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Aggregate data from multiple sources (simplified interface).

        Args:
            learner_id: Unique learner identifier.
            sources: List of data sources.
            time_range: Optional time range.

        Returns:
            Dictionary with aggregated data.
        """
        result = self.aggregate_data(learner_id, sources, time_range)
        return result.data

    def normalize_sources(
        self,
        data: Dict[str, Any],
        method: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Normalize data from different sources to common scales.

        Args:
            data: Dictionary of source data to normalize.
            method: Normalization method ("minmax", "zscore", "robust").

        Returns:
            Normalized data dictionary.
        """
        method = NormalizationMethod(method) if method else self.default_normalization
        normalized = {}

        for source, source_data in data.items():
            if isinstance(source_data, dict):
                normalized[source] = self._normalize_dict(source_data, method)
            elif isinstance(source_data, (list, np.ndarray)):
                normalized[source] = self._normalize_array(
                    np.asarray(source_data, dtype=np.float64), method
                ).tolist()
            else:
                normalized[source] = source_data

        return normalized

    def handle_missing_data(
        self,
        data: Dict[str, Any],
        strategy: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Handle missing modality data with imputation.

        Args:
            data: Dictionary containing data with potential missing values.
            strategy: Imputation strategy ("mean", "median", "interpolate", etc.).

        Returns:
            Data with missing values imputed.
        """
        strategy = ImputationStrategy(strategy) if strategy else self.default_imputation
        imputed = {}

        for source, source_data in data.items():
            if isinstance(source_data, dict):
                imputed[source] = self._impute_dict(source_data, strategy)
            elif isinstance(source_data, (list, np.ndarray)):
                arr = np.asarray(source_data, dtype=np.float64)
                imputed[source] = self._impute_array(arr, strategy).tolist()
            else:
                imputed[source] = source_data

        return imputed

    def synchronize_timestamps(
        self,
        data: Dict[str, List],
        target_frequency: float = 1.0,
    ) -> Dict[str, List]:
        """
        Synchronize timestamps across data sources.

        Args:
            data: Dictionary mapping source names to time series data.
            target_frequency: Target sampling frequency in Hz.

        Returns:
            Synchronized data with aligned timestamps.
        """
        synchronized = {}

        # Find common time range
        min_length = min(len(series) for series in data.values() if isinstance(series, list))

        for source, series in data.items():
            if isinstance(series, list):
                arr = np.asarray(series, dtype=np.float64)

                if len(arr) > min_length:
                    # Resample to common length
                    indices = np.linspace(0, len(arr) - 1, min_length)
                    synchronized[source] = np.interp(
                        indices, np.arange(len(arr)), arr
                    ).tolist()
                else:
                    synchronized[source] = series
            else:
                synchronized[source] = series

        return synchronized

    def handle_missing(
        self,
        data: Dict[str, List],
        strategy: str = "interpolate",
    ) -> Dict[str, List]:
        """
        Handle missing data (alias for handle_missing_data).

        Args:
            data: Dictionary containing data with potential missing values.
            strategy: Imputation strategy.

        Returns:
            Data with missing values handled.
        """
        return self.handle_missing_data(data, strategy)

    def assess_data_quality(
        self,
        data: Dict[str, Any],
    ) -> DataQualityReport:
        """
        Assess the quality of aggregated data.

        Args:
            data: Aggregated data dictionary.

        Returns:
            DataQualityReport with quality metrics.
        """
        issues = []
        recommendations = []

        # Completeness: ratio of non-missing values
        completeness = self._compute_completeness(data)
        if completeness < 0.7:
            issues.append("Low data completeness detected")
            recommendations.append("Consider collecting more data or using imputation")

        # Consistency: check for outliers and inconsistencies
        consistency = self._compute_consistency(data)
        if consistency < 0.7:
            issues.append("Data consistency issues detected")
            recommendations.append("Review data collection process for errors")

        # Timeliness: check for stale data (placeholder)
        timeliness = 0.9  # Assume recent data by default

        # Overall quality
        overall = (completeness + consistency + timeliness) / 3

        if not issues:
            recommendations.append("Data quality is acceptable for analysis")

        return DataQualityReport(
            completeness=completeness,
            consistency=consistency,
            timeliness=timeliness,
            overall_quality=overall,
            issues=issues,
            recommendations=recommendations,
        )

    def _fetch_data_from_sources(
        self,
        learner_id: str,
        sources: List[str],
        time_range: Optional[str],
    ) -> Dict[str, Any]:
        """
        Fetch data from specified sources.

        Note: In production, this would query actual data stores.
        Here we return empty dict - actual data should be provided via raw_data parameter.
        """
        logger.info(f"Fetching data for learner {learner_id} from sources: {sources}")
        return {}

    def _process_source_data(
        self,
        source: str,
        data: Any,
        config: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        """Process and validate source data."""
        if data is None:
            return None

        processed = {}

        if isinstance(data, dict):
            for field in config.get("fields", []):
                if field in data:
                    value = data[field]
                    if self._is_valid_value(value):
                        processed[field] = value

            # Include any additional fields not in config
            for key, value in data.items():
                if key not in processed and self._is_valid_value(value):
                    processed[key] = value

        elif isinstance(data, (list, np.ndarray)):
            arr = np.asarray(data, dtype=np.float64)
            if len(arr) >= self.min_data_points:
                processed["values"] = arr.tolist()

        return processed if processed else None

    def _is_valid_value(self, value: Any) -> bool:
        """Check if a value is valid for processing."""
        if value is None:
            return False
        if isinstance(value, float) and (np.isnan(value) or np.isinf(value)):
            return False
        if isinstance(value, (list, np.ndarray)):
            arr = np.asarray(value)
            return len(arr) > 0 and not np.all(np.isnan(arr))
        return True

    def _compute_quality_score(
        self,
        aggregated: Dict[str, Any],
        requested_sources: List[str],
        missing: List[str],
    ) -> float:
        """Compute overall data quality score."""
        if not requested_sources:
            return 0.0

        # Coverage score
        coverage = (len(requested_sources) - len(missing)) / len(requested_sources)

        # Data density score
        density_scores = []
        for source, data in aggregated.items():
            points = self._count_data_points(data)
            density = min(1.0, points / 100)  # Normalize to max 100 points
            density_scores.append(density)

        avg_density = np.mean(density_scores) if density_scores else 0.0

        # Combine scores
        quality = 0.6 * coverage + 0.4 * avg_density

        return float(np.clip(quality, 0, 1))

    def _count_data_points(self, data: Any) -> int:
        """Count number of data points in a data structure."""
        if isinstance(data, dict):
            return sum(self._count_data_points(v) for v in data.values())
        elif isinstance(data, (list, np.ndarray)):
            return len(data)
        elif data is not None:
            return 1
        return 0

    def _normalize_dict(
        self,
        data: Dict[str, Any],
        method: NormalizationMethod,
    ) -> Dict[str, Any]:
        """Normalize values in a dictionary."""
        normalized = {}

        for key, value in data.items():
            if isinstance(value, (list, np.ndarray)):
                arr = np.asarray(value, dtype=np.float64)
                normalized[key] = self._normalize_array(arr, method).tolist()
            elif isinstance(value, (int, float)):
                # Single values can't be normalized alone
                normalized[key] = value
            elif isinstance(value, dict):
                normalized[key] = self._normalize_dict(value, method)
            else:
                normalized[key] = value

        return normalized

    def _normalize_array(
        self,
        arr: np.ndarray,
        method: NormalizationMethod,
    ) -> np.ndarray:
        """Normalize a numpy array."""
        if len(arr) == 0:
            return arr

        # Handle NaN values
        arr = np.nan_to_num(arr, nan=np.nanmean(arr) if not np.all(np.isnan(arr)) else 0.0)

        if method == NormalizationMethod.MINMAX:
            min_val = np.min(arr)
            max_val = np.max(arr)
            if max_val - min_val > 1e-10:
                return (arr - min_val) / (max_val - min_val)
            return np.zeros_like(arr)

        elif method == NormalizationMethod.ZSCORE:
            mean = np.mean(arr)
            std = np.std(arr)
            if std > 1e-10:
                return (arr - mean) / std
            return arr - mean

        elif method == NormalizationMethod.ROBUST:
            median = np.median(arr)
            q1 = np.percentile(arr, 25)
            q3 = np.percentile(arr, 75)
            iqr = q3 - q1
            if iqr > 1e-10:
                return (arr - median) / iqr
            return arr - median

        return arr

    def _impute_dict(
        self,
        data: Dict[str, Any],
        strategy: ImputationStrategy,
    ) -> Dict[str, Any]:
        """Impute missing values in a dictionary."""
        imputed = {}

        for key, value in data.items():
            if isinstance(value, (list, np.ndarray)):
                arr = np.asarray(value, dtype=np.float64)
                imputed[key] = self._impute_array(arr, strategy).tolist()
            elif isinstance(value, dict):
                imputed[key] = self._impute_dict(value, strategy)
            elif value is None:
                imputed[key] = 0.0 if strategy != ImputationStrategy.DROP else None
            else:
                imputed[key] = value

        # Remove None values if DROP strategy
        if strategy == ImputationStrategy.DROP:
            imputed = {k: v for k, v in imputed.items() if v is not None}

        return imputed

    def _impute_array(
        self,
        arr: np.ndarray,
        strategy: ImputationStrategy,
    ) -> np.ndarray:
        """Impute missing values in a numpy array."""
        if len(arr) == 0:
            return arr

        # Create mask for NaN values
        nan_mask = np.isnan(arr)

        if not np.any(nan_mask):
            return arr

        result = arr.copy()

        if strategy == ImputationStrategy.MEAN:
            fill_value = np.nanmean(arr)
            result[nan_mask] = fill_value

        elif strategy == ImputationStrategy.MEDIAN:
            fill_value = np.nanmedian(arr)
            result[nan_mask] = fill_value

        elif strategy == ImputationStrategy.ZERO:
            result[nan_mask] = 0.0

        elif strategy == ImputationStrategy.FORWARD_FILL:
            # Forward fill NaN values
            for i in range(len(result)):
                if nan_mask[i]:
                    if i > 0:
                        result[i] = result[i - 1]
                    else:
                        result[i] = 0.0

        elif strategy == ImputationStrategy.BACKWARD_FILL:
            # Backward fill NaN values
            for i in range(len(result) - 1, -1, -1):
                if nan_mask[i]:
                    if i < len(result) - 1:
                        result[i] = result[i + 1]
                    else:
                        result[i] = 0.0

        elif strategy == ImputationStrategy.INTERPOLATE:
            # Linear interpolation
            valid_indices = np.where(~nan_mask)[0]
            if len(valid_indices) >= 2:
                valid_values = arr[valid_indices]
                interp_func = interpolate.interp1d(
                    valid_indices, valid_values,
                    kind='linear',
                    fill_value='extrapolate',
                    bounds_error=False,
                )
                all_indices = np.arange(len(arr))
                result = interp_func(all_indices)
            else:
                # Fall back to mean if not enough points
                fill_value = np.nanmean(arr) if np.any(~nan_mask) else 0.0
                result[nan_mask] = fill_value

        elif strategy == ImputationStrategy.DROP:
            # Remove NaN values
            result = arr[~nan_mask]

        return result

    def _compute_completeness(self, data: Dict[str, Any]) -> float:
        """Compute data completeness score."""
        total_values = 0
        non_missing = 0

        def count_values(obj: Any) -> Tuple[int, int]:
            """Count total and non-missing values recursively."""
            t, n = 0, 0

            if isinstance(obj, dict):
                for v in obj.values():
                    sub_t, sub_n = count_values(v)
                    t += sub_t
                    n += sub_n
            elif isinstance(obj, (list, np.ndarray)):
                arr = np.asarray(obj, dtype=np.float64)
                t = len(arr)
                n = np.sum(~np.isnan(arr))
            elif obj is not None:
                t = 1
                n = 1 if not (isinstance(obj, float) and np.isnan(obj)) else 0

            return t, n

        for source_data in data.values():
            t, n = count_values(source_data)
            total_values += t
            non_missing += n

        if total_values == 0:
            return 1.0

        return float(non_missing / total_values)

    def _compute_consistency(self, data: Dict[str, Any]) -> float:
        """Compute data consistency score based on outlier detection."""
        consistency_scores = []

        def check_consistency(obj: Any) -> Optional[float]:
            """Check consistency of an array."""
            if isinstance(obj, (list, np.ndarray)):
                arr = np.asarray(obj, dtype=np.float64)
                arr = arr[~np.isnan(arr)]

                if len(arr) < 3:
                    return None

                # Check for outliers using IQR
                q1 = np.percentile(arr, 25)
                q3 = np.percentile(arr, 75)
                iqr = q3 - q1

                if iqr < 1e-10:
                    return 1.0  # No variation = consistent

                lower = q1 - 1.5 * iqr
                upper = q3 + 1.5 * iqr

                outliers = np.sum((arr < lower) | (arr > upper))
                return 1.0 - (outliers / len(arr))

            return None

        def process_dict(obj: Dict[str, Any]) -> None:
            """Process dictionary recursively."""
            for value in obj.values():
                if isinstance(value, dict):
                    process_dict(value)
                else:
                    score = check_consistency(value)
                    if score is not None:
                        consistency_scores.append(score)

        for source_data in data.values():
            if isinstance(source_data, dict):
                process_dict(source_data)
            else:
                score = check_consistency(source_data)
                if score is not None:
                    consistency_scores.append(score)

        if not consistency_scores:
            return 1.0

        return float(np.mean(consistency_scores))

    def merge_modalities(
        self,
        data: Dict[str, Any],
        weights: Optional[Dict[str, float]] = None,
    ) -> Dict[str, Any]:
        """
        Merge data from multiple modalities into unified representation.

        Args:
            data: Dictionary of modality data.
            weights: Optional weights for each modality.

        Returns:
            Merged data dictionary.
        """
        if not data:
            return {}

        modalities = list(data.keys())
        weights = weights or {m: 1.0 / len(modalities) for m in modalities}

        # Normalize weights
        total_weight = sum(weights.values())
        weights = {k: v / total_weight for k, v in weights.items()}

        merged = {"modalities": modalities, "weights": weights}

        # Merge numerical features
        numerical_features = {}
        for modality, mod_data in data.items():
            if isinstance(mod_data, dict):
                for key, value in mod_data.items():
                    if isinstance(value, (int, float)):
                        if key not in numerical_features:
                            numerical_features[key] = []
                        numerical_features[key].append(
                            (value, weights.get(modality, 1.0))
                        )

        # Compute weighted averages
        for key, values in numerical_features.items():
            weighted_sum = sum(v * w for v, w in values)
            total_weight = sum(w for _, w in values)
            merged[key] = weighted_sum / total_weight if total_weight > 0 else 0.0

        return merged
