/**
 * Safety Module Exports
 *
 * Centralizes all safety-related functionality for AI requests.
 */

export { safetyPreFilter } from './preFilter.js';
export { safetyPostFilter } from './postFilter.js';
export {
  getSafeResponse,
  getSelfHarmResponse,
  getAbuseResponse,
  getDiagnosisResponse,
  getHomeworkScaffoldResponse,
} from './safetyResponses.js';
export { evaluateSafety, type SafetyResult } from './SafetyAgent.js';
export {
  type AlertConfig,
  type AlertThreshold,
  type AlertSeverity,
  type TriggeredAlert,
  DEFAULT_ALERT_CONFIG,
  evaluateAlerts,
  onAlert,
  dispatchAlerts,
} from './alerting.js';

// Re-export types from aiRequest
export type { PreFilterResult, PostFilterResult } from '../types/aiRequest.js';

// Export new safety filter v2
export { SafetyFilter, createSafetyFilter, type SafetyCheckResult } from './safety-filter-v2.js';
