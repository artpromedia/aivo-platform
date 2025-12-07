import { createPool } from '../db.js';
import { ensurePolicyOrThrow } from '../policies.js';
import type { ResourceType } from '../types.js';

const RESOURCE_TYPES: ResourceType[] = ['EVENT', 'HOMEWORK_UPLOAD', 'AI_INCIDENT'];

async function listTenants(
  pool: ReturnType<typeof createPool>,
  table: string
): Promise<(string | null)[]> {
  const { rows } = await pool.query<{ tenant_id: string | null }>(
    `SELECT DISTINCT tenant_id FROM ${table}`
  );
  const tenantIds = rows.map((r: { tenant_id: string | null }) => r.tenant_id);
  // Always include null to pick up global rows even if none currently exist
  if (!tenantIds.includes(null)) tenantIds.push(null);
  return tenantIds;
}

async function enforceEvents(pool: ReturnType<typeof createPool>) {
  const tenants = await listTenants(pool, 'events');
  for (const tenantId of tenants) {
    const policy = await ensurePolicyOrThrow(pool, 'EVENT', tenantId);
    const { rowCount } = await pool.query(
      `DELETE FROM events
       WHERE created_at < now() - ($1 * INTERVAL '1 day')
       AND (${tenantId === null ? 'tenant_id IS NULL' : 'tenant_id = $2'})`,
      tenantId === null ? [policy.retention_days] : [policy.retention_days, tenantId]
    );
    console.log(`events: tenant=${tenantId ?? 'global'} deleted=${rowCount}`);
  }
}

async function enforceHomeworkUploads(pool: ReturnType<typeof createPool>) {
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

async function enforceAiIncidents(pool: ReturnType<typeof createPool>) {
  const tenants = await listTenants(pool, 'ai_incidents');
  for (const tenantId of tenants) {
    const policy = await ensurePolicyOrThrow(pool, 'AI_INCIDENT', tenantId);
    // TODO: replace hard delete with anonymization strategy (retain counts only)
    const { rowCount } = await pool.query(
      `DELETE FROM ai_incidents
       WHERE created_at < now() - ($1 * INTERVAL '1 day')
       AND (${tenantId === null ? 'tenant_id IS NULL' : 'tenant_id = $2'})`,
      tenantId === null ? [policy.retention_days] : [policy.retention_days, tenantId]
    );
    console.log(`ai_incidents: tenant=${tenantId ?? 'global'} deleted=${rowCount}`);
  }
}

export async function runRetentionEnforcement(pool = createPool()) {
  for (const resource of RESOURCE_TYPES) {
    if (resource === 'EVENT') await enforceEvents(pool);
    if (resource === 'HOMEWORK_UPLOAD') await enforceHomeworkUploads(pool);
    if (resource === 'AI_INCIDENT') await enforceAiIncidents(pool);
  }
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
