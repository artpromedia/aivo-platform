/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any */
/**
 * Sync Job Processor
 *
 * Background job processor for scheduled and queued sync operations.
 * Uses node-cron for scheduling and implements retry logic with backoff.
 *
 * Features:
 * - Scheduled sync based on provider configuration
 * - Job queue for async processing
 * - Retry with exponential backoff
 * - Dead letter queue for failed jobs
 * - Health monitoring and metrics
 *
 * @author AIVO Platform Team
 */

import { PrismaClient, SisProviderType, SyncStatus } from '@prisma/client';
import cron from 'node-cron';
import { DeltaSyncEngine, SyncEntityType, SyncStats, createEmptySyncStats } from '../sync/delta-sync-engine.js';
import { ProviderFactory, EnvSecretsResolver } from '../providers/factory.js';
import { WebhookHandlerService } from '../webhooks/webhook-handler.service.js';
import type { FieldMapping } from '../providers/types.js';

/**
 * Job status
 */
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';

/**
 * Sync job definition
 */
export interface SyncJob {
  id: string;
  tenantId: string;
  providerId: string;
  entityTypes: SyncEntityType[];
  priority: 'high' | 'normal' | 'low';
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  stats?: SyncStats;
}

/**
 * Processor configuration
 */
export interface SyncJobProcessorConfig {
  maxConcurrentJobs: number;
  jobTimeoutMs: number;
  retryDelayMs: number;
  maxRetries: number;
  enableScheduler: boolean;
}

/**
 * Sync Job Processor
 *
 * Manages background sync job processing and scheduling.
 */
export class SyncJobProcessor {
  private prisma: PrismaClient;
  private deltaSyncEngine: DeltaSyncEngine;
  private providerFactory: ProviderFactory;
  private webhookHandler: WebhookHandlerService;
  private config: SyncJobProcessorConfig;
  private isRunning: boolean = false;
  private activeJobs: Map<string, SyncJob> = new Map();
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map();

  constructor(
    prisma: PrismaClient,
    config: Partial<SyncJobProcessorConfig> = {}
  ) {
    this.prisma = prisma;
    this.config = {
      maxConcurrentJobs: 5,
      jobTimeoutMs: 30 * 60 * 1000, // 30 minutes
      retryDelayMs: 60 * 1000, // 1 minute
      maxRetries: 3,
      enableScheduler: true,
      ...config,
    };

    const secretsResolver = new EnvSecretsResolver();
    this.providerFactory = new ProviderFactory(prisma, secretsResolver);
    this.deltaSyncEngine = new DeltaSyncEngine(prisma);
    this.webhookHandler = new WebhookHandlerService(
      prisma,
      this.deltaSyncEngine,
      this.providerFactory
    );
  }

  /**
   * Start the job processor
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[SyncJobProcessor] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[SyncJobProcessor] Starting job processor');

    // Load webhook configurations
    await this.webhookHandler.loadConfigs();

    // Set up scheduled syncs
    if (this.config.enableScheduler) {
      await this.initializeScheduledSyncs();
    }

    // Start processing queue
    this.processQueue().catch((error: unknown) => {
      console.error('[SyncJobProcessor] Queue processing error', error);
    });

    console.log('[SyncJobProcessor] Job processor started');
  }

  /**
   * Stop the job processor
   */
  async stop(): Promise<void> {
    this.isRunning = false;

    // Stop all scheduled tasks
    for (const [id, task] of this.scheduledTasks) {
      task.stop();
      console.log(`[SyncJobProcessor] Stopped scheduled task: ${id}`);
    }
    this.scheduledTasks.clear();

    // Wait for active jobs to complete (with timeout)
    const timeout = 30000;
    const startTime = Date.now();

    while (this.activeJobs.size > 0 && Date.now() - startTime < timeout) {
      await this.delay(1000);
    }

    if (this.activeJobs.size > 0) {
      console.warn('[SyncJobProcessor] Forcing stop with active jobs', {
        activeJobCount: this.activeJobs.size,
      });
    }

    console.log('[SyncJobProcessor] Job processor stopped');
  }

  /**
   * Queue a sync job
   */
  async queueJob(
    tenantId: string,
    providerId: string,
    entityTypes?: SyncEntityType[],
    priority: 'high' | 'normal' | 'low' = 'normal',
    scheduledAt?: Date
  ): Promise<string> {
    const job = await this.prisma.sisSyncQueue.create({
      data: {
        tenantId,
        providerId,
        entityType: 'SCHOOL', // Using existing enum
        operation: 'delta_sync',
        payload: JSON.stringify({
          entityTypes: entityTypes || [
            'org', 'teacher', 'student', 'parent',
            'class', 'enrollment', 'relationship', 'term',
          ],
          priority,
        }),
        processAt: scheduledAt || new Date(),
        syncRunId: 'pending',
      },
    });

    console.log('[SyncJobProcessor] Job queued', {
      jobId: job.id,
      tenantId,
      providerId,
      priority,
    });

    return job.id;
  }

  /**
   * Initialize scheduled syncs from provider configurations
   */
  private async initializeScheduledSyncs(): Promise<void> {
    const providers = await this.prisma.sisProvider.findMany({
      where: {
        enabled: true,
        syncSchedule: { not: null },
      },
    });

    for (const provider of providers) {
      if (provider.syncSchedule) {
        this.scheduleProviderSync(
          provider.tenantId,
          provider.id,
          provider.syncSchedule
        );
      }
    }

    console.log('[SyncJobProcessor] Initialized scheduled syncs', {
      count: providers.length,
    });
  }

  /**
   * Schedule sync for a provider
   */
  scheduleProviderSync(
    tenantId: string,
    providerId: string,
    cronExpression: string
  ): void {
    const taskId = `${tenantId}:${providerId}`;

    // Stop existing task if any
    const existingTask = this.scheduledTasks.get(taskId);
    if (existingTask) {
      existingTask.stop();
    }

    // Validate cron expression
    if (!cron.validate(cronExpression)) {
      console.error('[SyncJobProcessor] Invalid cron expression', {
        taskId,
        cronExpression,
      });
      return;
    }

    // Create new scheduled task
    const task = cron.schedule(cronExpression, async () => {
      console.log('[SyncJobProcessor] Running scheduled sync', {
        tenantId,
        providerId,
      });

      try {
        await this.queueJob(tenantId, providerId, undefined, 'normal');
      } catch (error) {
        console.error('[SyncJobProcessor] Failed to queue scheduled sync', {
          tenantId,
          providerId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    this.scheduledTasks.set(taskId, task);

    console.log('[SyncJobProcessor] Scheduled provider sync', {
      taskId,
      cronExpression,
    });
  }

  /**
   * Unschedule sync for a provider
   */
  unscheduleProviderSync(tenantId: string, providerId: string): void {
    const taskId = `${tenantId}:${providerId}`;
    const task = this.scheduledTasks.get(taskId);

    if (task) {
      task.stop();
      this.scheduledTasks.delete(taskId);
      console.log('[SyncJobProcessor] Unscheduled provider sync', { taskId });
    }
  }

  /**
   * Process the job queue
   */
  private async processQueue(): Promise<void> {
    while (this.isRunning) {
      try {
        // Check if we can take more jobs
        if (this.activeJobs.size >= this.config.maxConcurrentJobs) {
          await this.delay(1000);
          continue;
        }

        // Get next job from queue
        const queueItem = await this.prisma.sisSyncQueue.findFirst({
          where: {
            processAt: { lte: new Date() },
            attempts: { lt: this.config.maxRetries },
          },
          orderBy: [
            { attempts: 'asc' },
            { processAt: 'asc' },
          ],
        });

        if (!queueItem) {
          await this.delay(5000); // No jobs, wait a bit
          continue;
        }

        // Process the job
        this.processJob(queueItem).catch((error: unknown) => {
          console.error('[SyncJobProcessor] Job processing error', {
            jobId: queueItem.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        });
      } catch (error: unknown) {
        console.error('[SyncJobProcessor] Queue processing error', error);
        await this.delay(5000);
      }
    }
  }

  /**
   * Process a single job
   */
  private async processJob(queueItem: any): Promise<void> {
    const jobId = queueItem.id;
    const tenantId = queueItem.tenantId;
    const providerId = queueItem.providerId;

    const job: SyncJob = {
      id: jobId,
      tenantId,
      providerId,
      entityTypes: JSON.parse(queueItem.payload).entityTypes,
      priority: JSON.parse(queueItem.payload).priority || 'normal',
      status: 'processing',
      attempts: queueItem.attempts + 1,
      maxAttempts: this.config.maxRetries,
      createdAt: queueItem.createdAt,
      scheduledAt: queueItem.processAt,
      startedAt: new Date(),
    };

    this.activeJobs.set(jobId, job);

    // Update attempts count
    await this.prisma.sisSyncQueue.update({
      where: { id: jobId },
      data: { attempts: job.attempts },
    });

    console.log('[SyncJobProcessor] Processing job', {
      jobId,
      tenantId,
      providerId,
      attempt: job.attempts,
    });

    // Create sync run record
    const syncRun = await this.prisma.sisSyncRun.create({
      data: {
        tenantId,
        providerId,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        isManual: false,
      },
    });

    try {
      // Get provider
      const provider = await this.providerFactory.getProvider(tenantId, providerId);

      if (!provider) {
        throw new Error('Provider not found or disabled');
      }

      // Execute delta sync
      const stats = await this.deltaSyncEngine.executeDeltaSync({
        tenantId,
        providerId,
        provider,
        batchSize: 500,
        maxRetries: 3,
        conflictResolution: 'source_wins',
        enabledEntityTypes: job.entityTypes,
        fieldMappings: {} as Record<SyncEntityType, FieldMapping[]>,
        webhookEnabled: false,
      });

      // Update job status
      job.status = 'completed';
      job.completedAt = new Date();
      job.stats = stats;

      // Update sync run
      await this.prisma.sisSyncRun.update({
        where: { id: syncRun.id },
        data: {
          status: 'SUCCESS',
          completedAt: new Date(),
          statsJson: JSON.stringify(stats),
        },
      });

      // Remove from queue
      await this.prisma.sisSyncQueue.delete({
        where: { id: jobId },
      });

      // Update provider last sync time
      await this.prisma.sisProvider.update({
        where: { id: providerId },
        data: { lastSyncAt: new Date() },
      });

      console.log('[SyncJobProcessor] Job completed successfully', {
        jobId,
        tenantId,
        providerId,
        stats,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      job.status = job.attempts >= job.maxAttempts ? 'failed' : 'retrying';
      job.error = errorMessage;

      // Update sync run
      await this.prisma.sisSyncRun.update({
        where: { id: syncRun.id },
        data: {
          status: 'FAILURE',
          completedAt: new Date(),
          errorMessage,
        },
      });

      if (job.attempts >= job.maxAttempts) {
        // Move to dead letter queue (mark with high attempts)
        await this.prisma.sisSyncQueue.update({
          where: { id: jobId },
          data: {
            lastError: errorMessage,
            attempts: job.maxAttempts,
          },
        });

        console.error('[SyncJobProcessor] Job failed permanently', {
          jobId,
          tenantId,
          providerId,
          error: errorMessage,
        });
      } else {
        // Schedule retry with exponential backoff
        const retryDelay = this.config.retryDelayMs * Math.pow(2, job.attempts - 1);
        const retryAt = new Date(Date.now() + retryDelay);

        await this.prisma.sisSyncQueue.update({
          where: { id: jobId },
          data: {
            processAt: retryAt,
            lastError: errorMessage,
          },
        });

        console.warn('[SyncJobProcessor] Job failed, will retry', {
          jobId,
          tenantId,
          providerId,
          attempt: job.attempts,
          retryAt,
        });
      }
    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  /**
   * Retry failed jobs from dead letter queue
   */
  async retryFailedJobs(): Promise<number> {
    const failedJobs = await this.prisma.sisSyncQueue.findMany({
      where: {
        attempts: { gte: this.config.maxRetries },
      },
    });

    let retried = 0;

    for (const job of failedJobs) {
      await this.prisma.sisSyncQueue.update({
        where: { id: job.id },
        data: {
          attempts: 0,
          processAt: new Date(),
          lastError: null,
        },
      });
      retried++;
    }

    console.log('[SyncJobProcessor] Retried failed jobs', { count: retried });
    return retried;
  }

  /**
   * Get processor status
   */
  getStatus(): {
    isRunning: boolean;
    activeJobs: number;
    scheduledTasks: number;
  } {
    return {
      isRunning: this.isRunning,
      activeJobs: this.activeJobs.size,
      scheduledTasks: this.scheduledTasks.size,
    };
  }

  /**
   * Get active job details
   */
  getActiveJobs(): SyncJob[] {
    return Array.from(this.activeJobs.values());
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create and start job processor singleton
 */
let processorInstance: SyncJobProcessor | null = null;

export async function createJobProcessor(
  prisma: PrismaClient,
  config?: Partial<SyncJobProcessorConfig>
): Promise<SyncJobProcessor> {
  if (!processorInstance) {
    processorInstance = new SyncJobProcessor(prisma, config);
    await processorInstance.start();
  }
  return processorInstance;
}

export function getJobProcessor(): SyncJobProcessor | null {
  return processorInstance;
}
