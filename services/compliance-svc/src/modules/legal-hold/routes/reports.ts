/**
 * AIVO Compliance Service - Legal Hold Module – Report Routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import * as reportService from '../services/reportService.js';

const GenerateReportSchema = z.object({
  reportType: z.enum([
    'HOLD_STATUS',
    'CUSTODIAN_COMPLIANCE',
    'ACKNOWLEDGMENT_SUMMARY',
    'DATA_SOURCE_INVENTORY',
    'MATTER_SUMMARY',
    'AUDIT_TRAIL',
  ]),
  name: z.string().min(1).max(255),
  parameters: z.object({
    matterId: z.string().uuid().optional(),
    holdId: z.string().uuid().optional(),
    custodianIds: z.array(z.string().uuid()).optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    includeReleased: z.boolean().optional(),
  }).optional().default({}),
});

export default async function reportRoutes(fastify: FastifyInstance): Promise<void> {
  // Get report types
  fastify.get('/types', async (_request: FastifyRequest, reply: FastifyReply) => {
    const types = reportService.getReportTypes();
    return reply.send(types);
  });

  // List reports
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { reportType, page, pageSize } = request.query as any;

    const result = await reportService.listReports(tenantId, { reportType, page, pageSize });
    return reply.send(result);
  });

  // Generate report
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const userId = (request as any).userId;

    const parsed = GenerateReportSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.errors });
    }

    try {
      const report = await reportService.generateReport(tenantId, userId, parsed.data);
      return reply.status(201).send({
        id: report.id,
        reportType: report.reportType,
        name: report.name,
        status: report.status,
        generatedAt: report.generatedAt,
      });
    } catch (error: any) {
      return reply.status(500).send({ error: 'Report generation failed', message: error.message });
    }
  });

  // Get report
  fastify.get('/:reportId', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { reportId } = request.params as { reportId: string };

    const report = await reportService.getReport(tenantId, reportId);
    if (!report) {
      return reply.status(404).send({ error: 'Report not found' });
    }
    return reply.send(report);
  });

  // Download report
  fastify.get('/:reportId/download', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { reportId } = request.params as { reportId: string };

    const report = await reportService.getReport(tenantId, reportId);
    if (!report) {
      return reply.status(404).send({ error: 'Report not found' });
    }

    if (report.status !== 'COMPLETED') {
      return reply.status(400).send({ error: 'Report not ready for download' });
    }

    if (report.expiresAt && report.expiresAt < new Date()) {
      return reply.status(410).send({ error: 'Report has expired' });
    }

    const filename = `${report.name.replace(/[^a-z0-9]/gi, '-')}-${report.createdAt.toISOString().split('T')[0]}.json`;

    return reply
      .header('Content-Type', 'application/json')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(report.filePath); // In production, stream from S3
  });
}
