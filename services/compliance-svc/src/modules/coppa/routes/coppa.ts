/**
 * COPPA/Consent Module — COPPA Routes
 * Migrated from consent-svc
 */

import { Role, requireRole, type AuthContext } from '@aivo/ts-rbac';
import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import { z } from 'zod';

import { CoppaConsentService, type EmailParams } from '../coppa-service.js';
import { consentDefinitions } from '../privacy-config.js';
import { getTenantCoppaSettings, upsertTenantCoppaSettings } from '../repository.js';
import type { ConsentTypeValue, ParentConsentSummary } from '../types.js';

// ════════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ════════════════════════════════════════════════════════════════════════════════

const initiateConsentSchema = z.object({
  learnerId: z.string().uuid(),
  parentEmail: z.string().email(),
  consentType: z.enum([
    'BASELINE_ASSESSMENT',
    'DATA_PROCESSING',
    'RESEARCH',
    'AI_TUTOR',
    'AI_PERSONALIZATION',
    'MARKETING',
    'THIRD_PARTY_SHARING',
    'BIOMETRIC_DATA',
    'VOICE_RECORDING',
  ]),
  learnerName: z.string().min(1),
});

const resendConsentSchema = z.object({
  consentId: z.string().uuid(),
  parentEmail: z.string().email(),
  learnerName: z.string().min(1),
});

const validateLinkSchema = z.object({
  token: z.string().min(1),
});

const creditCardVerificationSchema = z.object({
  consentId: z.string().uuid(),
  cardToken: z.string().min(1),
  last4: z.string().length(4),
});

const completeCreditCardSchema = z.object({
  verificationId: z.string().uuid(),
  chargeConfirmed: z.boolean(),
  refundedAt: z.string().datetime().optional(),
});

const signedFormVerificationSchema = z.object({
  consentId: z.string().uuid(),
  documentHash: z.string().min(1),
  storageUri: z.string().url(),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
});

const completeSignedFormSchema = z.object({
  verificationId: z.string().uuid(),
  approved: z.boolean(),
});

const grantVerifiedConsentSchema = z.object({
  token: z.string().min(1),
  verificationId: z.string().uuid(),
});

const revokeConsentSchema = z.object({
  consentId: z.string().uuid(),
  reason: z.string().min(1).max(500),
});

const coppaSettingsSchema = z.object({
  coppaAgeThreshold: z.number().int().min(0).max(18).optional(),
  requireVerifiableConsent: z.boolean().optional(),
  allowedVerificationMethods: z
    .array(
      z.enum([
        'CREDIT_CARD_MICRO_CHARGE',
        'SIGNED_CONSENT_FORM',
        'VIDEO_CALL',
        'KNOWLEDGE_BASED_AUTH',
        'GOVERNMENT_ID',
        'FACE_MATCH',
      ]),
    )
    .optional(),
  consentLinkExpiryHours: z.number().int().min(1).max(720).optional(),
  maxResendAttempts: z.number().int().min(1).max(10).optional(),
});

// ════════════════════════════════════════════════════════════════════════════════
// PLUGIN
// ════════════════════════════════════════════════════════════════════════════════

interface CoppaRoutesOptions {
  pool: Pool;
  baseUrl: string;
  sendEmail: (params: EmailParams) => Promise<void>;
}

interface AuthenticatedRequest extends FastifyRequest {
  auth?: AuthContext;
}

function getAuthFromRequest(request: FastifyRequest): AuthContext {
  const auth = (request as AuthenticatedRequest).auth;
  if (!auth?.userId || !auth?.tenantId) throw new Error('Missing auth context');
  return auth;
}

function getClientInfo(request: FastifyRequest): {
  ipAddress: string | undefined;
  userAgent: string | undefined;
} {
  const forwardedFor = request.headers['x-forwarded-for'];
  const forwardedIp =
    typeof forwardedFor === 'string' ? forwardedFor.split(',')[0]?.trim() : undefined;
  const userAgentHeader = request.headers['user-agent'];
  return {
    ipAddress: forwardedIp || request.ip || undefined,
    userAgent: userAgentHeader || undefined,
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// ROUTES
// ════════════════════════════════════════════════════════════════════════════════

export const registerCoppaRoutes: FastifyPluginAsync<CoppaRoutesOptions> = async (
  fastify: FastifyInstance,
  opts,
) => {
  const { pool, baseUrl, sendEmail } = opts;
  const coppaService = new CoppaConsentService({ pool, baseUrl, sendEmail });

  // POST /coppa/initiate
  fastify.post(
    '/coppa/initiate',
    { preHandler: requireRole([Role.DISTRICT_ADMIN, Role.PLATFORM_ADMIN, Role.SUPPORT]) },
    async (request, reply) => {
      const parsed = initiateConsentSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid payload', details: parsed.error.issues });
      }

      const auth = getAuthFromRequest(request);
      const { ipAddress, userAgent } = getClientInfo(request);

      try {
        const result = await coppaService.initiateParentalConsent({
          tenantId: auth.tenantId,
          learnerId: parsed.data.learnerId,
          parentEmail: parsed.data.parentEmail,
          consentType: parsed.data.consentType as ConsentTypeValue,
          learnerName: parsed.data.learnerName,
          source: 'API',
          ...(ipAddress && { requestedByIp: ipAddress }),
          ...(userAgent && { requestedByUserAgent: userAgent }),
        });

        return reply.code(201).send({
          consent: result.consent,
          linkId: result.link.id,
          emailSent: result.emailSent,
          expiresAt: result.link.expires_at.toISOString(),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to initiate consent';
        return reply.code(400).send({ error: message });
      }
    },
  );

  // POST /coppa/resend
  fastify.post(
    '/coppa/resend',
    {
      preHandler: requireRole([
        Role.PARENT,
        Role.DISTRICT_ADMIN,
        Role.PLATFORM_ADMIN,
        Role.SUPPORT,
      ]),
    },
    async (request, reply) => {
      const parsed = resendConsentSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid payload', details: parsed.error.issues });
      }

      const auth = getAuthFromRequest(request);
      const { ipAddress, userAgent } = getClientInfo(request);

      const result = await coppaService.resendConsentEmail({
        consentId: parsed.data.consentId,
        tenantId: auth.tenantId,
        parentEmail: parsed.data.parentEmail,
        learnerName: parsed.data.learnerName,
        ...(ipAddress && { requestedByIp: ipAddress }),
        ...(userAgent && { requestedByUserAgent: userAgent }),
      });

      if (!result.success) {
        return reply.code(400).send({ error: result.reason });
      }

      return reply.code(200).send({
        success: true,
        linkId: result.link?.id,
        resendCount: result.link?.resend_count,
      });
    },
  );

  // GET /coppa/validate (public - token is auth)
  fastify.get('/coppa/validate', async (request, reply) => {
    const parsed = validateLinkSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Token is required' });
    }

    const validation = await coppaService.validateConsentLink(parsed.data.token);

    if (!validation.valid) {
      return reply.code(400).send({ valid: false, reason: validation.reason });
    }

    return reply.code(200).send({
      valid: true,
      consentType: validation.consent?.consent_type,
      consentTypeDescription: validation.consent
        ? getConsentDescription(validation.consent.consent_type)
        : null,
      allowedVerificationMethods: validation.settings?.allowed_verification_methods,
      requireVerifiableConsent: validation.settings?.require_verifiable_consent,
    });
  });

  // POST /coppa/verify/credit-card/initiate
  fastify.post(
    '/coppa/verify/credit-card/initiate',
    { preHandler: requireRole([Role.PARENT]) },
    async (request, reply) => {
      const parsed = creditCardVerificationSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid payload', details: parsed.error.issues });
      }

      const auth = getAuthFromRequest(request);
      const { ipAddress, userAgent } = getClientInfo(request);

      try {
        const verification = await coppaService.initiateCreditCardVerification({
          consentId: parsed.data.consentId,
          tenantId: auth.tenantId,
          parentUserId: auth.userId,
          cardToken: parsed.data.cardToken,
          last4: parsed.data.last4,
          ...(ipAddress && { ipAddress }),
          ...(userAgent && { userAgent }),
        });

        return reply.code(201).send({
          verificationId: verification.id,
          chargeId: (verification.evidence_json as { chargeId: string }).chargeId,
          amountCents: 50,
          status: verification.status,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to initiate verification';
        return reply.code(400).send({ error: message });
      }
    },
  );

  // POST /coppa/verify/credit-card/complete
  fastify.post(
    '/coppa/verify/credit-card/complete',
    { preHandler: requireRole([Role.PLATFORM_ADMIN, Role.SUPPORT]) },
    async (request, reply) => {
      const parsed = completeCreditCardSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid payload', details: parsed.error.issues });
      }

      const auth = getAuthFromRequest(request);

      try {
        const completionParams: {
          verificationId: string;
          tenantId: string;
          chargeConfirmed: boolean;
          refundedAt?: string;
        } = {
          verificationId: parsed.data.verificationId,
          tenantId: auth.tenantId,
          chargeConfirmed: parsed.data.chargeConfirmed,
        };
        if (parsed.data.refundedAt) completionParams.refundedAt = parsed.data.refundedAt;

        const verification =
          await coppaService.completeCreditCardVerification(completionParams);

        return reply.code(200).send({
          verificationId: verification.id,
          status: verification.status,
          verifiedAt: verification.verified_at?.toISOString(),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to complete verification';
        return reply.code(400).send({ error: message });
      }
    },
  );

  // POST /coppa/verify/signed-form/initiate
  fastify.post(
    '/coppa/verify/signed-form/initiate',
    { preHandler: requireRole([Role.PARENT]) },
    async (request, reply) => {
      const parsed = signedFormVerificationSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid payload', details: parsed.error.issues });
      }

      const auth = getAuthFromRequest(request);
      const { ipAddress, userAgent } = getClientInfo(request);

      try {
        const verification = await coppaService.initiateSignedFormVerification({
          consentId: parsed.data.consentId,
          tenantId: auth.tenantId,
          parentUserId: auth.userId,
          documentHash: parsed.data.documentHash,
          storageUri: parsed.data.storageUri,
          fileName: parsed.data.fileName,
          mimeType: parsed.data.mimeType,
          ...(ipAddress && { ipAddress }),
          ...(userAgent && { userAgent }),
        });

        return reply.code(201).send({
          verificationId: verification.id,
          status: verification.status,
          message:
            'Form submitted for review. You will be notified when verification is complete.',
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to submit form';
        return reply.code(400).send({ error: message });
      }
    },
  );

  // POST /coppa/verify/signed-form/complete
  fastify.post(
    '/coppa/verify/signed-form/complete',
    { preHandler: requireRole([Role.PLATFORM_ADMIN, Role.SUPPORT]) },
    async (request, reply) => {
      const parsed = completeSignedFormSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid payload', details: parsed.error.issues });
      }

      const auth = getAuthFromRequest(request);

      try {
        const verification = await coppaService.completeSignedFormVerification({
          verificationId: parsed.data.verificationId,
          tenantId: auth.tenantId,
          approved: parsed.data.approved,
          reviewedBy: auth.userId,
        });

        return reply.code(200).send({
          verificationId: verification.id,
          status: verification.status,
          verifiedAt: verification.verified_at?.toISOString(),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to complete review';
        return reply.code(400).send({ error: message });
      }
    },
  );

  // POST /coppa/grant
  fastify.post(
    '/coppa/grant',
    { preHandler: requireRole([Role.PARENT]) },
    async (request, reply) => {
      const parsed = grantVerifiedConsentSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid payload', details: parsed.error.issues });
      }

      const auth = getAuthFromRequest(request);
      const { ipAddress, userAgent } = getClientInfo(request);

      try {
        const result = await coppaService.grantVerifiedConsent({
          token: parsed.data.token,
          verificationId: parsed.data.verificationId,
          parentUserId: auth.userId,
          ...(ipAddress && { ipAddress }),
          ...(userAgent && { userAgent }),
        });

        return reply.code(200).send({
          consent: result.consent,
          verification: {
            id: result.verification.id,
            method: result.verification.method_type,
            verifiedAt: result.verification.verified_at?.toISOString(),
          },
          grantedAt: result.consent.granted_at?.toISOString(),
          expiresAt: result.consent.expires_at?.toISOString(),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to grant consent';
        return reply.code(400).send({ error: message });
      }
    },
  );

  // GET /coppa/dashboard
  fastify.get(
    '/coppa/dashboard',
    { preHandler: requireRole([Role.PARENT]) },
    async (request, reply) => {
      const auth = getAuthFromRequest(request);
      const query = request.query as { learnerIds?: string };

      if (!query.learnerIds) {
        return reply.code(400).send({ error: 'learnerIds query parameter is required' });
      }

      const learnerIds = query.learnerIds.split(',').filter((id) => id.length > 0);
      const consentsMap = await coppaService.getConsentsForParent({
        tenantId: auth.tenantId,
        parentUserId: auth.userId,
        learnerIds,
      });

      const summaries: ParentConsentSummary[] = [];

      for (const [learnerId, consents] of consentsMap) {
        const consentItems = consentDefinitions.map((def) => {
          const existing = consents.find((c) => c.consent_type === def.type);
          return {
            type: def.type,
            status: existing?.status ?? ('PENDING' as const),
            required: def.required,
            description: def.description,
            grantedAt: existing?.granted_at?.toISOString() ?? null,
            expiresAt: existing?.expires_at?.toISOString() ?? null,
            canRevoke: existing?.status === 'GRANTED' && !def.required,
          };
        });

        summaries.push({ learnerId, learnerName: learnerId, consents: consentItems });
      }

      return reply.code(200).send({ learners: summaries });
    },
  );

  // POST /coppa/revoke
  fastify.post(
    '/coppa/revoke',
    { preHandler: requireRole([Role.PARENT, Role.DISTRICT_ADMIN, Role.PLATFORM_ADMIN]) },
    async (request, reply) => {
      const parsed = revokeConsentSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid payload', details: parsed.error.issues });
      }

      const auth = getAuthFromRequest(request);
      const { ipAddress, userAgent } = getClientInfo(request);

      try {
        const consent = await coppaService.revokeConsent({
          consentId: parsed.data.consentId,
          tenantId: auth.tenantId,
          revokedByUserId: auth.userId,
          reason: parsed.data.reason,
          ...(ipAddress && { ipAddress }),
          ...(userAgent && { userAgent }),
        });

        return reply.code(200).send({
          consent,
          revokedAt: consent.revoked_at?.toISOString(),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to revoke consent';
        return reply.code(400).send({ error: message });
      }
    },
  );

  // GET /coppa/settings
  fastify.get(
    '/coppa/settings',
    { preHandler: requireRole([Role.DISTRICT_ADMIN, Role.PLATFORM_ADMIN]) },
    async (request, reply) => {
      const auth = getAuthFromRequest(request);
      const settings = await getTenantCoppaSettings(pool, auth.tenantId);
      return reply.code(200).send({ settings });
    },
  );

  // PATCH /coppa/settings
  fastify.patch(
    '/coppa/settings',
    { preHandler: requireRole([Role.DISTRICT_ADMIN, Role.PLATFORM_ADMIN]) },
    async (request, reply) => {
      const parsed = coppaSettingsSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid payload', details: parsed.error.issues });
      }

      const auth = getAuthFromRequest(request);
      const updateData: Parameters<typeof upsertTenantCoppaSettings>[1] = {
        tenant_id: auth.tenantId,
      };

      if (parsed.data.coppaAgeThreshold !== undefined) updateData.coppa_age_threshold = parsed.data.coppaAgeThreshold;
      if (parsed.data.requireVerifiableConsent !== undefined) updateData.require_verifiable_consent = parsed.data.requireVerifiableConsent;
      if (parsed.data.allowedVerificationMethods !== undefined) updateData.allowed_verification_methods = parsed.data.allowedVerificationMethods;
      if (parsed.data.consentLinkExpiryHours !== undefined) updateData.consent_link_expiry_hours = parsed.data.consentLinkExpiryHours;
      if (parsed.data.maxResendAttempts !== undefined) updateData.max_resend_attempts = parsed.data.maxResendAttempts;

      const settings = await upsertTenantCoppaSettings(pool, updateData);
      return reply.code(200).send({ settings });
    },
  );
};

// ════════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════════

function getConsentDescription(type: ConsentTypeValue): string {
  const def = consentDefinitions.find((d) => d.type === type);
  return def?.description ?? type;
}
