"""
Bias Detection Service

Fairness monitoring and bias detection for ML predictions:
- Statistical parity analysis across demographic groups
- Equalized odds assessment
- Disparate impact detection
- Continuous monitoring with alerting
- FERPA-compliant with privacy-preserving aggregations

IMPORTANT: Bias detection is critical for ensuring equitable outcomes.
All detected biases should be reviewed and addressed promptly.
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Optional
import json
import logging
import math
from collections import defaultdict

import numpy as np
from scipy import stats

logger = logging.getLogger(__name__)


class FairnessMetric(str, Enum):
    """Fairness metrics to evaluate"""
    STATISTICAL_PARITY = "statistical_parity"
    EQUALIZED_ODDS = "equalized_odds"
    DISPARATE_IMPACT = "disparate_impact"
    CALIBRATION = "calibration"
    FALSE_POSITIVE_RATE = "false_positive_rate"
    FALSE_NEGATIVE_RATE = "false_negative_rate"


class BiasSeverity(str, Enum):
    """Severity of detected bias"""
    NONE = "none"
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


class ProtectedAttribute(str, Enum):
    """Protected demographic attributes for bias monitoring"""
    RACE_ETHNICITY = "race_ethnicity"
    GENDER = "gender"
    SOCIOECONOMIC_STATUS = "socioeconomic_status"
    DISABILITY_STATUS = "disability_status"
    ENGLISH_LEARNER = "english_learner"
    GRADE_LEVEL = "grade_level"


@dataclass
class GroupStatistics:
    """Statistics for a demographic group"""
    group_name: str
    sample_size: int
    mean_prediction: float
    std_prediction: float
    positive_rate: float  # Rate of high-risk predictions
    true_positive_rate: Optional[float] = None
    false_positive_rate: Optional[float] = None
    false_negative_rate: Optional[float] = None
    calibration_error: Optional[float] = None


@dataclass
class FairnessResult:
    """Result of a fairness metric evaluation"""
    metric: FairnessMetric
    attribute: ProtectedAttribute
    reference_group: str
    comparison_group: str
    reference_value: float
    comparison_value: float
    difference: float
    ratio: Optional[float]
    p_value: Optional[float]
    is_significant: bool
    severity: BiasSeverity
    explanation: str


@dataclass
class BiasReport:
    """Comprehensive bias analysis report"""
    report_id: str
    generated_at: datetime
    tenant_id: str
    model_version: str
    analysis_period_start: datetime
    analysis_period_end: datetime
    total_predictions: int
    demographic_coverage: dict[str, int]
    fairness_results: list[FairnessResult]
    group_statistics: dict[str, list[GroupStatistics]]
    overall_bias_severity: BiasSeverity
    recommendations: list[str]
    requires_review: bool
    confidence_score: float


@dataclass
class BiasAlert:
    """Alert for detected bias requiring attention"""
    alert_id: str
    created_at: datetime
    tenant_id: str
    metric: FairnessMetric
    attribute: ProtectedAttribute
    affected_group: str
    severity: BiasSeverity
    description: str
    impact_estimate: str
    recommended_actions: list[str]
    acknowledged: bool = False
    resolved: bool = False


# Threshold configurations for bias detection
BIAS_THRESHOLDS = {
    FairnessMetric.STATISTICAL_PARITY: {
        "low": 0.05,
        "moderate": 0.10,
        "high": 0.15,
        "critical": 0.20
    },
    FairnessMetric.DISPARATE_IMPACT: {
        "low": 0.90,  # Below this ratio triggers alert
        "moderate": 0.85,
        "high": 0.80,
        "critical": 0.70
    },
    FairnessMetric.EQUALIZED_ODDS: {
        "low": 0.05,
        "moderate": 0.10,
        "high": 0.15,
        "critical": 0.20
    },
    FairnessMetric.FALSE_POSITIVE_RATE: {
        "low": 0.05,
        "moderate": 0.10,
        "high": 0.15,
        "critical": 0.20
    },
    FairnessMetric.FALSE_NEGATIVE_RATE: {
        "low": 0.05,
        "moderate": 0.10,
        "high": 0.15,
        "critical": 0.20
    }
}


class BiasDetectionService:
    """
    Service for detecting and monitoring bias in ML predictions.
    
    ETHICAL FRAMEWORK:
    - All students deserve equitable treatment regardless of demographics
    - ML models can perpetuate historical biases if not monitored
    - Bias detection is a continuous process, not a one-time check
    - Detected biases must be addressed, not just documented
    """
    
    MINIMUM_GROUP_SIZE = 30  # Minimum samples for statistical validity
    SIGNIFICANCE_LEVEL = 0.05  # p-value threshold for statistical significance
    
    def __init__(
        self,
        redis_client: Optional[Any] = None,
        database: Optional[Any] = None
    ):
        self.redis = redis_client
        self.db = database
    
    async def analyze_bias(
        self,
        tenant_id: str,
        model_version: str,
        predictions: list[dict],
        outcomes: Optional[list[dict]] = None,
        analysis_period_days: int = 30
    ) -> BiasReport:
        """
        Perform comprehensive bias analysis on model predictions.
        
        Args:
            tenant_id: Tenant identifier
            model_version: Version of the model being analyzed
            predictions: List of predictions with demographics
                Format: [{"student_id": str, "risk_score": float, "demographics": dict}]
            outcomes: Optional ground truth outcomes for calibration analysis
                Format: [{"student_id": str, "actual_outcome": bool}]
            analysis_period_days: Number of days covered by the analysis
        
        Returns:
            BiasReport with fairness metrics and recommendations
        """
        now = datetime.utcnow()
        report_id = f"bias_{tenant_id}_{now.strftime('%Y%m%d_%H%M%S')}"
        
        # Group predictions by protected attributes
        grouped_data = self._group_by_demographics(predictions)
        
        # Build outcome lookup if available
        outcome_map = {}
        if outcomes:
            outcome_map = {o["student_id"]: o["actual_outcome"] for o in outcomes}
        
        # Calculate fairness metrics for each protected attribute
        all_results: list[FairnessResult] = []
        all_group_stats: dict[str, list[GroupStatistics]] = {}
        
        for attribute in ProtectedAttribute:
            if attribute.value not in grouped_data:
                continue
            
            groups = grouped_data[attribute.value]
            
            # Skip if insufficient data
            valid_groups = {
                k: v for k, v in groups.items() 
                if len(v) >= self.MINIMUM_GROUP_SIZE
            }
            
            if len(valid_groups) < 2:
                continue
            
            # Calculate group statistics
            group_stats = self._calculate_group_statistics(
                valid_groups, outcome_map
            )
            all_group_stats[attribute.value] = group_stats
            
            # Select reference group (largest group)
            reference_group = max(valid_groups.keys(), key=lambda k: len(valid_groups[k]))
            reference_stats = next(g for g in group_stats if g.group_name == reference_group)
            
            # Compare each group to reference
            for stats in group_stats:
                if stats.group_name == reference_group:
                    continue
                
                # Statistical parity
                sp_result = self._evaluate_statistical_parity(
                    attribute, reference_stats, stats
                )
                all_results.append(sp_result)
                
                # Disparate impact
                di_result = self._evaluate_disparate_impact(
                    attribute, reference_stats, stats
                )
                all_results.append(di_result)
                
                # If we have outcomes, evaluate equalized odds
                if outcome_map:
                    eo_results = self._evaluate_equalized_odds(
                        attribute, reference_stats, stats
                    )
                    all_results.extend(eo_results)
        
        # Calculate demographic coverage
        coverage = self._calculate_demographic_coverage(predictions)
        
        # Determine overall severity
        overall_severity = self._determine_overall_severity(all_results)
        
        # Generate recommendations
        recommendations = self._generate_recommendations(all_results)
        
        # Determine if review is required
        requires_review = overall_severity in [BiasSeverity.HIGH, BiasSeverity.CRITICAL]
        
        # Calculate confidence based on sample sizes
        confidence = self._calculate_confidence(predictions, grouped_data)
        
        report = BiasReport(
            report_id=report_id,
            generated_at=now,
            tenant_id=tenant_id,
            model_version=model_version,
            analysis_period_start=now - timedelta(days=analysis_period_days),
            analysis_period_end=now,
            total_predictions=len(predictions),
            demographic_coverage=coverage,
            fairness_results=all_results,
            group_statistics=all_group_stats,
            overall_bias_severity=overall_severity,
            recommendations=recommendations,
            requires_review=requires_review,
            confidence_score=confidence
        )
        
        # Store report
        await self._store_report(report)
        
        # Create alerts for significant biases
        if requires_review:
            await self._create_alerts(report, all_results)
        
        return report
    
    def _group_by_demographics(
        self,
        predictions: list[dict]
    ) -> dict[str, dict[str, list[dict]]]:
        """Group predictions by each protected attribute"""
        grouped = {attr.value: defaultdict(list) for attr in ProtectedAttribute}
        
        for pred in predictions:
            demographics = pred.get("demographics", {})
            
            for attr in ProtectedAttribute:
                value = demographics.get(attr.value)
                if value is not None:
                    grouped[attr.value][value].append(pred)
        
        return grouped
    
    def _calculate_group_statistics(
        self,
        groups: dict[str, list[dict]],
        outcome_map: dict[str, bool]
    ) -> list[GroupStatistics]:
        """Calculate statistics for each demographic group"""
        stats_list = []
        
        for group_name, predictions in groups.items():
            scores = [p["risk_score"] for p in predictions]
            
            # Basic statistics
            mean_pred = np.mean(scores)
            std_pred = np.std(scores)
            positive_rate = sum(1 for s in scores if s >= 0.5) / len(scores)
            
            # Outcome-based statistics if available
            tpr = fpr = fnr = cal_error = None
            
            if outcome_map:
                student_ids = [p["student_id"] for p in predictions]
                matched = [
                    (p["risk_score"], outcome_map[p["student_id"]])
                    for p in predictions
                    if p["student_id"] in outcome_map
                ]
                
                if matched:
                    pred_scores, actuals = zip(*matched)
                    pred_binary = [s >= 0.5 for s in pred_scores]
                    
                    # True positive rate (sensitivity)
                    actual_positives = [a for a in actuals if a]
                    if actual_positives:
                        tpr = sum(1 for p, a in matched if p >= 0.5 and a) / len(actual_positives)
                    
                    # False positive rate
                    actual_negatives = [a for a in actuals if not a]
                    if actual_negatives:
                        fpr = sum(1 for p, a in matched if p >= 0.5 and not a) / len(actual_negatives)
                    
                    # False negative rate
                    if actual_positives:
                        fnr = sum(1 for p, a in matched if p < 0.5 and a) / len(actual_positives)
                    
                    # Calibration error (average difference between predicted and actual)
                    if len(matched) >= 10:
                        cal_error = abs(np.mean(pred_scores) - np.mean(actuals))
            
            stats_list.append(GroupStatistics(
                group_name=group_name,
                sample_size=len(predictions),
                mean_prediction=mean_pred,
                std_prediction=std_pred,
                positive_rate=positive_rate,
                true_positive_rate=tpr,
                false_positive_rate=fpr,
                false_negative_rate=fnr,
                calibration_error=cal_error
            ))
        
        return stats_list
    
    def _evaluate_statistical_parity(
        self,
        attribute: ProtectedAttribute,
        reference: GroupStatistics,
        comparison: GroupStatistics
    ) -> FairnessResult:
        """
        Evaluate statistical parity (demographic parity).
        
        Statistical parity requires that the probability of a positive prediction
        is the same across all demographic groups.
        """
        diff = abs(reference.positive_rate - comparison.positive_rate)
        
        # Perform two-proportion z-test
        n1, n2 = reference.sample_size, comparison.sample_size
        p1, p2 = reference.positive_rate, comparison.positive_rate
        p_pool = (p1 * n1 + p2 * n2) / (n1 + n2)
        
        se = math.sqrt(p_pool * (1 - p_pool) * (1/n1 + 1/n2))
        z_stat = (p1 - p2) / se if se > 0 else 0
        p_value = 2 * (1 - stats.norm.cdf(abs(z_stat)))
        
        # Determine severity
        severity = self._get_severity(FairnessMetric.STATISTICAL_PARITY, diff)
        
        is_significant = p_value < self.SIGNIFICANCE_LEVEL and severity != BiasSeverity.NONE
        
        explanation = self._generate_explanation(
            FairnessMetric.STATISTICAL_PARITY,
            attribute,
            reference.group_name,
            comparison.group_name,
            reference.positive_rate,
            comparison.positive_rate,
            severity
        )
        
        return FairnessResult(
            metric=FairnessMetric.STATISTICAL_PARITY,
            attribute=attribute,
            reference_group=reference.group_name,
            comparison_group=comparison.group_name,
            reference_value=reference.positive_rate,
            comparison_value=comparison.positive_rate,
            difference=diff,
            ratio=comparison.positive_rate / reference.positive_rate if reference.positive_rate > 0 else None,
            p_value=p_value,
            is_significant=is_significant,
            severity=severity,
            explanation=explanation
        )
    
    def _evaluate_disparate_impact(
        self,
        attribute: ProtectedAttribute,
        reference: GroupStatistics,
        comparison: GroupStatistics
    ) -> FairnessResult:
        """
        Evaluate disparate impact ratio.
        
        The 80% rule: the selection rate for any protected group should be
        at least 80% of the rate for the group with the highest rate.
        """
        # For risk predictions, we want to check if high-risk classifications
        # are distributed fairly (not disproportionately affecting certain groups)
        
        ratio = None
        if reference.positive_rate > 0:
            ratio = comparison.positive_rate / reference.positive_rate
        
        # Invert if comparison group has higher rate
        normalized_ratio = min(ratio, 1/ratio) if ratio and ratio > 0 else 0
        
        severity = self._get_severity_di(normalized_ratio)
        
        explanation = self._generate_explanation(
            FairnessMetric.DISPARATE_IMPACT,
            attribute,
            reference.group_name,
            comparison.group_name,
            reference.positive_rate,
            comparison.positive_rate,
            severity
        )
        
        return FairnessResult(
            metric=FairnessMetric.DISPARATE_IMPACT,
            attribute=attribute,
            reference_group=reference.group_name,
            comparison_group=comparison.group_name,
            reference_value=reference.positive_rate,
            comparison_value=comparison.positive_rate,
            difference=abs(reference.positive_rate - comparison.positive_rate),
            ratio=ratio,
            p_value=None,
            is_significant=severity != BiasSeverity.NONE,
            severity=severity,
            explanation=explanation
        )
    
    def _evaluate_equalized_odds(
        self,
        attribute: ProtectedAttribute,
        reference: GroupStatistics,
        comparison: GroupStatistics
    ) -> list[FairnessResult]:
        """
        Evaluate equalized odds.
        
        Equalized odds requires that TPR and FPR are equal across groups.
        """
        results = []
        
        # Check FPR difference
        if reference.false_positive_rate is not None and comparison.false_positive_rate is not None:
            fpr_diff = abs(reference.false_positive_rate - comparison.false_positive_rate)
            severity = self._get_severity(FairnessMetric.FALSE_POSITIVE_RATE, fpr_diff)
            
            results.append(FairnessResult(
                metric=FairnessMetric.FALSE_POSITIVE_RATE,
                attribute=attribute,
                reference_group=reference.group_name,
                comparison_group=comparison.group_name,
                reference_value=reference.false_positive_rate,
                comparison_value=comparison.false_positive_rate,
                difference=fpr_diff,
                ratio=None,
                p_value=None,
                is_significant=severity != BiasSeverity.NONE,
                severity=severity,
                explanation=self._generate_explanation(
                    FairnessMetric.FALSE_POSITIVE_RATE,
                    attribute,
                    reference.group_name,
                    comparison.group_name,
                    reference.false_positive_rate,
                    comparison.false_positive_rate,
                    severity
                )
            ))
        
        # Check FNR difference
        if reference.false_negative_rate is not None and comparison.false_negative_rate is not None:
            fnr_diff = abs(reference.false_negative_rate - comparison.false_negative_rate)
            severity = self._get_severity(FairnessMetric.FALSE_NEGATIVE_RATE, fnr_diff)
            
            results.append(FairnessResult(
                metric=FairnessMetric.FALSE_NEGATIVE_RATE,
                attribute=attribute,
                reference_group=reference.group_name,
                comparison_group=comparison.group_name,
                reference_value=reference.false_negative_rate,
                comparison_value=comparison.false_negative_rate,
                difference=fnr_diff,
                ratio=None,
                p_value=None,
                is_significant=severity != BiasSeverity.NONE,
                severity=severity,
                explanation=self._generate_explanation(
                    FairnessMetric.FALSE_NEGATIVE_RATE,
                    attribute,
                    reference.group_name,
                    comparison.group_name,
                    reference.false_negative_rate,
                    comparison.false_negative_rate,
                    severity
                )
            ))
        
        return results
    
    def _get_severity(self, metric: FairnessMetric, difference: float) -> BiasSeverity:
        """Determine severity based on difference and metric thresholds"""
        thresholds = BIAS_THRESHOLDS.get(metric, {})
        
        if difference >= thresholds.get("critical", float("inf")):
            return BiasSeverity.CRITICAL
        elif difference >= thresholds.get("high", float("inf")):
            return BiasSeverity.HIGH
        elif difference >= thresholds.get("moderate", float("inf")):
            return BiasSeverity.MODERATE
        elif difference >= thresholds.get("low", float("inf")):
            return BiasSeverity.LOW
        return BiasSeverity.NONE
    
    def _get_severity_di(self, ratio: float) -> BiasSeverity:
        """Determine severity for disparate impact ratio (lower is worse)"""
        thresholds = BIAS_THRESHOLDS[FairnessMetric.DISPARATE_IMPACT]
        
        if ratio <= thresholds["critical"]:
            return BiasSeverity.CRITICAL
        elif ratio <= thresholds["high"]:
            return BiasSeverity.HIGH
        elif ratio <= thresholds["moderate"]:
            return BiasSeverity.MODERATE
        elif ratio <= thresholds["low"]:
            return BiasSeverity.LOW
        return BiasSeverity.NONE
    
    def _generate_explanation(
        self,
        metric: FairnessMetric,
        attribute: ProtectedAttribute,
        reference_group: str,
        comparison_group: str,
        reference_value: float,
        comparison_value: float,
        severity: BiasSeverity
    ) -> str:
        """Generate human-readable explanation of fairness result"""
        attr_name = attribute.value.replace("_", " ")
        
        if metric == FairnessMetric.STATISTICAL_PARITY:
            diff_pct = abs(reference_value - comparison_value) * 100
            higher_group = reference_group if reference_value > comparison_value else comparison_group
            return (
                f"High-risk prediction rates differ by {diff_pct:.1f}% between {attr_name} groups. "
                f"The {higher_group} group has a higher rate of high-risk classifications. "
                f"Severity: {severity.value}."
            )
        
        elif metric == FairnessMetric.DISPARATE_IMPACT:
            if reference_value > 0:
                ratio = comparison_value / reference_value
                return (
                    f"Disparate impact ratio is {ratio:.2f} for {attr_name}. "
                    f"A ratio below 0.80 may indicate bias. "
                    f"Severity: {severity.value}."
                )
            return f"Cannot calculate disparate impact - reference group rate is zero."
        
        elif metric == FairnessMetric.FALSE_POSITIVE_RATE:
            diff_pct = abs(reference_value - comparison_value) * 100
            return (
                f"False positive rates differ by {diff_pct:.1f}% between {attr_name} groups. "
                f"This means one group may be incorrectly flagged as high-risk more often. "
                f"Severity: {severity.value}."
            )
        
        elif metric == FairnessMetric.FALSE_NEGATIVE_RATE:
            diff_pct = abs(reference_value - comparison_value) * 100
            higher_group = reference_group if reference_value > comparison_value else comparison_group
            return (
                f"False negative rates differ by {diff_pct:.1f}% between {attr_name} groups. "
                f"The {higher_group} group may have at-risk students missed more often. "
                f"Severity: {severity.value}."
            )
        
        return f"Fairness metric {metric.value} analyzed for {attr_name}. Severity: {severity.value}."
    
    def _calculate_demographic_coverage(
        self,
        predictions: list[dict]
    ) -> dict[str, int]:
        """Calculate how many predictions have each demographic attribute"""
        coverage = {}
        
        for attr in ProtectedAttribute:
            count = sum(
                1 for p in predictions
                if p.get("demographics", {}).get(attr.value) is not None
            )
            coverage[attr.value] = count
        
        return coverage
    
    def _determine_overall_severity(
        self,
        results: list[FairnessResult]
    ) -> BiasSeverity:
        """Determine overall bias severity from individual results"""
        if not results:
            return BiasSeverity.NONE
        
        severities = [r.severity for r in results if r.is_significant]
        
        if not severities:
            return BiasSeverity.NONE
        
        # Return the highest severity found
        severity_order = [
            BiasSeverity.CRITICAL,
            BiasSeverity.HIGH,
            BiasSeverity.MODERATE,
            BiasSeverity.LOW
        ]
        
        for sev in severity_order:
            if sev in severities:
                return sev
        
        return BiasSeverity.NONE
    
    def _generate_recommendations(
        self,
        results: list[FairnessResult]
    ) -> list[str]:
        """Generate actionable recommendations based on fairness results"""
        recommendations = []
        
        # Group significant results by attribute
        significant = [r for r in results if r.is_significant]
        
        if not significant:
            recommendations.append(
                "No significant bias detected. Continue monitoring with regular analysis."
            )
            return recommendations
        
        # General recommendations
        if any(r.severity in [BiasSeverity.CRITICAL, BiasSeverity.HIGH] for r in significant):
            recommendations.append(
                "URGENT: High-severity bias detected. Convene review committee immediately."
            )
        
        # Attribute-specific recommendations
        affected_attrs = set(r.attribute for r in significant)
        
        for attr in affected_attrs:
            attr_results = [r for r in significant if r.attribute == attr]
            attr_name = attr.value.replace("_", " ")
            
            if any(r.metric == FairnessMetric.STATISTICAL_PARITY for r in attr_results):
                recommendations.append(
                    f"Review prediction thresholds for {attr_name} groups to ensure equitable classification rates."
                )
            
            if any(r.metric == FairnessMetric.FALSE_NEGATIVE_RATE for r in attr_results):
                recommendations.append(
                    f"Some {attr_name} groups may have at-risk students being missed. "
                    f"Consider adjusting sensitivity for these groups."
                )
            
            if any(r.metric == FairnessMetric.FALSE_POSITIVE_RATE for r in attr_results):
                recommendations.append(
                    f"Some {attr_name} groups may be over-identified as high-risk. "
                    f"Review feature engineering for potential proxy discrimination."
                )
        
        # Feature-level recommendations
        if len(significant) > 3:
            recommendations.append(
                "Consider conducting a thorough feature audit to identify potentially biased input features."
            )
        
        recommendations.append(
            "Ensure all affected students receive equitable support regardless of model predictions."
        )
        
        return recommendations
    
    def _calculate_confidence(
        self,
        predictions: list[dict],
        grouped_data: dict
    ) -> float:
        """Calculate confidence score for the bias analysis"""
        total = len(predictions)
        
        if total < 100:
            return 0.3  # Low confidence with small sample
        
        # Check demographic coverage
        coverage_scores = []
        for attr in ProtectedAttribute:
            groups = grouped_data.get(attr.value, {})
            valid_groups = sum(1 for v in groups.values() if len(v) >= self.MINIMUM_GROUP_SIZE)
            coverage_scores.append(min(valid_groups / 3, 1.0))  # Max score at 3+ groups
        
        avg_coverage = np.mean(coverage_scores)
        
        # Sample size factor
        size_factor = min(total / 1000, 1.0)
        
        return 0.4 * size_factor + 0.6 * avg_coverage
    
    async def _store_report(self, report: BiasReport) -> None:
        """Store bias report for historical tracking"""
        if not self.redis:
            return
        
        key = f"bias_reports:{report.tenant_id}"
        
        # Serialize report (simplified for storage)
        report_data = {
            "report_id": report.report_id,
            "generated_at": report.generated_at.isoformat(),
            "model_version": report.model_version,
            "total_predictions": report.total_predictions,
            "overall_severity": report.overall_bias_severity.value,
            "requires_review": report.requires_review,
            "significant_findings": len([r for r in report.fairness_results if r.is_significant]),
            "confidence": report.confidence_score
        }
        
        await self.redis.lpush(key, json.dumps(report_data))
        await self.redis.ltrim(key, 0, 99)  # Keep last 100 reports
        
        # Store full report separately
        full_key = f"bias_report_full:{report.report_id}"
        await self.redis.setex(
            full_key,
            86400 * 90,  # Keep for 90 days
            self._serialize_full_report(report)
        )
    
    def _serialize_full_report(self, report: BiasReport) -> str:
        """Serialize full report to JSON"""
        return json.dumps({
            "report_id": report.report_id,
            "generated_at": report.generated_at.isoformat(),
            "tenant_id": report.tenant_id,
            "model_version": report.model_version,
            "analysis_period_start": report.analysis_period_start.isoformat(),
            "analysis_period_end": report.analysis_period_end.isoformat(),
            "total_predictions": report.total_predictions,
            "demographic_coverage": report.demographic_coverage,
            "fairness_results": [
                {
                    "metric": r.metric.value,
                    "attribute": r.attribute.value,
                    "reference_group": r.reference_group,
                    "comparison_group": r.comparison_group,
                    "reference_value": r.reference_value,
                    "comparison_value": r.comparison_value,
                    "difference": r.difference,
                    "ratio": r.ratio,
                    "p_value": r.p_value,
                    "is_significant": r.is_significant,
                    "severity": r.severity.value,
                    "explanation": r.explanation
                }
                for r in report.fairness_results
            ],
            "group_statistics": {
                attr: [
                    {
                        "group_name": g.group_name,
                        "sample_size": g.sample_size,
                        "mean_prediction": g.mean_prediction,
                        "std_prediction": g.std_prediction,
                        "positive_rate": g.positive_rate
                    }
                    for g in stats
                ]
                for attr, stats in report.group_statistics.items()
            },
            "overall_severity": report.overall_bias_severity.value,
            "recommendations": report.recommendations,
            "requires_review": report.requires_review,
            "confidence_score": report.confidence_score
        })
    
    async def _create_alerts(
        self,
        report: BiasReport,
        results: list[FairnessResult]
    ) -> None:
        """Create alerts for significant bias findings"""
        if not self.redis:
            return
        
        significant = [
            r for r in results 
            if r.is_significant and r.severity in [BiasSeverity.HIGH, BiasSeverity.CRITICAL]
        ]
        
        for result in significant:
            alert = BiasAlert(
                alert_id=f"alert_{report.report_id}_{result.attribute.value}_{result.metric.value}",
                created_at=datetime.utcnow(),
                tenant_id=report.tenant_id,
                metric=result.metric,
                attribute=result.attribute,
                affected_group=result.comparison_group,
                severity=result.severity,
                description=result.explanation,
                impact_estimate=f"Affects {result.comparison_group} group in {result.attribute.value}",
                recommended_actions=self._get_alert_actions(result)
            )
            
            # Store alert
            alert_key = f"bias_alerts:{report.tenant_id}"
            await self.redis.lpush(alert_key, json.dumps({
                "alert_id": alert.alert_id,
                "created_at": alert.created_at.isoformat(),
                "metric": alert.metric.value,
                "attribute": alert.attribute.value,
                "affected_group": alert.affected_group,
                "severity": alert.severity.value,
                "description": alert.description,
                "acknowledged": alert.acknowledged,
                "resolved": alert.resolved
            }))
        
        logger.warning(
            f"Created {len(significant)} bias alerts for tenant {report.tenant_id}"
        )
    
    def _get_alert_actions(self, result: FairnessResult) -> list[str]:
        """Get recommended actions for a specific bias alert"""
        actions = []
        
        if result.severity == BiasSeverity.CRITICAL:
            actions.append("Immediately notify equity committee and data science team")
            actions.append("Consider temporarily adjusting predictions for affected group")
        
        if result.metric == FairnessMetric.FALSE_NEGATIVE_RATE:
            actions.append("Review at-risk students in affected group manually")
            actions.append("Ensure no students are missing needed support")
        
        if result.metric == FairnessMetric.FALSE_POSITIVE_RATE:
            actions.append("Review high-risk classifications in affected group")
            actions.append("Ensure students aren't being over-identified unfairly")
        
        if result.metric == FairnessMetric.STATISTICAL_PARITY:
            actions.append("Analyze feature contributions for this demographic group")
            actions.append("Consider retraining with bias mitigation techniques")
        
        actions.append("Document findings and remediation steps")
        
        return actions
    
    async def get_pending_alerts(
        self,
        tenant_id: str
    ) -> list[dict]:
        """Get unresolved bias alerts for a tenant"""
        if not self.redis:
            return []
        
        alert_key = f"bias_alerts:{tenant_id}"
        alerts = await self.redis.lrange(alert_key, 0, 50)
        
        if not alerts:
            return []
        
        parsed = [json.loads(a) for a in alerts]
        return [a for a in parsed if not a.get("resolved")]
    
    async def acknowledge_alert(
        self,
        tenant_id: str,
        alert_id: str,
        user_id: str
    ) -> bool:
        """Mark an alert as acknowledged"""
        if not self.redis:
            return False
        
        # In a real implementation, we'd update the specific alert
        # For now, log the acknowledgment
        logger.info(
            f"Alert {alert_id} acknowledged by user {user_id} for tenant {tenant_id}"
        )
        return True
    
    async def resolve_alert(
        self,
        tenant_id: str,
        alert_id: str,
        user_id: str,
        resolution_notes: str
    ) -> bool:
        """Mark an alert as resolved"""
        if not self.redis:
            return False
        
        # Log resolution
        logger.info(
            f"Alert {alert_id} resolved by user {user_id} for tenant {tenant_id}. "
            f"Notes: {resolution_notes}"
        )
        return True
