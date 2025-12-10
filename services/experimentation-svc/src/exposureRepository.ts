/**
 * Exposure Repository
 *
 * Database operations for experiment exposure logging.
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */

import type { Pool } from 'pg';

import type { ExperimentExposure, LogExposureInput, ExposureStats } from './types.js';

// ════════════════════════════════════════════════════════════════════════════════
// EXPOSURE LOGGING
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Log an exposure event.
 */
export async function logExposure(
  pool: Pool,
  experimentId: string,
  input: LogExposureInput
): Promise<ExperimentExposure> {
  const result = await pool.query<ExperimentExposure>(
    `INSERT INTO experiment_exposures 
     (experiment_id, tenant_id, learner_id, variant_key, feature_area, session_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      experimentId,
      input.tenantId,
      input.learnerId ?? null,
      input.variantKey,
      input.featureArea,
      input.sessionId ?? null,
      input.metadata ? JSON.stringify(input.metadata) : null,
    ]
  );
  return result.rows[0]!;
}

/**
 * Batch log exposures.
 */
export async function logExposuresBatch(
  pool: Pool,
  exposures: { experimentId: string; input: LogExposureInput }[]
): Promise<number> {
  if (exposures.length === 0) {
    return 0;
  }

  const values: unknown[] = [];
  const placeholders: string[] = [];
  let paramIndex = 1;

  for (const { experimentId, input } of exposures) {
    placeholders.push(
      `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`
    );
    values.push(
      experimentId,
      input.tenantId,
      input.learnerId ?? null,
      input.variantKey,
      input.featureArea,
      input.sessionId ?? null,
      input.metadata ? JSON.stringify(input.metadata) : null
    );
  }

  const result = await pool.query(
    `INSERT INTO experiment_exposures 
     (experiment_id, tenant_id, learner_id, variant_key, feature_area, session_id, metadata)
     VALUES ${placeholders.join(', ')}`,
    values
  );

  return result.rowCount ?? 0;
}

// ════════════════════════════════════════════════════════════════════════════════
// EXPOSURE QUERIES
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Get exposures for an experiment.
 */
export async function listExposures(
  pool: Pool,
  experimentId: string,
  limit = 1000,
  offset = 0
): Promise<ExperimentExposure[]> {
  const result = await pool.query<ExperimentExposure>(
    `SELECT * FROM experiment_exposures 
     WHERE experiment_id = $1 
     ORDER BY exposed_at DESC
     LIMIT $2 OFFSET $3`,
    [experimentId, limit, offset]
  );
  return result.rows;
}

/**
 * Get exposure statistics for an experiment.
 */
export async function getExposureStats(
  pool: Pool,
  experimentId: string,
  experimentKey: string
): Promise<ExposureStats> {
  // Total exposures and unique counts
  const totalsResult = await pool.query<{
    total_exposures: string;
    unique_tenants: string;
    unique_learners: string;
  }>(
    `SELECT 
       COUNT(*) as total_exposures,
       COUNT(DISTINCT tenant_id) as unique_tenants,
       COUNT(DISTINCT learner_id) FILTER (WHERE learner_id IS NOT NULL) as unique_learners
     FROM experiment_exposures 
     WHERE experiment_id = $1`,
    [experimentId]
  );
  const totals = totalsResult.rows[0]!;

  // By variant
  const byVariantResult = await pool.query<{
    variant_key: string;
    exposures: string;
    unique_subjects: string;
  }>(
    `SELECT 
       variant_key,
       COUNT(*) as exposures,
       COUNT(DISTINCT COALESCE(learner_id::text, tenant_id::text)) as unique_subjects
     FROM experiment_exposures 
     WHERE experiment_id = $1
     GROUP BY variant_key
     ORDER BY variant_key`,
    [experimentId]
  );

  // By feature area
  const byFeatureAreaResult = await pool.query<{
    feature_area: string;
    exposures: string;
  }>(
    `SELECT 
       feature_area,
       COUNT(*) as exposures
     FROM experiment_exposures 
     WHERE experiment_id = $1
     GROUP BY feature_area
     ORDER BY exposures DESC`,
    [experimentId]
  );

  return {
    experimentKey,
    totalExposures: parseInt(totals.total_exposures, 10),
    uniqueTenants: parseInt(totals.unique_tenants, 10),
    uniqueLearners: parseInt(totals.unique_learners, 10),
    byVariant: byVariantResult.rows.map((row) => ({
      variantKey: row.variant_key,
      exposures: parseInt(row.exposures, 10),
      uniqueSubjects: parseInt(row.unique_subjects, 10),
    })),
    byFeatureArea: byFeatureAreaResult.rows.map((row) => ({
      featureArea: row.feature_area,
      exposures: parseInt(row.exposures, 10),
    })),
  };
}

/**
 * Check if a subject has been exposed to an experiment.
 */
export async function hasBeenExposed(
  pool: Pool,
  experimentId: string,
  tenantId: string,
  learnerId?: string
): Promise<boolean> {
  if (learnerId) {
    const result = await pool.query(
      `SELECT 1 FROM experiment_exposures 
       WHERE experiment_id = $1 AND tenant_id = $2 AND learner_id = $3
       LIMIT 1`,
      [experimentId, tenantId, learnerId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  const result = await pool.query(
    `SELECT 1 FROM experiment_exposures 
     WHERE experiment_id = $1 AND tenant_id = $2
     LIMIT 1`,
    [experimentId, tenantId]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Get first exposure time for a subject.
 */
export async function getFirstExposureTime(
  pool: Pool,
  experimentId: string,
  tenantId: string,
  learnerId?: string
): Promise<Date | null> {
  const result = await pool.query<{ exposed_at: Date }>(
    `SELECT MIN(exposed_at) as exposed_at FROM experiment_exposures 
     WHERE experiment_id = $1 AND tenant_id = $2 
     ${learnerId ? 'AND learner_id = $3' : ''}`,
    learnerId ? [experimentId, tenantId, learnerId] : [experimentId, tenantId]
  );
  return result.rows[0]?.exposed_at ?? null;
}

/**
 * Delete all exposures for an experiment.
 */
export async function deleteExposuresForExperiment(
  pool: Pool,
  experimentId: string
): Promise<number> {
  const result = await pool.query(`DELETE FROM experiment_exposures WHERE experiment_id = $1`, [
    experimentId,
  ]);
  return result.rowCount ?? 0;
}
