/**
 * Internal Service-to-Service API Routes
 *
 * These routes are called by other platform services (parent-svc, session-svc, etc.)
 * and are exempt from JWT / Platform Admin auth checks.
 * Access control is enforced by network policies and X-Service-Name header validation.
 *
 * @module routes/internal
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma.js';
import { TenantConfigService } from '../services/tenant-config.service.js';

const configService = new TenantConfigService({ prisma });

// Allowed service names for internal calls
const ALLOWED_SERVICES = new Set([
  'parent-svc',
  'session-svc',
  'curriculum-svc',
  'content-svc',
  'api-gateway',
  'brain-engine',
  'ai-orchestrator',
]);

const updateCurriculumStandardsSchema = z.object({
  curriculum_standards: z.array(z.string()).min(1),
  custom_settings: z
    .object({
      state_code: z.string().optional(),
      zip_code: z.string().optional(),
      nces_district_id: z.string().optional(),
      district_name: z.string().optional(),
    })
    .optional(),
});

export async function registerInternalRoutes(app: FastifyInstance) {
  /**
   * Validate X-Service-Name header for service-to-service trust.
   * This is a lightweight check — network policies provide the real boundary.
   */
  function validateServiceCaller(request: FastifyRequest): string | null {
    const serviceName = request.headers['x-service-name'] as string | undefined;
    if (!serviceName || !ALLOWED_SERVICES.has(serviceName)) {
      return null;
    }
    return serviceName;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Curriculum Standards
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * PATCH /internal/tenants/:tenantId/curriculum-standards
   *
   * Called by parent-svc during onboarding and location updates to persist
   * the geo-detected curriculum standards to TenantConfig. This allows
   * downstream services (curriculum-svc, session-svc) to filter content
   * by the tenant's geographic standards.
   */
  app.patch(
    '/internal/tenants/:tenantId/curriculum-standards',
    async (
      request: FastifyRequest<{
        Params: { tenantId: string };
        Body: z.infer<typeof updateCurriculumStandardsSchema>;
      }>,
      reply
    ) => {
      const caller = validateServiceCaller(request);
      if (!caller) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Valid X-Service-Name header required for internal API',
        });
      }

      const paramsResult = z
        .object({ tenantId: z.string().uuid() })
        .safeParse(request.params);
      if (!paramsResult.success) {
        return reply.code(400).send({ error: 'Invalid tenantId' });
      }

      const bodyResult = updateCurriculumStandardsSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.code(400).send({
          error: 'Invalid payload',
          details: bodyResult.error.issues,
        });
      }

      const { tenantId } = paramsResult.data;
      const { curriculum_standards, custom_settings } = bodyResult.data;

      try {
        const config = await configService.upsertTenantConfig(tenantId, {
          curriculumStandards: curriculum_standards,
          ...(custom_settings && { customSettings: custom_settings }),
        });

        request.log.info(
          { tenantId, caller, curriculumStandards: curriculum_standards },
          'Curriculum standards updated via internal API'
        );

        return reply.send({
          success: true,
          curriculumStandards: config.curriculumStandards,
        });
      } catch (error) {
        request.log.error(error, 'Failed to update curriculum standards');
        const message = error instanceof Error ? error.message : 'Unknown error';
        return reply.code(500).send({ error: 'Failed to update curriculum standards', message });
      }
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Get Tenant Config (read-only, for downstream services)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * GET /internal/tenants/:tenantId/config
   *
   * Called by downstream services (curriculum-svc, session-svc) to read
   * the tenant's configuration, including curriculumStandards.
   */
  app.get(
    '/internal/tenants/:tenantId/config',
    async (
      request: FastifyRequest<{
        Params: { tenantId: string };
      }>,
      reply
    ) => {
      const caller = validateServiceCaller(request);
      if (!caller) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Valid X-Service-Name header required for internal API',
        });
      }

      const paramsResult = z
        .object({ tenantId: z.string().uuid() })
        .safeParse(request.params);
      if (!paramsResult.success) {
        return reply.code(400).send({ error: 'Invalid tenantId' });
      }

      try {
        const config = await configService.getTenantConfig(paramsResult.data.tenantId);
        return reply.send(config);
      } catch (error) {
        request.log.error(error, 'Failed to get tenant config');
        const message = error instanceof Error ? error.message : 'Unknown error';
        return reply.code(500).send({ error: 'Failed to get tenant config', message });
      }
    }
  );
}
