/**
 * COPPA/Consent Module — Consent Gate Middleware
 * Migrated from consent-svc
 *
 * Returns HTTP 451 (Unavailable for Legal Reasons) when consent is missing.
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Pool } from 'pg';

import { checkMultipleConsents, hasActiveConsent } from './repository.js';
import type { ConsentRequiredError, ConsentTypeValue } from './types.js';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

export interface ConsentGateOptions {
  pool: Pool;
  consentBaseUrl: string;
}

export interface ConsentGateConfig {
  requiredConsents: ConsentTypeValue[];
  requireAll?: boolean;
}

// ════════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════════

function extractLearnerId(request: FastifyRequest): string | null {
  const body = request.body as Record<string, unknown> | undefined;
  const params = request.params as Record<string, unknown> | undefined;
  const query = request.query as Record<string, unknown> | undefined;

  const learnerId =
    (body?.learnerId as string | undefined) ||
    (params?.learnerId as string | undefined) ||
    (query?.learnerId as string | undefined);

  return learnerId ?? null;
}

function extractTenantId(request: FastifyRequest): string | null {
  const auth = (request as FastifyRequest & { auth?: { tenantId: string } }).auth;
  return auth?.tenantId ?? null;
}

function buildConsentRequiredResponse(
  tenantId: string,
  learnerId: string,
  missingConsents: ConsentTypeValue[],
  consentBaseUrl: string,
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

// ════════════════════════════════════════════════════════════════════════════════
// CONSENT GATE FACTORY
// ════════════════════════════════════════════════════════════════════════════════

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

      if (requiredConsents.length === 1) {
        const consentType = requiredConsents[0];
        if (consentType) {
          const hasConsent = await hasActiveConsent(pool, tenantId, learnerId, consentType);
          if (!hasConsent) {
            reply
              .code(451)
              .send(
                buildConsentRequiredResponse(tenantId, learnerId, requiredConsents, consentBaseUrl),
              );
          }
        }
        return;
      }

      const consentMap = await checkMultipleConsents(pool, tenantId, learnerId, requiredConsents);
      const missingConsents: ConsentTypeValue[] = [];
      const now = new Date();

      for (const consentType of requiredConsents) {
        const cached = consentMap.get(consentType);
        const isActive =
          cached?.status === 'GRANTED' && (!cached.expires_at || cached.expires_at > now);
        if (!isActive) missingConsents.push(consentType);
      }

      if (requireAll && missingConsents.length > 0) {
        reply
          .code(451)
          .send(buildConsentRequiredResponse(tenantId, learnerId, missingConsents, consentBaseUrl));
        return;
      }

      if (!requireAll && missingConsents.length === requiredConsents.length) {
        reply
          .code(451)
          .send(buildConsentRequiredResponse(tenantId, learnerId, missingConsents, consentBaseUrl));
      }
    };
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// ROUTE-SPECIFIC CONSENT CONFIGURATIONS
// ════════════════════════════════════════════════════════════════════════════════

export const BASELINE_CONSENT_CONFIG: ConsentGateConfig = {
  requiredConsents: ['BASELINE_ASSESSMENT'],
  requireAll: true,
};

export const AI_PERSONALIZATION_CONSENT_CONFIG: ConsentGateConfig = {
  requiredConsents: ['AI_PERSONALIZATION'],
  requireAll: true,
};

export const AI_TUTOR_CONSENT_CONFIG: ConsentGateConfig = {
  requiredConsents: ['AI_TUTOR'],
  requireAll: true,
};

export const FULL_LEARNING_CONSENT_CONFIG: ConsentGateConfig = {
  requiredConsents: ['BASELINE_ASSESSMENT', 'AI_PERSONALIZATION'],
  requireAll: true,
};

export const RESEARCH_CONSENT_CONFIG: ConsentGateConfig = {
  requiredConsents: ['RESEARCH'],
  requireAll: true,
};

// ════════════════════════════════════════════════════════════════════════════════
// NON-BLOCKING CHECK
// ════════════════════════════════════════════════════════════════════════════════

export async function checkConsentsNonBlocking(
  pool: Pool,
  tenantId: string,
  learnerId: string,
  requiredConsents: ConsentTypeValue[],
): Promise<{
  allowed: boolean;
  grantedConsents: ConsentTypeValue[];
  missingConsents: ConsentTypeValue[];
}> {
  const consentMap = await checkMultipleConsents(pool, tenantId, learnerId, requiredConsents);
  const now = new Date();
  const grantedConsents: ConsentTypeValue[] = [];
  const missingConsents: ConsentTypeValue[] = [];

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

  return { allowed: missingConsents.length === 0, grantedConsents, missingConsents };
}
