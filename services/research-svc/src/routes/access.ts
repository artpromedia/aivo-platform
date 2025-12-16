/**
 * Access Grant Routes
 * 
 * Manage researcher access to projects and DUA acceptance.
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import {
  grantAccess,
  revokeAccess,
  getProjectAccessGrants,
  getUserAccessGrants,
  acceptDUA,
} from '../services/accessGrantService.js';
import type { AuditContext } from '../services/auditService.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Schemas
// ═══════════════════════════════════════════════════════════════════════════════

const grantAccessSchema = z.object({
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  userEmail: z.string().email(),
  scope: z.enum(['AGG_ONLY', 'DEIDENTIFIED_LEARNER_LEVEL', 'INTERNAL_FULL_ACCESS']),
  expiresAt: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
});

const acceptDUASchema = z.object({
  duaId: z.string().uuid(),
  signature: z.string().min(10).max(500), // Digital signature or typed name
  agreedToTerms: z.literal(true),
});

const listAccessSchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// Route Plugin
// ═══════════════════════════════════════════════════════════════════════════════

export const accessRoutes: FastifyPluginAsync = async (app) => {
  /**
   * POST /research/access-grants
   * Grant access to a researcher (admin only)
   */
  app.post('/access-grants', async (request, reply) => {
    const user = request.user as { sub: string; email: string; tenantId: string; roles?: string[] };
    const body = grantAccessSchema.parse(request.body);

    // Only admins or project owners can grant access
    const isAdmin = user.roles?.includes('district_admin') || user.roles?.includes('platform_admin');
    if (!isAdmin) {
      return reply.status(403).send({ error: 'Only admins can grant access' });
    }

    const auditContext: AuditContext = {
      tenantId: user.tenantId,
      userId: user.sub,
      userEmail: user.email,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    };

    const grant = await grantAccess(
      {
        projectId: body.projectId,
        userId: body.userId,
        userEmail: body.userEmail,
        scope: body.scope,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
        grantedByUserId: user.sub,
      },
      auditContext
    );

    return reply.status(201).send(grant);
  });

  /**
   * GET /research/projects/:projectId/access-grants
   * List access grants for a project
   */
  app.get('/projects/:projectId/access-grants', async (request, reply) => {
    const user = request.user as { sub: string; tenantId: string };
    const { projectId } = request.params as { projectId: string };
    const query = listAccessSchema.parse(request.query);

    const result = await getProjectAccessGrants(projectId, user.tenantId, {
      limit: query.limit,
      offset: query.offset,
    });

    return reply.send(result);
  });

  /**
   * GET /research/my-access
   * List current user's access grants
   */
  app.get('/my-access', async (request, reply) => {
    const user = request.user as { sub: string; tenantId: string };
    const query = listAccessSchema.parse(request.query);

    const result = await getUserAccessGrants(user.sub, user.tenantId, {
      limit: query.limit,
      offset: query.offset,
    });

    return reply.send(result);
  });

  /**
   * DELETE /research/access-grants/:id
   * Revoke access grant (admin only)
   */
  app.delete('/access-grants/:id', async (request, reply) => {
    const user = request.user as { sub: string; email: string; tenantId: string; roles?: string[] };
    const { id } = request.params as { id: string };

    const isAdmin = user.roles?.includes('district_admin') || user.roles?.includes('platform_admin');
    if (!isAdmin) {
      return reply.status(403).send({ error: 'Only admins can revoke access' });
    }

    const auditContext: AuditContext = {
      tenantId: user.tenantId,
      userId: user.sub,
      userEmail: user.email,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    };

    await revokeAccess(id, user.tenantId, user.sub, auditContext);

    return reply.status(204).send();
  });

  /**
   * POST /research/accept-dua
   * Accept a Data Use Agreement
   */
  app.post('/accept-dua', async (request, reply) => {
    const user = request.user as { sub: string; email: string; tenantId: string };
    const body = acceptDUASchema.parse(request.body);

    const auditContext: AuditContext = {
      tenantId: user.tenantId,
      userId: user.sub,
      userEmail: user.email,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    };

    const acceptance = await acceptDUA(
      {
        duaId: body.duaId,
        userId: user.sub,
        signature: body.signature,
      },
      auditContext
    );

    return reply.status(201).send(acceptance);
  });
};
