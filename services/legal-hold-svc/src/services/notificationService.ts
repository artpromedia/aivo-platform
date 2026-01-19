/**
 * AIVO Legal Hold Service - Notification Service
 *
 * Handles email notifications and acknowledgments.
 */

import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';

import { config } from '../config.js';
import { prisma } from '../prisma.js';
import type { NotificationType, AcknowledgeHoldInput } from '../types/index.js';

// Email transporter
let transporter: nodemailer.Transporter | null = null;

/**
 * Initialize notification service.
 */
export async function initNotifications(): Promise<void> {
  if (config.email.enabled) {
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: config.email.user ? {
        user: config.email.user,
        pass: config.email.password,
      } : undefined,
    });

    try {
      await transporter.verify();
      console.log('Email notification service initialized');
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      transporter = null;
    }
  }
}

/**
 * Send hold notification to custodian.
 */
export async function sendHoldNotification(
  holdId: string,
  custodianId: string,
  notificationType: NotificationType,
  options: { customSubject?: string; customBody?: string } = {}
): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  const holdCustodian = await prisma.holdCustodian.findFirst({
    where: { holdId, custodianId },
    include: {
      hold: true,
      custodian: true,
    },
  });

  if (!holdCustodian) {
    return { success: false, error: 'Hold custodian not found' };
  }

  const { hold, custodian } = holdCustodian;

  // Build notification content
  const subject = options.customSubject || hold.notificationSubject || getDefaultSubject(notificationType, hold.name);
  const body = options.customBody || hold.notificationBody || getDefaultBody(notificationType, hold, custodian);

  // Create notification record
  const notification = await prisma.holdNotification.create({
    data: {
      holdId,
      notificationType,
      recipientEmail: custodian.email,
      recipientName: custodian.displayName,
      subject,
      body,
      status: 'PENDING',
    },
  });

  // Send email
  if (transporter) {
    try {
      await transporter.sendMail({
        from: config.email.from,
        replyTo: config.email.replyTo,
        to: custodian.email,
        subject,
        html: body,
      });

      // Update notification status
      await prisma.holdNotification.update({
        where: { id: notification.id },
        data: { status: 'SENT', sentAt: new Date() },
      });

      // Update hold custodian status
      if (notificationType === 'INITIAL_NOTICE') {
        await prisma.holdCustodian.update({
          where: { id: holdCustodian.id },
          data: {
            status: 'NOTIFIED',
            notifiedAt: new Date(),
            notificationMethod: 'EMAIL',
          },
        });
      } else if (notificationType === 'REMINDER') {
        await prisma.holdCustodian.update({
          where: { id: holdCustodian.id },
          data: {
            reminderCount: { increment: 1 },
            lastReminderAt: new Date(),
          },
        });
      } else if (notificationType === 'ESCALATION') {
        await prisma.holdCustodian.update({
          where: { id: holdCustodian.id },
          data: {
            status: 'ESCALATED',
            escalatedAt: new Date(),
          },
        });
      }

      return { success: true, notificationId: notification.id };
    } catch (error: any) {
      await prisma.holdNotification.update({
        where: { id: notification.id },
        data: { status: 'FAILED', failedAt: new Date(), failureReason: error.message },
      });

      return { success: false, notificationId: notification.id, error: error.message };
    }
  }

  // Email not configured - mark as sent for testing
  await prisma.holdNotification.update({
    where: { id: notification.id },
    data: { status: 'SENT', sentAt: new Date() },
  });

  return { success: true, notificationId: notification.id };
}

/**
 * Send bulk notifications.
 */
export async function sendBulkNotifications(
  holdId: string,
  custodianIds: string[],
  notificationType: NotificationType,
  options: { customSubject?: string; customBody?: string } = {}
): Promise<{ sent: number; failed: number; errors: { custodianId: string; error: string }[] }> {
  const result = {
    sent: 0,
    failed: 0,
    errors: [] as { custodianId: string; error: string }[],
  };

  for (const custodianId of custodianIds) {
    const notification = await sendHoldNotification(holdId, custodianId, notificationType, options);

    if (notification.success) {
      result.sent++;
    } else {
      result.failed++;
      result.errors.push({ custodianId, error: notification.error || 'Unknown error' });
    }
  }

  return result;
}

/**
 * Record hold acknowledgment.
 */
export async function acknowledgeHold(
  holdId: string,
  custodianEmail: string,
  input: AcknowledgeHoldInput,
  metadata: { ipAddress?: string; userAgent?: string } = {}
): Promise<{ success: boolean; acknowledgmentId?: string; error?: string }> {
  // Find the hold custodian
  const holdCustodian = await prisma.holdCustodian.findFirst({
    where: {
      holdId,
      custodian: { email: custodianEmail.toLowerCase() },
      status: { in: ['PENDING', 'NOTIFIED', 'NON_COMPLIANT', 'ESCALATED'] },
    },
    include: {
      custodian: true,
      hold: { select: { tenantId: true } },
    },
  });

  if (!holdCustodian) {
    return { success: false, error: 'Hold custodian not found or already acknowledged' };
  }

  // Create acknowledgment record
  const acknowledgment = await prisma.holdAcknowledgment.create({
    data: {
      holdId,
      custodianEmail: holdCustodian.custodian.email,
      custodianName: holdCustodian.custodian.displayName,
      acknowledgedAt: new Date(),
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      certificationText: input.certificationText,
      signature: input.signature,
      hasQuestions: input.hasQuestions || false,
      questions: input.questions,
    },
  });

  // Update hold custodian status
  await prisma.holdCustodian.update({
    where: { id: holdCustodian.id },
    data: {
      status: 'ACKNOWLEDGED',
      acknowledgedAt: new Date(),
      acknowledgmentNotes: input.questions,
    },
  });

  // Log audit
  await prisma.holdAuditLog.create({
    data: {
      holdId,
      action: 'ACKNOWLEDGED',
      description: `Acknowledged by ${holdCustodian.custodian.displayName}`,
      performedBy: holdCustodian.custodian.email,
      ipAddress: metadata.ipAddress,
    },
  });

  return { success: true, acknowledgmentId: acknowledgment.id };
}

/**
 * Process due reminders.
 */
export async function processReminders(): Promise<{ sent: number; failed: number }> {
  const result = { sent: 0, failed: 0 };

  // Find holds with pending custodians that need reminders
  const holdCustodians = await prisma.holdCustodian.findMany({
    where: {
      status: { in: ['NOTIFIED', 'NON_COMPLIANT'] },
      hold: {
        status: { in: ['ISSUED', 'ACTIVE'] },
        reminderFrequency: { not: null },
      },
      reminderCount: { lt: config.holds.maxReminders },
      OR: [
        { lastReminderAt: null },
        {
          lastReminderAt: {
            lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // At least 1 day ago
          },
        },
      ],
    },
    include: {
      hold: true,
      custodian: true,
    },
    take: config.notifications.batchSize,
  });

  for (const hc of holdCustodians) {
    // Check if reminder is due
    const reminderDays = hc.hold.reminderFrequency || config.holds.defaultReminderDays;
    const lastContact = hc.lastReminderAt || hc.notifiedAt || hc.addedAt;
    const daysSinceLastContact = Math.floor((Date.now() - lastContact.getTime()) / (24 * 60 * 60 * 1000));

    if (daysSinceLastContact >= reminderDays) {
      const notification = await sendHoldNotification(hc.holdId, hc.custodianId, 'REMINDER');
      if (notification.success) {
        result.sent++;
      } else {
        result.failed++;
      }
    }
  }

  return result;
}

/**
 * Process escalations.
 */
export async function processEscalations(): Promise<{ escalated: number }> {
  let escalated = 0;

  // Find holds with custodians that need escalation
  const holdCustodians = await prisma.holdCustodian.findMany({
    where: {
      status: { in: ['NOTIFIED', 'NON_COMPLIANT'] },
      escalatedAt: null,
      hold: {
        status: { in: ['ISSUED', 'ACTIVE'] },
        escalationAfter: { not: null },
      },
    },
    include: {
      hold: true,
      custodian: true,
    },
  });

  for (const hc of holdCustodians) {
    const escalationDays = hc.hold.escalationAfter || config.holds.defaultEscalationDays;
    const daysSinceNotified = hc.notifiedAt
      ? Math.floor((Date.now() - hc.notifiedAt.getTime()) / (24 * 60 * 60 * 1000))
      : 0;

    if (daysSinceNotified >= escalationDays) {
      await sendHoldNotification(hc.holdId, hc.custodianId, 'ESCALATION');
      escalated++;
    }
  }

  return { escalated };
}

/**
 * Get notification history for a hold.
 */
export async function getNotificationHistory(
  tenantId: string,
  holdId: string,
  options: { page?: number; pageSize?: number } = {}
) {
  const { page = 1, pageSize = 20 } = options;

  const hold = await prisma.legalHold.findFirst({
    where: { id: holdId, tenantId },
  });

  if (!hold) throw new Error('Hold not found');

  const skip = (page - 1) * pageSize;

  const [notifications, totalItems] = await Promise.all([
    prisma.holdNotification.findMany({
      where: { holdId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.holdNotification.count({ where: { holdId } }),
  ]);

  return {
    data: notifications,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    },
  };
}

/**
 * Get acknowledgments for a hold.
 */
export async function getAcknowledgments(
  tenantId: string,
  holdId: string,
  options: { page?: number; pageSize?: number } = {}
) {
  const { page = 1, pageSize = 20 } = options;

  const hold = await prisma.legalHold.findFirst({
    where: { id: holdId, tenantId },
  });

  if (!hold) throw new Error('Hold not found');

  const skip = (page - 1) * pageSize;

  const [acknowledgments, totalItems] = await Promise.all([
    prisma.holdAcknowledgment.findMany({
      where: { holdId },
      orderBy: { acknowledgedAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.holdAcknowledgment.count({ where: { holdId } }),
  ]);

  return {
    data: acknowledgments,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    },
  };
}

// Helper functions

function getDefaultSubject(type: NotificationType, holdName: string): string {
  const subjects: Record<NotificationType, string> = {
    INITIAL_NOTICE: `Legal Hold Notice: ${holdName}`,
    REMINDER: `Reminder: Legal Hold Acknowledgment Required - ${holdName}`,
    ESCALATION: `URGENT: Legal Hold Acknowledgment Overdue - ${holdName}`,
    RELEASE_NOTICE: `Legal Hold Released: ${holdName}`,
    UPDATE_NOTICE: `Legal Hold Update: ${holdName}`,
  };
  return subjects[type];
}

function getDefaultBody(type: NotificationType, hold: any, custodian: any): string {
  const baseUrl = 'https://legal.aivo.com'; // Would come from config in production

  const templates: Record<NotificationType, string> = {
    INITIAL_NOTICE: `
      <h2>Legal Hold Notice</h2>
      <p>Dear ${custodian.displayName},</p>
      <p>You have been identified as a custodian for the following legal hold:</p>
      <h3>${hold.name}</h3>
      ${hold.scopeDescription ? `<p><strong>Scope:</strong> ${hold.scopeDescription}</p>` : ''}
      ${hold.dataTypes?.length ? `<p><strong>Data Types:</strong> ${hold.dataTypes.join(', ')}</p>` : ''}
      <p>Please review and acknowledge this hold by clicking the link below:</p>
      <p><a href="${baseUrl}/acknowledge/${hold.id}?email=${encodeURIComponent(custodian.email)}">Acknowledge Hold</a></p>
      <p>If you have any questions, please contact the legal department.</p>
    `,
    REMINDER: `
      <h2>Legal Hold Reminder</h2>
      <p>Dear ${custodian.displayName},</p>
      <p>This is a reminder that you have not yet acknowledged the following legal hold:</p>
      <h3>${hold.name}</h3>
      <p>Please acknowledge this hold as soon as possible:</p>
      <p><a href="${baseUrl}/acknowledge/${hold.id}?email=${encodeURIComponent(custodian.email)}">Acknowledge Hold</a></p>
    `,
    ESCALATION: `
      <h2>URGENT: Legal Hold Acknowledgment Overdue</h2>
      <p>Dear ${custodian.displayName},</p>
      <p>Your acknowledgment for the following legal hold is overdue:</p>
      <h3>${hold.name}</h3>
      <p>Failure to acknowledge may result in escalation to management.</p>
      <p><a href="${baseUrl}/acknowledge/${hold.id}?email=${encodeURIComponent(custodian.email)}">Acknowledge Hold Now</a></p>
    `,
    RELEASE_NOTICE: `
      <h2>Legal Hold Released</h2>
      <p>Dear ${custodian.displayName},</p>
      <p>The following legal hold has been released:</p>
      <h3>${hold.name}</h3>
      <p>You are no longer required to preserve documents related to this matter.</p>
    `,
    UPDATE_NOTICE: `
      <h2>Legal Hold Update</h2>
      <p>Dear ${custodian.displayName},</p>
      <p>The following legal hold has been updated:</p>
      <h3>${hold.name}</h3>
      <p>Please review the updated hold details.</p>
    `,
  };

  return templates[type];
}
