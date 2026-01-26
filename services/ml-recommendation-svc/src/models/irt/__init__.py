"""
3-Parameter Logistic Item Response Theory (3PL-IRT) Module.

This module provides a complete implementation of the 3-Parameter Logistic
Item Response Theory model for adaptive assessment, including:

- **Models**: Pydantic data models for items, responses, and ability estimates
- **3PL Model**: Core IRT probability, information, and likelihood functions
- **Estimation**: EAP, MLE, and MAP ability estimation methods
- **Selection**: Adaptive item selection algorithms for CAT

Mathematical Foundation:
    The 3PL model calculates the probability of a correct response as:

    P(X=1|θ) = c + (1-c) / (1 + exp(-Da(θ-b)))

    Where:
        - θ (theta): Latent ability trait
        - a: Discrimination parameter (item quality)
        - b: Difficulty parameter (location)
        - c: Guessing parameter (lower asymptote)
        - D: Scaling constant (1.0 or 1.702)

Usage Example:
    >>> from src.models.irt import (
    ...     ThreePLModel,
    ...     AbilityEstimator,
    ...     AdaptiveItemSelector,
    ...     ItemParameters,
    ... )
    >>>
    >>> # Create model and item bank
    >>> model = ThreePLModel(prior_mean=0.0, prior_std=1.0)
    >>> items = [
    ...     ItemParameters(item_id="Q1", a=1.2, b=-0.5, c=0.25, content_domain="mathematics"),
    ...     ItemParameters(item_id="Q2", a=1.5, b=0.0, c=0.20, content_domain="mathematics"),
    ...     ItemParameters(item_id="Q3", a=1.0, b=0.5, c=0.25, content_domain="mathematics"),
    ... ]
    >>>
    >>> # Estimate ability from responses
    >>> estimator = AbilityEstimator(model)
    >>> responses = [True, True, False]
    >>> estimate = estimator.eap_estimate(items, responses, "student_1", "math")
    >>> print(f"Estimated ability: {estimate.theta:.2f} ± {estimate.standard_error:.2f}")
    >>>
    >>> # Select next item adaptively
    >>> selector = AdaptiveItemSelector(model, items)
    >>> next_item = selector.select_next_item(estimate, administered_items=["Q1", "Q2", "Q3"])

Key Features:
    - Rigorous mathematical implementation following IRT theory
    - Numerically stable computations (log-space likelihood, stable sigmoid)
    - Multiple ability estimation methods (EAP, MLE, MAP)
    - Flexible item selection criteria (MFI, MEI, a-stratified)
    - Content balancing and exposure control
    - Configurable stopping rules for CAT
    - Full Pydantic model validation

References:
    - Birnbaum, A. (1968). Some latent trait models and their use in
      inferring an examinee's ability.
    - Lord, F. M. (1980). Applications of item response theory to
      practical testing problems.
    - Bock, R. D., & Mislevy, R. J. (1982). Adaptive EAP estimation
      of ability in a microcomputer environment.
"""

# Data Models
from .models import (
    AbilityEstimate,
    AdaptiveTestState,
    ContentDomain,
    ItemBankStatistics,
    ItemParameters,
    ItemResponse,
)

# Core 3PL Model
from .three_pl import ThreePLModel

# Ability Estimation
from .estimation import AbilityEstimator

# Adaptive Item Selection
from .selection import (
    AdaptiveItemSelector,
    AdaptiveTestController,
    ContentConstraints,
    SelectionCriterion,
    StoppingConfig,
    StoppingRule,
)

__all__ = [
    # Models
    "ItemParameters",
    "AbilityEstimate",
    "ItemResponse",
    "AdaptiveTestState",
    "ItemBankStatistics",
    "ContentDomain",
    # Core Model
    "ThreePLModel",
    # Estimation
    "AbilityEstimator",
    # Selection
    "AdaptiveItemSelector",
    "AdaptiveTestController",
    "ContentConstraints",
    "SelectionCriterion",
    "StoppingConfig",
    "StoppingRule",
]

__version__ = "1.0.0"
