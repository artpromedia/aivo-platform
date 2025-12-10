/**
 * Experiment Repository
 *
 * Database operations for experiments and variants.
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */

import type { Pool } from 'pg';

import type {
  Experiment,
  ExperimentVariant,
  ExperimentWithVariants,
  CreateExperimentInput,
  ExperimentStatus,
} from './types.js';

// ════════════════════════════════════════════════════════════════════════════════
// EXPERIMENT QUERIES
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Get experiment by ID.
 */
export async function getExperimentById(pool: Pool, id: string): Promise<Experiment | null> {
  const result = await pool.query<Experiment>(`SELECT * FROM experiments WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

/**
 * Get experiment by key.
 */
export async function getExperimentByKey(pool: Pool, key: string): Promise<Experiment | null> {
  const result = await pool.query<Experiment>(`SELECT * FROM experiments WHERE key = $1`, [key]);
  return result.rows[0] ?? null;
}

/**
 * Get all experiments with optional status filter.
 */
export async function listExperiments(
  pool: Pool,
  status?: ExperimentStatus
): Promise<Experiment[]> {
  if (status) {
    const result = await pool.query<Experiment>(
      `SELECT * FROM experiments WHERE status = $1 ORDER BY created_at DESC`,
      [status]
    );
    return result.rows;
  }

  const result = await pool.query<Experiment>(`SELECT * FROM experiments ORDER BY created_at DESC`);
  return result.rows;
}

/**
 * Get all running experiments.
 */
export async function getRunningExperiments(pool: Pool): Promise<Experiment[]> {
  const now = new Date();
  const result = await pool.query<Experiment>(
    `SELECT * FROM experiments 
     WHERE status = 'RUNNING'
     AND (start_at IS NULL OR start_at <= $1)
     AND (end_at IS NULL OR end_at > $1)
     ORDER BY created_at DESC`,
    [now]
  );
  return result.rows;
}

/**
 * Create a new experiment with variants.
 */
export async function createExperiment(
  pool: Pool,
  input: CreateExperimentInput,
  createdByUserId?: string
): Promise<ExperimentWithVariants> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Insert experiment
    const experimentResult = await client.query<Experiment>(
      `INSERT INTO experiments (key, name, description, scope, status, config_json, start_at, end_at, created_by_user_id)
       VALUES ($1, $2, $3, $4, 'DRAFT', $5, $6, $7, $8)
       RETURNING *`,
      [
        input.key,
        input.name,
        input.description ?? null,
        input.scope,
        JSON.stringify(input.config ?? {}),
        input.startAt ? new Date(input.startAt) : null,
        input.endAt ? new Date(input.endAt) : null,
        createdByUserId ?? null,
      ]
    );
    const experiment = experimentResult.rows[0]!;

    // Insert variants
    const variants: ExperimentVariant[] = [];
    for (const variantInput of input.variants) {
      const variantResult = await client.query<ExperimentVariant>(
        `INSERT INTO experiment_variants (experiment_id, key, allocation, config_json)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [
          experiment.id,
          variantInput.key,
          variantInput.allocation,
          JSON.stringify(variantInput.config ?? {}),
        ]
      );
      const variant = variantResult.rows[0];
      if (variant) variants.push(variant);
    }

    await client.query('COMMIT');

    return { ...experiment, variants } as ExperimentWithVariants;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Update experiment status.
 */
export async function updateExperimentStatus(
  pool: Pool,
  id: string,
  status: ExperimentStatus
): Promise<Experiment | null> {
  const result = await pool.query<Experiment>(
    `UPDATE experiments 
     SET status = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [status, id]
  );
  return result.rows[0] ?? null;
}

/**
 * Delete an experiment (only if DRAFT).
 */
export async function deleteExperiment(pool: Pool, id: string): Promise<boolean> {
  const result = await pool.query(`DELETE FROM experiments WHERE id = $1 AND status = 'DRAFT'`, [
    id,
  ]);
  return (result.rowCount ?? 0) > 0;
}

// ════════════════════════════════════════════════════════════════════════════════
// VARIANT QUERIES
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Get variants for an experiment.
 */
export async function getVariantsByExperimentId(
  pool: Pool,
  experimentId: string
): Promise<ExperimentVariant[]> {
  const result = await pool.query<ExperimentVariant>(
    `SELECT * FROM experiment_variants WHERE experiment_id = $1 ORDER BY key`,
    [experimentId]
  );
  return result.rows;
}

/**
 * Get experiment with variants by key.
 */
export async function getExperimentWithVariants(
  pool: Pool,
  key: string
): Promise<ExperimentWithVariants | null> {
  const experiment = await getExperimentByKey(pool, key);
  if (!experiment) {
    return null;
  }

  const variants = await getVariantsByExperimentId(pool, experiment.id);
  return { ...experiment, variants };
}

/**
 * Get all running experiments with variants.
 */
export async function getRunningExperimentsWithVariants(
  pool: Pool
): Promise<ExperimentWithVariants[]> {
  const experiments = await getRunningExperiments(pool);

  const results: ExperimentWithVariants[] = [];
  for (const experiment of experiments) {
    const variants = await getVariantsByExperimentId(pool, experiment.id);
    results.push({ ...experiment, variants });
  }

  return results;
}
