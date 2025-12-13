/**
 * Delivery Service
 *
 * Handles actual delivery of notifications via various channels.
 */

import { config } from '../config.js';
import type { PushPayload, EmailPayload, SmsPayload, DeliveryResult } from '../types.js';
import { DeliveryChannel } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// PUSH NOTIFICATIONS
// ══════════════════════════════════════════════════════════════════════════════

export async function sendPushNotification(payload: PushPayload): Promise<DeliveryResult> {
  if (!config.fcm.enabled && !config.apns.enabled) {
    console.log('[DeliveryService] Push disabled, skipping:', payload.title);
    return {
      channel: DeliveryChannel.PUSH,
      success: false,
      errorCode: 'PUSH_DISABLED',
      errorMessage: 'Push notifications are not enabled',
    };
  }

  try {
    if (payload.platform === 'android' || payload.platform === 'web') {
      return await sendFcmNotification(payload);
    } else if (payload.platform === 'ios') {
      // For iOS, we can use FCM as well (supports APNs through FCM)
      return await sendFcmNotification(payload);
    }

    return {
      channel: DeliveryChannel.PUSH,
      success: false,
      errorCode: 'UNKNOWN_PLATFORM',
      errorMessage: `Unknown platform: ${payload.platform}`,
    };
  } catch (error) {
    console.error('[DeliveryService] Push error:', error);
    return {
      channel: DeliveryChannel.PUSH,
      success: false,
      errorCode: 'PUSH_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function sendFcmNotification(payload: PushPayload): Promise<DeliveryResult> {
  // In production, use Firebase Admin SDK
  // For now, log and simulate success
  console.log('[DeliveryService] FCM push:', {
    token: payload.token.substring(0, 20) + '...',
    title: payload.title,
    platform: payload.platform,
  });

  // Simulate API call
  // const admin = require('firebase-admin');
  // const message = {
  //   token: payload.token,
  //   notification: { title: payload.title, body: payload.body, imageUrl: payload.imageUrl },
  //   data: payload.data,
  //   android: { priority: payload.priority === 'high' ? 'high' : 'normal' },
  //   apns: { payload: { aps: { badge: payload.badge, sound: payload.sound } } },
  // };
  // const response = await admin.messaging().send(message);

  return {
    channel: DeliveryChannel.PUSH,
    success: true,
    providerMessageId: `fcm-${Date.now()}`,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// EMAIL
// ══════════════════════════════════════════════════════════════════════════════

export async function sendEmail(payload: EmailPayload): Promise<DeliveryResult> {
  if (!config.email.enabled) {
    console.log('[DeliveryService] Email disabled, skipping:', payload.to);
    return {
      channel: DeliveryChannel.EMAIL,
      success: false,
      errorCode: 'EMAIL_DISABLED',
      errorMessage: 'Email notifications are not enabled',
    };
  }

  try {
    if (config.email.provider === 'sendgrid') {
      return await sendSendgridEmail(payload);
    }

    return {
      channel: DeliveryChannel.EMAIL,
      success: false,
      errorCode: 'UNKNOWN_PROVIDER',
      errorMessage: `Unknown email provider: ${config.email.provider}`,
    };
  } catch (error) {
    console.error('[DeliveryService] Email error:', error);
    return {
      channel: DeliveryChannel.EMAIL,
      success: false,
      errorCode: 'EMAIL_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function sendSendgridEmail(payload: EmailPayload): Promise<DeliveryResult> {
  console.log('[DeliveryService] SendGrid email:', {
    to: payload.to,
    subject: payload.subject,
  });

  // In production, use SendGrid API
  // const sgMail = require('@sendgrid/mail');
  // sgMail.setApiKey(config.email.sendgridApiKey);
  // const msg = {
  //   to: payload.to,
  //   from: payload.from || config.email.fromEmail,
  //   subject: payload.subject,
  //   text: payload.text,
  //   html: payload.html,
  // };
  // await sgMail.send(msg);

  return {
    channel: DeliveryChannel.EMAIL,
    success: true,
    providerMessageId: `sg-${Date.now()}`,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// SMS
// ══════════════════════════════════════════════════════════════════════════════

export async function sendSms(payload: SmsPayload): Promise<DeliveryResult> {
  if (!config.sms.enabled) {
    console.log('[DeliveryService] SMS disabled, skipping:', payload.to);
    return {
      channel: DeliveryChannel.SMS,
      success: false,
      errorCode: 'SMS_DISABLED',
      errorMessage: 'SMS notifications are not enabled',
    };
  }

  try {
    if (config.sms.provider === 'twilio') {
      return await sendTwilioSms(payload);
    }

    return {
      channel: DeliveryChannel.SMS,
      success: false,
      errorCode: 'UNKNOWN_PROVIDER',
      errorMessage: `Unknown SMS provider: ${config.sms.provider}`,
    };
  } catch (error) {
    console.error('[DeliveryService] SMS error:', error);
    return {
      channel: DeliveryChannel.SMS,
      success: false,
      errorCode: 'SMS_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function sendTwilioSms(payload: SmsPayload): Promise<DeliveryResult> {
  console.log('[DeliveryService] Twilio SMS:', {
    to: payload.to,
    body: payload.body.substring(0, 50) + '...',
  });

  // In production, use Twilio API
  // const twilio = require('twilio');
  // const client = twilio(config.sms.twilioAccountSid, config.sms.twilioAuthToken);
  // const message = await client.messages.create({
  //   body: payload.body,
  //   from: config.sms.twilioFromNumber,
  //   to: payload.to,
  // });

  return {
    channel: DeliveryChannel.SMS,
    success: true,
    providerMessageId: `twilio-${Date.now()}`,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// IN-APP (no actual delivery needed, just mark as delivered)
// ══════════════════════════════════════════════════════════════════════════════

export async function deliverInApp(): Promise<DeliveryResult> {
  // In-app notifications are delivered by being stored in the database
  // No external delivery needed
  return {
    channel: DeliveryChannel.IN_APP,
    success: true,
  };
}
