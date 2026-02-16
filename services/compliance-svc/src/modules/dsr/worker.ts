/**
 * DSR Worker – Background job processor for Data Subject Requests
 *
 * Processes export and delete requests in the background.
 * Can be run as a standalone process or integrated with a job queue.
 *
 * Ported from services/dsr-svc during Sprint-2 consolidation.
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
  storagePrefix: string;
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

  start(): void {
    if (this.running) {
      console.warn('[DsrWorker] Worker is already running');
      return;
    }
    this.running = true;
    console.log(`[DsrWorker] Starting worker ${this.config.workerId}`);
    void this.poll();
  }

  stop(): void {
    console.log(`[DsrWorker] Stopping worker ${this.config.workerId}`);
    this.running = false;
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
      this.pollTimeout = null;
    }
  }

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

    this.scheduleNextPoll();
  }

  private scheduleNextPoll(): void {
    if (!this.running) return;
    this.pollTimeout = setTimeout(() => {
      void this.poll();
    }, this.config.pollIntervalMs);
  }

  private async processJob(job: DsrJob): Promise<void> {
    const request = await getDsrRequestById(this.pool, job.dsr_request_id, job.tenant_id);
    if (!request) {
      console.error(`[DsrWorker] Request ${job.dsr_request_id} not found`);
      await failJob(this.pool, job.id, 'REQUEST_NOT_FOUND', 'DSR request not found');
      return;
    }

    try {
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

  private async processExport(job: DsrJob, request: DsrRequest): Promise<void> {
    await updateJobProgress(this.pool, job.id, 20, 'Building export bundle');

    const bundle = await buildExportBundle(this.pool, {
      tenantId: request.tenant_id,
      parentId: request.requested_by_user_id,
      learnerId: request.learner_id,
      requestId: request.id,
    });

    await updateJobProgress(this.pool, job.id, 60, 'Serializing export data');

    const exportJson = JSON.stringify(bundle, null, 2);
    const exportBuffer = Buffer.from(exportJson, 'utf-8');

    const storageUri = `${this.config.storagePrefix}/${request.tenant_id}/${request.id}/export.json`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.config.exportExpirationDays);

    await updateJobProgress(this.pool, job.id, 80, 'Storing export file');

    await createExportArtifact(this.pool, {
      dsrRequestId: request.id,
      tenantId: request.tenant_id,
      fileType: 'JSON',
      fileName: `learner-export-${request.learner_id}.json`,
      fileSizeBytes: exportBuffer.length,
      storageUri,
      expiresAt,
    });

    await completeJob(this.pool, job.id);
    await markRequestCompleted(this.pool, request.id, request.tenant_id, storageUri);

    console.log(`[DsrWorker] Export completed for request ${request.id}`);
  }

  private async processDelete(job: DsrJob, request: DsrRequest): Promise<void> {
    await updateJobProgress(this.pool, job.id, 30, 'De-identifying learner data');

    await deidentifyLearner(this.pool, {
      tenantId: request.tenant_id,
      parentId: request.requested_by_user_id,
      learnerId: request.learner_id,
    });

    await updateJobProgress(this.pool, job.id, 90, 'Finalizing deletion');

    await completeJob(this.pool, job.id);
    await markRequestCompleted(this.pool, request.id, request.tenant_id);

    console.log(`[DsrWorker] Delete completed for request ${request.id}`);
  }

  private async handleJobError(
    job: DsrJob,
    request: DsrRequest,
    err: unknown,
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
      console.log(
        `[DsrWorker] Job ${job.id} would be retried (${job.retry_count + 1}/${job.max_retries})`,
      );
    }

    await failJob(this.pool, job.id, errorCode, errorMessage);
    await markRequestFailed(this.pool, request.id, request.tenant_id, errorMessage);
    console.error(`[DsrWorker] Job ${job.id} permanently failed`);
  }
}

/**
 * Create a DSR worker with default configuration
 */
export function createDsrWorker(
  pool: Pool,
  config?: Partial<WorkerConfig>,
): DsrWorker {
  return new DsrWorker(pool, config);
}
