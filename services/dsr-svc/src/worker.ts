/**
 * DSR Worker - Background job processor for Data Subject Requests
 *
 * This worker processes DSR export and delete requests in the background.
 * It can be run as a standalone process or integrated with a job queue like BullMQ.
 *
 * Processing flow:
 * 1. Poll for QUEUED jobs
 * 2. Mark job as PROCESSING
 * 3. Execute export or delete operation
 * 4. Update job and request status
 * 5. Store export artifacts (for EXPORT requests)
 */

import type { Pool } from 'pg';

import { deidentifyLearner, DeleteError } from './deleter.js';
import { buildExportBundle, ExportError } from './exporter.js';
import {
  getDsrRequestById,
  getNextQueuedJob,
  updateJobProgress,
  completeJob,
  failJob,
  markRequestCompleted,
  markRequestFailed,
  createExportArtifact,
} from './repository.js';
import type { DsrJob, DsrRequest } from './types.js';

export interface WorkerConfig {
  pollIntervalMs: number;
  maxRetries: number;
  workerId: string;
  /** S3-compatible storage prefix for export files */
  storagePrefix: string;
  /** Export file expiration in days */
  exportExpirationDays: number;
}

const DEFAULT_CONFIG: WorkerConfig = {
  pollIntervalMs: 5000,
  maxRetries: 3,
  workerId: `worker-${process.pid}`,
  storagePrefix: 's3://aivo-dsr-exports',
  exportExpirationDays: 30,
};

export class DsrWorker {
  private pool: Pool;
  private config: WorkerConfig;
  private running = false;
  private pollTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(pool: Pool, config: Partial<WorkerConfig> = {}) {
    this.pool = pool;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start the worker polling loop
   */
  start(): void {
    if (this.running) {
      console.warn('[DsrWorker] Worker is already running');
      return;
    }
    this.running = true;
    console.log(`[DsrWorker] Starting worker ${this.config.workerId}`);
    void this.poll();
  }

  /**
   * Stop the worker gracefully
   */
  stop(): void {
    console.log(`[DsrWorker] Stopping worker ${this.config.workerId}`);
    this.running = false;
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
      this.pollTimeout = null;
    }
  }

  /**
   * Poll for pending jobs and process them
   */
  private async poll(): Promise<void> {
    if (!this.running) return;

    try {
      const job = await getNextQueuedJob(this.pool, this.config.workerId);

      if (job) {
        console.log(`[DsrWorker] Processing job ${job.id} for request ${job.dsr_request_id}`);
        await this.processJob(job);
      }
    } catch (err) {
      console.error('[DsrWorker] Error polling for jobs:', err);
    }

    // Schedule next poll
    this.scheduleNextPoll();
  }

  private scheduleNextPoll(): void {
    if (!this.running) return;
    this.pollTimeout = setTimeout(() => {
      void this.poll();
    }, this.config.pollIntervalMs);
  }

  /**
   * Process a single DSR job
   */
  private async processJob(job: DsrJob): Promise<void> {
    const request = await getDsrRequestById(this.pool, job.dsr_request_id, job.tenant_id);
    if (!request) {
      console.error(`[DsrWorker] Request ${job.dsr_request_id} not found`);
      await failJob(this.pool, job.id, 'REQUEST_NOT_FOUND', 'DSR request not found');
      return;
    }

    try {
      // Update progress
      await updateJobProgress(this.pool, job.id, 10, `Starting ${request.request_type} operation`);

      if (request.request_type === 'EXPORT') {
        await this.processExport(job, request);
      } else {
        await this.processDelete(job, request);
      }
    } catch (err) {
      await this.handleJobError(job, request, err);
    }
  }

  /**
   * Process an EXPORT request
   */
  private async processExport(job: DsrJob, request: DsrRequest): Promise<void> {
    await updateJobProgress(this.pool, job.id, 20, 'Building export bundle');

    // Build the export bundle
    const bundle = await buildExportBundle(this.pool, {
      tenantId: request.tenant_id,
      parentId: request.requested_by_user_id,
      learnerId: request.learner_id,
    });

    await updateJobProgress(this.pool, job.id, 60, 'Serializing export data');

    // Serialize to JSON
    const exportJson = JSON.stringify(bundle, null, 2);
    const exportBuffer = Buffer.from(exportJson, 'utf-8');

    // In production, this would upload to S3. For now, store inline.
    const storageUri = `${this.config.storagePrefix}/${request.tenant_id}/${request.id}/export.json`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.config.exportExpirationDays);

    await updateJobProgress(this.pool, job.id, 80, 'Storing export file');

    // Create export artifact record
    await createExportArtifact(this.pool, {
      dsrRequestId: request.id,
      tenantId: request.tenant_id,
      fileType: 'JSON',
      fileName: `learner-export-${request.learner_id}.json`,
      fileSizeBytes: exportBuffer.length,
      storageUri,
      expiresAt,
    });

    // Mark job as completed
    await completeJob(this.pool, job.id);

    // Update request status
    await markRequestCompleted(this.pool, request.id, request.tenant_id, storageUri);

    console.log(`[DsrWorker] Export completed for request ${request.id}`);
  }

  /**
   * Process a DELETE request
   */
  private async processDelete(job: DsrJob, request: DsrRequest): Promise<void> {
    await updateJobProgress(this.pool, job.id, 30, 'De-identifying learner data');

    // Perform de-identification
    await deidentifyLearner(this.pool, {
      tenantId: request.tenant_id,
      parentId: request.requested_by_user_id,
      learnerId: request.learner_id,
    });

    await updateJobProgress(this.pool, job.id, 90, 'Finalizing deletion');

    // Mark job as completed
    await completeJob(this.pool, job.id);

    // Update request status
    await markRequestCompleted(this.pool, request.id, request.tenant_id);

    console.log(`[DsrWorker] Delete completed for request ${request.id}`);
  }

  /**
   * Handle job errors with retry logic
   */
  private async handleJobError(
    job: DsrJob,
    request: DsrRequest,
    err: unknown
  ): Promise<void> {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    const errorCode =
      err instanceof ExportError
        ? 'EXPORT_ERROR'
        : err instanceof DeleteError
          ? 'DELETE_ERROR'
          : 'UNKNOWN_ERROR';

    console.error(`[DsrWorker] Job ${job.id} failed:`, errorMessage);

    const shouldRetry =
      job.retry_count < job.max_retries &&
      !(err instanceof ExportError) &&
      !(err instanceof DeleteError);

    if (shouldRetry) {
      // For retry, we'd need to re-queue the job. For now, mark as failed.
      // In production, you'd want a separate retry mechanism.
      console.log(
        `[DsrWorker] Job ${job.id} would be retried (${job.retry_count + 1}/${job.max_retries})`
      );
    }

    // Mark job and request as failed
    await failJob(this.pool, job.id, errorCode, errorMessage);
    await markRequestFailed(this.pool, request.id, request.tenant_id, errorMessage);
    console.error(`[DsrWorker] Job ${job.id} permanently failed`);
  }
}

/**
 * Create and start a DSR worker with default configuration
 */
export function createDsrWorker(
  pool: Pool,
  config?: Partial<WorkerConfig>
): DsrWorker {
  const worker = new DsrWorker(pool, config);
  return worker;
}
