export type ConsentStatus = 'PENDING' | 'GRANTED' | 'REVOKED' | 'EXPIRED';

export type ConsentType = 'BASELINE_ASSESSMENT' | 'AI_TUTOR' | 'RESEARCH_ANALYTICS';

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
