export type ConsentStatus = 'PENDING' | 'GRANTED' | 'REVOKED' | 'EXPIRED';

export type ConsentType =
  | 'BASELINE_ASSESSMENT'
  | 'DATA_PROCESSING'
  | 'RESEARCH'
  | 'AI_TUTOR'
  | 'MARKETING'
  | 'THIRD_PARTY_SHARING';

export type ConsentSource =
  | 'MOBILE_PARENT'
  | 'WEB_PARENT'
  | 'DISTRICT_PORTAL'
  | 'API'
  | 'SYSTEM';

export type ConsentLogStatus = 'GRANTED' | 'REVOKED';

export interface Consent {
  id: string;
  tenant_id: string;
  learner_id: string;
  consent_type: ConsentType;
  status: ConsentStatus;
  granted_by_parent_id: string | null;
  granted_at: Date | null;
  revoked_at: Date | null;
  expires_at: Date | null;
  consent_text_version: string | null;
  source: ConsentSource | null;
  created_at: Date;
  updated_at: Date;
}

export interface ConsentAuditLog {
  id: string;
  consent_id: string;
  previous_status: ConsentStatus;
  new_status: ConsentStatus;
  changed_by_user_id: string | null;
  change_reason: string;
  metadata_json: Record<string, unknown> | null;
  changed_at: Date;
}

// ════════════════════════════════════════════════════════════════════════════════
// CONSENT LOGS (Immutable audit trail)
// ════════════════════════════════════════════════════════════════════════════════

export interface ConsentLog {
  id: string;
  tenant_id: string;
  learner_id: string;
  parent_user_id: string;
  consent_type: ConsentType;
  status: ConsentLogStatus;
  source: ConsentSource;
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
  consentType: ConsentType;
  status: ConsentLogStatus;
  source: ConsentSource;
  consentTextVersion: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}
