/**
 * ETL Logger
 *
 * Structured logging for ETL jobs with job run tracking.
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

import { randomUUID } from 'crypto';

import { getWarehousePool, withTransaction } from './db.js';
import type { JobName, JobStatus, JobResult, ETLLogger } from './types.js';

// ══════════════════════════════════════════════════════════════════════════════
// LOGGER IMPLEMENTATION
// ══════════════════════════════════════════════════════════════════════════════

export function createLogger(jobName: JobName): ETLLogger {
  const prefix = `[ETL:${jobName}]`;

  return {
    info: (message: string, data?: Record<string, unknown>) => {
      console.log(
        `${new Date().toISOString()} ${prefix} INFO: ${message}`,
        data ? JSON.stringify(data) : ''
      );
    },
    warn: (message: string, data?: Record<string, unknown>) => {
      console.warn(
        `${new Date().toISOString()} ${prefix} WARN: ${message}`,
        data ? JSON.stringify(data) : ''
      );
    },
    error: (message: string, data?: Record<string, unknown>) => {
      console.error(
        `${new Date().toISOString()} ${prefix} ERROR: ${message}`,
        data ? JSON.stringify(data) : ''
      );
    },
    debug: (message: string, data?: Record<string, unknown>) => {
      if (process.env.ETL_DEBUG === 'true') {
        console.debug(
          `${new Date().toISOString()} ${prefix} DEBUG: ${message}`,
          data ? JSON.stringify(data) : ''
        );
      }
    },
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// JOB RUN TRACKING
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Record the start of an ETL job run.
 */
export async function recordJobStart(jobName: JobName, targetDate: Date | null): Promise<string> {
  const pool = getWarehousePool();
  const runId = randomUUID();

  await pool.query(
    `
    INSERT INTO etl_job_runs (
      id, job_name, run_date, target_date, status, 
      rows_processed, rows_inserted, rows_updated, rows_deleted,
      duration_ms, started_at
    ) VALUES ($1, $2, CURRENT_DATE, $3, 'RUNNING', 0, 0, 0, 0, 0, NOW())
    `,
    [runId, jobName, targetDate?.toISOString().split('T')[0] ?? null]
  );

  return runId;
}

/**
 * Record the completion of an ETL job run.
 */
export async function recordJobCompletion(runId: string, result: JobResult): Promise<void> {
  const pool = getWarehousePool();

  await pool.query(
    `
    UPDATE etl_job_runs SET
      status = $2,
      rows_processed = $3,
      rows_inserted = $4,
      rows_updated = $5,
      rows_deleted = $6,
      duration_ms = $7,
      error_message = $8,
      completed_at = NOW()
    WHERE id = $1
    `,
    [
      runId,
      result.status,
      result.rowsProcessed,
      result.rowsInserted,
      result.rowsUpdated,
      result.rowsDeleted,
      result.durationMs,
      result.errorMessage ?? null,
    ]
  );
}

/**
 * Check if a job has already run successfully for a target date.
 */
export async function hasJobRunForDate(jobName: JobName, targetDate: Date): Promise<boolean> {
  const pool = getWarehousePool();

  const result = await pool.query(
    `
    SELECT 1 FROM etl_job_runs
    WHERE job_name = $1
      AND target_date = $2::date
      AND status = 'SUCCESS'
    LIMIT 1
    `,
    [jobName, targetDate.toISOString().split('T')[0]]
  );

  return (result.rowCount ?? 0) > 0;
}

/**
 * Get recent job runs for monitoring.
 */
export async function getRecentJobRuns(limit = 50): Promise<
  {
    id: string;
    jobName: string;
    runDate: Date;
    targetDate: Date | null;
    status: JobStatus;
    rowsProcessed: number;
    durationMs: number;
    errorMessage: string | null;
    startedAt: Date;
    completedAt: Date | null;
  }[]
> {
  const pool = getWarehousePool();

  const result = await pool.query(
    `
    SELECT 
      id,
      job_name as "jobName",
      run_date as "runDate",
      target_date as "targetDate",
      status,
      rows_processed as "rowsProcessed",
      duration_ms as "durationMs",
      error_message as "errorMessage",
      started_at as "startedAt",
      completed_at as "completedAt"
    FROM etl_job_runs
    ORDER BY started_at DESC
    LIMIT $1
    `,
    [limit]
  );

  return result.rows as {
    id: string;
    jobName: string;
    runDate: Date;
    targetDate: Date | null;
    status: JobStatus;
    rowsProcessed: number;
    durationMs: number;
    errorMessage: string | null;
    startedAt: Date;
    completedAt: Date | null;
  }[];
}

// ══════════════════════════════════════════════════════════════════════════════
// JOB WRAPPER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Wrap an ETL job function with logging and run tracking.
 */
export async function runJob<T extends JobResult>(
  jobName: JobName,
  targetDate: Date | null,
  force: boolean,
  jobFn: () => Promise<T>
): Promise<T> {
  const logger = createLogger(jobName);
  const startTime = Date.now();

  // Check if already run (unless forced)
  if (!force && targetDate) {
    const alreadyRun = await hasJobRunForDate(jobName, targetDate);
    if (alreadyRun) {
      logger.info('Job already completed for target date, skipping', {
        targetDate: targetDate.toISOString(),
      });
      return {
        jobName,
        status: 'SKIPPED',
        rowsProcessed: 0,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsDeleted: 0,
        durationMs: 0,
      } as T;
    }
  }

  // Record start
  let runId: string;
  try {
    runId = await recordJobStart(jobName, targetDate);
  } catch (err) {
    // Job tracking table might not exist yet - continue anyway
    logger.warn('Could not record job start (etl_job_runs table may not exist)', {
      error: String(err),
    });
    runId = '';
  }

  logger.info('Starting job', { targetDate: targetDate?.toISOString(), force });

  try {
    const result = await jobFn();
    const durationMs = Date.now() - startTime;

    const finalResult = { ...result, durationMs };

    logger.info('Job completed successfully', {
      rowsProcessed: result.rowsProcessed,
      rowsInserted: result.rowsInserted,
      rowsUpdated: result.rowsUpdated,
      durationMs,
    });

    // Record completion
    if (runId) {
      try {
        await recordJobCompletion(runId, finalResult);
      } catch (err) {
        logger.warn('Could not record job completion', { error: String(err) });
      }
    }

    return finalResult;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error('Job failed', { error: errorMessage, durationMs });

    const failedResult: JobResult = {
      jobName,
      status: 'FAILED',
      rowsProcessed: 0,
      rowsInserted: 0,
      rowsUpdated: 0,
      rowsDeleted: 0,
      durationMs,
      errorMessage,
    };

    // Record failure
    if (runId) {
      try {
        await recordJobCompletion(runId, failedResult);
      } catch (err) {
        logger.warn('Could not record job failure', { error: String(err) });
      }
    }

    throw error;
  }
}
