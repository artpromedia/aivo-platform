/**
 * GDPR Data Deletion Orchestrator
 *
 * Coordinates complete data deletion across all microservices.
 * Implements GDPR Article 17 "Right to Erasure" with:
 * - Cross-service cascade deletion
 * - Retry logic with exponential backoff
 * - Audit trail for compliance
 * - Webhook notifications to dependent services
 *
 * @module dsr-svc/services/deletion-orchestrator
 */

import { Pool } from 'pg';
import { EventEmitter } from 'events';
import { DeleteMode, HardDeleteResult } from '../deleter.js';
import { createAuditEntry } from '../repository.js';
import { DsrAuditAction } from '../types.js';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

export interface DeletionTarget {
  service: string;
  endpoint: string;
  priority: number; // Lower = delete first
  required: boolean; // If true, failure aborts the whole deletion
  timeout: number; // ms
}

export interface DeletionStep {
  target: DeletionTarget;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  recordsDeleted?: number;
  retryCount: number;
}

export interface DeletionJob {
  id: string;
  tenantId: string;
  learnerId: string;
  parentId: string;
  dsrRequestId: string;
  mode: DeleteMode;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  steps: DeletionStep[];
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  totalRecordsDeleted: number;
  error?: string;
}

export interface ServiceDeletionResult {
  success: boolean;
  service: string;
  recordsDeleted: number;
  details?: Record<string, number>;
  error?: string;
}

// ════════════════════════════════════════════════════════════════════════════════
// DELETION TARGETS - All services that hold learner data
// ════════════════════════════════════════════════════════════════════════════════

const DELETION_TARGETS: DeletionTarget[] = [
  // Tier 1: Leaf services with no foreign key references
  { service: 'messaging-svc', endpoint: '/internal/delete-learner', priority: 10, required: false, timeout: 30000 },
  { service: 'notify-svc', endpoint: '/internal/delete-learner', priority: 10, required: false, timeout: 30000 },
  { service: 'gamification-svc', endpoint: '/internal/delete-learner', priority: 10, required: false, timeout: 30000 },
  { service: 'analytics-svc', endpoint: '/internal/delete-learner', priority: 10, required: false, timeout: 60000 },

  // Tier 2: AI and content services
  { service: 'ai-orchestrator', endpoint: '/internal/delete-learner', priority: 20, required: true, timeout: 60000 },
  { service: 'homework-helper-svc', endpoint: '/internal/delete-learner', priority: 20, required: false, timeout: 30000 },
  { service: 'focus-svc', endpoint: '/internal/delete-learner', priority: 20, required: false, timeout: 30000 },

  // Tier 3: Learning and assessment data
  { service: 'session-svc', endpoint: '/internal/delete-learner', priority: 30, required: true, timeout: 60000 },
  { service: 'assessment-svc', endpoint: '/internal/delete-learner', priority: 30, required: true, timeout: 60000 },
  { service: 'baseline-svc', endpoint: '/internal/delete-learner', priority: 30, required: false, timeout: 30000 },
  { service: 'goal-svc', endpoint: '/internal/delete-learner', priority: 30, required: false, timeout: 30000 },
  { service: 'learner-model-svc', endpoint: '/internal/delete-learner', priority: 30, required: true, timeout: 60000 },

  // Tier 4: Consent and profile data (delete last)
  { service: 'consent-svc', endpoint: '/internal/delete-learner', priority: 40, required: true, timeout: 30000 },
  { service: 'profile-svc', endpoint: '/internal/delete-learner', priority: 50, required: true, timeout: 30000 },
];

// ════════════════════════════════════════════════════════════════════════════════
// SERVICE DISCOVERY
// ════════════════════════════════════════════════════════════════════════════════

interface ServiceEndpoint {
  host: string;
  port: number;
}

function getServiceEndpoint(service: string): ServiceEndpoint {
  // In production, use Kubernetes service discovery or consul
  // For now, use environment variables or default localhost ports
  const host = process.env[`${service.toUpperCase().replace(/-/g, '_')}_HOST`] || 'localhost';
  const port = parseInt(process.env[`${service.toUpperCase().replace(/-/g, '_')}_PORT`] || '3000', 10);
  return { host, port };
}

// ════════════════════════════════════════════════════════════════════════════════
// DELETION ORCHESTRATOR
// ════════════════════════════════════════════════════════════════════════════════

export class DeletionOrchestrator extends EventEmitter {
  private readonly pool: Pool;
  private readonly maxRetries: number;
  private readonly retryBaseDelay: number;
  private activeJobs: Map<string, DeletionJob> = new Map();

  constructor(pool: Pool, options?: { maxRetries?: number; retryBaseDelay?: number }) {
    super();
    this.pool = pool;
    this.maxRetries = options?.maxRetries ?? 3;
    this.retryBaseDelay = options?.retryBaseDelay ?? 1000;
  }

  /**
   * Orchestrate complete deletion of all learner data across all services
   */
  async orchestrateDeletion(params: {
    dsrRequestId: string;
    tenantId: string;
    learnerId: string;
    parentId: string;
    mode: DeleteMode;
    performedByUserId: string;
  }): Promise<DeletionJob> {
    const jobId = `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Initialize job
    const job: DeletionJob = {
      id: jobId,
      tenantId: params.tenantId,
      learnerId: params.learnerId,
      parentId: params.parentId,
      dsrRequestId: params.dsrRequestId,
      mode: params.mode,
      status: 'pending',
      steps: DELETION_TARGETS.sort((a, b) => a.priority - b.priority).map(target => ({
        target,
        status: 'pending' as const,
        retryCount: 0,
      })),
      createdAt: new Date(),
      totalRecordsDeleted: 0,
    };

    this.activeJobs.set(jobId, job);

    // Start orchestration
    try {
      job.status = 'in_progress';
      job.startedAt = new Date();

      await createAuditEntry(this.pool, params.dsrRequestId, 'STARTED', {
        performedByUserId: params.performedByUserId,
        details: {
          jobId,
          mode: params.mode,
          targetServices: job.steps.map(s => s.target.service),
        },
      });

      // Execute deletion steps by priority
      const priorityGroups = this.groupByPriority(job.steps);

      for (const [_priority, steps] of priorityGroups) {
        // Execute steps in parallel within same priority
        const results = await Promise.allSettled(
          steps.map(step => this.executeStep(job, step, params))
        );

        // Check for critical failures
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const step = steps[i];

          if (result.status === 'rejected' || step.status === 'failed') {
            if (step.target.required) {
              // Critical failure - abort
              job.status = 'failed';
              job.error = `Critical service ${step.target.service} deletion failed: ${step.error}`;

              await createAuditEntry(this.pool, params.dsrRequestId, 'FAILED', {
                performedByUserId: params.performedByUserId,
                details: {
                  jobId,
                  failedService: step.target.service,
                  error: step.error,
                },
              });

              this.emit('job:failed', job);
              return job;
            }
          }
        }
      }

      // All steps completed
      job.status = 'completed';
      job.completedAt = new Date();

      // Calculate total records deleted
      job.totalRecordsDeleted = job.steps.reduce(
        (sum, step) => sum + (step.recordsDeleted ?? 0),
        0
      );

      await createAuditEntry(this.pool, params.dsrRequestId, 'COMPLETED', {
        performedByUserId: params.performedByUserId,
        details: {
          jobId,
          mode: params.mode,
          totalRecordsDeleted: job.totalRecordsDeleted,
          serviceResults: job.steps.map(s => ({
            service: s.target.service,
            status: s.status,
            recordsDeleted: s.recordsDeleted,
          })),
        },
      });

      this.emit('job:completed', job);
      return job;

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';

      await createAuditEntry(this.pool, params.dsrRequestId, 'FAILED', {
        performedByUserId: params.performedByUserId,
        details: {
          jobId,
          error: job.error,
        },
      });

      this.emit('job:failed', job);
      throw error;
    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  /**
   * Execute a single deletion step with retry logic
   */
  private async executeStep(
    job: DeletionJob,
    step: DeletionStep,
    params: { tenantId: string; learnerId: string; parentId: string; mode: DeleteMode }
  ): Promise<void> {
    step.status = 'in_progress';
    step.startedAt = new Date();

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await this.callServiceDeletion(step.target, params);

        if (result.success) {
          step.status = 'completed';
          step.completedAt = new Date();
          step.recordsDeleted = result.recordsDeleted;
          this.emit('step:completed', { job, step, result });
          return;
        } else {
          lastError = new Error(result.error ?? 'Unknown service error');
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
      }

      step.retryCount++;

      if (attempt < this.maxRetries) {
        // Exponential backoff
        const delay = this.retryBaseDelay * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }

    // All retries exhausted
    step.status = 'failed';
    step.completedAt = new Date();
    step.error = lastError?.message ?? 'Max retries exceeded';
    this.emit('step:failed', { job, step, error: step.error });
  }

  /**
   * Call a service's deletion endpoint
   */
  private async callServiceDeletion(
    target: DeletionTarget,
    params: { tenantId: string; learnerId: string; parentId: string; mode: DeleteMode }
  ): Promise<ServiceDeletionResult> {
    const endpoint = getServiceEndpoint(target.service);
    const url = `http://${endpoint.host}:${endpoint.port}${target.endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), target.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Request': 'true',
          'X-Tenant-ID': params.tenantId,
        },
        body: JSON.stringify({
          tenantId: params.tenantId,
          learnerId: params.learnerId,
          parentId: params.parentId,
          mode: params.mode,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          service: target.service,
          recordsDeleted: 0,
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }

      const result = await response.json() as { recordsDeleted?: number; details?: Record<string, number> };
      return {
        success: true,
        service: target.service,
        recordsDeleted: result.recordsDeleted ?? 0,
        details: result.details,
      };

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          service: target.service,
          recordsDeleted: 0,
          error: `Request timeout after ${target.timeout}ms`,
        };
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Group steps by priority for parallel execution
   */
  private groupByPriority(steps: DeletionStep[]): Map<number, DeletionStep[]> {
    const groups = new Map<number, DeletionStep[]>();
    for (const step of steps) {
      const priority = step.target.priority;
      if (!groups.has(priority)) {
        groups.set(priority, []);
      }
      groups.get(priority)!.push(step);
    }
    return new Map([...groups.entries()].sort((a, b) => a[0] - b[0]));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get status of a deletion job
   */
  getJobStatus(jobId: string): DeletionJob | undefined {
    return this.activeJobs.get(jobId);
  }

  /**
   * List all active deletion jobs
   */
  getActiveJobs(): DeletionJob[] {
    return Array.from(this.activeJobs.values());
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// INTERNAL DELETION HANDLER (for other services to implement)
// ════════════════════════════════════════════════════════════════════════════════

export interface InternalDeletionRequest {
  tenantId: string;
  learnerId: string;
  parentId: string;
  mode: DeleteMode;
}

export interface InternalDeletionResponse {
  success: boolean;
  recordsDeleted: number;
  details?: Record<string, number>;
  error?: string;
}

/**
 * Factory for creating internal deletion handlers
 * Services should implement their own deletion logic using this pattern
 */
export function createInternalDeletionHandler(
  serviceName: string,
  deletionFn: (params: InternalDeletionRequest) => Promise<InternalDeletionResponse>
): (req: InternalDeletionRequest) => Promise<InternalDeletionResponse> {
  return async (req: InternalDeletionRequest) => {
    const startTime = Date.now();

    try {
      console.log(JSON.stringify({
        event: 'internal_deletion_started',
        service: serviceName,
        tenantId: req.tenantId,
        learnerId: req.learnerId,
        mode: req.mode,
      }));

      const result = await deletionFn(req);

      console.log(JSON.stringify({
        event: 'internal_deletion_completed',
        service: serviceName,
        tenantId: req.tenantId,
        learnerId: req.learnerId,
        mode: req.mode,
        recordsDeleted: result.recordsDeleted,
        durationMs: Date.now() - startTime,
      }));

      return result;
    } catch (error) {
      console.error(JSON.stringify({
        event: 'internal_deletion_failed',
        service: serviceName,
        tenantId: req.tenantId,
        learnerId: req.learnerId,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: Date.now() - startTime,
      }));

      return {
        success: false,
        recordsDeleted: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };
}

export default DeletionOrchestrator;
