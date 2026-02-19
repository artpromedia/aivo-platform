/**
 * AIVO Compliance Service - Server-side Geolocation Blocking Middleware
 *
 * Enforces geographic access restrictions based on:
 * - OFAC/sanctions country blocklist (US Treasury SDN list)
 * - Per-tenant geo-restriction configuration
 * - FERPA/COPPA data sovereignty requirements (K-12 student data stays in allowed regions)
 *
 * Uses Cloudflare's `cf-ipcountry` header (set at edge) or `x-country` fallback.
 * Blocked requests are logged to the audit trail for compliance reporting.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { config } from '../config.js';

/* ==========================================================================
   Types
   ========================================================================== */

export interface GeoBlockingConfig {
  /** Countries that are always blocked (OFAC / sanctions) */
  sanctionedCountries: Set<string>;
  /** Per-tenant allowlists — if set, ONLY these countries are permitted */
  tenantAllowlists: Map<string, Set<string>>;
  /** Per-tenant blocklists — these countries are denied (applied after allowlist) */
  tenantBlocklists: Map<string, Set<string>>;
  /** Whether to enforce blocking (false = log-only / dry-run) */
  enforce: boolean;
  /** Routes excluded from geo blocking (e.g. health checks) */
  exemptRoutes: Set<string>;
}

export interface GeoBlockEvent {
  timestamp: string;
  country: string;
  tenantId: string | null;
  userId: string | null;
  ip: string;
  path: string;
  reason: 'SANCTIONED_COUNTRY' | 'TENANT_ALLOWLIST' | 'TENANT_BLOCKLIST';
  action: 'BLOCKED' | 'LOGGED';
}

/* ==========================================================================
   OFAC / Sanctions Blocklist
   US Treasury SDN list — countries under comprehensive US sanctions.
   K-12 platforms processing student data MUST block these.
   ========================================================================== */

const OFAC_SANCTIONED_COUNTRIES = new Set([
  'CU', // Cuba
  'IR', // Iran
  'KP', // North Korea (DPRK)
  'SY', // Syria
  'RU', // Russia (comprehensive sanctions since 2022)
  'BY', // Belarus
  'MM', // Myanmar (Burma)
  'VE', // Venezuela (partial — included for K-12 caution)
]);

/* ==========================================================================
   Default Configuration
   ========================================================================== */

const DEFAULT_EXEMPT_ROUTES = new Set([
  '/health',
  '/readiness',
  '/metrics',
]);

function loadGeoConfig(): GeoBlockingConfig {
  const enforce = process.env.GEO_BLOCKING_ENFORCE !== 'false';

  // Parse tenant allowlists from env: GEO_ALLOWLIST_<TENANT_ID>=US,CA,GB
  const tenantAllowlists = new Map<string, Set<string>>();
  const tenantBlocklists = new Map<string, Set<string>>();

  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith('GEO_ALLOWLIST_') && value) {
      const tenantId = key.slice('GEO_ALLOWLIST_'.length);
      tenantAllowlists.set(tenantId, new Set(value.split(',').map(c => c.trim().toUpperCase())));
    }
    if (key.startsWith('GEO_BLOCKLIST_') && value) {
      const tenantId = key.slice('GEO_BLOCKLIST_'.length);
      tenantBlocklists.set(tenantId, new Set(value.split(',').map(c => c.trim().toUpperCase())));
    }
  }

  // Additional sanctioned countries from env
  const extraBlocked = process.env.GEO_EXTRA_SANCTIONED?.split(',').map(c => c.trim().toUpperCase()) ?? [];
  const sanctionedCountries = new Set([...OFAC_SANCTIONED_COUNTRIES, ...extraBlocked]);

  return {
    sanctionedCountries,
    tenantAllowlists,
    tenantBlocklists,
    enforce,
    exemptRoutes: DEFAULT_EXEMPT_ROUTES,
  };
}

/* ==========================================================================
   Country Extraction (mirrors regional-compliance.ts helper)
   ========================================================================== */

function extractCountry(request: FastifyRequest): string | null {
  // Cloudflare sets this header at the edge — most reliable
  const cfCountry = request.headers['cf-ipcountry'];
  if (cfCountry && typeof cfCountry === 'string' && cfCountry.length === 2) {
    // 'XX' and 'T1' are Cloudflare special values (unknown / Tor)
    const upper = cfCountry.toUpperCase();
    if (upper !== 'XX' && upper !== 'T1') {
      return upper;
    }
    return null; // Unknown origin
  }

  // Fallback: upstream geolocation service header
  const xCountry = request.headers['x-country'];
  if (xCountry && typeof xCountry === 'string' && xCountry.length === 2) {
    return xCountry.toUpperCase();
  }

  return null; // Cannot determine — policy decides whether to allow
}

/* ==========================================================================
   Blocking Logic
   ========================================================================== */

function evaluateGeoBlock(
  country: string | null,
  tenantId: string | null,
  geoConfig: GeoBlockingConfig,
): { blocked: boolean; reason: GeoBlockEvent['reason'] | null } {
  // If we can't determine the country, allow by default (Cloudflare edge
  // should always set cf-ipcountry; absence likely means internal/health request)
  if (!country) {
    return { blocked: false, reason: null };
  }

  // 1) OFAC / sanctions check — global, overrides everything
  if (geoConfig.sanctionedCountries.has(country)) {
    return { blocked: true, reason: 'SANCTIONED_COUNTRY' };
  }

  // 2) Per-tenant allowlist — if configured, country MUST be in the list
  if (tenantId) {
    const allowlist = geoConfig.tenantAllowlists.get(tenantId);
    if (allowlist && !allowlist.has(country)) {
      return { blocked: true, reason: 'TENANT_ALLOWLIST' };
    }

    // 3) Per-tenant blocklist
    const blocklist = geoConfig.tenantBlocklists.get(tenantId);
    if (blocklist && blocklist.has(country)) {
      return { blocked: true, reason: 'TENANT_BLOCKLIST' };
    }
  }

  return { blocked: false, reason: null };
}

/* ==========================================================================
   Audit Logging
   ========================================================================== */

const recentBlockLog: GeoBlockEvent[] = [];
const MAX_BLOCK_LOG = 1000;

function logBlockEvent(event: GeoBlockEvent, logger: FastifyRequest['log']): void {
  logger.warn(
    {
      geoBlock: true,
      country: event.country,
      tenantId: event.tenantId,
      reason: event.reason,
      action: event.action,
      path: event.path,
    },
    `Geo-blocked request from ${event.country}: ${event.reason}`,
  );

  // Keep in-memory ring buffer for compliance dashboard
  if (recentBlockLog.length >= MAX_BLOCK_LOG) {
    recentBlockLog.shift();
  }
  recentBlockLog.push(event);
}

/* ==========================================================================
   Fastify Plugin
   ========================================================================== */

const geoBlockingPlugin: FastifyPluginAsync = async (fastify) => {
  const geoConfig = loadGeoConfig();

  fastify.log.info(
    {
      enforce: geoConfig.enforce,
      sanctionedCountries: [...geoConfig.sanctionedCountries],
      tenantAllowlists: geoConfig.tenantAllowlists.size,
      tenantBlocklists: geoConfig.tenantBlocklists.size,
    },
    'Geo-blocking middleware initialized',
  );

  // ── Pre-handler hook ─────────────────────────────────────────────────────
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip exempt routes
    const urlPath = request.url.split('?')[0] ?? request.url;
    if (geoConfig.exemptRoutes.has(urlPath)) {
      return;
    }

    const country = extractCountry(request);
    const tenantId = (request.headers['x-tenant-id'] as string) ?? null;
    const { blocked, reason } = evaluateGeoBlock(country, tenantId, geoConfig);

    if (!blocked || !reason) {
      return;
    }

    const event: GeoBlockEvent = {
      timestamp: new Date().toISOString(),
      country: country ?? 'UNKNOWN',
      tenantId,
      userId: (request as any).user?.sub ?? null,
      ip: request.ip,
      path: urlPath,
      reason,
      action: geoConfig.enforce ? 'BLOCKED' : 'LOGGED',
    };

    logBlockEvent(event, request.log);

    if (geoConfig.enforce) {
      void reply.status(403).send({
        error: 'Forbidden',
        message: 'Access from your region is not permitted.',
        code: 'GEO_BLOCKED',
      });
      return;
    }
    // Dry-run: log but allow
  });

  // ── Compliance reporting endpoint ─────────────────────────────────────────
  fastify.get('/compliance/geo-blocks', async (request: FastifyRequest<{
    Querystring: { limit?: string; country?: string };
  }>, reply: FastifyReply) => {
    const limit = Math.min(Number(request.query.limit) || 50, 500);
    const countryFilter = request.query.country?.toUpperCase();

    let events = recentBlockLog.slice(-limit).reverse();
    if (countryFilter) {
      events = events.filter(e => e.country === countryFilter);
    }

    return reply.status(200).send({
      enforce: geoConfig.enforce,
      sanctionedCountries: [...geoConfig.sanctionedCountries],
      recentBlocks: events,
      totalLogged: recentBlockLog.length,
    });
  });

  // ── Config inspection endpoint (admin only) ──────────────────────────────
  fastify.get('/compliance/geo-config', async (request: FastifyRequest, reply: FastifyReply) => {
    const allowlists: Record<string, string[]> = {};
    for (const [tid, countries] of geoConfig.tenantAllowlists) {
      allowlists[tid] = [...countries];
    }
    const blocklists: Record<string, string[]> = {};
    for (const [tid, countries] of geoConfig.tenantBlocklists) {
      blocklists[tid] = [...countries];
    }

    return reply.status(200).send({
      enforce: geoConfig.enforce,
      sanctionedCountries: [...geoConfig.sanctionedCountries],
      tenantAllowlists: allowlists,
      tenantBlocklists: blocklists,
      exemptRoutes: [...geoConfig.exemptRoutes],
    });
  });
};

export const geoBlockingMiddleware = fp(geoBlockingPlugin, {
  name: 'geo-blocking',
  fastify: '5.x',
});

export default geoBlockingMiddleware;
