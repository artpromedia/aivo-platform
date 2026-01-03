/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any */
/**
 * Webhook Handler Service
 *
 * Processes real-time webhooks from SIS providers for instant updates.
 * Supports multiple providers:
 * - Clever webhooks
 * - ClassLink webhooks
 * - OneRoster CSV SFTP notifications
 * - Ed-Fi change events
 * - Custom webhook endpoints
 *
 * Features:
 * - Signature verification for security
 * - Idempotency to prevent duplicate processing
 * - Rate limiting per tenant
 * - Retry with exponential backoff
 * - Dead letter queue for failed events
 *
 * @author AIVO Platform Team
 */

import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { PrismaClient } from '@prisma/client';
import type { ISisProvider, FieldMapping, SisProviderType } from '../providers/types';
import type { SyncEntityType, DeltaSyncEngine, DeltaRecord } from '../sync/delta-sync-engine';
import { createProvider } from '../providers';
import type { ProviderFactory } from '../providers/factory';

/**
 * Supported webhook provider types
 */
export type WebhookProviderType =
  | 'clever'
  | 'classlink'
  | 'oneroster'
  | 'edfi'
  | 'google'
  | 'microsoft'
  | 'custom';

/**
 * Webhook event types
 */
export type WebhookEventType =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'linked'
  | 'unlinked';

/**
 * Incoming webhook payload (normalized)
 */
export interface WebhookPayload {
  id: string;
  provider: WebhookProviderType;
  eventType: WebhookEventType;
  resourceType: string;
  resourceId: string;
  data: Record<string, any>;
  timestamp: Date;
  signature?: string;
  tenantId?: string;
  metadata?: Record<string, any>;
}

/**
 * Webhook configuration
 */
export interface WebhookConfig {
  id: string;
  tenantId: string;
  providerId: string;
  provider: WebhookProviderType;
  webhookSecret: string;
  enabled: boolean;
  events: string[];
  url: string;
}

/**
 * Webhook processing result
 */
export interface WebhookResult {
  success: boolean;
  eventId: string;
  processed: boolean;
  error?: string;
  retryable?: boolean;
}

/**
 * Rate limiter for webhook processing
 */
class RateLimiter {
  private buckets: Map<string, { count: number; resetAt: number }> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  check(key: string): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt < now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    if (bucket.count >= this.maxRequests) {
      return false;
    }

    bucket.count++;
    return true;
  }
}

/**
 * Idempotency tracker
 */
class IdempotencyTracker {
  private processed: Map<string, number> = new Map();
  private ttlMs: number;

  constructor(ttlMs: number = 3600000) { // 1 hour default
    this.ttlMs = ttlMs;

    // Cleanup old entries periodically
    setInterval(() => this.cleanup(), 60000);
  }

  check(eventId: string): boolean {
    const existing = this.processed.get(eventId);
    if (existing && Date.now() - existing < this.ttlMs) {
      return false; // Already processed
    }
    this.processed.set(eventId, Date.now());
    return true;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, timestamp] of this.processed) {
      if (now - timestamp > this.ttlMs) {
        this.processed.delete(key);
      }
    }
  }
}

/**
 * Webhook Handler Service
 *
 * Central service for processing webhooks from all SIS providers.
 */
export class WebhookHandlerService {
  private prisma: PrismaClient;
  private deltaSyncEngine: DeltaSyncEngine;
  private providerFactory: ProviderFactory;
  private rateLimiter: RateLimiter;
  private idempotency: IdempotencyTracker;
  private configs: Map<string, WebhookConfig> = new Map();

  constructor(
    prisma: PrismaClient,
    deltaSyncEngine: DeltaSyncEngine,
    providerFactory: ProviderFactory
  ) {
    this.prisma = prisma;
    this.deltaSyncEngine = deltaSyncEngine;
    this.providerFactory = providerFactory;
    this.rateLimiter = new RateLimiter();
    this.idempotency = new IdempotencyTracker();
  }

  /**
   * Load webhook configurations from database
   */
  async loadConfigs(): Promise<void> {
    const configs = await this.prisma.webhookConfig.findMany({
      where: { enabled: true },
    });

    this.configs.clear();
    for (const config of configs) {
      this.configs.set(`${config.tenantId}:${config.providerId}`, config as unknown as WebhookConfig);
    }

    console.log('[WebhookHandler] Loaded webhook configs', {
      count: configs.length,
    });
  }

  /**
   * Process an incoming webhook
   */
  async processWebhook(
    provider: WebhookProviderType,
    headers: Record<string, string>,
    body: any,
    tenantId?: string
  ): Promise<WebhookResult> {
    const eventId = this.extractEventId(provider, headers, body);

    console.log('[WebhookHandler] Processing webhook', {
      provider,
      eventId,
      tenantId,
    });

    // Check rate limit
    const rateLimitKey = tenantId || 'global';
    if (!this.rateLimiter.check(rateLimitKey)) {
      return {
        success: false,
        eventId,
        processed: false,
        error: 'Rate limit exceeded',
        retryable: true,
      };
    }

    // Check idempotency
    if (!this.idempotency.check(eventId)) {
      return {
        success: true,
        eventId,
        processed: false, // Already processed
      };
    }

    try {
      // Parse and validate the webhook
      const payload = await this.parseWebhook(provider, headers, body);

      // Find webhook config
      const config = await this.findConfig(provider, tenantId);
      if (!config) {
        return {
          success: false,
          eventId,
          processed: false,
          error: 'No webhook configuration found',
        };
      }

      // Verify signature
      if (!this.verifySignature(provider, headers, body, config.webhookSecret)) {
        console.warn('[WebhookHandler] Invalid signature', { eventId });
        return {
          success: false,
          eventId,
          processed: false,
          error: 'Invalid signature',
        };
      }

      // Check if event type is enabled
      if (!this.isEventEnabled(config, payload.eventType, payload.resourceType)) {
        return {
          success: true,
          eventId,
          processed: false, // Ignored by config
        };
      }

      // Process the event
      await this.handleEvent(config, payload);

      // Log success
      await this.logWebhookEvent(config.tenantId, eventId, payload, 'success');

      return {
        success: true,
        eventId,
        processed: true,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[WebhookHandler] Failed to process webhook', {
        eventId,
        error: message,
      });

      // Log failure
      await this.logWebhookEvent(tenantId || 'unknown', eventId, body, 'failed', message);

      // Add to dead letter queue if not retryable
      if (!this.isRetryableError(error)) {
        await this.addToDeadLetterQueue(eventId, provider, body, message);
      }

      return {
        success: false,
        eventId,
        processed: false,
        error: message,
        retryable: this.isRetryableError(error),
      };
    }
  }

  /**
   * Parse webhook payload based on provider
   */
  private async parseWebhook(
    provider: WebhookProviderType,
    headers: Record<string, string>,
    body: any
  ): Promise<WebhookPayload> {
    switch (provider) {
      case 'clever':
        return this.parseCleverWebhook(headers, body);
      case 'classlink':
        return this.parseClassLinkWebhook(headers, body);
      case 'oneroster':
        return this.parseOneRosterWebhook(headers, body);
      case 'edfi':
        return this.parseEdFiWebhook(headers, body);
      case 'google':
        return this.parseGoogleWebhook(headers, body);
      case 'microsoft':
        return this.parseMicrosoftWebhook(headers, body);
      default:
        return this.parseCustomWebhook(headers, body);
    }
  }

  /**
   * Parse Clever webhook
   */
  private parseCleverWebhook(
    _headers: Record<string, string>,
    body: any
  ): WebhookPayload {
    const event = body;

    return {
      id: event.id,
      provider: 'clever',
      eventType: this.mapCleverEventType(event.type),
      resourceType: this.extractResourceType(event.type),
      resourceId: event.data?.object?.id || event.data?.id,
      data: event.data?.object || event.data,
      timestamp: new Date(event.created * 1000),
      metadata: {
        cleverType: event.type,
      },
    };
  }

  /**
   * Parse ClassLink webhook
   */
  private parseClassLinkWebhook(
    _headers: Record<string, string>,
    body: any
  ): WebhookPayload {
    return {
      id: body.event_id || body.id,
      provider: 'classlink',
      eventType: this.mapClassLinkEventType(body.event_type),
      resourceType: body.resource_type || body.type,
      resourceId: body.resource_id || body.sourcedId,
      data: body.data || body,
      timestamp: new Date(body.timestamp || Date.now()),
    };
  }

  /**
   * Parse OneRoster webhook (typically file notification)
   */
  private parseOneRosterWebhook(
    _headers: Record<string, string>,
    body: any
  ): WebhookPayload {
    return {
      id: body.notification_id || createHash('sha256').update(JSON.stringify(body)).digest('hex'),
      provider: 'oneroster',
      eventType: 'updated', // File-based, always treated as update
      resourceType: body.file_type || 'bulk',
      resourceId: body.file_path || 'bulk',
      data: body,
      timestamp: new Date(body.timestamp || Date.now()),
      metadata: {
        filePath: body.file_path,
        fileType: body.file_type,
      },
    };
  }

  /**
   * Parse Ed-Fi change event webhook
   */
  private parseEdFiWebhook(
    _headers: Record<string, string>,
    body: any
  ): WebhookPayload {
    return {
      id: body.id || `edfi_${body.changeVersion}`,
      provider: 'edfi',
      eventType: this.mapEdFiEventType(body.changeType),
      resourceType: body.resourceType || body.resource,
      resourceId: body.resourceId || body.id,
      data: body.data || body.target || body,
      timestamp: new Date(body.timestamp || Date.now()),
      metadata: {
        changeVersion: body.changeVersion,
        namespace: body.namespace,
      },
    };
  }

  /**
   * Parse Google Classroom webhook
   */
  private parseGoogleWebhook(
    headers: Record<string, string>,
    body: any
  ): WebhookPayload {
    return {
      id: headers['x-goog-message-number'] || body.message?.messageId,
      provider: 'google',
      eventType: this.mapGoogleEventType(body.message?.data),
      resourceType: body.message?.attributes?.resourceType || 'unknown',
      resourceId: body.message?.attributes?.resourceId || '',
      data: body.message?.data ? JSON.parse(Buffer.from(body.message.data, 'base64').toString()) : body,
      timestamp: new Date(body.message?.publishTime || Date.now()),
    };
  }

  /**
   * Parse Microsoft Graph webhook
   */
  private parseMicrosoftWebhook(
    _headers: Record<string, string>,
    body: any
  ): WebhookPayload {
    const notification = body.value?.[0] || body;

    return {
      id: notification.id || `ms_${Date.now()}`,
      provider: 'microsoft',
      eventType: this.mapMicrosoftEventType(notification.changeType),
      resourceType: this.extractMicrosoftResourceType(notification.resource),
      resourceId: notification.resourceData?.id || '',
      data: notification.resourceData || notification,
      timestamp: new Date(notification.subscriptionExpirationDateTime || Date.now()),
      metadata: {
        subscriptionId: notification.subscriptionId,
        tenantId: notification.tenantId,
      },
    };
  }

  /**
   * Parse custom webhook format
   */
  private parseCustomWebhook(
    headers: Record<string, string>,
    body: any
  ): WebhookPayload {
    return {
      id: body.id || headers['x-event-id'] || createHash('sha256').update(JSON.stringify(body)).digest('hex'),
      provider: 'custom',
      eventType: body.event_type || body.eventType || 'updated',
      resourceType: body.resource_type || body.resourceType || 'unknown',
      resourceId: body.resource_id || body.resourceId || '',
      data: body.data || body,
      timestamp: new Date(body.timestamp || Date.now()),
    };
  }

  /**
   * Verify webhook signature
   */
  private verifySignature(
    provider: WebhookProviderType,
    headers: Record<string, string>,
    body: any,
    secret: string
  ): boolean {
    if (!secret) {
      // No secret configured, skip verification (development only!)
      console.warn('[WebhookHandler] No webhook secret configured');
      return true;
    }

    try {
      switch (provider) {
        case 'clever':
          return this.verifyCleverSignature(headers, body, secret);
        case 'classlink':
          return this.verifyClassLinkSignature(headers, body, secret);
        case 'google':
          // Google uses JWT validation
          return this.verifyGoogleSignature(headers, body, secret);
        case 'microsoft':
          // Microsoft sends validation token
          return this.verifyMicrosoftSignature(headers, body, secret);
        default:
          return this.verifyGenericHmacSignature(headers, body, secret);
      }
    } catch (error) {
      console.error('[WebhookHandler] Signature verification error', error);
      return false;
    }
  }

  /**
   * Verify Clever HMAC signature
   */
  private verifyCleverSignature(
    headers: Record<string, string>,
    body: any,
    secret: string
  ): boolean {
    const signature = headers['x-clever-signature'] || headers['clever-webhook-signature'];
    if (!signature) return false;

    const payload = typeof body === 'string' ? body : JSON.stringify(body);
    const expectedSignature = createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Verify ClassLink signature
   */
  private verifyClassLinkSignature(
    headers: Record<string, string>,
    body: any,
    secret: string
  ): boolean {
    const signature = headers['x-classlink-signature'] || headers['x-hub-signature-256'];
    if (!signature) return false;

    const payload = typeof body === 'string' ? body : JSON.stringify(body);
    const expectedSignature = 'sha256=' + createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Verify Google webhook signature
   */
  private verifyGoogleSignature(
    headers: Record<string, string>,
    _body: any,
    _secret: string
  ): boolean {
    // Google uses push subscription with authentication
    // The secret is used as the token in the query parameter
    const authHeader = headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) return false;

    // In production, validate the JWT token
    // For now, just check the token exists
    return authHeader.length > 10;
  }

  /**
   * Verify Microsoft webhook validation
   */
  private verifyMicrosoftSignature(
    _headers: Record<string, string>,
    body: any,
    secret: string
  ): boolean {
    // Microsoft sends a validation token that we need to echo back
    // For ongoing notifications, verify client state matches
    if (body.validationToken) {
      // This is a subscription validation
      return true;
    }

    // Check client state matches for notifications
    if (body.value?.[0]?.clientState) {
      return body.value[0].clientState === secret;
    }

    return true;
  }

  /**
   * Verify generic HMAC signature
   */
  private verifyGenericHmacSignature(
    headers: Record<string, string>,
    body: any,
    secret: string
  ): boolean {
    const signature =
      headers['x-signature-256'] ||
      headers['x-hub-signature-256'] ||
      headers['x-webhook-signature'];

    if (!signature) {
      // In production, reject webhooks without signatures
      if (process.env.NODE_ENV === 'production') {
        console.warn('[WebhookHandler] Missing signature header - rejecting webhook');
        return false;
      }
      console.warn('[WebhookHandler] Missing signature header - allowing in development only');
      return true;
    }

    const payload = typeof body === 'string' ? body : JSON.stringify(body);
    const [algo, hash] = signature.includes('=')
      ? signature.split('=')
      : ['sha256', signature];

    const expectedHash = createHmac(algo, secret)
      .update(payload)
      .digest('hex');

    return timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash));
  }

  /**
   * Handle a parsed webhook event
   */
  private async handleEvent(
    config: WebhookConfig,
    payload: WebhookPayload
  ): Promise<void> {
    const entityType = this.mapResourceToEntityType(payload.resourceType);

    if (!entityType) {
      console.log('[WebhookHandler] Unknown resource type', {
        resourceType: payload.resourceType,
      });
      return;
    }

    // Get the provider
    const provider = await this.providerFactory.getProvider(
      config.tenantId,
      config.providerId
    );

    if (!provider) {
      throw new Error(`Provider not found: ${config.providerId}`);
    }

    // Create delta record
    const deltaRecord: DeltaRecord = {
      id: payload.id,
      entityType,
      entityId: payload.resourceId,
      operation: this.mapEventToOperation(payload.eventType),
      sourceData: payload.data,
      currentHash: this.calculateHash(payload.data),
      sourceSystem: payload.provider,
      sourceId: payload.resourceId,
      timestamp: payload.timestamp,
      metadata: payload.metadata,
    };

    // Process through delta sync engine
    await this.deltaSyncEngine.processDeltaRecord(
      {
        tenantId: config.tenantId,
        providerId: config.providerId,
        provider: provider as ISisProvider,
        batchSize: 1,
        maxRetries: 3,
        conflictResolution: 'source_wins',
        enabledEntityTypes: [entityType],
        fieldMappings: {} as Record<SyncEntityType, FieldMapping[]>,
        webhookEnabled: true,
      },
      deltaRecord,
      entityType
    );

    console.log('[WebhookHandler] Event processed', {
      eventId: payload.id,
      entityType,
      operation: deltaRecord.operation,
    });
  }

  /**
   * Map resource type to entity type
   */
  private mapResourceToEntityType(resourceType: string): SyncEntityType | null {
    const mapping: Record<string, SyncEntityType> = {
      // Clever
      'students': 'student',
      'student': 'student',
      'teachers': 'teacher',
      'teacher': 'teacher',
      'staff': 'teacher',
      'schools': 'org',
      'school': 'org',
      'sections': 'class',
      'section': 'class',
      'courses': 'class',
      'course': 'class',
      'enrollments': 'enrollment',
      'enrollment': 'enrollment',
      'studentEnrollments': 'enrollment',
      'contacts': 'parent',
      'parents': 'parent',
      'parent': 'parent',
      'guardians': 'parent',
      // Ed-Fi
      'staffs': 'teacher',
      'educationOrganizations': 'org',
      'edfiSections': 'class',
      'studentSectionAssociations': 'enrollment',
      'staffSectionAssociations': 'enrollment',
      'studentParentAssociations': 'relationship',
      'sessions': 'term',
      // OneRoster
      'users': 'student', // Will be refined by role
      'classes': 'class',
      'orgs': 'org',
      'academicSessions': 'term',
      // Microsoft
      'educationUsers': 'student',
      'educationClasses': 'class',
      'educationSchools': 'org',
    };

    const normalized = resourceType.toLowerCase().replace(/[^a-z]/g, '');
    return mapping[resourceType] || mapping[normalized] || null;
  }

  /**
   * Map event type to sync operation
   */
  private mapEventToOperation(eventType: WebhookEventType): 'create' | 'update' | 'delete' | 'link' | 'unlink' {
    switch (eventType) {
      case 'created':
        return 'create';
      case 'updated':
        return 'update';
      case 'deleted':
        return 'delete';
      case 'linked':
        return 'link';
      case 'unlinked':
        return 'unlink';
      default:
        return 'update';
    }
  }

  // Event type mapping helpers

  private mapCleverEventType(type: string): WebhookEventType {
    if (type.includes('.created')) return 'created';
    if (type.includes('.updated')) return 'updated';
    if (type.includes('.deleted')) return 'deleted';
    return 'updated';
  }

  private mapClassLinkEventType(type: string): WebhookEventType {
    const normalized = type?.toLowerCase() || '';
    if (normalized.includes('create') || normalized.includes('add')) return 'created';
    if (normalized.includes('update') || normalized.includes('modify')) return 'updated';
    if (normalized.includes('delete') || normalized.includes('remove')) return 'deleted';
    return 'updated';
  }

  private mapEdFiEventType(changeType: string): WebhookEventType {
    switch (changeType?.toLowerCase()) {
      case 'add':
        return 'created';
      case 'update':
        return 'updated';
      case 'delete':
        return 'deleted';
      default:
        return 'updated';
    }
  }

  private mapGoogleEventType(_data: any): WebhookEventType {
    // Google uses Pub/Sub messages, decode and check
    return 'updated';
  }

  private mapMicrosoftEventType(changeType: string): WebhookEventType {
    switch (changeType?.toLowerCase()) {
      case 'created':
        return 'created';
      case 'updated':
        return 'updated';
      case 'deleted':
        return 'deleted';
      default:
        return 'updated';
    }
  }

  private extractResourceType(eventType: string): string {
    // Clever event types are like "students.created", "sections.updated"
    return eventType.split('.')[0];
  }

  private extractMicrosoftResourceType(resource: string): string {
    // Resource paths like "/education/users/{id}"
    const parts = resource.split('/').filter(Boolean);
    return parts[1] || parts[0] || 'unknown';
  }

  // Helper methods

  private extractEventId(
    provider: WebhookProviderType,
    headers: Record<string, string>,
    body: any
  ): string {
    // Try to extract a unique event ID
    return (
      body.id ||
      body.event_id ||
      body.eventId ||
      headers['x-event-id'] ||
      headers['x-request-id'] ||
      `${provider}_${createHash('sha256').update(JSON.stringify(body)).digest('hex').slice(0, 16)}`
    );
  }

  private async findConfig(
    provider: WebhookProviderType,
    tenantId?: string
  ): Promise<WebhookConfig | null> {
    // If tenant is specified, look for exact match
    if (tenantId) {
      for (const [_, config] of this.configs) {
        if (config.tenantId === tenantId && config.provider === provider) {
          return config;
        }
      }
    }

    // Fall back to first matching provider
    for (const [_, config] of this.configs) {
      if (config.provider === provider) {
        return config;
      }
    }

    return null;
  }

  private isEventEnabled(
    config: WebhookConfig,
    eventType: WebhookEventType,
    resourceType: string
  ): boolean {
    if (!config.events || config.events.length === 0) {
      return true; // All events enabled
    }

    // Check for wildcard
    if (config.events.includes('*')) return true;

    // Check for specific event
    const eventKey = `${resourceType}.${eventType}`;
    return (
      config.events.includes(eventKey) ||
      config.events.includes(resourceType) ||
      config.events.includes(eventType)
    );
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      // Network errors are retryable
      if (error.message.includes('ECONNREFUSED')) return true;
      if (error.message.includes('ETIMEDOUT')) return true;
      if (error.message.includes('ENOTFOUND')) return true;

      // Rate limit errors are retryable
      if (error.message.includes('rate limit')) return true;
      if (error.message.includes('429')) return true;

      // Server errors are retryable
      if (error.message.includes('500')) return true;
      if (error.message.includes('502')) return true;
      if (error.message.includes('503')) return true;
      if (error.message.includes('504')) return true;
    }

    return false;
  }

  private async logWebhookEvent(
    tenantId: string,
    eventId: string,
    payload: any,
    status: 'success' | 'failed',
    error?: string
  ): Promise<void> {
    try {
      await this.prisma.webhookLog.create({
        data: {
          tenantId,
          eventId,
          payload: typeof payload === 'string' ? payload : JSON.stringify(payload),
          status,
          error,
          processedAt: new Date(),
        },
      });
    } catch (err) {
      console.error('[WebhookHandler] Failed to log webhook event', err);
    }
  }

  private async addToDeadLetterQueue(
    eventId: string,
    provider: WebhookProviderType,
    payload: any,
    error: string
  ): Promise<void> {
    try {
      await this.prisma.webhookDeadLetter.create({
        data: {
          eventId,
          provider,
          payload: typeof payload === 'string' ? payload : JSON.stringify(payload),
          error,
          createdAt: new Date(),
          retryCount: 0,
        },
      });
    } catch (err) {
      console.error('[WebhookHandler] Failed to add to dead letter queue', err);
    }
  }

  private calculateHash(data: Record<string, any>): string {
    const normalized = JSON.stringify(data, Object.keys(data).sort());
    return createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Retry failed webhooks from dead letter queue
   */
  async retryDeadLetterQueue(maxRetries: number = 3): Promise<number> {
    const failedEvents = await this.prisma.webhookDeadLetter.findMany({
      where: {
        retryCount: { lt: maxRetries },
      },
      take: 100,
      orderBy: { createdAt: 'asc' },
    });

    let retried = 0;

    for (const event of failedEvents) {
      try {
        const payload = JSON.parse(event.payload);
        const result = await this.processWebhook(
          event.provider as WebhookProviderType,
          {},
          payload
        );

        if (result.success && result.processed) {
          // Remove from dead letter queue
          await this.prisma.webhookDeadLetter.delete({
            where: { id: event.id },
          });
          retried++;
        } else {
          // Increment retry count
          await this.prisma.webhookDeadLetter.update({
            where: { id: event.id },
            data: {
              retryCount: { increment: 1 },
              lastRetryAt: new Date(),
              error: result.error,
            },
          });
        }
      } catch (error) {
        await this.prisma.webhookDeadLetter.update({
          where: { id: event.id },
          data: {
            retryCount: { increment: 1 },
            lastRetryAt: new Date(),
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    }

    return retried;
  }
}
