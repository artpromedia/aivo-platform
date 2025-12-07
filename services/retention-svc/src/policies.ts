import type { Pool } from 'pg';

import type { ResourceType, RetentionPolicy } from './types.js';

export async function getPolicy(
  pool: Pool,
  resourceType: ResourceType,
  tenantId: string | null
): Promise<RetentionPolicy | null> {
  const { rows } = await pool.query<RetentionPolicy>(
    `SELECT * FROM retention_policies
     WHERE resource_type = $1 AND (tenant_id = $2 OR tenant_id IS NULL)
     ORDER BY tenant_id NULLS LAST, updated_at DESC
     LIMIT 1`,
    [resourceType, tenantId]
  );
  return rows[0] ?? null;
}

export async function ensurePolicyOrThrow(
  pool: Pool,
  resourceType: ResourceType,
  tenantId: string | null
): Promise<RetentionPolicy> {
  const policy = await getPolicy(pool, resourceType, tenantId);
  if (!policy) {
    throw new Error(
      `No retention policy found for ${resourceType} (tenant ${tenantId ?? 'default'})`
    );
  }
  return policy;
}
