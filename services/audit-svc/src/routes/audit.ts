/**
 * AIVO Audit Service - Audit Query Routes
 *
 * API endpoints for querying and viewing audit logs.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import * as auditService from '../services/auditService.js';
import { QueryAuditLogsSchema } from '../types/index.js';

export async function registerAuditRoutes(fastify: FastifyInstance) {
  /**
   * GET /audit/logs
   * Query audit logs with filters and pagination.
   */
  fastify.get('/logs', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.tenantId || !request.user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const parseResult = QueryAuditLogsSchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Invalid query parameters',
        details: parseResult.error.errors,
      });
    }

    try {
      const result = await auditService.queryAuditLogs(
        request.tenantId,
        parseResult.data
      );

      // Log this access (meta-audit)
      await auditService.logAuditAccess(
        request.tenantId,
        request.user.sub,
        request.user.email,
        request.user.roles || [],
        request.headers['x-forwarded-for'] as string || request.ip,
        'query',
        parseResult.data,
        result.data.length,
        parseResult.data.fromDate ? new Date(parseResult.data.fromDate) : undefined,
        parseResult.data.toDate ? new Date(parseResult.data.toDate) : undefined,
        request.headers['x-request-id'] as string
      );

      return reply.status(200).send(result);
    } catch (error) {
      request.log.error({ error }, 'Failed to query audit logs');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to query audit logs',
      });
    }
  });

  /**
   * GET /audit/logs/:id
   * Get a single audit log entry by ID.
   */
  fastify.get('/logs/:id', async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    if (!request.tenantId || !request.user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    try {
      const auditLog = await auditService.getAuditLogById(
        request.tenantId,
        request.params.id
      );

      if (!auditLog) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Audit log entry not found',
        });
      }

      // Log this access (meta-audit)
      await auditService.logAuditAccess(
        request.tenantId,
        request.user.sub,
        request.user.email,
        request.user.roles || [],
        request.headers['x-forwarded-for'] as string || request.ip,
        'view_detail',
        { id: request.params.id },
        1,
        undefined,
        undefined,
        request.headers['x-request-id'] as string
      );

      return reply.status(200).send(auditLog);
    } catch (error) {
      request.log.error({ error }, 'Failed to get audit log');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get audit log',
      });
    }
  });

  /**
   * GET /audit/stats
   * Get audit statistics for the tenant.
   */
  fastify.get('/stats', async (request: FastifyRequest<{
    Querystring: { fromDate?: string; toDate?: string };
  }>, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Tenant ID required',
      });
    }

    try {
      const stats = await auditService.getAuditStats(
        request.tenantId,
        request.query.fromDate,
        request.query.toDate
      );

      return reply.status(200).send(stats);
    } catch (error) {
      request.log.error({ error }, 'Failed to get audit stats');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get audit stats',
      });
    }
  });

  /**
   * GET /audit/integrity
   * Verify the integrity of audit logs.
   */
  fastify.get('/integrity', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Tenant ID required',
      });
    }

    try {
      const result = await auditService.verifyIntegrity(request.tenantId);

      return reply.status(200).send(result);
    } catch (error) {
      request.log.error({ error }, 'Failed to verify audit integrity');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to verify audit integrity',
      });
    }
  });
}
