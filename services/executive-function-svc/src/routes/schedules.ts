/**
 * Executive Function Visual Schedules Routes
 */

import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ExecutiveFunctionService } from '../services/ef.service.js';
import { prisma } from '../db.js';

const service = new ExecutiveFunctionService(prisma);

const blockSchema = z.object({
  blockType: z.enum(['LEARNING', 'BREAK', 'TRANSITION', 'ROUTINE', 'FLEXIBLE']),
  title: z.string().min(1),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  icon: z.string().optional(),
  color: z.string().optional(),
  taskIds: z.array(z.string().uuid()).optional(),
});

const createScheduleSchema = z.object({
  learnerId: z.string().uuid(),
  scheduleDate: z.string().datetime(),
  templateId: z.string().uuid().optional(),
  blocks: z.array(blockSchema),
  notes: z.string().optional(),
});

const templateBlockSchema = z.object({
  blockType: z.enum(['LEARNING', 'BREAK', 'TRANSITION', 'ROUTINE', 'FLEXIBLE']),
  title: z.string().min(1),
  startTimeOffset: z.number().int().min(0).max(1440), // Minutes from midnight
  durationMin: z.number().int().min(5).max(240),
  icon: z.string().optional(),
  color: z.string().optional(),
});

const createTemplateSchema = z.object({
  learnerId: z.string().uuid().optional(),
  name: z.string().min(1),
  dayType: z.enum(['WEEKDAY', 'WEEKEND', 'SCHOOL_DAY', 'HOLIDAY', 'SPECIAL']),
  blocks: z.array(templateBlockSchema),
  isDefault: z.boolean().optional(),
});

interface AuthUser {
  sub: string;
  tenantId: string;
  role: string;
}

function getUser(request: FastifyRequest): AuthUser {
  return (request as any).user || { sub: '', tenantId: '', role: '' };
}

export const schedulesRoutes: FastifyPluginAsync = async (app) => {
  // Create a schedule
  app.post<{ Body: z.infer<typeof createScheduleSchema> }>('/', async (request, reply) => {
    const user = getUser(request);
    const body = createScheduleSchema.parse(request.body);

    const schedule = await service.createSchedule(user.tenantId, {
      ...body,
      scheduleDate: new Date(body.scheduleDate),
      blocks: body.blocks.map(b => ({
        ...b,
        startTime: new Date(b.startTime),
        endTime: new Date(b.endTime),
      })),
    });

    return reply.code(201).send(schedule);
  });

  // Get today's schedule
  app.get<{ Params: { learnerId: string } }>(
    '/today/:learnerId',
    async (request, reply) => {
      const user = getUser(request);
      const { learnerId } = request.params;

      const schedule = await service.getTodaySchedule(user.tenantId, learnerId);
      if (!schedule) {
        return reply.code(404).send({ error: 'No schedule for today' });
      }

      return reply.send(schedule);
    }
  );

  // Get schedule for a date
  app.get<{ Params: { learnerId: string }; Querystring: { date: string } }>(
    '/:learnerId',
    async (request, reply) => {
      const user = getUser(request);
      const { learnerId } = request.params;
      const { date } = request.query;

      if (!date) {
        return reply.code(400).send({ error: 'date is required' });
      }

      const schedule = await service.getSchedule(user.tenantId, learnerId, new Date(date));
      if (!schedule) {
        return reply.code(404).send({ error: 'No schedule for this date' });
      }

      return reply.send(schedule);
    }
  );

  // Mark schedule as reviewed
  app.post<{ Params: { scheduleId: string } }>(
    '/:scheduleId/reviewed',
    async (request, reply) => {
      const { scheduleId } = request.params;

      try {
        const schedule = await service.markScheduleReviewed(scheduleId);
        return reply.send(schedule);
      } catch (error) {
        return reply.code(404).send({ error: 'Schedule not found' });
      }
    }
  );

  // Complete a block
  app.post<{ Params: { scheduleId: string; blockId: string } }>(
    '/:scheduleId/blocks/:blockId/complete',
    async (request, reply) => {
      const { blockId } = request.params;

      try {
        const block = await service.completeBlock(blockId);
        return reply.send(block);
      } catch (error) {
        return reply.code(404).send({ error: 'Block not found' });
      }
    }
  );

  // Skip a block
  app.post<{ Params: { scheduleId: string; blockId: string }; Body: { reason: string } }>(
    '/:scheduleId/blocks/:blockId/skip',
    async (request, reply) => {
      const { blockId } = request.params;
      const { reason } = request.body;

      if (!reason) {
        return reply.code(400).send({ error: 'reason is required' });
      }

      try {
        const block = await service.skipBlock(blockId, reason);
        return reply.send(block);
      } catch (error) {
        return reply.code(404).send({ error: 'Block not found' });
      }
    }
  );

  // Create schedule from template
  app.post<{ Body: { learnerId: string; templateId: string; date: string } }>(
    '/from-template',
    async (request, reply) => {
      const user = getUser(request);
      const { learnerId, templateId, date } = request.body;

      try {
        const schedule = await service.createScheduleFromTemplate(
          user.tenantId,
          learnerId,
          templateId,
          new Date(date)
        );
        return reply.code(201).send(schedule);
      } catch (error: any) {
        return reply.code(404).send({ error: error.message });
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // TEMPLATES
  // ═══════════════════════════════════════════════════════════════════════════

  // Create a template
  app.post<{ Body: z.infer<typeof createTemplateSchema> }>(
    '/templates',
    async (request, reply) => {
      const user = getUser(request);
      const body = createTemplateSchema.parse(request.body);

      const template = await service.createTemplate(user.tenantId, body);
      return reply.code(201).send(template);
    }
  );

  // Get templates
  app.get<{ Querystring: { learnerId?: string } }>(
    '/templates',
    async (request, reply) => {
      const user = getUser(request);
      const { learnerId } = request.query;

      const templates = await service.getTemplates(user.tenantId, learnerId);
      return reply.send({ templates });
    }
  );

  // Get default template for a day type
  app.get<{ Params: { learnerId: string }; Querystring: { dayType: string } }>(
    '/templates/default/:learnerId',
    async (request, reply) => {
      const user = getUser(request);
      const { learnerId } = request.params;
      const { dayType } = request.query;

      if (!dayType) {
        return reply.code(400).send({ error: 'dayType is required' });
      }

      const template = await service.getDefaultTemplate(user.tenantId, learnerId, dayType);
      if (!template) {
        return reply.code(404).send({ error: 'No default template for this day type' });
      }

      return reply.send(template);
    }
  );
};
