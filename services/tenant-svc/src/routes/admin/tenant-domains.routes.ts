/**
 * Tenant Domain Admin Routes
 *
 * Admin API endpoints for managing tenant domains and subdomains.
 * Used by platform administrators and tenant admins to configure
 * custom domains and verify ownership.
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../prisma.js';
import {
  getTenantResolverService,
  type DomainVerificationInfo,
  type DomainVerificationResult,
} from '../../services/tenant-resolver.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// Schemas
// ══════════════════════════════════════════════════════════════════════════════

const TenantIdParamsSchema = z.object({
  tenantId: z.string().uuid(),
});

const UpdateSubdomainSchema = z.object({
  subdomain: z
    .string()
    .min(3, 'Subdomain must be at least 3 characters')
    .max(63, 'Subdomain must be at most 63 characters')
    .regex(
      /^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$/,
      'Subdomain must contain only lowercase letters, numbers, and hyphens'
    )
    .nullable(),
});

const AddDomainSchema = z.object({
  domain: z
    .string()
    .min(4, 'Domain must be at least 4 characters')
    .max(253, 'Domain must be at most 253 characters')
    .regex(
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i,
      'Invalid domain format'
    ),
});

const VerifyDomainQuerySchema = z.object({
  domain: z.string(),
});

// ══════════════════════════════════════════════════════════════════════════════
// Response Types
// ══════════════════════════════════════════════════════════════════════════════

interface SubdomainResponse {
  tenantId: string;
  subdomain: string | null;
  fullDomain: string | null;
}

interface DomainVerificationResponse {
  tenantId: string;
  domain: string;
  verification: DomainVerificationInfo;
  instructions: string[];
}

interface VerificationStatusResponse {
  tenantId: string;
  domain: string;
  result: DomainVerificationResult;
}

interface TenantDomainInfo {
  tenantId: string;
  subdomain: string | null;
  customDomain: string | null;
  domainVerified: boolean;
  domainVerifiedAt: string | null;
  pendingVerifications: Array<{
    domain: string;
    status: string;
    expiresAt: string;
    createdAt: string;
  }>;
}

// ══════════════════════════════════════════════════════════════════════════════
// Routes
// ══════════════════════════════════════════════════════════════════════════════

export const tenantDomainsRoutes: FastifyPluginAsync = async (fastify) => {
  const resolver = getTenantResolverService();
  const baseDomain = process.env.BASE_DOMAIN ?? 'aivo.ai';

  /**
   * GET /admin/tenants/:tenantId/domains
   * Get domain configuration for a tenant
   */
  fastify.get<{
    Params: z.infer<typeof TenantIdParamsSchema>;
  }>(
    '/tenants/:tenantId/domains',
    {
      schema: {
        description: 'Get domain configuration for a tenant',
        tags: ['tenant-domains'],
        params: TenantIdParamsSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              tenantId: { type: 'string' },
              subdomain: { type: ['string', 'null'] },
              customDomain: { type: ['string', 'null'] },
              domainVerified: { type: 'boolean' },
              domainVerifiedAt: { type: ['string', 'null'] },
              pendingVerifications: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    domain: { type: 'string' },
                    status: { type: 'string' },
                    expiresAt: { type: 'string' },
                    createdAt: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { tenantId } = TenantIdParamsSchema.parse(request.params);

      // Get tenant from database
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!tenant) {
        return reply.code(404).send({ error: 'Tenant not found' });
      }

      // Get pending verifications
      const pendingVerifications = await resolver.getPendingVerifications(tenantId);

      const response: TenantDomainInfo = {
        tenantId: tenant.id,
        subdomain: tenant.subdomain,
        customDomain: tenant.customDomain,
        domainVerified: tenant.domainVerified,
        domainVerifiedAt: tenant.domainVerifiedAt?.toISOString() ?? null,
        pendingVerifications: pendingVerifications.map((v) => ({
          domain: v.domain,
          status: v.status,
          expiresAt: v.expiresAt.toISOString(),
          createdAt: v.createdAt.toISOString(),
        })),
      };

      return response;
    }
  );

  /**
   * PUT /admin/tenants/:tenantId/subdomain
   * Update tenant subdomain
   */
  fastify.put<{
    Params: z.infer<typeof TenantIdParamsSchema>;
    Body: z.infer<typeof UpdateSubdomainSchema>;
  }>(
    '/tenants/:tenantId/subdomain',
    {
      schema: {
        description: 'Update tenant subdomain',
        tags: ['tenant-domains'],
        params: TenantIdParamsSchema,
        body: {
          type: 'object',
          properties: {
            subdomain: { type: ['string', 'null'] },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              tenantId: { type: 'string' },
              subdomain: { type: ['string', 'null'] },
              fullDomain: { type: ['string', 'null'] },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { tenantId } = TenantIdParamsSchema.parse(request.params);
      const { subdomain } = UpdateSubdomainSchema.parse(request.body);

      try {
        const updated = await resolver.updateSubdomain(tenantId, subdomain);

        const response: SubdomainResponse = {
          tenantId: updated.id,
          subdomain: updated.subdomain,
          fullDomain: updated.subdomain ? `${updated.subdomain}.${baseDomain}` : null,
        };

        return response;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';

        if (message.includes('already in use')) {
          return reply.code(409).send({
            error: 'Subdomain conflict',
            message,
          });
        }

        if (message.includes('Invalid subdomain')) {
          return reply.code(400).send({
            error: 'Invalid subdomain',
            message,
          });
        }

        throw error;
      }
    }
  );

  /**
   * POST /admin/tenants/:tenantId/domains
   * Initiate custom domain verification
   */
  fastify.post<{
    Params: z.infer<typeof TenantIdParamsSchema>;
    Body: z.infer<typeof AddDomainSchema>;
  }>(
    '/tenants/:tenantId/domains',
    {
      schema: {
        description: 'Add custom domain and initiate verification',
        tags: ['tenant-domains'],
        params: TenantIdParamsSchema,
        body: {
          type: 'object',
          required: ['domain'],
          properties: {
            domain: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              tenantId: { type: 'string' },
              domain: { type: 'string' },
              verification: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  host: { type: 'string' },
                  value: { type: 'string' },
                  expiresAt: { type: 'string' },
                },
              },
              instructions: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { tenantId } = TenantIdParamsSchema.parse(request.params);
      const { domain } = AddDomainSchema.parse(request.body);

      try {
        const verification = await resolver.initiateDomainVerification(
          tenantId,
          domain
        );

        const response: DomainVerificationResponse = {
          tenantId,
          domain: domain.toLowerCase(),
          verification,
          instructions: [
            `Add a TXT record to your DNS configuration:`,
            `Host: ${verification.host}`,
            `Value: ${verification.value}`,
            `TTL: 300 (or lowest available)`,
            ``,
            `After adding the record, call the verify endpoint to complete verification.`,
            `The verification token expires on ${verification.expiresAt.toISOString()}.`,
          ],
        };

        return reply.code(201).send(response);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';

        if (message.includes('already in use')) {
          return reply.code(409).send({
            error: 'Domain conflict',
            message,
          });
        }

        if (message.includes('Invalid domain')) {
          return reply.code(400).send({
            error: 'Invalid domain',
            message,
          });
        }

        throw error;
      }
    }
  );

  /**
   * POST /admin/tenants/:tenantId/domains/verify
   * Verify custom domain ownership
   */
  fastify.post<{
    Params: z.infer<typeof TenantIdParamsSchema>;
    Querystring: z.infer<typeof VerifyDomainQuerySchema>;
  }>(
    '/tenants/:tenantId/domains/verify',
    {
      schema: {
        description: 'Verify custom domain ownership via DNS',
        tags: ['tenant-domains'],
        params: TenantIdParamsSchema,
        querystring: {
          type: 'object',
          required: ['domain'],
          properties: {
            domain: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              tenantId: { type: 'string' },
              domain: { type: 'string' },
              result: {
                type: 'object',
                properties: {
                  verified: { type: 'boolean' },
                  error: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { tenantId } = TenantIdParamsSchema.parse(request.params);
      const { domain } = VerifyDomainQuerySchema.parse(request.query);

      const result = await resolver.verifyCustomDomain(tenantId, domain);

      const response: VerificationStatusResponse = {
        tenantId,
        domain: domain.toLowerCase(),
        result,
      };

      return response;
    }
  );

  /**
   * DELETE /admin/tenants/:tenantId/domains
   * Remove custom domain from tenant
   */
  fastify.delete<{
    Params: z.infer<typeof TenantIdParamsSchema>;
    Querystring: z.infer<typeof VerifyDomainQuerySchema>;
  }>(
    '/tenants/:tenantId/domains',
    {
      schema: {
        description: 'Remove custom domain from tenant',
        tags: ['tenant-domains'],
        params: TenantIdParamsSchema,
        querystring: {
          type: 'object',
          required: ['domain'],
          properties: {
            domain: { type: 'string' },
          },
        },
        response: {
          204: {
            type: 'null',
          },
        },
      },
    },
    async (request, reply) => {
      const { tenantId } = TenantIdParamsSchema.parse(request.params);
      const { domain } = VerifyDomainQuerySchema.parse(request.query);

      await resolver.removeCustomDomain(tenantId, domain);

      return reply.code(204).send();
    }
  );

  /**
   * POST /admin/tenants/:tenantId/cache/invalidate
   * Manually invalidate tenant cache
   */
  fastify.post<{
    Params: z.infer<typeof TenantIdParamsSchema>;
  }>(
    '/tenants/:tenantId/cache/invalidate',
    {
      schema: {
        description: 'Manually invalidate tenant resolution cache',
        tags: ['tenant-domains'],
        params: TenantIdParamsSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request) => {
      const { tenantId } = TenantIdParamsSchema.parse(request.params);

      await resolver.invalidateCache(tenantId);

      return {
        success: true,
        message: `Cache invalidated for tenant ${tenantId}`,
      };
    }
  );
};

export default tenantDomainsRoutes;
