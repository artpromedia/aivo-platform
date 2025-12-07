import type { Pool } from 'pg';

import type { TransitionResult } from './fsm.js';
import type { Consent, ConsentStatus, ConsentType } from './types.js';

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
  created_at: Date;
  updated_at: Date;
}

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
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function createConsent(
  pool: Pool,
  input: {
    tenantId: string;
    learnerId: string;
    consentType: ConsentType;
    status?: ConsentStatus;
    expiresAt?: Date | null;
  }
): Promise<Consent> {
  const { rows } = await pool.query<ConsentRow>(
    `INSERT INTO consents (tenant_id, learner_id, consent_type, status, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (tenant_id, learner_id, consent_type) DO NOTHING
     RETURNING *`,
    [
      input.tenantId,
      input.learnerId,
      input.consentType,
      input.status ?? 'PENDING',
      input.expiresAt ?? null,
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

    await client.query(
      `INSERT INTO consent_audit_log
        (consent_id, previous_status, new_status, changed_by_user_id, change_reason, metadata_json)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        consent.id,
        transition.audit.previous_status,
        transition.audit.new_status,
        transition.audit.changed_by_user_id,
        transition.audit.change_reason,
        transition.audit.metadata_json,
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
