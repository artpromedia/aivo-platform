/**
 * Focus Monitoring Library
 *
 * This module exports all focus monitoring related utilities,
 * hooks, and context for the web learner portal.
 */

// API Client
export {
  sendFocusPing,
  getBreakRecommendation,
  reportBreakStarted,
  reportBreakComplete,
  reportMoodChange,
  getRegulationActivities,
  type SelfReportedMood,
  type GradeBand,
  type FocusLossReason,
  type RegulationActivityType,
  type FocusTelemetry,
  type FocusPingResult,
  type RegulationActivity,
  type RecommendationContext,
  type BreakCompleteResponse,
} from './focus-api';

// Context
export {
  FocusProvider,
  useFocusContext,
  type FocusState,
  type FocusSessionConfig,
} from './focus-context';

// Hook
export { useFocusMonitoring } from './use-focus-monitoring';
