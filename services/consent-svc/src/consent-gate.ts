import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Pool } from 'pg';

import { checkMultipleConsents, hasActiveConsent } from './repository.js';
import type { ConsentRequiredError, ConsentType } from './types.js';

// ════════════════════════════════════════════════════════════════════════════════
// CONSENT GATING MIDDLEWARE
// ════════════════════════════════════════════════════════════════════════════════
// Middleware for enforcing consent requirements at the API layer
// Returns HTTP 451 (Unavailable for Legal Reasons) when consent is missing

export interface ConsentGateOptions {
  /** Database pool for consent lookups */
  pool: Pool;
  /** Base URL for consent management UI */
  consentBaseUrl: string;
}

export interface ConsentGateConfig {
  /** Required consent types for this route */
  requiredConsents: ConsentType[];
  /** Whether all consents are required (AND) or any (OR) */
  requireAll?: boolean;
}

/**
 * Extract learner ID from request
 * Tries body, params, and query in that order
 */
function extractLearnerId(request: FastifyRequest): string | null {
  const body = request.body as Record<string, unknown> | undefined;
  const params = request.params as Record<string, unknown> | undefined;
  const query = request.query as Record<string, unknown> | undefined;

  // Try each source in priority order
  const learnerId =
    (body?.learnerId as string | undefined) ||
    (params?.learnerId as string | undefined) ||
    (query?.learnerId as string | undefined);

  return learnerId ?? null;
}

/**
 * Extract tenant ID from request auth context
 */
function extractTenantId(request: FastifyRequest): string | null {
  const auth = (request as FastifyRequest & { auth?: { tenantId: string } }).auth;
  return auth?.tenantId ?? null;
}

/**
 * Build HTTP 451 response for missing consent
 */
function buildConsentRequiredResponse(
  tenantId: string,
  learnerId: string,
  missingConsents: ConsentType[],
  consentBaseUrl: string
): ConsentRequiredError {
  const consentUrl = `${consentBaseUrl}/consent?tenantId=${encodeURIComponent(tenantId)}&learnerId=${encodeURIComponent(learnerId)}&types=${missingConsents.map(encodeURIComponent).join(',')}`;

  return {
    error: 'CONSENT_REQUIRED',
    code: 451,
    message: `Access denied: parental consent is required for the following: ${missingConsents.join(', ')}. Please complete the consent process.`,
    requiredConsents: missingConsents,
    consentUrl,
    learnerId,
    tenantId,
  };
}

/**
 * Create a consent gate middleware factory
 *
 * @example
 * ```ts
 * const consentGate = createConsentGate({ pool, consentBaseUrl: 'https://app.aivolearning.com' });
 *
 * fastify.post('/baseline/start', {
 *   preHandler: [
 *     requireRole([Role.PARENT, Role.LEARNER]),
 *     consentGate({ requiredConsents: ['BASELINE_ASSESSMENT'] })
 *   ]
 * }, handler);
 * ```
 */
export function createConsentGate(options: ConsentGateOptions) {
  const { pool, consentBaseUrl } = options;

  return function consentGate(config: ConsentGateConfig) {
    const { requiredConsents, requireAll = true } = config;

    return async function middleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
      const tenantId = extractTenantId(request);
      const learnerId = extractLearnerId(request);

      if (!tenantId || !learnerId) {
        reply.code(400).send({
          error: 'MISSING_CONTEXT',
          message: 'Could not determine tenant or learner for consent check',
        });
        return;
      }

      // Fast path: single consent check
      if (requiredConsents.length === 1) {
        const consentType = requiredConsents[0];
        if (consentType) {
          const hasConsent = await hasActiveConsent(pool, tenantId, learnerId, consentType);
          if (!hasConsent) {
            reply
              .code(451)
              .send(
                buildConsentRequiredResponse(tenantId, learnerId, requiredConsents, consentBaseUrl)
              );
          }
        }
        return;
      }

      // Multiple consents: check all at once
      const consentMap = await checkMultipleConsents(pool, tenantId, learnerId, requiredConsents);

      const missingConsents: ConsentType[] = [];
      const now = new Date();

      for (const consentType of requiredConsents) {
        const cached = consentMap.get(consentType);
        const isActive =
          cached?.status === 'GRANTED' && (!cached.expires_at || cached.expires_at > now);

        if (!isActive) {
          missingConsents.push(consentType);
        }
      }

      // Check based on requireAll setting
      if (requireAll && missingConsents.length > 0) {
        reply
          .code(451)
          .send(buildConsentRequiredResponse(tenantId, learnerId, missingConsents, consentBaseUrl));
        return;
      }

      if (!requireAll && missingConsents.length === requiredConsents.length) {
        // None of the required consents are present
        reply
          .code(451)
          .send(buildConsentRequiredResponse(tenantId, learnerId, missingConsents, consentBaseUrl));
      }

      // Consent check passed
    };
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// ROUTE-SPECIFIC CONSENT CONFIGURATIONS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Consent requirements for baseline assessment routes
 */
export const BASELINE_CONSENT_CONFIG: ConsentGateConfig = {
  requiredConsents: ['BASELINE_ASSESSMENT'],
  requireAll: true,
};

/**
 * Consent requirements for AI personalization/session routes
 */
export const AI_PERSONALIZATION_CONSENT_CONFIG: ConsentGateConfig = {
  requiredConsents: ['AI_PERSONALIZATION'],
  requireAll: true,
};

/**
 * Consent requirements for AI tutor routes
 */
export const AI_TUTOR_CONSENT_CONFIG: ConsentGateConfig = {
  requiredConsents: ['AI_TUTOR'],
  requireAll: true,
};

/**
 * Consent requirements for full learning sessions (both baseline and AI)
 */
export const FULL_LEARNING_CONSENT_CONFIG: ConsentGateConfig = {
  requiredConsents: ['BASELINE_ASSESSMENT', 'AI_PERSONALIZATION'],
  requireAll: true,
};

/**
 * Consent requirements for research/analytics features
 */
export const RESEARCH_CONSENT_CONFIG: ConsentGateConfig = {
  requiredConsents: ['RESEARCH'],
  requireAll: true,
};

// ════════════════════════════════════════════════════════════════════════════════
// HELPER: Check consent without blocking
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Non-blocking consent check - returns result without sending response
 * Useful for conditional features or degraded functionality
 */
export async function checkConsentsNonBlocking(
  pool: Pool,
  tenantId: string,
  learnerId: string,
  requiredConsents: ConsentType[]
): Promise<{
  allowed: boolean;
  grantedConsents: ConsentType[];
  missingConsents: ConsentType[];
}> {
  const consentMap = await checkMultipleConsents(pool, tenantId, learnerId, requiredConsents);

  const now = new Date();
  const grantedConsents: ConsentType[] = [];
  const missingConsents: ConsentType[] = [];

  for (const consentType of requiredConsents) {
    const cached = consentMap.get(consentType);
    const isActive =
      cached?.status === 'GRANTED' && (!cached.expires_at || cached.expires_at > now);

    if (isActive) {
      grantedConsents.push(consentType);
    } else {
      missingConsents.push(consentType);
    }
  }

  return {
    allowed: missingConsents.length === 0,
    grantedConsents,
    missingConsents,
  };
}
