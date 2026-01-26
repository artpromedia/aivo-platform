"""
Ability Estimation Methods for IRT.

This module provides various methods for estimating learner ability (θ)
from response patterns using Item Response Theory models.

Estimation Methods:
    - EAP (Expected A Posteriori): Bayesian estimation using quadrature
    - MLE (Maximum Likelihood Estimation): Classical frequentist approach
    - MAP (Maximum A Posteriori): Bayesian point estimation

Each method has different properties:
    - EAP: Provides both point estimate and posterior distribution,
           handles extreme response patterns well, computationally efficient
    - MLE: Unbiased but undefined for perfect response patterns
    - MAP: Compromise between EAP and MLE, always defined

References:
    - Bock, R. D., & Mislevy, R. J. (1982). Adaptive EAP estimation
      of ability in a microcomputer environment.
    - Lord, F. M. (1980). Applications of item response theory to
      practical testing problems.
"""

import logging
from typing import Sequence

import numpy as np
from numpy.typing import NDArray
from scipy.optimize import minimize_scalar, brentq

from .models import AbilityEstimate, ItemParameters
from .three_pl import ThreePLModel

logger = logging.getLogger(__name__)


class AbilityEstimator:
    """
    Methods for estimating learner ability from response patterns.

    This class provides multiple estimation methods (EAP, MLE, MAP) for
    computing ability estimates from IRT response data. It uses numerical
    integration for Bayesian methods and optimization for MLE.

    Example:
        >>> model = ThreePLModel()
        >>> estimator = AbilityEstimator(model)
        >>> items = [ItemParameters(item_id="Q1", a=1.2, b=0.5, c=0.25)]
        >>> responses = [True]
        >>> estimate = estimator.eap_estimate(items, responses, "student_1", "math")
        >>> print(f"θ = {estimate.theta:.2f} ± {estimate.standard_error:.2f}")

    Attributes:
        model: The 3PL IRT model instance
    """

    # Convergence parameters for iterative methods
    MLE_MAX_ITERATIONS = 100
    MLE_CONVERGENCE_THRESHOLD = 1e-6
    NEWTON_STEP_SIZE_LIMIT = 1.0

    def __init__(self, model: ThreePLModel):
        """
        Initialize the ability estimator.

        Args:
            model: ThreePLModel instance for probability calculations
        """
        self.model = model

    def eap_estimate(
        self,
        items: Sequence[ItemParameters],
        responses: Sequence[bool],
        learner_id: str,
        domain: str,
    ) -> AbilityEstimate:
        """
        Expected A Posteriori (EAP) estimation.

        EAP computes the mean of the posterior distribution:
        θ_EAP = ∫ θ * L(θ|X) * π(θ) dθ / ∫ L(θ|X) * π(θ) dθ

        This method uses numerical quadrature for efficient integration
        and provides a posterior variance estimate.

        Properties:
            - Always defined (even for extreme response patterns)
            - Minimizes squared error loss
            - Shrinks estimates toward prior mean
            - Computationally efficient with quadrature

        Args:
            items: List of administered items
            responses: List of responses (True=correct)
            learner_id: Identifier for the learner
            domain: Content domain

        Returns:
            AbilityEstimate with theta, SE, and confidence interval
        """
        if len(items) != len(responses):
            raise ValueError(
                f"Items ({len(items)}) and responses ({len(responses)}) must have same length"
            )

        theta_points = self.model.theta_range
        n_points = len(theta_points)

        # Calculate posterior at each quadrature point
        posteriors = np.zeros(n_points)
        for i, theta in enumerate(theta_points):
            likelihood = self.model.likelihood(theta, items, responses)
            prior = self.model.prior_probability(theta)
            posteriors[i] = likelihood * prior

        # Normalize posterior
        posterior_sum = np.sum(posteriors)
        if posterior_sum < 1e-300:
            # Numerical underflow - use prior
            logger.warning(
                f"Posterior underflow for learner {learner_id}, using prior"
            )
            posteriors = self.model.prior_probability(theta_points)
            posterior_sum = np.sum(posteriors)

        posteriors /= posterior_sum

        # EAP estimate (posterior mean)
        theta_hat = np.sum(theta_points * posteriors)

        # Posterior variance and SE
        variance = np.sum(((theta_points - theta_hat) ** 2) * posteriors)
        se = np.sqrt(variance)

        # 95% confidence interval
        ci_lower = theta_hat - 1.96 * se
        ci_upper = theta_hat + 1.96 * se

        # Calculate test information at estimate
        test_info = self.model.test_information(theta_hat, items)

        return AbilityEstimate(
            learner_id=learner_id,
            domain=domain,
            theta=float(theta_hat),
            standard_error=float(se),
            confidence_interval=(float(ci_lower), float(ci_upper)),
            n_items=len(items),
            response_pattern=list(responses),
            estimation_method="EAP",
            posterior_variance=float(variance),
            information=float(test_info),
        )

    def mle_estimate(
        self,
        items: Sequence[ItemParameters],
        responses: Sequence[bool],
        learner_id: str,
        domain: str,
    ) -> AbilityEstimate:
        """
        Maximum Likelihood Estimation (MLE) of ability.

        MLE finds the theta that maximizes the likelihood:
        θ_MLE = argmax L(θ|X)

        Uses Newton-Raphson iteration with safeguards for convergence.

        Properties:
            - Unbiased for large samples
            - Undefined for perfect (all correct/incorrect) patterns
            - No shrinkage toward prior
            - Standard error from observed information

        Args:
            items: List of administered items
            responses: List of responses
            learner_id: Identifier for the learner
            domain: Content domain

        Returns:
            AbilityEstimate with theta and SE

        Raises:
            ValueError: If responses are all correct or all incorrect
        """
        if len(items) != len(responses):
            raise ValueError(
                f"Items ({len(items)}) and responses ({len(responses)}) must have same length"
            )

        # Check for extreme response patterns
        n_correct = sum(responses)
        n_items = len(responses)

        if n_correct == 0:
            raise ValueError(
                "MLE undefined for all-incorrect pattern. Use EAP or MAP instead."
            )
        if n_correct == n_items:
            raise ValueError(
                "MLE undefined for all-correct pattern. Use EAP or MAP instead."
            )

        # Newton-Raphson iteration
        theta = 0.0  # Start at prior mean

        for iteration in range(self.MLE_MAX_ITERATIONS):
            # Calculate first and second derivatives of log-likelihood
            first_deriv = 0.0
            second_deriv = 0.0

            for item, response in zip(items, responses):
                p = self.model.probability(theta, item)
                q = 1.0 - p
                a = item.discrimination
                c = item.guessing
                D = self.model.scaling_constant

                # Derivative of probability w.r.t. theta
                # dP/dθ = Da(P-c)(1-P)/(1-c)
                dp_dtheta = D * a * (p - c) * q / (1 - c) if (1 - c) > 0 else 0

                # First derivative of log-likelihood
                if response:
                    first_deriv += dp_dtheta / (p + 1e-10)
                else:
                    first_deriv -= dp_dtheta / (q + 1e-10)

                # Second derivative (observed information)
                # Using Fisher information as approximation
                info = self.model.item_information(theta, item)
                second_deriv -= info

            # Avoid division by zero
            if abs(second_deriv) < 1e-10:
                break

            # Newton-Raphson step with step size limiting
            step = -first_deriv / second_deriv
            step = np.clip(step, -self.NEWTON_STEP_SIZE_LIMIT, self.NEWTON_STEP_SIZE_LIMIT)

            theta_new = theta + step

            # Keep theta in reasonable bounds
            theta_new = np.clip(theta_new, -4.0, 4.0)

            # Check convergence
            if abs(theta_new - theta) < self.MLE_CONVERGENCE_THRESHOLD:
                theta = theta_new
                break

            theta = theta_new

        # Standard error from observed information
        test_info = self.model.test_information(theta, items)
        se = 1.0 / np.sqrt(max(test_info, 1e-10))

        # Confidence interval
        ci_lower = theta - 1.96 * se
        ci_upper = theta + 1.96 * se

        return AbilityEstimate(
            learner_id=learner_id,
            domain=domain,
            theta=float(theta),
            standard_error=float(se),
            confidence_interval=(float(ci_lower), float(ci_upper)),
            n_items=len(items),
            response_pattern=list(responses),
            estimation_method="MLE",
            information=float(test_info),
        )

    def map_estimate(
        self,
        items: Sequence[ItemParameters],
        responses: Sequence[bool],
        learner_id: str,
        domain: str,
    ) -> AbilityEstimate:
        """
        Maximum A Posteriori (MAP) estimation.

        MAP finds the mode of the posterior distribution:
        θ_MAP = argmax L(θ|X) * π(θ)

        This is equivalent to MLE with a penalty term from the prior.

        Properties:
            - Always defined (handles extreme patterns)
            - Point estimate (not mean of posterior)
            - Less shrinkage than EAP for large samples
            - More efficient than EAP for single point estimation

        Args:
            items: List of administered items
            responses: List of responses
            learner_id: Identifier for the learner
            domain: Content domain

        Returns:
            AbilityEstimate with theta and SE
        """
        if len(items) != len(responses):
            raise ValueError(
                f"Items ({len(items)}) and responses ({len(responses)}) must have same length"
            )

        def neg_log_posterior(theta: float) -> float:
            """Negative log posterior for minimization."""
            log_lik = self.model.log_likelihood(theta, items, responses)
            # Log of normal prior (ignoring constant)
            log_prior = -0.5 * ((theta - self.model.prior_mean) / self.model.prior_std) ** 2
            return -(log_lik + log_prior)

        # Use scipy optimizer for MAP
        result = minimize_scalar(
            neg_log_posterior,
            bounds=(-4.0, 4.0),
            method="bounded",
        )

        theta = result.x

        # Standard error from posterior variance (approximate)
        # Use observed information + prior precision
        test_info = self.model.test_information(theta, items)
        prior_precision = 1.0 / (self.model.prior_std ** 2)
        total_precision = test_info + prior_precision
        se = 1.0 / np.sqrt(max(total_precision, 1e-10))

        # Confidence interval
        ci_lower = theta - 1.96 * se
        ci_upper = theta + 1.96 * se

        return AbilityEstimate(
            learner_id=learner_id,
            domain=domain,
            theta=float(theta),
            standard_error=float(se),
            confidence_interval=(float(ci_lower), float(ci_upper)),
            n_items=len(items),
            response_pattern=list(responses),
            estimation_method="MAP",
            information=float(test_info),
        )

    def estimate(
        self,
        items: Sequence[ItemParameters],
        responses: Sequence[bool],
        learner_id: str,
        domain: str,
        method: str = "EAP",
    ) -> AbilityEstimate:
        """
        Estimate ability using specified method.

        This is a convenience method that dispatches to the appropriate
        estimation function based on the method parameter.

        Args:
            items: List of administered items
            responses: List of responses
            learner_id: Identifier for the learner
            domain: Content domain
            method: Estimation method ("EAP", "MLE", or "MAP")

        Returns:
            AbilityEstimate

        Raises:
            ValueError: If method is not recognized
        """
        method = method.upper()

        if method == "EAP":
            return self.eap_estimate(items, responses, learner_id, domain)
        elif method == "MLE":
            return self.mle_estimate(items, responses, learner_id, domain)
        elif method == "MAP":
            return self.map_estimate(items, responses, learner_id, domain)
        else:
            raise ValueError(f"Unknown estimation method: {method}")

    def update_estimate(
        self,
        previous_estimate: AbilityEstimate,
        new_item: ItemParameters,
        new_response: bool,
        items: Sequence[ItemParameters],
    ) -> AbilityEstimate:
        """
        Update an existing ability estimate with a new response.

        This is more efficient than recomputing from scratch when
        adding a single item to an existing assessment.

        Args:
            previous_estimate: Previous ability estimate
            new_item: The newly administered item
            new_response: Response to the new item
            items: All items including the new one

        Returns:
            Updated AbilityEstimate
        """
        # Get full response pattern
        new_responses = previous_estimate.response_pattern + [new_response]

        # Re-estimate using the same method
        return self.estimate(
            items=items,
            responses=new_responses,
            learner_id=previous_estimate.learner_id,
            domain=previous_estimate.domain,
            method=previous_estimate.estimation_method,
        )

    def posterior_distribution(
        self,
        items: Sequence[ItemParameters],
        responses: Sequence[bool],
    ) -> tuple[NDArray[np.float64], NDArray[np.float64]]:
        """
        Compute the full posterior distribution over ability.

        Returns the posterior probability density at each quadrature point.

        Args:
            items: List of administered items
            responses: List of responses

        Returns:
            Tuple of (theta values, posterior densities)
        """
        theta_points = self.model.theta_range
        n_points = len(theta_points)

        posteriors = np.zeros(n_points)
        for i, theta in enumerate(theta_points):
            likelihood = self.model.likelihood(theta, items, responses)
            prior = self.model.prior_probability(theta)
            posteriors[i] = likelihood * prior

        # Normalize
        posteriors /= (np.sum(posteriors) + 1e-300)

        return theta_points, posteriors

    def posterior_percentile(
        self,
        items: Sequence[ItemParameters],
        responses: Sequence[bool],
        percentile: float,
    ) -> float:
        """
        Compute a percentile of the posterior distribution.

        Args:
            items: List of administered items
            responses: List of responses
            percentile: Desired percentile (0-100)

        Returns:
            Theta value at the specified percentile
        """
        if not 0 <= percentile <= 100:
            raise ValueError(f"Percentile must be 0-100, got {percentile}")

        theta_points, posteriors = self.posterior_distribution(items, responses)

        # Compute cumulative distribution
        cdf = np.cumsum(posteriors)
        cdf /= cdf[-1]  # Ensure ends at 1.0

        # Find percentile
        target = percentile / 100.0
        idx = np.searchsorted(cdf, target)
        idx = min(idx, len(theta_points) - 1)

        return float(theta_points[idx])

    def credible_interval(
        self,
        items: Sequence[ItemParameters],
        responses: Sequence[bool],
        level: float = 0.95,
    ) -> tuple[float, float]:
        """
        Compute Bayesian credible interval for ability.

        Args:
            items: List of administered items
            responses: List of responses
            level: Credible level (default 0.95 for 95% interval)

        Returns:
            Tuple of (lower bound, upper bound)
        """
        alpha = 1.0 - level
        lower_percentile = (alpha / 2) * 100
        upper_percentile = (1 - alpha / 2) * 100

        lower = self.posterior_percentile(items, responses, lower_percentile)
        upper = self.posterior_percentile(items, responses, upper_percentile)

        return (lower, upper)

    def probability_mastery(
        self,
        items: Sequence[ItemParameters],
        responses: Sequence[bool],
        mastery_threshold: float = 0.0,
    ) -> float:
        """
        Compute probability that true ability exceeds mastery threshold.

        This is useful for mastery-based classification decisions.

        Args:
            items: List of administered items
            responses: List of responses
            mastery_threshold: Theta value representing mastery

        Returns:
            Probability that true theta >= mastery_threshold
        """
        theta_points, posteriors = self.posterior_distribution(items, responses)

        # Sum posterior mass above threshold
        above_threshold = theta_points >= mastery_threshold
        prob_mastery = np.sum(posteriors[above_threshold])

        return float(prob_mastery)

    def classification_accuracy(
        self,
        items: Sequence[ItemParameters],
        responses: Sequence[bool],
        cut_scores: Sequence[float],
    ) -> dict[str, float]:
        """
        Compute classification accuracy probabilities for multiple cut scores.

        Useful for proficiency level classifications (e.g., Basic, Proficient, Advanced).

        Args:
            items: List of administered items
            responses: List of responses
            cut_scores: List of theta values defining category boundaries

        Returns:
            Dictionary mapping category labels to probabilities
        """
        theta_points, posteriors = self.posterior_distribution(items, responses)

        cut_scores = sorted(cut_scores)
        result = {}

        # Below first cut score
        below_first = theta_points < cut_scores[0]
        result["below_basic"] = float(np.sum(posteriors[below_first]))

        # Between consecutive cut scores
        for i in range(len(cut_scores) - 1):
            in_range = (theta_points >= cut_scores[i]) & (theta_points < cut_scores[i + 1])
            result[f"level_{i + 1}"] = float(np.sum(posteriors[in_range]))

        # Above last cut score
        above_last = theta_points >= cut_scores[-1]
        result["above_proficient"] = float(np.sum(posteriors[above_last]))

        return result
