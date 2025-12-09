import { createPool } from '../db.js';
import { ensurePolicyOrThrow, getPolicy } from '../policies.js';
import type { ResourceType, RetentionPolicy } from '../types.js';

/**
 * Resource types that have retention policies.
 * The order matters for dependencies (e.g., sessions should be processed before AI call logs).
 */
const RESOURCE_TYPES: ResourceType[] = [
  'EVENT',
  'HOMEWORK_UPLOAD',
  'AI_INCIDENT',
  'SESSION',
  'AI_CALL_LOG',
  'RECOMMENDATION',
  'CONSENT_LOG',
  'DSR_EXPORT',
];

type PoolType = ReturnType<typeof createPool>;

async function listTenants(pool: PoolType, table: string): Promise<(string | null)[]> {
  const { rows } = await pool.query<{ tenant_id: string | null }>(
    `SELECT DISTINCT tenant_id FROM ${table}`
  );
  const tenantIds = rows.map((r: { tenant_id: string | null }) => r.tenant_id);
  // Always include null to pick up global rows even if none currently exist
  if (!tenantIds.includes(null)) tenantIds.push(null);
  return tenantIds;
}

async function executeRetention(
  pool: PoolType,
  table: string,
  policy: RetentionPolicy,
  tenantId: string | null,
  options: {
    softDeleteColumn?: string;
    additionalUpdates?: string;
  } = {}
): Promise<number> {
  const tenantCondition = tenantId === null ? 'tenant_id IS NULL' : 'tenant_id = $2';
  const params = tenantId === null ? [policy.retention_days] : [policy.retention_days, tenantId];

  let rowCount: number;

  if (policy.soft_delete_only && options.softDeleteColumn) {
    // Soft delete: set deleted_at and optionally null out sensitive columns
    const updates = options.additionalUpdates
      ? `, ${options.additionalUpdates}`
      : '';
    const result = await pool.query(
      `UPDATE ${table}
       SET ${options.softDeleteColumn} = COALESCE(${options.softDeleteColumn}, now())${updates}
       WHERE created_at < now() - ($1 * INTERVAL '1 day')
       AND ${tenantCondition}
       AND ${options.softDeleteColumn} IS NULL`,
      params
    );
    rowCount = result.rowCount ?? 0;
  } else {
    // Hard delete
    const result = await pool.query(
      `DELETE FROM ${table}
       WHERE created_at < now() - ($1 * INTERVAL '1 day')
       AND ${tenantCondition}`,
      params
    );
    rowCount = result.rowCount ?? 0;
  }

  return rowCount;
}

async function enforceEvents(pool: PoolType) {
  const tenants = await listTenants(pool, 'events');
  for (const tenantId of tenants) {
    const policy = await ensurePolicyOrThrow(pool, 'EVENT', tenantId);
    const rowCount = await executeRetention(pool, 'events', policy, tenantId, {
      softDeleteColumn: 'deleted_at',
      additionalUpdates: 'metadata = NULL',
    });
    console.log(`events: tenant=${tenantId ?? 'global'} processed=${rowCount}`);
  }
}

async function enforceHomeworkUploads(pool: PoolType) {
  const tenants = await listTenants(pool, 'homework_uploads');
  for (const tenantId of tenants) {
    const policy = await ensurePolicyOrThrow(pool, 'HOMEWORK_UPLOAD', tenantId);
    const { rowCount } = await pool.query(
      `UPDATE homework_uploads
       SET deleted_at = COALESCE(deleted_at, now()), file_path = NULL
       WHERE created_at < now() - ($1 * INTERVAL '1 day')
       AND (${tenantId === null ? 'tenant_id IS NULL' : 'tenant_id = $2'})
       AND deleted_at IS NULL`,
      tenantId === null ? [policy.retention_days] : [policy.retention_days, tenantId]
    );
    console.log(`homework_uploads: tenant=${tenantId ?? 'global'} marked_deleted=${rowCount}`);
  }
}

async function enforceAiIncidents(pool: PoolType) {
  const tenants = await listTenants(pool, 'ai_incidents');
  for (const tenantId of tenants) {
    const policy = await ensurePolicyOrThrow(pool, 'AI_INCIDENT', tenantId);
    // Anonymize but retain counts for reporting
    const { rowCount } = await pool.query(
      `UPDATE ai_incidents
       SET details = NULL, raw_input = NULL, raw_output = NULL
       WHERE created_at < now() - ($1 * INTERVAL '1 day')
       AND (${tenantId === null ? 'tenant_id IS NULL' : 'tenant_id = $2'})
       AND details IS NOT NULL`,
      tenantId === null ? [policy.retention_days] : [policy.retention_days, tenantId]
    );
    console.log(`ai_incidents: tenant=${tenantId ?? 'global'} anonymized=${rowCount}`);
  }
}

async function enforceSessions(pool: PoolType) {
  try {
    const tenants = await listTenants(pool, 'sessions');
    for (const tenantId of tenants) {
      const policy = await getPolicy(pool, 'SESSION', tenantId);
      if (!policy) continue;

      const rowCount = await executeRetention(pool, 'sessions', policy, tenantId, {
        softDeleteColumn: 'deleted_at',
        additionalUpdates: 'summary = NULL',
      });
      console.log(`sessions: tenant=${tenantId ?? 'global'} processed=${rowCount}`);
    }
  } catch (err) {
    console.warn('sessions: skipped (table may not exist)', err);
  }
}

async function enforceAiCallLogs(pool: PoolType) {
  try {
    const tenants = await listTenants(pool, 'ai_call_logs');
    for (const tenantId of tenants) {
      const policy = await getPolicy(pool, 'AI_CALL_LOG', tenantId);
      if (!policy) continue;

      // Anonymize input/output but retain usage metrics
      const { rowCount } = await pool.query(
        `UPDATE ai_call_logs
         SET input_text = NULL, output_text = NULL
         WHERE created_at < now() - ($1 * INTERVAL '1 day')
         AND (${tenantId === null ? 'tenant_id IS NULL' : 'tenant_id = $2'})
         AND input_text IS NOT NULL`,
        tenantId === null ? [policy.retention_days] : [policy.retention_days, tenantId]
      );
      console.log(`ai_call_logs: tenant=${tenantId ?? 'global'} anonymized=${rowCount}`);
    }
  } catch (err) {
    console.warn('ai_call_logs: skipped (table may not exist)', err);
  }
}

async function enforceRecommendations(pool: PoolType) {
  try {
    const tenants = await listTenants(pool, 'recommendations');
    for (const tenantId of tenants) {
      const policy = await getPolicy(pool, 'RECOMMENDATION', tenantId);
      if (!policy) continue;

      const rowCount = await executeRetention(pool, 'recommendations', policy, tenantId, {
        softDeleteColumn: 'deleted_at',
        additionalUpdates: 'rationale = NULL',
      });
      console.log(`recommendations: tenant=${tenantId ?? 'global'} processed=${rowCount}`);
    }
  } catch (err) {
    console.warn('recommendations: skipped (table may not exist)', err);
  }
}

async function enforceConsentLogs(pool: PoolType) {
  // Consent logs should be retained for legal compliance
  // Only hard-delete after very long retention periods
  try {
    const tenants = await listTenants(pool, 'consent_logs');
    for (const tenantId of tenants) {
      const policy = await getPolicy(pool, 'CONSENT_LOG', tenantId);
      if (!policy) continue;

      // Consent logs should only be hard-deleted (after 7+ years typically)
      const { rowCount } = await pool.query(
        `DELETE FROM consent_logs
         WHERE created_at < now() - ($1 * INTERVAL '1 day')
         AND (${tenantId === null ? 'tenant_id IS NULL' : 'tenant_id = $2'})`,
        tenantId === null ? [policy.retention_days] : [policy.retention_days, tenantId]
      );
      console.log(`consent_logs: tenant=${tenantId ?? 'global'} deleted=${rowCount}`);
    }
  } catch (err) {
    console.warn('consent_logs: skipped (table may not exist)', err);
  }
}

async function enforceDsrExports(pool: PoolType) {
  // DSR export artifacts should be cleaned up after expiration
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM dsr_export_artifacts WHERE expires_at < now()`
    );
    console.log(`dsr_export_artifacts: expired_deleted=${rowCount}`);
  } catch (err) {
    console.warn('dsr_export_artifacts: skipped (table may not exist)', err);
  }
}

export async function runRetentionEnforcement(pool = createPool()) {
  console.log('Starting retention enforcement...');

  for (const resource of RESOURCE_TYPES) {
    try {
      switch (resource) {
        case 'EVENT':
          await enforceEvents(pool);
          break;
        case 'HOMEWORK_UPLOAD':
          await enforceHomeworkUploads(pool);
          break;
        case 'AI_INCIDENT':
          await enforceAiIncidents(pool);
          break;
        case 'SESSION':
          await enforceSessions(pool);
          break;
        case 'AI_CALL_LOG':
          await enforceAiCallLogs(pool);
          break;
        case 'RECOMMENDATION':
          await enforceRecommendations(pool);
          break;
        case 'CONSENT_LOG':
          await enforceConsentLogs(pool);
          break;
        case 'DSR_EXPORT':
          await enforceDsrExports(pool);
          break;
      }
    } catch (err) {
      console.error(`Failed to enforce retention for ${resource}:`, err);
    }
  }

  console.log('Retention enforcement complete.');
}

// Execute only when run directly (not when imported in tests)
if (process.argv[1] === new URL('', import.meta.url).pathname) {
  void (async () => {
    const pool = createPool();
    try {
      await runRetentionEnforcement(pool);
    } finally {
      await pool.end();
    }
  })().catch((err: unknown) => {
    console.error('Retention enforcement failed', err);
    process.exitCode = 1;
  });
}
