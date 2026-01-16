/**
 * AIVO Event Collector Service - Routing Service
 *
 * Manages event routing rules and delivery to destinations.
 */

import { connect, NatsConnection, StringCodec } from 'nats';
import { KinesisClient, PutRecordCommand } from '@aws-sdk/client-kinesis';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

import { config } from '../config.js';
import { prisma } from '../prisma.js';
import type { CreateRouteInput, UpdateRouteInput, DestinationType } from '../types/index.js';

// Destination clients
let natsConnection: NatsConnection | null = null;
const kinesisClient = new KinesisClient({});
const sqsClient = new SQSClient({});
const stringCodec = StringCodec();

// Route cache
const routeCache = new Map<string, { routes: RouteConfig[]; cachedAt: number }>();
const ROUTE_CACHE_TTL = 60000; // 1 minute

interface RouteConfig {
  id: string;
  name: string;
  tenantId: string;
  eventTypePattern: string;
  sourcePattern: string | null;
  conditions: Record<string, unknown> | null;
  destinationType: DestinationType;
  destinationConfig: Record<string, unknown>;
  transformTemplate: string | null;
  enrichmentRules: Record<string, unknown> | null;
  filterRules: Record<string, unknown> | null;
  rateLimitPerSec: number | null;
  rateLimitBurst: number | null;
  maxRetries: number;
  retryDelayMs: number;
  retryBackoff: number;
  priority: number;
  isActive: boolean;
}

/**
 * Initialize routing service.
 */
export async function initRouting(): Promise<void> {
  if (config.nats.enabled) {
    try {
      natsConnection = await connect({
        servers: config.nats.url,
        name: `event-collector-${config.instanceId}`,
      });
      console.log('Connected to NATS for event routing');
    } catch (error) {
      console.error('Failed to connect to NATS:', error);
    }
  }
}

/**
 * Shutdown routing service.
 */
export async function shutdownRouting(): Promise<void> {
  if (natsConnection) {
    await natsConnection.drain();
    await natsConnection.close();
    natsConnection = null;
  }
}

/**
 * Get routes for an event.
 */
export async function getRoutesForEvent(
  tenantId: string,
  eventType: string,
  sourceService?: string
): Promise<RouteConfig[]> {
  const cacheKey = tenantId;
  const cached = routeCache.get(cacheKey);

  let routes: RouteConfig[];

  if (cached && Date.now() - cached.cachedAt < ROUTE_CACHE_TTL) {
    routes = cached.routes;
  } else {
    // Fetch all active routes for tenant
    const dbRoutes = await prisma.eventRoute.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      orderBy: { priority: 'desc' },
    });

    routes = dbRoutes.map((r) => ({
      id: r.id,
      name: r.name,
      tenantId: r.tenantId,
      eventTypePattern: r.eventTypePattern,
      sourcePattern: r.sourcePattern,
      conditions: r.conditions as Record<string, unknown> | null,
      destinationType: r.destinationType as DestinationType,
      destinationConfig: r.destinationConfig as Record<string, unknown>,
      transformTemplate: r.transformTemplate,
      enrichmentRules: r.enrichmentRules as Record<string, unknown> | null,
      filterRules: r.filterRules as Record<string, unknown> | null,
      rateLimitPerSec: r.rateLimitPerSec,
      rateLimitBurst: r.rateLimitBurst,
      maxRetries: r.maxRetries,
      retryDelayMs: r.retryDelayMs,
      retryBackoff: r.retryBackoff,
      priority: r.priority,
      isActive: r.isActive,
    }));

    routeCache.set(cacheKey, { routes, cachedAt: Date.now() });
  }

  // Filter routes that match the event
  return routes.filter((route) => {
    // Match event type pattern
    if (!matchPattern(eventType, route.eventTypePattern)) {
      return false;
    }

    // Match source pattern if specified
    if (route.sourcePattern && sourceService) {
      if (!matchPattern(sourceService, route.sourcePattern)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Match a value against a pattern (supports wildcards).
 */
function matchPattern(value: string, pattern: string): boolean {
  if (pattern === '*') return true;

  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(value);
}

/**
 * Deliver an event to a route destination.
 */
export async function deliverEvent(event: any, route: RouteConfig): Promise<void> {
  // Apply transformation if specified
  let payload = event.payload;
  if (route.transformTemplate) {
    payload = applyTransform(event, route.transformTemplate);
  }

  // Apply enrichment if specified
  if (route.enrichmentRules) {
    payload = applyEnrichment(payload, route.enrichmentRules, event);
  }

  // Apply filter rules
  if (route.filterRules && !passesFilter(event, route.filterRules)) {
    return; // Event filtered out
  }

  // Build the message envelope
  const envelope = {
    eventId: event.eventId,
    eventType: event.eventType,
    eventVersion: event.eventVersion,
    tenantId: event.tenantId,
    occurredAt: event.occurredAt,
    payload,
    metadata: event.metadata,
    correlationId: event.correlationId,
    causationId: event.causationId,
    sourceService: event.sourceService,
    routeName: route.name,
    deliveredAt: new Date().toISOString(),
  };

  // Deliver based on destination type
  let attempts = 0;
  let lastError: Error | null = null;

  while (attempts <= route.maxRetries) {
    try {
      await deliverToDestination(envelope, route);

      // Record successful delivery
      await recordDeliveryAttempt(event.id, route.id, attempts + 1, 'SUCCESS');
      return;
    } catch (error: any) {
      lastError = error;
      attempts++;

      if (attempts <= route.maxRetries) {
        // Wait before retry with exponential backoff
        const delay = route.retryDelayMs * Math.pow(route.retryBackoff, attempts - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // Record failed delivery
  await recordDeliveryAttempt(
    event.id,
    route.id,
    attempts,
    'FAILED',
    lastError?.message
  );

  throw lastError || new Error('Delivery failed');
}

/**
 * Deliver to a specific destination type.
 */
async function deliverToDestination(envelope: any, route: RouteConfig): Promise<void> {
  const destConfig = route.destinationConfig;

  switch (route.destinationType) {
    case 'NATS':
      await deliverToNats(envelope, destConfig);
      break;
    case 'KINESIS':
      await deliverToKinesis(envelope, destConfig);
      break;
    case 'SQS':
      await deliverToSqs(envelope, destConfig);
      break;
    case 'WEBHOOK':
      await deliverToWebhook(envelope, destConfig);
      break;
    case 'INTERNAL':
      await deliverInternal(envelope, destConfig);
      break;
    default:
      throw new Error(`Unknown destination type: ${route.destinationType}`);
  }
}

/**
 * Deliver to NATS.
 */
async function deliverToNats(
  envelope: any,
  config: Record<string, unknown>
): Promise<void> {
  if (!natsConnection) {
    throw new Error('NATS connection not available');
  }

  const subject = config.subject as string;
  const data = stringCodec.encode(JSON.stringify(envelope));

  await natsConnection.publish(subject, data);
}

/**
 * Deliver to Kinesis.
 */
async function deliverToKinesis(
  envelope: any,
  config: Record<string, unknown>
): Promise<void> {
  const command = new PutRecordCommand({
    StreamName: config.streamName as string,
    Data: Buffer.from(JSON.stringify(envelope)),
    PartitionKey: envelope.tenantId || envelope.eventId,
  });

  await kinesisClient.send(command);
}

/**
 * Deliver to SQS.
 */
async function deliverToSqs(
  envelope: any,
  config: Record<string, unknown>
): Promise<void> {
  const command = new SendMessageCommand({
    QueueUrl: config.queueUrl as string,
    MessageBody: JSON.stringify(envelope),
    MessageGroupId: config.fifo ? envelope.tenantId : undefined,
    MessageDeduplicationId: config.fifo ? envelope.eventId : undefined,
  });

  await sqsClient.send(command);
}

/**
 * Deliver to webhook.
 */
async function deliverToWebhook(
  envelope: any,
  config: Record<string, unknown>
): Promise<void> {
  const url = config.url as string;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(config.headers as Record<string, string> || {}),
  };

  // Add authentication if configured
  if (config.authType === 'bearer' && config.authToken) {
    headers['Authorization'] = `Bearer ${config.authToken}`;
  } else if (config.authType === 'basic' && config.authUser && config.authPass) {
    const credentials = Buffer.from(`${config.authUser}:${config.authPass}`).toString('base64');
    headers['Authorization'] = `Basic ${credentials}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(envelope),
    signal: AbortSignal.timeout(config.timeoutMs as number || 30000),
  });

  if (!response.ok) {
    throw new Error(`Webhook delivery failed: ${response.status} ${response.statusText}`);
  }
}

/**
 * Deliver internally (for cross-service communication).
 */
async function deliverInternal(
  envelope: any,
  config: Record<string, unknown>
): Promise<void> {
  // Internal delivery typically goes through NATS
  if (natsConnection) {
    const subject = `aivo.internal.${config.service}.${config.action}`;
    const data = stringCodec.encode(JSON.stringify(envelope));
    await natsConnection.publish(subject, data);
  }
}

/**
 * Apply transformation template to event.
 */
function applyTransform(event: any, template: string): Record<string, unknown> {
  // Simple template replacement
  // In production, use a proper template engine like jsonata or jmespath
  try {
    const templateObj = JSON.parse(template);
    return resolveTemplate(templateObj, event);
  } catch {
    return event.payload;
  }
}

/**
 * Resolve template with event data.
 */
function resolveTemplate(template: any, context: any): any {
  if (typeof template === 'string') {
    // Replace {{path}} with values from context
    return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
      return getNestedValue(context, path.trim()) ?? '';
    });
  }

  if (Array.isArray(template)) {
    return template.map((item) => resolveTemplate(item, context));
  }

  if (template && typeof template === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(template)) {
      result[key] = resolveTemplate(value, context);
    }
    return result;
  }

  return template;
}

/**
 * Get nested value from object.
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Apply enrichment rules.
 */
function applyEnrichment(
  payload: Record<string, unknown>,
  rules: Record<string, unknown>,
  event: any
): Record<string, unknown> {
  const enriched = { ...payload };

  for (const [key, rule] of Object.entries(rules)) {
    if (typeof rule === 'string' && rule.startsWith('$')) {
      // Reference to event field
      const path = rule.slice(1);
      enriched[key] = getNestedValue(event, path);
    } else {
      enriched[key] = rule;
    }
  }

  return enriched;
}

/**
 * Check if event passes filter rules.
 */
function passesFilter(event: any, rules: Record<string, unknown>): boolean {
  for (const [path, condition] of Object.entries(rules)) {
    const value = getNestedValue(event, path);

    if (typeof condition === 'object' && condition !== null) {
      const cond = condition as Record<string, unknown>;

      if ('$eq' in cond && value !== cond.$eq) return false;
      if ('$ne' in cond && value === cond.$ne) return false;
      if ('$gt' in cond && !(value > (cond.$gt as number))) return false;
      if ('$gte' in cond && !(value >= (cond.$gte as number))) return false;
      if ('$lt' in cond && !(value < (cond.$lt as number))) return false;
      if ('$lte' in cond && !(value <= (cond.$lte as number))) return false;
      if ('$in' in cond && !(cond.$in as unknown[]).includes(value)) return false;
      if ('$nin' in cond && (cond.$nin as unknown[]).includes(value)) return false;
      if ('$exists' in cond && (cond.$exists ? value === undefined : value !== undefined)) return false;
      if ('$regex' in cond && !new RegExp(cond.$regex as string).test(value)) return false;
    } else if (value !== condition) {
      return false;
    }
  }

  return true;
}

/**
 * Record a delivery attempt.
 */
async function recordDeliveryAttempt(
  eventId: string,
  routeId: string,
  attemptNumber: number,
  status: string,
  errorMessage?: string
): Promise<void> {
  await prisma.deliveryAttempt.create({
    data: {
      eventId,
      routeId,
      attemptNumber,
      status: status as any,
      errorMessage,
      attemptedAt: new Date(),
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTE MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new route.
 */
export async function createRoute(tenantId: string, input: CreateRouteInput): Promise<RouteConfig> {
  const route = await prisma.eventRoute.create({
    data: {
      tenantId,
      name: input.name,
      description: input.description,
      eventTypePattern: input.eventTypePattern,
      sourcePattern: input.sourcePattern,
      conditions: input.conditions,
      destinationType: input.destinationType,
      destinationConfig: input.destinationConfig,
      transformTemplate: input.transformTemplate,
      enrichmentRules: input.enrichmentRules,
      filterRules: input.filterRules,
      rateLimitPerSec: input.rateLimitPerSec,
      rateLimitBurst: input.rateLimitBurst,
      maxRetries: input.maxRetries ?? 3,
      retryDelayMs: input.retryDelayMs ?? 1000,
      retryBackoff: input.retryBackoff ?? 2,
      priority: input.priority ?? 0,
      isActive: true,
    },
  });

  // Invalidate cache
  routeCache.delete(tenantId);

  return route as RouteConfig;
}

/**
 * Update a route.
 */
export async function updateRoute(
  tenantId: string,
  routeId: string,
  input: UpdateRouteInput
): Promise<RouteConfig> {
  const route = await prisma.eventRoute.update({
    where: { id: routeId, tenantId },
    data: {
      name: input.name,
      description: input.description,
      isActive: input.isActive,
      eventTypePattern: input.eventTypePattern,
      sourcePattern: input.sourcePattern,
      conditions: input.conditions,
      destinationConfig: input.destinationConfig,
      transformTemplate: input.transformTemplate,
      enrichmentRules: input.enrichmentRules,
      filterRules: input.filterRules,
      rateLimitPerSec: input.rateLimitPerSec,
      rateLimitBurst: input.rateLimitBurst,
      maxRetries: input.maxRetries,
      retryDelayMs: input.retryDelayMs,
      retryBackoff: input.retryBackoff,
      priority: input.priority,
    },
  });

  // Invalidate cache
  routeCache.delete(tenantId);

  return route as RouteConfig;
}

/**
 * Delete a route.
 */
export async function deleteRoute(tenantId: string, routeId: string): Promise<void> {
  await prisma.eventRoute.delete({
    where: { id: routeId, tenantId },
  });

  // Invalidate cache
  routeCache.delete(tenantId);
}

/**
 * Get a route by ID.
 */
export async function getRoute(tenantId: string, routeId: string): Promise<RouteConfig | null> {
  const route = await prisma.eventRoute.findFirst({
    where: { id: routeId, tenantId },
  });

  return route as RouteConfig | null;
}

/**
 * List routes for a tenant.
 */
export async function listRoutes(
  tenantId: string,
  options: { page?: number; pageSize?: number; isActive?: boolean } = {}
): Promise<{ routes: RouteConfig[]; total: number }> {
  const { page = 1, pageSize = 20, isActive } = options;
  const skip = (page - 1) * pageSize;

  const where = {
    tenantId,
    ...(isActive !== undefined && { isActive }),
  };

  const [routes, total] = await Promise.all([
    prisma.eventRoute.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { name: 'asc' }],
      skip,
      take: pageSize,
    }),
    prisma.eventRoute.count({ where }),
  ]);

  return { routes: routes as RouteConfig[], total };
}

/**
 * Clear route cache (useful for testing or manual refresh).
 */
export function clearRouteCache(): void {
  routeCache.clear();
}
