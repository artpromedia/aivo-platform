/**
 * Lesson Builder Routes
 *
 * REST API endpoints for lesson creation and management
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { getUserFromRequest, getUserTenantId, requireRoles } from '../auth.js';
import { LessonBuilderService } from '../services/lesson-builder.service.js';
import type { BlockType, LessonPreviewMode } from '../types/lesson-builder.js';
import { BLOCK_TEMPLATES, getBlocksByCategory } from '../templates/lesson-blocks.js';
import { canAccessTenant, AUTHOR_ROLES } from '../rbac.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const SubjectEnum = z.enum(['ELA', 'MATH', 'SCIENCE', 'SEL', 'SPEECH', 'OTHER']);
const GradeBandEnum = z.enum(['K_2', 'G3_5', 'G6_8', 'G9_12']);
const BlockTypeEnum = z.enum([
  'TEXT_PARAGRAPH',
  'TEXT_HEADING',
  'TEXT_LIST',
  'TEXT_QUOTE',
  'MEDIA_IMAGE',
  'MEDIA_VIDEO',
  'MEDIA_AUDIO',
  'MEDIA_EMBED',
  'QUIZ',
  'POLL',
  'FLASHCARD',
  'DRAG_DROP',
  'ACTIVITY_WORKSHEET',
  'ACTIVITY_ASSIGNMENT',
  'ACTIVITY_DISCUSSION',
  'LAYOUT_COLUMNS',
  'LAYOUT_DIVIDER',
  'LAYOUT_CALLOUT',
  'LAYOUT_ACCORDION',
]);

const CreateLessonSchema = z.object({
  tenantId: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  subject: SubjectEnum,
  gradeBand: GradeBandEnum,
  templateId: z.string().uuid().optional(),
});

const UpdateLessonSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional(),
  subject: SubjectEnum.optional(),
  gradeBand: GradeBandEnum.optional(),
  isPublished: z.boolean().optional(),
});

const CreateBlockSchema = z.object({
  type: BlockTypeEnum,
  position: z.number().int().min(0),
  content: z.record(z.any()),
  settings: z.record(z.any()).optional(),
});

const UpdateBlockSchema = z.object({
  type: BlockTypeEnum.optional(),
  content: z.record(z.any()).optional(),
  settings: z.record(z.any()).optional(),
});

const ReorderBlocksSchema = z.object({
  blockOrders: z.array(
    z.object({
      blockId: z.string().uuid(),
      position: z.number().int().min(0),
    })
  ),
});

const PreviewModeEnum = z.enum(['desktop', 'tablet', 'mobile']);

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function lessonBuilderRoutes(fastify: FastifyInstance) {
  /**
   * POST /lessons
   * Create a new lesson
   */
  fastify.post(
    '/lessons',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const parseResult = CreateLessonSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parseResult.error.flatten(),
        });
      }

      const { tenantId, title, description, subject, gradeBand, templateId } = parseResult.data;

      // Determine effective tenant ID
      const userTenantId = getUserTenantId(user);
      let effectiveTenantId: string | null;

      if (user.roles.includes('PLATFORM_ADMIN')) {
        effectiveTenantId = tenantId ?? null;
      } else {
        effectiveTenantId = userTenantId ?? null;
      }

      try {
        const lesson = await LessonBuilderService.createLesson({
          tenantId: effectiveTenantId,
          title,
          description,
          subject,
          gradeBand,
          createdByUserId: user.sub,
          templateId,
        });

        return reply.status(201).send(lesson);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to create lesson' });
      }
    }
  );

  /**
   * GET /lessons/:id
   * Get lesson details
   */
  fastify.get(
    '/lessons/:id',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params as { id: string };

      try {
        const lesson = await LessonBuilderService.getLesson(id, true);
        if (!lesson) {
          return reply.status(404).send({ error: 'Lesson not found' });
        }

        const userTenantId = getUserTenantId(user);
        if (!canAccessTenant(userTenantId, lesson.tenantId, user.roles)) {
          return reply.status(403).send({ error: 'Access denied' });
        }

        return reply.send(lesson);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to fetch lesson' });
      }
    }
  );

  /**
   * PUT /lessons/:id
   * Update lesson metadata
   */
  fastify.put(
    '/lessons/:id',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params as { id: string };

      const parseResult = UpdateLessonSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parseResult.error.flatten(),
        });
      }

      try {
        const existing = await LessonBuilderService.getLesson(id, false);
        if (!existing) {
          return reply.status(404).send({ error: 'Lesson not found' });
        }

        const userTenantId = getUserTenantId(user);
        if (!canAccessTenant(userTenantId, existing.tenantId, user.roles)) {
          return reply.status(403).send({ error: 'Access denied' });
        }

        const updated = await LessonBuilderService.updateLesson(id, parseResult.data);
        return reply.send(updated);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to update lesson' });
      }
    }
  );

  /**
   * DELETE /lessons/:id
   * Delete a lesson
   */
  fastify.delete(
    '/lessons/:id',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params as { id: string };

      try {
        const existing = await LessonBuilderService.getLesson(id, false);
        if (!existing) {
          return reply.status(404).send({ error: 'Lesson not found' });
        }

        const userTenantId = getUserTenantId(user);
        if (!canAccessTenant(userTenantId, existing.tenantId, user.roles)) {
          return reply.status(403).send({ error: 'Access denied' });
        }

        await LessonBuilderService.deleteLesson(id);
        return reply.status(204).send();
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to delete lesson' });
      }
    }
  );

  /**
   * POST /lessons/:id/duplicate
   * Duplicate a lesson
   */
  fastify.post(
    '/lessons/:id/duplicate',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params as { id: string };
      const { title } = (request.body as any) || {};

      try {
        const existing = await LessonBuilderService.getLesson(id, false);
        if (!existing) {
          return reply.status(404).send({ error: 'Lesson not found' });
        }

        const userTenantId = getUserTenantId(user);
        if (!canAccessTenant(userTenantId, existing.tenantId, user.roles)) {
          return reply.status(403).send({ error: 'Access denied' });
        }

        const duplicate = await LessonBuilderService.duplicateLesson(id, user.sub, title);
        return reply.status(201).send(duplicate);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to duplicate lesson' });
      }
    }
  );

  /**
   * POST /lessons/:id/blocks
   * Add a block to a lesson
   */
  fastify.post(
    '/lessons/:id/blocks',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params as { id: string };

      const parseResult = CreateBlockSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parseResult.error.flatten(),
        });
      }

      try {
        const lesson = await LessonBuilderService.getLesson(id, false);
        if (!lesson || !lesson.currentVersion) {
          return reply.status(404).send({ error: 'Lesson not found' });
        }

        const userTenantId = getUserTenantId(user);
        if (!canAccessTenant(userTenantId, lesson.tenantId, user.roles)) {
          return reply.status(403).send({ error: 'Access denied' });
        }

        const block = await LessonBuilderService.addBlock(
          lesson.currentVersion.id,
          parseResult.data
        );

        return reply.status(201).send(block);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to add block' });
      }
    }
  );

  /**
   * PUT /lessons/:id/blocks/:blockId
   * Update a block
   */
  fastify.put(
    '/lessons/:id/blocks/:blockId',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id, blockId } = request.params as { id: string; blockId: string };

      const parseResult = UpdateBlockSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parseResult.error.flatten(),
        });
      }

      try {
        const lesson = await LessonBuilderService.getLesson(id, false);
        if (!lesson) {
          return reply.status(404).send({ error: 'Lesson not found' });
        }

        const userTenantId = getUserTenantId(user);
        if (!canAccessTenant(userTenantId, lesson.tenantId, user.roles)) {
          return reply.status(403).send({ error: 'Access denied' });
        }

        const block = await LessonBuilderService.updateBlock(blockId, parseResult.data);
        return reply.send(block);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to update block' });
      }
    }
  );

  /**
   * DELETE /lessons/:id/blocks/:blockId
   * Remove a block
   */
  fastify.delete(
    '/lessons/:id/blocks/:blockId',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id, blockId } = request.params as { id: string; blockId: string };

      try {
        const lesson = await LessonBuilderService.getLesson(id, false);
        if (!lesson) {
          return reply.status(404).send({ error: 'Lesson not found' });
        }

        const userTenantId = getUserTenantId(user);
        if (!canAccessTenant(userTenantId, lesson.tenantId, user.roles)) {
          return reply.status(403).send({ error: 'Access denied' });
        }

        await LessonBuilderService.deleteBlock(blockId);
        return reply.status(204).send();
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to delete block' });
      }
    }
  );

  /**
   * POST /lessons/:id/blocks/reorder
   * Reorder blocks
   */
  fastify.post(
    '/lessons/:id/blocks/reorder',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params as { id: string };

      const parseResult = ReorderBlocksSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parseResult.error.flatten(),
        });
      }

      try {
        const lesson = await LessonBuilderService.getLesson(id, false);
        if (!lesson || !lesson.currentVersion) {
          return reply.status(404).send({ error: 'Lesson not found' });
        }

        const userTenantId = getUserTenantId(user);
        if (!canAccessTenant(userTenantId, lesson.tenantId, user.roles)) {
          return reply.status(403).send({ error: 'Access denied' });
        }

        const blocks = await LessonBuilderService.reorderBlocks(
          lesson.currentVersion.id,
          parseResult.data
        );

        return reply.send({ blocks });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to reorder blocks' });
      }
    }
  );

  /**
   * POST /lessons/:id/preview
   * Generate lesson preview
   */
  fastify.post(
    '/lessons/:id/preview',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params as { id: string };
      const { mode } = (request.body as any) || {};

      const modeResult = PreviewModeEnum.safeParse(mode || 'desktop');
      if (!modeResult.success) {
        return reply.status(400).send({ error: 'Invalid preview mode' });
      }

      try {
        const lesson = await LessonBuilderService.getLesson(id, false);
        if (!lesson) {
          return reply.status(404).send({ error: 'Lesson not found' });
        }

        const userTenantId = getUserTenantId(user);
        if (!canAccessTenant(userTenantId, lesson.tenantId, user.roles)) {
          return reply.status(403).send({ error: 'Access denied' });
        }

        const preview = await LessonBuilderService.generatePreview(
          id,
          modeResult.data as LessonPreviewMode
        );

        return reply.send(preview);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to generate preview' });
      }
    }
  );

  /**
   * POST /lessons/:id/publish
   * Publish a lesson
   */
  fastify.post(
    '/lessons/:id/publish',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params as { id: string };

      try {
        const lesson = await LessonBuilderService.getLesson(id, false);
        if (!lesson) {
          return reply.status(404).send({ error: 'Lesson not found' });
        }

        const userTenantId = getUserTenantId(user);
        if (!canAccessTenant(userTenantId, lesson.tenantId, user.roles)) {
          return reply.status(403).send({ error: 'Access denied' });
        }

        const published = await LessonBuilderService.publishLesson(id, user.sub);
        return reply.send({ success: true, version: published });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to publish lesson' });
      }
    }
  );

  /**
   * GET /lessons/templates
   * Get lesson templates
   */
  fastify.get(
    '/lessons/templates',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      try {
        const userTenantId = getUserTenantId(user);
        const templates = await LessonBuilderService.getTemplates(userTenantId);
        return reply.send({ templates });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to fetch templates' });
      }
    }
  );

  /**
   * GET /block-types
   * Get available block types and schemas
   */
  fastify.get('/block-types', async (_request: FastifyRequest, reply: FastifyReply) => {
    const blockTypes = Object.values(BLOCK_TEMPLATES);
    return reply.send({ blockTypes });
  });

  /**
   * GET /block-types/:category
   * Get block types by category
   */
  fastify.get(
    '/block-types/:category',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { category } = request.params as { category: string };

      if (!['text', 'media', 'interactive', 'activity', 'layout'].includes(category)) {
        return reply.status(400).send({ error: 'Invalid category' });
      }

      const blocks = getBlocksByCategory(category as any);
      return reply.send({ blocks });
    }
  );

  /**
   * POST /lessons/:id/ai-suggestions
   * Get AI-assisted content suggestions
   */
  fastify.post(
    '/lessons/:id/ai-suggestions',
    { preHandler: [requireRoles(AUTHOR_ROLES)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params as { id: string };
      const { blockType, context } = request.body as {
        blockType: BlockType;
        context?: string;
      };

      try {
        const lesson = await LessonBuilderService.getLesson(id, false);
        if (!lesson) {
          return reply.status(404).send({ error: 'Lesson not found' });
        }

        const userTenantId = getUserTenantId(user);
        if (!canAccessTenant(userTenantId, lesson.tenantId, user.roles)) {
          return reply.status(403).send({ error: 'Access denied' });
        }

        const suggestions = await LessonBuilderService.generateContentSuggestions(
          id,
          blockType,
          context
        );

        return reply.send({ suggestions });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to generate suggestions' });
      }
    }
  );
}
