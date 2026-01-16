/**
 * AIVO Audit Service - Alert Routes
 *
 * API endpoints for managing audit alerts.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import * as alertService from '../services/alertService.js';

const ListAlertsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  includeResolved: z.coerce.boolean().default(false),
});

const ResolveAlertSchema = z.object({
  resolution: z.string().min(1).max(2000),
});

export async function registerAlertRoutes(fastify: FastifyInstance) {
  /**
   * GET /audit/alerts
   * List alerts for the tenant.
   */
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Tenant ID required',
      });
    }

    const parseResult = ListAlertsSchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Invalid query parameters',
        details: parseResult.error.errors,
      });
    }

    try {
      const result = await alertService.getAlerts(
        request.tenantId,
        parseResult.data.page,
        parseResult.data.pageSize,
        parseResult.data.includeResolved
      );

      return reply.status(200).send(result);
    } catch (error) {
      request.log.error({ error }, 'Failed to list alerts');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to list alerts',
      });
    }
  });

  /**
   * GET /audit/alerts/counts
   * Get alert counts by status.
   */
  fastify.get('/counts', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.tenantId) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Tenant ID required',
      });
    }

    try {
      const counts = await alertService.getAlertCounts(request.tenantId);

      return reply.status(200).send(counts);
    } catch (error) {
      request.log.error({ error }, 'Failed to get alert counts');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get alert counts',
      });
    }
  });

  /**
   * GET /audit/alerts/:id
   * Get a single alert by ID.
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
      const alert = await alertService.getAlertById(
        request.tenantId,
        request.params.id
      );

      if (!alert) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Alert not found',
        });
      }

      return reply.status(200).send(alert);
    } catch (error) {
      request.log.error({ error }, 'Failed to get alert');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get alert',
      });
    }
  });

  /**
   * POST /audit/alerts/:id/acknowledge
   * Acknowledge an alert.
   */
  fastify.post('/:id/acknowledge', async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    if (!request.tenantId || !request.user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    try {
      const alert = await alertService.acknowledgeAlert(
        request.tenantId,
        request.params.id,
        request.user.sub
      );

      return reply.status(200).send(alert);
    } catch (error) {
      request.log.error({ error }, 'Failed to acknowledge alert');

      if ((error as any).code === 'P2025') {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Alert not found',
        });
      }

      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to acknowledge alert',
      });
    }
  });

  /**
   * POST /audit/alerts/:id/resolve
   * Resolve an alert.
   */
  fastify.post('/:id/resolve', async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    if (!request.tenantId || !request.user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const parseResult = ResolveAlertSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Resolution notes required',
        details: parseResult.error.errors,
      });
    }

    try {
      const alert = await alertService.resolveAlert(
        request.tenantId,
        request.params.id,
        request.user.sub,
        parseResult.data.resolution
      );

      return reply.status(200).send(alert);
    } catch (error) {
      request.log.error({ error }, 'Failed to resolve alert');

      if ((error as any).code === 'P2025') {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Alert not found',
        });
      }

      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to resolve alert',
      });
    }
  });
}
