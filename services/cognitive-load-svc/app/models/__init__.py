"""Models module for Cognitive Load Service."""

from app.models.intrinsic_load_analyzer import (
    IntrinsicLoadAnalyzer,
    IntrinsicLoadAnalyzerConfig,
    ComplexityMetrics,
    ElementAnalysis,
)
from app.models.extraneous_load_detector import (
    ExtraneousLoadDetector,
    ExtraneousLoadDetectorConfig,
    ExtraneousLoadAnalysis,
    ExtraneousLoadIssue,
    UIElement,
    IssueType,
    Severity,
)
from app.models.working_memory_model import (
    WorkingMemoryModel,
    WorkingMemoryModelConfig,
    WorkingMemoryState,
    MemoryChunk,
)
from app.models.overload_predictor import (
    OverloadPredictor,
    OverloadPredictorConfig,
    OverloadPrediction,
    LoadTrendAnalysis,
    WarningLevel,
    RiskFactor,
)
from app.models.scaffolding_generator import (
    ScaffoldingGenerator,
    ScaffoldingGeneratorConfig,
    ScaffoldingPlan,
    ScaffoldRecommendation,
    ScaffoldType,
    Domain,
)
from app.models.load_estimator import (
    LoadEstimator,
    LoadEstimatorConfig,
    CognitiveLoadEstimate,
    LoadLevel,
)
from app.models.complexity_analyzer import (
    ComplexityAnalyzer,
    ComplexityAnalyzerConfig,
    ComplexityAnalysis,
    ElementInteractivityResult,
)
from app.models.mental_model_assessor import (
    MentalModelAssessor,
    MentalModelAssessorConfig,
    MentalModelAssessment,
    Misconception,
    DevelopmentTrajectory,
)
from app.models.pacing_optimizer import (
    PacingOptimizer,
    PacingOptimizerConfig,
    PacingRecommendation,
    ContentSchedule,
    ContentItem,
)

__all__ = [
    # Intrinsic Load Analyzer
    "IntrinsicLoadAnalyzer",
    "IntrinsicLoadAnalyzerConfig",
    "ComplexityMetrics",
    "ElementAnalysis",
    # Extraneous Load Detector
    "ExtraneousLoadDetector",
    "ExtraneousLoadDetectorConfig",
    "ExtraneousLoadAnalysis",
    "ExtraneousLoadIssue",
    "UIElement",
    "IssueType",
    "Severity",
    # Working Memory Model
    "WorkingMemoryModel",
    "WorkingMemoryModelConfig",
    "WorkingMemoryState",
    "MemoryChunk",
    # Overload Predictor
    "OverloadPredictor",
    "OverloadPredictorConfig",
    "OverloadPrediction",
    "LoadTrendAnalysis",
    "WarningLevel",
    "RiskFactor",
    # Scaffolding Generator
    "ScaffoldingGenerator",
    "ScaffoldingGeneratorConfig",
    "ScaffoldingPlan",
    "ScaffoldRecommendation",
    "ScaffoldType",
    "Domain",
    # Load Estimator
    "LoadEstimator",
    "LoadEstimatorConfig",
    "CognitiveLoadEstimate",
    "LoadLevel",
    # Complexity Analyzer
    "ComplexityAnalyzer",
    "ComplexityAnalyzerConfig",
    "ComplexityAnalysis",
    "ElementInteractivityResult",
    # Mental Model Assessor
    "MentalModelAssessor",
    "MentalModelAssessorConfig",
    "MentalModelAssessment",
    "Misconception",
    "DevelopmentTrajectory",
    # Pacing Optimizer
    "PacingOptimizer",
    "PacingOptimizerConfig",
    "PacingRecommendation",
    "ContentSchedule",
    "ContentItem",
]
