import type { AuthContext } from '@aivo/ts-rbac';
import type { FastifyInstance, FastifyRequest } from 'fastify';

import {
  CreateEntrySchema,
  ListEntriesQuerySchema,
  UpdateEntrySchema,
} from './schemas.js';
import * as svc from './service.js';

// ─── Helpers ─────────────────────────────────────────────────────────

function getAuth(request: FastifyRequest): AuthContext | undefined {
  return request.auth;
}

function requireAuth(request: FastifyRequest): AuthContext {
  const auth = request.auth;
  if (!auth?.userId || !auth?.tenantId) {
    throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
  }
  return auth;
}

function requireAdmin(request: FastifyRequest): AuthContext {
  const auth = requireAuth(request);
  if (!auth.roles.map(String).includes('platform_admin')) {
    throw Object.assign(new Error('Forbidden — platform_admin required'), { statusCode: 403 });
  }
  return auth;
}

// ─── Public changelog routes ─────────────────────────────────────────

export async function registerPublicRoutes(app: FastifyInstance) {
  // GET /api/changelog — List published entries
  app.get('/api/changelog', async (request, reply) => {
    const query = ListEntriesQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({ error: 'Invalid query', details: query.error.flatten() });
    }

    const userId = getAuth(request)?.userId;
    const { page, limit, ...rest } = query.data;
    const result = await svc.listEntries({ page, limit, ...rest, userId });
    return reply.send(result);
  });

  // GET /api/changelog/unread-count — Unread count for logged-in user
  app.get('/api/changelog/unread-count', async (request, reply) => {
    const userId = getAuth(request)?.userId;
    if (!userId) {
      return reply.send({ count: 0 });
    }
    const audience = (request.query as Record<string, unknown>)?.audience as string | undefined;
    const count = await svc.getUnreadCount(userId, audience);
    return reply.send({ count });
  });

  // GET /api/changelog/:id — Get single entry
  app.get('/api/changelog/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = getAuth(request)?.userId;
    const entry = await svc.getEntry(id, userId);
    if (!entry) {
      return reply.status(404).send({ error: 'Entry not found' });
    }
    return reply.send(entry);
  });

  // POST /api/changelog/:id/mark-read — Mark entry as read
  app.post('/api/changelog/:id/mark-read', async (request, reply) => {
    const auth = requireAuth(request);
    const { id } = request.params as { id: string };
    await svc.markRead(auth.userId, auth.tenantId, id);
    return reply.send({ success: true });
  });

  // POST /api/changelog/mark-all-read — Mark all as read
  app.post('/api/changelog/mark-all-read', async (request, reply) => {
    const auth = requireAuth(request);
    const count = await svc.markAllRead(auth.userId, auth.tenantId);
    return reply.send({ success: true, markedRead: count });
  });
}

// ─── Admin changelog routes ──────────────────────────────────────────

export async function registerAdminRoutes(app: FastifyInstance) {
  // POST /api/admin/changelog — Create entry
  app.post('/api/admin/changelog', async (request, reply) => {
    requireAdmin(request);

    const parsed = CreateEntrySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation error', details: parsed.error.flatten() });
    }

    const entry = await svc.createEntry(parsed.data);
    return reply.status(201).send(entry);
  });

  // PUT /api/admin/changelog/:id — Update entry
  app.put('/api/admin/changelog/:id', async (request, reply) => {
    requireAdmin(request);

    const { id } = request.params as { id: string };
    const parsed = UpdateEntrySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation error', details: parsed.error.flatten() });
    }

    const entry = await svc.updateEntry(id, parsed.data);
    if (!entry) {
      return reply.status(404).send({ error: 'Entry not found' });
    }
    return reply.send(entry);
  });

  // DELETE /api/admin/changelog/:id — Delete entry
  app.delete('/api/admin/changelog/:id', async (request, reply) => {
    requireAdmin(request);

    const { id } = request.params as { id: string };
    const deleted = await svc.deleteEntry(id);
    if (!deleted) {
      return reply.status(404).send({ error: 'Entry not found' });
    }
    return reply.status(204).send();
  });

  // GET /api/admin/changelog/analytics — Read analytics for all entries
  app.get('/api/admin/changelog/analytics', async (request, reply) => {
    requireAdmin(request);

    const data = await svc.getAllAnalytics();
    return reply.send({ data });
  });

  // GET /api/admin/changelog/analytics/:id — Read analytics for a single entry
  app.get('/api/admin/changelog/analytics/:id', async (request, reply) => {
    requireAdmin(request);

    const { id } = request.params as { id: string };
    const analytics = await svc.getEntryAnalytics(id);
    if (!analytics) {
      return reply.status(404).send({ error: 'Entry not found' });
    }
    return reply.send(analytics);
  });
}
