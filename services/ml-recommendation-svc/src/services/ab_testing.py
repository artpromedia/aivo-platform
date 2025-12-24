"""
A/B Testing Framework for Intervention Effectiveness

Enables controlled experiments to measure intervention effectiveness:
- Random assignment with stratification
- Sample size calculations
- Statistical significance testing
- Tracking and reporting

IMPORTANT: A/B testing in education requires:
- IRB approval for research
- Parent/guardian consent
- Equitable treatment across groups
- Ability to provide intervention to control group after study
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Optional
import hashlib
import json
import logging
import math
import uuid

import numpy as np
from scipy import stats

logger = logging.getLogger(__name__)


class ExperimentStatus(str, Enum):
    """Experiment lifecycle status"""
    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class AssignmentStrategy(str, Enum):
    """How to assign participants to groups"""
    RANDOM = "random"                      # Pure random assignment
    STRATIFIED = "stratified"              # Random within strata
    CLUSTER = "cluster"                    # Assign by cluster (e.g., classroom)
    DETERMINISTIC = "deterministic"        # Hash-based for consistency


@dataclass
class ExperimentVariant:
    """A variant in an A/B experiment"""
    name: str
    weight: float  # Traffic allocation (0-1)
    intervention_id: Optional[str] = None
    config: dict = field(default_factory=dict)
    
    # Results
    participants: int = 0
    conversions: int = 0
    total_value: float = 0.0


@dataclass
class ExperimentConfig:
    """Configuration for an A/B experiment"""
    experiment_id: str
    name: str
    description: str
    
    # Targeting
    tenant_id: str
    target_risk_levels: list[str]  # e.g., ["high", "critical"]
    target_grade_bands: list[str] = field(default_factory=list)
    
    # Variants
    variants: list[ExperimentVariant] = field(default_factory=list)
    
    # Assignment
    assignment_strategy: AssignmentStrategy = AssignmentStrategy.STRATIFIED
    stratification_keys: list[str] = field(default_factory=lambda: ["grade_band", "risk_level"])
    
    # Metrics
    primary_metric: str = "risk_score_improvement"
    secondary_metrics: list[str] = field(default_factory=lambda: [
        "engagement_improvement",
        "mastery_improvement",
        "intervention_completion_rate",
    ])
    
    # Duration
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    min_sample_size: int = 100  # Per variant
    
    # Statistical settings
    significance_level: float = 0.05
    power: float = 0.80
    minimum_detectable_effect: float = 0.10
    
    # Safety
    guardrail_metrics: list[str] = field(default_factory=lambda: [
        "dropout_rate",
        "parent_complaint_rate",
    ])
    max_guardrail_delta: float = 0.05
    
    # Consent
    requires_consent: bool = True
    consent_type: str = "opt_out"  # "opt_in" or "opt_out"
    
    # Status
    status: ExperimentStatus = ExperimentStatus.DRAFT
    created_at: datetime = field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None


@dataclass
class ExperimentResults:
    """Results from an A/B experiment"""
    experiment_id: str
    generated_at: datetime
    
    # Sample info
    total_participants: int
    participants_by_variant: dict[str, int]
    
    # Primary metric results
    primary_metric_name: str
    primary_metric_by_variant: dict[str, float]
    
    # Statistical tests
    p_value: float
    confidence_interval: tuple[float, float]
    effect_size: float
    is_significant: bool
    
    # Secondary metrics
    secondary_metrics: dict[str, dict[str, float]]
    
    # Guardrail metrics
    guardrail_status: dict[str, str]  # "pass" or "fail"
    
    # Recommendation
    recommendation: str
    confidence: str  # "high", "medium", "low"
    
    # Warnings
    warnings: list[str] = field(default_factory=list)


class ABTestingService:
    """
    A/B testing service for intervention experiments.
    
    Workflow:
    1. Create experiment configuration
    2. Get experiment approved (IRB, admin)
    3. Start experiment (enrollment begins)
    4. Assign participants to variants
    5. Track outcomes
    6. Analyze results
    7. Make decision
    """
    
    def __init__(self, db_connection):
        self.db = db_connection
        self._active_experiments: dict[str, ExperimentConfig] = {}
    
    async def create_experiment(
        self,
        config: ExperimentConfig,
        creator_id: str,
    ) -> ExperimentConfig:
        """
        Create a new experiment (draft status).
        
        Requires admin approval before activation.
        """
        # Validate configuration
        self._validate_experiment_config(config)
        
        # Calculate required sample size
        required_sample = self._calculate_required_sample_size(config)
        if config.min_sample_size < required_sample:
            logger.warning(
                f"Configured sample size ({config.min_sample_size}) is less than "
                f"recommended ({required_sample}) for {config.power:.0%} power"
            )
        
        config.experiment_id = f"exp_{uuid.uuid4().hex[:12]}"
        config.created_by = creator_id
        config.created_at = datetime.utcnow()
        config.status = ExperimentStatus.DRAFT
        
        # Store experiment
        await self._store_experiment(config)
        
        logger.info(
            f"Created experiment {config.experiment_id}: {config.name}"
        )
        
        return config
    
    def _validate_experiment_config(self, config: ExperimentConfig) -> None:
        """Validate experiment configuration"""
        errors = []
        
        # Must have at least 2 variants
        if len(config.variants) < 2:
            errors.append("Experiment must have at least 2 variants")
        
        # Weights must sum to 1
        total_weight = sum(v.weight for v in config.variants)
        if not (0.99 <= total_weight <= 1.01):
            errors.append(f"Variant weights must sum to 1.0 (got {total_weight})")
        
        # Must have control group
        control_variants = [v for v in config.variants if v.name.lower() in ["control", "baseline"]]
        if not control_variants:
            errors.append("Experiment must include a 'control' or 'baseline' variant")
        
        # Validate dates if provided
        if config.start_date and config.end_date:
            if config.end_date <= config.start_date:
                errors.append("End date must be after start date")
        
        if errors:
            raise ValueError(f"Invalid experiment config: {'; '.join(errors)}")
    
    def _calculate_required_sample_size(self, config: ExperimentConfig) -> int:
        """
        Calculate required sample size per variant for desired power.
        
        Uses formula for two-proportion z-test:
        n = 2 * ((z_α + z_β)² * p * (1-p)) / δ²
        
        Where:
        - z_α = z-score for significance level
        - z_β = z-score for power
        - p = baseline conversion rate (assume 0.5 for max variance)
        - δ = minimum detectable effect
        """
        alpha = config.significance_level
        power = config.power
        mde = config.minimum_detectable_effect
        
        # z-scores
        z_alpha = stats.norm.ppf(1 - alpha / 2)  # Two-tailed
        z_beta = stats.norm.ppf(power)
        
        # Baseline proportion (conservative: 0.5 gives maximum variance)
        p = 0.5
        
        # Sample size per group
        n = 2 * ((z_alpha + z_beta) ** 2 * p * (1 - p)) / (mde ** 2)
        
        return int(math.ceil(n))
    
    async def start_experiment(
        self,
        experiment_id: str,
        approver_id: str,
        approval_notes: Optional[str] = None,
    ) -> ExperimentConfig:
        """
        Start an experiment (requires approval).
        
        Prerequisites:
        - Experiment must be in PENDING_APPROVAL status
        - Approver must have appropriate permissions
        - IRB approval must be documented (if research)
        """
        config = await self._get_experiment(experiment_id)
        
        if config.status not in [ExperimentStatus.DRAFT, ExperimentStatus.PENDING_APPROVAL]:
            raise ValueError(f"Cannot start experiment in {config.status.value} status")
        
        config.status = ExperimentStatus.ACTIVE
        config.start_date = datetime.utcnow()
        
        await self._update_experiment(config)
        self._active_experiments[experiment_id] = config
        
        logger.info(
            f"Experiment {experiment_id} started by {approver_id}. "
            f"Notes: {approval_notes or 'None'}"
        )
        
        return config
    
    async def assign_variant(
        self,
        experiment_id: str,
        student_id: str,
        stratification_data: Optional[dict] = None,
    ) -> Optional[str]:
        """
        Assign a student to an experiment variant.
        
        Returns variant name or None if student not eligible.
        """
        config = self._active_experiments.get(experiment_id)
        
        if not config or config.status != ExperimentStatus.ACTIVE:
            return None
        
        # Check existing assignment
        existing = await self._get_assignment(experiment_id, student_id)
        if existing:
            return existing["variant_name"]
        
        # Assign based on strategy
        if config.assignment_strategy == AssignmentStrategy.DETERMINISTIC:
            variant = self._deterministic_assignment(
                experiment_id, student_id, config.variants
            )
        elif config.assignment_strategy == AssignmentStrategy.STRATIFIED:
            variant = self._stratified_assignment(
                config.variants, stratification_data
            )
        else:
            variant = self._random_assignment(config.variants)
        
        # Store assignment
        await self._store_assignment(
            experiment_id=experiment_id,
            student_id=student_id,
            variant_name=variant.name,
            stratification_data=stratification_data,
        )
        
        logger.debug(
            f"Assigned student {student_id} to variant '{variant.name}' "
            f"in experiment {experiment_id}"
        )
        
        return variant.name
    
    def _deterministic_assignment(
        self,
        experiment_id: str,
        student_id: str,
        variants: list[ExperimentVariant],
    ) -> ExperimentVariant:
        """
        Deterministic assignment using hash.
        
        Ensures same student always gets same variant (for consistency).
        """
        # Create hash from experiment + student
        hash_input = f"{experiment_id}:{student_id}"
        hash_value = int(hashlib.md5(hash_input.encode()).hexdigest(), 16)
        
        # Normalize to 0-1
        normalized = (hash_value % 10000) / 10000
        
        # Select variant based on weights
        cumulative = 0.0
        for variant in variants:
            cumulative += variant.weight
            if normalized < cumulative:
                return variant
        
        return variants[-1]
    
    def _random_assignment(
        self,
        variants: list[ExperimentVariant],
    ) -> ExperimentVariant:
        """Pure random assignment based on weights"""
        weights = [v.weight for v in variants]
        return np.random.choice(variants, p=weights)
    
    def _stratified_assignment(
        self,
        variants: list[ExperimentVariant],
        stratification_data: Optional[dict],
    ) -> ExperimentVariant:
        """
        Stratified random assignment.
        
        Balances assignment within strata (e.g., grade band, risk level).
        For simplicity, falls back to random if no stratification data.
        """
        # In practice, would track assignments by stratum and balance
        return self._random_assignment(variants)
    
    async def track_outcome(
        self,
        experiment_id: str,
        student_id: str,
        metric_name: str,
        value: float,
        timestamp: Optional[datetime] = None,
    ) -> None:
        """
        Track an outcome metric for an experiment participant.
        
        Common metrics:
        - risk_score_improvement: Change in risk score (negative is better)
        - engagement_improvement: Change in engagement score
        - mastery_improvement: Change in mastery level
        - intervention_completion_rate: % of intervention completed
        """
        timestamp = timestamp or datetime.utcnow()
        
        await self._store_outcome(
            experiment_id=experiment_id,
            student_id=student_id,
            metric_name=metric_name,
            value=value,
            timestamp=timestamp,
        )
    
    async def analyze_results(
        self,
        experiment_id: str,
        interim: bool = False,
    ) -> ExperimentResults:
        """
        Analyze experiment results.
        
        Args:
            experiment_id: The experiment to analyze
            interim: If True, performs interim analysis with adjusted significance
        
        Returns:
            ExperimentResults with statistical analysis
        """
        config = await self._get_experiment(experiment_id)
        
        # Get all outcomes
        outcomes = await self._get_experiment_outcomes(experiment_id)
        
        if not outcomes:
            raise ValueError(f"No outcomes recorded for experiment {experiment_id}")
        
        # Group by variant
        by_variant: dict[str, list[dict]] = {}
        for outcome in outcomes:
            variant = outcome["variant_name"]
            if variant not in by_variant:
                by_variant[variant] = []
            by_variant[variant].append(outcome)
        
        # Calculate primary metric by variant
        primary_by_variant = {}
        participants_by_variant = {}
        
        for variant, variant_outcomes in by_variant.items():
            primary_values = [
                o["value"] for o in variant_outcomes
                if o["metric_name"] == config.primary_metric
            ]
            if primary_values:
                primary_by_variant[variant] = np.mean(primary_values)
            participants_by_variant[variant] = len(set(o["student_id"] for o in variant_outcomes))
        
        # Statistical test (control vs treatment)
        control_name = next(
            (v.name for v in config.variants if v.name.lower() in ["control", "baseline"]),
            config.variants[0].name
        )
        treatment_name = next(
            (v.name for v in config.variants if v.name != control_name),
            config.variants[-1].name
        )
        
        control_outcomes = [
            o["value"] for o in by_variant.get(control_name, [])
            if o["metric_name"] == config.primary_metric
        ]
        treatment_outcomes = [
            o["value"] for o in by_variant.get(treatment_name, [])
            if o["metric_name"] == config.primary_metric
        ]
        
        if len(control_outcomes) < 10 or len(treatment_outcomes) < 10:
            return ExperimentResults(
                experiment_id=experiment_id,
                generated_at=datetime.utcnow(),
                total_participants=sum(participants_by_variant.values()),
                participants_by_variant=participants_by_variant,
                primary_metric_name=config.primary_metric,
                primary_metric_by_variant=primary_by_variant,
                p_value=1.0,
                confidence_interval=(0.0, 0.0),
                effect_size=0.0,
                is_significant=False,
                secondary_metrics={},
                guardrail_status={},
                recommendation="Insufficient data for analysis",
                confidence="low",
                warnings=["Sample size too small for reliable analysis"],
            )
        
        # T-test
        t_stat, p_value = stats.ttest_ind(treatment_outcomes, control_outcomes)
        
        # Adjust for interim analysis (Bonferroni correction)
        if interim:
            significance = config.significance_level / 2  # Conservative adjustment
        else:
            significance = config.significance_level
        
        is_significant = p_value < significance
        
        # Effect size (Cohen's d)
        pooled_std = np.sqrt(
            (np.std(control_outcomes) ** 2 + np.std(treatment_outcomes) ** 2) / 2
        )
        effect_size = (np.mean(treatment_outcomes) - np.mean(control_outcomes)) / pooled_std if pooled_std > 0 else 0
        
        # Confidence interval for difference
        se = pooled_std * np.sqrt(1/len(control_outcomes) + 1/len(treatment_outcomes))
        z = stats.norm.ppf(1 - config.significance_level / 2)
        diff = np.mean(treatment_outcomes) - np.mean(control_outcomes)
        ci = (diff - z * se, diff + z * se)
        
        # Secondary metrics
        secondary_metrics = {}
        for metric in config.secondary_metrics:
            metric_by_variant = {}
            for variant, variant_outcomes in by_variant.items():
                metric_values = [
                    o["value"] for o in variant_outcomes
                    if o["metric_name"] == metric
                ]
                if metric_values:
                    metric_by_variant[variant] = np.mean(metric_values)
            secondary_metrics[metric] = metric_by_variant
        
        # Guardrail checks
        guardrail_status = {}
        for guardrail in config.guardrail_metrics:
            control_guardrail = [
                o["value"] for o in by_variant.get(control_name, [])
                if o["metric_name"] == guardrail
            ]
            treatment_guardrail = [
                o["value"] for o in by_variant.get(treatment_name, [])
                if o["metric_name"] == guardrail
            ]
            
            if control_guardrail and treatment_guardrail:
                delta = np.mean(treatment_guardrail) - np.mean(control_guardrail)
                guardrail_status[guardrail] = (
                    "pass" if abs(delta) <= config.max_guardrail_delta else "fail"
                )
        
        # Generate recommendation
        recommendation, confidence = self._generate_recommendation(
            is_significant=is_significant,
            effect_size=effect_size,
            guardrail_status=guardrail_status,
            sample_sizes=participants_by_variant,
            min_sample=config.min_sample_size,
        )
        
        # Warnings
        warnings = []
        if min(participants_by_variant.values()) < config.min_sample_size:
            warnings.append("Sample size below target - results may not be reliable")
        if any(s == "fail" for s in guardrail_status.values()):
            warnings.append("One or more guardrail metrics failed - proceed with caution")
        if interim:
            warnings.append("Interim analysis - final results may differ")
        
        results = ExperimentResults(
            experiment_id=experiment_id,
            generated_at=datetime.utcnow(),
            total_participants=sum(participants_by_variant.values()),
            participants_by_variant=participants_by_variant,
            primary_metric_name=config.primary_metric,
            primary_metric_by_variant=primary_by_variant,
            p_value=float(p_value),
            confidence_interval=ci,
            effect_size=float(effect_size),
            is_significant=is_significant,
            secondary_metrics=secondary_metrics,
            guardrail_status=guardrail_status,
            recommendation=recommendation,
            confidence=confidence,
            warnings=warnings,
        )
        
        # Store results
        await self._store_results(results)
        
        return results
    
    def _generate_recommendation(
        self,
        is_significant: bool,
        effect_size: float,
        guardrail_status: dict[str, str],
        sample_sizes: dict[str, int],
        min_sample: int,
    ) -> tuple[str, str]:
        """Generate recommendation based on results"""
        # Check guardrails
        if any(s == "fail" for s in guardrail_status.values()):
            return (
                "DO NOT PROCEED: Guardrail metrics indicate potential harm. "
                "Review guardrail failures before continuing.",
                "high"
            )
        
        # Check sample size
        if min(sample_sizes.values()) < min_sample:
            return (
                "Continue experiment: Insufficient sample size for reliable conclusions.",
                "low"
            )
        
        # Check significance
        if not is_significant:
            return (
                "No significant difference detected. Consider: "
                "(1) continuing to collect more data, "
                "(2) re-evaluating the intervention, or "
                "(3) testing a larger effect size.",
                "medium"
            )
        
        # Significant result
        if abs(effect_size) < 0.2:
            return (
                f"Statistically significant but small effect (d={effect_size:.2f}). "
                "Consider practical significance before rolling out.",
                "medium"
            )
        elif abs(effect_size) < 0.5:
            return (
                f"Medium effect detected (d={effect_size:.2f}). "
                "Treatment shows meaningful improvement. Consider gradual rollout.",
                "high"
            )
        else:
            return (
                f"Large effect detected (d={effect_size:.2f}). "
                "Strong evidence for treatment effectiveness. Recommend rollout.",
                "high"
            )
    
    async def stop_experiment(
        self,
        experiment_id: str,
        reason: str,
        stopped_by: str,
    ) -> ExperimentConfig:
        """Stop an active experiment"""
        config = await self._get_experiment(experiment_id)
        
        if config.status == ExperimentStatus.ACTIVE:
            config.status = ExperimentStatus.COMPLETED
        else:
            config.status = ExperimentStatus.CANCELLED
        
        config.end_date = datetime.utcnow()
        
        await self._update_experiment(config)
        
        if experiment_id in self._active_experiments:
            del self._active_experiments[experiment_id]
        
        logger.info(
            f"Experiment {experiment_id} stopped by {stopped_by}. Reason: {reason}"
        )
        
        return config
    
    # Database helpers (placeholders)
    
    async def _store_experiment(self, config: ExperimentConfig) -> None:
        """Store experiment configuration"""
        pass
    
    async def _get_experiment(self, experiment_id: str) -> ExperimentConfig:
        """Get experiment by ID"""
        raise NotImplementedError()
    
    async def _update_experiment(self, config: ExperimentConfig) -> None:
        """Update experiment"""
        pass
    
    async def _get_assignment(
        self,
        experiment_id: str,
        student_id: str,
    ) -> Optional[dict]:
        """Get existing assignment"""
        return None
    
    async def _store_assignment(
        self,
        experiment_id: str,
        student_id: str,
        variant_name: str,
        stratification_data: Optional[dict],
    ) -> None:
        """Store variant assignment"""
        pass
    
    async def _store_outcome(
        self,
        experiment_id: str,
        student_id: str,
        metric_name: str,
        value: float,
        timestamp: datetime,
    ) -> None:
        """Store outcome metric"""
        pass
    
    async def _get_experiment_outcomes(
        self,
        experiment_id: str,
    ) -> list[dict]:
        """Get all outcomes for experiment"""
        return []
    
    async def _store_results(self, results: ExperimentResults) -> None:
        """Store analysis results"""
        pass
