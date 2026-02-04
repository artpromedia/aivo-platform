/**
 * Pilot Program Routes
 *
 * REST API endpoints for managing pilot programs for districts,
 * nonprofits, and enterprise trials including:
 * - Pilot creation and management
 * - Extension handling
 * - Conversion to paid contracts
 * - Payment method management
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { pilotProgramService } from '../services/pilot-program.service.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

const CreatePilotSchema = z.object({
  tenantId: z.string().uuid(),
  enterpriseCustomerId: z.string().uuid().optional(),
  enterpriseDealId: z.string().uuid().optional(),
  type: z.enum([
    'DISTRICT_PILOT',
    'NONPROFIT_PILOT',
    'CHARTER_PILOT',
    'ENTERPRISE_TRIAL',
    'PROMOTIONAL',
  ]),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  seats: z.number().int().min(1).max(100000),
  durationDays: z.number().int().min(7).max(365).optional(),
  startDate: z.string().datetime().optional(),
  primaryContactName: z.string().max(200).optional(),
  primaryContactEmail: z.string().email().optional(),
  primaryContactPhone: z.string().max(50).optional(),
  features: z.array(z.string()).optional(),
  successCriteria: z.record(z.unknown()).optional(),
  autoConvertEnabled: z.boolean().optional(),
  conversionDiscountPct: z.number().min(0).max(100).optional(),
  conversionPricePerSeatCents: z.number().int().min(0).optional(),
  notes: z.string().max(5000).optional(),
});

const ExtendPilotSchema = z.object({
  additionalDays: z.number().int().min(1).max(365),
  reason: z.string().max(1000).optional(),
});

const ConvertPilotSchema = z.object({
  contractTermMonths: z.number().int().min(1).max(60).optional(),
  pricePerSeatCents: z.number().int().min(0).optional(),
  applyPromotionalPricing: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});

const AttachPaymentMethodSchema = z.object({
  billingInstrumentId: z.string().uuid(),
});

const ListPilotsQuerySchema = z.object({
  tenantId: z.string().uuid().optional(),
  enterpriseCustomerId: z.string().uuid().optional(),
  status: z
    .enum(['PENDING', 'ACTIVE', 'EXTENDED', 'CONVERTING', 'CONVERTED', 'EXPIRED', 'CANCELLED'])
    .optional(),
  type: z
    .enum(['DISTRICT_PILOT', 'NONPROFIT_PILOT', 'CHARTER_PILOT', 'ENTERPRISE_TRIAL', 'PROMOTIONAL'])
    .optional(),
  endingWithinDays: z.coerce.number().int().min(1).max(365).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

export async function pilotRoutes(fastify: FastifyInstance): Promise<void> {
  // ─────────────────────────────────────────────────────────────────────────────
  // CREATE PILOT PROGRAM
  // ─────────────────────────────────────────────────────────────────────────────

  fastify.post(
    '/pilots',
    {
      schema: {
        description: 'Create a new pilot program for a district, nonprofit, or enterprise',
        tags: ['Pilot Programs'],
        body: {
          type: 'object',
          required: ['tenantId', 'type', 'name', 'seats'],
          properties: {
            tenantId: { type: 'string', format: 'uuid' },
            enterpriseCustomerId: { type: 'string', format: 'uuid' },
            enterpriseDealId: { type: 'string', format: 'uuid' },
            type: {
              type: 'string',
              enum: [
                'DISTRICT_PILOT',
                'NONPROFIT_PILOT',
                'CHARTER_PILOT',
                'ENTERPRISE_TRIAL',
                'PROMOTIONAL',
              ],
            },
            name: { type: 'string', minLength: 1, maxLength: 200 },
            description: { type: 'string', maxLength: 2000 },
            seats: { type: 'integer', minimum: 1, maximum: 100000 },
            durationDays: { type: 'integer', minimum: 7, maximum: 365 },
            startDate: { type: 'string', format: 'date-time' },
            primaryContactName: { type: 'string', maxLength: 200 },
            primaryContactEmail: { type: 'string', format: 'email' },
            primaryContactPhone: { type: 'string', maxLength: 50 },
            features: { type: 'array', items: { type: 'string' } },
            successCriteria: { type: 'object', additionalProperties: true },
            autoConvertEnabled: { type: 'boolean' },
            conversionDiscountPct: { type: 'number', minimum: 0, maximum: 100 },
            conversionPricePerSeatCents: { type: 'integer', minimum: 0 },
            notes: { type: 'string', maxLength: 5000 },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              pilot: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  type: { type: 'string' },
                  status: { type: 'string' },
                  seats: { type: 'integer' },
                  startDate: { type: 'string' },
                  endDate: { type: 'string' },
                },
              },
              licenses: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    displayKey: { type: 'string' },
                  },
                },
              },
              remindersScheduled: { type: 'integer' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof CreatePilotSchema> }>,
      reply: FastifyReply
    ) => {
      const body = CreatePilotSchema.parse(request.body);

      // Get user from request (assumes auth middleware)
      const userId = (request.user as { id?: string })?.id ?? 'system';

      const result = await pilotProgramService.createPilot({
        ...body,
        tenantId: body.tenantId!,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        createdBy: userId,
      } as any);

      return reply.status(201).send({
        success: true,
        ...result,
      });
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // LIST PILOTS
  // ─────────────────────────────────────────────────────────────────────────────

  fastify.get(
    '/pilots',
    {
      schema: {
        description: 'List pilot programs with optional filters',
        tags: ['Pilot Programs'],
        querystring: {
          type: 'object',
          properties: {
            tenantId: { type: 'string', format: 'uuid' },
            enterpriseCustomerId: { type: 'string', format: 'uuid' },
            status: {
              type: 'string',
              enum: [
                'PENDING',
                'ACTIVE',
                'EXTENDED',
                'CONVERTING',
                'CONVERTED',
                'EXPIRED',
                'CANCELLED',
              ],
            },
            type: {
              type: 'string',
              enum: [
                'DISTRICT_PILOT',
                'NONPROFIT_PILOT',
                'CHARTER_PILOT',
                'ENTERPRISE_TRIAL',
                'PROMOTIONAL',
              ],
            },
            endingWithinDays: { type: 'integer', minimum: 1, maximum: 365 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            offset: { type: 'integer', minimum: 0, default: 0 },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof ListPilotsQuerySchema> }>,
      reply: FastifyReply
    ) => {
      const query = ListPilotsQuerySchema.parse(request.query);

      const result = await pilotProgramService.listPilots({
        tenantId: query.tenantId,
        enterpriseCustomerId: query.enterpriseCustomerId,
        status: query.status,
        type: query.type,
        endingWithinDays: query.endingWithinDays,
        limit: query.limit,
        offset: query.offset,
      });

      return reply.send({
        success: true,
        ...result,
        pagination: {
          limit: query.limit,
          offset: query.offset,
          hasMore: query.offset + result.pilots.length < result.total,
        },
      });
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // GET PILOT BY ID
  // ─────────────────────────────────────────────────────────────────────────────

  fastify.get(
    '/pilots/:pilotId',
    {
      schema: {
        description: 'Get detailed information about a pilot program',
        tags: ['Pilot Programs'],
        params: {
          type: 'object',
          required: ['pilotId'],
          properties: {
            pilotId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { pilotId: string } }>, reply: FastifyReply) => {
      const { pilotId } = request.params;

      const pilot = await pilotProgramService.getPilot(pilotId);

      if (!pilot) {
        return reply.status(404).send({
          success: false,
          error: 'Pilot program not found',
        });
      }

      return reply.send({
        success: true,
        pilot,
      });
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // EXTEND PILOT
  // ─────────────────────────────────────────────────────────────────────────────

  fastify.post(
    '/pilots/:pilotId/extend',
    {
      schema: {
        description: 'Extend a pilot program by additional days',
        tags: ['Pilot Programs'],
        params: {
          type: 'object',
          required: ['pilotId'],
          properties: {
            pilotId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['additionalDays'],
          properties: {
            additionalDays: { type: 'integer', minimum: 1, maximum: 365 },
            reason: { type: 'string', maxLength: 1000 },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { pilotId: string };
        Body: z.infer<typeof ExtendPilotSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const { pilotId } = request.params;
      const body = ExtendPilotSchema.parse(request.body);
      const userId = (request.user as { id?: string })?.id ?? 'system';

      const result = await pilotProgramService.extendPilot({
        pilotId,
        additionalDays: body.additionalDays,
        reason: body.reason,
        approvedBy: userId,
      });

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: result.error,
        });
      }

      return reply.send({
        success: true,
        newEndDate: result.newEndDate,
        extensionNumber: result.extensionNumber,
      });
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // CONVERT PILOT TO CONTRACT
  // ─────────────────────────────────────────────────────────────────────────────

  fastify.post(
    '/pilots/:pilotId/convert',
    {
      schema: {
        description: 'Convert a pilot program to a paid contract/subscription',
        tags: ['Pilot Programs'],
        params: {
          type: 'object',
          required: ['pilotId'],
          properties: {
            pilotId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            contractTermMonths: { type: 'integer', minimum: 1, maximum: 60 },
            pricePerSeatCents: { type: 'integer', minimum: 0 },
            applyPromotionalPricing: { type: 'boolean' },
            notes: { type: 'string', maxLength: 2000 },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { pilotId: string };
        Body: z.infer<typeof ConvertPilotSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const { pilotId } = request.params;
      const body = ConvertPilotSchema.parse(request.body);
      const userId = (request.user as { id?: string })?.id ?? 'system';

      const result = await pilotProgramService.convertPilot({
        pilotId,
        contractTermMonths: body.contractTermMonths,
        pricePerSeatCents: body.pricePerSeatCents,
        applyPromotionalPricing: body.applyPromotionalPricing,
        convertedBy: userId,
        notes: body.notes,
      });

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: result.error,
        });
      }

      return reply.send({
        success: true,
        contractId: result.contractId,
        subscriptionId: result.subscriptionId,
        originalPriceCents: result.originalPriceCents,
        finalPriceCents: result.finalPriceCents,
        discountApplied: result.discountApplied,
      });
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // ATTACH PAYMENT METHOD
  // ─────────────────────────────────────────────────────────────────────────────

  fastify.post(
    '/pilots/:pilotId/payment-method',
    {
      schema: {
        description: 'Attach a payment method to a pilot for auto-conversion (does not charge)',
        tags: ['Pilot Programs'],
        params: {
          type: 'object',
          required: ['pilotId'],
          properties: {
            pilotId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['billingInstrumentId'],
          properties: {
            billingInstrumentId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { pilotId: string };
        Body: z.infer<typeof AttachPaymentMethodSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const { pilotId } = request.params;
      const body = AttachPaymentMethodSchema.parse(request.body);

      const result = await pilotProgramService.attachPaymentMethod(
        pilotId,
        body.billingInstrumentId
      );

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: result.error,
        });
      }

      return reply.send({
        success: true,
        message: 'Payment method attached. It will be charged when the pilot ends.',
      });
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // REMOVE PAYMENT METHOD
  // ─────────────────────────────────────────────────────────────────────────────

  fastify.delete(
    '/pilots/:pilotId/payment-method',
    {
      schema: {
        description: 'Remove payment method from pilot (disables auto-conversion)',
        tags: ['Pilot Programs'],
        params: {
          type: 'object',
          required: ['pilotId'],
          properties: {
            pilotId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { pilotId: string } }>, reply: FastifyReply) => {
      const { pilotId } = request.params;

      const result = await pilotProgramService.removePaymentMethod(pilotId);

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: result.error,
        });
      }

      return reply.send({
        success: true,
        message: 'Payment method removed. Auto-conversion is now disabled.',
      });
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // CANCEL PILOT
  // ─────────────────────────────────────────────────────────────────────────────

  fastify.post(
    '/pilots/:pilotId/cancel',
    {
      schema: {
        description: 'Cancel a pilot program',
        tags: ['Pilot Programs'],
        params: {
          type: 'object',
          required: ['pilotId'],
          properties: {
            pilotId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            reason: { type: 'string', maxLength: 1000 },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { pilotId: string };
        Body: { reason?: string };
      }>,
      reply: FastifyReply
    ) => {
      const { pilotId } = request.params;
      const { reason } = request.body ?? {};
      const userId = (request.user as { id?: string })?.id ?? 'system';

      const result = await pilotProgramService.cancelPilot(pilotId, reason, userId);

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: result.error,
        });
      }

      return reply.send({
        success: true,
        message: 'Pilot program cancelled',
      });
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // PILOT STATS & ANALYTICS
  // ─────────────────────────────────────────────────────────────────────────────

  fastify.get(
    '/pilots/stats',
    {
      schema: {
        description: 'Get pilot program statistics and analytics',
        tags: ['Pilot Programs'],
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const stats = await pilotProgramService.getPilotStats();

      return reply.send({
        success: true,
        stats,
      });
    }
  );

  fastify.get(
    '/pilots/ending-soon',
    {
      schema: {
        description: 'Get pilots ending within a specified number of days',
        tags: ['Pilot Programs'],
        querystring: {
          type: 'object',
          properties: {
            days: { type: 'integer', minimum: 1, maximum: 90, default: 14 },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: { days?: number } }>, reply: FastifyReply) => {
      const days = request.query.days ?? 14;

      const result = await pilotProgramService.getPilotsEndingSoon(days);

      return reply.send({
        success: true,
        ...result,
      });
    }
  );
}

export default pilotRoutes;
