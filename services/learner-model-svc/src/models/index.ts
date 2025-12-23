/**
 * Models Module - Main Export
 *
 * Exports all learner modeling components:
 * - Bayesian Knowledge Tracing (BKT)
 * - Performance Factor Analysis (PFA)
 * - Learning Curve Analysis
 * - Engagement Detection
 * - Unified Learner Model
 */

// BKT exports
export { BayesianKnowledgeTracer, DEFAULT_BKT_PARAMS } from './bkt/index.js';

export type {
  BKTParameters,
  KnowledgeState,
  PracticeOutcome,
  ForwardBackwardResult,
  BKTFitConfig,
  NeurodiverseProfile,
  PersonalizedBKTConfig,
} from './bkt/index.js';

// PFA exports
export { PerformanceFactorAnalysis, DEFAULT_PFA_PARAMS } from './pfa/index.js';

export type { PFAParameters, PFAState, PFAExample, LearnerPFAState } from './pfa/index.js';

// Analytics exports
export {
  LearningCurveAnalyzer,
  EngagementDetector,
  DEFAULT_THRESHOLDS,
} from './analytics/index.js';

export type {
  LearningCurveAnalysis,
  LearningAnomaly,
  RollingWindowStats,
  ForgettingCurveAnalysis,
  SpacingOptimization,
  BehavioralSignals,
  EngagementAnalysis,
  EngagementThresholds,
} from './analytics/index.js';

// Learner Model exports
export { LearnerModel } from './learner-model.js';

export type { LearnerModelDependencies } from './learner-model.js';

export type {
  LearnerProfile,
  SkillMastery,
  LearnerModelState,
  ActivityRecommendation,
  LearningInsights,
  UpdateOutcomeResult,
  ActivityRecord,
  SkillRecord,
  ZoneOfProximalDevelopment,
  IepGoalProgress,
  LearningAnalytics,
  PerformancePrediction,
} from './learner-model-types.js';
