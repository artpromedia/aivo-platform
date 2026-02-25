// ════════════════════════════════════════════════════════════════
// /api/controls — Control matrix & status endpoints
// ════════════════════════════════════════════════════════════════

import type { FastifyInstance } from 'fastify';
import { CONTROLS, COLLECTORS, staleDaysForSchedule, getControl } from '../control-registry.js';
import type { ControlStatus, EvidenceHealth, TrustServiceCategory } from '../types.js';

export async function controlsRoutes(app: FastifyInstance): Promise<void> {
  const prisma = app.prisma;

  // ── GET /api/controls ─────────────────────────────────────
  // Returns all controls with embedded health status
  app.get('/api/controls', async (req, reply) => {
    const { category, section } = req.query as { category?: string; section?: string };

    let controls = CONTROLS;
    if (category) controls = controls.filter(c => c.category === category);
    if (section) controls = controls.filter(c => c.section === section);

    // Fetch latest evidence timestamp per control
    const latestEvidence = await prisma.evidenceRecord.groupBy({
      by: ['controlId'],
      _max: { collectedAt: true },
      _count: { id: true },
      where: category ? { category } : undefined,
    });

    const latestMap = new Map(
      latestEvidence.map(e => [e.controlId, { lastAt: e._max.collectedAt, count: e._count.id }]),
    );

    const statuses: ControlStatus[] = controls.map(ctrl => {
      const latest = latestMap.get(ctrl.id);
      const collector = COLLECTORS.find(c => ctrl.collectors.includes(c.id));
      const staleDays = collector ? staleDaysForSchedule(collector.schedule) : 10;
      const health = computeHealth(latest?.lastAt ?? null, staleDays);

      return {
        controlId: ctrl.id,
        category: ctrl.category as TrustServiceCategory,
        section: ctrl.section,
        description: ctrl.description,
        health,
        lastEvidenceAt: latest?.lastAt?.toISOString() ?? null,
        nextDueAt: latest?.lastAt
          ? new Date(latest.lastAt.getTime() + staleDays * 86_400_000).toISOString()
          : null,
        evidenceCount: latest?.count ?? 0,
        collectorIds: ctrl.collectors,
        owner: ctrl.owner,
      };
    });

    return reply.send({ controls: statuses, total: statuses.length });
  });

  // ── GET /api/controls/:id ─────────────────────────────────
  app.get<{ Params: { id: string } }>('/api/controls/:id', async (req, reply) => {
    const ctrl = getControl(req.params.id);
    if (!ctrl) return reply.code(404).send({ error: 'Control not found' });

    const evidence = await prisma.evidenceRecord.findMany({
      where: { controlId: ctrl.id },
      orderBy: { collectedAt: 'desc' },
      take: 20,
    });

    const collector = COLLECTORS.find(c => ctrl.collectors.includes(c.id));
    const staleDays = collector ? staleDaysForSchedule(collector.schedule) : 10;
    const lastAt = evidence[0]?.collectedAt ?? null;

    return reply.send({
      control: ctrl,
      health: computeHealth(lastAt, staleDays),
      evidenceCount: evidence.length,
      recentEvidence: evidence.map(e => ({
        id: e.id,
        collectorId: e.collectorId,
        format: e.format,
        collectedAt: e.collectedAt,
        periodStart: e.periodStart,
        periodEnd: e.periodEnd,
        sizeBytes: e.sizeBytes,
      })),
    });
  });

  // ── GET /api/controls/summary ─────────────────────────────
  // Returns aggregate health numbers per category
  app.get('/api/controls/summary', async (_req, reply) => {
    const latestEvidence = await prisma.evidenceRecord.groupBy({
      by: ['controlId'],
      _max: { collectedAt: true },
    });

    const latestMap = new Map(
      latestEvidence.map(e => [e.controlId, e._max.collectedAt]),
    );

    const summary: Record<string, { total: number; green: number; yellow: number; red: number }> = {};

    for (const ctrl of CONTROLS) {
      const cat = ctrl.category;
      if (!summary[cat]) summary[cat] = { total: 0, green: 0, yellow: 0, red: 0 };
      summary[cat].total++;

      const collector = COLLECTORS.find(c => ctrl.collectors.includes(c.id));
      const staleDays = collector ? staleDaysForSchedule(collector.schedule) : 10;
      const health = computeHealth(latestMap.get(ctrl.id) ?? null, staleDays);
      summary[cat][health]++;
    }

    return reply.send({ summary });
  });
}

// ── Helpers ──────────────────────────────────────────────────

function computeHealth(lastAt: Date | null, staleDays: number): EvidenceHealth {
  if (!lastAt) return 'red';
  const ageMs = Date.now() - lastAt.getTime();
  const ageDays = ageMs / 86_400_000;
  if (ageDays <= staleDays) return 'green';
  if (ageDays <= staleDays * 1.5) return 'yellow';
  return 'red';
}
