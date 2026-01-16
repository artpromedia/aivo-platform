/**
 * AIVO Audit Service - Ingest Routes
 *
 * API endpoints for ingesting audit logs from other services.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import * as auditService from '../services/auditService.js';
import { CreateAuditLogSchema } from '../types/index.js';
import { z } from 'zod';

const BatchIngestSchema = z.object({
  events: z.array(CreateAuditLogSchema).min(1).max(1000),
});

export async function registerIngestRoutes(fastify: FastifyInstance) {
  /**
   * POST /audit/ingest
   * Ingest a single audit log entry.
   */
  fastify.post('/ingest', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Tenant ID required',
      });
    }

    const parseResult = CreateAuditLogSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Invalid audit log entry',
        details: parseResult.error.errors,
      });
    }

    try {
      const auditLog = await auditService.createAuditLog(
        request.tenantId,
        parseResult.data
      );

      return reply.status(201).send({
        success: true,
        id: auditLog.id,
        eventId: auditLog.eventId,
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to ingest audit log');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to ingest audit log',
      });
    }
  });

  /**
   * POST /audit/ingest/batch
   * Ingest multiple audit log entries in batch.
   */
  fastify.post('/ingest/batch', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Tenant ID required',
      });
    }

    const parseResult = BatchIngestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Invalid batch ingest request',
        details: parseResult.error.errors,
      });
    }

    try {
      const result = await auditService.createAuditLogsBatch(
        request.tenantId,
        parseResult.data.events
      );

      return reply.status(201).send({
        success: true,
        created: result.created,
        duplicates: result.duplicates,
        ids: result.logs.map((l) => l.id),
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to batch ingest audit logs');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to batch ingest audit logs',
      });
    }
  });
}
