/**
 * AIVO IEP Service — Compliance Notification Delivery
 *
 * Sends email notifications via notify-svc for compliance alerts.
 * - Individual alerts → case manager (createdBy on IEP)
 * - Overdue escalation → district admin email
 * - Weekly summary → district admin email
 */

import { config } from '../config.js';
import { prisma } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ComplianceAlertPayload {
  alertType: string;
  severity: string;
  studentId: string;
  iepId: string;
  description: string;
  dueDate: Date | null;
}

export interface WeeklySummary {
  tenantId: string;
  totalActiveIEPs: number;
  onTimeCount: number;
  onTimePercent: number;
  atRiskCount: number;
  overdueCount: number;
  overdueItems: {
    studentName: string;
    alertType: string;
    dueDate: Date | null;
    caseManagerEmail: string;
  }[];
}

interface NotifyEmailPayload {
  templateName: string;
  to: string;
  context: Record<string, unknown>;
  category?: string;
  tags?: string[];
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const NOTIFY_SVC_URL = process.env.NOTIFY_SVC_URL ?? 'http://localhost:4080';

const DISTRICT_ADMIN_EMAIL = process.env.DISTRICT_ADMIN_EMAIL ?? 'admin@district.edu';

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST to notify-svc /api/v1/email/send.
 * Fire-and-forget — errors are logged but never thrown to the caller.
 */
async function sendEmail(
  payload: NotifyEmailPayload,
  logger: { info: (...a: unknown[]) => void; error: (...a: unknown[]) => void }
): Promise<boolean> {
  if (!config.notifications.enabled) {
    logger.info(
      { template: payload.templateName, to: payload.to },
      '[ComplianceNotify] Notifications disabled — skipping email'
    );
    return false;
  }

  try {
    const res = await fetch(`${NOTIFY_SVC_URL}/api/v1/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-name': 'iep-svc',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      logger.error(
        { status: res.status, body: text, to: payload.to },
        '[ComplianceNotify] notify-svc returned non-OK'
      );
      return false;
    }

    logger.info(
      { template: payload.templateName, to: payload.to },
      '[ComplianceNotify] Email sent'
    );
    return true;
  } catch (err: unknown) {
    logger.error({ err, to: payload.to }, '[ComplianceNotify] Failed to reach notify-svc');
    return false;
  }
}

/**
 * Resolve the case-manager email for an IEP.
 * Falls back to the district admin email if the IEP's `createdBy` doesn't
 * look like an email (some tenants store user-ids instead).
 */
async function resolveCaseManagerEmail(iepId: string): Promise<string> {
  const iep = await prisma.iEP.findUnique({
    where: { id: iepId },
    select: { createdBy: true },
  });

  const value = iep?.createdBy ?? '';
  return value.includes('@') ? value : DISTRICT_ADMIN_EMAIL;
}

// ══════════════════════════════════════════════════════════════════════════════
// INDIVIDUAL ALERT NOTIFICATIONS
// ══════════════════════════════════════════════════════════════════════════════

function pickTemplate(
  alertType: string,
  severity: string
): { templateName: string; subject: string } {
  if (alertType.endsWith('_OVERDUE') || severity === 'Critical') {
    return {
      templateName: 'compliance-overdue',
      subject: 'COMPLIANCE VIOLATION',
    };
  }
  if (severity === 'High') {
    return {
      templateName: 'compliance-urgent',
      subject: 'URGENT: Compliance action required',
    };
  }
  return {
    templateName: 'compliance-warning',
    subject: 'Compliance reminder',
  };
}

/**
 * Send alert notifications for a batch of newly-generated compliance alerts.
 * - Every alert → email to the case manager
 * - Overdue/Critical → also escalated to district admin
 */
export async function sendComplianceNotifications(
  tenantId: string,
  alerts: ComplianceAlertPayload[],
  logger: { info: (...a: unknown[]) => void; error: (...a: unknown[]) => void }
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const alert of alerts) {
    const { templateName, subject } = pickTemplate(alert.alertType, alert.severity);

    const caseManagerEmail = await resolveCaseManagerEmail(alert.iepId);

    // 1. Notify case manager
    const ok = await sendEmail(
      {
        templateName,
        to: caseManagerEmail,
        context: {
          subject,
          alertType: alert.alertType,
          severity: alert.severity,
          description: alert.description,
          dueDate: alert.dueDate?.toISOString() ?? 'N/A',
          tenantId,
        },
        category: 'compliance',
        tags: ['compliance', alert.alertType.toLowerCase()],
      },
      logger
    );
    if (ok) {
      sent++;
    } else {
      failed++;
    }

    // 2. Escalate overdue / critical to district admin
    if (
      (alert.alertType.endsWith('_OVERDUE') || alert.severity === 'Critical') &&
      caseManagerEmail !== DISTRICT_ADMIN_EMAIL
    ) {
      const escOk = await sendEmail(
        {
          templateName: 'compliance-escalation',
          to: DISTRICT_ADMIN_EMAIL,
          context: {
            subject: `ESCALATION: ${alert.description}`,
            caseManagerEmail,
            alertType: alert.alertType,
            severity: alert.severity,
            description: alert.description,
            dueDate: alert.dueDate?.toISOString() ?? 'N/A',
            tenantId,
          },
          category: 'compliance-escalation',
          tags: ['compliance', 'escalation'],
        },
        logger
      );
      if (escOk) {
        sent++;
      } else {
        failed++;
      }
    }
  }

  return { sent, failed };
}

// ══════════════════════════════════════════════════════════════════════════════
// WEEKLY SUMMARY
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Build and send a weekly compliance summary for a given tenant.
 */
export async function sendWeeklySummary(
  tenantId: string,
  logger: { info: (...a: unknown[]) => void; error: (...a: unknown[]) => void }
): Promise<boolean> {
  const now = new Date();

  // Counts
  const [totalActiveIEPs, openAlerts] = await Promise.all([
    prisma.iEP.count({ where: { tenantId, status: 'ACTIVE' } }),
    prisma.complianceAlert.findMany({
      where: { tenantId, status: 'OPEN' },
      orderBy: { dueDate: 'asc' },
    }),
  ]);

  let overdueCount = 0;
  let atRiskCount = 0;

  const overdueItems: WeeklySummary['overdueItems'] = [];

  for (const alert of openAlerts) {
    const isOverdue =
      alert.alertType.endsWith('_OVERDUE') ||
      alert.severity === 'Critical' ||
      (alert.dueDate && alert.dueDate < now);

    if (isOverdue) {
      overdueCount++;
      const email = alert.iepId ? await resolveCaseManagerEmail(alert.iepId) : DISTRICT_ADMIN_EMAIL;
      overdueItems.push({
        studentName: alert.description,
        alertType: alert.alertType,
        dueDate: alert.dueDate,
        caseManagerEmail: email,
      });
    } else {
      atRiskCount++;
    }
  }

  const onTimeCount = totalActiveIEPs - overdueCount - atRiskCount;
  const onTimePercent =
    totalActiveIEPs > 0 ? Math.round((onTimeCount / totalActiveIEPs) * 100) : 100;

  const summary: WeeklySummary = {
    tenantId,
    totalActiveIEPs,
    onTimeCount,
    onTimePercent,
    atRiskCount,
    overdueCount,
    overdueItems,
  };

  return sendEmail(
    {
      templateName: 'compliance-weekly-summary',
      to: DISTRICT_ADMIN_EMAIL,
      context: {
        subject: `Weekly IEP Compliance Summary — ${onTimePercent}% on-time`,
        ...summary,
        overdueItems: summary.overdueItems.map((i) => ({
          ...i,
          dueDate: i.dueDate?.toISOString() ?? 'N/A',
        })),
        generatedAt: now.toISOString(),
      },
      category: 'compliance-summary',
      tags: ['compliance', 'weekly-summary'],
    },
    logger
  );
}
