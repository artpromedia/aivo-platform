/**
 * Scheduled Export Routes — CRUD + manual trigger for recurring data exports.
 *
 * GET    /scheduled-exports           — List scheduled exports for tenant
 * POST   /scheduled-exports           — Create a new scheduled export
 * GET    /scheduled-exports/:id       — Get a single scheduled export
 * PUT    /scheduled-exports/:id       — Update schedule config
 * DELETE /scheduled-exports/:id       — Cancel / delete a scheduled export
 * POST   /scheduled-exports/:id/run   — Trigger an immediate run
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import {
  createScheduledExport,
  listScheduledExports,
  getScheduledExport,
  updateScheduledExport,
  deleteScheduledExport,
  runScheduledExportNow,
} from './scheduled-export.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const ExportTypes = [
  'student_roster',
  'assessment_results',
  'session_activity',
  'skill_mastery',
  'engagement_metrics',
  'gradebook',
  'iep_progress',
] as const;

const CreateScheduleSchema = z.object({
  exportType: z.enum(ExportTypes),
  format: z.enum(['csv', 'excel', 'json']).default('csv'),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly']),
  dayOfWeek: z.number().min(0).max(6).optional(),
  dayOfMonth: z.number().min(1).max(28).optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).default('06:00'),
  timezone: z.string().default('America/New_York'),
  recipients: z.array(z.string().email()).min(1),
  filters: z.record(z.unknown()).optional(),
  emailSubject: z.string().optional(),
  emailMessage: z.string().optional(),
});

const UpdateScheduleSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly']).optional(),
  dayOfWeek: z.number().min(0).max(6).optional(),
  dayOfMonth: z.number().min(1).max(28).optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  timezone: z.string().optional(),
  recipients: z.array(z.string().email()).optional(),
  filters: z.record(z.unknown()).optional(),
  status: z.enum(['active', 'paused', 'cancelled']).optional(),
});

const ListQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

// ══════════════════════════════════════════════════════════════════════════════
// PLUGIN
// ══════════════════════════════════════════════════════════════════════════════

export async function scheduledExportRoutes(app: FastifyInstance) {
  /**
   * GET /scheduled-exports — List all scheduled exports for the tenant.
   */
  app.get('/scheduled-exports', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.user as { tenantId: string };
    const query = ListQuerySchema.parse(request.query);
    const result = await listScheduledExports(tenantId, query);
    return reply.send(result);
  });

  /**
   * POST /scheduled-exports — Create a new recurring export schedule.
   */
  app.post('/scheduled-exports', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, sub: userId } = request.user as { tenantId: string; sub: string };
    const body = CreateScheduleSchema.parse(request.body);

    const schedule = await createScheduledExport({
      tenantId,
      createdBy: userId,
      exportType: body.exportType,
      format: body.format,
      frequency: body.frequency,
      dayOfWeek: body.dayOfWeek,
      dayOfMonth: body.dayOfMonth,
      time: body.time,
      timezone: body.timezone,
      recipients: body.recipients,
      filters: body.filters,
      emailSubject: body.emailSubject,
      emailMessage: body.emailMessage,
    });

    return reply.status(201).send(schedule);
  });

  /**
   * GET /scheduled-exports/:id — Get a single schedule.
   */
  app.get('/scheduled-exports/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.user as { tenantId: string };
    const { id } = request.params as { id: string };
    const schedule = await getScheduledExport(tenantId, id);
    if (!schedule) return reply.status(404).send({ error: 'Schedule not found' });
    return reply.send(schedule);
  });

  /**
   * PUT /scheduled-exports/:id — Update schedule configuration.
   */
  app.put('/scheduled-exports/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.user as { tenantId: string };
    const { id } = request.params as { id: string };
    const body = UpdateScheduleSchema.parse(request.body);
    const updated = await updateScheduledExport(tenantId, id, body);
    if (!updated) return reply.status(404).send({ error: 'Schedule not found' });
    return reply.send(updated);
  });

  /**
   * DELETE /scheduled-exports/:id — Cancel and remove a scheduled export.
   */
  app.delete('/scheduled-exports/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.user as { tenantId: string };
    const { id } = request.params as { id: string };
    const deleted = await deleteScheduledExport(tenantId, id);
    if (!deleted) return reply.status(404).send({ error: 'Schedule not found' });
    return reply.status(204).send();
  });

  /**
   * POST /scheduled-exports/:id/run — Trigger an immediate export run.
   */
  app.post('/scheduled-exports/:id/run', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.user as { tenantId: string };
    const { id } = request.params as { id: string };
    const token = (request.headers.authorization || '').replace('Bearer ', '');

    const job = await runScheduledExportNow(tenantId, id, token);
    if (!job) return reply.status(404).send({ error: 'Schedule not found' });
    return reply.status(202).send(job);
  });
}
