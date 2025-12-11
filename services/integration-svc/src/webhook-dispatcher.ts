/**
 * Webhook Dispatcher
 * 
 * Handles the delivery of webhook events to registered endpoints.
 * Includes retry logic with exponential backoff.
 */

import { PrismaClient, WebhookDeliveryStatus, WebhookEventType } from '@prisma/client';
import { signWebhookPayload, generateWebhookHeaders } from './webhook-signing.js';
import { WebhookPayload } from './types.js';
import { randomUUID } from 'crypto';

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

export interface WebhookDispatcherConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Initial retry delay in milliseconds */
  initialRetryDelayMs: number;
  /** Maximum retry delay in milliseconds */
  maxRetryDelayMs: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
  /** Request timeout in milliseconds */
  requestTimeoutMs: number;
  /** Number of consecutive failures before disabling endpoint */
  maxConsecutiveFailures: number;
  /** Function to retrieve secret from KMS or env */
  getSecret: (secretRef: string) => Promise<string>;
}

const DEFAULT_CONFIG: WebhookDispatcherConfig = {
  maxAttempts: 5,
  initialRetryDelayMs: 1000,      // 1 second
  maxRetryDelayMs: 3600000,       // 1 hour
  backoffMultiplier: 2,
  requestTimeoutMs: 30000,        // 30 seconds
  maxConsecutiveFailures: 10,
  getSecret: async (ref) => ref,  // Default: use ref as secret (for dev)
};

// ══════════════════════════════════════════════════════════════════════════════
// WEBHOOK DISPATCHER
// ══════════════════════════════════════════════════════════════════════════════

export class WebhookDispatcher {
  private prisma: PrismaClient;
  private config: WebhookDispatcherConfig;

  constructor(prisma: PrismaClient, config: Partial<WebhookDispatcherConfig> = {}) {
    this.prisma = prisma;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Queue a webhook event for delivery to all matching endpoints
   * 
   * @param tenantId - The tenant ID for the event
   * @param eventType - The type of event
   * @param payload - The event payload
   * @returns Array of created delivery IDs
   */
  async queueEvent(
    tenantId: string,
    eventType: WebhookEventType,
    payload: WebhookPayload
  ): Promise<string[]> {
    // Find all enabled endpoints for this tenant that subscribe to this event type
    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: {
        tenantId,
        enabled: true,
        eventTypes: {
          has: eventType,
        },
        disabledAt: null,
      },
    });

    if (endpoints.length === 0) {
      return [];
    }

    const eventId = randomUUID();
    const deliveryIds: string[] = [];

    // Create a delivery record for each endpoint
    for (const endpoint of endpoints) {
      // Check if payload matches any filters
      if (!this.matchesFilter(endpoint.filterJson as Record<string, unknown> | null, payload)) {
        continue;
      }

      const delivery = await this.prisma.webhookDelivery.create({
        data: {
          webhookId: endpoint.id,
          eventType,
          eventId,
          payloadJson: payload as unknown as Record<string, unknown>,
          status: WebhookDeliveryStatus.PENDING,
          maxAttempts: this.config.maxAttempts,
        },
      });

      deliveryIds.push(delivery.id);
    }

    return deliveryIds;
  }

  /**
   * Process pending webhook deliveries
   * This should be called by a background worker
   */
  async processPendingDeliveries(batchSize: number = 10): Promise<void> {
    const now = new Date();

    // Get pending deliveries that are due for processing
    const deliveries = await this.prisma.webhookDelivery.findMany({
      where: {
        status: {
          in: [WebhookDeliveryStatus.PENDING, WebhookDeliveryStatus.FAILED],
        },
        scheduledAt: {
          lte: now,
        },
        attemptCount: {
          lt: this.prisma.webhookDelivery.fields.maxAttempts,
        },
      },
      include: {
        webhook: true,
      },
      orderBy: {
        scheduledAt: 'asc',
      },
      take: batchSize,
    });

    // Process each delivery
    await Promise.allSettled(
      deliveries.map((delivery) => this.attemptDelivery(delivery))
    );
  }

  /**
   * Attempt to deliver a webhook
   */
  private async attemptDelivery(
    delivery: Awaited<ReturnType<typeof this.prisma.webhookDelivery.findFirst>> & {
      webhook: Awaited<ReturnType<typeof this.prisma.webhookEndpoint.findFirst>>;
    }
  ): Promise<void> {
    if (!delivery || !delivery.webhook) return;

    const startTime = Date.now();
    const timestamp = Math.floor(startTime / 1000);
    const payload = JSON.stringify(delivery.payloadJson);

    try {
      // Get the webhook secret
      const secret = await this.config.getSecret(delivery.webhook.secretKeyRef);

      // Generate signature and headers
      const signature = signWebhookPayload(payload, secret, timestamp);
      const headers = generateWebhookHeaders({
        signature,
        eventType: delivery.eventType,
        tenantId: delivery.webhook.tenantId,
        deliveryId: delivery.id,
        timestamp,
      });

      // Mark as in progress
      await this.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: WebhookDeliveryStatus.IN_PROGRESS,
          firstAttemptAt: delivery.firstAttemptAt || new Date(),
        },
      });

      // Make the HTTP request
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.requestTimeoutMs
      );

      const response = await fetch(delivery.webhook.url, {
        method: 'POST',
        headers,
        body: payload,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTimeMs = Date.now() - startTime;

      // Get response body (first 1KB for logging)
      let responseBody: string | null = null;
      try {
        const text = await response.text();
        responseBody = text.substring(0, 1024);
      } catch {
        // Ignore response body errors
      }

      // Record the attempt
      await this.prisma.webhookDeliveryAttempt.create({
        data: {
          deliveryId: delivery.id,
          attemptNumber: delivery.attemptCount + 1,
          responseStatus: response.status,
          responseBody,
          responseTimeMs,
        },
      });

      // Check if successful (2xx status)
      if (response.ok) {
        await this.markSuccess(delivery, response.status, responseTimeMs);
      } else if (response.status >= 400 && response.status < 500) {
        // Client error - permanent failure (except 429)
        if (response.status === 429) {
          await this.scheduleRetry(delivery, response.status, responseTimeMs, 'Rate limited');
        } else {
          await this.markPermanentFailure(
            delivery,
            response.status,
            responseTimeMs,
            `Client error: ${response.status}`
          );
        }
      } else {
        // Server error or other - retry
        await this.scheduleRetry(
          delivery,
          response.status,
          responseTimeMs,
          `Server error: ${response.status}`
        );
      }
    } catch (error) {
      const responseTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorType = this.classifyError(error);

      // Record the failed attempt
      await this.prisma.webhookDeliveryAttempt.create({
        data: {
          deliveryId: delivery.id,
          attemptNumber: delivery.attemptCount + 1,
          responseTimeMs,
          errorType,
          errorMessage,
        },
      });

      // Schedule retry or mark as permanent failure
      if (errorType === 'CONNECTION_REFUSED' || errorType === 'DNS_ERROR') {
        // These might be permanent issues
        if (delivery.attemptCount >= 3) {
          await this.markPermanentFailure(delivery, null, responseTimeMs, errorMessage);
        } else {
          await this.scheduleRetry(delivery, null, responseTimeMs, errorMessage);
        }
      } else {
        await this.scheduleRetry(delivery, null, responseTimeMs, errorMessage);
      }
    }
  }

  /**
   * Mark a delivery as successful
   */
  private async markSuccess(
    delivery: { id: string; webhook: { id: string } },
    statusCode: number,
    responseTimeMs: number
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: WebhookDeliveryStatus.SUCCESS,
          lastStatusCode: statusCode,
          responseTimeMs,
          lastAttemptAt: new Date(),
          completedAt: new Date(),
          attemptCount: { increment: 1 },
        },
      }),
      this.prisma.webhookEndpoint.update({
        where: { id: delivery.webhook.id },
        data: {
          lastDeliveryAt: new Date(),
          failureCount: 0,
        },
      }),
    ]);
  }

  /**
   * Schedule a retry for a failed delivery
   */
  private async scheduleRetry(
    delivery: { id: string; attemptCount: number; maxAttempts: number; webhook: { id: string; failureCount: number } },
    statusCode: number | null,
    responseTimeMs: number,
    errorMessage: string
  ): Promise<void> {
    const newAttemptCount = delivery.attemptCount + 1;

    if (newAttemptCount >= delivery.maxAttempts) {
      await this.markPermanentFailure(delivery, statusCode, responseTimeMs, errorMessage);
      return;
    }

    // Calculate next retry time with exponential backoff
    const delay = Math.min(
      this.config.initialRetryDelayMs * Math.pow(this.config.backoffMultiplier, newAttemptCount),
      this.config.maxRetryDelayMs
    );
    const scheduledAt = new Date(Date.now() + delay);

    await this.prisma.$transaction([
      this.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: WebhookDeliveryStatus.FAILED,
          lastStatusCode: statusCode,
          responseTimeMs,
          lastErrorMessage: errorMessage,
          lastAttemptAt: new Date(),
          attemptCount: newAttemptCount,
          scheduledAt,
        },
      }),
      this.prisma.webhookEndpoint.update({
        where: { id: delivery.webhook.id },
        data: {
          failureCount: { increment: 1 },
        },
      }),
    ]);

    // Check if we should disable the endpoint
    const newFailureCount = delivery.webhook.failureCount + 1;
    if (newFailureCount >= this.config.maxConsecutiveFailures) {
      await this.disableEndpoint(delivery.webhook.id, 'Too many consecutive failures');
    }
  }

  /**
   * Mark a delivery as permanently failed
   */
  private async markPermanentFailure(
    delivery: { id: string; webhook: { id: string; failureCount: number } },
    statusCode: number | null,
    responseTimeMs: number,
    errorMessage: string
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: WebhookDeliveryStatus.PERMANENT_FAILURE,
          lastStatusCode: statusCode,
          responseTimeMs,
          lastErrorMessage: errorMessage,
          lastAttemptAt: new Date(),
          completedAt: new Date(),
          attemptCount: { increment: 1 },
        },
      }),
      this.prisma.webhookEndpoint.update({
        where: { id: delivery.webhook.id },
        data: {
          failureCount: { increment: 1 },
        },
      }),
    ]);
  }

  /**
   * Disable a webhook endpoint
   */
  private async disableEndpoint(endpointId: string, reason: string): Promise<void> {
    await this.prisma.webhookEndpoint.update({
      where: { id: endpointId },
      data: {
        enabled: false,
        disabledAt: new Date(),
        disabledReason: reason,
      },
    });
  }

  /**
   * Check if a payload matches the endpoint's filters
   */
  private matchesFilter(
    filter: Record<string, unknown> | null,
    payload: WebhookPayload
  ): boolean {
    if (!filter) return true;

    const data = (payload as unknown as { data?: Record<string, unknown> }).data;
    if (!data) return true;

    // Check subject filter
    if (filter.subjects && Array.isArray(filter.subjects)) {
      const subject = data.subject as string | undefined;
      if (subject && !filter.subjects.includes(subject)) {
        return false;
      }
    }

    // Check grade filter
    if (filter.grades && Array.isArray(filter.grades)) {
      const grade = data.gradeBand as string | undefined;
      if (grade && !filter.grades.includes(grade)) {
        return false;
      }
    }

    // Check classroom filter
    if (filter.classroomIds && Array.isArray(filter.classroomIds)) {
      const classroomId = data.classroomId as string | undefined;
      if (classroomId && !filter.classroomIds.includes(classroomId)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Classify an error for logging and retry decisions
   */
  private classifyError(error: unknown): string {
    if (!(error instanceof Error)) return 'UNKNOWN';

    const message = error.message.toLowerCase();

    if (message.includes('timeout') || message.includes('aborted')) {
      return 'TIMEOUT';
    }
    if (message.includes('econnrefused') || message.includes('connection refused')) {
      return 'CONNECTION_REFUSED';
    }
    if (message.includes('enotfound') || message.includes('getaddrinfo')) {
      return 'DNS_ERROR';
    }
    if (message.includes('econnreset') || message.includes('socket hang up')) {
      return 'CONNECTION_RESET';
    }
    if (message.includes('certificate') || message.includes('ssl') || message.includes('tls')) {
      return 'SSL_ERROR';
    }

    return 'NETWORK_ERROR';
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// EVENT PRODUCER HELPER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Helper to create and queue webhook events
 */
export class WebhookEventProducer {
  private dispatcher: WebhookDispatcher;

  constructor(dispatcher: WebhookDispatcher) {
    this.dispatcher = dispatcher;
  }

  async sessionCompleted(params: {
    tenantId: string;
    sessionId: string;
    learnerId: string;
    subject: string;
    sessionType: string;
    startedAt: Date;
    endedAt: Date;
    activitiesCompleted: number;
    activitiesTotal: number;
    averageScore?: number;
  }): Promise<string[]> {
    const payload: WebhookPayload = {
      eventId: randomUUID(),
      eventType: 'SESSION_COMPLETED',
      tenantId: params.tenantId,
      timestamp: new Date().toISOString(),
      version: '1.0',
      data: {
        sessionId: params.sessionId,
        learnerId: params.learnerId,
        subject: params.subject,
        sessionType: params.sessionType,
        startedAt: params.startedAt.toISOString(),
        endedAt: params.endedAt.toISOString(),
        durationMinutes: Math.round(
          (params.endedAt.getTime() - params.startedAt.getTime()) / 60000
        ),
        activitiesCompleted: params.activitiesCompleted,
        activitiesTotal: params.activitiesTotal,
        averageScore: params.averageScore,
      },
    };

    return this.dispatcher.queueEvent(
      params.tenantId,
      'SESSION_COMPLETED',
      payload
    );
  }

  async baselineCompleted(params: {
    tenantId: string;
    baselineId: string;
    learnerId: string;
    subject: string;
    startedAt: Date;
    completedAt: Date;
    questionsAnswered: number;
    estimatedGradeLevel?: string;
  }): Promise<string[]> {
    const payload: WebhookPayload = {
      eventId: randomUUID(),
      eventType: 'BASELINE_COMPLETED',
      tenantId: params.tenantId,
      timestamp: new Date().toISOString(),
      version: '1.0',
      data: {
        baselineId: params.baselineId,
        learnerId: params.learnerId,
        subject: params.subject,
        startedAt: params.startedAt.toISOString(),
        completedAt: params.completedAt.toISOString(),
        questionsAnswered: params.questionsAnswered,
        estimatedGradeLevel: params.estimatedGradeLevel,
      },
    };

    return this.dispatcher.queueEvent(
      params.tenantId,
      'BASELINE_COMPLETED',
      payload
    );
  }

  async skillMasteryUpdated(params: {
    tenantId: string;
    learnerId: string;
    skillId: string;
    skillName: string;
    subject: string;
    previousMastery: number;
    newMastery: number;
    masteryLevel: 'NOT_STARTED' | 'EMERGING' | 'DEVELOPING' | 'PROFICIENT' | 'MASTERED';
  }): Promise<string[]> {
    const payload: WebhookPayload = {
      eventId: randomUUID(),
      eventType: 'SKILL_MASTERY_UPDATED',
      tenantId: params.tenantId,
      timestamp: new Date().toISOString(),
      version: '1.0',
      data: {
        learnerId: params.learnerId,
        skillId: params.skillId,
        skillName: params.skillName,
        subject: params.subject,
        previousMastery: params.previousMastery,
        newMastery: params.newMastery,
        masteryLevel: params.masteryLevel,
      },
    };

    return this.dispatcher.queueEvent(
      params.tenantId,
      'SKILL_MASTERY_UPDATED',
      payload
    );
  }

  async recommendationCreated(params: {
    tenantId: string;
    recommendationId: string;
    learnerId: string;
    recommendationType: string;
    subject?: string;
    reason?: string;
    expiresAt?: Date;
  }): Promise<string[]> {
    const payload: WebhookPayload = {
      eventId: randomUUID(),
      eventType: 'RECOMMENDATION_CREATED',
      tenantId: params.tenantId,
      timestamp: new Date().toISOString(),
      version: '1.0',
      data: {
        recommendationId: params.recommendationId,
        learnerId: params.learnerId,
        recommendationType: params.recommendationType,
        subject: params.subject,
        reason: params.reason,
        expiresAt: params.expiresAt?.toISOString(),
      },
    };

    return this.dispatcher.queueEvent(
      params.tenantId,
      'RECOMMENDATION_CREATED',
      payload
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// STANDALONE FUNCTIONS (for backwards compatibility and testing)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Queue webhook delivery for all matching endpoints (standalone function for testing)
 */
export async function queueWebhookDelivery(
  tenantId: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<{ queuedCount: number }> {
  const { prisma } = await import('./prisma.js');

  const endpoints = await prisma.webhookEndpoint.findMany({
    where: {
      tenantId,
      enabled: true,
      eventTypes: { has: eventType as WebhookEventType },
    },
  });

  let queuedCount = 0;
  for (const endpoint of endpoints) {
    await prisma.webhookDeliveryAttempt.create({
      data: {
        endpointId: endpoint.id,
        eventType: eventType as WebhookEventType,
        eventId: randomUUID(),
        payload: payload as never,
        status: 'PENDING',
        retryCount: 0,
      },
    });
    queuedCount++;
  }

  return { queuedCount };
}

/**
 * Deliver a single webhook (standalone function for testing)
 */
export async function deliverWebhook(
  attempt: {
    id: string;
    payload: Record<string, unknown>;
    status: string;
    retryCount: number;
    endpoint: { id: string; url: string; secret: string; tenantId: string };
  }
): Promise<{ success: boolean; error?: string }> {
  const { prisma } = await import('./prisma.js');
  const { signWebhookPayload } = await import('./webhook-signing.js');

  const TIMEOUT_MS = 30000;
  const payload = JSON.stringify(attempt.payload);
  const headers = signWebhookPayload(payload, attempt.endpoint.secret);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await Promise.race([
      fetch(attempt.endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: payload,
        signal: controller.signal,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), TIMEOUT_MS)
      ),
    ]);

    clearTimeout(timeoutId);

    const status = response.ok ? 'SUCCESS' : 'FAILED';
    await prisma.webhookDeliveryAttempt.update({
      where: { id: attempt.id },
      data: {
        status,
        responseStatus: response.status,
        deliveredAt: status === 'SUCCESS' ? new Date() : undefined,
        retryCount: { increment: 1 },
      },
    });

    if (response.ok) {
      return { success: true };
    }
    return { success: false, error: `HTTP ${response.status}` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await prisma.webhookDeliveryAttempt.update({
      where: { id: attempt.id },
      data: {
        status: 'FAILED',
        errorMessage,
        retryCount: { increment: 1 },
      },
    });

    return { success: false, error: errorMessage };
  }
}

/**
 * Process the delivery queue (standalone function for testing)
 */
export async function processDeliveryQueue(): Promise<{ processed: number }> {
  const { prisma } = await import('./prisma.js');

  const MAX_RETRIES = 5;
  const now = new Date();

  const pendingAttempts = await prisma.webhookDeliveryAttempt.findMany({
    where: {
      status: { in: ['PENDING', 'FAILED'] },
      retryCount: { lt: MAX_RETRIES },
      OR: [
        { nextRetryAt: null },
        { nextRetryAt: { lte: now } },
      ],
    },
    include: {
      endpoint: true,
    },
    take: 10,
  });

  let processed = 0;
  for (const attempt of pendingAttempts) {
    if (!attempt.endpoint) continue;

    const result = await deliverWebhook({
      id: attempt.id,
      payload: attempt.payload as Record<string, unknown>,
      status: attempt.status,
      retryCount: attempt.retryCount,
      endpoint: {
        id: attempt.endpoint.id,
        url: attempt.endpoint.url,
        secret: attempt.endpoint.secretKeyRef,
        tenantId: attempt.endpoint.tenantId,
      },
    });

    if (!result.success && attempt.retryCount + 1 >= MAX_RETRIES) {
      await prisma.webhookDeliveryAttempt.update({
        where: { id: attempt.id },
        data: { status: 'PERMANENT_FAILURE' },
      });
    }

    processed++;
  }

  return { processed };
}

/**
 * Get delivery status for an endpoint (standalone function for testing)
 */
export async function getDeliveryStatus(
  endpointId: string,
  limit: number = 10
): Promise<Array<{
  id: string;
  status: string;
  createdAt: Date;
  deliveredAt?: Date;
  responseStatus?: number;
  retryCount?: number;
}>> {
  const { prisma } = await import('./prisma.js');

  const deliveries = await prisma.webhookDeliveryAttempt.findMany({
    where: { endpointId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return deliveries.map((d) => ({
    id: d.id,
    status: d.status,
    createdAt: d.createdAt,
    deliveredAt: d.deliveredAt ?? undefined,
    responseStatus: d.responseStatus ?? undefined,
    retryCount: d.retryCount,
  }));
}
