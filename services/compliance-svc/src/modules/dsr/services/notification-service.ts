/**
 * DSR Notification Service
 *
 * Sends notifications related to Data Subject Requests via
 * the platform's notify-svc (HTTP POST to /internal/send).
 * Handles completion, submission, grace-period and export-ready events.
 *
 * Ported from services/dsr-svc during Sprint-2 consolidation.
 */

import type { Pool } from 'pg';

import type { DsrRequest } from '../types.js';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

interface NotifyServicePayload {
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
}

interface UserInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string;
}

// ════════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════════

function getNotifyServiceUrl(): string {
  const host = process.env.NOTIFY_SVC_HOST || 'localhost';
  const port = process.env.NOTIFY_SVC_PORT || '3000';
  return `http://${host}:${port}`;
}

async function sendNotification(payload: NotifyServicePayload): Promise<boolean> {
  try {
    const url = `${getNotifyServiceUrl()}/internal/send`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Request': 'true',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`Failed to send notification: HTTP ${response.status}`, await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending notification:', error);
    return false;
  }
}

async function getUserInfo(pool: Pool, userId: string, tenantId: string): Promise<UserInfo | null> {
  try {
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, tenant_id
       FROM users
       WHERE id = $1 AND tenant_id = $2`,
      [userId, tenantId],
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      tenantId: row.tenant_id,
    };
  } catch (error) {
    console.error('Error fetching user info:', error);
    return null;
  }
}

async function getLearnerName(pool: Pool, learnerId: string, tenantId: string): Promise<string> {
  try {
    const result = await pool.query(
      `SELECT first_name, last_name FROM learners WHERE id = $1 AND tenant_id = $2`,
      [learnerId, tenantId],
    );

    if (result.rows.length === 0) return 'Unknown Learner';

    const row = result.rows[0];
    return `${row.first_name} ${row.last_name}`;
  } catch (error) {
    console.error('Error fetching learner name:', error);
    return 'Unknown Learner';
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Send notification when a DSR request has been completed.
 * Reference: GDPR Article 17 – notification of deletion completion.
 */
export async function sendCompletionNotification(
  pool: Pool,
  dsrRequest: DsrRequest,
): Promise<boolean> {
  const user = await getUserInfo(pool, dsrRequest.requested_by_user_id, dsrRequest.tenant_id);
  if (!user) return false;

  const learnerName = await getLearnerName(pool, dsrRequest.learner_id, dsrRequest.tenant_id);

  return sendNotification({
    to: user.email,
    subject: 'Data Subject Request Completed',
    template: 'dsr-completion',
    data: {
      parentName: `${user.firstName} ${user.lastName}`,
      learnerName,
      requestType: dsrRequest.request_type,
      requestId: dsrRequest.id,
      completedAt: new Date().toISOString(),
      gdprReference: 'GDPR Article 17 – Right to Erasure',
    },
  });
}

/**
 * Send confirmation when a DSR request is first submitted.
 */
export async function sendSubmissionConfirmation(
  pool: Pool,
  dsrRequest: DsrRequest,
): Promise<boolean> {
  const user = await getUserInfo(pool, dsrRequest.requested_by_user_id, dsrRequest.tenant_id);
  if (!user) return false;

  const learnerName = await getLearnerName(pool, dsrRequest.learner_id, dsrRequest.tenant_id);

  return sendNotification({
    to: user.email,
    subject: 'Data Subject Request Received',
    template: 'dsr-submission',
    data: {
      parentName: `${user.firstName} ${user.lastName}`,
      learnerName,
      requestType: dsrRequest.request_type,
      requestId: dsrRequest.id,
      submittedAt: new Date().toISOString(),
      estimatedCompletionDays: 30,
      gdprReference: 'Your request will be processed within 30 days per GDPR Article 12(3)',
    },
  });
}

/**
 * Send grace-period reminder before permanent deletion.
 */
export async function sendGracePeriodReminder(
  pool: Pool,
  dsrRequest: DsrRequest,
  daysRemaining: number,
): Promise<boolean> {
  const user = await getUserInfo(pool, dsrRequest.requested_by_user_id, dsrRequest.tenant_id);
  if (!user) return false;

  const learnerName = await getLearnerName(pool, dsrRequest.learner_id, dsrRequest.tenant_id);

  return sendNotification({
    to: user.email,
    subject: `Data Deletion Grace Period – ${daysRemaining} Days Remaining`,
    template: 'dsr-grace-period-reminder',
    data: {
      parentName: `${user.firstName} ${user.lastName}`,
      learnerName,
      requestId: dsrRequest.id,
      daysRemaining,
      deletionDate: dsrRequest.scheduled_deletion_at?.toISOString(),
      cancellationNotice: 'You may cancel this request before the grace period expires.',
    },
  });
}

/**
 * Send notification when a data export is ready for download.
 */
export async function sendExportReadyNotification(
  pool: Pool,
  dsrRequest: DsrRequest,
  downloadUrl: string,
  expiresAt: Date,
): Promise<boolean> {
  const user = await getUserInfo(pool, dsrRequest.requested_by_user_id, dsrRequest.tenant_id);
  if (!user) return false;

  const learnerName = await getLearnerName(pool, dsrRequest.learner_id, dsrRequest.tenant_id);

  return sendNotification({
    to: user.email,
    subject: 'Your Data Export is Ready',
    template: 'dsr-export-ready',
    data: {
      parentName: `${user.firstName} ${user.lastName}`,
      learnerName,
      requestId: dsrRequest.id,
      downloadUrl,
      expiresAt: expiresAt.toISOString(),
      gdprReference: 'GDPR Article 20 – Right to Data Portability',
    },
  });
}

export default {
  sendCompletionNotification,
  sendSubmissionConfirmation,
  sendGracePeriodReminder,
  sendExportReadyNotification,
};
