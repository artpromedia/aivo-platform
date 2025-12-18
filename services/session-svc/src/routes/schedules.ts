import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma.js';
import { ScheduleService } from '../schedules/schedule.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// REQUEST SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const ScheduleItemSchema = z.object({
  title: z.string(),
  type: z.enum(['activity', 'break', 'transition', 'reward', 'meal', 'custom']),
  scheduledTime: z.string().optional(),
  estimatedDuration: z.number().int().min(1),
  activityId: z.string().uuid().optional(),
  activityType: z.string().optional(),
  icon: z.string(),
  color: z.string(),
  image: z.string().url().optional(),
  symbolUrl: z.string().url().optional(),
  isFlexible: z.boolean(),
  notes: z.string().optional(),
});

const CreateScheduleSchema = z.object({
  learnerId: z.string().uuid(),
  tenantId: z.string().uuid(),
  date: z.string().datetime(),
  type: z.enum(['DAILY', 'SESSION', 'ACTIVITY', 'CUSTOM']).optional(),
  items: z.array(ScheduleItemSchema),
  displayStyle: z
    .enum(['VERTICAL_LIST', 'HORIZONTAL_STRIP', 'GRID', 'FIRST_THEN', 'NOW_NEXT_LATER'])
    .optional(),
  showTimes: z.boolean().optional(),
  showDuration: z.boolean().optional(),
  showImages: z.boolean().optional(),
  useSymbols: z.boolean().optional(),
  generatedBy: z.string().optional(),
});

const UpdateItemStatusSchema = z.object({
  status: z.enum(['upcoming', 'current', 'completed', 'skipped', 'in_progress']),
  actualDuration: z.number().int().optional(),
});

const AddItemSchema = z.object({
  item: ScheduleItemSchema,
  afterItemId: z.string().optional(),
});

const ReorderItemsSchema = z.object({
  itemOrders: z.array(
    z.object({
      itemId: z.string(),
      newIndex: z.number().int().min(0),
    })
  ),
});

const UpdatePreferencesSchema = z.object({
  preferredStyle: z
    .enum(['VERTICAL_LIST', 'HORIZONTAL_STRIP', 'GRID', 'FIRST_THEN', 'NOW_NEXT_LATER'])
    .optional(),
  showTimes: z.boolean().optional(),
  showDuration: z.boolean().optional(),
  showImages: z.boolean().optional(),
  useSymbols: z.boolean().optional(),
  showCountdownToNext: z.boolean().optional(),
  warnBeforeTransition: z.boolean().optional(),
  transitionWarningMinutes: z.number().int().min(1).max(30).optional(),
  iconSize: z.enum(['small', 'medium', 'large']).optional(),
  colorCoding: z.boolean().optional(),
  highContrast: z.boolean().optional(),
  announceItems: z.boolean().optional(),
  playChimeOnChange: z.boolean().optional(),
  celebrateCompletion: z.boolean().optional(),
  showProgressBar: z.boolean().optional(),
});

const TemplateItemSchema = z.object({
  title: z.string(),
  type: z.enum(['activity', 'break', 'transition', 'reward', 'meal', 'custom']),
  relativeTime: z.number().int().optional(),
  estimatedDuration: z.number().int().min(1),
  activityType: z.string().optional(),
  icon: z.string(),
  color: z.string(),
  image: z.string().url().optional(),
  symbolUrl: z.string().url().optional(),
  isFlexible: z.boolean(),
  notes: z.string().optional(),
});

const CreateTemplateSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  items: z.array(TemplateItemSchema),
  targetAgeMin: z.number().int().min(3).max(18).optional(),
  targetAgeMax: z.number().int().min(3).max(18).optional(),
  dayOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  displayStyle: z
    .enum(['VERTICAL_LIST', 'HORIZONTAL_STRIP', 'GRID', 'FIRST_THEN', 'NOW_NEXT_LATER'])
    .optional(),
  showTimes: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  createdBy: z.string().uuid(),
});

const UpdateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  items: z.array(TemplateItemSchema).optional(),
  targetAgeMin: z.number().int().min(3).max(18).nullable().optional(),
  targetAgeMax: z.number().int().min(3).max(18).nullable().optional(),
  dayOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  displayStyle: z
    .enum(['VERTICAL_LIST', 'HORIZONTAL_STRIP', 'GRID', 'FIRST_THEN', 'NOW_NEXT_LATER'])
    .optional(),
  showTimes: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

const CreateSessionScheduleSchema = z.object({
  sessionId: z.string().uuid(),
  learnerId: z.string().uuid(),
  tenantId: z.string().uuid(),
  activities: z.array(
    z.object({
      id: z.string().uuid(),
      type: z.string(),
      title: z.string(),
      estimatedMinutes: z.number().int().min(1),
      thumbnail: z.string().url().optional(),
    })
  ),
});

// ══════════════════════════════════════════════════════════════════════════════
// PARAM SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const ScheduleIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const ItemIdParamsSchema = z.object({
  id: z.string().uuid(),
  itemId: z.string(),
});

const LearnerIdParamsSchema = z.object({
  learnerId: z.string().uuid(),
});

const TemplateIdParamsSchema = z.object({
  templateId: z.string().uuid(),
});

// ══════════════════════════════════════════════════════════════════════════════
// QUERY SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const GetTodayScheduleQuerySchema = z.object({
  learnerId: z.string().uuid(),
  tenantId: z.string().uuid(),
  type: z.enum(['DAILY', 'SESSION', 'ACTIVITY', 'CUSTOM']).optional(),
});

const ListTemplatesQuerySchema = z.object({
  tenantId: z.string().uuid(),
});

// ══════════════════════════════════════════════════════════════════════════════
// ROUTE PLUGIN
// ══════════════════════════════════════════════════════════════════════════════

export async function scheduleRoutes(fastify: FastifyInstance) {
  // Initialize the schedule service
  const scheduleService = new ScheduleService({
    prisma,
    publishEvent: async (topic, data) => {
      fastify.log.info({ topic, data }, 'Publishing schedule event');
      // In production, this would use NATS or similar
    },
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SCHEDULE ENDPOINTS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * GET /schedules/today - Get today's schedule for a learner
   */
  fastify.get(
    '/today',
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof GetTodayScheduleQuerySchema> }>,
      reply: FastifyReply
    ) => {
      const query = GetTodayScheduleQuerySchema.parse(request.query);

      const schedule = await scheduleService.getScheduleForToday(
        query.learnerId,
        query.tenantId,
        query.type as 'DAILY' | 'SESSION' | 'ACTIVITY' | 'CUSTOM' | undefined
      );

      if (!schedule) {
        return reply.status(404).send({ error: 'No schedule found for today' });
      }

      return schedule;
    }
  );

  /**
   * POST /schedules - Create a new schedule
   */
  fastify.post(
    '/',
    async (
      request: FastifyRequest<{ Body: z.infer<typeof CreateScheduleSchema> }>,
      reply: FastifyReply
    ) => {
      const body = CreateScheduleSchema.parse(request.body);

      const schedule = await scheduleService.createSchedule({
        ...body,
        date: new Date(body.date),
      });

      return reply.status(201).send(schedule);
    }
  );

  /**
   * GET /schedules/:id - Get a schedule by ID
   */
  fastify.get(
    '/:id',
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof ScheduleIdParamsSchema>;
        Querystring: { learnerId: string };
      }>,
      reply: FastifyReply
    ) => {
      const { id } = ScheduleIdParamsSchema.parse(request.params);
      const { learnerId } = request.query;

      if (!learnerId) {
        return reply.status(400).send({ error: 'learnerId query parameter is required' });
      }

      const schedule = await scheduleService.getScheduleById(id, learnerId);

      if (!schedule) {
        return reply.status(404).send({ error: 'Schedule not found' });
      }

      return schedule;
    }
  );

  /**
   * DELETE /schedules/:id - Delete a schedule
   */
  fastify.delete(
    '/:id',
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof ScheduleIdParamsSchema>;
        Querystring: { learnerId: string };
      }>,
      reply: FastifyReply
    ) => {
      const { id } = ScheduleIdParamsSchema.parse(request.params);
      const { learnerId } = request.query;

      if (!learnerId) {
        return reply.status(400).send({ error: 'learnerId query parameter is required' });
      }

      await scheduleService.deleteSchedule(id, learnerId);

      return reply.status(204).send();
    }
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ITEM MANAGEMENT ENDPOINTS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * PATCH /schedules/:id/items/:itemId/status - Update item status
   */
  fastify.patch(
    '/:id/items/:itemId/status',
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof ItemIdParamsSchema>;
        Body: z.infer<typeof UpdateItemStatusSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const { id, itemId } = ItemIdParamsSchema.parse(request.params);
      const body = UpdateItemStatusSchema.parse(request.body);

      try {
        const schedule = await scheduleService.updateItemStatus(
          id,
          itemId,
          body.status,
          body.actualDuration
        );
        return schedule;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return reply.status(404).send({ error: message });
      }
    }
  );

  /**
   * POST /schedules/:id/complete-current - Mark current item as complete
   */
  fastify.post(
    '/:id/complete-current',
    async (
      request: FastifyRequest<{ Params: z.infer<typeof ScheduleIdParamsSchema> }>,
      reply: FastifyReply
    ) => {
      const { id } = ScheduleIdParamsSchema.parse(request.params);

      try {
        const schedule = await scheduleService.markCurrentAsComplete(id);
        return schedule;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return reply.status(404).send({ error: message });
      }
    }
  );

  /**
   * POST /schedules/:id/skip-current - Skip current item
   */
  fastify.post(
    '/:id/skip-current',
    async (
      request: FastifyRequest<{ Params: z.infer<typeof ScheduleIdParamsSchema> }>,
      reply: FastifyReply
    ) => {
      const { id } = ScheduleIdParamsSchema.parse(request.params);

      try {
        const schedule = await scheduleService.skipCurrentItem(id);
        return schedule;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return reply.status(404).send({ error: message });
      }
    }
  );

  /**
   * POST /schedules/:id/items - Add an item to the schedule
   */
  fastify.post(
    '/:id/items',
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof ScheduleIdParamsSchema>;
        Body: z.infer<typeof AddItemSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const { id } = ScheduleIdParamsSchema.parse(request.params);
      const body = AddItemSchema.parse(request.body);

      try {
        const schedule = await scheduleService.addItem(id, body.item, body.afterItemId);
        return reply.status(201).send(schedule);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return reply.status(404).send({ error: message });
      }
    }
  );

  /**
   * DELETE /schedules/:id/items/:itemId - Remove an item from the schedule
   */
  fastify.delete(
    '/:id/items/:itemId',
    async (
      request: FastifyRequest<{ Params: z.infer<typeof ItemIdParamsSchema> }>,
      reply: FastifyReply
    ) => {
      const { id, itemId } = ItemIdParamsSchema.parse(request.params);

      try {
        const schedule = await scheduleService.removeItem(id, itemId);
        return schedule;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return reply.status(404).send({ error: message });
      }
    }
  );

  /**
   * PUT /schedules/:id/reorder - Reorder items in the schedule
   */
  fastify.put(
    '/:id/reorder',
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof ScheduleIdParamsSchema>;
        Body: z.infer<typeof ReorderItemsSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const { id } = ScheduleIdParamsSchema.parse(request.params);
      const body = ReorderItemsSchema.parse(request.body);

      try {
        const schedule = await scheduleService.reorderItems(id, body.itemOrders);
        return schedule;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return reply.status(404).send({ error: message });
      }
    }
  );

  // ══════════════════════════════════════════════════════════════════════════
  // SESSION SCHEDULE ENDPOINTS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * POST /schedules/session - Create a schedule for a learning session
   */
  fastify.post(
    '/session',
    async (
      request: FastifyRequest<{ Body: z.infer<typeof CreateSessionScheduleSchema> }>,
      reply: FastifyReply
    ) => {
      const body = CreateSessionScheduleSchema.parse(request.body);

      const schedule = await scheduleService.createSessionSchedule(
        body.sessionId,
        body.learnerId,
        body.tenantId,
        body.activities
      );

      return reply.status(201).send(schedule);
    }
  );

  /**
   * GET /schedules/activity-breakdown/:activityType - Get activity breakdown
   */
  fastify.get(
    '/activity-breakdown/:activityType',
    async (
      request: FastifyRequest<{ Params: { activityType: string } }>,
      _reply: FastifyReply
    ) => {
      const { activityType } = request.params;
      const breakdown = scheduleService.getActivityBreakdown(activityType);
      return { activityType, steps: breakdown };
    }
  );

  // ══════════════════════════════════════════════════════════════════════════
  // PREFERENCES ENDPOINTS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * GET /schedules/preferences/:learnerId - Get learner preferences
   */
  fastify.get(
    '/preferences/:learnerId',
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof LearnerIdParamsSchema>;
        Querystring: { tenantId: string };
      }>,
      reply: FastifyReply
    ) => {
      const { learnerId } = LearnerIdParamsSchema.parse(request.params);
      const { tenantId } = request.query;

      if (!tenantId) {
        return reply.status(400).send({ error: 'tenantId query parameter is required' });
      }

      const preferences = await scheduleService.getOrCreatePreferences(learnerId, tenantId);
      return preferences;
    }
  );

  /**
   * PATCH /schedules/preferences/:learnerId - Update learner preferences
   */
  fastify.patch(
    '/preferences/:learnerId',
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof LearnerIdParamsSchema>;
        Body: z.infer<typeof UpdatePreferencesSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const { learnerId } = LearnerIdParamsSchema.parse(request.params);
      const body = UpdatePreferencesSchema.parse(request.body);

      try {
        const preferences = await scheduleService.updatePreferences(learnerId, body);
        return preferences;
      } catch {
        return reply.status(404).send({ error: 'Preferences not found' });
      }
    }
  );

  // ══════════════════════════════════════════════════════════════════════════
  // TEMPLATE ENDPOINTS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * GET /schedules/templates - List templates for a tenant
   */
  fastify.get(
    '/templates',
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof ListTemplatesQuerySchema> }>,
      _reply: FastifyReply
    ) => {
      const query = ListTemplatesQuerySchema.parse(request.query);
      const templates = await scheduleService.listTemplates(query.tenantId);
      return { templates };
    }
  );

  /**
   * POST /schedules/templates - Create a template
   */
  fastify.post(
    '/templates',
    async (
      request: FastifyRequest<{ Body: z.infer<typeof CreateTemplateSchema> }>,
      reply: FastifyReply
    ) => {
      const body = CreateTemplateSchema.parse(request.body);

      const template = await scheduleService.createTemplate(body);

      return reply.status(201).send(template);
    }
  );

  /**
   * PATCH /schedules/templates/:templateId - Update a template
   */
  fastify.patch(
    '/templates/:templateId',
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof TemplateIdParamsSchema>;
        Body: z.infer<typeof UpdateTemplateSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const { templateId } = TemplateIdParamsSchema.parse(request.params);
      const body = UpdateTemplateSchema.parse(request.body);

      try {
        const template = await scheduleService.updateTemplate(templateId, body);
        return template;
      } catch {
        return reply.status(404).send({ error: 'Template not found' });
      }
    }
  );

  /**
   * DELETE /schedules/templates/:templateId - Delete a template
   */
  fastify.delete(
    '/templates/:templateId',
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof TemplateIdParamsSchema>;
        Querystring: { tenantId: string };
      }>,
      reply: FastifyReply
    ) => {
      const { templateId } = TemplateIdParamsSchema.parse(request.params);
      const { tenantId } = request.query;

      if (!tenantId) {
        return reply.status(400).send({ error: 'tenantId query parameter is required' });
      }

      await scheduleService.deleteTemplate(templateId, tenantId);

      return reply.status(204).send();
    }
  );
}
