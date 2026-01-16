/**
 * AIVO Audit Service - Export Routes
 *
 * API endpoints for exporting audit logs.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import * as exportService from '../services/exportService.js';
import * as auditService from '../services/auditService.js';
import { CreateExportSchema } from '../types/index.js';
import { z } from 'zod';

const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export async function registerExportRoutes(fastify: FastifyInstance) {
  /**
   * POST /audit/exports
   * Create a new export request.
   */
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.tenantId || !request.user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const parseResult = CreateExportSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Invalid export request',
        details: parseResult.error.errors,
      });
    }

    try {
      const exportRequest = await exportService.createExport(
        request.tenantId,
        request.user.sub,
        request.user.email,
        parseResult.data
      );

      // Log this export request (meta-audit)
      await auditService.logAuditAccess(
        request.tenantId,
        request.user.sub,
        request.user.email,
        request.user.roles || [],
        request.headers['x-forwarded-for'] as string || request.ip,
        'export',
        parseResult.data,
        exportRequest?.recordCount || 0,
        new Date(parseResult.data.fromDate),
        new Date(parseResult.data.toDate),
        request.headers['x-request-id'] as string
      );

      return reply.status(201).send(exportRequest);
    } catch (error) {
      request.log.error({ error }, 'Failed to create export');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create export',
      });
    }
  });

  /**
   * GET /audit/exports
   * List exports for the tenant.
   */
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Tenant ID required',
      });
    }

    const parseResult = PaginationSchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Invalid pagination parameters',
        details: parseResult.error.errors,
      });
    }

    try {
      const result = await exportService.getExports(
        request.tenantId,
        parseResult.data.page,
        parseResult.data.pageSize
      );

      return reply.status(200).send(result);
    } catch (error) {
      request.log.error({ error }, 'Failed to list exports');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to list exports',
      });
    }
  });

  /**
   * GET /audit/exports/:id
   * Get a single export by ID.
   */
  fastify.get('/:id', async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Tenant ID required',
      });
    }

    try {
      const exportRequest = await exportService.getExportById(
        request.tenantId,
        request.params.id
      );

      if (!exportRequest) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Export not found',
        });
      }

      return reply.status(200).send(exportRequest);
    } catch (error) {
      request.log.error({ error }, 'Failed to get export');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get export',
      });
    }
  });
}
