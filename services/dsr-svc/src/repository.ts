import type { Pool } from 'pg';

import type {
  CreateDsrJobInput,
  CreateDsrRequestInput,
  CreateExportArtifactInput,
  DsrExportArtifact,
  DsrJob,
  DsrJobStatus,
  DsrRequest,
  DsrRequestStatus,
} from './types.js';

// ════════════════════════════════════════════════════════════════════════════════
// MAPPERS
// ════════════════════════════════════════════════════════════════════════════════

function mapRequest(row: Record<string, unknown>): DsrRequest {
  return {
    id: row.id as string,
    tenant_id: row.tenant_id as string,
    requested_by_user_id: row.requested_by_user_id as string,
    learner_id: row.learner_id as string,
    request_type: row.request_type as DsrRequest['request_type'],
    status: row.status as DsrRequestStatus,
    reason: row.reason as string | null,
    export_location: row.export_location as string | null,
    result_uri: row.result_uri as string | null,
    reviewed_by_user_id: row.reviewed_by_user_id as string | null,
    reviewed_at: row.reviewed_at as Date | null,
    error_message: row.error_message as string | null,
    metadata_json: row.metadata_json as Record<string, unknown> | null,
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
    completed_at: row.completed_at as Date | null,
  };
}

function mapJob(row: Record<string, unknown>): DsrJob {
  return {
    id: row.id as string,
    dsr_request_id: row.dsr_request_id as string,
    tenant_id: row.tenant_id as string,
    status: row.status as DsrJobStatus,
    progress_percent: row.progress_percent as number | null,
    progress_message: row.progress_message as string | null,
    error_code: row.error_code as string | null,
    error_message: row.error_message as string | null,
    retry_count: row.retry_count as number,
    max_retries: row.max_retries as number,
    started_at: row.started_at as Date | null,
    completed_at: row.completed_at as Date | null,
    worker_id: row.worker_id as string | null,
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
  };
}

function mapArtifact(row: Record<string, unknown>): DsrExportArtifact {
  return {
    id: row.id as string,
    dsr_request_id: row.dsr_request_id as string,
    tenant_id: row.tenant_id as string,
    file_type: row.file_type as DsrExportArtifact['file_type'],
    file_name: row.file_name as string,
    file_size_bytes: row.file_size_bytes as number | null,
    storage_uri: row.storage_uri as string,
    encryption_key_id: row.encryption_key_id as string | null,
    checksum_sha256: row.checksum_sha256 as string | null,
    expires_at: row.expires_at as Date,
    downloaded_count: row.downloaded_count as number,
    last_downloaded_at: row.last_downloaded_at as Date | null,
    created_at: row.created_at as Date,
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// OWNERSHIP CHECKS
// ════════════════════════════════════════════════════════════════════════════════

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

// ════════════════════════════════════════════════════════════════════════════════
// DSR REQUESTS
// ════════════════════════════════════════════════════════════════════════════════

export async function createDsrRequest(
  pool: Pool,
  input: CreateDsrRequestInput
): Promise<DsrRequest> {
  const { rows } = await pool.query(
    `INSERT INTO dsr_requests (
      tenant_id, requested_by_user_id, learner_id, request_type, status, reason, metadata_json
    )
    VALUES ($1, $2, $3, $4, 'PENDING', $5, $6)
    RETURNING *`,
    [
      input.tenantId,
      input.requestedByUserId,
      input.learnerId,
      input.requestType,
      input.reason ?? null,
      input.metadata ? JSON.stringify(input.metadata) : null,
    ]
  );
  return mapRequest(rows[0]);
}

export async function listDsrRequestsForUser(
  pool: Pool,
  tenantId: string,
  userId: string
): Promise<DsrRequest[]> {
  const { rows } = await pool.query(
    `SELECT * FROM dsr_requests 
     WHERE tenant_id = $1 AND requested_by_user_id = $2 
     ORDER BY created_at DESC`,
    [tenantId, userId]
  );
  return rows.map(mapRequest);
}

export async function listDsrRequestsForTenant(
  pool: Pool,
  tenantId: string,
  options: {
    status?: DsrRequestStatus;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ requests: DsrRequest[]; total: number }> {
  const conditions: string[] = ['tenant_id = $1'];
  const params: unknown[] = [tenantId];
  let paramIdx = 2;

  if (options.status) {
    conditions.push(`status = $${paramIdx++}`);
    params.push(options.status);
  }

  const whereClause = conditions.join(' AND ');
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;

  const [countResult, dataResult] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM dsr_requests WHERE ${whereClause}`, params),
    pool.query(
      `SELECT * FROM dsr_requests
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    ),
  ]);

  return {
    requests: dataResult.rows.map(mapRequest),
    total: parseInt(countResult.rows[0]?.count ?? '0', 10),
  };
}

export async function getDsrRequestForUser(
  pool: Pool,
  id: string,
  tenantId: string,
  userId: string
): Promise<DsrRequest | null> {
  const { rows } = await pool.query(
    `SELECT * FROM dsr_requests 
     WHERE id = $1 AND tenant_id = $2 AND requested_by_user_id = $3`,
    [id, tenantId, userId]
  );
  if (rows.length === 0) return null;
  return mapRequest(rows[0]);
}

export async function getDsrRequestById(
  pool: Pool,
  id: string,
  tenantId: string
): Promise<DsrRequest | null> {
  const { rows } = await pool.query(
    'SELECT * FROM dsr_requests WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );
  if (rows.length === 0) return null;
  return mapRequest(rows[0]);
}

export async function updateRequestStatus(
  pool: Pool,
  id: string,
  tenantId: string,
  status: DsrRequestStatus,
  opts: {
    reason?: string | null;
    resultUri?: string | null;
    errorMessage?: string | null;
    reviewedByUserId?: string | null;
    completed?: boolean;
  } = {}
): Promise<DsrRequest> {
  const { rows } = await pool.query(
    `UPDATE dsr_requests
     SET status = $1,
         reason = COALESCE($2, reason),
         result_uri = COALESCE($3, result_uri),
         error_message = COALESCE($4, error_message),
         reviewed_by_user_id = COALESCE($5, reviewed_by_user_id),
         reviewed_at = CASE WHEN $5 IS NOT NULL THEN now() ELSE reviewed_at END,
         completed_at = CASE WHEN $6 THEN now() ELSE completed_at END,
         updated_at = now()
     WHERE id = $7 AND tenant_id = $8
     RETURNING *`,
    [
      status,
      opts.reason ?? null,
      opts.resultUri ?? null,
      opts.errorMessage ?? null,
      opts.reviewedByUserId ?? null,
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

export async function markRequestCompleted(
  pool: Pool,
  id: string,
  tenantId: string,
  resultUri?: string | null
): Promise<DsrRequest> {
  return updateRequestStatus(pool, id, tenantId, 'COMPLETED', {
    resultUri,
    completed: true,
  });
}

export async function markRequestFailed(
  pool: Pool,
  id: string,
  tenantId: string,
  errorMessage: string
): Promise<DsrRequest> {
  return updateRequestStatus(pool, id, tenantId, 'FAILED', {
    errorMessage,
    completed: true,
  });
}

export async function markRequestRejected(
  pool: Pool,
  id: string,
  tenantId: string,
  reason: string,
  reviewedByUserId: string
): Promise<DsrRequest> {
  return updateRequestStatus(pool, id, tenantId, 'REJECTED', {
    reason,
    reviewedByUserId,
    completed: true,
  });
}

// ════════════════════════════════════════════════════════════════════════════════
// DSR JOBS
// ════════════════════════════════════════════════════════════════════════════════

export async function createDsrJob(pool: Pool, input: CreateDsrJobInput): Promise<DsrJob> {
  const { rows } = await pool.query(
    `INSERT INTO dsr_jobs (dsr_request_id, tenant_id, status)
     VALUES ($1, $2, 'QUEUED')
     RETURNING *`,
    [input.dsrRequestId, input.tenantId]
  );
  return mapJob(rows[0]);
}

export async function getNextQueuedJob(pool: Pool, workerId: string): Promise<DsrJob | null> {
  // Use FOR UPDATE SKIP LOCKED for safe concurrent access
  const { rows } = await pool.query(
    `UPDATE dsr_jobs
     SET status = 'PROCESSING',
         started_at = now(),
         worker_id = $1,
         updated_at = now()
     WHERE id = (
       SELECT id FROM dsr_jobs
       WHERE status = 'QUEUED'
       ORDER BY created_at ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED
     )
     RETURNING *`,
    [workerId]
  );
  if (rows.length === 0) return null;
  return mapJob(rows[0]);
}

export async function updateJobProgress(
  pool: Pool,
  jobId: string,
  progressPercent: number,
  progressMessage?: string
): Promise<DsrJob> {
  const { rows } = await pool.query(
    `UPDATE dsr_jobs
     SET progress_percent = $1,
         progress_message = $2,
         updated_at = now()
     WHERE id = $3
     RETURNING *`,
    [progressPercent, progressMessage ?? null, jobId]
  );
  if (rows.length === 0) {
    throw new Error('DSR job not found');
  }
  return mapJob(rows[0]);
}

export async function completeJob(pool: Pool, jobId: string): Promise<DsrJob> {
  const { rows } = await pool.query(
    `UPDATE dsr_jobs
     SET status = 'COMPLETED',
         progress_percent = 100,
         completed_at = now(),
         updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [jobId]
  );
  if (rows.length === 0) {
    throw new Error('DSR job not found');
  }
  return mapJob(rows[0]);
}

export async function failJob(
  pool: Pool,
  jobId: string,
  errorCode: string,
  errorMessage: string
): Promise<DsrJob> {
  const { rows } = await pool.query(
    `UPDATE dsr_jobs
     SET status = 'FAILED',
         error_code = $1,
         error_message = $2,
         completed_at = now(),
         updated_at = now()
     WHERE id = $3
     RETURNING *`,
    [errorCode, errorMessage, jobId]
  );
  if (rows.length === 0) {
    throw new Error('DSR job not found');
  }
  return mapJob(rows[0]);
}

export async function getJobByRequestId(
  pool: Pool,
  dsrRequestId: string
): Promise<DsrJob | null> {
  const { rows } = await pool.query(
    'SELECT * FROM dsr_jobs WHERE dsr_request_id = $1 ORDER BY created_at DESC LIMIT 1',
    [dsrRequestId]
  );
  if (rows.length === 0) return null;
  return mapJob(rows[0]);
}

// ════════════════════════════════════════════════════════════════════════════════
// EXPORT ARTIFACTS
// ════════════════════════════════════════════════════════════════════════════════

export async function createExportArtifact(
  pool: Pool,
  input: CreateExportArtifactInput
): Promise<DsrExportArtifact> {
  const { rows } = await pool.query(
    `INSERT INTO dsr_export_artifacts (
      dsr_request_id, tenant_id, file_type, file_name, file_size_bytes,
      storage_uri, encryption_key_id, checksum_sha256, expires_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      input.dsrRequestId,
      input.tenantId,
      input.fileType,
      input.fileName,
      input.fileSizeBytes ?? null,
      input.storageUri,
      input.encryptionKeyId ?? null,
      input.checksumSha256 ?? null,
      input.expiresAt,
    ]
  );
  return mapArtifact(rows[0]);
}

export async function getExportArtifacts(
  pool: Pool,
  dsrRequestId: string
): Promise<DsrExportArtifact[]> {
  const { rows } = await pool.query(
    'SELECT * FROM dsr_export_artifacts WHERE dsr_request_id = $1 ORDER BY created_at DESC',
    [dsrRequestId]
  );
  return rows.map(mapArtifact);
}

export async function incrementDownloadCount(
  pool: Pool,
  artifactId: string
): Promise<DsrExportArtifact> {
  const { rows } = await pool.query(
    `UPDATE dsr_export_artifacts
     SET downloaded_count = downloaded_count + 1,
         last_downloaded_at = now()
     WHERE id = $1
     RETURNING *`,
    [artifactId]
  );
  if (rows.length === 0) {
    throw new Error('Export artifact not found');
  }
  return mapArtifact(rows[0]);
}

export async function getExpiredArtifacts(pool: Pool): Promise<DsrExportArtifact[]> {
  const { rows } = await pool.query(
    'SELECT * FROM dsr_export_artifacts WHERE expires_at < now()',
    []
  );
  return rows.map(mapArtifact);
}

export async function deleteArtifact(pool: Pool, artifactId: string): Promise<void> {
  await pool.query('DELETE FROM dsr_export_artifacts WHERE id = $1', [artifactId]);
}

// ════════════════════════════════════════════════════════════════════════════════
// ADMIN FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════════

export async function approveDsrRequest(
  pool: Pool,
  id: string,
  tenantId: string,
  approvedByUserId: string
): Promise<DsrRequest> {
  return updateRequestStatus(pool, id, tenantId, 'IN_PROGRESS', {
    reviewedByUserId: approvedByUserId,
  });
}

export async function rejectDsrRequest(
  pool: Pool,
  id: string,
  tenantId: string,
  rejectedByUserId: string,
  reason: string
): Promise<DsrRequest> {
  return updateRequestStatus(pool, id, tenantId, 'REJECTED', {
    reason,
    reviewedByUserId: rejectedByUserId,
    completed: true,
  });
}

export async function listDsrRequestsByStatus(
  pool: Pool,
  options: {
    status?: DsrRequestStatus;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ requests: DsrRequest[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (options.status) {
    conditions.push(`status = $${paramIndex}`);
    params.push(options.status);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM dsr_requests ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const { rows } = await pool.query(
    `SELECT * FROM dsr_requests ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, limit, offset]
  );

  return { requests: rows.map(mapRequest), total };
}

// ════════════════════════════════════════════════════════════════════════════════
// LEGACY ALIASES (for backward compatibility with existing code)
// ════════════════════════════════════════════════════════════════════════════════

/** @deprecated Use listDsrRequestsForUser instead */
export const listDsrRequestsForParent = listDsrRequestsForUser;

/** @deprecated Use getDsrRequestForUser instead */
export const getDsrRequestForParent = getDsrRequestForUser;

export async function markDeclined(
  pool: Pool,
  id: string,
  tenantId: string,
  reason: string
): Promise<DsrRequest> {
  return updateRequestStatus(pool, id, tenantId, 'REJECTED', { reason, completed: true });
}
