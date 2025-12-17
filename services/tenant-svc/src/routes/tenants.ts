/**
 * Tenant Management API Routes
 *
 * These routes are protected by Platform Admin role.
 * They provide full lifecycle management for tenants.
 *
 * @module routes/tenants
 */

import { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma.js';
import {
  TenantConfigService,
  type UpdateTenantConfigInput,
} from '../services/tenant-config.service.js';
import {
  TenantLifecycleService,
  type ActorContext,
  type TenantType,
  type TenantStatus,
} from '../services/tenant-lifecycle.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// Schemas
// ══════════════════════════════════════════════════════════════════════════════

const tenantCreateSchema = z.object({
  type: z.enum(['CONSUMER', 'DISTRICT', 'CLINIC']),
  name: z.string().min(2),
  primary_domain: z.string().min(3),
  subdomain: z.string().min(2).max(63).optional(),
  custom_domain: z.string().optional(),
  region: z.string().optional(),
  logo_url: z.string().url().optional(),
  primary_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  billing_plan_id: z.string().uuid().optional(),
  settings: z.record(z.unknown()).optional(),
});

const tenantUpdateSchema = z.object({
  type: z.enum(['CONSUMER', 'DISTRICT', 'CLINIC']).optional(),
  name: z.string().min(2).optional(),
  primary_domain: z.string().min(3).optional(),
  subdomain: z.string().min(2).max(63).optional().nullable(),
  custom_domain: z.string().optional().nullable(),
  region: z.string().optional(),
  logo_url: z.string().url().optional().nullable(),
  primary_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .nullable(),
  billing_plan_id: z.string().uuid().optional().nullable(),
  settings: z.record(z.unknown()).optional().nullable(),
});

const tenantConfigUpdateSchema = z.object({
  allowed_ai_providers: z
    .array(z.enum(['OPENAI', 'ANTHROPIC', 'GOOGLE', 'AZURE_OPENAI', 'LOCAL']))
    .optional(),
  default_ai_provider: z
    .enum(['OPENAI', 'ANTHROPIC', 'GOOGLE', 'AZURE_OPENAI', 'LOCAL'])
    .optional(),
  ai_model_overrides: z.record(z.string()).optional().nullable(),
  data_residency_region: z.string().optional(),
  backup_region: z.string().optional().nullable(),
  enabled_modules: z.array(z.string()).optional(),
  curriculum_standards: z.array(z.string()).optional(),
  grade_levels: z.array(z.string()).optional(),
  enable_homework_helper: z.boolean().optional(),
  enable_focus_mode: z.boolean().optional(),
  enable_parent_portal: z.boolean().optional(),
  enable_teacher_dashboard: z.boolean().optional(),
  daily_llm_call_limit: z.number().int().min(0).optional(),
  daily_tutor_turn_limit: z.number().int().min(0).optional(),
  max_learners_per_tenant: z.number().int().min(0).optional(),
  storage_quota_gb: z.number().int().min(0).optional(),
  content_filter_level: z.enum(['STRICT', 'STANDARD', 'MINIMAL']).optional(),
  enable_pii_redaction: z.boolean().optional(),
  retention_days: z.number().int().min(1).max(3650).optional(),
  custom_settings: z.record(z.unknown()).optional().nullable(),
});

// ══════════════════════════════════════════════════════════════════════════════
// Platform Admin Role Check
// ══════════════════════════════════════════════════════════════════════════════

const PLATFORM_ADMIN_ROLES = new Set(['PLATFORM_ADMIN', 'SUPER_ADMIN']);

/**
 * Middleware to require Platform Admin role
 */
async function requirePlatformAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // Get auth context from request (set by auth middleware)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const auth = (request as any).auth;

  if (!auth?.roles?.some((r: string) => PLATFORM_ADMIN_ROLES.has(r))) {
    reply.code(403).send({
      error: 'Forbidden',
      message: 'Platform Admin role required to manage tenants',
    });
  }
}

/**
 * Extract actor context from request
 */
function getActorContext(request: FastifyRequest): ActorContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const auth = (request as any).auth ?? {};
  return {
    userId: auth.userId ?? 'system',
    email: auth.email,
    role: auth.roles?.[0],
    ip: request.ip,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// Routes
// ══════════════════════════════════════════════════════════════════════════════

export async function registerTenantRoutes(app: FastifyInstance) {
  // Initialize services
  const lifecycleService = new TenantLifecycleService({ prisma });
  const configService = new TenantConfigService({ prisma });

  // ──────────────────────────────────────────────────────────────────────────
  // Tenant CRUD
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * POST /tenants - Create a new tenant
   * Requires: Platform Admin
   */
  app.post('/tenants', { preHandler: requirePlatformAdmin }, async (request, reply) => {
    const parsed = tenantCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid payload', details: parsed.error.issues });
    }

    const {
      type,
      name,
      primary_domain,
      subdomain,
      custom_domain,
      region,
      logo_url,
      primary_color,
      billing_plan_id,
      settings,
    } = parsed.data;

    try {
      const tenant = await lifecycleService.createTenant(
        {
          type: type as TenantType,
          name,
          primaryDomain: primary_domain,
          ...(subdomain !== undefined && { subdomain }),
          ...(custom_domain !== undefined && { customDomain: custom_domain }),
          ...(region !== undefined && { region }),
          ...(logo_url !== undefined && { logoUrl: logo_url }),
          ...(primary_color !== undefined && { primaryColor: primary_color }),
          ...(billing_plan_id !== undefined && { billingPlanId: billing_plan_id }),
          ...(settings !== undefined && { settingsJson: settings }),
        },
        getActorContext(request)
      );

      return reply.status(201).send(tenant);
    } catch (error) {
      request.log.error(error, 'Failed to create tenant');
      const message = error instanceof Error ? error.message : 'Unknown error';
      return reply.status(400).send({ error: 'Failed to create tenant', message });
    }
  });

  /**
   * GET /tenants - List all tenants
   * Requires: Platform Admin
   */
  app.get('/tenants', { preHandler: requirePlatformAdmin }, async (request, reply) => {
    const querySchema = z.object({
      type: z.enum(['CONSUMER', 'DISTRICT', 'CLINIC']).optional(),
      status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING_DELETE', 'DELETED']).optional(),
      limit: z.coerce.number().min(1).max(100).default(20),
      offset: z.coerce.number().min(0).default(0),
    });

    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid query', details: parsed.error.issues });
    }

    const { type, status, limit, offset } = parsed.data;

    const result = await lifecycleService.listTenants({
      ...(type !== undefined && { type: type as TenantType }),
      ...(status !== undefined && { status: status as TenantStatus }),
      limit,
      offset,
    });

    return reply.send({ ...result, limit, offset });
  });

  /**
   * GET /tenants/:id - Get tenant by ID
   * Requires: Platform Admin
   */
  app.get('/tenants/:id', { preHandler: requirePlatformAdmin }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid id' });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: params.data.id },
      include: {
        schools: {
          include: {
            classrooms: true,
          },
        },
        config: true,
      },
    });

    if (!tenant) {
      return reply.status(404).send({ error: 'Tenant not found' });
    }

    const stats = {
      schools: tenant.schools.length,
      classrooms: tenant.schools.reduce(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (acc: number, s: any) => acc + s.classrooms.length,
        0
      ),
    };

    return reply.send({ ...tenant, stats });
  });

  /**
   * PATCH /tenants/:id - Update tenant
   * Requires: Platform Admin
   */
  app.patch('/tenants/:id', { preHandler: requirePlatformAdmin }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid id' });
    }

    const body = tenantUpdateSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid payload', details: body.error.issues });
    }

    // Build update object using helper to reduce cognitive complexity
    const buildTenantUpdate = (data: typeof body.data) => {
      const update: Record<string, unknown> = {};
      if (data.type !== undefined) update.type = data.type as TenantType;
      if (data.name !== undefined) update.name = data.name;
      if (data.primary_domain !== undefined) update.primaryDomain = data.primary_domain;
      if (data.subdomain !== undefined && data.subdomain !== null)
        update.subdomain = data.subdomain;
      if (data.custom_domain !== undefined && data.custom_domain !== null)
        update.customDomain = data.custom_domain;
      if (data.region !== undefined) update.region = data.region;
      if (data.logo_url !== undefined) update.logoUrl = data.logo_url;
      if (data.primary_color !== undefined) update.primaryColor = data.primary_color;
      if (data.billing_plan_id !== undefined) update.billingPlanId = data.billing_plan_id;
      if (data.settings !== undefined) update.settingsJson = data.settings;
      return update;
    };

    try {
      const tenant = await lifecycleService.updateTenant(
        params.data.id,
        buildTenantUpdate(body.data),
        getActorContext(request)
      );

      return reply.send(tenant);
    } catch (error) {
      request.log.error(error, 'Failed to update tenant');
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('not found')) {
        return reply.status(404).send({ error: 'Tenant not found' });
      }
      return reply.status(400).send({ error: 'Failed to update tenant', message });
    }
  });

  /**
   * DELETE /tenants/:id - Soft delete tenant (initiate deletion)
   * Requires: Platform Admin
   */
  app.delete('/tenants/:id', { preHandler: requirePlatformAdmin }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid id' });
    }

    try {
      const tenant = await lifecycleService.initiateDelete(
        params.data.id,
        getActorContext(request)
      );

      return reply.send({
        message: 'Tenant deletion initiated',
        tenant,
        graceEndsAt: tenant.deleteGraceEndsAt,
      });
    } catch (error) {
      request.log.error(error, 'Failed to delete tenant');
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('not found')) {
        return reply.status(404).send({ error: 'Tenant not found' });
      }
      return reply.status(400).send({ error: 'Failed to delete tenant', message });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Lifecycle Actions
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * POST /tenants/:id/suspend - Suspend a tenant
   * Requires: Platform Admin
   */
  app.post('/tenants/:id/suspend', { preHandler: requirePlatformAdmin }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid id' });
    }

    const body = z.object({ reason: z.string().min(1) }).safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'reason is required' });
    }

    try {
      const tenant = await lifecycleService.suspendTenant(
        params.data.id,
        body.data.reason,
        getActorContext(request)
      );

      return reply.send({ message: 'Tenant suspended', tenant });
    } catch (error) {
      request.log.error(error, 'Failed to suspend tenant');
      const message = error instanceof Error ? error.message : 'Unknown error';
      return reply.status(400).send({ error: 'Failed to suspend tenant', message });
    }
  });

  /**
   * POST /tenants/:id/reactivate - Reactivate a suspended/pending-delete tenant
   * Requires: Platform Admin
   */
  app.post(
    '/tenants/:id/reactivate',
    { preHandler: requirePlatformAdmin },
    async (request, reply) => {
      const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({ error: 'Invalid id' });
      }

      try {
        const tenant = await lifecycleService.reactivateTenant(
          params.data.id,
          getActorContext(request)
        );

        return reply.send({ message: 'Tenant reactivated', tenant });
      } catch (error) {
        request.log.error(error, 'Failed to reactivate tenant');
        const message = error instanceof Error ? error.message : 'Unknown error';
        return reply.status(400).send({ error: 'Failed to reactivate tenant', message });
      }
    }
  );

  /**
   * POST /tenants/:id/hard-delete - Permanently delete tenant (after grace period)
   * Requires: Platform Admin + confirmation
   */
  app.post(
    '/tenants/:id/hard-delete',
    { preHandler: requirePlatformAdmin },
    async (request, reply) => {
      const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({ error: 'Invalid id' });
      }

      const body = z
        .object({
          confirm: z.literal(true),
          force: z.boolean().optional(),
        })
        .safeParse(request.body);

      if (!body.success || !body.data.confirm) {
        return reply.status(400).send({
          error: 'Confirmation required',
          message: 'Set confirm: true in request body to permanently delete tenant',
        });
      }

      try {
        await lifecycleService.hardDelete(params.data.id, getActorContext(request), {
          forceDelete: body.data.force ?? false,
        });

        return reply.send({ message: 'Tenant permanently deleted' });
      } catch (error) {
        request.log.error(error, 'Failed to hard delete tenant');
        const message = error instanceof Error ? error.message : 'Unknown error';
        return reply.status(400).send({ error: 'Failed to delete tenant', message });
      }
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Tenant Configuration
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * GET /tenants/:id/config - Get tenant configuration
   * Requires: Platform Admin
   */
  app.get('/tenants/:id/config', { preHandler: requirePlatformAdmin }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid id' });
    }

    try {
      const config = await configService.getTenantConfig(params.data.id);
      return reply.send(config);
    } catch (error) {
      request.log.error(error, 'Failed to get tenant config');
      const message = error instanceof Error ? error.message : 'Unknown error';
      return reply.status(400).send({ error: 'Failed to get config', message });
    }
  });

  /**
   * PATCH /tenants/:id/config - Update tenant configuration
   * Requires: Platform Admin
   */
  app.patch('/tenants/:id/config', { preHandler: requirePlatformAdmin }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid id' });
    }

    const body = tenantConfigUpdateSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid payload', details: body.error.issues });
    }

    // Map snake_case to camelCase using field mapping
    const fieldMapping: Record<string, keyof UpdateTenantConfigInput> = {
      allowed_ai_providers: 'allowedAIProviders',
      default_ai_provider: 'defaultAIProvider',
      ai_model_overrides: 'aiModelOverrides',
      data_residency_region: 'dataResidencyRegion',
      backup_region: 'backupRegion',
      enabled_modules: 'enabledModules',
      curriculum_standards: 'curriculumStandards',
      grade_levels: 'gradeLevels',
      enable_homework_helper: 'enableHomeworkHelper',
      enable_focus_mode: 'enableFocusMode',
      enable_parent_portal: 'enableParentPortal',
      enable_teacher_dashboard: 'enableTeacherDashboard',
      daily_llm_call_limit: 'dailyLLMCallLimit',
      daily_tutor_turn_limit: 'dailyTutorTurnLimit',
      max_learners_per_tenant: 'maxLearnersPerTenant',
      storage_quota_gb: 'storageQuotaGB',
      content_filter_level: 'contentFilterLevel',
      enable_pii_redaction: 'enablePIIRedaction',
      retention_days: 'retentionDays',
      custom_settings: 'customSettings',
    };

    const input: UpdateTenantConfigInput = {};
    for (const [snakeKey, camelKey] of Object.entries(fieldMapping)) {
      const value = body.data[snakeKey as keyof typeof body.data];
      if (value !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (input as any)[camelKey] = value;
      }
    }

    try {
      const config = await configService.upsertTenantConfig(params.data.id, input);

      // Log audit event
      await lifecycleService.logAuditEvent(
        params.data.id,
        'CONFIG_UPDATED',
        'Tenant configuration updated',
        getActorContext(request),
        { updatedFields: Object.keys(input) }
      );

      return reply.send(config);
    } catch (error) {
      request.log.error(error, 'Failed to update tenant config');
      const message = error instanceof Error ? error.message : 'Unknown error';
      return reply.status(400).send({ error: 'Failed to update config', message });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Audit Log
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * GET /tenants/:id/audit - Get tenant audit log
   * Requires: Platform Admin
   */
  app.get('/tenants/:id/audit', { preHandler: requirePlatformAdmin }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid id' });
    }

    const querySchema = z.object({
      event_type: z.string().optional(),
      start_date: z.coerce.date().optional(),
      end_date: z.coerce.date().optional(),
      limit: z.coerce.number().min(1).max(100).default(50),
      offset: z.coerce.number().min(0).default(0),
    });

    const query = querySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({ error: 'Invalid query', details: query.error.issues });
    }

    const result = await lifecycleService.getAuditEvents(params.data.id, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(query.data.event_type !== undefined && { eventType: query.data.event_type as any }),
      ...(query.data.start_date !== undefined && { startDate: query.data.start_date }),
      ...(query.data.end_date !== undefined && { endDate: query.data.end_date }),
      limit: query.data.limit,
      offset: query.data.offset,
    });

    return reply.send({ ...result, limit: query.data.limit, offset: query.data.offset });
  });
}
