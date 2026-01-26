"""
3-Parameter Logistic (3PL) Item Response Theory Model.

The 3PL model is the most widely used IRT model for multiple-choice items.
It extends the 2PL model by adding a pseudo-guessing parameter that accounts
for the probability of correct response even when ability is very low.

Model Equation:
    P(X=1|θ) = c + (1-c) / (1 + exp(-Da(θ-b)))

Where:
    θ (theta) = ability level
    a = discrimination parameter
    b = difficulty parameter
    c = pseudo-guessing parameter
    D = scaling constant (1.0 or 1.702 for normal ogive approximation)

References:
    - Birnbaum, A. (1968). Some latent trait models and their use in
      inferring an examinee's ability.
    - Lord, F. M. (1980). Applications of item response theory to
      practical testing problems.
"""

import logging
from typing import Sequence

import numpy as np
from numpy.typing import NDArray

from .models import ItemParameters

logger = logging.getLogger(__name__)


class ThreePLModel:
    """
    3-Parameter Logistic Item Response Theory Model.

    This implementation provides:
    - Probability of correct response calculation
    - Item information function
    - Test information function
    - Likelihood computation for response patterns
    - Support for quadrature-based integration

    The model uses a standard normal prior N(0,1) for ability by default,
    with configurable prior parameters.

    Example:
        >>> model = ThreePLModel()
        >>> item = ItemParameters(item_id="Q1", a=1.2, b=0.5, c=0.25)
        >>> prob = model.probability(theta=1.0, item=item)
        >>> print(f"P(correct|θ=1.0) = {prob:.3f}")
        P(correct|θ=1.0) = 0.860

    Attributes:
        prior_mean: Mean of the ability prior distribution
        prior_std: Standard deviation of the ability prior
        theta_range: Quadrature points for numerical integration
        scaling_constant: D constant (1.0 or 1.702)
    """

    # Default quadrature points for numerical integration
    DEFAULT_QUADRATURE_POINTS = 81
    DEFAULT_THETA_BOUNDS = (-4.0, 4.0)

    def __init__(
        self,
        prior_mean: float = 0.0,
        prior_std: float = 1.0,
        n_quadrature_points: int = DEFAULT_QUADRATURE_POINTS,
        theta_bounds: tuple[float, float] = DEFAULT_THETA_BOUNDS,
        scaling_constant: float = 1.0
    ):
        """
        Initialize the 3PL model.

        Args:
            prior_mean: Mean of ability prior distribution (default 0)
            prior_std: Standard deviation of ability prior (default 1)
            n_quadrature_points: Number of quadrature points for integration
            theta_bounds: (min, max) bounds for theta range
            scaling_constant: D constant, use 1.702 for normal ogive approx
        """
        self.prior_mean = prior_mean
        self.prior_std = prior_std
        self.scaling_constant = scaling_constant

        # Set up quadrature points
        self.theta_range = np.linspace(
            theta_bounds[0],
            theta_bounds[1],
            n_quadrature_points
        )

        # Precompute quadrature weights (Gaussian quadrature)
        self._quadrature_weights = self._compute_quadrature_weights()

        logger.debug(
            f"Initialized ThreePLModel: prior=N({prior_mean}, {prior_std}²), "
            f"quadrature_points={n_quadrature_points}"
        )

    def _compute_quadrature_weights(self) -> NDArray[np.float64]:
        """Compute Gaussian quadrature weights for integration."""
        # Simple trapezoidal rule weights
        weights = np.ones_like(self.theta_range)
        weights[0] = 0.5
        weights[-1] = 0.5
        delta = self.theta_range[1] - self.theta_range[0]
        return weights * delta

    def probability(
        self,
        theta: float | NDArray[np.float64],
        item: ItemParameters
    ) -> float | NDArray[np.float64]:
        """
        Calculate probability of correct response.

        P(X=1|θ) = c + (1-c) / (1 + exp(-Da(θ-b)))

        Args:
            theta: Ability level(s), can be scalar or array
            item: Item parameters

        Returns:
            Probability of correct response (same shape as theta)
        """
        return self.probability_raw(
            theta=theta,
            a=item.discrimination,
            b=item.difficulty,
            c=item.guessing
        )

    def probability_raw(
        self,
        theta: float | NDArray[np.float64],
        a: float,
        b: float,
        c: float
    ) -> float | NDArray[np.float64]:
        """
        Calculate probability using raw parameters.

        P(X=1|θ) = c + (1-c) / (1 + exp(-Da(θ-b)))

        Args:
            theta: Ability level(s)
            a: Discrimination parameter
            b: Difficulty parameter
            c: Guessing parameter

        Returns:
            Probability of correct response
        """
        # Compute the logistic component
        z = self.scaling_constant * a * (np.asarray(theta) - b)

        # Use numerically stable sigmoid
        logistic = self._sigmoid(z)

        # Apply 3PL transformation
        prob = c + (1 - c) * logistic

        # Return scalar if input was scalar
        if np.isscalar(theta):
            return float(prob)
        return prob

    def _sigmoid(self, z: NDArray[np.float64]) -> NDArray[np.float64]:
        """
        Numerically stable sigmoid function.

        Uses different formulas for positive and negative z to avoid overflow.
        """
        result = np.zeros_like(z, dtype=np.float64)

        # For positive z, use standard formula
        pos_mask = z >= 0
        result[pos_mask] = 1.0 / (1.0 + np.exp(-z[pos_mask]))

        # For negative z, use alternative formula to avoid overflow
        neg_mask = ~pos_mask
        exp_z = np.exp(z[neg_mask])
        result[neg_mask] = exp_z / (1.0 + exp_z)

        return result

    def item_information(
        self,
        theta: float | NDArray[np.float64],
        item: ItemParameters
    ) -> float | NDArray[np.float64]:
        """
        Calculate Fisher information for an item at given ability level(s).

        For the 3PL model, item information is:
        I(θ) = a² * (P - c)² / ((1-c)² * P * Q)

        where P = P(X=1|θ) and Q = 1 - P

        Information is highest near the point where P = (1+c)/2,
        which occurs at θ ≈ b for items with low guessing.

        Args:
            theta: Ability level(s)
            item: Item parameters

        Returns:
            Fisher information value(s)
        """
        return self.item_information_raw(
            theta=theta,
            a=item.discrimination,
            b=item.difficulty,
            c=item.guessing
        )

    def item_information_raw(
        self,
        theta: float | NDArray[np.float64],
        a: float,
        b: float,
        c: float
    ) -> float | NDArray[np.float64]:
        """
        Calculate item information using raw parameters.

        I(θ) = a² * (P - c)² * Q / ((1-c)² * P)

        This is the Fisher information for the 3PL model. Maximum information
        occurs where P = (1+c)/2 + sqrt((1-c)(1+3c))/2, which is slightly
        above the difficulty parameter b when c > 0.

        Args:
            theta: Ability level(s)
            a: Discrimination parameter
            b: Difficulty parameter
            c: Guessing parameter

        Returns:
            Fisher information value(s)
        """
        theta = np.asarray(theta)
        p = self.probability_raw(theta, a, b, c)
        q = 1.0 - p

        # Avoid division by zero with small epsilon
        eps = 1e-10

        # Handle edge cases where P is at bounds
        p_safe = np.clip(p, c + eps, 1.0 - eps)
        q_safe = np.clip(q, eps, 1.0 - eps)

        # Calculate information using correct 3PL formula
        # I(θ) = a² * (P-c)² * Q / ((1-c)² * P)
        numerator = (a ** 2) * ((p_safe - c) ** 2) * q_safe
        denominator = ((1 - c) ** 2) * p_safe

        info = numerator / (denominator + eps)

        if np.isscalar(theta) or theta.ndim == 0:
            return float(info)
        return info

    def test_information(
        self,
        theta: float | NDArray[np.float64],
        items: Sequence[ItemParameters]
    ) -> float | NDArray[np.float64]:
        """
        Calculate total test information at given ability level(s).

        Test information is the sum of item information functions:
        I_test(θ) = Σ I_i(θ)

        The standard error of ability estimation is approximately:
        SE(θ) ≈ 1 / √I_test(θ)

        Args:
            theta: Ability level(s)
            items: List of item parameters

        Returns:
            Total test information
        """
        theta = np.asarray(theta)
        total_info = np.zeros_like(theta, dtype=np.float64)

        for item in items:
            item_info = self.item_information(theta, item)
            total_info = total_info + item_info

        if np.isscalar(theta) or (isinstance(theta, np.ndarray) and theta.ndim == 0):
            return float(total_info)
        return total_info

    def standard_error(
        self,
        theta: float | NDArray[np.float64],
        items: Sequence[ItemParameters]
    ) -> float | NDArray[np.float64]:
        """
        Calculate standard error of ability estimate.

        SE(θ) = 1 / √I_test(θ)

        Args:
            theta: Ability level(s)
            items: List of administered items

        Returns:
            Standard error of theta estimate
        """
        info = self.test_information(theta, items)
        # Avoid division by zero
        info = np.maximum(info, 1e-10)
        se = 1.0 / np.sqrt(info)

        if np.isscalar(theta):
            return float(se)
        return se

    def likelihood(
        self,
        theta: float | NDArray[np.float64],
        items: Sequence[ItemParameters],
        responses: Sequence[bool]
    ) -> float | NDArray[np.float64]:
        """
        Calculate likelihood of response pattern given ability.

        L(θ|X) = Π P(Xi|θ)^xi * (1-P(Xi|θ))^(1-xi)

        For numerical stability, we compute in log space and exponentiate.

        Args:
            theta: Ability level(s)
            items: List of item parameters
            responses: List of responses (True=correct, False=incorrect)

        Returns:
            Likelihood value(s)
        """
        log_lik = self.log_likelihood(theta, items, responses)
        return np.exp(log_lik)

    def log_likelihood(
        self,
        theta: float | NDArray[np.float64],
        items: Sequence[ItemParameters],
        responses: Sequence[bool]
    ) -> float | NDArray[np.float64]:
        """
        Calculate log-likelihood of response pattern.

        log L(θ|X) = Σ [xi * log(Pi) + (1-xi) * log(1-Pi)]

        Args:
            theta: Ability level(s)
            items: List of item parameters
            responses: List of responses

        Returns:
            Log-likelihood value(s)
        """
        theta = np.asarray(theta)
        log_lik = np.zeros_like(theta, dtype=np.float64)

        eps = 1e-10  # Small constant for numerical stability

        for item, response in zip(items, responses):
            p = self.probability(theta, item)
            p = np.clip(p, eps, 1.0 - eps)

            if response:
                log_lik = log_lik + np.log(p)
            else:
                log_lik = log_lik + np.log(1.0 - p)

        if np.isscalar(theta) or (isinstance(theta, np.ndarray) and theta.ndim == 0):
            return float(log_lik)
        return log_lik

    def prior_probability(
        self,
        theta: float | NDArray[np.float64]
    ) -> float | NDArray[np.float64]:
        """
        Calculate prior probability density for ability.

        Uses a normal distribution: π(θ) = N(μ, σ²)

        Args:
            theta: Ability level(s)

        Returns:
            Prior probability density
        """
        theta = np.asarray(theta)
        z = (theta - self.prior_mean) / self.prior_std

        # Normal PDF (unnormalized is fine for Bayesian estimation)
        prior = np.exp(-0.5 * z ** 2)

        if np.isscalar(theta) or (isinstance(theta, np.ndarray) and theta.ndim == 0):
            return float(prior)
        return prior

    def posterior(
        self,
        theta: float | NDArray[np.float64],
        items: Sequence[ItemParameters],
        responses: Sequence[bool]
    ) -> float | NDArray[np.float64]:
        """
        Calculate unnormalized posterior probability.

        posterior(θ|X) ∝ L(θ|X) * π(θ)

        Args:
            theta: Ability level(s)
            items: List of item parameters
            responses: List of responses

        Returns:
            Unnormalized posterior value(s)
        """
        likelihood = self.likelihood(theta, items, responses)
        prior = self.prior_probability(theta)
        return likelihood * prior

    def expected_response(
        self,
        theta: float,
        item: ItemParameters
    ) -> float:
        """
        Calculate expected response (same as probability for binary).

        For the 3PL model with binary responses (0/1), the expected
        response equals the probability of correct response.

        Args:
            theta: Ability level
            item: Item parameters

        Returns:
            Expected response value
        """
        return self.probability(theta, item)

    def response_variance(
        self,
        theta: float,
        item: ItemParameters
    ) -> float:
        """
        Calculate variance of response.

        For a Bernoulli random variable: Var(X) = P(1-P)

        Args:
            theta: Ability level
            item: Item parameters

        Returns:
            Response variance
        """
        p = self.probability(theta, item)
        return p * (1 - p)

    def optimal_difficulty(
        self,
        theta: float,
        a: float = 1.0,
        c: float = 0.25
    ) -> float:
        """
        Calculate optimal item difficulty for a given ability level.

        For maximum information, the optimal difficulty is approximately
        equal to the ability level when c is small. With guessing, the
        optimal difficulty is shifted slightly below ability.

        Args:
            theta: Target ability level
            a: Discrimination parameter
            c: Guessing parameter

        Returns:
            Optimal difficulty parameter b
        """
        # For 3PL, optimal b is where P* = (1+c)/2
        # This occurs at b ≈ θ - (1/Da) * ln((1-c)/(1+c))
        # For small c, this simplifies to b ≈ θ
        if c < 0.01:
            return theta

        adjustment = (1 / (self.scaling_constant * a)) * np.log((1 - c) / (1 + c))
        return theta - adjustment

    def characteristic_curve(
        self,
        item: ItemParameters,
        theta_range: NDArray[np.float64] | None = None
    ) -> tuple[NDArray[np.float64], NDArray[np.float64]]:
        """
        Generate Item Characteristic Curve (ICC) data.

        The ICC shows probability of correct response as a function of ability.

        Args:
            item: Item parameters
            theta_range: Optional custom theta range

        Returns:
            Tuple of (theta values, probability values)
        """
        if theta_range is None:
            theta_range = self.theta_range

        probabilities = self.probability(theta_range, item)
        return theta_range, probabilities

    def information_curve(
        self,
        item: ItemParameters,
        theta_range: NDArray[np.float64] | None = None
    ) -> tuple[NDArray[np.float64], NDArray[np.float64]]:
        """
        Generate Item Information Function (IIF) data.

        The IIF shows how much information an item provides at each ability level.

        Args:
            item: Item parameters
            theta_range: Optional custom theta range

        Returns:
            Tuple of (theta values, information values)
        """
        if theta_range is None:
            theta_range = self.theta_range

        information = self.item_information(theta_range, item)
        return theta_range, information

    def test_characteristic_curve(
        self,
        items: Sequence[ItemParameters],
        theta_range: NDArray[np.float64] | None = None
    ) -> tuple[NDArray[np.float64], NDArray[np.float64]]:
        """
        Generate Test Characteristic Curve (TCC) data.

        The TCC shows expected total score as a function of ability.

        Args:
            items: List of item parameters
            theta_range: Optional custom theta range

        Returns:
            Tuple of (theta values, expected score values)
        """
        if theta_range is None:
            theta_range = self.theta_range

        expected_scores = np.zeros_like(theta_range)
        for item in items:
            expected_scores = expected_scores + self.probability(theta_range, item)

        return theta_range, expected_scores

    def test_information_curve(
        self,
        items: Sequence[ItemParameters],
        theta_range: NDArray[np.float64] | None = None
    ) -> tuple[NDArray[np.float64], NDArray[np.float64]]:
        """
        Generate Test Information Function (TIF) data.

        Args:
            items: List of item parameters
            theta_range: Optional custom theta range

        Returns:
            Tuple of (theta values, test information values)
        """
        if theta_range is None:
            theta_range = self.theta_range

        information = self.test_information(theta_range, items)
        return theta_range, information
