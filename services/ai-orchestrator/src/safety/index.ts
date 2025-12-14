/**
 * Safety Module Exports
 *
 * Centralizes all safety-related functionality for AI requests.
 */

export { safetyPreFilter, type PreFilterResult } from './preFilter.js';
export { safetyPostFilter, type PostFilterResult } from './postFilter.js';
export {
  getSafeResponse,
  getSafeResponseForSelfHarm,
  getSafeResponseForAbuse,
  getDiagnosisResponse,
  getHomeworkScaffoldResponse,
} from './safetyResponses.js';
export { evaluateSafety, type SafetyResult } from './SafetyAgent.js';
export { sendSafetyAlert, type AlertPayload } from './alerting.js';
