"""
Federated Learning Module

Provides secure, privacy-preserving model training across
multiple tenants (schools/districts).
"""

from .secure_aggregation import (
    SecureAggregator,
    SecretShare,
    HomomorphicAggregator,
    DifferentialPrivacyAggregator,
)

from .meta_learning import (
    FederatedMAML,
    PerFedAvg,
    TenantAdaptation,
    TaskData,
    AdaptationResult,
)

__all__ = [
    # Secure Aggregation
    "SecureAggregator",
    "SecretShare",
    "HomomorphicAggregator",
    "DifferentialPrivacyAggregator",
    # Meta Learning
    "FederatedMAML",
    "PerFedAvg",
    "TenantAdaptation",
    "TaskData",
    "AdaptationResult",
]
