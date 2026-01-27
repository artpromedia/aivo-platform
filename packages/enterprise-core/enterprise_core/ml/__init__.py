"""
Enterprise ML Models

Machine learning models for adaptive learning and knowledge tracing.
Research-backed implementations from educational psychology and ML.

Ported from:
- aivo-pro/services/learning-session-svc/src/ml/knowledge_tracing.py
- aivo-pro/services/training-alignment-svc/src/adaptive_orchestrator.py

Modules:
- knowledge_tracing: Bayesian Knowledge Tracing (BKT) engine
- adaptive_learning: Adaptive learning orchestrator
"""

from enterprise_core.ml.knowledge_tracing import (
    BKTParameters,
    Response,
    BayesianKnowledgeTracer,
)

from enterprise_core.ml.adaptive_learning import (
    PerformanceLevel,
    RecommendationType,
    LearnerMetrics,
    LearningRecommendation,
    AdaptiveLearningOrchestrator,
)

__all__ = [
    # BKT
    "BKTParameters",
    "Response",
    "BayesianKnowledgeTracer",
    # Adaptive Learning
    "PerformanceLevel",
    "RecommendationType",
    "LearnerMetrics",
    "LearningRecommendation",
    "AdaptiveLearningOrchestrator",
]
