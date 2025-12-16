/**
 * Research Project Routes
 * 
 * CRUD operations for research projects and status management.
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import {
  createProject,
  getProject,
  listProjects,
  updateProject,
  submitForApproval,
  approveProject,
  rejectProject,
  closeProject,
} from '../services/projectService.js';
import type { AuditContext } from '../services/auditService.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Schemas
// ═══════════════════════════════════════════════════════════════════════════════

const createProjectSchema = z.object({
  title: z.string().min(3).max(500),
  description: z.string().optional(),
  type: z.enum(['INTERNAL_EVAL', 'EXTERNAL_RESEARCH', 'VENDOR_STUDY']),
  piName: z.string().min(2).max(255),
  piEmail: z.string().email().max(255),
  piAffiliation: z.string().max(255).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  irbProtocolId: z.string().max(100).optional(),
  irbExpiryDate: z.string().datetime().optional(),
});

const updateProjectSchema = z.object({
  title: z.string().min(3).max(500).optional(),
  description: z.string().optional(),
  piName: z.string().min(2).max(255).optional(),
  piEmail: z.string().email().max(255).optional(),
  piAffiliation: z.string().max(255).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  irbProtocolId: z.string().max(100).optional(),
  irbExpiryDate: z.string().datetime().optional(),
});

const listProjectsSchema = z.object({
  status: z.string().optional(), // comma-separated
  type: z.string().optional(),   // comma-separated
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

const rejectProjectSchema = z.object({
  reason: z.string().min(10).max(1000),
});

// ═══════════════════════════════════════════════════════════════════════════════
// Route Plugin
// ═══════════════════════════════════════════════════════════════════════════════

export const projectRoutes: FastifyPluginAsync = async (app) => {
  /**
   * POST /research/projects
   * Create a new research project
   */
  app.post('/projects', async (request, reply) => {
    const user = request.user as { sub: string; email: string; tenantId: string };
    const body = createProjectSchema.parse(request.body);

    const auditContext: AuditContext = {
      tenantId: user.tenantId,
      userId: user.sub,
      userEmail: user.email,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    };

    const project = await createProject(
      {
        tenantId: user.tenantId,
        title: body.title,
        description: body.description,
        type: body.type,
        piName: body.piName,
        piEmail: body.piEmail,
        piAffiliation: body.piAffiliation,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        irbProtocolId: body.irbProtocolId,
        irbExpiryDate: body.irbExpiryDate ? new Date(body.irbExpiryDate) : undefined,
        createdByUserId: user.sub,
      },
      auditContext
    );

    return reply.status(201).send(project);
  });

  /**
   * GET /research/projects
   * List projects visible to current user
   */
  app.get('/projects', async (request, reply) => {
    const user = request.user as { sub: string; tenantId: string; roles?: string[] };
    const query = listProjectsSchema.parse(request.query);

    const isAdmin = user.roles?.includes('district_admin') || user.roles?.includes('platform_admin');

    const result = await listProjects({
      tenantId: user.tenantId,
      status: query.status?.split(',') as ('DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CLOSED')[] | undefined,
      type: query.type?.split(',') as ('INTERNAL_EVAL' | 'EXTERNAL_RESEARCH' | 'VENDOR_STUDY')[] | undefined,
      userId: isAdmin ? undefined : user.sub, // Admins see all, others see only their projects
      limit: query.limit,
      offset: query.offset,
    });

    return reply.send(result);
  });

  /**
   * GET /research/projects/:id
   * Get project details
   */
  app.get('/projects/:id', async (request, reply) => {
    const user = request.user as { sub: string; tenantId: string };
    const { id } = request.params as { id: string };

    const project = await getProject(id, user.tenantId);

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    return reply.send(project);
  });

  /**
   * PATCH /research/projects/:id
   * Update project details
   */
  app.patch('/projects/:id', async (request, reply) => {
    const user = request.user as { sub: string; email: string; tenantId: string };
    const { id } = request.params as { id: string };
    const body = updateProjectSchema.parse(request.body);

    const auditContext: AuditContext = {
      tenantId: user.tenantId,
      userId: user.sub,
      userEmail: user.email,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    };

    const project = await updateProject(
      id,
      user.tenantId,
      {
        title: body.title,
        description: body.description,
        piName: body.piName,
        piEmail: body.piEmail,
        piAffiliation: body.piAffiliation,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        irbProtocolId: body.irbProtocolId,
        irbExpiryDate: body.irbExpiryDate ? new Date(body.irbExpiryDate) : undefined,
        updatedByUserId: user.sub,
      },
      auditContext
    );

    return reply.send(project);
  });

  /**
   * POST /research/projects/:id/submit
   * Submit project for approval (DRAFT → PENDING_APPROVAL)
   */
  app.post('/projects/:id/submit', async (request, reply) => {
    const user = request.user as { sub: string; email: string; tenantId: string };
    const { id } = request.params as { id: string };

    const auditContext: AuditContext = {
      tenantId: user.tenantId,
      userId: user.sub,
      userEmail: user.email,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    };

    const project = await submitForApproval(id, user.tenantId, auditContext);
    return reply.send(project);
  });

  /**
   * POST /research/projects/:id/approve
   * Approve project (admin only)
   */
  app.post('/projects/:id/approve', async (request, reply) => {
    const user = request.user as { sub: string; email: string; tenantId: string; roles?: string[] };
    const { id } = request.params as { id: string };

    // Check admin role
    const isAdmin = user.roles?.includes('district_admin') || user.roles?.includes('platform_admin');
    if (!isAdmin) {
      return reply.status(403).send({ error: 'Only admins can approve projects' });
    }

    const auditContext: AuditContext = {
      tenantId: user.tenantId,
      userId: user.sub,
      userEmail: user.email,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    };

    const project = await approveProject(id, user.tenantId, user.sub, auditContext);
    return reply.send(project);
  });

  /**
   * POST /research/projects/:id/reject
   * Reject project (admin only)
   */
  app.post('/projects/:id/reject', async (request, reply) => {
    const user = request.user as { sub: string; email: string; tenantId: string; roles?: string[] };
    const { id } = request.params as { id: string };
    const body = rejectProjectSchema.parse(request.body);

    // Check admin role
    const isAdmin = user.roles?.includes('district_admin') || user.roles?.includes('platform_admin');
    if (!isAdmin) {
      return reply.status(403).send({ error: 'Only admins can reject projects' });
    }

    const auditContext: AuditContext = {
      tenantId: user.tenantId,
      userId: user.sub,
      userEmail: user.email,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    };

    const project = await rejectProject(id, user.tenantId, user.sub, body.reason, auditContext);
    return reply.send(project);
  });

  /**
   * POST /research/projects/:id/close
   * Close project (admin or owner)
   */
  app.post('/projects/:id/close', async (request, reply) => {
    const user = request.user as { sub: string; email: string; tenantId: string };
    const { id } = request.params as { id: string };

    const auditContext: AuditContext = {
      tenantId: user.tenantId,
      userId: user.sub,
      userEmail: user.email,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    };

    const project = await closeProject(id, user.tenantId, user.sub, auditContext);
    return reply.send(project);
  });
};
