/**
 * DSR Notification Service
 *
 * Handles sending notifications for DSR request lifecycle events.
 * Integrates with notify-svc for email delivery.
 *
 * COMPLIANCE: Required for GDPR Article 17 (confirmation of deletion)
 */

import type { Pool } from 'pg';

import type { DsrRequest } from '../types.js';

// ============================================================================
// TYPES
// ============================================================================

interface NotifyServicePayload {
  template: string;
  recipient: {
    email: string;
    name?: string;
    userId?: string;
  };
  data: Record<string, unknown>;
  channel: 'email' | 'push' | 'both';
  priority: 'high' | 'normal' | 'low';
  tenantId: string;
}

interface UserInfo {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const NOTIFY_SVC_URL = process.env.NOTIFY_SVC_URL ?? 'http://notify-svc:4000';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ============================================================================
// NOTIFICATION SERVICE
// ============================================================================

/**
 * Send a notification via notify-svc
 */
async function sendNotification(payload: NotifyServicePayload): Promise<boolean> {
  try {
    const response = await fetch(`${NOTIFY_SVC_URL}/internal/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Name': 'dsr-svc',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(
        `[DsrNotification] Failed to send notification: ${response.status} ${response.statusText}`
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error('[DsrNotification] Error sending notification:', error);
    return false;
  }
}

/**
 * Get user information for a given user ID
 */
async function getUserInfo(pool: Pool, userId: string, tenantId: string): Promise<UserInfo | null> {
  try {
    const result = await pool.query<UserInfo>(
      `SELECT id, email, first_name as "firstName", last_name as "lastName"
       FROM users
       WHERE id = $1 AND tenant_id = $2`,
      [userId, tenantId]
    );

    return result.rows[0] ?? null;
  } catch (error) {
    console.error('[DsrNotification] Error fetching user info:', error);
    return null;
  }
}

/**
 * Get learner name for a given learner ID
 */
async function getLearnerName(pool: Pool, learnerId: string, tenantId: string): Promise<string> {
  try {
    const result = await pool.query<{ first_name: string | null; last_name: string | null }>(
      `SELECT first_name, last_name
       FROM learners
       WHERE id = $1 AND tenant_id = $2`,
      [learnerId, tenantId]
    );

    const row = result.rows[0];
    if (!row) return 'the learner';

    if (row.first_name && row.last_name) {
      return `${row.first_name} ${row.last_name}`;
    }
    return row.first_name ?? 'the learner';
  } catch {
    return 'the learner';
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Send DSR request completion notification.
 *
 * Called when a deletion request has been fully processed.
 * GDPR Article 17 requires confirmation that data has been deleted.
 */
export async function sendCompletionNotification(
  pool: Pool,
  request: DsrRequest
): Promise<boolean> {
  const user = await getUserInfo(pool, request.requested_by_user_id, request.tenant_id);
  if (!user?.email) {
    console.warn(
      `[DsrNotification] Cannot send completion notification: no email for user ${request.requested_by_user_id}`
    );
    return false;
  }

  const learnerName = await getLearnerName(pool, request.learner_id, request.tenant_id);

  const payload: NotifyServicePayload = {
    template: 'dsr-deletion-complete',
    recipient: {
      email: user.email,
      name: user.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : undefined,
      userId: user.id,
    },
    data: {
      requestId: request.id,
      learnerName,
      requestType: request.request_type,
      completedAt: request.completed_at?.toISOString() ?? new Date().toISOString(),
      requestedAt: request.created_at.toISOString(),
    },
    channel: 'email',
    priority: 'high',
    tenantId: request.tenant_id,
  };

  const success = await sendNotification(payload);

  if (success) {
    console.log(`[DsrNotification] Sent completion notification for request ${request.id}`);
  }

  return success;
}

/**
 * Send DSR request submission confirmation notification.
 */
export async function sendSubmissionConfirmation(
  pool: Pool,
  request: DsrRequest
): Promise<boolean> {
  const user = await getUserInfo(pool, request.requested_by_user_id, request.tenant_id);
  if (!user?.email) {
    console.warn(
      `[DsrNotification] Cannot send submission confirmation: no email for user ${request.requested_by_user_id}`
    );
    return false;
  }

  const learnerName = await getLearnerName(pool, request.learner_id, request.tenant_id);

  const payload: NotifyServicePayload = {
    template: 'dsr-submission-confirmation',
    recipient: {
      email: user.email,
      name: user.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : undefined,
      userId: user.id,
    },
    data: {
      requestId: request.id,
      learnerName,
      requestType: request.request_type,
      gracePeriodEndsAt: request.grace_period_ends_at?.toISOString(),
      scheduledDeletionAt: request.scheduled_deletion_at?.toISOString(),
    },
    channel: 'email',
    priority: 'normal',
    tenantId: request.tenant_id,
  };

  return sendNotification(payload);
}

/**
 * Send grace period reminder notification.
 */
export async function sendGracePeriodReminder(
  pool: Pool,
  request: DsrRequest,
  daysRemaining: number
): Promise<boolean> {
  const user = await getUserInfo(pool, request.requested_by_user_id, request.tenant_id);
  if (!user?.email) {
    return false;
  }

  const learnerName = await getLearnerName(pool, request.learner_id, request.tenant_id);

  const payload: NotifyServicePayload = {
    template: 'dsr-grace-period-reminder',
    recipient: {
      email: user.email,
      name: user.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : undefined,
      userId: user.id,
    },
    data: {
      requestId: request.id,
      learnerName,
      daysRemaining,
      scheduledDeletionAt: request.scheduled_deletion_at?.toISOString(),
      cancellationUrl: `${process.env.WEB_APP_URL ?? 'https://app.aivolearning.com'}/settings/privacy/requests/${request.id}/cancel`,
    },
    channel: 'email',
    priority: 'normal',
    tenantId: request.tenant_id,
  };

  return sendNotification(payload);
}

/**
 * Send export ready notification.
 */
export async function sendExportReadyNotification(
  pool: Pool,
  request: DsrRequest,
  downloadUrl: string,
  expiresAt: Date
): Promise<boolean> {
  const user = await getUserInfo(pool, request.requested_by_user_id, request.tenant_id);
  if (!user?.email) {
    return false;
  }

  const learnerName = await getLearnerName(pool, request.learner_id, request.tenant_id);

  const payload: NotifyServicePayload = {
    template: 'dsr-export-ready',
    recipient: {
      email: user.email,
      name: user.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : undefined,
      userId: user.id,
    },
    data: {
      requestId: request.id,
      learnerName,
      downloadUrl,
      expiresAt: expiresAt.toISOString(),
    },
    channel: 'email',
    priority: 'high',
    tenantId: request.tenant_id,
  };

  return sendNotification(payload);
}
