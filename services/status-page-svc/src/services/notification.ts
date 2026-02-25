// ==============================================================================
// AIVO Status Page Service — Subscriber Notification Service
// ==============================================================================

import { getDb } from '../db/database.js';
import { config } from '../config.js';
import type { Incident, IncidentUpdate, MaintenanceWindow } from '../types.js';

interface NotificationPayload {
  type: 'incident_created' | 'incident_updated' | 'incident_resolved' | 'maintenance_scheduled' | 'maintenance_started';
  incident?: Incident;
  update?: IncidentUpdate;
  maintenance?: MaintenanceWindow;
}

/**
 * Notify all relevant subscribers about an event.
 */
export async function notifySubscribers(payload: NotificationPayload): Promise<void> {
  const db = getDb();
  const subscribers: any[] = db
    .prepare('SELECT * FROM subscribers WHERE verified = 1')
    .all();

  // Filter to subscribers who care about the affected components
  const affectedComponents =
    payload.incident?.components ?? payload.maintenance?.components ?? [];

  const relevantSubscribers = subscribers.filter((sub) => {
    if (!sub.components) return true; // subscribed to all
    const subscribedComponents: string[] = JSON.parse(sub.components);
    return (affectedComponents as string[]).some((c) => subscribedComponents.includes(c));
  });

  const promises = relevantSubscribers.map(async (sub) => {
    try {
      // Send webhook notification if configured
      if (sub.webhook_url) {
        await sendWebhook(sub.webhook_url, payload);
      }

      // Send email notification
      if (sub.email) {
        await sendEmailNotification(sub.email, sub.unsubscribe_token, payload);
      }
    } catch (err) {
      console.error(`[notify] failed for subscriber ${sub.id}:`, err);
    }
  });

  await Promise.allSettled(promises);
}

async function sendWebhook(url: string, payload: NotificationPayload): Promise<void> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.warn(`[notify] webhook ${url} returned ${res.status}`);
    }
  } catch (err) {
    console.error(`[notify] webhook ${url} failed:`, err);
  }
}

async function sendEmailNotification(
  email: string,
  unsubscribeToken: string,
  payload: NotificationPayload,
): Promise<void> {
  // Placeholder: in production, wire up SMTP or a transactional email service
  // (e.g. Postmark, SES, Resend). For now, just log.
  if (!config.smtp.host) {
    console.log(`[notify] would email ${email}: ${payload.type}`);
    return;
  }

  // TODO: integrate with SMTP transport (nodemailer or similar)
  console.log(
    `[notify] email queued for ${email}: ${payload.type} — unsubscribe: ${config.publicUrl}/api/subscribers/unsubscribe?token=${unsubscribeToken}`,
  );
}
