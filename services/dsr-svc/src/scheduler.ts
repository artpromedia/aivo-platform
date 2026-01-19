/**
 * DSR Grace Period Scheduler
 *
 * Handles automatic processing of DSR requests:
 * - Processes deletion requests when grace period ends
 * - Sends grace period reminder notifications
 * - Cleans up expired export artifacts
 * - Permanently purges soft-deleted records after retention period
 *
 * @author AIVO Platform Team
 */

import type { Pool } from 'pg';

import { deidentifyLearner, DeleteError } from './deleter.js';
import {
  getDeletionRequestsReadyForProcessing,
  getRequestsNeedingGracePeriodReminder,
  getExpiredArtifacts,
  updateRequestStatus,
  markRequestCompleted,
  markRequestFailed,
  createAuditEntry,
  recordNotification,
  deleteArtifact,
} from './repository.js';
import { DeletionOrchestrator } from './services/deletion-orchestrator.js';
import { sendCompletionNotification } from './services/notification-service.js';
import type { DsrRequest } from './types.js';
import { DSR_CONFIG } from './types.js';

// Scheduler interval in milliseconds (check every 5 minutes)
const SCHEDULER_INTERVAL_MS = 5 * 60 * 1000;

// Store interval reference for cleanup
let schedulerInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Process deletion requests that are past their grace period
 */
async function processReadyDeletions(pool: Pool): Promise<void> {
  try {
    const readyRequests = await getDeletionRequestsReadyForProcessing(pool);

    for (const request of readyRequests) {
      await processSingleDeletion(pool, request);
    }

    if (readyRequests.length > 0) {
      console.log(`[DsrScheduler] Processed ${readyRequests.length} deletion requests`);
    }
  } catch (err) {
    console.error('[DsrScheduler] Error processing deletions:', err);
  }
}

/**
 * Process a single deletion request
 */
async function processSingleDeletion(pool: Pool, request: DsrRequest): Promise<void> {
  try {
    console.log(`[DsrScheduler] Processing deletion for request ${request.id}`);

    // Update status to IN_PROGRESS
    await updateRequestStatus(pool, request.id, request.tenant_id, 'IN_PROGRESS');

    // Create audit entry for processing start
    await createAuditEntry(pool, request.id, 'STARTED', {
      performedByUserId: null, // System action
      ipAddress: null,
      userAgent: 'DsrScheduler/1.0',
      details: { trigger: 'grace_period_expiry' },
    });

    // Perform deletion
    await deidentifyLearner(pool, {
      tenantId: request.tenant_id,
      parentId: request.requested_by_user_id,
      learnerId: request.learner_id,
    });

    // Mark as completed
    await markRequestCompleted(pool, request.id, request.tenant_id);

    // Audit completion
    await createAuditEntry(pool, request.id, 'COMPLETED', {
      performedByUserId: null,
      ipAddress: null,
      userAgent: 'DsrScheduler/1.0',
      details: { deletion_type: 'soft_delete' },
    });

    // Send completion notification email (GDPR Article 17 compliance)
    try {
      await sendCompletionNotification(pool, request);
    } catch (notifyError) {
      // Log but don't fail the deletion - notification is non-blocking
      console.warn(
        `[DsrScheduler] Failed to send completion notification for request ${request.id}:`,
        notifyError
      );
    }

    console.log(`[DsrScheduler] Completed deletion for request ${request.id}`);
  } catch (err) {
    console.error(`[DsrScheduler] Failed to process deletion ${request.id}:`, err);

    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    const errorCode = err instanceof DeleteError ? 'DELETE_ERROR' : 'SYSTEM_ERROR';

    await markRequestFailed(pool, request.id, request.tenant_id, errorMessage);

    await createAuditEntry(pool, request.id, 'FAILED', {
      performedByUserId: null,
      ipAddress: null,
      userAgent: 'DsrScheduler/1.0',
      details: { error_code: errorCode, error_message: errorMessage },
    });
  }
}

/**
 * Send grace period reminder notifications
 */
async function sendGracePeriodReminders(pool: Pool): Promise<void> {
  try {
    const requestsNeedingReminder = await getRequestsNeedingGracePeriodReminder(pool);

    for (const request of requestsNeedingReminder) {
      // Calculate days remaining
      const daysRemaining = request.grace_period_ends_at
        ? Math.ceil(
            (new Date(request.grace_period_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          )
        : 0;

      // Record notification (email sending would be handled by notify-svc)
      await recordNotification(
        pool,
        request.id,
        'GRACE_PERIOD_REMINDER',
        '', // Email would be fetched from user service
        `Reminder: ${daysRemaining} days until data deletion`,
        {
          days_remaining: daysRemaining,
          scheduled_deletion_at: request.scheduled_deletion_at,
          learner_id: request.learner_id,
        }
      );

      console.log(
        `[DsrScheduler] Sent grace period reminder for request ${request.id} (${daysRemaining} days remaining)`
      );
    }
  } catch (err) {
    console.error('[DsrScheduler] Error sending reminders:', err);
  }
}

/**
 * Clean up expired export artifacts
 */
async function cleanupExpiredArtifacts(pool: Pool): Promise<void> {
  try {
    const expiredArtifacts = await getExpiredArtifacts(pool);

    for (const artifact of expiredArtifacts) {
      // In production, this would also delete from S3/GCS
      await deleteArtifact(pool, artifact.id);

      console.log(`[DsrScheduler] Deleted expired artifact ${artifact.id}`);
    }

    if (expiredArtifacts.length > 0) {
      console.log(`[DsrScheduler] Cleaned up ${expiredArtifacts.length} expired artifacts`);
    }
  } catch (err) {
    console.error('[DsrScheduler] Error cleaning up artifacts:', err);
  }
}

// ============================================================================
// SOFT DELETE RETENTION PURGE
// ============================================================================

/**
 * Default retention period for soft-deleted records (90 days).
 * After this period, records are permanently deleted to reduce storage costs
 * while still allowing for recovery during the retention window.
 */
const SOFT_DELETE_RETENTION_DAYS = Number.parseInt(process.env.SOFT_DELETE_RETENTION_DAYS ?? '90', 10);

/**
 * Services that support soft delete and need periodic purging.
 * The orchestrator will call /internal/delete-learner with mode=HARD
 * for records that have been soft-deleted past the retention period.
 */
const SERVICES_WITH_SOFT_DELETE = [
  'goal-svc',
  'gamification-svc',
  'session-svc',
  'assessment-svc',
  'learner-model-svc',
];

/**
 * Permanently purge soft-deleted records that have exceeded the retention period.
 *
 * This runs as a background job to:
 * 1. Query each service for records with deletedAt older than retention period
 * 2. Permanently delete those records (HARD delete)
 * 3. Log the purge for compliance audit
 *
 * This ensures GDPR compliance (data is deleted) while allowing a grace period
 * for recovery if a deletion was made in error.
 */
async function purgeSoftDeletedRecords(pool: Pool): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - SOFT_DELETE_RETENTION_DAYS);

  console.log(
    `[DsrScheduler] Checking for soft-deleted records older than ${SOFT_DELETE_RETENTION_DAYS} days (before ${cutoffDate.toISOString()})`
  );

  try {
    // Query for completed deletion requests that used SOFT mode
    // and are older than the retention period
    const { rows } = await pool.query<{
      id: string;
      tenant_id: string;
      learner_id: string;
      requested_by_user_id: string;
      completed_at: Date;
    }>(
      `SELECT id, tenant_id, learner_id, requested_by_user_id, completed_at
       FROM dsr_requests
       WHERE status = 'COMPLETED'
         AND request_type = 'DELETION'
         AND deletion_mode = 'SOFT'
         AND completed_at < $1
         AND permanent_purge_completed_at IS NULL
       ORDER BY completed_at ASC
       LIMIT 100`,
      [cutoffDate]
    );

    if (rows.length === 0) {
      return;
    }

    console.log(
      `[DsrScheduler] Found ${rows.length} soft-deleted records ready for permanent purge`
    );

    const orchestrator = new DeletionOrchestrator(pool);

    for (const request of rows) {
      try {
        // Use the orchestrator to permanently delete across all services
        const job = await orchestrator.orchestrateDeletion({
          dsrRequestId: request.id,
          tenantId: request.tenant_id,
          learnerId: request.learner_id,
          parentId: request.requested_by_user_id,
          mode: 'HARD', // Permanent deletion
          performedByUserId: 'SYSTEM_PURGE',
        });

        if (job.status === 'completed') {
          // Mark the request as permanently purged
          await pool.query(
            `UPDATE dsr_requests
             SET permanent_purge_completed_at = NOW(),
                 permanent_purge_records_deleted = $2
             WHERE id = $1`,
            [request.id, job.totalRecordsDeleted]
          );

          await createAuditEntry(pool, request.id, 'PERMANENT_PURGE_COMPLETED', {
            performedByUserId: null,
            ipAddress: null,
            userAgent: 'DsrScheduler/1.0',
            details: {
              trigger: 'retention_period_expiry',
              retentionDays: SOFT_DELETE_RETENTION_DAYS,
              recordsPurged: job.totalRecordsDeleted,
            },
          });

          console.log(
            `[DsrScheduler] Permanently purged ${job.totalRecordsDeleted} records for request ${request.id}`
          );
        } else {
          console.error(
            `[DsrScheduler] Failed to purge request ${request.id}: ${job.error}`
          );
        }
      } catch (err) {
        console.error(
          `[DsrScheduler] Error purging request ${request.id}:`,
          err
        );
      }
    }
  } catch (err) {
    console.error('[DsrScheduler] Error in purgeSoftDeletedRecords:', err);
  }
}

/**
 * Main scheduler tick function
 */
async function schedulerTick(pool: Pool): Promise<void> {
  console.log('[DsrScheduler] Running scheduled tasks...');

  // Process all scheduled tasks in parallel
  await Promise.allSettled([
    processReadyDeletions(pool),
    sendGracePeriodReminders(pool),
    cleanupExpiredArtifacts(pool),
    purgeSoftDeletedRecords(pool),
  ]);
}

/**
 * Start the grace period scheduler
 */
export function startGracePeriodScheduler(pool: Pool): void {
  if (schedulerInterval) {
    console.warn('[DsrScheduler] Scheduler already running');
    return;
  }

  console.log(
    `[DsrScheduler] Starting scheduler (interval: ${SCHEDULER_INTERVAL_MS / 1000}s, grace period: ${DSR_CONFIG.GRACE_PERIOD_DAYS} days)`
  );

  // Run immediately on start
  void schedulerTick(pool);

  // Then run on interval
  schedulerInterval = setInterval(() => {
    void schedulerTick(pool);
  }, SCHEDULER_INTERVAL_MS);
}

/**
 * Stop the grace period scheduler
 */
export function stopGracePeriodScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[DsrScheduler] Scheduler stopped');
  }
}

/**
 * Check if scheduler is running
 */
export function isSchedulerRunning(): boolean {
  return schedulerInterval !== null;
}
