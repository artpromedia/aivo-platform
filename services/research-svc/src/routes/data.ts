/**
 * Cohort and Dataset Definition Routes
 *
 * Manage cohort definitions and dataset schemas.
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma.js';
import type { AuditContext } from '../services/auditService.js';
import { recordAuditLog } from '../services/auditService.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Schemas
// ═══════════════════════════════════════════════════════════════════════════════

const createCohortSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(3).max(255),
  description: z.string().optional(),
  filterJson: z.object({
    gradeLevel: z.array(z.string()).optional(),
    schools: z.array(z.string()).optional(),
    dateRange: z
      .object({
        start: z.string().datetime(),
        end: z.string().datetime(),
      })
      .optional(),
    contentTypes: z.array(z.string()).optional(),
    minSessionCount: z.number().min(0).optional(),
  }),
});

const createDatasetDefSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(3).max(255),
  description: z.string().optional(),
  granularity: z.enum(['AGGREGATED', 'DEIDENTIFIED_LEARNER_LEVEL', 'INTERNAL_LEARNER_LEVEL']),
  schemaJson: z.object({
    baseTable: z
      .enum(['fact_sessions', 'fact_activity_event', 'fact_ai_usage', 'agg_daily_learner_summary'])
      .optional(),
    columns: z
      .array(
        z.object({
          name: z.string(),
          alias: z.string().optional(),
          transform: z
            .enum(['NONE', 'PSEUDONYMIZE', 'COARSEN_DATE', 'ROUND', 'BUCKET', 'EXCLUDE'])
            .optional(),
        })
      )
      .optional(),
    joins: z
      .array(
        z.object({
          table: z.string(),
          on: z.string(),
          columns: z.array(z.string()),
        })
      )
      .optional(),
  }),
  privacyConstraintsJson: z
    .object({
      kAnonymityThreshold: z.number().min(5).max(100).optional(),
      dateCoarsening: z.enum(['DAY', 'WEEK', 'MONTH', 'QUARTER', 'YEAR']).optional(),
      noiseInjection: z.number().min(0).max(0.1).optional(),
      excludedColumns: z.array(z.string()).optional(),
    })
    .optional(),
});

const listSchema = z.object({
  projectId: z.string().uuid(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// Route Plugin
// ═══════════════════════════════════════════════════════════════════════════════

export const dataRoutes: FastifyPluginAsync = async (app) => {
  // ─────────────────────────────────────────────────────────────────────────────
  // Cohort Routes
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * POST /research/cohorts
   * Create a new cohort definition
   */
  app.post('/cohorts', async (request, reply) => {
    const user = request.user as { sub: string; email: string; tenantId: string };
    const body = createCohortSchema.parse(request.body);

    const auditContext: AuditContext = {
      tenantId: user.tenantId,
      userId: user.sub,
      userEmail: user.email,
      ipAddress: request.ip,
      ...(request.headers['user-agent'] && { userAgent: request.headers['user-agent'] }),
    };

    // Verify project access
    const project = await prisma.researchProject.findFirst({
      where: { id: body.projectId, tenantId: user.tenantId },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const cohort = await prisma.researchCohort.create({
      data: {
        tenantId: user.tenantId,
        researchProjectId: body.projectId,
        name: body.name,
        description: body.description ?? null,
        filterJson: body.filterJson,
      },
    });

    await recordAuditLog(
      {
        projectId: body.projectId,
        action: 'COHORT_CREATED',
        entityType: 'COHORT',
        entityId: cohort.id,
        details: { name: body.name, filterJson: body.filterJson },
      },
      auditContext
    );

    return reply.status(201).send(cohort);
  });

  /**
   * GET /research/cohorts
   * List cohorts for a project
   */
  app.get('/cohorts', async (request, reply) => {
    const user = request.user as { sub: string; tenantId: string };
    const query = listSchema.parse(request.query);

    const [cohorts, total] = await Promise.all([
      prisma.researchCohort.findMany({
        where: {
          researchProjectId: query.projectId,
          researchProject: { tenantId: user.tenantId },
        },
        orderBy: { createdAt: 'desc' },
        take: query.limit ?? 25,
        skip: query.offset ?? 0,
      }),
      prisma.researchCohort.count({
        where: {
          researchProjectId: query.projectId,
          researchProject: { tenantId: user.tenantId },
        },
      }),
    ]);

    return reply.send({
      data: cohorts,
      pagination: {
        total,
        limit: query.limit ?? 25,
        offset: query.offset ?? 0,
      },
    });
  });

  /**
   * GET /research/cohorts/:id
   * Get cohort details
   */
  app.get('/cohorts/:id', async (request, reply) => {
    const user = request.user as { sub: string; tenantId: string };
    const { id } = request.params as { id: string };

    const cohort = await prisma.researchCohort.findFirst({
      where: {
        id,
        researchProject: { tenantId: user.tenantId },
      },
      include: {
        researchProject: { select: { id: true, title: true, status: true } },
      },
    });

    if (!cohort) {
      return reply.status(404).send({ error: 'Cohort not found' });
    }

    return reply.send(cohort);
  });

  /**
   * GET /research/cohorts/:id/estimate
   * Estimate cohort size (row count)
   */
  app.get('/cohorts/:id/estimate', async (request, reply) => {
    const user = request.user as { sub: string; tenantId: string };
    const { id } = request.params as { id: string };

    const cohort = await prisma.researchCohort.findFirst({
      where: {
        id,
        researchProject: { tenantId: user.tenantId },
      },
    });

    if (!cohort) {
      return reply.status(404).send({ error: 'Cohort not found' });
    }

    // TODO: Query warehouse to estimate matching rows
    // For now, return placeholder
    return reply.send({
      estimatedLearners: 1500,
      estimatedRows: 45000,
      kAnonymitySatisfied: true,
      warning: null,
    });
  });

  /**
   * DELETE /research/cohorts/:id
   * Delete a cohort
   */
  app.delete('/cohorts/:id', async (request, reply) => {
    const user = request.user as { sub: string; email: string; tenantId: string };
    const { id } = request.params as { id: string };

    const cohort = await prisma.researchCohort.findFirst({
      where: {
        id,
        researchProject: { tenantId: user.tenantId },
      },
    });

    if (!cohort) {
      return reply.status(404).send({ error: 'Cohort not found' });
    }

    await prisma.researchCohort.delete({ where: { id } });

    const auditContext: AuditContext = {
      tenantId: user.tenantId,
      userId: user.sub,
      userEmail: user.email,
      ipAddress: request.ip,
      ...(request.headers['user-agent'] && { userAgent: request.headers['user-agent'] }),
    };

    await recordAuditLog(
      {
        projectId: cohort.researchProjectId,
        action: 'COHORT_DELETED',
        entityType: 'COHORT',
        entityId: id,
        details: { name: cohort.name },
      },
      auditContext
    );

    return reply.status(204).send();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Dataset Definition Routes
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * POST /research/dataset-definitions
   * Create a new dataset definition
   */
  app.post('/dataset-definitions', async (request, reply) => {
    const user = request.user as { sub: string; email: string; tenantId: string };
    const body = createDatasetDefSchema.parse(request.body);

    const auditContext: AuditContext = {
      tenantId: user.tenantId,
      userId: user.sub,
      userEmail: user.email,
      ipAddress: request.ip,
      ...(request.headers['user-agent'] && { userAgent: request.headers['user-agent'] }),
    };

    // Verify project access
    const project = await prisma.researchProject.findFirst({
      where: { id: body.projectId, tenantId: user.tenantId },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const datasetDef = await prisma.researchDatasetDefinition.create({
      data: {
        tenantId: user.tenantId,
        researchProjectId: body.projectId,
        name: body.name,
        description: body.description ?? null,
        granularity: body.granularity,
        schemaJson: body.schemaJson,
        privacyConstraintsJson: body.privacyConstraintsJson ?? {
          kAnonymityThreshold: 10,
          dateCoarsening: 'DAY',
        },
      },
    });

    await recordAuditLog(
      {
        projectId: body.projectId,
        action: 'DATASET_DEFINITION_CREATED',
        entityType: 'DATASET_DEFINITION',
        entityId: datasetDef.id,
        details: { name: body.name, granularity: body.granularity },
      },
      auditContext
    );

    return reply.status(201).send(datasetDef);
  });

  /**
   * GET /research/dataset-definitions
   * List dataset definitions for a project
   */
  app.get('/dataset-definitions', async (request, reply) => {
    const user = request.user as { sub: string; tenantId: string };
    const query = listSchema.parse(request.query);

    const [definitions, total] = await Promise.all([
      prisma.researchDatasetDefinition.findMany({
        where: {
          researchProjectId: query.projectId,
          researchProject: { tenantId: user.tenantId },
        },
        orderBy: { createdAt: 'desc' },
        take: query.limit ?? 25,
        skip: query.offset ?? 0,
      }),
      prisma.researchDatasetDefinition.count({
        where: {
          researchProjectId: query.projectId,
          researchProject: { tenantId: user.tenantId },
        },
      }),
    ]);

    return reply.send({
      data: definitions,
      pagination: {
        total,
        limit: query.limit ?? 25,
        offset: query.offset ?? 0,
      },
    });
  });

  /**
   * GET /research/dataset-definitions/:id
   * Get dataset definition details
   */
  app.get('/dataset-definitions/:id', async (request, reply) => {
    const user = request.user as { sub: string; tenantId: string };
    const { id } = request.params as { id: string };

    const definition = await prisma.researchDatasetDefinition.findFirst({
      where: {
        id,
        researchProject: { tenantId: user.tenantId },
      },
      include: {
        researchProject: { select: { id: true, title: true, status: true } },
      },
    });

    if (!definition) {
      return reply.status(404).send({ error: 'Dataset definition not found' });
    }

    return reply.send(definition);
  });

  /**
   * GET /research/dataset-templates
   * List pre-approved dataset templates
   */
  app.get('/dataset-templates', async (request, reply) => {
    const templates = await prisma.datasetTemplate.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return reply.send({ data: templates });
  });

  /**
   * POST /research/dataset-definitions/from-template
   * Create dataset definition from a template
   */
  app.post('/dataset-definitions/from-template', async (request, reply) => {
    const user = request.user as { sub: string; email: string; tenantId: string };
    const body = z
      .object({
        projectId: z.string().uuid(),
        templateId: z.string().uuid(),
        name: z.string().min(3).max(255).optional(),
      })
      .parse(request.body);

    const template = await prisma.datasetTemplate.findUnique({
      where: { id: body.templateId },
    });

    if (!template?.isActive) {
      return reply.status(404).send({ error: 'Template not found' });
    }

    const project = await prisma.researchProject.findFirst({
      where: { id: body.projectId, tenantId: user.tenantId },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const datasetDef = await prisma.researchDatasetDefinition.create({
      data: {
        tenantId: user.tenantId,
        researchProjectId: body.projectId,
        name: body.name ?? template.name,
        description: template.description,
        granularity: template.granularity,
        schemaJson: template.schemaJson as object,
        privacyConstraintsJson: template.privacyConstraintsJson as object,
        isTemplate: false,
      },
    });

    const auditContext: AuditContext = {
      tenantId: user.tenantId,
      userId: user.sub,
      userEmail: user.email,
      ipAddress: request.ip,
      ...(request.headers['user-agent'] && { userAgent: request.headers['user-agent'] }),
    };

    await recordAuditLog(
      {
        projectId: body.projectId,
        action: 'DATASET_DEFINITION_CREATED',
        entityType: 'DATASET_DEFINITION',
        entityId: datasetDef.id,
        details: {
          name: datasetDef.name,
          granularity: datasetDef.granularity,
          fromTemplate: template.id,
        },
      },
      auditContext
    );

    return reply.status(201).send(datasetDef);
  });
};
