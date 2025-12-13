import type { Pool } from 'pg';

import type { TransitionResult } from './fsm.js';
import type {
  Consent,
  ConsentStatus,
  ConsentStatusCache,
  ConsentType,
  CreateConsentLinkInput,
  CreateVerificationMethodInput,
  ParentalConsentLink,
  TenantCoppaSettings,
  VerificationEvidence,
  VerificationMethod,
  VerificationMethodType,
  VerificationStatus,
} from './types.js';

// ════════════════════════════════════════════════════════════════════════════════
// ROW TYPES
// ════════════════════════════════════════════════════════════════════════════════

interface ConsentRow {
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
  source: string | null;
  created_at: Date;
  updated_at: Date;
}

interface ConsentLinkRow {
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

interface VerificationMethodRow {
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

interface CoppaSettingsRow {
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
// MAPPERS
// ════════════════════════════════════════════════════════════════════════════════

function mapConsent(row: ConsentRow): Consent {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    learner_id: row.learner_id,
    consent_type: row.consent_type,
    status: row.status,
    granted_by_parent_id: row.granted_by_parent_id,
    granted_at: row.granted_at,
    revoked_at: row.revoked_at,
    expires_at: row.expires_at,
    consent_text_version: row.consent_text_version,
    source: row.source as Consent['source'],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapConsentLink(row: ConsentLinkRow): ParentalConsentLink {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    learner_id: row.learner_id,
    parent_email: row.parent_email,
    consent_id: row.consent_id,
    token_hash: row.token_hash,
    created_at: row.created_at,
    expires_at: row.expires_at,
    used_at: row.used_at,
    resend_count: row.resend_count,
    last_resend_at: row.last_resend_at,
    requested_by_ip: row.requested_by_ip,
    requested_by_user_agent: row.requested_by_user_agent,
  };
}

function mapVerificationMethod(row: VerificationMethodRow): VerificationMethod {
  return {
    id: row.id,
    consent_id: row.consent_id,
    tenant_id: row.tenant_id,
    parent_user_id: row.parent_user_id,
    method_type: row.method_type,
    status: row.status,
    evidence_json: row.evidence_json,
    initiated_at: row.initiated_at,
    verified_at: row.verified_at,
    expires_at: row.expires_at,
    ip_address: row.ip_address,
    user_agent: row.user_agent,
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// CONSENT CRUD
// ════════════════════════════════════════════════════════════════════════════════

export async function createConsent(
  pool: Pool,
  input: {
    tenantId: string;
    learnerId: string;
    consentType: ConsentType;
    status?: ConsentStatus;
    expiresAt?: Date | null;
    source?: Consent['source'];
    consentTextVersion?: string;
  }
): Promise<Consent> {
  const { rows } = await pool.query<ConsentRow>(
    `INSERT INTO consents (tenant_id, learner_id, consent_type, status, expires_at, source, consent_text_version)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (tenant_id, learner_id, consent_type) DO NOTHING
     RETURNING *`,
    [
      input.tenantId,
      input.learnerId,
      input.consentType,
      input.status ?? 'PENDING',
      input.expiresAt ?? null,
      input.source ?? null,
      input.consentTextVersion ?? null,
    ]
  );
  if (rows.length > 0) return mapConsent(rows[0]!);

  const existing = await pool.query<ConsentRow>(
    'SELECT * FROM consents WHERE tenant_id = $1 AND learner_id = $2 AND consent_type = $3',
    [input.tenantId, input.learnerId, input.consentType]
  );
  if (existing.rows.length === 0) {
    throw new Error('Failed to create consent');
  }
  return mapConsent(existing.rows[0]!);
}

export async function getConsentById(
  pool: Pool,
  id: string,
  tenantId: string
): Promise<Consent | null> {
  const { rows } = await pool.query<ConsentRow>(
    'SELECT * FROM consents WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );
  if (rows.length === 0) return null;
  return mapConsent(rows[0]!);
}

export async function listConsentsForLearner(
  pool: Pool,
  tenantId: string,
  learnerId: string,
  consentType?: ConsentType
): Promise<Consent[]> {
  const params: string[] = [tenantId, learnerId];
  let where = 'tenant_id = $1 AND learner_id = $2';
  if (consentType) {
    where += ' AND consent_type = $3';
    params.push(consentType);
  }
  const { rows } = await pool.query<ConsentRow>(
    `SELECT * FROM consents WHERE ${where} ORDER BY created_at DESC`,
    params
  );
  return rows.map(mapConsent);
}

export async function applyTransition(
  pool: Pool,
  consent: Consent,
  transition: TransitionResult
): Promise<Consent> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const nextConsent: Consent = { ...consent, ...transition.updates } as Consent;

    const { rows: updatedRows } = await client.query<ConsentRow>(
      `UPDATE consents
       SET status = $1,
           granted_by_parent_id = $2,
           granted_at = $3,
           revoked_at = $4,
           expires_at = $5,
           updated_at = $6
       WHERE id = $7 AND tenant_id = $8
       RETURNING *`,
      [
        nextConsent.status,
        nextConsent.granted_by_parent_id,
        nextConsent.granted_at,
        nextConsent.revoked_at,
        nextConsent.expires_at,
        nextConsent.updated_at,
        consent.id,
        consent.tenant_id,
      ]
    );

    if (updatedRows.length === 0) {
      throw new Error('Consent not found during transition');
    }

    // Insert enhanced audit log with IP/user-agent tracking
    await client.query(
      `INSERT INTO consent_audit_log
        (consent_id, previous_status, new_status, changed_by_user_id, change_reason, metadata_json, ip_address, user_agent, verification_method_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        consent.id,
        transition.audit.previous_status,
        transition.audit.new_status,
        transition.audit.changed_by_user_id,
        transition.audit.change_reason,
        transition.audit.metadata_json,
        transition.audit.ip_address,
        transition.audit.user_agent,
        transition.audit.verification_method_id,
      ]
    );

    await client.query('COMMIT');

    return mapConsent(updatedRows[0]!);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// CONSENT STATUS CACHE (Fast lookups for gating)
// ════════════════════════════════════════════════════════════════════════════════

export async function checkConsentStatus(
  pool: Pool,
  tenantId: string,
  learnerId: string,
  consentType: ConsentType
): Promise<ConsentStatusCache | null> {
  const { rows } = await pool.query<ConsentStatusCache>(
    `SELECT * FROM consent_status_cache 
     WHERE tenant_id = $1 AND learner_id = $2 AND consent_type = $3`,
    [tenantId, learnerId, consentType]
  );
  return rows[0] ?? null;
}

export async function checkMultipleConsents(
  pool: Pool,
  tenantId: string,
  learnerId: string,
  consentTypes: ConsentType[]
): Promise<Map<ConsentType, ConsentStatusCache>> {
  if (consentTypes.length === 0) return new Map();

  const { rows } = await pool.query<ConsentStatusCache>(
    `SELECT * FROM consent_status_cache 
     WHERE tenant_id = $1 AND learner_id = $2 AND consent_type = ANY($3)`,
    [tenantId, learnerId, consentTypes]
  );

  const result = new Map<ConsentType, ConsentStatusCache>();
  for (const row of rows) {
    result.set(row.consent_type, row);
  }
  return result;
}

export async function hasActiveConsent(
  pool: Pool,
  tenantId: string,
  learnerId: string,
  consentType: ConsentType
): Promise<boolean> {
  const cache = await checkConsentStatus(pool, tenantId, learnerId, consentType);
  if (!cache) return false;
  if (cache.status !== 'GRANTED') return false;
  if (cache.expires_at && cache.expires_at < new Date()) return false;
  return true;
}

// ════════════════════════════════════════════════════════════════════════════════
// PARENTAL CONSENT LINKS (COPPA Flow)
// ════════════════════════════════════════════════════════════════════════════════

export async function createConsentLink(
  pool: Pool,
  input: CreateConsentLinkInput
): Promise<ParentalConsentLink> {
  const { rows } = await pool.query<ConsentLinkRow>(
    `INSERT INTO parental_consent_links 
      (tenant_id, learner_id, parent_email, consent_id, token_hash, expires_at, requested_by_ip, requested_by_user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      input.tenantId,
      input.learnerId,
      input.parentEmail,
      input.consentId,
      input.tokenHash,
      input.expiresAt,
      input.requestedByIp ?? null,
      input.requestedByUserAgent ?? null,
    ]
  );
  return mapConsentLink(rows[0]!);
}

export async function getConsentLinkByToken(
  pool: Pool,
  tokenHash: string
): Promise<ParentalConsentLink | null> {
  const { rows } = await pool.query<ConsentLinkRow>(
    `SELECT * FROM parental_consent_links WHERE token_hash = $1`,
    [tokenHash]
  );
  return rows.length > 0 ? mapConsentLink(rows[0]!) : null;
}

export async function getActiveConsentLink(
  pool: Pool,
  consentId: string
): Promise<ParentalConsentLink | null> {
  const { rows } = await pool.query<ConsentLinkRow>(
    `SELECT * FROM parental_consent_links 
     WHERE consent_id = $1 AND used_at IS NULL AND expires_at > now()
     ORDER BY created_at DESC LIMIT 1`,
    [consentId]
  );
  return rows.length > 0 ? mapConsentLink(rows[0]!) : null;
}

export async function markConsentLinkUsed(
  pool: Pool,
  linkId: string
): Promise<ParentalConsentLink> {
  const { rows } = await pool.query<ConsentLinkRow>(
    `UPDATE parental_consent_links SET used_at = now() WHERE id = $1 RETURNING *`,
    [linkId]
  );
  if (rows.length === 0) throw new Error('Consent link not found');
  return mapConsentLink(rows[0]!);
}

export async function incrementResendCount(
  pool: Pool,
  consentId: string
): Promise<ParentalConsentLink | null> {
  const { rows } = await pool.query<ConsentLinkRow>(
    `UPDATE parental_consent_links 
     SET resend_count = resend_count + 1, last_resend_at = now()
     WHERE consent_id = $1 AND used_at IS NULL
     RETURNING *`,
    [consentId]
  );
  return rows.length > 0 ? mapConsentLink(rows[0]!) : null;
}

// ════════════════════════════════════════════════════════════════════════════════
// VERIFICATION METHODS (COPPA-compliant evidence)
// ════════════════════════════════════════════════════════════════════════════════

export async function createVerificationMethod(
  pool: Pool,
  input: CreateVerificationMethodInput
): Promise<VerificationMethod> {
  const { rows } = await pool.query<VerificationMethodRow>(
    `INSERT INTO consent_verification_methods 
      (consent_id, tenant_id, parent_user_id, method_type, status, evidence_json, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, 'PENDING', $5, $6, $7, $8)
     RETURNING *`,
    [
      input.consentId,
      input.tenantId,
      input.parentUserId,
      input.methodType,
      JSON.stringify(input.evidence),
      input.expiresAt ?? null,
      input.ipAddress ?? null,
      input.userAgent ?? null,
    ]
  );
  return mapVerificationMethod(rows[0]!);
}

export async function getVerificationMethod(
  pool: Pool,
  id: string,
  tenantId: string
): Promise<VerificationMethod | null> {
  const { rows } = await pool.query<VerificationMethodRow>(
    `SELECT * FROM consent_verification_methods WHERE id = $1 AND tenant_id = $2`,
    [id, tenantId]
  );
  return rows.length > 0 ? mapVerificationMethod(rows[0]!) : null;
}

export async function updateVerificationStatus(
  pool: Pool,
  id: string,
  tenantId: string,
  status: VerificationStatus,
  evidence?: Partial<VerificationEvidence>
): Promise<VerificationMethod> {
  let query: string;
  let params: unknown[];

  if (evidence) {
    query = `UPDATE consent_verification_methods 
             SET status = $1, 
                 verified_at = CASE WHEN $1 = 'VERIFIED' THEN now() ELSE verified_at END,
                 evidence_json = evidence_json || $4::jsonb
             WHERE id = $2 AND tenant_id = $3
             RETURNING *`;
    params = [status, id, tenantId, JSON.stringify(evidence)];
  } else {
    query = `UPDATE consent_verification_methods 
             SET status = $1, 
                 verified_at = CASE WHEN $1 = 'VERIFIED' THEN now() ELSE verified_at END
             WHERE id = $2 AND tenant_id = $3
             RETURNING *`;
    params = [status, id, tenantId];
  }

  const { rows } = await pool.query<VerificationMethodRow>(query, params);
  if (rows.length === 0) throw new Error('Verification method not found');
  return mapVerificationMethod(rows[0]!);
}

export async function getVerificationForConsent(
  pool: Pool,
  consentId: string
): Promise<VerificationMethod | null> {
  const { rows } = await pool.query<VerificationMethodRow>(
    `SELECT * FROM consent_verification_methods 
     WHERE consent_id = $1 AND status = 'VERIFIED'
     ORDER BY verified_at DESC LIMIT 1`,
    [consentId]
  );
  return rows.length > 0 ? mapVerificationMethod(rows[0]!) : null;
}

// ════════════════════════════════════════════════════════════════════════════════
// TENANT COPPA SETTINGS
// ════════════════════════════════════════════════════════════════════════════════

export async function getTenantCoppaSettings(
  pool: Pool,
  tenantId: string
): Promise<TenantCoppaSettings> {
  const { rows } = await pool.query<CoppaSettingsRow>(
    `SELECT * FROM tenant_coppa_settings WHERE tenant_id = $1`,
    [tenantId]
  );

  if (rows.length > 0) {
    return rows[0]!;
  }

  // Return defaults if not configured
  return {
    tenant_id: tenantId,
    coppa_age_threshold: 13,
    require_verifiable_consent: true,
    allowed_verification_methods: ['CREDIT_CARD_MICRO_CHARGE', 'SIGNED_CONSENT_FORM'],
    consent_link_expiry_hours: 72,
    max_resend_attempts: 3,
    created_at: new Date(),
    updated_at: new Date(),
  };
}

export async function upsertTenantCoppaSettings(
  pool: Pool,
  settings: Partial<TenantCoppaSettings> & { tenant_id: string }
): Promise<TenantCoppaSettings> {
  const { rows } = await pool.query<CoppaSettingsRow>(
    `INSERT INTO tenant_coppa_settings 
      (tenant_id, coppa_age_threshold, require_verifiable_consent, allowed_verification_methods, consent_link_expiry_hours, max_resend_attempts)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (tenant_id) DO UPDATE SET
       coppa_age_threshold = COALESCE($2, tenant_coppa_settings.coppa_age_threshold),
       require_verifiable_consent = COALESCE($3, tenant_coppa_settings.require_verifiable_consent),
       allowed_verification_methods = COALESCE($4, tenant_coppa_settings.allowed_verification_methods),
       consent_link_expiry_hours = COALESCE($5, tenant_coppa_settings.consent_link_expiry_hours),
       max_resend_attempts = COALESCE($6, tenant_coppa_settings.max_resend_attempts),
       updated_at = now()
     RETURNING *`,
    [
      settings.tenant_id,
      settings.coppa_age_threshold ?? 13,
      settings.require_verifiable_consent ?? true,
      settings.allowed_verification_methods ?? ['CREDIT_CARD_MICRO_CHARGE', 'SIGNED_CONSENT_FORM'],
      settings.consent_link_expiry_hours ?? 72,
      settings.max_resend_attempts ?? 3,
    ]
  );
  return rows[0]!;
}

// ════════════════════════════════════════════════════════════════════════════════
// EXPIRED CONSENT PROCESSOR
// ════════════════════════════════════════════════════════════════════════════════

export async function findExpiredConsents(pool: Pool, limit = 100): Promise<Consent[]> {
  const { rows } = await pool.query<ConsentRow>(
    `SELECT * FROM consents 
     WHERE status = 'GRANTED' AND expires_at IS NOT NULL AND expires_at < now()
     LIMIT $1`,
    [limit]
  );
  return rows.map(mapConsent);
}
