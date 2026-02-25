/**
 * Plan Limit Enforcement Middleware (Sprint 12)
 *
 * Fastify preHandler hooks that check metered usage limits before allowing
 * operations to proceed. Supports two enforcement modes:
 *
 *   - Soft limit (80% default): Adds a warning header but allows the request
 *   - Hard limit (100%):        Blocks the request with 429 Too Many Requests
 *
 * Usage:
 *   fastify.post('/api/v1/ai/session', {
 *     preHandler: [enforceMeterLimit('ai_interactions')],
 *   }, handler);
 *
 *   // Or enforce multiple limits at once:
 *   fastify.post('/api/v1/content', {
 *     preHandler: [enforceMeterLimits(['storage_bytes', 'api_calls'])],
 *   }, handler);
 *
 * The middleware extracts tenantId from:
 *   1. request.params.tenantId
 *   2. request.headers['x-tenant-id']
 *   3. Decoded JWT token's tenantId claim
 */

import type { FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';

import { meteringService, type MeterMetric, type LimitCheckResult } from '../services/metering.service.js';
import { billingEventPublisher, BillingEventType } from '../events/billing.publisher.js';

// ══════════════════════════════════════════════════════════════════════════════
// RESPONSE HEADERS
// ══════════════════════════════════════════════════════════════════════════════

const HEADER_USAGE_WARNING = 'X-Usage-Warning';
const HEADER_USAGE_LIMIT = 'X-Usage-Limit';
const HEADER_USAGE_CURRENT = 'X-Usage-Current';
const HEADER_USAGE_REMAINING = 'X-Usage-Remaining';

// ══════════════════════════════════════════════════════════════════════════════
// TENANT ID EXTRACTION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Extract tenantId from request context using multiple strategies.
 */
function extractTenantId(request: FastifyRequest): string | null {
  // 1. Route params
  const params = request.params as Record<string, string>;
  if (params?.tenantId) return params.tenantId;

  // 2. Custom header
  const headerTenantId = request.headers['x-tenant-id'];
  if (typeof headerTenantId === 'string') return headerTenantId;

  // 3. JWT claim (if auth middleware has decoded it)
  const user = (request as Record<string, unknown>).user as { tenantId?: string } | undefined;
  if (user?.tenantId) return user.tenantId;

  return null;
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLE METRIC ENFORCEMENT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create a preHandler that enforces limits for a single metric.
 *
 * @param metric - The metering dimension to check
 * @param options - Optional overrides for enforcement behavior
 */
export function enforceMeterLimit(
  metric: MeterMetric,
  options: {
    /** If true, only warn (don't block) even at hard limit */
    warnOnly?: boolean;
    /** Custom error message */
    errorMessage?: string;
  } = {},
): preHandlerHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = extractTenantId(request);

    if (!tenantId) {
      // Can't enforce without tenantId — skip silently
      return;
    }

    const check = await meteringService.checkLimit(tenantId, metric);
    await handleLimitCheck(check, tenantId, request, reply, options);
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// MULTI-METRIC ENFORCEMENT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create a preHandler that enforces limits for multiple metrics.
 * The request is blocked if ANY metric has exceeded its hard limit.
 */
export function enforceMeterLimits(
  metrics: MeterMetric[],
  options: {
    warnOnly?: boolean;
    errorMessage?: string;
  } = {},
): preHandlerHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = extractTenantId(request);

    if (!tenantId) {
      return;
    }

    for (const metric of metrics) {
      const check = await meteringService.checkLimit(tenantId, metric);
      const blocked = await handleLimitCheck(check, tenantId, request, reply, options);
      if (blocked) return; // Already sent response
    }
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// CORE CHECK HANDLER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Handle a limit check result: set headers, emit events, block if needed.
 * Returns true if the request was blocked.
 */
async function handleLimitCheck(
  check: LimitCheckResult,
  tenantId: string,
  request: FastifyRequest,
  reply: FastifyReply,
  options: { warnOnly?: boolean; errorMessage?: string },
): Promise<boolean> {
  // Always add usage headers for observability
  if (check.hardLimit != null) {
    reply.header(HEADER_USAGE_LIMIT, String(check.hardLimit));
    reply.header(HEADER_USAGE_CURRENT, String(check.currentValue));
    reply.header(
      HEADER_USAGE_REMAINING,
      String(Math.max(0, check.hardLimit - check.currentValue)),
    );
  }

  // ── Soft limit warning ─────────────────────────────────────────────────
  if (check.warning) {
    reply.header(HEADER_USAGE_WARNING, check.message ?? 'Approaching usage limit');

    // Emit warning event (debounced per tenant/metric)
    await emitLimitEvent(
      BillingEventType.USAGE_LIMIT_WARNING,
      tenantId,
      check,
    );
  }

  // ── Hard limit exceeded ────────────────────────────────────────────────
  if (!check.allowed && !options.warnOnly) {
    // Emit exceeded event
    await emitLimitEvent(
      BillingEventType.USAGE_LIMIT_EXCEEDED,
      tenantId,
      check,
    );

    reply.status(429).send({
      error: 'USAGE_LIMIT_EXCEEDED',
      message:
        options.errorMessage ??
        `Usage limit exceeded for ${check.metric}. Current: ${check.currentValue}, Limit: ${check.hardLimit}. Please upgrade your plan or contact support.`,
      metric: check.metric,
      currentValue: check.currentValue,
      limit: check.hardLimit,
    });

    return true;
  }

  // If warnOnly and exceeded, still add warning header
  if (!check.allowed && options.warnOnly) {
    reply.header(HEADER_USAGE_WARNING, `Usage limit exceeded for ${check.metric} (warn-only mode)`);
  }

  return false;
}

// ══════════════════════════════════════════════════════════════════════════════
// EVENT EMISSION
// ══════════════════════════════════════════════════════════════════════════════

/** Simple debounce cache to avoid spamming events */
const eventDebounce = new Map<string, number>();
const DEBOUNCE_INTERVAL_MS = 60_000; // 1 minute

async function emitLimitEvent(
  eventType: BillingEventType,
  tenantId: string,
  check: LimitCheckResult,
): Promise<void> {
  const key = `${eventType}:${tenantId}:${check.metric}`;
  const lastEmitted = eventDebounce.get(key);

  if (lastEmitted && Date.now() - lastEmitted < DEBOUNCE_INTERVAL_MS) {
    return; // Skip — emitted recently
  }

  eventDebounce.set(key, Date.now());

  try {
    await billingEventPublisher.publish(eventType, { tenantId }, {
      customerId: '',
      tenantId,
      metricName: check.metric,
      currentUsage: check.currentValue,
      limit: check.hardLimit ?? 0,
      percentUsed: check.hardLimit
        ? Math.round((check.currentValue / check.hardLimit) * 100)
        : 0,
    });
  } catch (error) {
    console.error('[LimitEnforcement] Failed to emit event', {
      eventType,
      tenantId,
      metric: check.metric,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// Clean up debounce cache periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of eventDebounce.entries()) {
    if (now - ts > DEBOUNCE_INTERVAL_MS * 2) {
      eventDebounce.delete(key);
    }
  }
}, DEBOUNCE_INTERVAL_MS);
