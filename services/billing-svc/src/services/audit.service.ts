/**
 * Billing Audit Service
 *
 * Provides audit logging for billing-related changes including:
 * - Invoice status changes
 * - Subscription status changes
 * - Payment events
 * - Manual overrides by FinOps staff
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { prisma } from '../prisma.js';

// Inline enum values (generated Prisma client may not exist yet)
const PaymentProvider = {
  STRIPE: 'STRIPE',
  MANUAL: 'MANUAL',
  FREE: 'FREE',
} as const;

// ============================================================================
// Types
// ============================================================================

export enum AuditEventType {
  // Invoice events
  INVOICE_CREATED = 'INVOICE_CREATED',
  INVOICE_STATUS_CHANGED = 'INVOICE_STATUS_CHANGED',
  INVOICE_VOIDED = 'INVOICE_VOIDED',
  INVOICE_PAYMENT_RECEIVED = 'INVOICE_PAYMENT_RECEIVED',
  INVOICE_PAYMENT_FAILED = 'INVOICE_PAYMENT_FAILED',

  // Subscription events
  SUBSCRIPTION_CREATED = 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_STATUS_CHANGED = 'SUBSCRIPTION_STATUS_CHANGED',
  SUBSCRIPTION_CANCELED = 'SUBSCRIPTION_CANCELED',
  SUBSCRIPTION_RENEWED = 'SUBSCRIPTION_RENEWED',

  // Payment events
  WEBHOOK_RECEIVED = 'WEBHOOK_RECEIVED',
  WEBHOOK_PROCESSED = 'WEBHOOK_PROCESSED',
  WEBHOOK_FAILED = 'WEBHOOK_FAILED',

  // Manual actions
  MANUAL_STATUS_OVERRIDE = 'MANUAL_STATUS_OVERRIDE',
  MANUAL_REFUND = 'MANUAL_REFUND',
  MANUAL_ADJUSTMENT = 'MANUAL_ADJUSTMENT',
}

export interface AuditLogEntry {
  eventType: AuditEventType;
  billingAccountId?: string;
  subscriptionId?: string;
  invoiceId?: string;
  userId?: string; // Who performed the action (for manual actions)
  previousValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
  source: 'WEBHOOK' | 'API' | 'SYSTEM' | 'MANUAL';
}

// ============================================================================
// Audit Functions
// ============================================================================

/**
 * Log an audit event to the payment_events table
 * We reuse PaymentEvent for audit logging to keep it simple
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  const eventId = `audit-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  await prisma.paymentEvent.create({
    data: {
      provider: PaymentProvider.STRIPE,
      eventType: entry.eventType,
      providerEventId: eventId,
      billingAccountId: entry.billingAccountId ?? null,
      subscriptionId: entry.subscriptionId ?? null,
      invoiceId: entry.invoiceId ?? null,
      payload: {
        userId: entry.userId ?? null,
        previousValue: entry.previousValue ?? null,
        newValue: entry.newValue ?? null,
        metadata: entry.metadata ?? null,
        source: entry.source,
        timestamp: new Date().toISOString(),
      },
      processedAt: new Date(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  });
}

/**
 * Log an invoice status change
 */
export async function logInvoiceStatusChange(
  invoiceId: string,
  billingAccountId: string,
  previousStatus: string,
  newStatus: string,
  options: {
    userId?: string;
    source: 'WEBHOOK' | 'API' | 'SYSTEM' | 'MANUAL';
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventType.INVOICE_STATUS_CHANGED,
    invoiceId,
    billingAccountId,
    ...(options.userId && { userId: options.userId }),
    previousValue: { status: previousStatus },
    newValue: { status: newStatus },
    ...(options.metadata && { metadata: options.metadata }),
    source: options.source,
  });
}

/**
 * Log a subscription status change
 */
export async function logSubscriptionStatusChange(
  subscriptionId: string,
  billingAccountId: string,
  previousStatus: string,
  newStatus: string,
  options: {
    userId?: string;
    source: 'WEBHOOK' | 'API' | 'SYSTEM' | 'MANUAL';
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await logAuditEvent({
    eventType: AuditEventType.SUBSCRIPTION_STATUS_CHANGED,
    subscriptionId,
    billingAccountId,
    ...(options.userId && { userId: options.userId }),
    previousValue: { status: previousStatus },
    newValue: { status: newStatus },
    ...(options.metadata && { metadata: options.metadata }),
    source: options.source,
  });
}

/**
 * Log a webhook event
 */
export async function logWebhookEvent(
  eventType: string,
  providerEventId: string,
  options: {
    billingAccountId?: string;
    subscriptionId?: string;
    invoiceId?: string;
    success: boolean;
    error?: string;
    processingTimeMs?: number;
  }
): Promise<void> {
  await logAuditEvent({
    eventType: options.success ? AuditEventType.WEBHOOK_PROCESSED : AuditEventType.WEBHOOK_FAILED,
    ...(options.billingAccountId && { billingAccountId: options.billingAccountId }),
    ...(options.subscriptionId && { subscriptionId: options.subscriptionId }),
    ...(options.invoiceId && { invoiceId: options.invoiceId }),
    metadata: {
      webhookEventType: eventType,
      providerEventId,
      error: options.error,
      processingTimeMs: options.processingTimeMs,
    },
    source: 'WEBHOOK',
  });
}

/**
 * Log a manual action by FinOps staff
 */
export async function logManualAction(
  actionType: AuditEventType,
  userId: string,
  options: {
    billingAccountId?: string;
    subscriptionId?: string;
    invoiceId?: string;
    previousValue?: unknown;
    newValue?: unknown;
    reason?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await logAuditEvent({
    eventType: actionType,
    ...(options.billingAccountId && { billingAccountId: options.billingAccountId }),
    ...(options.subscriptionId && { subscriptionId: options.subscriptionId }),
    ...(options.invoiceId && { invoiceId: options.invoiceId }),
    userId,
    ...(options.previousValue !== undefined && { previousValue: options.previousValue }),
    ...(options.newValue !== undefined && { newValue: options.newValue }),
    metadata: {
      ...options.metadata,
      reason: options.reason,
    },
    source: 'MANUAL',
  });
}

/**
 * Get audit trail for a billing account
 */
export async function getAuditTrail(
  billingAccountId: string,
  options?: {
    limit?: number;
    fromDate?: Date;
    toDate?: Date;
    eventTypes?: AuditEventType[];
  }
): Promise<unknown[]> {
  // Build where clause dynamically
  const where: Record<string, unknown> = {
    billingAccountId,
  };

  if (options?.fromDate || options?.toDate) {
    where.createdAt = {
      ...(options.fromDate && { gte: options.fromDate }),
      ...(options.toDate && { lte: options.toDate }),
    };
  }

  if (options?.eventTypes) {
    where.eventType = { in: options.eventTypes };
  }

  const events = await prisma.paymentEvent.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: options?.limit ?? 100,
  });

  return events.map(
    (event: {
      id: string;
      eventType: string;
      createdAt: Date;
      processedAt: Date | null;
      payload: unknown;
    }) => ({
      id: event.id,
      eventType: event.eventType,
      timestamp: event.createdAt,
      processedAt: event.processedAt,
      ...((event.payload ?? {}) as object),
    })
  );
}

/**
 * Get audit trail for a specific invoice
 */
export async function getInvoiceAuditTrail(invoiceId: string, limit = 50): Promise<unknown[]> {
  const events = await prisma.paymentEvent.findMany({
    where: { invoiceId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return events.map(
    (event: {
      id: string;
      eventType: string;
      createdAt: Date;
      processedAt: Date | null;
      payload: unknown;
    }) => ({
      id: event.id,
      eventType: event.eventType,
      timestamp: event.createdAt,
      processedAt: event.processedAt,
      ...((event.payload ?? {}) as object),
    })
  );
}

/**
 * Get audit trail for a specific subscription
 */
export async function getSubscriptionAuditTrail(
  subscriptionId: string,
  limit = 50
): Promise<unknown[]> {
  const events = await prisma.paymentEvent.findMany({
    where: { subscriptionId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return events.map(
    (event: {
      id: string;
      eventType: string;
      createdAt: Date;
      processedAt: Date | null;
      payload: unknown;
    }) => ({
      id: event.id,
      eventType: event.eventType,
      timestamp: event.createdAt,
      processedAt: event.processedAt,
      ...((event.payload ?? {}) as object),
    })
  );
}
