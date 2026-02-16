/**
 * COPPA/Consent Module — Type Definitions
 * Migrated from consent-svc
 */

// ════════════════════════════════════════════════════════════════════════════════
// CONSENT TYPES
// ════════════════════════════════════════════════════════════════════════════════

export type ConsentStatusType = 'PENDING' | 'GRANTED' | 'REVOKED' | 'EXPIRED';

export type ConsentTypeValue =
  | 'BASELINE_ASSESSMENT'
  | 'DATA_PROCESSING'
  | 'RESEARCH'
  | 'AI_TUTOR'
  | 'AI_PERSONALIZATION'
  | 'MARKETING'
  | 'THIRD_PARTY_SHARING'
  | 'BIOMETRIC_DATA'
  | 'VOICE_RECORDING';

export type ConsentSourceValue =
  | 'MOBILE_PARENT'
  | 'WEB_PARENT'
  | 'DISTRICT_PORTAL'
  | 'API'
  | 'SYSTEM';

export type ConsentLogStatus = 'GRANTED' | 'REVOKED';

// ════════════════════════════════════════════════════════════════════════════════
// VERIFICATION METHOD TYPES (COPPA-compliant)
// ════════════════════════════════════════════════════════════════════════════════

export type VerificationMethodType =
  | 'CREDIT_CARD_MICRO_CHARGE'
  | 'SIGNED_CONSENT_FORM'
  | 'VIDEO_CALL'
  | 'KNOWLEDGE_BASED_AUTH'
  | 'GOVERNMENT_ID'
  | 'FACE_MATCH';

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'FAILED' | 'EXPIRED';

// ════════════════════════════════════════════════════════════════════════════════
// CORE CONSENT ENTITY
// ════════════════════════════════════════════════════════════════════════════════

export interface ConsentRecord {
  id: string;
  tenant_id: string;
  learner_id: string;
  consent_type: ConsentTypeValue;
  status: ConsentStatusType;
  granted_by_parent_id: string | null;
  granted_at: Date | null;
  revoked_at: Date | null;
  expires_at: Date | null;
  consent_text_version: string | null;
  source: ConsentSourceValue | null;
  created_at: Date;
  updated_at: Date;
}

// ════════════════════════════════════════════════════════════════════════════════
// CONSENT AUDIT LOG
// ════════════════════════════════════════════════════════════════════════════════

export interface ConsentAuditLogRecord {
  id: string;
  consent_id: string;
  previous_status: ConsentStatusType;
  new_status: ConsentStatusType;
  changed_by_user_id: string | null;
  change_reason: string;
  metadata_json: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  verification_method_id: string | null;
  changed_at: Date;
}

// ════════════════════════════════════════════════════════════════════════════════
// CONSENT LOGS (Immutable audit trail)
// ════════════════════════════════════════════════════════════════════════════════

export interface ConsentLogRecord {
  id: string;
  tenant_id: string;
  learner_id: string;
  parent_user_id: string;
  consent_type: ConsentTypeValue;
  status: ConsentLogStatus;
  source: ConsentSourceValue;
  consent_text_version: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: Date;
}

export interface CreateConsentLogInput {
  tenantId: string;
  learnerId: string;
  parentUserId: string;
  consentType: ConsentTypeValue;
  status: ConsentLogStatus;
  source: ConsentSourceValue;
  consentTextVersion: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

// ════════════════════════════════════════════════════════════════════════════════
// PARENTAL CONSENT LINK (COPPA Flow)
// ════════════════════════════════════════════════════════════════════════════════

export interface ParentalConsentLinkRecord {
  id: string;
  tenant_id: string;
  learner_id: string;
  parent_email: string;
  consent_id: string;
  token_hash: string;
  created_at: Date;
  expires_at: Date;
  used_at: Date | null;
  resend_count: number;
  last_resend_at: Date | null;
  requested_by_ip: string | null;
  requested_by_user_agent: string | null;
}

export interface CreateConsentLinkInput {
  tenantId: string;
  learnerId: string;
  parentEmail: string;
  consentId: string;
  tokenHash: string;
  expiresAt: Date;
  requestedByIp?: string | null;
  requestedByUserAgent?: string | null;
}

// ════════════════════════════════════════════════════════════════════════════════
// VERIFICATION METHOD (COPPA-compliant evidence)
// ════════════════════════════════════════════════════════════════════════════════

export interface VerificationMethodRecord {
  id: string;
  consent_id: string;
  tenant_id: string;
  parent_user_id: string;
  method_type: VerificationMethodType;
  status: VerificationStatus;
  evidence_json: VerificationEvidence;
  initiated_at: Date;
  verified_at: Date | null;
  expires_at: Date | null;
  ip_address: string | null;
  user_agent: string | null;
}

export interface CreditCardVerificationEvidence {
  type: 'CREDIT_CARD_MICRO_CHARGE';
  last4: string;
  chargeId: string;
  tokenRef: string;
  amountCents: number;
  refunded: boolean;
  refundedAt?: string;
}

export interface SignedFormEvidence {
  type: 'SIGNED_CONSENT_FORM';
  documentHash: string;
  storageUri: string;
  fileName: string;
  mimeType: string;
  uploadedAt: string;
}

export interface VideoCallEvidence {
  type: 'VIDEO_CALL';
  callId: string;
  agentId: string;
  scheduledAt: string;
  completedAt?: string;
  recordingUri?: string;
}

export interface KnowledgeBasedAuthEvidence {
  type: 'KNOWLEDGE_BASED_AUTH';
  providerId: string;
  sessionId: string;
  questionsAnswered: number;
  passedAt?: string;
}

export interface GovernmentIdEvidence {
  type: 'GOVERNMENT_ID';
  providerId: string;
  verificationId: string;
  idType: string;
  verifiedAt?: string;
}

export interface FaceMatchEvidence {
  type: 'FACE_MATCH';
  providerId: string;
  sessionId: string;
  confidenceScore?: number;
  matchedAt?: string;
}

export type VerificationEvidence =
  | CreditCardVerificationEvidence
  | SignedFormEvidence
  | VideoCallEvidence
  | KnowledgeBasedAuthEvidence
  | GovernmentIdEvidence
  | FaceMatchEvidence;

export interface CreateVerificationMethodInput {
  consentId: string;
  tenantId: string;
  parentUserId: string;
  methodType: VerificationMethodType;
  evidence: VerificationEvidence;
  expiresAt?: Date | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

// ════════════════════════════════════════════════════════════════════════════════
// CONSENT STATUS CACHE
// ════════════════════════════════════════════════════════════════════════════════

export interface ConsentStatusCacheRecord {
  tenant_id: string;
  learner_id: string;
  consent_type: ConsentTypeValue;
  status: ConsentStatusType;
  granted_at: Date | null;
  expires_at: Date | null;
  updated_at: Date;
}

// ════════════════════════════════════════════════════════════════════════════════
// TENANT COPPA SETTINGS
// ════════════════════════════════════════════════════════════════════════════════

export interface TenantCoppaSettingsRecord {
  tenant_id: string;
  coppa_age_threshold: number;
  require_verifiable_consent: boolean;
  allowed_verification_methods: VerificationMethodType[];
  consent_link_expiry_hours: number;
  max_resend_attempts: number;
  created_at: Date;
  updated_at: Date;
}

// ════════════════════════════════════════════════════════════════════════════════
// CONSENT GATE CHECK RESULT
// ════════════════════════════════════════════════════════════════════════════════

export interface ConsentGateResult {
  allowed: boolean;
  missingConsents: ConsentTypeValue[];
  message: string;
  consentUrl?: string;
}

// ════════════════════════════════════════════════════════════════════════════════
// HTTP 451 RESPONSE
// ════════════════════════════════════════════════════════════════════════════════

export interface ConsentRequiredError {
  error: 'CONSENT_REQUIRED';
  code: 451;
  message: string;
  requiredConsents: ConsentTypeValue[];
  consentUrl: string;
  learnerId: string;
  tenantId: string;
}

// ════════════════════════════════════════════════════════════════════════════════
// PARENT DASHBOARD TYPES
// ════════════════════════════════════════════════════════════════════════════════

export interface ParentConsentSummary {
  learnerId: string;
  learnerName: string;
  consents: {
    type: ConsentTypeValue;
    status: ConsentStatusType;
    required: boolean;
    description: string;
    grantedAt: string | null;
    expiresAt: string | null;
    canRevoke: boolean;
  }[];
}

export interface ConsentActionRequest {
  consentType: ConsentTypeValue;
  action: 'GRANT' | 'REVOKE';
  reason?: string;
}
