"""
IRT Calibration Service for Live Parameter Updates.

This module provides the core calibration logic for updating IRT item parameters
based on production response data. It supports both Bayesian and Maximum Likelihood
Estimation (MLE) calibration methods.

Key Features:
    - Bayesian calibration incorporating prior knowledge
    - MLE calibration for items with sufficient data
    - Batch calibration for multiple items
    - Integration with drift detection
    - Historical parameter tracking

References:
    - Bock, R. D., & Aitkin, M. (1981). Marginal maximum likelihood estimation
      of item parameters: Application of an EM algorithm.
    - Mislevy, R. J. (1986). Bayes modal estimation in item response models.
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Optional, Protocol, Sequence

import numpy as np
from numpy.typing import NDArray
from pydantic import BaseModel, Field
from scipy.optimize import minimize, minimize_scalar

from src.models.irt.models import AbilityEstimate, ItemParameters, ItemResponse
from src.models.irt.three_pl import ThreePLModel
from src.models.irt.estimation import AbilityEstimator

logger = logging.getLogger(__name__)


class InsufficientDataError(Exception):
    """Raised when there is insufficient data for calibration."""

    def __init__(self, message: str, required: int = 0, actual: int = 0):
        self.message = message
        self.required = required
        self.actual = actual
        super().__init__(message)


class CalibrationConfig(BaseModel):
    """
    Configuration for IRT calibration.

    Attributes:
        min_responses: Minimum responses required before recalibration
        recalibration_interval_days: Days between scheduled recalibrations
        drift_threshold: Threshold for flagging parameter drift (logits)
        bayesian_prior_weight: Weight for prior in Bayesian calibration (0-1)
        mle_max_iterations: Maximum iterations for MLE convergence
        mle_convergence_threshold: Convergence threshold for MLE
        parameter_bounds: Bounds for parameter estimation
    """

    min_responses: int = Field(
        default=100,
        ge=10,
        description="Minimum responses before recalibration"
    )
    recalibration_interval_days: int = Field(
        default=30,
        ge=1,
        description="Days between scheduled recalibrations"
    )
    drift_threshold: float = Field(
        default=0.5,
        ge=0.0,
        description="Parameter drift threshold in logits"
    )
    bayesian_prior_weight: float = Field(
        default=0.3,
        ge=0.0,
        le=1.0,
        description="Weight for prior parameters in Bayesian estimation"
    )
    mle_max_iterations: int = Field(
        default=100,
        ge=10,
        description="Maximum iterations for MLE"
    )
    mle_convergence_threshold: float = Field(
        default=1e-6,
        gt=0.0,
        description="Convergence threshold for MLE"
    )
    parameter_bounds: dict[str, tuple[float, float]] = Field(
        default_factory=lambda: {
            "difficulty": (-4.0, 4.0),
            "discrimination": (0.1, 4.0),
            "guessing": (0.0, 0.5),
        },
        description="Bounds for parameter estimation"
    )


class DatabaseSession(Protocol):
    """Protocol for database session operations."""

    async def execute(self, query: Any) -> Any:
        """Execute a database query."""
        ...

    async def commit(self) -> None:
        """Commit the current transaction."""
        ...


class CalibrationResult(BaseModel):
    """Result of a single item calibration."""

    item_id: str
    old_params: Optional[ItemParameters] = None
    new_params: ItemParameters
    method: str
    n_responses: int
    drift_magnitude: float = 0.0
    calibration_time_ms: float = 0.0
    warnings: list[str] = Field(default_factory=list)


class IRTCalibrator:
    """
    Recalibrates IRT parameters from production data.

    This class provides methods for calibrating item parameters using
    both Bayesian and Maximum Likelihood approaches. It integrates with
    the existing IRT models and can work with a database session for
    persistence.

    The Bayesian approach incorporates prior parameter estimates, providing
    stable estimates even with smaller sample sizes. The MLE approach is
    useful when sufficient data is available and unbiased estimates are preferred.

    Example:
        >>> config = CalibrationConfig(min_responses=100)
        >>> calibrator = IRTCalibrator(config, db_session)
        >>> new_params = await calibrator.calibrate_item(
        ...     item_id="MATH_001",
        ...     responses=responses,
        ...     method="bayesian"
        ... )
    """

    def __init__(
        self,
        config: CalibrationConfig,
        db_session: Optional[DatabaseSession] = None
    ):
        """
        Initialize the IRT calibrator.

        Args:
            config: Calibration configuration
            db_session: Optional database session for persistence
        """
        self.config = config
        self.db = db_session
        self.model = ThreePLModel()
        self.estimator = AbilityEstimator(self.model)

        # Cache for ability estimates
        self._ability_cache: dict[str, AbilityEstimate] = {}

    async def calibrate_item(
        self,
        item_id: str,
        responses: list[ItemResponse],
        method: str = "bayesian",
        current_params: Optional[ItemParameters] = None
    ) -> ItemParameters:
        """
        Recalibrate a single item's parameters.

        Args:
            item_id: Item to calibrate
            responses: All responses to this item
            method: Calibration method ("bayesian" or "mle")
            current_params: Current parameters (optional, fetched if not provided)

        Returns:
            Updated ItemParameters

        Raises:
            InsufficientDataError: If fewer than min_responses responses
            ValueError: If method is not recognized
        """
        if len(responses) < self.config.min_responses:
            raise InsufficientDataError(
                f"Need {self.config.min_responses} responses, got {len(responses)}",
                required=self.config.min_responses,
                actual=len(responses)
            )

        # Get current parameters if not provided
        if current_params is None:
            current_params = await self._get_current_params(item_id)

        # Perform calibration based on method
        if method.lower() == "bayesian":
            new_params = await self._bayesian_calibration(
                current_params, responses
            )
        elif method.lower() == "mle":
            new_params = await self._mle_calibration(
                item_id, responses, current_params
            )
        else:
            raise ValueError(f"Unknown calibration method: {method}")

        # Calculate drift
        drift = self._calculate_drift(current_params, new_params)
        if drift > self.config.drift_threshold:
            await self._log_drift_alert(item_id, current_params, new_params, drift)

        return new_params

    async def _bayesian_calibration(
        self,
        prior_params: ItemParameters,
        responses: list[ItemResponse]
    ) -> ItemParameters:
        """
        Bayesian calibration incorporating prior knowledge.

        Uses a weighted combination of prior parameters and MLE estimates:
        Posterior = w * Prior + (1-w) * MLE

        This approach provides stable estimates even with moderate sample
        sizes and naturally incorporates historical calibration information.

        Args:
            prior_params: Previous item parameters as prior
            responses: Response data for calibration

        Returns:
            Updated ItemParameters
        """
        # Get ability estimates for all respondents
        abilities = await self._get_ability_estimates(responses)

        # Calculate MLE from data
        mle_params = self._estimate_mle_params(prior_params.item_id, responses, abilities)

        # Weighted combination with prior
        w = self.config.bayesian_prior_weight

        new_difficulty = w * prior_params.difficulty + (1 - w) * mle_params["difficulty"]
        new_discrimination = w * prior_params.discrimination + (1 - w) * mle_params["discrimination"]
        new_guessing = w * prior_params.guessing + (1 - w) * mle_params["guessing"]

        # Ensure parameters are within bounds
        bounds = self.config.parameter_bounds
        new_difficulty = np.clip(
            new_difficulty,
            bounds["difficulty"][0],
            bounds["difficulty"][1]
        )
        new_discrimination = np.clip(
            new_discrimination,
            bounds["discrimination"][0],
            bounds["discrimination"][1]
        )
        new_guessing = np.clip(
            new_guessing,
            bounds["guessing"][0],
            bounds["guessing"][1]
        )

        return ItemParameters(
            item_id=prior_params.item_id,
            difficulty=new_difficulty,
            discrimination=new_discrimination,
            guessing=new_guessing,
            content_domain=prior_params.content_domain,
            skill_tags=prior_params.skill_tags,
            calibration_n=len(responses),
            calibration_date=datetime.utcnow(),
            metadata={
                **prior_params.metadata,
                "calibration_method": "bayesian",
                "prior_weight": w,
            }
        )

    async def _mle_calibration(
        self,
        item_id: str,
        responses: list[ItemResponse],
        initial_params: Optional[ItemParameters] = None
    ) -> ItemParameters:
        """
        Maximum Likelihood Estimation of parameters.

        Uses joint MLE with ability parameters, implemented via
        scipy optimization. This approach does not use prior information
        and provides unbiased estimates with sufficient data.

        Args:
            item_id: Item identifier
            responses: Response data for calibration
            initial_params: Initial parameter values for optimization

        Returns:
            Updated ItemParameters
        """
        # Get ability estimates
        abilities = await self._get_ability_estimates(responses)

        # Estimate parameters using MLE
        mle_params = self._estimate_mle_params(item_id, responses, abilities)

        # Build ItemParameters object
        content_domain = initial_params.content_domain if initial_params else "other"
        skill_tags = initial_params.skill_tags if initial_params else []
        metadata = initial_params.metadata if initial_params else {}

        return ItemParameters(
            item_id=item_id,
            difficulty=mle_params["difficulty"],
            discrimination=mle_params["discrimination"],
            guessing=mle_params["guessing"],
            content_domain=content_domain,
            skill_tags=skill_tags,
            calibration_n=len(responses),
            calibration_date=datetime.utcnow(),
            metadata={
                **metadata,
                "calibration_method": "mle",
            }
        )

    def _estimate_mle_params(
        self,
        item_id: str,
        responses: list[ItemResponse],
        abilities: dict[str, float]
    ) -> dict[str, float]:
        """
        Estimate item parameters via MLE given ability estimates.

        Uses scipy optimization to find parameters that maximize
        the likelihood of the observed responses.

        Args:
            item_id: Item identifier
            responses: Response data
            abilities: Dictionary mapping learner_id to ability estimate

        Returns:
            Dictionary with estimated parameters
        """
        # Extract response data with abilities
        thetas = []
        correct = []

        for resp in responses:
            if resp.learner_id in abilities:
                thetas.append(abilities[resp.learner_id])
                correct.append(1.0 if resp.response else 0.0)

        thetas = np.array(thetas)
        correct = np.array(correct)

        if len(thetas) < 10:
            # Not enough data with ability estimates, use defaults
            logger.warning(
                f"Only {len(thetas)} responses with ability estimates for {item_id}"
            )
            return {
                "difficulty": 0.0,
                "discrimination": 1.0,
                "guessing": 0.25,
            }

        def neg_log_likelihood(params: NDArray[np.float64]) -> float:
            """Negative log-likelihood for minimization."""
            a, b, c = params

            # Compute probabilities
            z = a * (thetas - b)
            logistic = 1.0 / (1.0 + np.exp(-np.clip(z, -50, 50)))
            p = c + (1 - c) * logistic

            # Clip for numerical stability
            p = np.clip(p, 1e-10, 1.0 - 1e-10)

            # Log-likelihood
            log_lik = np.sum(correct * np.log(p) + (1 - correct) * np.log(1 - p))

            return -log_lik

        # Initial values and bounds
        bounds = self.config.parameter_bounds
        x0 = [1.0, 0.0, 0.2]
        param_bounds = [
            bounds["discrimination"],
            bounds["difficulty"],
            bounds["guessing"],
        ]

        # Optimize
        result = minimize(
            neg_log_likelihood,
            x0,
            method="L-BFGS-B",
            bounds=param_bounds,
            options={
                "maxiter": self.config.mle_max_iterations,
                "ftol": self.config.mle_convergence_threshold,
            }
        )

        if not result.success:
            logger.warning(
                f"MLE optimization did not converge for {item_id}: {result.message}"
            )

        return {
            "discrimination": float(result.x[0]),
            "difficulty": float(result.x[1]),
            "guessing": float(result.x[2]),
        }

    async def _get_ability_estimates(
        self,
        responses: list[ItemResponse]
    ) -> dict[str, float]:
        """
        Get ability estimates for all respondents.

        First checks the cache, then database, then estimates from
        response patterns if needed.

        Args:
            responses: List of item responses

        Returns:
            Dictionary mapping learner_id to ability (theta)
        """
        abilities = {}
        learner_ids = set(r.learner_id for r in responses)

        for learner_id in learner_ids:
            # Check cache first
            if learner_id in self._ability_cache:
                abilities[learner_id] = self._ability_cache[learner_id].theta
                continue

            # Try to fetch from database
            ability = await self._fetch_ability_from_db(learner_id)
            if ability is not None:
                abilities[learner_id] = ability
                continue

            # Estimate from proportion correct (rough estimate)
            learner_responses = [r for r in responses if r.learner_id == learner_id]
            if learner_responses:
                prop_correct = sum(1 for r in learner_responses if r.response) / len(learner_responses)
                # Convert proportion to rough theta estimate
                # Using logit transform: theta ≈ log(p/(1-p))
                prop_correct = np.clip(prop_correct, 0.01, 0.99)
                theta_estimate = np.log(prop_correct / (1 - prop_correct))
                theta_estimate = np.clip(theta_estimate, -4.0, 4.0)
                abilities[learner_id] = float(theta_estimate)

        return abilities

    async def _fetch_ability_from_db(
        self,
        learner_id: str
    ) -> Optional[float]:
        """
        Fetch learner ability estimate from database.

        Args:
            learner_id: Learner identifier

        Returns:
            Ability estimate or None if not found
        """
        if self.db is None:
            return None

        # Placeholder for actual database query
        # In production, this would query the learner ability table
        return None

    async def _get_current_params(
        self,
        item_id: str
    ) -> ItemParameters:
        """
        Get current parameters for an item.

        Args:
            item_id: Item identifier

        Returns:
            Current ItemParameters

        Raises:
            ValueError: If item not found and no defaults available
        """
        if self.db is None:
            # Return default parameters if no database
            return ItemParameters(
                item_id=item_id,
                difficulty=0.0,
                discrimination=1.0,
                guessing=0.25,
            )

        # Placeholder for actual database query
        return ItemParameters(
            item_id=item_id,
            difficulty=0.0,
            discrimination=1.0,
            guessing=0.25,
        )

    def _calculate_drift(
        self,
        old_params: ItemParameters,
        new_params: ItemParameters
    ) -> float:
        """
        Calculate parameter drift magnitude.

        Uses the difficulty parameter as the primary drift metric.

        Args:
            old_params: Previous parameters
            new_params: New parameters

        Returns:
            Drift magnitude in logits
        """
        return abs(new_params.difficulty - old_params.difficulty)

    async def _log_drift_alert(
        self,
        item_id: str,
        old_params: ItemParameters,
        new_params: ItemParameters,
        drift: float
    ) -> None:
        """
        Log a drift alert for significant parameter changes.

        Args:
            item_id: Item identifier
            old_params: Previous parameters
            new_params: New parameters
            drift: Drift magnitude
        """
        logger.warning(
            f"Parameter drift detected for {item_id}: "
            f"difficulty {old_params.difficulty:.3f} -> {new_params.difficulty:.3f} "
            f"(drift={drift:.3f} logits)"
        )

    async def batch_calibrate(
        self,
        item_ids: Optional[list[str]] = None,
        responses_by_item: Optional[dict[str, list[ItemResponse]]] = None,
        since: Optional[datetime] = None,
        method: str = "bayesian"
    ) -> dict[str, CalibrationResult]:
        """
        Calibrate multiple items in batch.

        Efficiently processes multiple items, skipping those with
        insufficient data. Returns results for all successfully
        calibrated items.

        Args:
            item_ids: Specific items to calibrate (None = all eligible)
            responses_by_item: Pre-fetched responses by item ID
            since: Only consider responses since this date
            method: Calibration method for all items

        Returns:
            Dictionary mapping item_id to CalibrationResult
        """
        if item_ids is None:
            item_ids = await self._get_items_needing_calibration()

        results = {}

        for item_id in item_ids:
            start_time = datetime.utcnow()

            # Get responses for this item
            if responses_by_item and item_id in responses_by_item:
                responses = responses_by_item[item_id]
            else:
                responses = await self._get_responses(item_id, since)

            try:
                old_params = await self._get_current_params(item_id)
                new_params = await self.calibrate_item(
                    item_id,
                    responses,
                    method=method,
                    current_params=old_params
                )

                drift = self._calculate_drift(old_params, new_params)
                elapsed_ms = (datetime.utcnow() - start_time).total_seconds() * 1000

                results[item_id] = CalibrationResult(
                    item_id=item_id,
                    old_params=old_params,
                    new_params=new_params,
                    method=method,
                    n_responses=len(responses),
                    drift_magnitude=drift,
                    calibration_time_ms=elapsed_ms,
                )

            except InsufficientDataError as e:
                logger.debug(f"Skipping {item_id}: {e.message}")
                continue
            except Exception as e:
                logger.error(f"Error calibrating {item_id}: {e}")
                continue

        return results

    async def _get_items_needing_calibration(self) -> list[str]:
        """
        Get list of items due for recalibration.

        Returns items that haven't been calibrated within the
        recalibration interval.

        Returns:
            List of item IDs needing calibration
        """
        if self.db is None:
            return []

        # Placeholder for actual database query
        # Would query items where:
        # - calibration_date < now - recalibration_interval_days
        # - OR calibration_date is NULL
        # - AND response_count >= min_responses
        return []

    async def _get_responses(
        self,
        item_id: str,
        since: Optional[datetime] = None
    ) -> list[ItemResponse]:
        """
        Get all responses to an item.

        Args:
            item_id: Item identifier
            since: Only include responses after this date

        Returns:
            List of ItemResponse objects
        """
        if self.db is None:
            return []

        # Placeholder for actual database query
        return []

    def estimate_required_sample_size(
        self,
        target_se: float = 0.1,
        discrimination: float = 1.0
    ) -> int:
        """
        Estimate sample size needed for target parameter precision.

        Uses the asymptotic standard error formula for item
        parameters to estimate required sample size.

        Args:
            target_se: Target standard error for difficulty
            discrimination: Expected discrimination parameter

        Returns:
            Estimated required sample size
        """
        # Rough approximation: SE(b) ≈ 1 / (a * sqrt(n * 0.25))
        # Solving for n: n ≈ 1 / (a² * SE² * 0.25)
        n = 1.0 / (discrimination ** 2 * target_se ** 2 * 0.25)
        return max(int(np.ceil(n)), self.config.min_responses)

    def validate_calibration_quality(
        self,
        result: CalibrationResult
    ) -> list[str]:
        """
        Validate the quality of a calibration result.

        Checks for potential issues like extreme parameters,
        large drift, or low sample sizes.

        Args:
            result: Calibration result to validate

        Returns:
            List of warning messages (empty if no issues)
        """
        warnings = []

        # Check sample size
        if result.n_responses < 200:
            warnings.append(
                f"Sample size ({result.n_responses}) may be too small for stable estimates"
            )

        # Check drift magnitude
        if result.drift_magnitude > self.config.drift_threshold:
            warnings.append(
                f"Large parameter drift detected ({result.drift_magnitude:.2f} logits)"
            )

        # Check parameter bounds
        params = result.new_params
        if params.discrimination < 0.3:
            warnings.append(
                f"Low discrimination ({params.discrimination:.2f}) - item may not differentiate well"
            )
        if params.discrimination > 3.0:
            warnings.append(
                f"Very high discrimination ({params.discrimination:.2f}) - may indicate fitting issues"
            )

        if abs(params.difficulty) > 3.0:
            warnings.append(
                f"Extreme difficulty ({params.difficulty:.2f}) - item may be too easy/hard"
            )

        if params.guessing > 0.4:
            warnings.append(
                f"High guessing parameter ({params.guessing:.2f}) - check item quality"
            )

        return warnings
