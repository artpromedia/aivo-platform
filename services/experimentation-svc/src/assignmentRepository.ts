/**
 * Assignment Repository
 *
 * Database operations for experiment assignments.
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */

import type { Pool } from 'pg';

import type { ExperimentAssignment, AssignmentReason } from './types.js';

// ════════════════════════════════════════════════════════════════════════════════
// ASSIGNMENT QUERIES
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Get existing assignment for a subject.
 */
export async function getAssignment(
  pool: Pool,
  experimentId: string,
  tenantId: string,
  learnerId?: string
): Promise<ExperimentAssignment | null> {
  if (learnerId) {
    const result = await pool.query<ExperimentAssignment>(
      `SELECT * FROM experiment_assignments 
       WHERE experiment_id = $1 AND tenant_id = $2 AND learner_id = $3`,
      [experimentId, tenantId, learnerId]
    );
    return result.rows[0] ?? null;
  }

  const result = await pool.query<ExperimentAssignment>(
    `SELECT * FROM experiment_assignments 
     WHERE experiment_id = $1 AND tenant_id = $2 AND learner_id IS NULL`,
    [experimentId, tenantId]
  );
  return result.rows[0] ?? null;
}

/**
 * Store an assignment (upsert).
 */
export async function upsertAssignment(
  pool: Pool,
  experimentId: string,
  tenantId: string,
  learnerId: string | undefined,
  variantKey: string,
  reason: AssignmentReason
): Promise<ExperimentAssignment> {
  const result = await pool.query<ExperimentAssignment>(
    `INSERT INTO experiment_assignments (experiment_id, tenant_id, learner_id, variant_key, reason)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (experiment_id, tenant_id, COALESCE(learner_id, '00000000-0000-0000-0000-000000000000'))
     DO UPDATE SET variant_key = $4, reason = $5, assigned_at = NOW()
     RETURNING *`,
    [experimentId, tenantId, learnerId ?? null, variantKey, reason]
  );
  return result.rows[0]!;
}

/**
 * Get all assignments for an experiment.
 */
export async function listAssignments(
  pool: Pool,
  experimentId: string,
  limit = 1000,
  offset = 0
): Promise<ExperimentAssignment[]> {
  const result = await pool.query<ExperimentAssignment>(
    `SELECT * FROM experiment_assignments 
     WHERE experiment_id = $1 
     ORDER BY assigned_at DESC
     LIMIT $2 OFFSET $3`,
    [experimentId, limit, offset]
  );
  return result.rows;
}

/**
 * Count assignments by variant for an experiment.
 */
export async function countAssignmentsByVariant(
  pool: Pool,
  experimentId: string
): Promise<Map<string, number>> {
  const result = await pool.query<{ variant_key: string; count: string }>(
    `SELECT variant_key, COUNT(*) as count
     FROM experiment_assignments 
     WHERE experiment_id = $1
     GROUP BY variant_key`,
    [experimentId]
  );

  const counts = new Map<string, number>();
  for (const row of result.rows) {
    counts.set(row.variant_key, parseInt(row.count, 10));
  }
  return counts;
}

/**
 * Get assignments for a tenant.
 */
export async function getAssignmentsForTenant(
  pool: Pool,
  tenantId: string
): Promise<ExperimentAssignment[]> {
  const result = await pool.query<ExperimentAssignment>(
    `SELECT a.* FROM experiment_assignments a
     JOIN experiments e ON a.experiment_id = e.id
     WHERE a.tenant_id = $1 AND e.status = 'RUNNING'
     ORDER BY a.assigned_at DESC`,
    [tenantId]
  );
  return result.rows;
}

/**
 * Delete all assignments for an experiment.
 */
export async function deleteAssignmentsForExperiment(
  pool: Pool,
  experimentId: string
): Promise<number> {
  const result = await pool.query(`DELETE FROM experiment_assignments WHERE experiment_id = $1`, [
    experimentId,
  ]);
  return result.rowCount ?? 0;
}
