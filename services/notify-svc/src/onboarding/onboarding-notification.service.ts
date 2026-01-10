/**
 * Onboarding Notification Service
 *
 * Handles notifications for cross-app onboarding flows:
 * 1. Learner completes baseline → Parent receives app download link
 * 2. Parent adds child → Learner app download link sent
 */

import { prisma } from '../prisma.js';
import { sendEmail } from '../channels/email/email.service.js';
import { sendSms } from '../channels/sms/sms.service.js';
import { renderSmsTemplate } from '../channels/sms/sms-templates.js';
import { config } from '../config.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface BaselineCompletePayload {
  tenantId: string;
  learnerId: string;
  learnerName: string;
  parentId: string;
  parentEmail: string;
  parentPhone?: string;
  parentName: string;
  domainsAssessed: number;
  locale?: string;
}

export interface LearnerAddedPayload {
  tenantId: string;
  learnerId: string;
  learnerName: string;
  learnerPin: string;
  parentId: string;
  parentEmail: string;
  parentPhone?: string;
  parentName: string;
  locale?: string;
}

export interface NotificationResult {
  success: boolean;
  emailSent: boolean;
  smsSent: boolean;
  errors: string[];
}

// ══════════════════════════════════════════════════════════════════════════════
// APP STORE LINKS
// ══════════════════════════════════════════════════════════════════════════════

const APP_STORE_LINKS = {
  learner: {
    ios: process.env['LEARNER_APP_IOS_URL'] || 'https://apps.apple.com/app/aivo-learner/id1234567890',
    android: process.env['LEARNER_APP_ANDROID_URL'] || 'https://play.google.com/store/apps/details?id=com.aivolearning.learner',
    universal: process.env['LEARNER_APP_UNIVERSAL_URL'] || 'https://aivolearning.com/download/learner',
  },
  parent: {
    ios: process.env['PARENT_APP_IOS_URL'] || 'https://apps.apple.com/app/aivo-parent/id1234567891',
    android: process.env['PARENT_APP_ANDROID_URL'] || 'https://play.google.com/store/apps/details?id=com.aivolearning.parent',
    universal: process.env['PARENT_APP_UNIVERSAL_URL'] || 'https://aivolearning.com/download/parent',
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// FLOW 1: BASELINE COMPLETE → PARENT APP DOWNLOAD
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Send notification to parent when learner completes baseline assessment.
 * Includes links to download the Parent app.
 */
export async function notifyParentBaselineComplete(
  payload: BaselineCompletePayload
): Promise<NotificationResult> {
  const errors: string[] = [];
  let emailSent = false;
  let smsSent = false;

  const currentYear = new Date().getFullYear();
  const unsubscribeUrl = `${config.appUrl}/settings/notifications?unsubscribe=baseline`;

  // Prepare email context
  const emailContext = {
    parentName: payload.parentName,
    learnerName: payload.learnerName,
    domainsAssessed: payload.domainsAssessed.toString(),
    parentEmail: payload.parentEmail,
    iosLink: APP_STORE_LINKS.parent.ios,
    androidLink: APP_STORE_LINKS.parent.android,
    universalLink: APP_STORE_LINKS.parent.universal,
    currentYear: currentYear.toString(),
    unsubscribeUrl,
    locale: payload.locale || 'en',
  };

  // Send email notification
  try {
    await sendEmail({
      to: payload.parentEmail,
      subject: `🎉 ${payload.learnerName}'s Learning Profile is Ready!`,
      template: 'onboarding/download-parent-app',
      context: emailContext,
      tenantId: payload.tenantId,
    });
    emailSent = true;

    // Log notification
    await logNotification({
      type: 'BASELINE_COMPLETE_PARENT_APP',
      tenantId: payload.tenantId,
      recipientId: payload.parentId,
      recipientType: 'parent',
      channel: 'email',
      status: 'sent',
      metadata: {
        learnerId: payload.learnerId,
        learnerName: payload.learnerName,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown email error';
    errors.push(`Email failed: ${errorMessage}`);
    console.error('[OnboardingNotification] Email failed:', error);
  }

  // Send SMS if phone number provided
  if (payload.parentPhone) {
    try {
      const smsBody = renderSmsTemplate('download-parent-app', {
        learnerName: payload.learnerName,
        downloadLink: APP_STORE_LINKS.parent.universal,
      });

      await sendSms({
        to: payload.parentPhone,
        body: smsBody,
        tenantId: payload.tenantId,
      });
      smsSent = true;

      // Log notification
      await logNotification({
        type: 'BASELINE_COMPLETE_PARENT_APP',
        tenantId: payload.tenantId,
        recipientId: payload.parentId,
        recipientType: 'parent',
        channel: 'sms',
        status: 'sent',
        metadata: {
          learnerId: payload.learnerId,
          learnerName: payload.learnerName,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown SMS error';
      errors.push(`SMS failed: ${errorMessage}`);
      console.error('[OnboardingNotification] SMS failed:', error);
    }
  }

  return {
    success: emailSent || smsSent,
    emailSent,
    smsSent,
    errors,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// FLOW 2: PARENT ADDS CHILD → LEARNER APP DOWNLOAD
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Send notification to parent when they add a child in the Parent app.
 * Includes links to download the Learner app for the child's device.
 */
export async function notifyParentLearnerAppDownload(
  payload: LearnerAddedPayload
): Promise<NotificationResult> {
  const errors: string[] = [];
  let emailSent = false;
  let smsSent = false;

  const currentYear = new Date().getFullYear();
  const unsubscribeUrl = `${config.appUrl}/settings/notifications?unsubscribe=onboarding`;

  // Generate QR code URL (using a QR code service)
  const qrCodeUrl = generateQrCodeUrl(APP_STORE_LINKS.learner.universal);

  // Prepare email context
  const emailContext = {
    parentName: payload.parentName,
    learnerName: payload.learnerName,
    learnerPin: payload.learnerPin,
    iosLink: APP_STORE_LINKS.learner.ios,
    androidLink: APP_STORE_LINKS.learner.android,
    universalLink: APP_STORE_LINKS.learner.universal,
    qrCodeUrl,
    currentYear: currentYear.toString(),
    unsubscribeUrl,
    locale: payload.locale || 'en',
  };

  // Send email notification
  try {
    await sendEmail({
      to: payload.parentEmail,
      subject: `📱 Set Up ${payload.learnerName}'s Learning Device`,
      template: 'onboarding/download-learner-app',
      context: emailContext,
      tenantId: payload.tenantId,
    });
    emailSent = true;

    // Log notification
    await logNotification({
      type: 'LEARNER_ADDED_LEARNER_APP',
      tenantId: payload.tenantId,
      recipientId: payload.parentId,
      recipientType: 'parent',
      channel: 'email',
      status: 'sent',
      metadata: {
        learnerId: payload.learnerId,
        learnerName: payload.learnerName,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown email error';
    errors.push(`Email failed: ${errorMessage}`);
    console.error('[OnboardingNotification] Email failed:', error);
  }

  // Send SMS if phone number provided
  if (payload.parentPhone) {
    try {
      const smsBody = renderSmsTemplate('download-learner-app', {
        learnerName: payload.learnerName,
        downloadLink: APP_STORE_LINKS.learner.universal,
        learnerPin: payload.learnerPin,
      });

      await sendSms({
        to: payload.parentPhone,
        body: smsBody,
        tenantId: payload.tenantId,
      });
      smsSent = true;

      // Log notification
      await logNotification({
        type: 'LEARNER_ADDED_LEARNER_APP',
        tenantId: payload.tenantId,
        recipientId: payload.parentId,
        recipientType: 'parent',
        channel: 'sms',
        status: 'sent',
        metadata: {
          learnerId: payload.learnerId,
          learnerName: payload.learnerName,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown SMS error';
      errors.push(`SMS failed: ${errorMessage}`);
      console.error('[OnboardingNotification] SMS failed:', error);
    }
  }

  return {
    success: emailSent || smsSent,
    emailSent,
    smsSent,
    errors,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a QR code URL using a public QR code service.
 * In production, consider using a self-hosted solution for privacy.
 */
function generateQrCodeUrl(data: string): string {
  const encodedData = encodeURIComponent(data);
  // Using QR Server API - in production, consider self-hosted solution
  return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodedData}`;
}

/**
 * Log notification to database for analytics and debugging.
 */
async function logNotification(data: {
  type: string;
  tenantId: string;
  recipientId: string;
  recipientType: 'parent' | 'learner' | 'teacher';
  channel: 'email' | 'sms' | 'push';
  status: 'sent' | 'failed';
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.notificationLog.create({
      data: {
        type: data.type,
        tenantId: data.tenantId,
        recipientId: data.recipientId,
        recipientType: data.recipientType,
        channel: data.channel,
        status: data.status,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        sentAt: new Date(),
      },
    });
  } catch (error) {
    // Don't fail the notification if logging fails
    console.error('[OnboardingNotification] Failed to log notification:', error);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export const onboardingNotificationService = {
  notifyParentBaselineComplete,
  notifyParentLearnerAppDownload,
};
