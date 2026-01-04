/**
 * District Lookup API Routes
 *
 * Public API for looking up school districts by ZIP code or state.
 * Used during onboarding to auto-detect district and curriculum standards.
 *
 * @module routes/district-lookup
 */

import { type FastifyInstance, type FastifyRequest } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma.js';
import { DistrictLookupService } from '../services/district-lookup.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// Schemas
// ══════════════════════════════════════════════════════════════════════════════

const zipCodeLookupSchema = z.object({
  zipCode: z.string().min(5).max(10),
});

const stateLookupSchema = z.object({
  stateCode: z.string().length(2),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  search: z.string().optional(),
});

const autoDetectSchema = z.object({
  zipCode: z.string().min(5).max(10),
  stateCode: z.string().length(2).optional(),
  city: z.string().optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// Routes
// ══════════════════════════════════════════════════════════════════════════════

export async function registerDistrictLookupRoutes(app: FastifyInstance) {
  const lookupService = new DistrictLookupService(prisma);

  /**
   * GET /districts/lookup/zip/:zipCode - Look up districts by ZIP code
   * Public endpoint (no auth required) for onboarding
   */
  app.get(
    '/districts/lookup/zip/:zipCode',
    async (
      request: FastifyRequest<{
        Params: { zipCode: string };
      }>,
      reply
    ) => {
      const parsed = zipCodeLookupSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Invalid ZIP code',
          details: parsed.error.issues,
        });
      }

      const result = await lookupService.lookupByZipCode(parsed.data.zipCode);

      if (!result.success) {
        return reply.status(404).send({
          error: 'Not found',
          message: result.message,
        });
      }

      return reply.send(result);
    }
  );

  /**
   * GET /districts/lookup/state/:stateCode - Look up districts by state
   * Public endpoint for browsing districts
   */
  app.get(
    '/districts/lookup/state/:stateCode',
    async (
      request: FastifyRequest<{
        Params: { stateCode: string };
        Querystring: { limit?: string; offset?: string; search?: string };
      }>,
      reply
    ) => {
      const parsed = stateLookupSchema.safeParse({
        stateCode: request.params.stateCode,
        ...request.query,
      });

      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Invalid parameters',
          details: parsed.error.issues,
        });
      }

      const { stateCode, limit, offset, search } = parsed.data;
      const result = await lookupService.lookupByState(stateCode, { limit, offset, search });

      return reply.send({
        districts: result.districts,
        total: result.total,
        limit,
        offset,
        stateCurriculum: result.stateCurriculum,
      });
    }
  );

  /**
   * GET /districts/:ncesDistrictId - Get district by NCES ID
   */
  app.get(
    '/districts/:ncesDistrictId',
    async (
      request: FastifyRequest<{
        Params: { ncesDistrictId: string };
      }>,
      reply
    ) => {
      const { ncesDistrictId } = request.params;

      const district = await lookupService.getDistrictByNcesId(ncesDistrictId);

      if (!district) {
        return reply.status(404).send({
          error: 'Not found',
          message: `District with NCES ID ${ncesDistrictId} not found`,
        });
      }

      // Also get curriculum for the district's state
      const curriculum = await lookupService.getStateCurriculum(district.stateCode);

      return reply.send({
        district,
        stateCurriculum: curriculum,
      });
    }
  );

  /**
   * POST /districts/auto-detect - Auto-detect district and curriculum from location
   * Main endpoint used during learner/family onboarding
   */
  app.post(
    '/districts/auto-detect',
    async (
      request: FastifyRequest<{
        Body: z.infer<typeof autoDetectSchema>;
      }>,
      reply
    ) => {
      const parsed = autoDetectSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Invalid location data',
          details: parsed.error.issues,
        });
      }

      const result = await lookupService.autoDetectFromLocation(parsed.data);

      return reply.send({
        success: true,
        district: result.district,
        curriculum: result.curriculum,
        // These values should be used to configure the tenant/learner
        configRecommendations: {
          curriculumStandards: result.tenantConfigUpdates.curriculumStandards,
          stateCode: result.tenantConfigUpdates.stateCode,
          zipCode: result.tenantConfigUpdates.zipCode,
        },
      });
    }
  );

  /**
   * GET /curriculum/states - Get all state curriculum standards
   * Reference endpoint for understanding state-by-state curriculum adoption
   */
  app.get('/curriculum/states', async (_request, reply) => {
    const standards = await lookupService.getAllStateCurriculumStandards();
    return reply.send({ states: standards });
  });

  /**
   * GET /curriculum/states/:stateCode - Get curriculum for a specific state
   */
  app.get(
    '/curriculum/states/:stateCode',
    async (
      request: FastifyRequest<{
        Params: { stateCode: string };
      }>,
      reply
    ) => {
      const { stateCode } = request.params;

      if (stateCode.length !== 2) {
        return reply.status(400).send({
          error: 'Invalid state code',
          message: 'State code must be 2 characters (e.g., "CA", "TX")',
        });
      }

      const curriculum = await lookupService.getStateCurriculum(stateCode);

      if (!curriculum) {
        return reply.status(404).send({
          error: 'Not found',
          message: `Curriculum standards for state ${stateCode} not found`,
        });
      }

      return reply.send(curriculum);
    }
  );
}
