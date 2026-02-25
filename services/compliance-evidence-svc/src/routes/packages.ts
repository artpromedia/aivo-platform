// ════════════════════════════════════════════════════════════════
// /api/packages — Audit package generation & listing
// ════════════════════════════════════════════════════════════════

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { generateAuditPackage } from '../services/package-builder.js';
import { presignedDownloadUrl } from '../services/s3-client.js';

const CreatePackageSchema = z.object({
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  controlIds: z.array(z.string()).optional(),
  categories: z.array(z.enum(['CC', 'A', 'PI', 'C', 'P'])).optional(),
  includeMarkdown: z.boolean().default(true),
  includeRawJson: z.boolean().default(true),
});

export async function packagesRoutes(app: FastifyInstance): Promise<void> {
  const prisma = app.prisma;

  // ── POST /api/packages ────────────────────────────────────
  app.post('/api/packages', async (req, reply) => {
    const body = CreatePackageSchema.parse(req.body);

    const result = await generateAuditPackage(prisma, body, 'api');
    return reply.code(201).send(result);
  });

  // ── GET /api/packages ─────────────────────────────────────
  app.get('/api/packages', async (req, reply) => {
    const { limit = '20', offset = '0' } = req.query as Record<string, string>;

    const [packages, total] = await Promise.all([
      prisma.auditPackage.findMany({
        orderBy: { generatedAt: 'desc' },
        take: Math.min(parseInt(limit, 10), 100),
        skip: parseInt(offset, 10),
      }),
      prisma.auditPackage.count(),
    ]);

    return reply.send({ packages, total });
  });

  // ── GET /api/packages/:id ─────────────────────────────────
  app.get<{ Params: { id: string } }>('/api/packages/:id', async (req, reply) => {
    const pkg = await prisma.auditPackage.findUnique({
      where: { id: req.params.id },
    });
    if (!pkg) return reply.code(404).send({ error: 'Package not found' });
    return reply.send({ package: pkg });
  });

  // ── GET /api/packages/:id/download ────────────────────────
  app.get<{ Params: { id: string } }>('/api/packages/:id/download', async (req, reply) => {
    const pkg = await prisma.auditPackage.findUnique({
      where: { id: req.params.id },
    });
    if (!pkg) return reply.code(404).send({ error: 'Package not found' });

    const url = await presignedDownloadUrl(pkg.s3Key);
    return reply.send({ downloadUrl: url, expiresIn: 3600 });
  });
}
