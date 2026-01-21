/**
 * Enterprise Provisioning Routes
 *
 * REST API endpoints for enterprise sales team to manage customers,
 * deals, and bulk license provisioning.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { enterpriseProvisioningService } from '../services/enterprise-provisioning.service.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

// Customer Schemas
const CreateCustomerSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum([
    'DISTRICT',
    'CHARTER_NETWORK',
    'PRIVATE_SCHOOL',
    'NONPROFIT',
    'GOVERNMENT',
    'RESELLER',
    'OTHER',
  ]),
  primaryContactName: z.string().min(1).max(255),
  primaryContactEmail: z.string().email(),
  primaryContactPhone: z.string().optional(),
  billingContactEmail: z.string().email().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default('US'),
  website: z.string().url().optional(),
  taxId: z.string().optional(),
  notes: z.string().optional(),
});

const UpdateCustomerSchema = CreateCustomerSchema.partial();

const AddContactSchema = z.object({
  customerId: z.string().uuid(),
  name: z.string().min(1).max(255),
  email: z.string().email(),
  phone: z.string().optional(),
  title: z.string().optional(),
  isPrimary: z.boolean().default(false),
  notes: z.string().optional(),
});

// Deal Schemas
const CreateDealSchema = z.object({
  customerId: z.string().uuid(),
  name: z.string().min(1).max(255),
  type: z.enum(['NEW_BUSINESS', 'EXPANSION', 'RENEWAL', 'UPSELL']),
  seats: z.number().int().min(1),
  pricePerSeatCents: z.number().int().min(0),
  termMonths: z.number().int().min(1).max(60).default(12),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  expectedCloseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  probability: z.number().int().min(0).max(100).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  discountReason: z.string().optional(),
  products: z.array(z.string()).optional(),
  notes: z.string().optional(),
  externalCrmId: z.string().optional(),
});

const UpdateDealSchema = CreateDealSchema.partial().extend({
  status: z
    .enum([
      'LEAD',
      'QUALIFIED',
      'PROPOSAL',
      'NEGOTIATION',
      'CONTRACT_SENT',
      'WON_PENDING',
      'WON_ACTIVE',
      'LOST',
      'CHURNED',
    ])
    .optional(),
  lostReason: z.string().optional(),
});

const AddDealActivitySchema = z.object({
  dealId: z.string().uuid(),
  activityType: z.enum(['NOTE', 'CALL', 'EMAIL', 'MEETING', 'DEMO', 'STATUS_CHANGE', 'OTHER']),
  description: z.string().min(1),
});

// Inferred types from schemas
type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;
type AddContactInput = z.infer<typeof AddContactSchema>;
type CreateDealInput = z.infer<typeof CreateDealSchema>;
type AddDealActivityInput = z.infer<typeof AddDealActivitySchema>;
type ProvisionBatchInput = z.infer<typeof ProvisionBatchSchema>;

// Provisioning Schemas
const ProvisionBatchSchema = z.object({
  dealId: z.string().uuid(),
  name: z.string().min(1).max(255),
  licenseCount: z.number().int().min(1).max(10000),
  licenseType: z.enum(['SEAT', 'ENTERPRISE', 'TRIAL', 'PROMOTIONAL', 'NFR']).default('ENTERPRISE'),
  seatsPerLicense: z.number().int().min(1).default(1),
  durationDays: z.number().int().min(1).optional(),
  features: z.array(z.string()).optional(),
});

// Query Schemas
const ListCustomersQuerySchema = z.object({
  type: z
    .enum([
      'DISTRICT',
      'CHARTER_NETWORK',
      'PRIVATE_SCHOOL',
      'NONPROFIT',
      'GOVERNMENT',
      'RESELLER',
      'OTHER',
    ])
    .optional(),
  salesRepId: z.string().uuid().optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  search: z.string().optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).default('50'),
  offset: z.string().transform(Number).pipe(z.number().int().min(0)).default('0'),
});

const ListDealsQuerySchema = z.object({
  customerId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
  status: z
    .enum([
      'LEAD',
      'QUALIFIED',
      'PROPOSAL',
      'NEGOTIATION',
      'CONTRACT_SENT',
      'WON_PENDING',
      'WON_ACTIVE',
      'LOST',
      'CHURNED',
    ])
    .optional(),
  type: z.enum(['NEW_BUSINESS', 'EXPANSION', 'RENEWAL', 'UPSELL']).optional(),
  minValue: z.string().transform(Number).pipe(z.number().int().min(0)).optional(),
  maxValue: z.string().transform(Number).pipe(z.number().int().min(0)).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).default('50'),
  offset: z.string().transform(Number).pipe(z.number().int().min(0)).default('0'),
});

const ListBatchesQuerySchema = z.object({
  dealId: z.string().uuid().optional(),
  status: z.string().optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).default('50'),
  offset: z.string().transform(Number).pipe(z.number().int().min(0)).default('0'),
});

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface RequestContext {
  tenantId: string;
  userId: string;
  correlationId: string;
  ipAddress?: string;
  userAgent?: string;
}

// Extract context from request headers
function getContext(request: FastifyRequest): RequestContext {
  const tenantId = request.headers['x-tenant-id'] as string;
  const userId = request.headers['x-user-id'] as string;
  const correlationId = (request.headers['x-correlation-id'] as string) ?? crypto.randomUUID();
  const ipAddress = request.ip;
  const userAgent = request.headers['user-agent'];

  if (!tenantId || !userId) {
    throw new Error('Missing required headers: x-tenant-id, x-user-id');
  }

  return { tenantId, userId, correlationId, ipAddress, userAgent };
}

// Check if user has sales/admin role (placeholder - integrate with auth)
function requireSalesRole(_ctx: RequestContext): void {
  // [PLACEHOLDER] Integrate with actual role checking from auth service
  // For now, we trust the x-user-id header for sales operations
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════

export async function enterpriseProvisioningRoutes(app: FastifyInstance): Promise<void> {
  // ───────────────────────────────────────────────────────────────────────────
  // CUSTOMER MANAGEMENT
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * POST /enterprise/customers
   * Create a new enterprise customer
   * Requires: Sales role
   */
  app.post('/enterprise/customers', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getContext(request);
    requireSalesRole(ctx);

    const body: CreateCustomerInput = CreateCustomerSchema.parse(request.body);

    const customer = await enterpriseProvisioningService.createCustomer(body, ctx.userId);

    return reply.status(201).send({
      success: true,
      customer,
    });
  });

  /**
   * GET /enterprise/customers
   * List enterprise customers with filters
   * Requires: Sales role
   */
  app.get('/enterprise/customers', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getContext(request);
    requireSalesRole(ctx);

    const query = ListCustomersQuerySchema.parse(request.query);

    const result = await enterpriseProvisioningService.listCustomers({
      type: query.type,
      salesRepId: query.salesRepId,
      isActive: query.isActive,
      search: query.search,
      limit: query.limit,
      offset: query.offset,
    });

    return reply.send({
      success: true,
      customers: result.customers,
      total: result.total,
      limit: query.limit,
      offset: query.offset,
    });
  });

  /**
   * GET /enterprise/customers/:id
   * Get a specific customer by ID
   * Requires: Sales role
   */
  app.get('/enterprise/customers/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getContext(request);
    requireSalesRole(ctx);

    const { id } = request.params as { id: string };

    if (!z.string().uuid().safeParse(id).success) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid customer ID format',
      });
    }

    const customer = await enterpriseProvisioningService.getCustomer(id);

    if (!customer) {
      return reply.status(404).send({
        success: false,
        error: 'Customer not found',
      });
    }

    return reply.send({
      success: true,
      customer,
    });
  });

  /**
   * PATCH /enterprise/customers/:id
   * Update a customer
   * Requires: Sales role
   */
  app.patch('/enterprise/customers/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getContext(request);
    requireSalesRole(ctx);

    const { id } = request.params as { id: string };

    if (!z.string().uuid().safeParse(id).success) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid customer ID format',
      });
    }

    const body = UpdateCustomerSchema.parse(request.body);

    const customer = await enterpriseProvisioningService.updateCustomer(id, body);

    if (!customer) {
      return reply.status(404).send({
        success: false,
        error: 'Customer not found',
      });
    }

    return reply.send({
      success: true,
      customer,
    });
  });

  /**
   * POST /enterprise/customers/:id/contacts
   * Add a contact to a customer
   * Requires: Sales role
   */
  app.post(
    '/enterprise/customers/:id/contacts',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const ctx = getContext(request);
      requireSalesRole(ctx);

      const { id } = request.params as { id: string };

      if (!z.string().uuid().safeParse(id).success) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid customer ID format',
        });
      }

      const body: Omit<AddContactInput, 'customerId'> = AddContactSchema.omit({
        customerId: true,
      }).parse(request.body);

      const contact = await enterpriseProvisioningService.addContact({
        customerId: id,
        ...body,
      } as AddContactInput);

      return reply.status(201).send({
        success: true,
        contact,
      });
    }
  );

  // ───────────────────────────────────────────────────────────────────────────
  // DEAL MANAGEMENT
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * POST /enterprise/deals
   * Create a new deal/opportunity
   * Requires: Sales role
   */
  app.post('/enterprise/deals', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getContext(request);
    requireSalesRole(ctx);

    const body: CreateDealInput = CreateDealSchema.parse(request.body);

    const deal = await enterpriseProvisioningService.createDeal(body, ctx.userId);

    return reply.status(201).send({
      success: true,
      deal,
    });
  });

  /**
   * GET /enterprise/deals
   * List deals with filters
   * Requires: Sales role
   */
  app.get('/enterprise/deals', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getContext(request);
    requireSalesRole(ctx);

    const query = ListDealsQuerySchema.parse(request.query);

    const result = await enterpriseProvisioningService.listDeals({
      customerId: query.customerId,
      ownerId: query.ownerId,
      status: query.status,
      type: query.type,
      minValue: query.minValue,
      maxValue: query.maxValue,
      limit: query.limit,
      offset: query.offset,
    });

    return reply.send({
      success: true,
      deals: result.deals,
      total: result.total,
      limit: query.limit,
      offset: query.offset,
    });
  });

  /**
   * GET /enterprise/deals/:id
   * Get a specific deal by ID
   * Requires: Sales role
   */
  app.get('/enterprise/deals/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getContext(request);
    requireSalesRole(ctx);

    const { id } = request.params as { id: string };

    if (!z.string().uuid().safeParse(id).success) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid deal ID format',
      });
    }

    const deal = await enterpriseProvisioningService.getDeal(id);

    if (!deal) {
      return reply.status(404).send({
        success: false,
        error: 'Deal not found',
      });
    }

    return reply.send({
      success: true,
      deal,
    });
  });

  /**
   * PATCH /enterprise/deals/:id
   * Update a deal
   * Requires: Sales role
   */
  app.patch('/enterprise/deals/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getContext(request);
    requireSalesRole(ctx);

    const { id } = request.params as { id: string };

    if (!z.string().uuid().safeParse(id).success) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid deal ID format',
      });
    }

    const body = UpdateDealSchema.parse(request.body);

    const deal = await enterpriseProvisioningService.updateDeal(id, body, ctx.userId);

    if (!deal) {
      return reply.status(404).send({
        success: false,
        error: 'Deal not found',
      });
    }

    return reply.send({
      success: true,
      deal,
    });
  });

  /**
   * POST /enterprise/deals/:id/activities
   * Add an activity to a deal
   * Requires: Sales role
   */
  app.post(
    '/enterprise/deals/:id/activities',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const ctx = getContext(request);
      requireSalesRole(ctx);

      const { id } = request.params as { id: string };

      if (!z.string().uuid().safeParse(id).success) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid deal ID format',
        });
      }

      const body: Omit<AddDealActivityInput, 'dealId'> = AddDealActivitySchema.omit({
        dealId: true,
      }).parse(request.body);

      const activity = await enterpriseProvisioningService.addDealActivity(
        {
          dealId: id,
          ...body,
        } as AddDealActivityInput,
        ctx.userId
      );

      return reply.status(201).send({
        success: true,
        activity,
      });
    }
  );

  /**
   * GET /enterprise/deals/:id/activities
   * Get activities for a deal
   * Requires: Sales role
   */
  app.get(
    '/enterprise/deals/:id/activities',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const ctx = getContext(request);
      requireSalesRole(ctx);

      const { id } = request.params as { id: string };

      if (!z.string().uuid().safeParse(id).success) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid deal ID format',
        });
      }

      const activities = await enterpriseProvisioningService.getDealActivities(id);

      return reply.send({
        success: true,
        activities,
      });
    }
  );

  /**
   * POST /enterprise/deals/:id/win
   * Mark a deal as won
   * Requires: Sales role
   */
  app.post('/enterprise/deals/:id/win', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getContext(request);
    requireSalesRole(ctx);

    const { id } = request.params as { id: string };

    if (!z.string().uuid().safeParse(id).success) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid deal ID format',
      });
    }

    const deal = await enterpriseProvisioningService.winDeal(id, ctx.userId);

    if (!deal) {
      return reply.status(404).send({
        success: false,
        error: 'Deal not found',
      });
    }

    return reply.send({
      success: true,
      deal,
      message: 'Deal marked as won. You can now provision licenses.',
    });
  });

  /**
   * POST /enterprise/deals/:id/lose
   * Mark a deal as lost
   * Requires: Sales role
   */
  app.post('/enterprise/deals/:id/lose', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getContext(request);
    requireSalesRole(ctx);

    const { id } = request.params as { id: string };
    const { reason } = z.object({ reason: z.string().min(1) }).parse(request.body);

    if (!z.string().uuid().safeParse(id).success) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid deal ID format',
      });
    }

    const deal = await enterpriseProvisioningService.loseDeal(id, reason, ctx.userId);

    if (!deal) {
      return reply.status(404).send({
        success: false,
        error: 'Deal not found',
      });
    }

    return reply.send({
      success: true,
      deal,
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // BULK PROVISIONING
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * POST /enterprise/provisioning/batches
   * Create and start a bulk provisioning batch
   * Requires: Sales role
   */
  app.post(
    '/enterprise/provisioning/batches',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const ctx = getContext(request);
      requireSalesRole(ctx);

      const body: ProvisionBatchInput = ProvisionBatchSchema.parse(request.body);

      const batch = await enterpriseProvisioningService.createProvisioningBatch(
        body,
        ctx.userId,
        ctx.ipAddress,
        ctx.userAgent
      );

      return reply.status(201).send({
        success: true,
        batch,
        message: `Provisioning batch created. ${body.licenseCount} licenses will be generated.`,
      });
    }
  );

  /**
   * GET /enterprise/provisioning/batches
   * List provisioning batches
   * Requires: Sales role
   */
  app.get(
    '/enterprise/provisioning/batches',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const ctx = getContext(request);
      requireSalesRole(ctx);

      const query = ListBatchesQuerySchema.parse(request.query);

      const result = await enterpriseProvisioningService.listProvisioningBatches({
        dealId: query.dealId,
        status: query.status,
        limit: query.limit,
        offset: query.offset,
      });

      return reply.send({
        success: true,
        batches: result.batches,
        total: result.total,
        limit: query.limit,
        offset: query.offset,
      });
    }
  );

  /**
   * GET /enterprise/provisioning/batches/:id
   * Get a specific provisioning batch with licenses
   * Requires: Sales role
   */
  app.get(
    '/enterprise/provisioning/batches/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const ctx = getContext(request);
      requireSalesRole(ctx);

      const { id } = request.params as { id: string };

      if (!z.string().uuid().safeParse(id).success) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid batch ID format',
        });
      }

      const batch = await enterpriseProvisioningService.getProvisioningBatch(id);

      if (!batch) {
        return reply.status(404).send({
          success: false,
          error: 'Provisioning batch not found',
        });
      }

      return reply.send({
        success: true,
        batch,
      });
    }
  );

  /**
   * POST /enterprise/provisioning/batches/:id/execute
   * Execute a pending provisioning batch
   * Requires: Sales role
   */
  app.post(
    '/enterprise/provisioning/batches/:id/execute',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const ctx = getContext(request);
      requireSalesRole(ctx);

      const { id } = request.params as { id: string };

      if (!z.string().uuid().safeParse(id).success) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid batch ID format',
        });
      }

      const result = await enterpriseProvisioningService.executeProvisioningBatch(
        id,
        ctx.userId,
        ctx.ipAddress,
        ctx.userAgent
      );

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: result.error,
        });
      }

      return reply.send({
        success: true,
        batch: result.batch,
        licensesCreated: result.licensesCreated,
        message: `Successfully provisioned ${result.licensesCreated} licenses.`,
      });
    }
  );

  /**
   * GET /enterprise/provisioning/batches/:id/licenses
   * Get all licenses for a provisioning batch
   * Requires: Sales role
   */
  app.get(
    '/enterprise/provisioning/batches/:id/licenses',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const ctx = getContext(request);
      requireSalesRole(ctx);

      const { id } = request.params as { id: string };

      if (!z.string().uuid().safeParse(id).success) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid batch ID format',
        });
      }

      const result = await enterpriseProvisioningService.getBatchLicenses(id);

      return reply.send({
        success: true,
        licenses: result.licenses,
        total: result.total,
      });
    }
  );

  /**
   * POST /enterprise/provisioning/batches/:id/export
   * Export licenses from a batch (CSV format)
   * Requires: Sales role
   */
  app.post(
    '/enterprise/provisioning/batches/:id/export',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const ctx = getContext(request);
      requireSalesRole(ctx);

      const { id } = request.params as { id: string };
      const { format } = z
        .object({
          format: z.enum(['csv', 'json']).default('csv'),
        })
        .parse(request.body || {});

      if (!z.string().uuid().safeParse(id).success) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid batch ID format',
        });
      }

      const result = await enterpriseProvisioningService.exportBatchLicenses(id, format);

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: result.error,
        });
      }

      if (format === 'csv') {
        return reply
          .header('Content-Type', 'text/csv')
          .header('Content-Disposition', `attachment; filename="licenses-${id}.csv"`)
          .send(result.data);
      }

      return reply.send({
        success: true,
        data: result.data,
      });
    }
  );

  // ───────────────────────────────────────────────────────────────────────────
  // ANALYTICS & REPORTING
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * GET /enterprise/analytics/pipeline
   * Get sales pipeline analytics
   * Requires: Sales role
   */
  app.get(
    '/enterprise/analytics/pipeline',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const ctx = getContext(request);
      requireSalesRole(ctx);

      const analytics = await enterpriseProvisioningService.getPipelineAnalytics(ctx.userId);

      return reply.send({
        success: true,
        analytics,
      });
    }
  );

  /**
   * GET /enterprise/analytics/revenue
   * Get revenue analytics
   * Requires: Sales role
   */
  app.get('/enterprise/analytics/revenue', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getContext(request);
    requireSalesRole(ctx);

    const query = z
      .object({
        startDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        endDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
      })
      .parse(request.query);

    const analytics = await enterpriseProvisioningService.getRevenueAnalytics(
      query.startDate,
      query.endDate
    );

    return reply.send({
      success: true,
      analytics,
    });
  });
}
