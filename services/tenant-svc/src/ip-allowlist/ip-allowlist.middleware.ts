// cSpell:words SCIM scim healthz readyz restrictable
/**
 * IP Allowlist Middleware
 *
 * Fastify preHandler hook that enforces per-tenant IP allowlists.
 * Skips enforcement for health-check, internal, and SCIM paths.
 * When a request is blocked it POSTs an audit event to audit-svc.
 *
 * @module ip-allowlist/ip-allowlist.middleware
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

import { config } from '../config.js';

import type { IpAllowlistService } from './ip-allowlist.service.js';

// Paths that bypass IP allowlist checks
const SKIP_PREFIXES = [
  '/health',
  '/healthz',
  '/ready',
  '/readyz',
  '/metrics',
  '/internal/',
  '/scim/',
  '/tenant/resolve',
];

/**
 * Extract the real client IP from the request.
 * Respects X-Forwarded-For (first entry) if present.
 */
function getClientIp(request: FastifyRequest<any>): string {
  const xff = request.headers['x-forwarded-for'];
  if (xff) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const first = (Array.isArray(xff) ? xff[0] : xff)?.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.ip;
}

/**
 * Resolve the tenant ID from the request.
 * Prefers `request.user.tenantId`, falls back to `X-Tenant-ID` header.
 */
function getTenantId(request: FastifyRequest<any>): string | undefined {
  const user = (request as unknown as { user?: { tenantId?: string } }).user;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (user?.tenantId) return user.tenantId;

  const header = request.headers['x-tenant-id'];
  return typeof header === 'string' ? header : undefined;
}

/**
 * Fire-and-forget audit event for a blocked IP.
 */
async function emitBlockedAudit(
  tenantId: string,
  clientIp: string,
  url: string,
): Promise<void> {
  if (!config.auditSvcUrl) return;
  try {
    await fetch(`${config.auditSvcUrl}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.internalApiKey
          ? { 'x-internal-api-key': config.internalApiKey }
          : {}),
      },
      body: JSON.stringify({
        type: 'IP_BLOCKED',
        tenantId,
        payload: { clientIp, url },
        timestamp: new Date().toISOString(),
      }),
    });
  } catch {
    // audit failures must never block the response pipeline
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Plugin
// ══════════════════════════════════════════════════════════════════════════════

export interface IpAllowlistMiddlewareOpts {
  service: IpAllowlistService;
}

export const ipAllowlistMiddleware = fp(
  async (fastify, opts: IpAllowlistMiddlewareOpts) => {
    const { service } = opts;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    fastify.addHook(
      'preHandler',
      async (request, reply) => {
        // Skip for non-restrictable paths
        if (SKIP_PREFIXES.some((p) => request.url.startsWith(p))) return;

        const tenantId = getTenantId(request);
        if (!tenantId) return; // no tenant context → nothing to enforce

        const clientIp = getClientIp(request);
        const allowed = await service.isAllowed(tenantId, clientIp);

        if (!allowed) {
          void emitBlockedAudit(tenantId, clientIp, request.url);
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Your IP address is not in the tenant allow-list.',
          });
        }
      },
    );
  },
  { name: 'ip-allowlist-middleware' },
);
