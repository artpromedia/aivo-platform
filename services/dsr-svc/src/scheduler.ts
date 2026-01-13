/**
 * DSR Grace Period Scheduler
 *
 * Handles automatic processing of DSR requests:
 * - Processes deletion requests when grace period ends
 * - Sends grace period reminder notifications
 * - Cleans up expired export artifacts
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

    // TODO: Send completion notification email
    // await sendCompletionNotification(pool, request);

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
