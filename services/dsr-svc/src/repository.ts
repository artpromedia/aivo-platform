import type { Pool } from 'pg';

import type { DsrRequest, DsrRequestStatus, DsrRequestType } from './types.js';

function mapRequest(row: any): DsrRequest {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    parent_id: row.parent_id,
    learner_id: row.learner_id,
    request_type: row.request_type,
    status: row.status,
    reason: row.reason,
    export_location: row.export_location,
    created_at: row.created_at,
    updated_at: row.updated_at,
    completed_at: row.completed_at,
  };
}

export async function assertParentOwnsLearner(
  pool: Pool,
  tenantId: string,
  parentId: string,
  learnerId: string
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `SELECT 1 FROM subscriptions
     WHERE tenant_id = $1 AND parent_id = $2 AND learner_id = $3 AND status != 'CANCELLED'
     LIMIT 1`,
    [tenantId, parentId, learnerId]
  );
  return (rowCount ?? 0) > 0;
}

export async function createDsrRequest(
  pool: Pool,
  params: {
    tenantId: string;
    parentId: string;
    learnerId: string;
    requestType: DsrRequestType;
    reason?: string | null;
  }
): Promise<DsrRequest> {
  const { rows } = await pool.query(
    `INSERT INTO dsr_requests (tenant_id, parent_id, learner_id, request_type, status, reason)
     VALUES ($1, $2, $3, $4, 'RECEIVED', $5)
     RETURNING *`,
    [params.tenantId, params.parentId, params.learnerId, params.requestType, params.reason ?? null]
  );
  return mapRequest(rows[0]);
}

export async function listDsrRequestsForParent(
  pool: Pool,
  tenantId: string,
  parentId: string
): Promise<DsrRequest[]> {
  const { rows } = await pool.query(
    'SELECT * FROM dsr_requests WHERE tenant_id = $1 AND parent_id = $2 ORDER BY created_at DESC',
    [tenantId, parentId]
  );
  return rows.map(mapRequest);
}

export async function getDsrRequestForParent(
  pool: Pool,
  id: string,
  tenantId: string,
  parentId: string
): Promise<DsrRequest | null> {
  const { rows } = await pool.query(
    'SELECT * FROM dsr_requests WHERE id = $1 AND tenant_id = $2 AND parent_id = $3',
    [id, tenantId, parentId]
  );
  if (rows.length === 0) return null;
  return mapRequest(rows[0]);
}

export async function getDsrRequestById(
  pool: Pool,
  id: string,
  tenantId: string
): Promise<DsrRequest | null> {
  const { rows } = await pool.query('SELECT * FROM dsr_requests WHERE id = $1 AND tenant_id = $2', [
    id,
    tenantId,
  ]);
  if (rows.length === 0) return null;
  return mapRequest(rows[0]);
}

export async function updateRequestStatus(
  pool: Pool,
  id: string,
  tenantId: string,
  status: DsrRequestStatus,
  opts: { reason?: string | null; exportLocation?: string | null; completed?: boolean } = {}
): Promise<DsrRequest> {
  const { rows } = await pool.query(
    `UPDATE dsr_requests
     SET status = $1,
         reason = COALESCE($2, reason),
         export_location = COALESCE($3, export_location),
         completed_at = CASE WHEN $4 THEN now() ELSE completed_at END,
         updated_at = now()
     WHERE id = $5 AND tenant_id = $6
     RETURNING *`,
    [
      status,
      opts.reason ?? null,
      opts.exportLocation ?? null,
      opts.completed ?? false,
      id,
      tenantId,
    ]
  );
  if (rows.length === 0) {
    throw new Error('DSR request not found');
  }
  return mapRequest(rows[0]);
}

export async function markExportLocation(
  pool: Pool,
  id: string,
  tenantId: string,
  exportLocation: string
): Promise<DsrRequest> {
  return updateRequestStatus(pool, id, tenantId, 'IN_PROGRESS', { exportLocation });
}

export async function markDeclined(
  pool: Pool,
  id: string,
  tenantId: string,
  reason: string
): Promise<DsrRequest> {
  return updateRequestStatus(pool, id, tenantId, 'DECLINED', { reason, completed: true });
}
