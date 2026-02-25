// ════════════════════════════════════════════════════════════════
// /api/collectors — Collector schedule & trigger endpoints
// ════════════════════════════════════════════════════════════════

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { COLLECTORS } from '../control-registry.js';
import { runCollector, runAllCollectors, getCollectorFn } from '../services/collector-runner.js';

const TriggerSchema = z.object({
  periodStart: z.coerce.date().optional(),
  periodEnd: z.coerce.date().optional(),
});

const UpdateScheduleSchema = z.object({
  cronExpr: z.string().optional(),
  enabled: z.boolean().optional(),
});

export async function collectorsRoutes(app: FastifyInstance): Promise<void> {
  const prisma = app.prisma;

  // ── GET /api/collectors ───────────────────────────────────
  app.get('/api/collectors', async (_req, reply) => {
    const schedules = await prisma.collectorSchedule.findMany();
    const scheduleMap = new Map(schedules.map(s => [s.collectorId, s]));

    const collectors = COLLECTORS.map(c => ({
      ...c,
      hasImplementation: !!getCollectorFn(c.id),
      schedule: scheduleMap.get(c.id) ?? null,
    }));

    return reply.send({ collectors });
  });

  // ── GET /api/collectors/:id/runs ──────────────────────────
  app.get<{ Params: { id: string } }>('/api/collectors/:id/runs', async (req, reply) => {
    const { limit = '20' } = req.query as Record<string, string>;

    const runs = await prisma.collectionRun.findMany({
      where: { collectorId: req.params.id },
      orderBy: { startedAt: 'desc' },
      take: Math.min(parseInt(limit, 10), 100),
    });

    return reply.send({ runs });
  });

  // ── POST /api/collectors/:id/trigger ──────────────────────
  app.post<{ Params: { id: string } }>('/api/collectors/:id/trigger', async (req, reply) => {
    const body = TriggerSchema.parse(req.body ?? {});
    const collector = COLLECTORS.find(c => c.id === req.params.id);
    if (!collector) return reply.code(404).send({ error: 'Collector not found' });

    const result = await runCollector(prisma, {
      collectorId: req.params.id,
      periodStart: body.periodStart,
      periodEnd: body.periodEnd,
      triggeredBy: 'manual',
    });

    return reply.code(202).send(result);
  });

  // ── POST /api/collectors/trigger-all ──────────────────────
  app.post('/api/collectors/trigger-all', async (_req, reply) => {
    const { results } = await runAllCollectors(prisma, 'manual');
    return reply.code(202).send({ results });
  });

  // ── PATCH /api/collectors/:id/schedule ────────────────────
  app.patch<{ Params: { id: string } }>('/api/collectors/:id/schedule', async (req, reply) => {
    const body = UpdateScheduleSchema.parse(req.body);

    const schedule = await prisma.collectorSchedule.upsert({
      where: { collectorId: req.params.id },
      update: body,
      create: {
        collectorId: req.params.id,
        cronExpr: body.cronExpr ?? '0 3 * * 1',
        enabled: body.enabled ?? true,
      },
    });

    return reply.send({ schedule });
  });
}
