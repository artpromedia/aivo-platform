/**
 * Bayesian Knowledge Tracing (BKT) Module
 *
 * Exports all BKT-related types and the main tracer class.
 */

export { BayesianKnowledgeTracer, DEFAULT_BKT_PARAMS } from './bayesian-knowledge-tracing.js';

export type {
  BKTParameters,
  KnowledgeState,
  PracticeOutcome,
  ForwardBackwardResult,
  BKTFitConfig,
  NeurodiverseProfile,
  PersonalizedBKTConfig,
} from './types.js';
