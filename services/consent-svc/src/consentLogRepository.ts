/**
 * Consent Log Repository
 *
 * Immutable audit log for all consent actions (grants and revocations).
 * Each record is a point-in-time snapshot of a consent event for COPPA/FERPA compliance.
 */

import type { Pool } from 'pg';

import type {
  ConsentLog,
  ConsentLogStatus,
  ConsentSource,
  ConsentType,
  CreateConsentLogInput,
} from './types.js';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

interface ConsentLogRow {
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

function mapConsentLog(row: ConsentLogRow): ConsentLog {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    learner_id: row.learner_id,
    parent_user_id: row.parent_user_id,
    consent_type: row.consent_type,
    status: row.status,
    source: row.source,
    consent_text_version: row.consent_text_version,
    ip_address: row.ip_address,
    user_agent: row.user_agent,
    metadata_json: row.metadata_json,
    created_at: row.created_at,
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// REPOSITORY FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Create an immutable consent log entry.
 * This should be called whenever consent is granted or revoked.
 */
export async function createConsentLog(
  pool: Pool,
  input: CreateConsentLogInput
): Promise<ConsentLog> {
  const { rows } = await pool.query<ConsentLogRow>(
    `INSERT INTO consent_logs (
      tenant_id, learner_id, parent_user_id, consent_type, status,
      source, consent_text_version, ip_address, user_agent, metadata_json
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      input.tenantId,
      input.learnerId,
      input.parentUserId,
      input.consentType,
      input.status,
      input.source,
      input.consentTextVersion,
      input.ipAddress ?? null,
      input.userAgent ?? null,
      input.metadata ? JSON.stringify(input.metadata) : null,
    ]
  );
  return mapConsentLog(rows[0]!);
}

/**
 * Get all consent logs for a learner (for DSR export).
 */
export async function getConsentLogsForLearner(
  pool: Pool,
  tenantId: string,
  learnerId: string
): Promise<ConsentLog[]> {
  const { rows } = await pool.query<ConsentLogRow>(
    `SELECT * FROM consent_logs
     WHERE tenant_id = $1 AND learner_id = $2
     ORDER BY created_at ASC`,
    [tenantId, learnerId]
  );
  return rows.map(mapConsentLog);
}

/**
 * Get consent logs by parent user (for parent portal).
 */
export async function getConsentLogsByParent(
  pool: Pool,
  tenantId: string,
  parentUserId: string
): Promise<ConsentLog[]> {
  const { rows } = await pool.query<ConsentLogRow>(
    `SELECT * FROM consent_logs
     WHERE tenant_id = $1 AND parent_user_id = $2
     ORDER BY created_at DESC`,
    [tenantId, parentUserId]
  );
  return rows.map(mapConsentLog);
}

/**
 * Get latest consent status for a specific type.
 * Returns the most recent log entry for this consent type.
 */
export async function getLatestConsentLog(
  pool: Pool,
  tenantId: string,
  learnerId: string,
  consentType: ConsentType
): Promise<ConsentLog | null> {
  const { rows } = await pool.query<ConsentLogRow>(
    `SELECT * FROM consent_logs
     WHERE tenant_id = $1 AND learner_id = $2 AND consent_type = $3
     ORDER BY created_at DESC
     LIMIT 1`,
    [tenantId, learnerId, consentType]
  );
  return rows.length > 0 ? mapConsentLog(rows[0]!) : null;
}

/**
 * Check if consent is currently granted (based on latest log entry).
 */
export async function isConsentCurrentlyGranted(
  pool: Pool,
  tenantId: string,
  learnerId: string,
  consentType: ConsentType
): Promise<boolean> {
  const latest = await getLatestConsentLog(pool, tenantId, learnerId, consentType);
  return latest?.status === 'GRANTED';
}

/**
 * Get consent history with pagination.
 */
export async function getConsentLogHistory(
  pool: Pool,
  tenantId: string,
  options: {
    learnerId?: string;
    parentUserId?: string;
    consentType?: ConsentType;
    status?: ConsentLogStatus;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ logs: ConsentLog[]; total: number }> {
  const conditions: string[] = ['tenant_id = $1'];
  const params: unknown[] = [tenantId];
  let paramIdx = 2;

  if (options.learnerId) {
    conditions.push(`learner_id = $${paramIdx++}`);
    params.push(options.learnerId);
  }
  if (options.parentUserId) {
    conditions.push(`parent_user_id = $${paramIdx++}`);
    params.push(options.parentUserId);
  }
  if (options.consentType) {
    conditions.push(`consent_type = $${paramIdx++}`);
    params.push(options.consentType);
  }
  if (options.status) {
    conditions.push(`status = $${paramIdx++}`);
    params.push(options.status);
  }

  const whereClause = conditions.join(' AND ');
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;

  const [countResult, dataResult] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM consent_logs WHERE ${whereClause}`, params),
    pool.query<ConsentLogRow>(
      `SELECT * FROM consent_logs
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset]
    ),
  ]);

  return {
    logs: dataResult.rows.map(mapConsentLog),
    total: parseInt(countResult.rows[0]?.count ?? '0', 10),
  };
}
