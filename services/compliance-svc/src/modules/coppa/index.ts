/**
 * COPPA/Consent Module — Barrel Export
 */

// Core types
export type {
  ConsentActionRequest,
  ConsentGateResult,
  ConsentLogRecord,
  ConsentLogStatus,
  ConsentRecord,
  ConsentRequiredError,
  ConsentSourceValue,
  ConsentStatusCacheRecord,
  ConsentStatusType,
  ConsentTypeValue,
  CreateConsentLinkInput,
  CreateConsentLogInput,
  CreateVerificationMethodInput,
  ParentalConsentLinkRecord,
  ParentConsentSummary,
  TenantCoppaSettingsRecord,
  VerificationEvidence,
  VerificationMethodRecord,
  VerificationMethodType,
  VerificationStatus,
} from './types.js';

// FSM
export { buildTransition, isConsentActive, needsExpiration, TransitionError, validateTransition } from './fsm.js';

// Repository
export {
  applyTransition,
  checkConsentStatus,
  checkMultipleConsents,
  createConsent,
  createConsentLink,
  createVerificationMethod,
  findExpiredConsents,
  getActiveConsentLink,
  getConsentById,
  getConsentLinkByToken,
  getTenantCoppaSettings,
  getVerificationForConsent,
  hasActiveConsent,
  incrementResendCount,
  listConsentsForLearner,
  markConsentLinkUsed,
  updateVerificationStatus,
  upsertTenantCoppaSettings,
} from './repository.js';

// COPPA Service
export { CoppaConsentService } from './coppa-service.js';
export type { CoppaServiceOptions, EmailParams, InitiateConsentResult, VerifyConsentResult } from './coppa-service.js';

// Consent Gate
export {
  AI_PERSONALIZATION_CONSENT_CONFIG,
  AI_TUTOR_CONSENT_CONFIG,
  BASELINE_CONSENT_CONFIG,
  checkConsentsNonBlocking,
  createConsentGate,
  FULL_LEARNING_CONSENT_CONFIG,
  RESEARCH_CONSENT_CONFIG,
} from './consent-gate.js';
export type { ConsentGateConfig, ConsentGateOptions } from './consent-gate.js';

// Consent Log Repository
export {
  createConsentLog,
  getConsentLogHistory,
  getConsentLogsByParent,
  getConsentLogsForLearner,
  getLatestConsentLog,
  isConsentCurrentlyGranted,
} from './consent-log-repository.js';

// Per-Learner Consent Service
export { FEATURE_CONSENT_REQUIREMENTS, PerLearnerConsentService } from './per-learner-consent.service.js';
export type {
  BatchConsentRequest,
  BatchConsentResult,
  ConsentTemplate,
  FeatureConsentRequirement,
  LearnerConsentDetail,
  PerLearnerConsentStatus,
} from './per-learner-consent.service.js';

// Privacy Config
export {
  consentDefinitions,
  CONSENT_TEXT_VERSION,
  consentTextHistory,
  getConsentDefinition,
  getConsentsByCategory,
  getCoppaRequiredConsents,
  getOptionalConsents,
  getRequiredConsents,
} from './privacy-config.js';

// Route Registrations
export { registerConsentRoutes } from './routes/consents.js';
export { registerCoppaRoutes } from './routes/coppa.js';
export { registerPiiRoutes } from './routes/pii.js';
export { registerPrivacyRoutes } from './routes/privacy.js';

// PII Detection (PRD: COPPA PII protection for minors)
export { detectPii, sanitizeMessage, shouldBlockMessage } from './pii-detection.js';
export type { PiiDetectionResult, PiiMatch, PiiType } from './pii-detection.js';
