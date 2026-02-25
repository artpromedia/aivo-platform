// ════════════════════════════════════════════════════════════════
// /api/evidence — Evidence records & downloads
// ════════════════════════════════════════════════════════════════

import type { FastifyInstance } from 'fastify';
import { presignedDownloadUrl, downloadEvidence } from '../services/s3-client.js';

export async function evidenceRoutes(app: FastifyInstance): Promise<void> {
  const prisma = app.prisma;

  // ── GET /api/evidence ─────────────────────────────────────
  app.get('/api/evidence', async (req, reply) => {
    const {
      controlId,
      collectorId,
      category,
      format,
      limit = '50',
      offset = '0',
      from,
      to,
    } = req.query as Record<string, string | undefined>;

    const where: Record<string, unknown> = {};
    if (controlId) where.controlId = controlId;
    if (collectorId) where.collectorId = collectorId;
    if (category) where.category = category;
    if (format) where.format = format;
    if (from || to) {
      where.collectedAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const [records, total] = await Promise.all([
      prisma.evidenceRecord.findMany({
        where,
        orderBy: { collectedAt: 'desc' },
        take: Math.min(parseInt(limit, 10), 200),
        skip: parseInt(offset, 10),
      }),
      prisma.evidenceRecord.count({ where }),
    ]);

    return reply.send({
      evidence: records.map(r => ({
        id: r.id,
        collectorId: r.collectorId,
        controlId: r.controlId,
        category: r.category,
        format: r.format,
        sizeBytes: r.sizeBytes,
        sha256: r.sha256,
        collectedAt: r.collectedAt,
        periodStart: r.periodStart,
        periodEnd: r.periodEnd,
      })),
      total,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });
  });

  // ── GET /api/evidence/:id ─────────────────────────────────
  app.get<{ Params: { id: string } }>('/api/evidence/:id', async (req, reply) => {
    const record = await prisma.evidenceRecord.findUnique({
      where: { id: req.params.id },
    });
    if (!record) return reply.code(404).send({ error: 'Evidence not found' });
    return reply.send({ evidence: record });
  });

  // ── GET /api/evidence/:id/download ────────────────────────
  // Returns a presigned S3 URL for direct download
  app.get<{ Params: { id: string } }>('/api/evidence/:id/download', async (req, reply) => {
    const record = await prisma.evidenceRecord.findUnique({
      where: { id: req.params.id },
    });
    if (!record) return reply.code(404).send({ error: 'Evidence not found' });

    const url = await presignedDownloadUrl(record.s3Key);
    return reply.send({ downloadUrl: url, expiresIn: 3600 });
  });

  // ── GET /api/evidence/:id/content ─────────────────────────
  // Returns the evidence content inline (for smaller files)
  app.get<{ Params: { id: string } }>('/api/evidence/:id/content', async (req, reply) => {
    const record = await prisma.evidenceRecord.findUnique({
      where: { id: req.params.id },
    });
    if (!record) return reply.code(404).send({ error: 'Evidence not found' });

    // Only allow inline content for files < 5MB
    if (record.sizeBytes > 5 * 1024 * 1024) {
      return reply.code(413).send({ error: 'File too large for inline view — use download endpoint' });
    }

    const data = await downloadEvidence(record.s3Key);
    const contentType =
      record.format === 'json' ? 'application/json'
        : record.format === 'markdown' ? 'text/markdown'
          : record.format === 'csv' ? 'text/csv'
            : 'application/octet-stream';

    return reply.type(contentType).send(data);
  });
}
