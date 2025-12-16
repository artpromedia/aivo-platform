/**
 * Audit Log Routes
 * 
 * Read-only access to research audit logs for compliance.
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getProjectAuditLogs, getExportAuditLogs } from '../services/auditService.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Schemas
// ═══════════════════════════════════════════════════════════════════════════════

const listAuditSchema = z.object({
  projectId: z.string().uuid().optional(),
  action: z.string().optional(), // comma-separated
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(500).optional(),
  offset: z.coerce.number().min(0).optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// Route Plugin
// ═══════════════════════════════════════════════════════════════════════════════

export const auditRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /research/audit-logs
   * List audit logs (admin only)
   */
  app.get('/audit-logs', async (request, reply) => {
    const user = request.user as { sub: string; tenantId: string; roles?: string[] };
    const query = listAuditSchema.parse(request.query);

    // Only admins can view audit logs
    const isAdmin = user.roles?.includes('district_admin') || user.roles?.includes('platform_admin');
    if (!isAdmin) {
      return reply.status(403).send({ error: 'Only admins can view audit logs' });
    }

    if (query.projectId) {
      const result = await getProjectAuditLogs(query.projectId, user.tenantId, {
        action: query.action?.split(','),
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        limit: query.limit,
        offset: query.offset,
      });
      return reply.send(result);
    }

    // Get all export-related audit logs
    const result = await getExportAuditLogs(user.tenantId, {
      action: query.action?.split(','),
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      limit: query.limit,
      offset: query.offset,
    });

    return reply.send(result);
  });

  /**
   * GET /research/projects/:projectId/audit-logs
   * List audit logs for a specific project
   */
  app.get('/projects/:projectId/audit-logs', async (request, reply) => {
    const user = request.user as { sub: string; tenantId: string; roles?: string[] };
    const { projectId } = request.params as { projectId: string };
    const query = listAuditSchema.parse(request.query);

    // Admins or project members can view project audit logs
    const isAdmin = user.roles?.includes('district_admin') || user.roles?.includes('platform_admin');
    // TODO: Also check if user is project member

    if (!isAdmin) {
      return reply.status(403).send({ error: 'Only admins can view audit logs' });
    }

    const result = await getProjectAuditLogs(projectId, user.tenantId, {
      action: query.action?.split(','),
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      limit: query.limit,
      offset: query.offset,
    });

    return reply.send(result);
  });
};
