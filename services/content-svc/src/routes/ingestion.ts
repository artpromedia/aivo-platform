/**
 * Ingestion Routes
 *
 * Bulk content ingestion via:
 * - Manual structured JSON
 * - File upload (CSV/JSON)
 * - AI-assisted drafting
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { validateContent, type ValidationResult } from '../validator.js';
import type {
  LearningObjectSubject,
  LearningObjectGradeBand,
  Prisma,
  IngestionSource,
} from '@prisma/client';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const SubjectEnum = z.enum(['ELA', 'MATH', 'SCIENCE', 'SEL', 'SPEECH', 'OTHER']);
const GradeBandEnum = z.enum(['K_2', 'G3_5', 'G6_8', 'G9_12']);

const ManualIngestionItemSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(200)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  title: z.string().min(1).max(500),
  subject: SubjectEnum,
  gradeBand: GradeBandEnum,
  contentJson: z.object({
    type: z.string(),
  }).passthrough(),
  accessibilityJson: z.record(z.unknown()).optional(),
  standardsJson: z.record(z.unknown()).optional(),
  tags: z.array(z.string().min(1).max(50)).optional(),
  primarySkillId: z.string().uuid().optional(),
});

const ManualIngestionSchema = z.object({
  items: z.array(ManualIngestionItemSchema).min(1).max(100),
  validateOnly: z.boolean().default(false),
  autoSubmitForReview: z.boolean().default(false),
});

const FileIngestionSchema = z.object({
  fileUrl: z.string().url(),
  fileType: z.enum(['csv', 'json']),
  mappings: z.record(z.string()).optional(), // Column/field mappings
  defaultSubject: SubjectEnum.optional(),
  defaultGradeBand: GradeBandEnum.optional(),
  autoSubmitForReview: z.boolean().default(false),
});

const AiDraftSchema = z.object({
  subject: SubjectEnum,
  gradeBand: GradeBandEnum,
  contentType: z.enum(['reading_passage', 'math_problem', 'quiz', 'generic']),
  standards: z.array(z.string()).optional(),
  targetSkills: z.array(z.string().uuid()).optional(),
  promptSummary: z.string().min(10).max(2000),
  difficulty: z.number().int().min(1).max(10).optional(),
  estimatedMinutes: z.number().int().min(1).max(120).optional(),
});

const JobListQuerySchema = z.object({
  status: z.enum(['PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED']).optional(),
  source: z.enum(['MANUAL', 'FILE_CSV', 'FILE_JSON', 'AI_DRAFT']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

interface JwtUser {
  sub: string;
  tenantId?: string;
  tenant_id?: string;
  role: string;
}

function getUserFromRequest(request: FastifyRequest): JwtUser | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = (request as any).user;
  if (!user || typeof user.sub !== 'string') return null;
  return user as JwtUser;
}

function getUserTenantId(user: JwtUser): string | undefined {
  return user.tenantId ?? user.tenant_id;
}

function canIngest(user: JwtUser): boolean {
  const authorRoles = ['CONTENT_AUTHOR', 'CONTENT_REVIEWER', 'PLATFORM_ADMIN', 'DISTRICT_ADMIN'];
  return authorRoles.includes(user.role);
}

interface IngestionItemResult {
  index: number;
  slug: string;
  success: boolean;
  loId?: string;
  versionId?: string;
  errors?: Array<{ field: string; message: string }>;
  warnings?: Array<{ field: string; message: string }>;
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function ingestionRoutes(fastify: FastifyInstance) {
  /**
   * POST /ingest/manual
   * Ingest one or more learning objects via structured JSON.
   */
  fastify.post('/ingest/manual', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    if (!canIngest(user)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Only content authors can ingest content',
      });
    }

    const parseResult = ManualIngestionSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parseResult.error.flatten(),
      });
    }

    const { items, validateOnly, autoSubmitForReview } = parseResult.data;
    const userTenantId = getUserTenantId(user);
    const results: IngestionItemResult[] = [];
    const createdLoIds: string[] = [];

    // Create ingestion job record
    const job = await prisma.ingestionJob.create({
      data: {
        tenantId: userTenantId ?? null,
        source: 'MANUAL' as IngestionSource,
        status: 'RUNNING',
        totalRows: items.length,
        createdByUserId: user.sub,
        startedAt: new Date(),
        inputMetadata: { itemCount: items.length, validateOnly, autoSubmitForReview },
      },
    });

    try {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemResult: IngestionItemResult = {
          index: i,
          slug: item.slug,
          success: false,
        };

        // Validate content
        const validation = validateContent({
          contentJson: item.contentJson as Parameters<typeof validateContent>[0]['contentJson'],
          accessibilityJson: item.accessibilityJson as Parameters<typeof validateContent>[0]['accessibilityJson'],
          subject: item.subject,
          gradeBand: item.gradeBand,
        });

        if (!validation.valid) {
          itemResult.errors = validation.errors.map((e) => ({
            field: e.field,
            message: e.message,
          }));
          itemResult.warnings = validation.warnings.map((w) => ({
            field: w.field,
            message: w.message,
          }));
          results.push(itemResult);
          continue;
        }

        // If validate only, don't create
        if (validateOnly) {
          itemResult.success = true;
          itemResult.warnings = validation.warnings.map((w) => ({
            field: w.field,
            message: w.message,
          }));
          results.push(itemResult);
          continue;
        }

        // Create LO and version
        try {
          const lo = await prisma.learningObject.create({
            data: {
              tenantId: userTenantId ?? null,
              slug: item.slug,
              title: item.title,
              subject: item.subject as LearningObjectSubject,
              gradeBand: item.gradeBand as LearningObjectGradeBand,
              primarySkillId: item.primarySkillId ?? null,
              createdByUserId: user.sub,
              tags: item.tags
                ? { create: item.tags.map((tag) => ({ tag })) }
                : undefined,
            },
          });

          const version = await prisma.learningObjectVersion.create({
            data: {
              learningObjectId: lo.id,
              versionNumber: 1,
              state: autoSubmitForReview ? 'IN_REVIEW' : 'DRAFT',
              createdByUserId: user.sub,
              contentJson: item.contentJson as Prisma.InputJsonValue,
              accessibilityJson: (item.accessibilityJson ?? {}) as Prisma.InputJsonValue,
              standardsJson: (item.standardsJson ?? {}) as Prisma.InputJsonValue,
            },
          });

          itemResult.success = true;
          itemResult.loId = lo.id;
          itemResult.versionId = version.id;
          itemResult.warnings = validation.warnings.map((w) => ({
            field: w.field,
            message: w.message,
          }));
          createdLoIds.push(lo.id);
        } catch (err) {
          if (err instanceof Error && err.message.includes('Unique constraint')) {
            itemResult.errors = [{ field: 'slug', message: 'Slug already exists' }];
          } else {
            itemResult.errors = [{ field: '_', message: 'Failed to create learning object' }];
          }
        }

        results.push(itemResult);
      }

      // Update job with results
      const successCount = results.filter((r) => r.success).length;
      const errorCount = results.filter((r) => !r.success).length;

      await prisma.ingestionJob.update({
        where: { id: job.id },
        data: {
          status: errorCount === items.length ? 'FAILED' : 'SUCCEEDED',
          successCount,
          errorCount,
          createdLoIds,
          errors: results
            .filter((r) => r.errors && r.errors.length > 0)
            .map((r) => ({ row: r.index, slug: r.slug, errors: r.errors })),
          completedAt: new Date(),
        },
      });

      return reply.status(validateOnly ? 200 : 201).send({
        jobId: job.id,
        totalItems: items.length,
        successCount,
        errorCount,
        results,
      });
    } catch (err) {
      // Mark job as failed
      await prisma.ingestionJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          errors: [{ message: err instanceof Error ? err.message : 'Unknown error' }],
          completedAt: new Date(),
        },
      });
      throw err;
    }
  });

  /**
   * POST /ingest/file
   * Start a file-based ingestion job.
   */
  fastify.post('/ingest/file', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    if (!canIngest(user)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Only content authors can ingest content',
      });
    }

    const parseResult = FileIngestionSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parseResult.error.flatten(),
      });
    }

    const { fileUrl, fileType, mappings, defaultSubject, defaultGradeBand, autoSubmitForReview } =
      parseResult.data;
    const userTenantId = getUserTenantId(user);

    // Create pending job
    const job = await prisma.ingestionJob.create({
      data: {
        tenantId: userTenantId ?? null,
        source: (fileType === 'csv' ? 'FILE_CSV' : 'FILE_JSON') as IngestionSource,
        status: 'PENDING',
        inputFileUrl: fileUrl,
        inputMetadata: {
          fileType,
          mappings,
          defaultSubject,
          defaultGradeBand,
          autoSubmitForReview,
        },
        createdByUserId: user.sub,
      },
    });

    // TODO: In production, this would trigger a background job via NATS or a job queue
    // For now, return the job ID and the client can poll for status

    return reply.status(202).send({
      jobId: job.id,
      status: 'PENDING',
      message: 'File ingestion job queued. Poll GET /ingest/jobs/:id for status.',
    });
  });

  /**
   * POST /ingest/ai-draft
   * Request AI-generated content draft.
   */
  fastify.post('/ingest/ai-draft', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    if (!canIngest(user)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Only content authors can request AI drafts',
      });
    }

    const parseResult = AiDraftSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parseResult.error.flatten(),
      });
    }

    const {
      subject,
      gradeBand,
      contentType,
      standards,
      targetSkills,
      promptSummary,
      difficulty,
      estimatedMinutes,
    } = parseResult.data;
    const userTenantId = getUserTenantId(user);

    // Create pending job
    const job = await prisma.ingestionJob.create({
      data: {
        tenantId: userTenantId ?? null,
        source: 'AI_DRAFT' as IngestionSource,
        status: 'PENDING',
        totalRows: 1,
        inputMetadata: {
          subject,
          gradeBand,
          contentType,
          standards,
          targetSkills,
          promptSummary,
          difficulty,
          estimatedMinutes,
        },
        createdByUserId: user.sub,
      },
    });

    // TODO: In production, this would call the AI orchestrator
    // For now, create a placeholder draft
    
    // Generate a simple placeholder draft based on content type
    const placeholderContent = generatePlaceholderContent(contentType, promptSummary);
    const slug = `ai-draft-${Date.now()}`;

    try {
      const lo = await prisma.learningObject.create({
        data: {
          tenantId: userTenantId ?? null,
          slug,
          title: `[AI Draft] ${promptSummary.slice(0, 50)}...`,
          subject: subject as LearningObjectSubject,
          gradeBand: gradeBand as LearningObjectGradeBand,
          createdByUserId: user.sub,
        },
      });

      const version = await prisma.learningObjectVersion.create({
        data: {
          learningObjectId: lo.id,
          versionNumber: 1,
          state: 'DRAFT',
          createdByUserId: user.sub,
          changeSummary: 'AI-generated draft - requires human review',
          contentJson: placeholderContent as Prisma.InputJsonValue,
          accessibilityJson: {
            requiresReading: true,
            cognitiveLoad: 'MEDIUM',
          },
          metadataJson: {
            aiGenerated: true,
            promptSummary,
            generatedAt: new Date().toISOString(),
          },
        },
      });

      await prisma.ingestionJob.update({
        where: { id: job.id },
        data: {
          status: 'SUCCEEDED',
          successCount: 1,
          createdLoIds: [lo.id],
          startedAt: new Date(),
          completedAt: new Date(),
        },
      });

      return reply.status(201).send({
        jobId: job.id,
        status: 'SUCCEEDED',
        loId: lo.id,
        versionId: version.id,
        message: 'AI draft created. This content requires human review before publishing.',
        warning: 'AI-generated content must be reviewed for accuracy and appropriateness.',
      });
    } catch (err) {
      await prisma.ingestionJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          errors: [{ message: err instanceof Error ? err.message : 'Failed to create AI draft' }],
          completedAt: new Date(),
        },
      });
      throw err;
    }
  });

  /**
   * GET /ingest/jobs
   * List ingestion jobs.
   */
  fastify.get('/ingest/jobs', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const queryResult = JobListQuerySchema.safeParse(request.query);
    if (!queryResult.success) {
      return reply.status(400).send({
        error: 'Invalid query parameters',
        details: queryResult.error.flatten(),
      });
    }

    const { status, source, limit, offset } = queryResult.data;
    const userTenantId = getUserTenantId(user);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // Filter by tenant (platform admins can see all)
    if (user.role !== 'PLATFORM_ADMIN') {
      where.OR = [{ tenantId: userTenantId }, { createdByUserId: user.sub }];
    }

    if (status) where.status = status;
    if (source) where.source = source;

    const [jobs, total] = await Promise.all([
      prisma.ingestionJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.ingestionJob.count({ where }),
    ]);

    return reply.send({
      jobs: jobs.map((j) => ({
        id: j.id,
        source: j.source,
        status: j.status,
        totalRows: j.totalRows,
        successCount: j.successCount,
        errorCount: j.errorCount,
        createdAt: j.createdAt,
        completedAt: j.completedAt,
      })),
      pagination: { limit, offset, total },
    });
  });

  /**
   * GET /ingest/jobs/:id
   * Get ingestion job details.
   */
  fastify.get(
    '/ingest/jobs/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params;

      const job = await prisma.ingestionJob.findUnique({
        where: { id },
      });

      if (!job) {
        return reply.status(404).send({ error: 'Job not found' });
      }

      // Check access
      const userTenantId = getUserTenantId(user);
      if (
        user.role !== 'PLATFORM_ADMIN' &&
        job.tenantId !== userTenantId &&
        job.createdByUserId !== user.sub
      ) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      return reply.send(job);
    }
  );

  /**
   * POST /ingest/jobs/:id/cancel
   * Cancel a pending ingestion job.
   */
  fastify.post(
    '/ingest/jobs/:id/cancel',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params;

      const job = await prisma.ingestionJob.findUnique({
        where: { id },
      });

      if (!job) {
        return reply.status(404).send({ error: 'Job not found' });
      }

      if (job.status !== 'PENDING' && job.status !== 'RUNNING') {
        return reply.status(400).send({
          error: 'Cannot cancel job',
          message: `Job is already ${job.status}`,
        });
      }

      const updated = await prisma.ingestionJob.update({
        where: { id },
        data: { status: 'CANCELLED', completedAt: new Date() },
      });

      return reply.send(updated);
    }
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generate placeholder content for AI draft.
 * In production, this would call the AI orchestrator.
 */
function generatePlaceholderContent(
  contentType: string,
  promptSummary: string
): Record<string, unknown> {
  switch (contentType) {
    case 'reading_passage':
      return {
        type: 'reading_passage',
        passageText: `[AI-GENERATED PLACEHOLDER]\n\nThis is a draft passage about: ${promptSummary}\n\n[Please edit this content before publishing]`,
        questions: [
          {
            id: 'q1',
            prompt: '[Edit this question]',
            answerChoices: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctIndex: 0,
          },
        ],
      };

    case 'math_problem':
      return {
        type: 'math_problem',
        problemStatement: `[AI-GENERATED PLACEHOLDER]\n\n${promptSummary}\n\n[Please edit this problem before publishing]`,
        solution: '[Add solution]',
        hints: ['[Add hint 1]', '[Add hint 2]'],
      };

    case 'quiz':
      return {
        type: 'quiz',
        questions: [
          {
            id: 'q1',
            prompt: `[AI draft question about: ${promptSummary.slice(0, 50)}]`,
            answerChoices: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctIndex: 0,
          },
        ],
      };

    default:
      return {
        type: 'generic',
        body: {
          title: promptSummary.slice(0, 100),
          content: `[AI-GENERATED PLACEHOLDER]\n\n${promptSummary}\n\n[Please edit before publishing]`,
        },
      };
  }
}
