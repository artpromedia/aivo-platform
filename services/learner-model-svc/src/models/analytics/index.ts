/**
 * Analytics Module
 *
 * Learning analytics components:
 * - Learning curve analysis
 * - Engagement detection
 * - Forgetting curve modeling
 */

export { LearningCurveAnalyzer } from './learning-curve-analyzer.js';

export { EngagementDetector, DEFAULT_THRESHOLDS } from './engagement-detector.js';

export type {
  LearningCurveAnalysis,
  LearningAnomaly,
  RollingWindowStats,
  ForgettingCurveAnalysis,
  SpacingOptimization,
  PowerLawParams,
  ExponentialParams,
  LearningCurveModel,
} from './types.js';

export type {
  BehavioralSignals,
  EngagementAnalysis,
  EngagementThresholds,
} from './engagement-detector.js';
